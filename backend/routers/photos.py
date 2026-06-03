"""
Photo flow:
  1. POST /photos/capture       → upload 1 camera photo to temp S3 staging area
  2. GET  /photos/temp          → list staged (unconfirmed) photos for current user
  3. DELETE /photos/temp/{id}   → discard a staged photo the user doesn't like
  4. POST /photos/confirm       → confirm chosen photos → create JournalEntries
"""
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid

from models.database import get_db
from models.models import User, JournalEntry, TempPhoto, Product
from middleware.auth import get_current_user
from services.image_service import upload_temp_photo, promote_temp_photo, delete_temp_photo_s3

router = APIRouter(prefix="/photos", tags=["Photos"])


# ── helpers ───────────────────────────────────────────────────────────────────

def _day_number(user: User, ref_date: datetime) -> int:
    start = user.journey_start_date
    if not start:
        return 1
    delta = (ref_date.date() - start.date()).days
    return max(1, delta + 1)


# ── schemas ───────────────────────────────────────────────────────────────────

class TempPhotoOut(BaseModel):
    id: str
    thumbnail_url: str
    preview_url: str
    captured_at: str

    class Config:
        from_attributes = True


class ConfirmPhotoItem(BaseModel):
    temp_id: str          # UUID of TempPhoto row
    notes: Optional[str] = None
    skin_rating: Optional[int] = None   # 1–5
    is_public: bool = True
    product_ids: List[str] = []         # UUIDs of Product rows


class ConfirmRequest(BaseModel):
    photos: List[ConfirmPhotoItem]


class EntryOut(BaseModel):
    id: str
    image_url: str
    thumbnail_url: str
    day_number: int
    uploaded_at: str
    notes: Optional[str]
    skin_rating: Optional[int]
    is_public: bool
    products: List[dict]


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.post("/capture", summary="Stage a camera photo (before confirmation)")
async def capture_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Accepts a single camera image and stores it in a temporary staging area."""
    result = await upload_temp_photo(file, str(current_user.id))

    expires = datetime.now(timezone.utc) + timedelta(hours=24)
    temp = TempPhoto(
        id=uuid.UUID(result["temp_id"]),
        user_id=current_user.id,
        s3_key=result["s3_key"],
        thumbnail_url=result["thumbnail_url"],
        expires_at=expires,
    )
    db.add(temp)
    db.commit()

    return {
        "temp_id": result["temp_id"],
        "thumbnail_url": result["thumbnail_url"],
        "preview_url": result["preview_url"],
    }


@router.get("/temp", response_model=List[TempPhotoOut], summary="List staged photos")
def list_temp_photos(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    rows = (
        db.query(TempPhoto)
        .filter(TempPhoto.user_id == current_user.id, TempPhoto.expires_at > now)
        .order_by(TempPhoto.captured_at.desc())
        .all()
    )
    return [
        TempPhotoOut(
            id=str(r.id),
            thumbnail_url=r.thumbnail_url,
            preview_url=r.thumbnail_url.replace("/thumb.jpg", "/original.jpg"),
            captured_at=r.captured_at.isoformat(),
        )
        for r in rows
    ]


@router.delete("/temp/{temp_id}", summary="Discard a staged photo")
def delete_temp_photo(
    temp_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    temp = (
        db.query(TempPhoto)
        .filter(TempPhoto.id == temp_id, TempPhoto.user_id == current_user.id)
        .first()
    )
    if not temp:
        raise HTTPException(404, "Temp photo not found.")
    delete_temp_photo_s3(temp.s3_key)
    db.delete(temp)
    db.commit()
    return {"deleted": temp_id}


@router.post("/confirm", response_model=List[EntryOut], summary="Confirm and publish chosen photos")
def confirm_photos(
    body: ConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Moves selected temp photos to permanent storage and creates JournalEntry rows.
    Auto-assigns day_number based on journey_start_date.
    If user has no journey_start_date yet, today becomes Day 1.
    """
    now = datetime.now(timezone.utc)

    # Set journey start date if first ever entry
    if not current_user.journey_start_date:
        current_user.journey_start_date = now
        db.add(current_user)

    created_entries = []

    for item in body.photos:
        temp = (
            db.query(TempPhoto)
            .filter(TempPhoto.id == item.temp_id, TempPhoto.user_id == current_user.id)
            .first()
        )
        if not temp:
            continue  # skip invalid ids silently

        # Promote to permanent S3 location
        urls = promote_temp_photo(str(current_user.id), temp.s3_key)

        day_num = _day_number(current_user, now)

        entry = JournalEntry(
            user_id=current_user.id,
            image_url=urls["image_url"],
            thumbnail_url=urls["thumbnail_url"],
            day_number=day_num,
            notes=item.notes,
            skin_rating=item.skin_rating,
            is_public=item.is_public,
        )

        # Attach products
        if item.product_ids:
            products = db.query(Product).filter(Product.id.in_(item.product_ids)).all()
            entry.products = products

        db.add(entry)
        db.delete(temp)
        created_entries.append(entry)

    db.commit()
    for e in created_entries:
        db.refresh(e)

    return [
        EntryOut(
            id=str(e.id),
            image_url=e.image_url,
            thumbnail_url=e.thumbnail_url,
            day_number=e.day_number,
            uploaded_at=e.uploaded_at.isoformat(),
            notes=e.notes,
            skin_rating=e.skin_rating,
            is_public=e.is_public,
            products=[{"id": str(p.id), "name": p.name, "brand": p.brand} for p in e.products],
        )
        for e in created_entries
    ]


@router.get("/journal", response_model=List[EntryOut], summary="Get current user's journal")
def get_journal(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entries = (
        db.query(JournalEntry)
        .filter(JournalEntry.user_id == current_user.id)
        .order_by(JournalEntry.day_number.asc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        EntryOut(
            id=str(e.id),
            image_url=e.image_url,
            thumbnail_url=e.thumbnail_url,
            day_number=e.day_number,
            uploaded_at=e.uploaded_at.isoformat(),
            notes=e.notes,
            skin_rating=e.skin_rating,
            is_public=e.is_public,
            products=[{"id": str(p.id), "name": p.name, "brand": p.brand} for p in e.products],
        )
        for e in entries
    ]


@router.delete("/{entry_id}", summary="Delete a confirmed journal entry")
def delete_entry(
    entry_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = (
        db.query(JournalEntry)
        .filter(JournalEntry.id == entry_id, JournalEntry.user_id == current_user.id)
        .first()
    )
    if not entry:
        raise HTTPException(404, "Entry not found.")
    from services.image_service import delete_s3_photo
    delete_s3_photo(entry.image_url)
    db.delete(entry)
    db.commit()
    return {"deleted": entry_id}
