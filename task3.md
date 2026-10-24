# 📋 TASK.md — Direct In-App Stripe Settlement Payments

**Project: Expense Manager — Integrated Stripe Payment Gateway**

**Payment Gateway:** Stripe

**Main Frontend Component:** `StripePaymentModal.jsx`

**Main Backend Controller:** `paymentController.js`

**Base API URL:** `/api`

**Instructions:** Complete ONE task at a time. Mark a task as completed only after implementing and verifying it successfully.

---

## 1️⃣ Analyze the Existing Payment and Settlement System

- [x] 1.1 Inspect the complete project directory structure
- [x] 1.2 Identify the frontend framework and backend framework
- [x] 1.3 Inspect the existing `StripePaymentModal.jsx` component, if present
- [x] 1.4 Inspect the existing `paymentController.js` controller, if present
- [x] 1.5 Identify existing payment routes and API service functions
- [x] 1.6 Identify existing expense, debt, balance, and settlement models
- [x] 1.7 Identify how users currently settle debts
- [x] 1.8 Identify how completed settlements update group balances
- [x] 1.9 Identify existing transaction history and receipt functionality
- [x] 1.10 Check whether Stripe SDK and frontend Stripe packages are already installed
- [x] 1.11 Check whether Stripe configuration and environment variables already exist
- [x] 1.12 Identify existing authentication and authorization mechanisms
- [x] 1.13 Identify the current payment status and transaction data structures
- [x] 1.14 Document which files need to be created or modified
- [x] 1.15 Reuse existing project architecture and avoid unrelated changes

---

## 2️⃣ Configure Stripe Payment Integration

- [x] 2.1 Verify whether a Stripe account and test-mode configuration are available
- [x] 2.2 Inspect the existing backend Stripe SDK integration
- [x] 2.3 Install missing Stripe dependencies only if necessary
- [x] 2.4 Configure the Stripe secret key through backend environment variables
- [x] 2.5 Configure the Stripe publishable key for the frontend
- [x] 2.6 Configure the Stripe webhook signing secret
- [x] 2.7 Keep secret keys and webhook secrets exclusively on the server
- [x] 2.8 Ensure sensitive environment files are excluded from version control
- [x] 2.9 Update `.env.example` with placeholder variable names if appropriate
- [x] 2.10 Validate required Stripe configuration during application startup or payment initialization
- [x] 2.11 Handle missing or invalid Stripe configuration gracefully
- [x] 2.12 Use Stripe test mode during development and testing
- [x] 2.13 Document Stripe setup instructions without exposing credentials

---

## 3️⃣ Design the Payment Lifecycle

- [x] 3.1 Define the supported payment lifecycle using existing project conventions
- [x] 3.2 Define the initial payment status
- [x] 3.3 Define the processing and successful payment states
- [x] 3.4 Define failed, cancelled, and refunded states where applicable
- [x] 3.5 Define how Stripe payment identifiers map to internal transaction records
- [x] 3.6 Define the relationship between a payment, a debt, a group, a payer, and a receiver
- [x] 3.7 Define how pending payments affect displayed balances
- [x] 3.8 Ensure pending or failed payments are not treated as completed settlements
- [x] 3.9 Define how duplicate payment attempts are handled
- [x] 3.10 Define how asynchronous Stripe payment confirmations are handled
- [x] 3.11 Define how transaction receipts are associated with verified payments
- [x] 3.12 Document the payment lifecycle before implementing dependent functionality

---

## 4️⃣ Create or Update the Payment Data Model

- [ ] 4.1 Inspect existing payment and settlement models before creating new ones
- [ ] 4.2 Reuse existing models where they can safely support Stripe payments
- [ ] 4.3 Store the internal payment or transaction identifier
- [ ] 4.4 Associate each payment with the authenticated payer
- [ ] 4.5 Associate each payment with the intended recipient where applicable
- [ ] 4.6 Associate each payment with the relevant group and debt or settlement
- [ ] 4.7 Store the payment amount using the application's currency-safe conventions
- [ ] 4.8 Store the currency code
- [ ] 4.9 Store the Stripe PaymentIntent identifier or appropriate Stripe reference
- [ ] 4.10 Store the current payment status
- [ ] 4.11 Store relevant timestamps
- [ ] 4.12 Store verified receipt metadata or an internal receipt reference
- [ ] 4.13 Enforce uniqueness for Stripe identifiers where appropriate
- [ ] 4.14 Prevent duplicate settlement records for the same successful payment
- [ ] 4.15 Add database migrations or schema updates if necessary
- [ ] 4.16 Avoid storing card numbers, CVC values, or other sensitive card details
- [ ] 4.17 Preserve existing payment and settlement history

