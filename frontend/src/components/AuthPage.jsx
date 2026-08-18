import React, { useState } from 'react';

export default function AuthPage({ onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        if (!name || !email || !password) throw new Error('Please fill in all fields');
        await onAuthSuccess({ type: 'register', name, email, password });
      } else {
        if (!email || !password) throw new Error('Please fill in email and password');
        await onAuthSuccess({ type: 'login', email, password });
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsRegister(!isRegister);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'radial-gradient(ellipse at 20% 20%, rgba(99,102,241,0.18) 0, transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(6,182,212,0.13) 0, transparent 55%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative blobs */}
      <div style={{
        position: 'absolute', top: '-120px', left: '-120px',
        width: '420px', height: '420px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.22), transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-100px', right: '-100px',
        width: '360px', height: '360px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.18), transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '64px', height: '64px', borderRadius: '18px',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            boxShadow: '0 0 32px rgba(99,102,241,0.45)',
            fontSize: '2rem', marginBottom: '1rem',
          }}>
            ⚡
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: '800',
            background: 'linear-gradient(135deg, #e0e7ff, #a5f3fc)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: '0.35rem',
          }}>
            SplitSmart
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
            Split expenses. Settle debts. Stay stress-free.
          </p>
        </div>

        {/* Auth card */}
        <div style={{
          background: 'rgba(22,30,49,0.82)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '2.25rem 2rem',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}>

          {/* Tab switcher */}
          <div style={{
            display: 'flex', background: 'rgba(15,23,42,0.6)',
            borderRadius: '10px', padding: '4px',
            border: '1px solid rgba(255,255,255,0.06)',
            marginBottom: '2rem',
          }}>
            {['Sign In', 'Register'].map((tab, i) => {
              const active = (i === 0 && !isRegister) || (i === 1 && isRegister);
              return (
                <button
                  key={tab}
                  onClick={() => { if (!active) switchMode(); }}
                  style={{
                    flex: 1, padding: '0.55rem 0', border: 'none',
                    borderRadius: '8px', fontFamily: 'inherit', fontWeight: active ? '700' : '500',
                    fontSize: '0.92rem', cursor: 'pointer', transition: 'all 0.2s ease',
                    background: active ? 'linear-gradient(135deg, #6366f1, #4338ca)' : 'transparent',
                    color: active ? '#fff' : 'var(--text-muted)',
                    boxShadow: active ? '0 2px 12px rgba(99,102,241,0.4)' : 'none',
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: '700',
              color: 'var(--text-main)', marginBottom: '0.25rem',
            }}>
              {isRegister ? 'Create your account' : 'Welcome back'}
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.87rem' }}>
              {isRegister
                ? 'Fill in your details to get started'
                : 'Enter your credentials to continue'}
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              background: 'rgba(244,63,94,0.13)', border: '1px solid rgba(244,63,94,0.3)',
              color: '#f87171', borderRadius: '8px', padding: '0.75rem 1rem',
              fontSize: '0.875rem', marginBottom: '1.25rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {isRegister && (
              <div>
                <label style={{
                  display: 'block', fontSize: '0.82rem', fontWeight: '600',
                  color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.03em',
                }}>
                  FULL NAME
                </label>
                <input
                  className="glass-input"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                  style={{ fontSize: '0.95rem' }}
                />
              </div>
            )}

            <div>
              <label style={{
                display: 'block', fontSize: '0.82rem', fontWeight: '600',
                color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.03em',
              }}>
                EMAIL ADDRESS
              </label>
              <input
                className="glass-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                style={{ fontSize: '0.95rem' }}
              />
            </div>

            <div>
              <label style={{
                display: 'block', fontSize: '0.82rem', fontWeight: '600',
                color: 'var(--text-muted)', marginBottom: '0.4rem', letterSpacing: '0.03em',
              }}>
                PASSWORD
              </label>
              <input
                className="glass-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                style={{ fontSize: '0.95rem' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '0.5rem', width: '100%', padding: '0.875rem',
                border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', fontWeight: '700', fontSize: '1rem',
                background: loading
                  ? 'rgba(99,102,241,0.4)'
                  : 'linear-gradient(135deg, #6366f1, #4338ca)',
                color: '#fff',
                boxShadow: loading ? 'none' : '0 4px 18px rgba(99,102,241,0.45)',
                transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {loading ? (
                <>
                  <span style={{
                    display: 'inline-block', width: '16px', height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                  }} />
                  {isRegister ? 'Creating account...' : 'Signing in...'}
                </>
              ) : (
                isRegister ? '🚀 Create Account' : '→ Sign In'
              )}
            </button>
          </form>

          <div style={{
            marginTop: '1.5rem', textAlign: 'center',
            fontSize: '0.88rem', color: 'var(--text-dim)',
          }}>
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={switchMode}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#818cf8', fontWeight: '700', fontSize: '0.88rem',
                fontFamily: 'inherit', padding: 0,
              }}
            >
              {isRegister ? 'Sign In' : 'Register now'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center', marginTop: '1.75rem',
          fontSize: '0.8rem', color: 'var(--text-dim)',
        }}>
          Secure • Private • Works offline
        </p>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
