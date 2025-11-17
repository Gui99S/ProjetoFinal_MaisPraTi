import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../../../context/UserContext'
import { useWebSocket } from '../../../context/WebSocketContext'
import ProfileHero from '../../../components/Profile/ProfileHero'
import { useLanguage } from '../../../context/LanguageContext'
import messageService from '../../../services/messageService'
import './MsgHub.css'

export default function MsgHub() {
  const { user } = useUser()
  const { translate } = useLanguage()
  const { messages: realtimeMessages, registerHandler } = useWebSocket()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const profile = {
    name: user?.name || 'Random',
    avatar: user?.avatar || 'https://picsum.photos/300/400?random=12',
    joined: user?.joinDate || new Date().toLocaleDateString()
  }

  // Load conversations from API
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await messageService.getConversations(1, 50)
        
        console.log('[MSGHUB] Raw conversations from API:', data.conversations)
        
        // Filter out Global Chat and Bot Chat (these should only appear in Feed page)
        const filteredConversations = (data.conversations || []).filter(conv => {
          const name = conv.name?.toLowerCase() || ''
          // Exclude conversations that look like global/bot chats
          return !name.includes('global chat') && 
                 !name.includes('bot chat') && 
                 !name.includes('global') && 
                 conv.type !== 'global' && 
                 conv.type !== 'bot'
        })
        
        console.log('[MSGHUB] Filtered conversations:', filteredConversations)
        console.log('[MSGHUB] Current user:', user)
        
        setConversations(filteredConversations)
      } catch (err) {
        console.error('Error loading conversations:', err)
        setError('Failed to load conversations')
        // Use mock data on error
        setConversations([
          { id: 1, name: 'Alice Johnson', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop', last_message: { content: 'Hey — are we still on for tomorrow?' }, updated_at: new Date(Date.now() - 3600000).toISOString(), type: 'direct', unread_count: 0 },
          { id: 2, name: 'Bob Williams', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=80&h=80&fit=crop', last_message: { content: 'Sent the docs, check your email' }, updated_at: new Date(Date.now() - 10800000).toISOString(), type: 'direct', unread_count: 2 },
          { id: 3, name: 'Weekend Trip Planning', avatar: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=80&h=80&fit=crop', last_message: { content: 'I\'ll bring ingredients for s\'mores 🔥', sender: { name: 'Carol' } }, updated_at: new Date(Date.now() - 18000000).toISOString(), type: 'group', unread_count: 5 }
        ])
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadConversations()
    }
  }, [user])

  // Listen for real-time message updates
  useEffect(() => {
    const cleanup = registerHandler('msghub', 'message', (message) => {
      // Update conversation's last message
      setConversations(prev => prev.map(conv => {
        if (conv.id === message.conversation_id) {
          return {
            ...conv,
            last_message: message,
            updated_at: message.created_at,
            unread_count: message.sender_id !== user?.id ? (conv.unread_count || 0) + 1 : 0
          }
        }
        return conv
      }))
    })

    return cleanup
  }, [registerHandler, user])

  // Get display name for conversation
  const getConversationName = (conv) => {
    // For group chats, use the group name
    if (conv.type === 'group') {
      return conv.name || 'Group Chat'
    }
    
    // For direct messages, we need to extract the OTHER user's name
    // The backend should be returning just the other user's name in conv.name
    // But if it contains " & " it means both names are in there, so we need to extract
    if (conv.name?.includes(' & ')) {
      const currentUserName = user?.name
      const names = conv.name.split(' & ')
      
      // Find the name that's NOT the current user
      const otherName = names.find(n => n.trim() !== currentUserName)
      return otherName || conv.name
    }
    
    // If participants array is available, use it
    if (conv.participants && conv.participants.length > 0) {
      const otherParticipant = conv.participants.find(p => p.user_id !== user?.id)
      if (otherParticipant?.user?.name) {
        return otherParticipant.user.name
      }
    }
    
    // Fallback to conv.name
    return conv.name || 'Unknown User'
  }

  // Get avatar for conversation
  const getConversationAvatar = (conv) => {
    // For group chats, use group avatar
    if (conv.type === 'group') {
      return conv.avatar || 'https://via.placeholder.com/80'
    }
    
    // For direct messages, get the OTHER user's avatar
    if (conv.participants && conv.participants.length > 0) {
      const otherParticipant = conv.participants.find(p => p.user_id !== user?.id)
      if (otherParticipant?.user?.avatar) {
        return otherParticipant.user.avatar
      }
    }
    
    // Fallback
    return conv.avatar || 'https://via.placeholder.com/80'
  }

  // Format time ago with translations
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return ''
    
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)
      const diffWeeks = Math.floor(diffMs / 604800000)
      const diffMonths = Math.floor(diffMs / 2592000000)
      const diffYears = Math.floor(diffMs / 31536000000)

      if (diffMins < 1) return translate('time.justNow')
      if (diffMins === 1) return `1 ${translate('time.minuteAgo')}`
      if (diffMins < 60) return `${diffMins} ${translate('time.minutesAgo')}`
      if (diffHours === 1) return `1 ${translate('time.hourAgo')}`
      if (diffHours < 24) return `${diffHours} ${translate('time.hoursAgo')}`
      if (diffDays === 1) return `1 ${translate('time.dayAgo')}`
      if (diffDays < 7) return `${diffDays} ${translate('time.daysAgo')}`
      if (diffWeeks === 1) return `1 ${translate('time.weekAgo')}`
      if (diffWeeks < 4) return `${diffWeeks} ${translate('time.weeksAgo')}`
      if (diffMonths === 1) return `1 ${translate('time.monthAgo')}`
      if (diffMonths < 12) return `${diffMonths} ${translate('time.monthsAgo')}`
      if (diffYears === 1) return `1 ${translate('time.yearAgo')}`
      return `${diffYears} ${translate('time.yearsAgo')}`
    } catch (error) {
      console.error('[MSGHUB] Error formatting time:', error)
      return ''
    }
  }

  // Format last message text
  const formatLastMessage = (conv) => {
    if (!conv.last_message) return translate('messages.noMessages')
    
    const content = conv.last_message.content || ''
    const sender = conv.last_message.sender
    const senderName = sender?.name || ''
    const senderId = conv.last_message.sender_id
    
    console.log('[MSGHUB] Formatting message for conv:', conv.id, 'sender:', sender, 'current user:', user?.id)
    
    // For direct messages, show sender name if it's not the current user
    if (conv.type === 'direct') {
      if (senderId !== user?.id && senderName) {
        return `${senderName}: ${content}`
      }
      return content
    }
    
    // For group messages, always show sender name if not current user
    if (conv.type === 'group' && senderName && senderId !== user?.id) {
      return `${senderName}: ${content}`
    }
    
    return content
  }

  // Sort conversations by most recent message activity
  const threads = [...conversations].sort((a, b) => {
    // Get the timestamp of the most recent message for each conversation
    // Priority: last_message.created_at > updated_at > created_at
    const getLatestTimestamp = (conv) => {
      if (conv.last_message?.created_at) {
        return conv.last_message.created_at
      }
      if (conv.updated_at) {
        return conv.updated_at
      }
      return conv.created_at || 0
    }
    
    const timestampA = getLatestTimestamp(a)
    const timestampB = getLatestTimestamp(b)
    
    // Convert to timestamps for comparison
    const timeA = new Date(timestampA).getTime()
    const timeB = new Date(timestampB).getTime()
    
    // Sort descending (most recent message first)
    return timeB - timeA
  })

  return (
    <main className="msghub-page page">
      <div className="msghub-container">
        <aside className="profile-sidebar">
          <ProfileHero profile={profile} />
        </aside>

        <section className="msghub-main">
          <div className="msghub-header">
            <h2>{translate('messages.hub')}</h2>
            <div className="msghub-actions">
              <Link to="/messages/new" className="btn">{translate('messages.newConversation')}</Link>
              <Link to="/messages/group/new" className="btn btn-secondary">{translate('messages.newGroup')}</Link>
            </div>
          </div>

          {loading ? (
            <div className="msghub-loading">{translate('messages.loadingConversations')}</div>
          ) : error && threads.length === 0 ? (
            <div className="msghub-error">{error}</div>
          ) : threads.length === 0 ? (
            <div className="msghub-empty">
              <p>{translate('messages.noConversations')}</p>
              <p>{translate('messages.startConversation')}</p>
            </div>
          ) : (
            <div className="threads-list">
              {threads.map(conv => {
                const linkPath = conv.type === 'group' 
                  ? `/messages/group/${conv.id}` 
                  : `/messages/${conv.id}`
                
                const displayName = getConversationName(conv)
                const displayAvatar = getConversationAvatar(conv)
                
                // Use last_message.created_at as the primary timestamp (most accurate)
                // This should match the sorting logic
                const timestamp = conv.last_message?.created_at || conv.updated_at || conv.created_at
                const timeAgo = formatTimeAgo(timestamp)
                
                console.log('[MSGHUB] Time for', displayName, ':', {
                  last_msg_time: conv.last_message?.created_at,
                  updated_at: conv.updated_at,
                  created_at: conv.created_at,
                  using: timestamp,
                  formatted: timeAgo
                })
                
                return (
                  <Link to={linkPath} className="thread-card" key={conv.id}>
                    <img src={displayAvatar} alt={displayName} className="thread-avatar" />
                    <div className="thread-body">
                      <div className="thread-top">
                        <span className="thread-name">{displayName}</span>
                        <span className="thread-time">{timeAgo}</span>
                      </div>
                      <div className="thread-last">
                        {formatLastMessage(conv)}
                        {conv.unread_count > 0 && (
                          <span className="thread-unread">{conv.unread_count}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
