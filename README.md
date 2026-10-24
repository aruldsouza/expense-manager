# 💰 Smart Expense Splitter

A modern, full-stack web application designed to simplify expense tracking and splitting among friends and groups. Built with the MERN stack (MongoDB, Express, React, Node.js), it offers a seamless experience for managing shared finances with a beautiful, glassmorphic UI.

---

## 🚀 Features

### Frontend (Client-Side)
*   **Modern UI/UX**: Designed with a "Glassmorphism" aesthetic, featuring mesh gradients, frosted glass cards, and smooth animations.
*   **Dashboard**: Real-time overview of your financial status:
    *   **"You Spent"**: Total amount you have contributed.
    *   **"You Owe/Are Owed"**: Net balance calculation.
    *   **"Active Groups"**: Quick access to your groups.
*   **Group Management**: Create groups, view details, and manage members.
*   **Expense Tracking**:
    *   Add expenses with support for **multiple split types**:
        *   **Equal Split**: Automatically divides cost among selected members.
        *   **Unequal Split**: Manually specify exact amounts for each person.
        *   **Percentage Split**: Distribute cost by percentage.
    *   **Member Selection**: Choose exactly who is involved in each expense.
*   **Smart Settlements**:
    *   **"Suggested Payments"**: Automatically calculates the most efficient way to settle debts (minimizing the number of transactions).
    *   **One-Click Settle**: Instantly record a settlement payment directly from the suggestion list.
*   **Activity History**: Comprehensive log of all expenses and settlements within a group.
*   **Responsive Design**: Fully optimized for desktop, tablet, and mobile devices.

### Backend (Server-Side)
*   **RESTful API**: Robust API built with Express.js.
*   **Secure Authentication**: User registration and login using JWT (JSON Web Tokens) and bcrypt for password hashing.
*   **Data Validation**: Strict input validation using `express-validator` to ensure data integrity.
*   **Optimization Algorithm**: Implements a greedy algorithm to simplify debts within a group (reducing N^2 transactions to N).
*   **Security**: Integrated with `helmet` for HTTP headers, `xss-clean` for sanitization, and `cors` configuration.
*   **Database**: MongoDB with Mongoose ODM for efficient data modeling.

---

## 🛠️ Tech Stack

### Frontend
*   **Framework**: React (Vite)
*   **Styling**: Bootstrap 5, React Bootstrap, CSS3 (Custom Glassmorphism)
*   **Icons**: React Icons (FontAwesome)
*   **State Management**: React Context API (AuthContext)
*   **HTTP Client**: Axios
*   **Routing**: React Router DOM 6

### Backend
*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Database**: MongoDB (Mongoose)
*   **Authentication**: JWT, bcryptjs
*   **Validation**: express-validator
*   **Tools**: Nodemon (Dev), Dotenv

---

## 📂 Project Structure

```
expense-manager/
├── backend/                # Server-side code
│   ├── config/             # DB connection logic
│   ├── controllers/        # Route logic (Auth, Group, Expense, Settlement)
│   ├── middleware/         # Auth protection, Validation, Error handling
│   ├── models/             # Mongoose schemas (User, Group, Expense, Settlement)
│   ├── routes/             # API route definitions
│   ├── server.js           # Entry point
│   └── .env                # Environment variables
│
├── frontend/               # Client-side code
│   ├── src/
│   │   ├── components/     # Reusable UI components (StatCard, GroupList, etc.)
│   │   ├── context/        # Auth Context
│   │   ├── layouts/        # MainLayout (Navbar + Outlet)
│   │   ├── pages/          # Dashboard, GroupDetails, Login, Register
│   │   ├── services/       # Axios instance setup
│   │   └── index.css       # Global styles (Gradients, Glass effects)
│   └── vite.config.js      # Vite configuration
│
└── README.md               # Project documentation
```

---

## ⚡ Getting Started

### Prerequisites
*   Node.js (v14+ recommended)
*   MongoDB (Local or Atlas URI)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/expense-manager.git
    cd expense-manager
    ```

2.  **Setup Backend:**
    ```bash
    cd backend
    npm install
    ```
    *   Create a `.env` file in the `backend` directory:
        ```env
        PORT=5001
        MONGO_URI=your_mongodb_connection_string
        JWT_SECRET=your_jwt_secret_key
        GEMINI_API_KEY=your_google_gemini_api_key
        NODE_ENV=development
        ```

3.  **Setup Frontend:**
    ```bash
    cd ../frontend
    npm install
    ```

### Running the Application

1.  **Start Backend:**
    ```bash
    # In /backend terminal
    npm start
    ```
    *   Server runs on `http://localhost:5001`.

2.  **Start Frontend:**
    ```bash
    # In /frontend terminal
    npm run dev
    ```
    *   Client runs on `http://localhost:5173`.

---

## 🤖 AI-Powered Smart Receipt Extraction

SplitSmart integrates Google Gemini 1.5 Flash Vision to automatically extract and parse receipt photos:

*   **Zero Manual Entry**: Upload receipt photos (JPG, PNG, WEBP, up to 5 MB) via drag-and-drop or file picker.
*   **Complete OCR & Field Normalization**:
    *   Merchant / Vendor name with address noise stripping.
    *   Transaction date normalized to standard `YYYY-MM-DD`.
    *   Currency detection and ISO 4217 code normalization (`USD`, `INR`, `EUR`, `GBP`, `AED`, `SGD`, etc.).
    *   Full line item breakdown (item description, quantity, unit price, line total).
    *   Breakdown of subtotal, discounts, GST/VAT/taxes, and service/delivery fees.
    *   Automatic intelligent category prediction.
