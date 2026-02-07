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
    validate
];

const expenseValidation = [
    check('description', 'Description is required').not().isEmpty().trim().escape(),
    check('amount', 'Amount must be a positive number').isFloat({ min: 0.01 }),
    check('payer', 'Valid payer ID is required').isMongoId(),
    check('splitType').optional().isIn(['EQUAL', 'UNEQUAL', 'PERCENT']),
    validate
];

const settlementValidation = [
    check('payee', 'Valid payee ID is required').isMongoId(),
    check('amount', 'Amount must be a positive number').isFloat({ min: 0.01 }),
    validate
];

module.exports = {
    registerValidation,
    loginValidation,
    groupValidation,
    expenseValidation,
    settlementValidation
};
