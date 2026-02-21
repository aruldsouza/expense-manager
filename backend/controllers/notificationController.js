const Notification = require('../models/Notification');

// @desc  List notifications for the logged-in user
// @route GET /api/notifications
const getNotifications = async (req, res, next) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        res.json({ success: true, data: notifications });
    } catch (err) { next(err); }
};

// @desc  Unread notification count
// @route GET /api/notifications/unread-count
const getUnreadCount = async (req, res, next) => {
    try {
        const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
        res.json({ success: true, data: { count } });
    } catch (err) { next(err); }
};

// @desc  Mark a single notification as read
// @route PATCH /api/notifications/:id/read
const markAsRead = async (req, res, next) => {
    try {
        const notif = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { isRead: true },
            { new: true }
        );
        if (!notif) { res.status(404); throw new Error('Notification not found'); }
        res.json({ success: true, data: notif });
    } catch (err) { next(err); }
};

// @desc  Mark ALL notifications as read
// @route PATCH /api/notifications/read-all
const markAllAsRead = async (req, res, next) => {
    try {
        await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
        res.json({ success: true, data: {} });
    } catch (err) { next(err); }
};

// @desc  Delete a notification
// @route DELETE /api/notifications/:id
const deleteNotification = async (req, res, next) => {
    try {
        const notif = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
        if (!notif) { res.status(404); throw new Error('Notification not found'); }
        res.json({ success: true, data: {} });
    } catch (err) { next(err); }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification };
