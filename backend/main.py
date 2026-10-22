from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from config.settings import get_settings
from models.database import engine
from models.models import Base
from routers import auth, photos, products, users, explore, share
from middleware.rate_limit import limiter

settings = get_settings()

# Never run production with the public default key: anyone could forge login tokens.
DEFAULT_SECRET_KEYS = {"local-dev-secret-change-in-production", "local-dev-secret-do-not-use-in-prod",
                       "change-me-to-a-long-random-string"}
if settings.ENVIRONMENT == "production" and (settings.SECRET_KEY in DEFAULT_SECRET_KEYS or len(settings.SECRET_KEY) < 32):
    raise RuntimeError("Set SECRET_KEY to a long random value (32+ characters) before running in production. "
                       "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\"")

print(f"\n🌿 Glow Journal API starting...")
print(f"   Environment : {settings.ENVIRONMENT}")
print(f"   Storage     : {settings.STORAGE_BACKEND}")
print(f"   Database    : {settings.DATABASE_URL.split('@')[-1]}")
print(f"   Backend URL : {settings.BACKEND_URL}\n")

Base.metadata.create_all(bind=engine)
Path("uploads").mkdir(exist_ok=True)

app = FastAPI(
    title="Skincare Tracker API",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://0.0.0.0:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.STORAGE_BACKEND == "local":
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router,     prefix="/api/v1")
app.include_router(photos.router,   prefix="/api/v1")
app.include_router(products.router, prefix="/api/v1")
app.include_router(users.router,    prefix="/api/v1")
app.include_router(explore.router,  prefix="/api/v1")
app.include_router(share.router,    prefix="/api/v1")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "storage": settings.STORAGE_BACKEND,
    }
