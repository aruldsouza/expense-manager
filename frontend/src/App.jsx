import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import MainLayout from './layouts/MainLayout';
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const CreateGroup = React.lazy(() => import('./pages/CreateGroup'));
const GroupDetails = React.lazy(() => import('./pages/GroupDetails'));
import ProtectedRoute from './components/ProtectedRoute';
import Spinner from './components/Spinner';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
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
                {/* Future protected routes: /groups, /groups/:id, etc. */}
              </Route>
            </Route>
          </Routes>
        </React.Suspense>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