---

## 5️⃣ Implement Backend Payment Initialization

**Controller:** `paymentController.js`

- [ ] 5.1 Create or update the payment initialization controller
- [ ] 5.2 Create or update the corresponding payment service
- [ ] 5.3 Add the payment initialization route using existing API conventions
- [ ] 5.4 Require authentication before initializing a payment
- [ ] 5.5 Validate the group ID and relevant settlement or debt identifier
- [ ] 5.6 Verify that the payer belongs to the relevant group
- [ ] 5.7 Verify that the requested debt or settlement is valid
- [ ] 5.8 Calculate or retrieve the outstanding amount from trusted server-side data
- [ ] 5.9 Never trust a client-supplied amount without backend verification
- [ ] 5.10 Verify that the intended recipient is valid
- [ ] 5.11 Verify that the payer and recipient are not the same user
- [ ] 5.12 Create a Stripe PaymentIntent on the backend
- [ ] 5.13 Use the correct Stripe amount units and supported currency
- [ ] 5.14 Associate the PaymentIntent with an internal payment record
- [ ] 5.15 Attach appropriate internal identifiers through safe Stripe metadata where useful
- [ ] 5.16 Use idempotency protection when creating PaymentIntents
- [ ] 5.17 Return only the necessary client-side payment information
- [ ] 5.18 Never return the Stripe secret key to the frontend
- [ ] 5.19 Handle Stripe API errors appropriately
- [ ] 5.20 Add tests for successful and failed payment initialization

---

## 6️⃣ Implement the Stripe Payment Modal

**Frontend Component:** `StripePaymentModal.jsx`

- [ ] 6.1 Inspect the existing modal and frontend component conventions
- [ ] 6.2 Reuse the existing modal if it is already implemented
- [ ] 6.3 Integrate Stripe's official frontend SDK where necessary
- [ ] 6.4 Use Stripe Elements or the appropriate supported payment interface
- [ ] 6.5 Open the modal from the existing debt or settlement screen
- [ ] 6.6 Display the payer and recipient information
- [ ] 6.7 Display the amount due using the correct currency format
- [ ] 6.8 Display a clear payment summary before confirmation
- [ ] 6.9 Initialize payment through the backend API
- [ ] 6.10 Use the returned client secret only for the intended Stripe payment flow
- [ ] 6.11 Display the secure payment interface
- [ ] 6.12 Add a clear payment confirmation action
- [ ] 6.13 Display a loading state during payment processing
- [ ] 6.14 Prevent repeated submissions while a payment is processing
- [ ] 6.15 Display appropriate payment failure messages
- [ ] 6.16 Handle user cancellation safely
- [ ] 6.17 Handle modal close and reopen behavior
- [ ] 6.18 Handle network failures without falsely reporting payment success
- [ ] 6.19 Make the modal responsive on desktop and mobile
- [ ] 6.20 Follow the application's existing design system
- [ ] 6.21 Provide accessible form labels and keyboard navigation
- [ ] 6.22 Avoid collecting or logging raw card details in application code

---

## 7️⃣ Implement Secure Payment Confirmation

- [ ] 7.1 Integrate Stripe's supported payment confirmation flow
- [ ] 7.2 Handle successful confirmation responses
- [ ] 7.3 Handle payment failures and declined payments
- [ ] 7.4 Handle additional authentication requirements, such as 3D Secure
- [ ] 7.5 Handle pending or processing payment states
- [ ] 7.6 Handle interrupted browser sessions and network timeouts
- [ ] 7.7 Do not trust frontend success messages as proof of payment
- [ ] 7.8 Verify payment status through trusted Stripe server-side data or verified webhooks
- [ ] 7.9 Verify the PaymentIntent belongs to the expected internal payment record
- [ ] 7.10 Verify the expected amount and currency
- [ ] 7.11 Verify that the payment corresponds to the intended payer and settlement
- [ ] 7.12 Ensure a failed payment cannot mark a debt as settled
- [ ] 7.13 Ensure a pending payment cannot mark a debt as settled
- [ ] 7.14 Ensure only a verified successful payment can trigger the settlement workflow
- [ ] 7.15 Add tests for successful, failed, pending, and interrupted payments

