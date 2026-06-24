import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Car, Clock, Calendar as CalendarIcon, ChevronRight, Search, Filter, User, AlertTriangle, IdCard, TrendingUp, X, MapPin } from 'lucide-react';
import { useAlert } from '../../../context/AlertContext';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../config';
import './ClientBookings.css';

const ClientBookings = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [bookingToCancel, setBookingToCancel] = useState(null);

  const [rides, setRides] = useState([]);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const fetchBookingDetails = async (dbId) => {
    setIsLoadingDetails(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/booking-details/${dbId}`);
      if (!res.ok) throw new Error("Failed to fetch details");
      const data = await res.json();
      setSelectedBookingDetails(data);
      setIsDetailsModalOpen(true);
    } catch (error) {
      console.error("Error fetching booking details:", error);
      showAlert("Error loading trip details", "error");
    } finally {
      setIsLoadingDetails(false);
    }
  };
  
  const [walletBalance, setWalletBalance] = useState(null);

  useEffect(() => {
    if (currentUser?.id && currentUser.role === 'client') {
      fetch(`${API_BASE_URL}/api/wallet/${currentUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.wallet) {
            setWalletBalance(parseFloat(data.wallet.balance));
          }
        })
        .catch(err => console.error('Error fetching wallet balance:', err));
    }
  }, [currentUser]);
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDutyType, setSelectedDutyType] = useState('all');
  const [selectedTransmission, setSelectedTransmission] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  useEffect(() => {
    if (currentUser?.id) {
      const endpoint = currentUser.role === 'driver'
        ? `${API_BASE_URL}/api/bookings/driver/${encodeURIComponent(`${currentUser.firstName} ${currentUser.lastName || ''}`.trim())}`
        : `${API_BASE_URL}/api/bookings/${currentUser.id}`;

      fetch(endpoint)
        .then(res => res.json())
        .then(data => setRides(data))
        .catch(err => console.error('Error fetching bookings:', err));
    }
  }, [currentUser]);

  const initiateCancel = (dbId) => {
    setBookingToCancel(dbId);
  };

  const confirmCancelBooking = async () => {
    if (!bookingToCancel) return;
    const dbId = bookingToCancel;
    setBookingToCancel(null);
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/bookings/${dbId}/cancel`, {
        method: 'PATCH',
      });
      if (res.ok) {
        showAlert("Booking cancelled successfully", "success");
        setRides(rides.map(r => r.dbId === dbId ? { ...r, status: 'cancelled' } : r));
      } else {
        showAlert("Failed to cancel booking", "error");
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      showAlert("Error cancelling booking", "error");
    }
  };

  const upcomingRides = rides.filter(r => r.status === 'upcoming' || r.status === 'started');
  const pastRides = rides.filter(r => r.status !== 'upcoming' && r.status !== 'started');

  const filteredRides = rides.filter(ride => {
    // 1. Tab filter
    const matchesTab = activeTab === 'upcoming' 
      ? (ride.status === 'upcoming' || ride.status === 'started')
      : (ride.status !== 'upcoming' && ride.status !== 'started');
      
    if (!matchesTab) return false;
    
    // 2. Search query filter
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const matchesSearch = 
        ride.id.toLowerCase().includes(query) || 
        ride.location.toLowerCase().includes(query) || 
        (ride.destination && ride.destination.toLowerCase().includes(query)) ||
        ride.carModel.toLowerCase().includes(query) ||
        ride.driver.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    
    // 3. Duty Type filter
    if (selectedDutyType !== 'all' && ride.dutyType !== selectedDutyType) return false;
    
    // 4. Transmission filter
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

  const renderRideCard = (ride) => (
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

      {ride.status === 'upcoming' && ride.otp && (
        <div style={{
          marginBottom: '16px',
          padding: '10px 14px',
          background: 'rgba(212, 175, 55, 0.08)',
          border: '1px solid rgba(212, 175, 55, 0.2)',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>🔑 Share OTP with driver to start trip:</span>
          <span style={{ fontSize: '16px', color: 'var(--accent-gold)', fontWeight: '800', letterSpacing: '1px', fontFamily: 'monospace' }}>{ride.otp}</span>
        </div>
      )}
      
      {ride.status === 'started' && walletBalance !== null && (
        (() => {
          const fareNum = parseFloat(ride.price.replace(/[^0-9.]/g, '')) || 0;
          if (walletBalance < fareNum) {
            const missing = fareNum - walletBalance;
            return (
              <div style={{
                marginBottom: '16px',
                padding: '12px 14px',
                background: 'rgba(255, 59, 48, 0.08)',
                border: '1px solid rgba(255, 59, 48, 0.2)',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                animation: 'slideDown 0.3s ease-out'
              }}>
                <span style={{ fontSize: '13px', color: '#ff4b42', fontWeight: '600' }}>
                  ⚠️ Insufficient Balance (Need: ${missing.toFixed(2)})
                </span>
                <button 
                  onClick={() => navigate('/dashboard/client/wallet')}
                  style={{
                    padding: '6px 12px',
                    background: '#ff3b30',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#e03126'}
                  onMouseOut={(e) => e.target.style.background = '#ff3b30'}
                >
                  Reload Wallet
                </button>
              </div>
            );
          }
          return null;
        })()
      )}

      <div className="booking-footer">
        <div className="booking-details-sm">
          <span><Car size={14} /> {ride.carModel} ({ride.transmission})</span>
          <span><User size={14} /> {ride.driver}</span>
        </div>
        <div className="booking-price-action">
          <span className="price">{ride.price}</span>
          <div className="action-buttons-group" style={{ display: 'flex', gap: '8px' }}>
            {ride.status === 'upcoming' && currentUser?.role !== 'driver' && (
              <button 
                className="cancel-booking-btn" 
                onClick={() => initiateCancel(ride.dbId)}
                style={{ padding: '6px 12px', background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.target.style.background = 'rgba(255, 59, 48, 0.2)'}
                onMouseOut={(e) => e.target.style.background = 'rgba(255, 59, 48, 0.1)'}
              >
                Cancel
              </button>
            )}
            <button 
              className="icon-btn-small" 
              onClick={() => fetchBookingDetails(ride.dbId)} 
              disabled={isLoadingDetails}
              title="View Trip & Driver Details"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="premium-dashboard">
      <div className="dashboard-greeting bookings-header-row">
        <div>
          <h1>My Bookings</h1>
          <p>{currentUser?.role === 'driver' ? 'Manage your assigned and completed rides' : 'Manage your upcoming and past rides'}</p>
        </div>
        {currentUser?.role !== 'driver' && (
          <button 
            className="primary-btn new-booking-btn" 
            onClick={() => navigate('/dashboard/client/bookings/new')}
          >
            <Car size={18} /> Hire a Driver
          </button>
        )}
      </div>

      <div className="bookings-controls">
        <div className="tabs-container">
          <button 
            className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming Trips ({upcomingRides.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past Trips ({pastRides.length})
          </button>
        </div>
        
        <div className="filters-container" style={{ position: 'relative' }}>
          <div className="search-box">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search by ID or location..." 
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
        {sortedRides.length > 0 ? (
          sortedRides.map(renderRideCard)
        ) : (
          <div className="empty-state">
            <Car size={48} color="var(--text-muted)" />
            {searchQuery || selectedDutyType !== 'all' || selectedTransmission !== 'all' ? (
              <>
                <h3>No matching trips found</h3>
                <p>Try adjusting your search query or filters.</p>
              </>
            ) : (
              <>
                <h3>No {activeTab} trips</h3>
                <p>
                  {activeTab === 'upcoming' 
                    ? (currentUser?.role === 'driver' ? "You don't have any upcoming trips assigned." : "You don't have any drivers scheduled yet.")
                    : "Your trip history will appear here."}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {bookingToCancel && createPortal(
        <div className="modal-overlay" onClick={() => setBookingToCancel(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: '#1c1c1e', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '32px', borderRadius: '16px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.6)', animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
            <div style={{ width: '64px', height: '64px', background: 'rgba(255, 59, 48, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <AlertTriangle size={32} color="#ff3b30" />
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px', color: '#ffffff' }}>Cancel Booking?</h3>
            <p style={{ color: '#a0a0a0', marginBottom: '24px', lineHeight: '1.5', fontSize: '15px' }}>Are you sure you want to cancel this booking? This action cannot be undone and your driver will be notified.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setBookingToCancel(null)}
                style={{ flex: 1, padding: '14px', background: 'rgba(255, 255, 255, 0.08)', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.12)'}
                onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.08)'}
              >
                Keep Booking
              </button>
              <button 
                onClick={confirmCancelBooking}
                style={{ flex: 1, padding: '14px', background: '#ff3b30', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.target.style.background = '#e03126'}
                onMouseOut={(e) => e.target.style.background = '#ff3b30'}
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isDetailsModalOpen && selectedBookingDetails && createPortal(
        <div className="modal-overlay" onClick={() => setIsDetailsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
            background: 'linear-gradient(135deg, rgba(24, 24, 28, 0.98) 0%, rgba(12, 12, 14, 0.99) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            padding: '28px',
            borderRadius: '20px',
            maxWidth: '520px',
            width: '90%',
            color: '#ffffff',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 50px rgba(212, 175, 55, 0.05)',
            animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
          }}>
            <button className="close-btn" onClick={() => setIsDetailsModalOpen(false)}>
              <X size={18} />
            </button>

            <h3 style={{
              fontSize: '22px',
              fontWeight: '700',
              marginBottom: '16px',
              color: '#ffffff',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Trip Details</span>
              <span className={`status-badge status-${selectedBookingDetails.booking.status}`} style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                {selectedBookingDetails.booking.status}
              </span>
            </h3>

            {/* Trip details section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Booking Reference</span>
                <span style={{ fontWeight: '600', color: 'var(--accent-gold)', fontFamily: 'monospace' }}>{selectedBookingDetails.booking.id}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Date & Scheduled Time</span>
                <span style={{ fontWeight: '500' }}>{selectedBookingDetails.booking.date}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Trip Started At</span>
                <span style={{ fontWeight: '600', color: selectedBookingDetails.booking.startedAt ? '#2ecc71' : 'var(--text-muted)' }}>
                  {selectedBookingDetails.booking.startedAt ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} /> {selectedBookingDetails.booking.startedAt}
                    </span>
                  ) : "Not started yet"}
                </span>
              </div>

              <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.08)', margin: '6px 0' }}></div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <MapPin size={12} color="#ff4444" /> Pickup Location
                </span>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#f3f4f6' }}>{selectedBookingDetails.booking.location}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <MapPin size={12} color="#2ecc71" /> Drop Location
                </span>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#f3f4f6' }}>{selectedBookingDetails.booking.destination || 'Not specified'}</span>
              </div>

              <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.08)', margin: '6px 0' }}></div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>DUTY & DURATION</div>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>{selectedBookingDetails.booking.dutyType} ({selectedBookingDetails.booking.duration})</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>VEHICLE GEAR & MODEL</div>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>{selectedBookingDetails.booking.carModel} ({selectedBookingDetails.booking.transmission})</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(212, 175, 55, 0.05)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.15)', marginTop: '6px' }}>
                <span style={{ fontSize: '13px', color: 'var(--accent-gold)', fontWeight: '500' }}>Estimated Fare</span>
                <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-gold)' }}>{selectedBookingDetails.booking.price}</span>
              </div>

              {selectedBookingDetails.booking.status === 'started' && 
               selectedBookingDetails.clientWalletBalance !== undefined && (
                (() => {
                  const fareNum = parseFloat(selectedBookingDetails.booking.price.replace(/[^0-9.]/g, '')) || 0;
                  const balance = parseFloat(selectedBookingDetails.clientWalletBalance) || 0;
                  if (balance < fareNum) {
                    const missing = fareNum - balance;
                    return (
                      <div style={{
                        padding: '14px',
                        background: 'rgba(255, 59, 48, 0.06)',
                        border: '1px solid rgba(255, 59, 48, 0.2)',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        marginTop: '6px',
                        animation: 'slideDown 0.3s ease-out'
                      }}>
                        <div style={{ fontSize: '13px', color: '#ff4b42', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>⚠️</span> Insufficient Wallet Balance!
                        </div>
                        <div style={{ fontSize: '12px', color: '#e5e7eb', lineHeight: '1.4' }}>
                          Your wallet balance is <strong>${balance.toFixed(2)}</strong>, but this trip fare is <strong>${selectedBookingDetails.booking.price}</strong>. Please reload at least <strong>${missing.toFixed(2)}</strong> immediately to complete the payment on time.
                        </div>
                        <button 
                          onClick={() => {
                            setIsDetailsModalOpen(false);
                            navigate('/dashboard/client/wallet');
                          }}
                          style={{
                            padding: '8px 12px',
                            background: '#ff3b30',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            marginTop: '2px',
                            textAlign: 'center'
                          }}
                          onMouseOver={(e) => e.target.style.background = '#e03126'}
                          onMouseOut={(e) => e.target.style.background = '#ff3b30'}
                        >
                          Go to Wallet & Add Funds
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()
              )}
            </div>

            {/* Driver details section */}
            <h4 style={{
              fontSize: '15px',
              fontWeight: '700',
              marginBottom: '12px',
              color: 'var(--accent-gold)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Car size={16} /> Driver Information
            </h4>

            {selectedBookingDetails.driver ? (
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'var(--bg-darker)',
                  border: '2px solid var(--accent-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {selectedBookingDetails.driver.photo ? (
                    <img 
                      src={selectedBookingDetails.driver.photo} 
                      alt={selectedBookingDetails.driver.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <User size={30} color="var(--accent-gold)" />
                  )}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontWeight: '700', fontSize: '16px', color: '#ffffff' }}>
                    {selectedBookingDetails.driver.name}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <IdCard size={12} color="var(--accent-gold)" /> 
                    <span>License: </span>
                    <span style={{ fontFamily: 'monospace', fontWeight: '600', color: '#e5e7eb' }}>
                      {selectedBookingDetails.driver.license || 'N/A'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <TrendingUp size={12} color="var(--accent-gold)" /> 
                    <span>Trips Completed: </span>
                    <span style={{ fontWeight: '600', color: '#e5e7eb' }}>
                      {selectedBookingDetails.driver.completedTrips}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '13px'
              }}>
                🕒 Waiting for a professional driver to accept this trip.
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ClientBookings;
