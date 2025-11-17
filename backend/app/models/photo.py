from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Photo(Base):
    """User photo/gallery model"""
    __tablename__ = "photos"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Image storage
    url = Column(String(500), nullable=False)  # Full image URL
    thumbnail_url = Column(String(500), nullable=True)  # Optional thumbnail
    
    # Metadata
    caption = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=True)  # Size in bytes
    mime_type = Column(String(50), nullable=True)  # image/jpeg, image/png, etc.
    
    # Dimensions
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    
    # Status
    is_deleted = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="photos")
