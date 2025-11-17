from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, date

# Request schemas
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    avatar: Optional[str] = None
    birthday: Optional[date] = None
    status: Optional[str] = None
    occupation: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    theme: Optional[str] = None
    language: Optional[str] = None

# Response schemas
class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    slug: Optional[str] = None  # URL slug for profile (e.g., "john-doe-123")
    avatar: Optional[str] = None
    birthday: Optional[date] = None
    status: Optional[str] = None
    occupation: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    theme: str = 'light'
    language: str = 'en'
    is_bot: bool = False  # Flag to identify bot accounts
    joinDate: str  # Will be formatted from created_at
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
