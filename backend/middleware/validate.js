const { check, validationResult } = require('express-validator');

// Validation error handler
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorList = errors.array().map(err => ({
            field: err.path || err.param,
            message: err.msg
        }));
        return res.status(400).json({
            error: errorList[0].message,
            success: false,
            errors: errorList
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
    check('members').optional().isArray(),
    check('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter ISO 4217 code').toUpperCase(),
    validate
];

const expenseValidation = [
    check().custom((value, { req }) => {
        const title = req.body.title || req.body.description;
        if (!title || typeof title !== 'string' || !title.trim()) {
            throw new Error('Expense title or description is required');
        }
        return true;
    }),
    check('amount', 'Amount must be a positive number').isFloat({ min: 0.01 }),
    check().custom((value, { req }) => {
        const payer = req.body.paidBy || req.body.payer;
        if (!payer) {
            throw new Error('Payer ID is required');
        }
        return true;
    }),
    check('splitType').optional().custom((val) => {
        if (!['equal', 'unequal', 'percent', 'percentage'].includes(val.toLowerCase())) {
            throw new Error('splitType must be EQUAL, UNEQUAL, or PERCENT');
        }
        return true;
    }),
    validate
];

const settlementValidation = [
    check('payee', 'Valid payee ID is required').isMongoId(),
    check('amount', 'Amount must be a positive number').isFloat({ min: 0.01 }),
    validate
];

const recurringExpenseValidation = [
    check().custom((val, { req }) => {
        const desc = req.body.title || req.body.description;
        if (!desc || typeof desc !== 'string' || !desc.trim()) {
            throw new Error('Title or description is required');
        }
        return true;
    }),
    check('amount', 'Amount must be a positive number').isFloat({ min: 0.01 }),
    check().custom((val, { req }) => {
        const payer = req.body.payer || req.body.paidBy;
        if (!payer) {
            throw new Error('Valid payer ID is required');
        }
        return true;
    }),
    check('splitType').optional().custom((val) => {
        if (!['equal', 'unequal', 'percent', 'percentage'].includes((val || '').toLowerCase())) {
            throw new Error('splitType must be EQUAL, UNEQUAL, or PERCENT');
        }
        return true;
    }),
    check('frequency', 'Frequency must be daily, weekly, monthly, or custom').custom((val) => {
        if (!['daily', 'weekly', 'monthly', 'custom'].includes((val || '').toLowerCase())) {
            throw new Error('Frequency must be daily, weekly, monthly, or custom');
        }
        return true;
    }),
    check('cronExpression')
        .if((val, { req }) => (req.body.frequency || '').toLowerCase() === 'custom')
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
