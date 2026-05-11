import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { PermissionProvider } from './context/PermissionContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import './styles/GlobalStyles.css';

const Cockpit = lazy(() => import('./pages/Cockpit'));
const CRMPipeline = lazy(() => import('./pages/CRM'));
const LMSBatches = lazy(() => import('./pages/LMS'));
const BatchDetails = lazy(() => import('./pages/BatchDetails'));
const FinanceHub = lazy(() => import('./pages/Finance'));
const PTEEngine = lazy(() => import('./pages/PTE'));
const ERPSpaces = lazy(() => import('./pages/ERP'));
const GlobalReports = lazy(() => import('./pages/Reports'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Students = lazy(() => import('./pages/Students'));
const StudentDetails = lazy(() => import('./pages/StudentDetails'));
const BranchManagement = lazy(() => import('./pages/BranchManagement'));
const Payroll = lazy(() => import('./pages/Payroll'));
const MaterialCenter = lazy(() => import('./pages/MaterialCenter'));
const Assets = lazy(() => import('./pages/Assets'));
const Automation = lazy(() => import('./pages/Automation'));
const Reconciliation = lazy(() => import('./pages/Reconciliation'));
const Invoices = lazy(() => import('./pages/AdminInvoices'));
const ExpenseManager = lazy(() => import('./pages/AdminExpenses'));
const Ledger = lazy(() => import('./pages/AdminLedger'));
const Journal = lazy(() => import('./pages/AdminJournal'));
const CashFlow = lazy(() => import('./pages/AdminCashFlow'));
const ReportsHub = lazy(() => import('./pages/AdminReportsHub'));
const POSFees = lazy(() => import('./pages/AdminPOSFees'));
const LiquidAccounts = lazy(() => import('./pages/AdminLiquidAccounts'));
const WebsiteManagement = lazy(() => import('./pages/WebsiteManagement'));
const LoginPage = lazy(() => import('./pages/Login'));
const RBAC = lazy(() => import('./pages/RBAC'));
const HRMDashboard = lazy(() => import('./pages/HRMDashboard'));
const StaffAttendancePage = lazy(() => import('./pages/StaffAttendance'));
const LeaveManagement = lazy(() => import('./pages/LeaveManagement'));
const Recruitment = lazy(() => import('./pages/Recruitment'));
const StaffDocuments = lazy(() => import('./pages/StaffDocuments'));
const PerformanceReviews = lazy(() => import('./pages/PerformanceReviews'));
const ShiftPlanner = lazy(() => import('./pages/ShiftPlanner'));
const OrgChart = lazy(() => import('./pages/OrgChart'));
const Settings = lazy(() => import('./pages/Settings'));

const RouteFallback = () => <div style={{ padding: '2rem', color: '#64748b' }}>Loading...</div>;

const P = ({ title, children }) => (
  <ProtectedRoute><Layout title={title}>{children}</Layout></ProtectedRoute>
);

const App = () => {
  return (
      <ThemeProvider>
      <ToastProvider>
      <AuthProvider>
        <PermissionProvider>
        <Router basename="/admin">
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<P title="Operations Cockpit"><Cockpit /></P>} />
            <Route path="/reports" element={<P title="Enterprise Intelligence"><GlobalReports /></P>} />
            <Route path="/crm" element={<P title="CRM Pipeline"><CRMPipeline /></P>} />
            <Route path="/students" element={<P title="Student Directory"><Students /></P>} />
            <Route path="/students/:id" element={<P title="Student Profile"><StudentDetails /></P>} />
            <Route path="/lms" element={<P title="LMS Batch Deck"><LMSBatches /></P>} />
            <Route path="/lms/batch/:id" element={<P title="Batch Details"><BatchDetails /></P>} />
            <Route path="/pos" element={<P title="POS & Fee Management"><POSFees /></P>} />
            <Route path="/finance" element={<P title="Accounts Overview"><FinanceHub /></P>} />
            <Route path="/invoices" element={<P title="Invoice Management"><Invoices /></P>} />
            <Route path="/expenses" element={<P title="Expense Manager"><ExpenseManager /></P>} />
            <Route path="/ledger" element={<P title="General Ledger"><Ledger /></P>} />
            <Route path="/journal" element={<P title="Journal Entry"><Journal /></P>} />
            <Route path="/cashflow" element={<P title="Cash Flow Report"><CashFlow /></P>} />
            <Route path="/finance-reports" element={<P title="Financial Reports"><ReportsHub /></P>} />
            <Route path="/liquid-accounts" element={<P title="Bank & Cash"><LiquidAccounts /></P>} />
            <Route path="/pte" element={<P title="PTE Practice Engine"><PTEEngine /></P>} />
            <Route path="/erp" element={<P title="ERP Spaces & Scheduling"><ERPSpaces /></P>} />
            <Route path="/assets" element={<P title="Asset Registry"><Assets /></P>} />
            <Route path="/payroll" element={<P title="Staff & Payroll"><Payroll /></P>} />
            <Route path="/attendance" element={<P title="Attendance Registry"><Attendance /></P>} />
            <Route path="/branches" element={<P title="Branch Management"><BranchManagement /></P>} />
            <Route path="/materials" element={<P title="Material Center"><MaterialCenter /></P>} />
            <Route path="/automation" element={<P title="Automation Engine"><Automation /></P>} />
            <Route path="/reconciliation" element={<P title="Reconciliation Center"><Reconciliation /></P>} />
            <Route path="/website-management" element={<P title="Website Management"><WebsiteManagement /></P>} />
            <Route path="/rbac" element={<P title="Security & Access Control"><RBAC /></P>} />
            <Route path="/hrm-dashboard" element={<P title="HR Dashboard"><HRMDashboard /></P>} />
            <Route path="/staff-attendance" element={<P title="Staff Attendance"><StaffAttendancePage /></P>} />
            <Route path="/leave-management" element={<P title="Leave Management"><LeaveManagement /></P>} />
            <Route path="/recruitment" element={<P title="Recruitment Pipeline"><Recruitment /></P>} />
            <Route path="/staff-documents" element={<P title="Document Vault"><StaffDocuments /></P>} />
            <Route path="/performance" element={<P title="Performance Reviews"><PerformanceReviews /></P>} />
            <Route path="/shifts" element={<P title="Shift Planner"><ShiftPlanner /></P>} />
            <Route path="/org-chart" element={<P title="Organization Chart"><OrgChart /></P>} />
            <Route path="/settings" element={<P title="System Settings"><Settings /></P>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </Router>
        </PermissionProvider>
      </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
