import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './ui/Layout';
import PmScopeLayout from './ui/PmScopeLayout';
import RequireAuth from './ui/RequireAuth';
import PortalLayout, { portalPath } from './ui/PortalLayout';
import Login from './screens/Login';
import Dashboard from './screens/Dashboard';
import Contacts from './screens/Contacts';
import PartyRoleProfiles from './screens/PartyRoleProfiles';
import Clients from './screens/Clients';
import Agreements from './screens/Agreements';
import AgreementTemplates from './screens/AgreementTemplates';
import DealsBoard from './screens/DealsBoard';
import PropertySellDashboard from './screens/PropertySellDashboard';
import SalesPropertyFile from './screens/sales/SalesPropertyFile';
import RentalProperties from './screens/RentalProperties';
import PropertyWizard from './screens/PropertyWizard';
import PropertyMgmtDashboard from './screens/PropertyMgmtDashboard';
import TenantApplications from './screens/TenantApplications';
import RentalEnquiries from './screens/RentalEnquiries';
import RentalAssessments from './screens/RentalAssessments';
import OwnerStatements from './screens/OwnerStatements';
import LandlordPortal from './screens/LandlordPortal';
import TenantPortal from './screens/TenantPortal';
import Renewals from './screens/Renewals';
import Vacancies from './screens/Vacancies';
import DepositSettlements from './screens/DepositSettlements';
import RentalReports from './screens/RentalReports';
import Disbursements from './screens/Disbursements';
import OwnerApprove from './screens/OwnerApprove';
import RoleRegistration from './screens/RoleRegistration';
import TenantApply from './screens/TenantApply';
import EmployerReference from './screens/EmployerReference';
import Services from './screens/Services';
import ServiceCatalog from './screens/ServiceCatalog';
import Projects from './screens/Projects';
import WorkOrders from './screens/WorkOrders';
import Inspections from './screens/Inspections';
import Leads from './screens/Leads';
import Providers from './screens/Providers';
import ServiceProviders from './screens/ServiceProviders';
import ProviderRegister from './screens/ProviderRegister';
import CareDashboard from './screens/CareDashboard';
import CareWorkOrders from './screens/CareWorkOrders';
import CareEnquiries, { CareLeads } from './screens/CareEnquiries';
import CareInvoicing, { CustomerLists, CarePayments } from './screens/CareBilling';
import CareQuotations from './screens/CareQuotations';
import CareAmc from './screens/CareAmc';
import CareRegisters from './screens/CareRegisters';
import Signing from './screens/Signing';
import Invoices from './screens/Invoices';
import Payments from './screens/Payments';
import Folios from './screens/Folios';
import AccountCategories from './screens/AccountCategories';
import GlobalInvoicing from './screens/GlobalInvoicing';
import LandlordBills from './screens/LandlordBills';
import RentalReceipts from './screens/RentalReceipts';
import Portal from './screens/Portal';
import SignPage from './screens/SignPage';
import IntakePage from './screens/IntakePage';
import Placeholder from './screens/Placeholder';
import Consultations from './screens/Consultations';
import Compliance from './screens/Compliance';
import { UtilityBills, TenantRequests, ArrearsActions, MarketingActivities, ExpenseApprovals, PropertyRisks } from './screens/PropertyManagementControls';

const PH = (title, note) => <Placeholder title={title} note={note} />;

