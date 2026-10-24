const Stripe = require('stripe');

/**
 * Stripe Payment Gateway Configuration & Initializer
 *
 * Provides safe singleton initialization, test-mode detection,
 * configuration validation, and webhook signature verification.
 */

let stripeInstance = null;

/**
 * Check if Stripe is configured with a real or valid secret key
 */
const isStripeConfigured = () => {
    const key = process.env.STRIPE_SECRET_KEY;
    return Boolean(key && key.trim().length > 0 && !key.includes('placeholder'));
};

/**
 * Check if the active configuration is in test mode
 */
const isTestMode = () => {
    const key = process.env.STRIPE_SECRET_KEY || '';
    return key.startsWith('sk_test_');
};

/**
 * Get or initialize the Stripe SDK instance.
 * Throws a graceful 503 error if Stripe is not configured.
 */
const getStripe = () => {
    if (!isStripeConfigured()) {
        const error = new Error('Stripe payment gateway is not configured on this server. Please configure STRIPE_SECRET_KEY.');
        error.statusCode = 503;
        error.code = 'STRIPE_NOT_CONFIGURED';
        throw error;
    }

    if (!stripeInstance) {
        stripeInstance = Stripe(process.env.STRIPE_SECRET_KEY.trim(), {
            apiVersion: '2023-10-16', // Consistent API version
            appInfo: {
                name: 'SplitSmart Expense Manager',
                version: '1.0.0'
            }
        });
    }

    return stripeInstance;
};

/**
 * Validate webhook configuration
 */
const validateStripeWebhookConfig = () => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || secret.includes('placeholder')) {
        const error = new Error('Stripe webhook signing secret is not configured. Please set STRIPE_WEBHOOK_SECRET.');
        error.statusCode = 503;
        error.code = 'STRIPE_WEBHOOK_NOT_CONFIGURED';
        throw error;
    }
    return secret.trim();
};

module.exports = {
    getStripe,
    isStripeConfigured,
    isTestMode,
    validateStripeWebhookConfig
};
