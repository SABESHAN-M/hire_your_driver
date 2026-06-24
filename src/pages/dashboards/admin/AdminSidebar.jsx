import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Car, CreditCard, UserCheck, Settings, Shield, MessageSquare, Database
} from 'lucide-react';

const AdminSidebar = ({ userRole, isCompact, theme, showAlert }) => {
  const location = useLocation();

  const links = [
    { path: '/dashboard/admin', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { path: '/dashboard/admin/drivers', label: 'Driver Management', icon: <UserCheck size={20} /> },
    { path: '/dashboard/admin/bookings', label: 'All Bookings', icon: <Car size={20} /> },
    { path: '/dashboard/admin/users', label: 'User Management', icon: <Users size={20} /> },
    { path: '/dashboard/admin/revenue', label: 'Revenue & Wallet', icon: <CreditCard size={20} /> },
    { path: '/dashboard/admin/messages', label: 'Message Center', icon: <MessageSquare size={20} /> },
    { path: '/dashboard/admin/database', label: 'Database Explorer', icon: <Database size={20} /> },
    { path: '/dashboard/admin/settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header sidebar-header-wrapper">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-gold) 0%, #b5952f 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)'
          }}>
            <Shield size={18} color="#000" strokeWidth={2.5} />
          </div>
          {!isCompact && (
            <h2 className="sidebar-title" style={{ fontSize: '17px' }}>Admin Panel</h2>
          )}
        </div>
      </div>
      <nav className="sidebar-nav">
        {links.map((link) => {
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

export default AdminSidebar;
