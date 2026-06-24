import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Camera, CheckCircle2, Upload } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import './Auth.css';

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

const Signup = ({ isOpen, onClose, onSwitchToLogin, defaultRole = 'client' }) => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { login } = useAuth();
  const phoneInputRef = useRef(null);
  const [role, setRole] = useState(defaultRole);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phoneNumber: '',
    licenseNumber: '',
    profilePhoto: null,
    aadhaarFront: null,
    aadhaarBack: null,
    licenseFront: null,
    licenseBack: null
  });

  const [countryCode, setCountryCode] = useState('+91');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);

  useEffect(() => {
    setRole(defaultRole);
  }, [defaultRole]);

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phoneNumber: '',
        licenseNumber: '',
        profilePhoto: null,
        aadhaarFront: null,
        aadhaarBack: null,
        licenseFront: null,
        licenseBack: null
      });
      setCountryCode('+91');
      setOtpSent(false);
      setOtp('');
      setOtpVerified(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSendOtp = () => {
    if (formData.phoneNumber.length >= 10) {
      setOtpSent(true);
      // Simulate OTP being sent
      showAlert("OTP sent successfully!", "success");
    } else {
      showAlert("Please enter a valid phone number.", "error");
    }
  };

  const handleVerifyOtp = () => {
    if (otp === '1234') { // Mock verification
      setOtpVerified(true);
      showAlert("Phone number verified!", "success");
    } else {
      showAlert("Invalid OTP. Hint: use 1234", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otpVerified) {
      showAlert("Please verify your phone number using OTP first.", "error");
      return;
    }
    
    let profilePhotoBase64 = null;
    let licenseFrontBase64 = null;
    let licenseBackBase64 = null;
    let aadhaarFrontBase64 = null;
    let aadhaarBackBase64 = null;

    try {
      if (formData.profilePhoto) profilePhotoBase64 = await fileToBase64(formData.profilePhoto);
      if (formData.licenseFront) licenseFrontBase64 = await fileToBase64(formData.licenseFront);
      if (formData.licenseBack) licenseBackBase64 = await fileToBase64(formData.licenseBack);
      if (formData.aadhaarFront) aadhaarFrontBase64 = await fileToBase64(formData.aadhaarFront);
      if (formData.aadhaarBack) aadhaarBackBase64 = await fileToBase64(formData.aadhaarBack);
    } catch (err) {
      console.error("Error reading files:", err);
      showAlert("Failed to process document files. Please try again.", "error");
      return;
    }

    // Combine country code and phone number on submit
    const submissionData = { 
      ...formData, 
      phoneNumber: `${countryCode}${formData.phoneNumber}`,
      role,
      profilePhoto: profilePhotoBase64,
      licenseFront: licenseFrontBase64,
      licenseBack: licenseBackBase64,
      aadhaarFront: aadhaarFrontBase64,
      aadhaarBack: aadhaarBackBase64
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (role === 'driver') {
          // Drivers must wait for admin approval before they can login
          showAlert("Account created successfully! Your profile and documents are now pending administrator verification. You will be able to login once approved.", "success");
          onClose();
        } else {
          login({ id: data.userId, role, firstName: formData.firstName, lastName: formData.lastName });
          showAlert("Account created successfully!", "success");
          console.log('Signup success:', data);
          onClose();
          navigate(`/dashboard/${role}`);
        }
      } else {
        showAlert(data.error || "Failed to create account.", "error");
      }
    } catch (err) {
      console.error("Signup failed:", err);
      showAlert("Network error. Please make sure the backend server and XAMPP MySQL are running.", "error");
    }
  };

  const renderDocumentUpload = (label, name, id) => {
    const file = formData[name];
    const handleCardClick = () => {
      document.getElementById(id).click();
    };

    return (
      <div className="form-group document-upload-group">
        <label htmlFor={id}>{label}</label>
        <div 
          className={`document-upload-card ${file ? 'has-file' : ''}`}
          onClick={handleCardClick}
        >
          {file ? (
            <div className="file-preview-content">
              <img 
                src={URL.createObjectURL(file)} 
                alt={`${label} Preview`} 
                className="document-thumbnail" 
              />
              <div className="file-info">
                <span className="file-name">{file.name}</span>
                <span className="file-status-success">Selected</span>
              </div>
            </div>
          ) : (
            <div className="upload-placeholder">
              <Upload size={18} className="upload-icon" />
              <span>Upload Document</span>
            </div>
          )}
          <input 
            type="file" 
            id={id} 
            name={name}
            accept="image/*"
            onChange={handleChange}
            className="file-input-hidden"
            required={!file}
          />
        </div>
      </div>
    );
  };

  const handleOverlayClick = (e) => {
    if (e.target.className === 'modal-overlay') {
      onClose();
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="auth-card modal-content auth-modal-signup">
        <button className="close-btn" onClick={onClose}><X size={24} /></button>
        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Join our premium driver hiring platform</p>
          {role === 'driver' && <span className="driver-badge">Driver Registration</span>}
        </div>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>I want to...</label>
            <div className="role-toggle-group">
              <button type="button" className={`role-toggle-btn ${role === 'client' ? 'active' : ''}`} onClick={() => setRole('client')}>Hire a Driver</button>
              <button type="button" className={`role-toggle-btn ${role === 'driver' ? 'active' : ''}`} onClick={() => setRole('driver')}>Work as a Driver</button>
            </div>
          </div>

          <div className="avatar-upload-container">
            <div className="avatar-preview" onClick={() => document.getElementById('profilePhoto').click()}>
              {formData.profilePhoto ? (
                <img src={URL.createObjectURL(formData.profilePhoto)} alt="Profile Preview" className="avatar-image" />
              ) : (
                <div className="avatar-placeholder">
                  <Camera size={28} />
                  <span>Photo</span>
                </div>
              )}
            </div>
            <input 
              type="file" 
              id="profilePhoto" 
              name="profilePhoto"
              accept="image/*"
              onChange={handleChange}
              className="file-input-hidden"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input 
                type="text" 
                id="firstName" 
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="First Name" 
                required 
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input 
                type="text" 
                id="lastName" 
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Last Name" 
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email" 
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email" 
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number</label>
            <div className="otp-input-group">
              <div className={`phone-input-wrapper ${otpVerified ? 'verified-input' : ''}`}>
                <select 
                  className="country-code-select" 
                  value={countryCode} 
                  onChange={(e) => {
                    setCountryCode(e.target.value);
                    setTimeout(() => phoneInputRef.current?.focus(), 10);
                  }}
                  disabled={otpVerified}
                >
                  <option value="+91">🇮🇳 +91</option>
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+61">🇦🇺 +61</option>
                </select>
                <input 
                  type="tel" 
                  id="phoneNumber" 
                  name="phoneNumber"
                  ref={phoneInputRef}
                  className="phone-number-input"
                  value={formData.phoneNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 10) {
                      setFormData(prev => ({ ...prev, phoneNumber: val }));
                    }
                  }}
                  placeholder="Enter 10-digit number" 
                  required 
                  disabled={otpVerified}
                />
              </div>
              {!otpVerified && (
                <button 
                  type="button" 
                  className="otp-btn" 
                  onClick={handleSendOtp}
                >
                  {otpSent ? 'Resend OTP' : 'Send OTP'}
                </button>
              )}
              {otpVerified && <CheckCircle2 className="verified-icon" size={24} color="#2ecc71" />}
            </div>
          </div>

          {otpSent && !otpVerified && (
            <div className="form-group slide-down-animation">
              <label htmlFor="otp">Enter OTP</label>
              <div className="otp-input-group">
                <input 
                  type="text" 
                  id="otp" 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 4-digit code (use 1234)" 
                  maxLength="4"
                  required 
                />
                <button type="button" className="otp-btn verify-btn" onClick={handleVerifyOtp}>Verify</button>
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a strong password" 
              required 
            />
          </div>

          {role === 'driver' && (
            <>
              <div className="form-group">
                <label htmlFor="licenseNumber">License Number</label>
                <input 
                  type="text" 
                  id="licenseNumber" 
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  placeholder="Enter license number" 
                  required 
                />
              </div>
              
              <div className="form-row">
                {renderDocumentUpload("License (Front)", "licenseFront", "licenseFront")}
                {renderDocumentUpload("License (Back)", "licenseBack", "licenseBack")}
              </div>
              <div className="form-row">
                {renderDocumentUpload("Aadhaar (Front)", "aadhaarFront", "aadhaarFront")}
                {renderDocumentUpload("Aadhaar (Back)", "aadhaarBack", "aadhaarBack")}
              </div>
            </>
          )}

          <button type="submit" className="auth-button">Create Account</button>
        </form>
        
        <div className="auth-footer">
          Already have an account? 
          <button onClick={onSwitchToLogin} className="auth-link">Sign In</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
export default Signup;