*   **Smart Split by Items**:
    *   Item-level assignment matrix across group members.
    *   Automatic equal division of shared items (`÷ N`).
    *   Proportional allocation of taxes, discounts, and service fees.
    *   Per-member manual overrides with live balance reconciliation.
*   **Enterprise-Grade Security**:
    *   `GEMINI_API_KEY` is strictly held on the server; zero exposure to the client.
    *   In-memory processing only (`multer.memoryStorage()`) — no disk or public image storage.
    *   Binary magic-byte file signature validation to block spoofed or malicious uploads.
    *   AI endpoint rate limiting (`aiLimiter`).
*   **Persistent Receipt History**:
    *   Every expense created from a receipt preserves the full line-item metadata (`receiptMeta`).
    *   Clickable `📄 Receipt` badge in the transaction ledger opens a dedicated slide-in receipt viewer.

---

## 🔌 API Endpoints

### Auth
*   `POST /api/auth/register` - Register a new user
*   `POST /api/auth/login` - Login user
*   `GET /api/auth/me` - Get current user profile

### Groups
*   `POST /api/groups` - Create a new group
*   `GET /api/groups` - Get all user's groups
*   `GET /api/groups/:id` - Get single group details
*   `DELETE /api/groups/:id` - Delete a group (Creator only)

### Expenses
*   `POST /api/groups/:groupId/expenses` - Add an expense (supports `receiptMeta`)
*   `GET /api/groups/:groupId/expenses` - Get group expenses
*   `GET /api/groups/:groupId/balances` - Get detailed group balances

### AI Receipt Scanning
*   `POST /api/receipt/scan` - Analyze receipt image via Gemini Vision (requires JWT Bearer token & multipart form `receipt`)

### Greedy Debt Minimization & Settlements
*   `GET /api/groups/:groupId/settlements/optimized` - Get greedily optimized settlement transactions, member net balances, and reduction statistics
*   `GET /api/groups/:groupId/settlements/debt` - Get live outstanding debt between members (`?payer=...&payee=...`)
*   `POST /api/groups/:groupId/settlements` - Record a settlement payment (with duplicate prevention and debt balance validation)
*   `GET /api/groups/:groupId/settlements` - Get settlement history for a group

### Dashboard
*   `GET /api/dashboard/stats` - Get aggregated user statistics

---

## ⚡ Greedy Debt Minimization Algorithm

The application features a Min-Cash-Flow Greedy Debt Simplification engine that reduces cross-member pairwise debts down to the minimal possible number of direct settlements.

### Algorithm Behavior:
1. **Net Balance Calculation**:
   $$\text{Net Balance} = (\text{Total Paid} - \text{Total Owed}) + (\text{Settlements Paid} - \text{Settlements Received})$$
2. **Classification**:
   - $\text{Net Balance} < 0$: **Debtor** (owes money to the group).
   - $\text{Net Balance} > 0$: **Creditor** (gets back money from the group).
   - $\text{Net Balance} = 0$: **Settled** (excluded from transactions).
3. **Greedy Matching**:
   - In each iteration, sorts remaining Debtors and Creditors by balance magnitude.
   - Matches the largest Debtor with the largest Creditor.
   - Transfers $\min(\text{debtorAmount}, \text{creditorAmount})$.
   - Deducts the settled amount from both parties until all balances reach 0.
4. **Guarantees**:
   - **Minimality**: Reduces worst-case $O(N^2)$ pairwise debts to at most $N - 1$ transactions.
   - **Circular Debt Cancellation**: Perfectly cancels circular debts (e.g. $A \rightarrow B \rightarrow C \rightarrow A$) down to $0$ transactions without requiring intermediate transfers.
   - **Conservation of Value**: Total debtor amount always equals total creditor amount; original expense records are never modified.

### Interactive Debt Flow Visualization
- **Dual Dynamic Layouts**:
  - **Flow Stream (Bipartite Pipeline)**: Debtors on the left, Creditors on the right, Settled at bottom.
  - **Circular Network (Chords)**: All members positioned around a radial canvas with inward directional curves.
- **Visual Directionality**: Curved Bezier connections with glowing animated dashes and arrowheads pointing from payer to receiver.
- **Midpoint Badges**: High-contrast pill badges showing exact payment amounts in the group's currency.
- **Interactive Suggestions**: Hover or click any connection, badge, or member node to view human-readable suggestions (e.g., `Alice should pay Bob ₹500`), member profiles, debt share percentages, and an instantaneous **"Settle This Payment"** button.

---

## 🧪 Testing

Run the automated test suite to verify backend, security, AI receipt pipelines, and debt optimization:

```bash
# Run Task 12 Final End-to-End System Test Suite
node backend/tests/testTask12EndToEnd.js

# Run Debt Optimization Algorithm Validation Suite (10/10 tests)
node backend/tests/testDebtOptimizationService.js

# Run Optimized Settlement API & Stats Test Suite (7/7 tests)
node backend/tests/testOptimizedSettlementApi.js

# Run Settlement Flow & Validation Test Suite (9/9 tests)
node backend/tests/testSettlementFlowValidation.js

# Run full backend regression verification
node backend/tests/testAll.js
```

---

## 🛡️ License

This project is open-source and available under the [MIT License](LICENSE).

