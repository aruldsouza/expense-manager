const mongoose = require('mongoose');

const CATEGORIES = ['Food', 'Travel', 'Utilities', 'Rent', 'Entertainment', 'Shopping', 'Health', 'Transport', 'Other', 'Custom'];

const budgetSchema = new mongoose.Schema({
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    category: {
        type: String,
        enum: CATEGORIES,
        required: [true, 'Category is required']
    },
    // Format: "YYYY-MM" — e.g. "2026-02"
    monthYear: {
        type: String,
        required: [true, 'Month/Year is required'],
        match: [/^\d{4}-\d{2}$/, 'monthYear must be in YYYY-MM format']
    },
    limit: {
        type: Number,
        required: [true, 'Budget limit is required'],
        min: [0.01, 'Limit must be positive']
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// One budget per category per month per group
budgetSchema.index({ group: 1, category: 1, monthYear: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
module.exports.CATEGORIES = CATEGORIES;
