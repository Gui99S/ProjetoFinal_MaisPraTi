"""
Message service - Business logic for messaging operations
"""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc
from typing import List, Optional, Tuple
from datetime import datetime

from app.models.message import Message, Conversation, ConversationParticipant, ConversationType
from app.models.user import User
from app.schemas.message import (
    MessageCreate, ConversationCreate, ConversationUpdate,
    MessageResponse, ConversationResponse, ParticipantResponse
)


def get_or_create_direct_conversation(
    db: Session, user_id: int, other_user_id: int
) -> Conversation:
    """Get existing direct conversation or create new one"""
    
    # Check if direct conversation already exists between these users
    conversation = db.query(Conversation).join(
        ConversationParticipant,
        Conversation.id == ConversationParticipant.conversation_id
    ).filter(
        Conversation.type == ConversationType.DIRECT,
        ConversationParticipant.user_id.in_([user_id, other_user_id]),
        ConversationParticipant.is_active == True
    ).group_by(
        Conversation.id
    ).having(
        func.count(ConversationParticipant.id) == 2
    ).first()
    
    if conversation:
        # Verify both users are participants
        participant_ids = [p.user_id for p in conversation.participants if p.is_active]
        if set(participant_ids) == {user_id, other_user_id}:
            return conversation
    
    # Create new direct conversation
    new_conversation = Conversation(
        type=ConversationType.DIRECT,
        created_by_id=user_id
    )
    db.add(new_conversation)
    db.flush()
    
    # Add participants
    for uid in [user_id, other_user_id]:
        participant = ConversationParticipant(
            conversation_id=new_conversation.id,
            user_id=uid
        )
        db.add(participant)
    
    db.commit()
    db.refresh(new_conversation)
    return new_conversation


def create_group_conversation(
    db: Session, user_id: int, name: str, participant_ids: List[int], avatar: Optional[str] = None
) -> Conversation:
    """Create a new group conversation"""
    
    # Verify all participants exist
    users = db.query(User).filter(User.id.in_(participant_ids)).all()
    if len(users) != len(participant_ids):
        raise ValueError("One or more users not found")
    
    # Create group conversation
    conversation = Conversation(
        type=ConversationType.GROUP,
        name=name,
        avatar=avatar,
        created_by_id=user_id
    )
    db.add(conversation)
    db.flush()
    
    # Add creator as participant if not already in list
    all_participant_ids = set(participant_ids)
    all_participant_ids.add(user_id)
    
    for uid in all_participant_ids:
        participant = ConversationParticipant(
            conversation_id=conversation.id,
            user_id=uid
        )
        db.add(participant)
    
    db.commit()
    db.refresh(conversation)
    return conversation


def get_user_conversations(
    db: Session, user_id: int, page: int = 1, page_size: int = 20
) -> Tuple[List[Conversation], int]:
    """Get all conversations for a user with pagination"""
    
    # Get conversations where user is an active participant
    query = db.query(Conversation).join(
        ConversationParticipant,
        Conversation.id == ConversationParticipant.conversation_id
    ).filter(
        ConversationParticipant.user_id == user_id,
        ConversationParticipant.is_active == True
    ).options(
        joinedload(Conversation.participants).joinedload(ConversationParticipant.user),
        joinedload(Conversation.messages).joinedload(Message.sender)
    ).order_by(
        desc(Conversation.updated_at)
    )
    
    total = query.count()
    conversations = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return conversations, total


def get_conversation_messages(
    db: Session, conversation_id: int, user_id: int, page: int = 1, page_size: int = 50
) -> Tuple[List[Message], int]:
    """Get messages from a conversation with pagination"""
    
    # Verify user is participant
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == user_id,
        ConversationParticipant.is_active == True
    ).first()
    
    if not participant:
        raise ValueError("User is not a participant of this conversation")
    
    # Get messages
    query = db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.is_deleted == False
    ).options(
        joinedload(Message.sender)
    ).order_by(
        desc(Message.created_at)
    )
    
    total = query.count()
    messages = query.offset((page - 1) * page_size).limit(page_size).all()
    
    # Reverse to get chronological order (oldest first)
    messages.reverse()
    
    return messages, total


