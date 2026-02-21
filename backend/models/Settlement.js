const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
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
    payee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0.01, 'Amount must be positive']
    },
    date: {
        type: Date,
        default: Date.now
    },
    note: {
        type: String,
        default: '',
        trim: true,
        maxlength: [200, 'Note cannot exceed 200 characters']
    },
    isPartial: {
        type: Boolean,
        default: true  // set false by controller when amount >= outstanding debt
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Settlement', settlementSchema);
