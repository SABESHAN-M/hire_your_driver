import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, Plus, ArrowUpRight, ArrowDownLeft, ShieldCheck, Wallet as WalletIcon, Trash2, X, Star, ArrowRight, History, TrendingUp } from 'lucide-react';
import { useAlert } from '../../../context/AlertContext';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../config';
import './DriverWallet.css';

const DriverWallet = () => {
  const { showAlert } = useAlert();
  const { currentUser } = useAuth();
  
  const [wallet, setWallet] = useState(null);
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // Modals
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  
  const [payoutAmount, setPayoutAmount] = useState('');
  const [newCard, setNewCard] = useState({
    number: '',
    expiry: '',
    bankName: '',
    paypalEmail: '',
    paypalEmailConfirm: '',
    appleEmail: '',
    appleLinked: false,
    gpayPhone: '',
    gpayLinked: false
  });
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [payoutType, setPayoutType] = useState('bank');

  useEffect(() => {
    if (currentUser?.id) {
      fetchWalletData();
    }
  }, [currentUser]);

  useEffect(() => {
    if (isPayoutModalOpen && cards.length > 0) {
      setSelectedMethodId(cards[0].id.toString());
    }
  }, [isPayoutModalOpen, cards]);

  const fetchWalletData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/wallet/${currentUser.id}`);
      const data = await res.json();
      if (res.ok) {
        setWallet(data.wallet);
        setCards(data.cards);
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error('Error fetching wallet:', err);
    }
  };

  const handleCashout = async (e) => {
    e.preventDefault();
    if (!payoutAmount || isNaN(payoutAmount) || Number(payoutAmount) <= 0) {
      return showAlert("Please enter a valid payout amount", "error");
    }
    if (Number(payoutAmount) > (wallet ? wallet.balance : 0)) {
      return showAlert("Insufficient balance in your earnings wallet", "error");
    }
    if (cards.length === 0) {
      return showAlert("Please link a payout bank account or card first.", "error");
    }

    const selectedCard = cards.find(c => c.id.toString() === selectedMethodId) || cards[0];
    const methodName = selectedCard.card_last4 === 'Linked'
      ? selectedCard.card_brand
      : `${selectedCard.card_brand} (•••• ${selectedCard.card_last4})`;

    try {
      const res = await fetch(`${API_BASE_URL}/api/wallet/cashout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: currentUser.id, 
          amount: Number(payoutAmount)
        })
      });
      if (res.ok) {
        showAlert(`Successfully transferred $${payoutAmount} to your ${methodName}!`, "success");
        setPayoutAmount('');
        setIsPayoutModalOpen(false);
        fetchWalletData();
      } else {
        const err = await res.json();
        showAlert(err.error || "Failed to process cashout request", "error");
      }
    } catch (err) {
      showAlert("Failed to process payout", "error");
    }
  };

  const handleLinkPayout = async (e) => {
    e.preventDefault();
    
    let brand = '';
    let last4 = '';
    let expiryDate = 'N/A';
    let cardNumber = 'MOCK-PAYOUT';
    
    if (payoutType === 'bank') {
      if (!newCard.number || newCard.number.length < 8) {
        return showAlert("Invalid bank account number", "error");
      }
      brand = newCard.bankName || 'Standard Bank';
      last4 = newCard.number.slice(-4);
      expiryDate = newCard.expiry || 'N/A';
      cardNumber = newCard.number;
    } else if (payoutType === 'paypal') {
      if (!newCard.paypalEmail || !/\S+@\S+\.\S+/.test(newCard.paypalEmail)) {
        return showAlert("Please enter a valid PayPal email address", "error");
      }
      if (newCard.paypalEmail !== newCard.paypalEmailConfirm) {
        return showAlert("PayPal emails do not match", "error");
      }
      brand = 'PayPal';
      last4 = newCard.paypalEmail.length > 8 
        ? `${newCard.paypalEmail.substring(0, 3)}...${newCard.paypalEmail.slice(-4)}`
        : newCard.paypalEmail;
      cardNumber = newCard.paypalEmail;
    } else if (payoutType === 'applepay') {
      if (!newCard.appleEmail || !/\S+@\S+\.\S+/.test(newCard.appleEmail)) {
        return showAlert("Please enter a valid Apple ID email", "error");
      }
      brand = 'Apple Pay';
      last4 = newCard.appleEmail.length > 8 
        ? `${newCard.appleEmail.substring(0, 3)}...${newCard.appleEmail.slice(-4)}`
        : newCard.appleEmail;
      cardNumber = newCard.appleEmail;
    } else if (payoutType === 'gpay') {
      if (!newCard.gpayPhone || newCard.gpayPhone.length < 7) {
        return showAlert("Please enter a valid Google Pay linked phone number", "error");
      }
      brand = 'Google Pay';
      last4 = newCard.gpayPhone.slice(-4);
      cardNumber = newCard.gpayPhone;
    }
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/wallet/add-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: currentUser.id, 
          cardNumber: cardNumber, 
          expiryDate: expiryDate,
          cardBrand: brand,
          cardLast4: last4
        })
      });
      if (res.ok) {
        showAlert(`${brand} payout account linked successfully.`, "success");
        setNewCard({
          number: '',
          expiry: '',
          bankName: '',
          paypalEmail: '',
          paypalEmailConfirm: '',
          appleEmail: '',
          appleLinked: false,
          gpayPhone: '',
          gpayLinked: false
        });
        setIsAddCardModalOpen(false);
        fetchWalletData();
      }
    } catch (err) {
      showAlert("Failed to link payout account", "error");
    }
  };

  const renderCardIcon = (brand) => {
    const brandLower = brand.toLowerCase();
    if (brandLower.includes('paypal')) {
      return (
        <div className="card-icon" style={{ background: 'linear-gradient(135deg, #0070ba 0%, #1546a0 100%)', color: '#fff', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
          PayPal
        </div>
      );
    }
    if (brandLower.includes('apple')) {
      return (
        <div className="card-icon" style={{ background: 'linear-gradient(135deg, #111 0%, #000 100%)', color: '#fff', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
           Pay
        </div>
      );
    }
    if (brandLower.includes('google') || brandLower.includes('gpay')) {
      return (
        <div className="card-icon" style={{ background: 'linear-gradient(135deg, #fff 0%, #f5f5f5 100%)', border: '1px solid #ddd', color: '#000', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
          <span style={{ color: '#4285F4' }}>G</span>
          <span style={{ color: '#EA4335' }}>P</span>
          <span style={{ color: '#FBBC05' }}>a</span>
          <span style={{ color: '#34A853' }}>y</span>
        </div>
      );
    }
    return (
      <div className="card-icon" style={{ background: 'linear-gradient(135deg, #2b2b2b 0%, #111112 100%)', color: 'var(--accent-gold)', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
        BANK
      </div>
    );
  };

  const handleDeleteCard = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/api/wallet/card/${id}`, { method: 'DELETE' });
      showAlert("Account removed successfully.", "info");
      fetchWalletData();
    } catch (err) {
      showAlert("Error removing account", "error");
    }
  };

  // Calculations
  const rideEarnings = transactions
    .filter(t => t.transaction_type === 'credit' && !(t.description && t.description.toLowerCase().includes('bonus')))
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const bonusesEarned = transactions
    .filter(t => t.transaction_type === 'credit' && (t.description && t.description.toLowerCase().includes('bonus')))
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const lifetimeEarnings = rideEarnings + bonusesEarned;

  const completedTrips = transactions
    .filter(t => t.transaction_type === 'credit' && !(t.description && t.description.toLowerCase().includes('bonus')))
    .length;

  const commissionPaid = parseFloat((rideEarnings * (30/70)).toFixed(2));

  return (
    <div className="wallet-dashboard">
      <div className="wallet-header">
        <div className="wallet-header-icon">
          <TrendingUp size={28} />
        </div>
        <div>
          <h1>Driver Earnings & Payouts</h1>
          <p>Monitor your ride commissions, lifetime earnings, and request payouts.</p>
        </div>
      </div>

      <div className="wallet-premium-grid">
        {/* Left Column: Balance & Quick Actions */}
        <div className="wallet-left-col">
          
          <div className="digital-wallet-card" style={{ background: 'linear-gradient(135deg, #1b3a24 0%, #0c2012 100%)', border: '1px solid rgba(52, 199, 89, 0.2)' }}>
            <div className="card-top-row">
              <div>
                <div className="balance-label" style={{ color: '#88c999' }}>Available Balance</div>
                <div className="balance-amount" style={{ color: '#e8f7ec' }}>${wallet ? parseFloat(wallet.balance).toFixed(2) : '0.00'}</div>
              </div>
            </div>
            
            <div className="card-bottom-row">
              <div className="card-number-mock">
                {cards.length > 0
                  ? cards[0].card_brand.toLowerCase().includes('paypal')
                    ? `PayPal (${cards[0].card_last4})`
                    : cards[0].card_brand.toLowerCase().includes('apple')
                      ? `Apple Pay (${cards[0].card_last4})`
                      : cards[0].card_brand.toLowerCase().includes('google')
                        ? `Google Pay (•••• ${cards[0].card_last4})`
                        : `${cards[0].card_brand} (•••• ${cards[0].card_last4})`
                  : 'No Payout Account Connected'}
              </div>
              <div className="card-brand" style={{ color: 'var(--accent-gold)' }}>
                Earnings
              </div>
            </div>
          </div>

          <div className="quick-actions-grid">
            <div className="action-card" onClick={() => setIsPayoutModalOpen(true)}>
              <div className="action-icon" style={{ background: 'rgba(52, 199, 89, 0.1)', color: '#34c759' }}>
                <ArrowUpRight size={24} />
              </div>
              <div>
                <h3>Request Cashout</h3>
                <p>Withdraw earnings</p>
              </div>
            </div>

            <div className="action-card" onClick={() => setIsAddCardModalOpen(true)}>
              <div className="action-icon">
                <Plus size={24} />
              </div>
              <div>
                <h3>Link Account</h3>
                <p>Set up payout destination</p>
              </div>
            </div>
          </div>

          {/* Earnings Report */}
          <div className="wallet-section" style={{ marginTop: '24px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} /> Earnings Report
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'rgba(52, 199, 89, 0.06)', borderRadius: '12px', border: '1px solid rgba(52, 199, 89, 0.15)' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#34c759' }}>Ride Earnings (70%)</p>
                <h4 style={{ margin: '4px 0 0 0', fontSize: '20px', color: 'var(--text-main)' }}>${rideEarnings.toFixed(2)}</h4>
              </div>
              <div style={{ padding: '16px', background: 'rgba(212, 175, 55, 0.08)', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.15)' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Star size={14} fill="var(--accent-gold)" /> Bonuses Earned
                </p>
                <h4 style={{ margin: '4px 0 0 0', fontSize: '20px', color: 'var(--text-main)' }}>${bonusesEarned.toFixed(2)}</h4>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <div style={{ padding: '16px', background: 'var(--bg-darker)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Lifetime Earnings</p>
                <h4 style={{ margin: '4px 0 0 0', fontSize: '20px', color: 'var(--text-main)', fontWeight: '700' }}>${lifetimeEarnings.toFixed(2)}</h4>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255, 68, 68, 0.08)', borderRadius: '12px', border: '1px solid rgba(255, 68, 68, 0.15)' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#ff4444' }}>Admin Commission (30%)</p>
                <h4 style={{ margin: '4px 0 0 0', fontSize: '20px', color: 'var(--text-main)' }}>${commissionPaid.toFixed(2)}</h4>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginTop: '16px' }}>
              <div style={{ padding: '16px', background: 'var(--bg-darker)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Trips Completed</p>
                  <h4 style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: '700', color: 'var(--text-main)' }}>{completedTrips}</h4>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Payout Accounts</p>
                  <h4 style={{ margin: '4px 0 0 0', fontSize: '22px', fontWeight: '700', color: 'var(--text-main)', textAlign: 'right' }}>{cards.length}</h4>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Linked Bank Accounts & Weekly Trend Chart */}
        <div className="wallet-right-col">
          {/* Bank Accounts */}
          <div className="wallet-section">
            <div className="section-header">
              <h3><CreditCard size={20} /> Payout Accounts</h3>
            </div>
            
            <div className="saved-cards-list">
              {cards.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No payout accounts linked yet.</p>
              ) : (
                cards.map(card => (
                  <div className="saved-card-item" key={card.id}>
                    <div className="card-details">
                      {renderCardIcon(card.card_brand)}
                      <div className="card-info">
                        <h4>{card.card_brand}</h4>
                        <p style={{ margin: 0 }}>
                          {card.card_brand.toLowerCase().includes('paypal')
                            ? `Account ID: ${card.card_last4}`
                            : card.card_brand.toLowerCase().includes('apple')
                              ? `Linked Apple ID: ${card.card_last4}`
                              : card.card_brand.toLowerCase().includes('google')
                                ? `Linked Phone: •••• ${card.card_last4}`
                                : `Account ending in •••• ${card.card_last4}`
                          }
                        </p>
                      </div>
                    </div>
                    <button className="delete-card-btn" onClick={() => handleDeleteCard(card.id)} title="Remove Account">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
              
              <button className="wallet-btn-outline" onClick={() => setIsAddCardModalOpen(true)} style={{ marginTop: '8px' }}>
                <Plus size={18} /> Link Payout Destination
              </button>
            </div>
          </div>

          {/* Weekly Performance Visual (SVG Chart) */}
          <div className="wallet-section" style={{ marginTop: '24px' }}>
            <div className="section-header">
              <h3><Star size={20} color="var(--accent-gold)"/> Weekly Earnings Trend</h3>
            </div>
            <div style={{ height: '140px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '20px 10px 10px 10px', background: 'var(--bg-darker)', borderRadius: '12px', border: '1px solid var(--border-color)', position: 'relative' }}>
              
              {/* SVG Trend Line Graph */}
              <svg style={{ position: 'absolute', top: '15px', left: 0, width: '100%', height: '80px', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-gold)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="var(--accent-gold)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                
                {/* Area under curve */}
                <path 
                  d="M 20 70 L 20 50 Q 80 40 140 20 T 260 10 T 380 5 L 380 70 Z" 
                  fill="url(#chartGrad)" 
                  style={{ display: 'none' }} /* backup grid path */
                />
                
                {/* Visual Line */}
                <path 
                  d="M 15 65 C 60 55, 110 30, 160 38 C 210 45, 260 10, 310 15 C 360 20, 390 5, 410 2" 
                  fill="none" 
                  stroke="var(--accent-gold)" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                />
                
                {/* Point markers */}
                <circle cx="160" cy="38" r="5" fill="#fff" stroke="var(--accent-gold)" strokeWidth="2" />
                <circle cx="310" cy="15" r="5" fill="#fff" stroke="var(--accent-gold)" strokeWidth="2" />
                <circle cx="410" cy="2" r="5" fill="#fff" stroke="var(--accent-gold)" strokeWidth="2" />
              </svg>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Mon</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Tue</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Wed</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Thu</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Fri</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Sat</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Sun</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Section */}
      <div className="wallet-section" style={{ marginTop: '32px' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ margin: 0 }}><History size={20} /> Earnings & Cashouts Log</h3>
          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-darker)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button 
              type="button"
              onClick={() => setTransactionFilter('all')} 
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: transactionFilter === 'all' ? 'var(--accent-gold)' : 'transparent',
                color: transactionFilter === 'all' ? '#000' : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              All
            </button>
            <button 
              type="button"
              onClick={() => setTransactionFilter('credit')} 
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: transactionFilter === 'credit' ? 'var(--accent-gold)' : 'transparent',
                color: transactionFilter === 'credit' ? '#000' : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Earnings
            </button>
            <button 
              type="button"
              onClick={() => setTransactionFilter('debit')} 
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: transactionFilter === 'debit' ? 'var(--accent-gold)' : 'transparent',
                color: transactionFilter === 'debit' ? '#000' : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Payouts
            </button>
          </div>
        </div>
        
        {(() => {
          const filteredTransactions = transactions.filter(t => transactionFilter === 'all' ? true : t.transaction_type === transactionFilter);
          
          if (filteredTransactions.length === 0) {
            return (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>
                {transactionFilter === 'all' ? 'No recent transaction log entries.' : `No transactions matching "${transactionFilter === 'credit' ? 'Earnings' : 'Payouts'}" filter.`}
              </p>
            );
          }

          return (
            <div className="transactions-wrapper">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map(tx => {
                    const isBonus = tx.transaction_type === 'credit' && tx.description && tx.description.toLowerCase().includes('bonus');
                    return (
                      <tr key={tx.id}>
                        <td>{new Date(tx.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td>
                          <div className="tx-desc">
                            <div 
                              className={`tx-icon ${tx.transaction_type}`} 
                              style={{ 
                                background: isBonus 
                                  ? 'rgba(212, 175, 55, 0.15)' 
                                  : tx.transaction_type === 'credit' 
                                    ? 'rgba(52, 199, 89, 0.1)' 
                                    : 'rgba(255, 59, 48, 0.1)', 
                                color: isBonus 
                                  ? 'var(--accent-gold)' 
                                  : tx.transaction_type === 'credit' 
                                    ? '#34c759' 
                                    : '#ff3b30' 
                              }}
                            >
                              {isBonus ? (
                                <Star size={16} fill="var(--accent-gold)" />
                              ) : tx.transaction_type === 'credit' ? (
                                <ArrowDownLeft size={16} />
                              ) : (
                                <ArrowUpRight size={16} />
                              )}
                            </div>
                            {tx.description}
                          </div>
                        </td>
                        <td 
                          className={`transaction-amount ${tx.transaction_type}`} 
                          style={{ 
                            color: isBonus 
                              ? 'var(--accent-gold)' 
                              : tx.transaction_type === 'credit' 
                                ? '#34c759' 
                                : '#ff3b30', 
                            fontWeight: '700' 
                          }}
                        >
                          {tx.transaction_type === 'credit' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                        </td>
                        <td>
                          <span style={{ fontSize: '13px', textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                            {isBonus ? 'Bonus' : tx.transaction_type === 'credit' ? 'Earnings' : 'Cashout'}
                          </span>
                        </td>
                        <td>
                          <span className="status-badge" style={{ background: 'rgba(52, 199, 89, 0.1)', color: '#34c759' }}>Completed</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Payout Cashout Modal */}
      {isPayoutModalOpen && createPortal(
        <div className="safety-modal-overlay">
          <div className="safety-modal-content">
            <div className="safety-modal-header">
              <h2>Request Cashout</h2>
              <button className="close-modal-btn" onClick={() => setIsPayoutModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCashout}>
              <div className="safety-form-group">
                <label>Available Balance: ${wallet ? parseFloat(wallet.balance).toFixed(2) : '0.00'}</label>
                <div className="modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', margin: '12px 0' }}>
                  <button type="button" className={`amount-btn ${payoutAmount === '20' ? 'selected' : ''}`} onClick={() => setPayoutAmount('20')}>$20</button>
                  <button type="button" className={`amount-btn ${payoutAmount === '50' ? 'selected' : ''}`} onClick={() => setPayoutAmount('50')}>$50</button>
                  <button type="button" className={`amount-btn ${wallet ? Math.floor(wallet.balance).toString() : '100' ? 'selected' : ''}`} onClick={() => setPayoutAmount(wallet ? Math.floor(wallet.balance).toString() : '100')}>All Available</button>
                </div>
                <input 
                  type="number" 
                  className="safety-input" 
                  style={{ width: '100%' }}
                  placeholder="Or enter custom amount"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  max={wallet ? wallet.balance : 9999}
                  min="1"
                  step="0.01"
                  required
                />
              </div>

              {cards.length > 0 ? (
                <div className="safety-form-group" style={{ marginTop: '16px' }}>
                  <label>Select Bank / Payout Method</label>
                  <select
                    value={selectedMethodId}
                    onChange={(e) => setSelectedMethodId(e.target.value)}
                    className="safety-input"
                    style={{ width: '100%', padding: '10px', background: 'var(--bg-darker)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    {cards.map(card => (
                      <option key={card.id} value={card.id}>
                        {card.card_brand.toLowerCase().includes('paypal')
                          ? `PayPal (${card.card_last4})`
                          : card.card_brand.toLowerCase().includes('apple')
                            ? `Apple Pay (${card.card_last4})`
                            : card.card_brand.toLowerCase().includes('google')
                              ? `Google Pay (•••• ${card.card_last4})`
                              : `${card.card_brand} (•••• ${card.card_last4})`
                        }
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p style={{ color: '#ff4444', fontSize: '13px', margin: '14px 0' }}>You need to link a payout account before you can cash out.</p>
              )}

              <button type="submit" className="wallet-btn-primary" style={{ background: '#34c759', color: '#fff' }} disabled={cards.length === 0}>
                Confirm Payout Transfer
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add Bank Account Modal */}
      {isAddCardModalOpen && createPortal(
        <div className="safety-modal-overlay">
          <div className="safety-modal-content">
            <div className="safety-modal-header">
              <h2>Link Payout Destination</h2>
              <button className="close-modal-btn" onClick={() => setIsAddCardModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="payment-method-tabs">
              <button
                type="button"
                className={`method-tab ${payoutType === 'bank' ? 'active' : ''}`}
                onClick={() => setPayoutType('bank')}
              >
                Bank Transfer
              </button>
              <button
                type="button"
                className={`method-tab ${payoutType === 'paypal' ? 'active' : ''}`}
                onClick={() => setPayoutType('paypal')}
              >
                PayPal
              </button>
              <button
                type="button"
                className={`method-tab ${payoutType === 'applepay' ? 'active' : ''}`}
                onClick={() => setPayoutType('applepay')}
              >
                Apple Pay
              </button>
              <button
                type="button"
                className={`method-tab ${payoutType === 'gpay' ? 'active' : ''}`}
                onClick={() => setPayoutType('gpay')}
              >
                Google Pay
              </button>
            </div>

            <form onSubmit={handleLinkPayout}>
              {payoutType === 'bank' && (
                <>
                  <div className="safety-form-group">
                    <label>Bank Name / Card Brand</label>
                    <input 
                      type="text" 
                      className="safety-input" 
                      style={{ width: '100%' }}
                      placeholder="e.g. Chase Bank, Wells Fargo, Visa Debit"
                      value={newCard.bankName}
                      onChange={(e) => setNewCard({...newCard, bankName: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="safety-form-group">
                    <label>Account Number / Card Number</label>
                    <input 
                      type="text" 
                      className="safety-input" 
                      style={{ width: '100%' }}
                      placeholder="Enter Bank Account or Card Number"
                      value={newCard.number}
                      onChange={(e) => setNewCard({...newCard, number: e.target.value})}
                      maxLength="20"
                      required
                    />
                  </div>

                  <div className="safety-form-group">
                    <label>Routing Transit Number / Expiry (Optional)</label>
                    <input 
                      type="text" 
                      className="safety-input" 
                      style={{ width: '100%' }}
                      placeholder="MM/YY or Routing Code"
                      value={newCard.expiry}
                      onChange={(e) => setNewCard({...newCard, expiry: e.target.value})}
                    />
                  </div>

                  <button type="submit" className="wallet-btn-primary">Link Bank Account</button>
                </>
              )}

              {payoutType === 'paypal' && (
                <>
                  <div className="safety-form-group">
                    <label>PayPal Account Email</label>
                    <input 
                      type="email" 
                      className="safety-input" 
                      style={{ width: '100%' }}
                      placeholder="Enter your PayPal email address"
                      value={newCard.paypalEmail || ''}
                      onChange={(e) => setNewCard({...newCard, paypalEmail: e.target.value})}
                      required
                    />
                  </div>
                  <div className="safety-form-group">
                    <label>Confirm PayPal Email</label>
                    <input 
                      type="email" 
                      className="safety-input" 
                      style={{ width: '100%' }}
                      placeholder="Confirm your PayPal email address"
                      value={newCard.paypalEmailConfirm || ''}
                      onChange={(e) => setNewCard({...newCard, paypalEmailConfirm: e.target.value})}
                      required
                    />
                  </div>

                  <button type="submit" className="wallet-btn-primary" style={{ background: '#0070ba', color: '#fff' }}>Link PayPal Account</button>
                </>
              )}

              {payoutType === 'applepay' && (
                <div className="third-party-link-container">
                  <div className="third-party-icon" style={{ background: 'linear-gradient(135deg, #111 0%, #000 100%)', color: '#fff' }}>
                    
                  </div>
                  <h3> Apple Pay</h3>
                  <p>Link your Apple wallet account to allow direct transfers via Apple Pay network.</p>
                  
                  <div className="safety-form-group" style={{ width: '100%', textAlign: 'left', marginBottom: '16px' }}>
                    <label>Apple ID Email / Phone Number</label>
                    <input 
                      type="text" 
                      className="safety-input" 
                      style={{ width: '100%' }}
                      placeholder="e.g. driver@icloud.com"
                      value={newCard.appleEmail || ''}
                      onChange={(e) => setNewCard({...newCard, appleEmail: e.target.value})}
                      required
                    />
                  </div>

                  <button type="submit" className="wallet-btn-primary" style={{ background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
                    Link Apple Pay Account
                  </button>
                </div>
              )}

              {payoutType === 'gpay' && (
                <div className="third-party-link-container">
                  <div className="third-party-icon" style={{ background: '#ffffff', border: '1px solid #ddd', color: '#000' }}>
                    <span style={{ color: '#4285F4' }}>G</span>
                    <span style={{ color: '#EA4335' }}>P</span>
                  </div>
                  <h3>Google Pay</h3>
                  <p>Link your Google Account phone number to accept fast payouts via GPay network.</p>

                  <div className="safety-form-group" style={{ width: '100%', textAlign: 'left', marginBottom: '16px' }}>
                    <label>Linked Phone Number</label>
                    <input 
                      type="tel" 
                      className="safety-input" 
                      style={{ width: '100%' }}
                      placeholder="e.g. +1 555-0199"
                      value={newCard.gpayPhone || ''}
                      onChange={(e) => setNewCard({...newCard, gpayPhone: e.target.value})}
                      required
                    />
                  </div>

                  <button type="submit" className="wallet-btn-primary" style={{ background: '#4285F4', color: '#fff' }}>
                    Link Google Pay Account
                  </button>
                </div>
              )}
            </form>
            
            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginTop: '20px' }}>
              <ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: '6px', color: 'var(--accent-gold)' }}/>
              Linked details are securely managed.
            </p>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default DriverWallet;
