import axios from 'axios';

const getBaseUrl = () => {
    let url = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';
    if (!url.endsWith('/api')) {
        url += '/api';
    }
    return url;
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ─── Recurring Expense API helpers ───────────────────────────────────────────
export const getRecurringExpenses = (groupId) => api.get(`/groups/${groupId}/recurring`);
export const createRecurringExpense = (groupId, data) => api.post(`/groups/${groupId}/recurring`, data);
export const updateRecurringExpense = (groupId, id, data) => api.put(`/groups/${groupId}/recurring/${id}`, data);
export const deleteRecurringExpense = (groupId, id) => api.delete(`/groups/${groupId}/recurring/${id}`);
export const pauseRecurringExpense = (groupId, id) => api.patch(`/groups/${groupId}/recurring/${id}/pause`);
export const resumeRecurringExpense = (groupId, id) => api.patch(`/groups/${groupId}/recurring/${id}/resume`);

export default api;
