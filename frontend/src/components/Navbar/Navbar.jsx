import { useState, useEffect, useRef } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useUser } from '../../context/UserContext';
import { useTheme } from '../../context/ThemeContext';
import Sidebar from './Sidebar';
import DarkModeToggle from '../Buttons/DarkModeToggle/DarkModeToggle';
import notificationService from '../../services/notificationService';
import './Navbar.css';

function Navbar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { translate } = useLanguage();
  const { isLoggedIn, user } = useUser();
  const { theme } = useTheme();
  const notificationRef = useRef(null);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Fetch notifications on mount and periodically
  useEffect(() => {
    if (isLoggedIn) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  // Fetch notifications when dropdown opens
  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getNotifications(0, 10, false);
      setNotifications(data.notifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  // Toggle notification dropdown
  const toggleNotifications = () => {
    if (!notificationsOpen) {
      fetchNotifications();
    }
    setNotificationsOpen(!notificationsOpen);
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format timestamp
  const formatTimestamp = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Get link for notification
  const getNotificationLink = (notification) => {
    switch (notification.type) {
      case 'like':
      case 'comment':
        return `/feed`; // Could be more specific with post ID
      case 'friend_request':
      case 'friend_accept':
        return `/friends`;
      case 'message':
        return `/messages`;
      default:
        return '/';
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-container">
          {/* Hamburger Menu - Left Side */}
          <button 
            className={`hamburger ${isSidebarOpen ? 'hamburger-active' : ''}`}
            onClick={toggleSidebar}
            aria-label="Toggle settings menu"
            title="Settings & More"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>

          {/* User Info & Notifications - After Hamburger (only when logged in and sidebar closed) */}
          {isLoggedIn && !isSidebarOpen && (
            <div className="user-notification-section">
              {/* User Info */}
              <Link to="/profile" className="user-info">
                <img 
                  src={user?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'User')} 
                  alt={user?.name} 
                  className="user-avatar-small"
                />
                <span className="user-name-small">{user?.name}</span>
              </Link>

              {/* Notification Bell */}
              <div className="notification-bell-container" ref={notificationRef}>
                <button 
                  className="notification-bell" 
                  onClick={toggleNotifications}
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <i className="fas fa-bell"></i>
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {notificationsOpen && (
                  <div className="notification-dropdown">
                    <div className="notification-header">
                      <h4>{translate('notifications.title')}</h4>
                      {unreadCount > 0 && (
                        <button 
                          className="mark-all-read-btn" 
                          onClick={handleMarkAllAsRead}
                        >
                          {translate('notifications.markAllRead')}
                        </button>
                      )}
                    </div>

                    <div className="notification-list">
                      {notifications.length === 0 ? (
                        <div className="no-notifications">
                          <i className="fas fa-bell-slash"></i>
                          <p>{translate('notifications.noNotifications')}</p>
                        </div>
                      ) : (
                        notifications.map(notification => (
                          <Link
                            key={notification.id}
                            to={getNotificationLink(notification)}
                            className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                            onClick={() => {
                              if (!notification.is_read) {
                                handleMarkAsRead(notification.id);
                              }
                              setNotificationsOpen(false);
                            }}
                          >
                            {notification.actor && (
                              <img 
                                src={notification.actor.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(notification.actor.name)} 
                                alt={notification.actor.name}
                                className="notification-avatar"
                              />
                            )}
                            <div className="notification-content">
                              <p className="notification-title">{notification.title}</p>
                              {notification.message && (
                                <p className="notification-message">{notification.message}</p>
                              )}
                              <span className="notification-time">{formatTimestamp(notification.created_at)}</span>
                            </div>
                            {!notification.is_read && <span className="unread-dot"></span>}
                          </Link>
                        ))
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="notification-footer">
                        <Link to="/notifications" onClick={() => setNotificationsOpen(false)}>
                          {translate('notifications.viewAll')}
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Desktop Navigation - Center */}
          <div className="desktop-menu">
            {isLoggedIn ? (
              <NavLink to="/feed" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>{translate('nav.home')}</NavLink>
            ) : (
              <NavLink to="/" end className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>{translate('nav.home')}</NavLink>
            )}
            {isLoggedIn && (
              <NavLink to="/communities" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>{translate('nav.communities')}</NavLink>
            )}
            {isLoggedIn && (
              <NavLink to="/marketplace" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>{translate('nav.marketplace')}</NavLink>
            )}
            <NavLink to="/about" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>{translate('nav.about')}</NavLink>
          </div>

          {/* Dark Mode Toggle and Logo - Right Side */}
          <div className="right-section">
            <DarkModeToggle />
            <Link to="/" className="logo-text">
              Soc<span style={{ color: 'var(--btn-primary)' }}>ia</span>l Tr<span style={{ color: 'var(--btn-primary)' }}>ia</span>l
            </Link>
          </div>
        </div>
      </nav>

      {/* Sidebar for mobile */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={closeSidebar} 
      />

      {/* Overlay */}
      {isSidebarOpen && (
        <div 
          className="overlay" 
          onClick={closeSidebar}
        ></div>
      )}
    </>
  );
}

export default Navbar;