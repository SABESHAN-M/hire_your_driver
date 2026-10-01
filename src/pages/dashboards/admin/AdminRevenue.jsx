import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  CheckCircle, 
  Percent, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  RefreshCw, 
  ShieldCheck, 
  DollarSign, 
  Calendar, 
  User, 
  Car,
  Filter,
  Check,
  FileText
} from 'lucide-react';
import './AdminPages.css';

const BASE_RESERVE = 25000.00; // Platform Operating Capital Float
const COMMISSION_PERCENT = 15; // Platform standard 15% fee

const AdminRevenue = () => {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  const defaultAdminBookings = [
    {
      id: 1,
      bookingRef: 'HYD-7102',
      booking_reference: 'HYD-7102',
      clientName: 'Rahul Sharma',
      client_name: 'Rahul Sharma',
      driver: 'Rajesh Kumar',
      driver_name: 'Rajesh Kumar',
      pickup_location: 'Indiranagar 100ft Road',
      dropoff_location: 'Kempegowda Int. Airport',
      tripPrice: 1000,
      trip_price: 1000,
      discountAmount: 150,
      discount_amount: 150,
      netFare: 850,
      estimated_fare: 850,
      driverShare: 722.50,
      driver_share: 722.50,
      companyRevenue: 127.50,
      company_revenue: 127.50,
      status: 'upcoming',
      date: new Date().toLocaleDateString()
    },
    {
      id: 2,
      bookingRef: 'HYD-6819',
      booking_reference: 'HYD-6819',
      clientName: 'Priya Patel',
      client_name: 'Priya Patel',
      driver: 'Rajesh Kumar',
      driver_name: 'Rajesh Kumar',
      pickup_location: 'MG Road Metro',
      dropoff_location: 'Electronic City Phase 1',
      tripPrice: 2500,
      trip_price: 2500,
      discountAmount: 1250,
      discount_amount: 1250,
      netFare: 1250,
      estimated_fare: 1250,
      driverShare: 1062.50,
      driver_share: 1062.50,
      companyRevenue: 187.50,
      company_revenue: 187.50,
      status: 'completed',
      date: new Date(Date.now() - 86400000).toLocaleDateString(),
      completed_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 3,
      bookingRef: 'HYD-5504',
      booking_reference: 'HYD-5504',
      clientName: 'Amit Verma',
      client_name: 'Amit Verma',
      driver: 'Suresh Verma',
      driver_name: 'Suresh Verma',
      pickup_location: 'Whitefield Main Road',
      dropoff_location: 'Koramangala 5th Block',
      tripPrice: 950,
      trip_price: 950,
      discountAmount: 0,
      discount_amount: 0,
      netFare: 950,
      estimated_fare: 950,
      driverShare: 807.50,
      driver_share: 807.50,
      companyRevenue: 142.50,
      company_revenue: 142.50,
      status: 'started',
      date: new Date().toLocaleDateString()
    }
  ];

  const loadAndReconcileRevenue = (showNotification = false) => {
    try {
      if (showNotification) setIsSyncing(true);

      // 1. Load active bookings from storage
      const rawBookings = localStorage.getItem('hyd_demo_bookings');
      let bookingsList = [];
      if (rawBookings) {
        try {
          const parsed = JSON.parse(rawBookings);
          if (Array.isArray(parsed) && parsed.length > 0) {
            bookingsList = parsed;
          }
        } catch (e) {
          console.error('Error parsing hyd_demo_bookings:', e);
        }
      }

      // If no bookings in storage, initialize with default admin bookings
      if (bookingsList.length === 0) {
        bookingsList = defaultAdminBookings;
      }

      // 2. Normalize every booking so numbers are uniform and accurate
      const normalizedBookings = bookingsList.map(b => {
        const netFare = Number(b.estimated_fare || b.fare || b.total_fare || (typeof b.price === 'string' ? b.price.replace(/[^0-9.]/g, '') : b.price) || 0);
        const tripPrice = Number(b.trip_price || b.original_price || (netFare + Number(b.discount_amount || 0)) || netFare);
        const discountAmount = Number(b.discount_amount || (tripPrice > netFare ? tripPrice - netFare : 0));
        const companyRevenue = Number(b.company_revenue || b.admin_commission || b.commission || (netFare * (COMMISSION_PERCENT / 100)));
        const driverShare = Number(b.driver_share || b.driver_earnings || (netFare - companyRevenue));

        return {
          id: b.id || b.dbId || Math.random(),
          bookingRef: b.booking_reference || b.bookingRef || `HYD-${b.id || 'TRIP'}`,
          clientName: b.client_name || b.clientName || 'Rahul Sharma',
          driverName: b.driver_name || b.driver || 'Rajesh Kumar',
          pickup: b.pickup_location || b.location || 'Pickup Location',
          dropoff: b.dropoff_location || b.destination || 'Dropoff Location',
          status: b.status || 'upcoming',
          netFare,
          tripPrice,
          discountAmount,
          companyRevenue,
          driverShare,
          date: b.completed_at || b.booking_date || b.date || new Date().toISOString()
        };
      });

      // 3. Compute Aggregates from active system state
      const completedTrips = normalizedBookings.filter(b => b.status === 'completed');
      const settledNetFare = completedTrips.reduce((acc, b) => acc + b.netFare, 0);
      const settledGrossPrice = completedTrips.reduce((acc, b) => acc + b.tripPrice, 0);
      const totalCommissionFromCompleted = completedTrips.reduce((acc, b) => acc + b.companyRevenue, 0);
      const totalDriverShareFromCompleted = completedTrips.reduce((acc, b) => acc + b.driverShare, 0);

      const allBookingsGross = normalizedBookings.reduce((acc, b) => acc + b.tripPrice, 0);
      const allBookingsNet = normalizedBookings.reduce((acc, b) => acc + b.netFare, 0);
      const allDiscounts = normalizedBookings.reduce((acc, b) => acc + b.discountAmount, 0);
      const totalPipelineCommission = normalizedBookings.reduce((acc, b) => acc + b.companyRevenue, 0);

      // 4. Build Reconciled Transactions Ledger
      // Base platform float/reserve and historical platform adjustments
      const baseTransactions = [
        {
          id: 'tx-reserve-01',
          transaction_type: 'credit',
          category: 'Capital Reserve',
          amount: BASE_RESERVE,
          description: 'Platform Initial Operating Capital & Liquidity Reserve',
          details: 'Initial corporate float injected into platform treasury',
          client: 'Platform Treasury',
          driver: 'System Float',
          created_at: '2026-09-01T08:00:00.000Z',
          status: 'Settled'
        },
        {
          id: 'tx-bonus-01',
          transaction_type: 'debit',
          category: 'Driver Incentive',
          amount: 500.00,
          description: 'Driver Weekly Performance Incentive Bonus Payout',
          details: 'Top Driver 5-Star Service Subsidy • Rajesh Kumar (Rating: 4.85★)',
          client: 'Platform Bonus Pool',
          driver: 'Rajesh Kumar',
          created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
          status: 'Settled'
        }
      ];

      // Automatically generate a 15% Platform Fee Credit for each completed booking
      const completedRideTransactions = completedTrips.map(b => ({
        id: `tx-comm-${b.bookingRef}`,
        booking_id: b.id,
        booking_ref: b.bookingRef,
        transaction_type: 'credit',
        category: 'Platform Commission (15%)',
        amount: b.companyRevenue,
        description: `Platform Fee (15%) - Booking #${b.bookingRef}`,
        details: `Trip Fare: ₹${b.netFare.toLocaleString('en-IN', { minimumFractionDigits: 2 })} • ${b.pickup} ➔ ${b.dropoff}`,
        client: b.clientName,
        driver: b.driverName,
        created_at: b.date,
        status: 'Settled'
      }));

      // Preserve any custom stored transactions while pruning outdated USD dummies
      let customTransactions = [];
      try {
        const storedAdmin = localStorage.getItem('hyd_demo_admin_revenue');
        if (storedAdmin) {
          const parsed = JSON.parse(storedAdmin);
          if (Array.isArray(parsed.transactions)) {
            customTransactions = parsed.transactions.filter(t => {
              // Ignore legacy hardcoded dummy entries
              if (t.id === 1 || t.id === 2 || t.id === 3) return false;
              if (t.id && (t.id.toString().startsWith('tx-comm-') || t.id === 'tx-reserve-01' || t.id === 'tx-bonus-01')) return false;
              if (t.description && t.description.includes('Platform Fee (15%) - Trip #')) {
                const match = t.description.match(/Trip #([A-Za-z0-9-_]+)/);
                if (match && completedRideTransactions.some(crt => crt.booking_ref === match[1])) {
                  return false;
                }
              }
              return true;
            });
          }
        }
      } catch (e) {}

      // Merge and sort chronological newest first
      const allTransactions = [...completedRideTransactions, ...customTransactions, ...baseTransactions].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );

      // 5. Admin Wallet Balance = Sum of Credits - Sum of Debits
      const reconciledBalance = allTransactions.reduce((acc, t) => 
        t.transaction_type === 'credit' ? acc + Number(t.amount) : acc - Number(t.amount)
      , 0);

      const reconciledData = {
        wallet: {
          balance: reconciledBalance,
          reserve: BASE_RESERVE,
          commissionsEarned: totalCommissionFromCompleted,
          currency: 'INR'
        },
        totalPlatformRevenue: settledNetFare, // Settled Net Fares from completed rides
        settledGrossVolume: settledGrossPrice, // Settled Gross Booking Volume
        pipelineGrossVolume: allBookingsGross, // All Bookings Gross Value
        pipelineNetVolume: allBookingsNet, // All Bookings Net Fares
        totalDiscounts: allDiscounts,
        totalDriverShare: totalDriverShareFromCompleted,
        totalPotentialCommission: totalPipelineCommission,
        completedTrips: completedTrips.length,
        totalTripsCount: normalizedBookings.length,
        commissionRate: COMMISSION_PERCENT,
        transactions: allTransactions
      };

      setData(reconciledData);

      // Save reconciled data back so AdminDashboard and other pages stay 100% in sync
      localStorage.setItem('hyd_demo_admin_revenue', JSON.stringify(reconciledData));

      if (showNotification) {
        setTimeout(() => {
          setIsSyncing(false);
          setSyncMessage('Ledger reconciled & synced with live bookings!');
          setTimeout(() => setSyncMessage(null), 3000);
        }, 400);
      }
    } catch (e) {
      console.error('Error loading admin revenue:', e);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadAndReconcileRevenue();
    const handleStorageChange = (e) => {
      if (e.key === 'hyd_demo_bookings' || e.key === 'hyd_demo_admin_revenue') {
        loadAndReconcileRevenue();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (!data) {
    return (
      <div className="admin-page">
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Reconciling live revenue & ledger...</p>
        </div>
      </div>
    );
  }

  const balance = Number(data.wallet?.balance || 0);
  const totalPlatform = Number(data.totalPlatformRevenue || 0);
  const totalCompletedTrips = data.completedTrips || 0;
  const totalTripsCount = data.totalTripsCount || 0;

  // Filter transactions
  const filteredTransactions = data.transactions.filter(tx => {
    const matchesType = typeFilter === 'all' || tx.transaction_type === typeFilter;
    const matchesSearch = 
      (tx.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (tx.details || '').toLowerCase().includes(search.toLowerCase()) ||
      (tx.client || '').toLowerCase().includes(search.toLowerCase()) ||
      (tx.driver || '').toLowerCase().includes(search.toLowerCase()) ||
      (tx.category || '').toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const totalCredits = data.transactions
    .filter(t => t.transaction_type === 'credit')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalDebits = data.transactions
    .filter(t => t.transaction_type === 'debit')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="admin-page">
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="admin-page-title">Revenue & Wallet</h1>
          <p className="admin-page-subtitle">Track platform 15% commissions, live wallet balance, and reconciled ledger</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {syncMessage && (
            <span style={{ fontSize: '13px', color: '#34c759', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <Check size={16} /> {syncMessage}
            </span>
          )}
          <button 
            className="admin-action-btn secondary"
            onClick={() => loadAndReconcileRevenue(true)}
            disabled={isSyncing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            title="Reconcile live bookings with wallet balance"
          >
            <RefreshCw size={15} className={isSyncing ? 'spin-anim' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync Ledger'}
          </button>
        </div>
      </div>

      {/* Revenue Cards */}
      <div className="admin-revenue-cards">
        <div className="admin-revenue-card admin-revenue-primary">
          <div className="admin-revenue-card-icon" style={{ background: 'linear-gradient(135deg, var(--accent-gold), #b5952f)' }}>
            <Wallet size={24} />
          </div>
          <div className="admin-revenue-card-info">
            <span className="admin-revenue-card-label">Admin Wallet Balance</span>
            <span className="admin-revenue-card-value">₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Reserve (₹25k) + Net 15% Fees
            </span>
          </div>
        </div>

        <div className="admin-revenue-card">
          <div className="admin-revenue-card-icon" style={{ background: 'linear-gradient(135deg, #30d158, #28a745)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="admin-revenue-card-info">
            <span className="admin-revenue-card-label">Total Platform Revenue</span>
            <span className="admin-revenue-card-value">₹{totalPlatform.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              From {totalCompletedTrips} settled {totalCompletedTrips === 1 ? 'trip' : 'trips'}
            </span>
          </div>
        </div>

        <div className="admin-revenue-card">
          <div className="admin-revenue-card-icon" style={{ background: 'linear-gradient(135deg, #5ac8fa, #007aff)' }}>
            <CheckCircle size={24} />
          </div>
          <div className="admin-revenue-card-info">
            <span className="admin-revenue-card-label">Completed Trips</span>
            <span className="admin-revenue-card-value">{totalCompletedTrips}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {totalTripsCount} total platform bookings
            </span>
          </div>
        </div>

        <div className="admin-revenue-card">
          <div className="admin-revenue-card-icon" style={{ background: 'linear-gradient(135deg, #bf5af2, #9945ff)' }}>
            <Percent size={24} />
          </div>
          <div className="admin-revenue-card-info">
            <span className="admin-revenue-card-label">Commission Rate</span>
            <span className="admin-revenue-card-value">{data.commissionRate || 15}%</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              15% Platform • 85% Driver
            </span>
          </div>
        </div>
      </div>

      {/* Financial Breakdown Reconciliation Strip */}
      <div className="admin-booking-stats-strip" style={{ marginTop: '20px' }}>
        <div className="booking-stat-box">
          <span className="stat-box-label">Pipeline Gross Volume</span>
          <span className="stat-box-val">₹{Number(data.pipelineGrossVolume || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="booking-stat-box">
          <span className="stat-box-label">Discounts Absorbed</span>
          <span className="stat-box-val text-red">-₹{Number(data.totalDiscounts || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="booking-stat-box">
          <span className="stat-box-label">Driver Earnings (85%)</span>
          <span className="stat-box-val text-green">₹{Number(data.totalDriverShare || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="booking-stat-box highlight">
          <span className="stat-box-label">Commissions Settled (15%)</span>
          <span className="stat-box-val text-gold">₹{Number(data.wallet?.commissionsEarned || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="admin-table-card" style={{ marginTop: '24px' }}>
        <div className="admin-card-header" style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--accent-gold)" />
            Transaction History & Reconciled Ledger
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Filter Tabs */}
            <div className="admin-filter-tabs" style={{ margin: 0 }}>
              <button 
                className={`admin-filter-tab ${typeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTypeFilter('all')}
              >
                All ({data.transactions.length})
              </button>
              <button 
                className={`admin-filter-tab ${typeFilter === 'credit' ? 'active' : ''}`}
                onClick={() => setTypeFilter('credit')}
              >
                Credits (+₹)
              </button>
              <button 
                className={`admin-filter-tab ${typeFilter === 'debit' ? 'active' : ''}`}
                onClick={() => setTypeFilter('debit')}
              >
                Debits (-₹)
              </button>
            </div>

            {/* Search Box */}
            <div className="admin-search-box" style={{ maxWidth: '240px', minWidth: '180px' }}>
              <Search size={15} />
              <input 
                type="text" 
                placeholder="Search transactions..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <table className="admin-data-table">
          <thead>
            <tr>
              <th style={{ width: '110px' }}>Type</th>
              <th>Transaction Details</th>
              <th style={{ width: '180px' }}>Category</th>
              <th style={{ width: '130px', textAlign: 'right' }}>Amount</th>
              <th style={{ width: '160px' }}>Date</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan="6" className="admin-table-empty">
                  {search ? 'No transactions match your search.' : 'No transactions recorded yet.'}
                </td>
              </tr>
            ) : (
              filteredTransactions.map(tx => (
                <tr key={tx.id}>
                  <td>
                    <span className="admin-tx-type" style={{
                      color: tx.transaction_type === 'credit' ? '#34c759' : '#ff453a',
                      background: tx.transaction_type === 'credit' ? 'rgba(52,199,89,0.1)' : 'rgba(255,69,58,0.1)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {tx.transaction_type === 'credit' ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                      {tx.transaction_type === 'credit' ? 'Credit' : 'Debit'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '13.5px' }}>
                      {tx.description}
                    </div>
                    {tx.details && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {tx.details}
                      </div>
                    )}
                    {(tx.client || tx.driver) && (
                      <div style={{ fontSize: '11px', color: 'var(--accent-gold)', marginTop: '2px' }}>
                        {tx.client && <span>Client: {tx.client}</span>}
                        {tx.client && tx.driver && <span> • </span>}
                        {tx.driver && <span>Driver: {tx.driver}</span>}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{
                      fontSize: '12px',
                      padding: '3px 8px',
                      borderRadius: '5px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'var(--text-muted)'
                    }}>
                      {tx.category || (tx.transaction_type === 'credit' ? 'Platform Fee' : 'Payout')}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, fontSize: '14px', textAlign: 'right', color: tx.transaction_type === 'credit' ? '#34c759' : '#ff453a' }}>
                    {tx.transaction_type === 'credit' ? '+' : '-'}₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="admin-table-muted" style={{ fontSize: '12.5px' }}>
                    {new Date(tx.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      color: '#34c759',
                      background: 'rgba(52,199,89,0.1)',
                      border: '1px solid rgba(52,199,89,0.2)',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      <ShieldCheck size={11} /> Settled
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderTop: '2px solid rgba(255,255,255,0.08)' }}>
              <td colSpan="3" style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--text-main)', fontSize: '13px' }}>
                Ledger Reconciliation Summary (Credits: +₹{totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | Debits: -₹{totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
              </td>
              <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 800, fontSize: '15px', color: 'var(--accent-gold)' }}>
                ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td colSpan="2" style={{ padding: '14px 20px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Reconciled Wallet Balance
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default AdminRevenue;
