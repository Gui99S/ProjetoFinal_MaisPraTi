from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ConversationType(str, Enum):
    DIRECT = "direct"
    GROUP = "group"


# Request schemas
class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)


class ConversationCreate(BaseModel):
    type: ConversationType
    name: Optional[str] = Field(None, max_length=100)  # Required for group, optional for direct
    participant_ids: List[int] = Field(..., min_items=1)  # For direct: 1 user, for group: 2+ users


class ConversationUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    avatar: Optional[str] = None


class ParticipantAdd(BaseModel):
    user_ids: List[int] = Field(..., min_items=1)


# Response schemas
class UserBasic(BaseModel):
    id: int
    name: str
    slug: Optional[str] = None
    avatar: Optional[str] = None
    
    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    sender: UserBasic
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_edited: bool = False
    is_deleted: bool = False
    
    class Config:
        from_attributes = True


class ParticipantResponse(BaseModel):
    id: int
    user_id: int
    user: UserBasic
    joined_at: datetime
    left_at: Optional[datetime] = None
    last_read_at: Optional[datetime] = None
    is_active: bool = True
    
    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: int
    type: ConversationType
    name: Optional[str] = None
    avatar: Optional[str] = None
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    participants: List[ParticipantResponse] = []
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0
    
    class Config:
        from_attributes = True


class ConversationListResponse(BaseModel):
    conversations: List[ConversationResponse]
    total: int
    page: int
    page_size: int


class MessageListResponse(BaseModel):
    messages: List[MessageResponse]
    total: int
    page: int
    page_size: int
