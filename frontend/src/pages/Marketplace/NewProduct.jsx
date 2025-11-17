import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useLanguage } from '../../context/LanguageContext';
import marketplaceService from '../../services/marketplaceService';
import './NewProduct.css';

const CATEGORY_OPTIONS = [
  'Electronics',
  'Fashion',
  'Home & Garden',
  'Sports & Outdoors',
  'Toys & Games',
  'Books & Media',
  'Automotive',
  'Health & Beauty',
  'Food & Beverages',
  'Gaming',
  'Pet Supplies',
  'Art & Crafts',
  'Music Instruments',
  'Other'
];

const CONDITION_OPTIONS = [
  'New',
  'Like New',
  'Good',
  'Acceptable'
];

function NewProduct() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { translate } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    condition: 'New',
    categories: [],
    location: ''
  });
  const [imageUrls, setImageUrls] = useState(['']);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageUrlChange = (index, value) => {
    const newUrls = [...imageUrls];
    newUrls[index] = value;
    setImageUrls(newUrls);
    
    // Clear images error
    if (errors.images) {
      setErrors(prev => ({ ...prev, images: '' }));
    }
  };

  const addImageUrlField = () => {
    if (imageUrls.length < 5) {
      setImageUrls([...imageUrls, '']);
    }
  };

  const removeImageUrlField = (index) => {
    if (imageUrls.length > 1) {
      setImageUrls(imageUrls.filter((_, i) => i !== index));
    }
  };

  const handleCategoryToggle = (category) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Product name must be at least 3 characters';
    } else if (formData.name.length > 200) {
      newErrors.name = 'Product name must be less than 200 characters';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.length > 5000) {
      newErrors.description = 'Description must be less than 5000 characters';
    }
    
    if (!formData.price) {
      newErrors.price = 'Price is required';
    } else if (isNaN(formData.price) || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Price must be a positive number';
    } else if (parseFloat(formData.price) > 999999.99) {
      newErrors.price = 'Price is too high';
    }
    
    if (!formData.stock) {
      newErrors.stock = 'Stock quantity is required';
    } else if (isNaN(formData.stock) || parseInt(formData.stock) < 0) {
      newErrors.stock = 'Stock must be a non-negative number';
    } else if (parseInt(formData.stock) > 999999) {
      newErrors.stock = 'Stock quantity is too high';
    }
    
    // At least one non-empty image URL
    const validUrls = imageUrls.filter(url => url.trim());
    if (validUrls.length === 0) {
      newErrors.images = 'At least one product image URL is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Filter out empty image URLs
      const validImageUrls = imageUrls.filter(url => url.trim());
      
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        condition: formData.condition,
        categories: formData.categories, // Service will use first category
        images: validImageUrls,
        location: formData.location.trim() || null
      };
      
      await marketplaceService.createProduct(productData);
      
      // Navigate to marketplace
      navigate('/marketplace');
    } catch (error) {
      console.error('Error creating product:', error);
      setErrors({ 
        submit: error.response?.data?.detail || 'Failed to create product. Please try again.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/marketplace');
  };

  return (
    <div className="new-product-container">
      <div className="new-product-card">
        <h1 className="new-product-title">{translate('marketplace.listNewProduct')}</h1>
        <p className="new-product-subtitle">
          {translate('marketplace.shareItems')}
        </p>
        
        <form onSubmit={handleSubmit} className="new-product-form">
          {/* Product Name */}
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              {translate('marketplace.productName')} <span className="required">{translate('marketplace.required')}</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className={`form-input ${errors.name ? 'error' : ''}`}
              placeholder={translate('marketplace.enterProductName')}
              value={formData.name}
              onChange={handleInputChange}
              maxLength={100}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
            <span className="char-count">{formData.name.length}/100</span>
          </div>

          {/* Product Images */}
          <div className="form-group">
            <label className="form-label">
              {translate('marketplace.productImages')} <span className="required">{translate('marketplace.required')}</span>
            </label>
            <p className="form-hint">{translate('marketplace.addUpTo5')}</p>
            
            {/* URL Input Fields */}
            <div className="image-url-inputs">
              {imageUrls.map((url, index) => (
                <div key={index} className="url-input-row">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => handleImageUrlChange(index, e.target.value)}
                    placeholder={`${translate('marketplace.imageUrl')} ${index + 1}`}
                    className="form-input"
                  />
                  {imageUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeImageUrlField(index)}
                      className="remove-url-btn"
                      aria-label={`Remove URL ${index + 1}`}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              ))}
              
              {imageUrls.length < 5 && (
                <button
                  type="button"
                  onClick={addImageUrlField}
                  className="add-url-btn"
                >
                  <i className="fas fa-plus"></i> {translate('marketplace.addImageUrl')}
                </button>
              )}
            </div>
            
            {/* Image Previews */}
            {imageUrls.filter(url => url.trim()).length > 0 && (
              <div className="images-preview-grid">
                {imageUrls.filter(url => url.trim()).map((url, index) => (
                  <div key={index} className="image-preview-item">
                    <img 
                      src={url} 
                      alt={`Product ${index + 1}`}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                      onLoad={(e) => {
                        e.target.style.display = 'block';
                        e.target.nextSibling.style.display = 'none';
                      }}
                    />
                    <div className="image-error" style={{ display: 'none' }}>
                      <i className="fas fa-image"></i>
                      <span>{translate('marketplace.invalidUrl')}</span>
                    </div>
                    {index === 0 && <span className="primary-badge">{translate('marketplace.primary')}</span>}
                  </div>
                ))}
              </div>
            )}
            
            {errors.images && <span className="error-message">{errors.images}</span>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description" className="form-label">
              {translate('marketplace.description')} <span className="required">{translate('marketplace.required')}</span>
            </label>
            <textarea
              id="description"
              name="description"
              className={`form-textarea ${errors.description ? 'error' : ''}`}
              placeholder={translate('marketplace.describeProduct')}
              value={formData.description}
              onChange={handleInputChange}
              rows={6}
              maxLength={1000}
            />
            {errors.description && <span className="error-message">{errors.description}</span>}
            <span className="char-count">{formData.description.length}/1000</span>
          </div>

          {/* Price and Stock Row */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="price" className="form-label">
                {translate('marketplace.price')} (BRL) <span className="required">{translate('marketplace.required')}</span>
              </label>
              <div className="input-with-icon">
                <span className="input-icon">R$</span>
                <input
                  type="number"
                  id="price"
                  name="price"
                  className={`form-input with-icon ${errors.price ? 'error' : ''}`}
                  placeholder="0.00"
                  value={formData.price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                />
              </div>
              {errors.price && <span className="error-message">{errors.price}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="stock" className="form-label">
                {translate('marketplace.stockQuantity')} <span className="required">{translate('marketplace.required')}</span>
              </label>
              <input
                type="number"
                id="stock"
                name="stock"
                className={`form-input ${errors.stock ? 'error' : ''}`}
                placeholder="0"
                value={formData.stock}
                onChange={handleInputChange}
                min="0"
              />
              {errors.stock && <span className="error-message">{errors.stock}</span>}
            </div>
          </div>

          {/* Condition */}
          <div className="form-group">
            <label htmlFor="condition" className="form-label">
              {translate('marketplace.condition')} <span className="required">{translate('marketplace.required')}</span>
            </label>
            <div className="condition-options">
              {CONDITION_OPTIONS.map(option => (
                <label key={option} className="condition-option">
                  <input
                    type="radio"
                    name="condition"
                    value={option}
                    checked={formData.condition === option}
                    onChange={handleInputChange}
                  />
                  <span className="condition-label">{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="form-group">
            <label className="form-label">
              {translate('marketplace.categories')} <span className="optional">{translate('marketplace.optional')}</span>
            </label>
            <p className="form-hint">{translate('marketplace.selectCategories')}</p>
            <div className="dropdown-container">
              <button
                type="button"
                className="dropdown-button"
                onClick={toggleDropdown}
              >
                <span>
                  {formData.categories.length > 0
                    ? `${formData.categories.length} ${translate('marketplace.selected')}`
                    : translate('marketplace.selectCategories')}
                </span>
                <i className={`fas fa-chevron-${dropdownOpen ? 'up' : 'down'}`}></i>
              </button>
              {dropdownOpen && (
                <div className="dropdown-menu">
                  {CATEGORY_OPTIONS.map(category => (
                    <label key={category} className="dropdown-item">
                      <input
                        type="checkbox"
                        checked={formData.categories.includes(category)}
                        onChange={() => handleCategoryToggle(category)}
                      />
                      <span>{category}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {formData.categories.length > 0 && (
              <div className="selected-categories">
                {formData.categories.map(cat => (
                  <span key={cat} className="category-badge">
                    {cat}
                    <button
                      type="button"
                      className="remove-category"
                      onClick={() => handleCategoryToggle(cat)}
                      aria-label={`Remove ${cat}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="submit-error">
              <i className="fas fa-exclamation-circle"></i>
              {errors.submit}
            </div>
          )}

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-cancel"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              {translate('marketplace.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  {translate('marketplace.listing')}
                </>
              ) : (
                <>
                  <i className="fas fa-tag"></i>
                  {translate('marketplace.submit')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewProduct;
