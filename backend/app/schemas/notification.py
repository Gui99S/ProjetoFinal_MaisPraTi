"""
Pydantic schemas for notifications
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum


class NotificationType(str, Enum):
    """Notification type enum"""
    LIKE = "like"
    COMMENT = "comment"
    FRIEND_REQUEST = "friend_request"
    FRIEND_ACCEPT = "friend_accept"
    MESSAGE = "message"
    COMMUNITY_POST = "community_post"
    COMMUNITY_INVITE = "community_invite"
    MENTION = "mention"
    PRODUCT_SOLD = "product_sold"


class NotificationCreate(BaseModel):
    """Schema for creating a notification"""
    user_id: int
    type: NotificationType
    title: str = Field(..., max_length=200)
    message: Optional[str] = Field(None, max_length=500)
    related_id: Optional[int] = None
    related_type: Optional[str] = Field(None, max_length=50)
    actor_id: Optional[int] = None


class NotificationActor(BaseModel):
    """Actor who triggered the notification"""
    id: int
    name: str
    avatar: Optional[str] = None
    slug: Optional[str] = None

    class Config:
        from_attributes = True


class NotificationResponse(BaseModel):
    """Schema for notification response"""
    id: int
    user_id: int
    type: NotificationType
    title: str
    message: Optional[str] = None
    related_id: Optional[int] = None
    related_type: Optional[str] = None
    actor_id: Optional[int] = None
    actor: Optional[NotificationActor] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """Schema for list of notifications"""
    notifications: list[NotificationResponse]
    total: int
    unread_count: int


class UnreadCountResponse(BaseModel):
    """Schema for unread notification count"""
    count: int


class MarkAsReadRequest(BaseModel):
    """Schema for marking notification as read"""
    notification_ids: list[int] = Field(..., description="List of notification IDs to mark as read")
