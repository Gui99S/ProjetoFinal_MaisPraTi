"""
Messages API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.websocket import manager
from app.models.user import User
from app.schemas.message import (
    MessageCreate, MessageResponse, MessageListResponse,
    ConversationCreate, ConversationResponse, ConversationListResponse,
    ConversationUpdate, ParticipantAdd, UserBasic, ConversationType
)
from app.services import message_service
from app.services import notification_service
from app.models.notification import NotificationType

router = APIRouter()


def format_user_basic(user: User) -> UserBasic:
    """Format user model to UserBasic schema"""
    return UserBasic(
        id=user.id,
        name=user.name,
        slug=user.slug,
        avatar=user.avatar
    )


def get_last_message(conversation) -> Optional[MessageResponse]:
    """Get the last message from a conversation"""
    if not conversation.messages:
        return None
    
    # Messages are already ordered by created_at desc in the query
    last_msg = max(conversation.messages, key=lambda m: m.created_at)
    
    return MessageResponse(
        id=last_msg.id,
        conversation_id=last_msg.conversation_id,
        sender_id=last_msg.sender_id,
        sender=format_user_basic(last_msg.sender),
        content=last_msg.content,
        created_at=last_msg.created_at,
        updated_at=last_msg.updated_at,
        is_edited=last_msg.is_edited,
        is_deleted=last_msg.is_deleted
    )


def calculate_unread_count(conversation, user_id: int) -> int:
    """Calculate unread message count for a user in a conversation"""
    participant = next(
        (p for p in conversation.participants if p.user_id == user_id and p.is_active),
        None
    )
    
    if not participant or not participant.last_read_at:
        # Count all messages if never read
        return len([m for m in conversation.messages if m.sender_id != user_id])
    
    # Count messages after last read time
    return len([
        m for m in conversation.messages 
        if m.created_at > participant.last_read_at and m.sender_id != user_id
    ])


@router.get("/conversations", response_model=ConversationListResponse)
async def get_conversations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all conversations for the current user"""
    
    conversations, total = message_service.get_user_conversations(
        db, current_user.id, page, page_size
    )
    
    # Format response
    conversation_list = []
    for conv in conversations:
        # Get other participant for direct messages (for name/avatar)
        if conv.type == ConversationType.DIRECT:
            other_participant = next(
                (p for p in conv.participants if p.user_id != current_user.id and p.is_active),
                None
            )
            if other_participant:
                name = other_participant.user.name
                avatar = other_participant.user.avatar
            else:
                name = "Unknown User"
                avatar = None
        else:
            name = conv.name
            avatar = conv.avatar
        
        conversation_list.append(ConversationResponse(
            id=conv.id,
            type=conv.type,
            name=name,
            avatar=avatar,
            created_by_id=conv.created_by_id,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            participants=[
                {
                    "id": p.id,
                    "user_id": p.user_id,
                    "user": format_user_basic(p.user),
                    "joined_at": p.joined_at,
                    "left_at": p.left_at,
                    "last_read_at": p.last_read_at,
                    "is_active": p.is_active
                }
                for p in conv.participants
            ],
            last_message=get_last_message(conv),
            unread_count=calculate_unread_count(conv, current_user.id)
        ))
    
    return ConversationListResponse(
        conversations=conversation_list,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation_data: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new conversation (direct or group)"""
    
    # Debug logging
    print(f"DEBUG: Creating conversation - Type: {conversation_data.type}, Participant IDs: {conversation_data.participant_ids}, Name: {conversation_data.name}")
    print(f"DEBUG: Type comparison - conversation_data.type == ConversationType.DIRECT: {conversation_data.type == ConversationType.DIRECT}")
    print(f"DEBUG: Type value: '{conversation_data.type}', Type of type: {type(conversation_data.type)}")
    
    try:
        if conversation_data.type == ConversationType.DIRECT:
            # For direct messages, should have exactly 1 other participant
            if len(conversation_data.participant_ids) != 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Direct conversations must have exactly one other participant"
                )
            
            other_user_id = conversation_data.participant_ids[0]
            
            # Can't message yourself
            if other_user_id == current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot create conversation with yourself"
                )
            
            conversation = message_service.get_or_create_direct_conversation(
                db, current_user.id, other_user_id
            )
        
        else:  # GROUP
            # Groups need a name and at least 2 participants (including creator)
            if not conversation_data.name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Group conversations must have a name"
                )
            
            if len(conversation_data.participant_ids) < 2:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Group conversations must have at least 2 other participants"
                )
            
            conversation = message_service.create_group_conversation(
                db,
                current_user.id,
                conversation_data.name,
                conversation_data.participant_ids
            )
        
        # Format response
        if conversation.type == ConversationType.DIRECT:
            other_participant = next(
                (p for p in conversation.participants if p.user_id != current_user.id and p.is_active),
                None
            )
            if other_participant:
                name = other_participant.user.name
                avatar = other_participant.user.avatar
            else:
                name = "Unknown User"
                avatar = None
        else:
            name = conversation.name
            avatar = conversation.avatar
        
        return ConversationResponse(
            id=conversation.id,
            type=conversation.type,
            name=name,
            avatar=avatar,
            created_by_id=conversation.created_by_id,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
            participants=[
                {
                    "id": p.id,
                    "user_id": p.user_id,
                    "user": format_user_basic(p.user),
                    "joined_at": p.joined_at,
                    "left_at": p.left_at,
                    "last_read_at": p.last_read_at,
                    "is_active": p.is_active
                }
                for p in conversation.participants
            ],
            last_message=None,
            unread_count=0
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a specific conversation"""
    
    from app.models.message import Conversation, ConversationParticipant
    from sqlalchemy.orm import joinedload
    
    # Get conversation with participants
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).options(
        joinedload(Conversation.participants).joinedload(ConversationParticipant.user),
        joinedload(Conversation.messages)
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Verify user is participant
    is_participant = any(
        p.user_id == current_user.id and p.is_active 
        for p in conversation.participants
    )
    
    if not is_participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant of this conversation"
        )
    
    # Format response
    if conversation.type == ConversationType.DIRECT:
        other_participant = next(
            (p for p in conversation.participants if p.user_id != current_user.id and p.is_active),
            None
        )
        if other_participant:
            name = other_participant.user.name
            avatar = other_participant.user.avatar
        else:
            name = "Unknown User"
            avatar = None
    else:
        name = conversation.name
        avatar = conversation.avatar
    
    return ConversationResponse(
        id=conversation.id,
        type=conversation.type,
        name=name,
        avatar=avatar,
        created_by_id=conversation.created_by_id,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        participants=[
            {
                "id": p.id,
                "user_id": p.user_id,
                "user": format_user_basic(p.user),
                "joined_at": p.joined_at,
                "left_at": p.left_at,
                "last_read_at": p.last_read_at,
                "is_active": p.is_active
            }
            for p in conversation.participants
        ],
        last_message=get_last_message(conversation),
        unread_count=calculate_unread_count(conversation, current_user.id)
    )


