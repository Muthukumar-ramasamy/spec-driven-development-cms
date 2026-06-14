import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthLayout } from './components/AuthLayout'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'

// Company Management pages
import CompaniesPage from './features/company-management/pages/CompaniesPage'
import CompanyDetailPage from './features/company-management/pages/CompanyDetailPage'

// Contact Management pages
import ContactsPage from './features/contact-management/pages/ContactsPage'
import ContactDetailPage from './features/contact-management/pages/ContactDetailPage'

// Lead Management pages
import LeadsPage from './features/lead-management/pages/LeadsPage'

// Activity & Task Tracking pages
import MyTasksPage from './features/activity-task-tracking/pages/MyTasksPage'

// Deal & Pipeline Management pages
import PipelineBoardPage from './features/deal-pipeline-management/pages/PipelineBoardPage'
import DealDetailPage from './features/deal-pipeline-management/pages/DealDetailPage'
import PipelineSettingsPage from './features/deal-pipeline-management/pages/PipelineSettingsPage'

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
          { path: '/contacts', element: <ContactsPage /> },
          { path: '/contacts/:id', element: <ContactDetailPage /> },
          { path: '/companies', element: <CompaniesPage /> },
          { path: '/companies/:id', element: <CompanyDetailPage /> },
          { path: '/leads', element: <LeadsPage /> },
          { path: '/deals', element: <PipelineBoardPage /> },
          { path: '/deals/:id', element: <DealDetailPage /> },
          { path: '/settings/pipeline', element: <PipelineSettingsPage /> },
          { path: '/tasks', element: <MyTasksPage /> },
          // Additional feature routes registered below by /implement-feature
        ],
      },
    ],
  },

  { path: '/', element: <Navigate to="/contacts" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
])
