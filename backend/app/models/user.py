from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    slug = Column(String(150), unique=True, index=True, nullable=True)  # URL-friendly username
    avatar = Column(String(500))
    birthday = Column(Date)
    status = Column(String(50))  # Single, Married, etc.
    occupation = Column(String(100))
    location = Column(String(100))
    bio = Column(String)
    theme = Column(String(20), default='light')
    language = Column(String(10), default='en')
    email_verified = Column(Boolean, default=False)
    two_factor_enabled = Column(Boolean, default=False)
    is_bot = Column(Boolean, default=False)  # Flag to identify bot accounts
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    
    # Relationships
    posts = relationship("Post", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="user", cascade="all, delete-orphan")
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", cascade="all, delete-orphan")
    conversation_participations = relationship("ConversationParticipant", cascade="all, delete-orphan")
    community_memberships = relationship("CommunityMember", back_populates="user", cascade="all, delete-orphan")
    bot_profile = relationship("Bot", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", foreign_keys="Notification.user_id", back_populates="user", cascade="all, delete-orphan")
    photos = relationship("Photo", back_populates="user", cascade="all, delete-orphan")
