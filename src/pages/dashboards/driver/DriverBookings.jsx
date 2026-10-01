import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Car, Clock, Calendar as CalendarIcon, ChevronRight, Search, Filter, User, Play } from 'lucide-react';
import { useAlert } from '../../../context/AlertContext';
import { useAuth } from '../../../context/AuthContext';
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
    return { is_clocked_in: 0, hours_logged: 5.5, monthly_hours_logged: 48.0, last_clock_in: null };
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

  const normalizeDriverRide = (b, isRequest = false, index = 0) => {
    if (!b) return null;
    const id = b.id || b.dbId || (index + 1);
    const dbId = b.dbId || id;
    const bookingRef = b.bookingRef || b.booking_reference || b.bookingReference || `HYD-${dbId}`;
    const location = b.location || b.pickupLocation || b.pickup_location || 'Banjara Hills, Road No. 12';
    const destination = b.destination || b.dropoffLocation || b.dropoff_location || 'RGIA Airport';
    const date = b.date || b.booking_date || 'Today, 2:30 PM';
    const dutyType = b.dutyType || b.duty_type || 'Inside City';
    const carModel = b.carModel || b.car_type || 'Sedan (Honda City)';
    const transmission = b.transmission || 'Automatic';
    const clientName = b.clientName || b.client_name || 'Client';
    const clientPhone = b.clientPhone || b.client_phone || '+91 98765 00000';
    const status = (b.status || (isRequest ? 'request' : 'upcoming')).toLowerCase();

    let priceStr = '₹650';
    if (typeof b.price === 'string' && b.price) priceStr = b.price;
    else if (typeof b.price === 'number') priceStr = `₹${b.price}`;
    else if (typeof b.estimated_fare === 'number') priceStr = `₹${b.estimated_fare}`;
    else if (typeof b.estimated_fare === 'string' && b.estimated_fare) priceStr = b.estimated_fare;

    const duration = b.duration || '2.0 hrs';
    const startOtp = b.startOtp || b.otp || '4821';
    const paymentStatus = b.paymentStatus || 'Paid';
    const urgency = b.urgency || 'Normal';

    return {
      ...b,
      id,
      dbId,
      bookingRef,
      location,
      destination,
      pickupLocation: location,
      dropoffLocation: destination,
      date,
      dutyType,
      carModel,
      transmission,
      clientName,
      clientPhone,
      status,
      price: priceStr,
      duration,
      startOtp,
      paymentStatus,
      urgency
    };
  };

  const fetchData = () => {
    // 1. Attendance state
    const attData = getStoredAttendance();
    const clockedIn = (attData.is_clocked_in === 1 || attData.online === true) && Boolean(attData.last_clock_in);
    setIsClockedIn(clockedIn);

    // 2. Mock & LocalStorage Bookings
    const defaultAssigned = [
      {
        id: 1,
        dbId: 1,
        bookingRef: 'HYD-8492',
        clientName: 'Priya Sharma',
        clientPhone: '9876500000',
        pickupLocation: 'Banjara Hills, Road No. 12',
        dropoffLocation: 'RGIA Airport, Shamshabad',
        date: 'Today, 2:30 PM',
        dutyType: 'One Way',
        carModel: 'Honda City (Manual)',
        transmission: 'Manual',
        price: '₹650',
        status: 'upcoming',
        startOtp: '4821',
        paymentStatus: 'Paid'
      }
    ];

    const defaultAvailable = [
      { id: 101, dbId: 101, bookingRef: 'HYD-9021', clientName: 'Ananya Rao', pickupLocation: 'Hitech City, Hyderabad', dropoffLocation: 'Gachibowli, Hyderabad', dutyType: 'Inside City', carModel: 'Hyundai Creta', transmission: 'Automatic', price: '₹450', duration: '2.5 hrs', date: 'Today, 4:00 PM', urgency: 'Normal', status: 'request' },
      { id: 102, dbId: 102, bookingRef: 'HYD-9022', clientName: 'Karan Sharma', pickupLocation: 'Banjara Hills, Hyderabad', dropoffLocation: 'Vijayawada Highway', dutyType: 'Outstation', carModel: 'Toyota Innova Crysta', transmission: 'Manual', price: '₹2,800', duration: '1 Day', date: 'Tomorrow, 6:00 AM', urgency: 'High', status: 'request' },
      { id: 103, dbId: 103, bookingRef: 'HYD-9023', clientName: 'Siddharth Varma', pickupLocation: 'Jubilee Hills, Hyderabad', dropoffLocation: 'RGIA Airport', dutyType: 'One Way', carModel: 'Honda City', transmission: 'Automatic', price: '₹650', duration: '1.5 hrs', date: 'Today, 8:30 PM', urgency: 'Urgent', status: 'request' }
    ];

    try {
      const storedBookings = localStorage.getItem('hyd_demo_bookings');
      if (storedBookings) {
        const parsed = JSON.parse(storedBookings);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const assigned = parsed
            .filter(b => b.status === 'upcoming' || b.status === 'in_progress' || b.status === 'started')
            .map((b, idx) => normalizeDriverRide(b, false, idx));
          const available = parsed
            .filter(b => b.status === 'unassigned' || b.status === 'pending' || b.status === 'request')
            .map((b, idx) => normalizeDriverRide(b, true, idx));
          
          setAssignedRides(assigned.length > 0 ? assigned : defaultAssigned.map((b, idx) => normalizeDriverRide(b, false, idx)));
          setAvailableRequests(available.length > 0 ? available : defaultAvailable.map((b, idx) => normalizeDriverRide(b, true, idx)));
          setLoading(false);
          return;
        }
      }
    } catch (e) {}

    setAssignedRides(defaultAssigned.map((b, idx) => normalizeDriverRide(b, false, idx)));
    setAvailableRequests(defaultAvailable.map((b, idx) => normalizeDriverRide(b, true, idx)));
    setLoading(false);
  };

  // Push a duty-status notification into the shared driver notification store
  const pushDutyNotification = (isGoingOnline) => {
    const notifKey = 'hyd_demo_notifications_driver';
    const clearedKey = 'hyd_notif_cleared_driver';
    try {
      const raw = localStorage.getItem(notifKey);
      const existing = raw ? JSON.parse(raw) : [];
      const arr = Array.isArray(existing) ? existing : [];
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newNotif = isGoingOnline
        ? {
            id: Date.now(),
            role: 'driver',
            title: 'You are On Duty',
            message: `You clocked in at ${timeStr}. Ride dispatch is now active — you are visible to nearby clients.`,
            is_read: 0,
            created_at: new Date().toISOString(),
            type: 'success'
          }
        : {
            id: Date.now(),
            role: 'driver',
            title: 'You are Off Duty',
            message: `You clocked out at ${timeStr}. Ride dispatch has been paused.`,
            is_read: 0,
            created_at: new Date().toISOString(),
            type: 'warning'
          };
      // Persist to localStorage
      localStorage.setItem(clearedKey, '0');
      localStorage.setItem(notifKey, JSON.stringify([newNotif, ...arr]));
      // Directly inject into DashboardLayout's bell panel via custom event
      window.dispatchEvent(new CustomEvent('hyd:new-notification', { detail: newNotif }));
    } catch (e) {}
  };

  const handleClockToggle = () => {
    const now = new Date();
    const currentlyOn = isClockedIn;

    if (!currentlyOn) {
      saveStoredAttendance({ is_clocked_in: 1, online: true, last_clock_in: now.toISOString() });
      setIsClockedIn(true);
      pushDutyNotification(true);
      showAlert("Clocked In successfully! You are now On Duty.", "success");
    } else {
      saveStoredAttendance({ is_clocked_in: 0, online: false, last_clock_in: null });
      setIsClockedIn(false);
      pushDutyNotification(false);
      showAlert("Clocked Out successfully! You are now Off Duty.", "success");
    }

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('hyd:duty-change', { detail: { is_clocked_in: currentlyOn ? 0 : 1 } }));
    fetchData();
  };



  useEffect(() => {
    fetchData();

    const handleStorage = () => {
      fetchData();
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [currentUser]);

  const handleAccept = (dbId, bookingRef) => {
    if (!isClockedIn) {
      showAlert("You must be On Duty to accept rides! Please clock in first.", "error");
      return;
    }

    const acceptedRide = availableRequests.find(r => String(r.dbId) === String(dbId) || String(r.id) === String(dbId) || r.bookingRef === bookingRef);
    let updatedTrip = null;

    try {
      const storedBookings = localStorage.getItem('hyd_demo_bookings');
      if (storedBookings) {
        const list = JSON.parse(storedBookings);
        const updatedList = list.map(b => {
          const matchDb = String(b.dbId) === String(dbId) || String(b.id) === String(dbId);
          const matchRef = (b.booking_reference && b.booking_reference === bookingRef) || (b.bookingRef && b.bookingRef === bookingRef);
          if (matchDb || matchRef) {
            const updated = {
              ...b,
              status: 'upcoming',
              driver_id: currentUser?.id || 3,
              driver_name: currentUser?.name || 'Rajesh Kumar',
              driver_phone: currentUser?.phone || '+91 98765 43212',
              driver_rating: 4.85,
              driver_photo: currentUser?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
              accepted_at: new Date().toISOString()
            };
            updatedTrip = normalizeDriverRide(updated, false);
            return updated;
          }
          return b;
        });
        localStorage.setItem('hyd_demo_bookings', JSON.stringify(updatedList));

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
      console.error('Error accepting in DriverBookings:', e);
    }

    const finalTrip = updatedTrip || (acceptedRide ? { ...acceptedRide, status: 'upcoming' } : null);
    if (finalTrip) {
      setAssignedRides(prev => [finalTrip, ...prev.filter(r => String(r.dbId) !== String(dbId) && String(r.id) !== String(dbId))]);
      setAvailableRequests(prev => prev.filter(r => String(r.dbId) !== String(dbId) && String(r.id) !== String(dbId)));
      setSelectedTrip(finalTrip);
    }
    showAlert(`Successfully accepted ride ${bookingRef || dbId}! Active Trip Console opened.`, "success");
  };

  const handleDecline = (dbId, bookingRef) => {
    const updated = [...declinedIds, dbId];
    setDeclinedIds(updated);
    localStorage.setItem(`declinedBookings_${currentUser?.id || 3}`, JSON.stringify(updated));
    showAlert(`Declined ride request ${bookingRef || dbId}.`, "info");
  };

  const handleStartTrip = (dbId, bookingRef, otpCode) => {
    const targetRide = assignedRides.find(r => String(r.dbId) === String(dbId) || String(r.id) === String(dbId) || r.bookingRef === bookingRef);
    const expectedOtp = String(targetRide?.startOtp || targetRide?.otp || '4821').trim();
    const enteredOtp = String(otpCode || '').trim();

    if (!enteredOtp || enteredOtp.length !== 4) {
      showAlert("Please enter the complete 4-digit OTP provided by the client.", "error");
      return false;
    }

    if (enteredOtp !== expectedOtp) {
      showAlert(`Invalid OTP entered! Please ask the client for the 4-digit OTP displayed on their screen.`, "error");
      return false;
    }

    try {
      const storedBookings = localStorage.getItem('hyd_demo_bookings');
      if (storedBookings) {
        const list = JSON.parse(storedBookings);
        const updatedList = list.map(b => {
          const matchDb = String(b.dbId) === String(dbId) || String(b.id) === String(dbId);
          const matchRef = (b.booking_reference && b.booking_reference === bookingRef) || (b.bookingRef && b.bookingRef === bookingRef);
          if (matchDb || matchRef) {
            return {
              ...b,
              status: 'in_progress',
              trip_started_at: new Date().toISOString()
            };
          }
          return b;
        });
        localStorage.setItem('hyd_demo_bookings', JSON.stringify(updatedList));

        // Notify client that trip started
        const clientNotifKey = 'hyd_demo_notifications_client';
        const rawC = localStorage.getItem(clientNotifKey);
        const cList = rawC ? JSON.parse(rawC) : [];
        const clientAlert = {
          id: Date.now(),
          role: 'client',
          title: 'Trip Started!',
          message: `Your chauffeur verified OTP. Trip #${bookingRef || dbId} is now in progress. Sit back and enjoy the ride!`,
          is_read: 0,
          created_at: new Date().toISOString(),
          type: 'success'
        };
        localStorage.setItem(clientNotifKey, JSON.stringify([clientAlert, ...(Array.isArray(cList) ? cList : [])]));

        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('hyd:new-notification', { detail: clientAlert }));
      }
    } catch (e) {
      console.error('Error starting trip in storage:', e);
    }

    setAssignedRides(prev => prev.map(r => (String(r.dbId) === String(dbId) || String(r.id) === String(dbId)) ? { ...r, status: 'in_progress' } : r));
    if (selectedTrip && (String(selectedTrip.dbId) === String(dbId) || String(selectedTrip.id) === String(dbId))) {
      setSelectedTrip(prev => ({ ...prev, status: 'in_progress' }));
    }
    setEnteringOtpId(null);
    setOtpValue('');
    showAlert(`OTP Verified! Trip ${bookingRef || dbId} has started.`, "success");
    return true;
  };

  const handleCompleteTrip = (dbId, bookingRef) => {
    const targetRide = assignedRides.find(r => String(r.dbId) === String(dbId) || String(r.id) === String(dbId) || r.bookingRef === bookingRef);
    const rawFare = targetRide?.fare || targetRide?.price || targetRide?.estimated_fare || 650;
    const fareNum = typeof rawFare === 'number'
      ? rawFare
      : (parseFloat(String(rawFare).replace(/[^0-9.]/g, '')) || 650);

    const COMMISSION_RATE = 0.15; // 15% platform commission terms
    const adminCommission = Math.round(fareNum * COMMISSION_RATE * 100) / 100;
    const driverEarnings = Math.round((fareNum - adminCommission) * 100) / 100;
    const driverId = currentUser?.id || 3;
    const clientId = targetRide?.client_id || 2;
    const nowIso = new Date().toISOString();

    // 1. Update Booking Status in LocalStorage
    try {
      const storedBookings = localStorage.getItem('hyd_demo_bookings');
      if (storedBookings) {
        const list = JSON.parse(storedBookings);
        const updatedList = list.map(b => {
          const matchDb = String(b.dbId) === String(dbId) || String(b.id) === String(dbId);
          const matchRef = (b.booking_reference && b.booking_reference === bookingRef) || (b.bookingRef && b.bookingRef === bookingRef);
          if (matchDb || matchRef) {
            return {
              ...b,
              status: 'completed',
              paymentStatus: 'Paid',
              total_fare: fareNum,
              admin_commission: adminCommission,
              driver_earnings: driverEarnings,
              completed_at: nowIso
            };
          }
          return b;
        });
        localStorage.setItem('hyd_demo_bookings', JSON.stringify(updatedList));
      }
    } catch (e) {
      console.error('Error completing trip in bookings:', e);
    }

    // 2. Credit Admin Revenue (15% Commission)
    try {
      const defaultAdminRevenue = {
        wallet: { balance: 25000.00, currency: 'INR' },
        totalPlatformRevenue: 1250.00,
        completedTrips: 1,
        commissionRate: 15,
        transactions: []
      };
      const rawAdmin = localStorage.getItem('hyd_demo_admin_revenue');
      let adminData = defaultAdminRevenue;
      if (rawAdmin) {
        try {
          const parsed = JSON.parse(rawAdmin);
          if (parsed && (parsed.wallet?.currency === 'INR' || parsed.wallet?.balance < 40000)) {
            adminData = parsed;
          }
        } catch (e) {}
      }
      adminData.wallet = adminData.wallet || { balance: 25000.00, currency: 'INR' };
      adminData.wallet.currency = 'INR';
      adminData.wallet.balance = (Number(adminData.wallet.balance) || 25000.00) + adminCommission;
      adminData.totalPlatformRevenue = (Number(adminData.totalPlatformRevenue) || 1250.00) + fareNum;
      adminData.completedTrips = (Number(adminData.completedTrips) || 1) + 1;
      adminData.transactions = Array.isArray(adminData.transactions) ? adminData.transactions : [];
      adminData.transactions.unshift({
        id: Date.now(),
        amount: adminCommission,
        transaction_type: 'credit',
        category: 'Platform Commission (15%)',
        description: `Platform Fee (15%) - Trip #${bookingRef || dbId}`,
        details: `Trip Fare: ₹${fareNum.toFixed(2)} • Completed ride`,
        created_at: nowIso,
        status: 'Settled'
      });
      localStorage.setItem('hyd_demo_admin_revenue', JSON.stringify(adminData));
    } catch (e) {
      console.error('Error updating admin revenue:', e);
    }

    // 3. Credit Driver Wallet (85% Net Earnings)
    try {
      const defaultDriverWallet = {
        wallet: { id: driverId, user_id: driverId, balance: 15400, currency: 'USD' },
        cards: [
          { id: 1, user_id: driverId, card_brand: 'HDFC Bank', card_last4: '4821', expiry_date: 'N/A' },
          { id: 2, user_id: driverId, card_brand: 'Google Pay', card_last4: '9876', expiry_date: 'N/A' }
        ],
        transactions: []
      };
      const wKey = `hyd_driver_wallet_data_${driverId}`;
      const rawDriver = localStorage.getItem(wKey);
      const driverData = rawDriver ? JSON.parse(rawDriver) : defaultDriverWallet;
      driverData.wallet = driverData.wallet || { id: driverId, user_id: driverId, balance: 15400, currency: 'USD' };
      driverData.wallet.balance = (Number(driverData.wallet.balance) || 0) + driverEarnings;
      driverData.transactions = Array.isArray(driverData.transactions) ? driverData.transactions : [];
      driverData.transactions.unshift({
        id: Date.now(),
        user_id: driverId,
        amount: driverEarnings,
        transaction_type: 'credit',
        description: `Net Trip Earnings (85%) - Booking #${bookingRef || dbId}`,
        created_at: nowIso
      });
      localStorage.setItem(wKey, JSON.stringify(driverData));
      localStorage.setItem(`hyd_driver_wallet_${driverId}`, JSON.stringify({ balance: driverData.wallet.balance }));
    } catch (e) {
      console.error('Error updating driver wallet:', e);
    }

    // 4. Deduct Fare from Client Wallet
    try {
      const cKey = `hyd_client_wallet_data_${clientId}`;
      const rawClient = localStorage.getItem(cKey);
      if (rawClient) {
        const cData = JSON.parse(rawClient);
        if (cData.wallet) {
          cData.wallet.balance = Math.max(0, (Number(cData.wallet.balance) || 0) - fareNum);
          cData.transactions = Array.isArray(cData.transactions) ? cData.transactions : [];
          cData.transactions.unshift({
            id: Date.now(),
            amount: fareNum,
            transaction_type: 'debit',
            description: `Trip Payment - Booking #${bookingRef || dbId}`,
            created_at: nowIso
          });
          localStorage.setItem(cKey, JSON.stringify(cData));
          localStorage.setItem(`hyd_client_wallet_${clientId}`, JSON.stringify(cData.wallet));
        }
      }
    } catch (e) {
      console.error('Error updating client wallet:', e);
    }

    // 5. Multi-Party Notifications
    try {
      // Client Notification
      const clientNotifKey = 'hyd_demo_notifications_client';
      const rawC = localStorage.getItem(clientNotifKey);
      const cList = rawC ? JSON.parse(rawC) : [];
      cList.unshift({
        id: Date.now(),
        role: 'client',
        title: 'Trip Completed & Paid',
        message: `Trip #${bookingRef || dbId} reached destination. Fare $${fareNum.toFixed(2)} paid successfully. Thank you for riding with Hire Your Driver!`,
        is_read: 0,
        created_at: nowIso,
        type: 'success'
      });
      localStorage.setItem(clientNotifKey, JSON.stringify(cList));

      // Driver Notification
      const driverNotifKey = 'hyd_demo_notifications_driver';
      const rawD = localStorage.getItem(driverNotifKey);
      const dList = rawD ? JSON.parse(rawD) : [];
      dList.unshift({
        id: Date.now() + 1,
        role: 'driver',
        title: 'Trip Payment Credited',
        message: `Trip #${bookingRef || dbId} complete! +$${driverEarnings.toFixed(2)} (85%) added to your wallet. Platform fee: $${adminCommission.toFixed(2)} (15%).`,
        is_read: 0,
        created_at: nowIso,
        type: 'success'
      });
      localStorage.setItem(driverNotifKey, JSON.stringify(dList));

      // Admin Notification
      const adminNotifKey = 'hyd_demo_notifications_admin';
      const rawA = localStorage.getItem(adminNotifKey);
      const aList = rawA ? JSON.parse(rawA) : [];
      aList.unshift({
        id: Date.now() + 2,
        role: 'admin',
        title: 'Platform Commission Received',
        message: `+$${adminCommission.toFixed(2)} platform commission received from Trip #${bookingRef || dbId} (Total fare: $${fareNum.toFixed(2)}).`,
        is_read: 0,
        created_at: nowIso,
        type: 'success'
      });
      localStorage.setItem(adminNotifKey, JSON.stringify(aList));
    } catch (e) {}

    // 6. Update Local State & Broadcast
    setAssignedRides(prev => prev.map(r => {
      if (String(r.dbId) === String(dbId) || String(r.id) === String(dbId)) {
        return { ...r, status: 'completed', paymentStatus: 'Paid' };
      }
      return r;
    }));

    window.dispatchEvent(new Event('storage'));
    setSelectedTrip(null);
    showAlert(`Trip Completed! You earned $${driverEarnings.toFixed(2)} (85%). Platform commission $${adminCommission.toFixed(2)} (15%) credited to Admin.`, "success");
  };

  // Filter out requests that this driver declined
  const visibleRequests = availableRequests.filter(req => !declinedIds.includes(req.dbId) && !declinedIds.includes(req.id));
  
  const upcomingRides = assignedRides.filter(r => r.status === 'upcoming' || r.status === 'started' || r.status === 'in_progress');
  const pastRides = assignedRides.filter(r => r.status !== 'upcoming' && r.status !== 'started' && r.status !== 'in_progress');

  // Filter logic based on active tab
  const getActiveList = () => {
    if (activeTab === 'requests') return visibleRequests;
    if (activeTab === 'upcoming') return upcomingRides;
    return pastRides;
  };

  const filteredRides = getActiveList().filter(ride => {
    if (!ride) return false;

    // 1. Search query filter
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const idMatch = String(ride.bookingRef || ride.id || '').toLowerCase().includes(query);
      const locMatch = String(ride.location || ride.pickupLocation || '').toLowerCase().includes(query);
      const destMatch = String(ride.destination || ride.dropoffLocation || '').toLowerCase().includes(query);
      const carMatch = String(ride.carModel || '').toLowerCase().includes(query);
      const clientMatch = String(ride.clientName || '').toLowerCase().includes(query);
      if (!idMatch && !locMatch && !destMatch && !carMatch && !clientMatch) return false;
    }
    
    // 2. Duty Type filter
    if (selectedDutyType !== 'all' && ride.dutyType !== selectedDutyType) return false;
    
    // 3. Transmission filter
    if (selectedTransmission !== 'all' && ride.transmission !== selectedTransmission) return false;
    
    return true;
  });

  const sortedRides = [...filteredRides].sort((a, b) => {
    if (sortBy === 'newest') {
      return (Number(b.dbId) || 0) - (Number(a.dbId) || 0);
    } else if (sortBy === 'oldest') {
      return (Number(a.dbId) || 0) - (Number(b.dbId) || 0);
    } else if (sortBy === 'price-low') {
      const priceA = parseFloat(String(a.price || '').replace(/[^0-9.]/g, '')) || 0;
      const priceB = parseFloat(String(b.price || '').replace(/[^0-9.]/g, '')) || 0;
      return priceA - priceB;
    } else if (sortBy === 'price-high') {
      const priceA = parseFloat(String(a.price || '').replace(/[^0-9.]/g, '')) || 0;
      const priceB = parseFloat(String(b.price || '').replace(/[^0-9.]/g, '')) || 0;
      return priceB - priceA;
    }
    return 0;
  });

  const renderRideCard = (ride, isRequest = false) => {
    if (!ride) return null;
    const currentStatus = String(ride.status || (isRequest ? 'request' : 'upcoming')).toLowerCase();
    const displayId = ride.bookingRef || ride.id;
    const pickupDisplay = ride.location || ride.pickupLocation || 'Pickup location not specified';
    const dropDisplay = ride.destination || ride.dropoffLocation;

    return (
      <div key={ride.id || ride.bookingRef || Math.random()} className="booking-card">
        <div className="booking-header">
          <div className="booking-id-date">
            <span className="booking-id">{displayId}</span>
            <span className="booking-date"><CalendarIcon size={14} /> {ride.date || 'Today'}</span>
          </div>
          <div className={`status-badge status-${currentStatus}`}>
            {currentStatus.toUpperCase()}
          </div>
        </div>
        
        <div className="booking-route booking-route-details">
          <div className="route-point">
            <div className="point-icon origin"></div>
            <div className="route-info">
              <p className="booking-location-text">Pickup: {pickupDisplay}</p>
              {dropDisplay && <p className="booking-location-text">Drop: {dropDisplay}</p>}
              <p className="booking-trip-details">Trip: {ride.dutyType || 'Inside City'} • {ride.duration || '2.0 hrs'}</p>
            </div>
          </div>
        </div>
        
        <div className="booking-footer">
          <div className="booking-details-sm">
            <span><Car size={14} /> {ride.carModel} ({ride.transmission || 'Automatic'})</span>
            <span><User size={14} /> Client: {ride.clientName || 'Unassigned'}</span>
          </div>
          <div className="booking-price-action">
            <span className="price">{ride.price}</span>
            <div className="action-buttons-group" style={{ display: 'flex', gap: '8px' }}>
              {isRequest ? (
                <>
                  <button 
                    className="decline-booking-btn"
                    onClick={() => handleDecline(ride.dbId, ride.bookingRef || ride.id)}
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
                    onClick={() => handleAccept(ride.dbId, ride.bookingRef || ride.id)}
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
                  {currentStatus === 'upcoming' && (
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
                          onClick={() => handleStartTrip(ride.dbId, ride.bookingRef || ride.id, otpValue)}
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
                  {(currentStatus === 'started' || currentStatus === 'in_progress') && (
                    <button 
                      className="complete-booking-btn"
                      onClick={() => handleCompleteTrip(ride.dbId, ride.bookingRef || ride.id)}
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
  };

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
  // Bengaluru Hub Locations (Matches Client Booking Map)
  'indiranagar': [12.9716, 77.6412],
  'kempegowda': [13.1986, 77.7066],
  'airport': [13.1986, 77.7066],
  'whitefield': [12.9698, 77.7500],
  'koramangala': [12.9352, 77.6245],
  'mg road': [12.9756, 77.6066],
  'electronic city': [12.8458, 77.6658],
  'bengaluru': [12.9716, 77.5946],
  'bangalore': [12.9716, 77.5946],

  // Hyderabad Hub Locations
  'banjara hills': [17.4156, 78.4350],
  'hitech city': [17.4474, 78.3762],
  'gachibowli': [17.4401, 78.3489],
  'jubilee hills': [17.4319, 78.4073],
  'rgia airport': [17.2403, 78.4294],
  'shamshabad': [17.2403, 78.4294],
  'madhapur': [17.4483, 78.3915],
  'kondapur': [17.4699, 78.3578],
  'kukatpally': [17.4947, 78.3996],
  'secunderabad': [17.4399, 78.4983],
  'charminar': [17.3616, 78.4747],
  'vijayawada': [16.5062, 80.6480]
};

const getCoordinates = (address) => {
  if (!address) return [12.9716, 77.5946];
  const addrLower = String(address).toLowerCase();
  
  for (const [key, coords] of Object.entries(locationCoords)) {
    if (addrLower.includes(key)) {
      return coords;
    }
  }
  
  // Deterministic generator fallback near Bengaluru center
  let hash1 = 0;
  let hash2 = 0;
  for (let i = 0; i < address.length; i++) {
    hash1 = (hash1 * 31 + address.charCodeAt(i)) % 1000;
    hash2 = (hash2 * 17 + address.charCodeAt(i)) % 1000;
  }
  const latOffset = (hash1 - 500) / 10000;
  const lngOffset = (hash2 - 500) / 10000;
  
  return [12.9716 + latOffset, 77.5946 + lngOffset];
};

// Helper: Prioritizes exact GPS coordinates chosen on Client LocationMap
export const getTripCoords = (coords, fallbackAddress) => {
  if (coords) {
    if (Array.isArray(coords) && coords.length >= 2 && !isNaN(Number(coords[0])) && !isNaN(Number(coords[1]))) {
      return [Number(coords[0]), Number(coords[1])];
    }
    if (coords.lat !== undefined && coords.lng !== undefined && !isNaN(Number(coords.lat)) && !isNaN(Number(coords.lng))) {
      return [Number(coords.lat), Number(coords.lng)];
    }
  }
  return getCoordinates(fallbackAddress);
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
      style={{ width: '100%', height: '100%', minHeight: '450px', borderRadius: '16px', border: '1px solid var(--border-color)' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
  const origin = getTripCoords(trip.pickupCoords, trip.pickupLocation || trip.location);
  const destination = getTripCoords(trip.destCoords, trip.dropoffLocation || trip.destination);
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
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)' }}>Routing directions and client information for trip {trip.bookingRef || trip.id}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '32px', minHeight: '550px', alignItems: 'stretch' }} className="trip-details-grid">
        
        {/* Left Column: Details & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Client & Booking Summary */}
          <div className="booking-card" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifycontent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <span className="booking-id" style={{ fontSize: '18px' }}>{trip.bookingRef || trip.id}</span>
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
                    onClick={() => onStart(trip.dbId, trip.bookingRef || trip.id, otpInput)}
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

            {(trip.status === 'started' || trip.status === 'in_progress') && (
              <button 
                onClick={() => onComplete(trip.dbId, trip.bookingRef || trip.id)}
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
