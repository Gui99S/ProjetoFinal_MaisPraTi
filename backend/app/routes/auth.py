from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import UserRegister, UserLogin, Token, UserResponse, RefreshTokenRequest
from app.services.auth import hash_password, verify_password
from app.services.jwt import create_access_token, create_refresh_token, verify_token
from app.core.utils import generate_user_slug

router = APIRouter()

def format_user_response(user: User) -> UserResponse:
    """Format user model to response schema"""
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        slug=user.slug,  # Include slug in response
        avatar=user.avatar,
        birthday=user.birthday,
        status=user.status,
        occupation=user.occupation,
        location=user.location,
        bio=user.bio,
        theme=user.theme,
        language=user.language,
        is_bot=user.is_bot,  # Include is_bot flag
        joinDate=user.created_at.strftime("%m/%d/%Y") if user.created_at else ""
    )

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user"""
    
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user with default values
    new_user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=hash_password(user_data.password),
        avatar=f"https://ui-avatars.com/api/?name={user_data.name.replace(' ', '+')}&background=3498db&color=fff&size=128",
        birthday=datetime(2000, 1, 1).date(),  # Default birthday: 1/1/2000
        status='',  # Empty relationship status by default
        location='',  # Empty location by default
        occupation='',  # Empty occupation by default
        bio='Hello! Welcome to my profile.',  # Default bio
        created_at=datetime.utcnow()
    )
    
    db.add(new_user)
    db.flush()  # Flush to get the user object without committing
    
    # Generate unique slug after user is created
    new_user.slug = generate_user_slug(new_user.name, db)
    
    db.commit()
    db.refresh(new_user)
    
    # Create tokens (convert user.id to string for JWT 'sub' claim)
    access_token = create_access_token(data={"sub": str(new_user.id), "email": new_user.email})
    refresh_token = create_refresh_token(data={"sub": str(new_user.id), "email": new_user.email})
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=format_user_response(new_user)
    )

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user and return JWT tokens"""
    
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create tokens (convert user.id to string for JWT 'sub' claim)
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token(data={"sub": str(user.id), "email": user.email})
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        user=format_user_response(user)
    )

@router.post("/logout")
async def logout():
    """Logout user (client-side token removal)"""
    return {"message": "Successfully logged out"}

@router.post("/refresh")
async def refresh_access_token(
    request: RefreshTokenRequest, 
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token"""
    
    # Verify the refresh token and ensure it's a refresh token type
    token_data = verify_token(request.refresh_token, token_type="refresh")
    
    if not token_data or not token_data.user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Get user from database to ensure they still exist and are active
    user = db.query(User).filter(User.id == token_data.user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    
    # Create new access token
    new_access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    
    return {"access_token": new_access_token, "token_type": "bearer"}
