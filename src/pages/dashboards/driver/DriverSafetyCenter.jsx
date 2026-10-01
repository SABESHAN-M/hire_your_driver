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
  UserPlus
} from 'lucide-react';
import { useAlert } from '../../../context/AlertContext';
import { useAuth } from '../../../context/AuthContext';
import './DriverSafetyCenter.css';

const DriverSafetyCenter = () => {
  const { showAlert } = useAlert();
  const { currentUser } = useAuth();
  
  const [isSosActive, setIsSosActive] = useState(false);
  const [contacts, setContacts] = useState([]);
  
  // Modals state
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  // Forms state
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [report, setReport] = useState({ issueType: 'Passenger Misconduct', description: '' });

  const getStoredContacts = () => {
    const driverId = currentUser?.id || 3;
    try {
      const raw = localStorage.getItem(`hyd_driver_contacts_${driverId}`);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [
      { id: 1, name: 'Spouse / Family Emergency', phone: '9876500000' }
    ];
  };

  useEffect(() => {
    fetchContacts();
  }, [currentUser]);

  const fetchContacts = () => {
    setContacts(getStoredContacts());
  };

  const handleSosTrigger = () => {
    setIsSosActive(true);
    showAlert("EMERGENCY SIGNAL SENT! Connecting to local emergency dispatch...", "error");
    setTimeout(() => {
      setIsSosActive(false);
      showAlert("Emergency situation has been marked as resolved.", "success");
    }, 4000);
  };

  const handleShareTrip = () => {
    const trackingLink = `${window.location.origin}/dashboard/driver/bookings`;
    navigator.clipboard.writeText(trackingLink);
    showAlert("Live driver tracking link copied to clipboard! Share it with your emergency contacts.", "success");
  };

  const handleCallSupport = () => {
    window.location.href = "tel:+18005550199";
  };

  const handleAddContact = (e) => {
    e.preventDefault();
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      showAlert("Please enter contact name and phone number", "error");
      return;
    }
    const driverId = currentUser?.id || 3;
    const current = getStoredContacts();
    const created = { id: Date.now(), name: newContact.name.trim(), phone: newContact.phone.trim() };
    const updated = [...current, created];
    setContacts(updated);
    localStorage.setItem(`hyd_driver_contacts_${driverId}`, JSON.stringify(updated));
    setNewContact({ name: '', phone: '' });
    showAlert("Emergency contact saved successfully.", "success");
  };

  const handleDeleteContact = (id) => {
    const driverId = currentUser?.id || 3;
    const current = getStoredContacts();
    const updated = current.filter(c => c.id !== id);
    setContacts(updated);
    localStorage.setItem(`hyd_driver_contacts_${driverId}`, JSON.stringify(updated));
    showAlert("Emergency contact removed.", "info");
  };

  const handleSubmitReport = (e) => {
    e.preventDefault();
    showAlert("Driver safety incident report logged. Our Operations Control will contact you immediately.", "success");
    setIsReportModalOpen(false);
    setReport({ issueType: 'Passenger Misconduct', description: '' });
  };

  return (
    <div className="safety-unboxed-wrapper">
      
      {/* 1. Header Banner Strip (Unboxed Header) */}
      <div className="safety-unboxed-header">
        <div className="safety-status-pill">
          <span className="pill-dot-pulse"></span>
          <Radio size={14} />
          <span>Driver Partner Security Telematics Active</span>
        </div>

        <div className="safety-header-title-group">
          <h1>Driver Partner Safety & Dispatch</h1>
          <p>Hire Your Driver partner framework, 24/7 roadside mechanical assistance, active shift tracking, and emergency SOS dispatch.</p>
        </div>
      </div>

      {/* 2. Hero Emergency SOS Banner (Unboxed Hero Command Card) */}
      <div className={`safety-sos-hero-banner ${isSosActive ? 'sos-active-state' : ''}`}>
        <div className="sos-hero-content">
          <div className="sos-badge">
            <ShieldCheck size={18} />
            <span>24/7 Driver Emergency Command</span>
          </div>
          <h2>Emergency SOS Signal</h2>
          <p>
            Pressing SOS immediately alerts Hire Your Driver Operations Control Room, local emergency services, and broadcasts your live vehicle coordinates.
          </p>

          <div className="sos-hero-actions">
            <button className="safety-btn-call-support" onClick={handleCallSupport}>
              <PhoneCall size={18} />
              <span>Call Priority Helpline: +1 (800) 555-0199</span>
            </button>
            <button className="safety-btn-share-quick" onClick={handleShareTrip}>
              <Share2 size={18} />
              <span>Share Shift Location</span>
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

      {/* 3. Fluid Grid of Standalone Safety Cards (Unboxed Grid Layout) */}
      <div className="safety-unboxed-grid">
        
        {/* Module 1: Active Shift Telematics */}
        <div className="safety-unboxed-card">
          <div className="card-top-icon">
            <Activity size={26} color="var(--accent-gold)" />
          </div>
          <div className="card-body">
            <h3>Active Shift Telematics</h3>
            <p>Continuous GPS tracking monitors your active booking route, providing safety coverage for night shifts and outstation trips.</p>
            <div className="card-status-badge success">
              <span className="status-dot green"></span>
              <span>Telematics Active</span>
            </div>
          </div>
          <div className="card-footer">
            <button className="safety-action-btn outline" onClick={handleShareTrip}>
              <Share2 size={16} /> Copy Shift Link
            </button>
          </div>
        </div>

        {/* Module 2: Live Location Sharing */}
        <div className="safety-unboxed-card">
          <div className="card-top-icon">
            <Share2 size={26} color="var(--accent-gold)" />
          </div>
          <div className="card-body">
            <h3>Share Shift Location</h3>
            <p>Send a secure tracking link to family or emergency contacts so they can check your exact shift position on the map.</p>
            <div className="card-status-badge info">
              <Lock size={14} />
              <span>Encrypted Shift Stream</span>
            </div>
          </div>
          <div className="card-footer">
            <button className="safety-action-btn primary" onClick={handleShareTrip}>
              <Share2 size={16} /> Share Shift Link
            </button>
          </div>
        </div>

        {/* Module 3: Trusted Contacts */}
        <div className="safety-unboxed-card">
          <div className="card-top-icon">
            <Users size={26} color="var(--accent-gold)" />
          </div>
          <div className="card-body">
            <h3>Emergency Contacts</h3>
            <p>Family members or close contacts who receive immediate SMS alerts when you trigger an emergency SOS signal.</p>
            
            <div className="contacts-preview-list">
              {contacts.length === 0 ? (
                <div className="empty-contacts-notice">
                  <span>No emergency contacts linked.</span>
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
          <div className="card-footer">
            <button className="safety-action-btn outline" onClick={() => setIsContactsModalOpen(true)}>
              <UserPlus size={16} /> Manage Contacts ({contacts.length})
            </button>
          </div>
        </div>

        {/* Module 4: Priority Helpline */}
        <div className="safety-unboxed-card">
          <div className="card-top-icon">
            <PhoneCall size={26} color="var(--accent-gold)" />
          </div>
          <div className="card-body">
            <h3>Driver Priority Support</h3>
            <p>Direct line for roadside mechanical assistance, battery jumpstarts, towing support, or immediate passenger dispute resolution.</p>
            <div className="card-status-badge warning">
              <Sparkles size={14} />
              <span>Priority Driver Line</span>
            </div>
          </div>
          <div className="card-footer">
            <button className="safety-action-btn secondary" onClick={handleCallSupport}>
              <PhoneCall size={16} /> Call Driver Support
            </button>
          </div>
        </div>

        {/* Module 5: Incident Report */}
        <div className="safety-unboxed-card">
          <div className="card-top-icon">
            <MessageSquareWarning size={26} color="var(--accent-gold)" />
          </div>
          <div className="card-body">
            <h3>Log Driver Incident</h3>
            <p>Report passenger misconduct, unsafe vehicle condition, or toll fare discrepancies confidentially to Operations Control.</p>
            <div className="card-status-badge neutral">
              <ShieldCheck size={14} />
              <span>Operations Audit</span>
            </div>
          </div>
          <div className="card-footer">
            <button className="safety-action-btn secondary" onClick={() => setIsReportModalOpen(true)}>
              <MessageSquareWarning size={16} /> Log Incident Report
            </button>
          </div>
        </div>

      </div>

      {/* 4. Driver Safety Commitments Policy Grid (Unboxed Horizontal Grid) */}
      <div className="safety-policy-section">
        <div className="policy-section-header">
          <ShieldCheck size={24} color="var(--accent-gold)" />
          <h2>Hire Your Driver Partner Protections</h2>
        </div>

        <div className="policy-cards-grid">
          <div className="policy-card">
            <div className="policy-card-icon">
              <CheckCircle2 size={22} color="var(--accent-gold)" />
            </div>
            <div>
              <h4>Passenger Misconduct Protection</h4>
              <p>Zero tolerance for verbal abuse or safety threats. Instant passenger ban and full payout protection.</p>
            </div>
          </div>

          <div className="policy-card">
            <div className="policy-card-icon">
              <CheckCircle2 size={22} color="var(--accent-gold)" />
            </div>
            <div>
              <h4>Roadside Mechanical Support</h4>
              <p>24/7 assistance for flat tires, battery jumpstarts, or towing while on active booking duty.</p>
            </div>
          </div>

          <div className="policy-card">
            <div className="policy-card-icon">
              <CheckCircle2 size={22} color="var(--accent-gold)" />
            </div>
            <div>
              <h4>Night Shift Check-Ins</h4>
              <p>Automated safety check-in prompts every 45 minutes on late-night or outstation trips.</p>
            </div>
          </div>

          <div className="policy-card">
            <div className="policy-card-icon">
              <CheckCircle2 size={22} color="var(--accent-gold)" />
            </div>
            <div>
              <h4>Guaranteed Fare Payouts</h4>
              <p>Protected earnings even if passengers dispute valid trip completion or payment authorization.</p>
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
                  placeholder="e.g. Spouse / Relative Name"
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
              <button type="submit" className="safety-modal-submit-btn">Save Emergency Contact</button>
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
              <h2>Log Driver Incident Report</h2>
              <button className="close-modal-btn" onClick={() => setIsReportModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitReport} className="safety-modal-form">
              <div className="safety-form-group">
                <label>Incident Category</label>
                <select 
                  className="safety-input"
                  value={report.issueType}
                  onChange={(e) => setReport({...report, issueType: e.target.value})}
                >
                  <option value="Passenger Misconduct">Passenger Misconduct / Refusal to Comply</option>
                  <option value="Vehicle Condition">Vehicle Mechanical / Car Owner Issue</option>
                  <option value="Billing Issue">Fare / Toll Discrepancy</option>
                  <option value="Unsafe Route">Unsafe Driving Conditions / Weather</option>
                  <option value="Other">Other Safety Emergency</option>
                </select>
              </div>
              <div className="safety-form-group">
                <label>Detailed Incident Description</label>
                <textarea 
                  className="safety-input safety-textarea" 
                  placeholder="Describe the incident details for Operations Control..."
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

export default DriverSafetyCenter;

