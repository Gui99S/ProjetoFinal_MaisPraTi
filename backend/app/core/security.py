"""
Security utilities for authentication and authorization
"""
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.models.user import User
from app.services.jwt import verify_token

# OAuth2 scheme for JWT bearer tokens
security = HTTPBearer(auto_error=False)


async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.
    
    Args:
        authorization: Authorization header with Bearer token
        db: Database session
        
    Returns:
        User: The authenticated user object
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract token from "Bearer <token>"
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise credentials_exception
    except ValueError:
        raise credentials_exception
    
    # Verify and decode token
    token_data = verify_token(token)
    if token_data is None:
        raise credentials_exception
    
    # Get user from database
    user = db.query(User).filter(User.id == token_data.user_id).first()
    if user is None:
        raise credentials_exception
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to get current active user (alias for get_current_user).
    Can be extended with additional checks if needed.
    
    Args:
        current_user: User from get_current_user dependency
        
    Returns:
        User: The authenticated active user
    """
    return current_user


def require_verified_email(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency that requires user to have verified email.
    
    Args:
        current_user: User from get_current_user dependency
        
    Returns:
        User: The authenticated user with verified email
        
    Raises:
        HTTPException: If email is not verified
    """
    if not current_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required"
        )
    return current_user


def get_current_user_from_token(token: str, db: Session) -> Optional[User]:
    """
    Get user from JWT token (for WebSocket authentication).
    
    Args:
        token: JWT access token
        db: Database session
        
    Returns:
        User: The authenticated user object or None if invalid
    """
    # Verify and decode token
    token_data = verify_token(token)
    if token_data is None:
        return None
    
    # Get user from database
    user = db.query(User).filter(User.id == token_data.user_id).first()
    if user is None or not user.is_active:
        return None
    
    return user
