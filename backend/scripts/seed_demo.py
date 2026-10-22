"""
Create 5 demo profiles with illustrated progress photos, for testing.

    cd backend
    $env:ENV_FILE=".env.development"; .\venv\Scripts\python.exe scripts\seed_demo.py

- Every demo user follows every other demo user.
- Journeys run 30, 60, 90, 120 and 180 days, with a photo every few days.
- Photos are drawn (no real people): blemishes and redness fade over time,
  so before/after cards show visible progress.
- Re-running deletes the previous demo users and their photos first.
- Run with --remove to delete the demo data without recreating it.

All demo accounts use the password Demo1234! and an @demo.example.com email.
"""
import sys, os, io, random, shutil, uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from PIL import Image, ImageDraw, ImageFilter, ImageFont
from models.database import SessionLocal, engine
from models.models import Base, User, JournalEntry, Product, FollowRequest, Milestone, user_follows, entry_products
from middleware.auth import hash_password

UPLOADS = Path(__file__).resolve().parent.parent / "uploads"
PASSWORD = "Demo1234!"
EMAIL_DOMAIN = "demo.example.com"  # must pass email validation (".test" is rejected)

DEMO_USERS = [
    # username, display name, bio, skin type, concerns, journey days, skin tone, private?, routine search terms
    ("amara.glows", "Amara", "Fading post-acne marks one serum at a time ✨", "combination",
     ["acne", "hyperpigmentation"], 180, (141, 85, 60), False,
     ["CeraVe Foaming", "Azelaic Acid", "Relief Sun", "Niacinamide 10%"]),
    ("jin.dewy", "Jin", "Glass skin goals. K-beauty routine diary.", "dry",
     ["hydration", "redness"], 120, (232, 196, 170), False,
     ["Heartleaf 77%", "Madagascar Centella", "Water Sleeping Mask", "Hada Labo"]),
    ("sofia.clear", "Sofia", "Hormonal acne recovery journey 🌿", "oily",
     ["acne", "pores"], 90, (198, 145, 108), True,
     ["Effaclar Duo", "Differin", "Hydro Boost", "EltaMD"]),
    ("priya.calm", "Priya", "Sensitive skin, rosacea, slow and steady.", "sensitive",
     ["redness", "sensitive skin"], 60, (176, 122, 88), False,
     ["Toleriane Hydrating", "Cicaplast", "Phyto Corrective", "Vanicream Moisturizing"]),
    ("leo.bright", "Leo", "First 30 days of an actual routine.", "normal",
     ["anti-aging", "texture"], 30, (210, 160, 125), False,
     ["Cetaphil Gentle", "Retinol 0.5%", "Ultra Facial", "Unseen Sunscreen"]),
]


# ── demo photo drawing ────────────────────────────────────────────────────────

def _font(size):
    for name in ("arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def draw_photo(tone, progress, day, rng_seed, concerns) -> bytes:
    """Draw a stylized close-up of a cheek. progress goes 0 (start) to 1 (end)."""
    rng = random.Random(rng_seed)
    W, H = 900, 1200
    r, g, b = tone
    img = Image.new("RGB", (W, H), (r, g, b))
    d = ImageDraw.Draw(img)

    # soft lighting gradient
    for y in range(H):
        k = 1.08 - 0.22 * (y / H)
        d.line([(0, y), (W, y)], fill=(min(255, int(r * k)), min(255, int(g * k)), min(255, int(b * k))))

    spots = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(spots)

    # redness patches fade with progress
    if "redness" in concerns or "sensitive skin" in concerns or "acne" in concerns:
        for _ in range(5):
            cx, cy, rad = rng.randint(100, 800), rng.randint(250, 1000), rng.randint(120, 220)
            sd.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=(200, 40, 50, int(70 * (1 - progress))))

    # blemishes / dark marks: fewer and lighter over time
    n_start = 26 if "acne" in concerns else 14
    for i in range(n_start):
        x, y, s = rng.randint(80, 820), rng.randint(200, 1100), rng.randint(10, 26)
        if rng.random() < progress * 1.05:   # this spot has healed
            continue
        if "hyperpigmentation" in concerns or "texture" in concerns or "anti-aging" in concerns:
            color = (max(0, r - 60), max(0, g - 55), max(0, b - 45), int(150 * (1 - 0.6 * progress)))
        else:
            color = (190, 50, 55, int(170 * (1 - 0.5 * progress)))
        sd.ellipse([x - s, y - s, x + s, y + s], fill=color)

    spots = spots.filter(ImageFilter.GaussianBlur(14))
    img = Image.alpha_composite(img.convert("RGBA"), spots)

    # skin texture
    tex = Image.effect_noise((W, H), 18).convert("L").filter(ImageFilter.GaussianBlur(1))
    img = Image.blend(img.convert("RGB"), Image.merge("RGB", (tex, tex, tex)), 0.06 * (1 - 0.5 * progress))

    # healthy glow highlight grows with progress
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([250, 200, 700, 650], fill=(255, 240, 220, int(25 + 55 * progress)))
    img = Image.alpha_composite(img.convert("RGBA"), glow.filter(ImageFilter.GaussianBlur(90))).convert("RGB")

    ImageDraw.Draw(img).text((40, H - 90), f"Day {day}", fill=(255, 255, 255), font=_font(52))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=85)
    return buf.getvalue()


