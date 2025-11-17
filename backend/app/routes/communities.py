"""
Community API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.community import (
    CommunityCreate, CommunityUpdate, CommunityResponse, CommunityListResponse,
    CommunityDetailResponse, CommunityMemberResponse, MemberRoleUpdate,
    CommunityPostCreate, CommunityPostUpdate, CommunityPostResponse, CommunityPostListResponse,
    CommunityPostCommentCreate, CommunityPostCommentResponse,
    CommunityCategory, MemberRole, UserBasic
)
from app.services import community_service

router = APIRouter()


def format_user_basic(user: User) -> dict:
    """Format user data for nested responses"""
    return {
        "id": user.id,
        "name": user.name,
        "slug": user.slug,
        "avatar": user.avatar
    }


@router.get("/communities", response_model=CommunityListResponse)
async def get_communities(
    search: Optional[str] = Query(None, description="Search in name and description"),
    category: Optional[CommunityCategory] = Query(None, description="Filter by category"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of communities with search and filters"""
    
    communities, total = community_service.search_communities(
        db, search=search, category=category, page=page, page_size=page_size
    )
    
    # Format response with member count and user's membership status
    community_list = []
    for community in communities:
        member_count = community_service.get_member_count(db, community.id)
        is_member = community_service.is_member(db, community.id, current_user.id)
        user_role = community_service.get_member_role(db, community.id, current_user.id)
        
        community_list.append(CommunityResponse(
            id=community.id,
            name=community.name,
            slug=community.slug,
            description=community.description,
            avatar=community.avatar,
            banner=community.banner,
            category=community.category,
            is_private=community.is_private,
            created_by_id=community.created_by_id,
            created_by=format_user_basic(community.created_by),
            member_count=member_count,
            is_member=is_member,
            user_role=user_role,
            created_at=community.created_at,
            updated_at=community.updated_at
        ))
    
    return CommunityListResponse(
        communities=community_list,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/communities", response_model=CommunityResponse, status_code=status.HTTP_201_CREATED)
async def create_community(
    community_data: CommunityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new community"""
    
    community = community_service.create_community(
        db,
        name=community_data.name,
        creator_id=current_user.id,
        description=community_data.description,
        category=community_data.category,
        is_private=community_data.is_private,
        avatar=community_data.avatar,
        banner=community_data.banner
    )
    
    member_count = community_service.get_member_count(db, community.id)
    
    return CommunityResponse(
        id=community.id,
        name=community.name,
        slug=community.slug,
        description=community.description,
        avatar=community.avatar,
        banner=community.banner,
        category=community.category,
        is_private=community.is_private,
        created_by_id=community.created_by_id,
        created_by=format_user_basic(community.created_by),
        member_count=member_count,
        is_member=True,  # Creator is automatically a member
        user_role=MemberRole.ADMIN,
        created_at=community.created_at,
        updated_at=community.updated_at
    )


@router.get("/communities/{community_id}", response_model=CommunityDetailResponse)
async def get_community(
    community_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get community details with members"""
    
    community = community_service.get_community_by_id(db, community_id, load_members=True)
    
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community not found"
        )
    
    # Check if private and user is not a member
    is_member = community_service.is_member(db, community_id, current_user.id)
    if community.is_private and not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This is a private community"
        )
    
    member_count = community_service.get_member_count(db, community.id)
    user_role = community_service.get_member_role(db, community.id, current_user.id)
    
    # Format members
    members_list = []
    for member in community.members:
        if member.left_at is None and member.is_approved:
            members_list.append(CommunityMemberResponse(
                id=member.id,
                user_id=member.user_id,
                user=format_user_basic(member.user),
                role=member.role,
                is_approved=member.is_approved,
                joined_at=member.joined_at
            ))
    
    return CommunityDetailResponse(
        id=community.id,
        name=community.name,
        slug=community.slug,
        description=community.description,
        avatar=community.avatar,
        banner=community.banner,
        category=community.category,
        is_private=community.is_private,
        created_by_id=community.created_by_id,
        created_by=format_user_basic(community.created_by),
        member_count=member_count,
        is_member=is_member,
        user_role=user_role,
        members=members_list,
        created_at=community.created_at,
        updated_at=community.updated_at
    )


