import React, { useState, useRef, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useUser } from '../../../context/UserContext'
import { useWebSocket } from '../../../context/WebSocketContext'
import { useLanguage } from '../../../context/LanguageContext'
import ProfileHero from '../../../components/Profile/ProfileHero'
import messageService from '../../../services/messageService'
import './DirectMessages.css'

export default function DirectMessages() {
  const { conversationId } = useParams()
  const navigate = useNavigate()
  const { user } = useUser()
  const { translate } = useLanguage()
  const { registerHandler, sendMessage: wsSendMessage, sendTyping, markAsRead, isUserOnline } = useWebSocket()
  const [messageInput, setMessageInput] = useState('')
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Load conversation and messages from API
  useEffect(() => {
    const loadConversation = async () => {
      if (!conversationId) return

      try {
        setLoading(true)
        setError(null)

        // Load conversation details
        const convData = await messageService.getConversation(conversationId)
        setConversation(convData)

        // Load messages
        const messagesData = await messageService.getMessages(conversationId, 1, 50)
        setMessages(messagesData.messages || [])

        // Mark as read
        await messageService.markAsRead(conversationId)
      } catch (err) {
        console.error('Error loading conversation:', err)
        setError('Failed to load conversation')
        // Mock fallback data
        setConversation({
          id: parseInt(conversationId),
          name: 'Alice Johnson',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop',
          type: 'direct',
          participants: [
            { user: { id: user?.id, name: user?.name, avatar: user?.avatar } },
            { user: { id: 2, name: 'Alice Johnson', slug: 'alice-johnson', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop' } }
          ]
        })
        setMessages([
          { id: 1, sender_id: 2, sender: { name: 'Alice Johnson', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop' }, content: 'Hey! How are you doing?', created_at: new Date(Date.now() - 3600000).toISOString() },
          { id: 2, sender_id: user?.id || 1, sender: { name: user?.name, avatar: user?.avatar }, content: 'I\'m good, thanks! How about you?', created_at: new Date(Date.now() - 3500000).toISOString() },
        ])
      } finally {
        setLoading(false)
      }
    }

    loadConversation()
  }, [conversationId, user])

  // Listen for real-time messages
  useEffect(() => {
    if (!conversation) return

    const cleanup = registerHandler(`dm-${conversationId}`, 'message', (message) => {
      if (message.conversation_id === parseInt(conversationId)) {
        setMessages(prev => [...prev, message])
        
        // Mark as read if not from current user
        if (message.sender_id !== user?.id) {
          markAsRead(parseInt(conversationId))
        }
      }
    })

    return cleanup
  }, [conversationId, conversation, registerHandler, user, markAsRead])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const handleInputChange = (e) => {
    setMessageInput(e.target.value)
    
    // Send typing indicator
    if (!isTyping) {
      setIsTyping(true)
      sendTyping(parseInt(conversationId), true)
    }
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      sendTyping(parseInt(conversationId), false)
    }, 2000)
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!messageInput.trim() || !conversation) return

    const content = messageInput.trim()
    setMessageInput('')
    
    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false)
      sendTyping(parseInt(conversationId), false)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }

    try {
      // Send via WebSocket for real-time delivery
      const sent = wsSendMessage(parseInt(conversationId), content)
      
      // Also send via REST API as fallback
      if (!sent) {
        const message = await messageService.sendMessage(conversationId, content)
        setMessages(prev => [...prev, message])
      }
    } catch (err) {
      console.error('Error sending message:', err)
      // Optimistic UI - add message anyway
      const optimisticMessage = {
        id: Date.now(),
        sender_id: user?.id,
        sender: { name: user?.name, avatar: user?.avatar },
        content,
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, optimisticMessage])
    }
  }

  // Get recipient info (the other participant)
  const getRecipient = () => {
    if (!conversation || !conversation.participants) return null
    
    return conversation.participants.find(p => p.user.id !== user?.id)?.user || null
  }

  const recipient = getRecipient()

  if (loading) {
    return (
      <main className="dm-page page">
        <div className="dm-container">
          <aside className="profile-sidebar">
            <ProfileHero />
          </aside>
          <section className="dm-main">
            <div className="dm-loading">{translate('messages.loading')}</div>
          </section>
        </div>
      </main>
    )
  }

  if (error && !conversation) {
    return (
      <main className="dm-page page">
        <div className="dm-container">
          <aside className="profile-sidebar">
            <ProfileHero />
          </aside>
          <section className="dm-main">
            <div className="dm-error">{error}</div>
          </section>
        </div>
      </main>
    )
  }

  if (!conversation || !recipient) {
    return (
      <main className="dm-page page">
        <div className="dm-container">
          <aside className="profile-sidebar">
            <ProfileHero />
          </aside>
          <section className="dm-main">
            <div className="dm-error">Conversation not found</div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="dm-page page">
      <div className="dm-container">
        <aside className="profile-sidebar">
          <ProfileHero />
        </aside>

        <section className="dm-main">
          {/* Header with recipient info */}
          <div className="dm-header">
            <Link to="/messages" className="dm-back-btn">
              <i className="fas fa-arrow-left"></i>
            </Link>
            <Link to={`/profile/${recipient.slug}`} className="dm-recipient-info">
              <img src={recipient.avatar || 'https://via.placeholder.com/80'} alt={recipient.name} className="dm-recipient-avatar" />
              <div className="dm-recipient-details">
                <h3 className="dm-recipient-name">{recipient.name}</h3>
                <span className={`dm-recipient-status ${isUserOnline(recipient.id) ? 'online' : 'offline'}`}>
                  {isUserOnline(recipient.id) ? 'online' : 'offline'}
                </span>
              </div>
            </Link>
            <div className="dm-header-actions">
              <button className="dm-action-btn" title="More Options">
                <i className="fas fa-ellipsis-v"></i>
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="dm-messages-area">
            {messages.map((msg) => {
              const isOwn = msg.sender_id === user?.id
              return (
                <div key={msg.id} className={`dm-message ${isOwn ? 'dm-message-own' : 'dm-message-other'}`}>
                  {!isOwn && (
                    <img src={msg.sender?.avatar || recipient.avatar || 'https://via.placeholder.com/40'} alt="" className="dm-message-avatar" />
                  )}
                  <div className="dm-message-content">
                    <div className="dm-message-bubble">
                      {msg.content}
                    </div>
                    <span className="dm-message-time">{formatMessageTime(msg.created_at)}</span>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <form className="dm-input-area" onSubmit={handleSendMessage}>
            <button type="button" className="dm-attach-btn" title="Attach File">
              <i className="fas fa-paperclip"></i>
            </button>
            <input
              type="text"
              className="dm-input"
              placeholder={translate('messages.typeMessage') || 'Type a message...'}
              value={messageInput}
              onChange={handleInputChange}
            />
            <button type="button" className="dm-emoji-btn" title="Emoji">
              <i className="fas fa-smile"></i>
            </button>
            <button type="submit" className="dm-send-btn" disabled={!messageInput.trim()}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}
