import React, { useState, useEffect } from 'react';
import { useUser } from '../../../context/UserContext';
import { useTheme } from '../../../context/ThemeContext';
import { useLanguage } from '../../../context/LanguageContext';
import { Navigate, Link, useParams } from 'react-router-dom';
import photoService from '../../../services/photoService';
import userService from '../../../services/userService';
import './Gallery.css';
import ProfileHero from '../../../components/Profile/ProfileHero'

function Gallery() {
  const { user, isLoggedIn } = useUser();
  const { slug } = useParams(); // Get slug from URL if viewing another user's gallery
  const { theme } = useTheme();
  const { translate } = useLanguage();

  // Redirect if not logged in
  if (!isLoggedIn) {
    return <Navigate to="/auth" replace />;
  }

  const isOwnProfile = !slug || slug === user?.slug;
  const [profileUser, setProfileUser] = useState(null);
  const [allPhotos, setAllPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  // Load profile user if viewing another user's gallery
  useEffect(() => {
    const fetchProfileUser = async () => {
      if (slug && !isOwnProfile) {
        try {
          const userData = await userService.getUser(slug);
          setProfileUser(userData);
        } catch (error) {
          console.error('Failed to fetch profile user:', error);
        }
      }
    };
    fetchProfileUser();
  }, [slug, isOwnProfile]);

  // Load photos from backend
  useEffect(() => {
    const loadPhotos = async () => {
      const displayUser = isOwnProfile ? user : profileUser;
      if (!displayUser) return;
      
      try {
        setLoading(true);
        setError(null);
        const data = await photoService.getUserPhotos(displayUser.id, 1, 100);
        
        // Transform backend data to match component structure
        const photos = data.photos.map(photo => ({
          id: photo.id,
          url: `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${photo.url}`,
          caption: photo.caption || `Photo ${photo.id}`,
          date: new Date(photo.created_at).toLocaleDateString()
        }));
        
        setAllPhotos(photos);
      } catch (err) {
        console.error('Error loading photos:', err);
        setError('Failed to load photos');
        // Fallback to mock data if API fails
        setAllPhotos(Array.from({ length: 12 }, (_, i) => ({
          id: i + 1,
          url: `https://picsum.photos/300/300?random=${i + 1}`,
          caption: `Photo ${i + 1}`,
          date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toLocaleDateString()
        })));
      } finally {
        setLoading(false);
      }
    };

    loadPhotos();
  }, [user, profileUser, isOwnProfile]);

  const openModal = (photo) => {
    setSelectedPhoto(photo);
  };

  const closeModal = () => {
    setSelectedPhoto(null);
  };

  const handleAddPhoto = () => {
    setShowUploadModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setUploadFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile) {
      alert(translate('gallery.selectPhotoAlert'));
      return;
    }

    try {
      setUploading(true);
      
      // Upload photo to backend
      const uploadedPhoto = await photoService.uploadPhoto(uploadFile, uploadCaption);
      
      // Add new photo to the gallery
      const newPhoto = {
        id: uploadedPhoto.id,
        url: `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${uploadedPhoto.url}`,
        caption: uploadedPhoto.caption || `Photo ${uploadedPhoto.id}`,
        date: new Date(uploadedPhoto.created_at).toLocaleDateString()
      };
      
      setAllPhotos([newPhoto, ...allPhotos]);
      
      alert(translate('gallery.uploadSuccess').replace('{caption}', uploadCaption || 'Untitled'));
      
      // Reset and close
      handleUploadCancel();
    } catch (error) {
      console.error('Upload failed:', error);
      alert(error.response?.data?.detail || translate('gallery.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleUploadCancel = () => {
    setShowUploadModal(false);
    setUploadFile(null);
    setUploadPreview(null);
    setUploadCaption('');
  };

  const displayUser = isOwnProfile ? user : profileUser;
  const profile = {
    name: displayUser?.name || 'Demo User',
    avatar: displayUser?.avatar || 'https://picsum.photos/300/400?random=12',
    joined: displayUser?.joinDate || new Date().toLocaleDateString(),
    slug: displayUser?.slug
  }

  if (loading) {
    return (
      <div className="page">
        <div className="gallery-container">
          <aside className="profile-sidebar">
            <ProfileHero profile={profile} isOwnProfile={isOwnProfile} />
          </aside>
          <section className="gallery-main">
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p>{translate('gallery.loadingPhotos')}</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
        <div className="gallery-container">
          <aside className="profile-sidebar">
            <ProfileHero profile={profile} isOwnProfile={isOwnProfile} />
          </aside>

          <section className="gallery-main">
            {/* Header */}
            <div className="gallery-header">
              <div className="gallery-nav">
                <Link to={isOwnProfile ? "/profile" : `/profile/${displayUser?.slug}`} className="back-link">
                  <i className="fas fa-arrow-left"></i>
                </Link>
              </div>
              <h1 className="gallery-title">{translate('gallery.photosTitle').replace('{name}', displayUser?.name || 'User')}</h1>
              {isOwnProfile && (
                <button className="btn-secondary" onClick={handleAddPhoto}>
                  <i className="fas fa-plus"></i> {translate('gallery.addPhoto')}
                </button>
              )}
            </div>

            <p className="gallery-subtitle">{translate('gallery.photosCount').replace('{count}', allPhotos.length)}</p>

            {/* Photo Grid */}
            {allPhotos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                <i className="fas fa-images" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}></i>
                <p>{translate('gallery.noPhotos')}</p>
                <p style={{ fontSize: '0.9rem' }}>{translate('gallery.uploadFirst')}</p>
              </div>
            ) : (
              <div className="gallery-grid">
              {allPhotos.map(photo => (
                <div 
                  key={photo.id} 
                  className="gallery-item"
                  onClick={() => openModal(photo)}
                >
                  <img src={photo.url} alt={photo.caption} className="gallery-image" />
                  <div className="photo-overlay">
                    <span className="photo-date">{photo.date}</span>
                  </div>
                </div>
              ))}
              </div>
            )}

            {/* Modal */}
            {selectedPhoto && (
              <div className="photo-modal" onClick={closeModal}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <button className="modal-close" onClick={closeModal}>×</button>
                  <img 
                    src={selectedPhoto.url} 
                    alt={selectedPhoto.caption} 
                    className="modal-image" 
                  />
                  <div className="modal-info">
                    <h3>{selectedPhoto.caption}</h3>
                    <p>{translate('gallery.uploadedOn')} {selectedPhoto.date}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
              <div className="photo-modal" onClick={handleUploadCancel}>
                <div className="modal-content upload-modal" onClick={(e) => e.stopPropagation()}>
                  <button className="modal-close" onClick={handleUploadCancel}>×</button>
                  <div className="upload-content">
                    <h2>{translate('gallery.addNewPhoto')}</h2>
                    
                    {!uploadPreview ? (
                      <div className="upload-area">
                        <label htmlFor="photo-upload" className="upload-label">
                          <i className="fas fa-cloud-upload-alt" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
                          <p>{translate('gallery.selectPhoto')}</p>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{translate('gallery.fileTypes')}</p>
                        </label>
                        <input 
                          id="photo-upload"
                          type="file" 
                          accept="image/*"
                          onChange={handleFileChange}
                          style={{ display: 'none' }}
                        />
                      </div>
                    ) : (
                      <div className="upload-preview">
                        <img src={uploadPreview} alt="Preview" />
                        <button 
                          className="change-photo-btn"
                          onClick={() => {
                            setUploadFile(null);
                            setUploadPreview(null);
                          }}
                        >
                          <i className="fas fa-sync-alt"></i> {translate('gallery.changePhoto')}
                        </button>
                      </div>
                    )}

                    <div className="upload-caption">
                      <label htmlFor="photo-caption">{translate('gallery.caption')}</label>
                      <input
                        id="photo-caption"
                        type="text"
                        placeholder={translate('gallery.captionPlaceholder')}
                        value={uploadCaption}
                        onChange={(e) => setUploadCaption(e.target.value)}
                        maxLength={100}
                      />
                    </div>

                    <div className="upload-actions">
                      <button className="btn-secondary" onClick={handleUploadCancel}>
                        {translate('gallery.cancel')}
                      </button>
                      <button 
                        className="btn" 
                        onClick={handleUploadSubmit}
                        disabled={!uploadFile || uploading}
                      >
                        <i className="fas fa-upload"></i> {uploading ? translate('gallery.uploading') : translate('gallery.uploadPhoto')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
    </div>
  );
}

export default Gallery;