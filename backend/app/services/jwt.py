from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from app.core.config import settings
from app.schemas.auth import TokenData

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_token(token: str, token_type: str = None) -> Optional[TokenData]:
    """Verify and decode a JWT token
    
    Args:
        token: The JWT token to verify
        token_type: Optional token type to validate ('access' or 'refresh')
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        
        # Verify token type if specified
        if token_type and payload.get("type") != token_type:
            return None
        
        user_id_str = payload.get("sub")
        email: str = payload.get("email")
        
        if user_id_str is None:
            return None
        
        # Convert string user_id back to int
        try:
            user_id = int(user_id_str)
        except (ValueError, TypeError):
            return None
        
        return TokenData(user_id=user_id, email=email)
    except JWTError:
        return None
