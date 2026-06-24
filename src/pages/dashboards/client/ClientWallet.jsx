import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, Plus, ArrowUpRight, ArrowDownLeft, ShieldCheck, Wallet as WalletIcon, Trash2, X, RefreshCw, Star, ArrowRight, History, TrendingUp, Smartphone } from 'lucide-react';
import { useAlert } from '../../../context/AlertContext';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../config';
import './ClientWallet.css';

const ClientWallet = () => {
  const { showAlert } = useAlert();
  const { currentUser } = useAuth();
  
  const [wallet, setWallet] = useState(null);
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // Modals
  const [isAddMoneyModalOpen, setIsAddMoneyModalOpen] = useState(false);
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  
  const [addAmount, setAddAmount] = useState('');
  const [newCard, setNewCard] = useState({ number: '', expiry: '' });
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('');
  const [transactionFilter, setTransactionFilter] = useState('all');

  useEffect(() => {
    if (currentUser?.id) {
      fetchWalletData();
    }
  }, [currentUser]);

  useEffect(() => {
    if (isAddMoneyModalOpen && cards.length > 0) {
      setSelectedPaymentMethodId(cards[0].id.toString());
    }
  }, [isAddMoneyModalOpen, cards]);

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

  const renderPaymentIcon = (brand) => {
    const brandLower = brand.toLowerCase();
    if (brandLower === 'gpay') {
      return (
        <div className="card-icon" style={{ background: '#ffffff', color: '#000000', border: '1px solid rgba(0,0,0,0.1)', display: 'flex', gap: '1px', padding: '0 8px' }}>
          <span style={{ fontWeight: '800', color: '#4285F4' }}>G</span>
          <span style={{ fontWeight: '800', color: '#EA4335' }}>P</span>
          <span style={{ fontWeight: '800', color: '#FBBC05' }}>a</span>
          <span style={{ fontWeight: '800', color: '#34A853' }}>y</span>
        </div>
      );
    }
    if (brandLower === 'paypal') {
      return (
        <div className="card-icon" style={{ background: '#003087', color: '#ffffff', fontSize: '11px', fontWeight: 'bold' }}>
          PayPal
        </div>
      );
    }
    if (brandLower === 'apple pay') {
      return (
        <div className="card-icon" style={{ background: '#000000', color: '#ffffff', fontSize: '12px' }}>
           Pay
        </div>
      );
    }
    if (brandLower === 'visa') {
      return (
        <div className="card-icon" style={{ background: '#1a1f71', color: '#ffffff', fontStyle: 'italic', fontWeight: 'bold', fontSize: '13px' }}>
          VISA
        </div>
      );
    }
    if (brandLower === 'mastercard') {
      return (
        <div className="card-icon" style={{ background: '#111112', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '16px', height: '16px', background: '#EB001B', borderRadius: '50%', position: 'absolute', left: '16px' }}></div>
          <div style={{ width: '16px', height: '16px', background: '#F79E1B', borderRadius: '50%', position: 'absolute', right: '16px', opacity: 0.85 }}></div>
        </div>
      );
    }
    return (
      <div className="card-icon" style={{ background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)' }}>
        Card
      </div>
    );
  };

  const handleAddMoney = async (e) => {
    e.preventDefault();
    if (!addAmount || isNaN(addAmount) || Number(addAmount) <= 0) {
      return showAlert("Please enter a valid amount", "error");
    }
    if (cards.length === 0) {
      return showAlert("Please link a payment method first to add money.", "error");
    }

    const selectedCard = cards.find(c => c.id.toString() === selectedPaymentMethodId) || cards[0];
    const methodName = selectedCard.card_last4 === 'Link' 
      ? selectedCard.card_brand 
      : `${selectedCard.card_brand} (•••• ${selectedCard.card_last4})`;

    try {
      const res = await fetch(`${API_BASE_URL}/api/wallet/add-money`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: currentUser.id, 
          amount: Number(addAmount),
          method: methodName
        })
      });
      if (res.ok) {
        showAlert(`Successfully added $${addAmount} via ${methodName}!`, "success");
        setAddAmount('');
        setIsAddMoneyModalOpen(false);
        fetchWalletData();
      }
    } catch (err) {
      showAlert("Failed to add money", "error");
    }
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    if (newCard.number.length < 16) return showAlert("Invalid card number", "error");
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/wallet/add-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, cardNumber: newCard.number, expiryDate: newCard.expiry })
      });
      if (res.ok) {
        showAlert("Card securely saved.", "success");
        setNewCard({ number: '', expiry: '' });
        setIsAddCardModalOpen(false);
        fetchWalletData();
      }
    } catch (err) {
      showAlert("Failed to add card", "error");
    }
  };

  const handleDeleteCard = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/api/wallet/card/${id}`, { method: 'DELETE' });
      showAlert("Card removed successfully.", "info");
      fetchWalletData();
    } catch (err) {
      showAlert("Error removing card", "error");
    }
  };

  const handleToggleReload = async () => {
    if (!wallet) return;
    try {
      await fetch(`${API_BASE_URL}/api/wallet/toggle-reload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, autoReload: !wallet.auto_reload })
      });
      fetchWalletData();
      showAlert(`Auto-reload turned ${!wallet.auto_reload ? 'ON' : 'OFF'}`, "info");
    } catch (err) {
      console.error(err);
    }
  };

  const totalAdded = transactions.filter(t => t.transaction_type === 'credit').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalSpent = transactions.filter(t => t.transaction_type === 'debit').reduce((sum, t) => sum + Number(t.amount), 0);

  const handleLinkThirdParty = async (provider) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/wallet/add-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: currentUser.id, 
          cardNumber: '', 
          expiryDate: 'N/A',
          cardBrand: provider,
          cardLast4: 'Linked'
        })
      });
      if (res.ok) {
        showAlert(`${provider} linked successfully.`, "success");
        setIsAddCardModalOpen(false);
        fetchWalletData();
      }
    } catch(e) {
      showAlert(`Failed to link ${provider}`, "error");
    }
  };

  return (
    <div className="wallet-dashboard">
      <div className="wallet-header">
        <div className="wallet-header-icon">
          <WalletIcon size={28} />
        </div>
        <div>
          <h1>Wallet & Payments</h1>
          <p>Seamlessly manage your funds and saved payment methods.</p>
        </div>
      </div>

      <div className="wallet-premium-grid">
        {/* Left Column: Balance & Quick Actions */}
        <div className="wallet-left-col">
          
          <div className="digital-wallet-card">
            <div className="card-top-row">
              <div>
                <div className="balance-label">Total Balance</div>
                <div className="balance-amount">${wallet ? parseFloat(wallet.balance).toFixed(2) : '0.00'}</div>
              </div>
            </div>
            
            <div className="card-bottom-row">
              <div className="card-number-mock">
                {cards.length > 0
                  ? (cards[0].card_last4.startsWith('Link') ? `${cards[0].card_brand} Account` : `•••• •••• •••• ${cards[0].card_last4}`)
                  : '•••• •••• •••• 9999'}
              </div>
              <div className="card-brand">
                {cards.length > 0 ? cards[0].card_brand : 'ElitePay'}
              </div>
            </div>
          </div>

          <div className="quick-actions-grid">
            <div className="action-card" onClick={() => setIsAddMoneyModalOpen(true)}>
              <div className="action-icon">
                <Plus size={24} />
              </div>
              <div>
                <h3>Add Funds</h3>
                <p>Top up your balance</p>
              </div>
            </div>

            <div className="action-card" onClick={handleToggleReload}>
              <div className="action-icon">
                <RefreshCw size={24} />
              </div>
              <div>
                <h3>Auto Reload</h3>
                <p>{wallet?.auto_reload ? <span style={{color: '#4ade80'}}>Active</span> : 'Currently Off'}</p>
              </div>
            </div>
          </div>
          <div className="wallet-section" style={{ marginTop: '24px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} /> Spending Report
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '12px', border: '1px solid rgba(74, 222, 128, 0.2)' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#4ade80' }}>Total Added</p>
                <h4 style={{ margin: '4px 0 0 0', fontSize: '20px', color: 'var(--text-main)' }}>${totalAdded.toFixed(2)}</h4>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(255, 68, 68, 0.2)' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#ff4444' }}>Total Spent</p>
                <h4 style={{ margin: '4px 0 0 0', fontSize: '20px', color: 'var(--text-main)' }}>${totalSpent.toFixed(2)}</h4>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Saved Cards & Recent Transactions */}
        <div className="wallet-right-col">
          
          <div className="wallet-section">
            <div className="section-header">
              <h3><CreditCard size={20} /> Saved Methods</h3>
            </div>
            
            <div className="saved-cards-list">
              {cards.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>No saved cards found.</p>
              ) : (
                cards.map(card => (
                  <div className="saved-card-item" key={card.id}>
                    <div className="card-details">
                      {renderPaymentIcon(card.card_brand)}
                      <div className="card-info">
                        {card.card_last4.startsWith('Link') ? (
                          <>
                            <h4>{card.card_brand}</h4>
                            <p style={{ color: '#2ecc71', fontWeight: '500', fontSize: '13px', margin: 0 }}>Connected Account</p>
                          </>
                        ) : (
                          <>
                            <h4>•••• {card.card_last4}</h4>
                            <p style={{ margin: 0 }}>{card.card_brand} • Expires {card.expiry_date}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <button className="delete-card-btn" onClick={() => handleDeleteCard(card.id)} title="Remove Card">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
              
              <button className="wallet-btn-outline" onClick={() => setIsAddCardModalOpen(true)} style={{ marginTop: '8px' }}>
                <Plus size={18} /> Add New Payment Method
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Transactions Section */}
      <div className="wallet-section" style={{ marginTop: '32px' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ margin: 0 }}><History size={20} /> Recent Transactions</h3>
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
              Added Funds
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
              Ride Payments
            </button>
          </div>
        </div>
        
        {(() => {
          const filteredTransactions = transactions.filter(t => transactionFilter === 'all' ? true : t.transaction_type === transactionFilter);
          
          if (filteredTransactions.length === 0) {
            return (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>
                {transactionFilter === 'all' ? 'No recent transactions.' : `No transactions matching "${transactionFilter === 'credit' ? 'Added Funds' : 'Ride Payments'}" filter.`}
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
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map(tx => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td>
                        <div className="tx-desc">
                          <div className={`tx-icon ${tx.transaction_type}`}>
                            {tx.transaction_type === 'credit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                          </div>
                          {tx.description}
                        </div>
                      </td>
                      <td className={`transaction-amount ${tx.transaction_type}`}>
                        {tx.transaction_type === 'credit' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                      </td>
                      <td>
                        <span className="status-badge">Success</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Add Money Modal */}
      {isAddMoneyModalOpen && createPortal(
        <div className="safety-modal-overlay">
          <div className="safety-modal-content">
            <div className="safety-modal-header">
              <h2>Top Up Balance</h2>
              <button className="close-modal-btn" onClick={() => setIsAddMoneyModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddMoney}>
              <div className="safety-form-group">
                <label>Select Amount</label>
                <div className="modal-grid">
                  <button type="button" className={`amount-btn ${addAmount === '50' ? 'selected' : ''}`} onClick={() => setAddAmount('50')}>$50</button>
                  <button type="button" className={`amount-btn ${addAmount === '100' ? 'selected' : ''}`} onClick={() => setAddAmount('100')}>$100</button>
                  <button type="button" className={`amount-btn ${addAmount === '200' ? 'selected' : ''}`} onClick={() => setAddAmount('200')}>$200</button>
                </div>
                <input 
                  type="number" 
                  className="safety-input" 
                  style={{ width: '100%' }}
                  placeholder="Or enter custom amount"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  min="1"
                />
              </div>

              {cards.length > 0 && (
                <div className="safety-form-group" style={{ marginTop: '16px' }}>
                  <label>Select Payment Method</label>
                  <select
                    value={selectedPaymentMethodId}
                    onChange={(e) => setSelectedPaymentMethodId(e.target.value)}
                    className="safety-input"
                    style={{ width: '100%', padding: '10px', background: 'var(--bg-darker)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    {cards.map(card => {
                      const label = card.card_last4.startsWith('Link') 
                        ? `${card.card_brand} (Linked)` 
                        : `${card.card_brand} ending in •••• ${card.card_last4}`;
                      return (
                        <option key={card.id} value={card.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <button type="submit" className="wallet-btn-primary">Confirm Transfer</button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add Card Modal */}
      {isAddCardModalOpen && createPortal(
        <div className="safety-modal-overlay">
          <div className="safety-modal-content">
            <div className="safety-modal-header">
              <h2>Add Payment Method</h2>
              <button className="close-modal-btn" onClick={() => setIsAddCardModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="payment-method-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'var(--bg-darker)', padding: '6px', borderRadius: '12px' }}>
              <button className={`method-tab ${selectedMethod === 'card' ? 'active' : ''}`} onClick={() => setSelectedMethod('card')}>Credit Card</button>
              <button className={`method-tab ${selectedMethod === 'gpay' ? 'active' : ''}`} onClick={() => setSelectedMethod('gpay')}>GPay</button>
              <button className={`method-tab ${selectedMethod === 'apple' ? 'active' : ''}`} onClick={() => setSelectedMethod('apple')}>Apple Pay</button>
              <button className={`method-tab ${selectedMethod === 'paypal' ? 'active' : ''}`} onClick={() => setSelectedMethod('paypal')}>PayPal</button>
            </div>

            {selectedMethod === 'card' && (
              <form onSubmit={handleAddCard}>
                <div className="safety-form-group">
                  <label>Card Number</label>
                  <input 
                    type="text" 
                    className="safety-input" 
                    style={{ width: '100%' }}
                    placeholder="1111 2222 3333 4444"
                    value={newCard.number}
                    onChange={(e) => setNewCard({...newCard, number: e.target.value})}
                    maxLength="16"
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="safety-form-group">
                    <label>Expiry Date</label>
                    <input 
                      type="text" 
                      className="safety-input" 
                      style={{ width: '100%' }}
                      placeholder="MM/YY"
                      value={newCard.expiry}
                      onChange={(e) => setNewCard({...newCard, expiry: e.target.value})}
                      maxLength="5"
                      required
                    />
                  </div>
                  <div className="safety-form-group">
                    <label>CVV</label>
                    <input 
                      type="password" 
                      className="safety-input" 
                      style={{ width: '100%' }}
                      placeholder="123"
                      maxLength="4"
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="wallet-btn-primary">Securely Save Card</button>
              </form>
            )}

            {selectedMethod === 'gpay' && (
              <div className="third-party-link-container">
                <div className="third-party-icon" style={{ background: '#fff', color: '#000' }}>G</div>
                <h3>Link Google Pay</h3>
                <p>Connect your Google Pay account for faster checkout.</p>
                <button type="button" className="wallet-btn-primary" style={{ background: '#000', color: '#fff' }} onClick={() => handleLinkThirdParty('GPay')}>Connect GPay</button>
              </div>
            )}

            {selectedMethod === 'apple' && (
              <div className="third-party-link-container">
                <div className="third-party-icon" style={{ background: '#000', color: '#fff' }}>A</div>
                <h3>Link Apple Pay</h3>
                <p>Connect your Apple Pay account for faster checkout.</p>
                <button type="button" className="wallet-btn-primary" style={{ background: '#000', color: '#fff' }} onClick={() => handleLinkThirdParty('Apple Pay')}>Connect Apple Pay</button>
              </div>
            )}

            {selectedMethod === 'paypal' && (
              <div className="third-party-link-container">
                <div className="third-party-icon" style={{ background: '#003087', color: '#fff' }}>P</div>
                <h3>Link PayPal</h3>
                <p>Connect your PayPal account for faster checkout.</p>
                <button type="button" className="wallet-btn-primary" style={{ background: '#003087', color: '#fff' }} onClick={() => handleLinkThirdParty('PayPal')}>Connect PayPal</button>
              </div>
            )}

            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginTop: '20px' }}>
              <ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: '6px', color: 'var(--accent-gold)' }}/>
              Your payment data is securely encrypted.
            </p>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default ClientWallet;
