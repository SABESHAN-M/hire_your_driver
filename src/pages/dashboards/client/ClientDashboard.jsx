import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, CreditCard, ShieldCheck, Car, Calendar, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../config';
import { useAlert } from '../../../context/AlertContext';
import './ClientDashboard.css';
import './ClientSafetyCenter.css';

const ClientDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showLowBalanceModal, setShowLowBalanceModal] = useState(false);

  const fetchData = () => {
    if (currentUser?.id) {
      fetch(`${API_BASE_URL}/api/bookings/${currentUser.id}`)
        .then(res => res.json())
        .then(data => setBookings(data))
        .catch(err => console.error('Error fetching bookings:', err));

      fetch(`${API_BASE_URL}/api/notifications?userId=${currentUser.id}&role=client`)
        .then(res => res.json())
        .then(data => setNotifications(data))
        .catch(err => console.error('Error fetching notifications:', err));

      fetch(`${API_BASE_URL}/api/wallet/${currentUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.wallet) {
            setWallet(data.wallet);
            const balanceNum = parseFloat(data.wallet.balance);
            if (balanceNum < 15 && sessionStorage.getItem('dismissedLowBalancePopup') !== 'true') {
              setShowLowBalanceModal(true);
            }
          }
        })
        .catch(err => console.error('Error fetching wallet:', err));
    }
  };

  useEffect(() => {
    fetchData();
    window.addEventListener('storage', fetchData);
    return () => window.removeEventListener('storage', fetchData);
  }, [currentUser]);

  const totalRides = bookings.length;
  const upcomingRides = bookings.filter(b => b.status === 'upcoming' || b.status === 'started').length;
  
  return (
    <div className="premium-dashboard">


      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="premium-stat-card">
          <div className="stat-icon-wrapper">
            <MapPin size={28} />
          </div>
          <div className="stat-details">
            <h3>Total Rides</h3>
            <div className="stat-number">{totalRides}</div>
          </div>
        </div>

        <div className="premium-stat-card">
          <div className="stat-icon-wrapper">
            <Clock size={28} />
          </div>
          <div className="stat-details">
            <h3>Upcoming Bookings</h3>
            <div className="stat-number">{upcomingRides}</div>
          </div>
        </div>

        <div className="premium-stat-card">
          <div className="stat-icon-wrapper">
            <CreditCard size={28} />
          </div>
          <div className="stat-details">
            <h3>Wallet Balance</h3>
            <div className="stat-number">${wallet ? parseFloat(wallet.balance).toFixed(2) : '0.00'}</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="section-header">Quick Actions</h2>
      <div className="actions-grid">
        <div className="action-btn-card" onClick={() => navigate('/dashboard/client/bookings/new')}>
          <Car size={32} />
          <span>Book a Ride</span>
        </div>
        <div className="action-btn-card" onClick={() => navigate('/dashboard/client/bookings/new')}>
          <Calendar size={32} />
          <span>Schedule Future Trip</span>
        </div>
        <div className="action-btn-card" onClick={() => navigate('/dashboard/client/safety')}>
          <ShieldCheck size={32} />
          <span>Safety Center</span>
        </div>
      </div>

      {/* Main Split Console Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginTop: '32px' }} className="client-dashboard-split">
        {/* Left Column: Recent Activity */}
        <div>
          <h2 className="section-header" style={{ marginTop: 0 }}>Recent Activity</h2>
          <div className="activity-list">
            {bookings.length === 0 ? (
              <p className="empty-activity-text">No recent activity. Book a ride to get started!</p>
            ) : (
              bookings.slice(0, 3).map((booking, index) => (
                <div className="activity-item" key={index}>
                  <div className="activity-info">
                    <div className="activity-icon">
                      <Car size={24} />
                    </div>
                    <div className="activity-text">
                      <h4>{booking.destination || 'Destination not set'}</h4>
                      <p>{booking.date} • {booking.carModel || 'Standard'}</p>
                    </div>
                  </div>
                  <div className={`status-badge status-${booking.status}`}>{booking.status.toUpperCase()}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recent Notifications */}
        <div>
          <h2 className="section-header" style={{ marginTop: 0 }}>Recent Notifications</h2>
          <div className="activity-list" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notifications.length === 0 ? (
              <p className="empty-activity-text" style={{ margin: '20px 0' }}>No recent notifications.</p>
            ) : (
              notifications.slice(0, 5).map((notif) => (
                <div 
                  key={notif.id} 
                  style={{ 
                    padding: '12px 16px', 
                    borderRadius: '12px', 
                    background: notif.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(212, 175, 55, 0.05)', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                  onClick={async () => {
                    setSelectedNotification(notif);
                    if (!notif.is_read) {
                      try {
                        const res = await fetch(`${API_BASE_URL}/api/notifications/${notif.id}/read`, { method: 'PATCH' });
                        if (res.ok) {
                          setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: 1 } : n));
                          window.dispatchEvent(new Event('storage'));
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '13px', color: notif.is_read ? 'var(--text-main)' : 'var(--accent-gold)' }}>
                      {notif.title}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {new Date(notif.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    {notif.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* Notification Preview Modal */}
      {selectedNotification && createPortal(
        <div className="safety-modal-overlay">
          <div className="safety-modal-content" style={{ maxWidth: '450px', padding: '28px' }}>
            <div className="safety-modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-gold)' }}>
                {selectedNotification.title}
              </h2>
              <button className="close-modal-btn" onClick={() => setSelectedNotification(null)}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '15px', color: 'var(--text-main)', lineHeight: '1.6', margin: 0 }}>
                {selectedNotification.message}
              </p>
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>Recipient: Client</span>
                <span>
                  {new Date(selectedNotification.created_at).toLocaleDateString(undefined, { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })} at {new Date(selectedNotification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <button 
              type="button" 
              className="safety-btn-primary" 
              onClick={() => setSelectedNotification(null)}
              style={{ marginTop: 0 }}
            >
              Dismiss
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Auto low balance check popup modal */}
      {showLowBalanceModal && createPortal(
        <div className="safety-modal-overlay">
          <div className="safety-modal-content" style={{ maxWidth: '450px', padding: '28px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c', padding: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={36} />
            </div>
            
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#e74c3c', margin: 0 }}>
              Low Wallet Balance Notice
            </h2>
            
            <p style={{ fontSize: '15px', color: 'var(--text-main)', lineHeight: '1.6', margin: 0 }}>
              Your current wallet balance is <strong style={{ color: '#e74c3c' }}>${wallet ? parseFloat(wallet.balance).toFixed(2) : '0.00'}</strong>. To avoid payment failures or booking issues, please reload or transfer funds to your wallet.
            </p>

            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
              <button 
                type="button" 
                className="safety-btn-primary" 
                onClick={() => {
                  sessionStorage.setItem('dismissedLowBalancePopup', 'true');
                  setShowLowBalanceModal(false);
                  navigate('/dashboard/client/wallet');
                }}
                style={{ flex: 1, marginTop: 0, background: 'var(--accent-gold)', color: '#000' }}
              >
                Transfer Funds
              </button>
              <button 
                type="button" 
                className="cancel-btn" 
                onClick={() => {
                  sessionStorage.setItem('dismissedLowBalancePopup', 'true');
                  setShowLowBalanceModal(false);
                }}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', fontWeight: '600', cursor: 'pointer' }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default ClientDashboard;
