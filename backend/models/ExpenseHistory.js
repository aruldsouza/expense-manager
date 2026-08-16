const mongoose = require('mongoose');

const expenseHistorySchema = new mongoose.Schema({
    expense: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Expense',
        required: true
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    editedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    oldValues: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    newValues: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ExpenseHistory', expenseHistorySchema);
