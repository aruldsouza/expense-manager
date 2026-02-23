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

// Flag to prevent infinite refresh loops
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Response interceptor for catching 401s and refreshing token
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If the error is 401 and it's not a retry or the refresh endpoint itself
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/refresh')) {

            if (isRefreshing) {
                // If a refresh is already in progress, queue the request
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = 'Bearer ' + token;
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Attempt to refresh token
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) throw new Error('No refresh token available');

                // Bypass interceptors for the refresh request to avoid loops
                const res = await axios.post(`${getBaseUrl()}/auth/refresh`, { refreshToken });
                const newToken = res.data.data.token;

                // Update local storage
                localStorage.setItem('token', newToken);

                // Re-run pending requests in queue
                processQueue(null, newToken);

                // Retry the original request with new token
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);

            } catch (refreshError) {
                // If refresh fails (e.g., refresh token expired/invalid)
                processQueue(refreshError, null);
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login'; // Force login
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

// ─── Recurring Expense API helpers ───────────────────────────────────────────
export const getRecurringExpenses = (groupId) => api.get(`/groups/${groupId}/recurring`);
export const createRecurringExpense = (groupId, data) => api.post(`/groups/${groupId}/recurring`, data);
export const updateRecurringExpense = (groupId, id, data) => api.put(`/groups/${groupId}/recurring/${id}`, data);
export const deleteRecurringExpense = (groupId, id) => api.delete(`/groups/${groupId}/recurring/${id}`);
export const pauseRecurringExpense = (groupId, id) => api.patch(`/groups/${groupId}/recurring/${id}/pause`);
export const resumeRecurringExpense = (groupId, id) => api.patch(`/groups/${groupId}/recurring/${id}/resume`);

export default api;
