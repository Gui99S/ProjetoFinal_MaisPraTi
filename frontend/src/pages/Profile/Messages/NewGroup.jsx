import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../../context/UserContext';
import { useLanguage } from '../../../context/LanguageContext';
import ProfileHero from '../../../components/Profile/ProfileHero';
import friendService from '../../../services/friendService';
import messageService from '../../../services/messageService';
import './MsgHub.css';
import './NewGroup.css';

export default function NewGroup() {
  const { user } = useUser();
  const { translate } = useLanguage();
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1: name group, 2: select friends
  const [creatingGroup, setCreatingGroup] = useState(false);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const data = await friendService.getFriends(1, 100);
      setFriends(data.friends || []);
      setError(null);
    } catch (err) {
      console.error('Error loading friends:', err);
      setError('Failed to load friends');
      // Use mock data for demo
      setFriends([
        {
          id: 2,
          name: 'Alice Johnson',
          slug: 'alice-johnson',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop',
          location: 'San Francisco, CA'
        },
        {
          id: 3,
          name: 'Bob Williams',
          slug: 'bob-williams',
          avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=80&h=80&fit=crop',
          location: 'New York, NY'
        },
        {
          id: 4,
          name: 'Carol Davis',
          slug: 'carol-davis',
          avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop',
          location: 'Los Angeles, CA'
        },
        {
          id: 5,
          name: 'David Miller',
          slug: 'david-miller',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop',
          location: 'Chicago, IL'
        },
        {
          id: 6,
          name: 'Eve Thompson',
          slug: 'eve-thompson',
          avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=80&h=80&fit=crop',
          location: 'Seattle, WA'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFriendSelection = (friendId) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    if (selectedFriends.length < 2) {
      alert('Please select at least 2 friends for the group');
      return;
    }

    if (creatingGroup) return;

    try {
      setCreatingGroup(true);

      // Create group conversation via API
      const conversation = await messageService.createConversation({
        type: 'group',
        name: groupName.trim(),
        participant_ids: selectedFriends
      });

      // Navigate to the newly created group
      navigate(`/messages/group/${conversation.id}`);
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group. Please try again.');
    } finally {
      setCreatingGroup(false);
    }
  };

  return (
    <main className="msghub-page page">
      <div className="msghub-container">
        <aside className="profile-sidebar">
          <ProfileHero />
        </aside>

        <section className="msghub-main">
          <div className="msghub-header">
            <div className="newgroup-header-left">
              <Link to="/messages" className="back-link">
                <i className="fas fa-arrow-left"></i>
              </Link>
              <h2>{translate('messages.createNewGroup')}</h2>
            </div>
            {step === 2 && selectedFriends.length >= 2 && (
              <button onClick={handleCreateGroup} className="btn" disabled={creatingGroup}>
                {creatingGroup ? translate('messages.creating') : translate('messages.createGroup')}
              </button>
            )}
          </div>

          {step === 1 ? (
            <div className="newgroup-name-step">
              <div className="newgroup-name-section">
                <label className="newgroup-label">{translate('messages.groupName')}</label>
                <input
                  type="text"
                  placeholder={translate('messages.groupNamePlaceholder')}
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="newgroup-name-input"
                  maxLength={50}
                />
                <span className="newgroup-char-count">{groupName.length}/50</span>
              </div>

              <div className="newgroup-avatar-section">
                <label className="newgroup-label">{translate('messages.groupPhoto')}</label>
                <div className="newgroup-avatar-upload">
                  <div className="newgroup-avatar-placeholder">
                    <i className="fas fa-users"></i>
                  </div>
                  <button className="btn btn-secondary">
                    <i className="fas fa-camera"></i>
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!groupName.trim()}
                className="btn newgroup-next-btn"
              >
                {translate('messages.nextInviteFriends')}
                <i className="fas fa-arrow-right"></i>
              </button>
            </div>
          ) : (
            <>
              <div className="newgroup-selected-info">
                <div className="newgroup-group-preview">
                  <div className="newgroup-preview-avatar">
                    <i className="fas fa-users"></i>
                  </div>
                  <div className="newgroup-preview-details">
                    <div className="newgroup-preview-name">{groupName}</div>
                    <div className="newgroup-preview-count">
                      {selectedFriends.length} {selectedFriends.length !== 1 ? translate('messages.membersSelected') : translate('messages.memberSelected')}
                    </div>
                  </div>
                </div>
                {selectedFriends.length > 0 && (
                  <div className="newgroup-selected-avatars">
                    {friends
                      .filter(f => selectedFriends.includes(f.id))
                      .slice(0, 5)
                      .map(friend => (
                        <img
                          key={friend.id}
                          src={friend.avatar}
                          alt={friend.name}
                          className="newgroup-selected-avatar"
                          title={friend.name}
                        />
                      ))}
                    {selectedFriends.length > 5 && (
                      <div className="newgroup-selected-more">
                        +{selectedFriends.length - 5}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="newgroup-search">
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder={translate('messages.searchToInvite')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="newgroup-search-input"
                />
              </div>

              {loading ? (
                <div className="newgroup-loading">Loading friends...</div>
              ) : filteredFriends.length === 0 ? (
                <div className="newgroup-empty">
                  {searchQuery ? translate('messages.noFriendsFound') : translate('messages.noFriendsAvailable')}
                </div>
              ) : (
                <div className="newgroup-friends-list">
                  {filteredFriends.map(friend => {
                    const isSelected = selectedFriends.includes(friend.id);
                    return (
                      <div
                        key={friend.id}
                        className={`newgroup-friend-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleFriendSelection(friend.id)}
                      >
                        <img src={friend.avatar} alt={friend.name} className="newgroup-friend-avatar" />
                        <div className="newgroup-friend-info">
                          <div className="newgroup-friend-name">{friend.name}</div>
                          {friend.location && (
                            <div className="newgroup-friend-location">
                              <i className="fas fa-map-marker-alt"></i>
                              {friend.location}
                            </div>
                          )}
                        </div>
                        <div className={`newgroup-checkbox ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <i className="fas fa-check"></i>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
