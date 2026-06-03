"""
Image service — uses LOCAL disk in development, S3 in production.
Set STORAGE_BACKEND=local in .env to use local storage.
"""
import os
import uuid
import shutil
import io
from pathlib import Path
from PIL import Image
from fastapi import UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from config.settings import get_settings

settings = get_settings()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
MAX_BYTES = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024

# Local storage root
LOCAL_UPLOAD_DIR = Path("uploads")
LOCAL_UPLOAD_DIR.mkdir(exist_ok=True)
(LOCAL_UPLOAD_DIR / "temp").mkdir(exist_ok=True)
(LOCAL_UPLOAD_DIR / "photos").mkdir(exist_ok=True)


def _make_thumbnail(data: bytes, size=(400, 400)) -> bytes:
    img = Image.open(io.BytesIO(data))
    img.thumbnail(size, Image.LANCZOS)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=80)
    return buf.getvalue()


def _local_url(rel_path: str) -> str:
    return f"{settings.BACKEND_URL}/uploads/{rel_path}"


def _s3_url(key: str) -> str:
    return f"https://{settings.S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{key}"


def _use_local() -> bool:
    return settings.STORAGE_BACKEND == "local"


# ── UPLOAD ────────────────────────────────────────────────────────────────────

async def upload_temp_photo(file: UploadFile, user_id: str) -> dict:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Only JPEG, PNG, WebP or HEIC images are allowed.")

    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(400, f"Image must be under {settings.MAX_IMAGE_SIZE_MB} MB.")

    photo_id = str(uuid.uuid4())
    thumbnail = _make_thumbnail(data)

    if _use_local():
        folder = LOCAL_UPLOAD_DIR / "temp" / user_id / photo_id
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "original.jpg").write_bytes(data)
        (folder / "thumb.jpg").write_bytes(thumbnail)
        s3_key = f"temp/{user_id}/{photo_id}/original.jpg"
        thumb_url = _local_url(f"temp/{user_id}/{photo_id}/thumb.jpg")
        prev_url  = _local_url(f"temp/{user_id}/{photo_id}/original.jpg")
    else:
        import boto3
        s3 = _s3_client()
        s3_key   = f"temp/{user_id}/{photo_id}/original.jpg"
        thumb_key = f"temp/{user_id}/{photo_id}/thumb.jpg"
        s3.put_object(Bucket=settings.S3_BUCKET, Key=s3_key,   Body=data,      ContentType="image/jpeg")
        s3.put_object(Bucket=settings.S3_BUCKET, Key=thumb_key, Body=thumbnail, ContentType="image/jpeg")
        thumb_url = _s3_url(thumb_key)
        prev_url  = _s3_url(s3_key)

    return {
        "temp_id":      photo_id,
        "s3_key":       s3_key,
        "thumbnail_url": thumb_url,
        "preview_url":   prev_url,
    }


def promote_temp_photo(user_id: str, temp_s3_key: str) -> dict:
    entry_id = str(uuid.uuid4())

    if _use_local():
        # temp_s3_key = "temp/{user_id}/{photo_id}/original.jpg"
        parts     = Path(temp_s3_key)
        photo_id  = parts.parts[2]          # index 2: the uuid
        src_dir   = LOCAL_UPLOAD_DIR / "temp" / user_id / photo_id
        dest_dir  = LOCAL_UPLOAD_DIR / "photos" / user_id / entry_id
        dest_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy(src_dir / "original.jpg", dest_dir / "original.jpg")
        shutil.copy(src_dir / "thumb.jpg",    dest_dir / "thumb.jpg")
        shutil.rmtree(src_dir, ignore_errors=True)
        return {
            "image_url":     _local_url(f"photos/{user_id}/{entry_id}/original.jpg"),
            "thumbnail_url": _local_url(f"photos/{user_id}/{entry_id}/thumb.jpg"),
        }
    else:
        import boto3
        s3 = _s3_client()
        dest_key  = f"photos/{user_id}/{entry_id}/original.jpg"
        thumb_dest = f"photos/{user_id}/{entry_id}/thumb.jpg"
        thumb_src  = temp_s3_key.replace("/original.jpg", "/thumb.jpg")
        s3.copy_object(Bucket=settings.S3_BUCKET, CopySource={"Bucket": settings.S3_BUCKET, "Key": temp_s3_key}, Key=dest_key)
        s3.copy_object(Bucket=settings.S3_BUCKET, CopySource={"Bucket": settings.S3_BUCKET, "Key": thumb_src},   Key=thumb_dest)
        s3.delete_objects(Bucket=settings.S3_BUCKET, Delete={"Objects": [{"Key": temp_s3_key}, {"Key": thumb_src}]})
        return {"image_url": _s3_url(dest_key), "thumbnail_url": _s3_url(thumb_dest)}


def delete_s3_photo(image_url: str):
    if _use_local():
        # image_url = http://localhost:8000/uploads/photos/...
        rel = image_url.split("/uploads/")[-1]
        p = LOCAL_UPLOAD_DIR / rel
        thumb = p.parent / "thumb.jpg"
        p.unlink(missing_ok=True)
        thumb.unlink(missing_ok=True)
    else:
        import boto3
        s3  = _s3_client()
        key = image_url.split(f"{settings.S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/")[-1]
        thumb_key = key.replace("/original.jpg", "/thumb.jpg")
        s3.delete_objects(Bucket=settings.S3_BUCKET, Delete={"Objects": [{"Key": key}, {"Key": thumb_key}]})


def delete_temp_photo_s3(s3_key: str):
    if _use_local():
        parts    = Path(s3_key)
        user_id  = parts.parts[1]
        photo_id = parts.parts[2]
        shutil.rmtree(LOCAL_UPLOAD_DIR / "temp" / user_id / photo_id, ignore_errors=True)
    else:
        import boto3
        s3 = _s3_client()
        thumb_key = s3_key.replace("/original.jpg", "/thumb.jpg")
        s3.delete_objects(Bucket=settings.S3_BUCKET, Delete={"Objects": [{"Key": s3_key}, {"Key": thumb_key}]})


def _s3_client():
    import boto3
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )
