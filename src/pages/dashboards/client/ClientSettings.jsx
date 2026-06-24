import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import { useAlert } from '../../../context/AlertContext';
import { API_BASE_URL } from '../../../config';
import { Settings as SettingsIcon, ShieldAlert, Bell, Lock, ToggleLeft, Save, Moon, Sun } from 'lucide-react';
import './ClientSettings.css';

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

const ClientSettings = () => {
  const { theme, toggleTheme } = useTheme();
  const { currentUser } = useAuth();
  const { showAlert } = useAlert();

  const [activeTab, setActiveTab] = useState('general');

  // General Settings State
  const [generalPrefs, setGeneralPrefs] = useState({
    sidebarCompact: false,
    dutyType: 'Inside City',
    transmission: 'Automatic',
    carModel: '',
    silentRide: false
  });

  // Notifications State
  const [notificationPrefs, setNotificationPrefs] = useState({
    smsAlerts: true,
    emailAlerts: true,
    pushNotifications: false
  });

  // Safety State
  const [safetyPrefs, setSafetyPrefs] = useState({
    sosContactPhone: '',
    autoAlertSos: true
  });

  // Security (Password) Form State
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const saveSettings = async (newGeneral = generalPrefs, newNotif = notificationPrefs, newSafety = safetyPrefs) => {
    if (!currentUser?.id) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sidebarCompact: newGeneral.sidebarCompact,
          dutyType: newGeneral.dutyType,
          transmission: newGeneral.transmission,
          carModel: newGeneral.carModel,
          silentRide: newGeneral.silentRide,
          smsAlerts: newNotif.smsAlerts,
          emailAlerts: newNotif.emailAlerts,
          pushNotifications: newNotif.pushNotifications,
          sosContactPhone: newSafety.sosContactPhone,
          autoAlertSos: newSafety.autoAlertSos
        })
      });
      if (!res.ok) throw new Error('Failed to persist settings in database.');
      
      // Also update local storage for layout/caching
      localStorage.setItem(`sidebarCompact_${currentUser.id}`, newGeneral.sidebarCompact ? 'true' : 'false');
      localStorage.setItem(`ridePreferences_${currentUser.id}`, JSON.stringify({
        dutyType: newGeneral.dutyType,
        transmission: newGeneral.transmission,
        carModel: newGeneral.carModel.trim(),
        silentRide: newGeneral.silentRide
      }));
      localStorage.setItem(`notificationSettings_${currentUser.id}`, JSON.stringify(newNotif));
      localStorage.setItem(`safetySettings_${currentUser.id}`, JSON.stringify(newSafety));
      
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
            dutyType: data.duty_type || 'Inside City',
            transmission: data.transmission || 'Automatic',
            carModel: data.car_model || '',
            silentRide: data.silent_ride === 1
          };
          const loadedNotif = {
            smsAlerts: data.sms_alerts === 1,
            emailAlerts: data.email_alerts === 1,
            pushNotifications: data.push_notifications === 1
          };
          const loadedSafety = {
            sosContactPhone: data.sos_contact_phone || '',
            autoAlertSos: data.auto_alert_sos === 1
          };

          setGeneralPrefs(loadedGeneral);
          setNotificationPrefs(loadedNotif);
          setSafetyPrefs(loadedSafety);

          localStorage.setItem(`sidebarCompact_${currentUser.id}`, loadedGeneral.sidebarCompact ? 'true' : 'false');
          localStorage.setItem(`ridePreferences_${currentUser.id}`, JSON.stringify({
            dutyType: loadedGeneral.dutyType,
            transmission: loadedGeneral.transmission,
            carModel: loadedGeneral.carModel,
            silentRide: loadedGeneral.silentRide
          }));
          localStorage.setItem(`notificationSettings_${currentUser.id}`, JSON.stringify(loadedNotif));
          localStorage.setItem(`safetySettings_${currentUser.id}`, JSON.stringify(loadedSafety));
          window.dispatchEvent(new Event('storage'));
        }
      } catch (err) {
        console.error('Error loading settings from database, falling back to local storage:', err);
        // Fallback to local storage
        const savedPrefs = localStorage.getItem(`ridePreferences_${currentUser.id}`);
        const isCompact = localStorage.getItem(`sidebarCompact_${currentUser.id}`) === 'true';
        if (savedPrefs) {
          const parsed = JSON.parse(savedPrefs);
          setGeneralPrefs({
            sidebarCompact: isCompact,
            dutyType: parsed.dutyType || 'Inside City',
            transmission: parsed.transmission || 'Automatic',
            carModel: parsed.carModel || '',
            silentRide: parsed.silentRide || false
          });
        } else {
          setGeneralPrefs(prev => ({ ...prev, sidebarCompact: isCompact }));
        }

        const savedNotifs = localStorage.getItem(`notificationSettings_${currentUser.id}`);
        if (savedNotifs) {
          setNotificationPrefs(JSON.parse(savedNotifs));
        }

        const savedSafety = localStorage.getItem(`safetySettings_${currentUser.id}`);
        if (savedSafety) {
          setSafetyPrefs(JSON.parse(savedSafety));
        }
      }
    };

    loadSettings();
  }, [currentUser]);

  // Handle Input Changes for general/notifications/safety
  const handleGeneralChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newVal = type === 'checkbox' ? checked : value;
    setGeneralPrefs(prev => {
      const updated = {
        ...prev,
        [name]: newVal
      };
      if (name === 'sidebarCompact') {
        saveSettings(updated, notificationPrefs, safetyPrefs);
      }
      return updated;
    });
  };

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setNotificationPrefs(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleSafetyChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSafetyPrefs(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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
    const success = await saveSettings(generalPrefs, notificationPrefs, safetyPrefs);
    if (success) {
      showAlert('General preferences saved successfully!', 'success');
    }
  };

  const saveNotificationSettings = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    const success = await saveSettings(generalPrefs, notificationPrefs, safetyPrefs);
    if (success) {
      showAlert('Notification alert rules updated.', 'success');
    }
  };

  const saveSafetySettings = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) return;

    // Validate phone number format if provided
    const phone = safetyPrefs.sosContactPhone.trim();
    if (phone && !/^\+?[0-9\s-]{7,15}$/.test(phone)) {
      return showAlert('Please enter a valid phone number (digits only, optional prefix "+").', 'error');
    }

    const success = await saveSettings(generalPrefs, notificationPrefs, {
      ...safetyPrefs,
      sosContactPhone: phone
    });
    if (success) {
      showAlert('Emergency SOS sync profile saved.', 'success');
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
          <p>Configure dashboard layouts, ride preferences, SOS backup sync, and manage credentials</p>
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
          className={`settings-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell size={18} />
          <span>Notifications Settings</span>
        </button>
        <button
          type="button"
          className={`settings-tab-btn ${activeTab === 'safety' ? 'active' : ''}`}
          onClick={() => setActiveTab('safety')}
        >
          <ShieldAlert size={18} />
          <span>Safety & SOS Config</span>
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
              <h4 className="settings-row-title">Default Ride Preferences</h4>
              <p className="settings-row-desc">These options are pre-filled automatically when requesting new drivers</p>
            </div>

            <div className="settings-grid-2">
              <div className="form-group-profile">
                <span className="profile-label-text">Default Trip Type</span>
                <CustomDropdown
                  options={[
                    { value: 'Inside City', label: 'Inside City' },
                    { value: 'Out of City', label: 'Out of City' },
                    { value: 'Round Trip', label: 'Round Trip' },
                    { value: 'One Way Drop', label: 'One Way Drop' }
                  ]}
                  value={generalPrefs.dutyType}
                  onChange={(val) => setGeneralPrefs(prev => ({ ...prev, dutyType: val }))}
                />
              </div>

              <div className="form-group-profile">
                <span className="profile-label-text">Default Transmission</span>
                <CustomDropdown
                  options={[
                    { value: 'Automatic', label: 'Automatic' },
                    { value: 'Manual', label: 'Manual' }
                  ]}
                  value={generalPrefs.transmission}
                  onChange={(val) => setGeneralPrefs(prev => ({ ...prev, transmission: val }))}
                />
              </div>

              <div className="form-group-profile">
                <span className="profile-label-text">Default Vehicle Model Name</span>
                <input
                  type="text"
                  name="carModel"
                  value={generalPrefs.carModel}
                  onChange={handleGeneralChange}
                  className="profile-input-field"
                  placeholder="e.g. Honda City"
                />
              </div>

              <div className="form-group-profile" style={{ justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                  <div>
                    <span className="profile-label-text" style={{ textTransform: 'none', fontSize: '14px', color: 'var(--text-main)' }}>Silent Trip Preference</span>
                    <p className="settings-row-desc" style={{ fontSize: '12px' }}>Request driver to maintain minimum conversation</p>
                  </div>
                  <label className="switch-container">
                    <input
                      type="checkbox"
                      name="silentRide"
                      checked={generalPrefs.silentRide}
                      onChange={handleGeneralChange}
                    />
                    <span className="switch-slider"></span>
                  </label>
                </div>
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

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <form onSubmit={saveNotificationSettings} className="settings-card">
          <div className="settings-section-title-row">
            <Bell size={20} color="var(--accent-gold)" />
            <h3>Notification Alert Configuration</h3>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <h4 className="settings-row-title">SMS Ride Confirmations</h4>
              <p className="settings-row-desc">Receive immediate text alerts when drivers accept your requests</p>
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
              <h4 className="settings-row-title">Push Dispatch Notifications</h4>
              <p className="settings-row-desc">Display browser banners when drivers approach your pick-up spot</p>
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
              <h4 className="settings-row-title">Promotional Newsletters</h4>
              <p className="settings-row-desc">Receive email summaries containing loyalty points details and discount offers</p>
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
              <Save size={16} /> Save Notifications
            </button>
          </div>
        </form>
      )}

      {/* Safety & SOS Settings Tab */}
      {activeTab === 'safety' && (
        <form onSubmit={saveSafetySettings} className="settings-card">
          <div className="settings-section-title-row">
            <ShieldAlert size={20} color="var(--accent-gold)" />
            <h3>Emergency Safety Sync Config</h3>
          </div>

          <div className="settings-row" style={{ display: 'block', paddingBottom: '0' }}>
            <div className="settings-row-text" style={{ marginBottom: '16px' }}>
              <h4 className="settings-row-title">Primary Backup Contact Phone</h4>
              <p className="settings-row-desc">Specify a telephone number to receive instant SMS updates and live trip tracking links when you trigger SOS</p>
            </div>

            <div className="form-group-profile" style={{ maxWidth: '400px', marginBottom: '24px' }}>
              <span className="profile-label-text">SOS Contact Telephone</span>
              <input
                type="tel"
                name="sosContactPhone"
                value={safetyPrefs.sosContactPhone}
                onChange={handleSafetyChange}
                className="profile-input-field"
                placeholder="e.g. +1 555-0199"
              />
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-row-text">
              <h4 className="settings-row-title">Auto-Notify Emergency Authorities</h4>
              <p className="settings-row-desc">Automatically ping local emergency responder networks on active SOS triggers</p>
            </div>
            <label className="switch-container">
              <input
                type="checkbox"
                name="autoAlertSos"
                checked={safetyPrefs.autoAlertSos}
                onChange={handleSafetyChange}
              />
              <span className="switch-slider"></span>
            </label>
          </div>

          <div className="settings-actions-row">
            <button type="submit" className="profile-btn-primary">
              <Save size={16} /> Save Safety Rules
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

export default ClientSettings;
