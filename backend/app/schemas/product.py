"""
Product/Marketplace Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum
from decimal import Decimal


class ProductCondition(str, Enum):
    """Product condition enum"""
    NEW = "new"
    LIKE_NEW = "like_new"
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"


class ProductCategory(str, Enum):
    """Product category enum"""
    ELECTRONICS = "electronics"
    CLOTHING = "clothing"
    HOME = "home"
    SPORTS = "sports"
    BOOKS = "books"
    TOYS = "toys"
    AUTOMOTIVE = "automotive"
    BEAUTY = "beauty"
    PETS = "pets"
    FOOD = "food"
    MUSIC = "music"
    ART = "art"
    GAMES = "games"
    HEALTH = "health"
    OTHER = "other"


class ProductStatus(str, Enum):
    """Product listing status"""
    ACTIVE = "active"
    SOLD = "sold"
    RESERVED = "reserved"
    INACTIVE = "inactive"


# Request schemas
class ProductCreate(BaseModel):
    """Create product request"""
    name: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=5000)
    price: float = Field(..., gt=0)
    condition: ProductCondition
    category: ProductCategory
    stock: int = Field(default=1, ge=1)
    images: List[str] = Field(default_factory=list)
    location: Optional[str] = Field(None, max_length=200)
    
    @field_validator('price')
    @classmethod
    def validate_price(cls, v):
        if v <= 0:
            raise ValueError('Price must be greater than 0')
        if v > 999999.99:
            raise ValueError('Price must be less than 1,000,000')
        return round(v, 2)


class ProductUpdate(BaseModel):
    """Update product request"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1, max_length=5000)
    price: Optional[float] = Field(None, gt=0)
    condition: Optional[ProductCondition] = None
    category: Optional[ProductCategory] = None
    stock: Optional[int] = Field(None, ge=0)
    images: Optional[List[str]] = None
    location: Optional[str] = Field(None, max_length=200)
    status: Optional[ProductStatus] = None
    
    @field_validator('price')
    @classmethod
    def validate_price(cls, v):
        if v is not None:
            if v <= 0:
                raise ValueError('Price must be greater than 0')
            if v > 999999.99:
                raise ValueError('Price must be less than 1,000,000')
            return round(v, 2)
        return v


class CartItemCreate(BaseModel):
    """Add item to cart request"""
    product_id: int
    quantity: int = Field(default=1, ge=1)


class CartItemUpdate(BaseModel):
    """Update cart item quantity"""
    quantity: int = Field(..., ge=1)


# Response schemas
class UserBasic(BaseModel):
    """Basic user info for nested responses"""
    id: int
    name: str
    slug: Optional[str] = None
    avatar: Optional[str] = None
    
    class Config:
        from_attributes = True


class ProductResponse(BaseModel):
    """Product response"""
    id: int
    seller_id: int
    seller: UserBasic
    name: str
    description: str
    price: float
    condition: ProductCondition
    category: ProductCategory
    stock: int
    images: List[str] = []
    status: ProductStatus
    location: Optional[str] = None
    is_favorited: bool = False
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    """List of products with pagination"""
    products: List[ProductResponse]
    total: int
    page: int
    page_size: int


class CartItemResponse(BaseModel):
    """Cart item response with product details"""
    id: int
    user_id: int
    product_id: int
    product: ProductResponse
    quantity: int
    added_at: datetime
    subtotal: float  # price * quantity
    
    class Config:
        from_attributes = True


class CartResponse(BaseModel):
    """Shopping cart with items"""
    items: List[CartItemResponse]
    total_items: int
    total_price: float


class ProductFavoriteResponse(BaseModel):
    """Favorite product response"""
    id: int
    user_id: int
    product_id: int
    product: ProductResponse
    created_at: datetime
    
    class Config:
        from_attributes = True
