import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, CreditCard, ShieldCheck, Car, Calendar, ChevronRight, X, Ticket, Copy, Check } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
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

  const defaultBookings = [
    {
      id: 1,
      booking_reference: 'HYD-7102',
      pickup_location: 'Indiranagar 100ft Road, Bengaluru',
      dropoff_location: 'Kempegowda Int. Airport (BLR)',
      status: 'assigned',
      booking_date: new Date().toISOString(),
      pickup_time: '14:30',
      car_type: 'Sedan (Honda City)',
      estimated_fare: 850,
      driver_name: 'Rajesh Kumar',
      driver_phone: '+91 98765 43212'
    },
    {
      id: 2,
      booking_reference: 'HYD-6819',
      pickup_location: 'MG Road Metro Station',
      dropoff_location: 'Electronic City Phase 1',
      status: 'completed',
      booking_date: new Date(Date.now() - 86400000).toISOString(),
      pickup_time: '10:00',
      car_type: 'SUV (Toyota Fortuner)',
      estimated_fare: 1250,
      driver_name: 'Rajesh Kumar',
      driver_phone: '+91 98765 43212'
    }
  ];

  const defaultNotifications = [
    { id: 101, role: 'client', title: 'Ride Confirmed', message: 'Driver Rajesh Kumar (4.85 ★) has been assigned for booking #HYD-7102.', is_read: 0, created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
    { id: 102, role: 'client', title: 'Chauffeur Arrived', message: 'Your driver has arrived at Indiranagar 100ft Road pickup point.', is_read: 0, created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString() },
    { id: 103, role: 'client', title: 'Wallet Top-Up', message: 'Payment of $50.00 successfully credited to your client wallet.', is_read: 0, created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
    { id: 104, role: 'client', title: 'Safety Telematics Active', message: 'Real-time GPS tracking and 24/7 SOS dispatch enabled for your journey.', is_read: 1, created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString() },
    { id: 105, role: 'client', title: 'Exclusive Promo', message: 'Use code HYD50 to get flat 50% discount on weekend outstation bookings.', is_read: 1, created_at: new Date(Date.now() - 1000 * 60 * 480).toISOString() }
  ];

  const fetchData = () => {
    const clientId = currentUser?.id || 2;
    try {
      const storedBookings = localStorage.getItem('hyd_demo_bookings');
      if (storedBookings) {
        const parsed = JSON.parse(storedBookings);
        const filtered = parsed.filter(b => !b.client_id || String(b.client_id) === String(clientId));
        setBookings(filtered.length > 0 ? filtered : defaultBookings);
      } else {
        setBookings(defaultBookings);
      }
    } catch (e) {
      setBookings(defaultBookings);
    }

    try {
      const storedNotifs = localStorage.getItem('hyd_demo_notifications_client');
      if (storedNotifs) {
        const parsed = JSON.parse(storedNotifs);
        setNotifications(Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultNotifications);
      } else {
        setNotifications(defaultNotifications);
      }
    } catch (e) {
      setNotifications(defaultNotifications);
    }

    try {
      const storedWallet = localStorage.getItem(`hyd_client_wallet_${clientId}`);
      if (storedWallet) {
        const parsed = JSON.parse(storedWallet);
        setWallet(parsed);
      } else {
        const initial = { balance: 250.00, currency: 'USD' };
        setWallet(initial);
      }
    } catch (e) {
      setWallet({ balance: 250.00, currency: 'USD' });
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
                  onClick={() => {
                    setSelectedNotification(notif);
                    if (!notif.is_read) {
                      setNotifications(prev => {
                        const updated = prev.map(n => n.id === notif.id ? { ...n, is_read: 1 } : n);
                        try {
                          localStorage.setItem('hyd_demo_notifications_client', JSON.stringify(updated));
                        } catch (e) {}
                        return updated;
                      });
                      window.dispatchEvent(new Event('storage'));
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
                  {(() => {
                    const itemPromo = extractPromoCode(notif);
                    if (!itemPromo) return null;
                    const isCopied = copiedCode === itemPromo;
                    return (
                      <div 
                        onClick={(e) => e.stopPropagation()} 
                        style={{
                          marginTop: '6px',
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
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* Notification Preview Modal */}
      {selectedNotification && createPortal(
        <div className="safety-modal-overlay" onClick={() => setSelectedNotification(null)}>
          <div className="safety-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', padding: '28px' }}>
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
