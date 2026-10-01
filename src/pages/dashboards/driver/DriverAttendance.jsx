import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, Play, Square, Award, History } from 'lucide-react';
import { useAlert } from '../../../context/AlertContext';
import { useAuth } from '../../../context/AuthContext';
import './DriverAttendance.css';

const DriverAttendance = () => {
  const { showAlert } = useAlert();
  const { currentUser, openLogin } = useAuth();
  
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState('Offline');
  const [hoursLogged, setHoursLogged] = useState(0);
  const [monthlyHoursLogged, setMonthlyHoursLogged] = useState(0);
  const [lastClockIn, setLastClockIn] = useState(null);
  const [liveElapsed, setLiveElapsed] = useState(0);
  const [clockLogs, setClockLogs] = useState([]);

  const getStoredAttendance = () => {
    const driverId = currentUser?.id || 3;
    try {
      const raw = localStorage.getItem('hyd_demo_attendance');
      if (raw) {
        const parsed = JSON.parse(raw);
        const record = Array.isArray(parsed) ? parsed.find(a => String(a.user_id) === String(driverId)) : parsed;
        if (record) return record;
      }
    } catch (e) {}
    return {
      user_id: driverId,
      is_clocked_in: 0,
      hours_logged: 5.5,
      monthly_hours_logged: 48.0,
      last_clock_in: null,
      logs: [
        { id: 1, event_type: 'Clock Out', event_time: new Date(Date.now() - 3600000 * 2).toISOString(), status: 'Success' }
      ]
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
    } catch (e) {}
  };

  const fetchAttendance = () => {
    const attData = getStoredAttendance();
    const clockedIn = (attData.is_clocked_in === 1 || attData.online === true) && Boolean(attData.last_clock_in);
    setIsClockedIn(clockedIn);
    setAvailabilityStatus(clockedIn ? 'Online & Available' : 'Offline');
    setHoursLogged(Number(attData.hours_logged || attData.today_hours || 5.5));
    setMonthlyHoursLogged(Number(attData.monthly_hours_logged || 48.0));
    setLastClockIn(clockedIn && attData.last_clock_in ? new Date(attData.last_clock_in) : null);

    const rawLogs = attData.logs || [
      { id: 1, event_type: 'Clock In', event_time: new Date().toISOString(), status: 'Success' }
    ];
    const mappedLogs = rawLogs.map(log => {
      const dateObj = new Date(log.event_time || Date.now());
      return {
        id: log.id,
        type: log.event_type || log.type || 'Clock Event',
        time: dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        status: log.status || 'Success'
      };
    });
    setClockLogs(mappedLogs);
  };

  useEffect(() => {
    fetchAttendance();

    const handleStorage = () => {
      fetchAttendance();
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

  const handleClockToggle = () => {
    const now = new Date();
    const attData = getStoredAttendance();
    const currentlyOn = isClockedIn;
    const existingLogs = attData.logs || [];

    if (!currentlyOn) {
      const newLogs = [
        { id: Date.now(), event_type: 'Clock In', event_time: now.toISOString(), status: 'Success' },
        ...existingLogs
      ];
      const updated = {
        is_clocked_in: 1,
        online: true,
        hours_logged: hoursLogged,
        monthly_hours_logged: monthlyHoursLogged,
        last_clock_in: now.toISOString(),
        logs: newLogs
      };
      saveStoredAttendance(updated);
      setIsClockedIn(true);
      setAvailabilityStatus('Online & Available');
      setLastClockIn(now);
      showAlert("Clocked In successfully! You are now On Duty.", "success");
    } else {
      const addedHours = lastClockIn ? Math.max(0, (now.getTime() - lastClockIn.getTime()) / (1000 * 60 * 60)) : 0;
      const newHours = hoursLogged + addedHours;
      const newMonthly = monthlyHoursLogged + addedHours;
      const newLogs = [
        { id: Date.now(), event_type: 'Clock Out', event_time: now.toISOString(), status: 'Success' },
        ...existingLogs
      ];
      const updated = {
        is_clocked_in: 0,
        online: false,
        hours_logged: newHours,
        monthly_hours_logged: newMonthly,
        last_clock_in: null,
        logs: newLogs
      };
      saveStoredAttendance(updated);
      setIsClockedIn(false);
      setAvailabilityStatus('Offline');
      setHoursLogged(newHours);
      setMonthlyHoursLogged(newMonthly);
      setLastClockIn(null);
      showAlert(`Clocked Out successfully! Added ${formatDurationFriendly(addedHours)}.`, "success");
    }

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('hyd:duty-change', { detail: { is_clocked_in: currentlyOn ? 0 : 1 } }));
    fetchAttendance();
  };



  return (
    <div className="premium-dashboard">
      <div className="attendance-header" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--accent-gold)', padding: '12px', borderRadius: '12px' }}>
          <Clock size={28} />
        </div>
        <div>
          <h1 style={{ margin: 0 }}>Attendance & Availability</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)' }}>Manage your duty status and availability. Drivers operate 24/7 — go on or off duty anytime.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="premium-stat-card">
          <div className="stat-icon-wrapper" style={{ background: isClockedIn ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255,255,255,0.05)', color: isClockedIn ? '#34c759' : 'var(--text-muted)' }}>
            {isClockedIn ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
          </div>
          <div className="stat-details">
            <h3>Duty Status</h3>
            <div className="stat-number" style={{ fontSize: '18px', color: isClockedIn ? '#34c759' : 'var(--text-muted)' }}>{availabilityStatus}</div>
          </div>
        </div>

        <div className="premium-stat-card">
          <div className="stat-icon-wrapper">
            <Clock size={24} />
          </div>
          <div className="stat-details">
            <h3>Hours Worked (Today)</h3>
            <div className="stat-number" style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>
              {isClockedIn ? formatDutyTime(hoursLogged + liveElapsed) : formatDutyTime(hoursLogged)}
            </div>
          </div>
        </div>

        <div className="premium-stat-card">
          <div className="stat-icon-wrapper" style={{ color: 'var(--accent-gold)' }}>
            <Clock size={24} />
          </div>
          <div className="stat-details">
            <h3>Monthly Working Hours</h3>
            <div className="stat-number" style={{ fontFamily: 'monospace', letterSpacing: '1px' }}>
              {isClockedIn ? formatDutyTime(monthlyHoursLogged + liveElapsed) : formatDutyTime(monthlyHoursLogged)}
            </div>
          </div>
        </div>

        <div className="premium-stat-card">
          <div className="stat-icon-wrapper" style={{ color: 'var(--accent-gold)' }}>
            <Award size={24} />
          </div>
          <div className="stat-details">
            <h3>Reliability Score</h3>
            <div className="stat-number">98%</div>
          </div>
        </div>
      </div>

      {/* Main Grid split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginTop: '24px' }}>
        
        {/* Clock Card */}
        <div className="booking-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', textAlign: 'center' }}>
          <div 
            className="pulse-container" 
            style={{ 
              position: 'relative', 
              width: '140px', 
              height: '140px', 
              borderRadius: '50%', 
              background: isClockedIn ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.05)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '24px',
              border: isClockedIn ? '2px solid rgba(52, 199, 89, 0.3)' : '2px solid rgba(255, 59, 48, 0.15)'
            }}
          >
            {isClockedIn && (
              <span className="pulse-ring" style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', border: '2px solid #34c759', animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite', opacity: 0.7 }}></span>
            )}
            <button 
              onClick={handleClockToggle}
              style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                background: isClockedIn ? '#34c759' : '#ff3b30',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '700',
                fontSize: '16px',
                boxShadow: isClockedIn ? '0 8px 25px rgba(52, 199, 89, 0.4)' : '0 8px 25px rgba(255, 59, 48, 0.3)',
                transition: 'all 0.2s',
                zIndex: 5
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {isClockedIn ? (
                <>
                  <Square size={24} />
                  <span>Clock Out</span>
                </>
              ) : (
                <>
                  <Play size={24} style={{ marginLeft: '4px' }} />
                  <span>Clock In</span>
                </>
              )}
            </button>
          </div>
          <h3 style={{ margin: 0, fontSize: '18px' }}>{isClockedIn ? 'You are currently ON DUTY' : 'You are currently OFF DUTY'}</h3>
          <p style={{ margin: '8px 0 0 0', color: 'var(--text-muted)', fontSize: '14px', maxWidth: '280px' }}>
            {isClockedIn 
              ? 'Your location and availability are visible to nearby hire requests.' 
              : 'Clock in to set your status as online and start receiving booking assignments.'}
          </p>
        </div>



      </div>

      {/* Clock Logs Section */}
      <div className="wallet-section" style={{ marginTop: '32px' }}>
        <div className="section-header">
          <h3><History size={20} /> Duty Logs & Clock Events</h3>
        </div>
        
        {clockLogs.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>No clock logs recorded today.</p>
        ) : (
          <div className="transactions-wrapper">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event Type</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {clockLogs.map(log => (
                  <tr key={log.id}>
                    <td>{log.date}</td>
                    <td>
                      <div className="tx-desc" style={{ fontWeight: '600' }}>
                        <div className={`tx-icon`} style={{ background: log.type === 'Clock In' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)', color: log.type === 'Clock In' ? '#34c759' : '#ff3b30', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '10px' }}>
                          <Clock size={14} />
                        </div>
                        {log.type}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-main)', fontWeight: '500' }}>{log.time}</td>
                    <td>
                      <span className="status-badge" style={{ background: 'rgba(52, 199, 89, 0.1)', color: '#34c759' }}>{log.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverAttendance;
