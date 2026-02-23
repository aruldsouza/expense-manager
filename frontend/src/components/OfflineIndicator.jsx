import React from 'react';
import { Alert, Badge, Button } from 'react-bootstrap';
import { FaWifi, FaExclamationTriangle, FaSync, FaTrash } from 'react-icons/fa';
import usePendingSync from '../hooks/usePendingSync';

/**
 * OfflineIndicator
 *
 * Displays a sticky banner when the user is offline.
 * When back online, shows a success badge that auto-dismisses.
 * Also shows a badge with the count of queued (pending-sync) actions.
 */
const OfflineIndicator = () => {
    const { isOnline, pendingCount, clearQueue } = usePendingSync();

    if (isOnline && pendingCount === 0) return null;

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 16,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                minWidth: 300,
                maxWidth: 460,
                pointerEvents: 'auto'
            }}
        >
            {!isOnline ? (
                <Alert
                    variant="dark"
                    className="d-flex align-items-center gap-2 shadow-lg mb-0 rounded-pill py-2 px-4 border-0"
                    style={{ background: '#1e3a5f', color: 'white' }}
                >
                    <FaExclamationTriangle className="text-warning flex-shrink-0" />
                    <div className="flex-grow-1">
                        <span className="fw-semibold">You're offline</span>
                        <span className="ms-2 text-white-50 small">Changes saved locally</span>
                    </div>
                    {pendingCount > 0 && (
                        <Badge bg="warning" text="dark" pill>
                            {pendingCount} queued
                        </Badge>
                    )}
                </Alert>
            ) : (
                /* Online but still has queued items */
                <Alert
                    variant="info"
                    className="d-flex align-items-center gap-2 shadow-lg mb-0 rounded-pill py-2 px-4 border-0"
                    style={{ background: '#0d6efd', color: 'white' }}
                >
                    <FaSync className="flex-shrink-0" style={{ animation: 'spin 1.2s linear infinite' }} />
                    <div className="flex-grow-1">
                        <span className="fw-semibold">Syncing…</span>
                        <span className="ms-2 text-white-50 small">{pendingCount} pending action(s)</span>
                    </div>
                    <Button
                        size="sm"
                        variant="outline-light"
                        className="rounded-pill py-0 px-2"
                        style={{ fontSize: '0.7rem' }}
                        onClick={clearQueue}
                        title="Discard all queued offline changes"
                    >
                        <FaTrash size={10} className="me-1" />Discard
                    </Button>
                </Alert>
            )}
        </div>
    );
};

export default OfflineIndicator;
