import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Car, Star, CreditCard, Clock, Check, Square, Play, AlertTriangle, 
  ShieldCheck, FileText, Award, X
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../config';
import { useAlert } from '../../../context/AlertContext';
import './DriverSafetyCenter.css';

const DriverDashboard = () => {
  const { currentUser } = useAuth();
  const { showAlert } = useAlert();
  
  const [metrics, setMetrics] = useState({
    totalBookings: 0,
    walletBalance: 0.00,
    rewardPoints: 0,
    activeReports: 0
  });
  const [availableRequests, setAvailableRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [hoursLogged, setHoursLogged] = useState(0);
  const [monthlyHoursLogged, setMonthlyHoursLogged] = useState(0);
  const [lastClockIn, setLastClockIn] = useState(null);
  const [liveElapsed, setLiveElapsed] = useState(0);
  const [sosLoading, setSosLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showAllJobs, setShowAllJobs] = useState(false);

  const [kpis, setKpis] = useState({
    rating: 4.92,
    acceptance_rate: 96,
    reliability_score: 98,
    loyalty_tier: 'Gold Partner'
  });
  const [documents, setDocuments] = useState([]);
  const [driverSettings, setDriverSettings] = useState({
    dutyType: 'All',
    transmission: 'All',
    carModel: '',
    silentRide: false
  });

  const fetchDriverStatsAndRequests = async () => {
    if (!currentUser?.id) return;
    try {
      // 1. Fetch user metrics
      const statsRes = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setMetrics(statsData.metrics);
      }

      // 2. Fetch unassigned available bookings
      const reqsRes = await fetch(`${API_BASE_URL}/api/bookings/unassigned/available?driverId=${currentUser.id}`);
      if (reqsRes.ok) {
        const reqsData = await reqsRes.json();
        setAvailableRequests(reqsData);
      }

      // 3. Fetch real attendance state from database
      const attRes = await fetch(`${API_BASE_URL}/api/driver/attendance/${currentUser.id}`);
      if (attRes.ok) {
        const attData = await attRes.json();
        const clockedIn = attData.attendance.is_clocked_in === 1;
        setIsClockedIn(clockedIn);
        setHoursLogged(Number(attData.attendance.hours_logged));
        setMonthlyHoursLogged(Number(attData.attendance.monthly_hours_logged || 0));
        setLastClockIn(clockedIn && attData.attendance.last_clock_in ? new Date(attData.attendance.last_clock_in) : null);
      }

      // 4. Fetch real KPIs from database
      const kpisRes = await fetch(`${API_BASE_URL}/api/driver/kpis/${currentUser.id}`);
      if (kpisRes.ok) {
        const kpisData = await kpisRes.json();
        setKpis(kpisData);
      }

      // 5. Fetch compliance checklist documents from database
      const docsRes = await fetch(`${API_BASE_URL}/api/driver/documents/${currentUser.id}`);
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData);
      }

      // 6. Fetch recent notifications
      const notifsRes = await fetch(`${API_BASE_URL}/api/notifications?userId=${currentUser.id}&role=driver`);
      if (notifsRes.ok) {
        const notifsData = await notifsRes.json();
        setNotifications(notifsData);
      }

      // 7. Fetch driver settings
      const settingsRes = await fetch(`${API_BASE_URL}/api/users/${currentUser.id}/settings`);
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setDriverSettings({
          dutyType: settingsData.duty_type || 'All',
          transmission: settingsData.transmission || 'All',
          carModel: settingsData.car_model || '',
          silentRide: settingsData.silent_ride === 1
        });
      } else {
        // Fallback to local storage if API fails
        const savedPrefs = localStorage.getItem(`ridePreferences_${currentUser.id}`);
        if (savedPrefs) {
          const parsed = JSON.parse(savedPrefs);
          setDriverSettings({
            dutyType: parsed.dutyType || 'All',
            transmission: parsed.transmission || 'All',
            carModel: parsed.carModel || '',
            silentRide: parsed.silentRide || false
          });
        }
      }
    } catch (err) {
      console.error('Error fetching driver dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverStatsAndRequests();

    // Listen for storage events to update clock state if changed in Attendance page
    const handleStorage = () => {
      fetchDriverStatsAndRequests();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [currentUser]);

  // Live timer: tick every second while on duty
  useEffect(() => {
    if (!isClockedIn || !lastClockIn) {
      setLiveElapsed(0);
      return;
    }
    const tick = () => {
      const diffMs = Date.now() - lastClockIn.getTime();
      setLiveElapsed(diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isClockedIn, lastClockIn]);

  const formatDutyTime = (totalHours) => {
    const h = Math.floor(totalHours);
    const m = Math.floor((totalHours - h) * 60);
    const s = Math.floor(((totalHours - h) * 60 - m) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatDurationFriendly = (hours) => {
    if (!hours) return "0s";
    const totalSeconds = Math.round(hours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    return parts.join(' ');
  };

  const handleClockToggle = async () => {
    if (!currentUser?.id) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/driver/attendance/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      if (res.ok) {
        const data = await res.json();
        const nowClockedIn = data.attendance.is_clocked_in === 1;
        setIsClockedIn(nowClockedIn);
        setHoursLogged(Number(data.attendance.hours_logged));
        setMonthlyHoursLogged(Number(data.attendance.monthly_hours_logged || 0));
        setLastClockIn(nowClockedIn && data.attendance.last_clock_in ? new Date(data.attendance.last_clock_in) : null);
        
        if (data.attendance.is_clocked_in === 0) {
          showAlert(`Clocked Out successfully! Added ${formatDurationFriendly(data.addedHours)}.`, "success");
        } else {
          showAlert("Clocked In successfully! You are now Online.", "success");
        }
        
        // Dispatch storage event so other components update instantly
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err) {
      console.error('Toggle clock state error:', err);
      showAlert("Error toggling duty status", "error");
    }
  };

  const handleAcceptJob = async (dbId, bookingRef) => {
    const driverName = `${currentUser.firstName} ${currentUser.lastName || ''}`.trim();
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${dbId}/accept`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverName, driverId: currentUser.id })
      });
      if (res.ok) {
        showAlert(`Successfully accepted booking ${bookingRef}!`, "success");
        fetchDriverStatsAndRequests();
      } else {
        const data = await res.json();
        showAlert(data.error || "Failed to accept booking", "error");
      }
    } catch (error) {
      console.error('Error accepting booking:', error);
      showAlert("Error accepting booking", "error");
    }
  };

  const triggerSOS = async () => {
    setSosLoading(true);
    showAlert("SOS SIGNAL SENT! Sharing location with local emergency responders...", "error");
    try {
      await fetch(`${API_BASE_URL}/api/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      setTimeout(() => {
        setSosLoading(false);
      }, 3000);
    } catch (err) {
      console.error(err);
      setSosLoading(false);
    }
  };

  // Filter bookings based on driver settings
  const filteredRequests = availableRequests.filter(req => {
    // 1. Preferred Trip Type Filter
    if (driverSettings.dutyType && driverSettings.dutyType !== 'All') {
      if (req.dutyType !== driverSettings.dutyType) return false;
    }
    // 2. Preferred Transmission Filter
    if (driverSettings.transmission && driverSettings.transmission !== 'All') {
      if (req.transmission !== driverSettings.transmission) return false;
    }
    // 3. Preferred Car Model Filter (substring, case-insensitive)
    if (driverSettings.carModel && driverSettings.carModel.trim() !== '') {
      const filter = driverSettings.carModel.toLowerCase().trim();
      const model = (req.carModel || '').toLowerCase().trim();
      if (!model.includes(filter)) return false;
    }
    // 4. Accept Silent Trips Filter
    // If driver doesn't accept silent trips (silentRide is false) and the client requested silent ride (clientSilentRide is true)
    if (!driverSettings.silentRide && req.clientSilentRide) {
      return false;
    }
    return true;
  });

  return (
    <div className="premium-dashboard">
      
      {/* 1. Driver Console Duty Banner */}
      <div 
        className="booking-card duty-console-banner" 
        style={{ 
          background: isClockedIn 
            ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.15) 0%, rgba(20, 20, 20, 0.6) 100%)' 
            : 'linear-gradient(135deg, rgba(255, 59, 48, 0.08) 0%, rgba(20, 20, 20, 0.6) 100%)',
          border: isClockedIn ? '1px solid rgba(52, 199, 89, 0.3)' : '1px solid rgba(255, 59, 48, 0.15)',
          borderRadius: '20px',
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          marginBottom: '32px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div 
            className="pulse-container" 
            style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '50%', 
              background: isClockedIn ? 'rgba(52, 199, 89, 0.2)' : 'rgba(255, 59, 48, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: isClockedIn ? '2px solid #34c759' : '2px solid #ff3b30'
            }}
          >
            <span 
              className={isClockedIn ? 'pulse-ring' : ''} 
              style={{ 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%', 
                background: isClockedIn ? '#34c759' : '#ff3b30',
                display: 'block' 
              }}
            ></span>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-main)' }}>
              Console Status: <span style={{ color: isClockedIn ? '#34c759' : '#ff3b30', fontWeight: '800' }}>{isClockedIn ? 'ONLINE' : 'OFFLINE'}</span>
            </h2>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
              {isClockedIn 
                ? 'You are active. Clients can see your position and assign ride listings.' 
                : 'You are off duty. Clock in to receive ride assignments.'}
            </p>
          </div>
        </div>

        <button 
          onClick={handleClockToggle}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            background: isClockedIn ? '#ff3b30' : 'var(--accent-gold)',
            color: isClockedIn ? '#fff' : '#000',
            border: 'none',
            fontSize: '15px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            boxShadow: isClockedIn ? '0 4px 15px rgba(255, 59, 48, 0.2)' : '0 4px 15px rgba(212, 175, 55, 0.2)'
          }}
        >
          {isClockedIn ? (
            <>
              <Square size={16} /> Go Off Duty
            </>
          ) : (
            <>
              <Play size={16} fill="#000" /> Go On Duty
            </>
          )}
        </button>
      </div>

      {/* 2. Key Performance Indicators (KPIs) */}
      <div className="stats-grid">
        <div className="premium-stat-card">
          <div className="stat-icon-wrapper">
            <Car size={28} />
          </div>
          <div className="stat-details">
            <h3>Trips Logged</h3>
            <div className="stat-number">{metrics.totalBookings}</div>
          </div>
        </div>

        <div className="premium-stat-card">
          <div className="stat-icon-wrapper">
            <Star size={28} color="var(--accent-gold)" />
          </div>
          <div className="stat-details">
            <h3>Platform Rating</h3>
            <div className="stat-number">{Number(kpis.rating).toFixed(2)} ★</div>
          </div>
        </div>

        <div className="premium-stat-card">
          <div className="stat-icon-wrapper" style={{ color: '#34c759' }}>
            <CreditCard size={28} />
          </div>
          <div className="stat-details">
            <h3>Earnings Balance</h3>
            <div className="stat-number">${parseFloat(metrics.walletBalance).toFixed(2)}</div>
          </div>
        </div>

        <div className="premium-stat-card">
          <div className="stat-icon-wrapper" style={{ color: 'var(--accent-gold)' }}>
            <Clock size={28} />
          </div>
          <div className="stat-details">
            <h3>Duty Hours</h3>
            <div className="stat-number" style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>
              {isClockedIn ? formatDutyTime(hoursLogged + liveElapsed) : formatDutyTime(hoursLogged)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Split Console Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', alignItems: 'start', flexWrap: 'wrap' }} className="driver-dashboard-split">
        
        {/* Left Console: Job Requests */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 className="section-header" style={{ margin: 0 }}>Available Job Listings</h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {showAllJobs ? (
                <button
                  onClick={() => setShowAllJobs(false)}
                  style={{
                    fontSize: '12px',
                    padding: '4px 10px',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Show Matching Only
                </button>
              ) : (
                availableRequests.length > filteredRequests.length && (
                  <button
                    onClick={() => setShowAllJobs(true)}
                    style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      background: 'rgba(212,175,55,0.1)',
                      color: 'var(--accent-gold)',
                      border: '1px solid var(--accent-gold)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    View All ({availableRequests.length})
                  </button>
                )
              )}
              <span style={{ fontSize: '13px', padding: '4px 10px', background: 'rgba(212,175,55,0.08)', color: 'var(--accent-gold)', borderRadius: '12px', fontWeight: '600' }}>
                {showAllJobs ? availableRequests.length : filteredRequests.length} {showAllJobs ? 'Total' : 'Matching'}
              </span>
            </div>
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Updating jobs feed...</p>
          ) : !isClockedIn ? (
            <div className="empty-state offline-state" style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '16px' }}>
              <Clock size={48} color="var(--accent-gold)" style={{ opacity: 0.8, marginBottom: '16px', margin: '0 auto' }} />
              <h3 style={{ color: 'var(--text-main)', marginTop: '8px' }}>You are currently Offline</h3>
              <p style={{ maxWidth: '400px', margin: '8px auto 24px auto', color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5' }}>
                You must go online (clock in) to view and receive new booking requests from clients.
              </p>
              <button 
                onClick={handleClockToggle} 
                className="action-btn accept-btn"
                style={{ width: 'auto', padding: '12px 32px', margin: '0 auto', background: 'var(--accent-gold)', color: '#000', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Play size={14} fill="#000" /> Go Online
              </button>
            </div>
          ) : (showAllJobs ? availableRequests : filteredRequests).length === 0 ? (
            <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '16px' }}>
              <Car size={48} color="var(--text-muted)" style={{ marginBottom: '16px', margin: '0 auto' }} />
              {availableRequests.length > 0 ? (
                <>
                  <h3>No matching booking requests</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '360px', margin: '8px auto 0 auto' }}>
                    There are no active booking requests matching your preferred job dispatch filters (Duty: {driverSettings.dutyType}, Gear: {driverSettings.transmission}).
                  </p>
                  <button
                    onClick={() => setShowAllJobs(true)}
                    style={{
                      marginTop: '16px',
                      padding: '8px 16px',
                      background: 'var(--accent-gold)',
                      color: '#000',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    View All Available Jobs ({availableRequests.length})
                  </button>
                </>
              ) : (
                <>
                  <h3>No available booking requests</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '360px', margin: '8px auto 0 auto' }}>
                    There are no active booking requests on the platform right now. Check back later!
                  </p>
                </>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {(showAllJobs ? availableRequests : filteredRequests).map((req) => (
                <div key={req.id} className="booking-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ background: 'rgba(212, 175, 55, 0.1)', color: 'var(--accent-gold)', padding: '12px', borderRadius: '12px' }}>
                      <Car size={24} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: '700', color: 'var(--accent-gold)' }}>{req.id}</span>
                        <span style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', textTransform: 'uppercase' }}>{req.status}</span>
                      </div>
                      <p style={{ margin: '8px 0 0 0', fontWeight: '600', fontSize: '14px', color: 'var(--text-main)' }}>
                        Pickup: {req.location}
                      </p>
                      {req.destination && (
                        <p style={{ margin: '4px 0 0 0', fontWeight: '500', fontSize: '13px', color: 'var(--text-muted)' }}>
                          Drop: {req.destination}
                        </p>
                      )}
                      <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Type: {req.dutyType} • Est. {req.duration}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>Job Payout</span>
                      <span style={{ fontSize: '20px', fontWeight: '800', color: '#34c759' }}>{req.price}</span>
                    </div>
                    
                    <button 
                      onClick={() => handleAcceptJob(req.dbId, req.id)}
                      className="primary-btn"
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        background: 'var(--accent-gold)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'opacity 0.2s'
                      }}
                    >
                      <Check size={14} /> Accept Ride
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Console: Status Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Notification Console */}
          <div className="booking-card" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} color="var(--accent-gold)" /> Notification Console
              </div>
              {notifications.filter(n => !n.is_read).length > 0 && (
                <span style={{ fontSize: '11px', background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>
                  {notifications.filter(n => !n.is_read).length} New
                </span>
              )}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }} className="custom-scrollbar">
              {notifications.length === 0 ? (
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No recent updates.</p>
              ) : (
                notifications.slice(0, 5).map((notif) => (
                  <div 
                    key={notif.id} 
                    style={{ 
                      padding: '10px 12px', 
                      borderRadius: '8px', 
                      background: notif.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(212, 175, 55, 0.05)', 
                      border: '1px solid rgba(255,255,255,0.05)',
                      fontSize: '12px',
                      cursor: 'pointer'
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '700', color: notif.is_read ? 'var(--text-main)' : 'var(--accent-gold)' }}>{notif.title}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: '1.3' }}>{notif.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Shift Card */}
          <div className="booking-card" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color="var(--accent-gold)" /> Performance Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Duty Hours Today</span>
                <span style={{ fontWeight: '600', color: 'var(--text-main)', fontFamily: 'monospace' }}>{isClockedIn ? formatDutyTime(hoursLogged + liveElapsed) : formatDutyTime(hoursLogged)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Monthly Working Hours</span>
                <span style={{ fontWeight: '600', color: 'var(--text-main)', fontFamily: 'monospace' }}>{isClockedIn ? formatDutyTime(monthlyHoursLogged + liveElapsed) : formatDutyTime(monthlyHoursLogged)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Reliability Score</span>
                <span style={{ fontWeight: '600', color: '#34c759' }}>{kpis.reliability_score}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Acceptance Rate</span>
                <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{kpis.acceptance_rate}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Loyalty Tier</span>
                <span style={{ fontWeight: '600', color: 'var(--accent-gold)' }}>{kpis.loyalty_tier}</span>
              </div>
            </div>
          </div>

          {/* Compliance Status Checks */}
          <div className="booking-card" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="var(--accent-gold)" /> Compliance Checklist
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {documents.map((doc) => (
                <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <FileText size={14} color="var(--text-muted)" />
                    <span>{doc.document_name}</span>
                  </div>
                  <span 
                    className="status-badge" 
                    style={{ 
                      background: doc.status === 'Verified' 
                        ? 'rgba(52, 199, 89, 0.1)' 
                        : doc.status === 'Expiring Soon'
                          ? 'rgba(255, 149, 0, 0.1)'
                          : 'rgba(0, 122, 255, 0.1)', 
                      color: doc.status === 'Verified' 
                        ? '#34c759' 
                        : doc.status === 'Expiring Soon'
                          ? '#ff9500'
                          : '#007aff', 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      fontSize: '11px',
                      textTransform: 'uppercase'
                    }}
                  >
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* SOS Panel */}
          <div className="booking-card" style={{ padding: '20px', border: '1px solid rgba(255,68,68,0.2)', background: 'rgba(255, 68, 68, 0.02)' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4444' }}>
              <AlertTriangle size={18} /> Emergency Console
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Ping your primary emergency contacts and share coordinates in real time.
            </p>
            <button 
              onClick={triggerSOS}
              disabled={sosLoading}
              style={{
                width: '100%',
                marginTop: '14px',
                padding: '10px',
                background: '#ff4444',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {sosLoading ? "Pinging Responders..." : "Trigger SOS Signal"}
            </button>
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
                <span>Recipient: Driver</span>
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

    </div>
  );
};

export default DriverDashboard;