@router.patch("/communities/{community_id}", response_model=CommunityResponse)
async def update_community(
    community_id: int,
    update_data: CommunityUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update community details (admin only)"""
    
    community = community_service.get_community_by_id(db, community_id)
    
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community not found"
        )
    
    # Check if user is admin
    user_role = community_service.get_member_role(db, community_id, current_user.id)
    if user_role != MemberRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update community details"
        )
    
    # Update community
    updated_community = community_service.update_community(
        db,
        community_id,
        name=update_data.name,
        description=update_data.description,
        category=update_data.category,
        is_private=update_data.is_private,
        avatar=update_data.avatar,
        banner=update_data.banner
    )
    
    member_count = community_service.get_member_count(db, community_id)
    is_member = community_service.is_member(db, community_id, current_user.id)
    
    return CommunityResponse(
        id=updated_community.id,
        name=updated_community.name,
        slug=updated_community.slug,
        description=updated_community.description,
        avatar=updated_community.avatar,
        banner=updated_community.banner,
        category=updated_community.category,
        is_private=updated_community.is_private,
        created_by_id=updated_community.created_by_id,
        created_by=format_user_basic(updated_community.created_by),
        member_count=member_count,
        is_member=is_member,
        user_role=user_role,
        created_at=updated_community.created_at,
        updated_at=updated_community.updated_at
    )


@router.delete("/communities/{community_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_community(
    community_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a community (admin only)"""
    
    community = community_service.get_community_by_id(db, community_id)
    
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community not found"
        )
    
    # Check if user is admin
    user_role = community_service.get_member_role(db, community_id, current_user.id)
    if user_role != MemberRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete the community"
        )
    
    community_service.delete_community(db, community_id)
    
    return None


@router.post("/communities/{community_id}/join", response_model=dict)
async def join_community(
    community_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Join a community"""
    
    community = community_service.get_community_by_id(db, community_id)
    
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community not found"
        )
    
    # Check if already a member
    if community_service.is_member(db, community_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already a member of this community"
        )
    
    member = community_service.join_community(
        db, community_id, current_user.id, is_private=community.is_private
    )
    
    if community.is_private and not member.is_approved:
        return {"message": "Join request sent. Waiting for approval."}
    
    return {"message": "Successfully joined the community"}


@router.post("/communities/{community_id}/leave", response_model=dict)
async def leave_community(
    community_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Leave a community"""
    
    if not community_service.is_member(db, community_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not a member of this community"
        )
    
    # Check if user is the only admin
    user_role = community_service.get_member_role(db, community_id, current_user.id)
    if user_role == MemberRole.ADMIN:
        # Count admins
        members = community_service.get_community_members(db, community_id)
        admin_count = sum(1 for m in members if m.role == MemberRole.ADMIN)
        
        if admin_count == 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot leave: you are the only admin. Promote another member first or delete the community."
            )
    
    community_service.leave_community(db, community_id, current_user.id)
    
    return {"message": "Successfully left the community"}


@router.get("/communities/{community_id}/members", response_model=list[CommunityMemberResponse])
async def get_community_members(
    community_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get community members"""
    
    community = community_service.get_community_by_id(db, community_id)
    
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community not found"
        )
    
    # Check if private and user is not a member
    is_member = community_service.is_member(db, community_id, current_user.id)
    if community.is_private and not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This is a private community"
        )
    
    members = community_service.get_community_members(db, community_id)
    
    return [
        CommunityMemberResponse(
            id=member.id,
            user_id=member.user_id,
            user=format_user_basic(member.user),
            role=member.role,
            is_approved=member.is_approved,
            joined_at=member.joined_at
        )
        for member in members
    ]


@router.patch("/communities/{community_id}/members/{user_id}/role", response_model=CommunityMemberResponse)
async def update_member_role(
    community_id: int,
    user_id: int,
    role_update: MemberRoleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update member role (admin only)"""
    
    # Check if current user is admin
    user_role = community_service.get_member_role(db, community_id, current_user.id)
    if user_role != MemberRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update member roles"
        )
    
    # Can't demote yourself if you're the only admin
    if user_id == current_user.id and role_update.role != MemberRole.ADMIN:
        members = community_service.get_community_members(db, community_id)
        admin_count = sum(1 for m in members if m.role == MemberRole.ADMIN)
        
        if admin_count == 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote yourself: you are the only admin"
            )
    
    updated_member = community_service.update_member_role(
        db, community_id, user_id, role_update.role
    )
    
    if not updated_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )
    
    return CommunityMemberResponse(
        id=updated_member.id,
        user_id=updated_member.user_id,
        user=format_user_basic(updated_member.user),
        role=updated_member.role,
        is_approved=updated_member.is_approved,
        joined_at=updated_member.joined_at
    )


