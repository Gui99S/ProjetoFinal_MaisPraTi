import React, { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import { useLanguage } from '../../context/LanguageContext'
import Button from '../../components/Buttons/Button'
import ProfileHero from '../../components/Profile/ProfileHero'
import communityService from '../../services/communityService'
import userService from '../../services/userService'
import './CommunityList.css'

export default function CommunityList() {
  const { slug } = useParams()
  const { user } = useUser()
  const { translate } = useLanguage()
  const [profileUser, setProfileUser] = useState(null)
  const [communities, setCommunities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const isOwnProfile = !slug || slug === user?.slug

  const displayUser = isOwnProfile ? user : profileUser
  const profile = {
    name: displayUser?.name || 'Random',
    avatar: displayUser?.avatar || 'https://picsum.photos/300/400?random=12',
    joined: displayUser?.joinDate || new Date().toLocaleDateString()
  }

  const categories = [
    'technology', 'gaming', 'music', 'sports', 'education', 
    'entertainment', 'lifestyle', 'business', 'health', 
    'travel', 'food', 'art', 'other'
  ]

  // Fetch profile user data if viewing another user's communities
  useEffect(() => {
    const fetchProfileUser = async () => {
      if (!isOwnProfile && slug) {
        try {
          const userData = await userService.getUser(slug)
          setProfileUser(userData)
        } catch (error) {
          console.error('Error fetching profile user:', error)
          setError('Failed to load user profile')
        }
      }
    }
    fetchProfileUser()
  }, [slug, isOwnProfile])

  // Fetch communities from API
  useEffect(() => {
    loadCommunities()
  }, [searchQuery, selectedCategory, page, slug, isOwnProfile])

  const loadCommunities = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (isOwnProfile && !searchQuery && !selectedCategory) {
        // When viewing own profile without filters, show user's communities
        const userCommunities = await userService.getUserCommunities(user?.slug || user?.id)
        setCommunities(userCommunities)
        setTotalPages(1)
      } else if (isOwnProfile) {
        // When searching/filtering on own profile, show all communities
        const data = await communityService.getCommunities({
          search: searchQuery || undefined,
          category: selectedCategory || undefined,
          page,
          page_size: 20
        })
        setCommunities(data.communities)
        setTotalPages(Math.ceil(data.total / data.page_size))
      } else {
        // When viewing another user's profile, show their communities only
        const userCommunities = await userService.getUserCommunities(slug)
        setCommunities(userCommunities)
        setTotalPages(1)
      }
    } catch (err) {
      console.error('Error loading communities:', err)
      setError(err.detail || 'Failed to load communities')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    setSearchQuery(e.target.value)
    setPage(1) // Reset to first page on new search
  }

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value)
    setPage(1)
  }

  const handleJoinCommunity = async (communityId, e) => {
    e.preventDefault() // Prevent navigation
    e.stopPropagation()
    
    try {
      await communityService.joinCommunity(communityId)
      loadCommunities() // Reload to update membership status
    } catch (err) {
      console.error('Error joining community:', err)
      alert(err.detail || 'Failed to join community')
    }
  }

  return (
    <main className="community-page page">
      <div className="community-container prototype-container">
        <aside className="profile-sidebar">
          <ProfileHero profile={profile} />
        </aside>

        <section className="community-main">
          <div className="status-card">
            <div className="communities-header">
              <h2>
                {isOwnProfile 
                  ? translate('profile.communities') 
                  : `${displayUser?.name}'s Communities`}
              </h2>
              {isOwnProfile && (
                <Link to="/communities/new">
                  <Button className="btn btn-secondary">
                    {translate('profile.createNew')}
                  </Button>
                </Link>
              )}
            </div>

            {/* Search and Filter Controls - Only for own profile */}
            {isOwnProfile && (
              <div className="communities-controls">
                <input
                  type="text"
                  placeholder={translate('communities.searchCommunities')}
                  value={searchQuery}
                  onChange={handleSearch}
                  className="search-input"
                />
                <select 
                  value={selectedCategory} 
                  onChange={handleCategoryChange}
                  className="category-select"
                >
                  <option value="">{translate('communities.allCategories')}</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {translate(`category.${cat}`)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="loading-message">{translate('communities.loadingCommunities')}</div>
            )}

            {/* Error State */}
            {error && (
              <div className="error-message">{error}</div>
            )}

            {/* Communities Grid */}
            {!loading && !error && (
              <>
                {communities.length === 0 ? (
                  <div className="no-communities">
                    {translate('communities.noCommunitiesFound')}. {searchQuery && translate('communities.tryDifferentSearch')}
                  </div>
                ) : (
                  <div className="communities-grid">
                    {communities.map(c => (
                      <div key={c.id} className="community-card">
                        <Link to={`/communities/${c.id}`} className="community-link">
                          <img 
                            src={c.banner || 'https://picsum.photos/seed/community/400/120'} 
                            alt={c.name} 
                            className="community-banner" 
                          />
                          <h3>{c.name}</h3>
                          <div className="community-category">
                            {translate(`category.${c.category}`)}
                            {c.is_private && ' 🔒'}
                          </div>
                          <div className="community-desc">{c.description}</div>
                          <div className="community-meta">
                            {c.member_count} {translate('profile.totalMembers')}
                          </div>
                          {!c.is_member && (
                            <Button 
                              className="btn btn-sm btn-primary join-btn"
                              onClick={(e) => handleJoinCommunity(c.id, e)}
                            >
                              {translate('communities.join')}
                            </Button>
                          )}
                          {c.is_member && (
                            <span className="member-badge">{translate('communities.memberBadge')}</span>
                          )}
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <Button 
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                      className="btn btn-sm"
                    >
                      {translate('communities.previous')}
                    </Button>
                    <span className="page-info">
                      {translate('communities.pageOf', { page, total: totalPages })}
                    </span>
                    <Button 
                      disabled={page === totalPages}
                      onClick={() => setPage(p => p + 1)}
                      className="btn btn-sm"
                    >
                      {translate('communities.next')}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
