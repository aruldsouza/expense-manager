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
  percentage: {
    type: Number,
    default: 0
  }
}, { _id: false });

/**
 * Task 7.1 — Receipt metadata subdocument.
 * All fields are optional so existing expenses without receipt data
 * are completely backward-compatible. Mongoose ignores missing fields.
 */
const lineItemSchema = new mongoose.Schema({
  name:       { type: String },
  quantity:   { type: Number, default: null },
  unitPrice:  { type: Number, default: null },
  totalPrice: { type: Number, default: null }
}, { _id: false });

const receiptMetaSchema = new mongoose.Schema({
  merchant:      { type: String,  default: null },
  currency:      { type: String,  default: null },
  subtotal:      { type: Number,  default: null },
  tax:           { type: Number,  default: null },
  discount:      { type: Number,  default: null },
  serviceCharge: { type: Number,  default: null },
  lineItems:     { type: [lineItemSchema], default: [] },
  scannedAt:     { type: Date,    default: null }
}, { _id: false });

const expenseSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Expense title is required'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Expense amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  splitType: {
    type: String,
    enum: ['equal', 'unequal', 'percentage'],
    default: 'equal'
  },
  splits: [splitSchema],
  category: {
    type: String,
    default: 'General'
  },
  date: {
    type: Date,
    default: Date.now
  },
  // Task 7.1 — Optional receipt metadata; null for manually-entered expenses
  receiptMeta: {
    type: receiptMetaSchema,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Expense', expenseSchema);
