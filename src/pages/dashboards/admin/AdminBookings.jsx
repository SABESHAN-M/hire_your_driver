import React, { useState, useEffect } from 'react';
import { Car, Search, MapPin, Clock, CheckCircle, XCircle, Activity } from 'lucide-react';
import { API_BASE_URL } from '../../../config';
import './AdminPages.css';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/bookings`);
        if (res.ok) setBookings(await res.json());
      } catch (err) { console.error(err); }
    };
    fetchBookings();
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

  const getStatusBadge = (status) => {
    const map = {
      upcoming: { color: '#5ac8fa', bg: 'rgba(90, 200, 250, 0.1)', icon: <Clock size={12} /> },
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
    upcoming: bookings.filter(b => b.status === 'upcoming').length,
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
            placeholder="Search bookings..."
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
              <th>Price</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="admin-table-empty">No bookings match your filter.</td>
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
                  <td className="admin-table-price">{b.price}</td>
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
