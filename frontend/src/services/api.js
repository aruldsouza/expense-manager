import { calculateNetBalances, computeOptimizedSettlements } from './debtOptimizer';

// Detect API base at runtime — works for Live Server, Express backend, and Render.com
function getApiBase() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
    return 'https://expense-manager-5h2m.onrender.com/api';
  }
  // Local development (any port — Live Server 5500, Express 5001, Vite 5173, etc.)
  return 'http://localhost:5001/api';
}

const API_BASE = getApiBase();


// ── One-time cleanup: remove any previously seeded demo data from browser storage ──
const DEMO_IDS = ['u1', 'u2', 'u3', 'u4', 'g1', 'g2', 'e1', 'e2', 'e3'];
(function wipeDemoData() {
  try {
    const groups = JSON.parse(localStorage.getItem('expense_mgr_groups') || '[]');
    if (groups.some(g => DEMO_IDS.includes(g._id))) {
      localStorage.removeItem('expense_mgr_users');
      localStorage.removeItem('expense_mgr_groups');
      localStorage.removeItem('expense_mgr_expenses');
      localStorage.removeItem('expense_mgr_settlements');
    }
  } catch (_) {}
})();

// LocalStorage Helper
function getStorage(key, fallback) {
  try {
    const data = localStorage.getItem(`expense_mgr_${key}`);
    return data ? JSON.parse(data) : fallback;
  } catch (_e) {
    return fallback;
  }
}

function setStorage(key, data) {
  try {
    localStorage.setItem(`expense_mgr_${key}`, JSON.stringify(data));
  } catch (e) {
    console.error('LocalStorage write error', e);
  }
}

// Initialize LocalStorage with empty state (no demo data)
if (!localStorage.getItem('expense_mgr_users')) setStorage('users', []);
if (!localStorage.getItem('expense_mgr_groups')) setStorage('groups', []);
if (!localStorage.getItem('expense_mgr_expenses')) setStorage('expenses', []);
if (!localStorage.getItem('expense_mgr_settlements')) setStorage('settlements', []);

