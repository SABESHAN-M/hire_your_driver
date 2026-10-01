import React, { useState, useEffect } from 'react';
import { Car, Search, MapPin, Clock, CheckCircle, XCircle, Activity, Ticket, TrendingUp, DollarSign, ShieldCheck } from 'lucide-react';
import './AdminPages.css';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const defaultAdminBookings = [
    {
      id: 1,
      bookingRef: 'HYD-7102',
      clientName: 'Rahul Sharma',
      clientPhone: '+91 98765 11001',
      driver: 'Rajesh Kumar',
      location: 'Indiranagar 100ft Road',
      destination: 'Kempegowda Int. Airport',
      tripPrice: 1000,
      discountAmount: 150,
      discountPercent: 15,
      promoCode: 'WELCOME15',
      netFare: 850,
      driverShare: 722.50,
      companyRevenue: 127.50,
      status: 'upcoming',
      date: new Date().toLocaleDateString()
    },
    {
      id: 2,
      bookingRef: 'HYD-6819',
      clientName: 'Priya Patel',
      clientPhone: '+91 98765 22002',
      driver: 'Rajesh Kumar',
      location: 'MG Road Metro',
      destination: 'Electronic City Phase 1',
      tripPrice: 2500,
      discountAmount: 1250,
      discountPercent: 50,
      promoCode: 'HYD50',
      netFare: 1250,
      driverShare: 1062.50,
      companyRevenue: 187.50,
      status: 'completed',
      date: new Date(Date.now() - 86400000).toLocaleDateString()
    },
    {
      id: 3,
      bookingRef: 'HYD-5504',
      clientName: 'Amit Verma',
      clientPhone: '+91 98765 33003',
      driver: 'Suresh Verma',
      location: 'Whitefield Main Road',
      destination: 'Koramangala 5th Block',
      tripPrice: 950,
      discountAmount: 0,
      discountPercent: 0,
      promoCode: null,
      netFare: 950,
      driverShare: 807.50,
      companyRevenue: 142.50,
      status: 'started',
      date: new Date().toLocaleDateString()
    }
  ];

  const loadAdminBookings = () => {
    try {
      const stored = localStorage.getItem('hyd_demo_bookings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const formatted = parsed.map(b => {
            const netFare = Number(b.estimated_fare || b.fare || (typeof b.price === 'string' ? b.price.replace(/[^0-9.]/g, '') : b.price) || 750);
            
            let tripPrice = Number(b.trip_price || b.original_price || 0);
            let discountAmount = Number(b.discount_amount || 0);
            let discountPercent = Number(b.discount_percent || 0);
            const promoCode = b.promo_code || null;

            if (tripPrice > 0 && discountAmount > 0) {
              // already has explicit tripPrice and discount
            } else if (tripPrice > netFare) {
              discountAmount = parseFloat((tripPrice - netFare).toFixed(2));
              discountPercent = Math.round((discountAmount / tripPrice) * 100);
            } else if (discountPercent > 0) {
              tripPrice = parseFloat((netFare / ((100 - discountPercent) / 100)).toFixed(2));
              discountAmount = parseFloat((tripPrice - netFare).toFixed(2));
            } else if (promoCode) {
              discountPercent = 20;
              tripPrice = parseFloat((netFare / 0.8).toFixed(2));
              discountAmount = parseFloat((tripPrice - netFare).toFixed(2));
            } else {
              tripPrice = netFare;
              discountAmount = 0;
            }

            const driverShare = Number(b.driver_share || (netFare * 0.85));
            const companyRevenue = Number(b.company_revenue || b.commission || (netFare * 0.15));

            return {
              id: b.id,
              bookingRef: b.booking_reference || b.bookingRef || `HYD-${b.id}`,
              clientName: b.client_name || b.clientName || 'Rahul Sharma',
              clientPhone: b.client_phone || b.clientPhone || '+91 98765 00000',
              driver: b.driver_name || b.driver || (b.status === 'unassigned' ? 'Waiting for Driver' : 'Rajesh Kumar'),
              location: b.pickup_location || b.location || 'Bengaluru Center',
              destination: b.dropoff_location || b.destination || 'Airport / Outstation',
              tripPrice: tripPrice,
              discountAmount: discountAmount,
              discountPercent: discountPercent,
              promoCode: promoCode,
              netFare: netFare,
              driverShare: driverShare,
              companyRevenue: companyRevenue,
              status: b.status || 'upcoming',
              date: b.booking_date ? new Date(b.booking_date).toLocaleDateString() : (b.date || new Date().toLocaleDateString())
            };
          });
          setBookings(formatted);
          return;
        }
      }
    } catch (e) {}
    setBookings(defaultAdminBookings);
  };

  useEffect(() => {
    loadAdminBookings();
    window.addEventListener('storage', loadAdminBookings);
    return () => window.removeEventListener('storage', loadAdminBookings);
  }, []);

  const filtered = bookings.filter(b => {
    const matchesFilter = filter === 'all' || b.status === filter;
    const matchesSearch = b.bookingRef.toLowerCase().includes(search.toLowerCase()) ||
                          b.clientName.toLowerCase().includes(search.toLowerCase()) ||
                          b.location.toLowerCase().includes(search.toLowerCase()) ||
                          b.destination.toLowerCase().includes(search.toLowerCase()) ||
                          b.driver.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const financialTotals = filtered.reduce((acc, b) => {
    acc.gross += Number(b.tripPrice) || 0;
    acc.discount += Number(b.discountAmount) || 0;
    acc.driverShare += Number(b.driverShare) || 0;
    acc.companyRevenue += Number(b.companyRevenue) || 0;
    return acc;
  }, { gross: 0, discount: 0, driverShare: 0, companyRevenue: 0 });

  const getStatusBadge = (status) => {
    const map = {
      upcoming: { color: '#5ac8fa', bg: 'rgba(90, 200, 250, 0.1)', icon: <Clock size={12} /> },
      unassigned: { color: '#5ac8fa', bg: 'rgba(90, 200, 250, 0.1)', icon: <Clock size={12} /> },
      started: { color: '#ff9f0a', bg: 'rgba(255, 159, 10, 0.1)', icon: <Activity size={12} /> },
      completed: { color: '#34c759', bg: 'rgba(52, 199, 89, 0.1)', icon: <CheckCircle size={12} /> },
      cancelled: { color: '#ff453a', bg: 'rgba(255, 69, 58, 0.1)', icon: <XCircle size={12} /> }
    };
    const s = map[status] || map.upcoming;
    return (
      <span className="admin-table-badge" style={{ color: s.color, background: s.bg, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {s.icon} {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const counts = {
    all: bookings.length,
    upcoming: bookings.filter(b => b.status === 'upcoming' || b.status === 'unassigned').length,
    started: bookings.filter(b => b.status === 'started').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">All Bookings</h1>
          <p className="admin-page-subtitle">{bookings.length} total bookings across the platform</p>
        </div>
      </div>

      {/* Financial Breakdown KPI Summary Strip */}
      <div className="admin-booking-stats-strip">
        <div className="booking-stat-box">
          <span className="stat-box-label">Total Trip Price (Gross)</span>
          <span className="stat-box-val">₹{financialTotals.gross.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="booking-stat-box">
          <span className="stat-box-label">Total Discounts Given</span>
          <span className="stat-box-val text-red">-₹{financialTotals.discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="booking-stat-box">
          <span className="stat-box-label">Driver Share (85% Net)</span>
          <span className="stat-box-val text-green">₹{financialTotals.driverShare.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="booking-stat-box highlight">
          <span className="stat-box-label">Company Revenue (15% Net)</span>
          <span className="stat-box-val text-gold">₹{financialTotals.companyRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-filter-tabs">
          {['all', 'upcoming', 'started', 'completed', 'cancelled'].map(key => (
            <button
              key={key}
              className={`admin-filter-tab ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)} ({counts[key]})
            </button>
          ))}
        </div>
        <div className="admin-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search bookings by ref, client, driver, route..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-table-card">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Client</th>
              <th>Route</th>
              <th>Driver</th>
              <th>Status</th>
              <th>Trip Price</th>
              <th>Discount</th>
              <th>Driver Share (85%)</th>
              <th>Company Revenue (15%)</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="10" className="admin-table-empty">No bookings match your filter.</td>
              </tr>
            ) : (
              filtered.map(b => (
                <tr key={b.id}>
                  <td>
                    <span className="admin-ref-badge">{b.bookingRef}</span>
                  </td>
                  <td>
                    <div className="admin-table-user-sm">
                      <span className="admin-table-name">{b.clientName}</span>
                      <span className="admin-table-email">{b.clientPhone}</span>
                    </div>
                  </td>
                  <td>
                    <div className="admin-route-cell">
                      <span>{b.location}</span>
                      <span className="admin-route-arrow-sm">→</span>
                      <span>{b.destination}</span>
                    </div>
                  </td>
                  <td className={b.driver === 'Waiting for Driver' ? 'admin-table-muted' : ''}>
                    {b.driver}
                  </td>
                  <td>{getStatusBadge(b.status)}</td>
                  
                  {/* 1. Trip Price (Gross Fare) */}
                  <td className="admin-fin-cell admin-fin-price">
                    ₹{b.tripPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* 2. Discount */}
                  <td className="admin-fin-cell">
                    {b.discountAmount > 0 ? (
                      <div className="admin-fin-discount">
                        <span>-₹{b.discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({b.discountPercent}%)</span>
                        {b.promoCode && (
                          <span className="admin-promo-tag">
                            <Ticket size={9} /> {b.promoCode}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="admin-table-muted">—</span>
                    )}
                  </td>

                  {/* 3. Driver Share (85%) */}
                  <td className="admin-fin-cell admin-fin-driver">
                    ₹{b.driverShare.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* 4. Company Revenue (15%) */}
                  <td className="admin-fin-cell admin-fin-revenue">
                    ₹{b.companyRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  <td className="admin-table-muted">{b.date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminBookings;
