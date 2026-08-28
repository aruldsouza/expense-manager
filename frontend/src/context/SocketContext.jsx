import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

// Detect socket URL at runtime — same logic as API base
function getSocketUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace('/api', '').replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.')) {
      return 'http://localhost:5001';
    }
  }
  return 'https://expense-manager-5h2m.onrender.com';
}

const SOCKET_URL = getSocketUrl();

export const SocketProvider = ({ children }) => {
    const socketRef = useRef(null);
    const { user } = useAuth();
    const userId = user?._id;

    if (socketRef.current == null) {
        socketRef.current = io(SOCKET_URL, {
            withCredentials: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
            transports: ['polling', 'websocket']
        });
    }

    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const onConnect = () => {
            console.log('🔌 Socket connected:', socket.id);
        };
        const onError = (_err) => {
            // Silently handle socket connection error to avoid console error spam
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
        if (userId) {
            joinUser(userId);
        }
    }, [userId]);


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