// Local Storage Fallback API Engine
const localEngine = {
  currentUser: getStorage('users', [])[0] || null,
  
  async login(email) {
    const cleanEmail = email.trim().toLowerCase();
    const users = getStorage('users', []);
    let user = users.find(u => (u.email || '').toLowerCase() === cleanEmail);
    if (!user) {
      user = { _id: 'u_' + Date.now(), name: cleanEmail.split('@')[0], email: cleanEmail };
      users.push(user);
      setStorage('users', users);
    }
    this.currentUser = user;
    return { token: 'local-mode', user };
  },

  async register(name, email) {
    const cleanEmail = email.trim().toLowerCase();
    const users = getStorage('users', []);
    let user = users.find(u => (u.email || '').toLowerCase() === cleanEmail);
    if (user) {
      user.name = name.trim();
      setStorage('users', users);
    } else {
      user = { _id: 'u_' + Date.now(), name: name.trim(), email: cleanEmail };
      users.push(user);
      setStorage('users', users);
    }
    this.currentUser = user;
    return { token: 'local-mode', user };
  },

  async getGroups() {
    const allGroups = getStorage('groups', []);
    if (!this.currentUser) return allGroups;
    const currentId = (this.currentUser._id || this.currentUser.id || '').toString();
    const currentEmail = (this.currentUser.email || '').toLowerCase().trim();

    return allGroups.filter(g => {
      const creatorId = (typeof g.createdBy === 'object' ? (g.createdBy._id || g.createdBy.id) : g.createdBy || '').toString();
      if (creatorId && creatorId === currentId) return true;

      if (Array.isArray(g.members)) {
        return g.members.some(m => {
          const mId = (typeof m === 'object' ? (m._id || m.id) : m || '').toString();
          const mEmail = (typeof m === 'object' ? (m.email || '') : '').toLowerCase().trim();
          return (mId && mId === currentId) || (mEmail && mEmail === currentEmail);
        });
      }
      return false;
    });
  },

  async createGroup(name, description, memberEmails = []) {
    const users = getStorage('users', []);
    const myId = (this.currentUser._id || this.currentUser.id);
    const myEmail = (this.currentUser.email || '').toLowerCase().trim();
    const members = [{ _id: myId, name: this.currentUser.name, email: myEmail }];

    const emailList = Array.isArray(memberEmails)
      ? memberEmails
      : (typeof memberEmails === 'string' ? memberEmails.split(',') : []);

    emailList.forEach(rawEmail => {
      const cleanEmail = (rawEmail || '').trim().toLowerCase();
      if (cleanEmail && cleanEmail !== myEmail) {
        let u = users.find(x => (x.email || '').toLowerCase() === cleanEmail);
        if (!u) {
          const defaultName = cleanEmail.split('@')[0];
          u = {
            _id: 'u_' + Date.now() + Math.random().toString(36).substring(2, 6),
            name: defaultName.charAt(0).toUpperCase() + defaultName.slice(1),
            email: cleanEmail
          };
          users.push(u);
        }
        if (!members.find(m => m._id === u._id || m.email === u.email)) {
          members.push({ _id: u._id, name: u.name, email: u.email });
        }
      }
    });

    setStorage('users', users);

    const newGroup = {
      _id: 'g_' + Date.now(),
      name: name.trim(),
      description: description ? description.trim() : '',
      createdBy: myId,
      members
    };

    const groups = getStorage('groups', []);
    groups.unshift(newGroup);
    setStorage('groups', groups);
    return newGroup;
  },

  async addMember(groupId, email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) throw new Error('Email is required');

    const users = getStorage('users', []);
    let u = users.find(x => (x.email || '').toLowerCase() === cleanEmail);
    if (!u) {
      const defaultName = cleanEmail.split('@')[0];
      u = {
        _id: 'u_' + Date.now() + Math.random().toString(36).substring(2, 6),
        name: defaultName.charAt(0).toUpperCase() + defaultName.slice(1),
        email: cleanEmail
      };
      users.push(u);
      setStorage('users', users);
    }

    const groups = getStorage('groups', []);
    const group = groups.find(g => g._id === groupId);
    if (!group) throw new Error('Group not found');

    if (!Array.isArray(group.members)) group.members = [];
    if (!group.members.some(m => (m._id || m) === u._id || m.email?.toLowerCase() === cleanEmail)) {
      group.members.push({ _id: u._id, name: u.name, email: u.email });
      setStorage('groups', groups);
    }
    return group;
  },

  async getGroupDetails(groupId) {
    const groups = getStorage('groups', []);
    return groups.find(g => g._id === groupId) || null;
  },

  async addExpense(groupId, expenseData) {
    const users = getStorage('users', []);
    
    const paidByUser = users.find(u => u._id === expenseData.paidBy) || this.currentUser;


    const newExpense = {
      _id: 'e_' + Date.now(),
      group: groupId,
      title: expenseData.title,
      amount: parseFloat(expenseData.amount),
      paidBy: paidByUser,
      category: expenseData.category || 'General',
      splitType: expenseData.splitType || 'equal',
      splits: expenseData.splits.map(s => ({
        user: users.find(u => u._id === s.user) || { _id: s.user, name: 'Member' },
        amount: parseFloat(s.amount),
        percentage: parseFloat(s.percentage || 0)
      })),
      date: new Date().toISOString()
    };

    const expenses = getStorage('expenses', []);
    expenses.unshift(newExpense);
    setStorage('expenses', expenses);
    return newExpense;
  },

  async getExpenses(groupId) {
    const expenses = getStorage('expenses', []);
    return expenses.filter(e => e.group === groupId);
  },

  async getBalances(groupId) {
    const group = await this.getGroupDetails(groupId);
    const expenses = await this.getExpenses(groupId);
    const settlements = getStorage('settlements', []).filter(s => s.group === groupId);
    return calculateNetBalances(group.members, expenses, settlements);
  },

  async getOptimizedSettlements(groupId) {
    const balances = await this.getBalances(groupId);
    const optimized = computeOptimizedSettlements(balances);
    return { optimizedTransactions: optimized, totalTransactions: optimized.length };
  },

  async recordSettlement(groupId, { fromUser, toUser, amount, notes }) {
    const users = getStorage('users', []);
    const from = users.find(u => u._id === fromUser);
    const to = users.find(u => u._id === toUser);

    const settlement = {
      _id: 's_' + Date.now(),
      group: groupId,
      fromUser: from,
      toUser: to,
      amount: parseFloat(amount),
      notes: notes || '',
      date: new Date().toISOString()
    };

    const settlements = getStorage('settlements', []);
    settlements.unshift(settlement);
    setStorage('settlements', settlements);
    return settlement;
  },

  async getTransactions(groupId) {
    const expenses = (await this.getExpenses(groupId)).map(e => ({ ...e, type: 'expense' }));
    const settlements = getStorage('settlements', [])
      .filter(s => s.group === groupId)
      .map(s => ({ ...s, type: 'settlement' }));

    return [...expenses, ...settlements].sort((a, b) => new Date(b.date) - new Date(a.date));
  }
};

