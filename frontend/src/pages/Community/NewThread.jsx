import React, { useState } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import './NewThread.css'

export default function NewThread({ onSubmit, onCancel }) {
  const { translate } = useLanguage()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [errors, setErrors] = useState({})

  const validateForm = () => {
    const newErrors = {}
    
    if (!title.trim()) {
      newErrors.title = translate('communities.titleRequired')
    } else if (title.length < 3) {
      newErrors.title = translate('communities.titleTooShort')
    } else if (title.length > 100) {
      newErrors.title = translate('communities.titleTooLong')
    }
    
    if (!content.trim()) {
      newErrors.content = translate('communities.contentRequired')
    } else if (content.length < 10) {
      newErrors.content = translate('communities.contentTooShort')
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    onSubmit({ title, content })
    
    // Reset form
    setTitle('')
    setContent('')
    setErrors({})
  }

  return (
    <div className="new-thread-card">
      <h3>{translate('communities.createThread')}</h3>
      <form onSubmit={handleSubmit} className="new-thread-form">
        <div className="form-group">
          <label htmlFor="thread-title" className="form-label">
            {translate('communities.threadTitle')} <span className="required">*</span>
          </label>
          <input
            type="text"
            id="thread-title"
            className={`thread-title-input ${errors.title ? 'error' : ''}`}
            placeholder={translate('communities.threadTitlePlaceholder')}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (errors.title) setErrors({ ...errors, title: '' })
            }}
            maxLength={100}
          />
          {errors.title && <span className="error-message">{errors.title}</span>}
          <span className="char-count">{title.length}/100</span>
        </div>

        <div className="form-group">
          <label htmlFor="thread-content" className="form-label">
            {translate('communities.threadContent')} <span className="required">*</span>
          </label>
          <textarea
            id="thread-content"
            className={`thread-content-input ${errors.content ? 'error' : ''}`}
            placeholder={translate('communities.threadContentPlaceholder')}
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              if (errors.content) setErrors({ ...errors, content: '' })
            }}
            rows="6"
          />
          {errors.content && <span className="error-message">{errors.content}</span>}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-cancel" onClick={onCancel}>
            {translate('communities.cancel')}
          </button>
          <button type="submit" className="btn btn-primary">
            {translate('communities.postThread')}
          </button>
        </div>
      </form>
    </div>
  )
}
