import React, { useState, useEffect } from 'react';
import { Users, Search, Shield, Car, User } from 'lucide-react';
import { API_BASE_URL } from '../../../config';
import './AdminPages.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/users`);
        if (res.ok) setUsers(await res.json());
      } catch (err) { console.error(err); }
    };
    fetchUsers();
  }, []);

  const filtered = users.filter(u => {
    const matchesFilter = filter === 'all' || u.role === filter;
    const fullName = `${u.first_name} ${u.last_name || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(search.toLowerCase()) ||
                          (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
                          u.phone_number.includes(search);
    return matchesFilter && matchesSearch;
  });

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <Shield size={14} color="#bf5af2" />;
      case 'driver': return <Car size={14} color="#ff9f0a" />;
      case 'client': return <User size={14} color="#5ac8fa" />;
      default: return <User size={14} />;
    }
  };

  const getRoleBadge = (role) => {
    const map = {
      admin: { color: '#bf5af2', bg: 'rgba(191, 90, 242, 0.1)' },
      driver: { color: '#ff9f0a', bg: 'rgba(255, 159, 10, 0.1)' },
      client: { color: '#5ac8fa', bg: 'rgba(90, 200, 250, 0.1)' }
    };
    const s = map[role] || map.client;
    return (
      <span className="admin-table-badge" style={{ color: s.color, background: s.bg, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {getRoleIcon(role)} {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const map = {
      active: { color: '#34c759', bg: 'rgba(52, 199, 89, 0.1)' },
      pending: { color: '#ff9f0a', bg: 'rgba(255, 159, 10, 0.1)' },
      rejected: { color: '#ff453a', bg: 'rgba(255, 69, 58, 0.1)' }
    };
    const s = map[status] || map.active;
    return <span className="admin-table-badge" style={{ color: s.color, background: s.bg }}>{(status || 'active').charAt(0).toUpperCase() + (status || 'active').slice(1)}</span>;
  };

  const counts = {
    all: users.length,
    client: users.filter(u => u.role === 'client').length,
    driver: users.filter(u => u.role === 'driver').length,
    admin: users.filter(u => u.role === 'admin').length,
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">User Management</h1>
          <p className="admin-page-subtitle">{users.length} total registered users</p>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-filter-tabs">
          {[
            { key: 'all', label: `All (${counts.all})` },
            { key: 'client', label: `Clients (${counts.client})` },
            { key: 'driver', label: `Drivers (${counts.driver})` },
            { key: 'admin', label: `Admins (${counts.admin})` }
          ].map(tab => (
            <button
              key={tab.key}
              className={`admin-filter-tab ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="admin-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-table-card">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="5" className="admin-table-empty">No users match your filter.</td>
              </tr>
            ) : (
              filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="admin-table-user">
                      <div className="admin-table-avatar" style={{ 
                        background: u.role === 'admin' 
                          ? 'linear-gradient(135deg, rgba(191,90,242,0.2), rgba(191,90,242,0.05))'
                          : u.role === 'driver' 
                            ? 'linear-gradient(135deg, rgba(255,159,10,0.2), rgba(255,159,10,0.05))'
                            : undefined,
                        color: u.role === 'admin' ? '#bf5af2' : u.role === 'driver' ? '#ff9f0a' : undefined,
                        borderColor: u.role === 'admin' ? 'rgba(191,90,242,0.15)' : u.role === 'driver' ? 'rgba(255,159,10,0.15)' : undefined
                      }}>
                        {u.first_name.charAt(0)}
                      </div>
                      <div>
                        <span className="admin-table-name">{u.first_name} {u.last_name || ''}</span>
                        <span className="admin-table-email">{u.email || '—'}</span>
                      </div>
                    </div>
                  </td>
                  <td>{getRoleBadge(u.role)}</td>
                  <td className="admin-table-muted">{u.phone_number}</td>
                  <td>{getStatusBadge(u.status)}</td>
                  <td className="admin-table-muted">{new Date(u.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
