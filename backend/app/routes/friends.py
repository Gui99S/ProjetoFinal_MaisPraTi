"""
Friendship API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.friendship import Friendship
from app.schemas.friendship import (
    FriendRequest, FriendshipResponse, FriendshipStatus,
    FriendsList, FriendUser, PendingRequestsList
)
from app.services import notification_service
from app.models.notification import NotificationType

router = APIRouter()


def format_friend_user(user: User) -> FriendUser:
    """Format user model to FriendUser schema"""
    return FriendUser(
        id=user.id,
        name=user.name,
        slug=user.slug,
        avatar=user.avatar,
        status=user.status,
        location=user.location,
        is_bot=user.is_bot
    )


@router.post("/request", response_model=FriendshipResponse, status_code=status.HTTP_201_CREATED)
async def send_friend_request(
    request_data: FriendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a friend request to another user"""
    
    # Can't send friend request to yourself
    if request_data.friend_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send friend request to yourself"
        )
    
    # Check if target user exists
    friend = db.query(User).filter(User.id == request_data.friend_id).first()
    if not friend:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if friendship already exists (in either direction)
    existing = db.query(Friendship).filter(
        or_(
            and_(Friendship.user_id == current_user.id, Friendship.friend_id == request_data.friend_id),
            and_(Friendship.user_id == request_data.friend_id, Friendship.friend_id == current_user.id)
        )
    ).first()
    
    if existing:
        if existing.status == "accepted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You are already friends"
            )
        elif existing.status == "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Friend request already pending"
            )
    
    # Create new friend request
    new_friendship = Friendship(
        user_id=current_user.id,
        friend_id=request_data.friend_id,
        status="pending"
    )
    
    db.add(new_friendship)
    db.commit()
    db.refresh(new_friendship)
    
    # Check if the recipient is a bot - if so, auto-accept
    if friend.is_bot:
        new_friendship.status = "accepted"
        db.commit()
        db.refresh(new_friendship)
        
        # Create notification for auto-acceptance
        notification_service.create_notification(
            db=db,
            user_id=current_user.id,
            notification_type=NotificationType.FRIEND_ACCEPT,
            title=f"{friend.name} accepted your friend request",
            message=None,
            related_id=new_friendship.id,
            related_type="friendship",
            actor_id=friend.id
        )
    else:
        # Create notification for the friend request recipient (human users only)
        notification_service.create_notification(
            db=db,
            user_id=request_data.friend_id,
            notification_type=NotificationType.FRIEND_REQUEST,
            title=f"{current_user.name} sent you a friend request",
            message=None,
            related_id=new_friendship.id,
            related_type="friendship",
            actor_id=current_user.id
        )
    
    return FriendshipResponse(
        id=new_friendship.id,
        user_id=new_friendship.user_id,
        friend_id=new_friendship.friend_id,
        status=new_friendship.status,
        created_at=new_friendship.created_at,
        updated_at=new_friendship.updated_at,
        friend=format_friend_user(friend)
    )


@router.post("/{friendship_id}/accept", response_model=FriendshipResponse)
async def accept_friend_request(
    friendship_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept a pending friend request"""
    
    # Find the friendship request
    friendship = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    
    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend request not found"
        )
    
    # Only the recipient can accept the request
    if friendship.friend_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only accept requests sent to you"
        )
    
    if friendship.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Friend request is not pending"
        )
    
    # Accept the request
    friendship.status = "accepted"
    db.commit()
    db.refresh(friendship)
    
    # Create notification for the requester (they got accepted!)
    notification_service.create_notification(
        db=db,
        user_id=friendship.user_id,  # Original requester
        notification_type=NotificationType.FRIEND_ACCEPT,
        title=f"{current_user.name} accepted your friend request",
        message=None,
        related_id=friendship.id,
        related_type="friendship",
        actor_id=current_user.id
    )
    
    # Get the requester user info
    requester = db.query(User).filter(User.id == friendship.user_id).first()
    
    return FriendshipResponse(
        id=friendship.id,
        user_id=friendship.user_id,
        friend_id=friendship.friend_id,
        status=friendship.status,
        created_at=friendship.created_at,
        updated_at=friendship.updated_at,
        friend=format_friend_user(requester)
    )


@router.post("/{friendship_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
async def reject_friend_request(
    friendship_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject a pending friend request"""
    
    # Find the friendship request
    friendship = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    
    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend request not found"
        )
    
    # Only the recipient can reject the request
    if friendship.friend_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only reject requests sent to you"
        )
    
    # Delete the friendship request
    db.delete(friendship)
    db.commit()
    
    return None


