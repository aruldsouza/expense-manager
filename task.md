# 📋 TASK.md  -- After task completion mark the task as completed here
## Smart Expense Splitter – Backend API (Node.js + Express)

Base URL: `/api`

---

## 0️⃣ Initial Analysis

- [x] 0.1 Understand current base template structure
  - Analyzed backend skeleton (empty server.js with cors dependency)
  - Analyzed frontend (Vite + React 19.2.0 default template)
  - Reviewed project structure and identified implementation gaps
  - Documented 81 backend tasks across 10 sections
  - Identified required dependencies and folder structure needs

---

## 1️⃣ Project Setup

- [x] 1.1 Setup Express server (`server.js`)
- [x] 1.2 Configure environment variables
- [x] 1.3 Install and configure middleware (`cors`, `express.json`)
- [x] 1.4 Connect MongoDB using Mongoose
- [x] 1.5 Verify MongoDB connection
- [x] 1.6 Add centralized error handling middleware
- [x] 1.7 Add request logging middleware

---

## 2️⃣ Authentication APIs

### POST `/api/auth/register`

- [x] 2.1 Create user registration endpoint
- [x] 2.2 Validate request body (name, email, password)
- [x] 2.3 Hash password before saving
- [x] 2.4 Prevent duplicate email registration
- [x] 2.5 Save user to database
- [x] 2.6 Return success response

---

### POST `/api/auth/login`

- [x] 2.7 Create user login endpoint
- [x] 2.8 Validate login credentials
- [x] 2.9 Compare hashed passwords
- [x] 2.10 Generate JWT token
- [x] 2.11 Return token and user details

---

### Auth Middleware

- [x] 2.12 Create JWT verification middleware
- [x] 2.13 Attach authenticated user to request object
- [x] 2.14 Protect all private routes

---

## 3️⃣ Group APIs

### POST `/api/groups`

- [x] 3.1 Create group creation endpoint
- [x] 3.2 Automatically add creator as group member
- [x] 3.3 Validate provided member IDs
- [x] 3.4 Prevent duplicate members in group
- [x] 3.5 Save group to database
- [x] 3.6 Return created group

---

### GET `/api/groups`

- [x] 3.7 Fetch groups for logged-in user
- [x] 3.8 Restrict access to user’s groups only
- [x] 3.9 Return group list

---

### GET `/api/groups/:groupId`

- [x] 3.10 Fetch group details
- [x] 3.11 Validate group membership
- [x] 3.12 Return group metadata

---

## 4️⃣ Expense APIs

### POST `/api/groups/:groupId/expenses`

- [x] 4.1 Create add-expense endpoint
- [x] 4.2 Validate expense amount and payer
- [x] 4.3 Support equal split logic
- [x] 4.4 Support unequal split logic
- [x] 4.5 Support percentage split logic
- [x] 4.6 Validate split totals match expense amount
- [x] 4.7 Save expense to database
- [x] 4.8 Update balances for all group members

---

### GET `/api/groups/:groupId/expenses`

- [x] 4.9 Fetch all expenses for group
- [x] 4.10 Validate group membership
- [x] 4.11 Return expense list

---

## 5️⃣ Balance APIs

### GET `/api/groups/:groupId/balances`

- [x] 5.1 Calculate net balance per user
- [x] 5.2 Ensure balance correctness
- [x] 5.3 Restrict access to group members
- [x] 5.4 Return balance summary

---

## 6️⃣ Settlement & Optimization APIs

### GET `/api/groups/:groupId/settlements/optimized`

- [x] 6.1 Identify creditors and debtors
- [x] 6.2 Implement greedy debt optimization algorithm
- [x] 6.3 Minimize number of transactions
- [x] 6.4 Ensure total settlement consistency
- [x] 6.5 Return optimized settlement list

---

### POST `/api/groups/:groupId/settlements`

- [x] 6.6 Create settlement endpoint
- [x] 6.7 Validate settlement request
- [x] 6.8 Prevent over-settlement
- [x] 6.9 Update balances atomically
- [x] 6.10 Persist settlement record

---

## 7️⃣ Transaction History APIs

### GET `/api/groups/:groupId/transactions`

- [ ] 7.1 Create transaction history endpoint
- [ ] 7.2 Fetch all expenses and settlements
- [ ] 7.3 Ensure chronological ordering
- [ ] 7.4 Restrict access to group members
- [ ] 7.5 Return transaction ledger

---

## 8️⃣ Validation & Security

- [ ] 8.1 Validate all request payloads
- [ ] 8.2 Handle invalid MongoDB ObjectIds
- [ ] 8.3 Prevent unauthorized data access
- [ ] 8.4 Sanitize user inputs
- [ ] 8.5 Enforce role-based access where applicable

---

## 9️⃣ Testing & Verification

- [ ] 9.1 Test authentication APIs
- [ ] 9.2 Test group creation and access rules
- [ ] 9.3 Test expense creation edge cases
- [ ] 9.4 Test balance calculations
- [ ] 9.5 Test optimized settlements
- [ ] 9.6 Test settlement recording
- [ ] 9.7 Verify MongoDB data consistency

---

## 🔟 Finalization

- [ ] 10.1 Refactor codebase
- [ ] 10.2 Remove unused files
- [ ] 10.3 Add README documentation
- [ ] 10.4 Prepare backend for frontend integration
- [ ] 10.5 Deployment readiness check
