import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import UnifiedDashboard from './pages/admin/UnifiedDashboard';
import CustomersPage from './pages/owner/CustomersPage';
import AdminCustomersPage from './pages/admin/CustomersPage';
import AdminDispatchPage from './pages/admin/DispatchPage';
import DispatchPage from './pages/cs/DispatchPage';
import OrdersPage from './pages/cs/OrdersPage';
import AdminBillingPage from './pages/admin/BillingPage';
import AdminPcControlPage from './pages/admin/PcControlPage';
import EmployeesPage from './pages/owner/EmployeesPage';
import StudiosPage from './pages/owner/StudiosPage';
import AuthorizationsPage from './pages/owner/AuthorizationsPage';
import ReviewPage from './pages/admin/ReviewPage';
import SettingsPage from './pages/admin/SettingsPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import CompanionPage from './pages/CompanionPage';
import CompanionListPage from './pages/CompanionListPage';
import CompanionPoolPage from './pages/companion/PoolPage';
import CompanionBillingPage from './pages/companion/BillingPage';
import CompanionCustomersPage from './pages/companion/CustomersPage';
import CompanionOrdersPage from './pages/companion/OrdersPage';
import DispatchOrdersPage from './pages/companion/DispatchOrdersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import TrafficPoolPage from './pages/admin/TrafficPoolPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/profile-setup',
    element: <ProfileSetupPage />,
  },
  {
    path: '/companion',
    element: <AppLayout />,
    children: [
      { path: '', element: <CompanionPage /> },
      { path: 'pool', element: <CompanionPoolPage /> },
      { path: 'billing', element: <CompanionBillingPage /> },
      { path: 'customers/:id', element: <CustomerDetailPage /> },
      { path: 'customers', element: <CompanionCustomersPage /> },
      { path: 'orders', element: <CompanionOrdersPage /> },
      { path: 'dispatch', element: <DispatchOrdersPage /> },
      { path: 'companions', element: <CompanionListPage /> },
    ],
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      // Owner routes
      {
        path: 'owner/customers',
        element: <CustomersPage />,
      },
      {
        path: 'owner/employees',
        element: <EmployeesPage />,
      },
      {
        path: 'owner/studios',
        element: <StudiosPage />,
      },
      {
        path: 'owner/authorizations',
        element: <AuthorizationsPage />,
      },
      {
        path: 'owner/review',
        element: <ReviewPage />,
      },
      {
        path: 'owner/settings',
        element: <SettingsPage />,
      },
      {
        path: 'owner/orders',
        element: <OrdersPage />,
      },
      // Admin routes
      {
        path: 'admin',
        element: <UnifiedDashboard />,
      },
      {
        path: 'admin/dispatch',
        element: <AdminDispatchPage />,
      },
      {
        path: 'admin/employees',
        element: <EmployeesPage />,
      },
      {
        path: 'admin/customers/:id',
        element: <CustomerDetailPage />,
      },
      {
        path: 'admin/customers',
        element: <AdminCustomersPage />,
      },
      {
        path: 'admin/billing',
        element: <AdminBillingPage />,
      },
      {
        path: 'admin/pc-control',
        element: <AdminPcControlPage />,
      },
      {
        path: 'admin/review',
        element: <ReviewPage />,
      },
      {
        path: 'admin/orders',
        element: <OrdersPage />,
      },
      {
        path: 'admin/traffic',
        element: <TrafficPoolPage />,
      },
      {
        path: 'admin/settings',
        element: <SettingsPage />,
      },
      // CS routes
      {
        path: 'cs/dispatch',
        element: <DispatchPage />,
      },
      {
        path: 'cs/orders',
        element: <OrdersPage />,
      },
      {
        path: 'cs/employees',
        element: <EmployeesPage />,
      },
      {
        path: 'cs/companions',
        element: <CompanionListPage />,
      },
      {
        path: '',
        element: <Navigate to="/admin" replace />,
      },
    ],
  },
]);
