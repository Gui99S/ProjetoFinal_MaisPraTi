import React, { useState, useEffect } from 'react'
import { useUser } from '../../context/UserContext'
import { useTheme } from '../../context/ThemeContext'
import { useLanguage } from '../../context/LanguageContext'
import { Navigate, Link, useNavigate } from 'react-router-dom'
import friendService from '../../services/friendService'
import messageService from '../../services/messageService'
import userService from '../../services/userService'
import './MainProfile.css'
import ProfileHero from '../../components/Profile/ProfileHero'

export default function MainProfile({ viewingUser = null, isOwnProfile = true }) {
	const { user, isLoggedIn } = useUser()
	const { theme } = useTheme()
	const { translate } = useLanguage()
	const navigate = useNavigate()
	const [activeTab, setActiveTab] = useState('friends')
	const [detailsOpen, setDetailsOpen] = useState(true)
	const [friendshipStatus, setFriendshipStatus] = useState(null)
	const [friendshipLoading, setFriendshipLoading] = useState(false)
	const [creatingConversation, setCreatingConversation] = useState(false)
	const [suggestedUsers, setSuggestedUsers] = useState([])
	const [loadingSuggestions, setLoadingSuggestions] = useState(true)
	const [userPosts, setUserPosts] = useState([])
	const [loadingPosts, setLoadingPosts] = useState(true)
	const [userCommunities, setUserCommunities] = useState([])
	const [loadingCommunities, setLoadingCommunities] = useState(true)

	// Use viewingUser if provided (viewing someone else's profile), otherwise use current user
	const profileData = viewingUser || user;

	// Fetch current user's full profile if slug is missing (e.g., old localStorage data)
	useEffect(() => {
		const ensureUserHasSlug = async () => {
			if (isOwnProfile && user && !user.slug) {
				try {
					console.log('User missing slug, fetching full profile...')
					const fullProfile = await userService.getCurrentProfile()
					console.log('Full profile received:', fullProfile)
					// Update user context if we have an updateUser function
					// For now, just log - the slug should be available after re-login
				} catch (error) {
					console.error('Failed to fetch full profile:', error)
				}
			}
		}

		ensureUserHasSlug()
	}, [isOwnProfile, user])

	// Fetch friends (prioritize real users over bots)
	useEffect(() => {
		const fetchSuggestedUsers = async () => {
			if (!profileData?.id) return
			
			try {
				setLoadingSuggestions(true)
				
				// Fetch friends based on whether viewing own profile or another user's profile
				let friendsData
				if (isOwnProfile) {
					// Get current user's friends
					friendsData = await friendService.getFriends(1, 50)
				} else {
					// Get the viewed user's friends
					friendsData = await friendService.getUserFriends(profileData.id, 1, 50)
				}
				
				// Sort friends: real users first, then bots
				const sortedFriends = friendsData.friends.sort((a, b) => {
					if (a.is_bot === b.is_bot) return 0
					return a.is_bot ? 1 : -1 // Real users (is_bot=false) come first
				})
				setSuggestedUsers(sortedFriends)
			} catch (error) {
				console.error('Failed to fetch suggested users:', error)
				setSuggestedUsers([])
			} finally {
				setLoadingSuggestions(false)
			}
		}

		fetchSuggestedUsers()
	}, [profileData?.id, isOwnProfile])

	// Fetch user's posts
	useEffect(() => {
		const fetchUserPosts = async () => {
			if (!profileData?.id) return
			
			try {
				setLoadingPosts(true)
				const postsData = await userService.getUserPosts(profileData.slug || profileData.id, 1, 10)
				setUserPosts(postsData.posts || [])
			} catch (error) {
				console.error('Failed to fetch user posts:', error)
				setUserPosts([])
			} finally {
				setLoadingPosts(false)
			}
		}

		fetchUserPosts()
	}, [profileData?.id, profileData?.slug])

	// Fetch user's communities
	useEffect(() => {
		const fetchUserCommunities = async () => {
			if (!profileData?.id) {
				console.log('[PROFILE] No profileData.id available, skipping community fetch')
				return
			}
			
			try {
				setLoadingCommunities(true)
				const identifier = profileData.slug || profileData.id
				console.log('[PROFILE] ===== FETCHING COMMUNITIES =====')
				console.log('[PROFILE] User ID:', profileData.id)
				console.log('[PROFILE] User slug:', profileData.slug)
				console.log('[PROFILE] Identifier to use:', identifier)
				console.log('[PROFILE] Full profileData:', profileData)
				console.log('[PROFILE] API URL will be:', `/api/users/${identifier}/communities`)
				
				const communities = await userService.getUserCommunities(identifier)
				
				console.log('[PROFILE] ===== COMMUNITIES RECEIVED =====')
				console.log('[PROFILE] Number of communities:', communities?.length || 0)
				console.log('[PROFILE] Communities data:', communities)
				
				setUserCommunities(communities || [])
			} catch (error) {
				console.error('[PROFILE] ===== ERROR FETCHING COMMUNITIES =====')
				console.error('[PROFILE] Error object:', error)
				console.error('[PROFILE] Error detail:', error.detail || error.message)
				console.error('[PROFILE] Error response:', error.response)
				setUserCommunities([])
			} finally {
				setLoadingCommunities(false)
			}
		}

		fetchUserCommunities()
	}, [profileData?.id, profileData?.slug])

	// Fetch friendship status when viewing another user's profile
	useEffect(() => {
		const fetchFriendshipStatus = async () => {
			if (!isOwnProfile && profileData?.id) {
				try {
					const status = await friendService.getFriendshipStatus(profileData.id);
					setFriendshipStatus(status);
				} catch (error) {
					console.error('Failed to fetch friendship status:', error);
				}
			}
		};

		fetchFriendshipStatus();
	}, [isOwnProfile, profileData?.id]);

	// Friendship action handlers
	const handleAddFriend = async () => {
		setFriendshipLoading(true);
		try {
			await friendService.sendFriendRequest(profileData.id);
			// Refresh friendship status
			const status = await friendService.getFriendshipStatus(profileData.id);
			setFriendshipStatus(status);
		} catch (error) {
			alert(error.detail || 'Failed to send friend request');
		} finally {
			setFriendshipLoading(false);
		}
	};

	const handleAcceptFriend = async () => {
		setFriendshipLoading(true);
		try {
			await friendService.acceptFriendRequest(friendshipStatus.friendship_id);
			// Refresh friendship status
			const status = await friendService.getFriendshipStatus(profileData.id);
			setFriendshipStatus(status);
		} catch (error) {
			alert(error.detail || 'Failed to accept friend request');
		} finally {
			setFriendshipLoading(false);
		}
	};

	const handleRejectFriend = async () => {
		setFriendshipLoading(true);
		try {
			await friendService.rejectFriendRequest(friendshipStatus.friendship_id);
			// Refresh friendship status
			setFriendshipStatus({ status: null, friendship_id: null });
		} catch (error) {
			alert(error.detail || 'Failed to reject friend request');
		} finally {
			setFriendshipLoading(false);
		}
	};

	const handleUnfriend = async () => {
		if (!confirm('Are you sure you want to unfriend this user?')) return;
		
		setFriendshipLoading(true);
		try {
			await friendService.unfriend(friendshipStatus.friendship_id);
			// Refresh friendship status
			setFriendshipStatus({ status: null, friendship_id: null });
		} catch (error) {
			alert(error.detail || 'Failed to unfriend');
		} finally {
			setFriendshipLoading(false);
		}
	};

	// Handle opening direct message conversation
	const handleMessage = async () => {
		if (creatingConversation) return;

		// Validate profile data
		if (!profileData || !profileData.id) {
			console.error('Profile data is missing or invalid:', profileData);
			alert('Unable to message this user. Profile data is missing.');
			return;
		}

		try {
			setCreatingConversation(true);

			console.log('Creating conversation with user:', {
				userId: profileData.id,
				userName: profileData.name,
				fullProfileData: profileData
			});

			// Get or create direct conversation
			const conversation = await messageService.createConversation({
				type: 'direct',
				participant_ids: [profileData.id]
			});

			console.log('Conversation created/retrieved:', conversation);

			// Navigate to the conversation
			navigate(`/messages/${conversation.id}`);
		} catch (error) {
			console.error('Error creating conversation:', error);
			console.error('Error detail:', error.detail);
			console.error('Full error object:', JSON.stringify(error, null, 2));
			
			// More detailed error message
			let errorMsg = 'Failed to open conversation. ';
			if (error.detail) {
				errorMsg += error.detail;
			} else if (error.message) {
				errorMsg += error.message;
			} else {
				errorMsg += 'Please try again.';
			}
			alert(errorMsg);
		} finally {
			setCreatingConversation(false);
		}
	};

	if (!isLoggedIn) {
		return <Navigate to="/auth" replace />
	}

	const profile = {
		name: profileData?.name || 'Random',
		avatar: profileData?.avatar || 'https://picsum.photos/300/400?random=12',
		joined: profileData?.joinDate || new Date().toLocaleDateString(),
		status: profileData?.status || translate('profile.single'),
		birthday: profileData?.birthday || '01/01/1999',
		location: profileData?.location || 'Brazil',
		occupation: profileData?.occupation || translate('profile.webDeveloper'),
		bio: profileData?.bio || translate('profile.defaultBio'),
		slug: profileData?.slug
	}

	const displayFriends = suggestedUsers.slice(0, 9) // 3 rows × 3 columns = 9 friends

	// Small utility to format relative time (h, d)
	const formatRelative = (ts) => {
		// Handle ISO string format from backend
		const timestamp = typeof ts === 'string' ? new Date(ts).getTime() : ts
		const diff = Date.now() - timestamp
		const mins = Math.floor(diff / (1000 * 60))
		if (mins < 1) return 'now'
		if (mins < 60) return `${mins}m`
		const hrs = Math.floor(mins / 60)
		if (hrs < 24) return `${hrs}h`
		const days = Math.floor(hrs / 24)
		return `${days}d`
	}

	// calculate age from birthday (YYYY-MM-DD or Date string)
	const calculateAge = (birthday) => {
		if (!birthday) return ''
		const birthDate = new Date(birthday)
		if (Number.isNaN(birthDate.getTime())) return ''
		const today = new Date()
		let age = today.getFullYear() - birthDate.getFullYear()
		const m = today.getMonth() - birthDate.getMonth()
		if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
			age--
		}
		return age
	}

	return (
		<main className="prototype-page page">
		<div className="prototype-container">
			<aside className="profile-sidebar">
				<ProfileHero profile={profile} isOwnProfile={isOwnProfile} />
			</aside>				<section className="profile-main">
					<div className="status-card">
						<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
							<h3 className="status-title" style={{ margin: 0 }}>{translate('profile.aboutMe')}</h3>
							
							{/* Action buttons */}
							{isOwnProfile ? (
								// Show edit button on own profile
								<Link 
									to="/profile/settings?edit=true" 
									className="btn-icon" 
									title="Edit Profile"
									style={{ 
										padding: '8px 12px', 
										borderRadius: '8px', 
										border: '1px solid var(--border-light)',
										background: 'var(--bg-secondary)',
										color: 'var(--text-primary)',
										textDecoration: 'none',
										display: 'flex',
									alignItems: 'center',
									gap: '6px',
									fontSize: '14px',
									transition: 'all 0.2s ease'
								}}
							>
								<i className="fas fa-pencil-alt"></i> {translate('profile.edit')}
								</Link>
							) : (
								// Show Message and Add Friend buttons on other profiles
								<div style={{ display: 'flex', gap: '8px' }}>
									{/* Message Button */}
									<button 
										onClick={handleMessage}
										disabled={creatingConversation}
										className="btn-icon"
										title="Send Message"
										style={{ 
											padding: '8px 12px', 
											borderRadius: '8px', 
											border: '1px solid var(--border-light)',
											background: '#3498db',
											color: 'white',
											cursor: creatingConversation ? 'not-allowed' : 'pointer',
											display: 'flex',
											alignItems: 'center',
											gap: '6px',
											fontSize: '14px',
											transition: 'all 0.2s ease',
										opacity: creatingConversation ? 0.6 : 1
									}}
									>
										<i className="fas fa-comment"></i> {creatingConversation ? translate('profile.opening') : translate('profile.message')}
									</button>

									{/* Unfriend Button (only if already friends) */}
									{friendshipStatus?.status === 'accepted' && (
										<button 
											onClick={handleUnfriend}
											disabled={friendshipLoading}
											className="btn-icon"
											title="Unfriend"
											style={{ 
												padding: '8px 12px', 
												borderRadius: '8px', 
												border: '1px solid var(--border-light)',
												background: '#e74c3c',
												color: 'white',
												cursor: friendshipLoading ? 'not-allowed' : 'pointer',
												display: 'flex',
												alignItems: 'center',
												gap: '6px',
												fontSize: '14px',
												transition: 'all 0.2s ease',
											opacity: friendshipLoading ? 0.6 : 1
										}}
										>
											<i className="fas fa-user-minus"></i> {friendshipLoading ? translate('profile.removing') : translate('profile.unfriend')}
										</button>
									)}

									{/* Add Friend Button (only if not friends and not pending) */}
									{friendshipStatus?.status === null && (
										<button 
											onClick={handleAddFriend}
											disabled={friendshipLoading}
											className="btn-icon"
											title="Add Friend"
											style={{ 
												padding: '8px 12px', 
												borderRadius: '8px', 
												border: '1px solid var(--border-light)',
												background: '#3498db',
												color: 'white',
												cursor: friendshipLoading ? 'not-allowed' : 'pointer',
												display: 'flex',
												alignItems: 'center',
												gap: '6px',
												fontSize: '14px',
												transition: 'all 0.2s ease',
											opacity: friendshipLoading ? 0.6 : 1
										}}
										>
											<i className="fas fa-user-plus"></i> {friendshipLoading ? translate('profile.sending') : translate('profile.addFriend')}
										</button>
									)}

									{/* Friend Request Pending Buttons */}
									{friendshipStatus?.status === 'pending' && (
										<>
											{friendshipStatus?.is_requester ? (
												<button 
													disabled
													className="btn-icon"
													title="Friend Request Sent"
													style={{ 
														padding: '8px 12px', 
														borderRadius: '8px', 
														border: '1px solid var(--border-light)',
														background: 'var(--bg-secondary)',
														color: 'var(--text-secondary)',
														cursor: 'not-allowed',
														display: 'flex',
														alignItems: 'center',
														gap: '6px',
														fontSize: '14px'
													}}
												>
													<i className="fas fa-clock"></i> Request Sent
												</button>
											) : (
												<>
													<button 
														onClick={handleAcceptFriend}
														disabled={friendshipLoading}
														className="btn-icon"
														title="Accept Friend Request"
														style={{ 
															padding: '8px 12px', 
															borderRadius: '8px', 
															border: '1px solid var(--border-light)',
															background: '#27ae60',
															color: 'white',
															cursor: friendshipLoading ? 'not-allowed' : 'pointer',
															display: 'flex',
															alignItems: 'center',
															gap: '6px',
															fontSize: '14px',
															transition: 'all 0.2s ease',
															opacity: friendshipLoading ? 0.6 : 1
														}}
													>
														<i className="fas fa-check"></i> {friendshipLoading ? '...' : 'Accept'}
													</button>
													<button 
														onClick={handleRejectFriend}
														disabled={friendshipLoading}
														className="btn-icon"
														title="Reject Friend Request"
														style={{ 
															padding: '8px 12px', 
															borderRadius: '8px', 
															border: '1px solid var(--border-light)',
															background: '#e74c3c',
															color: 'white',
															cursor: friendshipLoading ? 'not-allowed' : 'pointer',
															display: 'flex',
															alignItems: 'center',
															gap: '6px',
															fontSize: '14px',
															transition: 'all 0.2s ease',
															opacity: friendshipLoading ? 0.6 : 1
														}}
													>
														<i className="fas fa-times"></i> {friendshipLoading ? '...' : 'Reject'}
													</button>
												</>
											)}
										</>
									)}
								</div>
							)}
						</div>
						
						{/* Bio placed at top for clearer reading */}
						<p className="status-bio">{translate('userProfile.bio')}: <span>{profile.bio || translate('profile.defaultBio')}</span></p>

							<hr style={{ color: 'var(--border-medium)' }}/>
						{/* Details toggle section */}
						<div className="details-section">
							<h3 
								className="details-title" 
								onClick={() => setDetailsOpen(!detailsOpen)}
								style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}
							>
								{translate('profile.details') || 'Details'}
								<i className={`fas fa-chevron-${detailsOpen ? 'up' : 'down'}`} style={{ fontSize: '0.8em' }}></i>
							</h3>

							{detailsOpen && (
								<div className="status-grid">
									<div className="status-row">
										<span className="status-label">{translate('profile.birthday')}:</span>
										<span className="status-value">{profile.birthday ? new Date(profile.birthday).toLocaleDateString() : ''}</span>
									</div>
									<div className="status-row">
										<span className="status-label">{translate('profile.age')}:</span>
										<span className="status-value">{profile.birthday ? calculateAge(profile.birthday) : ''}</span>
									</div>
									<div className="status-row">
										<span className="status-label">{translate('profile.status')}:</span>
									<span className="status-value">
										{
											// If status is stored as a key, translate it; otherwise fall back to the stored string
											(() => {
												if (!profile.status) return '--';
												const candidate = translate(`relationship.${profile.status}`);
												return candidate && !candidate.startsWith('relationship.') ? candidate : profile.status;
											})()
										}
									</span>
									</div>
									<div className="status-row">
										<span className="status-label">{translate('profile.location')}:</span>
										<span className="status-value">{profile.location}</span>
									</div>
									<div className="status-row">
										<span className="status-label">{translate('profile.occupation')}:</span>
										<span className="status-value">{profile.occupation}</span>
									</div>
									<div className="status-row">
										<span className="status-label">{translate('userProfile.memberSince')}:</span>
										<span className="status-value">{profile.joined}</span>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* center content - about/interests could go here */}
				</section>

				<aside className="profile-aside">
					{/* Yoble-style friends info-box with connected tabs */}
					<div className="yoble-box info-box">
						<div className="yoble-header">
							<div className="yoble-tabs">
						<button className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}>({suggestedUsers.length}) {translate('profile.friends')}</button>
						<button className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>({userPosts.length}) {translate('userProfile.posts')}</button>
							</div>
						</div>

						<div className="tab-content">
							{activeTab === 'friends' && (
								<>
									{loadingSuggestions ? (
										<div className="tab-card friends-card">
											<p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
												Loading suggested users...
											</p>
										</div>
									) : (
										<div className="tab-card friends-card">
											<div className="profile-friends-grid">
												{displayFriends.map(friend => (
													<div key={friend.id} className="profile-friend-item">
														<Link to={`/profile/${friend.slug || friend.id}`}>
															<img src={friend.avatar} alt={friend.name} className="profile-friend-avatar" />
														<span className="profile-friend-name">
															{friend.name}
														</span>
														</Link>
													</div>
												))}
											</div>

											<div className="friends-footer">
												<Link 
													to={isOwnProfile ? "/friends" : `/profile/${profileData?.slug}/friends`} 
													className="show-more-link"
												>
													{translate('profile.viewAll')} ({suggestedUsers.length})
												</Link>
											</div>
										</div>
									)}
								</>
							)}

							{activeTab === 'posts' && (
								<>
									{loadingPosts ? (
										<div className="tab-card posts-card">
											<p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
												Loading posts...
											</p>
										</div>
									) : userPosts.length === 0 ? (
										<div className="tab-card posts-card">
											<p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
												No posts yet
											</p>
										</div>
									) : (
										<div className="tab-card posts-card">
											<div className="post-list">
												{userPosts.map(post => (
													<div key={post.id} className="post-card">
														<Link to={`/profile/${post.user.slug || post.user.id}`}>
															<img src={post.user.avatar} alt={post.user.name} className="post-userAvatar" />
														</Link>
														<div className="post-content">
															<div className="post-meta">{post.user.name} · <span className="post-date">{formatRelative(post.created_at)}</span></div>
															<div className="post-body">{post.content}</div>
														</div>
													</div>
												))}
											</div>

											{userPosts.length > 0 && (
												<div className="posts-footer">
													<Link to="/feed" className="show-more-link">Ver mais posts</Link>
												</div>
											)}
										</div>
									)}
								</>
							)}
						</div>
					</div>

					{/* community info box below tabs */}
					<div className="info-box">
						<h4>{translate('profile.communities')}</h4>
						{loadingCommunities ? (
							<p>Loading communities...</p>
						) : userCommunities.length === 0 ? (
							<p>Esse usuário ainda não participa de nenhuma comunidade.<br /><Link to={isOwnProfile ? "/communities" : `/profile/${profileData?.slug}/communities`}>{translate('profile.viewAll')}</Link></p>
						) : (
							<>
								<div className="friends-grid" style={{ marginBottom: '12px' }}>
									{userCommunities.slice(0, 4).map(community => (
										<div key={community.id} className="friend-item">
											<Link to={`/communities/${community.id}`}>
												<img 
													src={community.avatar || 'https://picsum.photos/80/80'} 
													alt={community.name} 
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
												{community.name}
											</span>
										</div>
									))}
								</div>
								<Link to={isOwnProfile ? "/communities" : `/profile/${profileData?.slug}/communities`} style={{ fontSize: '14px' }}>
									{translate('profile.viewAll')} ({userCommunities.length})
								</Link>
							</>
						)}
					</div>
				</aside>
			</div>
		</main>
	)
}

