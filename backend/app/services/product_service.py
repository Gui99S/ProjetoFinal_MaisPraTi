"""
Product service layer - business logic for marketplace operations
"""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func
from typing import Optional, Tuple, List
from datetime import datetime
from decimal import Decimal

from app.models.product import (
    Product, ProductFavorite, CartItem,
    ProductCategory, ProductCondition, ProductStatus
)
from app.models.user import User


def create_product(
    db: Session,
    seller_id: int,
    name: str,
    description: str,
    price: float,
    condition: ProductCondition,
    category: ProductCategory,
    stock: int = 1,
    images: Optional[List[str]] = None,
    location: Optional[str] = None
) -> Product:
    """Create a new product listing"""
    # Convert image list to comma-separated string
    images_str = ",".join(images) if images else None
    
    product = Product(
        seller_id=seller_id,
        name=name,
        description=description,
        price=Decimal(str(price)),
        condition=condition,
        category=category,
        stock=stock,
        images=images_str,
        location=location,
        status=ProductStatus.ACTIVE
    )
    
    db.add(product)
    db.commit()
    db.refresh(product)
    
    return product


def get_product_by_id(db: Session, product_id: int) -> Optional[Product]:
    """Get product by ID with seller info"""
    return db.query(Product).options(
        joinedload(Product.seller)
    ).filter(Product.id == product_id).first()


def search_products(
    db: Session,
    search: Optional[str] = None,
    category: Optional[ProductCategory] = None,
    condition: Optional[ProductCondition] = None,
    status: Optional[ProductStatus] = ProductStatus.ACTIVE,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    seller_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 20
) -> Tuple[List[Product], int]:
    """Search products with filters and pagination"""
    query = db.query(Product).options(joinedload(Product.seller))
    
    # Apply status filter (default to ACTIVE only)
    if status:
        query = query.filter(Product.status == status)
    
    # Apply search filter
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_pattern),
                Product.description.ilike(search_pattern)
            )
        )
    
    # Apply category filter
    if category:
        query = query.filter(Product.category == category)
    
    # Apply condition filter
    if condition:
        query = query.filter(Product.condition == condition)
    
    # Apply price range filters
    if min_price is not None:
        query = query.filter(Product.price >= Decimal(str(min_price)))
    
    if max_price is not None:
        query = query.filter(Product.price <= Decimal(str(max_price)))
    
    # Filter by seller
    if seller_id:
        query = query.filter(Product.seller_id == seller_id)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    products = query.order_by(Product.created_at.desc()).offset(offset).limit(page_size).all()
    
    return products, total


def update_product(
    db: Session,
    product_id: int,
    name: Optional[str] = None,
    description: Optional[str] = None,
    price: Optional[float] = None,
    condition: Optional[ProductCondition] = None,
    category: Optional[ProductCategory] = None,
    stock: Optional[int] = None,
    images: Optional[List[str]] = None,
    location: Optional[str] = None,
    status: Optional[ProductStatus] = None
) -> Optional[Product]:
    """Update product details"""
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if not product:
        return None
    
    if name is not None:
        product.name = name
    
    if description is not None:
        product.description = description
    
    if price is not None:
        product.price = Decimal(str(price))
    
    if condition is not None:
        product.condition = condition
    
    if category is not None:
        product.category = category
    
    if stock is not None:
        product.stock = stock
    
    if images is not None:
        product.images = ",".join(images) if images else None
    
    if location is not None:
        product.location = location
    
    if status is not None:
        product.status = status
    
    product.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(product)
    
    return product


def delete_product(db: Session, product_id: int) -> bool:
    """Delete a product (hard delete)"""
    product = db.query(Product).filter(Product.id == product_id).first()
    
    if not product:
        return False
    
    db.delete(product)
    db.commit()
    
    return True


def mark_as_sold(db: Session, product_id: int) -> Optional[Product]:
    """Mark product as sold"""
    return update_product(db, product_id, status=ProductStatus.SOLD, stock=0)


def mark_as_reserved(db: Session, product_id: int) -> Optional[Product]:
    """Mark product as reserved"""
    return update_product(db, product_id, status=ProductStatus.RESERVED)


