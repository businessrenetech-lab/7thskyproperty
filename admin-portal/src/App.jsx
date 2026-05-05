import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Cockpit from './pages/Cockpit';
import CRMPipeline from './pages/CRM';
import LMSBatches from './pages/LMS';
import BatchDetails from './pages/BatchDetails';
import FinanceHub from './pages/Finance';
import PTEEngine from './pages/PTE';
import ERPSpaces from './pages/ERP';
import GlobalReports from './pages/Reports';
import Attendance from './pages/Attendance';
import Students from './pages/Students';
import StudentDetails from './pages/StudentDetails';
import BranchManagement from './pages/BranchManagement';
import Payroll from './pages/Payroll';
import MaterialCenter from './pages/MaterialCenter';
import Assets from './pages/Assets';
import Automation from './pages/Automation';
import Reconciliation from './pages/Reconciliation';
// Accounting pages (same as accounting portal)
import Invoices from './pages/AdminInvoices';
import ExpenseManager from './pages/AdminExpenses';
import Ledger from './pages/AdminLedger';
import Journal from './pages/AdminJournal';
import CashFlow from './pages/AdminCashFlow';
import ReportsHub from './pages/AdminReportsHub';
import POSFees from './pages/AdminPOSFees';
import LiquidAccounts from './pages/AdminLiquidAccounts';
import WebsiteManagement from './pages/WebsiteManagement';
import PublicWebsite from './pages/PublicWebsite';
import LoginPage from './pages/Login';
import RBAC from './pages/RBAC';
import HRMDashboard from './pages/HRMDashboard';
import StaffAttendancePage from './pages/StaffAttendance';
import LeaveManagement from './pages/LeaveManagement';
import Recruitment from './pages/Recruitment';
import StaffDocuments from './pages/StaffDocuments';
import PerformanceReviews from './pages/PerformanceReviews';
import ShiftPlanner from './pages/ShiftPlanner';
import OrgChart from './pages/OrgChart';
import Settings from './pages/Settings';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { PermissionProvider } from './context/PermissionContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import './styles/GlobalStyles.css';

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
        </Router>
        </PermissionProvider>
      </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
