import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Navigate, Link } from 'react-router-dom';
import './PublicProfile.css';
import PlaceholderImg from '../../assets/images/placeholder1.png';

function Profile() {
  const { user, isLoggedIn } = useUser();
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const [activeTab, setActiveTab] = useState('testimonials');

  // Redirect if not logged in
  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  // Function to calculate age from birthday
  function calculateAge(birthday) {
    if (!birthday) return '';
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  // Mock data for demonstration (in real app, this would come from API/context)
  const profileData = {
    name: user?.name || 'Demo User',
    email: user?.email || 'demo@example.com',
    avatar: user?.avatar || 'https://via.placeholder.com/150',
    bio: translate('profile.defaultBio'),
    location: 'Earth',
    birthday: user?.birthday || '1999-12-31',
    age: user?.birthday ? calculateAge(user.birthday) : calculateAge('1999-12-31'),
    status: translate('profile.single'),
    occupation: translate('profile.webDeveloper'),
    interests: ['Programming', 'Music', 'Travel', 'Gaming', 'Photography'],
    joinDate: new Date().toLocaleDateString(),
    onlineStatus: 'online', // online, busy, inactive, offline
    profileViews: 1247,
    friendsCount: 156,
    photosCount: 23,
    testimonialsCount: 8
  };

  const mockTestimonials = [
    {
      id: 1,
      author: 'John Doe',
      avatar: PlaceholderImg,
      text: 'Lorem ipsum.',
      date: '2 days ago'
    },
    {
      id: 2,
      author: 'Maria Garcia',
      avatar: PlaceholderImg,
      text: 'Ipsum lorem...',
      date: '1 week ago'
    }
  ];

  const mockPhotos = Array.from({ length: 48 }, (_, i) => ({
    id: i + 1,
    url: `https://picsum.photos/150/150?random=${i + 1}`,
    caption: `Photo ${i + 1}`
  }));

  const mockFriends = [
    { id: 1, name: 'Alice Johnson', avatar: PlaceholderImg, is_bot: false },
    { id: 2, name: 'Bob Williams', avatar: PlaceholderImg, is_bot: false },
    { id: 3, name: 'Carol Davis', avatar: PlaceholderImg, is_bot: false },
    { id: 4, name: 'David Miller', avatar: PlaceholderImg, is_bot: false },
    { id: 5, name: 'Emma Wilson', avatar: PlaceholderImg, is_bot: false },
    { id: 6, name: 'Frank Brown', avatar: PlaceholderImg, is_bot: false },
    { id: 7, name: 'Grace Taylor', avatar: PlaceholderImg, is_bot: false },
    { id: 8, name: 'Henry Davis', avatar: PlaceholderImg, is_bot: false }
  ].sort((a, b) => {
    if (a.is_bot === b.is_bot) return 0;
    return a.is_bot ? 1 : -1; // Real users first
  });

  // Limit photos and friends displayed on profile to 4
  const displayPhotos = mockPhotos.slice(0, 4);
  const displayFriends = mockFriends.slice(0, 4);

  return (
    <div className="page">
      <main className="main main-fullwidth">
        <div className="orkut-profile">
          {/* Left Sidebar */}
          <div className="profile-sidebar">
            {/* Avatar Section */}
            <div className="profile-card">
              <div className="profile-header-card">
                <img src={profileData.avatar} alt={profileData.name} className="profile-avatar-main" />
                <div className="profile-name-with-status">
                  <span className={`status-dot ${profileData.onlineStatus}`}></span>
                  <h2 className="profile-name-main">{profileData.name}</h2>
                </div>
              </div>
              
              <div className="quick-info">
                <div className="info-row">
                  <span className="info-label">Birthday:</span>
                  <span className="info-value">{profileData.birthday ? new Date(profileData.birthday).toLocaleDateString() : ''}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{translate('profile.age')}:</span>
                  <span className="info-value">{profileData.age}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{translate('profile.status')}:</span>
                  <span className="info-value">{profileData.status}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{translate('profile.location')}:</span>
                  <span className="info-value">{profileData.location}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{translate('profile.occupation')}:</span>
                  <span className="info-value">{profileData.occupation}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">{translate('profile.memberSince')}:</span>
                  <span className="info-value">{profileData.joinDate}</span>
                </div>
              </div>
              
              <h3 className="card-title" style={{
                marginTop: '12px'
              }}>{translate('profile.contact')}</h3>
              <div className="contact-info">
                <div className="info-row">
                  <button className="message-button">
                    <svg className="message-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m3 3 3 9-3 9 19-9Z"/>
                      <path d="m6 12 13 0"/>
                    </svg>
                    {translate('profile.leaveMessage')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Center - About Me */}
          <div className="profile-center">
            <div className="profile-card">
              <h3 className="card-title">{translate('profile.aboutMe')}</h3>
              <p className="about-text">{profileData.bio}</p>
            </div>
            
            {/* Interests */}
            <div className="profile-card">
              <h3 className="card-title">{translate('profile.interests')}</h3>
              <div className="interests-list">
                {profileData.interests.map((interest, index) => (
                  <span key={index} className="interest-tag">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right - Tabs Content */}
          <div className="profile-main">
            {/* Navigation Tabs */}
            <div className="profile-tabs">
              <button 
                className={`tab-btn testimonials-tab ${activeTab === 'testimonials' ? 'active' : ''}`}
                onClick={() => setActiveTab('testimonials')}
              >
                ({mockTestimonials.length}) {translate('profile.kudos')}
              </button>
              <button 
                className={`tab-btn ${activeTab === 'photos' ? 'active' : ''}`}
                onClick={() => setActiveTab('photos')}
              >
                ({mockPhotos.length}) {translate('profile.photos')}
              </button>
              <button 
                className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
                onClick={() => setActiveTab('friends')}
              >
                ({profileData.friendsCount}) {translate('profile.friends')}
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">

              {activeTab === 'testimonials' && (
                <div className="testimonials-content">
                  {mockTestimonials.map(testimonial => (
                    <div key={testimonial.id} className="tab-card testimonial-card">
                      <div className="testimonial-header">
                        <img src={testimonial.avatar} alt={testimonial.author} className="testimonial-avatar" />
                        <div className="testimonial-info">
                          <h4 className="testimonial-author">{testimonial.author}</h4>
                          <span className="testimonial-date">{testimonial.date}</span>
                        </div>
                      </div>
                      <p className="testimonial-text">{testimonial.text}</p>
                    </div>
                  ))}
                  <div className="tab-card">
                    <div className="kudos-input-container">
                      <textarea 
                        className="kudos-input"
                        maxLength={56} 
                        placeholder={translate('kudos.placeholder')}
                        rows="4"
                      />
                      <button className="kudos-send-btn">
                        {translate('kudos.sendButton')}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'photos' && (
                <div className="photos-content">
                  <div className="tab-card">
                    <div className="photos-grid">
                      {displayPhotos.map(photo => (
                        <div key={photo.id} className="photo-item">
                          <img src={photo.url} alt={photo.caption} className="photo-image" />
                        </div>
                      ))}
                    </div>
                    <div className="photos-footer">
                      <Link to="/profile/gallery" className="show-more-link" style={{ marginTop: '1.2rem' }}>
                        {translate('profile.showMore')} ({mockPhotos.length} {translate('profile.totalPhotos')})
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'friends' && (
                <div className="friends-content">
                  <div className="tab-card">
                    <div className="friends-grid">
                      {displayFriends.map(friend => (
                        <div key={friend.id} className="friend-item">
                          <img src={friend.avatar} alt={friend.name} className="friend-avatar" />
                          <span className="friend-name">{friend.name}</span>
                        </div>
                      ))}
                    </div>
                    <div className="friends-footer">
                      <span className="show-more-link" style={{ marginTop: '1.2rem' }}>
                        {translate('profile.viewAll')} ({mockFriends.length} {translate('profile.totalFriends')})
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Profile;
