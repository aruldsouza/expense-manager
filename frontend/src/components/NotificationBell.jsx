import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Badge, Spinner } from 'react-bootstrap';
import { FaBell, FaCheckDouble, FaTrash, FaRegBell } from 'react-icons/fa';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';

const TYPE_ICONS = {
    'expense:new': '🧾',
    'settlement:new': '💰',
    'budget:exceeded': '⚠️'
};

const timeAgo = (dateStr) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
};

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    const { on, off } = useSocket();

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/notifications');
            if (res.data.success) {
                setNotifications(res.data.data);
                setUnreadCount(res.data.data.filter(n => !n.isRead).length);
            }
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Real-time: prepend new notification from socket
    useEffect(() => {
        const handleNew = (notif) => {
            setNotifications(prev => [notif, ...prev]);
            setUnreadCount(c => c + 1);
        };
        on('notification:new', handleNew);
        return () => off('notification:new', handleNew);
    }, [on, off]);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const markRead = async (id) => {
        try {
            await api.patch(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            setUnreadCount(c => Math.max(0, c - 1));
        } catch { /* silent */ }
    };

    const markAllRead = async () => {
        try {
            await api.patch('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch { /* silent */ }
    };

    const deleteNotif = async (e, id) => {
        e.stopPropagation();
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(prev => {
                const removed = prev.find(n => n._id === id);
                if (removed && !removed.isRead) setUnreadCount(c => Math.max(0, c - 1));
                return prev.filter(n => n._id !== id);
            });
        } catch { /* silent */ }
    };

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            {/* Bell Button */}
            <button
                className="btn btn-outline-secondary border-0 position-relative p-2"
                onClick={() => setOpen(o => !o)}
                title="Notifications"
                style={{ lineHeight: 1 }}
            >
                {unreadCount > 0
                    ? <FaBell className="text-warning" size={18} />
                    : <FaRegBell size={18} />
                }
                {unreadCount > 0 && (
                    <Badge bg="danger" pill
                        style={{ position: 'absolute', top: '2px', right: '2px', fontSize: '0.6rem', minWidth: '16px', padding: '2px 5px' }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="shadow-lg rounded-3 border bg-white"
                    style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: '360px', maxHeight: '480px', overflowY: 'auto', zIndex: 1050 }}>
                    {/* Header */}
                    <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-light rounded-top-3">
                        <span className="fw-bold small">🔔 Notifications</span>
                        {unreadCount > 0 && (
                            <button className="btn btn-sm btn-link text-primary p-0 small d-flex align-items-center gap-1"
                                onClick={markAllRead}>
                                <FaCheckDouble size={11} /> Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    {loading ? (
                        <div className="text-center py-4"><Spinner size="sm" /></div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-4 text-muted small">
                            <FaRegBell className="mb-2" size={24} /><br />No notifications yet
                        </div>
                    ) : (
                        <div>
                            {notifications.map(n => (
                                <div
                                    key={n._id}
                                    onClick={() => !n.isRead && markRead(n._id)}
                                    className={`d-flex align-items-start gap-2 px-3 py-2 border-bottom ${!n.isRead ? 'bg-primary bg-opacity-10' : ''}`}
                                    style={{ cursor: n.isRead ? 'default' : 'pointer', transition: 'background 0.2s' }}
                                >
                                    <div style={{ fontSize: '1.2rem', lineHeight: 1.4, flexShrink: 0 }}>
                                        {TYPE_ICONS[n.type] || '🔔'}
                                    </div>
                                    <div className="flex-grow-1 min-w-0">
                                        <p className={`mb-0 small ${!n.isRead ? 'fw-semibold text-dark' : 'text-muted'}`}
                                            style={{ lineHeight: 1.4, wordBreak: 'break-word' }}>
                                            {n.message}
                                        </p>
                                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>{timeAgo(n.createdAt)}</small>
                                    </div>
                                    <button className="btn btn-sm btn-link text-danger p-0 border-0 flex-shrink-0"
                                        onClick={(e) => deleteNotif(e, n._id)} title="Dismiss">
                                        <FaTrash size={11} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
