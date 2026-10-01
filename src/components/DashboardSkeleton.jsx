import React from 'react';
import './DashboardSkeleton.css';

/**
 * High-performance 60fps Shimmer Skeleton Loader
 * Automatically adapts layout structure based on route or explicit variant prop.
 */
const DashboardSkeleton = ({ variant = 'auto', pathname = '' }) => {
  // Determine variant based on path if set to 'auto'
  let layoutType = variant;
  if (layoutType === 'auto') {
    const cleanPath = (pathname || window.location.pathname).toLowerCase();
    if (cleanPath.includes('/bookings/new') || cleanPath.includes('/settings') || cleanPath.includes('/profile')) {
      layoutType = 'form';
    } else if (cleanPath.includes('/bookings') || cleanPath.includes('/drivers') || cleanPath.includes('/users') || cleanPath.includes('/messages')) {
      layoutType = 'list';
    } else if (cleanPath.includes('/wallet') || cleanPath.includes('/safety') || cleanPath.includes('/documents') || cleanPath.includes('/attendance')) {
      layoutType = 'cards';
    } else {
      layoutType = 'overview';
    }
  }

  return (
    <div className="skeleton-container" aria-busy="true" aria-live="polite">
      {/* 1. Header Bar Placeholder */}
      <div className="skeleton-header-row">
        <div className="skeleton-header-text">
          <div className="skeleton-box skeleton-title" />
          <div className="skeleton-box skeleton-subtitle" />
        </div>
        <div className="skeleton-box skeleton-btn" />
      </div>

      {/* 2. Top Stats Grid */}
      <div className="skeleton-stats-grid">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="skeleton-stat-card">
            <div className="skeleton-stat-top">
              <div className="skeleton-box skeleton-stat-icon" />
              <div className="skeleton-box skeleton-stat-badge" />
            </div>
            <div className="skeleton-box skeleton-stat-val" />
            <div className="skeleton-box skeleton-stat-label" />
          </div>
        ))}
      </div>

      {/* 3. Dynamic Content Section based on layoutType */}
      {layoutType === 'overview' && (
        <div className="skeleton-overview-grid">
          {/* Main Chart / Map Pane */}
          <div className="skeleton-pane">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="skeleton-box" style={{ width: '160px', height: '24px' }} />
              <div className="skeleton-box" style={{ width: '80px', height: '28px', borderRadius: '8px' }} />
            </div>
            <div className="skeleton-box" style={{ flex: 1, minHeight: '260px', borderRadius: '12px' }} />
          </div>

          {/* Activity / Console Pane */}
          <div className="skeleton-pane">
            <div className="skeleton-box" style={{ width: '140px', height: '24px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="skeleton-box skeleton-circle" style={{ width: '40px', height: '40px' }} />
                  <div className="skeleton-lines">
                    <div className="skeleton-box" style={{ width: '70%', height: '14px' }} />
                    <div className="skeleton-box" style={{ width: '40%', height: '12px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {layoutType === 'list' && (
        <>
          <div className="skeleton-controls-bar">
            <div className="skeleton-box skeleton-tabs" />
            <div className="skeleton-box skeleton-search" />
          </div>

          <div className="skeleton-card-list">
            {[1, 2, 3].map((card) => (
              <div key={card} className="skeleton-list-card">
                <div className="skeleton-card-header">
                  <div className="skeleton-box" style={{ width: '120px', height: '18px' }} />
                  <div className="skeleton-box" style={{ width: '80px', height: '22px', borderRadius: '12px' }} />
                </div>
                <div className="skeleton-card-body">
                  <div className="skeleton-box skeleton-circle" />
                  <div className="skeleton-lines">
                    <div className="skeleton-box" style={{ width: '85%', height: '16px' }} />
                    <div className="skeleton-box" style={{ width: '55%', height: '14px' }} />
                    <div className="skeleton-box" style={{ width: '35%', height: '12px' }} />
                  </div>
                  <div className="skeleton-box" style={{ width: '90px', height: '36px', borderRadius: '10px' }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {layoutType === 'cards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="skeleton-pane" style={{ minHeight: '180px', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="skeleton-box" style={{ width: '120px', height: '14px' }} />
              <div className="skeleton-box" style={{ width: '180px', height: '38px', borderRadius: '10px' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="skeleton-box" style={{ width: '120px', height: '42px', borderRadius: '10px' }} />
              <div className="skeleton-box" style={{ width: '120px', height: '42px', borderRadius: '10px' }} />
            </div>
          </div>

          <div className="skeleton-pane">
            <div className="skeleton-box" style={{ width: '160px', height: '22px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="skeleton-box skeleton-circle" style={{ width: '36px', height: '36px' }} />
                    <div className="skeleton-lines">
                      <div className="skeleton-box" style={{ width: '140px', height: '14px' }} />
                      <div className="skeleton-box" style={{ width: '90px', height: '12px' }} />
                    </div>
                  </div>
                  <div className="skeleton-box" style={{ width: '70px', height: '18px' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {layoutType === 'form' && (
        <div className="skeleton-pane" style={{ minHeight: '440px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '10px' }}>
            <div className="skeleton-box skeleton-circle" style={{ width: '72px', height: '72px' }} />
            <div className="skeleton-lines">
              <div className="skeleton-box" style={{ width: '180px', height: '20px' }} />
              <div className="skeleton-box" style={{ width: '120px', height: '14px' }} />
            </div>
          </div>

          <div className="skeleton-form-grid">
            {[1, 2, 3, 4, 5, 6].map((field) => (
              <div key={field} className="skeleton-field">
                <div className="skeleton-box skeleton-field-label" />
                <div className="skeleton-box skeleton-field-input" />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <div className="skeleton-box" style={{ width: '150px', height: '44px', borderRadius: '10px' }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardSkeleton;
