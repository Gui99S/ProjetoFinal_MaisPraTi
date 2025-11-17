import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import userService from '../../services/userService';
import MainProfile from './MainProfile';
import './MainProfile.css';

/**
 * UserProfile component - displays any user's profile by slug
 * If viewing own profile, redirects to /profile
 */
export default function UserProfile() {
  const { slug } = useParams();
  const { user: currentUser, isLoggedIn } = useUser();
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch user profile by slug (e.g., "john-doe" or "john-doe-2")
        const userData = await userService.getUserProfile(slug);
        setProfileUser(userData);
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
        setError(err.detail || 'Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchUserProfile();
    }
  }, [slug]);

  if (!isLoggedIn) {
    return <Navigate to="/auth" replace />;
  }

  // If viewing own profile, redirect to /profile
  if (profileUser && currentUser && profileUser.id === currentUser.id) {
    return <Navigate to="/profile" replace />;
  }

  if (loading) {
    return (
      <div className="prototype-page page">
        <div className="prototype-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="prototype-page page">
        <div className="prototype-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h2>Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="prototype-page page">
        <div className="prototype-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <h2>User not found</h2>
          <p>The profile you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Render user profile (similar to MainProfile but read-only)
  return (
    <MainProfile viewingUser={profileUser} isOwnProfile={false} />
  );
}