def create_message(
    db: Session, conversation_id: int, sender_id: int, content: str
) -> Message:
    """Create a new message in a conversation"""
    
    # Verify sender is participant
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == sender_id,
        ConversationParticipant.is_active == True
    ).first()
    
    if not participant:
        raise ValueError("User is not a participant of this conversation")
    
    # Create message
    message = Message(
        conversation_id=conversation_id,
        sender_id=sender_id,
        content=content
    )
    db.add(message)
    
    # Update conversation's updated_at timestamp
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conversation:
        conversation.updated_at = func.now()
    
    db.commit()
    db.refresh(message)
    
    # Load sender relationship
    db.refresh(message, ['sender'])
    
    return message


def add_participants(
    db: Session, conversation_id: int, user_id: int, new_participant_ids: List[int]
) -> Conversation:
    """Add participants to a group conversation"""
    
    # Get conversation
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()
    
    if not conversation:
        raise ValueError("Conversation not found")
    
    if conversation.type != ConversationType.GROUP:
        raise ValueError("Can only add participants to group conversations")
    
    # Verify requester is participant
    requester = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == user_id,
        ConversationParticipant.is_active == True
    ).first()
    
    if not requester:
        raise ValueError("User is not a participant of this conversation")
    
    # Verify new participants exist
    users = db.query(User).filter(User.id.in_(new_participant_ids)).all()
    if len(users) != len(new_participant_ids):
        raise ValueError("One or more users not found")
    
    # Add participants
    for uid in new_participant_ids:
        # Check if already participant
        existing = db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == uid
        ).first()
        
        if existing:
            # If they left before, reactivate them
            if not existing.is_active:
                existing.is_active = True
                existing.joined_at = func.now()
        else:
            # Add new participant
            participant = ConversationParticipant(
                conversation_id=conversation_id,
                user_id=uid
            )
            db.add(participant)
    
    db.commit()
    db.refresh(conversation)
    return conversation


def remove_participant(
    db: Session, conversation_id: int, user_id: int, participant_to_remove_id: int
) -> bool:
    """Remove a participant from a conversation (user leaving or being removed)"""
    
    # Get conversation
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()
    
    if not conversation:
        raise ValueError("Conversation not found")
    
    # Get participant to remove
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == participant_to_remove_id,
        ConversationParticipant.is_active == True
    ).first()
    
    if not participant:
        raise ValueError("Participant not found in conversation")
    
    # Mark as inactive
    participant.is_active = False
    participant.left_at = func.now()
    
    db.commit()
    return True


def update_conversation(
    db: Session, conversation_id: int, user_id: int, update_data: ConversationUpdate
) -> Conversation:
    """Update conversation details (name, avatar)"""
    
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()
    
    if not conversation:
        raise ValueError("Conversation not found")
    
    if conversation.type != ConversationType.GROUP:
        raise ValueError("Can only update group conversations")
    
    # Verify user is participant
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == user_id,
        ConversationParticipant.is_active == True
    ).first()
    
    if not participant:
        raise ValueError("User is not a participant of this conversation")
    
    # Update fields
    if update_data.name is not None:
        conversation.name = update_data.name
    if update_data.avatar is not None:
        conversation.avatar = update_data.avatar
    
    db.commit()
    db.refresh(conversation)
    return conversation


def mark_messages_as_read(
    db: Session, conversation_id: int, user_id: int
) -> bool:
    """Mark all messages in a conversation as read for a user"""
    
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == user_id,
        ConversationParticipant.is_active == True
    ).first()
    
    if not participant:
        raise ValueError("User is not a participant of this conversation")
    
    participant.last_read_at = func.now()
    db.commit()
    return True
