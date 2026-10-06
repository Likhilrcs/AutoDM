import { createBrowserRouter } from 'react-router-dom';
import { Landing } from '@/pages/Landing/Landing';
import { Login } from '@/pages/Login/Login';
import { Signup } from '@/pages/Signup/Signup';
import { VerifyOtp } from '@/pages/VerifyOtp/VerifyOtp';
import { ResetPassword } from '@/pages/ResetPassword/ResetPassword';
import { Dashboard } from '@/pages/Dashboard/Dashboard';
import { Automations } from '@/pages/Automations/Automations';
import { CreateAutomation } from '@/pages/CreateAutomation/CreateAutomation';
import { AutomationDetails } from '@/pages/AutomationDetails/AutomationDetails';
import { Activity } from '@/pages/Activity/Activity';
import { SocialAccounts } from '@/pages/SocialAccounts/SocialAccounts';
import { Settings } from '@/pages/Settings/Settings';
import { OAuthCallback } from '@/pages/OAuthCallback/OAuthCallback';
import { AppLayout } from '@/layouts/AppLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Landing />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    path: '/verify-otp',
    element: <VerifyOtp />,
  },
  {
    path: '/reset-password',
    element: <ResetPassword />,
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/dashboard',
        element: <Dashboard />,
      },
      {
        path: '/automations',
        element: <Automations />,
      },
      {
        path: '/automations/new',
        element: <CreateAutomation />,
      },
      {
        path: '/automations/:id',
        element: <AutomationDetails />,
      },
      {
        path: '/activity',
        element: <Activity />,
      },
      {
        path: '/social-accounts',
        element: <SocialAccounts />,
      },
      {
        path: '/settings',
        element: <Settings />,
      },
      {
        path: '/dashboard/instagram/callback',
        element: <OAuthCallback />,
      },
      {
        path: '/social-accounts/callback',
        element: <OAuthCallback />,
      },
    ],
  },
]);
