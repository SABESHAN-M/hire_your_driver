import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Car, CreditCard, UserCheck, TrendingUp, Clock, AlertTriangle, CheckCircle, XCircle, Activity, Bell, ArrowUpRight } from 'lucide-react';
import { API_BASE_URL } from '../../../config';
import { useAlert } from '../../../context/AlertContext';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [pendingDrivers, setPendingDrivers] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const fetchAll = async () => {
    try {
      const [statsRes, notifRes, pendingRes, bookingsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/stats`),
        fetch(`${API_BASE_URL}/api/notifications?role=admin`),
        fetch(`${API_BASE_URL}/api/admin/drivers/pending`),
        fetch(`${API_BASE_URL}/api/admin/bookings`)
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (notifRes.ok) setNotifications(await notifRes.json());
      if (pendingRes.ok) setPendingDrivers(await pendingRes.json());
      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setRecentBookings(data.slice(0, 5));
      }
    } catch (err) {
      console.error('Admin dashboard fetch error:', err);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    window.addEventListener('storage', fetchAll);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', fetchAll);
    };
  }, []);

  const handleMarkRead = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, { method: 'PATCH' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err) { console.error(err); }
  };

  const handleQuickApprove = async (id, name) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/drivers/${id}/approve`, { method: 'PATCH' });
      if (res.ok) {
        showAlert(`Driver ${name} approved!`, 'success');
        setPendingDrivers(prev => prev.filter(d => d.id !== id));
        fetchAll();
      }
    } catch (err) { showAlert('Failed to approve', 'error'); }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#34c759';
      case 'upcoming': return '#5ac8fa';
      case 'started': return '#ff9f0a';
      case 'cancelled': return '#ff453a';
      default: return 'var(--text-muted)';
    }
  };

  if (!stats) {
    return (
      <div className="admin-dashboard-page">
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-page">
      {/* Hero Stats Row */}
      <div className="admin-stats-hero">
        <div className="admin-hero-card" onClick={() => navigate('/dashboard/admin/users')}>
          <div className="admin-hero-icon" style={{ background: 'linear-gradient(135deg, #5ac8fa 0%, #007aff 100%)' }}>
            <Users size={22} />
          </div>
          <div className="admin-hero-info">
            <span className="admin-hero-label">Total Users</span>
            <span className="admin-hero-value">{stats.totalUsers}</span>
          </div>
          <ArrowUpRight size={16} className="admin-hero-arrow" />
        </div>

        <div className="admin-hero-card" onClick={() => navigate('/dashboard/admin/drivers')}>
          <div className="admin-hero-icon" style={{ background: 'linear-gradient(135deg, #d4af37 0%, #b5952f 100%)' }}>
            <UserCheck size={22} />
          </div>
          <div className="admin-hero-info">
            <span className="admin-hero-label">Active Drivers</span>
            <span className="admin-hero-value">{stats.activeDrivers}</span>
          </div>
          <ArrowUpRight size={16} className="admin-hero-arrow" />
        </div>

        <div className="admin-hero-card" onClick={() => navigate('/dashboard/admin/bookings')}>
          <div className="admin-hero-icon" style={{ background: 'linear-gradient(135deg, #30d158 0%, #28a745 100%)' }}>
            <Car size={22} />
          </div>
          <div className="admin-hero-info">
            <span className="admin-hero-label">Total Bookings</span>
            <span className="admin-hero-value">{stats.totalBookings}</span>
          </div>
          <ArrowUpRight size={16} className="admin-hero-arrow" />
        </div>

        <div className="admin-hero-card" onClick={() => navigate('/dashboard/admin/revenue')}>
          <div className="admin-hero-icon" style={{ background: 'linear-gradient(135deg, #bf5af2 0%, #9945ff 100%)' }}>
            <CreditCard size={22} />
          </div>
          <div className="admin-hero-info">
            <span className="admin-hero-label">Commission Earned</span>
            <span className="admin-hero-value">${Number(stats.adminRevenue).toFixed(2)}</span>
          </div>
          <ArrowUpRight size={16} className="admin-hero-arrow" />
        </div>
      </div>

      {/* Booking Status Breakdown */}
      <div className="admin-booking-breakdown">
        <div className="admin-breakdown-item">
          <Clock size={16} color="#5ac8fa" />
          <span className="admin-breakdown-label">Upcoming</span>
          <span className="admin-breakdown-value" style={{ color: '#5ac8fa' }}>{stats.upcomingBookings}</span>
        </div>
        <div className="admin-breakdown-divider"></div>
        <div className="admin-breakdown-item">
          <Activity size={16} color="#ff9f0a" />
          <span className="admin-breakdown-label">In Progress</span>
          <span className="admin-breakdown-value" style={{ color: '#ff9f0a' }}>{stats.startedBookings}</span>
        </div>
        <div className="admin-breakdown-divider"></div>
        <div className="admin-breakdown-item">
          <CheckCircle size={16} color="#34c759" />
          <span className="admin-breakdown-label">Completed</span>
          <span className="admin-breakdown-value" style={{ color: '#34c759' }}>{stats.completedBookings}</span>
        </div>
        <div className="admin-breakdown-divider"></div>
        <div className="admin-breakdown-item">
          <XCircle size={16} color="#ff453a" />
          <span className="admin-breakdown-label">Cancelled</span>
          <span className="admin-breakdown-value" style={{ color: '#ff453a' }}>{stats.cancelledBookings}</span>
        </div>
      </div>

      {/* Main Grid: Pending Drivers + Notifications + Recent Bookings */}
      <div className="admin-main-grid">
        {/* Pending Driver Applications */}
        <div className="admin-card admin-card-pending">
          <div className="admin-card-header">
            <h3>
              <AlertTriangle size={18} color="var(--accent-gold)" />
              Pending Approvals
            </h3>
            {pendingDrivers.length > 0 && (
              <span className="admin-badge-count">{pendingDrivers.length}</span>
            )}
          </div>
          <div className="admin-card-body">
            {pendingDrivers.length === 0 ? (
              <div className="admin-empty-state">
                <CheckCircle size={32} />
                <p>All applications reviewed</p>
              </div>
            ) : (
              pendingDrivers.slice(0, 4).map(driver => (
                <div 
                  key={driver.id} 
                  className="admin-pending-row clickable" 
                  onClick={() => navigate(`/dashboard/admin/drivers?review=${driver.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="admin-pending-avatar">
                    {driver.first_name.charAt(0)}
                  </div>
                  <div className="admin-pending-info">
                    <span className="admin-pending-name">{driver.first_name} {driver.last_name || ''}</span>
                    <span className="admin-pending-phone">{driver.phone_number}</span>
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    <button
                      className="admin-approve-btn"
                      onClick={() => handleQuickApprove(driver.id, driver.first_name)}
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))
            )}
            {pendingDrivers.length > 4 && (
              <button className="admin-see-all-btn" onClick={() => navigate('/dashboard/admin/drivers')}>
                View all {pendingDrivers.length} applications →
              </button>
            )}
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="admin-card admin-card-bookings">
          <div className="admin-card-header">
            <h3>
              <Car size={18} color="#5ac8fa" />
              Recent Bookings
            </h3>
            <button className="admin-see-all-btn-inline" onClick={() => navigate('/dashboard/admin/bookings')}>
              View All
            </button>
          </div>
          <div className="admin-card-body">
            {recentBookings.length === 0 ? (
              <div className="admin-empty-state">
                <Car size={32} />
                <p>No bookings yet</p>
              </div>
            ) : (
              recentBookings.map(b => (
                <div key={b.id} className="admin-booking-row">
                  <div className="admin-booking-ref">{b.bookingRef}</div>
                  <div className="admin-booking-route">
                    <span>{b.location}</span>
                    <span className="admin-route-arrow">→</span>
                    <span>{b.destination}</span>
                  </div>
                  <div className="admin-booking-meta">
                    <span className="admin-booking-client">{b.clientName}</span>
                    <span className="admin-booking-price">{b.price}</span>
                  </div>
                  <span className="admin-status-dot" style={{ background: getStatusColor(b.status) }}></span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="admin-card admin-card-notif">
          <div className="admin-card-header">
            <h3>
              <Bell size={18} color="var(--accent-gold)" />
              System Notifications
            </h3>
            {notifications.filter(n => !n.is_read).length > 0 && (
              <span className="admin-badge-unread">{notifications.filter(n => !n.is_read).length} new</span>
            )}
          </div>
          <div className="admin-card-body admin-notif-scroll">
            {notifications.length === 0 ? (
              <div className="admin-empty-state">
                <Bell size={32} />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.slice(0, 8).map(notif => (
                <div
                  key={notif.id}
                  className={`admin-notif-item ${!notif.is_read ? 'unread' : ''}`}
                  onClick={() => handleMarkRead(notif.id)}
                >
                  <div className="admin-notif-dot-wrapper">
                    {!notif.is_read && <span className="admin-notif-dot"></span>}
                  </div>
                  <div className="admin-notif-content">
                    <span className="admin-notif-title">{notif.title}</span>
                    <p className="admin-notif-msg">{notif.message}</p>
                    <span className="admin-notif-time">
                      {new Date(notif.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
