"""
Notification API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services import notification_service
from app.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
    UnreadCountResponse,
    MarkAsReadRequest
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=NotificationListResponse)
def get_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's notifications
    
    Query Parameters:
    - skip: Number of notifications to skip (pagination)
    - limit: Maximum number of notifications to return
    - unread_only: If true, only return unread notifications
    """
    notifications, total = notification_service.get_user_notifications(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        unread_only=unread_only
    )
    
    unread_count = notification_service.get_unread_count(db=db, user_id=current_user.id)
    
    return {
        "notifications": notifications,
        "total": total,
        "unread_count": unread_count
    }


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get count of unread notifications for current user
    """
    count = notification_service.get_unread_count(db=db, user_id=current_user.id)
    
    return {"count": count}


@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark a specific notification as read
    """
    notification = notification_service.mark_as_read(
        db=db,
        notification_id=notification_id,
        user_id=current_user.id
    )
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return notification


@router.post("/mark-as-read", status_code=status.HTTP_200_OK)
def mark_notifications_as_read(
    request: MarkAsReadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark multiple notifications as read
    
    Body:
    - notification_ids: List of notification IDs to mark as read
    """
    count = notification_service.mark_multiple_as_read(
        db=db,
        notification_ids=request.notification_ids,
        user_id=current_user.id
    )
    
    return {
        "message": f"Marked {count} notification(s) as read",
        "count": count
    }


@router.post("/mark-all-read", status_code=status.HTTP_200_OK)
def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark all notifications as read for current user
    """
    count = notification_service.mark_all_as_read(db=db, user_id=current_user.id)
    
    return {
        "message": f"Marked {count} notification(s) as read",
        "count": count
    }


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a notification
    """
    deleted = notification_service.delete_notification(
        db=db,
        notification_id=notification_id,
        user_id=current_user.id
    )
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return None
