import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  Clock,
  Calendar as CalendarIcon,
  ChevronRight,
  Search,
  Filter,
  User,
  AlertTriangle,
  Phone,
  Star,
  X,
  MapPin,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { useAlert } from '../../../context/AlertContext';
import { useAuth } from '../../../context/AuthContext';
import './ClientBookings.css';

// -------------------------------------------------------------
// Configuration & Filter Constants (No Hardcoding)
// -------------------------------------------------------------
const STORAGE_KEYS = {
  BOOKINGS: 'hyd_demo_bookings',
  WALLET_PREFIX: 'hyd_client_wallet_'
};

const DUTY_TYPE_OPTIONS = ['all', 'Inside City', 'Out of City', 'One-Way Trip'];
const TRANSMISSION_OPTIONS = ['all', 'Automatic', 'Manual'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'price_low', label: 'Fare: Low to High' },
  { value: 'price_high', label: 'Fare: High to Low' }
];

const DEFAULT_DEMO_BOOKINGS = [
  {
    id: 1,
    booking_reference: 'HYD-7102',
    pickup_location: 'Indiranagar 100ft Road, Bengaluru',
    dropoff_location: 'Kempegowda Int. Airport (BLR)',
    status: 'upcoming',
    booking_date: new Date().toISOString(),
    pickup_time: '14:30',
    car_type: 'Sedan (Honda City)',
    duty_type: 'Inside City',
    transmission: 'Automatic',
    estimated_fare: 850,
    driver_name: 'Rajesh Kumar',
    driver_phone: '+91 98765 43212',
    driver_rating: 4.85,
    driver_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    otp: '4829'
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
    duty_type: 'One-Way Trip',
    transmission: 'Manual',
    estimated_fare: 1250,
    driver_name: 'Rajesh Kumar',
    driver_phone: '+91 98765 43212',
    driver_rating: 4.85,
    driver_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80'
  }
];

