const Notification = require('../models/Notification');
const { getIO } = require('../socket');

/**
 * Create notifications for one or more recipients and push them via Socket.IO.
 *
 * @param {string[]} recipientIds  - Array of User ObjectId strings to notify
 * @param {string}   type          - 'expense:new' | 'settlement:new' | 'budget:exceeded'
 * @param {string}   message       - Human-readable notification text
 * @param {object}   meta          - { groupId?, relatedId? }
 */
const createNotifications = async (recipientIds, type, message, meta = {}) => {
    try {
        const docs = recipientIds.map(id => ({
            recipient: id,
            type,
            message,
            groupId: meta.groupId || null,
            relatedId: meta.relatedId || null,
            isRead: false
        }));

        const notifications = await Notification.insertMany(docs);

        // Push real-time to each recipient's private socket room
        const io = getIO();
        notifications.forEach(notif => {
            io.to(`user:${notif.recipient.toString()}`).emit('notification:new', notif);
        });
    } catch (err) {
        // Non-fatal — log and continue
        console.warn('createNotifications error:', err.message);
    }
};

module.exports = { createNotifications };
