import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { UserCheck, UserX, Clock, CheckCircle, XCircle, Search, X, Shield, Car, Award } from 'lucide-react';
import { API_BASE_URL } from '../../../config';
import { useAlert } from '../../../context/AlertContext';
import './AdminPages.css';

const AdminDrivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [pendingDrivers, setPendingDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { showAlert } = useAlert();
  const location = useLocation();

  // Bonus states
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [bonusAmount, setBonusAmount] = useState('50');
  const [bonusMessage, setBonusMessage] = useState('');
  const [announceToAll, setAnnounceToAll] = useState(true);
  const [isSubmittingBonus, setIsSubmittingBonus] = useState(false);

  const fetchDrivers = async () => {
    try {
      const [allRes, pendingRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/drivers`),
        fetch(`${API_BASE_URL}/api/admin/drivers/pending`)
      ]);
      let loadedDrivers = [];
      if (allRes.ok) {
        loadedDrivers = await allRes.json();
        setDrivers(loadedDrivers);
      }
      if (pendingRes.ok) setPendingDrivers(await pendingRes.json());

      // Check query parameter for auto-review
      const queryParams = new URLSearchParams(location.search);
      const reviewId = queryParams.get('review');
      if (reviewId && loadedDrivers.length > 0) {
        const driverToReview = loadedDrivers.find(d => d.id === parseInt(reviewId));
        if (driverToReview) {
          setSelectedDriver(driverToReview);
          setFilter('pending');
        }
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchDrivers(); }, [location.search]);

  const handleApprove = async (id, name) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/drivers/${id}/approve`, { method: 'PATCH' });
      if (res.ok) {
        showAlert(`Driver ${name} approved successfully!`, 'success');
        setSelectedDriver(null);
        fetchDrivers();
      }
    } catch (err) { showAlert('Failed to approve driver.', 'error'); }
  };

  const handleReject = async (id, name) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/drivers/${id}/reject`, { method: 'PATCH' });
      if (res.ok) {
        showAlert(`Driver ${name} rejected.`, 'error');
        setSelectedDriver(null);
        fetchDrivers();
      }
    } catch (err) { showAlert('Failed to reject driver.', 'error'); }
  };

  const handleAwardBonus = async (e) => {
    e.preventDefault();
    if (!selectedDriver) return;
    
    const amount = parseFloat(bonusAmount);
    if (isNaN(amount) || amount <= 0) {
      return showAlert('Please enter a valid bonus amount', 'error');
    }
    
    setIsSubmittingBonus(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/drivers/${selectedDriver.id}/bonus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amount,
          message: bonusMessage,
          announceToAll: announceToAll
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        showAlert(data.message || 'Bonus awarded successfully!', 'success');
        setIsBonusModalOpen(false);
        setSelectedDriver(null);
        fetchDrivers();
      } else {
        showAlert(data.error || 'Failed to award bonus.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Network error awarding bonus.', 'error');
    } finally {
      setIsSubmittingBonus(false);
    }
  };

  const filteredDrivers = drivers.filter(d => {
    const matchesFilter = filter === 'all' || d.status === filter;
    const fullName = `${d.first_name} ${d.last_name || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(search.toLowerCase()) || 
                          (d.email || '').toLowerCase().includes(search.toLowerCase()) ||
                          d.phone_number.includes(search);
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status) => {
    const map = {
      active: { color: '#34c759', bg: 'rgba(52, 199, 89, 0.1)', label: 'Active' },
      pending: { color: '#ff9f0a', bg: 'rgba(255, 159, 10, 0.1)', label: 'Pending' },
      rejected: { color: '#ff453a', bg: 'rgba(255, 69, 58, 0.1)', label: 'Rejected' }
    };
    const s = map[status] || map.active;
    return <span className="admin-table-badge" style={{ color: s.color, background: s.bg }}>{s.label}</span>;
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Driver Management</h1>
          <p className="admin-page-subtitle">{drivers.length} total drivers • {pendingDrivers.length} pending approval</p>
        </div>
      </div>

      {/* Pending Alert Banner */}
      {pendingDrivers.length > 0 && (
        <div className="admin-alert-banner">
          <Shield size={18} />
          <span><strong>{pendingDrivers.length}</strong> driver(s) awaiting profile & document verification</span>
          <button className="admin-alert-action" onClick={() => setFilter('pending')}>Review Now</button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="admin-toolbar">
        <div className="admin-filter-tabs">
          {[
            { key: 'all', label: `All (${drivers.length})` },
            { key: 'active', label: `Active (${drivers.filter(d => d.status === 'active').length})` },
            { key: 'pending', label: `Pending (${drivers.filter(d => d.status === 'pending').length})` },
            { key: 'rejected', label: `Rejected (${drivers.filter(d => d.status === 'rejected').length})` }
          ].map(tab => (
            <button
              key={tab.key}
              className={`admin-filter-tab ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="admin-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search drivers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Drivers Table */}
      <div className="admin-table-card">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>Driver</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Duty</th>
              <th>Completed Trips</th>
              <th>Earnings</th>
              <th>Joined</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrivers.length === 0 ? (
              <tr>
                <td colSpan="8" className="admin-table-empty">No drivers match your filter.</td>
              </tr>
            ) : (
              filteredDrivers.map(d => (
                <tr key={d.id}>
                  <td>
                    <div className="admin-table-user">
                      <div className="admin-table-avatar">{d.first_name.charAt(0)}</div>
                      <div>
                        <span className="admin-table-name">
                          {d.first_name} {d.last_name || ''}
                          {d.total_trips >= 5 && (
                            <span 
                              style={{ 
                                color: '#d4af37', 
                                background: 'rgba(212, 175, 55, 0.1)', 
                                marginLeft: '8px', 
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: '700',
                                border: '1px solid rgba(212, 175, 55, 0.2)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              ★ Outstanding
                            </span>
                          )}
                        </span>
                        <span className="admin-table-email">{d.email || '—'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="admin-table-muted">{d.phone_number}</td>
                  <td>{getStatusBadge(d.status)}</td>
                  <td>
                    <span className={`admin-duty-indicator ${d.is_on_duty ? 'on' : 'off'}`}>
                      {d.is_on_duty ? 'On Duty' : 'Off Duty'}
                    </span>
                  </td>
                  <td className="admin-table-center">{d.total_trips}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: 'var(--accent-gold)', fontWeight: '600' }}>
                        ${parseFloat(d.total_earnings || 0).toFixed(2)}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Bal: ${parseFloat(d.wallet_balance || 0).toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td className="admin-table-muted">{new Date(d.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td>
                    {d.status === 'pending' ? (
                      <button className="admin-btn-approve-sm" onClick={() => setSelectedDriver(d)}>
                        <Shield size={14} /> Review Profile
                      </button>
                    ) : (
                      <button className="admin-btn-view" onClick={() => setSelectedDriver(d)}>View</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Driver Detail Modal */}
      {selectedDriver && (
        <>
          <div className="admin-modal-backdrop" onClick={() => setSelectedDriver(null)} />
          <div className="admin-modal admin-modal-lg">
            <button className="admin-modal-close" onClick={() => setSelectedDriver(null)}><X size={20} /></button>
            <h2 className="admin-modal-title">
              {selectedDriver.status === 'pending' ? 'Verify Driver Application' : 'Driver Profile'}
            </h2>
            
            <div className="admin-modal-profile-header">
              {selectedDriver.profile_photo ? (
                <img 
                  src={selectedDriver.profile_photo} 
                  alt="Profile" 
                  className="admin-modal-profile-img" 
                />
              ) : (
                <div className="admin-modal-avatar-lg">{selectedDriver.first_name.charAt(0)}</div>
              )}
              <div className="admin-modal-profile-info">
                <h3 className="admin-modal-profile-name">{selectedDriver.first_name} {selectedDriver.last_name || ''}</h3>
                <span className="admin-modal-profile-role">Registered Driver</span>
              </div>
            </div>

            <div className="admin-modal-body">
              <div className="admin-modal-field">
                <span className="admin-modal-label">Email Address</span>
                <span className="admin-modal-value">{selectedDriver.email || '—'}</span>
              </div>
              <div className="admin-modal-field">
                <span className="admin-modal-label">Phone Number</span>
                <span className="admin-modal-value">{selectedDriver.phone_number}</span>
              </div>
              <div className="admin-modal-field">
                <span className="admin-modal-label">License Number</span>
                <span className="admin-modal-value" style={{ fontFamily: 'monospace', fontSize: '14px', letterSpacing: '0.5px' }}>
                  {selectedDriver.license_no || 'Not Provided'}
                </span>
              </div>
              
              <div className="admin-modal-field">
                <span className="admin-modal-label">Application Status</span>
                <span className="admin-modal-value">{getStatusBadge(selectedDriver.status)}</span>
              </div>
              <div className="admin-modal-field">
                <span className="admin-modal-label">Registration Date</span>
                <span className="admin-modal-value">{new Date(selectedDriver.created_at).toLocaleDateString([], { dateStyle: 'medium' })}</span>
              </div>

              {/* Document Images Grid */}
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Uploaded Verification Documents</h4>
                <div className="admin-doc-grid">
                  <div className="admin-doc-card">
                    <span className="admin-doc-label">License Front</span>
                    <div className="admin-doc-img-wrapper">
                      {selectedDriver.license_front ? (
                        <img src={selectedDriver.license_front} alt="License Front" className="admin-doc-img" onClick={() => window.open(selectedDriver.license_front, '_blank')} />
                      ) : (
                        <div className="admin-doc-empty">Not Uploaded</div>
                      )}
                    </div>
                  </div>
                  <div className="admin-doc-card">
                    <span className="admin-doc-label">License Back</span>
                    <div className="admin-doc-img-wrapper">
                      {selectedDriver.license_back ? (
                        <img src={selectedDriver.license_back} alt="License Back" className="admin-doc-img" onClick={() => window.open(selectedDriver.license_back, '_blank')} />
                      ) : (
                        <div className="admin-doc-empty">Not Uploaded</div>
                      )}
                    </div>
                  </div>
                  <div className="admin-doc-card">
                    <span className="admin-doc-label">Aadhaar Front</span>
                    <div className="admin-doc-img-wrapper">
                      {selectedDriver.aadhaar_front ? (
                        <img src={selectedDriver.aadhaar_front} alt="Aadhaar Front" className="admin-doc-img" onClick={() => window.open(selectedDriver.aadhaar_front, '_blank')} />
                      ) : (
                        <div className="admin-doc-empty">Not Uploaded</div>
                      )}
                    </div>
                  </div>
                  <div className="admin-doc-card">
                    <span className="admin-doc-label">Aadhaar Back</span>
                    <div className="admin-doc-img-wrapper">
                      {selectedDriver.aadhaar_back ? (
                        <img src={selectedDriver.aadhaar_back} alt="Aadhaar Back" className="admin-doc-img" onClick={() => window.open(selectedDriver.aadhaar_back, '_blank')} />
                      ) : (
                        <div className="admin-doc-empty">Not Uploaded</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Pending Drivers */}
              {selectedDriver.status === 'pending' && (
                <div className="admin-modal-actions">
                  <button 
                    className="admin-modal-btn-reject" 
                    onClick={() => handleReject(selectedDriver.id, selectedDriver.first_name)}
                  >
                    <XCircle size={16} /> Reject Profile
                  </button>
                  <button 
                    className="admin-modal-btn-approve" 
                    onClick={() => handleApprove(selectedDriver.id, selectedDriver.first_name)}
                  >
                    <CheckCircle size={16} /> Approve & Verify
                  </button>
                </div>
              )}

              {/* Action Buttons for Active Drivers */}
              {selectedDriver.status === 'active' && (
                <div className="admin-modal-actions">
                  <button 
                    className="admin-modal-btn-approve" 
                    onClick={() => {
                      setIsBonusModalOpen(true);
                      setBonusAmount('50');
                      setBonusMessage('');
                      setAnnounceToAll(true);
                    }}
                  >
                    <Award size={16} /> Award Performance Bonus
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Bonus Award Modal */}
      {isBonusModalOpen && selectedDriver && (
        <>
          <div className="admin-modal-backdrop" style={{ zIndex: 1020 }} onClick={() => setIsBonusModalOpen(false)} />
          <div className="admin-modal" style={{ zIndex: 1021, width: '450px' }}>
            <button className="admin-modal-close" onClick={() => setIsBonusModalOpen(false)}><X size={20} /></button>
            <h2 className="admin-modal-title">Award Performance Bonus</h2>
            
            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
                Awarding bonus to: <strong style={{ color: 'var(--text-main)' }}>{selectedDriver.first_name} {selectedDriver.last_name || ''}</strong>
              </p>
              {selectedDriver.total_trips >= 5 && (
                <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#d4af37', fontWeight: '600' }}>
                  ★ Outstanding Driver (Completed {selectedDriver.total_trips} rides)
                </p>
              )}
            </div>

            <form onSubmit={handleAwardBonus} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Bonus Amount ($)</label>
                <input 
                  type="number" 
                  min="1" 
                  step="0.01"
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '10px',
                    color: 'var(--text-main)',
                    fontSize: '15px'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>Announcement Message</label>
                <textarea 
                  rows="3"
                  value={bonusMessage}
                  onChange={(e) => setBonusMessage(e.target.value)}
                  placeholder={`Congratulations to Driver ${selectedDriver.first_name} ${selectedDriver.last_name || ''} for outstanding performance! A performance bonus has been awarded to their wallet. Keep up the great work!`}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '10px',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input 
                  type="checkbox" 
                  id="announceToAll"
                  checked={announceToAll}
                  onChange={(e) => setAnnounceToAll(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="announceToAll" style={{ fontSize: '13px', color: 'var(--text-main)', cursor: 'pointer', fontWeight: '500' }}>
                  Broadcast announcement to all drivers
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button 
                  type="button" 
                  className="admin-btn-view" 
                  onClick={() => setIsBonusModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="admin-modal-btn-approve"
                  disabled={isSubmittingBonus}
                >
                  {isSubmittingBonus ? 'Awarding...' : 'Confirm Bonus'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDrivers;
