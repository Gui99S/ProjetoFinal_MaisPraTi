from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from typing import Optional, List
import os
import uuid
from pathlib import Path
from PIL import Image
import shutil

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.photo import Photo
from app.schemas.photo import PhotoResponse, PhotoList, PhotoUpdate

router = APIRouter(prefix="/api/photos", tags=["photos"])

# Configuration
UPLOAD_DIR = Path("uploads/photos")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


def save_upload_file(upload_file: UploadFile, user_id: int) -> tuple[str, str, dict]:
    """Save uploaded file and return paths and metadata"""
    # Validate file extension
    file_ext = os.path.splitext(upload_file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Generate unique filename
    unique_filename = f"{user_id}_{uuid.uuid4().hex}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Get image dimensions and create thumbnail
    metadata = {}
    try:
        with Image.open(file_path) as img:
            metadata["width"] = img.width
            metadata["height"] = img.height
            
            # Create thumbnail (300x300)
            thumb_filename = f"thumb_{unique_filename}"
            thumb_path = UPLOAD_DIR / thumb_filename
            
            img.thumbnail((300, 300))
            img.save(thumb_path)
            
            thumbnail_url = f"/uploads/photos/{thumb_filename}"
    except Exception as e:
        # If thumbnail creation fails, continue without it
        thumbnail_url = None
        print(f"Failed to create thumbnail: {str(e)}")
    
    # Get file size
    metadata["file_size"] = file_path.stat().st_size
    
    file_url = f"/uploads/photos/{unique_filename}"
    
    return file_url, thumbnail_url, metadata


@router.post("/upload", response_model=PhotoResponse, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a new photo"""
    # Validate file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Save file
    file_url, thumbnail_url, metadata = save_upload_file(file, current_user.id)
    
    # Create photo record
    photo = Photo(
        user_id=current_user.id,
        url=file_url,
        thumbnail_url=thumbnail_url,
        caption=caption,
        file_name=file.filename,
        file_size=metadata.get("file_size"),
        mime_type=file.content_type,
        width=metadata.get("width"),
        height=metadata.get("height")
    )
    
    db.add(photo)
    db.commit()
    db.refresh(photo)
    
    return photo


@router.get("/user/{user_id}", response_model=PhotoList)
def get_user_photos(
    user_id: int,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get photos for a specific user"""
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Query photos
    query = db.query(Photo).filter(
        and_(
            Photo.user_id == user_id,
            Photo.is_deleted == False
        )
    ).order_by(desc(Photo.created_at))
    
    # Get total count
    total = query.count()
    
    # Paginate
    offset = (page - 1) * page_size
    photos = query.offset(offset).limit(page_size).all()
    
    total_pages = (total + page_size - 1) // page_size
    
    return PhotoList(
        photos=photos,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{photo_id}", response_model=PhotoResponse)
def get_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific photo by ID"""
    photo = db.query(Photo).filter(
        and_(
            Photo.id == photo_id,
            Photo.is_deleted == False
        )
    ).first()
    
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    return photo


@router.put("/{photo_id}", response_model=PhotoResponse)
def update_photo(
    photo_id: int,
    photo_update: PhotoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update photo caption"""
    photo = db.query(Photo).filter(
        and_(
            Photo.id == photo_id,
            Photo.is_deleted == False
        )
    ).first()
    
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Check ownership
    if photo.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this photo")
    
    # Update caption
    if photo_update.caption is not None:
        photo.caption = photo_update.caption
    
    db.commit()
    db.refresh(photo)
    
    return photo


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a photo (soft delete)"""
    photo = db.query(Photo).filter(
        and_(
            Photo.id == photo_id,
            Photo.is_deleted == False
        )
    ).first()
    
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Check ownership
    if photo.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this photo")
    
    # Soft delete
    photo.is_deleted = True
    db.commit()
    
    return None


@router.get("/user/{user_id}/count")
def get_user_photo_count(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get total photo count for a user"""
    count = db.query(func.count(Photo.id)).filter(
        and_(
            Photo.user_id == user_id,
            Photo.is_deleted == False
        )
    ).scalar()
    
    return {"user_id": user_id, "photo_count": count}
