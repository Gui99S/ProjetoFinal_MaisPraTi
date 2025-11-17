import React, { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'
import { useUser } from '../../context/UserContext'
import communityService from '../../services/communityService'
import NewThread from './NewThread'
import ThreadList from './ThreadList'
import './Community.css'

export default function Community() {
  const { translate } = useLanguage()
  const { user } = useUser()
  const { id: communityId } = useParams()
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState('threads')
  const [sidebarTab, setSidebarTab] = useState('members')
  const [community, setCommunity] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showNewThreadForm, setShowNewThreadForm] = useState(false)

  useEffect(() => {
    loadCommunityData()
  }, [communityId])

  useEffect(() => {
    if (activeTab === 'threads') {
      loadPosts()
    }
  }, [activeTab, communityId])

  const loadCommunityData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await communityService.getCommunity(communityId)
      setCommunity(data)
    } catch (err) {
      console.error('Error loading community:', err)
      setError(err.detail || translate('communities.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const loadPosts = async () => {
    try {
      setPostsLoading(true)
      const data = await communityService.getPosts(communityId, 1, 20)
      setPosts(data.posts)
    } catch (err) {
      console.error('Error loading posts:', err)
    } finally {
      setPostsLoading(false)
    }
  }

  const handleJoin = async () => {
    try {
      await communityService.joinCommunity(communityId)
      loadCommunityData() // Reload to update membership status
    } catch (err) {
      alert(err.detail || translate('communities.failedToJoin'))
    }
  }

  const handleLeave = async () => {
    if (!confirm(translate('communities.confirmLeave'))) return
    
    try {
      await communityService.leaveCommunity(communityId)
      navigate('/communities')
    } catch (err) {
      alert(err.detail || translate('communities.failedToLeave'))
    }
  }

  const handleCreateThread = async ({ title, content }) => {
    try {
      const threadContent = `${title}\n\n${content}`
      const newPost = await communityService.createPost(communityId, {
        content: threadContent
      })
      setPosts([newPost, ...posts])
      setShowNewThreadForm(false)
    } catch (err) {
      alert(err.detail || translate('communities.failedToCreateThread'))
      throw err // Re-throw to let NewThread handle it if needed
    }
  }

  const handleNewThreadClick = () => {
    setShowNewThreadForm(true)
  }

  const handleCancelNewThread = () => {
    setShowNewThreadForm(false)
  }

  if (loading) {
    return (
      <main className="community-page page">
        <div className="loading-message">Loading community...</div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="community-page page">
        <div className="error-message">{error}</div>
        <Link to="/communities" className="btn btn-secondary">Back to Communities</Link>
      </main>
    )
  }

  if (!community) return null

  const isAdmin = community.user_role === 'admin'
  const isModerator = community.user_role === 'moderator'
  const isMember = community.is_member

  const admins = community.members?.filter(m => m.role === 'admin') || []
  const moderators = community.members?.filter(m => m.role === 'moderator') || []
  const regularMembers = community.members?.filter(m => m.role === 'member') || []

  return (
    <main className="community-page page">
      <div className="community-container">
        {/* Left Column - Community Info */}
        <aside className="community-sidebar">
          <div className="community-header">
            <img 
              src={community.avatar || 'https://picsum.photos/seed/community-avatar/200/200'} 
              alt={community.name} 
              className="community-avatar" 
            />
            <h1 className="community-title">{community.name}</h1>
            <div className="community-category">
              {translate(`category.${community.category}`)}
              {community.is_private && ' 🔒'}
            </div>
            <div className="community-stats">
              <div className="stat-item">
                <span className="stat-label">{translate('communities.members')}:</span>
                <span className="stat-value">{community.member_count}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">{translate('communities.created')}:</span>
                <span className="stat-value">{new Date(community.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            
            {!isMember && (
              <button className="btn-join" onClick={handleJoin}>
                {translate('communities.join')}
              </button>
            )}
            
            {isMember && !isAdmin && (
              <button className="btn-leave" onClick={handleLeave}>
                {translate('communities.leave')}
              </button>
            )}
            
            {isMember && (
              <div className="member-role-badge">
                {community.user_role === 'admin' && '👑 Admin'}
                {community.user_role === 'moderator' && '⭐ Moderator'}
                {community.user_role === 'member' && '✓ Member'}
              </div>
            )}
          </div>
        </aside>

        {/* Center Column - About & Threads */}
        <section className="community-main">
          <div className="tabs-container">
            <div className="tab-buttons" style={{ border: '1px solid var(--border-light) '}}>
              <button
                className={`tab-btn ${activeTab === 'about' ? 'active' : ''}`}
                onClick={() => setActiveTab('about')}
              >
                {translate('communities.about')}
              </button>
              <button
                className={`tab-btn ${activeTab === 'threads' ? 'active' : ''}`}
                onClick={() => setActiveTab('threads')}
              >
                {translate('communities.threads')}
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'about' && (
            <div className="about-card">
              <div className="about-header">
                <h2>{translate('communities.about')}</h2>
                {(isAdmin || isModerator) && (
                  <Link 
                    to={`/communities/${communityId}/edit`}
                    className="btn-edit-community"
                    title="Edit Community"
                  >
                    <i className="fas fa-pencil-alt"></i>
                  </Link>
                )}
              </div>
              <p>{community.description}</p>
              <div className="creator-info">
                <span>{translate('communities.created')} {translate('communities.by')}: </span>
                <Link to={`/profile/${community.created_by.slug}`}>
                  {community.created_by.name}
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'threads' && (
            <div className="threads-section">
              {showNewThreadForm ? (
                <NewThread
                  onSubmit={handleCreateThread}
                  onCancel={handleCancelNewThread}
                />
              ) : (
                <ThreadList
                  threads={posts}
                  communityId={communityId}
                  loading={postsLoading}
                  onNewThread={handleNewThreadClick}
                  isMember={isMember}
                />
              )}
            </div>
              )}
            </div>
          </div>
        </section>

        {/* Right Column - Members/Admins Tabs */}
        <aside className="community-tabs-sidebar">
          <div className="tabs-container">
            <div className="tab-buttons">
              <button
                className={`tab-btn ${sidebarTab === 'members' ? 'active' : ''}`}
                onClick={() => setSidebarTab('members')}
              >
                {translate('communities.members')}
              </button>
              <button
                className={`tab-btn ${sidebarTab === 'administrators' ? 'active' : ''}`}
                onClick={() => setSidebarTab('administrators')}
              >
                {translate('communities.administrators')}
              </button>
            </div>

            <div className="tab-content">
              {sidebarTab === 'members' && (
                <div className="members-list">
                  {admins.map(admin => (
                    <div key={admin.id} className="friend-item">
                      <Link to={`/profile/${admin.user.slug}`}>
                        <img 
                          src={admin.user.avatar || 'https://picsum.photos/seed/user/80/80'} 
                          alt={admin.user.name} 
                          className="friend-avatar" 
                        />
                      </Link>
                      <span className="friend-name" style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        display: 'block',
                        textAlign: 'center'
                      }}>
                        👑 {admin.user.name}
                      </span>
                    </div>
                  ))}
                  {moderators.map(mod => (
                    <div key={mod.id} className="friend-item">
                      <Link to={`/profile/${mod.user.slug}`}>
                        <img 
                          src={mod.user.avatar || 'https://picsum.photos/seed/user/80/80'} 
                          alt={mod.user.name} 
                          className="friend-avatar" 
                        />
                      </Link>
                      <span className="friend-name" style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        display: 'block',
                        textAlign: 'center'
                      }}>
                        ⭐ {mod.user.name}
                      </span>
                    </div>
                  ))}
                  {regularMembers.slice(0, 10).map(member => (
                    <div key={member.id} className="friend-item">
                      <Link to={`/profile/${member.user.slug}`}>
                        <img 
                          src={member.user.avatar || 'https://picsum.photos/seed/user/80/80'} 
                          alt={member.user.name} 
                          className="friend-avatar" 
                        />
                      </Link>
                      <span className="friend-name" style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        display: 'block',
                        textAlign: 'center'
                      }}>
                        {member.user.name}
                      </span>
                    </div>
                  ))}
                  {admins.length === 0 && moderators.length === 0 && regularMembers.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '16px', color: 'var(--text-secondary)' }}>
                      {translate('communities.noMembers')}
                    </div>
                  )}
                </div>
              )}

              {sidebarTab === 'administrators' && (
                <div className="members-list">
                  {admins.map(admin => (
                    <div key={admin.id} className="friend-item">
                      <Link to={`/profile/${admin.user.slug}`}>
                        <img 
                          src={admin.user.avatar || 'https://picsum.photos/seed/user/80/80'} 
                          alt={admin.user.name} 
                          className="friend-avatar" 
                        />
                      </Link>
                      <span className="friend-name" style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        display: 'block',
                        textAlign: 'center'
                      }}>
                        👑 {admin.user.name}
                      </span>
                    </div>
                  ))}
                  {moderators.map(mod => (
                    <div key={mod.id} className="friend-item">
                      <Link to={`/profile/${mod.user.slug}`}>
                        <img 
                          src={mod.user.avatar || 'https://picsum.photos/seed/user/80/80'} 
                          alt={mod.user.name} 
                          className="friend-avatar" 
                        />
                      </Link>
                      <span className="friend-name" style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        display: 'block',
                        textAlign: 'center'
                      }}>
                        ⭐ {mod.user.name}
                      </span>
                    </div>
                  ))}
                  {admins.length === 0 && moderators.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '16px', color: 'var(--text-secondary)' }}>
                      No administrators yet
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
