from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from pydantic import BaseModel
from typing import List, Optional
from models.database import get_db
from models.models import Product
from middleware.auth import get_current_user, get_optional_user
from models.models import User
from services.ai_service import ai_product_search
import uuid

router = APIRouter(prefix="/products", tags=["Products"])


class ProductOut(BaseModel):
    id: str
    name: str
    brand: str
    category: Optional[str]
    skin_concerns: List[str]
    key_ingredients: List[str]
    description: Optional[str]
    is_verified: bool

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    name: str
    brand: str
    category: Optional[str] = None
    skin_concerns: List[str] = []
    key_ingredients: List[str] = []
    description: Optional[str] = None


@router.get("/search", response_model=List[ProductOut])
async def search_products(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
):
    """
    1. Search local DB (name + brand + category full-text).
    2. If fewer than 3 results, fall back to Claude AI and persist new products.
    """
    term = f"%{q.lower()}%"
    local = (
        db.query(Product)
        .filter(
            or_(
                func.lower(Product.name).like(term),
                func.lower(Product.brand).like(term),
                func.lower(Product.category).like(term),
            )
        )
        .limit(10)
        .all()
    )

    if len(local) >= 3:
        return [_fmt(p) for p in local]

    # AI fallback
    ai_results = await ai_product_search(q)
    new_products = []
    for item in ai_results:
        # Avoid duplicates
        exists = (
            db.query(Product)
            .filter(
                func.lower(Product.name) == item["name"].lower(),
                func.lower(Product.brand) == item["brand"].lower(),
            )
            .first()
        )
        if not exists:
            p = Product(
                id=uuid.uuid4(),
                name=item["name"],
                brand=item["brand"],
                category=item.get("category"),
                skin_concerns=item.get("skin_concerns", []),
                key_ingredients=item.get("key_ingredients", []),
                description=item.get("description"),
                is_verified=False,
            )
            db.add(p)
            new_products.append(p)
    db.commit()

    combined = {p.id: p for p in local}
    for p in new_products:
        combined[p.id] = p
    return [_fmt(p) for p in list(combined.values())[:10]]


@router.get("/by-entry/{entry_id}", response_model=List[ProductOut])
def products_by_entry(entry_id: str, db: Session = Depends(get_db)):
    from models.models import JournalEntry
    entry = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Entry not found.")
    return [_fmt(p) for p in entry.products]


@router.post("/", response_model=ProductOut, status_code=201)
def create_product(
    body: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Allow users to add products not yet in the database."""
    p = Product(id=uuid.uuid4(), **body.model_dump(), is_verified=False)
    db.add(p)
    db.commit()
    db.refresh(p)
    return _fmt(p)


def _fmt(p: Product) -> ProductOut:
    return ProductOut(
        id=str(p.id),
        name=p.name,
        brand=p.brand,
        category=p.category,
        skin_concerns=p.skin_concerns or [],
        key_ingredients=p.key_ingredients or [],
        description=p.description,
        is_verified=p.is_verified,
    )
