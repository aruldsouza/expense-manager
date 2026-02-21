import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

// Backend URL — same as API base but without /api
const SOCKET_URL = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api', '')
    : 'http://localhost:5001';

export const SocketProvider = ({ children }) => {
    const socketRef = useRef(null);

    useEffect(() => {
        // Create a single socket connection for the lifetime of the app
        socketRef.current = io(SOCKET_URL, {
            withCredentials: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            transports: ['websocket', 'polling']
        });

        const socket = socketRef.current;

        socket.on('connect', () => {
            console.log('🔌 Socket connected:', socket.id);
        });
        socket.on('connect_error', (err) => {
            console.warn('Socket connection error:', err.message);
        });

        return () => {
            socket.disconnect();
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

    const on = (event, handler) => {
        socketRef.current?.on(event, handler);
    };

    const off = (event, handler) => {
        socketRef.current?.off(event, handler);
    };

    return (
        <SocketContext.Provider value={{ joinGroup, leaveGroup, joinUser, on, off, socket: socketRef.current }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