@router.patch("/conversations/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: int,
    update_data: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update conversation details (name, avatar)"""
    
    try:
        conversation = message_service.update_conversation(
            db, conversation_id, current_user.id, update_data
        )
        
        return ConversationResponse(
            id=conversation.id,
            type=conversation.type,
            name=conversation.name,
            avatar=conversation.avatar,
            created_by_id=conversation.created_by_id,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
            participants=[
                {
                    "id": p.id,
                    "user_id": p.user_id,
                    "user": format_user_basic(p.user),
                    "joined_at": p.joined_at,
                    "left_at": p.left_at,
                    "last_read_at": p.last_read_at,
                    "is_active": p.is_active
                }
                for p in conversation.participants
            ],
            last_message=get_last_message(conversation),
            unread_count=calculate_unread_count(conversation, current_user.id)
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/conversations/{conversation_id}/messages", response_model=MessageListResponse)
async def get_messages(
    conversation_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get messages from a conversation"""
    
    try:
        messages, total = message_service.get_conversation_messages(
            db, conversation_id, current_user.id, page, page_size
        )
        
        message_list = [
            MessageResponse(
                id=msg.id,
                conversation_id=msg.conversation_id,
                sender_id=msg.sender_id,
                sender=format_user_basic(msg.sender),
                content=msg.content,
                created_at=msg.created_at,
                updated_at=msg.updated_at,
                is_edited=msg.is_edited,
                is_deleted=msg.is_deleted
            )
            for msg in messages
        ]
        
        return MessageListResponse(
            messages=message_list,
            total=total,
            page=page,
            page_size=page_size
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: int,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message to a conversation"""
    
    try:
        message = message_service.create_message(
            db, conversation_id, current_user.id, message_data.content
        )
        
        message_response = MessageResponse(
            id=message.id,
            conversation_id=message.conversation_id,
            sender_id=message.sender_id,
            sender=format_user_basic(message.sender),
            content=message.content,
            created_at=message.created_at,
            updated_at=message.updated_at,
            is_edited=message.is_edited,
            is_deleted=message.is_deleted
        )
        
        # Broadcast to WebSocket clients
        from app.models.message import Conversation
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()
        
        if conversation:
            participant_ids = [
                p.user_id for p in conversation.participants 
                if p.is_active
            ]
            
            # Send real-time notification
            await manager.send_to_conversation(
                {
                    "type": "message",
                    "message": {
                        "id": message.id,
                        "conversation_id": message.conversation_id,
                        "sender_id": message.sender_id,
                        "sender": {
                            "id": message.sender.id,
                            "name": message.sender.name,
                            "slug": message.sender.slug,
                            "avatar": message.sender.avatar
                        },
                        "content": message.content,
                        "created_at": message.created_at.isoformat(),
                        "is_edited": message.is_edited,
                        "is_deleted": message.is_deleted
                    }
                },
                participant_ids
            )
            
            # Create notifications for other participants
            for participant_id in participant_ids:
                if participant_id != current_user.id:  # Don't notify sender
                    notification_service.create_notification(
                        db=db,
                        user_id=participant_id,
                        notification_type=NotificationType.MESSAGE,
                        title=f"New message from {current_user.name}",
                        message=message.content[:100] + "..." if len(message.content) > 100 else message.content,
                        related_id=conversation_id,
                        related_type="conversation",
                        actor_id=current_user.id
                    )
        
        return message_response
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )


@router.post("/conversations/{conversation_id}/participants", status_code=status.HTTP_200_OK)
async def add_participants(
    conversation_id: int,
    participant_data: ParticipantAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add participants to a group conversation"""
    
    try:
        conversation = message_service.add_participants(
            db, conversation_id, current_user.id, participant_data.user_ids
        )
        
        return {"message": "Participants added successfully"}
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/conversations/{conversation_id}/participants/{user_id}", status_code=status.HTTP_200_OK)
async def remove_participant(
    conversation_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a participant from a conversation (leave or kick)"""
    
    # Users can only remove themselves unless they're admin (future feature)
    if user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only remove yourself from conversations"
        )
    
    try:
        message_service.remove_participant(
            db, conversation_id, current_user.id, user_id
        )
        
        return {"message": "Left conversation successfully"}
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/conversations/{conversation_id}/read", status_code=status.HTTP_200_OK)
async def mark_as_read(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all messages in a conversation as read"""
    
    try:
        message_service.mark_messages_as_read(
            db, conversation_id, current_user.id
        )
        
        return {"message": "Messages marked as read"}
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
