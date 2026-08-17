import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

// Backend URL — same as API base but without /api
const SOCKET_URL = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api', '')
    : 'http://localhost:5001';

export const SocketProvider = ({ children }) => {
    const socketRef = useRef(null);
    const { user } = useAuth();

    if (socketRef.current == null) {
        socketRef.current = io(SOCKET_URL, {
            withCredentials: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            transports: ['websocket', 'polling']
        });
    }


    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const onConnect = () => {
            console.log('🔌 Socket connected:', socket.id);
        };
        const onError = (err) => {
            console.warn('Socket connection error:', err.message);
        };

        socket.on('connect', onConnect);
        socket.on('connect_error', onError);

        return () => {
            socket.off('connect', onConnect);
            socket.off('connect_error', onError);
        };
    }, []);


    const joinGroup = (groupId) => {
        if (socketRef.current && groupId) {
            socketRef.current.emit('join:group', groupId);
        }
    };

    const leaveGroup = (groupId) => {
        if (socketRef.current && groupId) {
            socketRef.current.emit('leave:group', groupId);
        }
    };

    // Join private user room — call once after login with user._id
    const joinUser = (userId) => {
        if (socketRef.current && userId) {
            socketRef.current.emit('join:user', userId);
        }
    };

    // Auto-join user room when authenticated
    useEffect(() => {
        if (user?._id) {
            joinUser(user._id);
        }
    }, [user?._id]);

    const on = (event, handler) => {
        socketRef.current?.on(event, handler);
    };

    const off = (event, handler) => {
        socketRef.current?.off(event, handler);
    };

    return (
        // eslint-disable-next-line react-hooks/refs
        <SocketContext.Provider value={{ joinGroup, leaveGroup, joinUser, on, off, socket: socketRef.current }}>
            {children}
        </SocketContext.Provider>
    );
};


// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => useContext(SocketContext);

