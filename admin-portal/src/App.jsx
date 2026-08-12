import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
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
import SalesEnquiries from './screens/SalesEnquiries';
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
import ServiceLineDashboard from './screens/services/ServiceLineDashboard';
import WaterTankConsole from './screens/watertank/WaterTankConsole';
import WaterTankDashboard from './screens/watertank/Dashboard';
import WaterTankProviders from './screens/watertank/providers/ProviderDirectory';
import WaterTankProviderDetail from './screens/watertank/providers/ProviderDetail';
import WaterTankProviderOnboarding from './screens/watertank/providers/ProviderOnboarding';
import WTCompliance from './screens/watertank/Compliance';
import WTServiceReports from './screens/watertank/ServiceReports';
import WaterTankSettings from './screens/watertank/Settings';
import WaterTankCatalogue from './screens/watertank/Catalogue';
import WTWorkQueue from './screens/watertank/WorkQueue';
import WTAmcDetail from './screens/watertank/AmcDetail';
import WTCalendar from './screens/watertank/Calendar';
import WTPortal from './screens/watertank/Portal';
import WTClients from './screens/watertank/Clients';
import WTClientDetail from './screens/watertank/clients/ClientDashboard';
import WTClientCreate from './screens/watertank/clients/ClientCreate';
import WTServiceRequests from './screens/watertank/ServiceRequests';
import WTServiceRequestNew from './screens/watertank/ServiceRequestNew';
import WTSiteAssessments from './screens/watertank/SiteAssessments';
import WTAssessmentDetail from './screens/watertank/AssessmentDetail';
import WTAssessmentForm from './screens/watertank/AssessmentForm';
import WTQuotationBuilder from './screens/watertank/QuotationBuilder';
import WTQuotationAgreement from './screens/watertank/QuotationAgreement';
import WTQuotationDetail from './screens/watertank/QuotationDetail';
import WTQuotations from './screens/watertank/Quotations';
import WTQuotationDirect from './screens/watertank/QuotationDirect';
import WTWorkOrders from './screens/watertank/WorkOrders';
import WTWorkOrderDetail from './screens/watertank/WorkOrderDetail';
import WTWorkOrderForm from './screens/watertank/WorkOrderForm';
import WTWorkOrderDocument from './screens/watertank/WorkOrderDocument';
import WTProjects from './screens/watertank/Projects';
import WTProjectDetail from './screens/watertank/ProjectDetail';
import WTProjectForm from './screens/watertank/ProjectForm';
import WTAgreementsHub from './screens/watertank/AgreementsHub';
import WTAmc from './screens/watertank/Amc';
import WTAmcForm from './screens/watertank/AmcForm';
import WTInvoices from './screens/watertank/Invoices';
import WTInvoiceEditor from './screens/watertank/InvoiceEditor';
import WTPayments from './screens/watertank/Payments';
import WTRegisters from './screens/watertank/Registers';
import WTComplaints from './screens/watertank/Complaints';
import WTCommLog from './screens/watertank/CommLog';
import Projects from './screens/Projects';
import WorkOrders from './screens/WorkOrders';
import Inspections from './screens/Inspections';
import Leads from './screens/Leads';
import Providers from './screens/Providers';
import ServiceProviders from './screens/ServiceProviders';
import ProviderRegister from './screens/ProviderRegister';
import WaterTankProviderOnboard from './screens/WaterTankProviderOnboard';
import CareDashboard from './screens/CareDashboard';
import CareWorkOrders from './screens/CareWorkOrders';
import CareEnquiries, { CareLeads } from './screens/CareEnquiries';
import CareInvoicing, { CustomerLists } from './screens/CareBilling';
import CareQuotations from './screens/CareQuotations';
import CareAmc from './screens/CareAmc';
import ShortStayHub from './screens/ShortStayHub';
import ShortStayPropertyOnboarding from './screens/shortstay/ShortStayPropertyOnboarding';
import ShortStayPropertyFile from './screens/shortstay/ShortStayPropertyFile';
import Signing from './screens/Signing';
import RprmAgreements from './screens/RprmAgreements';
import TmAgreements from './screens/TmAgreements';
import StsAgreements from './screens/StsAgreements';
import WtCustomerAgreements from './screens/WtCustomerAgreements';
import WtProviderAgreements from './screens/WtProviderAgreements';
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

/*
 * Redirect that keeps the query string and any route params.
 *
 * A bare <Navigate to="/new/path" /> drops the search string, and several of the
 * water-tank agreement links carry ?project=WTCM-P0022 — the context the
 * agreement builder needs to know what it is drafting against. Losing it silently
 * hands the user an empty form. `:param` placeholders in `to` are filled from the
 * matched route, so /agreements/water-tank-provider/7 lands on
 * /water-tank/agreements/provider/7 rather than a literal ":id".
 */
function LegacyRedirect({ to }) {
  const params = useParams();
  const { search, hash } = useLocation();
  const target = to.replace(/:([A-Za-z0-9_]+)/g, (m, k) => (params[k] != null ? params[k] : m));
  return <Navigate to={`${target}${search}${hash}`} replace />;
}

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
            <Route path="/water-tank-provider-onboard/:token" element={<WaterTankProviderOnboard />} />
            {/* Provider and customer portals. PUBLIC by design — the token in the
                URL is the credential, so this must sit outside RequireAuth. */}
            <Route path="/portal/:token" element={<WTPortal />} />

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
              <Route path="/residential/enquiry" element={<SalesEnquiries category="residential" title="Residential · Buyer Enquiries" desc="Every buyer who enquired on a residential sale property." />} />
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
              {/* Short Term Stay (Airbnb style) */}
              <Route element={<PmScopeLayout />}>
                <Route path="/short-term-stay" element={<ShortStayHub />} />
                <Route path="/short-term-stay/properties/new" element={<ShortStayPropertyOnboarding />} />
                <Route path="/short-term-stay/properties/link" element={<ShortStayPropertyOnboarding />} />
                <Route path="/short-term-stay/properties/:profileId" element={<ShortStayPropertyFile />} />
                <Route path="/short-term-stay/properties/:profileId/edit" element={<ShortStayPropertyOnboarding />} />
                <Route path="/short-term-stay/*" element={<ShortStayHub />} />
              </Route>
              <Route path="/commercial/buy" element={<DealsBoard category="commercial" dealType="buy" title="Commercial · Buy" desc="Commercial buyer service — deals, buyers, agreements, commission and expenses." />} />
              <Route path="/commercial/sell" element={<PropertySellDashboard category="commercial" title="Commercial · Sell" desc="Commercial seller service — listings, owners, agreements and settlement." />} />
              <Route path="/commercial/enquiry" element={<SalesEnquiries category="commercial" title="Commercial · Buyer Enquiries" desc="Every buyer who enquired on a commercial sale property." />} />
              <Route path="/rural/buy" element={<DealsBoard category="rural" dealType="buy" title="Rural · Buy" desc="Rural buyer service — farms, lands, buyers, agreements, commission and expenses." />} />
              <Route path="/rural/sell" element={<PropertySellDashboard category="rural" title="Rural · Sell" desc="Rural seller service — farms, lands, owners, agreements, commission and settlement." />} />
              <Route path="/rural/enquiry" element={<SalesEnquiries category="rural" title="Rural · Buyer Enquiries" desc="Every buyer who enquired on a rural sale property." />} />
              <Route path="/services" element={<ServiceCatalog />} />
              <Route path="/services/lines" element={<Services />} />
              <Route path="/services/lines/:slug" element={<ServiceLineDashboard />} />
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
              {/* Payments & Disbursements moved into the Water Tank console */}
              <Route path="/property-care/payments" element={<Navigate to="/water-tank/payments" replace />} />
              <Route path="/property-care/quotations" element={<CareQuotations />} />
              <Route path="/property-care/amc" element={<CareAmc />} />
              {/* Warranty & Issues moved into the Water Tank console */}
              <Route path="/property-care/registers" element={<Navigate to="/water-tank/registers" replace />} />
              <Route path="/agreements" element={<Agreements />} />
              <Route path="/agreements/property-management" element={<RprmAgreements />} />
              <Route path="/agreements/tenancy-management" element={<TmAgreements />} />
              <Route path="/agreements/short-term-rental" element={<StsAgreements />} />
              <Route path="/agreements/water-tank-customer" element={<LegacyRedirect to="/water-tank/agreements/customer" />} />
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

            {/* Water Tank Services — self-contained operations console with its OWN
                sidebar (separate window per service line). Auth-gated but rendered
                outside the global admin Layout. This is the reusable pattern for
                every other service line. */}
            <Route element={<RequireAuth><AdminGate><WaterTankConsole /></AdminGate></RequireAuth>}>
              <Route path="/water-tank" element={<WaterTankDashboard />} />
              <Route path="/water-tank/clients" element={<WTClients />} />
              <Route path="/water-tank/clients/new" element={<WTClientCreate />} />
              <Route path="/water-tank/clients/:code" element={<WTClientDetail />} />
              <Route path="/water-tank/service-requests" element={<WTServiceRequests />} />
              <Route path="/water-tank/service-requests/new" element={<WTServiceRequestNew />} />
              <Route path="/water-tank/site-assessments" element={<WTSiteAssessments />} />
              <Route path="/water-tank/site-assessments/new" element={<WTAssessmentForm />} />
              <Route path="/water-tank/site-assessments/:code" element={<WTAssessmentDetail />} />
              <Route path="/water-tank/site-assessments/:code/edit" element={<WTAssessmentForm />} />
              <Route path="/water-tank/site-assessments/:code/quotation" element={<WTQuotationBuilder />} />
              <Route path="/water-tank/site-assessments/:code/quotation/:quoteCode/agreement" element={<WTQuotationAgreement />} />
              <Route path="/water-tank/quotations" element={<WTQuotations />} />
              <Route path="/water-tank/quotations/new" element={<WTQuotationDirect />} />
              <Route path="/water-tank/quotations/:code" element={<WTQuotationDetail />} />
              <Route path="/water-tank/quotations/:code/edit" element={<WTQuotationBuilder />} />
              <Route path="/water-tank/quotations/:code/agreement" element={<WTQuotationAgreement />} />
              <Route path="/water-tank/work-orders" element={<WTWorkOrders />} />
              <Route path="/water-tank/work-orders/:code" element={<WTWorkOrderDetail />} />
              <Route path="/water-tank/work-orders/:code/edit" element={<WTWorkOrderForm />} />
              <Route path="/water-tank/work-orders/:code/document" element={<WTWorkOrderDocument />} />
              <Route path="/water-tank/projects" element={<WTProjects />} />
              <Route path="/water-tank/projects/new" element={<WTProjectForm />} />
              <Route path="/water-tank/projects/:code" element={<WTProjectDetail />} />
              <Route path="/water-tank/projects/:code/edit" element={<WTProjectForm />} />
              <Route path="/water-tank/providers" element={<WaterTankProviders />} />
              <Route path="/water-tank/providers/new" element={<WaterTankProviderOnboarding />} />
              <Route path="/water-tank/providers/:id" element={<WaterTankProviderDetail />} />
              <Route path="/water-tank/providers/:code/edit" element={<WaterTankProviderOnboarding />} />
              {/* Canonical agreement URLs live under /water-tank/agreements/*, so every
                  destination in this console shares one prefix. The old
                  /agreements/water-tank-* paths still work — they redirect, preserving
                  the query string that carries the project context. */}
              <Route path="/water-tank/agreements/customer" element={<WtCustomerAgreements />} />
              <Route path="/water-tank/agreements/provider" element={<WtProviderAgreements />} />
              <Route path="/water-tank/agreements/provider/new" element={<WtProviderAgreements />} />
              <Route path="/water-tank/agreements/provider/:id" element={<WtProviderAgreements />} />
              <Route path="/water-tank/agreements/provider/:id/edit" element={<WtProviderAgreements />} />
              <Route path="/agreements/water-tank-provider" element={<LegacyRedirect to="/water-tank/agreements/provider" />} />
              <Route path="/agreements/water-tank-provider/new" element={<LegacyRedirect to="/water-tank/agreements/provider/new" />} />
              <Route path="/agreements/water-tank-provider/:id" element={<LegacyRedirect to="/water-tank/agreements/provider/:id" />} />
              <Route path="/agreements/water-tank-provider/:id/edit" element={<LegacyRedirect to="/water-tank/agreements/provider/:id/edit" />} />
              <Route path="/water-tank/compliance" element={<WTCompliance />} />
              <Route path="/water-tank/reports" element={<WTServiceReports />} />
              <Route path="/water-tank/reports/:code" element={<WTServiceReports />} />
              <Route path="/water-tank/agreements" element={<WTAgreementsHub />} />
              <Route path="/water-tank/work-queue" element={<WTWorkQueue />} />
              <Route path="/water-tank/amc" element={<WTAmc />} />
              <Route path="/water-tank/amc/create-amc" element={<WTAmcForm />} />
              <Route path="/water-tank/amc/:code" element={<WTAmcDetail />} />
              <Route path="/water-tank/invoices" element={<WTInvoices />} />
              <Route path="/water-tank/invoices/:code" element={<WTInvoiceEditor />} />
              <Route path="/water-tank/payments" element={<WTPayments />} />
              <Route path="/water-tank/calendar" element={<WTCalendar />} />
              {/* Registers and their records live in the path, so a warranty or an
                  incident can be linked, bookmarked and reached with the back button. */}
              <Route path="/water-tank/registers" element={<WTRegisters />} />
              <Route path="/water-tank/registers/:kind" element={<WTRegisters />} />
              <Route path="/water-tank/registers/:kind/:code" element={<WTRegisters />} />
              <Route path="/water-tank/complaints" element={<WTComplaints />} />
              <Route path="/water-tank/complaints/:code" element={<WTComplaints />} />
              <Route path="/water-tank/communication" element={<WTCommLog />} />
              <Route path="/water-tank/catalogue" element={<WaterTankCatalogue />} />
              <Route path="/water-tank/settings" element={<WaterTankSettings />} />
            </Route>

            <Route path="/" element={<RequireAuth><Landing /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}
