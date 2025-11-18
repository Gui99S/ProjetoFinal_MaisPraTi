import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useLanguage } from '../../context/LanguageContext';
import communityService from '../../services/communityService';
import './NewCommunity.css';

const CATEGORY_OPTIONS = [
  'technology',
  'gaming',
  'music',
  'art',
  'sports',
  'food',
  'travel',
  'education',
  'entertainment',
  'health',
  'business',
  'lifestyle',
  'other'
];

function NewCommunity() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { translate } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    is_private: false
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, avatar: 'Please select an image file' }));
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, avatar: 'Image must be less than 5MB' }));
        return;
      }
      
      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      // Clear avatar error
      if (errors.avatar) {
        setErrors(prev => ({ ...prev, avatar: '' }));
      }
    }
  };

  const handleCategoryChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      category: value
    }));
    if (errors.category) {
      setErrors(prev => ({ ...prev, category: '' }));
    }
  };

  const handlePrivacyToggle = () => {
    setFormData(prev => ({
      ...prev,
      is_private: !prev.is_private
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Community name is required';
    } else if (formData.name.length < 1 || formData.name.length > 100) {
      newErrors.name = 'Community name must be between 1 and 100 characters';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Community description is required';
    } else if (formData.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters';
    }
    
    if (!formData.category) {
      newErrors.category = 'Please select a category';
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
      const communityData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        is_private: formData.is_private
      };

      const newCommunity = await communityService.createCommunity(communityData);
      
      // Navigate to the new community page
      navigate(`/communities/${newCommunity.id}`);
    } catch (error) {
      console.error('Error creating community:', error);
      setErrors({ submit: error.detail || translate('communities.failedToCreate') });
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/communities');
  };

  return (
    <div className="new-community-container">
      <div className="new-community-card">
        <h1 className="new-community-title">{translate('communities.create')}</h1>
        <p className="new-community-subtitle">
          {translate('communities.subtitle')}
        </p>
        
        <form onSubmit={handleSubmit} className="new-community-form">
          {/* Community Name */}
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              {translate('communities.communityName')} <span className="required">{translate('communities.nameRequired')}</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className={`form-input ${errors.name ? 'error' : ''}`}
              placeholder={translate('communities.namePlaceholder')}
              value={formData.name}
              onChange={handleInputChange}
              maxLength={100}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
            <span className="char-count">{formData.name.length}/100</span>
          </div>

          {/* About Description */}
          <div className="form-group">
            <label htmlFor="description" className="form-label">
              {translate('communities.aboutCommunity')} <span className="required">{translate('communities.nameRequired')}</span>
            </label>
            <textarea
              id="description"
              name="description"
              className={`form-textarea ${errors.description ? 'error' : ''}`}
              placeholder={translate('communities.descriptionPlaceholder')}
              value={formData.description}
              onChange={handleInputChange}
              rows={5}
              maxLength={2000}
            />
            {errors.description && <span className="error-message">{errors.description}</span>}
            <span className="char-count">{formData.description.length}/2000</span>
          </div>

          {/* Category Select */}
          <div className="form-group">
            <label htmlFor="category" className="form-label">
              {translate('marketplace.category')} <span className="required">{translate('communities.nameRequired')}</span>
            </label>
            <select
              id="category"
              name="category"
              className={`form-select ${errors.category ? 'error' : ''}`}
              value={formData.category}
              onChange={handleCategoryChange}
            >
              <option value="">{translate('communities.categorySelect')}</option>
              {CATEGORY_OPTIONS.map(cat => (
                <option key={cat} value={cat}>
                  {translate(`category.${cat}`)}
                </option>
              ))}
            </select>
            {errors.category && <span className="error-message">{errors.category}</span>}
          </div>

          {/* Privacy Toggle */}
          <div className="form-group">
            <label className="form-label">
              {translate('communities.privacySettings')}
            </label>
            <div className="privacy-toggle">
              <label className="toggle-container">
                <input
                  type="checkbox"
                  checked={formData.is_private}
                  onChange={handlePrivacyToggle}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">
                  {formData.is_private ? translate('communities.privateInviteOnly') : translate('communities.publicAnyone')}
                </span>
              </label>
              <p className="form-hint">
                {formData.is_private 
                  ? translate('communities.membersApproved')
                  : translate('communities.anyoneCanJoin')}
              </p>
            </div>
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
              {translate('communities.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  {translate('communities.creating')}
                </>
              ) : (
                <>
                  <i className="fas fa-plus-circle"></i>
                  {translate('communities.createCommunity')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewCommunity;