// Send users to the right home: portal roles -> their portal, staff -> dashboard.
function Landing() {
  const { user } = useAuth();
  return <Navigate to={portalPath(user?.role) || '/dashboard'} replace />;
}
// Keep portal-role users out of the admin app.
function AdminGate({ children }) {
  const { user } = useAuth();
  const p = portalPath(user?.role);
  return p ? <Navigate to={p} replace /> : children;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router basename="/admin">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/sign/:token" element={<SignPage />} />
            <Route path="/intake/:token" element={<IntakePage />} />
            {/* Public token pages — owner approval + role registration (no login) */}
            <Route path="/approve/:token" element={<OwnerApprove />} />
            <Route path="/register/:token" element={<RoleRegistration />} />
            <Route path="/apply/:token" element={<TenantApply />} />
            <Route path="/reference/:token" element={<EmployerReference />} />
            <Route path="/provider-register/:token" element={<ProviderRegister />} />

            {/* Role-routed portals (buyer/tenant/supplier/landlord) — one SPA, one auth,
                one style system. Everything lives inside the same admin-portal build. */}
            <Route element={<RequireAuth><PortalLayout /></RequireAuth>}>
              <Route path="/buyer" element={<Portal />} />
              <Route path="/tenant" element={<TenantPortal />} />
              <Route path="/supplier" element={<Portal />} />
              <Route path="/landlord" element={<LandlordPortal />} />
              {/* Legacy /owner path — redirect old links to /landlord. */}
              <Route path="/owner" element={<Navigate to="/landlord" replace />} />
            </Route>

            {/* Admin CRM (staff only) */}
            <Route element={<RequireAuth><AdminGate><Layout /></AdminGate></RequireAuth>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/residential/buy" element={<DealsBoard category="residential" dealType="buy" title="Residential · Buy" desc="Buyer service — properties, buyers, agreements, commission, expenses and status." />} />
              <Route path="/residential/sell" element={<PropertySellDashboard category="residential" title="Residential · Sell" desc="Seller service — listings, owners, agreements, commission and settlement." />} />
              <Route path="/sales/property/:id" element={<SalesPropertyFile />} />
              <Route path="/sales/properties/new" element={<PropertyWizard />} />
              <Route path="/sales/properties/new/:id" element={<PropertyWizard />} />
              <Route element={<PmScopeLayout />}>
                <Route path="/property-management" element={<PropertyMgmtDashboard />} />
                <Route path="/property-management/rentals" element={<RentalProperties />} />
                <Route path="/property-management/rentals/new" element={<PropertyWizard />} />
                <Route path="/property-management/rentals/new/:id" element={<PropertyWizard />} />
                <Route path="/property-management/applications" element={<TenantApplications />} />
                <Route path="/property-management/enquiries" element={<RentalEnquiries />} />
                <Route path="/property-management/assessments" element={<RentalAssessments />} />
                <Route path="/property-management/statements" element={<OwnerStatements />} />
                <Route path="/property-management/renewals" element={<Renewals />} />
                <Route path="/property-management/vacancies" element={<Vacancies />} />
                <Route path="/property-management/settlements" element={<DepositSettlements />} />
                <Route path="/property-management/reports" element={<RentalReports />} />
                <Route path="/property-management/disbursements" element={<Disbursements />} />
                <Route path="/property-management/utilities" element={<UtilityBills />} />
                <Route path="/property-management/tenant-requests" element={<TenantRequests />} />
                <Route path="/property-management/arrears" element={<ArrearsActions />} />
                <Route path="/property-management/marketing" element={<MarketingActivities />} />
                <Route path="/property-management/expense-approvals" element={<ExpenseApprovals />} />
                <Route path="/property-management/risks" element={<PropertyRisks />} />
                <Route path="/property-management/global-invoicing" element={<GlobalInvoicing />} />
              </Route>
              <Route path="/commercial/buy" element={<DealsBoard category="commercial" dealType="buy" title="Commercial · Buy" desc="Commercial buyer service — deals, buyers, agreements, commission and expenses." />} />
              <Route path="/commercial/sell" element={<PropertySellDashboard category="commercial" title="Commercial · Sell" desc="Commercial seller service — listings, owners, agreements and settlement." />} />
              <Route path="/rural/buy" element={<DealsBoard category="rural" dealType="buy" title="Rural · Buy" desc="Rural buyer service — farms, lands, buyers, agreements, commission and expenses." />} />
              <Route path="/rural/sell" element={<PropertySellDashboard category="rural" title="Rural · Sell" desc="Rural seller service — farms, lands, owners, agreements, commission and settlement." />} />
              <Route path="/services" element={<ServiceCatalog />} />
              <Route path="/services/lines" element={<Services />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/work-orders" element={<WorkOrders />} />
              <Route path="/inspections" element={<Inspections />} />
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/role-onboarding" element={<PartyRoleProfiles />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/consultations" element={<Consultations />} />
              <Route path="/compliance" element={<Compliance />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/providers" element={<ServiceProviders />} />
              <Route path="/providers/legacy" element={<Providers />} />
              <Route path="/property-care" element={<CareDashboard />} />
              <Route path="/property-care/work-orders" element={<CareWorkOrders />} />
              <Route path="/property-care/enquiries" element={<CareEnquiries />} />
              <Route path="/property-care/leads" element={<CareLeads />} />
              <Route path="/property-care/customers" element={<CustomerLists />} />
              <Route path="/property-care/invoicing" element={<CareInvoicing />} />
              <Route path="/property-care/payments" element={<CarePayments />} />
              <Route path="/property-care/quotations" element={<CareQuotations />} />
              <Route path="/property-care/amc" element={<CareAmc />} />
              <Route path="/property-care/registers" element={<CareRegisters />} />
              <Route path="/agreements" element={<Agreements />} />
              <Route path="/agreement-templates" element={<AgreementTemplates />} />
              <Route path="/documents" element={PH('Documents', 'Central document management with versioning.')} />
              <Route path="/signing" element={<Signing />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/landlord-bills" element={<LandlordBills />} />
              <Route path="/rental-receipts" element={<RentalReceipts />} />
              <Route path="/folios" element={<Folios />} />
              <Route path="/account-categories" element={<AccountCategories />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/reports" element={PH('Reports', 'Operational and financial reports.')} />
              <Route path="/users" element={PH('Users & Roles', 'User management and RBAC matrix.')} />
              <Route path="/settings" element={PH('Settings', 'System configuration.')} />
            </Route>

            <Route path="/" element={<RequireAuth><Landing /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}
