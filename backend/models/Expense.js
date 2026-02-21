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

const expenseSchema = new mongoose.Schema({
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
    date: {
        type: Date,
        default: Date.now
    },
    category: {
        type: String,
        enum: ['Food', 'Travel', 'Utilities', 'Rent', 'Entertainment', 'Shopping', 'Health', 'Transport', 'Other', 'Custom'],
        default: 'Other'
    },
    receiptUrl: {
        type: String,
        default: null
    },
    receiptPublicId: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);
