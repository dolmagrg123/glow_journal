from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from models.database import get_db
from models.models import User
from middleware.auth import hash_password, verify_password, create_access_token
from middleware.rate_limit import limiter
import re
import uuid

router = APIRouter(prefix="/auth", tags=["Auth"])

USERNAME_RE = re.compile(r"[A-Za-z0-9._]{3,30}")
RESERVED_USERNAMES = {"me", "search"}  # would clash with /users/me and /users/search


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    display_name: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str


@router.post("/register", response_model=AuthResponse, status_code=201)
@limiter.limit("5/minute")
def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(400, "Email already registered.")
    if not USERNAME_RE.fullmatch(body.username) or body.username.lower() in RESERVED_USERNAMES:
        raise HTTPException(400, "Username must be 3-30 letters, numbers, dots or underscores.")
    if db.query(User).filter(func.lower(User.username) == body.username.lower()).first():
        raise HTTPException(400, "Username already taken.")

    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters.")

    user = User(
        id=uuid.uuid4(),
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        display_name=body.display_name or body.username,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return AuthResponse(access_token=token, user_id=str(user.id), username=user.username)


@router.post("/login", response_model=AuthResponse)
@limiter.limit("10/minute")  # slows down password guessing
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email, User.is_active == True).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(401, "Invalid email or password.")

    token = create_access_token({"sub": str(user.id)})
    return AuthResponse(access_token=token, user_id=str(user.id), username=user.username)
