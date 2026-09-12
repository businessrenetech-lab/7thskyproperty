import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useParams, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './ui/Layout';
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
import SettlementDesk from './screens/sales/settlement-desk/SettlementDesk';
import AccountingOverview from './screens/sales/AccountingOverview';
import SalesWorkQueue from './screens/sales/SalesWorkQueue';
import BuyerMandates from './screens/sales/BuyerMandates';
import BuyerMandateDetail from './screens/sales/BuyerMandateDetail';
import BuyerServiceDashboard from './screens/sales/BuyerServiceDashboard';
import BuyerDealFile from './screens/sales/BuyerDealFile';
import BuyerConsole from './screens/BuyerConsole';
import SalesIntroductions from './screens/sales/SalesIntroductions';
import SalesCalendar from './screens/sales/SalesCalendar';
import PurchaseAgreements from './screens/sales/PurchaseAgreements';
import SaleAgreements from './screens/sales/SaleAgreements';
import SalesContracts from './screens/sales/SalesContracts';
import SalesInbox from './screens/sales/SalesInbox';
import SalesReports from './screens/sales/SalesReports';
import SalesProperties from './screens/sales/SalesProperties';
import SalesContacts from './screens/sales/SalesContacts';
import LeadAutomation from './screens/sales/LeadAutomation';
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
import WebsiteManagement from './pages/WebsiteManagement';
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
import AirConditioningConsole from './screens/watertank/AirConditioningConsole';
import LandPropertyAssessmentConsole from './screens/watertank/LandPropertyAssessmentConsole';
import DocManager from './screens/watertank/DocManager';
import DocumentRequest from './screens/DocumentRequest';
import LoanFinancialSupportConsole from './screens/watertank/LoanFinancialSupportConsole';
import LoanApplications from './screens/watertank/LoanApplications';
import PropertyDocVerificationConsole from './screens/watertank/PropertyDocVerificationConsole';
import VerificationRegister from './screens/watertank/VerificationRegister';
import PropertyWillSuccessionConsole from './screens/watertank/PropertyWillSuccessionConsole';
import BeneficiaryRegister from './screens/watertank/BeneficiaryRegister';
import RemovalRelocationConsole from './screens/watertank/RemovalRelocationConsole';
import TeamFleet from './screens/watertank/TeamFleet';
import Inventory from './screens/watertank/Inventory';
import PropertyCareConciergeConsole from './screens/watertank/PropertyCareConciergeConsole';
import PropertyAssets from './screens/watertank/PropertyAssets';
import Concierge from './screens/watertank/Concierge';
import Utilities from './screens/watertank/Utilities';
import WaterTankDashboard from './screens/watertank/Dashboard';
import WaterTankProviders from './screens/watertank/providers/ProviderDirectory';
import WaterTankProviderDetail from './screens/watertank/providers/ProviderDetail';
import WaterTankProviderOnboarding from './screens/watertank/providers/ProviderOnboarding';
import WTCompliance from './screens/watertank/Compliance';
import WTServiceReports from './screens/watertank/ServiceReports';
import WTReports from './screens/watertank/Reports';
import WaterTankSettings from './screens/watertank/Settings';
import WaterTankCatalogue from './screens/watertank/Catalogue';
import WTWorkQueue from './screens/watertank/WorkQueue';
import WTAmcDetail from './screens/watertank/AmcDetail';
import WTCalendar from './screens/watertank/Calendar';
import WTPortal from './screens/watertank/Portal';
import WTPortalAccounts from './screens/watertank/PortalAccounts';
import { ForgotPassword, ResetPassword, ChangePassword } from './screens/PasswordScreens';
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
import ShortStayConsole from './screens/shortstay/ShortStayConsole';
import PropertyMgmtConsole from './screens/PropertyMgmtConsole';
import ResidentialConsole from './screens/ResidentialConsole';
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
import BulkRentCollection from './screens/BulkRentCollection';
import BulkOwnerDisbursement from './screens/BulkOwnerDisbursement';
import SalesBulkSettlement from './screens/SalesBulkSettlement';
import RentReminders from './screens/RentReminders';
import Communication from './screens/Communication';
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

/*
 * Short Term Stay used `?tab=bookings` when it was one hub screen inside the
 * admin Layout. It is now a console with a path per screen, so this lifts the
 * query parameter into the path — `?booking=` is kept, since that deep-links
 * into check-in/out and is not a tab at all.
 */
