from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class PhotoBase(BaseModel):
    """Base photo schema"""
    caption: Optional[str] = Field(None, max_length=500)


class PhotoCreate(PhotoBase):
    """Schema for creating a photo"""
    pass


class PhotoUpdate(BaseModel):
    """Schema for updating a photo"""
    caption: Optional[str] = Field(None, max_length=500)


class PhotoResponse(PhotoBase):
    """Schema for photo response"""
    id: int
    user_id: int
    url: str
    thumbnail_url: Optional[str] = None
    file_name: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class PhotoList(BaseModel):
    """Schema for paginated photo list"""
    photos: List[PhotoResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
