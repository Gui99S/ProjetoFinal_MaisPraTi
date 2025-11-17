"""
Community service layer - business logic for community operations
"""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func
from typing import Optional, Tuple, List
from datetime import datetime
import re

from app.models.community import (
    Community, CommunityMember, CommunityPost, 
    CommunityPostComment, CommunityPostLike,
    CommunityCategory, MemberRole
)
from app.models.user import User


def generate_slug(name: str, db: Session) -> str:
    """Generate unique slug from community name"""
    # Convert to lowercase and replace spaces/special chars with hyphens
    base_slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    
    # Check if slug exists
    slug = base_slug
    counter = 1
    while db.query(Community).filter(Community.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    return slug


def create_community(
    db: Session,
    name: str,
    creator_id: int,
    description: Optional[str] = None,
    category: CommunityCategory = CommunityCategory.OTHER,
    is_private: bool = False,
    avatar: Optional[str] = None,
    banner: Optional[str] = None
) -> Community:
    """Create a new community"""
    # Generate unique slug
    slug = generate_slug(name, db)
    
    # Create community
    community = Community(
        name=name,
        slug=slug,
        description=description,
        category=category,
        is_private=is_private,
        avatar=avatar,
        banner=banner,
        created_by_id=creator_id
    )
    
    db.add(community)
    db.flush()  # Get community ID
    
    # Automatically add creator as admin member
    creator_member = CommunityMember(
        community_id=community.id,
        user_id=creator_id,
        role=MemberRole.ADMIN,
        is_approved=True
    )
    
    db.add(creator_member)
    db.commit()
    db.refresh(community)
    
    return community


def get_community_by_id(
    db: Session,
    community_id: int,
    load_members: bool = False
) -> Optional[Community]:
    """Get community by ID"""
    query = db.query(Community).filter(Community.id == community_id)
    
    if load_members:
        query = query.options(
            joinedload(Community.members).joinedload(CommunityMember.user),
            joinedload(Community.created_by)
        )
    else:
        query = query.options(joinedload(Community.created_by))
    
    return query.first()


def get_community_by_slug(
    db: Session,
    slug: str,
    load_members: bool = False
) -> Optional[Community]:
    """Get community by slug"""
    query = db.query(Community).filter(Community.slug == slug)
    
    if load_members:
        query = query.options(
            joinedload(Community.members).joinedload(CommunityMember.user),
            joinedload(Community.created_by)
        )
    else:
        query = query.options(joinedload(Community.created_by))
    
    return query.first()


def search_communities(
    db: Session,
    search: Optional[str] = None,
    category: Optional[CommunityCategory] = None,
    page: int = 1,
    page_size: int = 20
) -> Tuple[List[Community], int]:
    """Search communities with filters and pagination"""
    query = db.query(Community).options(joinedload(Community.created_by))
    
    # Apply search filter
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Community.name.ilike(search_pattern),
                Community.description.ilike(search_pattern)
            )
        )
    
    # Apply category filter
    if category:
        query = query.filter(Community.category == category)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    communities = query.order_by(Community.created_at.desc()).offset(offset).limit(page_size).all()
    
    return communities, total


def update_community(
    db: Session,
    community_id: int,
    name: Optional[str] = None,
    description: Optional[str] = None,
    category: Optional[CommunityCategory] = None,
    is_private: Optional[bool] = None,
    avatar: Optional[str] = None,
    banner: Optional[str] = None
) -> Optional[Community]:
    """Update community details"""
    community = db.query(Community).filter(Community.id == community_id).first()
    
    if not community:
        return None
    
    if name is not None:
        community.name = name
        # Regenerate slug if name changes
        community.slug = generate_slug(name, db)
    
    if description is not None:
        community.description = description
    
    if category is not None:
        community.category = category
    
    if is_private is not None:
        community.is_private = is_private
    
    if avatar is not None:
        community.avatar = avatar
    
    if banner is not None:
        community.banner = banner
    
    community.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(community)
    
    return community


def delete_community(db: Session, community_id: int) -> bool:
    """Delete a community"""
    community = db.query(Community).filter(Community.id == community_id).first()
    
    if not community:
        return False
    
    db.delete(community)
    db.commit()
    
    return True


def join_community(
    db: Session,
    community_id: int,
    user_id: int,
    is_private: bool = False
) -> CommunityMember:
    """Join a community (or request to join if private)"""
    # Check if already a member
    existing = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == user_id,
        CommunityMember.left_at.is_(None)
    ).first()
    
    if existing:
        return existing
    
    # Create new membership
    member = CommunityMember(
        community_id=community_id,
        user_id=user_id,
        role=MemberRole.MEMBER,
        is_approved=not is_private  # Auto-approve for public communities
    )
    
    db.add(member)
    db.commit()
    db.refresh(member)
    
    return member


