"""
Friendship model for managing user relationships
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Friendship(Base):
    """
    Friendship model representing relationships between users
    
    Status values:
    - 'pending': Friend request sent, awaiting response
    - 'accepted': Friend request accepted, users are friends
    - 'rejected': Friend request rejected
    """
    __tablename__ = "friendships"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    friend_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), nullable=False, default="pending")  # pending, accepted, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="friendships_initiated")
    friend = relationship("User", foreign_keys=[friend_id], backref="friendships_received")
    
    # Ensure unique friendship pairs (user_id, friend_id must be unique)
    __table_args__ = (
        UniqueConstraint('user_id', 'friend_id', name='unique_friendship'),
    )
    
    def __repr__(self):
        return f"<Friendship(user_id={self.user_id}, friend_id={self.friend_id}, status={self.status})>"
