from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base


class BotPersonality(str, enum.Enum):
    """Bot personality types"""
    FRIENDLY = "friendly"
    PROFESSIONAL = "professional"
    HUMOROUS = "humorous"
    EDUCATIONAL = "educational"
    ENTHUSIAST = "enthusiast"
    CREATIVE = "creative"
    ANALYTICAL = "analytical"


class BotActivityType(str, enum.Enum):
    """Types of autonomous bot activities"""
    POST = "post"
    COMMENT = "comment"
    MESSAGE = "message"
    COMMUNITY_CREATE = "community_create"
    COMMUNITY_JOIN = "community_join"
    PRODUCT_LIST = "product_list"
    REACT = "react"


class Bot(Base):
    """Bot profile model - extends User with bot-specific features"""
    __tablename__ = "bots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Bot Configuration
    personality = Column(SQLEnum(BotPersonality), default=BotPersonality.FRIENDLY)
    bio_template = Column(Text)  # Template for generating bio
    interests = Column(JSON, default=list)  # List of interest topics
    
    # Activity Configuration
    is_active = Column(Boolean, default=True)  # Whether bot should perform activities
    activity_frequency = Column(Integer, default=60)  # Minutes between activities
    max_daily_activities = Column(Integer, default=10)
    
    # Activity Preferences (what activities this bot performs)
    can_post = Column(Boolean, default=True)
    can_comment = Column(Boolean, default=True)
    can_message = Column(Boolean, default=True)  # Enable messaging by default
    can_create_communities = Column(Boolean, default=False)
    can_list_products = Column(Boolean, default=True)
    
    # Content Configuration
    content_topics = Column(JSON, default=list)  # Topics bot posts about
    language_style = Column(String(50), default="casual")  # casual, formal, technical
    emoji_usage = Column(String(20), default="moderate")  # none, low, moderate, high
    
    # Statistics
    total_posts = Column(Integer, default=0)
    total_comments = Column(Integer, default=0)
    total_messages = Column(Integer, default=0)
    total_products = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    last_activity_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="bot_profile", foreign_keys=[user_id])
    activity_log = relationship("BotActivity", back_populates="bot", cascade="all, delete-orphan")


class BotActivity(Base):
    """Log of bot activities for tracking and analytics"""
    __tablename__ = "bot_activities"

    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(Integer, ForeignKey("bots.id", ondelete="CASCADE"), nullable=False)
    
    activity_type = Column(SQLEnum(BotActivityType), nullable=False)
    description = Column(Text)  # What the bot did
    
    # References to created content
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="SET NULL"), nullable=True)
    comment_id = Column(Integer, nullable=True)  # If we have comments table
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    community_id = Column(Integer, ForeignKey("communities.id", ondelete="SET NULL"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    
    # Activity metadata
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    extra_data = Column(JSON, default=dict)  # Additional context (renamed from metadata to avoid SQLAlchemy conflict)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    bot = relationship("Bot", back_populates="activity_log")
    post = relationship("Post", foreign_keys=[post_id])
    message = relationship("Message", foreign_keys=[message_id])
    community = relationship("Community", foreign_keys=[community_id])
    product = relationship("Product", foreign_keys=[product_id])
