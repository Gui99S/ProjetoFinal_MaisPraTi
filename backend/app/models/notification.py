"""
Notification model for user notifications
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from app.core.database import Base


class NotificationType(str, enum.Enum):
    """Notification type enum"""
    LIKE = "like"                      # Someone liked your post
    COMMENT = "comment"                 # Someone commented on your post
    FRIEND_REQUEST = "friend_request"   # Someone sent you a friend request
    FRIEND_ACCEPT = "friend_accept"     # Someone accepted your friend request
    MESSAGE = "message"                 # New message in conversation
    COMMUNITY_POST = "community_post"   # New post in your community
    COMMUNITY_INVITE = "community_invite"  # Invited to join community
    MENTION = "mention"                 # Someone mentioned you
    PRODUCT_SOLD = "product_sold"       # Your product was purchased


class Notification(Base):
    """User notification model"""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Notification details
    type = Column(SQLEnum(NotificationType), nullable=False, index=True)
    title = Column(String(200), nullable=False)  # "John liked your post"
    message = Column(String(500), nullable=True)  # Optional detailed message
    
    # Related entity reference (e.g., post_id, friend_request_id, message_id)
    related_id = Column(Integer, nullable=True)
    related_type = Column(String(50), nullable=True)  # "post", "friendship", "message", etc.
    
    # Actor (who triggered the notification)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    
    # Read status
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="notifications")
    actor = relationship("User", foreign_keys=[actor_id])
