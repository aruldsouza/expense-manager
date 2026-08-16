const mongoose = require('mongoose');

const splitTemplateSchema = new mongoose.Schema({
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Template name is required'],
        trim: true,
        maxlength: [60, 'Name cannot exceed 60 characters']
    },
    splitType: {
        type: String,
        enum: ['EQUAL', 'UNEQUAL', 'PERCENT'],
        required: true
    },
    // Involved member IDs for EQUAL splits
    involvedMembers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    // Per-member amounts/percentages for UNEQUAL/PERCENT
    splits: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        value: { type: Number, default: 0 } // amount or percent depending on splitType
    }],
    // Default payer (optional — if null, user picks at expense time)
    defaultPayer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    isFavorite: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('SplitTemplate', splitTemplateSchema);
