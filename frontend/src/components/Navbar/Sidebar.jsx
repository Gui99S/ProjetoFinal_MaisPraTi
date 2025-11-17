import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useUser } from '../../context/UserContext';
import DarkModeToggle from '../Buttons/DarkModeToggle/DarkModeToggle';
import './Sidebar.css';

function Sidebar({ isOpen, onClose }) {
  const { translate, changeLanguage, currentLanguage, availableLanguages } = useLanguage();
  const { theme } = useTheme();
  const { user, isLoggedIn, logout } = useUser();
  const navigate = useNavigate();
  
  const handleLinkClick = () => {
    onClose();
  };

  const handleLanguageChange = (e) => {
    changeLanguage(e.target.value);
  };

  const handleLogout = () => {
    // perform logout and close the sidebar, then navigate to home
    logout();
    onClose();
    navigate('/');
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h2 className="sidebar-title">{translate('sidebar.title')}</h2>
      </div>

      <nav className="sidebar-nav">
        {/* User Account Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">{translate('sidebar.user')}</div>
          {isLoggedIn ? (
            <div className="user-profile">
              <div className="user-info">
                <img 
                  src={user.avatar} 
                  alt={user.name}
                  className="user-avatar"
                />
                <div className="user-details">
                  <div className="user-name-container">
                    <Link 
                      to="/profile" 
                      className="user-name-link"
                      onClick={handleLinkClick}
                      title="View Public Profile"
                    >
                      <span className="user-name">{user.name}</span>
                    </Link>
                    <Link 
                      to="/profile/settings" 
                      className="edit-profile-icon"
                      onClick={handleLinkClick}
                      title="Profile Settings"
                    >
                      ⚙️
                    </Link>
                  </div>
                  <span className="user-email">{user.email}</span>
                </div>
              </div>
              <button 
                className="logout-btn"
                onClick={handleLogout}
                title={translate('sidebar.logout')}
              >
                🚪 {translate('sidebar.logout')}
              </button>
            </div>
          ) : (
            <div className="auth-links">
              <div className="auth-prompt">
                <span>{translate('sidebar.loginToAccount')}</span>
              </div>
              <Link 
                to="/" 
                className="sidebar-auth-link login-link"
                onClick={handleLinkClick}
              >
                🔐 {translate('nav.login')}
              </Link>
            </div>
          )}
        </div>

        {/* Theme Settings */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">{translate('sidebar.theme')}</div>
          <div className="sidebar-setting">
            <span>{theme === 'dark' ? translate('sidebar.darkMode') : translate('sidebar.lightMode')}</span>
            <DarkModeToggle />
          </div>
        </div>

        {/* Navigation Links - Only visible on mobile */}
        <div className="sidebar-section sidebar-navigation-mobile">
          <div className="sidebar-section-title">{translate('sidebar.navigation')}</div>
          {isLoggedIn ? (
              <NavLink to="/feed" className={({isActive}) => isActive ? 'sidebar-link active' : 'sidebar-link'}>{translate('nav.home')}</NavLink>
            ) : (
              <NavLink to="/" end className={({isActive}) => isActive ? 'sidebar-link active' : 'sidebar-link'}>{translate('nav.home')}</NavLink>
            )}
            {isLoggedIn && (
              <NavLink to="/communities" className={({isActive}) => isActive ? 'sidebar-link active' : 'sidebar-link'}>{translate('nav.communities')}</NavLink>
            )}
            {isLoggedIn && (
              <NavLink to="/marketplace" className={({isActive}) => isActive ? 'sidebar-link active' : 'sidebar-link'}>{translate('nav.marketplace')}</NavLink>
            )}
            <NavLink to="/about" className={({isActive}) => isActive ? 'sidebar-link active' : 'sidebar-link'}>{translate('nav.about')}</NavLink>
        </div>

        {/* Configuration Options */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">{translate('sidebar.configurations')}</div>
          <div className="sidebar-setting">
            <span>{translate('sidebar.language')}</span>
            <select 
              className="sidebar-select"
              value={currentLanguage}
              onChange={handleLanguageChange}
            >
              {availableLanguages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </nav>
    </div>
  );
}

export default Sidebar;