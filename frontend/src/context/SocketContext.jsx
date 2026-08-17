import React, { createContext, useContext, useEffect, useRef } from 'react';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const socketRef = useRef(null);

    const joinGroup = () => {};
    const leaveGroup = () => {};
    const joinUser = () => {};
    const on = () => {};
    const off = () => {};

    return (
        <SocketContext.Provider value={{ joinGroup, leaveGroup, joinUser, on, off, socket: null }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
