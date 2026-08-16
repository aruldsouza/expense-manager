# Smart Expense Splitter - Backend API

A robust RESTful API for managing group expenses, calculating balances, and optimizing settlements. Built with Node.js, Express, and MongoDB.

## Features

- **User Authentication**: Secure registration and login (JWT).
- **Group Management**: Create and join expense groups.
- **Expense Tracking**: Add expenses with flexible split options (Equal, Unequal, Percent).
- **Consolidated Balances**: Real-time calculation of "who owes who".
- **Smart Settlements**: Record payments and optimize debt transactions using a greedy algorithm to minimize transfers.
- **Transaction History**: Unified chronological view of all financial activities.

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB (running locally or cloud instance)

### Installation

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environment:
    - Copy `.env.example` to `.env`:
        ```bash
        cp .env.example .env
        ```
    - Update `MONGODB_URI` and `JWT_SECRET` in `.env`.

### Running the Server

- **Development Mode** (with auto-reload):
    ```bash
    npm run dev
    ```
- **Production Mode**:
    ```bash
    npm start
    ```

Server runs on `http://localhost:5000` (or configured PORT).

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create a new user.
- `POST /api/auth/login` - Login and receive JWT.

### Groups
- `POST /api/groups` - Create a new group.
- `GET /api/groups` - List user's groups.

### Expenses
- `POST /api/groups/:groupId/expenses` - Add an expense.
- `GET /api/groups/:groupId/expenses` - List group expenses.

### Balances & Settlements
- `GET /api/groups/:groupId/balances` - View net balances for all members.
- `GET /api/groups/:groupId/settlements/optimized` - Get suggested optimized settlements.
- `POST /api/groups/:groupId/settlements` - Record a settlement payment.

### History
- `GET /api/groups/:groupId/transactions` - View combined history of expenses and settlements.

## Testing

Run the comprehensive integration test suite:

```bash
node tests/testAll.js
```

Ensure the server is running on the port configured in the test script (default: 5002) before running tests.
