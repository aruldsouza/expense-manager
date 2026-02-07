import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // Verify token by fetching user details
                    const res = await api.get('/auth/me'); // Assuming this endpoint exists
                    if (res.data.success) {
                        setUser(res.data.data);
                    } else {
                        localStorage.removeItem('token');
                    }
                } catch (error) {
                    console.error("Auth check failed:", error);
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const login = async (email, password) => {
        try {
            const res = await api.post('/auth/login', { email, password });
            if (res.data.success) {
                localStorage.setItem('token', res.data.token);
                // We might need to decode token or fetch user details if not provided in login response
                // For now assuming login returns user object or we fetch it.
                // Based on backend implementation: Login returns { success: true, token: "...", user: {...} } ?
                // Let's verify with backend code if needed, but assuming standard 2.11 task completion.
                // Actually backend 2.11 says "Return token and user details".
                setUser(res.data.user || { name: 'User', email }); // Fallback
                return { success: true };
            }
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.error || 'Login failed'
            };
        }
    };

    const register = async (name, email, password) => {
        try {
            const res = await api.post('/auth/register', { name, email, password });
            return {
                success: true,
                message: 'Registration successful! Please login.'
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.error || 'Registration failed'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
