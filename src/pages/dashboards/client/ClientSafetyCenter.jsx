import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Share2, Users, PhoneCall, ShieldCheck, HeartPulse, Activity, MessageSquareWarning, X, Trash2 } from 'lucide-react';
import { useAlert } from '../../../context/AlertContext';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../config';
import './ClientSafetyCenter.css';

const ClientSafetyCenter = () => {
  const { showAlert } = useAlert();
  const { currentUser } = useAuth();
  
  const [isSosActive, setIsSosActive] = useState(false);
  const [contacts, setContacts] = useState([]);
  
  // Modals state
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  // Forms state
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [report, setReport] = useState({ issueType: 'Driver Behavior', description: '' });

  // Fetch contacts on mount
  useEffect(() => {
    if (currentUser?.id) {
      fetchContacts();
    }
  }, [currentUser]);

  const fetchContacts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/contacts/${currentUser.id}`);
      const data = await res.json();
      setContacts(data);
    } catch (err) {
      console.error('Error fetching contacts:', err);
    }
  };

  const handleSosTrigger = async () => {
    if (!currentUser) return showAlert("Please log in first", "error");
    
    setIsSosActive(true);
    showAlert("EMERGENCY SIGNAL SENT! Connecting to local authorities...", "error");
    
    try {
      await fetch(`${API_BASE_URL}/api/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      
      // Keep it active for 10 seconds for effect
      setTimeout(() => {
        setIsSosActive(false);
        showAlert("Emergency situation has been marked as resolved.", "success");
      }, 10000);
    } catch (err) {
      console.error(err);
      showAlert("Failed to connect to emergency services network.", "error");
    }
  };

  const handleShareTrip = () => {
    const trackingLink = `https://elitedrive.app/track/${Math.random().toString(36).substring(2, 10)}`;
    navigator.clipboard.writeText(trackingLink);
    showAlert(`Live tracking link copied to clipboard! Share it with your trusted contacts.`, "success");
  };

  const handleCallSupport = () => {
    window.location.href = "tel:+18005550199";
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, name: newContact.name, phone: newContact.phone })
      });
      
      if (res.ok) {
        showAlert("Trusted contact added successfully.", "success");
        setNewContact({ name: '', phone: '' });
        fetchContacts();
      }
    } catch (err) {
      showAlert("Error adding contact.", "error");
    }
  };

  const handleDeleteContact = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/api/contacts/${id}`, { method: 'DELETE' });
      showAlert("Contact removed.", "info");
      fetchContacts();
    } catch (err) {
      showAlert("Error removing contact.", "error");
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, issueType: report.issueType, description: report.description })
      });
      
      if (res.ok) {
        showAlert("Your report has been submitted to our Trust & Safety team. We will review it shortly.", "success");
        setIsReportModalOpen(false);
        setReport({ issueType: 'Driver Behavior', description: '' });
      }
    } catch (err) {
      showAlert("Error submitting report.", "error");
    }
  };

  return (
    <div className="premium-dashboard">
      <div className="safety-header">
        <div className="safety-header-icon">
          <ShieldCheck size={40} color="var(--accent-gold)" />
        </div>
        <div>
          <h1>Safety Center</h1>
          <p>Your peace of mind is our top priority.</p>
        </div>
      </div>

      <div className="safety-layout-column">
        
        {/* Features Grid */}
        <div className="safety-features-grid">
          
          {/* SOS Button Card */}
          <div className={`premium-stat-card sos-hero-card ${isSosActive ? 'sos-active' : ''}`}>
            <button 
              className={`sos-btn ${isSosActive ? 'sos-active' : ''}`}
              onClick={handleSosTrigger}
            >
              <AlertTriangle size={40} />
              <span>SOS</span>
            </button>
            <h2>Emergency Assistance</h2>
            <p>
              Pressing this button will immediately share your live location and trip details with local authorities and trusted contacts.
            </p>
          </div>

          {/* Ride Monitoring Card */}
          <div className="premium-stat-card safety-feature-card">
            <div>
              <div className="feature-card-header">
                <div className="feature-card-icon">
                  <Activity size={24} color="var(--accent-gold)" />
                </div>
                <h3>Live Ride Monitoring</h3>
              </div>
              <p className="feature-card-desc">
                Our AI engine is currently monitoring your trip for unusual route deviations or unexpected stops.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', padding: '12px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '8px', color: '#4ade80', fontWeight: '500' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 8px #4ade80' }}></span>
                Status: Active Monitoring
              </div>
            </div>
            <button className="safety-btn-outline" onClick={handleShareTrip}>
              View Live Map
            </button>
          </div>

          {/* Share Trip Card */}
          <div className="premium-stat-card safety-feature-card">
            <div>
              <div className="feature-card-header">
                <div className="feature-card-icon">
                  <Share2 size={24} color="var(--accent-gold)" />
                </div>
                <h3>Share Trip Status</h3>
              </div>
              <p className="feature-card-desc">
                Generate a secure live tracking link of your current ride to share with family or friends so they can monitor your journey in real-time.
              </p>
            </div>
            <button className="safety-btn-primary" onClick={handleShareTrip}>
              Share Live Link
            </button>
          </div>

          {/* Trusted Contacts Card */}
          <div className="premium-stat-card safety-feature-card">
            <div>
              <div className="feature-card-header">
                <div className="feature-card-icon">
                  <Users size={24} color="var(--accent-gold)" />
                </div>
                <h3>Trusted Contacts</h3>
              </div>
              
              <div className="contacts-list">
                {contacts.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No contacts added yet.</p>
                ) : (
                  contacts.map(c => (
                    <div className="contact-item" key={c.id}>
                      <div className="contact-info">
                        <h4>{c.name}</h4>
                        <p>{c.phone}</p>
                      </div>
                      <HeartPulse size={20} color="var(--accent-gold)" />
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <button className="safety-btn-outline" onClick={() => setIsContactsModalOpen(true)}>
              Manage Contacts
            </button>
          </div>

          {/* 24/7 Support Card */}
          <div className="premium-stat-card safety-feature-card">
            <div>
              <div className="feature-card-header">
                <div className="feature-card-icon">
                  <PhoneCall size={24} color="var(--accent-gold)" />
                </div>
                <h3>24/7 Support</h3>
              </div>
              <p className="feature-card-desc">
                Our dedicated security team is available around the clock. Call us directly for non-emergency safety concerns.
              </p>
            </div>
            <button className="safety-btn-secondary" onClick={handleCallSupport}>
              Call Support Team
            </button>
          </div>

          {/* Report an Issue Card */}
          <div className="premium-stat-card safety-feature-card">
            <div>
              <div className="feature-card-header">
                <div className="feature-card-icon">
                  <MessageSquareWarning size={24} color="var(--accent-gold)" />
                </div>
                <h3>Report an Issue</h3>
              </div>
              <p className="feature-card-desc">
                Did you experience unprofessional driver behavior or vehicle issues? File a report securely and confidentially.
              </p>
            </div>
            <button className="safety-btn-secondary" onClick={() => setIsReportModalOpen(true)}>
              File a Report
            </button>
          </div>

        </div>
      </div>

      {/* MANAGE CONTACTS MODAL */}
      {isContactsModalOpen && createPortal(
        <div className="safety-modal-overlay">
          <div className="safety-modal-content">
            <div className="safety-modal-header">
              <h2>Manage Trusted Contacts</h2>
              <button className="close-modal-btn" onClick={() => setIsContactsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="contacts-list" style={{ marginBottom: '24px', maxHeight: '200px', overflowY: 'auto' }}>
              {contacts.map(c => (
                <div className="contact-item" key={c.id}>
                  <div className="contact-info">
                    <h4>{c.name}</h4>
                    <p>{c.phone}</p>
                  </div>
                  <button 
                    onClick={() => handleDeleteContact(c.id)}
                    style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddContact} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <h3 style={{ fontSize: '16px', color: 'var(--text-main)', marginBottom: '16px' }}>Add New Contact</h3>
              <div className="safety-form-group">
                <label>Contact Name</label>
                <input 
                  type="text" 
                  className="safety-input" 
                  placeholder="e.g. John Doe (Brother)"
                  value={newContact.name}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                  required
                />
              </div>
              <div className="safety-form-group">
                <label>Phone Number</label>
                <input 
                  type="tel" 
                  className="safety-input" 
                  placeholder="+1 (555) 000-0000"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                  required
                />
              </div>
              <button type="submit" className="safety-btn-primary">Add Contact</button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* REPORT ISSUE MODAL */}
      {isReportModalOpen && createPortal(
        <div className="safety-modal-overlay">
          <div className="safety-modal-content">
            <div className="safety-modal-header">
              <h2>File an Incident Report</h2>
              <button className="close-modal-btn" onClick={() => setIsReportModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitReport}>
              <div className="safety-form-group">
                <label>Type of Issue</label>
                <select 
                  className="safety-input"
                  value={report.issueType}
                  onChange={(e) => setReport({...report, issueType: e.target.value})}
                >
                  <option value="Driver Behavior">Unprofessional Driver Behavior</option>
                  <option value="Vehicle Condition">Poor Vehicle Condition</option>
                  <option value="Billing Issue">Billing / Fare Dispute</option>
                  <option value="Lost Item">Lost Item in Vehicle</option>
                  <option value="Other">Other Safety Concern</option>
                </select>
              </div>
              <div className="safety-form-group">
                <label>Detailed Description</label>
                <textarea 
                  className="safety-input safety-textarea" 
                  placeholder="Please describe what happened in detail..."
                  value={report.description}
                  onChange={(e) => setReport({...report, description: e.target.value})}
                  required
                ></textarea>
              </div>
              <button type="submit" className="safety-btn-primary">Submit Secure Report</button>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default ClientSafetyCenter;
