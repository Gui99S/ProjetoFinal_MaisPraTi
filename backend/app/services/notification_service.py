"""
Service layer for notification management
"""
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
from datetime import datetime

from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.schemas.notification import NotificationCreate


def create_notification(
    db: Session,
    user_id: int,
    notification_type: NotificationType,
    title: str,
    message: Optional[str] = None,
    related_id: Optional[int] = None,
    related_type: Optional[str] = None,
    actor_id: Optional[int] = None
) -> Notification:
    """
    Create a new notification
    
    Args:
        db: Database session
        user_id: ID of user to notify
        notification_type: Type of notification
        title: Notification title
        message: Optional detailed message
        related_id: ID of related entity (post, friendship, etc.)
        related_type: Type of related entity
        actor_id: ID of user who triggered the notification
    
    Returns:
        Created notification
    """
    # Don't create notification if actor is the same as the target user
    if actor_id and actor_id == user_id:
        return None
    
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        related_id=related_id,
        related_type=related_type,
        actor_id=actor_id,
        is_read=False
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    return notification


def get_user_notifications(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    unread_only: bool = False
) -> tuple[List[Notification], int]:
    """
    Get user's notifications with pagination
    
    Args:
        db: Database session
        user_id: User ID
        skip: Number of records to skip
        limit: Maximum number of records to return
        unread_only: If True, only return unread notifications
    
    Returns:
        Tuple of (notifications list, total count)
    """
    query = db.query(Notification).filter(Notification.user_id == user_id)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    total = query.count()
    
    notifications = (
        query
        .order_by(desc(Notification.created_at))
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return notifications, total


def get_unread_count(db: Session, user_id: int) -> int:
    """
    Get count of unread notifications for a user
    
    Args:
        db: Database session
        user_id: User ID
    
    Returns:
        Count of unread notifications
    """
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)
        .count()
    )


def mark_as_read(db: Session, notification_id: int, user_id: int) -> Optional[Notification]:
    """
    Mark a notification as read
    
    Args:
        db: Database session
        notification_id: Notification ID
        user_id: User ID (for authorization check)
    
    Returns:
        Updated notification or None if not found
    """
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    
    if not notification:
        return None
    
    notification.is_read = True
    notification.read_at = datetime.utcnow()
    
    db.commit()
    db.refresh(notification)
    
    return notification


def mark_multiple_as_read(db: Session, notification_ids: List[int], user_id: int) -> int:
    """
    Mark multiple notifications as read
    
    Args:
        db: Database session
        notification_ids: List of notification IDs
        user_id: User ID (for authorization check)
    
    Returns:
        Number of notifications marked as read
    """
    count = (
        db.query(Notification)
        .filter(
            Notification.id.in_(notification_ids),
            Notification.user_id == user_id,
            Notification.is_read == False
        )
        .update(
            {
                "is_read": True,
                "read_at": datetime.utcnow()
            },
            synchronize_session=False
        )
    )
    
    db.commit()
    
    return count


def mark_all_as_read(db: Session, user_id: int) -> int:
    """
    Mark all notifications as read for a user
    
    Args:
        db: Database session
        user_id: User ID
    
    Returns:
        Number of notifications marked as read
    """
    count = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)
        .update(
            {
                "is_read": True,
                "read_at": datetime.utcnow()
            },
            synchronize_session=False
        )
    )
    
    db.commit()
    
    return count


def delete_notification(db: Session, notification_id: int, user_id: int) -> bool:
    """
    Delete a notification
    
    Args:
        db: Database session
        notification_id: Notification ID
        user_id: User ID (for authorization check)
    
    Returns:
        True if deleted, False if not found
    """
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    
    if not notification:
        return False
    
    db.delete(notification)
    db.commit()
    
    return True
