"""
Pydantic schemas for posts, comments, and likes
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# Post schemas
class PostCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=141, description="Post content (max 141 characters)")


class PostUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=141)


class PostAuthor(BaseModel):
    id: int
    name: str
    slug: Optional[str] = None  # URL slug for profile
    avatar: Optional[str] = None
    is_bot: bool = False  # Flag to identify bot accounts
    
    class Config:
        from_attributes = True


class PostResponse(BaseModel):
    id: int
    content: str
    likes_count: int
    dislikes_count: int
    comments_count: int
    created_at: datetime
    user: PostAuthor
    user_liked: Optional[bool] = None  # True if user liked, False if disliked, None if neither
    
    class Config:
        from_attributes = True


# Comment schemas
class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, description="Comment content")


class CommentAuthor(BaseModel):
    id: int
    name: str
    slug: Optional[str] = None  # URL slug for profile
    avatar: Optional[str] = None
    is_bot: bool = False  # Flag to identify bot accounts
    
    class Config:
        from_attributes = True


class CommentResponse(BaseModel):
    id: int
    content: str
    created_at: datetime
    user: CommentAuthor
    
    class Config:
        from_attributes = True


# Like schemas
class LikeResponse(BaseModel):
    message: str
    likes_count: int
    dislikes_count: int
    user_liked: Optional[bool] = None


# Feed response with pagination
class PostsFeed(BaseModel):
    posts: List[PostResponse]
    total: int
    page: int
    page_size: int
    has_more: bool
