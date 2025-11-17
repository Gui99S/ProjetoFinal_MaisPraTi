"""
User profile management routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
import os
import uuid
from pathlib import Path

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.utils import generate_user_slug
from app.models.user import User
from app.models.post import Post, Like
from app.models.friendship import Friendship
from app.models.community import Community, CommunityMember
from app.schemas.auth import UserResponse, UserUpdate
from app.schemas.post import PostsFeed, PostResponse, PostAuthor
from app.schemas.community import CommunityResponse, UserBasic

router = APIRouter()


def format_user_response(user: User) -> UserResponse:
    """Format user database model to response schema"""
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        slug=user.slug,  # Use the slug from database
        avatar=user.avatar,
        birthday=user.birthday,
        status=user.status,
        occupation=user.occupation,
        location=user.location,
        bio=user.bio,
        theme=user.theme,
        language=user.language,
        joinDate=user.created_at.strftime("%m/%d/%Y") if user.created_at else ""
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's profile information.
    
    Requires authentication via JWT token in Authorization header.
    """
    return format_user_response(current_user)


@router.get("/", response_model=List[UserResponse])
async def list_users(
    bots_only: Optional[bool] = Query(None, description="Filter for bot users only"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of users to return"),
    skip: int = Query(0, ge=0, description="Number of users to skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of users with optional filtering
    
    - **bots_only**: If true, only return bot accounts
    - **limit**: Maximum number of results (1-100)
    - **skip**: Number of users to skip for pagination
    """
    query = db.query(User).filter(User.is_active == True)
    
    if bots_only is not None:
        query = query.filter(User.is_bot == bots_only)
    
    users = query.offset(skip).limit(limit).all()
    return [format_user_response(user) for user in users]


@router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile information.
    
    Only provided fields will be updated. All fields are optional.
    Requires authentication via JWT token in Authorization header.
    """
    # Update only provided fields
    update_data = user_update.model_dump(exclude_unset=True)
    
    # If name is being updated, regenerate slug
    if 'name' in update_data:
        update_data['slug'] = generate_user_slug(update_data['name'], db, exclude_id=current_user.id)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    # Commit changes to database
    try:
        db.commit()
        db.refresh(current_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        )
    
    return format_user_response(current_user)


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a new avatar image for the current user.
    
    Accepts image files (jpg, jpeg, png, gif, webp).
    Returns the URL of the uploaded avatar.
    """
    # Validate file type
    allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Validate file size (max 5MB)
    max_size = 5 * 1024 * 1024  # 5MB in bytes
    file_content = await file.read()
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 5MB limit"
        )
    
    # Create uploads directory if it doesn't exist
    upload_dir = Path("uploads/avatars")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_ext = file.filename.split('.')[-1]
    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = upload_dir / unique_filename
    
    # Save file
    try:
        with open(file_path, "wb") as f:
            f.write(file_content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Update user's avatar URL
    avatar_url = f"/uploads/avatars/{unique_filename}"
    current_user.avatar = avatar_url
    
    try:
        db.commit()
        db.refresh(current_user)
    except Exception as e:
        db.rollback()
        # Delete uploaded file if database update fails
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update avatar: {str(e)}"
        )
    
    return {"avatar_url": avatar_url, "message": "Avatar uploaded successfully"}


@router.get("/{slug_or_id}", response_model=UserResponse)
async def get_user_profile(
    slug_or_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get another user's public profile information by slug or ID.
    
    Accepts:
    - Slug: /users/john-doe or /users/john-doe-2
    - Numeric ID (backwards compatibility): /users/123
    
    Requires authentication via JWT token in Authorization header.
    """
    # Try to find user by slug first
    user = db.query(User).filter(User.slug == slug_or_id).first()
    
    # If not found and slug_or_id is numeric, try by ID (backwards compatibility)
    if not user and slug_or_id.isdigit():
        user = db.query(User).filter(User.id == int(slug_or_id)).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return format_user_response(user)


@router.get("/{slug_or_id}/posts", response_model=PostsFeed)
async def get_user_posts(
    slug_or_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=50, description="Posts per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a user's posts by slug or ID with pagination.
    
    Accepts:
    - Slug: /users/john-doe/posts
    - Numeric ID (backwards compatibility): /users/123/posts
    
    Requires authentication via JWT token in Authorization header.
    """
    # Try to find user by slug first
    user = db.query(User).filter(User.slug == slug_or_id).first()
    
    # If not found and slug_or_id is numeric, try by ID (backwards compatibility)
    if not user and slug_or_id.isdigit():
        user = db.query(User).filter(User.id == int(slug_or_id)).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Calculate offset
    offset = (page - 1) * page_size
    
    # Get total count of user's posts
    total = db.query(Post).filter(Post.user_id == user.id).count()
    
    # Get posts with pagination
    posts = db.query(Post).filter(
        Post.user_id == user.id
    ).order_by(desc(Post.created_at)).offset(offset).limit(page_size).all()
    
    # Format posts with user like status
    formatted_posts = []
    for post in posts:
        # Check if current user liked/disliked this post
        user_like = db.query(Like).filter(
            Like.post_id == post.id,
            Like.user_id == current_user.id
        ).first()
        
        user_liked = None
        if user_like:
            user_liked = user_like.is_like
        
        formatted_posts.append(PostResponse(
            id=post.id,
            content=post.content,
            likes_count=post.likes_count,
            dislikes_count=post.dislikes_count,
            comments_count=post.comments_count,
            created_at=post.created_at,
            user=PostAuthor(
                id=post.user.id,
                name=post.user.name,
                slug=post.user.slug,
                avatar=post.user.avatar
            ),
            user_liked=user_liked
        ))
    
    return PostsFeed(
        posts=formatted_posts,
        total=total,
        page=page,
        page_size=page_size,
        has_more=offset + page_size < total
    )


@router.get("/{slug_or_id}/communities", response_model=List[CommunityResponse])
async def get_user_communities(
    slug_or_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get communities that a user has joined by slug or ID.
    
    Accepts:
    - Slug: /users/john-doe/communities
    - Numeric ID (backwards compatibility): /users/123/communities
    
    Requires authentication via JWT token in Authorization header.
    """
    # Try to find user by slug first
    user = db.query(User).filter(User.slug == slug_or_id).first()
    
    # If not found and slug_or_id is numeric, try by ID (backwards compatibility)
    if not user and slug_or_id.isdigit():
        user = db.query(User).filter(User.id == int(slug_or_id)).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Debug logging
    print(f"[DEBUG] Fetching communities for user ID: {user.id}, slug: {user.slug}")
    
    # Get all communities where user is a member (active memberships only)
    memberships = db.query(CommunityMember).filter(
        CommunityMember.user_id == user.id,
        CommunityMember.left_at == None,  # Only active memberships
        CommunityMember.is_approved == True  # Only approved memberships
    ).all()
    
    print(f"[DEBUG] Found {len(memberships)} memberships")
    for membership in memberships:
        print(f"[DEBUG] Membership: community_id={membership.community_id}, role={membership.role}, left_at={membership.left_at}, is_approved={membership.is_approved}")
    
    # If no memberships, return empty list
    if not memberships:
        print(f"[DEBUG] No active memberships found for user {user.id}")
        return []
    
    # Get community details
    community_ids = [m.community_id for m in memberships]
    print(f"[DEBUG] Community IDs to fetch: {community_ids}")
    
    communities = db.query(Community).filter(
        Community.id.in_(community_ids)
    ).all()
    
    print(f"[DEBUG] Found {len(communities)} communities for user")
    for community in communities:
        print(f"[DEBUG] Community: id={community.id}, name={community.name}, slug={community.slug}")
    
    # Format response with all required fields
    result = []
    for community in communities:
        # Calculate member count (active members only)
        member_count = db.query(CommunityMember).filter(
            CommunityMember.community_id == community.id,
            CommunityMember.left_at == None,
            CommunityMember.is_approved == True
        ).count()
        
        # Find user's role in this community
        user_role = next((m.role for m in memberships if m.community_id == community.id), None)
        
        result.append(CommunityResponse(
            id=community.id,
            name=community.name,
            slug=community.slug,
            description=community.description,
            category=community.category,
            is_private=community.is_private,
            avatar=community.avatar,
            banner=community.banner,
            member_count=member_count,
            created_by_id=community.created_by_id,
            created_by=UserBasic(
                id=community.created_by.id,
                name=community.created_by.name,
                slug=community.created_by.slug,
                avatar=community.created_by.avatar
            ),
            is_member=True,  # They are members since we queried their memberships
            user_role=user_role,
            created_at=community.created_at,
            updated_at=community.updated_at
        ))
    
    return result


@router.get("/{slug_or_id}/friends")
async def get_user_friends(
    slug_or_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Friends per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a user's friends list by slug or ID.
    Returns their accepted friendships with user details.
    """
    from sqlalchemy import or_, and_
    
    # Try to find user by slug first
    user = db.query(User).filter(User.slug == slug_or_id).first()
    
    # If not found and slug_or_id is numeric, try by ID
    if not user and slug_or_id.isdigit():
        user = db.query(User).filter(User.id == int(slug_or_id)).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get all accepted friendships where user is either the requester or recipient
    friendships = db.query(Friendship).filter(
        and_(
            Friendship.status == "accepted",
            or_(
                Friendship.user_id == user.id,
                Friendship.friend_id == user.id
            )
        )
    ).all()
    
    # Extract friend IDs
    friend_ids = []
    for f in friendships:
        if f.user_id == user.id:
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
    
    # Format response
    formatted_friends = []
    for friend in friends:
        formatted_friends.append({
            "id": friend.id,
            "name": friend.name,
            "slug": friend.slug,
            "avatar": friend.avatar,
            "status": friend.status,
            "location": friend.location,
            "is_bot": friend.is_bot
        })
    
    return {
        "friends": formatted_friends,
        "total": total,
        "page": page,
        "page_size": page_size
    }

