import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Navigate, useSearchParams, Link } from 'react-router-dom';
import './UserProfileConfig.css';
import '../../components/Profile/ProfileHero.css';

function UserProfile() {
  console.log('UserProfile component is rendering!');
  const { user, isLoggedIn, updateUser } = useUser();
  console.log('User data:', { user, isLoggedIn });
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const [searchParams] = useSearchParams();
  const [isEditing, setIsEditing] = useState(false);
  const [activeActivityTab, setActiveActivityTab] = useState('recent');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  
  // Auto-open edit section if ?edit=true is in URL
  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setIsEditing(true);
    }
  }, [searchParams]);

  // Sync editData with user when user changes (after successful save)
  useEffect(() => {
    if (user) {
      setEditData({
        name: user.name || '',
        avatar: user.avatar || '',
        email: user.email || '',
        bio: user.bio || '',
        location: user.location || '',
        website: user.website || '',
        joinDate: user.joinDate || '',
        birthday: user.birthday || '',
        status: getStatusKey(user.status),
        occupation: user.occupation || ''
      });
    }
  }, [user]);
  
  // Relationship status options: stable keys + localized labels
  const relationshipOptions = [
    { key: 'single' },
    { key: 'situationship' },
    { key: 'inRelationship' },
    { key: 'engaged' },
    { key: 'married' },
    { key: 'divorced' },
    { key: 'separated' },
    { key: 'widowed' }
  ];

  const statusKeys = relationshipOptions.map(o => o.key);

  const getStatusKey = (status) => {
    if (!status) return '';
    if (statusKeys.includes(status)) return status; // already a key

    // Try to match a translated label to find its key (supports legacy stored labels)
    for (const k of statusKeys) {
      if (String(translate(`relationship.${k}`)).toLowerCase() === String(status).toLowerCase()) return k;
    }

    // Common English labels fallback
    const fallbackMap = {
      'single': 'single',
      'situationship': 'situationship',
      'in a relationship': 'inRelationship',
      'in a relationship ': 'inRelationship',
      'engaged': 'engaged',
      'married': 'married',
      'divorced': 'divorced',
      'separated': 'separated',
      'widowed': 'widowed'
    };
    const lower = String(status).toLowerCase().trim();
    if (fallbackMap[lower]) return fallbackMap[lower];
    return 'single';
  };

  const [editData, setEditData] = useState({
    name: user?.name || '',
    avatar: user?.avatar || '',
    email: user?.email || '',
    bio: user?.bio || '',
    location: user?.location || '',
    website: user?.website || '',
    joinDate: user?.joinDate || '',
    birthday: user?.birthday || '',
    status: getStatusKey(user?.status),
    occupation: user?.occupation || ''
  });

  // Redirect if not logged in
  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  const handleEdit = () => {
    setIsEditing(true);
    // Reset avatar preview when starting edit
    setAvatarPreview(null);
    setAvatarFile(null);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const handleSave = async () => {
    try {
      let updatedData = { ...editData };
      
      // If user uploaded a new avatar, upload it first
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        
        // Upload avatar to backend
        const uploadResponse = await fetch('http://localhost:8000/api/users/me/avatar', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: formData
        });
        
        if (uploadResponse.ok) {
          const result = await uploadResponse.json();
          updatedData.avatar = `http://localhost:8000${result.avatar_url}`;
        } else {
          alert('Failed to upload avatar');
          return;
        }
      }
      
      // Sync profile edits to UserContext (now async)
      const result = await updateUser(updatedData);
      
      if (result.success) {
        setIsEditing(false);
        setAvatarFile(null);
        setAvatarPreview(null);
        console.log('Profile updated successfully:', updatedData);
      } else {
        console.error('Failed to update profile:', result.error);
        alert(`Failed to update profile: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('An error occurred while updating your profile');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    // Reset form data to current user values
    setEditData({
      name: user?.name || '',
      avatar: user?.avatar || '',
      email: user?.email || '',
      bio: user?.bio || '',
      location: user?.location || '',
      website: user?.website || '',
      joinDate: user?.joinDate || '',
      birthday: user?.birthday || '',
      status: user?.status || '',
      occupation: user?.occupation || ''
    });
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateAge = (birthday) => {
    if (!birthday) return '';
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="page">
      <main className="main main-profile" style={{ marginTop: '-80px' }}>
        <div className="profile-container">
          {/* Left Column - Inline ProfileHero with editing capabilities */}
          <aside className="profile-sidebar">
            <div className="sidebar-card profile-hero">
              <div className="profile-header">
                {isEditing ? (
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img 
                          src={avatarPreview || editData.avatar} 
                          alt={editData.name} 
                          className="avatar-edit-circle"
                        />
                        <input
                          type="file"
                          id="avatar-upload"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          style={{ display: 'none' }}
                        />
                        <label 
                          htmlFor="avatar-upload"
                          style={{
                            position: 'absolute',
                            bottom: '0',
                            right: '0',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: '#28a745',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            border: '3px solid var(--bg-secondary)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                        >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="18" 
                            height="18" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="white" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          >
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                            <circle cx="12" cy="13" r="4"></circle>
                          </svg>
                        </label>
                      </div>
                    </div>
                    <div className="profile-name-with-status" style={{ marginTop: '1rem' }}>
                      <span className={`status-dot online`} title="online"></span>
                      <div style={{ width: '100%' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                          {translate('userProfile.name')}
                        </label>
                        <input
                          type="text"
                          value={editData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="profile-input"
                          placeholder={translate('userProfile.namePlaceholder')}
                          style={{ width: '100%', fontSize: '0.9rem' }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <img src={user?.avatar} alt={user?.name} className="profile-avatar" />
                    <div className="profile-name-with-status">
                      <span className={`status-dot online`} title="online"></span>
                      <h2 className="profile-name">{user?.name}</h2>
                    </div>
                  </>
                )}
              </div>

              <ul className="sidebar-links">
                <li><Link to="/messages">&emsp;{translate('messages.direct')}</Link></li>
                <li><Link to="/friends">&emsp;{translate('profile.friends')}</Link></li>
                <li><Link to="/profile/gallery">&emsp;{translate('profile.photos')}</Link></li>
              </ul>
            </div>
          </aside>

          {/* Right Column - About (moved here) and (Activity sections are commented out for later) */}
          <div className="profile-right">
            {/* About section now contains the edit button aligned to the right */}
            <section className="section profile-details">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                <h2 style={{ margin: 0 }}>{translate('userProfile.about')}</h2>
                <div>
                  {isEditing ? (
                    <>
                      <button onClick={handleSave} className="btn-save">
                        {translate('userProfile.saveChanges')}
                      </button>
                      <button onClick={handleCancel} className="btn-cancel">
                        {translate('userProfile.cancel')}
                      </button>
                    </>
                  ) : (
                    <button onClick={handleEdit} className="btn-edit">
                      {translate('userProfile.editProfile')}
                    </button>
                  )}
                </div>
              </div>

              <div className="details-row" style={{ marginTop: '1rem', textAlign: 'left' }}>
                <div className="profile-grid">
                  <div className="detail-item">
                  <label>{translate('profile.birthday')}:</label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editData.birthday}
                        onChange={(e) => handleInputChange('birthday', e.target.value)}
                        className="profile-input"
                        placeholder="Birthday"
                      />
                    ) : (
                      <p>{editData.birthday ? new Date(editData.birthday).toLocaleDateString() : ''}</p>
                    )}
                  </div>
                  <div className="detail-item">
                  <label>{translate('profile.age')}:</label>
                  <p>{editData.birthday ? calculateAge(editData.birthday) : ''}</p>
                  </div>
                  <div className="detail-item">
                  <label>{translate('profile.status')}:</label>
                    {isEditing ? (
                        <select
                          value={editData.status}
                          onChange={(e) => handleInputChange('status', e.target.value)}
                          className="profile-input"
                        >
                          <option value="">--</option>
                          {relationshipOptions.map(opt => (
                            <option key={opt.key} value={opt.key}>{translate(`relationship.${opt.key}`)}</option>
                          ))}
                        </select>
                      ) : (
                      <p>{editData.status ? translate(`relationship.${editData.status}`) : '--'}</p>
                      /* Note: if translate returns the key (missing translation), we fall back to the stored value */
                      )}
                  </div>
                  <div className="detail-item">
                  <label>{translate('userProfile.location')}:</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        className="profile-input"
                        placeholder={translate('userProfile.locationPlaceholder')}
                      />
                    ) : (
                      <p>{editData.location}</p>
                    )}
                  </div>
                  <div className="detail-item">
                  <label>{translate('profile.occupation')}:</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.occupation}
                      onChange={(e) => handleInputChange('occupation', e.target.value)}
                      className="profile-input"
                      placeholder={translate('profile.occupation')}
                    />
                  ) : (
                    <p>{editData.occupation}</p>
                  )}
                  </div>
                </div>
                <div className="detail-item bio-item">
                  <label>{translate('userProfile.bio')}:</label>
                  {isEditing ? (
                    <textarea
                      value={editData.bio}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      className="profile-textarea"
                      placeholder={translate('userProfile.bioPlaceholder')}
                      rows={3}
                    />
                  ) : (
                    <p>{editData.bio}</p>
                  )}
                </div>
              </div>
            </section>

            {/*
              Profile stats and recent activity are preserved below as commented blocks
              for later reuse. Uncomment when re-enabling activity features.
            */}

            {/**
            <section className="section profile-stats">
              <h2 style={{ marginTop: '-0.8rem', marginBottom: '0.2rem' }}>{translate('userProfile.activity')}</h2>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-number">0</span>
                  <span className="stat-label">{translate('userProfile.posts')}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">0</span>
                  <span className="stat-label">{translate('userProfile.favorites')}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">0</span>
                  <span className="stat-label">{translate('userProfile.following')}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">0</span>
                  <span className="stat-label">{translate('userProfile.followers')}</span>
                </div>
              </div>
            </section>

            <section className="section profile-activity">
              <h2 style={{ marginTop: '-0.8rem', marginBottom: '0.2rem' }}>{translate('userProfile.recentActivity')}</h2>

              <div className="activity-tabs">
                <button 
                  className={`activity-tab ${activeActivityTab === 'recent' ? 'active' : ''}`}
                  onClick={() => setActiveActivityTab('recent')}
                >
                  {translate('userProfile.recent')}
                </button>
                <button 
                  className={`activity-tab ${activeActivityTab === 'posts' ? 'active' : ''}`}
                  onClick={() => setActiveActivityTab('posts')}
                >
                  {translate('userProfile.posts')}
                </button>
                <button 
                  className={`activity-tab ${activeActivityTab === 'favorites' ? 'active' : ''}`}
                  onClick={() => setActiveActivityTab('favorites')}
                >
                  {translate('userProfile.favorites')}
                </button>
              </div>

              <div className="activity-list">
                {activeActivityTab === 'recent' && (
                  <div>
                    <p className="no-activity">{translate('userProfile.noRecentActivity')}</p>
                  </div>
                )}

                {activeActivityTab === 'posts' && (
                  <div>
                    <p className="no-activity">{translate('userProfile.noPostsYet')}</p>
                  </div>
                )}

                {activeActivityTab === 'favorites' && (
                  <div>
                    <p className="no-activity">{translate('userProfile.noFavoritesYet')}</p>
                  </div>
                )}
              </div>
            </section>
            **/}
          </div>
        </div>
      </main>
    </div>
  );
}

export default UserProfile;
