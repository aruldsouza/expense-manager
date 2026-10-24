const assert = require('assert');
const { getStripe, isStripeConfigured, isTestMode, validateStripeWebhookConfig } = require('../config/stripe');

console.log('═════════════════════════════════════════════════════════════');
console.log('   TASK 2: STRIPE CONFIGURATION & INITIALIZATION TESTS       ');
console.log('═════════════════════════════════════════════════════════════\n');

// Test 2.1 & 2.11: Graceful handling when key is placeholder or missing
console.log('Testing 2.11: Graceful handling of placeholder keys...');
const originalKey = process.env.STRIPE_SECRET_KEY;
process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder_for_development';

assert.strictEqual(isStripeConfigured(), false, 'Placeholder key should be marked as unconfigured');

try {
    getStripe();
    assert.fail('Should have thrown 503 for unconfigured key');
} catch (err) {
    assert.strictEqual(err.statusCode, 503, 'Should return statusCode 503');
    assert.strictEqual(err.code, 'STRIPE_NOT_CONFIGURED', 'Should return code STRIPE_NOT_CONFIGURED');
    console.log('  ✔ PASS: getStripe() throws 503 when Stripe is unconfigured or placeholder');
}

// Test 2.12: Test mode detection
console.log('\nTesting 2.12: Test-mode detection...');
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_secret_key_12345';
assert.strictEqual(isStripeConfigured(), true, 'Valid test key should be marked as configured');
assert.strictEqual(isTestMode(), true, 'Key starting with sk_test_ should be identified as test mode');
console.log('  ✔ PASS: isTestMode() correctly identifies Stripe test mode');

// Test 2.6 & 2.10: Webhook secret validation
console.log('\nTesting 2.6 & 2.10: Webhook secret validation...');
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder_for_development';
try {
    validateStripeWebhookConfig();
    assert.fail('Should throw error for placeholder webhook secret');
} catch (err) {
    assert.strictEqual(err.statusCode, 503);
    assert.strictEqual(err.code, 'STRIPE_WEBHOOK_NOT_CONFIGURED');
    console.log('  ✔ PASS: validateStripeWebhookConfig() rejects missing/placeholder webhook secrets gracefully');
}

process.env.STRIPE_WEBHOOK_SECRET = 'whsec_real_test_signing_secret_998877';
const validated = validateStripeWebhookConfig();
assert.strictEqual(validated, 'whsec_real_test_signing_secret_998877');
console.log('  ✔ PASS: validateStripeWebhookConfig() returns trimmed valid webhook secret');

// Restore original
process.env.STRIPE_SECRET_KEY = originalKey;

console.log('\n═════════════════════════════════════════════════════════════');
console.log('RESULT: ALL TASK 2 TESTS PASSED (100%)');
console.log('═════════════════════════════════════════════════════════════\n');
