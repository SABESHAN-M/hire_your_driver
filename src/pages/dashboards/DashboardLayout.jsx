import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, User, Settings, LogOut, Menu, Calendar, CreditCard, 
  ShieldCheck, Bell, Check, CheckCheck, X, Trash2, AlertTriangle, Square, Clock, Ticket, Copy 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import DriverSidebar from './driver/DriverSidebar';
import AdminSidebar from './admin/AdminSidebar';
import DashboardSkeleton from '../../components/DashboardSkeleton';
import './DashboardLayout.css';
import './driver/DriverSafetyCenter.css';

const DashboardLayout = ({ role }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const notifRef = React.useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, loading, openLogin } = useAuth();
  const { theme } = useTheme();
  const { showAlert } = useAlert();
  const [copiedCode, setCopiedCode] = useState(null);

  const extractPromoCode = (item) => {
    if (!item) return null;
    if (item.promo_code) return item.promo_code.trim();
    const text = `${item.title || ''} ${item.message || ''}`;
    const match = text.match(/(?:promo\s+code|discount\s+code|\bcode\b)\s*[:\-]?\s*['"]?([A-Za-z0-9\-_]{4,16})['"]?/i);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (!['STATUS', 'POSTAL', 'PASSCODE', 'NUMBER', 'ERROR', 'HTTP'].includes(candidate.toUpperCase())) {
        return candidate.toUpperCase();
      }
    }
    return null;
  };

  const handleCopyCode = (code, e) => {
    if (e) e.stopPropagation();
    if (!code) return;
    try {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      showAlert(`Promo code "${code}" copied to clipboard!`, 'success');
      setTimeout(() => setCopiedCode(null), 2500);
    } catch (err) {
      showAlert(`Code: ${code}`, 'info');
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isNotifOpen]);

  const [avatarStyle, setAvatarStyle] = useState({
    type: 'initials',
    url: '',
    color: 'linear-gradient(135deg, var(--accent-gold) 0%, #b5952f 100%)'
  });
  const [isCompact, setIsCompact] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  // Trigger high-performance skeleton loading on route transitions
  React.useEffect(() => {
    setIsPageLoading(true);
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 280);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  const currentRole = (role || currentUser?.role || 'client').toLowerCase();
  const storageKey = `hyd_demo_notifications_${currentRole}`;

  const roleSpecificDefaults = {
    client: [
      { id: 101, role: 'client', title: 'Ride Confirmed', message: 'Driver Rajesh Kumar (4.85 ★) has been assigned for booking #HYD-7102.', is_read: 0, created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(), type: 'info' },
      { id: 102, role: 'client', title: 'Chauffeur Arrived', message: 'Your driver has arrived at Indiranagar 100ft Road pickup point.', is_read: 0, created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(), type: 'success' },
      { id: 103, role: 'client', title: 'Wallet Top-Up', message: 'Payment of $50.00 successfully credited to your client wallet.', is_read: 0, created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), type: 'success' },
      { id: 104, role: 'client', title: 'Safety Telematics Active', message: 'Real-time GPS tracking and 24/7 SOS dispatch enabled for your journey.', is_read: 1, created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(), type: 'warning' },
      { id: 105, role: 'client', title: 'Exclusive Promo', message: 'Use code HYD50 to get flat 50% discount on weekend outstation bookings.', is_read: 1, created_at: new Date(Date.now() - 1000 * 60 * 480).toISOString(), type: 'info' }
    ],
    driver: [
      { id: 201, role: 'driver', title: 'Duty Status Offline', message: 'You are currently Off Duty. Toggle On Duty to start receiving client trip requests.', is_read: 0, created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(), type: 'info' },
      { id: 202, role: 'driver', title: 'New Trip Assignment', message: 'New Outstation ride #HYD-8492 available: Indiranagar to Airport ($850.00 fare).', is_read: 0, created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(), type: 'info' },
      { id: 203, role: 'driver', title: 'Weekly Incentive Earned', message: 'Completed 10 rides this week! $50.00 performance bonus added to earnings.', is_read: 0, created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(), type: 'success' },
      { id: 204, role: 'driver', title: 'Bank Payout Processed', message: 'Your cashout transfer of $2,000.00 to HDFC Bank (•••• 4821) has completed.', is_read: 1, created_at: new Date(Date.now() - 1000 * 60 * 210).toISOString(), type: 'info' },
      { id: 205, role: 'driver', title: 'Documents Verified', message: 'Commercial Driver License (DL-042019984321) successfully approved by Admin.', is_read: 1, created_at: new Date(Date.now() - 1000 * 60 * 420).toISOString(), type: 'success' }
    ],
    admin: [
      { id: 301, role: 'admin', title: 'New Driver Registration', message: 'Driver Karan Mehta submitted Commercial Driving License & ID proof for verification.', is_read: 0, created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(), type: 'warning' },
      { id: 302, role: 'admin', title: 'Revenue Milestone', message: 'Bengaluru metropolitan revenue crossed $28,450.00 (18% above weekly target).', is_read: 0, created_at: new Date(Date.now() - 1000 * 60 * 50).toISOString(), type: 'success' },
      { id: 303, role: 'admin', title: 'Fleet Telematics Active', message: 'All 24 active driver telematics streams and emergency dispatch channels online.', is_read: 0, created_at: new Date(Date.now() - 1000 * 60 * 140).toISOString(), type: 'info' },
      { id: 304, role: 'admin', title: 'Surge Demand Detected', message: 'High booking volume detected around Indiranagar & Whitefield tech corridor.', is_read: 1, created_at: new Date(Date.now() - 1000 * 60 * 260).toISOString(), type: 'warning' },
      { id: 305, role: 'admin', title: 'Campaign Broadcast', message: 'Weekend promo campaign "Summer Festival 50%" delivered to all active clients.', is_read: 1, created_at: new Date(Date.now() - 1000 * 60 * 500).toISOString(), type: 'info' }
    ]
  };

  const clearedKey = `hyd_notif_cleared_${currentRole}`;

  const getStoredNotifications = () => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // If user cleared notifications, honour the empty array instead of reloading defaults
          if (parsed.length === 0 && localStorage.getItem(clearedKey) === '1') {
            return [];
          }
          if (parsed.length > 0) return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading notifications from localStorage:', e);
    }
    const defaults = roleSpecificDefaults[currentRole] || roleSpecificDefaults.client;
    try {
      localStorage.setItem(storageKey, JSON.stringify(defaults));
    } catch (e) {}
    return defaults;
  };

  const saveStoredNotifications = (notifs) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(notifs));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('Error saving notifications to localStorage:', e);
    }
  };

  const syncNotifications = () => {
    const data = getStoredNotifications();
    setNotifications(data);
  };

  React.useEffect(() => {
    syncNotifications();

    const syncUserSettings = () => {
      if (!currentUser?.id) return;
      try {
        const sidebarCompact = localStorage.getItem(`sidebarCompact_${currentUser.id}`) === 'true';
        setIsCompact(sidebarCompact);
      } catch (err) {
        console.error('Error syncing user settings:', err);
      }
    };

    const syncUserProfile = () => {
      if (!currentUser?.id) return;
      try {
        const type = localStorage.getItem(`avatarType_${currentUser.id}`) || 'initials';
        const url = localStorage.getItem(`avatarUrl_${currentUser.id}`) || currentUser.profile_photo || currentUser.profilePhoto || '';
        const color = localStorage.getItem(`avatarColor_${currentUser.id}`) || 'linear-gradient(135deg, var(--accent-gold) 0%, #b5952f 100%)';
        setAvatarStyle({ type, url, color });
      } catch (err) {
        console.error('Error syncing profile in dashboard layout:', err);
      }
    };

    const handleStorageChange = () => {
      syncNotifications();
      syncUserProfile();
      syncUserSettings();
    };

    const handleNewNotification = (e) => {
      if (!e.detail) return;
      const notif = e.detail;
      if (notif.role && notif.role !== currentRole) return;
      setNotifications(prev => [notif, ...prev]);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('hyd:new-notification', handleNewNotification);
    handleStorageChange();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('hyd:new-notification', handleNewNotification);
    };
  }, [currentUser, role]);

  const handleMarkRead = (id, e) => {
    if (e) e.stopPropagation();
    const updated = notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n);
    setNotifications(updated);
    saveStoredNotifications(updated);
  };

  const handleMarkAllRead = () => {
    const updated = notifications.map(n => ({ ...n, is_read: 1 }));
    setNotifications(updated);
    saveStoredNotifications(updated);
    showAlert('All notifications marked as read.', 'success');
  };

  const handleClearAllNotifications = () => {
    // Set sentinel so getStoredNotifications knows the empty array is intentional
    try { localStorage.setItem(clearedKey, '1'); } catch (e) {}
    setNotifications([]);
    saveStoredNotifications([]);
    showAlert('All notifications cleared.', 'success');
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const isDriver = role === 'Driver' || (currentUser?.role || '').toLowerCase() === 'driver';

  const checkIsDriverOnDuty = () => {
    if (!isDriver) return false;
    const driverId = currentUser?.id || 3;
    try {
      const raw = localStorage.getItem('hyd_demo_attendance');
      if (raw) {
        const parsed = JSON.parse(raw);
        const record = Array.isArray(parsed) ? parsed.find(a => String(a.user_id) === String(driverId)) : parsed;
        if (record) {
          return (record.is_clocked_in === 1 || record.online === true) && Boolean(record.last_clock_in);
        }
      }
    } catch (e) {}
    return false;
  };

  const [isDriverOnDuty, setIsDriverOnDuty] = useState(checkIsDriverOnDuty);
  const [showDutyLogoutModal, setShowDutyLogoutModal] = useState(false);

  React.useEffect(() => {
    const handleDutyChange = () => {
      setIsDriverOnDuty(checkIsDriverOnDuty());
    };
    window.addEventListener('storage', handleDutyChange);
    window.addEventListener('hyd:duty-change', handleDutyChange);
    return () => {
      window.removeEventListener('storage', handleDutyChange);
      window.removeEventListener('hyd:duty-change', handleDutyChange);
    };
  }, [currentUser, role, isDriver]);

  const handleLogout = () => {
    setIsDropdownOpen(false);
    if (isDriver && checkIsDriverOnDuty()) {
      setShowDutyLogoutModal(true);
      return;
    }
    logout();
    navigate('/');
  };

  const handleClockOutAndLogout = () => {
    const driverId = currentUser?.id || 3;
    try {
      const raw = localStorage.getItem('hyd_demo_attendance');
      let currentArr = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) currentArr = parsed;
        } catch (e) {}
      }
      const idx = currentArr.findIndex(a => String(a.user_id) === String(driverId));
      const record = idx >= 0 ? currentArr[idx] : { user_id: driverId, hours_logged: 5.5, monthly_hours_logged: 48.0 };

      const now = new Date();
      let addedHours = 0;
      if (record.last_clock_in) {
        const lastIn = new Date(record.last_clock_in);
        addedHours = Math.max(0, (now.getTime() - lastIn.getTime()) / (1000 * 60 * 60));
      }
      const newHours = Number(record.hours_logged || 5.5) + addedHours;
      const newMonthly = Number(record.monthly_hours_logged || 48.0) + addedHours;

      const existingLogs = record.logs || [];
      const newLogs = [
        { id: Date.now(), event_type: 'Clock Out', event_time: now.toISOString(), status: 'Success' },
        ...existingLogs
      ];

      const updated = {
        ...record,
        user_id: driverId,
        is_clocked_in: 0,
        online: false,
        hours_logged: newHours,
        monthly_hours_logged: newMonthly,
        last_clock_in: null,
        logs: newLogs
      };

      if (idx >= 0) {
        currentArr[idx] = updated;
      } else {
        currentArr.push(updated);
      }
      localStorage.setItem('hyd_demo_attendance', JSON.stringify(currentArr));

      // Push off-duty notification
      const notifKey = 'hyd_demo_notifications_driver';
      const rawNotif = localStorage.getItem(notifKey);
      const existingNotifs = rawNotif ? JSON.parse(rawNotif) : [];
      const notifArr = Array.isArray(existingNotifs) ? existingNotifs : [];
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const offNotif = {
        id: Date.now(),
        role: 'driver',
        title: 'You are Off Duty',
        message: `You clocked out at ${timeStr} upon logging out. Ride dispatch paused.`,
        is_read: 0,
        created_at: now.toISOString(),
        type: 'warning'
      };
      localStorage.setItem(notifKey, JSON.stringify([offNotif, ...notifArr]));
      localStorage.setItem('hyd_notif_cleared_driver', '0');

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('hyd:duty-change', { detail: { is_clocked_in: 0 } }));
    } catch (e) {
      console.error(e);
    }

    setShowDutyLogoutModal(false);
    showAlert('Clocked Out successfully! Logging out...', 'info');
    logout();
    navigate('/');
  };

  const getLinks = () => {
    if (role === 'Client') {
      return [
        { path: `/dashboard/${role.toLowerCase()}`, label: 'Overview', icon: <LayoutDashboard size={20} />, implemented: true },
        { path: `/dashboard/${role.toLowerCase()}/bookings`, label: 'My Bookings', icon: <Calendar size={20} />, implemented: true },
        { path: `/dashboard/${role.toLowerCase()}/wallet`, label: 'Wallet', icon: <CreditCard size={20} />, implemented: true },
        { path: `/dashboard/${role.toLowerCase()}/safety`, label: 'Safety Center', icon: <ShieldCheck size={20} />, implemented: true },
        { path: `/dashboard/${role.toLowerCase()}/profile`, label: 'Profile', icon: <User size={20} />, implemented: true },
        { path: `/dashboard/${role.toLowerCase()}/settings`, label: 'Settings', icon: <Settings size={20} />, implemented: true },
      ];
    }
    return [
      { path: `/dashboard/${role.toLowerCase()}`, label: 'Overview', icon: <LayoutDashboard size={20} />, implemented: true },
      { path: `/dashboard/${role.toLowerCase()}/settings`, label: 'Settings', icon: <Settings size={20} />, implemented: true },
    ];
  };

  const displayFirstName = currentUser?.firstName || currentUser?.first_name || 'User';
  const displayLastName = currentUser?.lastName || currentUser?.last_name || '';
  const userName = currentUser ? `${displayFirstName} ${displayLastName}`.trim() : 'Guest User';
  const userInitials = displayFirstName ? displayFirstName.charAt(0).toUpperCase() : 'G';
  const userRole = role ? (role.charAt(0).toUpperCase() + role.slice(1)) : 'User';

  const renderHeaderAvatar = () => {
    if (avatarStyle.type === 'url' && avatarStyle.url) {
      return (
        <img 
          src={avatarStyle.url} 
          alt="Avatar" 
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      );
    }
    return userInitials;
  };

  return (
    <div className={`dashboard-layout ${theme === 'light' ? 'light-theme' : ''} ${isCompact ? 'compact-sidebar' : ''}`}>
      {role === 'Driver' ? (
        <DriverSidebar 
          userRole={userRole} 
          isCompact={isCompact} 
          theme={theme}
          showAlert={showAlert}
        />
      ) : role === 'Admin' ? (
        <AdminSidebar 
          userRole={userRole} 
          isCompact={isCompact} 
          theme={theme}
          showAlert={showAlert}
        />
      ) : (
        <aside className="sidebar">
          <div className="sidebar-header sidebar-header-wrapper">
            <h2 className="sidebar-title">{userRole} Dashboard</h2>
          </div>
          <nav className="sidebar-nav">
            {getLinks().map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`sidebar-link ${location.pathname === link.path ? 'active' : ''}`}
                onClick={(e) => {
                  if (!link.implemented) {
                    e.preventDefault();
                    showAlert(`${link.label} page is under construction.`, "error");
                  }
                }}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>
        </aside>
      )}

      <main className="dashboard-main">
        <header className="dashboard-header dashboard-header-flex">
          <div className="header-left">
            <div className="mobile-menu-btn"><Menu /></div>
            <div className="header-title-wrapper">
              <h2 className="welcome-text">
                WELCOME BACK, <span className="welcome-name">{userName}</span>
              </h2>
              <p className="current-date">{currentDate}</p>
            </div>
          </div>
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Driver Duty Status Pill */}
            {isDriver && (
              <Link
                to="/dashboard/driver/attendance"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '7px 14px',
                  borderRadius: '24px',
                  fontSize: '12px',
                  fontWeight: '700',
                  textDecoration: 'none',
                  background: isDriverOnDuty ? 'rgba(52, 199, 89, 0.12)' : 'rgba(255, 59, 48, 0.12)',
                  border: isDriverOnDuty ? '1px solid rgba(52, 199, 89, 0.35)' : '1px solid rgba(255, 59, 48, 0.35)',
                  color: isDriverOnDuty ? '#34c759' : '#ff3b30',
                  boxShadow: isDriverOnDuty ? '0 2px 10px rgba(52, 199, 89, 0.15)' : 'none',
                  transition: 'all 0.2s'
                }}
                title="Duty Status - Click to manage"
              >
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isDriverOnDuty ? '#34c759' : '#ff3b30',
                  boxShadow: isDriverOnDuty ? '0 0 8px #34c759' : 'none'
                }} />
                {isDriverOnDuty ? 'On Duty' : 'Off Duty'}
              </Link>
            )}
            {/* Notification Bell Dropdown */}
            <div className="notification-bell-container" ref={notifRef} style={{ position: 'relative' }}>
              <div 
                className="bell-icon-wrapper" 
                onClick={() => setIsNotifOpen(!isNotifOpen)} 
                style={{ 
                  cursor: 'pointer', 
                  position: 'relative',
                  padding: '10px',
                  borderRadius: '12px',
                  background: theme === 'light' ? '#ffffff' : 'rgba(255, 255, 255, 0.05)',
                  border: theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)'
                }}
              >
                <Bell size={20} color="var(--text-main)" />
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      background: 'var(--accent-gold)',
                      color: '#000',
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      fontSize: '9px',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid var(--bg-main)',
                      lineHeight: 1
                    }}
                  >
                    {Math.min(notifications.filter(n => !n.is_read).length, 9)}
                  </span>
                )}
              </div>
              {isNotifOpen && (
                <>
                  {/* Backdrop overlay to close dropdown on click outside */}
                  <div 
                    onClick={() => setIsNotifOpen(false)} 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
                  />
                  <div 
                    className="notification-dropdown" 
                    style={{
                      position: 'absolute',
                      top: '50px',
                      right: '0',
                      width: '340px',
                      background: theme === 'light' ? '#ffffff' : '#1e1e24',
                      border: theme === 'light' ? '1px solid #cbd5e1' : '1px solid #2d2d3a',
                      borderRadius: '16px',
                      boxShadow: theme === 'light' ? '0 12px 35px rgba(0, 0, 0, 0.15)' : '0 12px 35px rgba(0, 0, 0, 0.7)',
                      zIndex: 999,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                      <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '15px', fontWeight: '700', letterSpacing: '0.5px' }}>Activity Stream</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {notifications.filter(n => !n.is_read).length > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            style={{
                              background: 'rgba(212, 175, 55, 0.15)',
                              border: 'none',
                              color: 'var(--accent-gold)',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              transition: 'all 0.2s',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Mark all notifications as read"
                          >
                            <CheckCheck size={13} /> Mark all read
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button
                            onClick={handleClearAllNotifications}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              transition: 'all 0.2s',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onMouseEnter={(e) => e.target.style.color = '#ff4444'}
                            onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                            title="Clear all notifications"
                          >
                            <Trash2 size={12} /> Clear
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, maxHeight: '320px' }} className="custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                          <Bell size={32} style={{ opacity: 0.3, marginBottom: '10px' }} />
                          <p style={{ margin: 0 }}>No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div 
                            key={n.id} 
                            onClick={() => {
                              handleMarkRead(n.id);
                              setSelectedNotification(n);
                              setIsNotifOpen(false);
                            }}
                            style={{
                              padding: '14px 20px',
                              borderBottom: '1px solid var(--border-color)',
                              background: n.is_read ? 'transparent' : 'rgba(212, 175, 55, 0.06)',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              position: 'relative'
                            }}
                            className="notification-item"
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                              <h5 style={{ margin: 0, fontSize: '13.5px', fontWeight: '700', color: n.is_read ? 'var(--text-main)' : 'var(--accent-gold)', lineHeight: '1.3' }}>
                                {n.title}
                              </h5>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                {!n.is_read && (
                                  <button
                                    onClick={(e) => handleMarkRead(n.id, e)}
                                    style={{
                                      background: 'rgba(212, 175, 55, 0.2)',
                                      border: 'none',
                                      color: 'var(--accent-gold)',
                                      padding: '2px 6px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '2px'
                                    }}
                                    title="Mark as read"
                                  >
                                    <Check size={12} /> Mark Read
                                  </button>
                                )}
                              </div>
                            </div>
                            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {n.message}
                            </p>
                            {(() => {
                              const itemPromo = extractPromoCode(n);
                              if (!itemPromo) return null;
                              const isCopied = copiedCode === itemPromo;
                              return (
                                <div 
                                  onClick={(e) => e.stopPropagation()} 
                                  style={{
                                    marginTop: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'rgba(212, 175, 55, 0.08)',
                                    border: '1px dashed rgba(212, 175, 55, 0.4)',
                                    borderRadius: '8px',
                                    padding: '5px 8px'
                                  }}
                                >
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    color: 'var(--accent-gold)',
                                    fontFamily: 'monospace',
                                    letterSpacing: '0.5px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                  }}>
                                    <Ticket size={12} /> {itemPromo}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyCode(itemPromo, e)}
                                    style={{
                                      background: isCopied ? '#22c55e' : 'var(--accent-gold)',
                                      color: isCopied ? '#ffffff' : '#000000',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '3px 8px',
                                      fontSize: '10.5px',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      transition: 'all 0.15s ease'
                                    }}
                                    title="Copy Promo Code"
                                  >
                                    {isCopied ? <Check size={11} /> : <Copy size={11} />}
                                    {isCopied ? 'Copied' : 'Copy Code'}
                                  </button>
                                </div>
                              );
                            })()}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                {new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span style={{ fontSize: '10.5px', color: 'var(--accent-gold)', fontWeight: '600' }}>
                                View Full Msg →
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="user-profile-dropdown-container" style={{ position: 'relative' }}>
              <div className="user-profile-sm" onClick={() => setIsDropdownOpen(!isDropdownOpen)} style={{ cursor: 'pointer' }}>
                <div 
                  className="avatar" 
                  style={{ 
                    background: avatarStyle.type === 'url' ? 'transparent' : avatarStyle.color, 
                    color: '#000',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)'
                  }}
                >
                  {renderHeaderAvatar()}
                </div>
              </div>
              {isDropdownOpen && (
                <>
                  <div 
                    onClick={() => setIsDropdownOpen(false)} 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }}
                  />
                  <div className="profile-dropdown-menu" style={{ zIndex: 999 }}>
                    {isDriver && (
                      <div style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px'
                      }}>
                        <span style={{ color: 'var(--text-muted)' }}>Duty Status</span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: '700',
                          fontSize: '11px',
                          background: isDriverOnDuty ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)',
                          color: isDriverOnDuty ? '#34c759' : '#ff3b30'
                        }}>
                          {isDriverOnDuty ? '● ON DUTY' : '○ OFF DUTY'}
                        </span>
                      </div>
                    )}
                    <Link to={`/dashboard/${role.toLowerCase()}/profile`} className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                      <User size={16} />
                      <span>Profile</span>
                    </Link>
                    <button className="dropdown-item logout-item" onClick={handleLogout}>
                      <LogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <div className="dashboard-content">
          {isPageLoading ? (
            <DashboardSkeleton pathname={location.pathname} />
          ) : (
            <div className="dashboard-page-enter">
              <Outlet />
            </div>
          )}
        </div>
      </main>

      {/* Full Notification Details Modal */}
      {selectedNotification && createPortal(
        <div className="safety-modal-overlay" onClick={() => setSelectedNotification(null)}>
          <div className="safety-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', padding: '28px' }}>
            <div className="safety-modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-gold)', margin: 0 }}>
                {selectedNotification.title}
              </h2>
              <button className="close-modal-btn" onClick={() => setSelectedNotification(null)}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '15px', color: 'var(--text-main)', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {selectedNotification.message}
              </p>
              {(() => {
                const modalPromo = extractPromoCode(selectedNotification);
                if (!modalPromo) return null;
                const isCopied = copiedCode === modalPromo;
                return (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.12), rgba(0, 0, 0, 0.35))',
                    border: '1px dashed var(--accent-gold)',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    margin: '16px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.25)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: 'rgba(212, 175, 55, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-gold)'
                      }}>
                        <Ticket size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                          Promotional Discount Code
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-gold)', letterSpacing: '1px', fontFamily: 'monospace' }}>
                          {modalPromo}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleCopyCode(modalPromo, e)}
                      style={{
                        background: isCopied ? '#22c55e' : 'var(--accent-gold)',
                        color: isCopied ? '#ffffff' : '#000000',
                        border: 'none',
                        padding: '9px 16px',
                        borderRadius: '10px',
                        fontSize: '12.5px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(212, 175, 55, 0.2)'
                      }}
                    >
                      {isCopied ? <Check size={15} /> : <Copy size={15} />}
                      {isCopied ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                );
              })()}
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>Role: {role} Notification</span>
                <span>
                  {new Date(selectedNotification.created_at).toLocaleDateString(undefined, { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })} at {new Date(selectedNotification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              {!selectedNotification.is_read && (
                <button 
                  type="button" 
                  className="wallet-btn-primary" 
                  style={{ flex: 1, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onClick={() => {
                    handleMarkRead(selectedNotification.id);
                    setSelectedNotification(prev => prev ? ({ ...prev, is_read: 1 }) : null);
                  }}
                >
                  <Check size={18} /> Mark as Read
                </button>
              )}
              <button 
                type="button" 
                className="wallet-btn-outline" 
                style={{ flex: 1, margin: 0 }}
                onClick={() => setSelectedNotification(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Off-Duty Required Before Logout Modal */}
      {showDutyLogoutModal && createPortal(
        <div className="safety-modal-overlay" onClick={() => setShowDutyLogoutModal(false)} style={{ zIndex: 11000 }}>
          <div 
            className="safety-modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '500px',
              padding: '30px',
              background: theme === 'light' ? '#ffffff' : '#1a1a24',
              border: theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '16px',
                  background: 'rgba(255, 59, 48, 0.15)',
                  border: '1px solid rgba(255, 59, 48, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ff3b30'
                }}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>
                    Driver On Duty
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                    Action required before logout
                  </p>
                </div>
              </div>
              <button 
                className="close-modal-btn" 
                onClick={() => setShowDutyLogoutModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              background: theme === 'light' ? '#f8fafc' : 'rgba(255, 255, 255, 0.04)',
              border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Current Status:</span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: 'rgba(52, 199, 89, 0.15)',
                  border: '1px solid rgba(52, 199, 89, 0.3)',
                  color: '#34c759',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34c759', boxShadow: '0 0 8px #34c759' }} />
                  ACTIVE ON DUTY
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: 'var(--text-main)' }}>
                You are currently marked as <strong>On Duty</strong>. Please go <strong>Off Duty</strong> before logging out so your shift hours are properly recorded and client trip dispatches are safely paused.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={handleClockOutAndLogout}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  background: '#ff3b30',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(255, 59, 48, 0.3)',
                  transition: 'all 0.2s'
                }}
              >
                <Square size={16} fill="#fff" />
                Go Off Duty & Logout
              </button>

              <button
                onClick={() => setShowDutyLogoutModal(false)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'transparent',
                  color: 'var(--text-main)',
                  border: theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.15)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Stay On Duty (Cancel)
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DashboardLayout;
