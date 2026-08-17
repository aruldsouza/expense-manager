import { calculateNetBalances, computeOptimizedSettlements } from './debtOptimizer';

const rawBase = (import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'production' ? 'https://expense-manager-5h2m.onrender.com/api' : 'http://localhost:5002/api')).replace(/\/+$/, '');

const API_BASE = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;


// Initial Demo Data for LocalStorage Fallback
const DEFAULT_DEMO_USERS = [
  { _id: 'u1', name: 'Alex Rivera', email: 'alex@example.com' },
  { _id: 'u2', name: 'Beatriz Chen', email: 'beatriz@example.com' },
  { _id: 'u3', name: 'Charlie Kim', email: 'charlie@example.com' },
  { _id: 'u4', name: 'David Miller', email: 'david@example.com' }
];

const DEFAULT_DEMO_GROUPS = [
  {
    _id: 'g1',
    name: 'Goa Beach Vacation 🏖️',
    description: 'Shared expenses for flights, villa, and beach clubs',
    createdBy: 'u1',
    members: DEFAULT_DEMO_USERS
  },
  {
    _id: 'g2',
    name: 'Apartment 402 Roommates 🏠',
    description: 'Monthly rent, wifi, utilities, and grocery supplies',
    createdBy: 'u2',
    members: [DEFAULT_DEMO_USERS[0], DEFAULT_DEMO_USERS[1], DEFAULT_DEMO_USERS[2]]
  }
];

const DEFAULT_DEMO_EXPENSES = [
  {
    _id: 'e1',
    group: 'g1',
    title: 'Luxury Villa Booking',
    amount: 600,
    paidBy: DEFAULT_DEMO_USERS[0], // Alex
    category: 'Accommodation',
    splitType: 'equal',
    splits: DEFAULT_DEMO_USERS.map(u => ({ user: u, amount: 150, percentage: 25 })),
    date: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  {
    _id: 'e2',
    group: 'g1',
    title: 'Seafood Dinner & Drinks',
    amount: 240,
    paidBy: DEFAULT_DEMO_USERS[1], // Beatriz
    category: 'Food',
    splitType: 'equal',
    splits: DEFAULT_DEMO_USERS.map(u => ({ user: u, amount: 60, percentage: 25 })),
    date: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    _id: 'e3',
    group: 'g1',
    title: 'Scuba Diving & Jet Ski Rental',
    amount: 180,
    paidBy: DEFAULT_DEMO_USERS[2], // Charlie
    category: 'Entertainment',
    splitType: 'equal',
    splits: DEFAULT_DEMO_USERS.map(u => ({ user: u, amount: 45, percentage: 25 })),
    date: new Date(Date.now() - 1 * 86400000).toISOString()
  }
];

const DEFAULT_DEMO_SETTLEMENTS = [];

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

// Initialize LocalStorage defaults if empty
if (!localStorage.getItem('expense_mgr_users')) setStorage('users', DEFAULT_DEMO_USERS);
if (!localStorage.getItem('expense_mgr_groups')) setStorage('groups', DEFAULT_DEMO_GROUPS);
if (!localStorage.getItem('expense_mgr_expenses')) setStorage('expenses', DEFAULT_DEMO_EXPENSES);
if (!localStorage.getItem('expense_mgr_settlements')) setStorage('settlements', DEFAULT_DEMO_SETTLEMENTS);

// Local Storage Fallback API Engine
const localEngine = {
  currentUser: getStorage('users', DEFAULT_DEMO_USERS)[0],
  
  async login(email) {
    const users = getStorage('users', DEFAULT_DEMO_USERS);
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      user = { _id: 'u_' + Date.now(), name: email.split('@')[0], email };
      users.push(user);
      setStorage('users', users);
    }
    this.currentUser = user;
    return { token: 'mock-jwt-token', user };
  },

  async register(name, email) {
    const users = getStorage('users', DEFAULT_DEMO_USERS);
    const user = { _id: 'u_' + Date.now(), name, email };
    users.push(user);
    setStorage('users', users);
    this.currentUser = user;
    return { token: 'mock-jwt-token', user };
  },

  async getGroups() {
    return getStorage('groups', DEFAULT_DEMO_GROUPS);
  },

  async createGroup(name, description, memberEmails = []) {
    const users = getStorage('users', DEFAULT_DEMO_USERS);
    const members = [this.currentUser];

    memberEmails.forEach(email => {
      if (email.trim()) {
        let u = users.find(x => x.email.toLowerCase() === email.trim().toLowerCase());
        if (!u) {
          u = { _id: 'u_' + Date.now() + Math.random().toString(36).substring(2, 5), name: email.split('@')[0], email: email.trim() };
          users.push(u);
        }
        if (!members.find(m => m._id === u._id)) members.push(u);
      }
    });

    setStorage('users', users);

    const newGroup = {
      _id: 'g_' + Date.now(),
      name,
      description: description || '',
      createdBy: this.currentUser._id,
      members
    };

    const groups = getStorage('groups', DEFAULT_DEMO_GROUPS);
    groups.unshift(newGroup);
    setStorage('groups', groups);
    return newGroup;
  },

  async getGroupDetails(groupId) {
    const groups = getStorage('groups', DEFAULT_DEMO_GROUPS);
    return groups.find(g => g._id === groupId) || groups[0];
  },

  async addExpense(groupId, expenseData) {
    const users = getStorage('users', DEFAULT_DEMO_USERS);
    
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

    const expenses = getStorage('expenses', DEFAULT_DEMO_EXPENSES);
    expenses.unshift(newExpense);
    setStorage('expenses', expenses);
    return newExpense;
  },

  async getExpenses(groupId) {
    const expenses = getStorage('expenses', DEFAULT_DEMO_EXPENSES);
    return expenses.filter(e => e.group === groupId);
  },

  async getBalances(groupId) {
    const group = await this.getGroupDetails(groupId);
    const expenses = await this.getExpenses(groupId);
    const settlements = getStorage('settlements', DEFAULT_DEMO_SETTLEMENTS).filter(s => s.group === groupId);
    return calculateNetBalances(group.members, expenses, settlements);
  },

  async getOptimizedSettlements(groupId) {
    const balances = await this.getBalances(groupId);
    const optimized = computeOptimizedSettlements(balances);
    return { optimizedTransactions: optimized, totalTransactions: optimized.length };
  },

  async recordSettlement(groupId, { fromUser, toUser, amount, notes }) {
    const users = getStorage('users', DEFAULT_DEMO_USERS);
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

    const settlements = getStorage('settlements', DEFAULT_DEMO_SETTLEMENTS);
    settlements.unshift(settlement);
    setStorage('settlements', settlements);
    return settlement;
  },

  async getTransactions(groupId) {
    const expenses = (await this.getExpenses(groupId)).map(e => ({ ...e, type: 'expense' }));
    const settlements = getStorage('settlements', DEFAULT_DEMO_SETTLEMENTS)
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
      console.warn(`Backend fetch failed for ${endpoint}: ${err.message}. Using LocalStorage engine.`);
      throw err; // Caught by wrapper to switch engine
    }
  },

  async login(email, password) {
    try {
      const data = await this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      this.setToken(data.token);
      return data;
    } catch (_e) {
      return await localEngine.login(email);
    }
  },

  async register(name, email, password) {
    try {
      const data = await this.request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
      this.setToken(data.token);
      return data;
    } catch (_e) {
      return await localEngine.register(name, email);
    }
  },

  async getMe() {
    try {
      return await this.request('/auth/me');
    } catch (_e) {
      return { user: localEngine.currentUser };
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

