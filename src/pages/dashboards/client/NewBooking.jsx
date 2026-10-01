import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MapPin, ArrowLeft, Car, Ticket, Compass, Calendar as CalendarIcon, Sliders, ChevronDown, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAlert } from '../../../context/AlertContext';
import { useAuth } from '../../../context/AuthContext';
import LocationMap from '../../../components/LocationMap';
import './NewBooking.css';

const TRIP_TYPE_OPTIONS = [
  { value: 'Inside City', label: 'Inside City', description: 'Local trips within city limits' },
  { value: 'Out of City', label: 'Out of City', description: 'Outstation trips & highways' },
  { value: 'Round Trip', label: 'Round Trip', description: 'Return trip to original location' },
  { value: 'One Way Drop', label: 'One Way Drop', description: 'Single destination drop-off' }
];

const GEAR_TYPE_OPTIONS = [
  { value: 'Automatic', label: 'Automatic (AMT/CVT/DCT)', description: 'No clutch pedal required' },
  { value: 'Manual', label: 'Manual (Stick Shift)', description: 'Standard manual transmission' }
];

// Inline Custom Select Component
function CustomSelect({ name, value, onChange, options = [], icon: IconComponent, placeholder = 'Select option', required = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  const handleSelect = (optValue) => {
    onChange({ target: { name, value: optValue } });
    setIsOpen(false);
  };

  return (
    <div className={`custom-select-container ${isOpen ? 'open' : ''}`} ref={dropdownRef}>
      <input type="hidden" name={name} value={value || (selectedOption ? selectedOption.value : '')} required={required} />
      <div 
        className="custom-select-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
      >
        <div className="trigger-left">
          {IconComponent && <IconComponent size={18} className="select-icon" />}
          <span className="selected-text">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown size={16} className={`chevron-icon ${isOpen ? 'rotated' : ''}`} />
      </div>

      {isOpen && (
        <div className="custom-select-menu">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(opt.value)}
              >
                <div className="option-content">
                  <span className="option-label">{opt.label}</span>
                  {opt.description && <span className="option-desc">{opt.description}</span>}
                </div>
                {isSelected && <Check size={16} className="check-icon" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Inline Custom Date Picker Component
function CustomDatePicker({ name, value, onChange, minDate, placeholder = 'Select Date', required = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef(null);

  const selectedDateObj = value ? new Date(value + 'T00:00:00') : null;
  const [viewDate, setViewDate] = useState(selectedDateObj || new Date());

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleSelectDay = (day) => {
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const formattedDate = `${year}-${month}-${dayStr}`;

    onChange({ target: { name, value: formattedDate } });
    setIsOpen(false);
  };

  const isPastDate = (year, month, day) => {
    if (!minDate) return false;
    const current = new Date(year, month, day);
    const min = new Date(minDate + 'T00:00:00');
    current.setHours(0,0,0,0);
    min.setHours(0,0,0,0);
    return current < min;
  };

  const isSelectedDay = (year, month, day) => {
    if (!selectedDateObj) return false;
    return (
      selectedDateObj.getFullYear() === year &&
      selectedDateObj.getMonth() === month &&
      selectedDateObj.getDate() === day
    );
  };

  const isTodayDay = (year, month, day) => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  const formatDisplay = () => {
    if (!value) return placeholder;
    const dateObj = new Date(value + 'T00:00:00');
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const startDay = getFirstDayOfMonth(currentYear, currentMonth);

  const daysGrid = [];
  for (let i = 0; i < startDay; i++) {
    daysGrid.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysGrid.push(d);
  }

  return (
    <div className={`custom-datepicker-container ${isOpen ? 'open' : ''}`} ref={containerRef}>
      <input type="hidden" name={name} value={value || ''} required={required} />

      <div className="custom-datepicker-trigger" onClick={() => setIsOpen(!isOpen)} tabIndex={0}>
        <CalendarIcon size={18} className="calendar-trigger-icon" />
        <span className={`date-display-text ${!value ? 'placeholder' : ''}`}>
          {formatDisplay()}
        </span>
      </div>

      {isOpen && (
        <div className="custom-calendar-popover">
          <div className="calendar-header">
            <button type="button" className="cal-nav-btn" onClick={handlePrevMonth}>
              <ChevronLeft size={16} />
            </button>
            <span className="cal-month-title">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button type="button" className="cal-nav-btn" onClick={handleNextMonth}>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="calendar-weekdays">
            {dayNames.map(d => (
              <span key={d} className="weekday-name">{d}</span>
            ))}
          </div>

          <div className="calendar-days-grid">
            {daysGrid.map((day, idx) => {
              if (day === null) {
                return <span key={`empty-${idx}`} className="cal-day empty"></span>;
              }
              const disabled = isPastDate(currentYear, currentMonth, day);
              const selected = isSelectedDay(currentYear, currentMonth, day);
              const today = isTodayDay(currentYear, currentMonth, day);

              return (
                <button
                  type="button"
                  key={`day-${day}`}
                  disabled={disabled}
                  className={`cal-day ${selected ? 'selected' : ''} ${today ? 'today' : ''}`}
                  onClick={() => !disabled && handleSelectDay(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="calendar-shortcuts">
            <button 
              type="button" 
              className="shortcut-btn"
              onClick={() => {
                const todayStr = new Date().toISOString().split('T')[0];
                onChange({ target: { name, value: todayStr } });
                setIsOpen(false);
              }}
            >
              Today
            </button>
            <button 
              type="button" 
              className="shortcut-btn"
              onClick={() => {
                const tom = new Date();
                tom.setDate(tom.getDate() + 1);
                const tomStr = tom.toISOString().split('T')[0];
                onChange({ target: { name, value: tomStr } });
                setIsOpen(false);
              }}
            >
              Tomorrow
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const NewBooking = () => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { currentUser, openLogin } = useAuth();

  const [walletBalance, setWalletBalance] = useState(250);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingRide, setPendingRide] = useState(null);

  useEffect(() => {
    if (currentUser?.id) {
      try {
        const stored = localStorage.getItem(`hyd_client_wallet_${currentUser.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setWalletBalance(parseFloat(parsed.balance || 250));
        }
      } catch (e) {}
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
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');

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

  useEffect(() => {
    const pending = localStorage.getItem('pendingBooking');
    if (pending) {
      try {
        const data = JSON.parse(pending);
        if (data.location) setPickupLocation(data.location);
        if (data.destination) setDestinationLocation(data.destination);
        if (data.dutyType) setDutyType(data.dutyType);
        if (data.duration) setDuration(data.duration);
        if (data.transmission) setTransmission(data.transmission);
        if (data.carModel) setCarModel(data.carModel);
        if (data.date) setBookingDate(data.date);
        if (data.time) setBookingTime(data.time);

        // Auto geocode to load coordinates & calculate price
        if (data.location) {
          handleTextGeocode(data.location, 'pickup');
        }
        if (data.destination) {
          handleTextGeocode(data.destination, 'destination');
        }
      } catch (err) {
        console.error('Error parsing pending booking:', err);
      }
      localStorage.removeItem('pendingBooking');
    }
  }, []);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) {
      return showAlert('Please enter a promo code first', 'error');
    }

    const code = promoInput.trim().toUpperCase();

    // Enforce 1-time coupon usage per user account
    const userId = currentUser?.id || currentUser?.email || 'client_user';
    let userUsedCoupons = [];
    try {
      const allUsed = JSON.parse(localStorage.getItem('hyd_used_coupons') || '{}');
      userUsedCoupons = Array.isArray(allUsed[userId]) ? allUsed[userId] : [];
    } catch (e) {}

    // Verify against past non-cancelled bookings of this client
    try {
      const storedBookings = JSON.parse(localStorage.getItem('hyd_demo_bookings') || '[]');
      if (Array.isArray(storedBookings)) {
        const hasUsedInPast = storedBookings.some(b => {
          const isUserMatch = (
            (currentUser?.id && String(b.client_id) === String(currentUser.id)) ||
            (currentUser?.email && (b.client_email === currentUser.email || b.email === currentUser.email)) ||
            (currentUser?.phone && (b.client_phone === currentUser.phone || b.clientPhone === currentUser.phone)) ||
            (currentUser?.name && (b.client_name === currentUser.name || b.clientName === currentUser.name))
          );
          const hasSamePromo = (b.promo_code && b.promo_code.toUpperCase() === code);
          const isNotCancelled = b.status !== 'cancelled';
          return isUserMatch && hasSamePromo && isNotCancelled;
        });

        if (hasUsedInPast && !userUsedCoupons.includes(code)) {
          userUsedCoupons.push(code);
        }
      }
    } catch (e) {}

    if (userUsedCoupons.includes(code)) {
      return showAlert(`Coupon code "${code}" has already been used on your account. Each coupon code can only be used once per user.`, 'error');
    }

    // 1. Standard Built-in Promo Codes
    const builtInCodes = {
      'WELCOME20': 20,
      'SAVE10': 10,
      'HYD50': 50,
      'FIRST50': 50,
      'GOLDEN30': 30,
      'DRIVE30': 30,
      'SUMMER50': 50,
      'VIP25': 25,
      'DISCOUNT20': 20
    };

    let resolvedDiscount = builtInCodes[code] || null;

    // 2. Check registered promo codes from hyd_promo_codes
    if (!resolvedDiscount) {
      try {
        const storedPromos = JSON.parse(localStorage.getItem('hyd_promo_codes') || '{}');
        if (storedPromos[code]) {
          resolvedDiscount = Number(storedPromos[code]);
        }
      } catch (err) {}
    }

    // 3. Check hyd_demo_messages for published promo campaigns
    if (!resolvedDiscount) {
      try {
        const rawMsgs = localStorage.getItem('hyd_demo_messages');
        if (rawMsgs) {
          const msgs = JSON.parse(rawMsgs);
          const found = msgs.find(m => 
            (m.promo_code && m.promo_code.toUpperCase() === code) ||
            (m.title && m.title.toUpperCase().includes(code)) ||
            (m.message && m.message.toUpperCase().includes(code))
          );
          if (found) {
            if (found.discount_percent) {
              resolvedDiscount = Number(found.discount_percent);
            } else {
              const numMatch = `${found.title} ${found.message}`.match(/(\d+)%/);
              resolvedDiscount = numMatch ? Number(numMatch[1]) : 20;
            }
          }
        }
      } catch (err) {}
    }

    // 4. Check client notifications for received promo codes
    if (!resolvedDiscount) {
      try {
        const rawNotifs = localStorage.getItem('hyd_demo_notifications_client') || localStorage.getItem('hyd_demo_notifications');
        if (rawNotifs) {
          const notifs = JSON.parse(rawNotifs);
          const found = notifs.find(n => 
            (n.promo_code && n.promo_code.toUpperCase() === code) ||
            (n.title && n.title.toUpperCase().includes(code)) ||
            (n.message && n.message.toUpperCase().includes(code))
          );
          if (found) {
            if (found.discount_percent) {
              resolvedDiscount = Number(found.discount_percent);
            } else {
              const numMatch = `${n.title || ''} ${n.message || ''}`.match(/(\d+)%/);
              resolvedDiscount = numMatch ? Number(numMatch[1]) : 20;
            }
          }
        }
      } catch (err) {}
    }

    // 5. Intelligent percentage extraction from code name (e.g. HIRE20-..., HIRE50-..., SAVE30, OFF25)
    if (!resolvedDiscount) {
      const patternMatch = code.match(/^(?:[A-Z_\-]*?)(\d{1,2})(?:[A-Z_\-0-9]*)$/);
      if (patternMatch) {
        const parsedPct = Number(patternMatch[1]);
        if (parsedPct >= 5 && parsedPct <= 90) {
          resolvedDiscount = parsedPct;
        }
      }
    }

    if (resolvedDiscount) {
      setAppliedCode(code);
      setDiscountPercent(resolvedDiscount);
      showAlert(`Promo code "${code}" applied successfully! ${resolvedDiscount}% discount applied.`, 'success');
    } else {
      showAlert(`Invalid promo code "${code}". Try WELCOME20, HYD50, or check your notification promo codes.`, 'error');
    }
  };

  const handleRemovePromo = () => {
    setAppliedCode('');
    setDiscountPercent(0);
    setPromoInput('');
    showAlert('Promo code removed', 'success');
  };

  const calculatePrice = () => {
    let basePrice = 25;
    
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
      const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const bookingRef = `HYD-${Math.floor(1000 + Math.random() * 9000)}`;
      const estPrice = parseFloat(calculatePrice());
      let grossPrice = estPrice;
      let discountAmt = 0;
      if (discountPercent > 0) {
        grossPrice = parseFloat((estPrice / ((100 - discountPercent) / 100)).toFixed(2));
        discountAmt = parseFloat((grossPrice - estPrice).toFixed(2));
      }
      const driverShareAmt = parseFloat((estPrice * 0.85).toFixed(2));
      const companyRevAmt = parseFloat((estPrice * 0.15).toFixed(2));

      const pickupLoc = rideData.pickup_location || pickupLocation || 'Indiranagar 100ft Road';
      const dropoffLoc = rideData.dropoff_location || destinationLocation || 'Kempegowda Int Airport';
      const model = rideData.car_model || carModel || 'Sedan (Personal Car)';
      const duty = rideData.duty_type || dutyType || 'Inside City';
      const trans = rideData.transmission || transmission || 'Automatic';

      const newBooking = {
        id: Date.now(),
        dbId: Date.now(),
        booking_reference: bookingRef,
        bookingRef: bookingRef,
        client_id: currentUser?.id || 2,
        client_name: currentUser?.name || 'Rahul Sharma',
        clientName: currentUser?.name || 'Rahul Sharma',
        client_phone: currentUser?.phone || '+91 98765 00000',
        clientPhone: currentUser?.phone || '+91 98765 00000',
        pickup_location: pickupLoc,
        location: pickupLoc,
        dropoff_location: dropoffLoc,
        destination: dropoffLoc,
        pickupCoords: pickupCoords || { lat: 12.9716, lng: 77.5946 },
        destCoords: destCoords || { lat: 13.1986, lng: 77.7066 },
        booking_date: new Date().toISOString(),
        date: rideData.date || bookingDate || 'Today',
        pickup_time: rideData.time || bookingTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        time: rideData.time || bookingTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        car_type: model,
        carModel: model,
        duty_type: duty,
        dutyType: duty,
        transmission: trans,
        original_price: grossPrice,
        trip_price: grossPrice,
        discount_amount: discountAmt,
        discount_percent: discountPercent,
        promo_code: appliedCode || null,
        estimated_fare: estPrice,
        fare: estPrice,
        price: `₹${estPrice.toFixed(0)}`,
        driver_share: driverShareAmt,
        company_revenue: companyRevAmt,
        commission: companyRevAmt,
        status: 'unassigned',
        driver_id: null,
        driver_name: null,
        driverPhone: null,
        driver_phone: null,
        driver_rating: null,
        driver_photo: null,
        otp: generatedOtp,
        startOtp: generatedOtp,
        duration: duration || '2.0 hrs',
        urgency: 'Normal',
        paymentStatus: 'Pending',
        created_at: new Date().toISOString()
      };

      try {
        const stored = localStorage.getItem('hyd_demo_bookings');
        const list = stored ? JSON.parse(stored) : [];
        list.unshift(newBooking);
        localStorage.setItem('hyd_demo_bookings', JSON.stringify(list));

        // Mark coupon as used for this user so it cannot be used again
        if (appliedCode) {
          try {
            const userId = currentUser?.id || currentUser?.email || 'client_user';
            const allUsed = JSON.parse(localStorage.getItem('hyd_used_coupons') || '{}');
            const listUsed = Array.isArray(allUsed[userId]) ? allUsed[userId] : [];
            if (!listUsed.includes(appliedCode)) {
              listUsed.push(appliedCode);
            }
            allUsed[userId] = listUsed;
            localStorage.setItem('hyd_used_coupons', JSON.stringify(allUsed));
          } catch (e) {}
        }

        // Push notification for available drivers
        const driverNotifKey = 'hyd_demo_notifications_driver';
        const rawDriverNotifs = localStorage.getItem(driverNotifKey);
        const driverNotifs = rawDriverNotifs ? JSON.parse(rawDriverNotifs) : [];
        const driverAlert = {
          id: Date.now(),
          role: 'driver',
          title: 'New Trip Request Available',
          message: `New ${duty} booking #${bookingRef} available from ${pickupLoc} to ${dropoffLoc} (Payout: ₹${estPrice.toFixed(0)}).`,
          is_read: 0,
          created_at: new Date().toISOString(),
          type: 'info'
        };
        localStorage.setItem(driverNotifKey, JSON.stringify([driverAlert, ...(Array.isArray(driverNotifs) ? driverNotifs : [])]));

        // Push notification for client with their OTP
        const clientNotifKey = 'hyd_demo_notifications_client';
        const rawClientNotifs = localStorage.getItem(clientNotifKey);
        const clientNotifs = rawClientNotifs ? JSON.parse(rawClientNotifs) : [];
        const clientAlert = {
          id: Date.now() + 1,
          role: 'client',
          title: 'Ride Request Broadcasted',
          message: `Booking #${bookingRef} sent to nearby drivers. Your start OTP is ${generatedOtp}. Share this with your chauffeur upon arrival.`,
          is_read: 0,
          created_at: new Date().toISOString(),
          type: 'success'
        };
        localStorage.setItem(clientNotifKey, JSON.stringify([clientAlert, ...(Array.isArray(clientNotifs) ? clientNotifs : [])]));

        // Dispatch events so open tabs/pages update immediately
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('hyd:new-booking', { detail: newBooking }));
        window.dispatchEvent(new CustomEvent('hyd:new-notification', { detail: driverAlert }));
      } catch (e) {
        console.error('Storage error:', e);
      }

      // Brief delay for UX feedback
      await new Promise(resolve => setTimeout(resolve, 1000));

      showAlert(`Trip request broadcasted! Your trip OTP is ${generatedOtp}.`, "success");
      navigate('/dashboard/client/bookings');
    } catch (error) {
      console.error('Error creating booking:', error);
      showAlert("Error creating booking", "error");
      setIsSubmitting(false);
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
    
    if (!currentUser) {
      const formData = new FormData(e.target);
      const bookingData = {
        location: pickupLocation || formData.get('location'),
        destination: destinationLocation || formData.get('destination'),
        dutyType: dutyType,
        duration: 'Flexible',
        transmission: transmission,
        carModel: formData.get('carModel'),
        date: bookingDate || formData.get('date'),
      };
      
      localStorage.setItem('pendingBooking', JSON.stringify(bookingData));
      showAlert("Please log in or register to complete your booking.", "info");
      openLogin();
      return;
    }

    const formData = new FormData(e.target);
    const selectedDate = formData.get('date');

    if (selectedDate) {
      const today = getTodayDateString();
      if (selectedDate < today) {
        return showAlert('Booking date cannot be in the past. Please select a current or future date.', 'error');
      }
    }

    const estPrice = parseFloat(calculatePrice());
    
    const newRide = {
      booking_ref: `DRV-${Math.floor(Math.random() * 9000) + 1000}`,
      client_id: currentUser.id,
      date: formData.get('date'),
      location: pickupLocation || formData.get('location'),
      destination: destinationLocation || formData.get('destination'),
      duty_type: dutyType,
      duration: 'Flexible',
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
              <div className="location-label-wrapper">
                <span className="location-marker-badge pickup-badge">A</span>
                <label className="form-label" style={{ marginBottom: 0 }}>Pickup Location</label>
              </div>
              <div className="icon-input-wrapper">
                <div className="point-icon origin" style={{ background: '#22c55e', borderRadius: '50%', padding: '4px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={13} color="#fff" />
                </div>
                <input type="text" name="location" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} onBlur={(e) => handleTextGeocode(e.target.value, 'pickup')} placeholder="Where should the driver come?" required className="input-field" />
              </div>
            </div>
            <div className="form-group">
              <div className="location-label-wrapper">
                <span className="location-marker-badge drop-badge">B</span>
                <label className="form-label" style={{ marginBottom: 0 }}>Drop Location (Destination)</label>
              </div>
              <div className="icon-input-wrapper">
                <div className="point-icon destination" style={{ background: '#ef4444', borderRadius: '50%', padding: '4px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={13} color="#fff" />
                </div>
                <input type="text" name="destination" value={destinationLocation} onChange={(e) => setDestinationLocation(e.target.value)} onBlur={(e) => handleTextGeocode(e.target.value, 'destination')} placeholder="Click on map or type here" required className="input-field" />
              </div>
            </div>
          </div>

          <div className="form-row form-row-spaced">
            <div className="form-group">
              <label className="form-label">Trip Type</label>
              <CustomSelect
                name="dutyType"
                value={dutyType}
                onChange={(e) => setDutyType(e.target.value)}
                options={TRIP_TYPE_OPTIONS}
                icon={Compass}
                placeholder="Select Trip Type"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <CustomDatePicker
                name="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                minDate={getTodayDateString()}
                placeholder="Select Date"
                required
              />
            </div>
          </div>

          <div className="form-row form-row-spaced">
            <div className="form-group">
              <label className="form-label">Car Gear Type</label>
              <CustomSelect
                name="transmission"
                value={transmission}
                onChange={(e) => setTransmission(e.target.value)}
                options={GEAR_TYPE_OPTIONS}
                icon={Sliders}
                placeholder="Select Gear Type"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Your Car Name</label>
              <div className="icon-input-wrapper">
                <Car size={18} className="field-icon" />
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Promo Code</label>
                {appliedCode && (
                  <span style={{ fontSize: '11.5px', color: '#22c55e', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={13} /> {discountPercent}% OFF Active
                  </span>
                )}
              </div>
              <div className="icon-input-wrapper">
                <Ticket size={18} />
                <input 
                  type="text" 
                  name="promoCode" 
                  value={promoInput} 
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="Enter Promo Code (e.g. HYD50, WELCOME20)" 
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
