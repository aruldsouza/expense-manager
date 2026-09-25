# 📋 TASK.md — After task completion mark the task as completed here

# Graph-Optimized Greedy Debt Simplification & Live Visualization

**Expense Manager — Debt Optimization Feature**

Base URL: `/api`

---

## 1️⃣ Analyze Existing Debt & Balance System

* [ ] 1.1 Analyze existing expense, balance, and settlement logic
* [ ] 1.2 Identify relevant models, controllers, services, routes, and frontend components
* [ ] 1.3 Identify how the current application calculates who owes whom
* [ ] 1.4 Identify existing settlement/payment functionality
* [ ] 1.5 Identify existing chart/graph visualization libraries
* [ ] 1.6 Document the files that should be reused or modified
* [ ] 1.7 Do not modify unrelated functionality

---

## 2️⃣ Implement Net Balance Calculation

* [ ] 2.1 Create a reusable net balance calculation service
* [ ] 2.2 Calculate the total amount paid by each member
* [ ] 2.3 Calculate the total amount owed by each member
* [ ] 2.4 Calculate each member's final net balance
* [ ] 2.5 Identify creditors and debtors
* [ ] 2.6 Ignore members with zero balance
* [ ] 2.7 Account for existing completed settlements
* [ ] 2.8 Ensure total creditor amount equals total debtor amount

---

## 3️⃣ Implement Greedy Debt Minimization Algorithm

* [ ] 3.1 Create a dedicated greedy debt optimization service
* [ ] 3.2 Sort debtors and creditors by outstanding balance
* [ ] 3.3 Match the largest debtor with the largest creditor
* [ ] 3.4 Calculate the minimum amount required for each transaction
* [ ] 3.5 Update remaining debtor and creditor balances
* [ ] 3.6 Continue until all debts are settled
* [ ] 3.7 Prevent zero/negative transactions
* [ ] 3.8 Ensure original expense records are not modified

---

## 4️⃣ Validate Debt Optimization

* [ ] 4.1 Test two-member debt scenario
* [ ] 4.2 Test three-member circular debt scenario
* [ ] 4.3 Test multiple debtors and creditors
* [ ] 4.4 Test unequal debt amounts
* [ ] 4.5 Test partially settled expenses
* [ ] 4.6 Test members with zero balance
* [ ] 4.7 Test decimal currency amounts
* [ ] 4.8 Verify all outstanding balances are settled correctly
* [ ] 4.9 Verify optimized transactions are fewer where possible

---

## 5️⃣ Create Optimized Settlement API

### GET `/api/groups/:groupId/settlements/optimized`

* [ ] 5.1 Create optimized settlement controller
* [ ] 5.2 Validate `groupId`
* [ ] 5.3 Verify authentication
* [ ] 5.4 Verify group membership
* [ ] 5.5 Fetch required expenses and settlements
* [ ] 5.6 Calculate net balances
* [ ] 5.7 Run greedy debt optimization
* [ ] 5.8 Return optimized settlement list
* [ ] 5.9 Return member balance information
* [ ] 5.10 Add proper error handling

---

## 6️⃣ Add Optimization Statistics

* [ ] 6.1 Calculate original transaction count
* [ ] 6.2 Calculate optimized transaction count
* [ ] 6.3 Calculate number of transactions eliminated
* [ ] 6.4 Calculate transaction reduction percentage where appropriate
* [ ] 6.5 Include optimization statistics in API response
* [ ] 6.6 Ensure statistics are accurate for empty/already-settled groups

---

## 7️⃣ Integrate API With Frontend

* [ ] 7.1 Add optimized settlement API function
* [ ] 7.2 Connect API to existing frontend service layer
* [ ] 7.3 Add loading state
* [ ] 7.4 Add error handling
* [ ] 7.5 Add empty-state handling
* [ ] 7.6 Fetch optimized debts for the selected group
* [ ] 7.7 Verify existing frontend API functionality is unaffected

---

