import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUser } from '../../context/UserContext'
import { useLanguage } from '../../context/LanguageContext'
import './ProfileHero.css'

export default function ProfileHero({ profile: propProfile, isOwnProfile = true }) {
	const { user } = useUser()
	const { translate } = useLanguage()
	const location = useLocation()
	const profile = propProfile || {
		name: user?.name || 'Random',
		avatar: user?.avatar || 'https://picsum.photos/300/400?random=12',
		joined: user?.joinDate || new Date().toLocaleDateString()
	}

	// Check if we're already on the main profile page (not in gallery, friends, etc.)
	const isOnMainProfilePage = isOwnProfile 
		? (location.pathname === '/profile' || location.pathname === '/profile/settings')
		: (location.pathname === `/profile/${profile.slug}`);

	return (
		<div className="sidebar-card profile-hero">
			<div className="profile-header">
				<img src={profile.avatar} alt={profile.name} className="profile-avatar" />
				<div className="profile-name-with-status">
					<span className={`status-dot ${profile.onlineStatus || 'online'}`} title={profile.onlineStatus || 'online'}></span>
					{isOnMainProfilePage ? (
						<h2 className="profile-name">{profile.name}</h2>
					) : (
						<Link to={isOwnProfile ? "/profile" : `/profile/${profile.slug}`} className="profile-name-link">
							<h2 className="profile-name">{profile.name}</h2>
						</Link>
					)}
				</div>
		</div>

		<ul className="sidebar-links">
			{isOwnProfile && <li><Link to="/messages">&emsp;{translate('messages.direct')}</Link></li>}
			<li><Link to={isOwnProfile ? "/friends" : `/profile/${profile.slug}/friends`}>&emsp;{translate('profile.friends')}</Link></li>
			<li><Link to={isOwnProfile ? "/profile/gallery" : `/profile/${profile.slug}/gallery`}>&emsp;{translate('profile.photos')}</Link></li>
		</ul>
		</div>
	)
}

