from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.bot import BotPersonality, BotActivityType


# Bot Configuration Schemas
class BotConfigBase(BaseModel):
    personality: BotPersonality = BotPersonality.FRIENDLY
    interests: List[str] = Field(default_factory=list)
    activity_frequency: int = Field(default=60, ge=5, le=1440)  # 5 minutes to 24 hours
    max_daily_activities: int = Field(default=10, ge=1, le=100)
    
    can_post: bool = True
    can_comment: bool = True
    can_message: bool = True  # Enable messaging by default
    can_create_communities: bool = False
    can_list_products: bool = True
    
    content_topics: List[str] = Field(default_factory=list)
    language_style: str = "casual"
    emoji_usage: str = "moderate"


class BotCreate(BotConfigBase):
    """Create a bot - requires username, email, password for the user account"""
    username: str = Field(..., min_length=3, max_length=50)
    email: str
    password: str = Field(..., min_length=6)
    bio_template: Optional[str] = None


class BotUpdate(BaseModel):
    """Update bot configuration"""
    personality: Optional[BotPersonality] = None
    interests: Optional[List[str]] = None
    is_active: Optional[bool] = None
    activity_frequency: Optional[int] = Field(None, ge=5, le=1440)
    max_daily_activities: Optional[int] = Field(None, ge=1, le=100)
    
    can_post: Optional[bool] = None
    can_comment: Optional[bool] = None
    can_message: Optional[bool] = None
    can_create_communities: Optional[bool] = None
    can_list_products: Optional[bool] = None
    
    content_topics: Optional[List[str]] = None
    language_style: Optional[str] = None
    emoji_usage: Optional[str] = None


class BotResponse(BaseModel):
    """Bot profile response"""
    id: int
    user_id: int
    username: str
    email: str
    profile_picture: Optional[str]
    
    personality: BotPersonality
    interests: List[str]
    is_active: bool
    activity_frequency: int
    max_daily_activities: int
    
    can_post: bool
    can_comment: bool
    can_message: bool
    can_create_communities: bool
    can_list_products: bool
    
    content_topics: List[str]
    language_style: str
    emoji_usage: str
    
    total_posts: int
    total_comments: int
    total_messages: int
    total_products: int
    
    created_at: datetime
    last_activity_at: Optional[datetime]

    class Config:
        from_attributes = True


# Bot Activity Schemas
class BotActivityCreate(BaseModel):
    """Log a bot activity"""
    activity_type: BotActivityType
    description: str
    post_id: Optional[int] = None
    comment_id: Optional[int] = None
    message_id: Optional[int] = None
    community_id: Optional[int] = None
    product_id: Optional[int] = None
    success: bool = True
    error_message: Optional[str] = None
    extra_data: Dict[str, Any] = Field(default_factory=dict)


class BotActivityResponse(BaseModel):
    """Bot activity log response"""
    id: int
    bot_id: int
    activity_type: BotActivityType
    description: str
    success: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Bot Action Triggers
class TriggerBotActivity(BaseModel):
    """Manually trigger a bot activity"""
    activity_type: BotActivityType
    target_id: Optional[int] = None  # For comment/reply targets


class BotStats(BaseModel):
    """Bot statistics"""
    total_bots: int
    active_bots: int
    total_activities_today: int
    total_activities_all_time: int
    activities_by_type: Dict[str, int]


# Seed Configuration
class BotSeedConfig(BaseModel):
    """Configuration for seeding bots"""
    count: int = Field(default=10, ge=1, le=100)
    personality_distribution: Optional[Dict[str, int]] = None
    include_products: bool = True
    include_posts: bool = True
    include_communities: bool = False
