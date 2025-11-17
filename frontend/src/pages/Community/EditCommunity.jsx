import React, { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import communityService from '../../services/communityService'
import './Community.css'
import './EditCommunity.css'

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
]

export default function EditCommunity() {
  const { user } = useUser()
  const { id: communityId } = useParams()
  const navigate = useNavigate()
  
  const [community, setCommunity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    avatar: ''
  })
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    loadCommunityData()
  }, [communityId])

  const loadCommunityData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await communityService.getCommunity(communityId)
      
      // Check if user has permission to edit
      if (data.user_role !== 'admin' && data.user_role !== 'moderator') {
        setError('You do not have permission to edit this community')
        return
      }
      
      setCommunity(data)
      setFormData({
        name: data.name,
        description: data.description,
        category: data.category,
        avatar: data.avatar || ''
      })
      setAvatarPreview(data.avatar)
    } catch (err) {
      console.error('Error loading community:', err)
      if (err.detail === 'Not authenticated') {
        setError('You must be logged in to edit this community')
      } else if (err.detail?.includes('not found')) {
        setError('Community not found')
      } else {
        setError(err.detail || 'Failed to load community')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleAvatarChange = (e) => {
    const value = e.target.value
    setFormData(prev => ({
      ...prev,
      avatar: value
    }))
    setAvatarPreview(value)
    if (errors.avatar) {
      setErrors(prev => ({ ...prev, avatar: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Community name is required'
    } else if (formData.name.length < 1 || formData.name.length > 100) {
      newErrors.name = 'Community name must be between 1 and 100 characters'
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Community description is required'
    } else if (formData.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters'
    }
    
    if (!formData.category) {
      newErrors.category = 'Please select a category'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsSaving(true)
    
    try {
      const updateData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        avatar: formData.avatar || null
      }

      await communityService.updateCommunity(communityId, updateData)
      
      // Navigate back to the community page
      navigate(`/communities/${communityId}`)
    } catch (err) {
      console.error('Error updating community:', err)
      if (err.detail === 'Not authenticated') {
        setErrors({ submit: 'You must be logged in to update this community' })
      } else if (err.detail?.includes('permission')) {
        setErrors({ submit: 'You do not have permission to update this community' })
      } else {
        setErrors({ submit: err.detail || 'Failed to update community. Please try again.' })
      }
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    navigate(`/communities/${communityId}`)
  }

  if (loading) {
    return (
      <main className="community-page page">
        <div className="loading-message">Loading community...</div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="community-page page">
        <div className="error-message">{error}</div>
        <Link to={`/communities/${communityId}`} className="btn btn-secondary">
          Back to Community
        </Link>
      </main>
    )
  }

  if (!community) return null

  const isAdmin = community.user_role === 'admin'
  const isModerator = community.user_role === 'moderator'

  return (
    <main className="community-page page">
      <div className="community-container">
        {/* Left Column - Community Preview */}
        <aside className="community-sidebar">
          <div className="community-header">
            <img 
              src={avatarPreview || 'https://picsum.photos/seed/community-avatar/200/200'} 
              alt={formData.name || 'Community'} 
              className="community-avatar" 
            />
            <h1 className="community-title">{formData.name || 'Community Name'}</h1>
            <div className="community-category">
              {formData.category ? formData.category.charAt(0).toUpperCase() + formData.category.slice(1) : 'Category'}
              {community.is_private && ' 🔒'}
            </div>
            <div className="community-stats">
              <div className="stat-item">
                <span className="stat-label">Members:</span>
                <span className="stat-value">{community.member_count}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Created:</span>
                <span className="stat-value">{new Date(community.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="member-role-badge">
              {isAdmin && '👑 Admin'}
              {isModerator && '⭐ Moderator'}
            </div>
          </div>
        </aside>

        {/* Center Column - Edit Form */}
        <section className="community-main">
          <div className="tabs-container">
            <div className="tab-buttons">
              <button className="tab-btn active">
                Edit Community
              </button>
            </div>

            <div className="tab-content">
              <div className="edit-community-form">
                <form onSubmit={handleSubmit}>
                  {/* Community Name */}
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">
                      Community Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className={`form-input ${errors.name ? 'error' : ''}`}
                      placeholder="Enter community name"
                      value={formData.name}
                      onChange={handleInputChange}
                      maxLength={100}
                    />
                    {errors.name && <span className="error-message">{errors.name}</span>}
                    <span className="char-count">{formData.name.length}/100</span>
                  </div>

                  {/* Community Avatar URL */}
                  <div className="form-group">
                    <label htmlFor="avatar" className="form-label">
                      Community Avatar (URL)
                    </label>
                    <input
                      type="url"
                      id="avatar"
                      name="avatar"
                      className={`form-input ${errors.avatar ? 'error' : ''}`}
                      placeholder="https://example.com/avatar.jpg"
                      value={formData.avatar}
                      onChange={handleAvatarChange}
                    />
                    {errors.avatar && <span className="error-message">{errors.avatar}</span>}
                    <p className="form-hint">Enter a URL to an image for your community avatar</p>
                  </div>

                  {/* About Description */}
                  <div className="form-group">
                    <label htmlFor="description" className="form-label">
                      About this Community <span className="required">*</span>
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      className={`form-textarea ${errors.description ? 'error' : ''}`}
                      placeholder="Describe what your community is about..."
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
                      Category <span className="required">*</span>
                    </label>
                    <select
                      id="category"
                      name="category"
                      className={`form-select ${errors.category ? 'error' : ''}`}
                      value={formData.category}
                      onChange={handleInputChange}
                    >
                      <option value="">Select a category</option>
                      {CATEGORY_OPTIONS.map(cat => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                    {errors.category && <span className="error-message">{errors.category}</span>}
                  </div>

                  {/* Submit Error */}
                  {errors.submit && (
                    <div className="submit-error">
                      {errors.submit}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-cancel"
                      onClick={handleCancel}
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column - Info */}
        <aside className="community-tabs-sidebar">
          <div className="tabs-container">
            <div className="tab-buttons">
              <button className="tab-btn active">
                Editor Info
              </button>
            </div>

            <div className="tab-content">
              <div className="editor-info">
                <h4>Editing as {isAdmin ? 'Admin' : 'Moderator'}</h4>
                <p className="info-text">
                  You can edit the community name, avatar, description, and category.
                </p>
                <p className="info-text">
                  Changes will be visible to all community members immediately.
                </p>
                <div className="info-tips">
                  <h5>Tips:</h5>
                  <ul>
                    <li>Keep the name clear and concise</li>
                    <li>Use a high-quality avatar image</li>
                    <li>Write a detailed description</li>
                    <li>Choose the most relevant category</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
