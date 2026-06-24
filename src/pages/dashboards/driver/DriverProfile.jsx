import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../context/AuthContext';
import { useAlert } from '../../../context/AlertContext';
import { API_BASE_URL } from '../../../config';
import { User, Mail, Phone, Calendar, CreditCard, Award, ShieldCheck, Save, X, Camera, Upload, RotateCcw } from 'lucide-react';
import './DriverProfile.css';

const AVATAR_COLORS = [
  { name: 'Red', value: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)' },
  { name: 'Gold', value: 'linear-gradient(135deg, #d4af37 0%, #b5952f 100%)' },
  { name: 'Green', value: 'linear-gradient(135deg, #10b981 0%, #065f46 100%)' },
  { name: 'Blue', value: 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)' },
  { name: 'Purple', value: 'linear-gradient(135deg, #8b5cf6 0%, #5b21b6 100%)' },
  { name: 'Orange', value: 'linear-gradient(135deg, #f97316 0%, #9a3412 100%)' }
];

const DriverProfile = () => {
  const { currentUser, login } = useAuth();
  const { showAlert } = useAlert();

  const [profileData, setProfileData] = useState(null);
  const [metrics, setMetrics] = useState({
    totalBookings: 0,
    walletBalance: 0,
    rewardPoints: 0,
    activeReports: 0
  });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Avatar States
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarStyle, setAvatarStyle] = useState({
    type: 'initials',
    url: '',
    color: 'linear-gradient(135deg, #d4af37 0%, #b5952f 100%)'
  });

  // Modal active tab: 'presets' | 'local' | 'online'
  const [activeTab, setActiveTab] = useState('presets');
  
  // Photo uploads / url input states
  const [localFileBase64, setLocalFileBase64] = useState('');
  const [onlineUrlInput, setOnlineUrlInput] = useState('');
  const [imagePreviewError, setImagePreviewError] = useState(false);

  useEffect(() => {
    if (currentUser?.id) {
      // Load avatar styles
      const type = localStorage.getItem(`avatarType_${currentUser.id}`) || 'initials';
      const url = localStorage.getItem(`avatarUrl_${currentUser.id}`) || '';
      const color = localStorage.getItem(`avatarColor_${currentUser.id}`) || 'linear-gradient(135deg, #d4af37 0%, #b5952f 100%)';
      setAvatarStyle({ type, url, color });
      
      fetchProfile();
    }
  }, [currentUser]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}`);
      if (!res.ok) throw new Error('Failed to fetch profile data');
      const data = await res.json();
      
      setProfileData(data.user);
      setMetrics(data.metrics);
      setFormData({
        firstName: data.user.firstName || '',
        lastName: data.user.lastName || '',
        email: data.user.email || ''
      });

      // Synchronize avatar from database
      if (data.user.profilePhoto) {
        let parsedAvatar = null;
        if (data.user.profilePhoto.startsWith('{') && data.user.profilePhoto.endsWith('}')) {
          try {
            parsedAvatar = JSON.parse(data.user.profilePhoto);
          } catch (e) {
            console.error('Failed to parse profile photo JSON:', e);
          }
        }
        
        if (parsedAvatar && (parsedAvatar.type || parsedAvatar.url || parsedAvatar.color)) {
          const type = parsedAvatar.type || 'initials';
          const url = parsedAvatar.url || '';
          const color = parsedAvatar.color || 'linear-gradient(135deg, #d4af37 0%, #b5952f 100%)';
          
          localStorage.setItem(`avatarType_${currentUser.id}`, type);
          localStorage.setItem(`avatarUrl_${currentUser.id}`, url);
          localStorage.setItem(`avatarColor_${currentUser.id}`, color);
          setAvatarStyle({ type, url, color });
        } else {
          // Fallback if database photo is a raw URL or base64 string
          localStorage.setItem(`avatarType_${currentUser.id}`, 'url');
          localStorage.setItem(`avatarUrl_${currentUser.id}`, data.user.profilePhoto);
          localStorage.setItem(`avatarColor_${currentUser.id}`, 'linear-gradient(135deg, #d4af37 0%, #b5952f 100%)');
          setAvatarStyle({
            type: 'url',
            url: data.user.profilePhoto,
            color: 'linear-gradient(135deg, #d4af37 0%, #b5952f 100%)'
          });
        }
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err) {
      console.error(err);
      showAlert('Error loading profile details', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.firstName.trim()) {
      return showAlert('First name is required', 'error');
    }
    
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim()
        })
      });

      if (!res.ok) throw new Error('Failed to update profile');
      
      login({
        ...currentUser,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim()
      });

      await fetchProfile();
      setIsEditing(false);
      showAlert('Profile updated successfully!', 'success');
    } catch (err) {
      console.error(err);
      showAlert('Failed to update profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const saveAvatarToDb = async (newStyle) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profilePhoto: JSON.stringify(newStyle)
        })
      });
      if (!res.ok) throw new Error('Failed to save avatar to database');
    } catch (err) {
      console.error('Error saving avatar to database:', err);
    }
  };

  // Preset Select handler
  const handleSelectPresetColor = (colorValue) => {
    const newStyle = { type: 'initials', url: '', color: colorValue };
    localStorage.setItem(`avatarType_${currentUser.id}`, 'initials');
    localStorage.setItem(`avatarColor_${currentUser.id}`, colorValue);
    setAvatarStyle(newStyle);
    setIsAvatarModalOpen(false);
    window.dispatchEvent(new Event('storage'));
    showAlert('Avatar color style updated.', 'success');
    saveAvatarToDb(newStyle);
  };

  // Local File upload handler
  const handleLocalFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return showAlert('Please select an image file', 'error');
    }

    // Limit image size to 2MB to ensure local storage doesn't exceed quota
    if (file.size > 2 * 1024 * 1024) {
      return showAlert('Image size is too large. Please select a photo smaller than 2MB.', 'error');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setLocalFileBase64(event.target.result);
    };
    reader.onerror = () => {
      showAlert('Error reading file', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleApplyLocalPhoto = () => {
    if (!localFileBase64) {
      return showAlert('No photo selected. Please choose a local image file.', 'error');
    }

    const newStyle = { type: 'url', url: localFileBase64, color: avatarStyle.color };
    localStorage.setItem(`avatarType_${currentUser.id}`, 'url');
    localStorage.setItem(`avatarUrl_${currentUser.id}`, localFileBase64);
    setAvatarStyle(newStyle);
    setIsAvatarModalOpen(false);
    window.dispatchEvent(new Event('storage'));
    showAlert('Local photo applied as your avatar!', 'success');
    saveAvatarToDb(newStyle);
  };

  // Online photo handler
  const handleApplyOnlineUrl = () => {
    if (!onlineUrlInput.trim()) {
      return showAlert('Please enter an image URL', 'error');
    }
    if (imagePreviewError) {
      return showAlert('The URL does not resolve to a valid image or failed to load.', 'error');
    }

    const finalUrl = onlineUrlInput.trim();
    const newStyle = { type: 'url', url: finalUrl, color: avatarStyle.color };
    localStorage.setItem(`avatarType_${currentUser.id}`, 'url');
    localStorage.setItem(`avatarUrl_${currentUser.id}`, finalUrl);
    setAvatarStyle(newStyle);
    setIsAvatarModalOpen(false);
    window.dispatchEvent(new Event('storage'));
    showAlert('Online photo applied as your avatar!', 'success');
    saveAvatarToDb(newStyle);
  };

  // Reset to default/initials
  const handleResetToInitials = () => {
    const color = avatarStyle.color || 'linear-gradient(135deg, #d4af37 0%, #b5952f 100%)';
    const newStyle = { type: 'initials', url: '', color };
    localStorage.setItem(`avatarType_${currentUser.id}`, 'initials');
    setAvatarStyle(newStyle);
    setIsAvatarModalOpen(false);
    window.dispatchEvent(new Event('storage'));
    showAlert('Avatar reset to profile initials.', 'info');
    saveAvatarToDb(newStyle);
  };

  const handleCancelEdit = () => {
    if (profileData) {
      setFormData({
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        email: profileData.email || ''
      });
    }
    setIsEditing(false);
  };

  if (!profileData) {
    return (
      <div className="profile-container" style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
        <div style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>Loading Profile...</div>
      </div>
    );
  }

  const userInitials = profileData.firstName ? (profileData.firstName.charAt(0) + (profileData.lastName ? profileData.lastName.charAt(0) : '')).toUpperCase() : 'U';

  const memberSince = profileData.createdAt 
    ? new Date(profileData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : 'N/A';

  const renderProfileAvatar = () => {
    if (avatarStyle.type === 'url' && avatarStyle.url) {
      return (
        <img 
          src={avatarStyle.url} 
          alt="Profile Avatar" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
      );
    }
    return userInitials;
  };

  return (
    <div className="profile-container">
      {/* Header */}
      <div className="profile-header">
        <div className="profile-header-icon">
          <User size={28} />
        </div>
        <div>
          <h1>My Account Profile</h1>
          <p>Manage your account settings, security details, and verify statistics</p>
        </div>
      </div>

      <div className="profile-grid-layout">
        {/* Sidebar Info Summary Card */}
        <div className="user-info-overview-card">
          <div className="profile-avatar-wrapper" onClick={() => {
            setLocalFileBase64('');
            setOnlineUrlInput(avatarStyle.type === 'url' && !avatarStyle.url.startsWith('data:') ? avatarStyle.url : '');
            setImagePreviewError(false);
            setIsAvatarModalOpen(true);
          }}>
            <div 
              className="profile-avatar-main" 
              style={{ 
                background: avatarStyle.type === 'url' ? 'transparent' : avatarStyle.color, 
                color: '#000' 
              }}
            >
              {renderProfileAvatar()}
            </div>
            <div className="avatar-edit-overlay">
              <Camera size={18} />
              <span>Change Photo</span>
            </div>
          </div>

          <h2 className="user-title-name">{`${profileData.firstName} ${profileData.lastName || ''}`}</h2>
          <div className="user-role-badge">{profileData.role}</div>

          <div className="user-meta-details-list">
            <div className="meta-detail-row">
              <div className="meta-icon-container">
                <Phone size={18} />
              </div>
              <div className="meta-info-text">
                <span>Phone Number</span>
                <span>{profileData.phoneNumber}</span>
              </div>
            </div>

            <div className="meta-detail-row">
              <div className="meta-icon-container">
                <Mail size={18} />
              </div>
              <div className="meta-info-text">
                <span>Email Address</span>
                <span>{profileData.email || 'No email provided'}</span>
              </div>
            </div>

            <div className="meta-detail-row">
              <div className="meta-icon-container">
                <Calendar size={18} />
              </div>
              <div className="meta-info-text">
                <span>Member Since</span>
                <span>{memberSince}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form and Stats Panel */}
        <div className="profile-main-content-panel">
          {/* Stats Dashboard Grid */}
          <div className="metrics-summary-grid">
            <div className="metric-stat-card">
              <div className="metric-card-header">
                <span className="metric-label">Total Bookings</span>
                <div className="metric-icon-box">
                  <Calendar size={20} />
                </div>
              </div>
              <div className="metric-card-value">
                <span className="metric-number">{metrics.totalBookings}</span>
                <span className="metric-label">Completed & Upcoming</span>
              </div>
            </div>

            <div className="metric-stat-card gold-style">
              <div className="metric-card-header">
                <span className="metric-label">Wallet Balance</span>
                <div className="metric-icon-box">
                  <CreditCard size={20} />
                </div>
              </div>
              <div className="metric-card-value">
                <span className="metric-number">${Number(metrics.walletBalance).toFixed(2)}</span>
                <span className="metric-label">Available Funds</span>
              </div>
            </div>
            <div className="metric-stat-card">
              <div className="metric-card-header">
                <span className="metric-label">Safety Rating</span>
                <div className="metric-icon-box">
                  <ShieldCheck size={20} />
                </div>
              </div>
              <div className="metric-card-value">
                <span className="metric-number" style={{ color: metrics.activeReports > 0 ? '#ef4444' : '#10b981' }}>
                  {metrics.activeReports > 0 ? 'Review' : 'Excellent'}
                </span>
                <span className="metric-label">{metrics.activeReports > 0 ? `${metrics.activeReports} Active Issue(s)` : '0 safety issues reported'}</span>
              </div>
            </div>
          </div>

          {/* Edit Form Card */}
          <div className="profile-edit-form-card">
            <div className="profile-card-header-row">
              <h3>Personal Specifications</h3>
              {!isEditing && (
                <button className="profile-btn-secondary" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </button>
              )}
            </div>

            <form onSubmit={handleSave}>
              <div className="profile-edit-grid">
                <div className="form-group-profile">
                  <span className="profile-label-text">First Name</span>
                  <input
                    type="text"
                    name="firstName"
                    className="profile-input-field"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Enter your first name"
                  />
                </div>

                <div className="form-group-profile">
                  <span className="profile-label-text">Last Name</span>
                  <input
                    type="text"
                    name="lastName"
                    className="profile-input-field"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Enter your last name"
                  />
                </div>

                <div className="form-group-profile">
                  <span className="profile-label-text">Email Address</span>
                  <input
                    type="email"
                    name="email"
                    className="profile-input-field"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Enter your email address"
                  />
                </div>

                <div className="form-group-profile">
                  <span className="profile-label-text">Phone Number (Account UID)</span>
                  <input
                    type="text"
                    className="profile-input-field"
                    value={profileData.phoneNumber}
                    disabled
                  />
                </div>
              </div>

              {isEditing && (
                <div className="profile-form-actions-row">
                  <button type="button" className="profile-btn-secondary" onClick={handleCancelEdit} disabled={isSaving}>
                    Cancel
                  </button>
                  <button type="submit" className="profile-btn-primary" disabled={isSaving}>
                    {isSaving ? 'Saving Changes...' : (
                      <>
                        <Save size={16} /> Save Specifications
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Preset avatar photo upload selector modal */}
      {isAvatarModalOpen && createPortal(
        <div className="profile-modal-overlay">
          <div className="profile-modal-content">
            <div className="profile-modal-header">
              <h2>Customize Profile Avatar</h2>
              <button className="profile-modal-close-btn" onClick={() => setIsAvatarModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="modal-tabs">
              <button 
                type="button" 
                className={`modal-tab-btn ${activeTab === 'presets' ? 'active' : ''}`}
                onClick={() => setActiveTab('presets')}
              >
                Gradients
              </button>
              <button 
                type="button" 
                className={`modal-tab-btn ${activeTab === 'local' ? 'active' : ''}`}
                onClick={() => setActiveTab('local')}
              >
                Local Upload
              </button>
              <button 
                type="button" 
                className={`modal-tab-btn ${activeTab === 'online' ? 'active' : ''}`}
                onClick={() => setActiveTab('online')}
              >
                Online URL
              </button>
            </div>

            {/* Tab contents */}
            <div className="tab-content-wrapper">
              {activeTab === 'presets' && (
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                    Choose a color gradient to display your user initials.
                  </p>
                  <div className="avatar-preset-grid">
                    {AVATAR_COLORS.map(color => (
                      <button
                        key={color.name}
                        className={`preset-avatar-option ${avatarStyle.type === 'initials' && avatarStyle.color === color.value ? 'selected' : ''}`}
                        style={{ background: color.value, color: '#000' }}
                        onClick={() => handleSelectPresetColor(color.value)}
                        title={color.name}
                      >
                        {userInitials}
                      </button>
                    ))}
                  </div>
                  {avatarStyle.type === 'url' && (
                    <button 
                      type="button" 
                      onClick={handleResetToInitials}
                      className="profile-btn-secondary" 
                      style={{ width: '100%', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <RotateCcw size={16} /> Reset to Initials
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'local' && (
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>
                    Upload an image file (JPG, PNG, WebP) from your machine.
                  </p>
                  
                  {!localFileBase64 ? (
                    <label className="file-upload-drag-area" htmlFor="avatar-file-input">
                      <Upload size={28} color="var(--accent-gold)" />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>Click to Select File</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Max size: 2MB</span>
                      <input 
                        type="file" 
                        id="avatar-file-input" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={handleLocalFileChange} 
                      />
                    </label>
                  ) : (
                    <div className="avatar-preview-container">
                      <img 
                        src={localFileBase64} 
                        alt="Local Preview" 
                        className="avatar-preview-circle" 
                      />
                      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                        <button 
                          type="button" 
                          className="profile-btn-secondary" 
                          style={{ flex: 1 }}
                          onClick={() => setLocalFileBase64('')}
                        >
                          Clear Choice
                        </button>
                        <button 
                          type="button" 
                          className="profile-btn-primary" 
                          style={{ flex: 1, justifyContent: 'center' }}
                          onClick={handleApplyLocalPhoto}
                        >
                          Apply Photo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'online' && (
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '12px' }}>
                    Paste a link to any image hosting service.
                  </p>

                  <div className="form-group-profile" style={{ gap: '6px' }}>
                    <span className="profile-label-text">Image Web Address</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        className="profile-input-field" 
                        placeholder="https://example.com/photo.jpg" 
                        value={onlineUrlInput} 
                        onChange={(e) => {
                          setOnlineUrlInput(e.target.value);
                          setImagePreviewError(false);
                        }} 
                      />
                    </div>
                  </div>

                  {onlineUrlInput.trim() && (
                    <div className="avatar-preview-container" style={{ marginTop: '16px' }}>
                      {!imagePreviewError ? (
                        <img 
                          src={onlineUrlInput.trim()} 
                          alt="Online Preview" 
                          className="avatar-preview-circle" 
                          onError={() => setImagePreviewError(true)}
                        />
                      ) : (
                        <div style={{ color: '#ff4444', fontSize: '12px', textAlign: 'center', padding: '10px' }}>
                          ⚠️ Image URL failed to resolve. Please double check the link address.
                        </div>
                      )}
                      
                      {!imagePreviewError && (
                        <button 
                          type="button" 
                          className="profile-btn-primary" 
                          style={{ width: '100%', justifyContent: 'center' }}
                          onClick={handleApplyOnlineUrl}
                        >
                          Apply Online URL
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DriverProfile;
