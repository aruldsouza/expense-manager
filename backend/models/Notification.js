const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['expense:new', 'settlement:new', 'budget:exceeded'],
        required: true
    },
    message: {
        type: String,
        required: true,
        maxlength: 300
    },
    // Optional context for deep-linking
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    relatedId: { type: mongoose.Schema.Types.ObjectId, default: null }, // expense / settlement / budget id
    isRead: { type: Boolean, default: false }
}, {
    timestamps: true
});

// Auto-delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', notificationSchema);
