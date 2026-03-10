import React, { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import LoginPage from './pages/LoginPage';
import VerifyMFAPage from './pages/VerifyMFAPage';
import DashboardPage from './pages/DashboardPage';
import EmployeeListPage from './pages/EmployeeListPage';
import TimeAttendancePage from './pages/TimeAttendancePage';
import LeaveManagementPage from './pages/LeaveManagementPage';
import PayrollPage from './pages/PayrollPage';
import PerformanceReviewPage from './pages/PerformanceReviewPage';
import RecruitmentPage from './pages/RecruitmentPage';
import OnboardingPage from './pages/OnboardingPage';
import BenefitsPage from './pages/BenefitsPage';
import LearningPage from './pages/LearningPage';
import WellnessPage from './pages/WellnessPage';
import CompliancePage from './pages/CompliancePage';
import DocumentsPage from './pages/DocumentsPage';
import OffboardingPage from './pages/OffboardingPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import RoleGuard from './components/RoleGuard';
import RBACGuard from './components/RBACGuard';
import { AppDispatch } from './store';
import { AuthService } from './services/authService';
import { setUser, clearAuth, setInitialized } from './store/authSlice';
import { WebSocketProvider } from './hooks/useWebSocket';

// Dashboard pages
import AdminDashboard from './pages/admin/AdminDashboard';
import HRDashboard from './pages/hr/HRDashboard';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';

// Admin pages
import UserManagement from './pages/admin/UserManagement';
import AccessPanel from './pages/admin/AccessPanel';
import RoleManagement from './pages/admin/RoleManagement';
import AuditLogs from './pages/admin/AuditLogs';

// HR pages
import EmployeeDirectory from './pages/hr/EmployeeDirectory';
import EmployeeProfile from './pages/hr/EmployeeProfile';

// Manager pages
import TeamManagement from './pages/manager/TeamManagement';
import ManagerLeaveRequests from './pages/manager/ManagerLeaveRequests';

// Employee pages
import MyProfile from './pages/employee/MyProfile';

// Shared pages
import GoalsPage from './pages/shared/GoalsPage';
import ProjectsPage from './pages/shared/ProjectsPage';

const App: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Check if user has token, load user data
    const token = localStorage.getItem('access_token');
    if (token) {
      // Try to get current user data
      AuthService.getCurrentUser()
        .then((response) => {
          if (response.success && response.data.user) {
            dispatch(setUser(response.data.user));
          } else {
            dispatch(setInitialized());
          }
        })
        .catch((error) => {
          console.error('Failed to restore user session:', error);
          // Token might be expired, clear it
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          dispatch(clearAuth());
        });
    } else {
      // No token, we are done initializing
      import('./store/authSlice').then(({ setInitialized }) => {
        dispatch(setInitialized());
      });
    }
  }, [dispatch]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify-mfa" element={<VerifyMFAPage />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <WebSocketProvider>
              <Layout />
            </WebSocketProvider>
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Admin Routes */}
        <Route element={<RoleGuard allowedRoles={['ADMIN']}><Outlet /></RoleGuard>}>
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/users" element={<UserManagement />} />
          <Route path="admin/access-panel" element={<AccessPanel />} />
          <Route path="admin/roles" element={<RoleManagement />} />
          <Route path="admin/audit-logs" element={<AuditLogs />} />
        </Route>

        {/* HR Routes */}
        <Route element={<RoleGuard allowedRoles={['ADMIN', 'HR_MANAGER']}><Outlet /></RoleGuard>}>
          <Route path="hr" element={<HRDashboard />} />
          <Route path="hr/employees" element={<EmployeeDirectory />} />
          <Route path="hr/employees/:id" element={<EmployeeProfile />} />
        </Route>

        {/* Manager Routes */}
        <Route element={<RoleGuard allowedRoles={['ADMIN', 'MANAGER']}><Outlet /></RoleGuard>}>
          <Route path="manager" element={<ManagerDashboard />} />
          <Route path="manager/teams" element={<TeamManagement />} />
          <Route path="manager/leave" element={<ManagerLeaveRequests />} />
        </Route>

        {/* Employee Routes */}
        <Route element={<RoleGuard allowedRoles={['ADMIN', 'HR_MANAGER', 'MANAGER', 'EMPLOYEE']}><Outlet /></RoleGuard>}>
          <Route path="employee" element={<EmployeeDashboard />} />
          <Route path="employee/profile" element={<MyProfile />} />
        </Route>

        {/* Shared Routes */}
        <Route path="goals" element={<GoalsPage />} />
        <Route path="projects" element={<ProjectsPage />} />

        {/* Legacy Routes */}
        <Route path="employees" element={<EmployeeListPage />} />
        <Route path="time" element={<TimeAttendancePage />} />
        <Route
          path="leave"
          element={
            <RBACGuard requiredPermissions={['read_leave']}>
              <LeaveManagementPage />
            </RBACGuard>
          }
        />
        <Route
          path="payroll"
          element={
            <RBACGuard requiredPermissions={['read_payroll']}>
              <PayrollPage />
            </RBACGuard>
          }
        />
        <Route
          path="performance"
          element={
            <RBACGuard requiredPermissions={['read_performance', 'read_own_performance']}>
              <PerformanceReviewPage />
            </RBACGuard>
          }
        />
        <Route
          path="recruitment"
          element={
            <RBACGuard requiredPermissions={['read_recruitment']}>
              <RecruitmentPage />
            </RBACGuard>
          }
        />
        <Route
          path="onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="benefits"
          element={
            <RBACGuard requiredPermissions={['read_benefits']}>
              <BenefitsPage />
            </RBACGuard>
          }
        />
        <Route
          path="learning"
          element={
            <RBACGuard requiredPermissions={['read_learning']}>
              <LearningPage />
            </RBACGuard>
          }
        />
        <Route
          path="wellness"
          element={
            <RBACGuard requiredPermissions={['read_wellness']}>
              <WellnessPage />
            </RBACGuard>
          }
        />
        <Route
          path="compliance"
          element={
            <RBACGuard requiredPermissions={['read_compliance']}>
              <CompliancePage />
            </RBACGuard>
          }
        />
        <Route
          path="documents"
          element={
            <RBACGuard requiredPermissions={['read_documents']}>
              <DocumentsPage />
            </RBACGuard>
          }
        />
        <Route
          path="offboarding"
          element={
            <RBACGuard requiredPermissions={['read_offboarding']}>
              <OffboardingPage />
            </RBACGuard>
          }
        />
        <Route path="" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
