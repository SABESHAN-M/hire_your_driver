import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, Plus, ArrowUpRight, ArrowDownLeft, ShieldCheck, Wallet as WalletIcon, Trash2, X, Star, ArrowRight, History, TrendingUp } from 'lucide-react';
import { useAlert } from '../../../context/AlertContext';
import { useAuth } from '../../../context/AuthContext';
import './DriverWallet.css';

const DriverWallet = () => {
  const { showAlert } = useAlert();
  const { currentUser, openLogin } = useAuth();
  
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

  const driverId = currentUser?.id || 3;
  const storageKey = `hyd_driver_wallet_data_${driverId}`;

  const existingGPay = cards.find(c => {
    const b = (c.card_brand || '').toLowerCase();
    return b.includes('google') || b.includes('gpay');
  });
  const existingApple = cards.find(c => (c.card_brand || '').toLowerCase().includes('apple'));
  const existingPayPal = cards.find(c => (c.card_brand || '').toLowerCase().includes('paypal'));

  const defaultInitialWallet = {
    wallet: { id: driverId, user_id: driverId, balance: 15400, currency: 'USD' },
    cards: [
      { id: 1, user_id: driverId, card_brand: 'HDFC Bank', card_last4: '4821', expiry_date: 'N/A' },
      { id: 2, user_id: driverId, card_brand: 'Google Pay', card_last4: '9876', expiry_date: 'N/A' }
    ],
    transactions: [
      { id: 101, user_id: driverId, amount: 850, transaction_type: 'credit', description: 'Trip Fare - Booking #HYD-8492', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
      { id: 102, user_id: driverId, amount: 1200, transaction_type: 'credit', description: 'Outstation Duty - Booking #HYD-8311', created_at: new Date(Date.now() - 3600000 * 18).toISOString() },
      { id: 103, user_id: driverId, amount: 500, transaction_type: 'credit', description: 'Weekly Performance Bonus', created_at: new Date(Date.now() - 3600000 * 48).toISOString() },
      { id: 104, user_id: driverId, amount: 2000, transaction_type: 'debit', description: 'Bank Cashout to HDFC •••• 4821', created_at: new Date(Date.now() - 3600000 * 72).toISOString() }
    ]
  };

  const getStoredWalletData = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading wallet from local storage:', e);
    }
    return defaultInitialWallet;
  };

  const saveWalletData = (data) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving wallet data:', e);
    }
  };

  useEffect(() => {
    const syncData = () => {
      const data = getStoredWalletData();
      setWallet(data.wallet);
      setCards(data.cards);
      setTransactions(data.transactions);
    };

    syncData();
    window.addEventListener('storage', syncData);
    return () => window.removeEventListener('storage', syncData);
  }, [currentUser]);

  useEffect(() => {
    if (isPayoutModalOpen && cards.length > 0) {
      setSelectedMethodId(cards[0].id.toString());
    }
  }, [isPayoutModalOpen, cards]);

  const handleCashout = (e) => {
    e.preventDefault();
    if (!currentUser) {
      showAlert("Please log in or sign up as a Driver to request a payout.", "info");
      openLogin();
      return;
    }
    if (!payoutAmount || isNaN(payoutAmount) || Number(payoutAmount) <= 0) {
      return showAlert("Please enter a valid payout amount", "error");
    }
    const currentBalance = wallet ? wallet.balance : 0;
    if (Number(payoutAmount) > currentBalance) {
      return showAlert("Insufficient balance in your earnings wallet", "error");
    }
    if (cards.length === 0) {
      return showAlert("Please link a payout bank account or card first.", "error");
    }

    const selectedCard = cards.find(c => c.id.toString() === selectedMethodId) || cards[0];
    const methodName = selectedCard.card_last4 === 'Linked'
      ? selectedCard.card_brand
      : `${selectedCard.card_brand} (•••• ${selectedCard.card_last4})`;

    const withdrawAmt = Number(payoutAmount);
    const newBalance = currentBalance - withdrawAmt;
    const updatedWallet = { ...wallet, balance: newBalance };

    const newTx = {
      id: Date.now(),
      user_id: driverId,
      amount: withdrawAmt,
      transaction_type: 'debit',
      description: `Cashout transfer to ${methodName}`,
      created_at: new Date().toISOString()
    };

    const updatedTransactions = [newTx, ...transactions];

    setWallet(updatedWallet);
    setTransactions(updatedTransactions);
    saveWalletData({ wallet: updatedWallet, cards, transactions: updatedTransactions });

    showAlert(`Successfully transferred $${payoutAmount} to your ${methodName}!`, "success");
    setPayoutAmount('');
    setIsPayoutModalOpen(false);
  };

  const handleLinkPayout = (e) => {
    e.preventDefault();
    if (!currentUser) {
      showAlert("Please log in or sign up as a Driver to link a payout method.", "info");
      openLogin();
      return;
    }
    
    let brand = '';
    let last4 = '';
    let expiryDate = 'N/A';
    
    if (payoutType === 'bank') {
      if (!newCard.number || newCard.number.length < 8) {
        return showAlert("Invalid bank account number", "error");
      }
      brand = newCard.bankName || 'Standard Bank';
      last4 = newCard.number.slice(-4);
      expiryDate = newCard.expiry || 'N/A';

      const duplicateBank = cards.find(c => {
        const b = (c.card_brand || '').toLowerCase();
        return b === brand.toLowerCase() && c.card_last4 === last4;
      });
      if (duplicateBank) {
        return showAlert(`This ${brand} account (•••• ${last4}) is already connected. Duplicate accounts are not allowed.`, "error");
      }
    } else if (payoutType === 'paypal') {
      const existingPayPal = cards.find(c => (c.card_brand || '').toLowerCase().includes('paypal'));
      if (existingPayPal) {
        return showAlert(`A PayPal account (${existingPayPal.card_last4}) is already linked. Only one PayPal payout account is allowed. Remove the existing one first.`, "error");
      }
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
    } else if (payoutType === 'applepay') {
      const existingApple = cards.find(c => (c.card_brand || '').toLowerCase().includes('apple'));
      if (existingApple) {
        return showAlert(`An Apple Pay account (${existingApple.card_last4}) is already linked. Only one Apple Pay payout account is allowed. Remove the existing one first.`, "error");
      }
      if (!newCard.appleEmail || !/\S+@\S+\.\S+/.test(newCard.appleEmail)) {
        return showAlert("Please enter a valid Apple ID email", "error");
      }
      brand = 'Apple Pay';
      last4 = newCard.appleEmail.length > 8 
        ? `${newCard.appleEmail.substring(0, 3)}...${newCard.appleEmail.slice(-4)}`
        : newCard.appleEmail;
    } else if (payoutType === 'gpay') {
      const existingGPay = cards.find(c => {
        const b = (c.card_brand || '').toLowerCase();
        return b.includes('google') || b.includes('gpay');
      });
      if (existingGPay) {
        return showAlert(`Google Pay is already connected (•••• ${existingGPay.card_last4}). Only one Google Pay payout account is allowed. Remove the existing one first to connect a new one.`, "error");
      }
      if (!newCard.gpayPhone || newCard.gpayPhone.length < 7) {
        return showAlert("Please enter a valid Google Pay linked phone number", "error");
      }
      brand = 'Google Pay';
      last4 = newCard.gpayPhone.slice(-4);
    }
    
    const newCardObj = {
      id: Date.now(),
      user_id: driverId,
      card_brand: brand,
      card_last4: last4,
      expiry_date: expiryDate
    };

    const updatedCards = [...cards, newCardObj];
    setCards(updatedCards);
    saveWalletData({ wallet, cards: updatedCards, transactions });

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

  const handleDeleteCard = (id) => {
    const updatedCards = cards.filter(c => c.id !== id);
    setCards(updatedCards);
    saveWalletData({ wallet, cards: updatedCards, transactions });
    showAlert("Account removed successfully.", "info");
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
          
          <div className="digital-wallet-card">
            <div className="card-top-row">
              <div>
                <div className="balance-label">Available Balance</div>
                <div className="balance-amount">${wallet ? parseFloat(wallet.balance).toFixed(2) : '0.00'}</div>
              </div>
              <div className="reward-badge">
                <TrendingUp size={14} /> Payouts Active
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
              <div className="card-brand">
                Driver Payouts
              </div>
            </div>
          </div>

          <div className="quick-actions-grid">
            <div className="action-card" onClick={() => setIsPayoutModalOpen(true)}>
              <div className="action-icon">
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
                cards.map(card => {
                  const brandLower = (card.card_brand || '').toLowerCase();
                  const isThirdParty = ['gpay', 'apple pay', 'paypal', 'google pay'].includes(brandLower) || (card.card_last4 || '').startsWith('Link') || card.card_last4 === 'Connected';
                  return (
                    <div className="saved-card-item" key={card.id}>
                      <div className="card-details">
                        {renderCardIcon(card.card_brand)}
                        <div className="card-info">
                          <h4>{card.card_brand}</h4>
                          <p style={{ margin: 0, color: isThirdParty ? '#2ecc71' : 'var(--text-muted)' }}>
                            {isThirdParty
                              ? `Connected Account`
                              : `Account ending in •••• ${card.card_last4}`
                            }
                          </p>
                        </div>
                      </div>
                      <button className="delete-card-btn" onClick={() => handleDeleteCard(card.id)} title="Remove Account">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  );
                })
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
                  <button type="button" className={`amount-btn ${payoutAmount === (wallet ? Math.floor(wallet.balance).toString() : '100') ? 'selected' : ''}`} onClick={() => setPayoutAmount(wallet ? Math.floor(wallet.balance).toString() : '100')}>All Available</button>
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

              <div className="safety-form-group" style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>Select Bank / Payout Method</label>
                <select
                  value={selectedMethodId}
                  onChange={(e) => setSelectedMethodId(e.target.value)}
                  className="wallet-select-dropdown"
                >
                  {cards.length > 0 ? (
                    cards.map(card => {
                      const brandLower = (card.card_brand || '').toLowerCase();
                      const isThirdParty = ['gpay', 'apple pay', 'paypal', 'google pay'].includes(brandLower) || (card.card_last4 || '').startsWith('Link') || card.card_last4 === 'Connected';
                      return (
                        <option key={card.id} value={card.id}>
                          {isThirdParty
                            ? `${card.card_brand} (Connected Account)`
                            : `${card.card_brand} (•••• ${card.card_last4})`}
                        </option>
                      );
                    })
                  ) : (
                    <option value="default_bank">Linked Checking Bank Account (•••• 8821)</option>
                  )}
                </select>
              </div>

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
        <div 
          className="safety-modal-overlay payout-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddCardModalOpen(false);
          }}
        >
          <div className="safety-modal-content payout-destination-modal">
            <div className="minimal-modal-header">
              <div>
                <h2>Link Payout Destination</h2>
                <p>Select your payout channel for instant transfers</p>
              </div>
              <button 
                type="button" 
                className="minimal-close-btn" 
                onClick={() => setIsAddCardModalOpen(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="minimal-method-tabs">
              <button
                type="button"
                className={`minimal-tab-btn ${payoutType === 'bank' ? 'active' : ''}`}
                onClick={() => setPayoutType('bank')}
              >
                Bank
              </button>
              <button
                type="button"
                className={`minimal-tab-btn ${payoutType === 'paypal' ? 'active' : ''}`}
                onClick={() => setPayoutType('paypal')}
              >
                PayPal {existingPayPal && <span style={{ color: '#34c759' }}>•</span>}
              </button>
              <button
                type="button"
                className={`minimal-tab-btn ${payoutType === 'applepay' ? 'active' : ''}`}
                onClick={() => setPayoutType('applepay')}
              >
                Apple Pay {existingApple && <span style={{ color: '#34c759' }}>•</span>}
              </button>
              <button
                type="button"
                className={`minimal-tab-btn ${payoutType === 'gpay' ? 'active' : ''}`}
                onClick={() => setPayoutType('gpay')}
              >
                Google Pay {existingGPay && <span style={{ color: '#34c759' }}>•</span>}
              </button>
            </div>

            <form onSubmit={handleLinkPayout}>
              <div key={payoutType} className="minimal-tab-content">
                {payoutType === 'bank' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="minimal-input-group">
                      <label>Bank Name / Provider</label>
                      <input 
                        type="text" 
                        className="minimal-input" 
                        placeholder="e.g. HDFC Bank, Chase, ICICI"
                        value={newCard.bankName}
                        onChange={(e) => setNewCard({...newCard, bankName: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="minimal-input-group">
                      <label>Account Number</label>
                      <input 
                        type="text" 
                        className="minimal-input" 
                        placeholder="Enter account or card number"
                        value={newCard.number}
                        onChange={(e) => setNewCard({...newCard, number: e.target.value})}
                        maxLength="24"
                        required
                      />
                    </div>

                    <div className="minimal-input-group">
                      <label>Routing / IFSC (Optional)</label>
                      <input 
                        type="text" 
                        className="minimal-input" 
                        placeholder="e.g. HDFC0001234"
                        value={newCard.expiry}
                        onChange={(e) => setNewCard({...newCard, expiry: e.target.value})}
                      />
                    </div>

                    <button type="submit" className="minimal-submit-btn">
                      Link Bank Account
                    </button>
                  </div>
                )}

                {payoutType === 'paypal' && (
                  <>
                    {existingPayPal ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="minimal-connected-box">
                          <div className="minimal-connected-left">
                            <div className="minimal-connected-icon" style={{ background: '#0070ba', color: '#fff' }}>
                              P
                            </div>
                            <div className="minimal-connected-text">
                              <h4>PayPal Connected</h4>
                              <p>{existingPayPal.card_last4}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="minimal-replace-btn"
                            onClick={() => {
                              handleDeleteCard(existingPayPal.id);
                              showAlert("Previous PayPal unlinked. You can now connect a new email.", "info");
                            }}
                          >
                            <Trash2 size={12} style={{ marginRight: '4px', verticalAlign: '-1px' }} /> Replace
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="minimal-input-group">
                          <label>PayPal Email</label>
                          <input 
                            type="email" 
                            className="minimal-input" 
                            placeholder="name@example.com"
                            value={newCard.paypalEmail || ''}
                            onChange={(e) => setNewCard({...newCard, paypalEmail: e.target.value})}
                            required
                          />
                        </div>
                        <div className="minimal-input-group">
                          <label>Confirm Email</label>
                          <input 
                            type="email" 
                            className="minimal-input" 
                            placeholder="Confirm email address"
                            value={newCard.paypalEmailConfirm || ''}
                            onChange={(e) => setNewCard({...newCard, paypalEmailConfirm: e.target.value})}
                            required
                          />
                        </div>
                        <button type="submit" className="minimal-submit-btn">
                          Link PayPal
                        </button>
                      </div>
                    )}
                  </>
                )}

                {payoutType === 'applepay' && (
                  <>
                    {existingApple ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="minimal-connected-box">
                          <div className="minimal-connected-left">
                            <div className="minimal-connected-icon" style={{ background: '#111', color: '#fff' }}>
                              
                            </div>
                            <div className="minimal-connected-text">
                              <h4>Apple Pay Connected</h4>
                              <p>{existingApple.card_last4}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="minimal-replace-btn"
                            onClick={() => {
                              handleDeleteCard(existingApple.id);
                              showAlert("Previous Apple Pay unlinked. Enter new Apple ID.", "info");
                            }}
                          >
                            <Trash2 size={12} style={{ marginRight: '4px', verticalAlign: '-1px' }} /> Replace
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="minimal-input-group">
                          <label>Apple ID Email or Mobile</label>
                          <input 
                            type="text" 
                            className="minimal-input" 
                            placeholder="e.g. driver@icloud.com"
                            value={newCard.appleEmail || ''}
                            onChange={(e) => setNewCard({...newCard, appleEmail: e.target.value})}
                            required
                          />
                        </div>
                        <button type="submit" className="minimal-submit-btn">
                          Link Apple Pay
                        </button>
                      </div>
                    )}
                  </>
                )}

                {payoutType === 'gpay' && (
                  <>
                    {existingGPay ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="minimal-connected-box">
                          <div className="minimal-connected-left">
                            <div className="minimal-connected-icon" style={{ background: '#ffffff', border: '1px solid rgba(255,255,255,0.15)', color: '#4285F4' }}>
                              G
                            </div>
                            <div className="minimal-connected-text">
                              <h4>Google Pay Connected</h4>
                              <p>•••• {existingGPay.card_last4}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="minimal-replace-btn"
                            onClick={() => {
                              handleDeleteCard(existingGPay.id);
                              showAlert("Google Pay unlinked. Enter new mobile number.", "info");
                            }}
                          >
                            <Trash2 size={12} style={{ marginRight: '4px', verticalAlign: '-1px' }} /> Replace
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="minimal-input-group">
                          <label>Linked Phone Number</label>
                          <input 
                            type="tel" 
                            className="minimal-input" 
                            placeholder="e.g. +91 98765 43210"
                            value={newCard.gpayPhone || ''}
                            onChange={(e) => setNewCard({...newCard, gpayPhone: e.target.value})}
                            required
                          />
                        </div>
                        <button type="submit" className="minimal-submit-btn">
                          Link Google Pay
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </form>
            
            <div className="minimal-security-foot">
              <ShieldCheck size={13} color="var(--accent-gold)" />
              <span>256-bit encrypted payout channel</span>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default DriverWallet;
