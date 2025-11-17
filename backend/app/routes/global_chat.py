from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import random

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.message import Message, Conversation, ConversationParticipant, ConversationType
from app.schemas.message import MessageResponse, MessageCreate
from pydantic import BaseModel

router = APIRouter(prefix="/global-chat", tags=["global-chat"])


class GlobalMessageResponse(BaseModel):
    id: int
    content: str
    author_id: int
    author_name: str
    author_avatar: str | None
    author_slug: str
    is_bot: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class GlobalMessageCreate(BaseModel):
    content: str


# Global chat conversation IDs (we'll use special IDs)
GLOBAL_CHAT_ID = -1  # For users only
BOT_CHAT_ID = -2     # For users + bots


def get_or_create_global_conversation(db: Session, chat_type: str) -> Conversation:
    """Get or create global chat conversation"""
    conv_id = GLOBAL_CHAT_ID if chat_type == "global" else BOT_CHAT_ID
    
    # Try to find existing conversation
    conversation = db.query(Conversation).filter(
        Conversation.id == conv_id
    ).first()
    
    if not conversation:
        # Create new global conversation
        conversation = Conversation(
            id=conv_id,
            type=ConversationType.GROUP,
            name="Global Chat" if chat_type == "global" else "Bot Chat",
            created_by_id=None
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    
    return conversation


@router.get("/messages", response_model=List[GlobalMessageResponse])
async def get_global_messages(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get global chat messages (no bots)"""
    # Ensure global chat exists
    conversation = get_or_create_global_conversation(db, "global")
    
    # Get messages from non-bot users only
    messages = db.query(Message).join(User).filter(
        Message.conversation_id == GLOBAL_CHAT_ID,
        User.is_bot == False
    ).order_by(Message.created_at.desc()).limit(limit).all()
    
    # Transform to response format
    result = []
    for msg in reversed(messages):  # Reverse to show oldest first
        result.append(GlobalMessageResponse(
            id=msg.id,
            content=msg.content,
            author_id=msg.sender.id,
            author_name=msg.sender.name,
            author_avatar=msg.sender.avatar,
            author_slug=msg.sender.slug,
            is_bot=msg.sender.is_bot,
            created_at=msg.created_at
        ))
    
    return result


@router.post("/messages", response_model=GlobalMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_global_message(
    message_data: GlobalMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message to global chat"""
    # Ensure global chat exists
    conversation = get_or_create_global_conversation(db, "global")
    
    # Ensure user is a participant
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == GLOBAL_CHAT_ID,
        ConversationParticipant.user_id == current_user.id,
        ConversationParticipant.is_active == True
    ).first()
    
    if not participant:
        participant = ConversationParticipant(
            conversation_id=GLOBAL_CHAT_ID,
            user_id=current_user.id,
            is_active=True
        )
        db.add(participant)
        db.commit()
    
    # Create message
    new_message = Message(
        conversation_id=GLOBAL_CHAT_ID,
        sender_id=current_user.id,
        content=message_data.content.strip()
    )
    
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    return GlobalMessageResponse(
        id=new_message.id,
        content=new_message.content,
        author_id=current_user.id,
        author_name=current_user.name,
        author_avatar=current_user.avatar,
        author_slug=current_user.slug,
        is_bot=current_user.is_bot,
        created_at=new_message.created_at
    )


@router.get("/bot-messages", response_model=List[GlobalMessageResponse])
async def get_bot_messages(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get bot chat messages (users + bots)"""
    # Ensure bot chat exists
    conversation = get_or_create_global_conversation(db, "bot")
    
    # Get all messages
    messages = db.query(Message).join(User).filter(
        Message.conversation_id == BOT_CHAT_ID
    ).order_by(Message.created_at.desc()).limit(limit).all()
    
    # Transform to response format
    result = []
    for msg in reversed(messages):  # Reverse to show oldest first
        result.append(GlobalMessageResponse(
            id=msg.id,
            content=msg.content,
            author_id=msg.sender.id,
            author_name=msg.sender.name,
            author_avatar=msg.sender.avatar,
            author_slug=msg.sender.slug,
            is_bot=msg.sender.is_bot,
            created_at=msg.created_at
        ))
    
    return result


@router.post("/bot-messages", response_model=GlobalMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_bot_message(
    message_data: GlobalMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message to bot chat and get instant bot response"""
    # Ensure bot chat exists
    conversation = get_or_create_global_conversation(db, "bot")
    
    # Ensure user is a participant
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == BOT_CHAT_ID,
        ConversationParticipant.user_id == current_user.id,
        ConversationParticipant.is_active == True
    ).first()
    
    if not participant:
        participant = ConversationParticipant(
            conversation_id=BOT_CHAT_ID,
            user_id=current_user.id,
            is_active=True
        )
        db.add(participant)
        db.commit()
    
    # Create user message
    new_message = Message(
        conversation_id=BOT_CHAT_ID,
        sender_id=current_user.id,
        content=message_data.content.strip()
    )
    
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    # Get a random bot to respond
    bots = db.query(User).filter(User.is_bot == True).all()
    if bots:
        bot = random.choice(bots)
        
        # Generate bot response
        bot_responses = [
            "That's interesting! Tell me more.",
            "I see what you mean. Great point!",
            "Thanks for sharing that with me!",
            "Fascinating! I'd love to hear more about it.",
            "That's a cool perspective!",
            "I completely agree with you on that.",
            "Hmm, let me think about that...",
            "You make a valid point there!",
            "I appreciate your input!",
            "That's something worth discussing!"
        ]
        
        bot_message = Message(
            conversation_id=BOT_CHAT_ID,
            sender_id=bot.id,
            content=random.choice(bot_responses)
        )
        
        db.add(bot_message)
        db.commit()
    
    return GlobalMessageResponse(
        id=new_message.id,
        content=new_message.content,
        author_id=current_user.id,
        author_name=current_user.name,
        author_avatar=current_user.avatar,
        author_slug=current_user.slug,
        is_bot=current_user.is_bot,
        created_at=new_message.created_at
    )
