import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { SocketProvider } from './context/SocketContext';
import { Toaster } from 'react-hot-toast';
import MainLayout from './layouts/MainLayout';
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const CreateGroup = React.lazy(() => import('./pages/CreateGroup'));
const GroupDetails = React.lazy(() => import('./pages/GroupDetails'));
const RecurringExpenses = React.lazy(() => import('./pages/RecurringExpenses'));
import ProtectedRoute from './components/ProtectedRoute';
import Spinner from './components/Spinner';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CurrencyProvider>
          <SocketProvider>
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                style: { borderRadius: '10px', fontFamily: 'inherit' }
              }}
            />
            <React.Suspense fallback={<div className="h-screen flex justify-center items-center"><Spinner /></div>}>
              <Routes>
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="login" element={<Login />} />
                  <Route path="register" element={<Register />} />

                  {/* Protected Routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="groups/create" element={<CreateGroup />} />
                    <Route path="groups/:groupId" element={<GroupDetails />} />
                    <Route path="groups/:groupId/recurring" element={<RecurringExpenses />} />
                  </Route>
                </Route>
              </Routes>
            </React.Suspense>
          </SocketProvider>
        </CurrencyProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
