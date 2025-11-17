import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../../context/UserContext';
import { useWebSocket } from '../../../context/WebSocketContext';
import { useLanguage } from '../../../context/LanguageContext';
import ProfileHero from '../../../components/Profile/ProfileHero';
import messageService from '../../../services/messageService';
import './GroupChat.css';
import { FaUserPlus, FaSignOutAlt } from 'react-icons/fa';

function GroupChat() {
  const { groupId } = useParams();
  const { user } = useUser();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { registerHandler, sendMessage: wsSendMessage, sendTyping, markAsRead, isUserOnline } = useWebSocket();
  const [messageInput, setMessageInput] = useState('');
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const menuRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Load conversation and messages from API
  useEffect(() => {
    const loadConversation = async () => {
      if (!groupId) return;

      try {
        setLoading(true);
        setError(null);

        // Load conversation details
        const convData = await messageService.getConversation(groupId);
        setConversation(convData);

        // Load messages
        const messagesData = await messageService.getMessages(groupId, 1, 50);
        setMessages(messagesData.messages || []);

        // Mark as read
        await messageService.markAsRead(groupId);
      } catch (err) {
        console.error('Error loading group conversation:', err);
        setError(err.message || 'Failed to load conversation');
        
        // Mock fallback for development
        setConversation({
          id: groupId,
          name: 'Weekend Trip Planning',
          avatar: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=100&h=100&fit=crop',
          type: 'group',
          participants: [
            {
              id: 1,
              user: {
                id: 1,
                name: 'Alice Johnson',
                slug: 'alice-johnson',
                avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&h=50&fit=crop'
              }
            },
            {
              id: 2,
              user: {
                id: 2,
                name: 'Bob Smith',
                slug: 'bob-smith',
                avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=50&h=50&fit=crop'
              }
            }
          ]
        });
        setMessages([
          {
            id: 1,
            sender_id: 1,
            sender: {
              name: 'Alice Johnson',
              avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&h=50&fit=crop'
            },
            content: 'Hey everyone! Are we still on for the camping trip?',
            created_at: new Date(Date.now() - 3600000).toISOString()
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [groupId]);

  // Register WebSocket handler for real-time messages
  useEffect(() => {
    if (!groupId) return;

    const cleanup = registerHandler(`gc-${groupId}`, 'message', (message) => {
      if (message.conversation_id === parseInt(groupId)) {
        setMessages(prev => [...prev, message]);
        
        // Mark as read if message is from someone else
        if (message.sender_id !== user?.id) {
          messageService.markAsRead(groupId).catch(console.error);
        }
      }
    });

    return cleanup;
  }, [groupId, registerHandler, user?.id]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowGroupMenu(false);
      }
    };

    if (showGroupMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showGroupMenu]);

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessageInput(value);

    // Send typing indicator
    if (value && !isTyping) {
      setIsTyping(true);
      sendTyping(groupId, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTyping(groupId, false);
    }, 2000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const content = messageInput;
    setMessageInput('');

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      sendTyping(groupId, false);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      // Try WebSocket first
      const sent = await wsSendMessage(groupId, content);
      
      // Fallback to REST API if WebSocket fails
      if (!sent) {
        await messageService.sendMessage(groupId, content);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Optimistic UI - add message anyway
      const newMessage = {
        id: Date.now(),
        sender_id: user?.id,
        sender: {
          name: user?.name,
          avatar: user?.avatar
        },
        content,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, newMessage]);
    }
  };

  const handleInviteMembers = () => {
    setShowGroupMenu(false);
    // Navigate to invite members page or open modal
    navigate(`/messages/group/${groupId}/invite`);
  };

  const handleLeaveGroup = async () => {
    if (window.confirm('Are you sure you want to leave this group?')) {
      setShowGroupMenu(false);
      try {
        await messageService.leaveConversation(groupId, user?.id);
        navigate('/messages');
      } catch (error) {
        console.error('Error leaving group:', error);
        alert('Failed to leave group. Please try again.');
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <main className="gc-page page">
        <div className="gc-container">
          <aside className="profile-sidebar">
            <ProfileHero />
          </aside>
          <section className="gc-main">
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <p>{translate('messages.loading')}</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  // Error state
  if (error && !conversation) {
    return (
      <main className="gc-page page">
        <div className="gc-container">
          <aside className="profile-sidebar">
            <ProfileHero />
          </aside>
          <section className="gc-main">
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ color: '#e74c3c' }}>Error: {error}</p>
              <button onClick={() => navigate('/messages')}>Back to Messages</button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  // Not found state
  if (!conversation) {
    return (
      <main className="gc-page page">
        <div className="gc-container">
          <aside className="profile-sidebar">
            <ProfileHero />
          </aside>
          <section className="gc-main">
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <p>Group conversation not found</p>
              <button onClick={() => navigate('/messages')}>Back to Messages</button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="gc-page page">
      <div className="gc-container">
        <aside className="profile-sidebar">
          <ProfileHero />
        </aside>
        
        <section className="gc-main">
        {/* Header */}
        <div className="gc-header">
          <Link to="/messages" className="gc-back-button">
            <i className="fas fa-arrow-left"></i>
          </Link>
          
          <div className="gc-group-info">
            <img src={conversation.avatar || 'https://via.placeholder.com/80'} alt={conversation.name} className="gc-group-avatar" />
            <div className="gc-group-details">
              <h3 className="gc-group-name">{conversation.name}</h3>
              <div className="gc-participants-bar">
                {conversation.participants?.map((participant, index) => (
                  <React.Fragment key={participant.user.id}>
                    {index > 0 && <span className="gc-participant-separator">, </span>}
                    <Link 
                      to={`/profile/${participant.user.slug}`}
                      className="gc-participant"
                      title={participant.user.name}
                    >
                      <span className={`gc-participant-status-dot ${isUserOnline(participant.user.id) ? 'online' : 'offline'}`}></span>
                      <span className="gc-participant-name">{participant.user.name.split(' ')[0]}</span>
                    </Link>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className="gc-group-menu" ref={menuRef}>
            <button 
              className="gc-group-menu-button" 
              onClick={() => setShowGroupMenu(!showGroupMenu)}
              title="Group options"
            >
              <i className="fas fa-ellipsis-v"></i>
            </button>
            {showGroupMenu && (
              <div className="gc-group-menu-dropdown">
                <button className="gc-menu-item" onClick={handleInviteMembers}>
                  <FaUserPlus />
                  <span>Invite Members</span>
                </button>
                <button className="gc-menu-item gc-menu-item-danger" onClick={handleLeaveGroup}>
                  <FaSignOutAlt />
                  <span>Leave Group</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="gc-messages-area">
          {messages.map((message) => {
            const isOwn = message.sender_id === user?.id;
            return (
              <div key={message.id} className={`gc-message ${isOwn ? 'own' : 'other'}`}>
                {!isOwn && (
                  <img 
                    src={message.sender?.avatar || 'https://via.placeholder.com/40'} 
                    alt={message.sender?.name} 
                    className="gc-message-avatar"
                  />
                )}
                <div className="gc-message-content">
                  {!isOwn && (
                    <span className="gc-message-sender">{message.sender?.name}</span>
                  )}
                  <div className="gc-message-bubble">
                    {message.content}
                  </div>
                  <span className="gc-message-time">{formatMessageTime(message.created_at)}</span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form className="gc-input-area" onSubmit={handleSendMessage}>
          <button type="button" className="gc-input-button" title="Attach File">
            <i className="fas fa-paperclip"></i>
          </button>
          <input
            type="text"
            className="gc-message-input"
            placeholder={translate('messages.typeMessage')}
            value={messageInput}
            onChange={handleInputChange}
          />
          <button type="button" className="gc-input-button" title="Add Emoji">
            <i className="fas fa-smile"></i>
          </button>
          <button type="submit" className="gc-send-button" title="Send Message">
            <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      </section>
    </div>
    </main>
  );
}

export default GroupChat;