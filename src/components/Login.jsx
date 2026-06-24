import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle2 } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import './Auth.css';

const Login = ({ isOpen, onClose, onSwitchToSignup }) => {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const { login } = useAuth();
  const phoneInputRef = useRef(null);
  
  const [role, setRole] = useState('client');
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'phone'
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);

  // Forgot password states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetOtpVerified, setResetOtpVerified] = useState(false);

  if (!isOpen) return null;

  const handleSendOtp = () => {
    if (phoneNumber.length >= 10) {
      setOtpSent(true);
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

  // Forgot password helpers
  const handleSendResetOtp = async () => {
    if (!resetEmail) {
      showAlert("Please enter your email.", "error");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-reset-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, role })
      });
      const data = await res.json();
      if (res.ok) {
        setResetOtpSent(true);
        showAlert("Verification code sent! Hint: use 1234", "success");
      } else {
        showAlert(data.error || "Failed to find account", "error");
      }
    } catch (err) {
      console.error(err);
      showAlert("Network error.", "error");
    }
  };

  const handleVerifyResetOtp = () => {
    if (resetOtp === '1234') {
      setResetOtpVerified(true);
      showAlert("Code verified successfully!", "success");
    } else {
      showAlert("Invalid verification code. Hint: use 1234", "error");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetOtpVerified) {
      showAlert("Please verify the code first.", "error");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, role, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert("Password reset successfully! Please login with your new password.", "success");
        setIsForgotPassword(false);
        setResetOtpSent(false);
        setResetOtpVerified(false);
        setResetEmail('');
        setResetOtp('');
        setNewPassword('');
      } else {
        showAlert(data.error || "Password reset failed.", "error");
      }
    } catch (err) {
      console.error(err);
      showAlert("Network error.", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loginMethod === 'phone' && !otpVerified) {
      showAlert("Please verify your phone number using OTP first.", "error");
      return;
    }
    
    const submissionData = { 
      role, 
      method: loginMethod,
      ...(loginMethod === 'email' ? { email, password } : { phoneNumber: `${countryCode}${phoneNumber}` })
    };
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        login(data.user);
        showAlert(`Welcome back, ${data.user.firstName}!`, "success");
        console.log('Login success:', data);
        onClose();
        navigate(`/dashboard/${role}`);
      } else {
        showAlert(data.error || "Login failed.", "error");
      }
    } catch (err) {
      console.error("Login failed:", err);
      showAlert("Network error. Please make sure the backend server and XAMPP MySQL are running.", "error");
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target.className === 'modal-overlay') {
      onClose();
    }
  };

  if (isForgotPassword) {
    return createPortal(
      <div className="modal-overlay" onClick={handleOverlayClick}>
        <div className="auth-card modal-content auth-modal-login">
          <button className="close-btn" type="button" onClick={() => {
            setIsForgotPassword(false);
            setResetOtpSent(false);
            setResetOtpVerified(false);
            setResetEmail('');
            setResetOtp('');
            setNewPassword('');
          }}><X size={24} /></button>
          <div className="auth-header">
            <h1>Reset Password</h1>
            <p>Enter your email to recover your account</p>
          </div>
          <form className="auth-form" onSubmit={handleResetPassword}>
            <div className="form-group">
              <label>Role</label>
              <div className="role-toggle-group">
                <button type="button" className={`role-toggle-btn ${role === 'client' ? 'active' : ''}`} onClick={() => setRole('client')}>Client</button>
                <button type="button" className={`role-toggle-btn ${role === 'driver' ? 'active' : ''}`} onClick={() => setRole('driver')}>Driver</button>
                <button type="button" className={`role-toggle-btn ${role === 'admin' ? 'active' : ''}`} onClick={() => setRole('admin')}>Admin</button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="resetEmail">Email</label>
              <div className="otp-input-group">
                <input 
                  type="email" 
                  id="resetEmail" 
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter registered email" 
                  required 
                  disabled={resetOtpVerified}
                />
                {!resetOtpVerified && (
                  <button 
                    type="button" 
                    className="otp-btn" 
                    onClick={handleSendResetOtp}
                  >
                    {resetOtpSent ? 'Resend Code' : 'Send Code'}
                  </button>
                )}
                {resetOtpVerified && <CheckCircle2 className="verified-icon" size={24} color="#2ecc71" />}
              </div>
            </div>

            {resetOtpSent && !resetOtpVerified && (
              <div className="form-group slide-down-animation">
                <label htmlFor="resetOtp">Enter Code</label>
                <div className="otp-input-group">
                  <input 
                    type="text" 
                    id="resetOtp" 
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    placeholder="Enter 4-digit code" 
                    maxLength="4"
                    required 
                  />
                  <button type="button" className="otp-btn verify-btn" onClick={handleVerifyResetOtp}>Verify</button>
                </div>
              </div>
            )}

            {resetOtpVerified && (
              <div className="form-group slide-down-animation">
                <label htmlFor="newPassword">New Password</label>
                <input 
                  type="password" 
                  id="newPassword" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password" 
                  required 
                />
              </div>
            )}

            <button type="submit" className="auth-button" disabled={!resetOtpVerified}>Reset Password</button>
          </form>
          <div className="auth-footer">
            Back to <button type="button" onClick={() => {
              setIsForgotPassword(false);
              setResetOtpSent(false);
              setResetOtpVerified(false);
              setResetEmail('');
              setResetOtp('');
              setNewPassword('');
            }} className="auth-link">Login</button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="auth-card modal-content auth-modal-login">
        <button className="close-btn" onClick={onClose}><X size={24} /></button>
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Login to your account</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          
          <div className="form-group">
            <label>Login as</label>
            <div className="role-toggle-group">
              <button type="button" className={`role-toggle-btn ${role === 'client' ? 'active' : ''}`} onClick={() => setRole('client')}>Client</button>
              <button type="button" className={`role-toggle-btn ${role === 'driver' ? 'active' : ''}`} onClick={() => setRole('driver')}>Driver</button>
              <button type="button" className={`role-toggle-btn ${role === 'admin' ? 'active' : ''}`} onClick={() => { setRole('admin'); setLoginMethod('email'); }}>Admin</button>
            </div>
          </div>

          {role !== 'admin' && (
            <div className="form-group">
              <label>Login Method</label>
              <div className="role-toggle-group">
                <button type="button" className={`role-toggle-btn ${loginMethod === 'email' ? 'active' : ''}`} onClick={() => setLoginMethod('email')}>Email</button>
                <button type="button" className={`role-toggle-btn ${loginMethod === 'phone' ? 'active' : ''}`} onClick={() => setLoginMethod('phone')}>Phone Number</button>
              </div>
            </div>
          )}

          {loginMethod === 'email' ? (
            <>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email" 
                  required 
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input 
                  type="password" 
                  id="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password" 
                  required 
                />
              </div>
              <div style={{ textAlign: 'right', marginTop: '-12px', marginBottom: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsForgotPassword(true)} 
                  className="auth-link"
                  style={{ fontSize: '13px', background: 'none', border: 'none', padding: 0 }}
                >
                  Forgot Password?
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="loginPhoneNumber">Phone Number</label>
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
                      id="loginPhoneNumber" 
                      ref={phoneInputRef}
                      className="phone-number-input"
                      value={phoneNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 10) setPhoneNumber(val);
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
                  <label htmlFor="loginOtp">Enter OTP</label>
                  <div className="otp-input-group">
                    <input 
                      type="text" 
                      id="loginOtp" 
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter 4-digit code" 
                      maxLength="4"
                      required 
                    />
                    <button type="button" className="otp-btn verify-btn" onClick={handleVerifyOtp}>Verify</button>
                  </div>
                </div>
              )}
            </>
          )}

          <button type="submit" className="auth-button">Sign In</button>
        </form>
        <div className="auth-footer">
          Don't have an account? 
          <button onClick={onSwitchToSignup} className="auth-link">Sign Up</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Login;
