import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Car, Clock, Calendar as CalendarIcon, ChevronRight, Search, Filter, User } from 'lucide-react';
import { useAlert } from '../../../context/AlertContext';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../config';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './DriverBookings.css';

const DriverBookings = () => {
  const { showAlert } = useAlert();
  const { currentUser } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('requests');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      if (['active', 'upcoming', 'scheduled'].includes(tabParam)) {
        setActiveTab('upcoming');
      } else if (['history', 'completed', 'past', 'route-details', 'completed-deliveries'].includes(tabParam)) {
        setActiveTab('past');
      } else if (['requests', 'assigned-orders', 'pending-pickups'].includes(tabParam)) {
        setActiveTab('requests');
      }
    }
  }, [location.search]);
  
  const [availableRequests, setAvailableRequests] = useState([]);
  const [assignedRides, setAssignedRides] = useState([]);
  const [declinedIds, setDeclinedIds] = useState([]);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [enteringOtpId, setEnteringOtpId] = useState(null);
  const [otpValue, setOtpValue] = useState('');
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDutyType, setSelectedDutyType] = useState('all');
  const [selectedTransmission, setSelectedTransmission] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Load declined requests on mount
  useEffect(() => {
    if (currentUser?.id) {
      const stored = JSON.parse(localStorage.getItem(`declinedBookings_${currentUser.id}`) || '[]');
      setDeclinedIds(stored);
    }
  }, [currentUser]);

  const fetchData = async () => {
    if (!currentUser?.id) return;
    const driverName = `${currentUser.firstName} ${currentUser.lastName || ''}`.trim();
    try {
      setLoading(true);
      // Fetch assigned bookings
      const assignedRes = await fetch(`${API_BASE_URL}/api/bookings/driver/${encodeURIComponent(driverName)}`);
      if (assignedRes.ok) {
        const data = await assignedRes.json();
        setAssignedRides(data);
      }
      
      // Fetch attendance state to determine clock-in status
      const attRes = await fetch(`${API_BASE_URL}/api/driver/attendance/${currentUser.id}`);
      if (attRes.ok) {
        const attData = await attRes.json();
        setIsClockedIn(attData.attendance.is_clocked_in === 1);
      }
      
      // Fetch available unassigned bookings
      const availableRes = await fetch(`${API_BASE_URL}/api/bookings/unassigned/available?driverId=${currentUser.id}`);
      if (availableRes.ok) {
        const data = await availableRes.json();
        setAvailableRequests(data);
      }
    } catch (err) {
      console.error('Error fetching driver bookings data:', err);
    } finally {
      setLoading(false);
    }
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
        if (nowClockedIn) {
          showAlert("Clocked In successfully! You are now Online.", "success");
        } else {
          showAlert("Clocked Out successfully!", "success");
        }
        window.dispatchEvent(new Event('storage'));
        fetchData();
      }
    } catch (err) {
      console.error('Toggle clock state error:', err);
      showAlert("Error toggling duty status", "error");
    }
  };

  useEffect(() => {
    fetchData();

    // Listen for storage events (e.g. duty status toggle from other pages)
    const handleStorage = () => {
      fetchData();
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [currentUser]);

  const handleAccept = async (dbId, bookingRef) => {
    const driverName = `${currentUser.firstName} ${currentUser.lastName || ''}`.trim();
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${dbId}/accept`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverName, driverId: currentUser.id })
      });
      if (res.ok) {
        showAlert(`Successfully accepted ride ${bookingRef}!`, "success");
        fetchData();
        const acceptedRide = availableRequests.find(r => r.dbId === dbId);
        if (acceptedRide) {
          setSelectedTrip({ ...acceptedRide, status: 'upcoming' });
        }
      } else {
        const data = await res.json();
        showAlert(data.error || "Failed to accept ride request", "error");
      }
    } catch (error) {
      console.error('Error accepting ride:', error);
      showAlert("Error accepting ride request", "error");
    }
  };

  const handleDecline = (dbId, bookingRef) => {
    const updated = [...declinedIds, dbId];
    setDeclinedIds(updated);
    localStorage.setItem(`declinedBookings_${currentUser.id}`, JSON.stringify(updated));
    showAlert(`Declined ride request ${bookingRef}.`, "info");
  };

  const handleStartTrip = async (dbId, bookingRef, otpCode) => {
    if (!otpCode || otpCode.length < 4) {
      showAlert("Please enter a valid 4-digit OTP", "error");
      return false;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${dbId}/start`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpCode })
      });
      if (res.ok) {
        showAlert(`Successfully started trip ${bookingRef}!`, "success");
        setEnteringOtpId(null);
        setOtpValue('');
        fetchData();
        return true;
      } else {
        const data = await res.json();
        showAlert(data.error || "Failed to start trip. Check the OTP.", "error");
        return false;
      }
    } catch (error) {
      console.error('Error starting trip:', error);
      showAlert("Error starting trip", "error");
      return false;
    }
  };

  const handleCompleteTrip = async (dbId, bookingRef) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${dbId}/complete`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        showAlert(`Successfully completed trip ${bookingRef}! Earnings Share: $${data.driverShare.toFixed(2)} (70%), Admin Share: $${data.adminShare.toFixed(2)} (30%)`, "success");
        fetchData();
      } else {
        const errData = await res.json();
        showAlert(errData.error || "Failed to complete trip", "error");
      }
    } catch (error) {
      console.error('Error completing trip:', error);
      showAlert("Error completing trip", "error");
    }
  };

  // Filter out requests that this driver declined
  const visibleRequests = availableRequests.filter(req => !declinedIds.includes(req.dbId));
  
  const upcomingRides = assignedRides.filter(r => r.status === 'upcoming' || r.status === 'started');
  const pastRides = assignedRides.filter(r => r.status !== 'upcoming' && r.status !== 'started');

  // Filter logic based on active tab
  const getActiveList = () => {
    if (activeTab === 'requests') return visibleRequests;
    if (activeTab === 'upcoming') return upcomingRides;
    return pastRides;
  };

  const filteredRides = getActiveList().filter(ride => {
    // 1. Search query filter
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const matchesSearch = 
        ride.id.toLowerCase().includes(query) || 
        ride.location.toLowerCase().includes(query) || 
        (ride.destination && ride.destination.toLowerCase().includes(query)) ||
        ride.carModel.toLowerCase().includes(query) ||
        (ride.clientName && ride.clientName.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }
    
    // 2. Duty Type filter
    if (selectedDutyType !== 'all' && ride.dutyType !== selectedDutyType) return false;
    
    // 3. Transmission filter
    if (selectedTransmission !== 'all' && ride.transmission !== selectedTransmission) return false;
    
    return true;
  });

  const sortedRides = [...filteredRides].sort((a, b) => {
    if (sortBy === 'newest') {
      return b.dbId - a.dbId;
    } else if (sortBy === 'oldest') {
      return a.dbId - b.dbId;
    } else if (sortBy === 'price-low') {
      const priceA = parseFloat(a.price.replace(/[^0-9.]/g, '')) || 0;
      const priceB = parseFloat(b.price.replace(/[^0-9.]/g, '')) || 0;
      return priceA - priceB;
    } else if (sortBy === 'price-high') {
      const priceA = parseFloat(a.price.replace(/[^0-9.]/g, '')) || 0;
      const priceB = parseFloat(b.price.replace(/[^0-9.]/g, '')) || 0;
      return priceB - priceA;
    }
    return 0;
  });

  const renderRideCard = (ride, isRequest = false) => (
    <div key={ride.id} className="booking-card">
      <div className="booking-header">
        <div className="booking-id-date">
          <span className="booking-id">{ride.id}</span>
          <span className="booking-date"><CalendarIcon size={14} /> {ride.date}</span>
        </div>
        <div className={`status-badge status-${ride.status}`}>
          {ride.status.toUpperCase()}
        </div>
      </div>
      
      <div className="booking-route booking-route-details">
        <div className="route-point">
          <div className="point-icon origin"></div>
          <div className="route-info">
            <p className="booking-location-text">Pickup: {ride.location}</p>
            {ride.destination && <p className="booking-location-text">Drop: {ride.destination}</p>}
            <p className="booking-trip-details">Trip: {ride.dutyType} • {ride.duration}</p>
          </div>
        </div>
      </div>
      
      <div className="booking-footer">
        <div className="booking-details-sm">
          <span><Car size={14} /> {ride.carModel} ({ride.transmission})</span>
          <span><User size={14} /> Client: {ride.clientName || 'Unassigned'}</span>
        </div>
        <div className="booking-price-action">
          <span className="price">{ride.price}</span>
          <div className="action-buttons-group" style={{ display: 'flex', gap: '8px' }}>
            {isRequest ? (
              <>
                <button 
                  className="decline-booking-btn"
                  onClick={() => handleDecline(ride.dbId, ride.id)}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(255, 59, 48, 0.1)',
                    color: '#ff3b30',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = 'rgba(255, 59, 48, 0.2)'}
                  onMouseOut={(e) => e.target.style.background = 'rgba(255, 59, 48, 0.1)'}
                >
                  Decline
                </button>
                <button 
                  className="accept-booking-btn"
                  onClick={() => handleAccept(ride.dbId, ride.id)}
                  style={{
                    padding: '6px 12px',
                    background: 'var(--accent-gold)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.opacity = '0.9'}
                  onMouseOut={(e) => e.target.style.opacity = '1'}
                >
                  Accept
                </button>
              </>
            ) : (
              <>
                {ride.status === 'upcoming' && (
                  enteringOtpId === ride.dbId ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="text"
                        maxLength="4"
                        placeholder="OTP"
                        value={otpValue}
                        onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                        style={{
                          width: '54px',
                          padding: '6px 8px',
                          background: 'var(--bg-darker)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-main)',
                          borderRadius: '8px',
                          textAlign: 'center',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}
                      />
                      <button
                        onClick={() => handleStartTrip(ride.dbId, ride.id, otpValue)}
                        style={{
                          padding: '6px 10px',
                          background: 'var(--accent-gold)',
                          color: '#000',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => {
                          setEnteringOtpId(null);
                          setOtpValue('');
                        }}
                        style={{
                          padding: '6px 8px',
                          background: 'rgba(255,255,255,0.05)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="start-booking-btn"
                      onClick={() => {
                        setEnteringOtpId(ride.dbId);
                        setOtpValue('');
                      }}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--accent-gold)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseOver={(e) => e.target.style.opacity = '0.9'}
                      onMouseOut={(e) => e.target.style.opacity = '1'}
                    >
                      Start Trip
                    </button>
                  )
                )}
                {ride.status === 'started' && (
                  <button 
                    className="complete-booking-btn"
                    onClick={() => handleCompleteTrip(ride.dbId, ride.id)}
                    style={{
                      padding: '6px 12px',
                      background: '#34c759',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'opacity 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseOver={(e) => e.target.style.opacity = '0.9'}
                    onMouseOut={(e) => e.target.style.opacity = '1'}
                  >
                    Complete Trip
                  </button>
                )}
                <button 
                  className="icon-btn-small" 
                  onClick={() => setSelectedTrip(ride)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (selectedTrip) {
    return (
      <DriverTripDetail 
        trip={selectedTrip} 
        onClose={() => setSelectedTrip(null)} 
        onStart={async (dbId, bookingRef, otpCode) => {
          const success = await handleStartTrip(dbId, bookingRef, otpCode);
          if (success) {
            setSelectedTrip(prev => ({ ...prev, status: 'started' }));
          }
        }}
        onComplete={async (dbId, bookingRef) => {
          await handleCompleteTrip(dbId, bookingRef);
          setSelectedTrip(null);
        }}
      />
    );
  }

  return (
    <div className="premium-dashboard">
      <div className="dashboard-greeting bookings-header-row">
        <div>
          <h1>Assigned Rides</h1>
          <p>Review ride requests and manage your schedule</p>
        </div>
      </div>

      <div className="bookings-controls">
        <div className="tabs-container">
          <button 
            className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Ride Requests ({visibleRequests.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            My Trips ({upcomingRides.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            History ({pastRides.length})
          </button>
        </div>
        
        <div className="filters-container" style={{ position: 'relative' }}>
          <div className="search-box">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search by ID, location, or client..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            className={`filter-btn ${showFilters ? 'active' : ''}`} 
            onClick={() => setShowFilters(!showFilters)}
            style={{ 
              background: showFilters ? 'var(--accent-gold)' : 'rgba(255,255,255,0.05)', 
              color: showFilters ? '#000' : 'var(--text-main)',
              borderColor: showFilters ? 'var(--accent-gold)' : 'var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Filter size={18} /> Filter
          </button>

          {showFilters && (
            <div className="filter-dropdown-panel" style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '12px',
              background: 'var(--bg-card)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '20px',
              width: '320px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              animation: 'scaleUp 0.2s ease-out'
            }}>
              <div>
                <h4 style={{ fontSize: '14px', color: 'var(--text-main)', marginBottom: '8px', fontWeight: '600' }}>Duty Type</h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['all', 'Inside City', 'Out of City'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedDutyType(type)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: selectedDutyType === type ? 'var(--accent-gold)' : 'var(--border-color)',
                        background: selectedDutyType === type ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                        color: selectedDutyType === type ? 'var(--accent-gold)' : 'var(--text-muted)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      {type === 'all' ? 'All' : type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '14px', color: 'var(--text-main)', marginBottom: '8px', fontWeight: '600' }}>Transmission</h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['all', 'Automatic', 'Manual'].map(trans => (
                    <button
                      key={trans}
                      type="button"
                      onClick={() => setSelectedTransmission(trans)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: selectedTransmission === trans ? 'var(--accent-gold)' : 'var(--border-color)',
                        background: selectedTransmission === trans ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                        color: selectedTransmission === trans ? 'var(--accent-gold)' : 'var(--text-muted)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      {trans === 'all' ? 'All' : trans}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ position: 'relative' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--text-main)', marginBottom: '8px', fontWeight: '600' }}>Sort By</h4>
                <button
                  type="button"
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-darker)',
                    color: 'var(--text-main)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    outline: 'none',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'border-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = showSortDropdown ? 'var(--accent-gold)' : 'var(--border-color)'}
                >
                  <span>
                    {sortBy === 'newest' && 'Newest Booking'}
                    {sortBy === 'oldest' && 'Oldest Booking'}
                    {sortBy === 'price-low' && 'Price: Low to High'}
                    {sortBy === 'price-high' && 'Price: High to Low'}
                  </span>
                  <span style={{ fontSize: '10px', opacity: 0.6, transform: showSortDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                </button>
                
                {showSortDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100%',
                    background: 'var(--bg-dark)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    marginTop: '6px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    zIndex: 200,
                    overflow: 'hidden',
                    animation: 'scaleUp 0.15s ease-out forwards'
                  }}>
                    {[
                      { val: 'newest', label: 'Newest Booking' },
                      { val: 'oldest', label: 'Oldest Booking' },
                      { val: 'price-low', label: 'Price: Low to High' },
                      { val: 'price-high', label: 'Price: High to Low' }
                    ].map(opt => (
                      <div
                        key={opt.val}
                        onClick={() => {
                          setSortBy(opt.val);
                          setShowSortDropdown(false);
                        }}
                        style={{
                          padding: '10px 12px',
                          color: sortBy === opt.val ? 'var(--accent-gold)' : 'var(--text-main)',
                          background: sortBy === opt.val ? 'rgba(212, 175, 55, 0.08)' : 'transparent',
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                          if (sortBy !== opt.val) {
                            e.currentTarget.style.background = 'rgba(212, 175, 55, 0.08)';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (sortBy !== opt.val) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setSelectedDutyType('all');
                  setSelectedTransmission('all');
                  setSortBy('newest');
                  setSearchQuery('');
                  setShowSortDropdown(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ff4444',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textAlign: 'right',
                  padding: '4px 0 0'
                }}
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bookings-grid">
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading trips...</p>
        ) : (
          <>
            {activeTab === 'requests' && (
              !isClockedIn ? (
                <div className="empty-state offline-state">
                  <Clock size={48} color="var(--accent-gold)" style={{ opacity: 0.8, marginBottom: '16px' }} />
                  <h3>You are currently Offline</h3>
                  <p style={{ maxWidth: '400px', margin: '0 auto 24px', color: 'var(--text-muted)' }}>
                    You must go online (clock in) to view and receive new booking requests from clients.
                  </p>
                  <button 
                    onClick={handleClockToggle} 
                    className="action-btn accept-btn"
                    style={{ width: 'auto', padding: '12px 32px', margin: '0 auto' }}
                  >
                    Go Online
                  </button>
                </div>
              ) : sortedRides.length > 0 ? (
                sortedRides.map(r => renderRideCard(r, true))
              ) : (
                <div className="empty-state">
                  <Car size={48} color="var(--text-muted)" />
                  <h3>No new ride requests</h3>
                  <p>Available trip offers from clients will appear here.</p>
                </div>
              )
            )}
            
            {activeTab === 'upcoming' && (
              sortedRides.length > 0 ? (
                sortedRides.map(r => renderRideCard(r, false))
              ) : (
                <div className="empty-state">
                  <Car size={48} color="var(--text-muted)" />
                  <h3>No upcoming trips</h3>
                  <p>Accept a ride request to get started.</p>
                </div>
              )
            )}

            {activeTab === 'past' && (
              sortedRides.length > 0 ? (
                sortedRides.map(r => renderRideCard(r, false))
              ) : (
                <div className="empty-state">
                  <Car size={48} color="var(--text-muted)" />
                  <h3>No past trips</h3>
                  <p>Your completed trip history will appear here.</p>
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
};

// --- TRIP DETAIL ROUTING & MAP SUBCOMPONENTS ---

const locationCoords = {
  '120 broadway': [40.7083, -74.0110],
  'jfk airport': [40.6413, -73.7781],
  'jfk': [40.6413, -73.7781],
  'grand central station': [40.7527, -73.9772],
  'grand central': [40.7527, -73.9772],
  'times square': [40.7580, -73.9855],
  'manhattan': [40.7831, -73.9712],
  'brooklyn': [40.6782, -73.9442],
  'queens': [40.7282, -73.7949],
  'bronx': [40.8448, -73.8648],
  'staten island': [40.5795, -74.1502]
};

const getCoordinates = (address) => {
  if (!address) return [40.7128, -74.0060];
  const addrLower = address.toLowerCase();
  
  for (const [key, coords] of Object.entries(locationCoords)) {
    if (addrLower.includes(key)) {
      return coords;
    }
  }
  
  // Deterministic generator fallback near NYC
  let hash1 = 0;
  let hash2 = 0;
  for (let i = 0; i < address.length; i++) {
    hash1 = (hash1 * 31 + address.charCodeAt(i)) % 1000;
    hash2 = (hash2 * 17 + address.charCodeAt(i)) % 1000;
  }
  const latOffset = (hash1 - 500) / 10000;
  const lngOffset = (hash2 - 500) / 10000;
  
  return [40.7128 + latOffset, -74.0060 + lngOffset];
};

const MapBoundsAdjuster = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [points, map]);
  return null;
};

const RouteMap = ({ origin, destination }) => {
  const [routeCoords, setRouteCoords] = useState([]);

  useEffect(() => {
    let active = true;
    const fetchRoute = async () => {
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes.length > 0 && active) {
            const geojsonCoords = data.routes[0].geometry.coordinates;
            const formatted = geojsonCoords.map(coord => [coord[1], coord[0]]);
            setRouteCoords(formatted);
          }
        }
      } catch (err) {
        console.error('OSRM route fetch failed, falling back to straight line:', err);
        if (active) {
          setRouteCoords([origin, destination]);
        }
      }
    };

    fetchRoute();
    return () => {
      active = false;
    };
  }, [origin, destination]);

  const pickupIcon = L.divIcon({
    className: 'custom-marker-pickup',
    html: `<div style="background-color: #34c759; width: 20px; height: 20px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: 800;">P</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  const dropoffIcon = L.divIcon({
    className: 'custom-marker-dropoff',
    html: `<div style="background-color: #ff3b30; width: 20px; height: 20px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: 800;">D</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  return (
    <MapContainer 
      center={origin} 
      zoom={13} 
      style={{ width: '100%', height: '100%', borderRadius: '16px', border: '1px solid var(--border-color)' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <Marker position={origin} icon={pickupIcon} />
      <Marker position={destination} icon={dropoffIcon} />
      {routeCoords.length > 0 && (
        <Polyline pathOptions={{ color: 'var(--accent-gold)', weight: 5, opacity: 0.8 }} positions={routeCoords} />
      )}
      <MapBoundsAdjuster points={[origin, destination]} />
    </MapContainer>
  );
};

const DriverTripDetail = ({ trip, onClose, onStart, onComplete }) => {
  const origin = getCoordinates(trip.location);
  const destination = getCoordinates(trip.destination);
  const [otpInput, setOtpInput] = useState('');

  return (
    <div className="premium-dashboard trip-details-page" style={{ animation: 'scaleUp 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              marginBottom: '12px',
              fontSize: '13px',
              transition: 'background 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
          >
            ← Back to List
          </button>
          <h1 style={{ margin: 0, fontSize: '28px' }}>Active Trip Console</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)' }}>Routing directions and client information for trip {trip.id}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '32px', minHeight: '550px', alignItems: 'stretch' }} className="trip-details-grid">
        
        {/* Left Column: Details & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Client & Booking Summary */}
          <div className="booking-card" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifycontent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <span className="booking-id" style={{ fontSize: '18px' }}>{trip.id}</span>
                <span className={`status-badge status-${trip.status}`} style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', textTransform: 'uppercase', fontWeight: '700' }}>
                  {trip.status}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: '600' }}>Client Name</span>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-main)' }}>{trip.clientName || 'Unassigned'}</span>
                </div>

                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: '600' }}>Date & Schedule</span>
                  <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CalendarIcon size={16} color="var(--accent-gold)" /> {trip.date}
                  </span>
                </div>

                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: '600' }}>Pickup Address</span>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)' }}>{trip.location}</span>
                </div>

                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: '600' }}>Drop Destination</span>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)' }}>{trip.destination || 'Not specified'}</span>
                </div>

                <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: '600' }}>Vehicle Info</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Car size={16} color="var(--accent-gold)" /> {trip.carModel} ({trip.transmission})
                  </span>
                </div>

                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: '600' }}>Duty Type & Payout</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>
                    {trip.dutyType} • Est. {trip.duration} • <span style={{ color: '#34c759', fontWeight: '800' }}>{trip.price}</span>
                  </span>
                </div>
              </div>
            </div>

            {trip.status === 'upcoming' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '24px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Enter Client OTP to Start Trip</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    maxLength="4"
                    placeholder="Enter 4-digit OTP"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'var(--bg-darker)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: '600',
                      textAlign: 'center',
                      letterSpacing: '2px'
                    }}
                  />
                  <button
                    onClick={() => onStart(trip.dbId, trip.id, otpInput)}
                    style={{
                      padding: '0 24px',
                      background: 'var(--accent-gold)',
                      color: '#000',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Start Trip
                  </button>
                </div>
              </div>
            )}

            {trip.status === 'started' && (
              <button 
                onClick={() => onComplete(trip.dbId, trip.id)}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#34c759',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  marginTop: '24px',
                  transition: 'opacity 0.2s',
                  boxShadow: '0 4px 15px rgba(52, 199, 89, 0.2)'
                }}
                onMouseOver={(e) => e.target.style.opacity = '0.9'}
                onMouseOut={(e) => e.target.style.opacity = '1'}
              >
                Complete Trip & Collect Payout
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Live Map */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '450px' }}>
          <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 1000, background: 'rgba(20,20,20,0.85)', padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', backdropFilter: 'blur(8px)' }}>
            <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Route Status</span>
            <span style={{ color: 'var(--accent-gold)', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34c759', display: 'inline-block', transform: 'scale(1.2)' }}></span> Live Routing Directions
            </span>
          </div>
          <RouteMap origin={origin} destination={destination} />
        </div>

      </div>
    </div>
  );
};

export default DriverBookings;
