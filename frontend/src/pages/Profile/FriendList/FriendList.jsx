import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useUser } from '../../../context/UserContext'
import { useLanguage } from '../../../context/LanguageContext'
import friendService from '../../../services/friendService'
import userService from '../../../services/userService'
import ProfileHero from '../../../components/Profile/ProfileHero'
import FriendRequests from '../FriendRequests/FriendRequests'
import './FriendList.css'

export default function FriendList() {
  const { user } = useUser()
  const { slug } = useParams() // Get slug from URL if viewing another user's friends
  const { translate } = useLanguage()
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [showRequests, setShowRequests] = useState(false)
  const [profileUser, setProfileUser] = useState(null)
  
  const isOwnProfile = !slug || slug === user?.slug

  useEffect(() => {
    if (slug && !isOwnProfile) {
      fetchProfileUser()
    }
    fetchFriends()
  }, [slug])

  const fetchProfileUser = async () => {
    try {
      const userData = await userService.getUser(slug)
      setProfileUser(userData)
    } catch (error) {
      console.error('Failed to fetch profile user:', error)
    }
  }

  const fetchFriends = async () => {
    try {
      setLoading(true)
      if (isOwnProfile) {
        // Get logged-in user's friends
        const data = await friendService.getFriends(1, 50)
        // Sort: real users first, then bots
        const sortedFriends = data.friends.sort((a, b) => {
          if (a.is_bot === b.is_bot) return 0
          return a.is_bot ? 1 : -1
        })
        setFriends(sortedFriends)
      } else {
        // Get another user's friends via their slug
        const friendsData = await userService.getUserFriends(slug, 1, 50)
        // Sort: real users first, then bots
        const sortedFriends = friendsData.friends.sort((a, b) => {
          if (a.is_bot === b.is_bot) return 0
          return a.is_bot ? 1 : -1
        })
        setFriends(sortedFriends)
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error)
      setFriends([])
    } finally {
      setLoading(false)
    }
  }

  const displayUser = isOwnProfile ? user : profileUser
  const profile = {
    name: displayUser?.name || 'Random',
    avatar: displayUser?.avatar || 'https://picsum.photos/300/400?random=12',
    joined: displayUser?.joinDate || new Date().toLocaleDateString(),
    slug: displayUser?.slug
  }

  return (
    <main className="friendlist-page page">
      <div className="friendlist-container">
        <aside className="profile-sidebar">
          <ProfileHero profile={profile} isOwnProfile={isOwnProfile} />
        </aside>

        <section className="friendlist-main">
          <div className="friends-header">
            <h2>{isOwnProfile ? translate('profile.friends') : translate('friends.userFriends').replace('{name}', displayUser?.name)}</h2>
            {isOwnProfile && (
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowRequests(!showRequests)}
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                {showRequests ? translate('friends.showFriends') : translate('friends.friendRequests')}
              </button>
            )}
          </div>

          {showRequests && isOwnProfile ? (
            <FriendRequests />
          ) : (
            <>
              {loading ? (
                <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  {translate('friends.loading')}
                </p>
              ) : friends.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  {translate('friends.noFriends')}
                </p>
              ) : (
                <div className="friends-grid">
                  {friends.map(f => (
                    <div className="friend-card" key={f.id}>
                      <Link to={`/profile/${f.slug}`} className="friend-link">
                        <img src={f.avatar} alt={f.name} className="friend-card-avatar" />
                        <div className="friend-card-name">{f.name}</div>
                        {f.location && (
                          <div className="friend-card-location">📍 {f.location}</div>
                        )}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </section>
      </div>
    </main>
  )
}
