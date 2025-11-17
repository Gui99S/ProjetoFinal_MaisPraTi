import React from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import './ThreadList.css'

export default function ThreadList({ threads, communityId, loading, onNewThread, isMember }) {
  const { translate } = useLanguage()
  
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString()
  }

  if (loading) {
    return <div className="threads-loading">{translate('communities.loadingThreads')}</div>
  }

  return (
    <div className="thread-list-container">
      <div className="thread-list-header">
        <h3>{translate('communities.communityThreads')}</h3>
        {isMember && (
          <button className="btn btn-primary" onClick={onNewThread}>
            <i className="fas fa-plus"></i> {translate('communities.newThread')}
          </button>
        )}
      </div>

      {threads.length === 0 ? (
        <div className="no-threads">
          <p>{translate('communities.noThreadsYet')}</p>
          {isMember && <p>{translate('communities.beFirstToDiscuss')}</p>}
        </div>
      ) : (
        <div className="threads-list">
          {threads.map(thread => {
            // Extract title from content (first line)
            const contentLines = thread.content.split('\n')
            const threadTitle = contentLines[0] || 'Untitled'
            
            return (
              <Link 
                to={`/communities/${communityId}/thread/${thread.id}`} 
                className="thread-card" 
                key={thread.id}
              >
                <div className="thread-body">
                  <div className="thread-top">
                    <span className="thread-title">{threadTitle}</span>
                    <span className="thread-time">{formatTimeAgo(thread.created_at)}</span>
                  </div>
                  <div className="thread-meta">
                    <span className="thread-author">{translate('communities.by')} {thread.author.name}</span>
                    <div className="thread-stats">
                      <span className="stat-item">
                        <i className="fas fa-thumbs-up"></i> {thread.like_count || 0}
                      </span>
                      <span className="stat-item">
                        <i className="fas fa-comment"></i> {thread.comment_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
