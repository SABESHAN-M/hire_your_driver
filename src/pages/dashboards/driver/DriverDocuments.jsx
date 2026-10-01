import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Upload, CheckCircle2, AlertTriangle, FileText, Eye, X } from 'lucide-react';
import { useAlert } from '../../../context/AlertContext';
import { useAuth } from '../../../context/AuthContext';
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
  const { currentUser, openLogin } = useAuth();

  // SVG demo document images — lightweight inline placeholders shown until driver uploads real files
  const DEMO_IMAGES = {
    license_front: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
  <defs>
    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a237e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0d47a1;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="stripe" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#d4af37;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#f9d030;stop-opacity:0.9" />
    </linearGradient>
  </defs>
  <rect width="600" height="380" rx="18" fill="url(#cardBg)"/>
  <rect x="0" y="0" width="600" height="8" rx="4" fill="url(#stripe)"/>
  <rect x="0" y="372" width="600" height="8" rx="4" fill="url(#stripe)"/>
  <!-- Header -->
  <circle cx="50" cy="50" r="22" fill="none" stroke="#d4af37" stroke-width="2"/>
  <text x="50" y="55" font-family="Arial" font-size="14" fill="#d4af37" text-anchor="middle" font-weight="bold">IND</text>
  <text x="140" y="38" font-family="Arial" font-size="11" fill="#d4af37" font-weight="bold" letter-spacing="2">GOVERNMENT OF INDIA</text>
  <text x="140" y="58" font-family="Arial" font-size="18" fill="#ffffff" font-weight="bold" letter-spacing="1">DRIVING LICENCE</text>
  <!-- Photo box -->
  <rect x="24" y="90" width="110" height="140" rx="8" fill="#0a1560" stroke="#d4af37" stroke-width="1.5"/>
  <circle cx="79" cy="138" r="30" fill="#1e3a8a"/>
  <circle cx="79" cy="110" r="18" fill="#3b5ba5"/>
  <text x="79" y="220" font-family="Arial" font-size="9" fill="#d4af37" text-anchor="middle">PHOTO</text>
  <!-- Fields -->
  <text x="155" y="105" font-family="Arial" font-size="10" fill="#90caf9">Name</text>
  <text x="155" y="120" font-family="Arial" font-size="14" fill="#ffffff" font-weight="bold">Rajesh Kumar</text>
  <text x="155" y="145" font-family="Arial" font-size="10" fill="#90caf9">Date of Birth</text>
  <text x="155" y="160" font-family="Arial" font-size="13" fill="#ffffff">15 / 04 / 1988</text>
  <text x="155" y="183" font-family="Arial" font-size="10" fill="#90caf9">Gender</text>
  <text x="155" y="198" font-family="Arial" font-size="13" fill="#ffffff">Male</text>
  <text x="155" y="221" font-family="Arial" font-size="10" fill="#90caf9">Blood Group</text>
  <text x="155" y="236" font-family="Arial" font-size="13" fill="#ffffff">B+</text>
  <!-- Licence No -->
  <rect x="24" y="250" width="552" height="1" fill="#d4af37" opacity="0.4"/>
  <text x="24" y="272" font-family="Arial" font-size="10" fill="#90caf9">Licence No.</text>
  <text x="24" y="290" font-family="Arial" font-size="14" fill="#d4af37" font-weight="bold" letter-spacing="1">KA-05 2018 0012345</text>
  <text x="320" y="272" font-family="Arial" font-size="10" fill="#90caf9">Valid Till</text>
  <text x="320" y="290" font-family="Arial" font-size="14" fill="#ffffff" font-weight="bold">31 / 12 / 2028</text>
  <!-- Address -->
  <text x="24" y="318" font-family="Arial" font-size="10" fill="#90caf9">Address</text>
  <text x="24" y="335" font-family="Arial" font-size="11" fill="#ffffff">42, Lalbagh Road, Bangalore – 560001, Karnataka</text>
  <!-- Holographic strip -->
  <rect x="556" y="90" width="20" height="200" rx="4" fill="url(#stripe)" opacity="0.5"/>
</svg>`)}`,

    license_back: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
  <defs>
    <linearGradient id="cardBg2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a237e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0d47a1;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="600" height="380" rx="18" fill="url(#cardBg2)"/>
  <rect x="0" y="0" width="600" height="8" rx="4" fill="#d4af37"/>
  <rect x="0" y="372" width="600" height="8" rx="4" fill="#d4af37"/>
  <text x="300" y="45" font-family="Arial" font-size="14" fill="#d4af37" text-anchor="middle" font-weight="bold" letter-spacing="2">DRIVING LICENCE — BACK</text>
  <!-- Vehicle class table -->
  <rect x="24" y="65" width="552" height="180" rx="8" fill="#0a1560" stroke="#d4af37" stroke-width="1" opacity="0.8"/>
  <text x="300" y="88" font-family="Arial" font-size="11" fill="#90caf9" text-anchor="middle" font-weight="bold">CLASS OF VEHICLES AUTHORISED</text>
  <line x1="24" y1="96" x2="576" y2="96" stroke="#d4af37" stroke-width="0.5" opacity="0.5"/>
  <text x="60" y="115" font-family="Arial" font-size="11" fill="#90caf9">Class</text>
  <text x="250" y="115" font-family="Arial" font-size="11" fill="#90caf9">Description</text>
  <text x="480" y="115" font-family="Arial" font-size="11" fill="#90caf9">Valid From</text>
  <line x1="24" y1="122" x2="576" y2="122" stroke="#d4af37" stroke-width="0.5" opacity="0.3"/>
  <text x="60" y="142" font-family="Arial" font-size="12" fill="#ffffff" font-weight="bold">LMV</text>
  <text x="250" y="142" font-family="Arial" font-size="11" fill="#ffffff">Light Motor Vehicle</text>
  <text x="480" y="142" font-family="Arial" font-size="11" fill="#ffffff">01/06/2010</text>
  <text x="60" y="168" font-family="Arial" font-size="12" fill="#ffffff" font-weight="bold">MCWG</text>
  <text x="250" y="168" font-family="Arial" font-size="11" fill="#ffffff">Motorcycle With Gear</text>
  <text x="480" y="168" font-family="Arial" font-size="11" fill="#ffffff">01/06/2010</text>
  <text x="60" y="194" font-family="Arial" font-size="12" fill="#ffffff" font-weight="bold">TRANS</text>
  <text x="250" y="194" font-family="Arial" font-size="11" fill="#ffffff">Transport Vehicle</text>
  <text x="480" y="194" font-family="Arial" font-size="11" fill="#ffffff">15/03/2015</text>
  <text x="60" y="220" font-family="Arial" font-size="12" fill="#ffffff" font-weight="bold">HMV</text>
  <text x="250" y="220" font-family="Arial" font-size="11" fill="#ffffff">Heavy Motor Vehicle</text>
  <text x="480" y="220" font-family="Arial" font-size="11" fill="#ffffff">15/03/2015</text>
  <!-- Signature -->
  <text x="24" y="278" font-family="Arial" font-size="10" fill="#90caf9">Holder's Signature</text>
  <path d="M 24 295 Q 60 270 100 290 Q 140 310 180 285" stroke="#ffffff" stroke-width="2" fill="none"/>
  <line x1="24" y1="308" x2="200" y2="308" stroke="#d4af37" stroke-width="0.5"/>
  <!-- Issuing Authority -->
  <text x="400" y="278" font-family="Arial" font-size="10" fill="#90caf9">Issuing Authority</text>
  <text x="400" y="296" font-family="Arial" font-size="12" fill="#ffffff">RTO Bangalore South</text>
  <text x="400" y="312" font-family="Arial" font-size="10" fill="#90caf9">Date of Issue: 01/06/2010</text>
  <!-- QR code placeholder -->
  <rect x="24" y="325" width="50" height="50" rx="4" fill="#0a1560" stroke="#d4af37" stroke-width="1"/>
  <text x="49" y="355" font-family="Arial" font-size="8" fill="#d4af37" text-anchor="middle">QR</text>
</svg>`)}`,

    aadhaar_front: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
  <defs>
    <linearGradient id="aadhaarBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f8f9fa;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e3f2fd;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="600" height="380" rx="18" fill="url(#aadhaarBg)"/>
  <rect x="0" y="0" width="600" height="70" rx="14" fill="#1565c0"/>
  <!-- UIDAI Logo area -->
  <circle cx="42" cy="35" r="24" fill="#ffffff" opacity="0.15"/>
  <text x="42" y="40" font-family="Arial" font-size="11" fill="#ffffff" text-anchor="middle" font-weight="bold">UIDAI</text>
  <text x="140" y="26" font-family="Arial" font-size="10" fill="#90caf9" letter-spacing="1">भारत सरकार | GOVERNMENT OF INDIA</text>
  <text x="140" y="50" font-family="Arial" font-size="22" fill="#ffffff" font-weight="bold">आधार</text>
  <text x="260" y="50" font-family="Arial" font-size="22" fill="#ffffff" font-weight="bold">Aadhaar</text>
  <!-- Photo box -->
  <rect x="24" y="90" width="110" height="140" rx="8" fill="#e3f2fd" stroke="#1565c0" stroke-width="2"/>
  <circle cx="79" cy="138" r="30" fill="#bbdefb"/>
  <circle cx="79" cy="112" r="18" fill="#90caf9"/>
  <text x="79" y="220" font-family="Arial" font-size="9" fill="#1565c0" text-anchor="middle" font-weight="bold">PHOTO</text>
  <!-- Personal Details -->
  <text x="155" y="105" font-family="Arial" font-size="10" fill="#546e7a">Name / नाम</text>
  <text x="155" y="122" font-family="Arial" font-size="16" fill="#1a1a2e" font-weight="bold">Rajesh Kumar</text>
  <text x="155" y="148" font-family="Arial" font-size="10" fill="#546e7a">Date of Birth / जन्म तिथि</text>
  <text x="155" y="165" font-family="Arial" font-size="14" fill="#1a1a2e">15/04/1988</text>
  <text x="155" y="190" font-family="Arial" font-size="10" fill="#546e7a">Gender / लिंग</text>
  <text x="155" y="207" font-family="Arial" font-size="14" fill="#1a1a2e">Male / पुरुष</text>
  <!-- Aadhaar Number -->
  <rect x="24" y="248" width="552" height="2" fill="#1565c0" opacity="0.2"/>
  <text x="300" y="275" font-family="Arial" font-size="11" fill="#546e7a" text-anchor="middle">Aadhaar Number / आधार संख्या</text>
  <text x="300" y="305" font-family="Arial" font-size="28" fill="#1565c0" text-anchor="middle" font-weight="bold" letter-spacing="6">1234 5678 9012</text>
  <!-- QR Code placeholder -->
  <rect x="490" y="240" width="86" height="86" rx="6" fill="#f5f5f5" stroke="#1565c0" stroke-width="1.5"/>
  <rect x="498" y="248" width="20" height="20" rx="2" fill="#1565c0"/>
  <rect x="550" y="248" width="20" height="20" rx="2" fill="#1565c0"/>
  <rect x="498" y="298" width="20" height="20" rx="2" fill="#1565c0"/>
  <rect x="516" y="266" width="36" height="4" rx="1" fill="#1565c0"/>
  <rect x="516" y="274" width="24" height="4" rx="1" fill="#1565c0"/>
  <rect x="516" y="282" width="30" height="4" rx="1" fill="#1565c0"/>
  <text x="533" y="338" font-family="Arial" font-size="8" fill="#546e7a" text-anchor="middle">Scan QR Code</text>
  <!-- Footer -->
  <text x="24" y="352" font-family="Arial" font-size="9" fill="#78909c">This is to certify that the Aadhaar number and details above belong to the above mentioned individual.</text>
</svg>`)}`,

    aadhaar_back: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380">
  <defs>
    <linearGradient id="aadhaarBack" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f8f9fa;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e8eaf6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="600" height="380" rx="18" fill="url(#aadhaarBack)"/>
  <rect x="0" y="0" width="600" height="70" rx="14" fill="#1565c0"/>
  <text x="300" y="32" font-family="Arial" font-size="11" fill="#90caf9" text-anchor="middle" letter-spacing="1">भारत सरकार | GOVERNMENT OF INDIA</text>
  <text x="300" y="55" font-family="Arial" font-size="20" fill="#ffffff" font-weight="bold" text-anchor="middle">आधार  Aadhaar — Back</text>
  <!-- Address Section -->
  <text x="24" y="105" font-family="Arial" font-size="11" fill="#546e7a" font-weight="bold">Address / पता</text>
  <rect x="24" y="112" width="380" height="120" rx="8" fill="#e3f2fd" stroke="#1565c0" stroke-width="1" opacity="0.7"/>
  <text x="36" y="132" font-family="Arial" font-size="12" fill="#1a1a2e">42, Lalbagh Road</text>
  <text x="36" y="152" font-family="Arial" font-size="12" fill="#1a1a2e">Bangalore South, Karnataka</text>
  <text x="36" y="172" font-family="Arial" font-size="12" fill="#1a1a2e">PIN: 560001</text>
  <text x="36" y="198" font-family="Arial" font-size="11" fill="#546e7a">INDIA</text>
  <text x="36" y="220" font-family="Arial" font-size="11" fill="#546e7a">Mobile: +91 98765 43210</text>
  <!-- Large QR Code -->
  <rect x="430" y="90" width="146" height="146" rx="8" fill="#ffffff" stroke="#1565c0" stroke-width="2"/>
  <rect x="440" y="100" width="36" height="36" rx="3" fill="#1565c0"/>
  <rect x="440" y="200" width="36" height="36" rx="3" fill="#1565c0"/>
  <rect x="540" y="100" width="36" height="36" rx="3" fill="#1565c0"/>
  <rect x="480" y="108" width="50" height="5" rx="1" fill="#1565c0"/>
  <rect x="480" y="118" width="36" height="5" rx="1" fill="#1565c0"/>
  <rect x="480" y="128" width="44" height="5" rx="1" fill="#1565c0"/>
  <rect x="440" y="148" width="126" height="5" rx="1" fill="#1565c0"/>
  <rect x="440" y="158" width="80" height="5" rx="1" fill="#1565c0"/>
  <rect x="440" y="168" width="100" height="5" rx="1" fill="#1565c0"/>
  <rect x="480" y="200" width="96" height="36" rx="3" fill="#e3f2fd"/>
  <text x="528" y="223" font-family="Arial" font-size="9" fill="#546e7a" text-anchor="middle">QR Data</text>
  <text x="503" y="252" font-family="Arial" font-size="8" fill="#546e7a" text-anchor="middle">Scan for verification</text>
  <!-- Aadhaar Number -->
  <text x="24" y="268" font-family="Arial" font-size="10" fill="#546e7a">Aadhaar Number / आधार संख्या</text>
  <text x="24" y="292" font-family="Arial" font-size="24" fill="#1565c0" font-weight="bold" letter-spacing="4">1234  5678  9012</text>
  <!-- Disclaimer -->
  <rect x="24" y="310" width="552" height="50" rx="8" fill="#fff3e0" stroke="#ff9800" stroke-width="1" opacity="0.8"/>
  <text x="36" y="328" font-family="Arial" font-size="9" fill="#e65100" font-weight="bold">Important Notice:</text>
  <text x="36" y="342" font-family="Arial" font-size="9" fill="#bf360c">This Aadhaar is not a proof of citizenship. It only certifies identity as registered with UIDAI.</text>
  <text x="36" y="355" font-family="Arial" font-size="9" fill="#bf360c">www.uidai.gov.in | 1947 (Toll Free)</text>
</svg>`)}`,
  };

  const [documents, setDocuments] = useState({
    license_front: { name: "Driver's License (Front)", status: 'Not Uploaded', expiry: 'N/A', file: '' },
    license_back: { name: "Driver's License (Back)", status: 'Not Uploaded', expiry: 'N/A', file: '' },
    aadhaar_front: { name: 'Aadhaar Card (Front)', status: 'Not Uploaded', expiry: 'N/A', file: '' },
    aadhaar_back: { name: 'Aadhaar Card (Back)', status: 'Not Uploaded', expiry: 'N/A', file: '' }
  });

  const [uploadingDoc, setUploadingDoc] = useState(null); // Key being uploaded
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewDoc, setPreviewDoc] = useState(null); // Modal preview state

  const fetchDocuments = () => {
    const driverId = currentUser?.id || 3;
    // Default docs include demo SVG images to give a realistic preview out-of-the-box
    const defaultDocs = {
      license_front: { name: "Driver's License (Front)", status: 'Verified', expiry: '2028-12-31', file: DEMO_IMAGES.license_front },
      license_back: { name: "Driver's License (Back)", status: 'Verified', expiry: '2028-12-31', file: DEMO_IMAGES.license_back },
      aadhaar_front: { name: 'Aadhaar Card (Front)', status: 'Verified', expiry: 'N/A', file: DEMO_IMAGES.aadhaar_front },
      aadhaar_back: { name: 'Aadhaar Card (Back)', status: 'Verified', expiry: 'N/A', file: DEMO_IMAGES.aadhaar_back }
    };

    try {
      const raw = localStorage.getItem(`hyd_driver_documents_${driverId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Merge: preserve demo images for any doc that hasn't had a real upload
        const merged = Object.keys(defaultDocs).reduce((acc, key) => {
          acc[key] = parsed[key]?.file && parsed[key].file !== ''
            ? parsed[key]
            : defaultDocs[key];
          return acc;
        }, {});
        setDocuments(merged);
        return;
      }
    } catch (e) {}

    setDocuments(defaultDocs);
  };

  useEffect(() => {
    fetchDocuments();
  }, [currentUser]);

  const handleFileChange = async (e, key) => {
    const driverId = currentUser?.id || 3;
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      showAlert("File size should not exceed 10MB", "error");
      return;
    }
    
    setUploadingDoc(key);
    setUploadProgress(30);
    
    try {
      const base64Data = await fileToBase64(file);
      setUploadProgress(80);
      
      const updatedDoc = {
        ...documents[key],
        status: 'Pending Verification',
        file: base64Data
      };
      const newDocs = { ...documents, [key]: updatedDoc };
      setDocuments(newDocs);
      localStorage.setItem(`hyd_driver_documents_${driverId}`, JSON.stringify(newDocs));

      setUploadProgress(100);
      setTimeout(() => {
        setUploadingDoc(null);
        setUploadProgress(0);
        showAlert(`Successfully uploaded ${documents[key]?.name || 'document'}! Under verification.`, "success");
        window.dispatchEvent(new Event('storage'));
      }, 400);
    } catch (err) {
      console.error(err);
      setUploadingDoc(null);
      setUploadProgress(0);
      showAlert("Error processing file upload", "error");
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


