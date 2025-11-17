import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../context/LanguageContext';
import friendService from '../../../services/friendService';
import './FriendRequests.css';

export default function FriendRequests() {
  const { translate } = useLanguage();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await friendService.getPendingRequests();
      setRequests(data.requests);
    } catch (error) {
      console.error('Failed to fetch friend requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (friendshipId) => {
    try {
      await friendService.acceptFriendRequest(friendshipId);
      // Remove from list
      setRequests(prev => prev.filter(req => req.id !== friendshipId));
    } catch (error) {
      alert(error.detail || translate('validation.fillAllFields'));
    }
  };

  const handleReject = async (friendshipId) => {
    try {
      await friendService.rejectFriendRequest(friendshipId);
      // Remove from list
      setRequests(prev => prev.filter(req => req.id !== friendshipId));
    } catch (error) {
      alert(error.detail || translate('validation.fillAllFields'));
    }
  };

  if (loading) {
    return (
      <div className="friend-requests">
        <h2>{translate('friends.friendRequests')}</h2>
        <p>{translate('friends.loading')}</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="friend-requests">
        <h2>{translate('friends.friendRequests')}</h2>
        <p className="no-requests">{translate('friends.noRequests')}</p>
      </div>
    );
  }

  return (
    <div className="friend-requests">
      <h2>{translate('friends.friendRequests')} ({requests.length})</h2>
      <div className="requests-list">
        {requests.map(request => (
          <div key={request.id} className="request-card">
            <Link to={`/profile/${request.friend.slug}`} className="request-avatar-link">
              <img 
                src={request.friend.avatar} 
                alt={request.friend.name} 
                className="request-avatar"
              />
            </Link>
            <div className="request-info">
              <Link to={`/profile/${request.friend.slug}`} className="request-name-link">
                <h3>{request.friend.name}</h3>
              </Link>
              {request.friend.location && (
                <p className="request-location">📍 {request.friend.location}</p>
              )}
            </div>
            <div className="request-actions">
              <button 
                className="btn btn-accept" 
                onClick={() => handleAccept(request.id)}
              >
                ✓ {translate('friends.accept')}
              </button>
              <button 
                className="btn btn-reject" 
                onClick={() => handleReject(request.id)}
              >
                ✗ {translate('friends.decline')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
