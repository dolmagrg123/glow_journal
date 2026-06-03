from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional
from models.database import get_db
from models.models import User, JournalEntry, Milestone
from middleware.auth import get_current_user, get_optional_user

router = APIRouter(prefix="/users", tags=["Users"])

MILESTONE_DAYS = [7, 14, 30, 45, 60, 90, 180, 365]


# ── schemas ───────────────────────────────────────────────────────────────────

class ProfileOut(BaseModel):
    id: str
    username: str
    display_name: str
    bio: Optional[str]
    avatar_url: Optional[str]
    skin_type: Optional[str]
    skin_concerns: List[str]
    journey_start_date: Optional[str]
    is_profile_public: bool
    total_entries: int
    current_day: int
    followers_count: int
    following_count: int
    milestones_achieved: List[int]


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    skin_type: Optional[str] = None
    skin_concerns: Optional[List[str]] = None
    is_profile_public: Optional[bool] = None


class EntrySnippet(BaseModel):
    id: str
    thumbnail_url: str
    day_number: int
    uploaded_at: str
    products: List[dict]


# ── helpers ───────────────────────────────────────────────────────────────────

def _current_day(user: User) -> int:
    if not user.journey_start_date:
        return 0
    from datetime import datetime, timezone
    delta = (datetime.now(timezone.utc).date() - user.journey_start_date.date()).days
    return max(0, delta + 1)


def _build_profile(user: User, db: Session) -> ProfileOut:
    total = db.query(func.count(JournalEntry.id)).filter(JournalEntry.user_id == user.id).scalar()
    achieved = [m.day_target for m in user.milestones]
    return ProfileOut(
        id=str(user.id),
        username=user.username,
        display_name=user.display_name or user.username,
        bio=user.bio,
        avatar_url=user.avatar_url,
        skin_type=user.skin_type,
        skin_concerns=user.skin_concerns or [],
        journey_start_date=user.journey_start_date.isoformat() if user.journey_start_date else None,
        is_profile_public=user.is_profile_public,
        total_entries=total or 0,
        current_day=_current_day(user),
        followers_count=len(user.followers),
        following_count=len(user.following),
        milestones_achieved=achieved,
    )


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.get("/me", response_model=ProfileOut)
def get_my_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check and unlock new milestones
    _check_milestones(current_user, db)
    return _build_profile(current_user, db)


@router.patch("/me", response_model=ProfileOut)
def update_profile(
    body: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return _build_profile(current_user, db)


@router.get("/{username}", response_model=ProfileOut)
def get_user_profile(
    username: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == username, User.is_active == True).first()
    if not user:
        raise HTTPException(404, "User not found.")
    if not user.is_profile_public and (not current_user or current_user.id != user.id):
        raise HTTPException(403, "This profile is private.")
    return _build_profile(user, db)


@router.get("/{username}/entries", response_model=List[EntrySnippet])
def get_user_entries(
    username: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == username, User.is_active == True).first()
    if not user:
        raise HTTPException(404, "User not found.")

    is_owner = current_user and current_user.id == user.id
    query = db.query(JournalEntry).filter(JournalEntry.user_id == user.id)
    if not is_owner:
        if not user.is_profile_public:
            raise HTTPException(403, "Profile is private.")
        query = query.filter(JournalEntry.is_public == True)

    entries = query.order_by(JournalEntry.day_number.asc()).offset(skip).limit(limit).all()
    return [
        EntrySnippet(
            id=str(e.id),
            thumbnail_url=e.thumbnail_url,
            day_number=e.day_number,
            uploaded_at=e.uploaded_at.isoformat(),
            products=[{"id": str(p.id), "name": p.name, "brand": p.brand} for p in e.products],
        )
        for e in entries
    ]


@router.post("/{username}/follow")
def follow_user(
    username: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.username == username).first()
    if not target or target.id == current_user.id:
        raise HTTPException(400, "Cannot follow this user.")
    if target not in current_user.following:
        current_user.following.append(target)
        db.commit()
    return {"following": True}


@router.delete("/{username}/follow")
def unfollow_user(
    username: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.username == username).first()
    if target and target in current_user.following:
        current_user.following.remove(target)
        db.commit()
    return {"following": False}


# ── milestone checker ─────────────────────────────────────────────────────────

def _check_milestones(user: User, db: Session):
    current_day = _current_day(user)
    achieved_days = {m.day_target for m in user.milestones}
    import uuid as _uuid
    from models.models import Milestone
    for target in MILESTONE_DAYS:
        if target <= current_day and target not in achieved_days:
            m = Milestone(id=_uuid.uuid4(), user_id=user.id, day_target=target)
            db.add(m)
    db.commit()
