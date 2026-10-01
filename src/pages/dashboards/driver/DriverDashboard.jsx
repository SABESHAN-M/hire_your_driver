import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Car, Star, CreditCard, Clock, Check, Square, Play, AlertTriangle, 
  ShieldCheck, FileText, Award, X, Ticket, Copy
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
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

  const getStoredAttendance = () => {
    const driverId = currentUser?.id || 3;
    try {
      const raw = localStorage.getItem('hyd_demo_attendance');
      if (raw) {
        const parsed = JSON.parse(raw);
        const record = Array.isArray(parsed) ? parsed.find(a => String(a.user_id) === String(driverId)) : parsed;
        if (record) return record;
      }
    } catch (e) {
      console.error(e);
    }
    return {
      user_id: driverId,
      is_clocked_in: 0,
      hours_logged: 5.5,
      monthly_hours_logged: 48.0,
      last_clock_in: null
    };
  };

  const saveStoredAttendance = (record) => {
    const driverId = currentUser?.id || 3;
    try {
      let currentArr = [];
      const raw = localStorage.getItem('hyd_demo_attendance');
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) currentArr = parsed;
        } catch (e) {}
      }
      const idx = currentArr.findIndex(a => String(a.user_id) === String(driverId));
      if (idx >= 0) {
        currentArr[idx] = { ...currentArr[idx], ...record };
      } else {
        currentArr.push({ user_id: driverId, ...record });
      }
      localStorage.setItem('hyd_demo_attendance', JSON.stringify(currentArr));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDriverStatsAndRequests = () => {
    const driverId = currentUser?.id || 3;
    
    // 1. Attendance state
    const attData = getStoredAttendance();
    const clockedIn = (attData.is_clocked_in === 1 || attData.online === true) && Boolean(attData.last_clock_in);
    setIsClockedIn(clockedIn);
    setHoursLogged(Number(attData.hours_logged || attData.today_hours || 5.5));
    setMonthlyHoursLogged(Number(attData.monthly_hours_logged || 48.0));
    setLastClockIn(clockedIn && attData.last_clock_in ? new Date(attData.last_clock_in) : null);

    // 2. Metrics & KPIs
    // 2. Metrics & KPIs with live wallet balance
    let currentWalletBalance = 15400.00;
    try {
      const wData = localStorage.getItem(`hyd_driver_wallet_data_${driverId}`);
      if (wData) {
        const parsedW = JSON.parse(wData);
        if (parsedW.wallet?.balance !== undefined) {
          currentWalletBalance = Number(parsedW.wallet.balance);
        }
      }
    } catch (e) {}

    setMetrics({
      totalBookings: 142,
      walletBalance: currentWalletBalance,
      rewardPoints: 850,
      activeReports: 0
    });
    setKpis({
      rating: 4.92,
      acceptance_rate: 96,
      reliability_score: 98,
      loyalty_tier: 'Gold Partner'
    });

    // 3. Available unassigned bookings
    try {
      const storedBookings = localStorage.getItem('hyd_demo_bookings');
      if (storedBookings) {
        const parsed = JSON.parse(storedBookings);
        const unassigned = parsed
          .filter(b => b.status === 'unassigned' || b.status === 'pending' || b.status === 'request')
          .map(b => ({
            ...b,
            id: b.bookingRef || b.booking_reference || `HYD-${b.id || b.dbId}`,
            dbId: b.dbId || b.id,
            bookingRef: b.bookingRef || b.booking_reference || `HYD-${b.id || b.dbId}`,
            clientName: b.clientName || b.client_name || 'Client',
            clientPhone: b.clientPhone || b.client_phone || '+91 98765 00000',
            location: b.location || b.pickup_location || b.pickupLocation || 'Local Pickup',
            destination: b.destination || b.dropoff_location || b.dropoffLocation || 'Local Dropoff',
            dutyType: b.dutyType || b.duty_type || 'Inside City',
            carModel: b.carModel || b.car_type || 'Sedan',
            transmission: b.transmission || 'Automatic',
            price: typeof b.price === 'string' ? b.price : (b.estimated_fare ? `₹${b.estimated_fare}` : '₹650'),
            duration: b.duration || '2.0 hrs',
            status: b.status
          }));
        setAvailableRequests(unassigned);
      } else {
        setAvailableRequests([
          { id: 'HYD-9021', dbId: 101, bookingRef: 'HYD-9021', clientName: 'Ananya Rao', location: 'Hitech City, Hyderabad', destination: 'Gachibowli, Hyderabad', dutyType: 'Inside City', carModel: 'Hyundai Creta', transmission: 'Automatic', price: '₹450', duration: '2.5 hrs', date: 'Today, 4:00 PM', urgency: 'Normal', status: 'request' },
          { id: 'HYD-9022', dbId: 102, bookingRef: 'HYD-9022', clientName: 'Karan Sharma', location: 'Banjara Hills, Hyderabad', destination: 'Vijayawada Highway', dutyType: 'Outstation', carModel: 'Toyota Innova Crysta', transmission: 'Manual', price: '₹2,800', duration: '1 Day', date: 'Tomorrow, 6:00 AM', urgency: 'High', status: 'request' },
          { id: 'HYD-9023', dbId: 103, bookingRef: 'HYD-9023', clientName: 'Siddharth Varma', location: 'Jubilee Hills, Hyderabad', destination: 'RGIA Airport', dutyType: 'One Way', carModel: 'Honda City', transmission: 'Automatic', price: '₹650', duration: '1.5 hrs', date: 'Today, 8:30 PM', urgency: 'Urgent', status: 'request' }
        ]);
      }
    } catch (e) {
      setAvailableRequests([]);
    }

    // 4. Documents & Notifications
    setDocuments([
      { id: 1, document_type: 'Driving License (Front & Back)', status: 'approved' },
      { id: 2, document_type: 'Aadhaar Card Verification', status: 'approved' },
      { id: 3, document_type: 'Police Background Verification', status: 'approved' }
    ]);
    const defaultDriverNotifications = [
      { id: 201, role: 'driver', title: 'Duty Status Offline', message: 'You are currently Off Duty. Toggle On Duty to start receiving client trip requests.', is_read: 0, created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString() },
      { id: 202, role: 'driver', title: 'New Trip Assignment', message: 'New Outstation ride #HYD-8492 available: Indiranagar to Airport ($850.00 fare).', is_read: 0, created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString() },
      { id: 203, role: 'driver', title: 'Weekly Incentive Earned', message: 'Completed 10 rides this week! $50.00 performance bonus added to earnings.', is_read: 0, created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
      { id: 204, role: 'driver', title: 'Bank Payout Processed', message: 'Your cashout transfer of $2,000.00 to HDFC Bank (•••• 4821) has completed.', is_read: 1, created_at: new Date(Date.now() - 1000 * 60 * 210).toISOString() },
      { id: 205, role: 'driver', title: 'Documents Verified', message: 'Commercial Driver License (DL-042019984321) successfully approved by Admin.', is_read: 1, created_at: new Date(Date.now() - 1000 * 60 * 420).toISOString() }
    ];

    try {
      const stored = localStorage.getItem('hyd_demo_notifications_driver');
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultDriverNotifications);
      } else {
        setNotifications(defaultDriverNotifications);
      }
    } catch (e) {
      setNotifications(defaultDriverNotifications);
    }

    // 5. Settings
    const savedPrefs = localStorage.getItem(`ridePreferences_${currentUser?.id || 3}`);
    if (savedPrefs) {
      try {
        const parsed = JSON.parse(savedPrefs);
        setDriverSettings({
          dutyType: parsed.dutyType || 'All',
          transmission: parsed.transmission || 'All',
          carModel: parsed.carModel || '',
          silentRide: parsed.silentRide || false
        });
      } catch (e) {}
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDriverStatsAndRequests();

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

  // Push a duty-status notification into the shared driver notification store
  const pushDutyNotification = (isGoingOnline, durationStr) => {
    const notifKey = 'hyd_demo_notifications_driver';
    const clearedKey = 'hyd_notif_cleared_driver';
    try {
      const raw = localStorage.getItem(notifKey);
      const existing = raw ? JSON.parse(raw) : [];
      const arr = Array.isArray(existing) ? existing : [];
      const newNotif = isGoingOnline
        ? {
            id: Date.now(),
            role: 'driver',
            title: 'You are On Duty',
            message: `You clocked in at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Ride dispatch is now active — you are visible to nearby clients.`,
            is_read: 0,
            created_at: new Date().toISOString(),
            type: 'success'
          }
        : {
            id: Date.now(),
            role: 'driver',
            title: 'You are Off Duty',
            message: `You clocked out at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${durationStr ? `. Session duration: ${durationStr}` : ''}. Ride dispatch paused.`,
            is_read: 0,
            created_at: new Date().toISOString(),
            type: 'warning'
          };
      // Persist to localStorage
      localStorage.setItem(clearedKey, '0');
      localStorage.setItem(notifKey, JSON.stringify([newNotif, ...arr]));
      // Directly inject into DashboardLayout's bell panel via custom event (avoids localStorage read timing issues)
      window.dispatchEvent(new CustomEvent('hyd:new-notification', { detail: newNotif }));
    } catch (e) {}
  };

  const handleClockToggle = () => {
    const now = new Date();
    const attData = getStoredAttendance();
    const currentlyOn = isClockedIn;

    if (!currentlyOn) {
      // Toggle ON
      const updated = {
        is_clocked_in: 1,
        online: true,
        hours_logged: hoursLogged,
        monthly_hours_logged: monthlyHoursLogged,
        last_clock_in: now.toISOString()
      };
      saveStoredAttendance(updated);
      setIsClockedIn(true);
      setLastClockIn(now);
      pushDutyNotification(true, null);
      showAlert("Clocked In successfully! You are now On Duty.", "success");
    } else {
      // Toggle OFF
      const addedHours = lastClockIn ? Math.max(0, (now.getTime() - lastClockIn.getTime()) / (1000 * 60 * 60)) : 0;
      const newHours = hoursLogged + addedHours;
      const newMonthly = monthlyHoursLogged + addedHours;
      const updated = {
        is_clocked_in: 0,
        online: false,
        hours_logged: newHours,
        monthly_hours_logged: newMonthly,
        last_clock_in: null
      };
      saveStoredAttendance(updated);
      setIsClockedIn(false);
      setHoursLogged(newHours);
      setMonthlyHoursLogged(newMonthly);
      setLastClockIn(null);
      pushDutyNotification(false, formatDurationFriendly(addedHours));
      showAlert(`Clocked Out successfully! Added ${formatDurationFriendly(addedHours)}.`, "success");
    }

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('hyd:duty-change', { detail: { is_clocked_in: currentlyOn ? 0 : 1 } }));
  };

  const handleAcceptJob = (dbId, bookingRef) => {
    if (!isClockedIn) {
      showAlert("You must be On Duty to accept rides! Please toggle duty status first.", "error");
      return;
    }

    try {
      const storedBookings = localStorage.getItem('hyd_demo_bookings');
      if (storedBookings) {
        const list = JSON.parse(storedBookings);
        const updated = list.map(b => {
          const matchDb = String(b.dbId) === String(dbId) || String(b.id) === String(dbId);
          const matchRef = (b.booking_reference && b.booking_reference === bookingRef) || (b.bookingRef && b.bookingRef === bookingRef);
          if (matchDb || matchRef) {
            return {
              ...b,
              status: 'upcoming',
              driver_id: currentUser?.id || 3,
              driver_name: currentUser?.name || 'Rajesh Kumar',
              driver_phone: currentUser?.phone || '+91 98765 43212',
              driver_rating: 4.85,
              driver_photo: currentUser?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
              accepted_at: new Date().toISOString()
            };
          }
          return b;
        });
        localStorage.setItem('hyd_demo_bookings', JSON.stringify(updated));

        // Send confirmation notification to client
        const clientNotifKey = 'hyd_demo_notifications_client';
        const rawC = localStorage.getItem(clientNotifKey);
        const cList = rawC ? JSON.parse(rawC) : [];
        const clientAlert = {
          id: Date.now(),
          role: 'client',
          title: 'Chauffeur Assigned!',
          message: `Chauffeur ${currentUser?.name || 'Rajesh Kumar'} accepted booking #${bookingRef || dbId}. They are arriving at your pickup location. Please share your 4-digit start OTP.`,
          is_read: 0,
          created_at: new Date().toISOString(),
          type: 'success'
        };
        localStorage.setItem(clientNotifKey, JSON.stringify([clientAlert, ...(Array.isArray(cList) ? cList : [])]));

        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('hyd:new-notification', { detail: clientAlert }));
      }
    } catch (e) {
      console.error('Error accepting job in DriverDashboard:', e);
    }

    setAvailableRequests(prev => prev.filter(r => String(r.dbId) !== String(dbId) && String(r.id) !== String(dbId)));
    showAlert(`Successfully accepted booking ${bookingRef}! Head to Assigned Rides to navigate and start trip with OTP.`, "success");
  };

  const triggerSOS = () => {
    setSosLoading(true);
    showAlert("SOS SIGNAL SENT! Sharing location with local emergency responders...", "error");
    setTimeout(() => {
      setSosLoading(false);
    }, 2000);
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
            <div className="empty-state offline-state">
              <div className="offline-icon-wrapper">
                <Clock size={36} color="var(--accent-gold)" />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px', color: 'var(--text-main)' }}>
                You are currently Offline
              </h3>
              <p style={{ maxWidth: '420px', margin: '0 auto 28px', color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6' }}>
                You must go online (clock in) to view and receive real-time booking requests from clients.
              </p>
              <button 
                onClick={handleClockToggle} 
                className="go-online-btn"
                title="Click to go on duty and start receiving client trip requests"
              >
                <span className="go-online-pulse-dot" />
                <Play size={16} fill="#000" />
                <span>Go Online (Start Duty)</span>
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
                    onClick={() => {
                      setSelectedNotification(notif);
                      if (!notif.is_read) {
                        setNotifications(prev => {
                          const updated = prev.map(n => n.id === notif.id ? { ...n, is_read: 1 } : n);
                          try {
                            localStorage.setItem('hyd_demo_notifications_driver', JSON.stringify(updated));
                          } catch (e) {}
                          return updated;
                        });
                        window.dispatchEvent(new Event('storage'));
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
                            padding: '4px 8px'
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
                            gap: '4px'
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
                              padding: '2px 8px',
                              fontSize: '10px',
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