// Main API Export with Auto-Fallback
export const api = {
  token: localStorage.getItem('jwt_token'),

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('jwt_token', token);
    else localStorage.removeItem('jwt_token');
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...options.headers
    };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      // Only warn for non-auth-check calls to reduce noise on initial load
      if (!endpoint.includes('/auth/me')) {
        console.warn(`API: ${endpoint} failed (${err.message}), using local mode.`);
      }
      throw err;
    }
  },

  async login(email, password) {
    try {
      const data = await this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      this.setToken(data.token);
      return data;
    } catch (_e) {
      // Offline fallback — set a local-mode marker token so session restore works
      const result = await localEngine.login(email);
      this.setToken('local-mode');
      return result;
    }
  },

  async register(name, email, password) {
    try {
      const data = await this.request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
      this.setToken(data.token);
      return data;
    } catch (_e) {
      // Offline fallback — set a local-mode marker token so session restore works
      const result = await localEngine.register(name, email);
      this.setToken('local-mode');
      return result;
    }
  },

  async getMe() {
    // No token at all — not logged in, don't hit the backend
    if (!this.token) return { user: null };
    // Local offline session — restore from localStorage without a network call
    if (this.token === 'local-mode') {
      return { user: localEngine.currentUser };
    }
    // Real JWT — verify with backend
    try {
      return await this.request('/auth/me');
    } catch (_e) {
      // Token expired or invalid — clear it and force re-login
      this.setToken(null);
      return { user: null };
    }
  },

  async getGroups() {
    try {
      return await this.request('/groups');
    } catch (_e) {
      return await localEngine.getGroups();
    }
  },

  async createGroup(name, description, memberEmails) {
    try {
      return await this.request('/groups', { method: 'POST', body: JSON.stringify({ name, description, memberEmails }) });
    } catch (_e) {
      return await localEngine.createGroup(name, description, memberEmails);
    }
  },

  async addMember(groupId, emailOrUserId) {
    try {
      const payload = typeof emailOrUserId === 'object' ? emailOrUserId : (emailOrUserId.includes('@') ? { email: emailOrUserId } : { userId: emailOrUserId });
      return await this.request(`/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify(payload) });
    } catch (_e) {
      return await localEngine.addMember(groupId, typeof emailOrUserId === 'string' ? emailOrUserId : (emailOrUserId.email || emailOrUserId.userId));
    }
  },

  async getGroupDetails(groupId) {
    try {
      return await this.request(`/groups/${groupId}`);
    } catch (_e) {
      return await localEngine.getGroupDetails(groupId);
    }
  },

  async addExpense(groupId, expenseData) {
    try {
      return await this.request(`/groups/${groupId}/expenses`, { method: 'POST', body: JSON.stringify(expenseData) });
    } catch (_e) {
      return await localEngine.addExpense(groupId, expenseData);
    }
  },

  async getExpenses(groupId) {
    try {
      return await this.request(`/groups/${groupId}/expenses`);
    } catch (_e) {
      return await localEngine.getExpenses(groupId);
    }
  },

  async getBalances(groupId) {
    try {
      return await this.request(`/groups/${groupId}/balances`);
    } catch (_e) {
      return await localEngine.getBalances(groupId);
    }
  },

  async getOptimizedSettlements(groupId) {
    try {
      return await this.request(`/groups/${groupId}/settlements/optimized`);
    } catch (_e) {
      return await localEngine.getOptimizedSettlements(groupId);
    }
  },

  async recordSettlement(groupId, data) {
    try {
      return await this.request(`/groups/${groupId}/settlements`, { method: 'POST', body: JSON.stringify(data) });
    } catch (_e) {
      return await localEngine.recordSettlement(groupId, data);
    }
  },

  async getTransactions(groupId) {
    try {
      return await this.request(`/groups/${groupId}/transactions`);
    } catch (_e) {
      return await localEngine.getTransactions(groupId);
    }
  }
};

