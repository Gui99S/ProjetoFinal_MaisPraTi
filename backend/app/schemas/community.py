"""
Community Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class CommunityCategory(str, Enum):
    """Community category enum"""
    TECHNOLOGY = "technology"
    GAMING = "gaming"
    MUSIC = "music"
    SPORTS = "sports"
    EDUCATION = "education"
    ENTERTAINMENT = "entertainment"
    LIFESTYLE = "lifestyle"
    BUSINESS = "business"
    HEALTH = "health"
    TRAVEL = "travel"
    FOOD = "food"
    ART = "art"
    OTHER = "other"


class MemberRole(str, Enum):
    """Member role in community"""
    ADMIN = "admin"
    MODERATOR = "moderator"
    MEMBER = "member"


# Request schemas
class CommunityCreate(BaseModel):
    """Create community request"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    category: CommunityCategory = CommunityCategory.OTHER
    is_private: bool = False
    avatar: Optional[str] = None
    banner: Optional[str] = None


class CommunityUpdate(BaseModel):
    """Update community request"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    category: Optional[CommunityCategory] = None
    is_private: Optional[bool] = None
    avatar: Optional[str] = None
    banner: Optional[str] = None


class CommunityPostCreate(BaseModel):
    """Create community post request"""
    content: str = Field(..., min_length=1, max_length=5000)
    image_url: Optional[str] = None


class CommunityPostUpdate(BaseModel):
    """Update community post request"""
    content: str = Field(..., min_length=1, max_length=5000)


class CommunityPostCommentCreate(BaseModel):
    """Create comment on community post"""
    content: str = Field(..., min_length=1, max_length=1000)


class MemberRoleUpdate(BaseModel):
    """Update member role in community"""
    role: MemberRole


# Response schemas
class UserBasic(BaseModel):
    """Basic user info for nested responses"""
    id: int
    name: str
    slug: Optional[str] = None
    avatar: Optional[str] = None
    
    class Config:
        from_attributes = True


class CommunityMemberResponse(BaseModel):
    """Community member response"""
    id: int
    user_id: int
    user: UserBasic
    role: MemberRole
    is_approved: bool
    joined_at: datetime
    
    class Config:
        from_attributes = True


class CommunityResponse(BaseModel):
    """Community response"""
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    avatar: Optional[str] = None
    banner: Optional[str] = None
    category: CommunityCategory
    is_private: bool
    created_by_id: int
    created_by: UserBasic
    member_count: int = 0
    is_member: bool = False
    user_role: Optional[MemberRole] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CommunityListResponse(BaseModel):
    """List of communities with pagination"""
    communities: List[CommunityResponse]
    total: int
    page: int
    page_size: int


class CommunityDetailResponse(BaseModel):
    """Detailed community response with members"""
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    avatar: Optional[str] = None
    banner: Optional[str] = None
    category: CommunityCategory
    is_private: bool
    created_by_id: int
    created_by: UserBasic
    member_count: int
    is_member: bool
    user_role: Optional[MemberRole] = None
    members: List[CommunityMemberResponse] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class CommunityPostCommentResponse(BaseModel):
    """Community post comment response"""
    id: int
    post_id: int
    author_id: int
    author: UserBasic
    content: str
    created_at: datetime
    is_edited: bool
    
    class Config:
        from_attributes = True


class CommunityPostResponse(BaseModel):
    """Community post response"""
    id: int
    community_id: int
    author_id: int
    author: UserBasic
    content: str
    image_url: Optional[str] = None
    created_at: datetime
    is_edited: bool
    like_count: int = 0
    comment_count: int = 0
    is_liked: bool = False
    comments: List[CommunityPostCommentResponse] = []
    
    class Config:
        from_attributes = True


class CommunityPostListResponse(BaseModel):
    """List of community posts with pagination"""
    posts: List[CommunityPostResponse]
    total: int
    page: int
    page_size: int
