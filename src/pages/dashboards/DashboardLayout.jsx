import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, User, Settings, LogOut, Menu, Calendar, CreditCard, ShieldCheck, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { API_BASE_URL } from '../../config';
import DriverSidebar from './driver/DriverSidebar';
import AdminSidebar from './admin/AdminSidebar';
import './DashboardLayout.css';

const DashboardLayout = ({ role }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const { theme } = useTheme();
  const { showAlert } = useAlert();

  const [avatarStyle, setAvatarStyle] = useState({
    type: 'initials',
    url: '',
    color: 'linear-gradient(135deg, var(--accent-gold) 0%, #b5952f 100%)'
  });
  const [isCompact, setIsCompact] = useState(false);

  const fetchNotifications = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications?userId=${currentUser.id}&role=${role.toLowerCase()}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);

    const syncUserSettings = async () => {
      if (!currentUser?.id) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}/settings`);
        if (res.ok) {
          const data = await res.json();
          const sidebarCompact = data.sidebar_compact === 1;
          
          localStorage.setItem(`sidebarCompact_${currentUser.id}`, sidebarCompact ? 'true' : 'false');
          localStorage.setItem(`ridePreferences_${currentUser.id}`, JSON.stringify({
            dutyType: data.duty_type || 'Inside City',
            transmission: data.transmission || 'Automatic',
            carModel: data.car_model || '',
            silentRide: data.silent_ride === 1
          }));
          localStorage.setItem(`notificationSettings_${currentUser.id}`, JSON.stringify({
            smsAlerts: data.sms_alerts === 1,
            emailAlerts: data.email_alerts === 1,
            pushNotifications: data.push_notifications === 1
          }));
          localStorage.setItem(`safetySettings_${currentUser.id}`, JSON.stringify({
            sosContactPhone: data.sos_contact_phone || '',
            autoAlertSos: data.auto_alert_sos === 1
          }));
          
          setIsCompact(sidebarCompact);
        }
      } catch (err) {
        console.error('Error syncing user settings in dashboard layout:', err);
      }
    };

    const syncUserProfile = async () => {
      if (!currentUser?.id) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.user && data.user.profilePhoto) {
            let parsedAvatar = null;
            if (data.user.profilePhoto.startsWith('{') && data.user.profilePhoto.endsWith('}')) {
              try {
                parsedAvatar = JSON.parse(data.user.profilePhoto);
              } catch (e) {
                console.error('Error parsing profile photo JSON:', e);
              }
            }
            
            if (parsedAvatar && (parsedAvatar.type || parsedAvatar.url || parsedAvatar.color)) {
              const type = parsedAvatar.type || 'initials';
              const url = parsedAvatar.url || '';
              const color = parsedAvatar.color || 'linear-gradient(135deg, var(--accent-gold) 0%, #b5952f 100%)';
              
              localStorage.setItem(`avatarType_${currentUser.id}`, type);
              localStorage.setItem(`avatarUrl_${currentUser.id}`, url);
              localStorage.setItem(`avatarColor_${currentUser.id}`, color);
              setAvatarStyle({ type, url, color });
            } else {
              localStorage.setItem(`avatarType_${currentUser.id}`, 'url');
              localStorage.setItem(`avatarUrl_${currentUser.id}`, data.user.profilePhoto);
              localStorage.setItem(`avatarColor_${currentUser.id}`, 'linear-gradient(135deg, var(--accent-gold) 0%, #b5952f 100%)');
              setAvatarStyle({
                type: 'url',
                url: data.user.profilePhoto,
                color: 'linear-gradient(135deg, var(--accent-gold) 0%, #b5952f 100%)'
              });
            }
          }
        }
      } catch (err) {
        console.error('Error syncing user profile in dashboard layout:', err);
      }
    };

    const handleStorageChange = () => {
      fetchNotifications();
      if (currentUser?.id) {
        const type = localStorage.getItem(`avatarType_${currentUser.id}`) || 'initials';
        const url = localStorage.getItem(`avatarUrl_${currentUser.id}`) || '';
        const color = localStorage.getItem(`avatarColor_${currentUser.id}`) || 'linear-gradient(135deg, var(--accent-gold) 0%, #b5952f 100%)';
        setAvatarStyle({ type, url, color });
        setIsCompact(localStorage.getItem(`sidebarCompact_${currentUser.id}`) === 'true');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    handleStorageChange();
    syncUserSettings();
    syncUserProfile();
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentUser, role]);

  const handleMarkRead = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: 'PATCH'
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleClearAllNotifications = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/clear?userId=${currentUser.id}&role=${role.toLowerCase()}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setNotifications([]);
        window.dispatchEvent(new Event('storage'));
        showAlert('All notifications cleared.', 'success');
      }
    } catch (err) {
      console.error('Error clearing notifications:', err);
      showAlert('Failed to clear notifications.', 'error');
    }
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const handleLogout = () => {
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

  const userName = currentUser ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : 'Guest User';
  const userInitials = currentUser ? currentUser.firstName.charAt(0).toUpperCase() : 'G';
  const userRole = role.charAt(0).toUpperCase() + role.slice(1);

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
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Notification Bell Dropdown */}
            <div className="notification-bell-container" style={{ position: 'relative' }}>
              <div 
                className="bell-icon-wrapper" 
                onClick={() => setIsNotifOpen(!isNotifOpen)} 
                style={{ 
                  cursor: 'pointer', 
                  position: 'relative',
                  padding: '10px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
                }}
              >
                <Bell size={20} color="var(--text-main)" />
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span 
                    className="unread-badge" 
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      background: '#ff3b30',
                      color: '#fff',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      fontSize: '10px',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #1a1a1a',
                      boxShadow: '0 0 10px rgba(255, 59, 48, 0.5)'
                    }}
                  >
                    {notifications.filter(n => !n.is_read).length}
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
                      background: 'var(--bg-card)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '16px',
                      boxShadow: theme === 'light' ? '0 12px 40px rgba(0, 0, 0, 0.1)' : '0 12px 40px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.05)',
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
                          <span style={{ fontSize: '11px', background: 'rgba(212, 175, 55, 0.15)', color: 'var(--accent-gold)', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                            {notifications.filter(n => !n.is_read).length} New
                          </span>
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
                              alignItems: 'center'
                            }}
                            onMouseEnter={(e) => e.target.style.color = '#ff4444'}
                            onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1, maxHeight: '280px' }} className="custom-scrollbar">
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
                              setIsNotifOpen(false);
                            }}
                            style={{
                              padding: '14px 20px',
                              borderBottom: '1px solid var(--border-color)',
                              background: n.is_read ? 'transparent' : 'rgba(212, 175, 55, 0.04)',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              position: 'relative'
                            }}
                            className="notification-item"
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                              <h5 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: n.is_read ? 'var(--text-main)' : 'var(--accent-gold)', lineHeight: '1.3' }}>
                                {n.title}
                              </h5>
                              {!n.is_read && (
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-gold)', display: 'inline-block', flexShrink: 0, marginTop: '4px', boxShadow: '0 0 8px var(--accent-gold)' }}></span>
                              )}
                            </div>
                            <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                              {n.message}
                            </p>
                            <span style={{ display: 'block', marginTop: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>
                              {new Date(n.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
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
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
