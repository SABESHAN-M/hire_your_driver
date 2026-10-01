import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Car, CreditCard, UserCheck, TrendingUp, Clock, AlertTriangle, CheckCircle, XCircle, Activity, Bell, ArrowUpRight } from 'lucide-react';
import { useAlert } from '../../../context/AlertContext';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 148,
    activeDrivers: 24,
    totalBookings: 312,
    totalRevenue: 28450,
    adminRevenue: 48920.50,
    upcomingBookings: 2,
    startedBookings: 1,
    completedBookings: 305,
    cancelledBookings: 4,
    driverApprovalsPending: 1
  });
  const [notifications, setNotifications] = useState([]);
  const [pendingDrivers, setPendingDrivers] = useState([
    { id: 9, firstName: 'Karan', first_name: 'Karan', lastName: 'Mehta', last_name: 'Mehta', license_no: 'DL-092021004123', email: 'karan@gmail.com', phone_number: '9876543219', status_approval: 'pending' }
  ]);
  const [recentBookings, setRecentBookings] = useState([]);
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const fetchAll = () => {
    try {
      let bookingsList = [];
      const storedBookings = localStorage.getItem('hyd_demo_bookings');
      if (storedBookings) {
        const parsed = JSON.parse(storedBookings);
        bookingsList = Array.isArray(parsed) ? parsed : [];
        setRecentBookings(bookingsList.slice(0, 5));
      } else {
        bookingsList = [
          { id: 1, booking_reference: 'HYD-7102', client_name: 'Rahul Sharma', pickup_location: 'Indiranagar 100ft Road', dropoff_location: 'Kempegowda Airport', status: 'upcoming', estimated_fare: 850, booking_date: new Date().toISOString() },
          { id: 2, booking_reference: 'HYD-6819', client_name: 'Priya Patel', pickup_location: 'MG Road', dropoff_location: 'Electronic City', status: 'completed', estimated_fare: 1250, booking_date: new Date(Date.now() - 86400000).toISOString() }
        ];
        setRecentBookings(bookingsList);
      }

      // Compute status breakdown from active bookings
      const upcoming = bookingsList.filter(b => b.status === 'upcoming' || b.status === 'unassigned' || b.status === 'pending' || b.status === 'request').length;
      const started = bookingsList.filter(b => b.status === 'started' || b.status === 'in_progress').length;
      const completed = bookingsList.filter(b => b.status === 'completed').length;
      const cancelled = bookingsList.filter(b => b.status === 'cancelled').length;

      // Read admin revenue from storage, synced with hyd_demo_bookings
      const completedTripsList = bookingsList.filter(b => b.status === 'completed');
      const settledNetFares = completedTripsList.reduce((acc, b) => {
        const fare = Number(b.estimated_fare || b.fare || b.total_fare || (typeof b.price === 'string' ? b.price.replace(/[^0-9.]/g, '') : b.price) || 0);
        return acc + fare;
      }, 0);
      const completedCommissions = completedTripsList.reduce((acc, b) => {
        const comm = Number(b.company_revenue || b.admin_commission || b.commission || ((b.estimated_fare || b.fare || 0) * 0.15));
        return acc + comm;
      }, 0);

      let adminRevBalance = 25000.00 + completedCommissions - 500.00;
      let totalPlatformRev = settledNetFares > 0 ? settledNetFares : 1250.00;
      try {
        const storedAdminRev = localStorage.getItem('hyd_demo_admin_revenue');
        if (storedAdminRev) {
          const parsedRev = JSON.parse(storedAdminRev);
          if (parsedRev.wallet?.balance !== undefined && parsedRev.wallet?.currency === 'INR') {
            adminRevBalance = Number(parsedRev.wallet.balance);
          }
          if (parsedRev.totalPlatformRevenue !== undefined && parsedRev.wallet?.currency === 'INR') {
            totalPlatformRev = Number(parsedRev.totalPlatformRevenue);
          }
        }
      } catch (e) {}

      // Read users from storage to calculate dynamic user & driver counts
      let registeredUsers = [];
      try {
        const uRaw = localStorage.getItem('hyd_demo_users');
        if (uRaw) registeredUsers = JSON.parse(uRaw) || [];
      } catch (e) {}

      const allDrivers = registeredUsers.filter(u => u.role === 'driver');
      const defaultPending = [
        { id: 9, firstName: 'Karan', first_name: 'Karan', lastName: 'Mehta', last_name: 'Mehta', license_no: 'DL-092021004123', email: 'karan@gmail.com', phone_number: '9876543219', status_approval: 'pending' }
      ];

      const pendingMap = new Map();
      defaultPending.forEach(p => pendingMap.set(p.email || p.id, p));
      allDrivers.filter(d => d.status_approval === 'pending').forEach(d => pendingMap.set(d.email || d.id, d));
      // Remove any that were approved in hyd_demo_users
      registeredUsers.forEach(u => {
        if (u.status_approval === 'approved' && pendingMap.has(u.email || u.id)) {
          pendingMap.delete(u.email || u.id);
        }
      });
      const dynamicPendingDrivers = Array.from(pendingMap.values());

      setPendingDrivers(dynamicPendingDrivers);

      const approvedDriversCount = 24 + allDrivers.filter(d => d.status_approval === 'approved').length;
      const totalUsersCount = 148 + registeredUsers.length;

      setStats(prev => ({
        ...prev,
        totalUsers: totalUsersCount,
        activeDrivers: approvedDriversCount,
        driverApprovalsPending: dynamicPendingDrivers.length,
        totalBookings: Math.max(prev?.totalBookings || 312, 310 + bookingsList.length),
        totalRevenue: totalPlatformRev,
        adminRevenue: adminRevBalance,
        upcomingBookings: upcoming,
        startedBookings: started,
        completedBookings: Math.max(305, completed),
        cancelledBookings: cancelled
      }));

      const defaultAdminNotifications = [
        { id: 301, role: 'admin', title: 'New Driver Registration', message: 'Driver Karan Mehta submitted Commercial Driving License & ID proof for verification.', is_read: 0, created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
        { id: 302, role: 'admin', title: 'Revenue Milestone', message: 'Bengaluru metropolitan revenue crossed $28,450.00 (18% above weekly target).', is_read: 0, created_at: new Date(Date.now() - 1000 * 60 * 50).toISOString() },
        { id: 303, role: 'admin', title: 'Fleet Telematics Active', message: 'All 24 active driver telematics streams and emergency dispatch channels online.', is_read: 0, created_at: new Date(Date.now() - 1000 * 60 * 140).toISOString() },
        { id: 304, role: 'admin', title: 'Surge Demand Detected', message: 'High booking volume detected around Indiranagar & Whitefield tech corridor.', is_read: 1, created_at: new Date(Date.now() - 1000 * 60 * 260).toISOString() },
        { id: 305, role: 'admin', title: 'Campaign Broadcast', message: 'Weekend promo campaign "Summer Festival 50%" delivered to all active clients.', is_read: 1, created_at: new Date(Date.now() - 1000 * 60 * 500).toISOString() }
      ];

      const storedNotifs = localStorage.getItem('hyd_demo_notifications_admin');
      if (storedNotifs) {
        const parsed = JSON.parse(storedNotifs);
        setNotifications(Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultAdminNotifications);
      } else {
        setNotifications(defaultAdminNotifications);
      }
    } catch (err) {
      console.error('Admin dashboard local error:', err);
    }
  };

  useEffect(() => {
    fetchAll();
    window.addEventListener('storage', fetchAll);
    return () => {
      window.removeEventListener('storage', fetchAll);
    };
  }, []);

  const handleMarkRead = (id) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, is_read: 1 } : n);
      try {
        localStorage.setItem('hyd_demo_notifications_admin', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    window.dispatchEvent(new Event('storage'));
  };

  const handleQuickApprove = (id, name) => {
    showAlert(`Driver ${name} approved successfully!`, 'success');
    setPendingDrivers(prev => prev.filter(d => d.id !== id));
    setStats(prev => ({
      ...prev,
      activeDrivers: prev.activeDrivers + 1,
      driverApprovalsPending: Math.max(0, prev.driverApprovalsPending - 1)
    }));

    try {
      const stored = localStorage.getItem('hyd_demo_users');
      let allUsers = stored ? JSON.parse(stored) : [];
      const idx = allUsers.findIndex(u => u.id === id || `${u.first_name || u.firstName} ${u.last_name || u.lastName}`.trim() === name.trim());
      if (idx >= 0) {
        allUsers[idx] = { ...allUsers[idx], status_approval: 'approved' };
      } else {
        allUsers.push({ id, first_name: name, status_approval: 'approved', role: 'driver' });
      }
      localStorage.setItem('hyd_demo_users', JSON.stringify(allUsers));

      // Push notification to driver
      const rawNotifs = localStorage.getItem('hyd_demo_notifications_driver');
      const driverNotifs = rawNotifs ? JSON.parse(rawNotifs) : [];
      driverNotifs.unshift({
        id: Date.now(),
        role: 'driver',
        title: 'Account Approved by Admin',
        message: `Congratulations ${name}! Admin has approved your driver credentials. You can now toggle On Duty to receive client rides.`,
        is_read: 0,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('hyd_demo_notifications_driver', JSON.stringify(driverNotifs));

      window.dispatchEvent(new Event('storage'));
    } catch (e) {}
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
            <span className="admin-hero-value">₹{Number(stats?.adminRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
