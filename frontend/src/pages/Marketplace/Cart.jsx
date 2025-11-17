import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import marketplaceService from '../../services/marketplaceService';
import './Cart.css';

function Cart() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [updatingItems, setUpdatingItems] = useState(new Set());

  // Fetch cart on mount
  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await marketplaceService.getCart();
      setCartItems(response.items);
      setTotalItems(response.totalItems);
      setTotalPrice(response.totalPrice);
    } catch (err) {
      console.error('Error fetching cart:', err);
      setError(err.response?.data?.detail || 'Failed to load cart');
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (cartItemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    // Mark this item as updating
    setUpdatingItems(prev => new Set(prev).add(cartItemId));
    
    try {
      await marketplaceService.updateCartItemQuantity(cartItemId, newQuantity);
      // Refresh cart to get updated totals
      await fetchCart();
    } catch (err) {
      console.error('Error updating quantity:', err);
      alert(err.response?.data?.detail || 'Failed to update quantity');
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(cartItemId);
        return next;
      });
    }
  };

  const removeItem = async (cartItemId) => {
    if (!confirm('Remove this item from cart?')) return;
    
    setUpdatingItems(prev => new Set(prev).add(cartItemId));
    
    try {
      await marketplaceService.removeFromCart(cartItemId);
      await fetchCart();
    } catch (err) {
      console.error('Error removing item:', err);
      alert(err.response?.data?.detail || 'Failed to remove item');
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(cartItemId);
        return next;
      });
    }
  };

  const calculateSubtotal = () => {
    return totalPrice; // Backend already calculates this
  };

  const calculateTotal = () => {
    const subtotal = totalPrice;
    const shipping = subtotal > 100 ? 0 : 10; // Free shipping over R$100
    return subtotal + shipping;
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    
    // TODO: Implement checkout logic
    console.log('Proceeding to checkout:', {
      items: cartItems,
      subtotal: totalPrice,
      total: calculateTotal(),
      user: user?.name
    });
    
    alert('Checkout functionality coming soon!');
  };

  const handleContinueShopping = () => {
    navigate('/marketplace');
  };

  const formatPrice = (price) => {
    return `R$ ${parseFloat(price).toFixed(2)}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="cart-container">
        <div className="cart-loading">
          <i className="fas fa-spinner fa-spin fa-3x"></i>
          <p>Loading cart...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="cart-container">
        <div className="cart-error">
          <i className="fas fa-exclamation-triangle"></i>
          <h2>Failed to load cart</h2>
          <p>{error}</p>
          <button className="btn-retry" onClick={fetchCart}>
            <i className="fas fa-redo"></i>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty cart
  if (cartItems.length === 0) {
    return (
      <div className="cart-container">
        <div className="cart-empty">
          <i className="fas fa-shopping-cart"></i>
          <h2>Your cart is empty</h2>
          <p>Add some products to get started!</p>
          <button className="btn-continue" onClick={handleContinueShopping}>
            <i className="fas fa-arrow-left"></i>
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  const subtotal = calculateSubtotal();
  const shipping = subtotal > 100 ? 0 : 10;
  const total = calculateTotal();

  return (
    <div className="cart-container">
      <div className="cart-header">
        <button className="btn-back" onClick={handleContinueShopping}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1 className="cart-title">Shopping Cart</h1>
        <span className="cart-count">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
      </div>

      <div className="cart-layout">
        {/* Cart Items */}
        <div className="cart-items">
          {cartItems.map(item => {
            const isUpdating = updatingItems.has(item.id);
            
            return (
              <div key={item.id} className={`cart-item ${isUpdating ? 'updating' : ''}`}>
                <img
                  src={item.image}
                  alt={item.name}
                  className="cart-item-image"
                  onClick={() => navigate(`/marketplace/product/${item.productId}`)}
                />
                
                <div className="cart-item-details">
                  <h3
                    className="cart-item-name"
                    onClick={() => navigate(`/marketplace/product/${item.productId}`)}
                  >
                    {item.name}
                  </h3>
                  <p className="cart-item-seller">
                    <i className="fas fa-store"></i>
                    {item.seller}
                  </p>
                  <p className="cart-item-stock">
                    {item.stock > 10 ? (
                      <span className="in-stock">In Stock</span>
                    ) : item.stock > 0 ? (
                      <span className="low-stock">Only {item.stock} left</span>
                    ) : (
                      <span className="out-of-stock">Out of Stock</span>
                    )}
                  </p>
                </div>

                <div className="cart-item-actions">
                  <div className="quantity-control">
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1 || isUpdating}
                    >
                      <i className="fas fa-minus"></i>
                    </button>
                    <span className="quantity">
                      {isUpdating ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : (
                        item.quantity
                      )}
                    </span>
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.stock || isUpdating}
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>

                  <p className="cart-item-price">{formatPrice(item.subtotal)}</p>

                  <button
                    className="btn-remove"
                    onClick={() => removeItem(item.id)}
                    disabled={isUpdating}
                    aria-label="Remove item"
                  >
                    {isUpdating ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-trash-alt"></i>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="cart-summary">
          <h2 className="summary-title">Order Summary</h2>
          
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          
          <div className="summary-row">
            <span>Shipping</span>
            <span>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
          </div>
          
          {subtotal < 100 && (
            <p className="free-shipping-notice">
              <i className="fas fa-truck"></i>
              Add {formatPrice(100 - subtotal)} more for free shipping!
            </p>
          )}
          
          <div className="summary-divider"></div>
          
          <div className="summary-row summary-total">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          
          <button className="btn-checkout" onClick={handleCheckout}>
            <i className="fas fa-lock"></i>
            Proceed to Checkout
          </button>
          
          <button className="btn-continue-outline" onClick={handleContinueShopping}>
            <i className="fas fa-arrow-left"></i>
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}

export default Cart;
