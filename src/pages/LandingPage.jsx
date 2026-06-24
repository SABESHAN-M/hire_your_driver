import React, { useState } from 'react';
import './LandingPage.css';
import { Shield, Clock, Star, ChevronRight, UserCheck, CalendarCheck, Car } from 'lucide-react';
import Login from '../components/Login';
import Signup from '../components/Signup';

const LandingPage = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [signupRole, setSignupRole] = useState('client');

  const openLogin = () => {
    setIsSignupOpen(false);
    setIsLoginOpen(true);
  };

  const openSignup = (role = 'client') => {
    setSignupRole(role);
    setIsLoginOpen(false);
    setIsSignupOpen(true);
  };

  return (
    <div className="landing-container">
      <nav className="navbar">
        <div className="logo">
          <img src="/logo_hyd.PNG" alt="Hire Your Driver" className="logo-img" />
          <span className="logo-text">Hire Your Driver</span>
        </div>
        <div className="nav-links">
          <button onClick={openLogin} className="nav-link nav-link-btn">Login</button>
          <button onClick={() => openSignup('client')} className="nav-btn nav-btn-styled">Get Started</button>
        </div>
      </nav>

      <main className="hero-section">
        <div className="hero-content">
          <div className="badge">The #1 Driver Network</div>
          <h1>Your Personal Driver,<br/> Just a Click Away.</h1>
          <p>Find trusted, professional drivers for your car. Whether it's for a few hours, a full day, or permanent hire—we make it simple and safe.</p>
          <div className="hero-cta">
            <button onClick={() => openSignup('client')} className="primary-btn primary-btn-inherit">
              Hire a Driver <ChevronRight size={20} />
            </button>
            <button onClick={() => openSignup('driver')} className="secondary-btn secondary-btn-inherit">
              Drive with Us
            </button>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">10k+</span>
              <span className="stat-label">Happy Clients</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">4.9/5</span>
              <span className="stat-label">Average Rating</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">24/7</span>
              <span className="stat-label">Support</span>
            </div>
          </div>
        </div>
      </main>

      <section className="how-it-works-section">
        <h2>How It Works</h2>
        <p className="section-subtitle">Get moving in three easy steps</p>
        <div className="steps-container">
          <div className="step-card">
            <div className="step-icon-wrapper"><UserCheck size={32} /></div>
            <h3>1. Create an Account</h3>
            <p>Sign up in seconds. Tell us what kind of driver you need.</p>
          </div>
          <div className="step-card">
            <div className="step-icon-wrapper"><CalendarCheck size={32} /></div>
            <h3>2. Book a Driver</h3>
            <p>Choose a time and place. We'll match you with a vetted pro.</p>
          </div>
          <div className="step-card">
            <div className="step-icon-wrapper"><Car size={32} /></div>
            <h3>3. Sit Back & Relax</h3>
            <p>Your driver arrives. Enjoy a safe, comfortable ride in your own car.</p>
          </div>
        </div>
      </section>

      <section className="features-section">
        <h2>Why Choose Us?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <Shield className="feature-icon" size={40} />
            <h3>Safe & Trusted</h3>
            <p>Every driver passes a strict background check and driving test.</p>
          </div>
          <div className="feature-card">
            <Clock className="feature-icon" size={40} />
            <h3>Always on Time</h3>
            <p>We respect your time. Our drivers arrive early so you never wait.</p>
          </div>
          <div className="feature-card">
            <Star className="feature-icon" size={40} />
            <h3>Top Quality</h3>
            <p>Rated 5 stars by thousands of users. We only hire the best.</p>
          </div>
        </div>
      </section>
      
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-logo">
            <img src="/logo_hyd.PNG" alt="Hire Your Driver" className="logo-img-grayscale" />
            <span className="footer-logo-text">Hire Your Driver</span>
          </div>
          <p>© {new Date().getFullYear()} Hire Your Driver. All rights reserved.</p>
        </div>
      </footer>

      {/* Auth Modals */}
      <Login 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)} 
        onSwitchToSignup={() => openSignup('client')} 
      />
      
      <Signup 
        isOpen={isSignupOpen} 
        onClose={() => setIsSignupOpen(false)} 
        onSwitchToLogin={openLogin}
        defaultRole={signupRole}
      />
    </div>
  );
};

export default LandingPage;
