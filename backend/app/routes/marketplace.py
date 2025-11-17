"""
Marketplace/Product API routes
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse, ProductListResponse,
    ProductCategory, ProductCondition, ProductStatus,
    CartItemCreate, CartItemUpdate, CartItemResponse, CartResponse,
    ProductFavoriteResponse, UserBasic
)
from app.services import product_service

router = APIRouter()


def format_user_basic(user: User) -> dict:
    """Format user data for nested responses"""
    return {
        "id": user.id,
        "name": user.name,
        "slug": user.slug,
        "avatar": user.avatar
    }


def format_product_response(product, user_id: int, db: Session) -> ProductResponse:
    """Format product with favorite status"""
    images_list = product.images.split(",") if product.images else []
    is_favorited = product_service.is_favorited(db, user_id, product.id)
    
    return ProductResponse(
        id=product.id,
        seller_id=product.seller_id,
        seller=format_user_basic(product.seller),
        name=product.name,
        description=product.description,
        price=float(product.price),
        condition=product.condition,
        category=product.category,
        stock=product.stock,
        images=images_list,
        status=product.status,
        location=product.location,
        is_favorited=is_favorited,
        created_at=product.created_at,
        updated_at=product.updated_at
    )


@router.get("/marketplace/products", response_model=ProductListResponse)
async def get_products(
    search: Optional[str] = Query(None, description="Search in name and description"),
    category: Optional[ProductCategory] = Query(None, description="Filter by category"),
    condition: Optional[ProductCondition] = Query(None, description="Filter by condition"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price"),
    seller_id: Optional[int] = Query(None, description="Filter by seller"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of products with search and filters"""
    
    products, total = product_service.search_products(
        db,
        search=search,
        category=category,
        condition=condition,
        status=ProductStatus.ACTIVE,
        min_price=min_price,
        max_price=max_price,
        seller_id=seller_id,
        page=page,
        page_size=page_size
    )
    
    product_list = [format_product_response(p, current_user.id, db) for p in products]
    
    return ProductListResponse(
        products=product_list,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/marketplace/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new product listing"""
    
    product = product_service.create_product(
        db,
        seller_id=current_user.id,
        name=product_data.name,
        description=product_data.description,
        price=product_data.price,
        condition=product_data.condition,
        category=product_data.category,
        stock=product_data.stock,
        images=product_data.images,
        location=product_data.location
    )
    
    return format_product_response(product, current_user.id, db)


@router.get("/marketplace/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get product details"""
    
    product = product_service.get_product_by_id(db, product_id)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return format_product_response(product, current_user.id, db)


@router.patch("/marketplace/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    update_data: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update product details (seller only)"""
    
    product = product_service.get_product_by_id(db, product_id)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Check if user is the seller
    if product.seller_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the seller can update this product"
        )
    
    updated_product = product_service.update_product(
        db,
        product_id,
        name=update_data.name,
        description=update_data.description,
        price=update_data.price,
        condition=update_data.condition,
        category=update_data.category,
        stock=update_data.stock,
        images=update_data.images,
        location=update_data.location,
        status=update_data.status
    )
    
    return format_product_response(updated_product, current_user.id, db)


@router.delete("/marketplace/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a product (seller only)"""
    
    product = product_service.get_product_by_id(db, product_id)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Check if user is the seller
    if product.seller_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the seller can delete this product"
        )
    
    product_service.delete_product(db, product_id)
    
    return None


@router.post("/marketplace/products/{product_id}/favorite", response_model=dict)
async def favorite_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add product to favorites"""
    
    # Check if product exists
    product = product_service.get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    product_service.add_to_favorites(db, current_user.id, product_id)
    
    return {"message": "Product added to favorites"}


@router.delete("/marketplace/products/{product_id}/favorite", response_model=dict)
async def unfavorite_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove product from favorites"""
    
    product_service.remove_from_favorites(db, current_user.id, product_id)
    
    return {"message": "Product removed from favorites"}


@router.get("/marketplace/favorites", response_model=ProductListResponse)
async def get_favorites(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's favorite products"""
    
    favorites, total = product_service.get_user_favorites(db, current_user.id, page, page_size)
    
    product_list = [format_product_response(f.product, current_user.id, db) for f in favorites]
    
    return ProductListResponse(
        products=product_list,
        total=total,
        page=page,
        page_size=page_size
    )


# Cart endpoints
@router.get("/marketplace/cart", response_model=CartResponse)
async def get_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's shopping cart"""
    
    cart_items = product_service.get_cart_items(db, current_user.id)
    totals = product_service.get_cart_total(db, current_user.id)
    
    items_response = []
    for item in cart_items:
        product_response = format_product_response(item.product, current_user.id, db)
        subtotal = float(item.product.price) * item.quantity
        
        items_response.append(CartItemResponse(
            id=item.id,
            user_id=item.user_id,
            product_id=item.product_id,
            product=product_response,
            quantity=item.quantity,
            added_at=item.added_at,
            subtotal=round(subtotal, 2)
        ))
    
    return CartResponse(
        items=items_response,
        total_items=totals["total_items"],
        total_price=totals["total_price"]
    )


@router.post("/marketplace/cart", response_model=CartItemResponse, status_code=status.HTTP_201_CREATED)
async def add_to_cart(
    cart_data: CartItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add product to cart"""
    
    # Check if product exists and is available
    product = product_service.get_product_by_id(db, cart_data.product_id)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if product.status != ProductStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product is not available for purchase"
        )
    
    if product.stock < cart_data.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {product.stock} items available in stock"
        )
    
    # Can't buy your own product
    if product.seller_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot purchase your own product"
        )
    
    cart_item = product_service.add_to_cart(db, current_user.id, cart_data.product_id, cart_data.quantity)
    
    # Refresh to get product relationship
    db.refresh(cart_item)
    
    product_response = format_product_response(cart_item.product, current_user.id, db)
    subtotal = float(cart_item.product.price) * cart_item.quantity
    
    return CartItemResponse(
        id=cart_item.id,
        user_id=cart_item.user_id,
        product_id=cart_item.product_id,
        product=product_response,
        quantity=cart_item.quantity,
        added_at=cart_item.added_at,
        subtotal=round(subtotal, 2)
    )


@router.patch("/marketplace/cart/{cart_item_id}", response_model=CartItemResponse)
async def update_cart_item(
    cart_item_id: int,
    update_data: CartItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update cart item quantity"""
    
    # Get cart item and verify ownership
    cart_item = db.query(product_service.CartItem).filter(
        product_service.CartItem.id == cart_item_id
    ).first()
    
    if not cart_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found"
        )
    
    if cart_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not your cart item"
        )
    
    # Check stock availability
    product = product_service.get_product_by_id(db, cart_item.product_id)
    if product.stock < update_data.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {product.stock} items available in stock"
        )
    
    updated_item = product_service.update_cart_item_quantity(db, cart_item_id, update_data.quantity)
    
    # Refresh to get product relationship
    db.refresh(updated_item)
    
    product_response = format_product_response(updated_item.product, current_user.id, db)
    subtotal = float(updated_item.product.price) * updated_item.quantity
    
    return CartItemResponse(
        id=updated_item.id,
        user_id=updated_item.user_id,
        product_id=updated_item.product_id,
        product=product_response,
        quantity=updated_item.quantity,
        added_at=updated_item.added_at,
        subtotal=round(subtotal, 2)
    )


@router.delete("/marketplace/cart/{cart_item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_cart(
    cart_item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove item from cart"""
    
    # Get cart item and verify ownership
    cart_item = db.query(product_service.CartItem).filter(
        product_service.CartItem.id == cart_item_id
    ).first()
    
    if not cart_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found"
        )
    
    if cart_item.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not your cart item"
        )
    
    product_service.remove_from_cart(db, cart_item_id)
    
    return None


@router.delete("/marketplace/cart", status_code=status.HTTP_204_NO_CONTENT)
async def clear_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clear all items from cart"""
    
    product_service.clear_cart(db, current_user.id)
    
    return None
