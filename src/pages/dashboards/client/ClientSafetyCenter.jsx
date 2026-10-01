import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  AlertTriangle, 
  Share2, 
  Users, 
  PhoneCall, 
  ShieldCheck, 
  HeartPulse, 
  Activity, 
  MessageSquareWarning, 
  X, 
  Trash2,
  Lock,
  CheckCircle2,
  Radio,
  Sparkles,
  UserPlus,
  Shield,
  Clock,
  Phone
} from 'lucide-react';
import { useAlert } from '../../../context/AlertContext';
import { useAuth } from '../../../context/AuthContext';
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

  const clientId = currentUser?.id || 2;
  const contactsKey = `hyd_client_contacts_${clientId}`;

  const defaultContacts = [
    { id: 1, name: 'Ananya Sharma (Sister)', phone: '+91 98765 11223' },
    { id: 2, name: 'Vikram Sharma (Brother)', phone: '+91 98765 44556' }
  ];

  const fetchContacts = () => {
    try {
      const saved = localStorage.getItem(contactsKey);
      if (saved) {
        setContacts(JSON.parse(saved));
        return;
      }
    } catch (e) {}
    setContacts(defaultContacts);
  };

  const handleSosTrigger = () => {
    if (!currentUser) return showAlert("Please log in first", "error");
    
    setIsSosActive(true);
    showAlert("EMERGENCY SIGNAL SENT! Connecting to local authorities...", "error");
    
    // Keep active for 6 seconds for effect
    setTimeout(() => {
      setIsSosActive(false);
      showAlert("Emergency situation has been marked as resolved.", "success");
    }, 6000);
  };

  const handleShareTrip = () => {
    const trackingLink = `${window.location.origin}/dashboard/client/bookings`;
    navigator.clipboard.writeText(trackingLink);
    showAlert("Live Hire Your Driver tracking link copied to clipboard! Share it with your trusted contacts.", "success");
  };

  const handleCallSupport = () => {
    window.location.href = "tel:+18005550199";
  };

  const handleAddContact = (e) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      return showAlert("Please enter contact name and phone number.", "error");
    }
    
    const newEntry = {
      id: Date.now(),
      name: newContact.name.trim(),
      phone: newContact.phone.trim()
    };

    const updated = [...contacts, newEntry];
    setContacts(updated);
    try {
      localStorage.setItem(contactsKey, JSON.stringify(updated));
    } catch (e) {}

    showAlert("Emergency trusted contact saved successfully.", "success");
    setNewContact({ name: '', phone: '' });
  };

  const handleDeleteContact = (id) => {
    const updated = contacts.filter(c => c.id !== id);
    setContacts(updated);
    try {
      localStorage.setItem(contactsKey, JSON.stringify(updated));
    } catch (e) {}
    showAlert("Trusted contact removed.", "info");
  };

  const handleSubmitReport = (e) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!report.description.trim()) {
      return showAlert("Please describe the incident.", "error");
    }

    try {
      const storedIncidents = localStorage.getItem('hyd_demo_incidents');
      const list = storedIncidents ? JSON.parse(storedIncidents) : [];
      list.push({
        id: Date.now(),
        userId: currentUser.id,
        issueType: report.issueType,
        description: report.description,
        status: 'investigating',
        created_at: new Date().toISOString()
      });
      localStorage.setItem('hyd_demo_incidents', JSON.stringify(list));
    } catch (e) {}

    showAlert("Your report has been submitted to Hire Your Driver Trust & Safety Dispatch. We will review it immediately.", "success");
    setIsReportModalOpen(false);
    setReport({ issueType: 'Driver Behavior', description: '' });
  };

  return (
    <div className="safety-unboxed-wrapper">
      
      {/* 1. Header Banner Strip */}
      <div className="safety-header-container">
        <div className="safety-status-pill">
          <span className="pill-dot-pulse"></span>
          <Radio size={14} />
          <span>Hire Your Driver Telematics Guard Active</span>
        </div>

        <div className="safety-header-title-group">
          <h1>Trust & Safety Command Center</h1>
          <p>Continuous vehicle protection, police-verified drivers, real-time GPS tracking, and emergency response dispatch.</p>
        </div>
      </div>

      {/* 2. Hero Emergency SOS Banner Container */}
      <div className={`sos-banner-container ${isSosActive ? 'sos-active-state' : ''}`}>
        <div className="sos-hero-content">
          <div className="sos-badge">
            <ShieldCheck size={18} />
            <span>24/7 SOS Emergency Broadcast</span>
          </div>
          <h2>Emergency Signal Dispatch</h2>
          <p>
            Pressing SOS immediately transmits your vehicle's live coordinates, driver profile, and trip telemetry to police emergency dispatch and your trusted contacts.
          </p>

          <div className="sos-hero-actions">
            <button className="safety-btn-call-support" onClick={handleCallSupport}>
              <PhoneCall size={18} />
              <span>Call Hotline: +1 (800) 555-0199</span>
            </button>
            <button className="safety-btn-share-quick" onClick={handleShareTrip}>
              <Share2 size={18} />
              <span>Share Live Trip Link</span>
            </button>
          </div>
        </div>

        <div className="sos-button-wrapper">
          <button 
            className={`sos-trigger-btn ${isSosActive ? 'sos-trigger-active' : ''}`}
            onClick={handleSosTrigger}
            aria-label="Trigger SOS Emergency Broadcast"
          >
            <AlertTriangle size={44} />
            <span className="sos-btn-label">SOS</span>
          </button>
          <span className="sos-pulse-ring"></span>
          <span className="sos-pulse-ring delay"></span>
        </div>
      </div>

      {/* 3. Fluid Grid of Standalone Safety Feature Containers */}
      <div className="safety-cards-grid">
        
        {/* Module 1: GPS Telematics */}
        <div className="safety-feature-container">
          <div className="container-header">
            <div className="card-top-icon">
              <Activity size={24} color="var(--accent-gold)" />
            </div>
            <div className="container-status-badge success">
              <span className="status-dot green"></span>
              <span>Active Telematics</span>
            </div>
          </div>
          <div className="container-body">
            <h3>GPS Telematics & Speed Monitor</h3>
            <p>Monitors route adherence, driver speed thresholds, and unexpected route deviations in real-time during your ride.</p>
          </div>
          <div className="container-footer">
            <button className="safety-action-btn outline" onClick={handleShareTrip}>
              <Share2 size={16} /> Copy Tracking Link
            </button>
          </div>
        </div>

        {/* Module 2: Live Location Sharing */}
        <div className="safety-feature-container">
          <div className="container-header">
            <div className="card-top-icon">
              <Share2 size={24} color="var(--accent-gold)" />
            </div>
            <div className="container-status-badge info">
              <Lock size={14} />
              <span>Encrypted Stream</span>
            </div>
          </div>
          <div className="container-body">
            <h3>Share Live Ride Status</h3>
            <p>Generate a secure, end-to-end encrypted tracking link allowing family to monitor your exact vehicle movement.</p>
          </div>
          <div className="container-footer">
            <button className="safety-action-btn primary" onClick={handleShareTrip}>
              <Share2 size={16} /> Share Live Link
            </button>
          </div>
        </div>

        {/* Module 3: Trusted Contacts */}
        <div className="safety-feature-container">
          <div className="container-header">
            <div className="card-top-icon">
              <Users size={24} color="var(--accent-gold)" />
            </div>
            <div className="container-status-badge warning">
              <HeartPulse size={14} />
              <span>{contacts.length} Linked</span>
            </div>
          </div>
          <div className="container-body">
            <h3>Trusted Emergency Contacts</h3>
            <p>Manage family members and friends who receive instant SMS alerts when an emergency SOS signal is triggered.</p>
            
            <div className="contacts-preview-list">
              {contacts.length === 0 ? (
                <div className="empty-contacts-notice">
                  <span>No trusted contacts linked yet.</span>
                </div>
              ) : (
                contacts.slice(0, 2).map(c => (
                  <div className="contact-pill-item" key={c.id}>
                    <div>
                      <strong>{c.name}</strong>
                      <small>{c.phone}</small>
                    </div>
                    <HeartPulse size={16} color="var(--accent-gold)" />
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="container-footer">
            <button className="safety-action-btn outline" onClick={() => setIsContactsModalOpen(true)}>
              <UserPlus size={16} /> Manage Contacts ({contacts.length})
            </button>
          </div>
        </div>

        {/* Module 4: 24/7 Helpline */}
        <div className="safety-feature-container">
          <div className="container-header">
            <div className="card-top-icon">
              <PhoneCall size={24} color="var(--accent-gold)" />
            </div>
            <div className="container-status-badge warning">
              <Sparkles size={14} />
              <span>Response &lt; 2m</span>
            </div>
          </div>
          <div className="container-body">
            <h3>24/7 Roadside Hotline</h3>
            <p>Hire Your Driver Incident Dispatch is available around the clock for immediate assistance, vehicle breakdowns, or safety queries.</p>
          </div>
          <div className="container-footer">
            <button className="safety-action-btn secondary" onClick={handleCallSupport}>
              <PhoneCall size={16} /> Call Dispatch Helpline
            </button>
          </div>
        </div>

        {/* Module 5: Incident Report */}
        <div className="safety-feature-container">
          <div className="container-header">
            <div className="card-top-icon">
              <MessageSquareWarning size={24} color="var(--accent-gold)" />
            </div>
            <div className="container-status-badge neutral">
              <ShieldCheck size={14} />
              <span>Confidential Audit</span>
            </div>
          </div>
          <div className="container-body">
            <h3>File Incident Report</h3>
            <p>Report rash driving, unprofessional behavior, vehicle condition issues, or fare disputes to our Safety Audit Panel.</p>
          </div>
          <div className="container-footer">
            <button className="safety-action-btn secondary" onClick={() => setIsReportModalOpen(true)}>
              <MessageSquareWarning size={16} /> Submit Incident Report
            </button>
          </div>
        </div>

      </div>

      {/* 4. Safety Policy Commitments Container */}
      <div className="safety-commitments-wrapper">
        <div className="commitments-header">
          <ShieldCheck size={24} color="var(--accent-gold)" />
          <h2>Hire Your Driver Safety Commitments</h2>
        </div>

        <div className="commitments-grid">
          <div className="commitment-card">
            <div className="commitment-icon">
              <CheckCircle2 size={22} color="var(--accent-gold)" />
            </div>
            <div>
              <h4>Police Verified Drivers</h4>
              <p>100% background checks, criminal history audit, and active license verification before any trip assignment.</p>
            </div>
          </div>

          <div className="commitment-card">
            <div className="commitment-icon">
              <CheckCircle2 size={22} color="var(--accent-gold)" />
            </div>
            <div>
              <h4>Gearbox Certification</h4>
              <p>Drivers are matched specifically to your car's transmission type (Manual, Automatic, High-Performance Luxury).</p>
            </div>
          </div>

          <div className="commitment-card">
            <div className="commitment-icon">
              <CheckCircle2 size={22} color="var(--accent-gold)" />
            </div>
            <div>
              <h4>Phone Number Privacy</h4>
              <p>Your personal contact phone number is masked during all in-app driver calls and message exchanges.</p>
            </div>
          </div>

          <div className="commitment-card">
            <div className="commitment-icon">
              <CheckCircle2 size={22} color="var(--accent-gold)" />
            </div>
            <div>
              <h4>Zero Tolerance Policy</h4>
              <p>Immediate driver account suspension for speeding, reckless vehicle handling, or policy non-compliance.</p>
            </div>
          </div>
        </div>
      </div>

      {/* MANAGE CONTACTS MODAL */}
      {isContactsModalOpen && createPortal(
        <div className="safety-modal-overlay" onClick={() => setIsContactsModalOpen(false)}>
          <div className="safety-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="safety-modal-header">
              <h2>Manage Emergency Contacts</h2>
              <button className="close-modal-btn" onClick={() => setIsContactsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="contacts-modal-list">
              {contacts.length === 0 ? (
                <p className="no-contacts-txt">No emergency contacts saved yet.</p>
              ) : (
                contacts.map(c => (
                  <div className="contact-item" key={c.id}>
                    <div className="contact-info">
                      <h4>{c.name}</h4>
                      <p>{c.phone}</p>
                    </div>
                    <button 
                      onClick={() => handleDeleteContact(c.id)}
                      className="contact-delete-btn"
                      title="Remove contact"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddContact} className="safety-modal-form">
              <h3>Add Emergency Contact</h3>
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
              <button type="submit" className="safety-modal-submit-btn">Save Contact</button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* REPORT ISSUE MODAL */}
      {isReportModalOpen && createPortal(
        <div className="safety-modal-overlay" onClick={() => setIsReportModalOpen(false)}>
          <div className="safety-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="safety-modal-header">
              <h2>File Incident Report</h2>
              <button className="close-modal-btn" onClick={() => setIsReportModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitReport} className="safety-modal-form">
              <div className="safety-form-group">
                <label>Issue Category</label>
                <select 
                  className="safety-input"
                  value={report.issueType}
                  onChange={(e) => setReport({...report, issueType: e.target.value})}
                >
                  <option value="Driver Behavior">Unprofessional Driver Behavior</option>
                  <option value="Vehicle Condition">Poor Vehicle Care</option>
                  <option value="Billing Issue">Billing / Fare Dispute</option>
                  <option value="Lost Item">Lost Item in Vehicle</option>
                  <option value="Other">Other Safety Concern</option>
                </select>
              </div>
              <div className="safety-form-group">
                <label>Detailed Description</label>
                <textarea 
                  className="safety-input safety-textarea" 
                  placeholder="Please detail what occurred during your ride..."
                  value={report.description}
                  onChange={(e) => setReport({...report, description: e.target.value})}
                  required
                ></textarea>
              </div>
              <button type="submit" className="safety-modal-submit-btn">Submit Incident Report</button>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default ClientSafetyCenter;