function ShortStayTabRedirect() {
  const { search, hash } = useLocation();
  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  params.delete('tab');
  const rest = params.toString();
  const target = `/short-stay${tab ? `/${tab}` : ''}${rest ? `?${rest}` : ''}${hash}`;
  return <Navigate to={target} replace />;
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
            <Route path="/air-condition-provider-onboard/:token" element={<WaterTankProviderOnboard />} />
            <Route path="/land-property-assessment-provider-onboard/:token" element={<WaterTankProviderOnboard />} />
            <Route path="/loan-financial-support-provider-onboard/:token" element={<WaterTankProviderOnboard />} />
            <Route path="/property-documentation-verification-provider-onboard/:token" element={<WaterTankProviderOnboard />} />
            <Route path="/property-will-succession-provider-onboard/:token" element={<WaterTankProviderOnboard />} />
            <Route path="/document-request/:token" element={<DocumentRequest />} />
            {/* Provider and customer portals. PUBLIC by design — the token in the
                URL is the credential, so this must sit outside RequireAuth. */}
            <Route path="/portal/:token" element={<WTPortal />} />
            {/* Password self-service. Public: someone who cannot sign in is
                exactly who needs these. */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

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

            {/* Water tank provider / customer portal for a party with a real login.
                Outside PortalLayout because it renders its own shell, and outside
                AdminGate because these roles are exactly who it is for. The same
                screen also serves the tokenless magic-link route above. */}
            <Route element={<RequireAuth><Outlet /></RequireAuth>}>
              <Route path="/portal" element={<WTPortal />} />
              <Route path="/account/password" element={<ChangePassword />} />
            </Route>

            {/* Admin CRM (staff only) */}
            <Route element={<RequireAuth><AdminGate><Layout /></AdminGate></RequireAuth>}>
              <Route path="/dashboard" element={<Dashboard />} />
              {/* Residential moved to its own console — see the route block
                  below. Commercial and Rural still render these same three
                  components here, with a different `category` prop. */}
              <Route path="/sales/property/:id" element={<SalesPropertyFile />} />
              <Route path="/sales/property/:id/settlement" element={<SettlementDesk />} />
              <Route path="/sales/properties/new" element={<PropertyWizard />} />
              <Route path="/sales/properties/new/:id" element={<PropertyWizard />} />
              {/* Property Management moved to its own console — see the route
                  block below. The URLs are unchanged, so nothing needs a
                  redirect; only the chrome around the screens is different. */}
              {/* Short Term Stay moved to its own console at /short-stay/*.
                  These keep every bookmark, dashboard tile and emailed link
                  working: ?tab=bookings is lifted into the path, ?booking= is
                  preserved because it deep-links into check-in/out. */}
              <Route path="/short-term-stay" element={<ShortStayTabRedirect />} />
              <Route path="/short-term-stay/properties/new" element={<LegacyRedirect to="/short-stay/properties/new" />} />
              <Route path="/short-term-stay/properties/link" element={<LegacyRedirect to="/short-stay/properties/link" />} />
              <Route path="/short-term-stay/properties/:profileId" element={<LegacyRedirect to="/short-stay/properties/:profileId" />} />
              <Route path="/short-term-stay/properties/:profileId/edit" element={<LegacyRedirect to="/short-stay/properties/:profileId/edit" />} />
              <Route path="/short-term-stay/*" element={<ShortStayTabRedirect />} />
              <Route path="/agreements/short-term-rental" element={<LegacyRedirect to="/short-stay/agreements" />} />
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
              {/* Every per-vertical agreement builder now lives in its own
                  console, beside the screens it is about. These paths stay as
                  redirects so bookmarks, dashboard tiles and emailed links keep
                  working. The short-term-rental one was previously declared
                  twice — a redirect here and a live route below, with the
                  redirect shadowing it — so the dead duplicate is gone. */}
              <Route path="/agreements/property-management" element={<LegacyRedirect to="/property-management/agreements" />} />
              <Route path="/agreements/tenancy-management" element={<LegacyRedirect to="/property-management/tenancy-agreements" />} />
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
              <Route path="/website-management" element={<WebsiteManagement />} />
              <Route path="/website" element={<Navigate to="/website-management" replace />} />
              <Route path="/website/enquiries" element={<WebsiteManagement />} />
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
              {/* Accounting reports. Service Reports moved to /service-reports;
                  old /reports/RPT-xxxx links are recognised by prefix inside
                  the hub and forwarded, so nothing bookmarked breaks. */}
              <Route path="/water-tank/reports" element={<WTReports />} />
              <Route path="/water-tank/reports/:kind" element={<WTReports />} />
              <Route path="/water-tank/service-reports" element={<WTServiceReports />} />
              <Route path="/water-tank/service-reports/:code" element={<WTServiceReports />} />
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
              <Route path="/water-tank/portal-accounts" element={<WTPortalAccounts />} />
              <Route path="/water-tank/settings" element={<WaterTankSettings />} />
            </Route>
            {/* ── Air Conditioning console — same screens as Water Tank, scoped to AC ── */}
            <Route element={<RequireAuth><AdminGate><AirConditioningConsole /></AdminGate></RequireAuth>}>
              <Route path="/air-conditioning" element={<WaterTankDashboard />} />
              <Route path="/air-conditioning/clients" element={<WTClients />} />
              <Route path="/air-conditioning/clients/new" element={<WTClientCreate />} />
              <Route path="/air-conditioning/clients/:code" element={<WTClientDetail />} />
              <Route path="/air-conditioning/service-requests" element={<WTServiceRequests />} />
              <Route path="/air-conditioning/service-requests/new" element={<WTServiceRequestNew />} />
              <Route path="/air-conditioning/site-assessments" element={<WTSiteAssessments />} />
              <Route path="/air-conditioning/site-assessments/new" element={<WTAssessmentForm />} />
              <Route path="/air-conditioning/site-assessments/:code" element={<WTAssessmentDetail />} />
              <Route path="/air-conditioning/site-assessments/:code/edit" element={<WTAssessmentForm />} />
              <Route path="/air-conditioning/site-assessments/:code/quotation" element={<WTQuotationBuilder />} />
              <Route path="/air-conditioning/site-assessments/:code/quotation/:quoteCode/agreement" element={<WTQuotationAgreement />} />
              <Route path="/air-conditioning/quotations" element={<WTQuotations />} />
              <Route path="/air-conditioning/quotations/new" element={<WTQuotationDirect />} />
              <Route path="/air-conditioning/quotations/:code" element={<WTQuotationDetail />} />
              <Route path="/air-conditioning/quotations/:code/edit" element={<WTQuotationBuilder />} />
              <Route path="/air-conditioning/quotations/:code/agreement" element={<WTQuotationAgreement />} />
              <Route path="/air-conditioning/work-orders" element={<WTWorkOrders />} />
              <Route path="/air-conditioning/work-orders/:code" element={<WTWorkOrderDetail />} />
              <Route path="/air-conditioning/work-orders/:code/edit" element={<WTWorkOrderForm />} />
              <Route path="/air-conditioning/work-orders/:code/document" element={<WTWorkOrderDocument />} />
              <Route path="/air-conditioning/projects" element={<WTProjects />} />
              <Route path="/air-conditioning/projects/new" element={<WTProjectForm />} />
              <Route path="/air-conditioning/projects/:code" element={<WTProjectDetail />} />
              <Route path="/air-conditioning/projects/:code/edit" element={<WTProjectForm />} />
              <Route path="/air-conditioning/providers" element={<WaterTankProviders />} />
              <Route path="/air-conditioning/providers/new" element={<WaterTankProviderOnboarding />} />
              <Route path="/air-conditioning/providers/:id" element={<WaterTankProviderDetail />} />
              <Route path="/air-conditioning/providers/:code/edit" element={<WaterTankProviderOnboarding />} />
              <Route path="/air-conditioning/agreements/customer" element={<WtCustomerAgreements />} />
              <Route path="/air-conditioning/agreements/provider" element={<WtProviderAgreements />} />
              <Route path="/air-conditioning/agreements/provider/new" element={<WtProviderAgreements />} />
              <Route path="/air-conditioning/agreements/provider/:id" element={<WtProviderAgreements />} />
              <Route path="/air-conditioning/agreements/provider/:id/edit" element={<WtProviderAgreements />} />
              <Route path="/air-conditioning/compliance" element={<WTCompliance />} />
              <Route path="/air-conditioning/reports" element={<WTReports />} />
              <Route path="/air-conditioning/reports/:kind" element={<WTReports />} />
              <Route path="/air-conditioning/service-reports" element={<WTServiceReports />} />
              <Route path="/air-conditioning/service-reports/:code" element={<WTServiceReports />} />
              <Route path="/air-conditioning/agreements" element={<WTAgreementsHub />} />
              <Route path="/air-conditioning/work-queue" element={<WTWorkQueue />} />
              <Route path="/air-conditioning/amc" element={<WTAmc />} />
              <Route path="/air-conditioning/amc/create-amc" element={<WTAmcForm />} />
              <Route path="/air-conditioning/amc/:code" element={<WTAmcDetail />} />
              <Route path="/air-conditioning/invoices" element={<WTInvoices />} />
              <Route path="/air-conditioning/invoices/:code" element={<WTInvoiceEditor />} />
              <Route path="/air-conditioning/payments" element={<WTPayments />} />
              <Route path="/air-conditioning/calendar" element={<WTCalendar />} />
              <Route path="/air-conditioning/registers" element={<WTRegisters />} />
              <Route path="/air-conditioning/registers/:kind" element={<WTRegisters />} />
              <Route path="/air-conditioning/registers/:kind/:code" element={<WTRegisters />} />
              <Route path="/air-conditioning/complaints" element={<WTComplaints />} />
              <Route path="/air-conditioning/complaints/:code" element={<WTComplaints />} />
              <Route path="/air-conditioning/communication" element={<WTCommLog />} />
              <Route path="/air-conditioning/catalogue" element={<WaterTankCatalogue />} />
              <Route path="/air-conditioning/portal-accounts" element={<WTPortalAccounts />} />
              <Route path="/air-conditioning/settings" element={<WaterTankSettings />} />
            </Route>
            {/* ── Land & Property Assessment console — Survey & Valuation, same
                screens as Water Tank, scoped to land_property_assessment (first
                sub-service of Property Doc Verification & Transfer Support) ── */}
            <Route element={<RequireAuth><AdminGate><LandPropertyAssessmentConsole /></AdminGate></RequireAuth>}>
              <Route path="/land-property-assessment" element={<WaterTankDashboard />} />
              <Route path="/land-property-assessment/clients" element={<WTClients />} />
              <Route path="/land-property-assessment/clients/new" element={<WTClientCreate />} />
              <Route path="/land-property-assessment/clients/:code" element={<WTClientDetail />} />
              <Route path="/land-property-assessment/service-requests" element={<WTServiceRequests />} />
              <Route path="/land-property-assessment/service-requests/new" element={<WTServiceRequestNew />} />
              <Route path="/land-property-assessment/doc-manager" element={<DocManager />} />
              <Route path="/land-property-assessment/site-assessments" element={<WTSiteAssessments />} />
              <Route path="/land-property-assessment/site-assessments/new" element={<WTAssessmentForm />} />
              <Route path="/land-property-assessment/site-assessments/:code" element={<WTAssessmentDetail />} />
              <Route path="/land-property-assessment/site-assessments/:code/edit" element={<WTAssessmentForm />} />
              <Route path="/land-property-assessment/site-assessments/:code/quotation" element={<WTQuotationBuilder />} />
              <Route path="/land-property-assessment/site-assessments/:code/quotation/:quoteCode/agreement" element={<WTQuotationAgreement />} />
              <Route path="/land-property-assessment/quotations" element={<WTQuotations />} />
              <Route path="/land-property-assessment/quotations/new" element={<WTQuotationDirect />} />
              <Route path="/land-property-assessment/quotations/:code" element={<WTQuotationDetail />} />
              <Route path="/land-property-assessment/quotations/:code/edit" element={<WTQuotationBuilder />} />
              <Route path="/land-property-assessment/quotations/:code/agreement" element={<WTQuotationAgreement />} />
              <Route path="/land-property-assessment/work-orders" element={<WTWorkOrders />} />
              <Route path="/land-property-assessment/work-orders/:code" element={<WTWorkOrderDetail />} />
              <Route path="/land-property-assessment/work-orders/:code/edit" element={<WTWorkOrderForm />} />
              <Route path="/land-property-assessment/work-orders/:code/document" element={<WTWorkOrderDocument />} />
              <Route path="/land-property-assessment/projects" element={<WTProjects />} />
              <Route path="/land-property-assessment/projects/new" element={<WTProjectForm />} />
              <Route path="/land-property-assessment/projects/:code" element={<WTProjectDetail />} />
              <Route path="/land-property-assessment/projects/:code/edit" element={<WTProjectForm />} />
              <Route path="/land-property-assessment/providers" element={<WaterTankProviders />} />
              <Route path="/land-property-assessment/providers/new" element={<WaterTankProviderOnboarding />} />
              <Route path="/land-property-assessment/providers/:id" element={<WaterTankProviderDetail />} />
              <Route path="/land-property-assessment/providers/:code/edit" element={<WaterTankProviderOnboarding />} />
              <Route path="/land-property-assessment/agreements/customer" element={<WtCustomerAgreements />} />
              <Route path="/land-property-assessment/agreements/provider" element={<WtProviderAgreements />} />
              <Route path="/land-property-assessment/agreements/provider/new" element={<WtProviderAgreements />} />
              <Route path="/land-property-assessment/agreements/provider/:id" element={<WtProviderAgreements />} />
              <Route path="/land-property-assessment/agreements/provider/:id/edit" element={<WtProviderAgreements />} />
              <Route path="/land-property-assessment/compliance" element={<WTCompliance />} />
              <Route path="/land-property-assessment/reports" element={<WTReports />} />
              <Route path="/land-property-assessment/reports/:kind" element={<WTReports />} />
              <Route path="/land-property-assessment/service-reports" element={<WTServiceReports />} />
              <Route path="/land-property-assessment/service-reports/:code" element={<WTServiceReports />} />
              <Route path="/land-property-assessment/agreements" element={<WTAgreementsHub />} />
              <Route path="/land-property-assessment/work-queue" element={<WTWorkQueue />} />
              <Route path="/land-property-assessment/amc" element={<WTAmc />} />
              <Route path="/land-property-assessment/amc/create-amc" element={<WTAmcForm />} />
              <Route path="/land-property-assessment/amc/:code" element={<WTAmcDetail />} />
              <Route path="/land-property-assessment/invoices" element={<WTInvoices />} />
              <Route path="/land-property-assessment/invoices/:code" element={<WTInvoiceEditor />} />
              <Route path="/land-property-assessment/payments" element={<WTPayments />} />
              <Route path="/land-property-assessment/calendar" element={<WTCalendar />} />
              <Route path="/land-property-assessment/registers" element={<WTRegisters />} />
              <Route path="/land-property-assessment/registers/:kind" element={<WTRegisters />} />
              <Route path="/land-property-assessment/registers/:kind/:code" element={<WTRegisters />} />
              <Route path="/land-property-assessment/complaints" element={<WTComplaints />} />
              <Route path="/land-property-assessment/complaints/:code" element={<WTComplaints />} />
              <Route path="/land-property-assessment/communication" element={<WTCommLog />} />
              <Route path="/land-property-assessment/catalogue" element={<WaterTankCatalogue />} />
              <Route path="/land-property-assessment/portal-accounts" element={<WTPortalAccounts />} />
              <Route path="/land-property-assessment/settings" element={<WaterTankSettings />} />
            </Route>
            {/* ── Loan & Financial Support console — same screens as Water Tank,
                scoped to loan_financial_support (2nd Doc-Verification sub-service);
                adds the Doc Manager + Loan Application Tracker ── */}
            <Route element={<RequireAuth><AdminGate><LoanFinancialSupportConsole /></AdminGate></RequireAuth>}>
              <Route path="/loan-financial-support" element={<WaterTankDashboard />} />
              <Route path="/loan-financial-support/clients" element={<WTClients />} />
              <Route path="/loan-financial-support/clients/new" element={<WTClientCreate />} />
              <Route path="/loan-financial-support/clients/:code" element={<WTClientDetail />} />
              <Route path="/loan-financial-support/service-requests" element={<WTServiceRequests />} />
              <Route path="/loan-financial-support/service-requests/new" element={<WTServiceRequestNew />} />
              <Route path="/loan-financial-support/loan-applications" element={<LoanApplications />} />
              <Route path="/loan-financial-support/doc-manager" element={<DocManager />} />
              <Route path="/loan-financial-support/site-assessments" element={<WTSiteAssessments />} />
              <Route path="/loan-financial-support/site-assessments/new" element={<WTAssessmentForm />} />
              <Route path="/loan-financial-support/site-assessments/:code" element={<WTAssessmentDetail />} />
              <Route path="/loan-financial-support/site-assessments/:code/edit" element={<WTAssessmentForm />} />
              <Route path="/loan-financial-support/site-assessments/:code/quotation" element={<WTQuotationBuilder />} />
              <Route path="/loan-financial-support/site-assessments/:code/quotation/:quoteCode/agreement" element={<WTQuotationAgreement />} />
              <Route path="/loan-financial-support/quotations" element={<WTQuotations />} />
              <Route path="/loan-financial-support/quotations/new" element={<WTQuotationDirect />} />
              <Route path="/loan-financial-support/quotations/:code" element={<WTQuotationDetail />} />
              <Route path="/loan-financial-support/quotations/:code/edit" element={<WTQuotationBuilder />} />
              <Route path="/loan-financial-support/quotations/:code/agreement" element={<WTQuotationAgreement />} />
              <Route path="/loan-financial-support/work-orders" element={<WTWorkOrders />} />
              <Route path="/loan-financial-support/work-orders/:code" element={<WTWorkOrderDetail />} />
              <Route path="/loan-financial-support/work-orders/:code/edit" element={<WTWorkOrderForm />} />
              <Route path="/loan-financial-support/work-orders/:code/document" element={<WTWorkOrderDocument />} />
              <Route path="/loan-financial-support/projects" element={<WTProjects />} />
              <Route path="/loan-financial-support/projects/new" element={<WTProjectForm />} />
              <Route path="/loan-financial-support/projects/:code" element={<WTProjectDetail />} />
              <Route path="/loan-financial-support/projects/:code/edit" element={<WTProjectForm />} />
              <Route path="/loan-financial-support/providers" element={<WaterTankProviders />} />
              <Route path="/loan-financial-support/providers/new" element={<WaterTankProviderOnboarding />} />
              <Route path="/loan-financial-support/providers/:id" element={<WaterTankProviderDetail />} />
              <Route path="/loan-financial-support/providers/:code/edit" element={<WaterTankProviderOnboarding />} />
              <Route path="/loan-financial-support/agreements/customer" element={<WtCustomerAgreements />} />
              <Route path="/loan-financial-support/agreements/provider" element={<WtProviderAgreements />} />
              <Route path="/loan-financial-support/agreements/provider/new" element={<WtProviderAgreements />} />
              <Route path="/loan-financial-support/agreements/provider/:id" element={<WtProviderAgreements />} />
              <Route path="/loan-financial-support/agreements/provider/:id/edit" element={<WtProviderAgreements />} />
              <Route path="/loan-financial-support/compliance" element={<WTCompliance />} />
              <Route path="/loan-financial-support/reports" element={<WTReports />} />
              <Route path="/loan-financial-support/reports/:kind" element={<WTReports />} />
              <Route path="/loan-financial-support/service-reports" element={<WTServiceReports />} />
              <Route path="/loan-financial-support/service-reports/:code" element={<WTServiceReports />} />
              <Route path="/loan-financial-support/agreements" element={<WTAgreementsHub />} />
              <Route path="/loan-financial-support/work-queue" element={<WTWorkQueue />} />
              <Route path="/loan-financial-support/amc" element={<WTAmc />} />
              <Route path="/loan-financial-support/amc/create-amc" element={<WTAmcForm />} />
              <Route path="/loan-financial-support/amc/:code" element={<WTAmcDetail />} />
              <Route path="/loan-financial-support/invoices" element={<WTInvoices />} />
              <Route path="/loan-financial-support/invoices/:code" element={<WTInvoiceEditor />} />
              <Route path="/loan-financial-support/payments" element={<WTPayments />} />
              <Route path="/loan-financial-support/calendar" element={<WTCalendar />} />
              <Route path="/loan-financial-support/registers" element={<WTRegisters />} />
              <Route path="/loan-financial-support/registers/:kind" element={<WTRegisters />} />
              <Route path="/loan-financial-support/registers/:kind/:code" element={<WTRegisters />} />
              <Route path="/loan-financial-support/complaints" element={<WTComplaints />} />
              <Route path="/loan-financial-support/complaints/:code" element={<WTComplaints />} />
              <Route path="/loan-financial-support/communication" element={<WTCommLog />} />
              <Route path="/loan-financial-support/catalogue" element={<WaterTankCatalogue />} />
              <Route path="/loan-financial-support/portal-accounts" element={<WTPortalAccounts />} />
              <Route path="/loan-financial-support/settings" element={<WaterTankSettings />} />
            </Route>
            {/* ── Property Documentation & Verification console — same screens as
                Water Tank, scoped to property_documentation_verification (3rd
                Doc-Verification sub-service); adds the Doc Manager + Verification Register ── */}
            <Route element={<RequireAuth><AdminGate><PropertyDocVerificationConsole /></AdminGate></RequireAuth>}>
              <Route path="/property-documentation-verification" element={<WaterTankDashboard />} />
              <Route path="/property-documentation-verification/clients" element={<WTClients />} />
              <Route path="/property-documentation-verification/clients/new" element={<WTClientCreate />} />
              <Route path="/property-documentation-verification/clients/:code" element={<WTClientDetail />} />
              <Route path="/property-documentation-verification/service-requests" element={<WTServiceRequests />} />
              <Route path="/property-documentation-verification/service-requests/new" element={<WTServiceRequestNew />} />
              <Route path="/property-documentation-verification/verifications" element={<VerificationRegister />} />
              <Route path="/property-documentation-verification/doc-manager" element={<DocManager />} />
              <Route path="/property-documentation-verification/site-assessments" element={<WTSiteAssessments />} />
              <Route path="/property-documentation-verification/site-assessments/new" element={<WTAssessmentForm />} />
              <Route path="/property-documentation-verification/site-assessments/:code" element={<WTAssessmentDetail />} />
              <Route path="/property-documentation-verification/site-assessments/:code/edit" element={<WTAssessmentForm />} />
              <Route path="/property-documentation-verification/site-assessments/:code/quotation" element={<WTQuotationBuilder />} />
              <Route path="/property-documentation-verification/site-assessments/:code/quotation/:quoteCode/agreement" element={<WTQuotationAgreement />} />
              <Route path="/property-documentation-verification/quotations" element={<WTQuotations />} />
              <Route path="/property-documentation-verification/quotations/new" element={<WTQuotationDirect />} />
              <Route path="/property-documentation-verification/quotations/:code" element={<WTQuotationDetail />} />
              <Route path="/property-documentation-verification/quotations/:code/edit" element={<WTQuotationBuilder />} />
              <Route path="/property-documentation-verification/quotations/:code/agreement" element={<WTQuotationAgreement />} />
              <Route path="/property-documentation-verification/work-orders" element={<WTWorkOrders />} />
              <Route path="/property-documentation-verification/work-orders/:code" element={<WTWorkOrderDetail />} />
              <Route path="/property-documentation-verification/work-orders/:code/edit" element={<WTWorkOrderForm />} />
              <Route path="/property-documentation-verification/work-orders/:code/document" element={<WTWorkOrderDocument />} />
              <Route path="/property-documentation-verification/projects" element={<WTProjects />} />
              <Route path="/property-documentation-verification/projects/new" element={<WTProjectForm />} />
              <Route path="/property-documentation-verification/projects/:code" element={<WTProjectDetail />} />
              <Route path="/property-documentation-verification/projects/:code/edit" element={<WTProjectForm />} />
              <Route path="/property-documentation-verification/providers" element={<WaterTankProviders />} />
              <Route path="/property-documentation-verification/providers/new" element={<WaterTankProviderOnboarding />} />
              <Route path="/property-documentation-verification/providers/:id" element={<WaterTankProviderDetail />} />
              <Route path="/property-documentation-verification/providers/:code/edit" element={<WaterTankProviderOnboarding />} />
              <Route path="/property-documentation-verification/agreements/customer" element={<WtCustomerAgreements />} />
              <Route path="/property-documentation-verification/agreements/provider" element={<WtProviderAgreements />} />
              <Route path="/property-documentation-verification/agreements/provider/new" element={<WtProviderAgreements />} />
              <Route path="/property-documentation-verification/agreements/provider/:id" element={<WtProviderAgreements />} />
              <Route path="/property-documentation-verification/agreements/provider/:id/edit" element={<WtProviderAgreements />} />
              <Route path="/property-documentation-verification/compliance" element={<WTCompliance />} />
              <Route path="/property-documentation-verification/reports" element={<WTReports />} />
              <Route path="/property-documentation-verification/reports/:kind" element={<WTReports />} />
              <Route path="/property-documentation-verification/service-reports" element={<WTServiceReports />} />
              <Route path="/property-documentation-verification/service-reports/:code" element={<WTServiceReports />} />
              <Route path="/property-documentation-verification/agreements" element={<WTAgreementsHub />} />
              <Route path="/property-documentation-verification/work-queue" element={<WTWorkQueue />} />
              <Route path="/property-documentation-verification/amc" element={<WTAmc />} />
              <Route path="/property-documentation-verification/amc/create-amc" element={<WTAmcForm />} />
              <Route path="/property-documentation-verification/amc/:code" element={<WTAmcDetail />} />
              <Route path="/property-documentation-verification/invoices" element={<WTInvoices />} />
              <Route path="/property-documentation-verification/invoices/:code" element={<WTInvoiceEditor />} />
              <Route path="/property-documentation-verification/payments" element={<WTPayments />} />
              <Route path="/property-documentation-verification/calendar" element={<WTCalendar />} />
              <Route path="/property-documentation-verification/registers" element={<WTRegisters />} />
              <Route path="/property-documentation-verification/registers/:kind" element={<WTRegisters />} />
              <Route path="/property-documentation-verification/registers/:kind/:code" element={<WTRegisters />} />
              <Route path="/property-documentation-verification/complaints" element={<WTComplaints />} />
              <Route path="/property-documentation-verification/complaints/:code" element={<WTComplaints />} />
              <Route path="/property-documentation-verification/communication" element={<WTCommLog />} />
              <Route path="/property-documentation-verification/catalogue" element={<WaterTankCatalogue />} />
              <Route path="/property-documentation-verification/portal-accounts" element={<WTPortalAccounts />} />
              <Route path="/property-documentation-verification/settings" element={<WaterTankSettings />} />
            </Route>
            {/* ── Property Will & Succession console — same screens as Water Tank,
                scoped to property_will_succession (4th/final Doc-Verification
                sub-service); adds the Doc Manager + Beneficiary Register ── */}
            <Route element={<RequireAuth><AdminGate><PropertyWillSuccessionConsole /></AdminGate></RequireAuth>}>
              <Route path="/property-will-succession" element={<WaterTankDashboard />} />
              <Route path="/property-will-succession/clients" element={<WTClients />} />
              <Route path="/property-will-succession/clients/new" element={<WTClientCreate />} />
              <Route path="/property-will-succession/clients/:code" element={<WTClientDetail />} />
              <Route path="/property-will-succession/service-requests" element={<WTServiceRequests />} />
              <Route path="/property-will-succession/service-requests/new" element={<WTServiceRequestNew />} />
              <Route path="/property-will-succession/beneficiaries" element={<BeneficiaryRegister />} />
              <Route path="/property-will-succession/doc-manager" element={<DocManager />} />
              <Route path="/property-will-succession/site-assessments" element={<WTSiteAssessments />} />
              <Route path="/property-will-succession/site-assessments/new" element={<WTAssessmentForm />} />
              <Route path="/property-will-succession/site-assessments/:code" element={<WTAssessmentDetail />} />
              <Route path="/property-will-succession/site-assessments/:code/edit" element={<WTAssessmentForm />} />
              <Route path="/property-will-succession/site-assessments/:code/quotation" element={<WTQuotationBuilder />} />
              <Route path="/property-will-succession/site-assessments/:code/quotation/:quoteCode/agreement" element={<WTQuotationAgreement />} />
              <Route path="/property-will-succession/quotations" element={<WTQuotations />} />
              <Route path="/property-will-succession/quotations/new" element={<WTQuotationDirect />} />
              <Route path="/property-will-succession/quotations/:code" element={<WTQuotationDetail />} />
              <Route path="/property-will-succession/quotations/:code/edit" element={<WTQuotationBuilder />} />
              <Route path="/property-will-succession/quotations/:code/agreement" element={<WTQuotationAgreement />} />
              <Route path="/property-will-succession/work-orders" element={<WTWorkOrders />} />
              <Route path="/property-will-succession/work-orders/:code" element={<WTWorkOrderDetail />} />
              <Route path="/property-will-succession/work-orders/:code/edit" element={<WTWorkOrderForm />} />
              <Route path="/property-will-succession/work-orders/:code/document" element={<WTWorkOrderDocument />} />
              <Route path="/property-will-succession/projects" element={<WTProjects />} />
              <Route path="/property-will-succession/projects/new" element={<WTProjectForm />} />
              <Route path="/property-will-succession/projects/:code" element={<WTProjectDetail />} />
              <Route path="/property-will-succession/projects/:code/edit" element={<WTProjectForm />} />
              <Route path="/property-will-succession/providers" element={<WaterTankProviders />} />
              <Route path="/property-will-succession/providers/new" element={<WaterTankProviderOnboarding />} />
              <Route path="/property-will-succession/providers/:id" element={<WaterTankProviderDetail />} />
              <Route path="/property-will-succession/providers/:code/edit" element={<WaterTankProviderOnboarding />} />
              <Route path="/property-will-succession/agreements/customer" element={<WtCustomerAgreements />} />
              <Route path="/property-will-succession/agreements/provider" element={<WtProviderAgreements />} />
              <Route path="/property-will-succession/agreements/provider/new" element={<WtProviderAgreements />} />
              <Route path="/property-will-succession/agreements/provider/:id" element={<WtProviderAgreements />} />
              <Route path="/property-will-succession/agreements/provider/:id/edit" element={<WtProviderAgreements />} />
              <Route path="/property-will-succession/compliance" element={<WTCompliance />} />
              <Route path="/property-will-succession/reports" element={<WTReports />} />
              <Route path="/property-will-succession/reports/:kind" element={<WTReports />} />
              <Route path="/property-will-succession/service-reports" element={<WTServiceReports />} />
              <Route path="/property-will-succession/service-reports/:code" element={<WTServiceReports />} />
              <Route path="/property-will-succession/agreements" element={<WTAgreementsHub />} />
              <Route path="/property-will-succession/work-queue" element={<WTWorkQueue />} />
              <Route path="/property-will-succession/amc" element={<WTAmc />} />
              <Route path="/property-will-succession/amc/create-amc" element={<WTAmcForm />} />
              <Route path="/property-will-succession/amc/:code" element={<WTAmcDetail />} />
              <Route path="/property-will-succession/invoices" element={<WTInvoices />} />
              <Route path="/property-will-succession/invoices/:code" element={<WTInvoiceEditor />} />
              <Route path="/property-will-succession/payments" element={<WTPayments />} />
              <Route path="/property-will-succession/calendar" element={<WTCalendar />} />
              <Route path="/property-will-succession/registers" element={<WTRegisters />} />
              <Route path="/property-will-succession/registers/:kind" element={<WTRegisters />} />
              <Route path="/property-will-succession/registers/:kind/:code" element={<WTRegisters />} />
              <Route path="/property-will-succession/complaints" element={<WTComplaints />} />
              <Route path="/property-will-succession/complaints/:code" element={<WTComplaints />} />
              <Route path="/property-will-succession/communication" element={<WTCommLog />} />
              <Route path="/property-will-succession/catalogue" element={<WaterTankCatalogue />} />
              <Route path="/property-will-succession/portal-accounts" element={<WTPortalAccounts />} />
              <Route path="/property-will-succession/settings" element={<WaterTankSettings />} />
            </Route>
            {/* ── Removal & Relocation console — same screens as Water Tank, scoped
                to removal_relocation. Delivered by our own crew + vehicles: Team &
                Fleet + Inventory instead of provider onboarding; work orders use the
                Resource Allocation step (no provider master agreement). ── */}
            <Route element={<RequireAuth><AdminGate><RemovalRelocationConsole /></AdminGate></RequireAuth>}>
              <Route path="/removal-relocation" element={<WaterTankDashboard />} />
              <Route path="/removal-relocation/clients" element={<WTClients />} />
              <Route path="/removal-relocation/clients/new" element={<WTClientCreate />} />
              <Route path="/removal-relocation/clients/:code" element={<WTClientDetail />} />
              <Route path="/removal-relocation/service-requests" element={<WTServiceRequests />} />
              <Route path="/removal-relocation/service-requests/new" element={<WTServiceRequestNew />} />
              <Route path="/removal-relocation/inventory" element={<Inventory />} />
              <Route path="/removal-relocation/team-fleet" element={<TeamFleet />} />
              <Route path="/removal-relocation/site-assessments" element={<WTSiteAssessments />} />
              <Route path="/removal-relocation/site-assessments/new" element={<WTAssessmentForm />} />
              <Route path="/removal-relocation/site-assessments/:code" element={<WTAssessmentDetail />} />
              <Route path="/removal-relocation/site-assessments/:code/edit" element={<WTAssessmentForm />} />
              <Route path="/removal-relocation/site-assessments/:code/quotation" element={<WTQuotationBuilder />} />
              <Route path="/removal-relocation/site-assessments/:code/quotation/:quoteCode/agreement" element={<WTQuotationAgreement />} />
              <Route path="/removal-relocation/quotations" element={<WTQuotations />} />
              <Route path="/removal-relocation/quotations/new" element={<WTQuotationDirect />} />
              <Route path="/removal-relocation/quotations/:code" element={<WTQuotationDetail />} />
              <Route path="/removal-relocation/quotations/:code/edit" element={<WTQuotationBuilder />} />
              <Route path="/removal-relocation/quotations/:code/agreement" element={<WTQuotationAgreement />} />
              <Route path="/removal-relocation/work-orders" element={<WTWorkOrders />} />
              <Route path="/removal-relocation/work-orders/:code" element={<WTWorkOrderDetail />} />
              <Route path="/removal-relocation/work-orders/:code/edit" element={<WTWorkOrderForm />} />
              <Route path="/removal-relocation/work-orders/:code/document" element={<WTWorkOrderDocument />} />
              <Route path="/removal-relocation/projects" element={<WTProjects />} />
              <Route path="/removal-relocation/projects/new" element={<WTProjectForm />} />
              <Route path="/removal-relocation/projects/:code" element={<WTProjectDetail />} />
              <Route path="/removal-relocation/projects/:code/edit" element={<WTProjectForm />} />
              <Route path="/removal-relocation/agreements/customer" element={<WtCustomerAgreements />} />
              <Route path="/removal-relocation/reports" element={<WTReports />} />
              <Route path="/removal-relocation/reports/:kind" element={<WTReports />} />
              <Route path="/removal-relocation/service-reports" element={<WTServiceReports />} />
              <Route path="/removal-relocation/service-reports/:code" element={<WTServiceReports />} />
              <Route path="/removal-relocation/agreements" element={<WTAgreementsHub />} />
              <Route path="/removal-relocation/work-queue" element={<WTWorkQueue />} />
              <Route path="/removal-relocation/amc" element={<WTAmc />} />
              <Route path="/removal-relocation/amc/create-amc" element={<WTAmcForm />} />
              <Route path="/removal-relocation/amc/:code" element={<WTAmcDetail />} />
              <Route path="/removal-relocation/invoices" element={<WTInvoices />} />
              <Route path="/removal-relocation/invoices/:code" element={<WTInvoiceEditor />} />
              <Route path="/removal-relocation/payments" element={<WTPayments />} />
              <Route path="/removal-relocation/calendar" element={<WTCalendar />} />
              <Route path="/removal-relocation/registers" element={<WTRegisters />} />
              <Route path="/removal-relocation/registers/:kind" element={<WTRegisters />} />
              <Route path="/removal-relocation/registers/:kind/:code" element={<WTRegisters />} />
              <Route path="/removal-relocation/complaints" element={<WTComplaints />} />
              <Route path="/removal-relocation/complaints/:code" element={<WTComplaints />} />
              <Route path="/removal-relocation/communication" element={<WTCommLog />} />
              <Route path="/removal-relocation/catalogue" element={<WaterTankCatalogue />} />
              <Route path="/removal-relocation/portal-accounts" element={<WTPortalAccounts />} />
              <Route path="/removal-relocation/settings" element={<WaterTankSettings />} />
            </Route>
            {/* ── Property Care & Concierge console — same screens as Water Tank,
                scoped to property_care_concierge. Delivered by our own team +
                vehicles: Team & Fleet instead of provider onboarding; adds the
                Property Assets, Concierge & Access and Utilities registers. Ongoing
                care plans run through the shared AMC console. No provider agreement. ── */}
            <Route element={<RequireAuth><AdminGate><PropertyCareConciergeConsole /></AdminGate></RequireAuth>}>
              <Route path="/property-care-concierge" element={<WaterTankDashboard />} />
              <Route path="/property-care-concierge/clients" element={<WTClients />} />
              <Route path="/property-care-concierge/clients/new" element={<WTClientCreate />} />
              <Route path="/property-care-concierge/clients/:code" element={<WTClientDetail />} />
              <Route path="/property-care-concierge/service-requests" element={<WTServiceRequests />} />
              <Route path="/property-care-concierge/service-requests/new" element={<WTServiceRequestNew />} />
              <Route path="/property-care-concierge/property-assets" element={<PropertyAssets />} />
              <Route path="/property-care-concierge/concierge" element={<Concierge />} />
              <Route path="/property-care-concierge/utilities" element={<Utilities />} />
              <Route path="/property-care-concierge/team-fleet" element={<TeamFleet />} />
              <Route path="/property-care-concierge/site-assessments" element={<WTSiteAssessments />} />
              <Route path="/property-care-concierge/site-assessments/new" element={<WTAssessmentForm />} />
              <Route path="/property-care-concierge/site-assessments/:code" element={<WTAssessmentDetail />} />
              <Route path="/property-care-concierge/site-assessments/:code/edit" element={<WTAssessmentForm />} />
              <Route path="/property-care-concierge/site-assessments/:code/quotation" element={<WTQuotationBuilder />} />
              <Route path="/property-care-concierge/site-assessments/:code/quotation/:quoteCode/agreement" element={<WTQuotationAgreement />} />
              <Route path="/property-care-concierge/quotations" element={<WTQuotations />} />
              <Route path="/property-care-concierge/quotations/new" element={<WTQuotationDirect />} />
              <Route path="/property-care-concierge/quotations/:code" element={<WTQuotationDetail />} />
              <Route path="/property-care-concierge/quotations/:code/edit" element={<WTQuotationBuilder />} />
              <Route path="/property-care-concierge/quotations/:code/agreement" element={<WTQuotationAgreement />} />
              <Route path="/property-care-concierge/work-orders" element={<WTWorkOrders />} />
              <Route path="/property-care-concierge/work-orders/:code" element={<WTWorkOrderDetail />} />
              <Route path="/property-care-concierge/work-orders/:code/edit" element={<WTWorkOrderForm />} />
              <Route path="/property-care-concierge/work-orders/:code/document" element={<WTWorkOrderDocument />} />
              <Route path="/property-care-concierge/projects" element={<WTProjects />} />
              <Route path="/property-care-concierge/projects/new" element={<WTProjectForm />} />
              <Route path="/property-care-concierge/projects/:code" element={<WTProjectDetail />} />
              <Route path="/property-care-concierge/projects/:code/edit" element={<WTProjectForm />} />
              <Route path="/property-care-concierge/agreements/customer" element={<WtCustomerAgreements />} />
              <Route path="/property-care-concierge/reports" element={<WTReports />} />
              <Route path="/property-care-concierge/reports/:kind" element={<WTReports />} />
              <Route path="/property-care-concierge/service-reports" element={<WTServiceReports />} />
              <Route path="/property-care-concierge/service-reports/:code" element={<WTServiceReports />} />
              <Route path="/property-care-concierge/agreements" element={<WTAgreementsHub />} />
              <Route path="/property-care-concierge/work-queue" element={<WTWorkQueue />} />
              <Route path="/property-care-concierge/amc" element={<WTAmc />} />
              <Route path="/property-care-concierge/amc/create-amc" element={<WTAmcForm />} />
              <Route path="/property-care-concierge/amc/:code" element={<WTAmcDetail />} />
              <Route path="/property-care-concierge/invoices" element={<WTInvoices />} />
              <Route path="/property-care-concierge/invoices/:code" element={<WTInvoiceEditor />} />
              <Route path="/property-care-concierge/payments" element={<WTPayments />} />
              <Route path="/property-care-concierge/calendar" element={<WTCalendar />} />
              <Route path="/property-care-concierge/registers" element={<WTRegisters />} />
              <Route path="/property-care-concierge/registers/:kind" element={<WTRegisters />} />
              <Route path="/property-care-concierge/registers/:kind/:code" element={<WTRegisters />} />
              <Route path="/property-care-concierge/complaints" element={<WTComplaints />} />
              <Route path="/property-care-concierge/complaints/:code" element={<WTComplaints />} />
              <Route path="/property-care-concierge/communication" element={<WTCommLog />} />
              <Route path="/property-care-concierge/catalogue" element={<WaterTankCatalogue />} />
              <Route path="/property-care-concierge/portal-accounts" element={<WTPortalAccounts />} />
              <Route path="/property-care-concierge/settings" element={<WaterTankSettings />} />
            </Route>

            {/* Short Term Stay — the second separated operations console, sharing
                the same ServiceConsole shell. Its sixteen screens still render
                through ShortStayHub, which owns the create/action drawers they
                all use; the tab now comes from the path rather than ?tab=. */}
            <Route element={<RequireAuth><AdminGate><ShortStayConsole /></AdminGate></RequireAuth>}>
              <Route path="/short-stay" element={<ShortStayHub />} />
              {/* Declared before /:tab so a property route is not read as a tab. */}
              <Route path="/short-stay/properties/new" element={<ShortStayPropertyOnboarding />} />
              <Route path="/short-stay/properties/link" element={<ShortStayPropertyOnboarding />} />
              <Route path="/short-stay/properties/:profileId" element={<ShortStayPropertyFile />} />
              <Route path="/short-stay/properties/:profileId/edit" element={<ShortStayPropertyOnboarding />} />
              <Route path="/short-stay/agreements" element={<StsAgreements />} />
              <Route path="/short-stay/:tab" element={<ShortStayHub />} />
            </Route>

            {/* Property Management — the third separated console, on the same
                ServiceConsole shell. Its own URLs are unchanged; the eight
                SHARED screens it links (work orders, inspections, compliance,
                folios, invoices, receipts, landlord bills, workflows) are
                re-routed here under /property-management/* so that clicking one
                does not drop the operator back out into the global admin. They
                keep reading their query string, so the rental filter is intact
                and the components are untouched. */}
            <Route element={<RequireAuth><AdminGate><PropertyMgmtConsole /></AdminGate></RequireAuth>}>
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
              {/* Shared screens, filtered to rentals by their own query string. */}
              <Route path="/property-management/work-orders" element={<WorkOrders />} />
              <Route path="/property-management/inspections" element={<Inspections />} />
              <Route path="/property-management/compliance" element={<Compliance />} />
              <Route path="/property-management/workflows" element={<Projects />} />
              <Route path="/property-management/invoices" element={<Invoices />} />
              <Route path="/property-management/receipts" element={<RentalReceipts />} />
              <Route path="/property-management/collect-rent" element={<BulkRentCollection />} />
              <Route path="/property-management/disburse-owners" element={<BulkOwnerDisbursement />} />
              <Route path="/property-management/rent-reminders" element={<RentReminders />} />
              <Route path="/property-management/inbox" element={<Communication />} />
              <Route path="/property-management/folios" element={<Folios />} />
              <Route path="/property-management/landlord-bills" element={<LandlordBills />} />
              <Route path="/property-management/agreements" element={<RprmAgreements />} />
              <Route path="/property-management/tenancy-agreements" element={<TmAgreements />} />
            </Route>

            {/* Residential Sales — the fourth separated console.
                Its three register screens are SHARED with Commercial and Rural,
                which keep rendering them under /sales/* in the global admin;
                only the `category` prop differs. `salesBase()` in
                screens/sales/paths.js is the single place that decides which
                base a click navigates under.
                No agreements group yet: buyer and seller agreements are being
                rewritten to work like the PM and TM builders and the documents
                are still to come. A nav item pointing at nothing is worse than
                no nav item. */}
            <Route element={<RequireAuth><AdminGate><ResidentialConsole /></AdminGate></RequireAuth>}>
              <Route path="/residential" element={<Navigate to="/residential/sell" replace />} />
              <Route path="/residential/sell" element={<PropertySellDashboard category="residential" title="Residential · Sell" desc="Seller service — listings, owners, agreements, commission and settlement." />} />
              <Route path="/residential/properties" element={<SalesProperties category="residential" title="Residential · Properties" desc="Manage sales listings, lifecycle stages, vendor representations, and property files." />} />
              {/* The deep workspace behind a listing, and the listing wizard. */}
              <Route path="/residential/property/:id" element={<SalesPropertyFile />} />
              <Route path="/residential/property/:id/settlement" element={<SettlementDesk />} />
              <Route path="/residential/properties/new" element={<PropertyWizard />} />
              <Route path="/residential/properties/new/:id" element={<PropertyWizard />} />
              {/* Shared screens, filtered by their own query string. */}
              <Route path="/residential/compliance" element={<Compliance />} />
              <Route path="/residential/workflows" element={<Projects />} />
              <Route path="/residential/settlements" element={<SalesBulkSettlement />} />
              <Route path="/residential/accounting" element={<AccountingOverview />} />
              <Route path="/residential/work-queue" element={<SalesWorkQueue />} />
              <Route path="/residential/introductions" element={<SalesIntroductions />} />
              <Route path="/residential/calendar" element={<SalesCalendar />} />
              <Route path="/residential/agreements/sale" element={<SaleAgreements />} />
              <Route path="/residential/contracts" element={<SalesContracts />} />
              <Route path="/residential/inbox" element={<SalesInbox />} />
              <Route path="/residential/reports" element={<SalesReports />} />
              <Route path="/residential/contacts" element={<SalesContacts />} />
              <Route path="/residential/contacts/clients" element={<Clients />} />
              <Route path="/residential/clients" element={<Navigate to="/residential/contacts/clients" replace />} />
              <Route path="/residential/lead-automation" element={<Navigate to="/residential/contacts" replace />} />
            </Route>

            {/* Residential BUYER Service — its own console (buyer-only sidebar). */}
            <Route element={<RequireAuth><AdminGate><BuyerConsole /></AdminGate></RequireAuth>}>
              <Route path="/residential/buyer-service" element={<BuyerServiceDashboard />} />
              <Route path="/residential/buy" element={<DealsBoard category="residential" dealType="buy" title="Residential · Buy" desc="Buyer service — deals, buyers, agreements, fees and status." />} />
              <Route path="/residential/buy/:dealId" element={<BuyerDealFile />} />
              <Route path="/residential/mandates" element={<BuyerMandates />} />
              <Route path="/residential/mandates/:id" element={<BuyerMandateDetail />} />
              <Route path="/residential/enquiry" element={<SalesEnquiries category="residential" title="Residential · Buyer Enquiries" desc="Every buyer who enquired on a residential sale property." />} />
              <Route path="/residential/agreements/purchase" element={<PurchaseAgreements />} />
            </Route>

            <Route path="/" element={<RequireAuth><Landing /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}
