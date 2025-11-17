"""
Posts API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.post import Post, Comment, Like
from app.schemas.post import (
    PostCreate, PostUpdate, PostResponse, PostsFeed,
    CommentCreate, CommentResponse, LikeResponse,
    PostAuthor, CommentAuthor
)
from app.services import notification_service
from app.models.notification import NotificationType

router = APIRouter()


def format_post_response(post: Post, current_user_id: int, db: Session) -> PostResponse:
    """Format post with user like status"""
    # Check if current user liked/disliked this post
    user_like = db.query(Like).filter(
        Like.post_id == post.id,
        Like.user_id == current_user_id
    ).first()
    
    user_liked = None
    if user_like:
        user_liked = user_like.is_like
    
    return PostResponse(
        id=post.id,
        content=post.content,
        likes_count=post.likes_count,
        dislikes_count=post.dislikes_count,
        comments_count=post.comments_count,
        created_at=post.created_at,
        user=PostAuthor(
            id=post.user.id,
            name=post.user.name,
            slug=post.user.slug,  # Use slug from database
            avatar=post.user.avatar
        ),
        user_liked=user_liked
    )


@router.post("/", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_data: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new post"""
    new_post = Post(
        user_id=current_user.id,
        content=post_data.content,
        likes_count=0,
        dislikes_count=0,
        comments_count=0
    )
    
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    
    return format_post_response(new_post, current_user.id, db)


@router.get("/", response_model=PostsFeed)
async def get_posts_feed(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=50, description="Posts per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get paginated feed of all posts"""
    # Calculate offset
    offset = (page - 1) * page_size
    
    # Get total count
    total = db.query(Post).count()
    
    # Get posts with pagination
    posts = db.query(Post).order_by(desc(Post.created_at)).offset(offset).limit(page_size).all()
    
    # Format posts with user like status
    formatted_posts = [format_post_response(post, current_user.id, db) for post in posts]
    
    return PostsFeed(
        posts=formatted_posts,
        total=total,
        page=page,
        page_size=page_size,
        has_more=offset + page_size < total
    )


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific post by ID"""
    post = db.query(Post).filter(Post.id == post_id).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    return format_post_response(post, current_user.id, db)


@router.put("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: int,
    post_data: PostUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a post (only by the author)"""
    post = db.query(Post).filter(Post.id == post_id).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Check if user is the author
    if post.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own posts"
        )
    
    post.content = post_data.content
    db.commit()
    db.refresh(post)
    
    return format_post_response(post, current_user.id, db)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a post (only by the author)"""
    post = db.query(Post).filter(Post.id == post_id).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Check if user is the author
    if post.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own posts"
        )
    
    db.delete(post)
    db.commit()
    
    return None


@router.post("/{post_id}/like", response_model=LikeResponse)
async def like_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Like a post"""
    post = db.query(Post).filter(Post.id == post_id).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Check if user already liked/disliked
    existing_like = db.query(Like).filter(
        Like.post_id == post_id,
        Like.user_id == current_user.id
    ).first()
    
    if existing_like:
        if existing_like.is_like:
            # Already liked, remove like
            db.delete(existing_like)
            post.likes_count -= 1
            user_liked = None
            message = "Like removed"
        else:
            # Was dislike, change to like
            existing_like.is_like = True
            post.dislikes_count -= 1
            post.likes_count += 1
            user_liked = True
            message = "Changed to like"
    else:
        # New like
        new_like = Like(post_id=post_id, user_id=current_user.id, is_like=True)
        db.add(new_like)
        post.likes_count += 1
        user_liked = True
        message = "Post liked"
        
        # Create notification for post author (don't notify yourself)
        if post.user_id != current_user.id:
            notification_service.create_notification(
                db=db,
                user_id=post.user_id,
                notification_type=NotificationType.LIKE,
                title=f"{current_user.name} liked your post",
                message=post.content[:50] + "..." if len(post.content) > 50 else post.content,
                related_id=post.id,
                related_type="post",
                actor_id=current_user.id
            )
    
    db.commit()
    db.refresh(post)
    
    return LikeResponse(
        message=message,
        likes_count=post.likes_count,
        dislikes_count=post.dislikes_count,
        user_liked=user_liked
    )


@router.post("/{post_id}/dislike", response_model=LikeResponse)
async def dislike_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Dislike a post"""
    post = db.query(Post).filter(Post.id == post_id).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    # Check if user already liked/disliked
    existing_like = db.query(Like).filter(
        Like.post_id == post_id,
        Like.user_id == current_user.id
    ).first()
    
    if existing_like:
        if not existing_like.is_like:
            # Already disliked, remove dislike
            db.delete(existing_like)
            post.dislikes_count -= 1
            user_liked = None
            message = "Dislike removed"
        else:
            # Was like, change to dislike
            existing_like.is_like = False
            post.likes_count -= 1
            post.dislikes_count += 1
            user_liked = False
            message = "Changed to dislike"
    else:
        # New dislike
        new_like = Like(post_id=post_id, user_id=current_user.id, is_like=False)
        db.add(new_like)
        post.dislikes_count += 1
        user_liked = False
        message = "Post disliked"
    
    db.commit()
    db.refresh(post)
    
    return LikeResponse(
        message=message,
        likes_count=post.likes_count,
        dislikes_count=post.dislikes_count,
        user_liked=user_liked
    )


@router.post("/{post_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    post_id: int,
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a comment to a post"""
    post = db.query(Post).filter(Post.id == post_id).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    new_comment = Comment(
        post_id=post_id,
        user_id=current_user.id,
        content=comment_data.content
    )
    
    db.add(new_comment)
    post.comments_count += 1
    
    # Create notification for post author (don't notify yourself)
    if post.user_id != current_user.id:
        notification_service.create_notification(
            db=db,
            user_id=post.user_id,
            notification_type=NotificationType.COMMENT,
            title=f"{current_user.name} commented on your post",
            message=comment_data.content[:100] + "..." if len(comment_data.content) > 100 else comment_data.content,
            related_id=post.id,
            related_type="post",
            actor_id=current_user.id
        )
    
    db.commit()
    db.refresh(new_comment)
    
    return CommentResponse(
        id=new_comment.id,
        content=new_comment.content,
        created_at=new_comment.created_at,
        user=CommentAuthor(
            id=current_user.id,
            name=current_user.name,
            slug=current_user.slug,  # Use slug from database
            avatar=current_user.avatar
        )
    )


@router.get("/{post_id}/comments", response_model=list[CommentResponse])
async def get_comments(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all comments for a post"""
    post = db.query(Post).filter(Post.id == post_id).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    comments = db.query(Comment).filter(Comment.post_id == post_id).order_by(Comment.created_at).all()
    
    return [
        CommentResponse(
            id=comment.id,
            content=comment.content,
            created_at=comment.created_at,
            user=CommentAuthor(
                id=comment.user.id,
                name=comment.user.name,
                slug=comment.user.slug,  # Use slug from database
                avatar=comment.user.avatar
            )
        )
        for comment in comments
    ]


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a comment (only by the author)"""
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Check if user is the author
    if comment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own comments"
        )
    
    post = db.query(Post).filter(Post.id == comment.post_id).first()
    if post:
        post.comments_count -= 1
    
    db.delete(comment)
    db.commit()
    
    return None