# Community Posts endpoints
@router.get("/communities/{community_id}/posts", response_model=CommunityPostListResponse)
async def get_community_posts(
    community_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get posts in a community"""
    
    community = community_service.get_community_by_id(db, community_id)
    
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community not found"
        )
    
    # Check if private and user is not a member
    is_member = community_service.is_member(db, community_id, current_user.id)
    if community.is_private and not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This is a private community"
        )
    
    posts, total = community_service.get_community_posts(db, community_id, page, page_size)
    
    # Format posts with like and comment info
    post_list = []
    for post in posts:
        like_count = len(post.likes)
        comment_count = len([c for c in post.comments if not c.is_deleted])
        is_liked = any(like.user_id == current_user.id for like in post.likes)
        
        # Format comments
        comments_list = [
            CommunityPostCommentResponse(
                id=comment.id,
                post_id=comment.post_id,
                author_id=comment.author_id,
                author=format_user_basic(comment.author),
                content=comment.content,
                created_at=comment.created_at,
                is_edited=comment.is_edited
            )
            for comment in post.comments if not comment.is_deleted
        ]
        
        post_list.append(CommunityPostResponse(
            id=post.id,
            community_id=post.community_id,
            author_id=post.author_id,
            author=format_user_basic(post.author),
            content=post.content,
            image_url=post.image_url,
            created_at=post.created_at,
            is_edited=post.is_edited,
            like_count=like_count,
            comment_count=comment_count,
            is_liked=is_liked,
            comments=comments_list
        ))
    
    return CommunityPostListResponse(
        posts=post_list,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/communities/{community_id}/posts", response_model=CommunityPostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    community_id: int,
    post_data: CommunityPostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a post in a community"""
    
    # Check if user is a member
    if not community_service.is_member(db, community_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Must be a member to post in this community"
        )
    
    post = community_service.create_community_post(
        db, community_id, current_user.id, post_data.content, post_data.image_url
    )
    
    return CommunityPostResponse(
        id=post.id,
        community_id=post.community_id,
        author_id=post.author_id,
        author=format_user_basic(post.author),
        content=post.content,
        image_url=post.image_url,
        created_at=post.created_at,
        is_edited=post.is_edited,
        like_count=0,
        comment_count=0,
        is_liked=False,
        comments=[]
    )


@router.patch("/communities/{community_id}/posts/{post_id}", response_model=CommunityPostResponse)
async def update_post(
    community_id: int,
    post_id: int,
    post_data: CommunityPostUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a post (author or admin only)"""
    
    post = db.query(community_service.CommunityPost).filter(
        community_service.CommunityPost.id == post_id,
        community_service.CommunityPost.community_id == community_id
    ).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Check if user is author or admin
    user_role = community_service.get_member_role(db, community_id, current_user.id)
    if post.author_id != current_user.id and user_role != MemberRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only update your own posts"
        )
    
    updated_post = community_service.update_community_post(db, post_id, post_data.content)
    
    like_count = len(updated_post.likes)
    comment_count = len([c for c in updated_post.comments if not c.is_deleted])
    is_liked = any(like.user_id == current_user.id for like in updated_post.likes)
    
    return CommunityPostResponse(
        id=updated_post.id,
        community_id=updated_post.community_id,
        author_id=updated_post.author_id,
        author=format_user_basic(updated_post.author),
        content=updated_post.content,
        image_url=updated_post.image_url,
        created_at=updated_post.created_at,
        is_edited=updated_post.is_edited,
        like_count=like_count,
        comment_count=comment_count,
        is_liked=is_liked,
        comments=[]
    )


@router.delete("/communities/{community_id}/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    community_id: int,
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a post (author or admin only)"""
    
    post = db.query(community_service.CommunityPost).filter(
        community_service.CommunityPost.id == post_id,
        community_service.CommunityPost.community_id == community_id
    ).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Check if user is author or admin
    user_role = community_service.get_member_role(db, community_id, current_user.id)
    if post.author_id != current_user.id and user_role != MemberRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only delete your own posts"
        )
    
    community_service.delete_community_post(db, post_id)
    
    return None


@router.post("/communities/{community_id}/posts/{post_id}/like", response_model=dict)
async def like_post(
    community_id: int,
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Like a post"""
    
    # Check if user is a member
    if not community_service.is_member(db, community_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Must be a member to like posts"
        )
    
    community_service.like_post(db, post_id, current_user.id)
    
    return {"message": "Post liked"}


@router.delete("/communities/{community_id}/posts/{post_id}/like", response_model=dict)
async def unlike_post(
    community_id: int,
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unlike a post"""
    
    community_service.unlike_post(db, post_id, current_user.id)
    
    return {"message": "Post unliked"}


@router.post("/communities/{community_id}/posts/{post_id}/comments", response_model=CommunityPostCommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(
    community_id: int,
    post_id: int,
    comment_data: CommunityPostCommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a comment to a post"""
    
    # Check if user is a member
    if not community_service.is_member(db, community_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Must be a member to comment"
        )
    
    comment = community_service.add_comment(db, post_id, current_user.id, comment_data.content)
    
    return CommunityPostCommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        author_id=comment.author_id,
        author=format_user_basic(comment.author),
        content=comment.content,
        created_at=comment.created_at,
        is_edited=comment.is_edited
    )


@router.delete("/communities/{community_id}/posts/{post_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    community_id: int,
    post_id: int,
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a comment (author or admin only)"""
    
    comment = db.query(community_service.CommunityPostComment).filter(
        community_service.CommunityPostComment.id == comment_id
    ).first()
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Check if user is author or admin
    user_role = community_service.get_member_role(db, community_id, current_user.id)
    if comment.author_id != current_user.id and user_role != MemberRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only delete your own comments"
        )
    
    community_service.delete_comment(db, comment_id)
    
    return None
