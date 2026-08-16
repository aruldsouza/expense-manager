/**
 * usePendingSync.js
 *
 * A hook that:
 * 1. Detects online/offline status changes
 * 2. Queues failed API write operations (POST/PUT/DELETE) in localStorage
 * 3. Automatically retries (flushes) the queue when the user comes back online
 * 4. Returns { isOnline, pendingCount, clearQueue }
 */
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const QUEUE_KEY = 'expense_manager_pending_sync';

const getQueue = () => {
    try {
        return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
        return [];
    }
};

const saveQueue = (queue) => {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {
        /* storage full — silently skip */
    }
};

/**
 * Add a failed request to the pending queue.
 * Called externally (e.g., from api interceptor) when offline.
 *
 * @param {{ method: string, url: string, data: any, description: string }} entry
 */
export const queueRequest = (entry) => {
    const queue = getQueue();
    queue.push({ ...entry, id: Date.now(), queuedAt: new Date().toISOString() });
    saveQueue(queue);
};

const usePendingSync = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingCount, setPendingCount] = useState(getQueue().length);

    // Refresh pending count from storage
    const refreshCount = useCallback(() => {
        setPendingCount(getQueue().length);
    }, []);

    // Flush the queue when coming online
    const flushQueue = useCallback(async () => {
        const queue = getQueue();
        if (queue.length === 0) return;

        toast('🔄 Syncing offline changes…', { id: 'sync' });

        let succeeded = 0;
        let failed = 0;
        const remaining = [];

        for (const item of queue) {
            try {
                await api({ method: item.method, url: item.url, data: item.data });
                succeeded++;
            } catch {
                failed++;
                remaining.push(item);
            }
        }

        saveQueue(remaining);
        setPendingCount(remaining.length);

        if (succeeded > 0) toast.success(`✅ ${succeeded} offline change(s) synced!`, { id: 'sync' });
        if (failed > 0) toast.error(`❌ ${failed} change(s) could not be synced`, { id: 'sync-err' });
    }, []);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            flushQueue();
        };
        const handleOffline = () => {
            setIsOnline(false);
            toast.error('You are offline. Changes will sync when back online.', {
                id: 'offline-toast',
                duration: Infinity,
                icon: '📶'
            });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Also refresh count periodically (in case other tabs write to queue)
        const interval = setInterval(refreshCount, 5000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, [flushQueue, refreshCount]);

    const clearQueue = useCallback(() => {
        saveQueue([]);
        setPendingCount(0);
        toast('🗑️ Pending sync queue cleared', { id: 'queue-clear' });
    }, []);

    return { isOnline, pendingCount, clearQueue, refreshCount };
};

export default usePendingSync;
