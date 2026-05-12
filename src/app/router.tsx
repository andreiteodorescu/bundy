import { lazy, Suspense } from 'react';
import { Center, Loader } from '@mantine/core';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '@/components/layouts/MainLayout';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { SignupPage } from '@/features/auth/SignupPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';

const HomePage = lazy(() =>
  import('@/features/home/HomePage').then((m) => ({ default: m.HomePage })),
);
const ExpensesListPage = lazy(() =>
  import('@/features/expenses/ExpensesListPage').then((m) => ({ default: m.ExpensesListPage })),
);
const AddExpensePage = lazy(() =>
  import('@/features/expenses/AddExpensePage').then((m) => ({ default: m.AddExpensePage })),
);
const AnalyticsPage = lazy(() =>
  import('@/features/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
);
const BudgetsListPage = lazy(() =>
  import('@/features/budgets/BudgetsListPage').then((m) => ({ default: m.BudgetsListPage })),
);
const BudgetFormPage = lazy(() =>
  import('@/features/budgets/BudgetFormPage').then((m) => ({ default: m.BudgetFormPage })),
);
const BudgetsArchivePage = lazy(() =>
  import('@/features/budgets/BudgetsArchivePage').then((m) => ({ default: m.BudgetsArchivePage })),
);
const MorePage = lazy(() =>
  import('@/features/settings/MorePage').then((m) => ({ default: m.MorePage })),
);
const CategoriesListPage = lazy(() =>
  import('@/features/categories/CategoriesListPage').then((m) => ({ default: m.CategoriesListPage })),
);
const CategoryFormPage = lazy(() =>
  import('@/features/categories/CategoryFormPage').then((m) => ({ default: m.CategoryFormPage })),
);
const SubcategoryFormPage = lazy(() =>
  import('@/features/categories/SubcategoryFormPage').then((m) => ({ default: m.SubcategoryFormPage })),
);
const SubscriptionsListPage = lazy(() =>
  import('@/features/subscriptions/SubscriptionsListPage').then((m) => ({ default: m.SubscriptionsListPage })),
);
const SubscriptionFormPage = lazy(() =>
  import('@/features/subscriptions/SubscriptionFormPage').then((m) => ({ default: m.SubscriptionFormPage })),
);
const FixedExpensesListPage = lazy(() =>
  import('@/features/fixed-expenses/FixedExpensesListPage').then((m) => ({ default: m.FixedExpensesListPage })),
);
const FixedExpenseFormPage = lazy(() =>
  import('@/features/fixed-expenses/FixedExpenseFormPage').then((m) => ({ default: m.FixedExpenseFormPage })),
);
const FixedExpensesPrePage = lazy(() =>
  import('@/features/fixed-expenses/FixedExpensesPrePage').then((m) => ({ default: m.FixedExpensesPrePage })),
);
const LoansListPage = lazy(() =>
  import('@/features/loans/LoansListPage').then((m) => ({ default: m.LoansListPage })),
);
const LoanFormPage = lazy(() =>
  import('@/features/loans/LoanFormPage').then((m) => ({ default: m.LoanFormPage })),
);
const SavingsListPage = lazy(() =>
  import('@/features/savings/SavingsListPage').then((m) => ({ default: m.SavingsListPage })),
);
const SavingsFormPage = lazy(() =>
  import('@/features/savings/SavingsFormPage').then((m) => ({ default: m.SavingsFormPage })),
);
const InvestmentsListPage = lazy(() =>
  import('@/features/investments/InvestmentsListPage').then((m) => ({ default: m.InvestmentsListPage })),
);
const InvestmentsFormPage = lazy(() =>
  import('@/features/investments/InvestmentsFormPage').then((m) => ({ default: m.InvestmentsFormPage })),
);
const QuickExpensesListPage = lazy(() =>
  import('@/features/quick-expenses/QuickExpensesListPage').then((m) => ({ default: m.QuickExpensesListPage })),
);
const QuickExpenseFormPage = lazy(() =>
  import('@/features/quick-expenses/QuickExpenseFormPage').then((m) => ({ default: m.QuickExpenseFormPage })),
);
const PredefinedExpensesListPage = lazy(() =>
  import('@/features/predefined-expenses/PredefinedExpensesListPage').then((m) => ({ default: m.PredefinedExpensesListPage })),
);
const PredefinedExpenseFormPage = lazy(() =>
  import('@/features/predefined-expenses/PredefinedExpenseFormPage').then((m) => ({ default: m.PredefinedExpenseFormPage })),
);
const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const HiddenExpensesPage = lazy(() =>
  import('@/features/hidden-expenses/HiddenExpensesPage').then((m) => ({ default: m.HiddenExpensesPage })),
);
const AdminUsersPage = lazy(() =>
  import('@/features/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
);
const FeedbackPage = lazy(() =>
  import('@/features/feedback/FeedbackPage').then((m) => ({ default: m.FeedbackPage })),
);
const BankConnectionsPage = lazy(() =>
  import('@/features/bank/BankConnectionsPage').then((m) => ({ default: m.BankConnectionsPage })),
);
const BankCallbackPage = lazy(() =>
  import('@/features/bank/BankCallbackPage').then((m) => ({ default: m.BankCallbackPage })),
);

function PageFallback() {
  return (
    <Center h="60vh">
      <Loader />
    </Center>
  );
}

function lazyRoute(node: React.ReactNode) {
  return <Suspense fallback={<PageFallback />}>{node}</Suspense>;
}

const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: '/home', element: lazyRoute(<HomePage />) },

      { path: '/expenses', element: lazyRoute(<ExpensesListPage />) },
      { path: '/expenses/add', element: lazyRoute(<AddExpensePage />) },
      { path: '/expenses/:id/edit', element: lazyRoute(<AddExpensePage />) },

      { path: '/analytics', element: lazyRoute(<AnalyticsPage />) },

      { path: '/budgets', element: lazyRoute(<BudgetsListPage />) },
      { path: '/budgets/archive', element: lazyRoute(<BudgetsArchivePage />) },
      { path: '/budgets/new', element: lazyRoute(<BudgetFormPage />) },
      { path: '/budgets/:id/edit', element: lazyRoute(<BudgetFormPage />) },

      { path: '/more', element: lazyRoute(<MorePage />) },

      { path: '/categories', element: lazyRoute(<CategoriesListPage />) },
      { path: '/categories/new', element: lazyRoute(<CategoryFormPage />) },
      { path: '/categories/:id/edit', element: lazyRoute(<CategoryFormPage />) },
      { path: '/subcategories/new', element: lazyRoute(<SubcategoryFormPage />) },
      { path: '/subcategories/:id/edit', element: lazyRoute(<SubcategoryFormPage />) },

      { path: '/subscriptions', element: lazyRoute(<SubscriptionsListPage />) },
      { path: '/subscriptions/new', element: lazyRoute(<SubscriptionFormPage />) },
      { path: '/subscriptions/:id/edit', element: lazyRoute(<SubscriptionFormPage />) },

      { path: '/fixed-expenses', element: lazyRoute(<FixedExpensesListPage />) },
      { path: '/fixed-expenses/new', element: lazyRoute(<FixedExpenseFormPage />) },
      { path: '/fixed-expenses/:id/edit', element: lazyRoute(<FixedExpenseFormPage />) },
      { path: '/fixed-expenses/quick-add', element: lazyRoute(<FixedExpensesPrePage />) },

      { path: '/loans', element: lazyRoute(<LoansListPage />) },
      { path: '/loans/new', element: lazyRoute(<LoanFormPage />) },
      { path: '/loans/:id/edit', element: lazyRoute(<LoanFormPage />) },
      { path: '/savings', element: lazyRoute(<SavingsListPage />) },
      { path: '/savings/new', element: lazyRoute(<SavingsFormPage />) },
      { path: '/savings/:id/edit', element: lazyRoute(<SavingsFormPage />) },
      { path: '/investments', element: lazyRoute(<InvestmentsListPage />) },
      { path: '/investments/new', element: lazyRoute(<InvestmentsFormPage />) },
      { path: '/investments/:id/edit', element: lazyRoute(<InvestmentsFormPage />) },

      { path: '/quick-expenses', element: lazyRoute(<QuickExpensesListPage />) },
      { path: '/quick-expenses/new', element: lazyRoute(<QuickExpenseFormPage />) },
      { path: '/quick-expenses/:id/edit', element: lazyRoute(<QuickExpenseFormPage />) },

      { path: '/predefined-expenses', element: lazyRoute(<PredefinedExpensesListPage />) },
      { path: '/predefined-expenses/new', element: lazyRoute(<PredefinedExpenseFormPage />) },
      { path: '/predefined-expenses/:id/edit', element: lazyRoute(<PredefinedExpenseFormPage />) },

      { path: '/settings', element: lazyRoute(<SettingsPage />) },
      { path: '/hidden-expenses', element: lazyRoute(<HiddenExpensesPage />) },
      { path: '/admin/users', element: lazyRoute(<AdminUsersPage />) },
      { path: '/feedback', element: lazyRoute(<FeedbackPage />) },
      { path: '/bank', element: lazyRoute(<BankConnectionsPage />) },
      { path: '/bank/callback', element: lazyRoute(<BankCallbackPage />) },

      { path: '*', element: <Navigate to="/home" replace /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
