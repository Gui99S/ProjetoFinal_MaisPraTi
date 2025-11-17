import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../../context/UserContext';
import { useLanguage } from '../../../context/LanguageContext';
import ProfileHero from '../../../components/Profile/ProfileHero';
import friendService from '../../../services/friendService';
import messageService from '../../../services/messageService';
import './MsgHub.css';
import './NewMsg.css';

export default function NewMsg() {
  const { user } = useUser();
  const { translate } = useLanguage();
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [creatingConversation, setCreatingConversation] = useState(false);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const data = await friendService.getFriends(1, 100); // Load all friends
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
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartConversation = async (friendId, friendSlug) => {
    if (creatingConversation) return;

    try {
      setCreatingConversation(true);
      
      // Create or get existing direct conversation
      const conversation = await messageService.createConversation({
        type: 'direct',
        participant_ids: [friendId]
      });

      // Navigate to the conversation
      navigate(`/messages/${conversation.id}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Failed to create conversation. Please try again.');
    } finally {
      setCreatingConversation(false);
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
            <div className="newmsg-header-left">
              <Link to="/messages" className="back-link">
                <i className="fas fa-arrow-left"></i>
              </Link>
              <h2>{translate('messages.newMessage')}</h2>
            </div>
          </div>

          <div className="newmsg-search">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder={translate('messages.searchFriends')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="newmsg-search-input"
            />
          </div>

          {loading ? (
            <div className="newmsg-loading">Loading friends...</div>
          ) : filteredFriends.length === 0 ? (
            <div className="newmsg-empty">
              {searchQuery ? translate('messages.noFriendsFound') : translate('messages.noFriendsYet')}
              {!searchQuery && (
                <Link to="/friends" className="btn" style={{ marginTop: '12px' }}>
                  {translate('messages.findFriends')}
                </Link>
              )}
            </div>
          ) : (
            <div className="newmsg-friends-list">
              {filteredFriends.map(friend => (
                <div
                  key={friend.id}
                  className="newmsg-friend-card"
                  onClick={() => handleStartConversation(friend.id, friend.slug)}
                >
                  <img src={friend.avatar} alt={friend.name} className="newmsg-friend-avatar" />
                  <div className="newmsg-friend-info">
                    <div className="newmsg-friend-name">{friend.name}</div>
                    {friend.location && (
                      <div className="newmsg-friend-location">
                        <i className="fas fa-map-marker-alt"></i>
                        {friend.location}
                      </div>
                    )}
                  </div>
                  <button className="newmsg-message-btn" disabled={creatingConversation}>
                    <i className="fas fa-comment"></i>
                    {creatingConversation ? translate('messages.creating') : translate('messages.message')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
