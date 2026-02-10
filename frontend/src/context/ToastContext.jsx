import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
/* eslint-disable react-refresh/only-export-components */

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        // Map custom types to Bootstrap variants
        let variant = 'info';
        if (type === 'error') variant = 'danger';
        else if (type === 'success') variant = 'success';
        else variant = 'primary';

        setToasts((prev) => [...prev, { id, message, variant }]);

        // Auto remove
        setTimeout(() => removeToast(id), 3000);
    }, [removeToast]);

    const success = (msg) => addToast(msg, 'success');
    const error = (msg) => addToast(msg, 'error');
    const info = (msg) => addToast(msg, 'info');

    return (
        <ToastContext.Provider value={{ addToast, removeToast, success, error, info }}>
            {children}
            <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1055, position: 'fixed' }}>
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        onClose={() => removeToast(toast.id)}
                        show={true}
                        delay={3000}
                        autohide
                        bg={toast.variant}
                    >
                        <Toast.Header>
                            <strong className="me-auto text-capitalize">{toast.variant === 'danger' ? 'Error' : toast.variant}</strong>
                        </Toast.Header>
                        <Toast.Body className={toast.variant === 'light' ? 'text-dark' : 'text-white'}>
                            {toast.message}
                        </Toast.Body>
                    </Toast>
                ))}
            </ToastContainer>
        </ToastContext.Provider>
    );
};
