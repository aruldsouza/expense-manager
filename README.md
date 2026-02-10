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
        PORT=5000
        MONGO_URI=your_mongodb_connection_string
        JWT_SECRET=your_jwt_secret_key
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
    npm run dev
    ```
    *   Server runs on `http://localhost:5000` (or your specified PORT).

2.  **Start Frontend:**
    ```bash
    # In /frontend terminal
    npm run dev
    ```
    *   Client runs on `http://localhost:5173`.

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
*   `POST /api/groups/:groupId/expenses` - Add an expense
*   `GET /api/groups/:groupId/expenses` - Get group expenses
*   `GET /api/groups/:groupId/balances` - Get detailed group balances

### Settlements
*   `POST /api/groups/:groupId/settlements` - Record a payment
*   `GET /api/groups/:groupId/settlements` - Get settlement history
*   `GET /api/groups/:groupId/settlements/optimized` - Get simplified debt recommendations

### Dashboard
*   `GET /api/dashboard/stats` - Get aggregated user statistics

---

## 📸 Screenshots

*(Add screenshots of your Dashboard, Add Expense Modal, and Group Details here)*

---

## 🛡️ License

This project is open-source and available under the [MIT License](LICENSE).
