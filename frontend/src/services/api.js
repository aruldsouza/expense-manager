import axios from 'axios';
import { calculateNetBalances, computeOptimizedSettlements } from './debtOptimizer';

// Detect API base at runtime — works for localhost, Vercel, Render, and custom domains
function getApiBase() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Local development only
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.')) {
      return 'http://localhost:5001/api';
    }
  }
  // All deployed / cloud environments (Vercel, Render, etc.)
  return 'https://expense-manager-5h2m.onrender.com/api';
}

const API_BASE = getApiBase();

// ── Axios default export (used by all pages/components via `import api from '...'`) ──
const axiosInstance = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token from localStorage before every request
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token && token !== 'local-mode') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Pass through errors so callers can inspect error.response?.data
axiosInstance.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

export default axiosInstance;


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
  } catch (_) {
    // Ignore error during cleanup
  }
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
      if (creatorId && (creatorId === currentId || creatorId.toLowerCase() === currentEmail)) return true;

      if (Array.isArray(g.members)) {
        return g.members.some(m => {
          if (!m) return false;
          if (typeof m === 'string') {
            const cleanM = m.toLowerCase().trim();
            return cleanM === currentId.toLowerCase() || cleanM === currentEmail;
          }
          const mId = (m._id || m.id || '').toString();
          const mEmail = (m.email || '').toLowerCase().trim();
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
        if (!members.find(m => m._id === u._id || (m.email || '').toLowerCase() === cleanEmail)) {
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
    if (!group.members.some(m => (m._id || m.id || m) === u._id || (m.email || '').toLowerCase() === cleanEmail)) {
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

// ── One-time migration: move token from old key ('token') to new key ('jwt_token') ──
(function migrateTokenKey() {
  try {
    const oldToken = localStorage.getItem('token');
    const newToken = localStorage.getItem('jwt_token');
    if (oldToken && !newToken) {
      localStorage.setItem('jwt_token', oldToken);
    }
    // Remove old key regardless so it doesn't cause confusion
    if (oldToken) localStorage.removeItem('token');
  } catch (_) {
    // Ignore migration error
  }
})();

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
      // Backend now returns { success, data: { token, user } }
      const token = data.data?.token || data.token;
      const user = data.data?.user || data.user;
      this.setToken(token);
      return { token, user };
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
      // Backend now returns { success, data: { token, user } }
      const token = data.data?.token || data.token;
      const user = data.data?.user || data.user;
      this.setToken(token);
      return { token, user };
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
    // Real JWT — verify with backend; backend returns { success, data: { user } }
    try {
      const data = await this.request('/auth/me');
      const user = data.data?.user || data.user || null;
      return { user };
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
  },

  /**
   * Task 4 — Scan Receipt
   * Sends a receipt image file to the backend Gemini extraction endpoint.
   * Uses FormData (multipart) so the file buffer is sent correctly.
   *
   * @param {File} imageFile - The receipt image File object from the file input or drop event
   * @returns {Promise<object>} - { success, data: { merchant, date, currency, ... } }
   */
  async scanReceipt(imageFile) {
    const formData = new FormData();
    formData.append('receipt', imageFile);

    const res = await fetch(`${API_BASE}/receipt/scan`, {
      method: 'POST',
      headers: {
        // Do NOT set Content-Type — the browser sets it automatically with boundary for FormData
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {})
      },
      body: formData
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `Receipt scan failed (HTTP ${res.status})`);
    }

    return data;
  }
};

