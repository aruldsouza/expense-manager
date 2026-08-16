const mongoose = require('mongoose');

const splitSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    percent: {
        type: Number
    }
}, { _id: false });

const recurringExpenseSchema = new mongoose.Schema({
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0.01, 'Amount must be positive']
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    payer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    splitType: {
        type: String,
        enum: ['EQUAL', 'UNEQUAL', 'PERCENT'],
        default: 'EQUAL'
    },
    splits: [splitSchema],
    frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'custom'],
        required: [true, 'Frequency is required']
    },
    // Only used when frequency === 'custom'
    cronExpression: {
        type: String,
        default: null
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    nextRunAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'paused'],
        default: 'active'
    },
    lastGeneratedAt: {
        type: Date,
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

/**
 * Compute the next run date based on the current nextRunAt and frequency.
 */
recurringExpenseSchema.methods.computeNextRunAt = function () {
    const base = new Date(this.nextRunAt);
    switch (this.frequency) {
        case 'daily':
            base.setDate(base.getDate() + 1);
            break;
        case 'weekly':
            base.setDate(base.getDate() + 7);
            break;
        case 'monthly':
            base.setMonth(base.getMonth() + 1);
            break;
        case 'custom':
            // For custom cron, nextRunAt is managed by the cron job itself.
            // We just advance by 1 minute as a fallback — scheduler handles fine-grained control.
            base.setMinutes(base.getMinutes() + 1);
            break;
    }
    return base;
};

module.exports = mongoose.model('RecurringExpense', recurringExpenseSchema);
