import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AuthPage from './components/AuthPage';
import GroupList from './components/GroupList';
import GroupDetail from './components/GroupDetail';
import { api } from './services/api';
import './App.css';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: try to restore logged-in session from stored JWT
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const meRes = await api.getMe();
        if (meRes && meRes.user) {
          setCurrentUser(meRes.user);
          const groupsData = await api.getGroups();
          setGroups(groupsData || []);
        }
      } catch (_) {
        // No valid session — stays on auth page
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAuthSuccess = async ({ type, name, email, password }) => {
    let res;
    if (type === 'register') {
      res = await api.register(name, email, password);
    } else {
      res = await api.login(email, password);
    }
    setCurrentUser(res.user);
    const groupsData = await api.getGroups();
    setGroups(groupsData || []);
  };

  const handleLogout = () => {
    api.setToken(null);
    setCurrentUser(null);
    setSelectedGroup(null);
    setGroups([]);
  };

  const handleCreateGroup = async (name, description, memberEmails) => {
    const newGroup = await api.createGroup(name, description, memberEmails);
    setGroups(prev => [newGroup, ...prev]);
    setSelectedGroup(newGroup);
  };

  // ── Loading splash ──
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: '1rem',
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.8rem', boxShadow: '0 0 28px rgba(99,102,241,0.4)',
          animation: 'pulse 1.4s ease-in-out infinite',
        }}>⚡</div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Loading SplitSmart…</span>
        <style>{`@keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.08);opacity:0.8} }`}</style>
      </div>
    );
  }

  // ── Not logged in → show ONLY the auth page ──
  if (!currentUser) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  // ── Logged in → show full app ──
  return (
    <div className="app-container">
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onSelectGroup={() => setSelectedGroup(null)}
      />

      <main>
        {selectedGroup ? (
          <GroupDetail
            group={selectedGroup}
            currentUser={currentUser}
            onBack={() => setSelectedGroup(null)}
          />
        ) : (
          <GroupList
            groups={groups}
            onSelectGroup={(g) => setSelectedGroup(g)}
            onCreateGroup={handleCreateGroup}
          />
        )}
      </main>
    </div>
  );
}
