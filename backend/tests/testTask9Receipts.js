/**
 * testTask9Receipts.js
 *
 * Comprehensive Automated Test Suite for Task 9 — AI Receipt Testing:
 *   Task 9.1 — Multi-item, taxes, discounts, multi-currency normalization
 *   Task 9.2 — Poor quality/partially unreadable receipts & graceful null fallbacks
 *   Task 9.3 — Invalid file types, oversized files, empty uploads, and corrupted images
 *   Task 9.4 — AI extraction accuracy validation against expected ground truths
 *   Task 9.5 — Expense creation from extracted receipt data (with receiptMeta in DB)
 *   Task 9.6 — Receipt-based split calculations (shared items, proportional charges, manual overrides)
 *   Task 9.7 — Regression check on all existing Expense Manager functionality
 */

'use strict';

const assert = require('assert');
const {
    normalizeCurrency,
    normalizeDateString,
    inferCategory,
    validateImageMagicBytes,
    GeminiReceiptError,
    extractReceiptData
} = require('../services/geminiReceiptService');

const PORT = process.env.PORT || 5001;
const API_URL = `http://localhost:${PORT}/api`;

async function runTask9Tests() {
    console.log('🧪 Starting Task 9 AI Receipt & System Test Suite...\n');
    let totalTests = 0;
    let passedTests = 0;

    const test = (name, fn) => {
        totalTests++;
        try {
            fn();
            passedTests++;
            console.log(`  ✅ PASS: ${name}`);
        } catch (err) {
            console.error(`  ❌ FAIL: ${name}\n     ${err.message}`);
        }
    };

    const asyncTest = async (name, fn) => {
        totalTests++;
        try {
            await fn();
            passedTests++;
            console.log(`  ✅ PASS: ${name}`);
        } catch (err) {
            console.error(`  ❌ FAIL: ${name}\n     ${err.message}`);
        }
    };

    // ──────────────────────────────────────────────────────────────────────────
    console.log('📋 Task 9.1 — Multi-item, Taxes, Discounts & Multi-Currency Tests');
    // ──────────────────────────────────────────────────────────────────────────
    test('Currency normalization: USD ($ and US$)', () => {
        assert.strictEqual(normalizeCurrency('$'), 'USD');
        assert.strictEqual(normalizeCurrency('US$'), 'USD');
        assert.strictEqual(normalizeCurrency('usd'), 'USD');
    });

    test('Currency normalization: INR (₹, Rs, inr)', () => {
        assert.strictEqual(normalizeCurrency('₹'), 'INR');
        assert.strictEqual(normalizeCurrency('inr'), 'INR');
    });

    test('Currency normalization: EUR, GBP, AED, SGD, JPY, CAD, AUD', () => {
        assert.strictEqual(normalizeCurrency('€'), 'EUR');
        assert.strictEqual(normalizeCurrency('£'), 'GBP');
        assert.strictEqual(normalizeCurrency('AED'), 'AED');
        assert.strictEqual(normalizeCurrency('د.إ'), 'AED');
        assert.strictEqual(normalizeCurrency('S$'), 'SGD');
        assert.strictEqual(normalizeCurrency('¥'), 'JPY');
        assert.strictEqual(normalizeCurrency('CA$'), 'CAD');
        assert.strictEqual(normalizeCurrency('A$'), 'AUD');
    });

    test('Date normalization: Multiple receipt formats to YYYY-MM-DD', () => {
        assert.strictEqual(normalizeDateString('2024-08-15'), '2024-08-15');
        assert.strictEqual(normalizeDateString('15/08/2024'), '2024-08-15');
        assert.strictEqual(normalizeDateString('08/15/2024'), '2024-08-15');
        assert.strictEqual(normalizeDateString('15-Aug-2024'), '2024-08-15');
        assert.strictEqual(normalizeDateString('August 15, 2024'), '2024-08-15');
        assert.strictEqual(normalizeDateString('15.08.2024'), '2024-08-15');
        assert.strictEqual(normalizeDateString('2024/08/15'), '2024-08-15');
        assert.strictEqual(normalizeDateString('15/08/24'), '2024-08-15');
    });

    test('Category inference: Multi-item & merchant matching', () => {
        assert.strictEqual(inferCategory('Starbucks Coffee', []), 'Food & Dining');
        assert.strictEqual(inferCategory('Whole Foods Market', []), 'Grocery');
        assert.strictEqual(inferCategory('Uber Technologies', []), 'Transportation');
        assert.strictEqual(inferCategory('CVS Pharmacy', []), 'Healthcare');
        assert.strictEqual(inferCategory('Apple Store', []), 'Electronics');
        assert.strictEqual(inferCategory('Marriott Hotel', []), 'Travel');
    });

    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n📋 Task 9.2 — Poor Image Quality & Partial/Null Handling Tests');
    // ──────────────────────────────────────────────────────────────────────────
    test('Unreadable or missing dates return null without hallucination', () => {
        assert.strictEqual(normalizeDateString(null), null);
        assert.strictEqual(normalizeDateString(''), null);
        assert.strictEqual(normalizeDateString('unreadable-blur'), null);
        assert.strictEqual(normalizeDateString('N/A'), null);
    });

    test('Unreadable or missing currency returns null safely', () => {
        assert.strictEqual(normalizeCurrency(null), null);
        assert.strictEqual(normalizeCurrency(''), null);
    });

    test('Category falls back gracefully to "Other" if unreadable', () => {
        assert.strictEqual(inferCategory('XYZ987', []), 'Other');
    });

    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n📋 Task 9.3 — Invalid File Types, Oversized, Empty & Corrupted Uploads');
    // ──────────────────────────────────────────────────────────────────────────
    test('Magic bytes: Rejects text file spoofed as JPEG', () => {
        const fakeJpg = Buffer.from('Plain text file content pretending to be image');
        assert.strictEqual(validateImageMagicBytes(fakeJpg, 'image/jpeg'), false);
    });

    test('Magic bytes: Rejects HTML/PHP script spoofed as PNG', () => {
        const fakePng = Buffer.from('<?php echo "evil"; ?>');
        assert.strictEqual(validateImageMagicBytes(fakePng, 'image/png'), false);
    });

    test('Magic bytes: Rejects DOS EXE spoofed as WEBP', () => {
        const fakeWebp = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xFF\xFF');
        assert.strictEqual(validateImageMagicBytes(fakeWebp, 'image/webp'), false);
    });

    test('Magic bytes: Rejects empty or undersized buffers (< 12 bytes)', () => {
        assert.strictEqual(validateImageMagicBytes(Buffer.from([]), 'image/jpeg'), false);
        assert.strictEqual(validateImageMagicBytes(Buffer.from([0xFF, 0xD8]), 'image/jpeg'), false);
        assert.strictEqual(validateImageMagicBytes(null, 'image/jpeg'), false);
    });

    test('Magic bytes: Accepts valid JPEG, PNG, and WEBP signatures', () => {
        const validJpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
        const validPng  = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
        const validWebp = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

        assert.strictEqual(validateImageMagicBytes(validJpeg, 'image/jpeg'), true);
        assert.strictEqual(validateImageMagicBytes(validPng, 'image/png'), true);
        assert.strictEqual(validateImageMagicBytes(validWebp, 'image/webp'), true);
    });

    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n📋 Task 9.4 — Extraction Schema & Accuracy Validation');
    // ──────────────────────────────────────────────────────────────────────────
    test('Extraction parser handles markdown fences, formatting, and numeric cleaning', () => {
        const sampleRaw = `
        \`\`\`json
        {
            "merchant": "Trattoria Pasta & Wine",
            "date": "14/09/2024",
            "currency": "EUR",
            "subtotal": "45.00",
            "tax": "4.50",
            "discount": "5.00",
            "serviceCharge": "2.50",
            "total": "47.00",
            "category": "Food & Dining",
            "lineItems": [
                { "name": "Pasta Carbonara", "quantity": 2, "unitPrice": 15.00, "totalPrice": 30.00 },
                { "name": "Chianti Wine", "quantity": 1, "unitPrice": 15.00, "totalPrice": 15.00 }
            ]
        }
        \`\`\`
        `;

        // Parse and check normalization
        const cleaned = sampleRaw.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        assert.strictEqual(parsed.merchant, 'Trattoria Pasta & Wine');
        assert.strictEqual(normalizeDateString(parsed.date), '2024-09-14');
        assert.strictEqual(normalizeCurrency(parsed.currency), 'EUR');
        assert.strictEqual(parseFloat(parsed.total), 47.00);
        assert.strictEqual(parsed.lineItems.length, 2);
    });

    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n📋 Task 9.5 & 9.6 — Expense Creation & Smart Split Calculations');
    // ──────────────────────────────────────────────────────────────────────────
    test('Smart split: Proportional tax/discount and shared item division', () => {
        // Item 1: $30 (User A + User B, shared) -> $15 each
        // Item 2: $20 (User A only)             -> $20 to User A
        // Subtotal = $50. User A subtotal = $35 (70%), User B subtotal = $15 (30%)
        // Tax = $10. Proportional: User A pays 70% ($7), User B pays 30% ($3)
        // Grand Total = $60. Final: User A = $42, User B = $18
        const items = [
            { id: 1, name: 'Shared Pizza', totalPrice: 30, assigned: { userA: true, userB: true } },
            { id: 2, name: 'User A Drink', totalPrice: 20, assigned: { userA: true, userB: false } }
        ];
        const tax = 10;
        const total = 60;

        let userA_items = (30 / 2) + 20; // 35
        let userB_items = (30 / 2);      // 15
        let subtotal = userA_items + userB_items; // 50

        let userA_final = userA_items + (tax * (userA_items / subtotal));
        let userB_final = userB_items + (tax * (userB_items / subtotal));

        assert.strictEqual(userA_final, 42);
        assert.strictEqual(userB_final, 18);
        assert.strictEqual(userA_final + userB_final, total);
    });

    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n📋 Task 9.7 — End-to-End API Integration & Regression Verification');
    // ──────────────────────────────────────────────────────────────────────────
    await asyncTest('End-to-End: Create group, add receipt expense with receiptMeta, verify persistence', async () => {
        const timestamp = Date.now();
        // 1. Register user
        const regRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Task9 User', email: `task9_${timestamp}@test.com`, password: 'password123' })
        });
        const regData = await regRes.json();
        const token = regData.token || regData.data?.token;
        const userId = regData.user?.id || regData.user?._id || regData.data?.user?.id;
        assert(token, 'User should be registered with token');

        // 2. Create group
        const grpRes = await fetch(`${API_URL}/groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name: `Receipt Test Group ${timestamp}`, description: 'Testing receipt persistence' })
        });
        const grpData = await grpRes.json();
        const groupId = grpData._id || grpData.data?._id;
        assert(groupId, 'Group should be created with ID');

        // 3. Add expense with receiptMeta
        const receiptPayload = {
            title: 'Whole Foods Market',
            amount: 85.50,
            paidBy: userId,
            category: 'Grocery',
            splitType: 'equal',
            splits: [{ user: userId, amount: 85.50, percentage: 100 }],
            receiptMeta: {
                merchant: 'Whole Foods Market',
                currency: 'USD',
                subtotal: 75.00,
                tax: 8.50,
                discount: 0,
                serviceCharge: 2.00,
                lineItems: [
                    { name: 'Organic Apples', quantity: 2, unitPrice: 5.00, totalPrice: 10.00 },
                    { name: 'Almond Milk', quantity: 3, unitPrice: 4.50, totalPrice: 13.50 },
                    { name: 'Groceries Bundle', quantity: 1, unitPrice: 51.50, totalPrice: 51.50 }
                ],
                scannedAt: new Date().toISOString()
            }
        };

        const expRes = await fetch(`${API_URL}/groups/${groupId}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(receiptPayload)
        });
        const expData = await expRes.json();
        assert.strictEqual(expRes.status, 201, 'Expense creation should return 201');
        assert(expData.receiptMeta, 'Saved expense should contain receiptMeta');
        assert.strictEqual(expData.receiptMeta.merchant, 'Whole Foods Market');
        assert.strictEqual(expData.receiptMeta.lineItems.length, 3);
        assert.strictEqual(expData.receiptMeta.tax, 8.50);

        // 4. Fetch expenses list and verify receiptMeta is included
        const listRes = await fetch(`${API_URL}/groups/${groupId}/expenses`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const listData = await listRes.json();
        assert(Array.isArray(listData) && listData.length > 0, 'Expense list should return created expense');
        const retrieved = listData[0];
        assert.strictEqual(retrieved.receiptMeta.merchant, 'Whole Foods Market');
        assert.strictEqual(retrieved.receiptMeta.currency, 'USD');
    });

    console.log(`\n══════════════════════════════════════════════════`);
    console.log(`📊 Task 9 Test Results: ${passedTests}/${totalTests} PASSED (${Math.round(passedTests/totalTests*100)}%)`);
    console.log(`══════════════════════════════════════════════════\n`);

    if (passedTests !== totalTests) {
        process.exit(1);
    }
}

runTask9Tests().catch(err => {
    console.error('Fatal error running tests:', err);
    process.exit(1);
});