---

## 8️⃣ Implement Stripe Webhook Processing

- [ ] 8.1 Create or update the Stripe webhook endpoint
- [ ] 8.2 Follow the backend framework's raw request body requirements for Stripe signature verification
- [ ] 8.3 Verify webhook signatures using the configured webhook signing secret
- [ ] 8.4 Reject invalid webhook signatures
- [ ] 8.5 Process the relevant PaymentIntent events
- [ ] 8.6 Handle successful payment events
- [ ] 8.7 Handle payment failure events
- [ ] 8.8 Handle processing and pending states where relevant
- [ ] 8.9 Match Stripe events to existing internal payment records
- [ ] 8.10 Verify the expected payment amount and currency
- [ ] 8.11 Ensure webhook event processing is idempotent
- [ ] 8.12 Prevent duplicate settlement creation when Stripe retries an event
- [ ] 8.13 Handle webhook events that arrive more than once
- [ ] 8.14 Handle events arriving in an unexpected order
- [ ] 8.15 Record payment status transitions consistently
- [ ] 8.16 Return appropriate webhook responses
- [ ] 8.17 Log processing errors without exposing sensitive information
- [ ] 8.18 Add webhook tests using Stripe test fixtures or the project's supported test tools

---

## 9️⃣ Automatically Update Group Balances

- [ ] 9.1 Identify the existing balance calculation and settlement service
- [ ] 9.2 Reuse the existing settlement logic where possible
- [ ] 9.3 Update balances only after the payment is verified as successful
- [ ] 9.4 Record the completed settlement in the database
- [ ] 9.5 Associate the settlement with the internal payment record
- [ ] 9.6 Associate the settlement with the relevant group, payer, and recipient
- [ ] 9.7 Record the correct settled amount and currency
- [ ] 9.8 Ensure the outstanding debt decreases by the correct amount
- [ ] 9.9 Handle partial payments where supported
- [ ] 9.10 Handle payments that fully settle an outstanding debt
- [ ] 9.11 Prevent duplicate settlement records
- [ ] 9.12 Use database transactions or equivalent consistency safeguards where appropriate
- [ ] 9.13 Handle concurrent settlement attempts safely
- [ ] 9.14 Refresh affected member balances
- [ ] 9.15 Refresh the group expense and settlement history
- [ ] 9.16 Preserve the original expense records
- [ ] 9.17 Ensure failed or cancelled payments do not change settled balances
- [ ] 9.18 Add tests for balance updates after verified payments

---

## 🔟 Generate and Display Verified Transaction Receipts

- [ ] 10.1 Inspect existing transaction history and receipt functionality
- [ ] 10.2 Reuse the existing receipt or transaction record format where possible
- [ ] 10.3 Associate the receipt with the internal payment identifier
- [ ] 10.4 Store the relevant Stripe PaymentIntent reference
- [ ] 10.5 Store the verified payment amount and currency
- [ ] 10.6 Store the payer and recipient identifiers
- [ ] 10.7 Store the associated group and settlement identifiers
- [ ] 10.8 Store the verified payment status
- [ ] 10.9 Record the appropriate payment confirmation timestamp
- [ ] 10.10 Generate a unique internal receipt reference
- [ ] 10.11 Ensure receipts are created only for appropriately verified payment states
- [ ] 10.12 Prevent duplicate receipts for the same payment
- [ ] 10.13 Add a transaction history entry after settlement completion
- [ ] 10.14 Display receipt details in the frontend
- [ ] 10.15 Allow authorized users to view their relevant payment receipts
- [ ] 10.16 Validate authorization before returning receipt details
- [ ] 10.17 Avoid exposing secret keys, client secrets, or sensitive payment details
- [ ] 10.18 Clearly distinguish successful, pending, failed, and refunded payments where applicable

---

## 1️⃣1️⃣ Integrate Payment History and Settlement UI

