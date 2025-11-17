import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { Link, Navigate } from 'react-router-dom';
import ProfileHero from '../components/Profile/ProfileHero';
import BotBadge from '../components/BotBadge';
import postService from '../services/postService';
import globalChatService from '../services/globalChatService';
import './Feed.css';

// FontAwesome CDN for icons
const fontAwesome = document.createElement('link');
fontAwesome.rel = 'stylesheet';
fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
document.head.appendChild(fontAwesome);

function Feed() {
  const { user, isLoggedIn } = useUser();
  const { translate } = useLanguage();
  
  // Redirect if not logged in
  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }
  
  const [posts, setPosts] = useState([]);
  const [visiblePosts, setVisiblePosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postMenuOpen, setPostMenuOpen] = useState({});
  const [commentsOpen, setCommentsOpen] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [newPostContent, setNewPostContent] = useState('');
  const [userChatInput, setUserChatInput] = useState('');
  const [botChatInput, setBotChatInput] = useState('');
  const [chatMenuOpen, setChatMenuOpen] = useState({});
  const feedScrollRef = useRef(null);
  const POSTS_PER_LOAD = 20; // Show 20 posts initially, load more on scroll
  const [userMessages, setUserMessages] = useState([]);
  const [botMessages, setBotMessages] = useState([]);
  const [loadingGlobalChat, setLoadingGlobalChat] = useState(true);
  const [loadingBotChat, setLoadingBotChat] = useState(true);
  const globalChatRef = useRef(null);
  const botChatRef = useRef(null);

  // Update visible posts when posts change
  useEffect(() => {
    setVisiblePosts(posts.slice(0, POSTS_PER_LOAD));
  }, [posts]);

  // Handle infinite scroll
  const handleScroll = () => {
    const container = feedScrollRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    
    // Load more posts when near bottom (within 200px)
    if (scrollHeight - scrollTop - clientHeight < 200) {
      const currentLength = visiblePosts.length;
      if (currentLength < posts.length) {
        setVisiblePosts(posts.slice(0, currentLength + POSTS_PER_LOAD));
      }
    }
  };

  // Fetch posts from API
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const feedData = await postService.getFeed(1, 50); // Get first 50 posts
        
        // Transform API posts to match component format
        const transformedPosts = feedData.posts.map(post => ({
          id: post.id,
          user: {
            name: post.user.name,
            avatar: post.user.avatar,
            slug: post.user.slug,  // Include slug for profile links
          },
          content: post.content,
          timestamp: formatTimestamp(post.created_at),
          likes_count: post.likes_count,
          dislikes_count: post.dislikes_count,
          comments_count: post.comments_count,
          user_liked: post.user_liked,
          comments: [] // Comments loaded separately if needed
        }));
        
        setPosts(transformedPosts);
      } catch (error) {
        console.error('Failed to fetch posts:', error);
        // Keep using empty array on error
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchPosts();
    }
  }, [user]);

  // Fetch global chat messages
  useEffect(() => {
    const fetchGlobalMessages = async () => {
      try {
        setLoadingGlobalChat(true);
        const messages = await globalChatService.getGlobalMessages(50);
        setUserMessages(messages.map(msg => ({
          id: msg.id,
          author: msg.author_name,
          avatar: msg.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.author_name)}&background=3498db&color=fff&size=32`,
          text: msg.content,
          slug: msg.author_slug
        })));
      } catch (error) {
        console.error('Failed to fetch global chat messages:', error);
      } finally {
        setLoadingGlobalChat(false);
      }
    };

    if (user) {
      fetchGlobalMessages();
      // Poll for new messages every 10 seconds
      const interval = setInterval(fetchGlobalMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Fetch bot chat messages
  useEffect(() => {
    const fetchBotMessages = async () => {
      try {
        setLoadingBotChat(true);
        const messages = await globalChatService.getBotMessages(50);
        setBotMessages(messages.map(msg => ({
          id: msg.id,
          author: msg.author_name,
          avatar: msg.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.author_name)}&background=8b5cf6&color=fff&size=32`,
          text: msg.content,
          isBot: msg.is_bot,
          slug: msg.author_slug
        })));
      } catch (error) {
        console.error('Failed to fetch bot chat messages:', error);
      } finally {
        setLoadingBotChat(false);
      }
    };

    if (user) {
      fetchBotMessages();
      // Poll for new messages every 5 seconds (more frequent for bot chat)
      const interval = setInterval(fetchBotMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Auto-scroll chat boxes to bottom when new messages arrive
  useEffect(() => {
    if (globalChatRef.current) {
      globalChatRef.current.scrollTop = globalChatRef.current.scrollHeight;
    }
  }, [userMessages]);

  useEffect(() => {
    if (botChatRef.current) {
      botChatRef.current.scrollTop = botChatRef.current.scrollHeight;
    }
  }, [botMessages]);

  // Format timestamp to relative time
  const formatTimestamp = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return translate('feed.justNow');
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${translate('feed.minAgo')}`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? translate('feed.hourAgo') : translate('feed.hoursAgo')}`;
    }
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? translate('feed.dayAgo') : translate('feed.daysAgo')}`;
  };

  const handleLike = async (postId) => {
    try {
      const response = await postService.likePost(postId);
      // Update the post in the list with new counts
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, likes_count: response.likes_count, dislikes_count: response.dislikes_count, user_liked: response.user_liked }
          : p
      ));
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const handleDislike = async (postId) => {
    try {
      const response = await postService.dislikePost(postId);
      // Update the post in the list with new counts
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, likes_count: response.likes_count, dislikes_count: response.dislikes_count, user_liked: response.user_liked }
          : p
      ));
    } catch (error) {
      console.error('Failed to dislike post:', error);
    }
  };

  const togglePostMenu = (postId) => {
    // Close chat menus when opening post menu
    setChatMenuOpen({});
    
    // Toggle the clicked post menu
    setPostMenuOpen(prev => {
      const isCurrentlyOpen = prev[postId];
      return isCurrentlyOpen ? {} : { [postId]: true };
    });
  };

  const toggleChatMenu = (messageId) => {
    // Close post menus when opening any chat menu
    setPostMenuOpen({});
    
    // Close other chat menus and toggle the clicked one
    setChatMenuOpen(prev => {
      const isCurrentlyOpen = prev[messageId];
      // If this menu is open, close it; if closed, close all others and open this one
      return isCurrentlyOpen ? {} : { [messageId]: true };
    });
  };

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if clicking outside all menu types
      const clickedInsideMenu = event.target.closest('.feed-menu-icon') || event.target.closest('.chat-menu-icon');
      
      if (!clickedInsideMenu) {
        setPostMenuOpen({});
        setChatMenuOpen({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleComments = (postId) => {
    setCommentsOpen(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const handleCommentChange = (postId, value) => {
    setCommentInputs(prev => ({ ...prev, [postId]: value }));
  };

  const handleAddComment = (postId) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;
    const authorName = user?.name || 'You';
    const newComment = {
      id: Date.now(),
      author: authorName,
      text,
      avatar: user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=ccc&color=fff&size=32`
    };
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p));
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
  };

  const handleCreatePost = async () => {
    const content = newPostContent.trim();
    if (!content) return;
    
    if (content.length > 141) {
      alert(translate('feed.postTooLong'));
      return;
    }

    try {
      const newPost = await postService.createPost(content);
      
      // Add to beginning of posts array
      const transformedPost = {
        id: newPost.id,
        user: {
          name: newPost.user.name,
          avatar: newPost.user.avatar,
          slug: newPost.user.slug,  // Include slug for profile links
        },
        content: newPost.content,
        timestamp: translate('feed.justNow'),
        likes_count: newPost.likes_count,
        dislikes_count: newPost.dislikes_count,
        comments_count: newPost.comments_count,
        user_liked: newPost.user_liked,
        comments: []
      };
      
      setPosts(prev => [transformedPost, ...prev]);
      setNewPostContent('');
      
      // Show success feedback
      console.log(translate('feed.postCreated'));
    } catch (error) {
      console.error('Failed to create post:', error);
      alert(translate('feed.postFailed'));
    }
  };

  const handleUserChatSend = async () => {
    const text = userChatInput.trim();
    if (!text) return;
    
    try {
      const newMessage = await globalChatService.sendGlobalMessage(text);
      setUserMessages(prev => [...prev, {
        id: newMessage.id,
        author: newMessage.author_name,
        avatar: newMessage.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(newMessage.author_name)}&background=3498db&color=fff&size=32`,
        text: newMessage.content,
        slug: newMessage.author_slug
      }]);
      setUserChatInput('');
    } catch (error) {
      console.error('Failed to send global chat message:', error);
    }
  };

  const handleBotChatSend = async () => {
    const text = botChatInput.trim();
    if (!text) return;
    
    try {
      const newMessage = await globalChatService.sendBotMessage(text);
      setBotMessages(prev => [...prev, {
        id: newMessage.id,
        author: newMessage.author_name,
        avatar: newMessage.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(newMessage.author_name)}&background=3498db&color=fff&size=32`,
        text: newMessage.content,
        isBot: newMessage.is_bot,
        slug: newMessage.author_slug
      }]);
      setBotChatInput('');
      
      // Fetch updated messages to get bot response
      setTimeout(async () => {
        try {
          const messages = await globalChatService.getBotMessages(50);
          setBotMessages(messages.map(msg => ({
            id: msg.id,
            author: msg.author_name,
            avatar: msg.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.author_name)}&background=8b5cf6&color=fff&size=32`,
            text: msg.content,
            isBot: msg.is_bot,
            slug: msg.author_slug
          })));
        } catch (error) {
          console.error('Failed to fetch updated bot messages:', error);
        }
      }, 1500);
    } catch (error) {
      console.error('Failed to send bot chat message:', error);
    }
  };

  return (
    <div className="feed-layout">
      {/* Left Sidebar */}
      <aside className="feed-sidebar">
        <ProfileHero />
      </aside>
      {/* Center Feed Card */}
      <main className="feed-main">
        <div className="create-post">
          <textarea
            className="create-post-textarea"
            placeholder={translate('feed.createPostPlaceholder')}
            maxLength={141}
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            rows={4}
          />
          <button className="create-post-btn" onClick={handleCreatePost}>{translate('feed.postButton')}</button>
        </div>
        
        {loading ? (
          <div className="feed-loading" style={{textAlign: 'center', padding: '40px', color: '#666'}}>
            <p>{translate('feed.loadingPosts')}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="feed-empty" style={{textAlign: 'center', padding: '40px', color: '#666'}}>
            <p>{translate('feed.noPosts')}</p>
          </div>
        ) : (
          <div className="feed-posts-list" ref={feedScrollRef} onScroll={handleScroll}>
            {visiblePosts.map(post => (
              <div key={post.id} className="feed-card">
                <div className="feed-card-header">
                  <div className="feed-user">
                    <Link to={`/profile/${post.user.slug || post.user.id}`}>
                      <img src={post.user.avatar} alt={post.user.name} className="feed-avatar" />
                    </Link>
                    <div className="feed-user-info">
                      <Link to={`/profile/${post.user.slug || post.user.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <span className="feed-user-name">
                          {post.user.name}
                          {post.user.is_bot && <BotBadge size="small" showLabel={false} />}
                        </span>
                      </Link>
                      <span className="feed-timestamp">{post.timestamp}</span>
                    </div>
                  </div>
                  <div className="feed-menu-icon" onClick={() => togglePostMenu(post.id)}>
                    <i className="fas fa-ellipsis-h"></i>
                    {postMenuOpen[post.id] && (
                      <div className="feed-menu-dropdown">
                        <button>{translate('feed.reportPost')}</button>
                        <button>{translate('feed.blockUser')}</button>
                        <button>{translate('feed.hidePost')}</button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="feed-content">{post.content}</div>
                
                <div className="feed-actions">
                  <button 
                    className={`feed-action-btn ${post.user_liked === true ? 'active-like' : ''}`}
                    onClick={() => handleLike(post.id)}
                  >
                    <i className="fas fa-thumbs-up"></i>
                    <span>{post.likes_count || 0}</span>
                  </button>
                  <button 
                    className={`feed-action-btn ${post.user_liked === false ? 'active-dislike' : ''}`}
                    onClick={() => handleDislike(post.id)}
                  >
                    <i className="fas fa-thumbs-down"></i>
                    <span>{post.dislikes_count || 0}</span>
                  </button>
                  <button 
                    className="feed-action-btn"
                    onClick={() => toggleComments(post.id)}
                  >
                    <i className="fas fa-comment"></i>
                    <span>{post.comments_count || 0}</span>
                  </button>
                </div>
                
                {commentsOpen[post.id] && (
                  <div className="feed-comments">
                    {post.comments.length > 0 && (
                      <div className="feed-comments-list">
                        {post.comments.map(comment => {
                          const avatarUrl = comment.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author)}&background=ddd&color=333&size=32`;
                          return (
                            <div key={comment.id} className="feed-comment">
                              <img src={avatarUrl} alt={comment.author} className="feed-comment-avatar" />
                              <div className="feed-comment-body">
                                <span className="feed-comment-author">{comment.author}:</span> {comment.text}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="feed-add-comment">
                      <textarea
                        className="feed-add-textarea"
                        maxLength={500}
                        placeholder={translate('feed.writeComment')}
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => handleCommentChange(post.id, e.target.value)}
                        rows={2}
                      />
                      <button className="feed-add-btn" onClick={() => handleAddComment(post.id)}>{translate('feed.reply')}</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Right Sidebar - Chat Boxes */}
      <aside className="feed-right-sidebar">
        {/* User Chat Box */}
        <div className="chat-box">
          <div className="chat-box-header">{translate('feed.globalChat')}</div>
          <div className="chat-box-messages" ref={globalChatRef}>
            {loadingGlobalChat ? (
              <div style={{textAlign: 'center', padding: '20px', color: '#666'}}>
                <p>{translate('feed.loadingMessages')}</p>
              </div>
            ) : userMessages.length === 0 ? (
              <div style={{textAlign: 'center', padding: '20px', color: '#666'}}>
                <p>{translate('feed.noMessages')}</p>
              </div>
            ) : (
              userMessages.map(msg => (
                <div key={msg.id} className="chat-message">
                  <Link to={`/profile/${msg.slug}`}>
                    <img src={msg.avatar} alt={msg.author} className="chat-message-avatar" />
                  </Link>
                  <div className="chat-message-content">
                    <div className="chat-message-header">
                      <Link to={`/profile/${msg.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="chat-message-author">{msg.author}</div>
                      </Link>
                      <div className="feed-menu-icon chat-menu-icon" onClick={() => toggleChatMenu(`user-${msg.id}`)}>
                        <i className="fas fa-ellipsis-h"></i>
                        {chatMenuOpen[`user-${msg.id}`] && (
                          <div className="feed-menu-dropdown">
                            <button>{translate('feed.reportMessage')}</button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="chat-message-text">{msg.text}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="chat-box-input">
            <textarea
              placeholder={translate('feed.typeMessage')}
              maxLength={141}
              value={userChatInput}
              onChange={(e) => setUserChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleUserChatSend())}
              rows={1}
            />
            <button onClick={handleUserChatSend}>{translate('feed.send')}</button>
          </div>
        </div>

        {/* Bot Chat Box */}
        <div className="chat-box">
          <div className="chat-box-header">{translate('feed.botChat')}</div>
          <div className="chat-box-messages" ref={botChatRef}>
            {loadingBotChat ? (
              <div style={{textAlign: 'center', padding: '20px', color: '#666'}}>
                <p>{translate('feed.loadingMessages')}</p>
              </div>
            ) : botMessages.length === 0 ? (
              <div style={{textAlign: 'center', padding: '20px', color: '#666'}}>
                <p>{translate('feed.noMessages')}</p>
              </div>
            ) : (
              botMessages.map(msg => (
                <div key={msg.id} className="chat-message">
                  <Link to={`/profile/${msg.slug}`}>
                    <img src={msg.avatar} alt={msg.author} className="chat-message-avatar" />
                  </Link>
                  <div className="chat-message-content">
                    <div className="chat-message-header">
                      <Link to={`/profile/${msg.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="chat-message-author">
                          {msg.author}
                          {msg.isBot && <BotBadge size="small" showLabel={false} />}
                        </div>
                      </Link>
                      <div className="feed-menu-icon chat-menu-icon" onClick={() => toggleChatMenu(`bot-${msg.id}`)}>
                        <i className="fas fa-ellipsis-h"></i>
                        {chatMenuOpen[`bot-${msg.id}`] && (
                          <div className="feed-menu-dropdown">
                            <button>{translate('feed.reportMessage')}</button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="chat-message-text">{msg.text}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="chat-box-input">
            <textarea
              placeholder={translate('feed.askBots')}
              maxLength="141"
              value={botChatInput}
              onChange={(e) => setBotChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleBotChatSend())}
              rows={1}
            />
            <button onClick={handleBotChatSend}>{translate('feed.send')}</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default Feed;