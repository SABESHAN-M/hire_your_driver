import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, CreditCard, ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import { API_BASE_URL } from '../../../config';
import './AdminPages.css';

const AdminRevenue = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/revenue`);
        if (res.ok) setData(await res.json());
      } catch (err) { console.error(err); }
    };
    fetchRevenue();
  }, []);

  if (!data) {
    return (
      <div className="admin-page">
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Loading revenue data...</p>
        </div>
      </div>
    );
  }

  const balance = Number(data.wallet?.balance || 0);
  const totalPlatform = Number(data.totalPlatformRevenue || 0);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Revenue & Wallet</h1>
          <p className="admin-page-subtitle">Track platform commissions and transaction history</p>
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
            <span className="admin-revenue-card-value">${balance.toFixed(2)}</span>
          </div>
        </div>

        <div className="admin-revenue-card">
          <div className="admin-revenue-card-icon" style={{ background: 'linear-gradient(135deg, #30d158, #28a745)' }}>
            <TrendingUp size={24} />
          </div>
          <div className="admin-revenue-card-info">
            <span className="admin-revenue-card-label">Total Platform Revenue</span>
            <span className="admin-revenue-card-value">${totalPlatform.toFixed(2)}</span>
          </div>
        </div>

        <div className="admin-revenue-card">
          <div className="admin-revenue-card-icon" style={{ background: 'linear-gradient(135deg, #5ac8fa, #007aff)' }}>
            <CreditCard size={24} />
          </div>
          <div className="admin-revenue-card-info">
            <span className="admin-revenue-card-label">Completed Trips</span>
            <span className="admin-revenue-card-value">{data.completedTrips}</span>
          </div>
        </div>

        <div className="admin-revenue-card">
          <div className="admin-revenue-card-icon" style={{ background: 'linear-gradient(135deg, #bf5af2, #9945ff)' }}>
            <DollarSign size={24} />
          </div>
          <div className="admin-revenue-card-info">
            <span className="admin-revenue-card-label">Commission Rate</span>
            <span className="admin-revenue-card-value">{data.commissionRate || 30}%</span>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="admin-table-card" style={{ marginTop: '24px' }}>
        <div className="admin-card-header" style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={18} color="var(--accent-gold)" />
            Transaction History
          </h3>
        </div>
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {data.transactions.length === 0 ? (
              <tr>
                <td colSpan="4" className="admin-table-empty">No transactions yet. Revenue will appear here once bookings are completed.</td>
              </tr>
            ) : (
              data.transactions.map(tx => (
                <tr key={tx.id}>
                  <td>
                    <span className="admin-tx-type" style={{
                      color: tx.transaction_type === 'credit' ? '#34c759' : '#ff453a',
                      background: tx.transaction_type === 'credit' ? 'rgba(52,199,89,0.1)' : 'rgba(255,69,58,0.1)',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {tx.transaction_type === 'credit' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                      {tx.transaction_type === 'credit' ? 'Credit' : 'Debit'}
                    </span>
                  </td>
                  <td className="admin-table-muted" style={{ fontSize: '13px' }}>{tx.description}</td>
                  <td style={{ fontWeight: 700, color: tx.transaction_type === 'credit' ? '#34c759' : '#ff453a' }}>
                    {tx.transaction_type === 'credit' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                  </td>
                  <td className="admin-table-muted">
                    {new Date(tx.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminRevenue;