## 8️⃣ Create Debt Summary UI

* [ ] 8.1 Create reusable debt summary component
* [ ] 8.2 Display each member's net balance
* [ ] 8.3 Display who needs to pay
* [ ] 8.4 Display who needs to receive
* [ ] 8.5 Display optimized payment suggestions
* [ ] 8.6 Display payer, receiver, and amount
* [ ] 8.7 Format amounts using the application's currency format
* [ ] 8.8 Add loading, error, and empty states
* [ ] 8.9 Make the component responsive
* [ ] 8.10 Match the existing application UI

---

## 9️⃣ Create Interactive Debt Flow Visualization

* [ ] 9.1 Create reusable debt flow visualization component
* [ ] 9.2 Represent each member as a node
* [ ] 9.3 Represent each optimized payment as a directed connection
* [ ] 9.4 Clearly show payment direction
* [ ] 9.5 Display payment amount on connections
* [ ] 9.6 Generate graph dynamically from API data
* [ ] 9.7 Handle members with no outgoing transactions
* [ ] 9.8 Handle larger groups without making the graph unusable
* [ ] 9.9 Make the visualization responsive

---

## 🔟 Add Interactive Payment Suggestions

* [ ] 10.1 Add hover/click interaction to payment connections
* [ ] 10.2 Display payer information
* [ ] 10.3 Display receiver information
* [ ] 10.4 Display payment amount
* [ ] 10.5 Display human-readable suggestion
* [ ] 10.6 Example:

  * `Alice should pay Bob ₹500`
* [ ] 10.7 Highlight the selected transaction
* [ ] 10.8 Ensure interaction works on desktop and mobile

---

## 1️⃣1️⃣ Integrate With Existing Settlement Flow

* [ ] 11.1 Connect optimized transactions with the existing settlement functionality
* [ ] 11.2 Allow users to initiate settlement from an optimized transaction where applicable
* [ ] 11.3 Reuse the existing settlement API
* [ ] 11.4 Prevent duplicate settlement records
* [ ] 11.5 Validate settlement amount on the backend
* [ ] 11.6 Handle successful settlement
* [ ] 11.7 Handle failed/cancelled settlement
* [ ] 11.8 Refresh optimized debts after successful settlement
* [ ] 11.9 Remove completed debts from outstanding suggestions

---

## 1️⃣2️⃣ Final Testing, UI Integration & Documentation

* [ ] 12.1 Add "Simplify Debts" action to the appropriate group/expense screen
* [ ] 12.2 Test complete flow: Expenses → Balances → Simplify Debts → Settlement
* [ ] 12.3 Test circular debt scenario end-to-end
* [ ] 12.4 Test multiple debtor/creditor scenario
* [ ] 12.5 Test frontend visualization
* [ ] 12.6 Test existing expense functionality
* [ ] 12.7 Test existing settlement/payment functionality
* [ ] 12.8 Test authentication and authorization
* [ ] 12.9 Run backend and frontend tests
* [ ] 12.10 Run production build
* [ ] 12.11 Verify no console/server errors
* [ ] 12.12 Update README with the Greedy Debt Minimization feature
* [ ] 12.13 Document API and algorithm behavior
* [ ] 12.14 Verify no existing functionality has been broken

---

# 🤖 Antigravity Execution Rules

**IMPORTANT: Complete ONE task at a time.**

When instructed to complete a task:

1. Read this `TASK.md`.
2. Locate the requested task.
3. Review previously completed tasks for context.
4. Inspect the existing code before making changes.
5. Implement **ONLY the requested task**.
6. Do not implement future unchecked tasks.
7. Do not refactor unrelated code.
8. Test the implementation.
9. Fix issues related to the current task.
10. Mark **ONLY the current task** as completed:

* Change `- [ ]` to `- [x]`

11. Report:

* Files changed
* What was implemented
* Tests performed
* Test results
* Any issues

12. Stop and wait for the next instruction.

**Never automatically proceed to the next task.**
