from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel
from typing import List, Optional
from models.database import get_db
from models.models import JournalEntry, User, Product, entry_products
from middleware.auth import get_optional_user

router = APIRouter(prefix="/explore", tags=["Explore"])


class ExploreEntry(BaseModel):
    entry_id: str
    thumbnail_url: str
    day_number: int
    uploaded_at: str
    username: str
    display_name: str
    avatar_url: Optional[str]
    products: List[dict]
    skin_concerns: List[str]


@router.get("/feed", response_model=List[ExploreEntry])
def explore_feed(
    product: Optional[str] = Query(None, description="Filter by product name or brand"),
    concern: Optional[str] = Query(None, description="Filter by skin concern"),
    skip: int = Query(0, ge=0),
    limit: int = Query(24, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """Public feed — all public entries, filterable by product or concern."""
    query = (
        db.query(JournalEntry, User)
        .join(User, JournalEntry.user_id == User.id)
        .filter(JournalEntry.is_public == True, User.is_profile_public == True)
    )

    if product:
        term = f"%{product.lower()}%"
        product_ids = (
            db.query(Product.id)
            .filter(
                or_(
                    func.lower(Product.name).like(term),
                    func.lower(Product.brand).like(term),
                )
            )
            .subquery()
        )
        entry_ids = (
            db.query(entry_products.c.entry_id)
            .filter(entry_products.c.product_id.in_(product_ids))
            .subquery()
        )
        query = query.filter(JournalEntry.id.in_(entry_ids))

    if concern:
        # JSON array contains — works on PostgreSQL
        query = query.filter(
            User.skin_concerns.cast(db.bind.dialect.name == "postgresql" and
                                    __import__("sqlalchemy.dialects.postgresql", fromlist=["JSONB"]).JSONB
                                    or __import__("sqlalchemy", fromlist=["JSON"]).JSON)
            .astext.contains(concern)
        )

    rows = query.order_by(JournalEntry.uploaded_at.desc()).offset(skip).limit(limit).all()

    result = []
    for entry, user in rows:
        result.append(
            ExploreEntry(
                entry_id=str(entry.id),
                thumbnail_url=entry.thumbnail_url,
                day_number=entry.day_number,
                uploaded_at=entry.uploaded_at.isoformat(),
                username=user.username,
                display_name=user.display_name or user.username,
                avatar_url=user.avatar_url,
                products=[{"id": str(p.id), "name": p.name, "brand": p.brand} for p in entry.products],
                skin_concerns=user.skin_concerns or [],
            )
        )
    return result
