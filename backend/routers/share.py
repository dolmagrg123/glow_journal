"""
Builds shareable progress cards (like Strava activity cards).
Returns metadata that the frontend uses to render & export a canvas image.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from models.database import get_db
from models.models import User, JournalEntry, Product
from middleware.auth import get_current_user

router = APIRouter(prefix="/share", tags=["Share"])


class ShareCardRequest(BaseModel):
    day_from: int = 1
    day_to: int = 30
    product_ids: List[str] = []       # which products to feature
    caption: Optional[str] = None


class ShareCardResponse(BaseModel):
    username: str
    display_name: str
    avatar_url: Optional[str]
    day_from: int
    day_to: int
    total_days_tracked: int
    photos: List[dict]                # [{day_number, thumbnail_url}]
    products: List[dict]              # featured products
    caption: Optional[str]
    share_url: str                    # deep link to profile


@router.post("/card", response_model=ShareCardResponse)
def build_share_card(
    body: ShareCardRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.day_from < 1 or body.day_to < body.day_from:
        raise HTTPException(400, "Invalid day range.")

    entries = (
        db.query(JournalEntry)
        .filter(
            JournalEntry.user_id == current_user.id,
            JournalEntry.day_number >= body.day_from,
            JournalEntry.day_number <= body.day_to,
        )
        .order_by(JournalEntry.day_number.asc())
        .all()
    )

    photos = [{"day_number": e.day_number, "thumbnail_url": e.thumbnail_url} for e in entries]

    # Featured products (user selected) or all products used in range
    if body.product_ids:
        products = db.query(Product).filter(Product.id.in_(body.product_ids)).all()
    else:
        seen = {}
        for e in entries:
            for p in e.products:
                seen[str(p.id)] = p
        products = list(seen.values())

    total = (
        db.query(JournalEntry)
        .filter(JournalEntry.user_id == current_user.id)
        .count()
    )

    from config.settings import get_settings
    settings = get_settings()
    share_url = f"{settings.FRONTEND_URL}/u/{current_user.username}"

    return ShareCardResponse(
        username=current_user.username,
        display_name=current_user.display_name or current_user.username,
        avatar_url=current_user.avatar_url,
        day_from=body.day_from,
        day_to=body.day_to,
        total_days_tracked=total,
        photos=photos,
        products=[{"id": str(p.id), "name": p.name, "brand": p.brand} for p in products],
        caption=body.caption,
        share_url=share_url,
    )


@router.get("/my-products")
def my_logged_products(
    day_from: int = 1,
    day_to: int = 9999,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all distinct products the user has logged between day_from and day_to."""
    entries = (
        db.query(JournalEntry)
        .filter(
            JournalEntry.user_id == current_user.id,
            JournalEntry.day_number >= day_from,
            JournalEntry.day_number <= day_to,
        )
        .all()
    )
    seen = {}
    for e in entries:
        for p in e.products:
            seen[str(p.id)] = {"id": str(p.id), "name": p.name, "brand": p.brand, "category": p.category}
    return list(seen.values())
