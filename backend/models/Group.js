const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Group name is required'],
        trim: true,
        maxlength: [100, 'Group name cannot exceed 100 characters']
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['Admin', 'Member', 'Viewer'],
            default: 'Member'
        }
    }],
    type: {
        type: String,
        enum: ['Home', 'Trip', 'Couple', 'Other'],
        default: 'Other'
    },
    currency: {
        type: String,
        default: 'USD'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Group', groupSchema);
