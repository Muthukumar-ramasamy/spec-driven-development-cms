import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthLayout } from './components/AuthLayout'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'

// Auth pages
import LoginPage from './features/auth/pages/LoginPage'
import SignupPage from './features/auth/pages/SignupPage'
import ForgotPasswordPage from './features/auth/pages/ForgotPasswordPage'
import ResetPasswordPage from './features/auth/pages/ResetPasswordPage'
import AcceptInvitePage from './features/auth/pages/AcceptInvitePage'
import UsersPage from './features/auth/pages/UsersPage'

// Routes are expanded by /implement-feature commands
export const router = createBrowserRouter([
  // Public auth routes
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/accept-invite', element: <AcceptInvitePage /> },
    ],
  },

  // Protected app routes — ProtectedRoute guards, AppLayout provides the shell
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/settings/users', element: <UsersPage /> },
          // Additional feature routes registered below by /implement-feature
        ],
      },
    ],
  },

  { path: '/', element: <Navigate to="/deals" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
])
