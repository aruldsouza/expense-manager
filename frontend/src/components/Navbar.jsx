import React from 'react';

export default function Navbar({ currentUser, onOpenAuth, onLogout, onSelectGroup }) {
  return (
    <nav className="glass-card navbar">
      <div className="brand-logo" style={{ cursor: 'pointer' }} onClick={() => onSelectGroup(null)}>
        <div className="brand-icon">⚡</div>
        <span>SplitSmart</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              color: '#fff',
              fontSize: '0.95rem'
            }}>
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{currentUser.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{currentUser.email}</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={onLogout} style={{ marginLeft: '0.5rem' }}>
              Sign Out
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={onOpenAuth}>
            Sign In / Register
          </button>
        )}
      </div>
    </nav>
  );
}