// -------------------------------------------------------------
// Data Normalizer: Ensures consistent fields across all sources
// -------------------------------------------------------------
const normalizeBooking = (booking, index = 0) => {
  if (!booking) return null;

  const id = booking.id || booking.dbId || (index + 1);
  const reference = booking.booking_reference || booking.bookingReference || `HYD-${id}`;
  const pickup = booking.pickup_location || booking.location || 'Pickup Location';
  const dropoff = booking.dropoff_location || booking.destination || 'Dropoff Location';
  const date = booking.booking_date || booking.date || new Date().toISOString();
  const time = booking.pickup_time || booking.time || '12:00 PM';
  const carType = booking.car_type || booking.carModel || 'Sedan';
  const dutyType = booking.duty_type || booking.dutyType || 'Inside City';
  const transmission = booking.transmission || 'Automatic';

  const rawFare = booking.estimated_fare !== undefined ? booking.estimated_fare : booking.price;
  const fare = typeof rawFare === 'number'
    ? rawFare
    : parseFloat(String(rawFare || '0').replace(/[^0-9.]/g, '')) || 0;

  const status = (booking.status || 'upcoming').toLowerCase();
  const isUnassigned = status === 'unassigned' || status === 'pending' || status === 'request';
  const driverName = booking.driver_name || booking.driver || (isUnassigned ? 'Searching for Chauffeur...' : 'Rajesh Kumar');
  const driverPhone = booking.driver_phone || booking.driverPhone || (isUnassigned ? '' : '+91 98765 43212');
  const driverRating = booking.driver_rating || booking.driverRating || (isUnassigned ? null : 4.85);
  const driverPhoto = booking.driver_photo || booking.driverPhoto || (isUnassigned ? null : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80');
  const otp = booking.otp || booking.startOtp || '4829';

  return {
    ...booking,
    id,
    reference,
    pickup,
    dropoff,
    date,
    time,
    carType,
    dutyType,
    transmission,
    fare,
    status,
    driverName,
    driverPhone,
    driverRating,
    driverPhoto,
    otp
  };
};

// -------------------------------------------------------------
// Subcomponent: Booking Card
// -------------------------------------------------------------
const BookingCard = ({ ride, walletBalance, onOpenDetails, onInitiateCancel, onReloadWallet }) => {
  const isStarted = ride.status === 'started' || ride.status === 'in_progress';
  const isUpcoming = ride.status === 'upcoming';
  const isUnassigned = ride.status === 'unassigned' || ride.status === 'pending' || ride.status === 'request';
  const isInsufficientWallet = isStarted && walletBalance !== null && walletBalance < ride.fare;
  const missingAmount = isInsufficientWallet ? (ride.fare - walletBalance) : 0;

  const formattedDate = useMemo(() => {
    try {
      return new Date(ride.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return ride.date;
    }
  }, [ride.date]);

  return (
    <div className="booking-card">
      {/* Header */}
      <div className="booking-header">
        <div className="booking-id-date">
          <span className="booking-id">{ride.reference}</span>
          <span className="booking-date">
            <CalendarIcon size={14} /> {formattedDate} • {ride.time}
          </span>
        </div>
        <div className={`status-badge status-${ride.status}`} style={{
          background: isUnassigned ? 'rgba(212, 175, 55, 0.15)' : (isStarted ? 'rgba(52, 199, 89, 0.15)' : undefined),
          color: isUnassigned ? 'var(--accent-gold)' : (isStarted ? '#34c759' : undefined),
          borderColor: isUnassigned ? 'rgba(212, 175, 55, 0.4)' : undefined
        }}>
          {isUnassigned ? 'SEARCHING DRIVER' : (isStarted ? 'TRIP IN PROGRESS' : (isUpcoming ? 'CHAUFFEUR ASSIGNED' : ride.status.toUpperCase()))}
        </div>
      </div>

      {/* Route */}
      <div className="booking-route booking-route-details">
        <div className="route-point">
          <div className="point-icon origin" />
          <div className="route-info">
            <p className="booking-location-text">Pickup: {ride.pickup}</p>
            {ride.dropoff && <p className="booking-location-text">Drop: {ride.dropoff}</p>}
            <p className="booking-trip-details">
              Trip: {ride.dutyType} • {ride.transmission}
            </p>
          </div>
        </div>
      </div>

      {/* OTP Banner for Unassigned and Upcoming Trips */}
      {(isUpcoming || isUnassigned) && ride.otp && (
        <div className="booking-otp-banner" style={{
          background: isUnassigned ? 'rgba(212, 175, 55, 0.08)' : 'rgba(52, 199, 89, 0.08)',
          border: isUnassigned ? '1px dashed var(--accent-gold)' : '1px solid rgba(52, 199, 89, 0.3)',
          borderRadius: '10px',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: '600' }}>
              🔑 Trip Start OTP:
            </span>
            <span style={{ fontSize: '18px', color: 'var(--accent-gold)', fontWeight: '800', letterSpacing: '2px', fontFamily: 'monospace' }}>
              {ride.otp}
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {isUnassigned
              ? 'Request is broadcasted to nearby drivers. Provide this 4-digit code to driver on arrival.'
              : 'Driver assigned! Please share this 4-digit code with your chauffeur upon arrival.'}
          </span>
        </div>
      )}

      {/* Low Balance Alert for Active Trips */}
      {isInsufficientWallet && (
        <div className="booking-balance-warning">
          <span style={{ fontSize: '13px', color: '#ff4b42', fontWeight: '600' }}>
            ⚠️ Insufficient Balance (Need: ${missingAmount.toFixed(2)})
          </span>
          <button
            onClick={onReloadWallet}
            style={{
              padding: '6px 12px',
              background: '#ff3b30',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Reload Wallet
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="booking-footer">
        <div className="booking-details-sm">
          <span><Car size={14} /> {ride.carType}</span>
          <span><User size={14} /> {ride.driverName}</span>
        </div>

        <div className="booking-price-action">
          <span className="price">${ride.fare.toFixed(2)}</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {(isUpcoming || isUnassigned) && (
              <button
                className="cancel-booking-btn"
                onClick={() => onInitiateCancel(ride.id)}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255, 59, 48, 0.1)',
                  color: '#ff3b30',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            )}
            <button
              className="icon-btn-small"
              onClick={() => onOpenDetails(ride)}
              title="View Trip & Driver Details"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Subcomponent: Booking Details Modal
// -------------------------------------------------------------
const BookingDetailsModal = ({ ride, onClose, onNavigateWallet, walletBalance }) => {
  if (!ride) return null;

  const isLowBalance = ride.status === 'started' && walletBalance < ride.fare;
  const missing = isLowBalance ? (ride.fare - walletBalance) : 0;

  return createPortal(
    <div className="booking-modal-overlay" onClick={onClose}>
      <div className="booking-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-main)'
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingRight: '36px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Trip Details</h3>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Reference: {ride.reference}</span>
          </div>
          <span className={`status-badge status-${ride.status}`}>
            {ride.status.toUpperCase()}
          </span>
        </div>

        {/* Route Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <MapPin size={18} color="#ff3b30" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pickup Location</span>
              <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: '600' }}>{ride.pickup}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <MapPin size={18} color="#34c759" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Drop Location</span>
              <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: '600' }}>{ride.dropoff}</p>
            </div>
          </div>
        </div>

        {/* Specs Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
          <div style={{ padding: '10px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>DUTY TYPE</span>
            <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: '600' }}>{ride.dutyType}</p>
          </div>
          <div style={{ padding: '10px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TRANSMISSION</span>
            <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: '600' }}>{ride.transmission}</p>
          </div>
          <div style={{ padding: '10px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CAR TYPE</span>
            <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: '600' }}>{ride.carType}</p>
          </div>
          <div style={{ padding: '10px 14px', background: 'rgba(212, 175, 55, 0.08)', borderRadius: '10px', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <span style={{ fontSize: '11px', color: 'var(--accent-gold)' }}>ESTIMATED FARE</span>
            <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: '800', color: 'var(--accent-gold)' }}>${ride.fare.toFixed(2)}</p>
          </div>
        </div>

        {/* Assigned Driver Profile */}
        <h4 style={{ margin: '0 0 12px', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Chauffeur Details</h4>
        <div className="booking-driver-box">
          <img
            src={ride.driverPhoto}
            alt={ride.driverName}
            style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-gold)' }}
          />
          <div style={{ flex: 1 }}>
            <h5 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '700' }}>{ride.driverName}</h5>
            <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Star size={13} color="#f5a623" fill="#f5a623" /> {ride.driverRating}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Phone size={13} /> {ride.driverPhone}
              </span>
            </div>
          </div>
        </div>

        {/* Low balance warning inside modal */}
        {isLowBalance && (
          <div style={{ marginTop: '16px', padding: '14px', background: 'rgba(255, 59, 48, 0.08)', border: '1px solid rgba(255, 59, 48, 0.25)', borderRadius: '12px' }}>
            <div style={{ fontSize: '13px', color: '#ff3b30', fontWeight: '700', marginBottom: '4px' }}>
              ⚠️ Insufficient Wallet Balance
            </div>
            <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Wallet balance is ${walletBalance.toFixed(2)}. Please add ${missing.toFixed(2)} to ensure automatic payment.
            </p>
            <button
              onClick={() => {
                onClose();
                onNavigateWallet();
              }}
              style={{
                width: '100%',
                padding: '8px',
                background: '#ff3b30',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Reload Wallet Now
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

// -------------------------------------------------------------
// Subcomponent: Cancellation Confirmation Modal
// -------------------------------------------------------------
const CancelModal = ({ onConfirm, onCancel }) => (
  createPortal(
    <div className="booking-modal-overlay" onClick={onCancel}>
      <div className="booking-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255, 59, 48, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <AlertTriangle size={32} color="#ff3b30" />
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: '700' }}>Cancel Booking?</h3>
        <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          Are you sure you want to cancel this booking? This will immediately free the assigned chauffeur.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-main)',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Keep Ride
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: '#ff3b30',
              color: '#fff',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Yes, Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
);

// -------------------------------------------------------------
// Main Component: ClientBookings
// -------------------------------------------------------------
const ClientBookings = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { currentUser } = useAuth();

  // Core State
  const [rides, setRides] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [walletBalance, setWalletBalance] = useState(250.0);

  // Modals State
  const [selectedRide, setSelectedRide] = useState(null);
  const [bookingToCancelId, setBookingToCancelId] = useState(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDutyType, setSelectedDutyType] = useState('all');
  const [selectedTransmission, setSelectedTransmission] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  // -------------------------------------------------------------
  // Data Fetching: Reactive LocalStorage sync
  // -------------------------------------------------------------
  const loadBookings = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRides(parsed.map((b, idx) => normalizeBooking(b, idx)));
          return;
        }
      }
    } catch (err) {
      console.error('Error loading bookings:', err);
    }
    setRides(DEFAULT_DEMO_BOOKINGS.map((b, idx) => normalizeBooking(b, idx)));
  }, []);

  const loadWallet = useCallback(() => {
    const clientId = currentUser?.id || 2;
    try {
      const stored = localStorage.getItem(`${STORAGE_KEYS.WALLET_PREFIX}${clientId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setWalletBalance(parseFloat(parsed.balance || 250));
      }
    } catch (err) {
      console.error('Error loading wallet:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    loadBookings();
    loadWallet();

    const handleStorage = () => {
      loadBookings();
      loadWallet();
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadBookings, loadWallet]);

  // -------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------
  const handleConfirmCancel = () => {
    if (!bookingToCancelId) return;

    const cancelledRide = rides.find(r => r.id === bookingToCancelId);
    const updated = rides.map(r => r.id === bookingToCancelId ? { ...r, status: 'cancelled' } : r);
    setRides(updated);

    try {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updated));

      // If this booking used a coupon, release it so the user can use it again
      if (cancelledRide?.promo_code) {
        try {
          const userId = currentUser?.id || currentUser?.email || 'client_user';
          const allUsed = JSON.parse(localStorage.getItem('hyd_used_coupons') || '{}');
          if (Array.isArray(allUsed[userId])) {
            allUsed[userId] = allUsed[userId].filter(c => c !== cancelledRide.promo_code.toUpperCase());
            localStorage.setItem('hyd_used_coupons', JSON.stringify(allUsed));
          }
        } catch (e) {}
      }

      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Failed saving cancelled booking:', err);
    }

    setBookingToCancelId(null);
    showAlert('Booking cancelled successfully.', 'success');
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedDutyType('all');
    setSelectedTransmission('all');
    setSortBy('newest');
  };

  // -------------------------------------------------------------
  // Filter & Sort Pipeline
  // -------------------------------------------------------------
  const upcomingCount = useMemo(() => {
    return rides.filter(r => ['upcoming', 'started', 'in_progress', 'unassigned', 'pending', 'request'].includes(r.status)).length;
  }, [rides]);

  const pastCount = useMemo(() => {
    return rides.filter(r => !['upcoming', 'started', 'in_progress', 'unassigned', 'pending', 'request'].includes(r.status)).length;
  }, [rides]);

  const filteredRides = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return rides.filter(ride => {
      // 1. Tab Match
      const isLiveOrUpcoming = ['upcoming', 'started', 'in_progress', 'unassigned', 'pending', 'request'].includes(ride.status);
      const matchesTab = activeTab === 'upcoming' ? isLiveOrUpcoming : !isLiveOrUpcoming;
      if (!matchesTab) return false;

      // 2. Search Query Match
      if (query) {
        const matchesSearch =
          ride.reference.toLowerCase().includes(query) ||
          ride.pickup.toLowerCase().includes(query) ||
          ride.dropoff.toLowerCase().includes(query) ||
          ride.carType.toLowerCase().includes(query) ||
          ride.driverName.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // 3. Duty Type Match
      if (selectedDutyType !== 'all' && ride.dutyType !== selectedDutyType) {
        return false;
      }

      // 4. Transmission Match
      if (selectedTransmission !== 'all' && ride.transmission !== selectedTransmission) {
        return false;
      }

      return true;
    });
  }, [rides, activeTab, searchQuery, selectedDutyType, selectedTransmission]);

  const sortedRides = useMemo(() => {
    const list = [...filteredRides];
    switch (sortBy) {
      case 'newest':
        return list.sort((a, b) => new Date(b.date) - new Date(a.date));
      case 'oldest':
        return list.sort((a, b) => new Date(a.date) - new Date(b.date));
      case 'price_low':
        return list.sort((a, b) => a.fare - b.fare);
      case 'price_high':
        return list.sort((a, b) => b.fare - a.fare);
      default:
        return list;
    }
  }, [filteredRides, sortBy]);

  // -------------------------------------------------------------
  // Render
  // -------------------------------------------------------------
  return (
    <div className="premium-dashboard">
      {/* Header Row */}
      <div className="bookings-header-row">
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: '800' }}>My Bookings</h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
            Manage and track all scheduled and completed chauffeur rides
          </p>
        </div>
        <button
          className="primary-btn new-booking-btn"
          onClick={() => navigate('/dashboard/client/bookings/new')}
        >
          <Car size={18} /> Hire a Driver
        </button>
      </div>

      {/* Controls Bar: Tabs & Search/Filters */}
      <div className="bookings-controls-bar">
        {/* Tabs */}
        <div className="bookings-tabs-group">
          <button
            className={`tab-toggle-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming Trips ({upcomingCount})
          </button>
          <button
            className={`tab-toggle-btn ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past Trips ({pastCount})
          </button>
        </div>

        {/* Search & Filter Dropdown Toggle */}
        <div className="bookings-filter-bar">
          <div className="search-input-wrapper">
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              className="search-input-field"
              placeholder="Search reference, route, driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} /> Filters
          </button>

          {/* Filter Panel */}
          {showFilters && (
            <div className="filter-dropdown-panel">
              {/* Duty Type */}
              <div>
                <div className="filter-section-title">Duty Type</div>
                <div className="filter-chip-group">
                  {DUTY_TYPE_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      className={`filter-chip ${selectedDutyType === opt ? 'active' : ''}`}
                      onClick={() => setSelectedDutyType(opt)}
                    >
                      {opt === 'all' ? 'All Types' : opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transmission */}
              <div>
                <div className="filter-section-title">Transmission</div>
                <div className="filter-chip-group">
                  {TRANSMISSION_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      className={`filter-chip ${selectedTransmission === opt ? 'active' : ''}`}
                      onClick={() => setSelectedTransmission(opt)}
                    >
                      {opt === 'all' ? 'All Gears' : opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort By */}
              <div>
                <div className="filter-section-title">Sort By</div>
                <select
                  className="sort-select-input"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset */}
              <button
                className="clear-filters-btn"
                onClick={handleClearFilters}
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bookings Grid */}
      <div className="bookings-grid">
        {sortedRides.length > 0 ? (
          sortedRides.map(ride => (
            <BookingCard
              key={ride.id}
              ride={ride}
              walletBalance={walletBalance}
              onOpenDetails={setSelectedRide}
              onInitiateCancel={setBookingToCancelId}
              onReloadWallet={() => navigate('/dashboard/client/wallet')}
            />
          ))
        ) : (
          <div className="empty-state">
            <Car size={48} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: '12px' }} />
            {searchQuery || selectedDutyType !== 'all' || selectedTransmission !== 'all' ? (
              <>
                <h3 style={{ margin: '0 0 6px' }}>No matching bookings found</h3>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>Try adjusting your search keywords or clear active filters.</p>
              </>
            ) : (
              <>
                <h3 style={{ margin: '0 0 6px' }}>No {activeTab} bookings</h3>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                  {activeTab === 'upcoming'
                    ? "You don't have any chauffeur rides scheduled. Click 'Hire a Driver' above to request one."
                    : 'Your completed or cancelled trip history will appear here.'}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedRide && (
        <BookingDetailsModal
          ride={selectedRide}
          onClose={() => setSelectedRide(null)}
          onNavigateWallet={() => navigate('/dashboard/client/wallet')}
          walletBalance={walletBalance}
        />
      )}

      {bookingToCancelId && (
        <CancelModal
          onConfirm={handleConfirmCancel}
          onCancel={() => setBookingToCancelId(null)}
        />
      )}
    </div>
  );
};

export default ClientBookings;
