import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import GroupList from './components/GroupList';
import GroupDetail from './components/GroupDetail';
import { api } from './services/api';
import './App.css';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const meRes = await api.getMe();
      if (meRes && meRes.user) {
        setCurrentUser(meRes.user);
      }
      const groupsData = await api.getGroups();
      setGroups(groupsData || []);
    } catch (err) {
      console.error('Failed loading initial application data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleAuthSuccess = async ({ type, name, email, password }) => {
    if (type === 'register') {
      const res = await api.register(name, email, password);
      setCurrentUser(res.user);
    } else {
      const res = await api.login(email, password);
      setCurrentUser(res.user);
    }
    loadInitialData();
  };

  const handleLogout = () => {
    api.setToken(null);
    setCurrentUser(null);
    setSelectedGroup(null);
  };

  const handleCreateGroup = async (name, description, memberEmails) => {
    const newGroup = await api.createGroup(name, description, memberEmails);
    setGroups(prev => [newGroup, ...prev]);
    setSelectedGroup(newGroup);
  };

  return (
    <div className="app-container">
      <Navbar
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onSelectGroup={(g) => setSelectedGroup(g)}
      />

      <main>
        {loading ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚡</div>
            <div>Loading SplitSmart Application...</div>
          </div>
        ) : selectedGroup ? (
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

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
