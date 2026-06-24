import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useAlert } from '../../../context/AlertContext';
import { API_BASE_URL } from '../../../config';
import { Settings as SettingsIcon, ShieldAlert, Bell, Lock, ToggleLeft, Save, Moon, Sun, Sliders, DollarSign, Percent, Shield } from 'lucide-react';
import './AdminSettings.css';

const CustomDropdown = ({ options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || { label: value, value };

  return (
    <div className="custom-select-container" ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        className="profile-input-field"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          cursor: 'pointer',
          paddingRight: '16px',
          backgroundImage: 'none'
        }}
      >
        <span>{selectedOption.label}</span>
        <span style={{
          fontSize: '10px',
          opacity: 0.7,
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          color: 'var(--accent-gold)'
        }}>▼</span>
      </button>

      {isOpen && (
        <div className="custom-select-options-list">
          {options.map(opt => (
            <div
              key={opt.value}
              className={`custom-select-option ${value === opt.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminSettings = () => {
  const { theme, toggleTheme } = useTheme();
  const { currentUser } = useAuth();
  const { showAlert } = useAlert();

  const [activeTab, setActiveTab] = useState('general');

  // General Settings State
  const [generalPrefs, setGeneralPrefs] = useState({
    sidebarCompact: false,
    baseCurrency: 'USD',
    mapRefreshInterval: 10
  });

  // Platform settings state
  const [platformPrefs, setPlatformPrefs] = useState({
    platformCommission: 30,
    minFare: 10.00,
    ratingThreshold: 4.50,
    autoApproveDrivers: false
  });

  // Notifications State
  const [notificationPrefs, setNotificationPrefs] = useState({
    smsAlerts: true,
    emailAlerts: true,
    pushNotifications: false
  });

  // Security (Password) Form State
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const saveSettings = async (
    newGeneral = generalPrefs,
    newPlatform = platformPrefs,
    newNotif = notificationPrefs
  ) => {
    if (!currentUser?.id) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sidebarCompact: newGeneral.sidebarCompact,
          baseCurrency: newGeneral.baseCurrency,
          mapRefreshInterval: newGeneral.mapRefreshInterval,
          platformCommission: newPlatform.platformCommission,
          minFare: newPlatform.minFare,
          ratingThreshold: newPlatform.ratingThreshold,
          autoApproveDrivers: newPlatform.autoApproveDrivers,
          smsAlerts: newNotif.smsAlerts,
          emailAlerts: newNotif.emailAlerts,
          pushNotifications: newNotif.pushNotifications
        })
      });
      if (!res.ok) throw new Error('Failed to persist settings in database.');
      
      // Also update local storage for layout/caching
      localStorage.setItem(`sidebarCompact_${currentUser.id}`, newGeneral.sidebarCompact ? 'true' : 'false');
      localStorage.setItem(`adminGeneralPrefs_${currentUser.id}`, JSON.stringify(newGeneral));
      localStorage.setItem(`adminPlatformPrefs_${currentUser.id}`, JSON.stringify(newPlatform));
      localStorage.setItem(`adminNotificationSettings_${currentUser.id}`, JSON.stringify(newNotif));
      
      window.dispatchEvent(new Event('storage'));
      return true;
    } catch (err) {
      console.error('Error saving settings:', err);
      showAlert(err.message || 'Error saving settings.', 'error');
      return false;
    }
  };

  // Load preferences from database/localStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!currentUser?.id) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}/settings`);
        if (res.ok) {
          const data = await res.json();
          const loadedGeneral = {
            sidebarCompact: data.sidebar_compact === 1,
            baseCurrency: data.base_currency || 'USD',
            mapRefreshInterval: data.map_refresh_interval !== null ? data.map_refresh_interval : 10
          };
          const loadedPlatform = {
            platformCommission: data.platform_commission !== null ? data.platform_commission : 30,
            minFare: data.min_fare !== null ? Number(data.min_fare) : 10.00,
            ratingThreshold: data.rating_threshold !== null ? Number(data.rating_threshold) : 4.50,
            autoApproveDrivers: data.auto_approve_drivers === 1
          };
          const loadedNotif = {
            smsAlerts: data.sms_alerts === 1,
            emailAlerts: data.email_alerts === 1,
            pushNotifications: data.push_notifications === 1
          };

          setGeneralPrefs(loadedGeneral);
          setPlatformPrefs(loadedPlatform);
          setNotificationPrefs(loadedNotif);

          localStorage.setItem(`sidebarCompact_${currentUser.id}`, loadedGeneral.sidebarCompact ? 'true' : 'false');
          localStorage.setItem(`adminGeneralPrefs_${currentUser.id}`, JSON.stringify(loadedGeneral));
          localStorage.setItem(`adminPlatformPrefs_${currentUser.id}`, JSON.stringify(loadedPlatform));
          localStorage.setItem(`adminNotificationSettings_${currentUser.id}`, JSON.stringify(loadedNotif));
          window.dispatchEvent(new Event('storage'));
        }
      } catch (err) {
        console.error('Error loading settings from database, falling back to local storage:', err);
        // Fallback to local storage
        const savedGen = localStorage.getItem(`adminGeneralPrefs_${currentUser.id}`);
        const isCompact = localStorage.getItem(`sidebarCompact_${currentUser.id}`) === 'true';
        if (savedGen) {
          setGeneralPrefs(JSON.parse(savedGen));
        } else {
          setGeneralPrefs(prev => ({ ...prev, sidebarCompact: isCompact }));
        }

        const savedPlat = localStorage.getItem(`adminPlatformPrefs_${currentUser.id}`);
        if (savedPlat) {
          setPlatformPrefs(JSON.parse(savedPlat));
        }

        const savedNotifs = localStorage.getItem(`adminNotificationSettings_${currentUser.id}`);
        if (savedNotifs) {
          setNotificationPrefs(JSON.parse(savedNotifs));
        }
      }
    };

    loadSettings();
  }, [currentUser]);

  // Handle Input Changes for general/platform/notifications
  const handleGeneralChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newVal = type === 'checkbox' ? checked : value;
    setGeneralPrefs(prev => {
      const updated = {
        ...prev,
        [name]: newVal
      };
      if (name === 'sidebarCompact') {
        saveSettings(updated, platformPrefs, notificationPrefs);
      }
      return updated;
    });
  };

  const handlePlatformChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newVal = type === 'checkbox' ? checked : value;
    setPlatformPrefs(prev => ({
      ...prev,
      [name]: newVal
    }));
  };

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setNotificationPrefs(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSecurityChange = (e) => {
    const { name, value } = e.target;
    setSecurityForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Submit Handlers
  const saveGeneralSettings = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    const success = await saveSettings(generalPrefs, platformPrefs, notificationPrefs);
    if (success) {
      showAlert('General preferences saved successfully!', 'success');
    }
  };

  const savePlatformSettings = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    const success = await saveSettings(generalPrefs, platformPrefs, notificationPrefs);
    if (success) {
      showAlert('Platform configurations updated.', 'success');
    }
  };

  const saveNotificationSettings = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    const success = await saveSettings(generalPrefs, platformPrefs, notificationPrefs);
    if (success) {
      showAlert('Notification alert control rules updated.', 'success');
    }
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) return;

    const { currentPassword, newPassword, confirmPassword } = securityForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return showAlert('Please fill out all password fields', 'error');
    }

    if (newPassword.length < 6) {
      return showAlert('New password must be at least 6 characters long', 'error');
    }

    if (newPassword !== confirmPassword) {
      return showAlert('New passwords do not match', 'error');
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update credentials');
      }

      showAlert('Password updated successfully!', 'success');
      setSecurityForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      console.error(err);
      showAlert(err.message || 'Error updating password', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="settings-container">
      {/* Header */}
      <div className="settings-header">
        <div className="settings-header-icon">
          <SettingsIcon size={28} />
        </div>
        <div>
          <h1>Advanced Account Settings</h1>
          <p>Configure administrative preferences, base fare guidelines, verification defaults, and dashboard intervals</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="settings-tabs">
        <button
          type="button"
          className={`settings-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <ToggleLeft size={18} />
          <span>General Preferences</span>
        </button>
        <button
          type="button"
          className={`settings-tab-btn ${activeTab === 'platform' ? 'active' : ''}`}
          onClick={() => setActiveTab('platform')}
        >
          <Sliders size={18} />
          <span>Platform Config</span>
        </button>
        <button
          type="button"
          className={`settings-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell size={18} />
          <span>Alert Controls</span>
        </button>
        <button
          type="button"
          className={`settings-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <Lock size={18} />
          <span>Security & Credentials</span>
        </button>
      </div>

      {/* General Settings Panel */}
      {activeTab === 'general' && (
        <form onSubmit={saveGeneralSettings} className="settings-card">
          <div className="settings-section-title-row">
            <ToggleLeft size={20} color="var(--accent-gold)" />
            <h3>General Preferences</h3>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <h4 className="settings-row-title">Color Scheme Mode</h4>
              <p className="settings-row-desc">Toggle between Light and Dark interface modes</p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={`theme-toggle-btn ${theme === 'light' ? 'light' : 'dark'}`}
            >
              {theme === 'light' ? (
                <><Moon size={18} /> Switch to Dark</>
              ) : (
                <><Sun size={18} /> Switch to Light</>
              )}
            </button>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <h4 className="settings-row-title">Compact Sidebar Layout</h4>
              <p className="settings-row-desc">Minimize the sidebar width to show icons only for extra workspace</p>
            </div>
            <label className="switch-container">
              <input
                type="checkbox"
                name="sidebarCompact"
                checked={generalPrefs.sidebarCompact}
                onChange={handleGeneralChange}
              />
              <span className="switch-slider"></span>
            </label>
          </div>

          <div className="settings-row" style={{ display: 'block', borderBottom: 'none' }}>
            <div className="settings-row-text" style={{ marginBottom: '20px' }}>
              <h4 className="settings-row-title">Platform Localization & Refresh Settings</h4>
              <p className="settings-row-desc">Customize default view standards and sync frequencies</p>
            </div>

            <div className="settings-grid-2">
              <div className="form-group-profile">
                <span className="profile-label-text">Platform Base Currency</span>
                <CustomDropdown
                  options={[
                    { value: 'USD', label: 'US Dollar ($)' },
                    { value: 'INR', label: 'Indian Rupee (₹)' },
                    { value: 'EUR', label: 'Euro (€)' },
                    { value: 'GBP', label: 'British Pound (£)' }
                  ]}
                  value={generalPrefs.baseCurrency}
                  onChange={(val) => setGeneralPrefs(prev => ({ ...prev, baseCurrency: val }))}
                />
              </div>

              <div className="form-group-profile">
                <span className="profile-label-text">Metrics Auto-Refresh Interval</span>
                <CustomDropdown
                  options={[
                    { value: 5, label: '5 Seconds' },
                    { value: 10, label: '10 Seconds (Default)' },
                    { value: 30, label: '30 Seconds' },
                    { value: 60, label: '60 Seconds' }
                  ]}
                  value={generalPrefs.mapRefreshInterval}
                  onChange={(val) => setGeneralPrefs(prev => ({ ...prev, mapRefreshInterval: Number(val) }))}
                />
              </div>
            </div>
          </div>

          <div className="settings-actions-row">
            <button type="submit" className="profile-btn-primary">
              <Save size={16} /> Save Preferences
            </button>
          </div>
        </form>
      )}

      {/* Platform Config Tab */}
      {activeTab === 'platform' && (
        <form onSubmit={savePlatformSettings} className="settings-card">
          <div className="settings-section-title-row">
            <Sliders size={20} color="var(--accent-gold)" />
            <h3>Platform Config Guidelines</h3>
          </div>

          <div className="settings-row" style={{ display: 'block', paddingBottom: '20px' }}>
            <div className="settings-row-text" style={{ marginBottom: '16px' }}>
              <h4 className="settings-row-title">Platform Revenue Commission Rate</h4>
              <p className="settings-row-desc">Percentage of booking fee retained by the platform (Driver receives remaining amount)</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', maxWidth: '500px', marginTop: '12px' }}>
              <input
                type="range"
                name="platformCommission"
                min="0"
                max="100"
                step="1"
                value={platformPrefs.platformCommission}
                onChange={handlePlatformChange}
                style={{ flex: 1, accentColor: 'var(--accent-gold)', height: '6px', borderRadius: '3px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-gold)', minWidth: '55px', textAlign: 'right' }}>
                {platformPrefs.platformCommission}%
              </span>
            </div>
          </div>

          <div className="settings-row" style={{ display: 'block', paddingBottom: '20px' }}>
            <div className="settings-row-text" style={{ marginBottom: '16px' }}>
              <h4 className="settings-row-title">Minimum Ride Base Fare</h4>
              <p className="settings-row-desc">The lowest price limit allowed for booking requests across the platform</p>
            </div>
            <div className="form-group-profile" style={{ maxWidth: '300px' }}>
              <span className="profile-label-text">Base Fare Limit ({generalPrefs.baseCurrency === 'INR' ? '₹' : generalPrefs.baseCurrency === 'EUR' ? '€' : generalPrefs.baseCurrency === 'GBP' ? '£' : '$'})</span>
              <input
                type="number"
                name="minFare"
                min="1"
                step="0.01"
                value={platformPrefs.minFare}
                onChange={handlePlatformChange}
                className="profile-input-field"
                placeholder="e.g. 10.00"
              />
            </div>
          </div>

          <div className="settings-row" style={{ display: 'block', paddingBottom: '20px' }}>
            <div className="settings-row-text" style={{ marginBottom: '16px' }}>
              <h4 className="settings-row-title">Driver Auto-Flag Safety Rating</h4>
              <p className="settings-row-desc">Minimum driver rating required. Drivers falling below this score will be highlighted in driver management reviews</p>
            </div>
            <div className="form-group-profile" style={{ maxWidth: '300px' }}>
              <span className="profile-label-text">Rating Threshold</span>
              <CustomDropdown
                options={[
                  { value: 4.00, label: '4.00 Stars' },
                  { value: 4.30, label: '4.30 Stars' },
                  { value: 4.50, label: '4.50 Stars (Recommended)' },
                  { value: 4.70, label: '4.70 Stars' },
                  { value: 4.80, label: '4.80 Stars' }
                ]}
                value={platformPrefs.ratingThreshold}
                onChange={(val) => setPlatformPrefs(prev => ({ ...prev, ratingThreshold: Number(val) }))}
              />
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <h4 className="settings-row-title">Automatic Driver Verification Bypass</h4>
              <p className="settings-row-desc">Instantly approve driver accounts upon signup instead of routing them to pending status for manual administrative reviews</p>
            </div>
            <label className="switch-container">
              <input
                type="checkbox"
                name="autoApproveDrivers"
                checked={platformPrefs.autoApproveDrivers}
                onChange={handlePlatformChange}
              />
              <span className="switch-slider"></span>
            </label>
          </div>

          <div className="settings-actions-row">
            <button type="submit" className="profile-btn-primary">
              <Save size={16} /> Save Configurations
            </button>
          </div>
        </form>
      )}

      {/* Notifications Alert Control Tab */}
      {activeTab === 'notifications' && (
        <form onSubmit={saveNotificationSettings} className="settings-card">
          <div className="settings-section-title-row">
            <Bell size={20} color="var(--accent-gold)" />
            <h3>Notification Alert Control</h3>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <h4 className="settings-row-title">SMS Notifications for SOS Alerts</h4>
              <p className="settings-row-desc">Receive immediate automated SMS alerts on admin mobile phones whenever an emergency SOS is triggered on a trip</p>
            </div>
            <label className="switch-container">
              <input
                type="checkbox"
                name="smsAlerts"
                checked={notificationPrefs.smsAlerts}
                onChange={handleNotificationChange}
              />
              <span className="switch-slider"></span>
            </label>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <h4 className="settings-row-title">Push Notifications for Document Review</h4>
              <p className="settings-row-desc">Display active desktop notification banners when pending drivers submit new verification documents</p>
            </div>
            <label className="switch-container">
              <input
                type="checkbox"
                name="pushNotifications"
                checked={notificationPrefs.pushNotifications}
                onChange={handleNotificationChange}
              />
              <span className="switch-slider"></span>
            </label>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <h4 className="settings-row-title">Weekly Administrative Email Summary</h4>
              <p className="settings-row-desc">Receive weekly platform statistics, total commissions earned, and payout cashout summaries in the registered inbox</p>
            </div>
            <label className="switch-container">
              <input
                type="checkbox"
                name="emailAlerts"
                checked={notificationPrefs.emailAlerts}
                onChange={handleNotificationChange}
              />
              <span className="switch-slider"></span>
            </label>
          </div>

          <div className="settings-actions-row">
            <button type="submit" className="profile-btn-primary">
              <Save size={16} /> Save Alerts Settings
            </button>
          </div>
        </form>
      )}

      {/* Security Credentials Tab */}
      {activeTab === 'security' && (
        <form onSubmit={handlePasswordChangeSubmit} className="settings-card">
          <div className="settings-section-title-row">
            <Lock size={20} color="var(--accent-gold)" />
            <h3>Change Security Credentials</h3>
          </div>

          <div className="profile-edit-grid" style={{ marginBottom: '24px' }}>
            <div className="form-group-profile">
              <span className="profile-label-text">Current Account Password</span>
              <input
                type="password"
                name="currentPassword"
                value={securityForm.currentPassword}
                onChange={handleSecurityChange}
                className="profile-input-field"
                placeholder="Enter current password"
              />
            </div>

            <div className="form-group-profile">
              <span className="profile-label-text">New Account Password</span>
              <input
                type="password"
                name="newPassword"
                value={securityForm.newPassword}
                onChange={handleSecurityChange}
                className="profile-input-field"
                placeholder="At least 6 characters"
              />
            </div>

            <div className="form-group-profile">
              <span className="profile-label-text">Confirm New Account Password</span>
              <input
                type="password"
                name="confirmPassword"
                value={securityForm.confirmPassword}
                onChange={handleSecurityChange}
                className="profile-input-field"
                placeholder="Repeat new password"
              />
            </div>
          </div>

          <div className="settings-actions-row">
            <button type="submit" className="profile-btn-primary" disabled={isChangingPassword}>
              {isChangingPassword ? (
                <>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} /> Update Password
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AdminSettings;
