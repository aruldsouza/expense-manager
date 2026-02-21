const { check, validationResult } = require('express-validator');

// Validation error handler
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// Validation rules
const registerValidation = [
    check('name', 'Name is required').not().isEmpty().trim().escape(),
    check('email', 'Please include a valid email').isEmail().normalizeEmail(),
    check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
    validate
];

const loginValidation = [
    check('email', 'Please include a valid email').isEmail().normalizeEmail(),
    check('password', 'Password is required').exists(),
    validate
];

const groupValidation = [
    check('name', 'Group name is required').not().isEmpty().trim().escape(),
    check('description').optional().trim().escape(),
    check('type').optional().isIn(['TRIP', 'HOME', 'COUPLE', 'OTHER']),
    check('members').optional().isArray(),
    check('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter ISO 4217 code').toUpperCase(),
    validate
];

const expenseValidation = [
    check('description', 'Description is required').not().isEmpty().trim().escape(),
    check('amount', 'Amount must be a positive number').isFloat({ min: 0.01 }),
    check('payer', 'Payer ID is required').not().isEmpty(),
    check('splitType').optional().isIn(['EQUAL', 'UNEQUAL', 'PERCENT']),
    check('category').optional().isIn(['Food', 'Travel', 'Utilities', 'Rent', 'Entertainment', 'Shopping', 'Health', 'Transport', 'Other', 'Custom']),
    validate
];

const settlementValidation = [
    check('payee', 'Valid payee ID is required').isMongoId(),
    check('amount', 'Amount must be a positive number').isFloat({ min: 0.01 }),
    validate
];

const recurringExpenseValidation = [
    check('description', 'Description is required').not().isEmpty().trim().escape(),
    check('amount', 'Amount must be a positive number').isFloat({ min: 0.01 }),
    check('payer', 'Valid payer ID is required').isMongoId(),
    check('splitType').optional().isIn(['EQUAL', 'UNEQUAL', 'PERCENT']),
    check('frequency', 'Frequency must be daily, weekly, monthly, or custom').isIn(['daily', 'weekly', 'monthly', 'custom']),
    check('cronExpression')
        .if(check('frequency').equals('custom'))
        .not().isEmpty().withMessage('Cron expression is required for custom frequency'),
    validate
];

module.exports = {
    registerValidation,
    loginValidation,
    groupValidation,
    expenseValidation,
    settlementValidation,
    recurringExpenseValidation
};
