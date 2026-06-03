from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Text,
    ForeignKey, Table, Float, JSON, Enum as SAEnum
)
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum


class Base(DeclarativeBase):
    pass


# ── Many-to-many: entry <-> product ──────────────────────────────────────────
entry_products = Table(
    "entry_products",
    Base.metadata,
    Column("entry_id", UUID(as_uuid=True), ForeignKey("journal_entries.id"), primary_key=True),
    Column("product_id", UUID(as_uuid=True), ForeignKey("products.id"), primary_key=True),
)

# ── Many-to-many: user follows ────────────────────────────────────────────────
user_follows = Table(
    "user_follows",
    Base.metadata,
    Column("follower_id", UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True),
    Column("following_id", UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True),
)


class SkinType(str, enum.Enum):
    oily = "oily"
    dry = "dry"
    combination = "combination"
    sensitive = "sensitive"
    normal = "normal"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    display_name = Column(String(100))
    bio = Column(Text)
    avatar_url = Column(String(500))
    skin_type = Column(SAEnum(SkinType), nullable=True)
    skin_concerns = Column(JSON, default=list)       # ["acne", "hyperpigmentation"]
    journey_start_date = Column(DateTime(timezone=True), nullable=True)
    is_profile_public = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    entries = relationship("JournalEntry", back_populates="user", cascade="all, delete-orphan")
    milestones = relationship("Milestone", back_populates="user", cascade="all, delete-orphan")
    followers = relationship("User", secondary=user_follows,
                             primaryjoin=id == user_follows.c.following_id,
                             secondaryjoin=id == user_follows.c.follower_id,
                             backref="following")


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    image_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500))
    day_number = Column(Integer, nullable=False)       # computed: days since journey_start_date
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text)
    skin_rating = Column(Integer)                      # 1–5 self-assessment
    is_public = Column(Boolean, default=True)
    location_name = Column(String(200))               # optional
    ai_skin_analysis = Column(JSON)                   # optional AI analysis result

    user = relationship("User", back_populates="entries")
    products = relationship("Product", secondary=entry_products, back_populates="entries")


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    brand = Column(String(100), nullable=False)
    category = Column(String(100))                    # toner, serum, moisturizer, etc.
    skin_concerns = Column(JSON, default=list)        # ["acne", "hydration"]
    image_url = Column(String(500))
    description = Column(Text)
    key_ingredients = Column(JSON, default=list)
    is_verified = Column(Boolean, default=False)      # from official database
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    entries = relationship("JournalEntry", secondary=entry_products, back_populates="products")


class Milestone(Base):
    __tablename__ = "milestones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    day_target = Column(Integer, nullable=False)       # 7, 30, 45, 90, 180, 365
    achieved_at = Column(DateTime(timezone=True), server_default=func.now())
    summary = Column(Text)
    share_image_url = Column(String(500))

    user = relationship("User", back_populates="milestones")


class TempPhoto(Base):
    """Holds camera-captured images in a staging area before the user confirms upload."""
    __tablename__ = "temp_photos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    s3_key = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500))
    captured_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))      # auto-deleted after 24 h
