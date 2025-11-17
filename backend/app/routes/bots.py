from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.bot import Bot, BotPersonality
from app.schemas.bot import (
    BotCreate, BotUpdate, BotResponse, BotActivityResponse,
    TriggerBotActivity, BotStats, BotSeedConfig
)
from app.services.bot_service import BotService
import random


router = APIRouter(prefix="/bots", tags=["bots"])


def format_bot_response(bot: Bot) -> BotResponse:
    """Format bot for response"""
    return BotResponse(
        id=bot.id,
        user_id=bot.user_id,
        username=bot.user.name,
        email=bot.user.email,
        profile_picture=bot.user.avatar,
        personality=bot.personality,
        interests=bot.interests,
        is_active=bot.is_active,
        activity_frequency=bot.activity_frequency,
        max_daily_activities=bot.max_daily_activities,
        can_post=bot.can_post,
        can_comment=bot.can_comment,
        can_message=bot.can_message,
        can_create_communities=bot.can_create_communities,
        can_list_products=bot.can_list_products,
        content_topics=bot.content_topics,
        language_style=bot.language_style,
        emoji_usage=bot.emoji_usage,
        total_posts=bot.total_posts,
        total_comments=bot.total_comments,
        total_messages=bot.total_messages,
        total_products=bot.total_products,
        created_at=bot.created_at,
        last_activity_at=bot.last_activity_at,
    )


@router.post("/", response_model=BotResponse, status_code=status.HTTP_201_CREATED)
def create_bot(
    bot_data: BotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new bot (admin only in production)"""
    # In production, add admin check here
    # if not current_user.is_admin:
    #     raise HTTPException(status_code=403, detail="Admin access required")
    
    bot = BotService.create_bot(db, bot_data)
    return format_bot_response(bot)


@router.get("/", response_model=List[BotResponse])
def list_bots(
    skip: int = 0,
    limit: int = 50,
    active_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all bots"""
    query = db.query(Bot)
    
    if active_only:
        query = query.filter(Bot.is_active == True)
    
    bots = query.offset(skip).limit(limit).all()
    return [format_bot_response(bot) for bot in bots]


@router.get("/{bot_id}", response_model=BotResponse)
def get_bot(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get bot by ID"""
    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    return format_bot_response(bot)


@router.patch("/{bot_id}", response_model=BotResponse)
def update_bot(
    bot_id: int,
    bot_update: BotUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update bot configuration"""
    bot = BotService.update_bot(db, bot_id, bot_update)
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    return format_bot_response(bot)


@router.delete("/{bot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bot(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a bot"""
    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    # Delete associated user (cascade will delete bot)
    db.delete(bot.user)
    db.commit()


@router.post("/{bot_id}/trigger", response_model=dict)
def trigger_bot_activity(
    bot_id: int,
    trigger: TriggerBotActivity,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually trigger a bot activity"""
    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    if not bot.is_active:
        raise HTTPException(status_code=400, detail="Bot is not active")
    
    result = None
    if trigger.activity_type.value == "post":
        result = BotService.create_bot_post(db, bot)
    elif trigger.activity_type.value == "product_list":
        result = BotService.create_bot_product(db, bot)
    
    if result:
        return {
            "success": True,
            "activity_type": trigger.activity_type.value,
            "result_id": result.id
        }
    
    return {"success": False, "message": "Bot cannot perform this activity"}


@router.post("/{bot_id}/activate", response_model=BotResponse)
def activate_bot(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Activate a bot"""
    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    bot.is_active = True
    db.commit()
    db.refresh(bot)
    
    return format_bot_response(bot)


@router.post("/{bot_id}/deactivate", response_model=BotResponse)
def deactivate_bot(
    bot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deactivate a bot"""
    bot = db.query(Bot).filter(Bot.id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    
    bot.is_active = False
    db.commit()
    db.refresh(bot)
    
    return format_bot_response(bot)


@router.get("/{bot_id}/activities", response_model=List[BotActivityResponse])
def get_bot_activities(
    bot_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get bot activity log"""
    from app.models.bot import BotActivity
    
    activities = db.query(BotActivity).filter(
        BotActivity.bot_id == bot_id
    ).order_by(BotActivity.created_at.desc()).offset(skip).limit(limit).all()
    
    return activities


@router.get("/stats/overview", response_model=BotStats)
def get_bot_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get overall bot statistics"""
    return BotService.get_bot_stats(db)


@router.post("/seed", response_model=dict)
def seed_bots(
    config: BotSeedConfig,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Seed the database with bots (dev/admin only)"""
    # In production, add admin check
    
    created_bots = []
    personalities = list(BotPersonality)
    
    interests_pool = [
        "technology", "coding", "ai", "design", "photography",
        "travel", "food", "fitness", "music", "gaming",
        "books", "movies", "art", "science", "business"
    ]
    
    content_topics = [
        "technology", "lifestyle", "entertainment", "food",
        "travel", "fitness", "education", "business"
    ]
    
    for i in range(config.count):
        name = BotService.generate_bot_name()
        personality = random.choice(personalities)
        bot_interests = random.sample(interests_pool, k=random.randint(3, 6))
        bot_topics = random.sample(content_topics, k=random.randint(2, 4))
        
        bot_data = BotCreate(
            username=name,
            email=f"{name.lower().replace(' ', '.')}@botnet.local",
            password="BotPass123!",
            personality=personality,
            interests=bot_interests,
            content_topics=bot_topics,
            activity_frequency=random.randint(30, 180),
            max_daily_activities=random.randint(5, 15),
            can_post=config.include_posts,
            can_list_products=config.include_products,
            can_create_communities=config.include_communities,
        )
        
        try:
            bot = BotService.create_bot(db, bot_data)
            created_bots.append(bot.id)
            
            # Make bot create initial content
            if config.include_posts and random.random() > 0.3:
                for _ in range(random.randint(1, 3)):
                    BotService.create_bot_post(db, bot)
            
            if config.include_products and random.random() > 0.5:
                for _ in range(random.randint(1, 2)):
                    BotService.create_bot_product(db, bot)
                    
        except Exception as e:
            print(f"Error creating bot {name}: {e}")
            continue
    
    return {
        "success": True,
        "bots_created": len(created_bots),
        "bot_ids": created_bots
    }


@router.post("/trigger-all", response_model=dict)
def trigger_all_active_bots(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Trigger random activity for all active bots that are due"""
    bots = BotService.get_active_bots(db)
    activities_performed = 0
    
    for bot in bots:
        if BotService.should_bot_act(db, bot):
            result = BotService.perform_random_activity(db, bot)
            if result:
                activities_performed += 1
    
    return {
        "success": True,
        "bots_checked": len(bots),
        "activities_performed": activities_performed
    }
