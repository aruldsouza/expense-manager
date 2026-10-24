# 📋 TASK.md — After task completion mark the task as completed here

# Graph-Optimized Greedy Debt Simplification & Live Visualization

**Expense Manager — Debt Optimization Feature**

Base URL: `/api`

---

## 1️⃣ Analyze Existing Debt & Balance System

* [x] 1.1 Analyze existing expense, balance, and settlement logic
* [x] 1.2 Identify relevant models, controllers, services, routes, and frontend components
* [x] 1.3 Identify how the current application calculates who owes whom
* [x] 1.4 Identify existing settlement/payment functionality
* [x] 1.5 Identify existing chart/graph visualization libraries
* [x] 1.6 Document the files that should be reused or modified
* [x] 1.7 Do not modify unrelated functionality

---

## 2️⃣ Implement Net Balance Calculation

* [x] 2.1 Create a reusable net balance calculation service
* [x] 2.2 Calculate the total amount paid by each member
* [x] 2.3 Calculate the total amount owed by each member
* [x] 2.4 Calculate each member's final net balance
* [x] 2.5 Identify creditors and debtors
* [x] 2.6 Ignore members with zero balance
* [x] 2.7 Account for existing completed settlements
* [x] 2.8 Ensure total creditor amount equals total debtor amount

---

## 3️⃣ Implement Greedy Debt Minimization Algorithm

* [x] 3.1 Create a dedicated greedy debt optimization service
* [x] 3.2 Sort debtors and creditors by outstanding balance
* [x] 3.3 Match the largest debtor with the largest creditor
* [x] 3.4 Calculate the minimum amount required for each transaction
* [x] 3.5 Update remaining debtor and creditor balances
* [x] 3.6 Continue until all debts are settled
* [x] 3.7 Prevent zero/negative transactions
* [x] 3.8 Ensure original expense records are not modified

---

## 4️⃣ Validate Debt Optimization

* [x] 4.1 Test two-member debt scenario
* [x] 4.2 Test three-member circular debt scenario
* [x] 4.3 Test multiple debtors and creditors
* [x] 4.4 Test unequal debt amounts
* [x] 4.5 Test partially settled expenses
* [x] 4.6 Test members with zero balance
* [x] 4.7 Test decimal currency amounts
* [x] 4.8 Verify all outstanding balances are settled correctly
* [x] 4.9 Verify optimized transactions are fewer where possible

---

## 5️⃣ Create Optimized Settlement API

### GET `/api/groups/:groupId/settlements/optimized`

* [x] 5.1 Create optimized settlement controller
* [x] 5.2 Validate `groupId`
* [x] 5.3 Verify authentication
* [x] 5.4 Verify group membership
* [x] 5.5 Fetch required expenses and settlements
* [x] 5.6 Calculate net balances
* [x] 5.7 Run greedy debt optimization
* [x] 5.8 Return optimized settlement list
* [x] 5.9 Return member balance information
* [x] 5.10 Add proper error handling

---

## 6️⃣ Add Optimization Statistics

* [x] 6.1 Calculate original transaction count
* [x] 6.2 Calculate optimized transaction count
* [x] 6.3 Calculate number of transactions eliminated
* [x] 6.4 Calculate transaction reduction percentage where appropriate
* [x] 6.5 Include optimization statistics in API response
* [x] 6.6 Ensure statistics are accurate for empty/already-settled groups

---

## 7️⃣ Integrate API With Frontend

* [x] 7.1 Add optimized settlement API function
* [x] 7.2 Connect API to existing frontend service layer
* [x] 7.3 Add loading state
* [x] 7.4 Add error handling
* [x] 7.5 Add empty-state handling
* [x] 7.6 Fetch optimized debts for the selected group
* [x] 7.7 Verify existing frontend API functionality is unaffected

---

## 8️⃣ Create Debt Summary UI

* [x] 8.1 Create reusable debt summary component
* [x] 8.2 Display each member's net balance
* [x] 8.3 Display who needs to pay
* [x] 8.4 Display who needs to receive
* [x] 8.5 Display optimized payment suggestions
* [x] 8.6 Display payer, receiver, and amount
* [x] 8.7 Format amounts using the application's currency format
* [x] 8.8 Add loading, error, and empty states
* [x] 8.9 Make the component responsive
* [x] 8.10 Match the existing application UI

---

## 9️⃣ Create Interactive Debt Flow Visualization

* [x] 9.1 Create reusable debt flow visualization component
* [x] 9.2 Represent each member as a node
* [x] 9.3 Represent each optimized payment as a directed connection
* [x] 9.4 Clearly show payment direction
* [x] 9.5 Display payment amount on connections
* [x] 9.6 Generate graph dynamically from API data
* [x] 9.7 Handle members with no outgoing transactions
* [x] 9.8 Handle larger groups without making the graph unusable
* [x] 9.9 Make the visualization responsive

---

## 🔟 Add Interactive Payment Suggestions

* [x] 10.1 Add hover/click interaction to payment connections
* [x] 10.2 Display payer information
* [x] 10.3 Display receiver information
* [x] 10.4 Display payment amount
* [x] 10.5 Display human-readable suggestion
* [x] 10.6 Example:

  * `Alice should pay Bob ₹500`
* [x] 10.7 Highlight the selected transaction
* [x] 10.8 Ensure interaction works on desktop and mobile

---

## 1️⃣1️⃣ Integrate With Existing Settlement Flow

* [x] 11.1 Connect optimized transactions with the existing settlement functionality
* [x] 11.2 Allow users to initiate settlement from an optimized transaction where applicable
* [x] 11.3 Reuse the existing settlement API
* [x] 11.4 Prevent duplicate settlement records
* [x] 11.5 Validate settlement amount on the backend
* [x] 11.6 Handle successful settlement
* [x] 11.7 Handle failed/cancelled settlement
* [x] 11.8 Refresh optimized debts after successful settlement
* [x] 11.9 Remove completed debts from outstanding suggestions


---

## 1️⃣2️⃣ Final Testing, UI Integration & Documentation

* [x] 12.1 Add "Simplify Debts" action to the appropriate group/expense screen
* [x] 12.2 Test complete flow: Expenses → Balances → Simplify Debts → Settlement
* [x] 12.3 Test circular debt scenario end-to-end
* [x] 12.4 Test multiple debtor/creditor scenario
* [x] 12.5 Test frontend visualization
* [x] 12.6 Test existing expense functionality
* [x] 12.7 Test existing settlement/payment functionality
* [x] 12.8 Test authentication and authorization
* [x] 12.9 Run backend and frontend tests
* [x] 12.10 Run production build
* [x] 12.11 Verify no console/server errors
* [x] 12.12 Update README with the Greedy Debt Minimization feature
* [x] 12.13 Document API and algorithm behavior
* [x] 12.14 Verify no existing functionality has been broken


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
