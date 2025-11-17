"""
Pydantic schemas for friendship operations
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class FriendRequest(BaseModel):
    """Schema for sending a friend request"""
    friend_id: int = Field(..., description="ID of the user to send friend request to")


class FriendUser(BaseModel):
    """Schema for friend user information"""
    id: int
    name: str
    slug: str
    avatar: Optional[str] = None
    status: Optional[str] = None  # User status (Single, Married, etc.)
    location: Optional[str] = None
    is_bot: bool = False  # Whether this user is a bot


class FriendshipResponse(BaseModel):
    """Schema for friendship information"""
    id: int
    user_id: int
    friend_id: int
    status: str  # pending, accepted, rejected
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Include friend user details
    friend: Optional[FriendUser] = None
    
    class Config:
        from_attributes = True


class FriendshipStatus(BaseModel):
    """Schema for checking friendship status between two users"""
    status: Optional[str] = None  # None, pending, accepted, rejected
    friendship_id: Optional[int] = None
    is_requester: Optional[bool] = None  # True if current user sent the request


class FriendsList(BaseModel):
    """Schema for paginated friends list"""
    friends: list[FriendUser]
    total: int
    page: int
    page_size: int


class PendingRequestsList(BaseModel):
    """Schema for pending friend requests"""
    requests: list[FriendshipResponse]
    total: int
