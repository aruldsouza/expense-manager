import React, { createContext, useContext, useState, useCallback } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

// Toast Component
const Toast = ({ type, message, onClose }) => {
    let bg = 'bg-white';
    let icon = null;
    let border = 'border-l-4';

    switch (type) {
        case 'success':
            bg = 'bg-white';
            border += ' border-green-500';
            icon = <FaCheckCircle className="text-green-500 text-xl" />;
            break;
        case 'error':
            bg = 'bg-white';
            border += ' border-red-500';
            icon = <FaExclamationCircle className="text-red-500 text-xl" />;
            break;
        case 'info':
        default:
            bg = 'bg-white';
            border += ' border-blue-500';
            icon = <FaInfoCircle className="text-blue-500 text-xl" />;
            break;
    }

    return (
        <div className={`flex items-start shadow-lg rounded-lg p-4 mb-3 w-80 animate-slide-in relative ${bg} ${border} transition-all duration-300`}>
            <div className="mr-3 mt-0.5">{icon}</div>
            <div className="flex-1">
                <p className="text-gray-800 text-sm font-medium">{message}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-2">
                <FaTimes size={14} />
            </button>
        </div>
    );
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto remove after 3s
        setTimeout(() => {
            removeToast(id);
        }, 3000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Helper functions
    const success = (msg) => addToast(msg, 'success');
    const error = (msg) => addToast(msg, 'error');
    const info = (msg) => addToast(msg, 'info');

    return (
        <ToastContext.Provider value={{ addToast, removeToast, success, error, info }}>
            {children}
            {/* Toast Container */}
            <div className="fixed top-5 right-5 z-50 flex flex-col items-end pointer-events-none">
                <div className="pointer-events-auto">
                    {toasts.map(toast => (
                        <Toast
                            key={toast.id}
                            {...toast}
                            onClose={() => removeToast(toast.id)}
                        />
                    ))}
                </div>
            </div>
        </ToastContext.Provider>
    );
};
