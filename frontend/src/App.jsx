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

  const getGroupIdFromUrlOrStorage = () => {
    const hash = window.location.hash || '';
    if (hash.startsWith('#/group/')) {
      return hash.replace('#/group/', '').trim();
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('group')) {
      return params.get('group').trim();
    }
    return localStorage.getItem('active_group_id') || null;
  };

  const fetchGroups = async () => {
    try {
      const groupsData = await api.getGroups();
      setGroups(groupsData || []);
      return groupsData || [];
    } catch (_) {
      return [];
    }
  };

  const handleSelectGroup = (g) => {
    if (g) {
      const gId = (g._id || g.id || '').toString();
      setSelectedGroup(g);
      localStorage.setItem('active_group_id', gId);
      window.location.hash = `#/group/${gId}`;
    } else {
      setSelectedGroup(null);
      localStorage.removeItem('active_group_id');
      if (window.location.hash.startsWith('#/group/')) {
        window.history.pushState(null, '', window.location.pathname + window.location.search);
      }
    }
  };

  // On mount: try to restore logged-in session and active group
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const meRes = await api.getMe();
        if (meRes && meRes.user) {
          setCurrentUser(meRes.user);
          const groupsData = await fetchGroups();

          // Restore previously opened group from URL or storage
          const targetGroupId = getGroupIdFromUrlOrStorage();
          if (targetGroupId) {
            const found = (groupsData || []).find(g => (g._id || g.id).toString() === targetGroupId.toString());
            if (found) {
              setSelectedGroup(found);
            } else {
              try {
                const groupDetails = await api.getGroupDetails(targetGroupId);
                if (groupDetails) setSelectedGroup(groupDetails);
              } catch (_) {
                handleSelectGroup(null);
              }
            }
          }
        }
      } catch (_) {
        // No valid session — stays on auth page
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Listen to hash changes for smooth forward/back navigation
  useEffect(() => {
    const onHashChange = async () => {
      const gId = getGroupIdFromUrlOrStorage();
      if (!gId) {
        setSelectedGroup(null);
      } else {
        const match = groups.find(g => (g._id || g.id).toString() === gId.toString());
        if (match) {
          setSelectedGroup(match);
        } else {
          try {
            const gd = await api.getGroupDetails(gId);
            if (gd) setSelectedGroup(gd);
          } catch (_) {}
        }
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [groups]);

  const handleAuthSuccess = async ({ type, name, email, password }) => {
    let res;
    if (type === 'register') {
      res = await api.register(name, email, password);
    } else {
      res = await api.login(email, password);
    }
    setCurrentUser(res.user);
    const groupsData = await fetchGroups();

    const targetGroupId = getGroupIdFromUrlOrStorage();
    if (targetGroupId) {
      const found = (groupsData || []).find(g => (g._id || g.id).toString() === targetGroupId.toString());
      if (found) setSelectedGroup(found);
    }
  };

  const handleLogout = () => {
    api.setToken(null);
    setCurrentUser(null);
    handleSelectGroup(null);
    setGroups([]);
  };

  const handleCreateGroup = async (name, description, memberEmails) => {
    const newGroup = await api.createGroup(name, description, memberEmails);
    await fetchGroups();
    handleSelectGroup(newGroup);
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
        onSelectGroup={() => {
          handleSelectGroup(null);
          fetchGroups();
        }}
      />

      <main>
        {selectedGroup ? (
          <GroupDetail
            group={selectedGroup}
            currentUser={currentUser}
            onBack={() => {
              handleSelectGroup(null);
              fetchGroups();
            }}
          />
        ) : (
          <GroupList
            groups={groups}
            onSelectGroup={(g) => handleSelectGroup(g)}
            onCreateGroup={handleCreateGroup}
          />
        )}
      </main>
    </div>
  );
}
