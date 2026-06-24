import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MapPin, ArrowLeft, Car, Ticket } from 'lucide-react';
import { useAlert } from '../../../context/AlertContext';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../config';
import LocationMap from '../../../components/LocationMap';
import './NewBooking.css';

const NewBooking = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { currentUser } = useAuth();

  const [walletBalance, setWalletBalance] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingRide, setPendingRide] = useState(null);

  useEffect(() => {
    if (currentUser?.id) {
      fetch(`${API_BASE_URL}/api/wallet/${currentUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.wallet) {
            setWalletBalance(parseFloat(data.wallet.balance));
          }
        })
        .catch(err => console.error('Error fetching wallet:', err));
    }
  }, [currentUser]);
  
  // Load defaults from Advanced Settings
  const savedPrefs = currentUser ? JSON.parse(localStorage.getItem(`ridePreferences_${currentUser.id}`) || '{}') : {};

  const [pickupLocation, setPickupLocation] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destCoords, setDestCoords] = useState(null);
  const [dutyType, setDutyType] = useState(savedPrefs.dutyType || 'Inside City');
  const [duration, setDuration] = useState('4 Hours');
  const [transmission, setTransmission] = useState(savedPrefs.transmission || 'Automatic');
  const [carModel, setCarModel] = useState(savedPrefs.carModel || '');
  const [computedDistance, setComputedDistance] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);

  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  };

  const handleMapUpdate = (type, address, coords) => {
    let newPickupCoords = pickupCoords;
    let newDestCoords = destCoords;

    if (type === 'pickup') {
      setPickupLocation(address);
      if (coords) {
        setPickupCoords(coords);
        newPickupCoords = coords;
      }
    }
    if (type === 'destination') {
      setDestinationLocation(address);
      if (coords) {
        setDestCoords(coords);
        newDestCoords = coords;
      }
    }

    if (newPickupCoords && newDestCoords) {
      const dist = getDistanceKm(newPickupCoords.lat, newPickupCoords.lng, newDestCoords.lat, newDestCoords.lng);
      setComputedDistance(dist);

      if (dist < 40) {
        setDutyType('Inside City');
        setDuration('4 Hours');
      } else if (dist >= 40 && dist < 80) {
        setDutyType('Inside City');
        setDuration('8 Hours');
      } else if (dist >= 80 && dist < 150) {
        setDutyType('Out of City');
        setDuration('12 Hours');
      } else {
        setDutyType('Out of City');
        setDuration('More than 1 day');
      }
    }
  };

  const handleTextGeocode = async (address, type) => {
    if (!address) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        handleMapUpdate(type, address, coords);
      } else {
        showAlert(`Could not find "${address}" on the map.`, "error");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) {
      return showAlert('Please enter a promo code first', 'error');
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/promos/validate?code=${promoInput.trim()}&userId=${currentUser.id}`);
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCode(promoInput.trim());
        setDiscountPercent(data.discountPercent);
        showAlert(`Promo code applied successfully! ${data.discountPercent}% discount is applied.`, 'success');
      } else {
        showAlert(data.error || 'Invalid or expired promo code', 'error');
      }
    } catch (error) {
      console.error(error);
      showAlert('Error validating promo code', 'error');
    }
  };

  const handleRemovePromo = () => {
    setAppliedCode('');
    setDiscountPercent(0);
    setPromoInput('');
    showAlert('Promo code removed', 'success');
  };

  const calculatePrice = () => {
    let basePrice = 10;
    
    if (duration === '4 Hours') basePrice += 30;
    else if (duration === '8 Hours') basePrice += 60;
    else if (duration === '12 Hours') basePrice += 90;
    else if (duration === 'More than 1 day') basePrice += 150;
    
    if (transmission === 'Manual') basePrice += 15;
    
    if (pickupCoords && destCoords) {
      const dist = getDistanceKm(pickupCoords.lat, pickupCoords.lng, destCoords.lat, destCoords.lng);
      basePrice += (dist * 0.85);
    }

    if (discountPercent > 0) {
      basePrice = basePrice * ((100 - discountPercent) / 100);
    }
    
    return basePrice.toFixed(2);
  };

  const submitBooking = async (rideData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rideData)
      });
      
      if (!response.ok) throw new Error('Failed to create booking');

      // Wait 2.5 seconds for animation to finish
      await new Promise(resolve => setTimeout(resolve, 2500));

      showAlert("Driver request sent successfully!", "success");
      navigate('/dashboard/client/bookings');
    } catch (error) {
      console.error('Error creating booking:', error);
      showAlert("Error creating booking", "error");
      setIsSubmitting(false); // Only reset here so overlay doesn't vanish early
    }
  };

  const handleConfirmAnyway = async () => {
    setShowWarningModal(false);
    if (pendingRide) {
      await submitBooking(pendingRide);
    }
  };

  const handleGoToWallet = () => {
    setShowWarningModal(false);
    navigate('/dashboard/client/wallet');
  };

  const handleBookRide = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const selectedDate = formData.get('date');
    const selectedTime = formData.get('time');

    if (selectedDate && selectedTime) {
      const selectedDateTime = new Date(`${selectedDate}T${selectedTime}`);
      const now = new Date();
      // Allow a 5-minute buffer for filling out form
      if (selectedDateTime.getTime() < now.getTime() - 5 * 60 * 1000) {
        return showAlert('Booking date and time cannot be in the past. Please select a current or future date and time.', 'error');
      }
    }

    const estPrice = parseFloat(calculatePrice());
    
    const newRide = {
      booking_ref: `DRV-${Math.floor(Math.random() * 9000) + 1000}`,
      client_id: currentUser.id,
      date: formData.get('date') + ', ' + formData.get('time'),
      location: pickupLocation || formData.get('location'),
      destination: destinationLocation || formData.get('destination'),
      duty_type: dutyType,
      duration: duration,
      transmission: transmission,
      car_model: formData.get('carModel'),
      price: '$' + estPrice.toFixed(2),
      promo_code: appliedCode || null
    };

    if (walletBalance < estPrice) {
      setPendingRide(newRide);
      setShowWarningModal(true);
    } else {
      await submitBooking(newRide);
    }
  };

  return (
    <>
      {isSubmitting && createPortal(
        <div className="premium-dispatch-overlay">
          <div className="sleek-spinner-container">
            <div className="sleek-spinner-ring"></div>
            <div className="sleek-car-center">
              <Car size={32} color="var(--accent-gold)" strokeWidth={2} />
            </div>
          </div>
          <h2 className="dispatch-title">order booking ....</h2>
        </div>,
        document.body
      )}
    <div className="premium-dashboard">
      <div className="new-booking-header">
        <button onClick={() => navigate('/dashboard/client/bookings')} className="back-btn">
          <ArrowLeft size={20} />
        </button>
        <div className="header-title-box">
          <h1>Hire a Driver</h1>
          <p>Get a driver for your own car</p>
        </div>
      </div>

      <div className="booking-form-container">

        <div className="map-section-wrapper">
          <LocationMap onLocationsUpdate={handleMapUpdate} externalPickup={pickupCoords} externalDest={destCoords} />
        </div>

        <form className="auth-form" onSubmit={handleBookRide}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Pickup Location</label>
              <div className="icon-input-wrapper">
                <div className="point-icon origin"></div>
                <input type="text" name="location" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} onBlur={(e) => handleTextGeocode(e.target.value, 'pickup')} placeholder="Where should the driver come?" required className="input-field" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Where to Go (Destination)</label>
              <div className="icon-input-wrapper">
                <div className="point-icon destination"><MapPin size={8} color="#fff" /></div>
                <input type="text" name="destination" value={destinationLocation} onChange={(e) => setDestinationLocation(e.target.value)} onBlur={(e) => handleTextGeocode(e.target.value, 'destination')} placeholder="Click on map or type here" className="input-field" />
              </div>
            </div>
          </div>

          <div className="form-row form-row-spaced">
            <div className="form-group">
              <label className="form-label">Trip Type</label>
              <select name="dutyType" value={dutyType} onChange={(e) => setDutyType(e.target.value)} required className="select-field">
                <option value="Inside City">Inside City</option>
                <option value="Out of City">Out of City</option>
                <option value="Round Trip">Round Trip</option>
                <option value="One Way Drop">One Way Drop</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">How Long Do You Need the Driver?</label>
              <select name="duration" value={duration} onChange={(e) => setDuration(e.target.value)} required className="select-field">
                <option value="4 Hours">4 Hours</option>
                <option value="8 Hours">8 Hours</option>
                <option value="12 Hours">12 Hours</option>
                <option value="More than 1 day">More than 1 day</option>
              </select>
            </div>
          </div>

          <div className="form-row form-row-spaced">
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" name="date" min={getTodayDateString()} required className="date-time-field" />
            </div>
            <div className="form-group">
              <label className="form-label">Time</label>
              <input type="time" name="time" required className="date-time-field" />
            </div>
          </div>

          <div className="form-row form-row-spaced">
            <div className="form-group">
              <label className="form-label">Car Gear Type</label>
              <select name="transmission" value={transmission} onChange={(e) => setTransmission(e.target.value)} required className="select-field">
                <option value="Automatic">Automatic</option>
                <option value="Manual">Manual</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Your Car Name</label>
              <div className="icon-input-wrapper">
                <Car size={18} />
                <input 
                  type="text" 
                  name="carModel" 
                  value={carModel} 
                  onChange={(e) => setCarModel(e.target.value)} 
                  placeholder="e.g. Honda City" 
                  required 
                  className="input-field" 
                />
              </div>
            </div>
          </div>

          <div className="form-row form-row-spaced" style={{ alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Promo Code</label>
              <div className="icon-input-wrapper">
                <Ticket size={18} />
                <input 
                  type="text" 
                  name="promoCode" 
                  value={promoInput} 
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="Enter Promo Code (e.g. DRIVE30)" 
                  className="input-field" 
                  disabled={appliedCode !== ''}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
            </div>
            <div className="form-group" style={{ flexShrink: 0, marginBottom: '2px' }}>
              {appliedCode ? (
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  className="cancel-btn"
                  style={{ height: '48px', padding: '0 16px', borderColor: '#ff453a', color: '#ff453a' }}
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="submit-btn"
                  style={{ height: '48px', padding: '0 20px', background: 'var(--accent-gold)', color: '#000' }}
                >
                  Apply
                </button>
              )}
            </div>
          </div>

          <div className="pricing-footer">
            <div className="price-details">
              <span className="estimated-price-label">Estimated Price</span>
              <div className="price-value-container">
                <span className="price-value">${calculatePrice()}</span>
                {computedDistance > 0 && (
                  <span className="distance-badge">
                    {computedDistance.toFixed(1)} km
                  </span>
                )}
              </div>
            </div>
            <div className="footer-actions">
              <button type="button" onClick={() => navigate('/dashboard/client/bookings')} className="cancel-btn">Cancel</button>
              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    {showWarningModal && pendingRide && createPortal(
      <div className="safety-modal-overlay" style={{ zIndex: 11000 }}>
        <div className="safety-modal-content" style={{ maxWidth: '450px', padding: '28px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(212, 175, 55, 0.1)', color: 'var(--accent-gold)', padding: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ticket size={36} />
          </div>
          
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-gold)', margin: 0 }}>
            Wallet Balance Warning
          </h2>
          
          <p style={{ fontSize: '15px', color: 'var(--text-main)', lineHeight: '1.6', margin: 0 }}>
            Your current wallet balance is <strong style={{ color: '#ff4444' }}>${walletBalance.toFixed(2)}</strong>, which is lower than the estimated trip fare of <strong style={{ color: '#2ecc71' }}>{pendingRide.price}</strong>.
          </p>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
            To avoid payment collection delays or misunderstandings at the end of the trip, we recommend raising your wallet balance first.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '12px' }}>
            <button 
              type="button" 
              className="safety-btn-primary" 
              onClick={handleGoToWallet}
              style={{ width: '100%', marginTop: 0, background: 'var(--accent-gold)', color: '#000' }}
            >
              Add Funds to Wallet
            </button>
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button 
                type="button" 
                onClick={handleConfirmAnyway}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontWeight: '600', cursor: 'pointer' }}
              >
                Proceed Anyway
              </button>
              <button 
                type="button" 
                onClick={() => setShowWarningModal(false)}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,68,68,0.1)', color: '#ff4444', border: '1px solid rgba(255,68,68,0.2)', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
};

export default NewBooking;