- [ ] 11.1 Add a Pay or Settle action to the appropriate debt screen
- [ ] 11.2 Open `StripePaymentModal.jsx` for eligible outstanding debts
- [ ] 11.3 Display the amount that the user needs to pay
- [ ] 11.4 Display the intended recipient
- [ ] 11.5 Display the current payment status
- [ ] 11.6 Show a clear success state after verified settlement completion
- [ ] 11.7 Show an appropriate failure state when a payment fails
- [ ] 11.8 Show a pending state when final payment confirmation is outstanding
- [ ] 11.9 Refresh group balances after confirmed settlement
- [ ] 11.10 Refresh payment history after confirmed settlement
- [ ] 11.11 Display the transaction receipt reference
- [ ] 11.12 Allow users to access receipt details
- [ ] 11.13 Prevent users from initiating invalid payments for already-settled debts
- [ ] 11.14 Handle stale debt information before payment initiation
- [ ] 11.15 Preserve existing manual settlement functionality where required
- [ ] 11.16 Ensure payment UI behavior matches the application's existing design

---

## 1️⃣2️⃣ Add Payment Status Synchronization

- [ ] 12.1 Define how the frontend obtains the latest payment status
- [ ] 12.2 Reuse existing real-time infrastructure if available
- [ ] 12.3 Update payment status using trusted backend data
- [ ] 12.4 Refresh the payment status after Stripe confirmation
- [ ] 12.5 Handle asynchronous webhook confirmation
- [ ] 12.6 Ensure the frontend can recover when a webhook completes after the modal closes
- [ ] 12.7 Refresh group balances when the verified settlement is recorded
- [ ] 12.8 Prevent duplicate balance refresh operations where practical
- [ ] 12.9 Avoid unnecessary polling and excessive API requests
- [ ] 12.10 Use controlled polling or explicit refresh if real-time infrastructure is unavailable
- [ ] 12.11 Handle out-of-order status updates safely
- [ ] 12.12 Never display a payment as completed solely because the modal was closed
- [ ] 12.13 Display a clear pending state if confirmation has not yet arrived
- [ ] 12.14 Document the payment status synchronization mechanism

---

## 1️⃣3️⃣ Implement Payment Security and Reliability

- [ ] 13.1 Require authentication for protected payment operations
- [ ] 13.2 Enforce group membership and payment authorization
- [ ] 13.3 Validate all payment identifiers on the backend
- [ ] 13.4 Calculate or verify payment amounts using trusted backend records
- [ ] 13.5 Prevent client-side amount manipulation
- [ ] 13.6 Keep Stripe secret keys exclusively on the backend
- [ ] 13.7 Never store raw card numbers or CVC values
- [ ] 13.8 Verify webhook signatures
- [ ] 13.9 Apply idempotency to payment initialization and settlement processing
- [ ] 13.10 Prevent replayed events from creating duplicate settlements
- [ ] 13.11 Handle network failures and Stripe API errors safely
- [ ] 13.12 Avoid exposing internal stack traces or sensitive data
- [ ] 13.13 Add appropriate request validation and rate limiting using existing project conventions
- [ ] 13.14 Protect against unauthorized receipt access
- [ ] 13.15 Handle concurrent payment attempts for the same outstanding debt
- [ ] 13.16 Ensure database and payment states remain consistent
- [ ] 13.17 Document the supported payment failure and recovery behavior

---

## 1️⃣4️⃣ Test the Complete Stripe Payment Workflow

- [ ] 14.1 Test Stripe configuration validation
- [ ] 14.2 Test payment initialization
- [ ] 14.3 Test successful Stripe test-mode payments
- [ ] 14.4 Test declined payments
- [ ] 14.5 Test additional authentication requirements
- [ ] 14.6 Test pending payment states
- [ ] 14.7 Test cancelled payment flows
- [ ] 14.8 Test network failures during payment confirmation
- [ ] 14.9 Test invalid PaymentIntent identifiers
- [ ] 14.10 Test mismatched payment amounts
- [ ] 14.11 Test mismatched currencies
- [ ] 14.12 Test unauthorized payment attempts
- [ ] 14.13 Test invalid webhook signatures
- [ ] 14.14 Test duplicate webhook delivery
- [ ] 14.15 Test webhook events arriving out of order
- [ ] 14.16 Test duplicate settlement prevention
- [ ] 14.17 Test partial settlement behavior where supported
- [ ] 14.18 Test complete settlement and balance updates
- [ ] 14.19 Test transaction receipt creation and retrieval
- [ ] 14.20 Test frontend payment modal interactions
- [ ] 14.21 Test payment status synchronization
- [ ] 14.22 Test concurrent payment attempts
- [ ] 14.23 Run existing backend tests
- [ ] 14.24 Run existing frontend tests
- [ ] 14.25 Run the production build
- [ ] 14.26 Resolve regressions introduced by the current implementation
- [ ] 14.27 Verify no new console or server errors remain

