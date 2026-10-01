import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import { 
  Shield, Clock, Star, ChevronRight, UserCheck, CalendarCheck, Car, 
  UserPlus, MapPin, Cpu, CreditCard, FileCheck, Bell, Play, CheckCircle2, 
  Award, Smartphone, DollarSign, ChevronLeft
} from 'lucide-react';
import Login from '../components/Login';
import Signup from '../components/Signup';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';

const LandingPage = () => {
  const navigate = useNavigate();
  const { currentUser, openLogin, openSignup, logout } = useAuth();
  const { showAlert } = useAlert();

  const [activeTab, setActiveTab] = useState('client');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeProtocolStep, setActiveProtocolStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveProtocolStep(prev => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const clientSteps = [
    {
      step: 'Step 1',
      title: 'Profile & Vehicle Setup',
      desc: "Register in seconds and specify your car's make, model, and transmission type (Manual or Automatic).",
      badge: '100% Secure Profile',
      icon: <UserPlus size={32} />
    },
    {
      step: 'Step 2',
      title: 'Instant Booking Request',
      desc: 'Enter pickup & drop-off locations, schedule for immediate dispatch or later, and choose service type.',
      badge: 'Hourly & One-Way Options',
      icon: <MapPin size={32} />
    },
    {
      step: 'Smart Tech',
      title: 'Automated Matching Engine',
      desc: "Our algorithm matches you with vetted local drivers matching your vehicle's transmission compatibility.",
      badge: 'Auto/Manual Verification',
      icon: <Cpu size={32} />,
      highlight: true
    },
    {
      step: 'Step 4',
      title: 'Secure PIN Verification',
      desc: 'Verify your driver with a secure digital passkey before they drive. Live track your trip in real-time.',
      badge: '24/7 SOS & Live Support',
      icon: <Shield size={32} />
    },
    {
      step: 'Step 5',
      title: 'Cashless Wallet Checkout',
      desc: 'Fare is calculated on duration/distance and paid directly via your in-app wallet. Tip & rate easily.',
      badge: 'Secure Digital Payouts',
      icon: <CreditCard size={32} />
    }
  ];

  const driverSteps = [
    {
      step: 'Step 1',
      title: 'Safety & Document Check',
      desc: 'Upload your driving license, ID, and background certificate to get verified and approved by the admin team.',
      badge: 'Fast 24hr Approval',
      icon: <FileCheck size={32} />
    },
    {
      step: 'Step 2',
      title: 'Receive Local Job Alerts',
      desc: 'Go online to receive push alerts for nearby bookings matching your manual/auto transmission driving expertise.',
      badge: 'Accept on Your Terms',
      icon: <Bell size={32} />
    },
    {
      step: 'Step 3',
      title: 'Precise Pickup & Check-In',
      desc: 'Receive precise navigation coordinates. Perform a vehicle inspection checklist and punch-in to start.',
      badge: 'Digital Attendance System',
      icon: <Play size={32} />
    },
    {
      step: 'Step 4',
      title: 'Complete & Protect',
      desc: 'Drive clients to their destination safely. End the trip with a brief checklist punch-out in the app.',
      badge: 'Accident Insurance Cover',
      icon: <CheckCircle2 size={32} />
    },
    {
      step: 'Step 5',
      title: 'Instant Earnings Transfer',
      desc: 'Track earnings details on your app dashboard. Withdraw directly to your bank account with low platform fees.',
      badge: 'Direct Bank Payouts',
      icon: <DollarSign size={32} />
    }
  ];

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentSlide(0);
  };

  const nextSlide = (total) => {
    setCurrentSlide(prev => Math.min(prev + 1, total - 1));
  };

  const prevSlide = () => {
    setCurrentSlide(prev => Math.max(prev - 1, 0));
  };

  useEffect(() => {
    const steps = activeTab === 'client' ? clientSteps : driverSteps;
    const timer = setInterval(() => {
      setCurrentSlide(prev => {
        if (prev >= steps.length - 1) {
          return 0;
        }
        return prev + 1;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [activeTab, currentSlide]);

  const handleDriveWithUsClick = () => {
    setActiveTab('driver');
    setCurrentSlide(0);
    const element = document.querySelector('.how-it-works-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
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
            <button onClick={() => {
              logout();
              navigate('/dashboard/client/bookings/new');
            }} className="primary-btn primary-btn-inherit">
              Hire a Driver <ChevronRight size={20} />
            </button>
            <button onClick={() => {
              logout();
              navigate('/dashboard/driver');
            }} className="secondary-btn secondary-btn-inherit">
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
        <p className="section-subtitle">Experience a seamless ride journey designed for absolute peace of mind</p>
        
        <div className="workflow-toggle-container">
          <button 
            className={`workflow-toggle-btn ${activeTab === 'client' ? 'active' : ''}`}
            onClick={() => handleTabChange('client')}
          >
            <UserCheck size={18} /> For Clients
          </button>
          <button 
            className={`workflow-toggle-btn ${activeTab === 'driver' ? 'active' : ''}`}
            onClick={() => handleTabChange('driver')}
          >
            <Car size={18} /> For Drivers
          </button>
        </div>

        {(() => {
          const steps = activeTab === 'client' ? clientSteps : driverSteps;
          return (
            <div className="workflow-grid">
              {/* Connected Downwards Vertical Step Timeline */}
              <div className="workflow-steps-vertical">
                {steps.map((item, index) => (
                  <div key={index} className="vertical-step-item">
                    <div className="vertical-left-lane">
                      <div className="vertical-icon-wrapper">
                        {item.icon}
                      </div>
                      {index < steps.length - 1 && (
                        <div className="vertical-connector-line">
                          <div className="connector-fill-vertical"></div>
                        </div>
                      )}
                    </div>
                    <div className={`vertical-step-card ${item.highlight ? 'highlight-step' : ''}`}>
                      <div className="step-number-glow">{index + 1}</div>
                      <div className="step-card-content">
                        <span className="step-benefit-tag">{item.badge}</span>
                        <h3>{item.title}</h3>
                        <p>{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action CTA Block */}
              <div className="workflow-cta-block">
                {activeTab === 'client' ? (
                  <div className="cta-glass-card">
                    <Award className="cta-icon" size={48} />
                    <h3>Ready to Hire a Professional?</h3>
                    <p>Get matched with highly experienced, background-verified drivers who handle your personal car with care.</p>
                    <button onClick={() => {
                      logout();
                      navigate('/dashboard/client/bookings/new');
                    }} className="cta-flow-btn client-cta">
                      Explore Client Dashboard <ChevronRight size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="cta-glass-card driver-cta-card">
                    <DollarSign className="cta-icon" size={48} />
                    <h3>Maximize Your Earnings</h3>
                    <p>Set your own schedule, drive diverse vehicles, and keep 100% of client tips with bi-weekly payouts.</p>
                    <button onClick={() => {
                      logout();
                      navigate('/dashboard/driver');
                    }} className="cta-flow-btn driver-cta">
                      Explore Driver Dashboard <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        <div className="matching-engine-showcase">
          <div className="engine-card">
            <div className="engine-header">
              <Cpu size={36} className="engine-glow-icon animate-pulse" />
              <div>
                <h4>Smart Matchmaking Protocol</h4>
                <p>Connecting drivers and clients efficiently in real-time</p>
              </div>
            </div>
            <div className="engine-flow-diagram">
              <div className={`diagram-node ${activeProtocolStep === 0 ? 'active' : ''}`}>
                <div className="node-icon"><Smartphone size={20} /></div>
                <span>1. Request Placed</span>
              </div>
              <div className="diagram-connector-line">
                <div className="connector-pulse-line" style={{ 
                  transform: activeProtocolStep === 0 ? 'scaleX(0)' : activeProtocolStep === 1 ? 'scaleX(0.5)' : 'scaleX(1)',
                  transformOrigin: 'left',
                  transition: 'transform 0.8s ease'
                }}></div>
              </div>
              <div className={`diagram-node ${activeProtocolStep === 1 ? 'active' : ''}`}>
                <div className="node-icon"><Cpu size={20} /></div>
                <span>2. Engine Filtering</span>
              </div>
              <div className="diagram-connector-line">
                <div className="connector-pulse-line" style={{ 
                  transform: activeProtocolStep === 2 ? 'scaleX(1)' : 'scaleX(0)',
                  transformOrigin: 'left',
                  transition: 'transform 0.8s ease'
                }}></div>
              </div>
              <div className={`diagram-node ${activeProtocolStep === 2 ? 'active' : ''}`}>
                <div className="node-icon"><Car size={20} /></div>
                <span>3. Driver Vetted</span>
              </div>
            </div>

            {/* Live Terminal Console Logs */}
            <div className="engine-terminal">
              <div className="terminal-header">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
                <span className="terminal-title">matchmaking_engine.log</span>
              </div>
              <div className="terminal-body">
                {activeProtocolStep === 0 && (
                  <div className="terminal-logs-group animate-fade-in">
                    <p className="log-line info"><code>[13:50:01] INFO: Request initiated by guest client</code></p>
                    <p className="log-line success"><code>[13:50:02] OK: Vehicle parameters verified (Manual Gearbox)</code></p>
                    <p className="log-line warning"><code>[13:50:03] PENDING: Broadcasting coordinates to matching zone...</code></p>
                  </div>
                )}
                {activeProtocolStep === 1 && (
                  <div className="terminal-logs-group animate-fade-in">
                    <p className="log-line info"><code>[13:50:04] INFO: Scanning matching algorithm database</code></p>
                    <p className="log-line success"><code>[13:50:05] MATCH: 5 manual-certified drivers located nearby</code></p>
                    <p className="log-line success"><code>[13:50:06] VERIFIED: Checked background certificate history: 100% PASS</code></p>
                  </div>
                )}
                {activeProtocolStep === 2 && (
                  <div className="terminal-logs-group animate-fade-in">
                    <p className="log-line info"><code>[13:50:07] MATCH: Driver David (Manual transmission expert) selected</code></p>
                    <p className="log-line success"><code>[13:50:08] OK: Secure digital PIN generated (8934)</code></p>
                    <p className="log-line success"><code>[13:50:09] SYSTEM: Dispatch route mapped. Ride secured.</code></p>
                  </div>
                )}
              </div>
            </div>

            <p className="engine-footer-desc">Our intelligent routing matches driver proximity and vehicle preferences in seconds, maximizing safety and ensuring compatibility.</p>
          </div>
        </div>
      </section>

      <section className="features-section">
        <h2>Why Choose Us?</h2>
        <div className="features-marquee-container">
          <div className="features-blur-overlay left"></div>
          <div className="features-blur-overlay right"></div>
          <div className="features-track">
            {[
              {
                icon: Shield,
                title: "100% Vetted Drivers",
                desc: "Every driver passes strict criminal background history audits and a practical driving test."
              },
              {
                icon: Car,
                title: "Transmission Match",
                desc: "We pair your vehicle's specific gearbox with certified Manual or Automatic experts."
              },
              {
                icon: UserCheck,
                title: "Browse as Guest",
                desc: "Explore the full dashboard and search mock bookings in real-time without immediate forced accounts."
              },
              {
                icon: CreditCard,
                title: "Secured Digital Wallet",
                desc: "Load funds safely and enjoy seamless cashless transactions with clear ride fee breakdown sheets."
              },
              {
                icon: MapPin,
                title: "Live GPS Trip Tracking",
                desc: "Track your personal car and driver in real-time with integrated map navigation feeds."
              },
              {
                icon: Clock,
                title: "Punctual & On-Time",
                desc: "We respect your schedule. Drivers check-in early so you are never kept waiting."
              }
            ].concat([
              {
                icon: Shield,
                title: "100% Vetted Drivers",
                desc: "Every driver passes strict criminal background history audits and a practical driving test."
              },
              {
                icon: Car,
                title: "Transmission Match",
                desc: "We pair your vehicle's specific gearbox with certified Manual or Automatic experts."
              },
              {
                icon: UserCheck,
                title: "Browse as Guest",
                desc: "Explore the full dashboard and search mock bookings in real-time without immediate forced accounts."
              },
              {
                icon: CreditCard,
                title: "Secured Digital Wallet",
                desc: "Load funds safely and enjoy seamless cashless transactions with clear ride fee breakdown sheets."
              },
              {
                icon: MapPin,
                title: "Live GPS Trip Tracking",
                desc: "Track your personal car and driver in real-time with integrated map navigation feeds."
              },
              {
                icon: Clock,
                title: "Punctual & On-Time",
                desc: "We respect your schedule. Drivers check-in early so you are never kept waiting."
              }
            ]).map((feature, idx) => {
              const IconComp = feature.icon;
              return (
                <div key={idx} className="feature-card">
                  <IconComp className="feature-icon" size={40} />
                  <h3>{feature.title}</h3>
                  <p>{feature.desc}</p>
                </div>
              );
            })}
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

    </div>
  );
};

export default LandingPage;
