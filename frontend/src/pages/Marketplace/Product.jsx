import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import './Product.css';

function Product({ product, onClick }) {
  const { translate } = useLanguage();
  const [isFavorite, setIsFavorite] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleFavoriteToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleClick = (e) => {
    e.preventDefault();
    if (onClick) {
      onClick(product);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  return (
    <div className="product-card" onClick={handleClick}>
      <div className="product-image-container">
        {imageError ? (
          <div className="product-image-placeholder">
            <i className="fas fa-image"></i>
            <span>{translate('marketplace.noImage')}</span>
          </div>
        ) : (
          <img
            src={product.image || 'https://via.placeholder.com/300x300?text=Product'}
            alt={product.name}
            className="product-image"
            onError={handleImageError}
            loading="lazy"
          />
        )}
        
        {/* Badges */}
        <div className="product-badges">
          {product.isNew && (
            <span className="product-badge badge-new">{translate('marketplace.new')}</span>
          )}
          {product.stock === 0 && (
            <span className="product-badge badge-out-of-stock">{translate('marketplace.outOfStock')}</span>
          )}
        </div>

        {/* Favorite Button */}
        <button
          className={`favorite-button ${isFavorite ? 'active' : ''}`}
          onClick={handleFavoriteToggle}
          aria-label={isFavorite ? translate('marketplace.removeFromFavorites') : translate('marketplace.addToFavorites')}
        >
          <i className={`${isFavorite ? 'fas' : 'far'} fa-heart`}></i>
        </button>
      </div>

      <div className="product-info">
        {/* Category */}
        {product.category && (
          <span className="product-category">{product.category}</span>
        )}

        {/* Name */}
        <h3 className="product-name">{product.name}</h3>

        {/* Rating */}
        {product.rating && (
          <div className="product-rating">
            <div className="stars">
              {[1, 2, 3, 4, 5].map(star => (
                <i
                  key={star}
                  className={`fas fa-star ${star <= Math.round(product.rating) ? 'filled' : ''}`}
                ></i>
              ))}
            </div>
            <span className="rating-count">({product.reviewCount || 0})</span>
          </div>
        )}

        {/* Price */}
        <div className="product-price-container">
          <span className="product-price">{formatPrice(product.price)}</span>
        </div>

        {/* Seller Info */}
        {product.seller && (
          <div className="product-seller">
            <i className="fas fa-store"></i>
            <span>{product.seller}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default Product;
