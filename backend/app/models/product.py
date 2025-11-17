"""
Product/Marketplace models for database
"""
from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.core.database import Base


class ProductCondition(str, enum.Enum):
    """Product condition enum"""
    NEW = "new"
    LIKE_NEW = "like_new"
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"


class ProductCategory(str, enum.Enum):
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


class ProductStatus(str, enum.Enum):
    """Product listing status"""
    ACTIVE = "active"
    SOLD = "sold"
    RESERVED = "reserved"
    INACTIVE = "inactive"


class Product(Base):
    """Product listing model"""
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Basic info
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    
    # Details
    condition = Column(SQLEnum(ProductCondition), nullable=False)
    category = Column(SQLEnum(ProductCategory), nullable=False, index=True)
    stock = Column(Integer, default=1, nullable=False)
    
    # Images (JSON array of URLs stored as comma-separated string)
    images = Column(Text, nullable=True)  # Store as "url1,url2,url3"
    
    # Status
    status = Column(SQLEnum(ProductStatus), default=ProductStatus.ACTIVE, nullable=False, index=True)
    
    # Location (optional)
    location = Column(String(200), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    seller = relationship("User", foreign_keys=[seller_id])
    favorites = relationship("ProductFavorite", back_populates="product", cascade="all, delete-orphan")
    cart_items = relationship("CartItem", back_populates="product", cascade="all, delete-orphan")


class ProductFavorite(Base):
    """User's favorite products"""
    __tablename__ = "product_favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User")
    product = relationship("Product", back_populates="favorites")


class CartItem(Base):
    """Shopping cart items"""
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User")
    product = relationship("Product", back_populates="cart_items")
