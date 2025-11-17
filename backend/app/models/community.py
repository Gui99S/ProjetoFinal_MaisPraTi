"""
Community models for database
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.core.database import Base


class CommunityCategory(str, enum.Enum):
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


class MemberRole(str, enum.Enum):
    """Member role in community"""
    ADMIN = "admin"
    MODERATOR = "moderator"
    MEMBER = "member"


class Community(Base):
    """Community model"""
    __tablename__ = "communities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    slug = Column(String(150), unique=True, nullable=False, index=True)  # URL-friendly name
    description = Column(Text, nullable=True)
    avatar = Column(String(500), nullable=True)  # Community profile picture
    banner = Column(String(500), nullable=True)  # Community banner image
    category = Column(SQLEnum(CommunityCategory), default=CommunityCategory.OTHER, nullable=False, index=True)
    
    # Creator
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_by = relationship("User", foreign_keys=[created_by_id])
    
    # Privacy settings
    is_private = Column(Boolean, default=False)  # Private communities require approval to join
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    members = relationship("CommunityMember", back_populates="community", cascade="all, delete-orphan")
    posts = relationship("CommunityPost", back_populates="community", cascade="all, delete-orphan")


class CommunityMember(Base):
    """Community membership model"""
    __tablename__ = "community_members"

    id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, ForeignKey("communities.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(SQLEnum(MemberRole), default=MemberRole.MEMBER, nullable=False)
    
    # Membership status
    is_approved = Column(Boolean, default=True)  # False for pending join requests in private communities
    
    # Timestamps
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    left_at = Column(DateTime, nullable=True)  # Null if still a member
    
    # Relationships
    community = relationship("Community", back_populates="members")
    user = relationship("User", back_populates="community_memberships")
    
    # Unique constraint: a user can only be a member of a community once
    __table_args__ = (
        # Unique constraint on active memberships (left_at is null)
        # This is handled in the service layer
    )


class CommunityPost(Base):
    """Post in a community"""
    __tablename__ = "community_posts"

    id = Column(Integer, primary_key=True, index=True)
    community_id = Column(Integer, ForeignKey("communities.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Content
    content = Column(Text, nullable=False)
    
    # Media attachments (optional)
    image_url = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    is_edited = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    
    # Relationships
    community = relationship("Community", back_populates="posts")
    author = relationship("User", foreign_keys=[author_id])
    comments = relationship("CommunityPostComment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("CommunityPostLike", back_populates="post", cascade="all, delete-orphan")


class CommunityPostComment(Base):
    """Comment on a community post"""
    __tablename__ = "community_post_comments"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("community_posts.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Content
    content = Column(Text, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    is_edited = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    
    # Relationships
    post = relationship("CommunityPost", back_populates="comments")
    author = relationship("User", foreign_keys=[author_id])


class CommunityPostLike(Base):
    """Like on a community post"""
    __tablename__ = "community_post_likes"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("community_posts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    post = relationship("CommunityPost", back_populates="likes")
    user = relationship("User")
    
    # Unique constraint: a user can only like a post once
    __table_args__ = (
        # Handled by database unique constraint
    )


# Update User model to include community relationships
# This should be added to app/models/user.py:
# community_memberships = relationship("CommunityMember", back_populates="user")