def thumbnail(data: bytes) -> bytes:
    img = Image.open(io.BytesIO(data))
    img.thumbnail((400, 400), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=80)
    return buf.getvalue()


def photo_days(journey_days: int):
    """Day 1, then roughly every 3 days, always ending on the last day."""
    days = list(range(1, journey_days + 1, 3))
    if days[-1] != journey_days:
        days.append(journey_days)
    return days


# ── seeding ───────────────────────────────────────────────────────────────────

def remove_demo(db):
    users = db.query(User).filter(User.email.like(f"%@{EMAIL_DOMAIN}")).all()
    ids = [u.id for u in users]
    if not ids:
        return 0
    db.execute(user_follows.delete().where(user_follows.c.follower_id.in_(ids) | user_follows.c.following_id.in_(ids)))
    db.query(FollowRequest).filter(FollowRequest.requester_id.in_(ids) | FollowRequest.target_id.in_(ids)).delete(synchronize_session=False)
    db.query(Milestone).filter(Milestone.user_id.in_(ids)).delete(synchronize_session=False)
    entry_ids = db.query(JournalEntry.id).filter(JournalEntry.user_id.in_(ids))
    db.execute(entry_products.delete().where(entry_products.c.entry_id.in_(entry_ids.scalar_subquery())))
    db.query(JournalEntry).filter(JournalEntry.user_id.in_(ids)).delete(synchronize_session=False)
    db.query(User).filter(User.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    for uid in ids:
        shutil.rmtree(UPLOADS / "photos" / str(uid), ignore_errors=True)
    return len(ids)


def seed():
    # The demo password is public in this repo, so never create these accounts on a real server
    if os.environ.get("ENVIRONMENT", "").lower() == "production" or "production" in os.environ.get("ENV_FILE", ""):
        sys.exit("Refusing to create demo accounts in production (their password is public).")
    from config.settings import get_settings
    if get_settings().ENVIRONMENT == "production":
        sys.exit("Refusing to create demo accounts in production (their password is public).")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    removed = remove_demo(db)
    if removed:
        print(f"Removed {removed} old demo users.")
    if "--remove" in sys.argv:
        db.close()
        return

    now = datetime.now(timezone.utc)
    created = []
    total_photos = 0
    for i, (username, name, bio, skin_type, concerns, days, tone, private, routine) in enumerate(DEMO_USERS):
        start = now - timedelta(days=days - 1)
        user = User(
            id=uuid.uuid4(), username=username, email=f"{username.split('.')[0]}@{EMAIL_DOMAIN}",
            hashed_password=hash_password(PASSWORD), display_name=name, bio=bio, skin_type=skin_type,
            skin_concerns=concerns, journey_start_date=start, is_profile_public=not private,
        )
        db.add(user)
        db.flush()

        products = []
        for term in routine:
            words = term.lower().split()
            q = db.query(Product)
            for w in words:
                q = q.filter((Product.name.ilike(f"%{w}%")) | (Product.brand.ilike(f"%{w}%")))
            p = q.first()
            if p:
                products.append(p)

        rng = random.Random(i)
        for day in photo_days(days):
            entry_id = uuid.uuid4()
            progress = (day - 1) / max(1, days - 1)
            data = draw_photo(tone, progress, day, rng_seed=i * 1000 + 7, concerns=concerns)
            folder = UPLOADS / "photos" / str(user.id) / str(entry_id)
            folder.mkdir(parents=True, exist_ok=True)
            (folder / "original.jpg").write_bytes(data)
            (folder / "thumb.jpg").write_bytes(thumbnail(data))
            base = f"/uploads/photos/{user.id}/{entry_id}"
            entry = JournalEntry(
                id=entry_id, user_id=user.id, image_url=f"{base}/original.jpg", thumbnail_url=f"{base}/thumb.jpg",
                day_number=day, uploaded_at=start + timedelta(days=day - 1, hours=rng.randint(7, 22)),
                skin_rating=min(5, 2 + round(3 * progress)), is_public=rng.random() > 0.08 or day in (1, days),
                notes=rng.choice(["Morning routine done.", "Skin feels calmer today.", "Tried a new layer order.",
                                  "Slept well, skin looks better.", "", ""]) or None,
            )
            entry.products = rng.sample(products, k=min(len(products), rng.randint(2, 4)))
            db.add(entry)
            total_photos += 1
        created.append(user)
        print(f"  @{username:<13} {days:>3} days, {len(photo_days(days)):>2} photos, {'private' if private else 'public'}")

    # everyone follows everyone
    for u in created:
        u.following = [o for o in created if o.id != u.id]
    db.commit()
    db.close()
    print(f"Created {len(created)} demo users with {total_photos} photos. They all follow each other.")
    print(f"Log in with e.g. amara@{EMAIL_DOMAIN} / {PASSWORD}")


if __name__ == "__main__":
    seed()
