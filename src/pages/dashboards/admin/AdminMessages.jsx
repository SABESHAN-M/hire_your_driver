import React, { useState, useEffect, useRef } from 'react';
import { useAlert } from '../../../context/AlertContext';
import { API_BASE_URL } from '../../../config';
import { 
  MessageSquare, Send, Users, Ticket, Trash2, Megaphone, User, Search, RefreshCw, Eye, Sparkles, Filter
} from 'lucide-react';
import './AdminMessages.css';
import '../admin/AdminPages.css';

const MultiUserCheckboxSelect = ({ roleFilter, users, selectedUserIds, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredUsers = users.filter(user => {
    if (roleFilter !== 'all' && user.role.toLowerCase() !== roleFilter.toLowerCase()) return false;
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
    const email = (user.email || '').toLowerCase();
    const phone = (user.phone_number || '').toLowerCase();
    const match = searchTerm.toLowerCase();
    return fullName.includes(match) || email.includes(match) || phone.includes(match);
  });

  const toggleUser = (userId) => {
    if (selectedUserIds.includes(userId)) {
      onChange(selectedUserIds.filter(id => id !== userId));
    } else {
      onChange([...selectedUserIds, userId]);
    }
  };

  const handleSelectAllMatching = () => {
    const matchingIds = filteredUsers.map(u => u.id);
    const combined = Array.from(new Set([...selectedUserIds, ...matchingIds]));
    onChange(combined);
  };

  const handleSelectAllClients = () => {
    const clientIds = filteredUsers.filter(u => u.role.toLowerCase() === 'client').map(u => u.id);
    const combined = Array.from(new Set([...selectedUserIds, ...clientIds]));
    onChange(combined);
  };

  const handleSelectAllDrivers = () => {
    const driverIds = filteredUsers.filter(u => u.role.toLowerCase() === 'driver').map(u => u.id);
    const combined = Array.from(new Set([...selectedUserIds, ...driverIds]));
    onChange(combined);
  };

  const handleDeselectAllMatching = () => {
    const matchingIds = filteredUsers.map(u => u.id);
    onChange(selectedUserIds.filter(id => !matchingIds.includes(id)));
  };

  return (
    <div className="search-select-container" ref={dropdownRef}>
      <div className="search-select-input-wrapper">
        <input
          type="text"
          className="composer-input"
          placeholder={`Type to search registered ${roleFilter}s...`}
          value={searchTerm}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ paddingLeft: '38px' }}
        />
        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
        <span className="search-select-arrow" onClick={() => setIsOpen(prev => !prev)} style={{ cursor: 'pointer' }}>▼</span>
      </div>

      {isOpen && (
        <div className="search-select-dropdown" style={{ maxHeight: '280px', overflowY: 'auto' }}>
          <div className="search-select-bulk-actions" style={{
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '8px 12px',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(0,0,0,0.15)',
            fontSize: '11px'
          }}>
            <button 
              type="button" 
              onClick={handleSelectAllMatching}
              style={{ background: 'none', border: 'none', color: 'var(--accent-gold)', cursor: 'pointer', fontWeight: 600 }}
            >
              Select All ({filteredUsers.length})
            </button>
            {roleFilter === 'all' && (
              <>
                <button 
                  type="button" 
                  onClick={handleSelectAllClients}
                  style={{ background: 'none', border: 'none', color: '#007aff', cursor: 'pointer', fontWeight: 600 }}
                >
                  Select All Clients ({filteredUsers.filter(u => u.role.toLowerCase() === 'client').length})
                </button>
                <button 
                  type="button" 
                  onClick={handleSelectAllDrivers}
                  style={{ background: 'none', border: 'none', color: '#34c759', cursor: 'pointer', fontWeight: 600 }}
                >
                  Select All Drivers ({filteredUsers.filter(u => u.role.toLowerCase() === 'driver').length})
                </button>
              </>
            )}
            <button 
              type="button" 
              onClick={handleDeselectAllMatching}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}
            >
              Deselect All
            </button>
          </div>
          
          {filteredUsers.length === 0 ? (
            <div className="search-select-empty">No matching users found</div>
          ) : (
            filteredUsers.map(user => {
              const isChecked = selectedUserIds.includes(user.id);
              return (
                <div
                  key={user.id}
                  className={`search-select-item-checkbox ${isChecked ? 'selected' : ''}`}
                  onClick={() => toggleUser(user.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    borderBottom: '1px solid rgba(255,255,255,0.02)'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}} 
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: 'var(--accent-gold)',
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: isChecked ? 'var(--accent-gold)' : 'var(--text-main)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {user.first_name} {user.last_name}
                      <span style={{ 
                        fontSize: '9px', 
                        padding: '1px 5px', 
                        borderRadius: '4px', 
                        background: user.role === 'client' ? 'rgba(0,122,255,0.12)' : 'rgba(52,199,89,0.12)', 
                        color: user.role === 'client' ? '#007aff' : '#34c759',
                        textTransform: 'uppercase',
                        fontWeight: '700'
                      }}>
                        {user.role}
                      </span>
                    </strong>
                    <div style={{ fontSize: '11px', opacity: 0.7, color: 'var(--text-muted)' }}>
                      {user.email || 'No Email'} • {user.phone_number}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};


const AdminMessages = () => {
  const { showAlert } = useAlert();
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [targetType, setTargetType] = useState('all_clients');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [messageType, setMessageType] = useState('news');
  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(20);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isMessagePristine, setIsMessagePristine] = useState(true);

  // Filter/Search logs state
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active message details modal state
  const [activeModalMessage, setActiveModalMessage] = useState(null);

  // Fetch initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch users
      const resUsers = await fetch(`${API_BASE_URL}/api/admin/users`);
      if (resUsers.ok) setUsers(await resUsers.json());

      // 2. Fetch sent logs
      const resMsgs = await fetch(`${API_BASE_URL}/api/admin/messages`);
      if (resMsgs.ok) setMessages(await resMsgs.json());
    } catch (err) {
      console.error(err);
      showAlert('Failed to load message center data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-generate helper for news based on subject keywords
  const autoGenerateNewsMessage = (subjectTitle) => {
    if (!subjectTitle.trim()) return '';

    let targetName = 'our valued customer';
    if (targetType === 'specific_client' && selectedUserIds.length > 0) {
      if (selectedUserIds.length === 1) {
        const clientObj = users.find(u => u.id === selectedUserIds[0]);
        if (clientObj) targetName = clientObj.first_name;
      } else {
        targetName = 'valued customers';
      }
    } else if (targetType === 'all_clients') {
      targetName = 'valued customer';
    } else if (targetType === 'all_drivers') {
      targetName = 'team member';
    } else if (targetType === 'all_users') {
      targetName = 'valued members';
    } else if (targetType === 'specific_driver' && selectedUserIds.length > 0) {
      if (selectedUserIds.length === 1) {
        const driverObj = users.find(u => u.id === selectedUserIds[0]);
        if (driverObj) targetName = driverObj.first_name;
      } else {
        targetName = 'team members';
      }
    } else if (targetType === 'specific_users' && selectedUserIds.length > 0) {
      if (selectedUserIds.length === 1) {
        const userObj = users.find(u => u.id === selectedUserIds[0]);
        if (userObj) targetName = userObj.first_name;
      } else {
        targetName = 'valued members';
      }
    }


    const sub = subjectTitle.toLowerCase();

    if (sub.includes('maintenance') || sub.includes('downtime') || sub.includes('offline') || sub.includes('server') || sub.includes('schedule')) {
      return `Hello ${targetName},\n\nPlease be informed that the Hire Your Driver platform will undergo scheduled system maintenance to deploy new updates and optimize performance. \n\nDuring this window, some services may experience temporary interruptions. We appreciate your patience and apologize for any inconvenience caused.\n\nBest regards,\nSystem Admin`;
    }
    if (sub.includes('holiday') || sub.includes('festival') || sub.includes('christmas') || sub.includes('new year') || sub.includes('eid') || sub.includes('diwali') || sub.includes('season')) {
      return `Hello ${targetName},\n\nWishing you a wonderful and safe holiday season from all of us at Hire Your Driver! \n\nPlease note that driver availability might be limited during peak holiday hours. We highly recommend booking your trips in advance to secure your preferred driver and ride times.\n\nBest regards,\nSystem Admin`;
    }
    if (sub.includes('weather') || sub.includes('rain') || sub.includes('storm') || sub.includes('flood') || sub.includes('snow') || sub.includes('traffic')) {
      return `Hello ${targetName},\n\nWe have issued a weather and traffic alert for your area. Heavy rain or traffic congestion may affect driver matching and arrival times today.\n\nWe advise planning your bookings earlier than usual. Please stay safe and travel carefully!\n\nBest regards,\nSystem Admin`;
    }
    if (sub.includes('welcome') || sub.includes('join') || sub.includes('register') || sub.includes('account')) {
      return `Hello ${targetName},\n\nWelcome to Hire Your Driver! We are thrilled to have you as part of our premium community. \n\nWhether you need a reliable driver for daily commutes, business travel, or weekend getaways, we've got you covered. Explore the dashboard to book a verified driver or customize your profile settings.\n\nBest regards,\nSystem Admin`;
    }
    if (sub.includes('update') || sub.includes('feature') || sub.includes('app') || sub.includes('version') || sub.includes('release')) {
      return `Hello ${targetName},\n\nWe are excited to announce a new version update for the Hire Your Driver platform!\n\nThis release introduces brand new feature improvements, a redesigned user experience, and optimized driver tracking tools. Head over to your dashboard to explore the updates.\n\nBest regards,\nSystem Admin`;
    }
    if (sub.includes('security') || sub.includes('password') || sub.includes('privacy') || sub.includes('safe') || sub.includes('account alert')) {
      return `Hello ${targetName},\n\nThis is a standard security reminder to keep your Hire Your Driver account credentials safe. We recommend updating your account password periodically and never sharing verification codes with anyone.\n\nIf you notice any suspicious activity, please contact platform support immediately.\n\nBest regards,\nSystem Admin`;
    }

    return `Hello ${targetName},\n\nWe are sharing an important news announcement regarding: "${subjectTitle}". \n\nPlease review the complete details in your notification center. If you have any inquiries or need assistance, feel free to reach out to our customer support team.\n\nBest regards,\nSystem Admin`;
  };

  // Auto-generate Subject Title and Message Details for Promo Campaigns
  useEffect(() => {
    if (messageType === 'promo') {
      const code = promoCode || '[PROMO CODE]';
      
      let targetName = 'our valued customer';
      if (targetType === 'specific_client' && selectedUserIds.length > 0) {
        if (selectedUserIds.length === 1) {
          const clientObj = users.find(u => u.id === selectedUserIds[0]);
          if (clientObj) targetName = clientObj.first_name;
        } else {
          targetName = 'valued customers';
        }
      } else if (targetType === 'all_clients') {
        targetName = 'valued customer';
      } else if (targetType === 'all_drivers') {
        targetName = 'team member';
      } else if (targetType === 'all_users') {
        targetName = 'valued members';
      } else if (targetType === 'specific_driver' && selectedUserIds.length > 0) {
        if (selectedUserIds.length === 1) {
          const driverObj = users.find(u => u.id === selectedUserIds[0]);
          if (driverObj) targetName = driverObj.first_name;
        } else {
          targetName = 'team members';
        }
      } else if (targetType === 'specific_users' && selectedUserIds.length > 0) {
        if (selectedUserIds.length === 1) {
          const userObj = users.find(u => u.id === selectedUserIds[0]);
          if (userObj) targetName = userObj.first_name;
        } else {
          targetName = 'valued members';
        }
      }

      const generatedTitle = `Special Offer: Get ${discountPercent}% Off Your Next Booking!`;
      const generatedMessage = `Hello ${targetName},\n\nWe have a special discount offer just for you! Apply the promo code ${code} on your next driver booking to receive a ${discountPercent}% discount.\n\nEnjoy your premium ride with Hire Your Driver!\n\nBest regards,\nSystem Admin`;

      setTitle(generatedTitle);
      setMessage(generatedMessage);
    }
  }, [messageType, promoCode, discountPercent, targetType, selectedUserIds, users]);

  // Auto-generate message body for News announcements dynamically on input
  useEffect(() => {
    if (messageType === 'news' && isMessagePristine && title.trim()) {
      setMessage(autoGenerateNewsMessage(title));
    } else if (messageType === 'news' && isMessagePristine && !title.trim()) {
      setMessage('');
    }
  }, [title, targetType, selectedUserIds, messageType, isMessagePristine, users]);

  const handleTargetTypeChange = (e) => {
    setTargetType(e.target.value);
    setSelectedUserIds([]); // reset selected user ids
  };


  const generatePromoCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = `HIRE${discountPercent}-`;
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPromoCode(code);
    showAlert(`Generated Code: ${code}`, 'success');
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      return showAlert('Please enter a title and message body', 'error');
    }

    if ((targetType === 'specific_client' || targetType === 'specific_driver' || targetType === 'specific_users') && selectedUserIds.length === 0) {
      return showAlert('Please search and select at least one recipient from the search dropdown checklist', 'error');
    }

    if (messageType === 'promo' && !promoCode.trim()) {
      return showAlert('Please enter a promo code or generate one', 'error');
    }

    setIsSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetUserId: (targetType === 'specific_client' || targetType === 'specific_driver' || targetType === 'specific_users') ? selectedUserIds : null,
          messageType,
          promoCode: messageType === 'promo' ? promoCode.trim() : null,
          title: title.trim(),
          message: message.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        showAlert(data.message || 'Announcement published successfully!', 'success');
        // Reset form inputs
        setTitle('');
        setMessage('');
        setPromoCode('');
        setSelectedUserIds([]);
        setIsMessagePristine(true);
        
        // Refresh logs
        fetchData();
      } else {
        throw new Error(data.error || 'Failed to send announcement.');
      }
    } catch (err) {
      console.error(err);
      showAlert(err.message || 'Error sending message.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleRecall = async (msgId) => {
    if (!window.confirm('Are you sure you want to recall this message? It will immediately delete the message from the recipient\'s notifications.')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/messages/${msgId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showAlert('Announcement recalled successfully!', 'success');
        setMessages(prev => prev.filter(m => m.id !== msgId));
      } else {
        throw new Error('Failed to recall message.');
      }
    } catch (err) {
      console.error(err);
      showAlert(err.message || 'Error recalling message.', 'error');
    }
  };

  const getRecipientLabel = (msg) => {
    if (!msg.user_id) {
      return msg.role === 'client' ? 'All Clients (Broadcast)' : 'All Drivers (Broadcast)';
    }
    const name = `${msg.first_name || ''} ${msg.last_name || ''}`.trim() || 'User';
    return msg.role === 'client' ? `Client: ${name}` : `Driver: ${name}`;
  };

  // Filter logs based on tabs and search query
  const filteredMessages = messages.filter(msg => {
    const isPromo = msg.title.startsWith('[PROMO CODE:');
    
    // 1. Type Filter
    if (filterType === 'news' && isPromo) return false;
    if (filterType === 'promo' && !isPromo) return false;

    // 2. Search query filter
    const query = searchQuery.toLowerCase();
    const recipient = getRecipientLabel(msg).toLowerCase();
    const title = msg.title.toLowerCase();
    const body = msg.message.toLowerCase();

    return recipient.includes(query) || title.includes(query) || body.includes(query);
  });

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare size={24} color="var(--accent-gold)" />
            Messages & Announcements Center
          </h1>
          <p className="admin-page-subtitle">Publish system-wide news alerts or target specific clients with customized promo codes</p>
        </div>
        <button type="button" className="admin-btn-view" onClick={fetchData} disabled={isLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} className={isLoading ? 'admin-spin' : ''} /> Refresh Data
        </button>
      </div>

      {isLoading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <p>Syncing message logs...</p>
        </div>
      ) : (
        <div className="messages-layout">
          {/* Send Composer Form */}
          <form onSubmit={handleSend} className="composer-card-advanced">
            <div className="composer-title-row-advanced">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="composer-icon-wrapper">
                  <Megaphone size={20} color="#000" />
                </div>
                <div>
                  <h3 className="composer-title">Campaign Dispatcher</h3>
                  <p className="composer-subtitle">Configure and broadcast notifications & promotional offers</p>
                </div>
              </div>
              <div className="composer-badge">
                <Sparkles size={12} color="var(--accent-gold)" style={{ marginRight: '4px' }} />
                Advanced mode
              </div>
            </div>

            <div className="composer-grid">
              {/* Column 1: Configuration Settings */}
              <div className="composer-col">
                <div className="composer-section-header">
                  <span className="composer-section-num">01</span>
                  <span className="composer-section-title">Target & Category</span>
                </div>

                <div className="composer-field-group">
                  {/* Recipient Dropdown */}
                  <div className="form-group">
                    <span className="form-label">Recipient Audience</span>
                    <select
                      className="composer-input"
                      value={targetType}
                      onChange={handleTargetTypeChange}
                    >
                      <option value="all_clients">All Registered Clients</option>
                      <option value="all_drivers">All Registered Drivers</option>
                      <option value="all_users">All Clients & Drivers (Broadcast)</option>
                      <option value="specific_client">Targeted Client User...</option>
                      <option value="specific_driver">Targeted Driver User...</option>
                      <option value="specific_users">Targeted Clients & Drivers...</option>
                    </select>
                  </div>

                  {/* Search Autocomplete / Selected Users Checklist display */}
                  {(targetType === 'specific_client' || targetType === 'specific_driver' || targetType === 'specific_users') && (
                    <div className="form-group" style={{ animation: 'fadeIn 0.2s ease' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="form-label">Target Recipients Checklist</span>
                        {selectedUserIds.length > 0 && (
                          <span style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: 700, textTransform: 'uppercase' }}>
                            {selectedUserIds.length} Recipient{selectedUserIds.length > 1 ? 's' : ''} Selected
                          </span>
                        )}
                      </div>
                      
                      <MultiUserCheckboxSelect
                        roleFilter={targetType === 'specific_client' ? 'client' : targetType === 'specific_driver' ? 'driver' : 'all'}
                        users={users}
                        selectedUserIds={selectedUserIds}
                        onChange={setSelectedUserIds}
                      />

                      {/* Display small tags representing selected recipients for visual feedback */}
                      {selectedUserIds.length > 0 && (
                        <div className="selected-users-tags" style={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: '6px', 
                          maxHeight: '130px', 
                          overflowY: 'auto', 
                          padding: '6px 8px', 
                          background: 'rgba(0,0,0,0.15)',
                          borderRadius: '12px',
                          border: '1px solid var(--border-color)',
                          marginTop: '10px'
                        }}>
                          {selectedUserIds.map(uid => {
                            const u = users.find(user => user.id === uid);
                            if (!u) return null;
                            return (
                              <div key={uid} className="selected-user-tag" style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'rgba(212, 175, 55, 0.08)',
                                border: '1px solid rgba(212, 175, 55, 0.2)',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                color: 'var(--accent-gold)',
                                animation: 'slideUp 0.15s ease'
                              }}>
                                <span style={{ fontWeight: 600 }}>{u.first_name} {u.last_name[0]}.</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedUserIds(prev => prev.filter(id => id !== uid))}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    fontSize: '10px',
                                    padding: '0 2px',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                  title="Remove recipient"
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Type Selection */}
                  <div className="form-group">
                    <span className="form-label">Campaign Type</span>
                    <select
                      className="composer-input"
                      value={messageType}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setMessageType(newType);
                        if (newType === 'news') {
                          setTitle('');
                          setMessage('');
                          setIsMessagePristine(true);
                        }
                      }}
                    >
                      <option value="news">News Announcement & Info</option>
                      <option value="promo">Promo & Discount Code</option>
                    </select>
                  </div>

                  {/* Promo Code inputs */}
                  {messageType === 'promo' && (
                    <div className="promo-setup-panel" style={{ animation: 'slideUp 0.25s ease' }}>
                      <div className="form-group">
                        <span className="form-label">Offer Percentage Discount</span>
                        <select
                          className="composer-input"
                          value={discountPercent}
                          onChange={(e) => {
                            const newPct = Number(e.target.value);
                            setDiscountPercent(newPct);
                            // Update code HIREXX if not custom
                            if (!promoCode || promoCode.startsWith('HIRE')) {
                              const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                              let code = `HIRE${newPct}-`;
                              for (let i = 0; i < 4; i++) {
                                code += chars.charAt(Math.floor(Math.random() * chars.length));
                              }
                              setPromoCode(code);
                            }
                          }}
                        >
                          <option value="10">10% Discount</option>
                          <option value="15">15% Discount</option>
                          <option value="20">20% Discount</option>
                          <option value="25">25% Discount</option>
                          <option value="30">30% Discount</option>
                          <option value="40">40% Discount</option>
                          <option value="50">50% Discount</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <span className="form-label">Discount Promo Code</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <input
                              type="text"
                              className="composer-input"
                              style={{ paddingLeft: '38px', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                              placeholder="e.g. GOLDEN30"
                              value={promoCode}
                              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                            />
                            <Ticket size={16} color="var(--accent-gold)" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                          </div>
                          <button
                            type="button"
                            className="composer-btn-generate"
                            onClick={generatePromoCode}
                          >
                            <Sparkles size={14} color="#000" /> Generate
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Content Composer & Mock Preview */}
              <div className="composer-col">
                <div className="composer-section-header">
                  <span className="composer-section-num">02</span>
                  <span className="composer-section-title">Message Content & Preview</span>
                </div>

                <div className="composer-field-group">
                  {/* Title / Subject */}
                  <div className="form-group">
                    <span className="form-label">Subject Title</span>
                    <input
                      type="text"
                      className="composer-input"
                      placeholder="Announce header title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  {/* Message Body */}
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="form-label">Campaign Message Details</span>
                      {messageType === 'news' && (
                        <button
                          type="button"
                          className="composer-btn-magic"
                          onClick={() => {
                            setMessage(autoGenerateNewsMessage(title));
                            setIsMessagePristine(true);
                            showAlert('Draft content generated successfully!', 'success');
                          }}
                        >
                          <Sparkles size={11} /> Auto-Generate
                        </button>
                      )}
                    </div>
                    <textarea
                      className="composer-input composer-textarea"
                      placeholder="Write your campaign details or promo information here..."
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value);
                        setIsMessagePristine(false);
                      }}
                    />
                  </div>
                </div>

                {/* Real-time Notification Mock Preview */}
                <div className="composer-live-preview">
                  <div className="preview-label">Live Notification Feed Preview</div>
                  <div className="preview-bubble">
                    <div className="preview-bubble-header">
                      <div className="preview-bubble-icon">
                        <Megaphone size={12} color="var(--accent-gold)" />
                      </div>
                      <span className="preview-bubble-source">System Administrator</span>
                      <span className="preview-bubble-dot">•</span>
                      <span className="preview-bubble-time">Just now</span>
                    </div>
                    <div className="preview-bubble-title">{title || 'Subject Title Placeholder'}</div>
                    <div className="preview-bubble-body" style={{ minHeight: '34px' }}>{message || 'Your detailed message will render here in real-time as you compose...'}</div>
                    {messageType === 'promo' && promoCode && (
                      <div className="preview-bubble-promo">
                        <Ticket size={12} style={{ marginRight: '6px' }} />
                        Promo Code: <strong>{promoCode}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Action */}
                <button type="submit" className="composer-submit-btn" disabled={isSending}>
                  <Send size={16} /> {isSending ? 'Publishing Campaign...' : 'Publish Announcement Campaign'}
                </button>
              </div>
            </div>
          </form>

          {/* Sent History Explorer */}
          <div className="admin-table-card" style={{ display: 'flex', flexDirection: 'column', maxHeight: '660px', height: '100%' }}>
            <div className="logs-header-row">
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={18} color="var(--accent-gold)" />
                Sent Announcements History
              </h3>

              {/* Search Log Box */}
              <div className="admin-search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Filter history logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Tabs for Filtering logs */}
            <div style={{ padding: '8px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <div className="admin-filter-tabs" style={{ border: 'none', background: 'none', padding: 0 }}>
                <button
                  type="button"
                  className={`admin-filter-tab ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterType('all')}
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                >
                  All Logs ({messages.length})
                </button>
                <button
                  type="button"
                  className={`admin-filter-tab ${filterType === 'news' ? 'active' : ''}`}
                  onClick={() => setFilterType('news')}
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                >
                  Announcements
                </button>
                <button
                  type="button"
                  className={`admin-filter-tab ${filterType === 'promo' ? 'active' : ''}`}
                  onClick={() => setFilterType('promo')}
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                >
                  Promo Codes
                </button>
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>Recipient Target</th>
                    <th style={{ width: '15%' }}>Category</th>
                    <th>Subject</th>
                    <th>Message Body</th>
                    <th style={{ width: '15%', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMessages.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="admin-table-empty">No matching sent campaigns found.</td>
                    </tr>
                  ) : (
                    filteredMessages.map((msg) => {
                      const isPromo = msg.title.startsWith('[PROMO CODE:');
                      return (
                        <tr key={msg.id}>
                          <td style={{ fontWeight: 600, fontSize: '13px' }}>{getRecipientLabel(msg)}</td>
                          <td>
                            <span className={`admin-table-badge ${isPromo ? 'badge-promo' : 'badge-news'}`}>
                              {isPromo ? 'Promo Code' : 'Announcement'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, fontSize: '14px' }}>{msg.title}</td>
                          <td className="admin-table-muted" style={{ fontSize: '13px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {msg.message}
                          </td>
                          <td>
                            <div className="admin-action-btns" style={{ justifyContent: 'center' }}>
                              <button
                                type="button"
                                className="admin-btn-view"
                                title="View Details"
                                onClick={() => setActiveModalMessage(msg)}
                                style={{ padding: '5px 8px' }}
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                className="admin-btn-reject-sm"
                                title="Recall Announcement"
                                onClick={() => handleRecall(msg.id)}
                                style={{ padding: '5px 8px' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Message View details modal */}
      {activeModalMessage && (
        <>
          <div className="admin-modal-backdrop" onClick={() => setActiveModalMessage(null)}></div>
          <div className="admin-modal" style={{ width: '480px' }}>
            <button type="button" className="admin-modal-close" onClick={() => setActiveModalMessage(null)}>✕</button>
            <h3 className="admin-modal-title">Campaign Details</h3>
            <div className="admin-modal-body" style={{ gap: '20px' }}>
              <div className="admin-modal-field">
                <span className="admin-modal-label">Audience Target</span>
                <span className="admin-modal-value" style={{ fontSize: '14px' }}>
                  {getRecipientLabel(activeModalMessage)}
                </span>
              </div>
              <div className="admin-modal-field">
                <span className="admin-modal-label">Campaign Category</span>
                <span className="admin-modal-value">
                  <span className={`admin-table-badge ${activeModalMessage.title.startsWith('[PROMO CODE:') ? 'badge-promo' : 'badge-news'}`}>
                    {activeModalMessage.title.startsWith('[PROMO CODE:') ? 'Promo Code' : 'News Alert'}
                  </span>
                </span>
              </div>
              <div className="admin-modal-field" style={{ display: 'block' }}>
                <span className="admin-modal-label" style={{ display: 'block', marginBottom: '6px' }}>Subject Header</span>
                <span className="admin-modal-value" style={{ display: 'block', fontSize: '15px', color: 'var(--text-main)', fontWeight: 800 }}>
                  {activeModalMessage.title}
                </span>
              </div>
              <div className="admin-modal-field" style={{ display: 'block', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
                <span className="admin-modal-label" style={{ display: 'block', marginBottom: '6px' }}>Detailed Content</span>
                <p style={{ 
                  margin: 0, 
                  fontSize: '14px', 
                  color: 'var(--text-main)', 
                  lineHeight: '1.6', 
                  background: 'var(--bg-darker)', 
                  padding: '14px', 
                  borderRadius: '10px', 
                  whiteSpace: 'pre-wrap',
                  border: '1px solid var(--border-color)'
                }}>
                  {activeModalMessage.message}
                </p>
              </div>
              <div className="admin-modal-field">
                <span className="admin-modal-label">Publish Timestamp</span>
                <span className="admin-modal-value" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {new Date(activeModalMessage.created_at).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="admin-modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="admin-btn-view" onClick={() => setActiveModalMessage(null)} style={{ padding: '8px 18px' }}>
                Close Preview
              </button>
              <button
                type="button"
                className="admin-modal-btn-reject"
                onClick={() => {
                  handleRecall(activeModalMessage.id);
                  setActiveModalMessage(null);
                }}
                style={{ padding: '8px 18px' }}
              >
                <Trash2 size={16} /> Recall Campaign
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminMessages;