# Favorites
def add_to_favorites(db: Session, user_id: int, product_id: int) -> ProductFavorite:
    """Add product to user's favorites"""
    # Check if already favorited
    existing = db.query(ProductFavorite).filter(
        ProductFavorite.user_id == user_id,
        ProductFavorite.product_id == product_id
    ).first()
    
    if existing:
        return existing
    
    favorite = ProductFavorite(user_id=user_id, product_id=product_id)
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    
    return favorite


def remove_from_favorites(db: Session, user_id: int, product_id: int) -> bool:
    """Remove product from user's favorites"""
    favorite = db.query(ProductFavorite).filter(
        ProductFavorite.user_id == user_id,
        ProductFavorite.product_id == product_id
    ).first()
    
    if not favorite:
        return False
    
    db.delete(favorite)
    db.commit()
    
    return True


def is_favorited(db: Session, user_id: int, product_id: int) -> bool:
    """Check if user has favorited a product"""
    favorite = db.query(ProductFavorite).filter(
        ProductFavorite.user_id == user_id,
        ProductFavorite.product_id == product_id
    ).first()
    
    return favorite is not None


def get_user_favorites(db: Session, user_id: int, page: int = 1, page_size: int = 20) -> Tuple[List[ProductFavorite], int]:
    """Get user's favorite products"""
    query = db.query(ProductFavorite).filter(
        ProductFavorite.user_id == user_id
    ).options(
        joinedload(ProductFavorite.product).joinedload(Product.seller)
    )
    
    total = query.count()
    
    offset = (page - 1) * page_size
    favorites = query.order_by(ProductFavorite.created_at.desc()).offset(offset).limit(page_size).all()
    
    return favorites, total


# Shopping Cart
def add_to_cart(db: Session, user_id: int, product_id: int, quantity: int = 1) -> CartItem:
    """Add product to shopping cart or update quantity if already exists"""
    # Check if item already in cart
    cart_item = db.query(CartItem).filter(
        CartItem.user_id == user_id,
        CartItem.product_id == product_id
    ).first()
    
    if cart_item:
        # Update quantity
        cart_item.quantity += quantity
        db.commit()
        db.refresh(cart_item)
        return cart_item
    
    # Create new cart item
    cart_item = CartItem(
        user_id=user_id,
        product_id=product_id,
        quantity=quantity
    )
    
    db.add(cart_item)
    db.commit()
    db.refresh(cart_item)
    
    return cart_item


def get_cart_items(db: Session, user_id: int) -> List[CartItem]:
    """Get all items in user's cart"""
    return db.query(CartItem).filter(
        CartItem.user_id == user_id
    ).options(
        joinedload(CartItem.product).joinedload(Product.seller)
    ).order_by(CartItem.added_at.desc()).all()


def update_cart_item_quantity(db: Session, cart_item_id: int, quantity: int) -> Optional[CartItem]:
    """Update cart item quantity"""
    cart_item = db.query(CartItem).filter(CartItem.id == cart_item_id).first()
    
    if not cart_item:
        return None
    
    cart_item.quantity = quantity
    db.commit()
    db.refresh(cart_item)
    
    return cart_item


def remove_from_cart(db: Session, cart_item_id: int) -> bool:
    """Remove item from cart"""
    cart_item = db.query(CartItem).filter(CartItem.id == cart_item_id).first()
    
    if not cart_item:
        return False
    
    db.delete(cart_item)
    db.commit()
    
    return True


def clear_cart(db: Session, user_id: int) -> bool:
    """Clear all items from user's cart"""
    db.query(CartItem).filter(CartItem.user_id == user_id).delete()
    db.commit()
    
    return True


def get_cart_total(db: Session, user_id: int) -> dict:
    """Calculate cart totals"""
    cart_items = get_cart_items(db, user_id)
    
    total_items = sum(item.quantity for item in cart_items)
    total_price = sum(float(item.product.price) * item.quantity for item in cart_items)
    
    return {
        "total_items": total_items,
        "total_price": round(total_price, 2)
    }
