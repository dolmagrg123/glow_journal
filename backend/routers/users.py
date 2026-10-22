from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional
from models.database import get_db
from models.models import User, JournalEntry, Milestone, FollowRequest, user_follows
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
    # Relative to the viewer
    follow_status: str           # "self" | "following" | "requested" | "none"
    can_view: bool               # may the viewer see this user's entries?
    pending_requests_count: int  # only filled in on your own profile


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    skin_type: Optional[str] = None
    skin_concerns: Optional[List[str]] = None
    is_profile_public: Optional[bool] = None


class UserSummary(BaseModel):
    username: str
    display_name: str
    avatar_url: Optional[str]
    is_profile_public: bool
    follow_status: str


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


def _get_active_user(username: str, db: Session) -> User:
    user = db.query(User).filter(User.username == username, User.is_active == True).first()
    if not user:
        raise HTTPException(404, "User not found.")
    return user


def _is_following(follower: User, target: User, db: Session) -> bool:
    return db.query(user_follows).filter(
        user_follows.c.follower_id == follower.id,
        user_follows.c.following_id == target.id,
    ).first() is not None


def _get_request(requester: User, target: User, db: Session) -> Optional[FollowRequest]:
    return db.query(FollowRequest).filter(
        FollowRequest.requester_id == requester.id,
        FollowRequest.target_id == target.id,
    ).first()


def _follow_status(viewer: Optional[User], user: User, db: Session) -> str:
    if not viewer:
        return "none"
    if viewer.id == user.id:
        return "self"
    if _is_following(viewer, user, db):
        return "following"
    if _get_request(viewer, user, db):
        return "requested"
    return "none"


def _can_view(status: str, user: User) -> bool:
    return status in ("self", "following") or user.is_profile_public


def _summary(viewer: Optional[User], user: User, db: Session) -> UserSummary:
    return UserSummary(
        username=user.username,
        display_name=user.display_name or user.username,
        avatar_url=user.avatar_url,
        is_profile_public=user.is_profile_public,
        follow_status=_follow_status(viewer, user, db),
    )


def _build_profile(user: User, db: Session, viewer: Optional[User] = None) -> ProfileOut:
    status = _follow_status(viewer, user, db)
    total = db.query(func.count(JournalEntry.id)).filter(JournalEntry.user_id == user.id).scalar()
    achieved = [m.day_target for m in user.milestones]
    pending = 0
    if status == "self":
        pending = db.query(func.count()).select_from(FollowRequest).filter(FollowRequest.target_id == user.id).scalar()
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
        follow_status=status,
        can_view=_can_view(status, user),
        pending_requests_count=pending or 0,
    )


def _accept_all_requests(user: User, db: Session):
    for req in db.query(FollowRequest).filter(FollowRequest.target_id == user.id).all():
        if req.requester not in user.followers:
            user.followers.append(req.requester)
        db.delete(req)


# ── your own profile ──────────────────────────────────────────────────────────

@router.get("/me", response_model=ProfileOut)
def get_my_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check and unlock new milestones
    _check_milestones(current_user, db)
    return _build_profile(current_user, db, current_user)


@router.patch("/me", response_model=ProfileOut)
def update_profile(
    body: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    # Going public approves everyone who was waiting, like Instagram
    if body.is_profile_public:
        _accept_all_requests(current_user, db)
    db.commit()
    db.refresh(current_user)
    return _build_profile(current_user, db, current_user)


@router.get("/me/follow-requests", response_model=List[UserSummary])
def list_follow_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    reqs = (
        db.query(FollowRequest)
        .filter(FollowRequest.target_id == current_user.id)
        .order_by(FollowRequest.created_at.desc())
        .all()
    )
    return [_summary(current_user, r.requester, db) for r in reqs]


@router.post("/me/follow-requests/{username}/accept")
def accept_follow_request(
    username: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    requester = _get_active_user(username, db)
    req = _get_request(requester, current_user, db)
    if not req:
        raise HTTPException(404, "No pending request from this user.")
    if requester not in current_user.followers:
        current_user.followers.append(requester)
    db.delete(req)
    db.commit()
    return {"accepted": True}


@router.delete("/me/follow-requests/{username}")
def decline_follow_request(
    username: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    requester = _get_active_user(username, db)
    req = _get_request(requester, current_user, db)
    if req:
        db.delete(req)
        db.commit()
    return {"declined": True}


@router.delete("/me/followers/{username}")
def remove_follower(
    username: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    follower = _get_active_user(username, db)
    if follower in current_user.followers:
        current_user.followers.remove(follower)
        db.commit()
    return {"removed": True}


# ── other users ───────────────────────────────────────────────────────────────

@router.get("/search", response_model=List[UserSummary])
def search_users(
    q: str = Query(..., min_length=1),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    term = f"%{q.strip().lstrip('@').lower()}%"
    users = (
        db.query(User)
        .filter(User.is_active == True, func.lower(User.username).like(term))
        .order_by(func.length(User.username))
        .limit(20)
        .all()
    )
    return [_summary(current_user, u, db) for u in users]


@router.get("/{username}", response_model=ProfileOut)
def get_user_profile(
    username: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    # Private profiles still show the header (name, bio, counts) so people can
    # request to follow; can_view says whether the entries are visible.
    return _build_profile(_get_active_user(username, db), db, current_user)


@router.get("/{username}/entries", response_model=List[EntrySnippet])
def get_user_entries(
    username: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    user = _get_active_user(username, db)
    status = _follow_status(current_user, user, db)
    if not _can_view(status, user):
        raise HTTPException(403, "This account is private. Follow it to see their journey.")

    query = db.query(JournalEntry).filter(JournalEntry.user_id == user.id)
    if status != "self":
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


@router.get("/{username}/followers", response_model=List[UserSummary])
def list_followers(
    username: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    user = _get_active_user(username, db)
    if not _can_view(_follow_status(current_user, user, db), user):
        raise HTTPException(403, "This account is private.")
    return [_summary(current_user, u, db) for u in user.followers if u.is_active]


@router.get("/{username}/following", response_model=List[UserSummary])
def list_following(
    username: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    user = _get_active_user(username, db)
    if not _can_view(_follow_status(current_user, user, db), user):
        raise HTTPException(403, "This account is private.")
    return [_summary(current_user, u, db) for u in user.following if u.is_active]


@router.post("/{username}/follow")
def follow_user(
    username: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Public profile: follow right away. Private profile: send a follow request."""
    target = _get_active_user(username, db)
    if target.id == current_user.id:
        raise HTTPException(400, "You can't follow yourself.")
    if _is_following(current_user, target, db):
        return {"status": "following"}
    if target.is_profile_public:
        current_user.following.append(target)
        db.commit()
        return {"status": "following"}
    if not _get_request(current_user, target, db):
        db.add(FollowRequest(requester_id=current_user.id, target_id=target.id))
        db.commit()
    return {"status": "requested"}


@router.delete("/{username}/follow")
def unfollow_user(
    username: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Unfollow, or cancel a pending follow request."""
    target = _get_active_user(username, db)
    if target in current_user.following:
        current_user.following.remove(target)
    req = _get_request(current_user, target, db)
    if req:
        db.delete(req)
    db.commit()
    return {"status": "none"}


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