def leave_community(
    db: Session,
    community_id: int,
    user_id: int
) -> bool:
    """Leave a community"""
    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == user_id,
        CommunityMember.left_at.is_(None)
    ).first()
    
    if not member:
        return False
    
    member.left_at = datetime.utcnow()
    db.commit()
    
    return True


def get_member_role(
    db: Session,
    community_id: int,
    user_id: int
) -> Optional[MemberRole]:
    """Get user's role in community"""
    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == user_id,
        CommunityMember.left_at.is_(None),
        CommunityMember.is_approved == True
    ).first()
    
    return member.role if member else None


def is_member(
    db: Session,
    community_id: int,
    user_id: int
) -> bool:
    """Check if user is an active member of community"""
    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == user_id,
        CommunityMember.left_at.is_(None),
        CommunityMember.is_approved == True
    ).first()
    
    return member is not None


def update_member_role(
    db: Session,
    community_id: int,
    user_id: int,
    new_role: MemberRole
) -> Optional[CommunityMember]:
    """Update member role"""
    member = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == user_id,
        CommunityMember.left_at.is_(None)
    ).first()
    
    if not member:
        return None
    
    member.role = new_role
    db.commit()
    db.refresh(member)
    
    return member


def get_community_members(
    db: Session,
    community_id: int,
    approved_only: bool = True
) -> List[CommunityMember]:
    """Get all members of a community"""
    query = db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.left_at.is_(None)
    ).options(joinedload(CommunityMember.user))
    
    if approved_only:
        query = query.filter(CommunityMember.is_approved == True)
    
    return query.all()


def get_member_count(db: Session, community_id: int) -> int:
    """Get count of active members in community"""
    return db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.left_at.is_(None),
        CommunityMember.is_approved == True
    ).count()


# Community Posts
def create_community_post(
    db: Session,
    community_id: int,
    author_id: int,
    content: str,
    image_url: Optional[str] = None
) -> CommunityPost:
    """Create a post in a community"""
    post = CommunityPost(
        community_id=community_id,
        author_id=author_id,
        content=content,
        image_url=image_url
    )
    
    db.add(post)
    db.commit()
    db.refresh(post)
    
    return post


def get_community_posts(
    db: Session,
    community_id: int,
    page: int = 1,
    page_size: int = 20
) -> Tuple[List[CommunityPost], int]:
    """Get posts in a community with pagination"""
    query = db.query(CommunityPost).filter(
        CommunityPost.community_id == community_id,
        CommunityPost.is_deleted == False
    ).options(
        joinedload(CommunityPost.author),
        joinedload(CommunityPost.comments).joinedload(CommunityPostComment.author),
        joinedload(CommunityPost.likes)
    )
    
    total = query.count()
    
    offset = (page - 1) * page_size
    posts = query.order_by(CommunityPost.created_at.desc()).offset(offset).limit(page_size).all()
    
    return posts, total


def update_community_post(
    db: Session,
    post_id: int,
    content: str
) -> Optional[CommunityPost]:
    """Update a community post"""
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    
    if not post:
        return None
    
    post.content = content
    post.is_edited = True
    post.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(post)
    
    return post


def delete_community_post(db: Session, post_id: int) -> bool:
    """Delete a community post (soft delete)"""
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    
    if not post:
        return False
    
    post.is_deleted = True
    post.updated_at = datetime.utcnow()
    
    db.commit()
    
    return True


def like_post(db: Session, post_id: int, user_id: int) -> CommunityPostLike:
    """Like a post"""
    # Check if already liked
    existing = db.query(CommunityPostLike).filter(
        CommunityPostLike.post_id == post_id,
        CommunityPostLike.user_id == user_id
    ).first()
    
    if existing:
        return existing
    
    like = CommunityPostLike(post_id=post_id, user_id=user_id)
    db.add(like)
    db.commit()
    db.refresh(like)
    
    return like


def unlike_post(db: Session, post_id: int, user_id: int) -> bool:
    """Unlike a post"""
    like = db.query(CommunityPostLike).filter(
        CommunityPostLike.post_id == post_id,
        CommunityPostLike.user_id == user_id
    ).first()
    
    if not like:
        return False
    
    db.delete(like)
    db.commit()
    
    return True


def add_comment(
    db: Session,
    post_id: int,
    author_id: int,
    content: str
) -> CommunityPostComment:
    """Add a comment to a post"""
    comment = CommunityPostComment(
        post_id=post_id,
        author_id=author_id,
        content=content
    )
    
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    return comment


def delete_comment(db: Session, comment_id: int) -> bool:
    """Delete a comment (soft delete)"""
    comment = db.query(CommunityPostComment).filter(CommunityPostComment.id == comment_id).first()
    
    if not comment:
        return False
    
    comment.is_deleted = True
    comment.updated_at = datetime.utcnow()
    
    db.commit()
    
    return True
