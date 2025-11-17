import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useLanguage } from '../../context/LanguageContext';
import marketplaceService from '../../services/marketplaceService';
import './ProductProfile.css';

function ProductProfile({ product, onClose }) {
  const navigate = useNavigate();
  const { user } = useUser();
  const { translate } = useLanguage();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(product?.isFavorited || false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState('');

  // Use product images or generate mock ones
  const images = product?.images && product.images.length > 0
    ? product.images
    : [
        product?.image,
        `https://picsum.photos/seed/${product?.id}-2/600/600`,
        `https://picsum.photos/seed/${product?.id}-3/600/600`,
        `https://picsum.photos/seed/${product?.id}-4/600/600`
      ];

  useEffect(() => {
    // Update favorite status from product prop
    setIsFavorite(product?.isFavorited || false);
  }, [product?.isFavorited]);

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('product-profile-overlay')) {
      onClose();
    }
  };

  const handleFavoriteToggle = async () => {
    if (isTogglingFavorite) return;
    
    setIsTogglingFavorite(true);
    try {
      if (isFavorite) {
        await marketplaceService.removeFromFavorites(product.id);
        setIsFavorite(false);
      } else {
        await marketplaceService.addToFavorites(product.id);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert(error.response?.data?.detail || 'Failed to update favorites');
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleAddToCart = async () => {
    if (isAddingToCart) return;
    
    setIsAddingToCart(true);
    setCartMessage('');
    
    try {
      await marketplaceService.addToCart(product.id, quantity);
      setCartMessage(translate('marketplace.addedToCart'));
      
      // Clear message after 3 seconds
      setTimeout(() => setCartMessage(''), 3000);
    } catch (error) {
      console.error('Error adding to cart:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to add to cart';
      alert(errorMsg);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    try {
      await marketplaceService.addToCart(product.id, quantity);
      navigate('/marketplace/cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert(error.response?.data?.detail || 'Failed to add to cart');
    }
  };

  const handleContactSeller = () => {
    // TODO: Implement contact seller logic
    console.log('Contact seller:', product.seller);
    alert(translate('marketplace.messagingComingSoon'));
  };

  const updateQuantity = (newQuantity) => {
    if (newQuantity < 1) return;
    if (newQuantity > product.stock) return;
    setQuantity(newQuantity);
  };

  const formatPrice = (price) => {
    return `R$ ${price.toFixed(2)}`;
  };

  if (!product) return null;

  return (
    <div className="product-profile-overlay" onClick={handleOverlayClick}>
      <div className="product-profile-modal">
        {/* Close Button */}
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <i className="fas fa-times"></i>
        </button>

        <div className="product-profile-content">
          {/* Left: Images */}
          <div className="product-images-section">
            <div className="main-image-container">
              <img
                src={images[selectedImage]}
                alt={product.name}
                className="main-image"
              />
              <button
                className={`favorite-btn ${isFavorite ? 'active' : ''}`}
                onClick={handleFavoriteToggle}
                disabled={isTogglingFavorite}
                aria-label={isFavorite ? translate('marketplace.removeFromFavorites') : translate('marketplace.addToFavorites')}
              >
                {isTogglingFavorite ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className={`fas fa-heart ${isFavorite ? '' : 'far'}`}></i>
                )}
              </button>
            </div>
            <div className="thumbnail-images">
              {images.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`${product.name} view ${index + 1}`}
                  className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                  onClick={() => setSelectedImage(index)}
                />
              ))}
            </div>
          </div>

          {/* Right: Details */}
          <div className="product-details-section">
            {/* Badges */}
            <div className="product-badges">
              {product.isNew && <span className="badge badge-new">{translate('marketplace.new')}</span>}
              {product.stock === 0 && <span className="badge badge-out-of-stock">{translate('marketplace.outOfStock')}</span>}
              {product.stock > 0 && product.stock <= 5 && (
                <span className="badge badge-low-stock">{translate('marketplace.lowStock')} {product.stock} {translate('marketplace.left')}</span>
              )}
            </div>

            {/* Title */}
            <h1 className="product-title">{product.name}</h1>

            {/* Rating */}
            <div className="product-rating">
              <div className="stars">
                {[1, 2, 3, 4, 5].map(star => (
                  <i
                    key={star}
                    className={`fas fa-star ${star <= Math.floor(product.rating) ? 'filled' : ''}`}
                  ></i>
                ))}
              </div>
              <span className="rating-text">
                {product.rating} ({product.reviewCount} {product.reviewCount === 1 ? translate('marketplace.review') : translate('marketplace.reviews')})
              </span>
            </div>

            {/* Price */}
            <div className="product-price-section">
              <span className="product-price">{formatPrice(product.price)}</span>
              <span className="product-category">
                <i className="fas fa-tag"></i>
                {product.category}
              </span>
            </div>

            {/* Seller */}
            <div className="seller-info">
              <img
                src={`https://ui-avatars.com/api/?name=${product.seller}&background=2563eb&color=fff`}
                alt={product.seller}
                className="seller-avatar"
              />
              <div className="seller-details">
                <span className="seller-label">{translate('marketplace.soldBy')}</span>
                <span className="seller-name">{product.seller}</span>
              </div>
              <button className="btn-contact" onClick={handleContactSeller}>
                <i className="fas fa-comment-dots"></i>
                {translate('marketplace.contact')}
              </button>
            </div>

            {/* Description */}
            <div className="product-description">
              <h3>{translate('marketplace.description')}</h3>
              <p>{product.description}</p>
              {product.location && (
                <p className="product-location">
                  <i className="fas fa-map-marker-alt"></i>
                  {product.location}
                </p>
              )}
            </div>

            {/* Stock & Quantity */}
            {product.stock > 0 && (
              <div className="purchase-section">
                <div className="quantity-selector">
                  <label>{translate('marketplace.quantity')}:</label>
                  <div className="quantity-control">
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(quantity - 1)}
                      disabled={quantity <= 1}
                    >
                      <i className="fas fa-minus"></i>
                    </button>
                    <span className="quantity">{quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(quantity + 1)}
                      disabled={quantity >= product.stock}
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>
                  <span className="stock-text">
                    {product.stock} {translate('marketplace.available')}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                  {cartMessage && (
                    <div className="cart-success-message">
                      <i className="fas fa-check-circle"></i>
                      {cartMessage}
                    </div>
                  )}
                  <button 
                    className="btn-add-cart" 
                    onClick={handleAddToCart}
                    disabled={isAddingToCart}
                  >
                    {isAddingToCart ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        {translate('marketplace.adding')}
                      </>
                    ) : (
                      <>
                        <i className="fas fa-shopping-cart"></i>
                        {translate('marketplace.addToCart')}
                      </>
                    )}
                  </button>
                  <button 
                    className="btn-buy-now" 
                    onClick={handleBuyNow}
                    disabled={isAddingToCart}
                  >
                    <i className="fas fa-bolt"></i>
                    {translate('marketplace.buyNow')}
                  </button>
                </div>
              </div>
            )}

            {product.stock === 0 && (
              <div className="out-of-stock-notice">
                <i className="fas fa-exclamation-circle"></i>
                <span>{translate('marketplace.outOfStockNotice')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductProfile;