---

## 1️⃣5️⃣ Documentation and Final Integration

- [ ] 15.1 Document the Stripe payment workflow
- [ ] 15.2 Document required environment variables
- [ ] 15.3 Document Stripe test-mode setup
- [ ] 15.4 Document the payment initialization endpoint
- [ ] 15.5 Document the payment status retrieval mechanism
- [ ] 15.6 Document the webhook endpoint and required Stripe event configuration
- [ ] 15.7 Document the payment lifecycle and settlement update rules
- [ ] 15.8 Document transaction receipt behavior
- [ ] 15.9 Document how to run payment tests
- [ ] 15.10 Update the README with the integrated Stripe settlement feature
- [ ] 15.11 List all files created and modified
- [ ] 15.12 Record tests performed and their actual results
- [ ] 15.13 Document known limitations and unresolved issues
- [ ] 15.14 Verify existing expense and settlement functionality remains intact
- [ ] 15.15 Verify all completed tasks have actually been implemented and tested

---

# 🤖 Antigravity Execution Rules

**IMPORTANT: Complete ONE task at a time. Never automatically proceed to the next task.**

When instructed to complete a task:

1. Read this `TASK.md` file.
2. Locate the exact task or subtask requested by the user.
3. Review previously completed tasks for context.
4. Inspect the existing code before making changes.
5. Understand the current architecture and reuse existing implementations.
6. Implement **ONLY the requested task or subtask**.
7. Do not implement future unchecked tasks.
8. Do not refactor unrelated functionality.
9. Do not introduce unnecessary dependencies.
10. Never hardcode API responses, payment statuses, user identities, or transaction amounts.
11. Never expose Stripe secret keys or webhook signing secrets.
12. Never trust the frontend alone to verify payment completion.
13. Never mark a debt as settled before trusted payment verification.
14. Write and run relevant tests for the current task.
15. Fix issues directly related to the current task.
16. Mark **ONLY the current task** as completed by changing `- [ ]` to `- [x]`, and only after successful implementation and verification.
17. If implementation or testing fails, leave the task unchecked and report the issue.
18. Do not overwrite unrelated user changes.
19. Report actual test results without inventing successful outcomes.
20. After reporting, STOP and wait for the user's next instruction.

### Required Report After Each Task

- **Task ID:** The requested task or subtask
- **Files inspected:** Relevant files reviewed
- **Files created:** Newly created files
- **Files modified:** Existing files changed
- **Implementation:** Changes made
- **Tests performed:** Commands and scenarios tested
- **Test results:** Actual outcomes
- **Task status:** Completed, partially completed, or blocked
- **Issues:** Outstanding problems or limitations

### Strict Stop Rule

**Never automatically implement the next task. Wait for the user to explicitly request it.**

Do not implement the entire `TASK.md` in a single run.

---

# ✅ Definition of Done

The feature is complete only when:

- Users can initiate Stripe payments within the application.
- Payment amounts and recipients are validated by the backend.
- Stripe payment confirmation is verified using trusted server-side mechanisms.
- Webhook processing is secure and idempotent.
- Only verified successful payments create completed settlements.
- Group balances update correctly after settlement completion.
- Transaction receipts are associated with verified payments.
- The frontend reflects successful, pending, and failed payment states correctly.
- Duplicate payments and duplicate settlement records are prevented.
- Automated tests and the production build pass, or remaining failures are documented.
- Existing expense, balance, and settlement functionality remains intact.
- All tasks are marked complete only after actual implementation and verification.

**End of TASK.md**