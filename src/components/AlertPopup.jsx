import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { useAlert } from '../context/AlertContext';

const AlertPopup = () => {
  const { alert, hideAlert } = useAlert();

  if (!alert) return null;

  const isModalMode = 
    alert.mode === 'modal' || 
    /wallet|insufficient|funds|reload|top up|low balance/i.test(alert.message);

  if (isModalMode) {
    const icons = {
      success: <CheckCircle className="success-icon" size={48} style={{ color: '#2ecc71' }} />,
      error: <AlertCircle className="error-icon" size={48} style={{ color: '#e74c3c' }} />,
      info: <Info className="info-icon" size={48} style={{ color: '#3498db' }} />
    };

    const titles = {
      success: 'Success',
      error: 'Action Required',
      info: 'Notification'
    };

    return (
      <div className="modal-overlay" style={{ zIndex: 11000 }}>
        <div 
          className="modal-content" 
          style={{ 
            maxWidth: '400px', 
            padding: '32px', 
            textAlign: 'center', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            gap: '20px',
            position: 'relative'
          }}
        >
          <button 
            className="close-btn" 
            onClick={hideAlert}
            style={{ top: '16px', right: '16px', position: 'absolute' }}
          >
            <X size={20} />
          </button>

          <div style={{ marginTop: '12px' }}>
            {icons[alert.type] || icons.info}
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: alert.type === 'error' ? '#e74c3c' : alert.type === 'success' ? '#2ecc71' : 'var(--accent-gold)' }}>
            {titles[alert.type] || 'Alert'}
          </h2>

          <p style={{ fontSize: '15px', color: 'var(--text-main)', lineHeight: '1.6', margin: 0 }}>
            {alert.message}
          </p>

          <button 
            type="button" 
            onClick={hideAlert}
            style={{
              width: '100%',
              padding: '12px 24px',
              borderRadius: '12px',
              background: alert.type === 'error' ? '#e74c3c' : alert.type === 'success' ? '#2ecc71' : 'var(--accent-gold)',
              color: alert.type === 'info' ? '#000' : '#fff',
              border: 'none',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer',
              marginTop: '8px',
              transition: 'opacity 0.2s'
            }}
            onMouseOver={(e) => e.target.style.opacity = '0.9'}
            onMouseOut={(e) => e.target.style.opacity = '1'}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // Toast Layout (floating small at the top of the screen)
  const iconsToast = {
    success: <CheckCircle className="alert-icon success-icon" size={24} style={{ color: '#2ecc71', flexShrink: 0 }} />,
    error: <AlertCircle className="alert-icon error-icon" size={24} style={{ color: '#e74c3c', flexShrink: 0 }} />,
    info: <Info className="alert-icon info-icon" size={24} style={{ color: '#3498db', flexShrink: 0 }} />
  };

  return (
    <div className="alert-popup-container slide-in-top">
      <div className={`alert-toast ${alert.type}`}>
        <div className="alert-content">
          {iconsToast[alert.type] || iconsToast.info}
          <span className="alert-message">{alert.message}</span>
        </div>
        <button className="alert-close-btn" onClick={hideAlert}>
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default AlertPopup;

