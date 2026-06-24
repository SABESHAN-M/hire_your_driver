import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Upload, CheckCircle2, AlertTriangle, FileText, Eye, X } from 'lucide-react';
import { useAlert } from '../../../context/AlertContext';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../config';
import './DriverDocuments.css';

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

const DriverDocuments = () => {
  const { showAlert } = useAlert();
  const { currentUser } = useAuth();

  const [documents, setDocuments] = useState({
    license_front: { name: "Driver's License (Front)", status: 'Not Uploaded', expiry: 'N/A', file: '' },
    license_back: { name: "Driver's License (Back)", status: 'Not Uploaded', expiry: 'N/A', file: '' },
    aadhaar_front: { name: 'Aadhaar Card (Front)', status: 'Not Uploaded', expiry: 'N/A', file: '' },
    aadhaar_back: { name: 'Aadhaar Card (Back)', status: 'Not Uploaded', expiry: 'N/A', file: '' }
  });

  const [uploadingDoc, setUploadingDoc] = useState(null); // Key being uploaded
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewDoc, setPreviewDoc] = useState(null); // Modal preview state

  const fetchDocuments = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/driver/documents/${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        const docsObj = {};
        data.forEach(item => {
          docsObj[item.document_key] = {
            name: item.document_name,
            status: item.status,
            expiry: item.expiry_date,
            file: item.file_path || ''
          };
        });
        
        // Merge with defaults in case of missing keys
        const merged = {
          license_front: docsObj.license_front || { name: "Driver's License (Front)", status: 'Not Uploaded', expiry: 'N/A', file: '' },
          license_back: docsObj.license_back || { name: "Driver's License (Back)", status: 'Not Uploaded', expiry: 'N/A', file: '' },
          aadhaar_front: docsObj.aadhaar_front || { name: "Aadhaar Card (Front)", status: 'Not Uploaded', expiry: 'N/A', file: '' },
          aadhaar_back: docsObj.aadhaar_back || { name: "Aadhaar Card (Back)", status: 'Not Uploaded', expiry: 'N/A', file: '' }
        };
        setDocuments(merged);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [currentUser]);

  const handleFileChange = async (e, key) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      showAlert("File size should not exceed 10MB", "error");
      return;
    }
    
    setUploadingDoc(key);
    setUploadProgress(10);
    
    try {
      setUploadProgress(30);
      const base64Data = await fileToBase64(file);
      setUploadProgress(60);
      
      const res = await fetch(`${API_BASE_URL}/api/driver/documents/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          documentKey: key,
          filePath: base64Data
        })
      });
      
      setUploadProgress(90);
      if (res.ok) {
        const data = await res.json();
        const docsObj = {};
        data.documents.forEach(item => {
          docsObj[item.document_key] = {
            name: item.document_name,
            status: item.status,
            expiry: item.expiry_date,
            file: item.file_path || ''
          };
        });
        
        const merged = {
          license_front: docsObj.license_front || { name: "Driver's License (Front)", status: 'Not Uploaded', expiry: 'N/A', file: '' },
          license_back: docsObj.license_back || { name: "Driver's License (Back)", status: 'Not Uploaded', expiry: 'N/A', file: '' },
          aadhaar_front: docsObj.aadhaar_front || { name: "Aadhaar Card (Front)", status: 'Not Uploaded', expiry: 'N/A', file: '' },
          aadhaar_back: docsObj.aadhaar_back || { name: "Aadhaar Card (Back)", status: 'Not Uploaded', expiry: 'N/A', file: '' }
        };
        setDocuments(merged);
        setUploadingDoc(null);
        showAlert(`${merged[key].name} uploaded successfully! Pending verification review.`, "success");
        window.dispatchEvent(new Event('storage'));
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      console.error(err);
      setUploadingDoc(null);
      showAlert("Failed to upload document", "error");
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'Verified') return <CheckCircle2 size={16} color="#34c759" />;
    if (status === 'Expiring Soon') return <AlertTriangle size={16} color="#ff9500" />;
    if (status === 'Rejected') return <AlertTriangle size={16} color="#ff3b30" />;
    return <FileText size={16} color="#007aff" />;
  };

  const getStatusClass = (status) => {
    if (status === 'Verified') return 'status-verified';
    if (status === 'Expiring Soon') return 'status-expiring';
    if (status === 'Rejected') return 'status-rejected';
    return 'status-pending';
  };

  const renderDocPanel = (key) => {
    const doc = documents[key];
    if (!doc) return null;
    const isUploading = uploadingDoc === key;
    const isBase64 = doc.file && doc.file.startsWith('data:');
    
    return (
      <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: isBase64 ? '0' : '14px', borderRadius: '12px', color: 'var(--text-main)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', overflow: 'hidden', flexShrink: 0 }}>
            {isBase64 ? (
              <img src={doc.file} alt={doc.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <FileText size={32} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{doc.name}</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Expiry: {doc.expiry}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
            {getStatusIcon(doc.status)}
            <span className={`status-badge-text ${getStatusClass(doc.status)}`} style={{ fontSize: '12px', fontWeight: '600' }}>
              {doc.status}
            </span>
          </div>

          {isUploading ? (
            <div style={{ width: '120px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--accent-gold)', borderRadius: '2px', transition: 'width 0.1s ease-out' }}></div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                onClick={() => {
                  if (doc.file && doc.file !== '') {
                    setPreviewDoc({ name: doc.name, url: doc.file });
                  } else {
                    showAlert("No file uploaded yet.", "warning");
                  }
                }}
                style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '500' }}
                disabled={!doc.file}
              >
                <Eye size={14} /> View
              </button>
              
              <input 
                type="file" 
                id={`file-upload-${key}`} 
                style={{ display: 'none' }} 
                accept="image/*" 
                onChange={(e) => handleFileChange(e, key)}
              />
              <button 
                onClick={() => document.getElementById(`file-upload-${key}`).click()}
                style={{ padding: '6px 12px', background: 'var(--accent-gold)', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '600' }}
              >
                <Upload size={14} /> Upload
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="premium-dashboard">
      <div className="documents-header" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--accent-gold)', padding: '12px', borderRadius: '12px' }}>
          <ShieldCheck size={28} />
        </div>
        <div>
          <h1 style={{ margin: 0 }}>Documents & Expiry Tracking</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)' }}>Keep your identity proof documents up to date to remain active on the platform.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Section 1: Driver's License */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0 }}>
            <FileText size={20} color="var(--accent-gold)" /> Driver's License (Front & Back)
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="document-group-grid">
            {renderDocPanel('license_front')}
            {renderDocPanel('license_back')}
          </div>
        </div>

        {/* Section 2: Aadhaar Card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0 }}>
            <ShieldCheck size={20} color="var(--accent-gold)" /> Aadhaar Card (Front & Back)
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="document-group-grid">
            {renderDocPanel('aadhaar_front')}
            {renderDocPanel('aadhaar_back')}
          </div>
        </div>
      </div>

      {/* Compliance Advisory Notice */}
      <div className="booking-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginTop: '32px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ color: '#ff9500', marginTop: '2px' }}>
          <AlertTriangle size={20} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>Compliance Advisory</h3>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Please ensure all uploaded files are high-resolution, clear, and uncropped images. If any document expires or is modified, your profile will be re-submitted for administrator verification before you can take new rides.
          </p>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && createPortal(
        <div className="safety-modal-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="safety-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="safety-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>{previewDoc.name}</h2>
              <button 
                className="close-modal-btn" 
                onClick={() => setPreviewDoc(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0a0a0a', borderRadius: '12px', padding: '16px', minHeight: '300px' }}>
              {previewDoc.url.startsWith('data:application/pdf') || previewDoc.url.endsWith('.pdf') ? (
                <iframe src={previewDoc.url} title={previewDoc.name} style={{ width: '100%', height: '500px', border: 'none' }} />
              ) : (
                <img src={previewDoc.url} alt={previewDoc.name} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }} />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DriverDocuments;


