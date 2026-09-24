import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = "local-dev-secret-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200

    # Storage: "local" (dev) or "s3" (production)
    STORAGE_BACKEND: str = "local"
    BACKEND_URL: str = "http://localhost:8000"

    # AWS (only needed when STORAGE_BACKEND=s3)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET: str = ""

    # Anthropic (optional — AI product search falls back gracefully if missing)
    ANTHROPIC_API_KEY: str = ""

    FRONTEND_URL: str = "http://localhost:3000"
    MAX_IMAGE_SIZE_MB: int = 15
    ENVIRONMENT: str = "development"

    class Config:
        # Which .env file to load, e.g. ENV_FILE=.env.production (defaults to .env.development).
        # Real environment variables always take precedence over values in the file.
        env_file = os.environ.get("ENV_FILE", ".env.development")


@lru_cache()
def get_settings():
    return Settings()
