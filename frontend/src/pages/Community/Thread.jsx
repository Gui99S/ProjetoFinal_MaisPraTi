import React, { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import { useLanguage } from '../../context/LanguageContext'
import communityService from '../../services/communityService'
import './Thread.css'

export default function Thread() {
  const { user } = useUser()
  const { translate } = useLanguage()
  const { id: communityId, threadId } = useParams()
  const navigate = useNavigate()

  const [thread, setThread] = useState(null)
  const [community, setCommunity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  useEffect(() => {
    loadThreadData()
  }, [communityId, threadId])

  const loadThreadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load community info
      const communityData = await communityService.getCommunity(communityId)
      setCommunity(communityData)

      // Load all posts to find this specific thread
      const postsData = await communityService.getPosts(communityId, 1, 100)
      const foundThread = postsData.posts.find(p => p.id === parseInt(threadId))
      
      if (!foundThread) {
        setError(translate('communities.threadNotFound'))
        return
      }

      setThread(foundThread)
    } catch (err) {
      console.error('Error loading thread:', err)
      setError(err.detail || translate('communities.failedToLoadThread'))
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async () => {
    if (!thread) return
    
    try {
      if (thread.is_liked) {
        await communityService.unlikePost(communityId, threadId)
      } else {
        await communityService.likePost(communityId, threadId)
      }
      loadThreadData()
    } catch (err) {
      console.error('Error toggling like:', err)
      alert(err.detail || translate('communities.failedToUpdateLike'))
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmittingComment(true)
    try {
      await communityService.addComment(communityId, threadId, { content: newComment })
      setNewComment('')
      loadThreadData()
    } catch (err) {
      console.error('Error adding comment:', err)
      alert(err.detail || translate('communities.failedToAddComment'))
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!confirm(translate('communities.confirmDeleteComment'))) return

    try {
      await communityService.deleteComment(communityId, threadId, commentId)
      loadThreadData()
    } catch (err) {
      console.error('Error deleting comment:', err)
      alert(err.detail || translate('communities.failedToDeleteComment'))
    }
  }

  const handleDeleteThread = async () => {
    if (!confirm(translate('communities.confirmDeleteThread'))) return

    try {
      await communityService.deletePost(communityId, threadId)
      navigate(`/communities/${communityId}`)
    } catch (err) {
      console.error('Error deleting thread:', err)
      alert(err.detail || translate('communities.failedToDeleteThread'))
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="thread-container">
        <div className="thread-loading">{translate('communities.loadingThread')}</div>
      </div>
    )
  }

  if (error || !thread) {
    return (
      <div className="thread-container">
        <div className="thread-error">{error || 'Thread not found'}</div>
        <Link to={`/communities/${communityId}`} className="btn btn-secondary">
          Back to Community
        </Link>
      </div>
    )
  }

  const contentLines = thread.content.split('\n')
  const threadTitle = contentLines[0] || 'Untitled'
  const threadBody = contentLines.slice(2).join('\n') // Skip title and empty line

  const isAuthor = thread.author_id === user?.id
  const isAdmin = community?.user_role === 'admin'
  const isModerator = community?.user_role === 'moderator'
  const canDelete = isAuthor || isAdmin || isModerator
  const isMember = community?.is_member

  return (
    <div className="thread-container">
      {/* Back Button */}
      <div className="thread-nav">
        <Link to={`/communities/${communityId}`} className="btn-back">
          <i className="fas fa-arrow-left"></i>
        </Link>
      </div>

      {/* Thread Content */}
      <div className="thread-content-card">
        <div className="thread-header">
          <div className="thread-header-left">
            <img 
              src={thread.author.avatar || 'https://picsum.photos/seed/user/48/48'} 
              alt={thread.author.name}
              className="thread-author-avatar"
            />
            <div className="thread-author-info">
              <Link to={`/profile/${thread.author.slug}`} className="thread-author-name">
                {thread.author.name}
              </Link>
              <span className="thread-date">{formatDate(thread.created_at)}</span>
              {thread.is_edited && <span className="thread-edited"> (edited)</span>}
            </div>
          </div>
          {canDelete && (
            <button className="btn-delete-thread" onClick={handleDeleteThread} title="Delete thread">
              <i className="fas fa-trash"></i>
            </button>
          )}
        </div>

        <h1 className="thread-title">{threadTitle}</h1>
        <div className="thread-body">{threadBody}</div>

        {/* Thread Actions */}
        <div className="thread-actions">
          <button 
            className={`action-btn ${thread.is_liked ? 'liked' : ''}`}
            onClick={handleLike}
            disabled={!isMember}
          >
            <i className="fas fa-thumbs-up"></i> {thread.is_liked ? 'Liked' : 'Like'} ({thread.like_count || 0})
          </button>
          <div className="thread-stats">
            <span><i className="fas fa-comment"></i> {thread.comment_count || 0} comments</span>
          </div>
        </div>

        {/* Comments List */}
        <div className="comments-list">
          {thread.comments && thread.comments.length > 0 ? (
            thread.comments
              .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) // Oldest first
              .map(comment => (
              <div key={comment.id} className="comment-card">
                <div className="comment-header">
                  <img 
                    src={comment.author.avatar || 'https://picsum.photos/seed/user/40/40'} 
                    alt={comment.author.name}
                    className="comment-avatar"
                  />
                  <div className="comment-author-info">
                    <Link to={`/profile/${comment.author.slug}`} className="comment-author">
                      {comment.author.name}
                    </Link>
                    <span className="comment-date">{formatDate(comment.created_at)}</span>
                  </div>
                  {(comment.author_id === user?.id || isAdmin || isModerator) && (
                    <button 
                      className="btn-delete-comment"
                      onClick={() => handleDeleteComment(comment.id)}
                      title="Delete comment"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
                </div>
                <div className="comment-content">{comment.content}</div>
              </div>
            ))
          ) : (
            <div className="no-comments">
              {isMember ? translate('communities.beFirstToComment') : translate('communities.noCommentsYet')}
            </div>
          )}
        </div>
      </div>

      {/* Add Comment Form */}
      {isMember && (
        <div className="add-comment-section">
          <form onSubmit={handleAddComment} className="add-comment-form">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={translate('communities.addComment')}
              className="comment-textarea"
              rows="3"
              disabled={isSubmittingComment}
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSubmittingComment || !newComment.trim()}
            >
              {isSubmittingComment ? translate('communities.posting') : translate('communities.postComment')}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
