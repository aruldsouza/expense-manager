# Expense Manager Frontend

This serves as the frontend client for the Smart Expense Manager application.

## 🚀 Getting Started

### Prerequisites

- Node.js (v14+)
- React (v18+)

### Installation

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   Copy `.env.example` (or create one) and configure your API URL:
   ```bash
   VITE_API_URL=http://localhost:5001/api
   ```

### Running Locally

Wait for dependencies to install, then start the development server:

```bash
npm run dev
```

The application will launch at `http://localhost:5173`.

## 📦 Building for Production

To create an optimized production build:

```bash
npm run build
```

The output will be in the `dist/` folder, ready for deployment.

## 🛠 Tech Stack

- **React**: UI library
- **Vite**: Build tool and dev server
- **Axios**: HTTP client
- **React Router**: Client-side routing
- **Custom CSS**: Styling (no Tailwind)
