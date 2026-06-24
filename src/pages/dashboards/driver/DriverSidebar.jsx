import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, User, Settings, Calendar, CreditCard, ShieldCheck,
  Car, Clock, FileText
} from 'lucide-react';
import './DriverSidebar.css';

const DriverSidebar = ({ userRole, isCompact, theme, showAlert }) => {
  const location = useLocation();

  const getLinks = () => {
    return [
      { path: '/dashboard/driver', label: 'Driver Dashboard', icon: <LayoutDashboard size={20} /> },
      { path: '/dashboard/driver/bookings', label: 'Job requests', icon: <Car size={20} /> },
      { path: '/dashboard/driver/attendance', label: 'Duty Status', icon: <Clock size={20} /> },
      { path: '/dashboard/driver/wallet', label: 'Earnings Center', icon: <CreditCard size={20} /> },
      { path: '/dashboard/driver/documents', label: 'Documents Compliance', icon: <FileText size={20} /> },
      { path: '/dashboard/driver/profile', label: 'Profile', icon: <User size={20} /> },
      { path: '/dashboard/driver/settings', label: 'Settings', icon: <Settings size={20} /> }
    ];
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header sidebar-header-wrapper">
        <h2 className="sidebar-title">{userRole} Dashboard</h2>
      </div>
      <nav className="sidebar-nav">
        {getLinks().map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default DriverSidebar;
