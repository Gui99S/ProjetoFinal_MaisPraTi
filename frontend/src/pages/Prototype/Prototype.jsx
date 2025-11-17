import React, { useState } from 'react'
import { useUser } from '../../context/UserContext'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { Navigate, Link } from 'react-router-dom'
import './Prototype.css'
import ProfileHero from '../../components/Profile/ProfileHero'

export default function Prototype() {
  const { user, isLoggedIn } = useUser()
  const { theme } = useTheme()
  const { translate } = useLanguage()
  const [activeTab, setActiveTab] = useState('friends')

  if (!isLoggedIn) {
    return <Navigate to="/" replace />
  }

  const profile = {
    name: user?.name || 'Random',
    avatar: user?.avatar || 'https://picsum.photos/300/400?random=12',
    joined: user?.joinDate || new Date().toLocaleDateString(),
    status: user?.status || (translate ? translate('profile.single') : 'Digite seu status clicando aqui')
  }

  const mockFriends = [
    { id: 1, name: 'Alice Johnson', avatar: profile.avatar },
    { id: 2, name: 'Bob Williams', avatar: profile.avatar },
    { id: 3, name: 'Carol Davis', avatar: profile.avatar },
    { id: 4, name: 'David Miller', avatar: profile.avatar }
  ]
  const displayFriends = mockFriends.slice(0, 4)

  // Mock posts (used when user has no posts stored)
  const mockPosts = [
    { id: 'p1', authorName: profile.name, authorAvatar: profile.avatar, body: 'Lorem ipsum dolor sit amet, consectetur adipis.', createdAt: Date.now() - (1000 * 60 * 60) },
    { id: 'p2', authorName: profile.name, authorAvatar: profile.avatar, body: 'Lorem ipsum dolor sit amet, consectetur adipis.', createdAt: Date.now() - (1000 * 60 * 60) },
    { id: 'p3', authorName: profile.name, authorAvatar: profile.avatar, body: 'Lorem ipsum dolor sit amet, consectetur adipis.', createdAt: Date.now() - (1000 * 60 * 60) },
  ]

  const { addPost } = useUser()
  const posts = (user && user.posts && user.posts.length) ? user.posts : mockPosts

  // Small utility to format relative time (h, d)
  const formatRelative = (ts) => {
    const diff = Date.now() - ts
    const mins = Math.floor(diff / (1000 * 60))
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    const days = Math.floor(hrs / 24)
    return `${days}d`
  }

  const [newPost, setNewPost] = useState('')
  const handleCreatePost = () => {
    if (!newPost.trim()) return
    const post = {
      id: `p_${Date.now()}`,
      authorName: user?.name || profile.name,
      authorAvatar: user?.avatar || profile.avatar,
      body: newPost.trim(),
      createdAt: Date.now()
    }
    // append to user via context
    addPost(post)
    setNewPost('')
  }

  return (
    <main className="prototype-page page">
      <div className="prototype-container">
        <aside className="profile-sidebar">
          <ProfileHero profile={profile} />
        </aside>

        <section className="profile-main">
          <div className="status-card">
            <h3 className="status-title">About Me</h3>

            {/* Status info grid (two-column) */}
            <div className="status-grid">
              <div className="status-row">
                <span className="status-label">Birthday:</span>
                <span className="status-value">12/30/1999</span>
              </div>
              <div className="status-row">
                <span className="status-label">Age:</span>
                <span className="status-value">25</span>
              </div>
              <div className="status-row">
                <span className="status-label">Relationship Status:</span>
                <span className="status-value">Single</span>
              </div>
              <div className="status-row">
                <span className="status-label">Location:</span>
                <span className="status-value">Brazil</span>
              </div>
              <div className="status-row">
                <span className="status-label">Occupation:</span>
                <span className="status-value">Web Developer</span>
              </div>
              <div className="status-row">
                <span className="status-label">Member since:</span>
                <span className="status-value">10/30/2025</span>
              </div>
            </div>

            {/* Bio placed below the grid for clearer reading */}
            <p className="status-bio"><span><b>Bio:</b></span> Hello! Welcome to my profile.</p>
          </div>

          {/* center content - about/interests could go here */}
        </section>

        <aside className="profile-aside">
          {/* Yoble-style friends info-box with connected tabs */}
          <div className="yoble-box info-box">
            <div className="yoble-header">
              <div className="yoble-tabs">
                <button className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}>AMIGOS ({mockFriends.length})</button>
                <button className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>POSTS</button>
              </div>
            </div>

            <div className="tab-content">
              {activeTab === 'friends' && (
                <>
                  <div className="tab-card friends-card">
                    <div className="friends-grid">
                      {displayFriends.map(friend => (
                        <div key={friend.id} className="friend-item">
                          <Link to={`/profile/${friend.id}`}>
                            <img src={friend.avatar} alt={friend.name} className="friend-avatar" />
                          </Link>
                          <span className="friend-name">{friend.name}</span>
                        </div>
                      ))}
                    </div>

                    <div className="friends-footer">
                      <Link to="/friends" className="show-more-link">Ver todos ({mockFriends.length})</Link>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'posts' && (
                <>
                  {/* Mock posts list */}
                  <div className="tab-card posts-card">

                    <div className="post-list">
                      {posts.map(p => (
                        <div key={p.id} className="post-card">
                          <Link to={`/profile/${encodeURIComponent(p.authorName)}`}>
                            <img src={p.authorAvatar} alt={p.authorName} className="post-userAvatar" />
                          </Link>
                          <div className="post-content">
                            <div className="post-meta">{p.authorName} · <span className="post-date">{formatRelative(p.createdAt)}</span></div>
                            <div className="post-body">{p.body}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="posts-footer">
                      <span className="show-more-link">Ver mais posts</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* community info box below tabs */}
          <div className="info-box">
            <h4>COMUNIDADES</h4>
            <p>Esse usuário ainda não participa de nenhuma comunidade.<br /><Link to="#">Ver todas</Link></p>
          </div>
        </aside>
      </div>
    </main>
  )
}