@router.delete("/{friendship_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unfriend(
    friendship_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unfriend a user (remove accepted friendship)"""
    
    # Find the friendship
    friendship = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    
    if not friendship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friendship not found"
        )
    
    # Only participants can unfriend
    if friendship.user_id != current_user.id and friendship.friend_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only unfriend your own friends"
        )
    
    # Delete the friendship
    db.delete(friendship)
    db.commit()
    
    return None


@router.get("/", response_model=FriendsList)
async def get_friends(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Friends per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of accepted friends"""
    
    # Get all accepted friendships where user is either the requester or recipient
    friendships = db.query(Friendship).filter(
        and_(
            Friendship.status == "accepted",
            or_(
                Friendship.user_id == current_user.id,
                Friendship.friend_id == current_user.id
            )
        )
    ).all()
    
    # Extract friend IDs
    friend_ids = []
    for f in friendships:
        if f.user_id == current_user.id:
            friend_ids.append(f.friend_id)
        else:
            friend_ids.append(f.user_id)
    
    # Get total count
    total = len(friend_ids)
    
    # Apply pagination
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_ids = friend_ids[start_idx:end_idx]
    
    # Fetch friend user details
    friends = db.query(User).filter(User.id.in_(paginated_ids)).all() if paginated_ids else []
    
    return FriendsList(
        friends=[format_friend_user(friend) for friend in friends],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/user/{user_id}", response_model=FriendsList)
async def get_user_friends(
    user_id: int,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Friends per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of accepted friends for a specific user"""
    
    # Verify the target user exists
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all accepted friendships where target user is either the requester or recipient
    friendships = db.query(Friendship).filter(
        and_(
            Friendship.status == "accepted",
            or_(
                Friendship.user_id == user_id,
                Friendship.friend_id == user_id
            )
        )
    ).all()
    
    # Extract friend IDs
    friend_ids = []
    for f in friendships:
        if f.user_id == user_id:
            friend_ids.append(f.friend_id)
        else:
            friend_ids.append(f.user_id)
    
    # Get total count
    total = len(friend_ids)
    
    # Apply pagination
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_ids = friend_ids[start_idx:end_idx]
    
    # Fetch friend user details
    friends = db.query(User).filter(User.id.in_(paginated_ids)).all() if paginated_ids else []
    
    return FriendsList(
        friends=[format_friend_user(friend) for friend in friends],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/requests", response_model=PendingRequestsList)
async def get_pending_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all pending friend requests sent to current user"""
    
    # Get all pending requests where current user is the recipient
    requests = db.query(Friendship).filter(
        and_(
            Friendship.friend_id == current_user.id,
            Friendship.status == "pending"
        )
    ).all()
    
    # Format with requester user info
    formatted_requests = []
    for req in requests:
        requester = db.query(User).filter(User.id == req.user_id).first()
        formatted_requests.append(FriendshipResponse(
            id=req.id,
            user_id=req.user_id,
            friend_id=req.friend_id,
            status=req.status,
            created_at=req.created_at,
            updated_at=req.updated_at,
            friend=format_friend_user(requester) if requester else None
        ))
    
    return PendingRequestsList(
        requests=formatted_requests,
        total=len(formatted_requests)
    )


@router.get("/status/{user_id}", response_model=FriendshipStatus)
async def get_friendship_status(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get friendship status with a specific user"""
    
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot check friendship status with yourself"
        )
    
    # Check for friendship in either direction
    friendship = db.query(Friendship).filter(
        or_(
            and_(Friendship.user_id == current_user.id, Friendship.friend_id == user_id),
            and_(Friendship.user_id == user_id, Friendship.friend_id == current_user.id)
        )
    ).first()
    
    if not friendship:
        return FriendshipStatus(status=None, friendship_id=None, is_requester=None)
    
    # Determine if current user is the requester
    is_requester = friendship.user_id == current_user.id
    
    return FriendshipStatus(
        status=friendship.status,
        friendship_id=friendship.id,
        is_requester=is_requester
    )
