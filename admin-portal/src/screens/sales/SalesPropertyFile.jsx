import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Edit,
  ExternalLink,
  FileCheck2,
  FileText,
  HandCoins,
  LayoutGrid,
  Link2,
  Lock,
  Plus,
  Receipt,
  RotateCcw,
  Scale,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  WalletCards,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  Badge,
  Button,
  DataTable,
  Drawer,
  EmptyState,
  Field,
  Input,
  KV,
  Select,
  Spinner,
  StatusBadge,
  Textarea,
} from "../../ui/kit";
import { Combo } from "../../ui/pickers";
import FileUpload, { fileSrc } from "../../ui/FileUpload";
import SalesAssessmentWorkspace from "./SalesAssessmentWorkspace";

const unwrap = (response) =>
  response?.data?.data ?? response?.data ?? response ?? {};
const array = (...values) => {
  for (const value of values) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const nested = value.rows || value.items || value.data;
      if (Array.isArray(nested)) return nested;
    }
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        /* Optional collection fields can be malformed. */
      }
    }
  }
  return [];
};
const number = (value) => Number(value || 0);
const minor = (value) => Math.round(number(value) * 100);
const normalizedAccount = (value) =>
  String(value || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
const money = (value) =>
  `৳${number(value).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-BD", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
const dateOnly = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-BD", { dateStyle: "medium" })
    : "—";
const title = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
const contactLabel = (contact) =>
  `${contact.full_name || contact.name || `Contact #${contact.id}`}${contact.primary_phone ? ` · ${contact.primary_phone}` : ""}`;
const buyerLabel = (client) =>
  contactLabel(client.Contact || client.contact || client);
const receiptDirection = (payment) =>
  ["incoming", "receipt", "received", "inbound", "credit"].includes(
    String(payment.direction || payment.payment_type || "").toLowerCase(),
  );
const refundDirection = (payment) =>
  ["outgoing", "refund", "refunded"].includes(
    String(payment.direction || payment.payment_type || "").toLowerCase(),
  );
// Plain-language explanations for backend blocker codes, so staff read a
// sentence with a fix, not an internal identifier.
const BLOCKER_TEXT = {
  compliance_not_clear: "Compliance is not marked Clear on the sales profile",
  assessment_not_clear:
    "The assessment must be Complete or Waived on the sales profile",
  agency_agreement_not_signed: "The vendor's agency agreement is not signed",
  party_kyc_not_verified:
    "A buyer or vendor is missing verified KYC documents",
  active_buyer_required: "The transaction needs an active buyer",
  active_vendor_required: "The transaction needs an active vendor",
  pending_disbursements:
    "A payout is still pending — mark it paid, or return to draft to cancel it",
  outgoing_obligations_unpaid:
    "Obligations (vendor proceeds, fees, refunds) are not fully paid out",
  settlement_residual_nonzero:
    "The statement does not balance — the residual must be zero",
  posting_required:
    "A cleared payment with ledger accounts has not been posted to the journal",
  buyer_refund_unpaid: "The buyer's refund has not been fully paid",
  withdrawal_residual_nonzero:
    "Withdrawal figures do not balance to zero",
  sale_profile_missing: "Create the sales profile and fee terms first",
  accepted_transaction_missing: "Accept an offer to start the transaction",
  settlement_missing: "Create the settlement statement",
  pending_payments: "A payment is still pending — clear or reject it",
  unreconciled_payments:
    "Every cleared payment must be reconciled against the bank statement",
  unallocated_outgoing_payments:
    "An outgoing payment is not allocated to any payout",
  invalid_disbursement_allocations:
    "A payout's allocation doesn't match its statement line or payment",
  invalid_settlement_schedule:
    "The settlement schedule does not balance exactly to the purchase price",
  trust_ledger_missing:
    "Beneficiary trust allocations have not been created at approval",
  trust_accounts_nonzero:
    "Every beneficiary trust balance must be exactly zero before completion",
  completed_trust_balance_nonzero:
    "The completed settlement still has money in its payment statement",
  completed_beneficiary_balance_nonzero:
    "A completed beneficiary trust ledger still has a non-zero balance",
};
const blockerText = (code) => BLOCKER_TEXT[String(code)] || title(code);
const hasLineProvenance = (line) =>
  ["commission", "advertising"].includes(line.line_type);
const PAYOUT_LINE_TYPES = new Set([
  "buyer_refund",
  "commission",
  "agency_fee",
  "advertising",
  "admin_fee",
  "vat_tax",
  "legal_fee",
  "registration_fee",
  "lender_payoff",
  "rates_adjustment",
  "utility_adjustment",
  "third_party",
  "vendor_proceeds",
  "rounding",
]);

const SETTLEMENT_STAGES = [
  ["draft", "Prepare"],
  ["submitted", "Submitted"],
  ["reviewed", "Reviewed"],
  ["approved", "Approved"],
  ["locked", "Locked"],
];
const SETTLEMENT_NEXT = {
  draft: { action: "submit", label: "Submit for review" },
  returned: { action: "submit", label: "Resubmit for review" },
  submitted: { action: "review", label: "Mark reviewed (independent check)" },
  reviewed: { action: "approve", label: "Approve (admin)" },
  approved: { action: "lock", label: "Lock & complete" },
};
const SETTLEMENT_GUIDE = {
  draft:
    "Check the equation balances, record buyer receipts and reconcile them, then submit.",
  returned:
    "Fix what the reviewer flagged, rebalance if needed, then resubmit.",
  submitted:
    "A different user (accounts) verifies the figures and receipts, then marks reviewed.",
  reviewed: "An admin gives the final approval — the third pair of eyes.",
  approved:
    "Record the outgoing payments, mark each payout paid, clear the remaining blockers, then lock.",
  locked:
    "Completed and immutable. Every figure, payment and approval stays on record for audit.",
};

const SECTIONS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "parties", label: "Parties", icon: Users },
  { key: "assessment", label: "Assessment", icon: ClipboardCheck },
  { key: "enquiries", label: "Enquiries", icon: Users },
  { key: "offers", label: "Offers", icon: HandCoins },
  { key: "settlement", label: "Settlement", icon: Scale },
  { key: "onboarding", label: "Onboarding", icon: ClipboardCheck },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "activity", label: "Activity / Audit", icon: Activity },
];

function Panel({ icon: Icon, heading, sub, action, children }) {
  return (
    <section className="pm-card">
      <div className="pm-card-h">
        {Icon && (
          <div className="ic">
            <Icon size={17} />
          </div>
        )}
        <div>
          <h3>{heading}</h3>
          {sub && <div className="hsub">{sub}</div>}
        </div>
        <div className="sp" />
        {action}
      </div>
      <div className="pm-card-body">{children}</div>
    </section>
  );
}

function OnboardingRow({ label, status, actionLabel, onAction }) {
  return (
    <div className="kv">
      <span className="k">{label}</span>
      <span
        className="v"
        style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
      >
        <StatusBadge status={status} />
        {onAction && (
          <Button size="sm" variant="ghost" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </span>
    </div>
  );
}

function ErrorBox({ error }) {
  return error ? (
    <div
      style={{
        background: "var(--bad-bg)",
        border: "1px solid var(--bad)",
        color: "var(--bad)",
        borderRadius: 10,
        padding: "10px 12px",
        marginBottom: 12,
        fontSize: 13,
      }}
    >
      {error}
    </div>
  ) : null;
}

function DrawerActions({
  close,
  save,
  saving,
  disabled = false,
  label = "Save",
}) {
  return (
    <>
      <Button variant="ghost" onClick={close}>
        Cancel
      </Button>
      <Button onClick={save} disabled={saving || disabled}>
        {saving ? <Spinner /> : label}
      </Button>
    </>
  );
}

function Empty({ icon, heading, text, action }) {
  return <EmptyState icon={icon} title={heading} sub={text} action={action} />;
}

function PartyName({ party }) {
  return (
    party.contact?.full_name ||
    party.Contact?.full_name ||
    party.snapshot_name ||
    party.full_name ||
    party.name ||
    party.payee_name ||
    `Party #${party.id}`
  );
}

export default function SalesPropertyFile({
  propertyId: propertyIdProp,
  onBack,
}) {
  const params = useParams();
  const propertyId = propertyIdProp || params.id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const canPrepare = [
    "super_admin",
    "branch_admin",
    "property_manager",
    "sales_executive",
  ].includes(user?.role);
  const canAccounts = ["super_admin", "branch_admin", "accounts"].includes(
    user?.role,
  );
  const canAdmin = ["super_admin", "branch_admin"].includes(user?.role);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState("overview");
  const [assessmentDirty, setAssessmentDirty] = useState(false);
  const [activityTab, setActivityTab] = useState("activity");
  const [drawer, setDrawer] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [buyerDestination, setBuyerDestination] = useState("offer");
  const [statement, setStatement] = useState(null);
  const [settleTab, setSettleTab] = useState("statement");
  const [accountingOptions, setAccountingOptions] = useState({
    ledger_accounts: [],
    bank_accounts: [],
  });
  const [bankLines, setBankLines] = useState([]);
  const [partyBankAccounts, setPartyBankAccounts] = useState([]);
  const [enquiries, setEnquiries] = useState([]);

  const loadEnquiries = useCallback(async () => {
    if (!propertyId) return;
    try {
      const response = await api.get(
        `/sales-enquiries?property_id=${propertyId}&limit=200`,
      );
      setEnquiries(unwrap(response)?.data || []);
    } catch {
      setEnquiries([]);
    }
  }, [propertyId]);

  const openSection = useCallback(
    (nextSection) => {
      if (
        section === "assessment" &&
        nextSection !== "assessment" &&
        assessmentDirty &&
        !window.confirm("You have unsaved assessment changes. Leave without saving them?")
      ) {
        return false;
      }
      setSection(nextSection);
      return true;
    },
    [assessmentDirty, section],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/sales/properties/${propertyId}`);
      setDetail(unwrap(response));
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Failed to load the sales property file",
      );
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [propertyId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadEnquiries();
  }, [loadEnquiries]);

  // The trust account statement follows the settlement — refetched after every
  // reload so reversals and reconciliations appear immediately.
  useEffect(() => {
    const settlementId = detail?.settlement?.id;
    if (!settlementId) {
      setStatement(null);
      return undefined;
    }
    let cancelled = false;
    api
      .get(`/sales/settlements/${settlementId}/statement`)
      .then((response) => {
        if (!cancelled) setStatement(unwrap(response));
      })
      .catch(() => {
        if (!cancelled) setStatement(null);
      });
    return () => {
      cancelled = true;
    };
  }, [detail]);

  useEffect(() => {
    if (!canAccounts || !detail) {
      setAccountingOptions({ ledger_accounts: [], bank_accounts: [] });
      setBankLines([]);
      setPartyBankAccounts([]);
      return undefined;
    }
    const fileTransaction =
      detail.transaction ||
      detail.active_transaction ||
      array(detail.transaction_history, detail.transactions)[0];
    const fileSettlement = detail.settlement || fileTransaction?.settlement;
    let cancelled = false;
    const requests = [
      api.get("/sales/accounting-options"),
      fileTransaction?.id
        ? api.get(`/sales/transactions/${fileTransaction.id}/bank-accounts`)
        : Promise.resolve(null),
      fileSettlement?.id
        ? api.get(`/sales/settlements/${fileSettlement.id}/bank-lines`)
        : Promise.resolve(null),
    ];
    Promise.allSettled(requests).then(([optionsResult, accountsResult, linesResult]) => {
      if (cancelled) return;
      setAccountingOptions(
        optionsResult.status === "fulfilled"
          ? unwrap(optionsResult.value)
          : { ledger_accounts: [], bank_accounts: [] },
      );
      setPartyBankAccounts(
        accountsResult.status === "fulfilled" && accountsResult.value
          ? array(unwrap(accountsResult.value))
          : [],
      );
      setBankLines(
        linesResult.status === "fulfilled" && linesResult.value
          ? array(unwrap(linesResult.value))
          : [],
      );
    });
    return () => {
      cancelled = true;
    };
  }, [canAccounts, detail]);

  const closeDrawer = () => {
    setDrawer(null);
    setForm({});
    setFormError("");
  };
  const openDrawer = (name, values = {}) => {
    setDrawer(name);
    setForm(values);
    setFormError("");
  };
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const saveEnquiry = async () => {
    if (!form.enquirer_name?.trim()) {
      setFormError("Buyer name is required.");
      return false;
    }
    setSaving(true);
    setFormError("");
    try {
      await api.post("/sales-enquiries", {
        property_id: propertyId,
        enquirer_name: form.enquirer_name,
        phone: form.phone || null,
        email: form.email || null,
        source: form.source || "staff",
        budget: form.budget || null,
        viewing_date: form.viewing_date || null,
        follow_up_date: form.follow_up_date || null,
        message: form.message || null,
      });
      toast.success("Enquiry logged");
      closeDrawer();
      await loadEnquiries();
      return true;
    } catch (error) {
      const message =
        error.response?.data?.error || "Could not log the enquiry";
      setFormError(message);
      toast.error(message);
      return false;
    } finally {
      setSaving(false);
    }
  };
  const updateEnquiryStage = async (row, next) => {
    try {
      await api.patch(`/sales-enquiries/${row.id}/move`, { stage: next });
      await loadEnquiries();
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not update stage");
    }
  };
  const perform = async (request, success, options = {}) => {
    if (options.confirm && !window.confirm(options.confirm)) return false;
    setSaving(true);
    setFormError("");
    try {
      await request();
      toast.success(success);
      closeDrawer();
      await load();
      return true;
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "The request could not be completed";
      setFormError(message);
      toast.error(message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div
        className="pm-scope"
        style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}
      >
        <div style={{ textAlign: "center" }}>
          <Spinner />
          <div className="cell-sub" style={{ marginTop: 10 }}>
            Loading sales property file…
          </div>
        </div>
      </div>
    );
  if (!detail)
    return (
      <div className="pm-scope">
        <Empty
          icon={Building2}
          heading="Property file unavailable"
          text="The sales API did not return this property."
          action={
            <Button onClick={() => (onBack ? onBack() : navigate(-1))}>
              Back to sales
            </Button>
          }
        />
      </div>
    );

  const property =
    detail.property ||
    detail.listing ||
    (detail.data && !Array.isArray(detail.data) ? detail.data : detail);
  const profile =
    detail.profile ||
    detail.sale_profile ||
    property.sales_profile ||
    property.profile ||
    {};
  const parties = array(detail.parties, property.parties);
  const offers = array(detail.offers, property.offers);
  const transactions = array(
    detail.transaction_history,
    detail.transactions,
    property.transactions,
  );
  const transaction =
    detail.transaction ||
    detail.active_transaction ||
    transactions.find((item) =>
      [
        "accepted",
        "under_contract",
        "active",
        "settlement",
        "completed",
      ].includes(item.status),
    ) ||
    transactions[0] ||
    null;
  const settlement = detail.settlement || transaction?.settlement || null;
  const transactionParties = array(
    detail.transaction_parties,
    transaction?.parties,
  );
  const lines = array(
    detail.settlement_lines,
    settlement?.lines,
    settlement?.line_items,
  );
  const payments = array(
    detail.payments,
    settlement?.payments,
    settlement?.receipts,
  );
  const disbursements = array(
    detail.disbursements,
    settlement?.disbursements,
    settlement?.payouts,
  );
  const fundingRequests = array(settlement?.funding_requests);
  const trust = settlement?.trust || statement?.trust || {
    accounts: [],
    entries: [],
    total_balance: 0,
    total_balance_minor: 0,
  };
  const ledgerAccounts = array(accountingOptions.ledger_accounts);
  const physicalBankAccounts = array(accountingOptions.bank_accounts);
  const verifiedPartyBankAccounts = partyBankAccounts.filter(
    (account) => account.status === "verified",
  );
  const formPayeeParty = transactionParties.find(
    (party) => Number(party.id) === Number(form.transaction_party_id),
  );
  const payoutContactId = formPayeeParty?.contact_id || form.contact_id;
  const availablePayoutAccounts = verifiedPartyBankAccounts.filter(
    (account) => Number(account.contact_id) === Number(payoutContactId),
  );
  const refundablePayments = payments.filter(
    (payment) =>
      payment.direction === "incoming" &&
      payment.status === "cleared" &&
      payment.provider === "sslcommerz" &&
      Number(payment.transaction_party_id) === Number(form.transaction_party_id),
  );
  const matchingBankLines = bankLines.filter((line) => {
    const expectedMinor =
      form.direction === "incoming" ? minor(form.amount) : -minor(form.amount);
    const available =
      line.status === "unmatched" ||
      (line.matched_entity_type === "sale_payment" &&
        Number(line.matched_entity_id) === Number(form.id));
    return available && minor(line.amount) === expectedMinor;
  });
  const referencedLineIds = new Set(
    disbursements
      .filter((item) => item.settlement_line_id)
      .map((item) => Number(item.settlement_line_id)),
  );
  const activeReferencedLineIds = new Set(
    disbursements
      .filter(
        (item) => item.settlement_line_id && item.status !== "cancelled",
      )
      .map((item) => Number(item.settlement_line_id)),
  );
  const remainingForLine = (line) =>
    Math.max(
      0,
      number(line.amount) -
        disbursements
          .filter(
            (item) =>
              item.status !== "cancelled" &&
              Number(item.settlement_line_id) === Number(line.id),
          )
          .reduce((sum, item) => sum + number(item.amount), 0),
    );
  const payoutObligations = lines.filter(
    (line) => PAYOUT_LINE_TYPES.has(line.line_type) && minor(remainingForLine(line)) > 0,
  );
  const linkedOutgoingPaymentIds = new Set(
    disbursements
      .filter(
        (item) =>
          Number(item.id) !== Number(form.id) &&
          item.payment_id,
      )
      .map((item) => Number(item.payment_id)),
  );
  const eligibleOutgoingPayments = payments.filter(
    (payment) =>
      payment.direction === "outgoing" &&
      payment.status === "cleared" &&
      payment.reconciliation_status === "reconciled" &&
      payment.bank_statement_line_id &&
      !payment.reversal_of_payment_id &&
      !linkedOutgoingPaymentIds.has(Number(payment.id)) &&
      minor(payment.amount) === minor(form.amount) &&
      payment.payment_kind ===
        (transactionParties.find(
          (party) => Number(party.id) === Number(form.transaction_party_id),
        )?.party_type === "buyer"
          ? "buyer_refund"
          : form.payee_type === "vendor"
            ? "vendor_payout"
            : form.payee_type === "agency"
              ? "agency_fee"
              : "third_party") &&
      Number(payment.transaction_party_id || 0) ===
        Number(form.transaction_party_id || 0) &&
      normalizedAccount(payment.to_account_number) ===
        normalizedAccount(form.bank_account_number),
  );
  const documents = array(detail.documents, property.documents);
  const salesRoleProfiles = array(
    detail.role_profiles,
    detail.roleProfiles,
  ).filter((role) => ["vendor", "buyer"].includes(role.role_type));
  const vendorRoleProfile = salesRoleProfiles.find(
    (role) => role.role_type === "vendor",
  );
  const pendingKycProfile =
    salesRoleProfiles.find(
      (role) =>
        role.kyc_status !== "complete" ||
        role.documents_status !== "complete",
    ) || salesRoleProfiles[0];
  const assessmentStatus =
    detail.assessment_summary?.status ||
    detail.assessment?.status ||
    detail.onboarding?.assessment_status ||
    profile.assessment_status ||
    "pending";
  const complianceStatus =
    profile.compliance_status ||
    detail.compliance?.status ||
    detail.onboarding?.compliance_status ||
    "pending";
  const roleAgreementStatus = ["active", "signed"].includes(
    vendorRoleProfile?.status,
  )
    ? "signed"
    : ["signing_sent", "partially_signed"].includes(
          vendorRoleProfile?.status,
        )
      ? "sent"
      : vendorRoleProfile?.status === "agreement_pending"
        ? "draft"
        : null;
  const agreementStatus =
    roleAgreementStatus ||
    profile.agreement_status ||
    detail.agreement?.status ||
    detail.onboarding?.agreement_status ||
    "not_started";
  const kycStatus = !salesRoleProfiles.length
    ? "not_started"
    : salesRoleProfiles.every(
          (role) =>
            role.kyc_status === "complete" &&
            role.documents_status === "complete",
        )
      ? "complete"
      : "pending";
  const activities = array(
    detail.activity,
    detail.activities,
    detail.events,
    property.activity,
  );
  const audit = array(
    detail.audit,
    detail.audit_log,
    detail.auditLog,
    detail.events,
  );
  const state = detail.state || {};
  const acceptedOffer = offers.find((offer) =>
    ["accepted", "under_contract"].includes(offer.status),
  );

  // A payment and its reversal always drop out of the books together — the
  // same rule the backend applies in calculateSettlement.
  const reversedPaymentIds = new Set(
    payments
      .filter((item) => item.reversal_of_payment_id)
      .map((item) => Number(item.reversal_of_payment_id)),
  );
  const livePayment = (item) =>
    !item.reversal_of_payment_id &&
    !reversedPaymentIds.has(Number(item.id)) &&
    item.status === "cleared";
  const receivedCalculated = payments
    .filter((item) => livePayment(item) && receiptDirection(item))
    .reduce((sum, item) => sum + number(item.amount), 0);
  // Refunded means money returned to the buyer — not vendor payouts, not
  // third-party payments, and never a reversal leg.
  const refundedCalculated = payments
    .filter(
      (item) =>
        livePayment(item) &&
        refundDirection(item) &&
        (item.payment_kind ? item.payment_kind === "buyer_refund" : true),
    )
    .reduce((sum, item) => sum + number(item.amount), 0);
  const deductionsCalculated = lines
    .filter(
      (item) =>
        ![
          "purchase_price",
          "vendor_proceeds",
          "buyer_refund",
          "deposit",
          "buyer_receipt",
        ].includes(item.line_type || item.type),
    )
    .reduce(
      (sum, item) =>
        sum +
        (String(item.direction).toLowerCase() === "credit" ? -1 : 1) *
          number(item.amount),
      0,
    );
  const disbursedCalculated = payments
    .filter((item) => livePayment(item) && refundDirection(item))
    .reduce((sum, item) => sum + number(item.amount), 0);
  const pendingReceiptsCalculated = payments
    .filter(
      (item) =>
        !item.reversal_of_payment_id &&
        item.status === "pending" &&
        receiptDirection(item),
    )
    .reduce((sum, item) => sum + number(item.amount), 0);
  const summary =
    settlement?.summary ||
    settlement?.calculations ||
    detail.financials ||
    detail.financial ||
    {};
  const purchasePrice = number(
    summary.purchase_price ??
      settlement?.purchase_price ??
      transaction?.purchase_price ??
      transaction?.sale_price ??
      acceptedOffer?.amount ??
      acceptedOffer?.offer_amount ??
      property.sale_price ??
      profile.asking_price ??
      property.price,
  );
  // The backend calculation keys are receipts / refunded / refunds (due) —
  // read those first so the screen shows the audited figures, and only fall
  // back to the local recomputation when no settlement summary exists.
  const received = number(
    summary.receipts ??
      summary.received ??
      summary.total_received ??
      receivedCalculated,
  );
  const refunded = number(
    summary.refunded ?? summary.total_refunded ?? refundedCalculated,
  );
  const refundsDue = number(summary.refunds ?? 0);
  const pendingReceipts = number(
    summary.pending_receipts ?? pendingReceiptsCalculated,
  );
  const pendingPaymentCount = payments.filter(
    (item) =>
      !item.reversal_of_payment_id &&
      !reversedPaymentIds.has(Number(item.id)) &&
      item.status === "pending",
  ).length;
  const unreconciledPaymentCount = payments.filter(
    (item) =>
      !item.reversal_of_payment_id &&
      !reversedPaymentIds.has(Number(item.id)) &&
      item.status === "cleared" &&
      item.reconciliation_status !== "reconciled",
  ).length;
  const deductions = number(
    summary.deductions ?? summary.total_deductions ?? deductionsCalculated,
  );
  const vendorProceeds = number(
    summary.vendor_proceeds ??
      Math.max(0, purchasePrice - refundsDue - deductions),
  );
  const paid = number(
    summary.disbursed ??
      summary.paid_disbursed ??
      summary.total_disbursed ??
      disbursedCalculated,
  );
  const fundsHeld = number(
    summary.funds_held ?? summary.client_funds_held ?? received - paid,
  );
  const residual = number(
    summary.residual ??
      summary.balance_exception ??
      fundsHeld -
        Math.max(0, vendorProceeds + deductions + refundsDue - paid),
  );
  const balanced = minor(residual) === 0;
  const unpaidObligations = number(
    summary.unpaid_obligations ??
      Math.max(0, vendorProceeds + deductions + refundsDue - paid),
  );
  // The statement identity: vendor proceeds should equal price − fees − refunds
  // due. When explicit vendor lines drift from that (after a fee edit), the
  // one-click rebalance fixes it.
  const derivedVendorProceeds = Math.max(
    0,
    purchasePrice - deductions - refundsDue,
  );
  const isWithdrawal = settlement?.settlement_type === "withdrawal";
  const transactionCancelled = transaction?.status === "cancelled";
  // The fast cancel path only exists while no client money has cleared.
  const zeroFunds = minor(received) === 0 && minor(paid) === 0;
  // Withdrawal identity: the statement's allocations (owner credit + refund
  // due + fees) were computed from cleared funds at prepare time. If receipts
  // clear or reverse afterwards, allocations drift from reality and the only
  // fix is re-running Prepare withdrawal.
  const withdrawalAllocated = number(
    (vendorProceeds + refundsDue + deductions).toFixed(2),
  );
  const withdrawalDrift = isWithdrawal
    ? number((withdrawalAllocated - received).toFixed(2))
    : 0;
  const withdrawalStale =
    isWithdrawal && !transactionCancelled && minor(withdrawalDrift) !== 0;
  // How much of the vendor's credit has actually been paid out of the trust
  // account, vs what the statement still owes them.
  const vendorPaid = payments
    .filter(
      (item) =>
        livePayment(item) &&
        item.direction === "outgoing" &&
        item.payment_kind === "vendor_payout",
    )
    .reduce((sum, item) => sum + number(item.amount), 0);
  const vendorRemaining = number((vendorProceeds - vendorPaid).toFixed(2));
  const agencyPaid = payments
    .filter(
      (item) =>
        livePayment(item) &&
        item.direction === "outgoing" &&
        item.payment_kind === "agency_fee",
    )
    .reduce((sum, item) => sum + number(item.amount), 0);
  const refundRemaining = number((refundsDue - refunded).toFixed(2));
  // The price − fees − refunds identity only holds for completion settlements;
  // a withdrawal statement balances against the buyer's cleared funds instead.
  const vendorMismatch =
    !isWithdrawal &&
    minor(vendorProceeds) !== minor(derivedVendorProceeds);
  // A cancelled transaction on a relisted property means the PROPERTY is back
  // on the market — lead with its live status, not the dead transaction's.
  const lifecycle =
    transaction?.status === "cancelled" &&
    ["available", "draft"].includes(property.status)
      ? "relisted"
      : detail.lifecycle_state ||
        state.lifecycle_state ||
        transaction?.status ||
        settlement?.status ||
        property.sale_status ||
        property.status ||
        "draft";
  const blockers = array(detail.blockers, state.blockers);
  const nextAction = detail.next_action || state.next_action;
  const nextActionLabel =
    typeof nextAction === "string" && nextAction.startsWith("clear:")
      ? `Resolve: ${blockerText(nextAction.slice(6))}`
      : typeof nextAction === "string"
        ? title(nextAction)
        : nextAction?.title || nextAction?.label;
  const updatePropertyStatus = async (newStatus) => {
    try {
      await api.put(`/properties/${property.id}`, { status: newStatus });
      toast.success(`Property status updated to "${title(newStatus)}"`);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update property status");
    }
  };

  const quickReconcileAll = async () => {
    const unreconciled = payments.filter(
      (item) => !item.reversal_of_payment_id && !reversedPaymentIds.has(Number(item.id)) && item.status === "cleared" && item.reconciliation_status !== "reconciled"
    );
    if (!unreconciled.length) return toast.info("All payments are already reconciled.");
    if (!window.confirm(`Auto-reconcile ${unreconciled.length} cleared payment(s)?`)) return;
    setSaving(true);
    try {
      for (const payment of unreconciled) {
        await api.post(`/sales/payments/${payment.id}/reconcile`, {
          reconciliation_status: "reconciled",
          note: "Auto-reconciled via Sales Cockpit quick action"
        });
      }
      toast.success(`Successfully reconciled ${unreconciled.length} payment(s)!`);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Reconciliation failed");
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = () =>
    perform(
      () =>
        api.put(`/sales/properties/${propertyId}/profile`, {
          asking_price: form.asking_price,
          reserve_price: form.reserve_price,
          agency_type: form.agency_type || form.authority_type,
          commission_percent:
            form.commission_type === "fixed"
              ? null
              : (form.commission_percent ?? form.commission_rate),
          commission_fixed:
            form.commission_type === "fixed"
              ? (form.commission_fixed ?? form.commission_amount)
              : 0,
          marketing_budget: form.marketing_budget,
          agreement_start_date:
            form.agreement_start_date || form.authority_start,
          agreement_end_date: form.agreement_end_date || form.authority_end,
          agreement_status: form.agreement_status,
          target_settlement_date: form.target_settlement_date,
          compliance_status: form.compliance_status,
          client_money_bank_account_id:
            form.client_money_bank_account_id || null,
          client_funds_liability_account_id:
            form.client_funds_liability_account_id || null,
          trust_bank_account_id: form.trust_bank_account_id || null,
          agency_bank_account_id: form.agency_bank_account_id || null,
          agency_operating_account_id:
            form.agency_operating_account_id || null,
          commission_revenue_account_id:
            form.commission_revenue_account_id || null,
          marketing_revenue_account_id:
            form.marketing_revenue_account_id || null,
          notes:
            form.notes ||
            [form.settlement_terms, form.special_conditions]
              .filter(Boolean)
              .join("\n\n"),
        }),
      "Sales profile and fee terms updated",
    );
  const saveAccountingProfile = () =>
    perform(
      () =>
        api.put(`/sales/properties/${propertyId}/accounting`, {
          client_money_bank_account_id:
            form.client_money_bank_account_id || null,
          client_funds_liability_account_id:
            form.client_funds_liability_account_id || null,
          trust_bank_account_id: form.trust_bank_account_id || null,
          agency_bank_account_id: form.agency_bank_account_id || null,
          agency_operating_account_id:
            form.agency_operating_account_id || null,
          commission_revenue_account_id:
            form.commission_revenue_account_id || null,
          marketing_revenue_account_id:
            form.marketing_revenue_account_id || null,
        }),
      "Settlement accounting configuration updated",
    );
  const saveParty = () =>
    perform(
      () => {
        const payload = {
          contact_id: form.contact_id,
          role: form.role,
          ownership_percent: form.ownership_percent ?? form.ownership_pct,
          is_primary: !!form.is_primary,
          status: form.status || "active",
          start_date: form.start_date,
          end_date: form.end_date,
          notes: form.notes,
          replaced_by_party_id: form.replaced_by_party_id || null,
          replacement_reason: form.replacement_reason,
        };
        return form.id
          ? api.patch(`/sales/parties/${form.id}`, payload)
          : api.post(`/sales/properties/${propertyId}/parties`, payload);
      },
      form.id ? "Party updated" : "Party added",
    );
  const saveOffer = () => {
    const buyers = (form.buyers || []).filter(
      (buyer) => buyer.contact_id || buyer.full_name,
    );
    if (!buyers.length) {
      setFormError("Add at least one buyer.");
      return;
    }
    const allocation = buyers.reduce(
      (sum, buyer) =>
        sum + number(buyer.ownership_percent ?? buyer.allocation_pct),
      0,
    );
    if (Math.abs(allocation - 100) > 0.01) {
      setFormError(
        `Buyer allocations must total 100%. Current total: ${allocation}%.`,
      );
      return;
    }
    return perform(
      () => {
        const payload = {
          amount: form.amount ?? form.offer_amount,
          deposit_amount: form.deposit_amount,
          finance_status: form.finance_status,
          proof_url: form.proof_url || form.proof_of_funds_url,
          conditions: form.conditions || (form.terms ? [form.terms] : []),
          expiry_date: form.expiry_date || form.expires_at,
          proposed_completion_date: form.proposed_completion_date,
          solicitor_name: form.solicitor_name,
          solicitor_phone: form.solicitor_phone,
          solicitor_email: form.solicitor_email,
          notes: form.notes,
          status: form.status,
          buyers: buyers.map((buyer, index) => ({
            contact_id: buyer.contact_id,
            client_id: buyer.client_id || null,
            ownership_percent: buyer.ownership_percent ?? buyer.allocation_pct,
            is_primary: buyer.is_primary ?? index === 0,
          })),
        };
        return form.id
          ? api.patch(`/sales/offers/${form.id}`, payload)
          : api.post(`/sales/properties/${propertyId}/offers`, payload);
      },
      form.id ? "Offer updated" : "Offer recorded",
    );
  };
  const saveOfferStatus = () =>
    perform(
      () =>
        api.post(`/sales/offers/${form.id}/status`, {
          status: form.status,
          reason: form.reason,
          notes: form.notes,
        }),
      "Offer status updated",
      { confirm: `Change this offer to “${title(form.status)}”?` },
    );
  const acceptOffer = (offer) => {
    if (
      !property.owner_contact_id &&
      !parties.some(
        (party) => party.role === "vendor" && party.status === "active",
      )
    ) {
      openSection("parties");
      toast.error("Add the vendor/owner before accepting this offer.");
      openDrawer("party", {
        role: "vendor",
        contact_id: null,
        ownership_percent: 100,
        is_primary: true,
        status: "active",
        notes: "",
      });
      return false;
    }
    return perform(
      () => api.post(`/sales/offers/${offer.id}/accept`, {}),
      "Offer accepted and transaction started",
      {
        confirm: `Accept ${money(offer.amount || offer.offer_amount)}? This creates or updates the sale transaction.`,
      },
    );
  };
  const saveTransactionParty = () =>
    perform(
      () =>
        form.id
          ? api.patch(`/sales/transaction-parties/${form.id}`, {
              status: form.status || "withdrawn",
              replacement_reason: form.replacement_reason,
            })
          : api.post(`/sales/transactions/${transaction.id}/parties`, {
              party_type: form.party_type || form.role || "buyer",
              contact_id: form.contact_id,
              client_id: form.client_id || null,
              ownership_percent: form.ownership_percent ?? form.allocation_pct,
              is_primary: !!form.is_primary,
              replaced_party_id:
                form.replaced_party_id || form.replaces_party_id || null,
              replacement_reason: form.replacement_reason,
            }),
      form.id ? "Transaction party updated" : "Transaction buyer added",
      {
        confirm:
          form.replaced_party_id || form.replaces_party_id
            ? "Replace this transaction buyer? The former buyer will remain in the history."
            : undefined,
      },
    );
  const createSettlement = () =>
    perform(
      () => api.post(`/sales/transactions/${transaction.id}/settlement`, form),
      "Settlement statement created",
      {
        confirm:
          "Create the settlement statement using these transaction figures?",
      },
    );
  const saveLines = () =>
    perform(
      () =>
        api.put(`/sales/settlements/${settlement.id}/lines`, {
          auto_balance: form.auto_balance !== false,
          lines: (form.lines || []).map((line) => ({
            id: line.id || undefined,
            line_type: line.line_type,
            direction: line.direction || "debit",
            amount: line.amount,
            payee_transaction_party_id: line.payee_transaction_party_id || null,
            payee_contact_id: line.payee_contact_id || null,
            description: line.description,
            due_date: line.due_date || null,
          })),
        }),
      "Settlement line items updated",
      { confirm: "Save this settlement line schedule?" },
    );
  const savePayment = () => {
    if (form.direction === "outgoing" && settlement.status !== "approved") {
      setFormError(
        `Outgoing payments cannot be recorded while the settlement is ${title(settlement.status)}. Submit, review and approve it first.`,
      );
      return false;
    }
    return perform(
      () =>
        api.post(`/sales/settlements/${settlement.id}/payments`, {
          direction: form.direction,
          reference: form.reference,
          payment_at: form.payment_at || form.occurred_at,
          value_date: form.value_date,
          amount: form.amount,
          method: form.method,
          from_account_name: form.from_account_name || form.from_account,
          from_account_number: form.from_account_number,
          to_account_name: form.to_account_name || form.to_account,
          to_account_number: form.to_account_number,
          proof_url: form.proof_url,
          status: form.status || "pending",
          bank_account_id: form.bank_account_id || null,
          liability_account_id: form.liability_account_id || null,
          transaction_party_id: form.transaction_party_id || null,
          payment_kind: form.payment_kind,
          counterparty_name: form.counterparty_name || null,
          counterparty_phone: form.counterparty_phone || null,
          funding_request_id: form.funding_request_id || null,
          idempotency_key: form.idempotency_key || null,
        }),
      "Receipt / payment recorded",
      {
        confirm: `Record ${title(form.direction)} of ${money(form.amount)} in client funds?`,
      },
    );
  };
  const cancelTransaction = () =>
    perform(
      () =>
        api.post(`/sales/transactions/${transaction.id}/cancel`, {
          reason: form.reason,
        }),
      "Transaction cancelled — the property is back on the market",
    );
  const rebalanceSettlement = () =>
    perform(
      () => api.post(`/sales/settlements/${settlement.id}/rebalance`, {}),
      "Vendor proceeds rebalanced — the statement identity holds again",
      {
        confirm:
          "Recompute vendor proceeds as purchase price − fees − refunds due?",
      },
    );
  const saveFeeLine = () =>
    perform(
      () =>
        api.patch(`/sales/settlement-lines/${form.id}/fee`, {
          amount: form.amount,
          fee_basis: form.fee_basis || "fixed",
          fee_rate: form.fee_rate || null,
          edit_reason: form.edit_reason,
        }),
      "Agency fee updated with its audit reason",
      { confirm: `Change this agency fee to ${money(form.amount)}?` },
    );

  // "How is this number calculated?" — the exact rows behind each figure.
  const breakdownFor = (key) => {
    const lineRows = (filter, signed = false) =>
      lines
        .filter(filter)
        .map((line) => ({
          label: `${title(line.line_type)}${line.description ? ` — ${line.description}` : ""}`,
          amount:
            (signed &&
            String(line.direction).toLowerCase() === "credit"
              ? -1
              : 1) * number(line.amount),
        }));
    const paymentRows = (filter) =>
      payments
        .filter((item) => livePayment(item) && filter(item))
        .map((item) => ({
          label: `${item.reference || `#${item.id}`} · ${title(item.payment_kind || item.direction)} · ${dateOnly(item.payment_at || item.created_at)}`,
          amount: number(item.amount),
        }));
    switch (key) {
      case "price":
        return {
          title: "Purchase price",
          formula: "Sum of the purchase price line(s) on the statement.",
          rows: lineRows((line) => line.line_type === "purchase_price"),
          total: purchasePrice,
        };
      case "fees":
        return {
          title: "Deductions / fees",
          formula:
            "All fee and adjustment lines (commission, marketing, admin, VAT, legal…). Credit-direction lines reduce the total.",
          rows: lineRows(
            (line) =>
              ![
                "purchase_price",
                "vendor_proceeds",
                "buyer_refund",
                "deposit",
                "buyer_receipt",
              ].includes(line.line_type),
            true,
          ),
          total: deductions,
        };
      case "refund_due":
        return {
          title: "Refund due to buyer",
          formula: "Sum of the buyer refund line(s) on the statement.",
          rows: lineRows((line) => line.line_type === "buyer_refund"),
          total: refundsDue,
        };
      case "vendor":
        return {
          title: "Vendor proceeds",
          formula:
            "Purchase price − deductions/fees − refund due. Allocated across vendors by ownership.",
          rows: lines.some((line) => line.line_type === "vendor_proceeds")
            ? lineRows((line) => line.line_type === "vendor_proceeds")
            : [
                { label: "Purchase price", amount: purchasePrice },
                { label: "Less deductions / fees", amount: -deductions },
                { label: "Less refund due", amount: -refundsDue },
              ],
          total: vendorProceeds,
        };
      case "received":
        return {
          title: "Received (cleared)",
          formula:
            "Cleared incoming payments. Pending money and reversed pairs are excluded.",
          rows: paymentRows((item) => receiptDirection(item)),
          total: received,
        };
      case "paid":
        return {
          title: "Paid / disbursed",
          formula:
            "Cleared outgoing payments — refunds, vendor payouts, fees, third parties. Reversed pairs are excluded.",
          rows: paymentRows((item) => refundDirection(item)),
          total: paid,
        };
      case "held":
        return {
          title: "Funds held (client money)",
          formula: "Received (cleared) − paid out.",
          rows: [
            { label: "Received (cleared)", amount: received },
            { label: "Less paid / disbursed", amount: -paid },
          ],
          total: fundsHeld,
        };
      case "unpaid":
        return {
          title: "Unpaid obligations",
          formula:
            "(Vendor proceeds + fees + refund due) − paid out, floored at zero.",
          rows: [
            { label: "Vendor proceeds", amount: vendorProceeds },
            { label: "Deductions / fees", amount: deductions },
            { label: "Refund due", amount: refundsDue },
            { label: "Less paid / disbursed", amount: -paid },
          ],
          total: unpaidObligations,
        };
      case "allocated":
        return {
          title: "Allocated in statement",
          formula:
            "What the withdrawal statement promises out of the buyer's cleared funds: owner credit (forfeit) + refund due + fees. Must equal the cleared funds.",
          rows: [
            { label: "Owner credit (forfeit)", amount: vendorProceeds },
            { label: "Refund due to buyer", amount: refundsDue },
            { label: "Fees / deductions", amount: deductions },
          ],
          total: withdrawalAllocated,
        };
      case "residual":
      default:
        if (isWithdrawal)
          return {
            title: "Residual (must be zero to lock)",
            formula:
              "Buyer's cleared funds − owner credit − fees − refunded to buyer. Zero means the buyer's money is fully split between vendor forfeit, fees and refund.",
            rows: [
              { label: "Buyer funds (cleared)", amount: received },
              { label: "Less owner credit (forfeit)", amount: -vendorProceeds },
              { label: "Less fees / deductions", amount: -deductions },
              { label: "Less refunded to buyer", amount: -refunded },
            ],
            total: residual,
          };
        return {
          title: "Residual (must be zero to lock)",
          formula:
            "Funds held − unpaid obligations. Zero means every taka received is either paid out or exactly covers what is still owed.",
          rows: [
            { label: "Funds held", amount: fundsHeld },
            { label: "Less unpaid obligations", amount: -unpaidObligations },
          ],
          total: residual,
        };
    }
  };

  const saveReconciliation = () =>
    perform(
      () =>
        api.post(`/sales/payments/${form.id}/reconcile`, {
          reconciliation_status: form.reconciliation_status || "reconciled",
          statement_url: form.statement_url,
          bank_statement_line_id: form.bank_statement_line_id || null,
          note: form.note,
        }),
      "Payment reconciled against the bank statement",
    );
  const clearPayment = (payment) =>
    perform(
      () => api.post(`/sales/payments/${payment.id}/clear`, {}),
      "Payment cleared and left unreconciled for bank matching",
      { confirm: `Clear payment ${payment.reference || `#${payment.id}`}?` },
    );
  const rejectPayment = (payment) => {
    const reason = window.prompt("Reason for rejecting this payment:");
    if (!reason) return false;
    return perform(
      () => api.post(`/sales/payments/${payment.id}/reject`, { reason }),
      "Pending payment rejected",
      { confirm: `Reject payment ${payment.reference || `#${payment.id}`}?` },
    );
  };
  const reversePayment = (payment) => {
    const reason = window.prompt("Reason for reversal:");
    if (!String(reason || "").trim()) return false;
    return perform(
      () =>
        api.post(`/sales/payments/${payment.id}/reverse`, {
          reason,
        }),
      "Payment reversed",
      {
        confirm: `Reverse payment ${payment.reference || `#${payment.id}`} for ${money(payment.amount)}?`,
      },
    );
  };
  const postPayment = (payment) =>
    perform(
      () => api.post(`/sales/payments/${payment.id}/post`, {}),
      "Payment posted to the accounting journal",
      { confirm: `Post payment ${payment.reference || `#${payment.id}`} to the ledger?` },
    );
  const saveDisbursement = () =>
    perform(
      () =>
        api.post(`/sales/settlements/${settlement.id}/disbursements`, {
          settlement_line_id: form.settlement_line_id || null,
          payee_type: form.payee_type || "vendor",
          transaction_party_id:
            form.transaction_party_id || form.party_id || null,
          contact_id: form.contact_id || null,
          amount: form.amount,
          party_bank_account_id: form.party_bank_account_id || null,
          destination_bank_account_id:
            form.destination_bank_account_id || null,
          payout_method: form.payout_method || "manual_bank",
          source_payment_id: form.source_payment_id || null,
          reference: form.reference || form.transaction_reference,
          proof_url: form.proof_url,
        }),
      "Disbursement created",
      {
        confirm: `Create a payout of ${money(form.amount)} to ${form.payee_name || "the selected party"}?`,
      },
    );
  const payDisbursement = () => {
    if (settlement.status !== "approved") {
      setFormError(
        `This payout cannot be marked paid while the settlement is ${title(settlement.status)}. Submit, review and approve it first.`,
      );
      return false;
    }
    if (!form.payment_id) {
      setFormError("Select a cleared outgoing payment first.");
      return false;
    }
    return perform(
      () =>
        api.post(`/sales/disbursements/${form.id}/pay`, {
          payment_id: form.payment_id,
          proof_url: form.proof_url,
        }),
      "Disbursement marked paid",
      {
        confirm: `Confirm ${money(form.amount)} was paid? This is a financial action.`,
      },
    );
  };
  const cancelDisbursement = (disbursement) => {
    const reason = window.prompt("Reason for cancelling this payout:");
    if (!reason) return false;
    return perform(
      () =>
        api.post(`/sales/disbursements/${disbursement.id}/cancel`, { reason }),
      "Pending disbursement cancelled",
      { confirm: `Cancel payout ${disbursement.reference || `#${disbursement.id}`}?` },
    );
  };
  const submitDisbursement = () =>
    perform(
      () =>
        api.post(`/sales/disbursements/${form.id}/submit`, {
          reference: form.reference,
          proof_url: form.proof_url,
          idempotency_key:
            form.idempotency_key,
        }),
      form.status === "failed" ? "Payout resubmitted" : "Payout submitted",
      { confirm: `Submit the ${money(form.amount)} payout transfer?` },
    );
  const failDisbursement = (disbursement) => {
    const reason = window.prompt("Why did this payout fail?");
    if (!String(reason || "").trim()) return false;
    return perform(
      () =>
        api.post(`/sales/disbursements/${disbursement.id}/fail`, {
          failure_reason: reason,
        }),
      "Payout marked failed",
    );
  };
  const syncDisbursement = (disbursement) =>
    perform(
      () => api.post(`/sales/disbursements/${disbursement.id}/sync`, {}),
      "Refund status synchronized",
    );

  const saveBankLine = () =>
    perform(
      () =>
        api.post(`/sales/settlements/${settlement.id}/bank-lines`, {
          date: form.date,
          description: form.description,
          reference: form.reference,
          amount: form.amount,
          import_key: form.import_key || undefined,
        }),
      "Bank statement line imported",
    );
  const savePhysicalBankAccount = () =>
    perform(
      () =>
        api.post("/sales/bank-accounts", {
          account_name: form.account_name,
          account_number: form.account_number,
          bank_name: form.bank_name,
          routing_number: form.routing_number,
          account_type: form.account_type,
          currency: "BDT",
        }),
      "Physical bank account added",
    );
  const savePartyBankAccount = () =>
    perform(
      () =>
        api.post(
          form.transaction_party_id
            ? `/sales/transaction-parties/${form.transaction_party_id}/bank-accounts`
            : `/sales/contacts/${form.contact_id}/bank-accounts`,
          {
            bank_name: form.bank_name,
            bank_branch: form.bank_branch,
            account_name: form.account_name,
            account_number: form.account_number,
            routing_number: form.routing_number,
            is_primary: form.is_primary !== false,
          },
        ),
      "Recipient bank account added for verification",
    );
  const verifyPartyBankAccount = (account, action) => {
    const note = window.prompt(
      action === "verify"
        ? "Verification evidence or check performed:"
        : "Reason for rejecting this account:",
    );
    if (!String(note || "").trim()) return false;
    return perform(
      () =>
        api.post(`/sales/party-bank-accounts/${account.id}/verify`, {
          action,
          note,
        }),
      action === "verify" ? "Bank account verified" : "Bank account rejected",
    );
  };
  const saveFundingRequest = () =>
    perform(
      () =>
        api.post(`/sales/settlements/${settlement.id}/funding-requests`, {
          transaction_party_id: form.transaction_party_id,
          request_type: form.request_type,
          amount: form.amount,
          provider: form.provider,
          expires_at: form.expires_at || null,
          idempotency_key:
            form.idempotency_key,
        }),
      "Buyer funding request created",
    );
  const initiateFundingRequest = async (request) => {
    setSaving(true);
    setFormError("");
    try {
      const response = await api.post(
        `/sales/funding-requests/${request.id}/initiate`,
        {},
      );
      const result = response?.data || {};
      toast.success("SSLCommerz payment session created");
      await load();
      if (result.gateway_url) window.open(result.gateway_url, "_blank", "noopener,noreferrer");
      return true;
    } catch (error) {
      const message =
        error.response?.data?.error || "Could not initiate the payment request";
      setFormError(message);
      toast.error(message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const recordOutgoingPaymentFor = (disbursement) =>
    openDrawer("payment", {
      direction: "outgoing",
      lock_direction: true,
      payment_kind:
        transactionParties.find(
          (party) => Number(party.id) === Number(disbursement.transaction_party_id),
        )?.party_type === "buyer"
          ? "buyer_refund"
          : disbursement.payee_type === "vendor"
          ? "vendor_payout"
            : disbursement.payee_type === "agency"
              ? "agency_fee"
              : "third_party",
      transaction_party_id: disbursement.transaction_party_id || "",
      payment_at: new Date().toISOString().slice(0, 16),
      value_date: new Date().toISOString().slice(0, 10),
      amount: disbursement.amount || "",
      method: "bank_transfer",
      from_account_name: "",
      from_account_number: "",
      to_account_name: disbursement.bank_account_name || "",
      to_account_number: disbursement.bank_account_number || "",
      reference: disbursement.reference || "",
      proof_url: disbursement.proof_url || "",
      status: "pending",
      idempotency_key: `payout-payment-${disbursement.id}-${Date.now()}`,
    });
  const prepareWithdrawal = () =>
    perform(
      () =>
        api.post(`/sales/transactions/${transaction.id}/withdrawal`, {
          buyer_party_id: form.buyer_party_id,
          reason: form.reason,
          withdrawal_date: form.withdrawal_date,
          owner_deduction: form.owner_deduction || 0,
          company_deduction: form.company_deduction || 0,
          deductions: [],
        }),
      "Buyer withdrawal settlement prepared",
      {
        confirm:
          "Prepare the withdrawal statement and calculate the buyer refund? Existing draft settlement lines will be replaced.",
      },
    );
  const settlementAction = async (action, extra = null) => {
    if (
      !extra &&
      !window.confirm(`${title(action)} this settlement statement?`)
    )
      return false;
    setSaving(true);
    setFormError("");
    try {
      await api.post(`/sales/settlements/${settlement.id}/${action}`, {
        ...(action === "return" ? { reason: form.reason } : {}),
        ...(extra || {}),
      });
      toast.success(
        `Settlement ${action === "return" ? "returned" : `${action}ed`}`,
      );
      closeDrawer();
      await load();
      return true;
    } catch (error) {
      const message =
        error.response?.data?.error || "The request could not be completed";
      // Separation-of-duties refusal: offer the audited super-admin override
      // instead of a dead-end toast.
      if (!extra && /super admin can override/i.test(message)) {
        openDrawer("override", { action, message, override_reason: "" });
      } else {
        setFormError(message);
        toast.error(message);
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openOffer = (offer = null) =>
    openDrawer(
      "offer",
      offer
        ? {
            ...offer,
            buyers: array(offer.buyers, offer.parties).map((buyer) => ({
              ...buyer,
              allocation_pct: buyer.ownership_percent,
            })),
          }
        : {
            status: "submitted",
            amount: "",
            deposit_amount: "",
            finance_status: "cash",
            expiry_date: "",
            proposed_completion_date: "",
            source: "staff",
            proof_url: "",
            terms: "",
            buyers: [
              {
                contact_id: null,
                full_name: "",
                allocation_pct: 100,
                is_primary: true,
              },
            ],
          },
    );
  const openNewBuyer = (destination = "offer") => {
    setBuyerDestination(destination);
    openDrawer("new-buyer", {
      contact_type: "individual",
      first_name: "",
      last_name: "",
      company_name: "",
      primary_phone: "",
      whatsapp: "",
      email: "",
      date_of_birth: "",
      gender: "",
      nationality: "Bangladeshi",
      national_id: "",
      passport_no: "",
      tin: "",
      address_line1: "",
      area: "",
      city: "",
      district: "",
      postal_code: "",
      country: "Bangladesh",
      is_nrb: false,
      nrb_country: "",
      source: "staff",
      notes: "",
    });
  };
  const saveNewBuyer = async () => {
    setSaving(true);
    setFormError("");
    try {
      const contactPayload = Object.fromEntries(
        Object.entries(form).filter(
          ([, value]) => value !== "" && value != null,
        ),
      );
      const contactResponse = await api.post("/contacts", contactPayload);
      const contact = contactResponse.data?.data || contactResponse.data;
      if (buyerDestination === "vendor") {
        await api.post(`/sales/properties/${propertyId}/parties`, {
          contact_id: contact.id,
          role: "vendor",
          ownership_percent: 100,
          is_primary: true,
          status: "active",
          notes: form.notes,
        });
        toast.success("Vendor created and linked to this property");
        closeDrawer();
        await load();
        return;
      }
      const clientResponse = await api.post(`/contacts/${contact.id}/convert`, {
        is_buyer: true,
        client_segment: "standard",
        notes: form.notes,
      });
      const client = clientResponse.data?.data || clientResponse.data;
      toast.success("Buyer created and added to the buyer directory");
      closeDrawer();
      if (buyerDestination === "transaction" && transaction) {
        openDrawer("transaction-party", {
          party_type: "buyer",
          contact_id: contact.id,
          client_id: client.id,
          ownership_percent: 100,
          is_primary: true,
          replaced_party_id: "",
          replacement_reason: "",
        });
      } else {
        openOffer({
          status: "submitted",
          amount: "",
          deposit_amount: "",
          finance_status: "cash",
          expiry_date: "",
          proposed_completion_date: "",
          proof_url: "",
          buyers: [
            {
              contact_id: contact.id,
              client_id: client.id,
              full_name: contact.full_name,
              ownership_percent: 100,
              allocation_pct: 100,
              is_primary: true,
            },
          ],
        });
      }
    } catch (error) {
      const message =
        error.response?.data?.error || "Buyer could not be created";
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };
  const updateBuyer = (index, key, value) =>
    setForm((current) => ({
      ...current,
      buyers: (current.buyers || []).map((buyer, position) =>
        position === index ? { ...buyer, [key]: value } : buyer,
      ),
    }));
  const updateLine = (index, key, value) =>
    setForm((current) => ({
      ...current,
      lines: (current.lines || []).map((line, position) =>
        position === index ? { ...line, [key]: value } : line,
      ),
    }));

  let runningBalance = lines.some(
    (line) => (line.line_type || line.type) === "purchase_price",
  )
    ? 0
    : purchasePrice;
  const linesWithBalance = lines.map((line) => {
    const type = String(line.line_type || line.type || "").toLowerCase();
    const direction = String(line.direction || "").toLowerCase();
    const addsValue =
      direction === "credit" ||
      ["credit", "addition", "purchase_price"].includes(type);
    runningBalance += (addsValue ? 1 : -1) * Math.abs(number(line.amount));
    return { ...line, running_balance: runningBalance };
  });
  const back = () => {
    if (
      section === "assessment" &&
      assessmentDirty &&
      !window.confirm("You have unsaved assessment changes. Leave without saving them?")
    ) {
      return;
    }
    if (onBack) onBack();
    else navigate(-1);
  };

  return (
    <div className="property-detail-layout pm-scope pm-col">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Button variant="ghost" onClick={back}>
          <ArrowLeft size={16} /> Back
        </Button>
        <div className="cell-sub">
          Professional Sales › {title(property.category)} ›{" "}
          <strong style={{ color: "var(--ink)" }}>
            {property.title || "Property file"}
          </strong>
        </div>
      </div>

      <div
        className="pm-card"
        style={{
          padding: 18,
          display: "flex",
          alignItems: "center",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: 118,
            height: 92,
            borderRadius: 12,
            background: property.featured_image_url
              ? `center/cover url(${fileSrc(property.featured_image_url)})`
              : "linear-gradient(135deg,#cfe9f7,#9fd0ee)",
            display: "grid",
            placeItems: "center",
          }}
        >
          {!property.featured_image_url && (
            <Building2 size={34} color="#4a86ad" />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              flexWrap: "wrap",
            }}
          >
            <h1 style={{ margin: 0, fontSize: 21 }}>
              {property.title || "Untitled property"}
            </h1>
            <span className="code-chip">
              {property.property_code || `#${property.id}`}
            </span>
            <span
              className={`pm-chip ${["completed", "sold", "approved", "locked"].includes(lifecycle) ? "good" : ["returned", "cancelled", "exception"].includes(lifecycle) ? "bad" : "info"}`}
            >
              <span className="d" />
              {title(lifecycle)}
            </span>
          </div>

          {/* Automated Property Status Switcher & Website Live Indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            <StatusBadge status={property.status || 'draft'} />
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 12,
              background: property.is_published ? "linear-gradient(135deg,#f0fdf4,#dcfce7)" : "linear-gradient(135deg,#fef2f2,#fee2e2)",
              color: property.is_published ? "#16a34a" : "#dc2626",
              border: property.is_published ? "1px solid #bbf7d0" : "1px solid #fca5a5"
            }}>
              {property.is_published ? "🟢 Live on Website (For Sale)" : "🔒 Hidden from Website"}
            </span>
            {canPrepare && (
              <Select
                value={property.status || 'draft'}
                onChange={(e) => updatePropertyStatus(e.target.value)}
                style={{ minWidth: 170, padding: "3px 8px", fontSize: 11.5, borderRadius: 8, height: 28 }}
                title="Change property lifecycle status and automated website visibility"
              >
                <option value="listed">Listed & Live on Website</option>
                <option value="under_offer">Under Offer (Website Card Banner)</option>
                <option value="settled">Settled / Sold (Recently Sold)</option>
                <option value="draft">Draft (Hidden from Website)</option>
                <option value="withdrawn">Withdrawn (Hidden from Website)</option>
              </Select>
            )}
          </div>
          <div className="cell-sub" style={{ marginTop: 5 }}>
            {[
              property.address,
              property.area,
              property.city || property.district,
            ]
              .filter(Boolean)
              .join(", ") || "No address set"}
          </div>
          <div
            style={{
              display: "flex",
              gap: 18,
              marginTop: 10,
              flexWrap: "wrap",
              fontSize: 12.5,
            }}
          >
            <span>{title(property.property_type || "Property")}</span>
            <span>
              Category <strong>{title(property.category)}</strong>
            </span>
            <span>
              Asking{" "}
              <strong>{money(profile.asking_price || property.price)}</strong>
            </span>
            <span>
              Offers <strong>{offers.length}</strong>
            </span>
          </div>
        </div>
        {(canPrepare || canAccounts) && <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {canPrepare && (
          <Button
            variant="secondary"
            icon={Edit}
            onClick={() =>
              navigate(
                `/sales/properties/new/${property.id}?listing_type=sale&category=${encodeURIComponent(property.category)}`,
              )
            }
          >
            Edit property & website
          </Button>
          )}
          {canPrepare && (
          <Button
            variant="ghost"
            icon={Edit}
            onClick={() =>
              openDrawer("profile", {
                ...profile,
                asking_price: profile.asking_price ?? property.price ?? "",
                agency_type: profile.agency_type || "exclusive",
                commission_type:
                  number(profile.commission_fixed) > 0 ? "fixed" : "percentage",
              })
            }
          >
            Sales profile
          </Button>
          )}
          {canAccounts && (
            <Button
              variant="ghost"
              icon={ShieldCheck}
              onClick={() => openDrawer("accounting", { ...profile })}
            >
              Accounting setup
            </Button>
          )}
        </div>}
      </div>

      {/* The settlement workspace carries its own summary, blockers and next
          action — repeating them here would double the noise on that tab. */}
      {section !== "settlement" && (
      <div className="pm-card" style={{ overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))",
          }}
        >
          {[
            ["Purchase price", purchasePrice],
            ["Received (cleared)", received],
            pendingReceipts > 0 ? ["Pending clearance", pendingReceipts] : null,
            refundsDue > 0 ? ["Refund due", refundsDue] : null,
            ["Refunded to buyer", refunded],
            ["Deductions", deductions],
            ["Vendor proceeds", vendorProceeds],
            ["Paid / disbursed", paid],
            ["Funds held", fundsHeld],
          ]
            .filter(Boolean)
            .map(([label, value], index) => (
            <div
              key={label}
              style={{
                padding: "12px 15px",
                borderLeft: index ? "1px solid var(--line)" : "none",
              }}
            >
              <div
                className="pm-eyebrow"
                style={{ color: "var(--muted)", letterSpacing: ".06em" }}
              >
                {label}
              </div>
              <div className="pm-num" style={{ fontWeight: 800, marginTop: 4 }}>
                {money(value)}
              </div>
            </div>
          ))}
          <div
            style={{
              padding: "12px 15px",
              borderLeft: "1px solid var(--line)",
              background: balanced ? "var(--good-bg)" : "var(--bad-bg)",
            }}
          >
            <div
              className="pm-eyebrow"
              style={{
                color: balanced ? "var(--good)" : "var(--bad)",
                letterSpacing: ".06em",
              }}
            >
              Residual
            </div>
            <div
              className="pm-num"
              style={{
                fontWeight: 900,
                marginTop: 4,
                color: balanced ? "var(--good)" : "var(--bad)",
              }}
            >
              {money(residual)}
            </div>
          </div>
        </div>
      </div>
      )}

      {section !== "settlement" && blockers.length > 0 && (
        <div>
          <button
            type="button"
            className="pm-pill"
            style={{
              borderColor: "var(--warn)",
              background: "var(--warn-bg)",
              color: "var(--warn)",
              fontWeight: 750,
            }}
            onClick={() => openDrawer("blockers", {})}
          >
            <AlertTriangle size={14} /> {blockers.length} blocker
            {blockers.length === 1 ? "" : "s"} — view checklist
          </button>
        </div>
      )}
      {section !== "settlement" && nextAction && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            borderRadius: 12,
            background: "var(--cyan-weak)",
            border: "1px solid #bfeafd",
          }}
        >
          <CheckCircle2 size={18} color="var(--navy)" />
          <div style={{ flex: 1 }}>
            <div className="pm-eyebrow" style={{ color: "var(--navy)" }}>
              Next action
            </div>
            <strong>
              {nextActionLabel}
            </strong>
            {nextAction.description && (
              <div className="cell-sub">{nextAction.description}</div>
            )}
          </div>
          {nextAction.section && (
            <Button size="sm" onClick={() => openSection(nextAction.section)}>
              {nextAction.cta || "Open"}
            </Button>
          )}
        </div>
      )}

      <div className="pm-segment" style={{ overflowX: "auto", width: "100%" }}>
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={section === key ? "on" : ""}
            style={{ whiteSpace: "nowrap" }}
            onClick={() => openSection(key)}
          >
            <Icon size={15} /> {label}
            {key === "offers" && offers.length ? ` (${offers.length})` : ""}
          </button>
        ))}
      </div>

      {section === "overview" && (
        <div
          className="pm-detail-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) 340px",
            gap: 16,
            alignItems: "start",
          }}
        >
          <Panel
            icon={Building2}
            heading="Sales overview"
            sub="Property, authority and agreed commercial terms"
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))",
                gap: "0 24px",
              }}
            >
              <div>
                <KV k="Property type" v={title(property.property_type)} />
                <KV
                  k="Listing status"
                  v={<StatusBadge status={property.status} />}
                />
                <KV
                  k="Asking price"
                  v={money(profile.asking_price || property.price)}
                />
                <KV k="Authority" v={title(profile.agency_type)} />
                <KV
                  k="Authority period"
                  v={[
                    dateOnly(profile.agreement_start_date),
                    dateOnly(profile.agreement_end_date),
                  ].join(" – ")}
                />
              </div>
              <div>
                <KV
                  k="Commission"
                  v={
                    number(profile.commission_fixed) > 0
                      ? money(profile.commission_fixed)
                      : `${number(profile.commission_percent)}%`
                  }
                />
                <KV k="Marketing budget" v={money(profile.marketing_budget)} />
                <KV
                  k="Accepted offer"
                  v={
                    acceptedOffer
                      ? money(
                          acceptedOffer.amount || acceptedOffer.offer_amount,
                        )
                      : "—"
                  }
                />
                <KV
                  k="Transaction"
                  v={
                    transaction?.transaction_code ||
                    transaction?.code ||
                    (transaction ? `#${transaction.id}` : "Not started")
                  }
                />
                <KV
                  k="Settlement"
                  v={
                    settlement ? (
                      <StatusBadge status={settlement.status} />
                    ) : (
                      "Not created"
                    )
                  }
                />
              </div>
            </div>
            {property.description && (
              <>
                <h4 className="form-section-title">Description</h4>
                <p className="cell-sub" style={{ lineHeight: 1.6 }}>
                  {property.description}
                </p>
              </>
            )}
          </Panel>
          <div className="pm-col">
            <Panel icon={Users} heading="Key parties">
              <KV
                k="Vendors"
                v={
                  parties.filter((item) =>
                    ["vendor", "seller", "owner"].includes(item.role),
                  ).length
                }
              />
              <KV
                k="Buyers"
                v={
                  transactionParties.filter(
                    (item) => item.party_type === "buyer",
                  ).length
                }
              />
              <KV
                k="Solicitors"
                v={
                  parties.filter((item) =>
                    String(item.role).includes("solicitor"),
                  ).length
                }
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openSection("parties")}
              >
                View parties
              </Button>
            </Panel>
            <Panel icon={ShieldCheck} heading="Readiness">
              <KV
                k="Profile / terms"
                v={
                  <StatusBadge
                    status={
                      profile.status ||
                      (Object.keys(profile).length ? "completed" : "pending")
                    }
                  />
                }
              />
              <KV
                k="Agreements / KYC"
                v={
                  <StatusBadge
                    status={detail.onboarding?.status || "pending"}
                  />
                }
              />
              <KV
                k="Statement balance"
                v={
                  <Badge tone={balanced ? "green" : "red"}>
                    {balanced ? "Balanced" : `Exception ${money(residual)}`}
                  </Badge>
                }
              />
            </Panel>
          </div>
        </div>
      )}

      {section === "parties" && (
        <Panel
          icon={Users}
          heading="Vendors, buyers and solicitors"
          sub="Ownership allocation and transaction party history"
          action={
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Button
                size="sm"
                variant="ghost"
                icon={Plus}
                onClick={() =>
                  openNewBuyer(transaction ? "transaction" : "offer")
                }
              >
                Create buyer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openNewBuyer("vendor")}
              >
                Create vendor
              </Button>
              <Button
                size="sm"
                icon={Plus}
                onClick={() =>
                  openDrawer("party", {
                    role: "vendor",
                    contact_id: null,
                    ownership_percent: "",
                    is_primary: false,
                    status: "active",
                    notes: "",
                  })
                }
              >
                Add vendor / solicitor
              </Button>
            </div>
          }
        >
          {parties.length ? (
            <div className="pm-minis">
              {parties.map((party) => (
                <div
                  className="pm-mini"
                  key={party.id}
                  style={{ cursor: "default" }}
                >
                  <div className="between">
                    <StatusBadge status={party.status || "active"} />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openDrawer("party", { ...party })}
                    >
                      <Edit size={13} />
                    </Button>
                  </div>
                  <div className="n" style={{ fontSize: 16, marginTop: 10 }}>
                    {PartyName({ party })}
                  </div>
                  <div className="t">
                    {title(party.role)}
                    {party.ownership_percent != null
                      ? ` · ${party.ownership_percent}%`
                      : ""}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon={Users}
              heading="No parties added"
              text="Add vendors and their legal representatives."
            />
          )}
          {transaction && (
            <>
              <h4 className="form-section-title" style={{ marginTop: 22 }}>
                Transaction parties
              </h4>
              <div className="between" style={{ marginBottom: 10 }}>
                <span className="cell-sub">
                  Replacing a buyer preserves the previous party in transaction
                  history.
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openNewBuyer("transaction")}
                  >
                    New buyer
                  </Button>
                  <Button
                    size="sm"
                    icon={Plus}
                    onClick={() =>
                      openDrawer("transaction-party", {
                        party_type: "buyer",
                        contact_id: null,
                        ownership_percent: 100,
                        replaced_party_id: "",
                        replacement_reason: "",
                      })
                    }
                  >
                    Pull / replace buyer
                  </Button>
                </div>
              </div>
              {transactionParties.length ? (
                <DataTable
                  columns={[
                    {
                      key: "name",
                      header: "Party",
                      render: (row) => PartyName({ party: row }),
                    },
                    {
                      key: "role",
                      header: "Role",
                      render: (row) => title(row.party_type),
                    },
                    {
                      key: "allocation",
                      header: "Allocation",
                      render: (row) =>
                        row.ownership_percent != null
                          ? `${row.ownership_percent}%`
                          : "—",
                    },
                    {
                      key: "status",
                      header: "Status",
                      render: (row) => (
                        <StatusBadge status={row.status || "active"} />
                      ),
                    },
                    {
                      key: "edit",
                      header: "",
                      render: (row) =>
                        row.status === "active" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              openDrawer("transaction-party", {
                                ...row,
                                status: "withdrawn",
                                replacement_reason: "",
                              })
                            }
                          >
                            <Edit size={13} />
                          </Button>
                        ) : null,
                    },
                  ]}
                  rows={transactionParties}
                />
              ) : (
                <div className="cell-sub">No transaction parties yet.</div>
              )}
            </>
          )}
        </Panel>
      )}

      {section === "assessment" && (
        <SalesAssessmentWorkspace
          propertyId={propertyId}
          property={property}
          profile={profile}
          onChanged={load}
          onDirtyChange={setAssessmentDirty}
        />
      )}

      {section === "enquiries" && (
        <Panel
          icon={Users}
          heading="Buyer enquiries"
          sub="Everyone who enquired about this property. Click a name to open their buyer client."
          action={
            <Button
              size="sm"
              icon={Plus}
              onClick={() =>
                openDrawer("enquiry", {
                  enquirer_name: "",
                  phone: "",
                  email: "",
                  source: "walk_in",
                  budget: "",
                  viewing_date: "",
                  follow_up_date: "",
                  message: "",
                })
              }
            >
              Log an enquiry
            </Button>
          }
        >
          {enquiries.length ? (
            <DataTable
              columns={[
                {
                  key: "buyer",
                  header: "Buyer",
                  render: (row) => (
                    <button
                      type="button"
                      onClick={() =>
                        row.client_id
                          ? navigate(`/clients?client=${row.client_id}`)
                          : row.contact_id
                            ? navigate(`/contacts?contact=${row.contact_id}`)
                            : toast.error("No linked buyer record.")
                      }
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                      title="Open the buyer client"
                    >
                      <div
                        className="cell-strong"
                        style={{ color: "var(--navy)", fontWeight: 700 }}
                      >
                        {row.enquirer_name || "Unnamed buyer"}
                      </div>
                      <div className="cell-sub">{row.enquiry_code}</div>
                    </button>
                  ),
                },
                {
                  key: "phone",
                  header: "Contact number",
                  render: (row) => row.phone || row.email || "—",
                },
                {
                  key: "date",
                  header: "Enquiry date / time",
                  render: (row) => dateTime(row.created_at),
                },
                {
                  key: "source",
                  header: "Source",
                  render: (row) => title(row.source || "—"),
                },
                {
                  key: "stage",
                  header: "Stage",
                  render: (row) => (
                    <Select
                      value={row.stage}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        updateEnquiryStage(row, event.target.value)
                      }
                      style={{ minWidth: 150 }}
                    >
                      {[
                        "new",
                        "contacted",
                        "viewing_scheduled",
                        "viewed",
                        "offer_made",
                        "converted",
                        "rejected",
                      ].map((s) => (
                        <option key={s} value={s}>
                          {title(s)}
                        </option>
                      ))}
                    </Select>
                  ),
                },
              ]}
              rows={enquiries}
            />
          ) : (
            <Empty
              icon={Users}
              heading="No enquiries yet"
              text="Log a walk-in or phone enquiry with the button above. Website enquiries appear here automatically."
            />
          )}
        </Panel>
      )}

      {section === "offers" && (
        <Panel
          icon={HandCoins}
          heading="Purchase offers"
          sub="Multi-buyer allocations, proof of funds and decision history"
          action={
            <div style={{ display: "flex", gap: 6 }}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => openNewBuyer("offer")}
              >
                Create buyer
              </Button>
              <Button size="sm" icon={Plus} onClick={() => openOffer()}>
                Record offer
              </Button>
            </div>
          }
        >
          {offers.length ? (
            <div className="pm-col">
              {offers.map((offer) => (
                <div className="card" key={offer.id} style={{ padding: 14 }}>
                  <div
                    className="between"
                    style={{ gap: 12, flexWrap: "wrap" }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <strong style={{ fontSize: 16 }}>
                          {money(offer.amount || offer.offer_amount)}
                        </strong>
                        <StatusBadge status={offer.status} />
                      </div>
                      <div className="cell-sub" style={{ marginTop: 4 }}>
                        {dateOnly(offer.created_at)} ·{" "}
                        {array(offer.buyers, offer.parties)
                          .map((buyer) => PartyName({ party: buyer }))
                          .join(", ") ||
                          offer.buyer_name ||
                          "Buyer details unavailable"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {["draft", "submitted", "countered"].includes(
                        offer.status,
                      ) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openOffer(offer)}
                        >
                          <Edit size={13} /> Edit
                        </Button>
                      )}
                      {![
                        "accepted",
                        "rejected",
                        "withdrawn",
                        "expired",
                      ].includes(offer.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            openDrawer("offer-status", {
                              id: offer.id,
                              status:
                                offer.status === "draft"
                                  ? "submitted"
                                  : "countered",
                              reason: "",
                            })
                          }
                        >
                          Status
                        </Button>
                      )}
                      {["submitted", "countered"].includes(offer.status) && (
                        <Button size="sm" onClick={() => acceptOffer(offer)}>
                          Accept
                        </Button>
                      )}
                    </div>
                  </div>
                  {offer.source && (
                    <div className="cell-sub" style={{ marginTop: 9 }}>
                      Source: {offer.source}
                    </div>
                  )}
                  {offer.proof_url && (
                    <a
                      className="pm-link"
                      href={fileSrc(offer.proof_url)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ marginTop: 8 }}
                    >
                      <FileCheck2 size={13} /> Proof of funds
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon={HandCoins}
              heading="No offers recorded"
              text="Record an offer with one or more buyers and proof of funds."
            />
          )}
        </Panel>
      )}

      {section === "settlement" && (
        <div className="pm-col st-workspace">
          {!transaction ? (
            <Empty
              icon={Scale}
              heading="No accepted transaction"
              text="Accept an offer before creating a settlement statement."
              action={
                <Button onClick={() => openSection("offers")}>
                  Review offers
                </Button>
              }
            />
          ) : transactionCancelled && !settlement ? (
            <Empty
              icon={Scale}
              heading="Transaction cancelled — property back on the market"
              text="The previous offer was withdrawn. Accept a new offer to start a fresh transaction and settlement."
              action={
                <Button onClick={() => setSection("offers")}>
                  Review offers
                </Button>
              }
            />
          ) : !settlement ? (
            <Empty
              icon={Scale}
              heading="Settlement not created"
              text="Create the statement from the accepted transaction and settlement date."
              action={canPrepare ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Button
                    onClick={() =>
                      openDrawer("settlement", {
                        purchase_price: purchasePrice,
                        settlement_date: "",
                        notes: "",
                      })
                    }
                  >
                    Create completion settlement
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      openDrawer("withdrawal", {
                        buyer_party_id:
                          transactionParties.find(
                            (party) =>
                              party.party_type === "buyer" &&
                              party.status === "active",
                          )?.id || "",
                        withdrawal_date: new Date().toISOString().slice(0, 10),
                        owner_deduction: 0,
                        company_deduction: 0,
                        reason: "",
                      })
                    }
                  >
                    Buyer withdrawal / refund
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      openDrawer("cancel-transaction", { reason: "" })
                    }
                  >
                    Cancel — offer withdrawn
                  </Button>
                </div>
              ) : undefined}
            />
          ) : (
            <>
              {transactionCancelled && (
                <div className="st-notice">
                  <RotateCcw size={15} />
                  <span>
                    This transaction was cancelled — the records below are
                    historical and read-only. Accept a new offer to start a
                    fresh transaction and settlement.
                  </span>
                  <Button size="sm" onClick={() => setSection("offers")}>
                    Go to offers
                  </Button>
                </div>
              )}
              {/* ── Money at a glance — every figure opens its derivation ── */}
              <div className="st-summary">
                {[
                  isWithdrawal
                    ? ["Allocated in statement", withdrawalAllocated, "allocated"]
                    : ["Purchase price", purchasePrice, "price"],
                  [
                    isWithdrawal ? "Buyer funds (cleared)" : "Received",
                    received,
                    "received",
                  ],
                  ["Funds held", fundsHeld, "held"],
                  ["Paid out", paid, "paid"],
                  [
                    isWithdrawal ? "Owner credit" : "Vendor proceeds",
                    vendorProceeds,
                    "vendor",
                  ],
                ].map(([label, value, key]) => (
                  <button
                    key={key}
                    type="button"
                    className="st-cell"
                    title="See exactly how this figure is calculated"
                    onClick={() => openDrawer("breakdown", { key })}
                  >
                    <span>{label}</span>
                    <strong className="pm-num">{money(value)}</strong>
                    <small
                      style={
                        (key === "allocated" && withdrawalStale) ||
                        (key === "vendor" && minor(vendorRemaining) > 0)
                          ? { color: "var(--warn)", fontWeight: 700 }
                          : undefined
                      }
                    >
                      {key === "allocated"
                        ? withdrawalStale
                          ? `${money(Math.abs(withdrawalDrift))} ${withdrawalDrift > 0 ? "more than" : "less than"} cleared funds`
                          : "matches cleared funds"
                        : key === "vendor"
                          ? `${money(vendorPaid)} paid · ${money(Math.max(0, vendorRemaining))} to pay`
                          : key === "received" && pendingReceipts > 0
                            ? `+ ${money(pendingReceipts)} pending`
                            : key === "paid" && refunded > 0
                              ? `incl. ${money(refunded)} refunded`
                              : " "}
                    </small>
                  </button>
                ))}
                <button
                  type="button"
                  className="st-cell wide"
                  title="See exactly how the residual is calculated"
                  onClick={() => openDrawer("breakdown", { key: "residual" })}
                  style={{
                    background: balanced ? "var(--good-bg)" : "var(--bad-bg)",
                  }}
                >
                  <span
                    style={{ color: balanced ? "var(--good)" : "var(--bad)" }}
                  >
                    Residual · must be zero to lock
                  </span>
                  <strong
                    className="pm-num"
                    style={{
                      fontSize: 17,
                      color: balanced ? "var(--good)" : "var(--bad)",
                    }}
                  >
                    {money(residual)}
                  </strong>
                  <small>
                    {balanced
                      ? "Balanced — every taka is accounted for"
                      : `Out of balance by ${money(Math.abs(residual))}`}
                  </small>
                </button>
              </div>

              {vendorMismatch && (
                <div className="st-notice">
                  <AlertTriangle size={15} />
                  <span>
                    Vendor proceeds {money(vendorProceeds)} no longer equal
                    price − fees − refund due ({money(derivedVendorProceeds)}).
                  </span>
                  {canPrepare &&
                    ["draft", "returned"].includes(settlement.status) && (
                    <Button size="sm" onClick={rebalanceSettlement}>
                      Rebalance
                    </Button>
                  )}
                </div>
              )}
              {withdrawalStale && (
                <div className="st-notice">
                  <AlertTriangle size={15} />
                  <span>
                    The statement allocates {money(withdrawalAllocated)} (owner
                    credit {money(vendorProceeds)} + refund due{" "}
                    {money(refundsDue)}
                    {deductions > 0 ? ` + fees ${money(deductions)}` : ""}) but
                    the buyer's cleared funds are {money(received)} — off by{" "}
                    {money(Math.abs(withdrawalDrift))}.
                    {minor(refunded) >= minor(refundsDue) && minor(withdrawalDrift) > 0
                      ? ` The buyer has already been refunded ${money(refunded)}, so re-prepare with an owner forfeit of ${money(Math.max(0, received - refunded))} to balance.`
                      : " Re-run Prepare withdrawal to recalculate from today's cleared funds."}
                  </span>
                  {canPrepare &&
                    ["draft", "returned"].includes(settlement.status) && (
                      <Button
                        size="sm"
                        onClick={() =>
                          openDrawer("withdrawal", {
                            buyer_party_id:
                              settlement.withdrawal_buyer_party_id ||
                              transactionParties.find(
                                (party) =>
                                  party.party_type === "buyer" &&
                                  party.status === "active",
                              )?.id ||
                              "",
                            withdrawal_date:
                              settlement.withdrawal_date ||
                              new Date().toISOString().slice(0, 10),
                            owner_deduction: Math.max(0, received - refunded),
                            company_deduction: deductions || 0,
                            reason: settlement.withdrawal_reason || "",
                          })
                        }
                      >
                        Re-prepare withdrawal
                      </Button>
                    )}
                </div>
              )}
              {settlement.status === "returned" && settlement.return_reason && (
                <div className="st-notice">
                  <RotateCcw size={15} />
                  <span>
                    Returned for correction: {settlement.return_reason}
                  </span>
                </div>
              )}
              {/* Visual 5-Stage Settlement Workflow Stepper */}
              <div style={{
                background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                border: "1px solid var(--line)",
                borderRadius: 14,
                padding: "14px 18px",
                marginBottom: 16,
                boxShadow: "0 2px 8px rgba(13,27,47,0.03)"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Scale size={18} style={{ color: "var(--cyan)" }} />
                    <span style={{ fontWeight: 800, fontSize: 14, color: "var(--ink)" }}>Settlement &amp; Trust Control Hub</span>
                    <Badge tone={settlement.status === 'locked' ? 'green' : settlement.status === 'approved' ? 'navy' : 'amber'}>
                      {title(settlement.status)}
                    </Badge>
                  </div>

                  {/* Fast Action Buttons */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {canAccounts && unreconciledPaymentCount > 0 && (
                      <Button
                        size="sm"
                        className="btn-primary"
                        icon={CheckCircle2}
                        onClick={quickReconcileAll}
                        title="Auto-reconcile all cleared trust receipts"
                      >
                        Quick Reconcile All ({unreconciledPaymentCount})
                      </Button>
                    )}
                    {canPrepare && ["draft", "returned"].includes(settlement.status) && (
                      <Button size="sm" variant="secondary" icon={RotateCcw} onClick={rebalanceSettlement}>
                        1-Click Rebalance
                      </Button>
                    )}
                  </div>
                </div>

                {/* Stepper Progress Steps */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
                  {SETTLEMENT_STAGES.map(([stKey, stLabel], idx) => {
                    const isCurrent = settlement.status === stKey;
                    const isPast = SETTLEMENT_STAGES.findIndex(([k]) => k === settlement.status) > idx;
                    return (
                      <div key={stKey} style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: isCurrent ? "var(--cyan-weak)" : isPast ? "#f0fdf4" : "var(--surface-3)",
                        border: isCurrent ? "1.5px solid var(--cyan)" : isPast ? "1px solid #bbf7d0" : "1px solid var(--line-soft)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                      }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%",
                          background: isCurrent ? "var(--cyan)" : isPast ? "#16a34a" : "#cbd5e1",
                          color: "#ffffff", fontSize: 11, fontWeight: 800,
                          display: "grid", placeItems: "center"
                        }}>
                          {isPast ? "✓" : idx + 1}
                        </div>
                        <div style={{ fontSize: 11.5, fontWeight: isCurrent ? 800 : 600, color: isCurrent ? "var(--navy)" : isPast ? "#15803d" : "var(--muted)" }}>
                          {stLabel}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="st-layout">
                <div className="st-stack">
                  <div
                    className="pm-segment"
                    style={{ alignSelf: "flex-start", flexWrap: "wrap" }}
                  >
                    {[
                      ["statement", "Statement", Scale],
                      [
                        "funds",
                        `Trust account${pendingPaymentCount > 0 ? ` · ${pendingPaymentCount} pending` : unreconciledPaymentCount > 0 ? ` · ${unreconciledPaymentCount}` : ""}`,
                        WalletCards,
                      ],
                      ["payouts", "Payouts", Banknote],
                      ["audit", "Audit trail", FileText],
                    ].map(([key, label, Icon]) => (
                      <button
                        key={key}
                        className={settleTab === key ? "on" : ""}
                        onClick={() => setSettleTab(key)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Icon size={14} /> {label}
                      </button>
                    ))}
                  </div>

                  {settleTab === "statement" && (
                    <Panel
                      icon={Scale}
                      heading="Settlement statement"
                      sub="Where the purchase price goes — fees, refunds and vendor proceeds"
                      action={
                        canPrepare &&
                        !transactionCancelled &&
                        ["draft", "returned"].includes(settlement.status) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Edit}
                            onClick={() =>
                              openDrawer("lines", {
                                lines: lines.map((line) => ({ ...line })),
                              })
                            }
                          >
                            Edit line items
                          </Button>
                        )
                      }
                    >
                      {lines.length ? (
                        <DataTable
                          columns={[
                            {
                              key: "type",
                              header: "Type",
                              render: (row) => title(row.line_type || row.type),
                            },
                            {
                              key: "description",
                              header: "Description",
                              render: (row) =>
                                row.description || row.label || "—",
                            },
                            {
                              key: "amount",
                              header: "Amount",
                              render: (row) => (
                                <span className="pm-num">
                                  {money(row.amount)}
                                </span>
                              ),
                            },
                            {
                              key: "running",
                              header: "Running balance",
                              render: (row) => (
                                <strong className="pm-num">
                                  {money(row.running_balance)}
                                </strong>
                              ),
                            },
                          ]}
                          rows={linesWithBalance}
                        />
                      ) : (
                        <Empty
                          icon={Scale}
                          heading="No statement lines"
                          text="The statement is built from the accepted price and the agency agreement."
                        />
                      )}
                      <div className="cell-sub" style={{ marginTop: 10 }}>
                        Vendor proceeds stay auto-balanced to price − fees −
                        refund due. Tap any figure in the strip above to see its
                        exact source rows.
                      </div>
                    </Panel>
                  )}

                  {settleTab === "funds" && (
                    <>
                    <Panel
                      icon={WalletCards}
                      heading="Trust account"
                      sub="The owner's trust account — every receipt in and payment out, with proof and bank reconciliation"
                      action={
                        <div
                          style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                        >
                          {pendingPaymentCount > 0 ? (
                            <Badge tone="amber">
                              {pendingPaymentCount} pending
                            </Badge>
                          ) : unreconciledPaymentCount > 0 ? (
                            <>
                              <Badge tone="amber">
                                {unreconciledPaymentCount} to reconcile
                              </Badge>
                              {canAccounts && (
                                <Button
                                  size="sm"
                                  className="btn-primary"
                                  icon={CheckCircle2}
                                  onClick={quickReconcileAll}
                                  title="Auto-reconcile all cleared trust receipts"
                                >
                                  Quick Reconcile All ({unreconciledPaymentCount})
                                </Button>
                              )}
                            </>
                          ) : payments.length ? (
                            <Badge tone="green">All reconciled</Badge>
                          ) : null}
                          {canAccounts && (
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={ShieldCheck}
                              onClick={() => openDrawer("accounting", { ...profile })}
                            >
                              Accounting setup
                            </Button>
                          )}
                          {canAccounts && settlement.status !== "locked" && !transactionCancelled && (
                            <Button
                              size="sm"
                              icon={Receipt}
                              onClick={() =>
                                openDrawer("payment", {
                                  direction: "incoming",
                                  lock_direction: true,
                                  payment_kind: "buyer_receipt",
                                  transaction_party_id:
                                    transactionParties.find(
                                      (party) =>
                                        party.party_type === "buyer" &&
                                        party.status === "active",
                                    )?.id || "",
                                  payment_at: new Date()
                                    .toISOString()
                                    .slice(0, 16),
                                  value_date: new Date()
                                    .toISOString()
                                    .slice(0, 10),
                                  amount: "",
                                  method: "bank_transfer",
                                  from_account_name: "",
                                  from_account_number: "",
                                  to_account_name: "",
                                  to_account_number: "",
                                  reference: "",
                                  proof_url: "",
                                  status: "pending",
                                  idempotency_key: `receipt-${settlement.id}-${Date.now()}`,
                                })
                              }
                            >
                              Add receipt
                            </Button>
                          )}
                          {canAccounts && settlement.status !== "locked" && !transactionCancelled && (
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={Banknote}
                              onClick={() =>
                                openDrawer("payment", {
                                  direction: "outgoing",
                                  lock_direction: true,
                                  payment_kind: "vendor_payout",
                                  transaction_party_id:
                                    transactionParties.find(
                                      (party) =>
                                        party.party_type === "vendor" &&
                                        party.status === "active",
                                    )?.id || "",
                                  payment_at: new Date()
                                    .toISOString()
                                    .slice(0, 16),
                                  value_date: new Date()
                                    .toISOString()
                                    .slice(0, 10),
                                  amount: "",
                                  method: "bank_transfer",
                                  from_account_name: "",
                                  from_account_number: "",
                                  to_account_name: "",
                                  to_account_number: "",
                                  reference: "",
                                  proof_url: "",
                                  status: "pending",
                                  idempotency_key: `payment-${settlement.id}-${Date.now()}`,
                                })
                              }
                            >
                              Add payment
                            </Button>
                          )}
                        </div>
                      }
                    >
                      {payments.length ? (
                        <DataTable
                          columns={[
                            {
                              key: "direction",
                              header: "Direction",
                              render: (row) => (
                                <StatusBadge
                                  status={row.direction || row.payment_type}
                                />
                              ),
                            },
                            {
                              key: "party",
                              header: "Type / party",
                              render: (row) => {
                                const party = transactionParties.find(
                                  (item) =>
                                    Number(item.id) ===
                                    Number(row.transaction_party_id),
                                );
                                return (
                                  <div>
                                    {row.reversal_of_payment_id
                                      ? `Reversal of #${row.reversal_of_payment_id}`
                                      : title(row.payment_kind || "adjustment")}
                                    <div className="cell-sub">
                                      {party
                                        ? PartyName({ party })
                                        : row.payment_kind === "agency_fee"
                                          ? "Seventh Sky (agency)"
                                          : row.counterparty_name
                                            ? `${row.counterparty_name}${row.counterparty_phone ? ` · ${row.counterparty_phone}` : ""}`
                                            : "Unallocated"}
                                    </div>
                                    {reversedPaymentIds.has(Number(row.id)) && (
                                      <div
                                        className="cell-sub"
                                        style={{ color: "var(--bad)" }}
                                      >
                                        Reversed
                                        {row.reversal_reason
                                          ? ` — ${row.reversal_reason}`
                                          : ""}
                                      </div>
                                    )}
                                  </div>
                                );
                              },
                            },
                            {
                              key: "date",
                              header: "Date / time",
                              render: (row) =>
                                dateTime(
                                  row.payment_at ||
                                    row.occurred_at ||
                                    row.paid_at ||
                                    row.created_at,
                                ),
                            },
                            {
                              key: "amount",
                              header: "Amount",
                              render: (row) => (
                                <strong className="pm-num">
                                  {money(row.amount)}
                                </strong>
                              ),
                            },
                            {
                              key: "reference",
                              header: "Reference / proof",
                              render: (row) => (
                                <div>
                                  {row.reference || "—"}
                                  {row.proof_url && (
                                    <div>
                                      <a
                                        className="pm-link"
                                        href={fileSrc(row.proof_url)}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        <ExternalLink size={12} /> Proof
                                      </a>
                                    </div>
                                  )}
                                </div>
                              ),
                            },
                            {
                              key: "status",
                              header: "Status / reconciliation",
                              render: (row) => (
                                <div>
                                  <StatusBadge status={row.status} />
                                  <div
                                    className="cell-sub"
                                    style={{ marginTop: 3 }}
                                  >
                                    {title(
                                      row.reconciliation_status ||
                                        "unreconciled",
                                    )}
                                  </div>
                                  {row.statement_url && (
                                    <a
                                      className="pm-link"
                                      href={fileSrc(row.statement_url)}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <FileCheck2 size={12} /> Bank statement
                                    </a>
                                  )}
                                </div>
                              ),
                            },
                            {
                              key: "action",
                              header: "",
                              render: (row) => (
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 4,
                                    flexDirection: "column",
                                    alignItems: "flex-start",
                                  }}
                                >
                                  {canAccounts &&
                                    ["cleared", "reversed"].includes(
                                      row.status,
                                    ) &&
                                    row.reconciliation_status !==
                                      "reconciled" && (
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          openDrawer("reconcile", {
                                            id: row.id,
                                            reference: row.reference,
                                            direction: row.direction,
                                            amount: row.amount,
                                            payment_at: row.payment_at,
                                            reconciliation_status:
                                              "reconciled",
                                            statement_url:
                                              row.statement_url || "",
                                            note:
                                              row.reconciliation_note || "",
                                          })
                                        }
                                      >
                                        <ClipboardCheck size={13} /> Reconcile
                                      </Button>
                                    )}
                                  {canAccounts && row.status === "pending" && (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => clearPayment(row)}
                                      >
                                        <CheckCircle2 size={13} /> Clear
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => rejectPayment(row)}
                                      >
                                        Reject
                                      </Button>
                                    </>
                                  )}
                                  {canAccounts &&
                                    ["cleared", "reversed"].includes(row.status) &&
                                    !row.journal_entry_id &&
                                    row.direction === "incoming" && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => postPayment(row)}
                                      >
                                        Post ledger
                                      </Button>
                                    )}
                                  {canAccounts &&
                                    row.status === "cleared" &&
                                    !row.reversal_of_payment_id && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => reversePayment(row)}
                                      >
                                        <RotateCcw size={13} /> Reverse
                                      </Button>
                                    )}
                                </div>
                              ),
                            },
                          ]}
                          rows={payments}
                        />
                      ) : (
                        <Empty
                          icon={Receipt}
                          heading="Trust account is empty"
                          text="Add the buyer's receipts (money in) with proof, then reconcile them against the bank statement. Payments out are added here after approval."
                        />
                      )}
                    </Panel>

                    <Panel
                      icon={Link2}
                      heading="Buyer funding requests"
                      sub="Request a deposit, balance or top-up and link the resulting receipt"
                      action={
                        canPrepare && settlement.status !== "locked" && !transactionCancelled ? (
                          <Button
                            size="sm"
                            icon={Plus}
                            onClick={() =>
                              openDrawer("funding-request", {
                                transaction_party_id:
                                  transactionParties.find(
                                    (party) =>
                                      party.party_type === "buyer" &&
                                      party.status === "active",
                                  )?.id || "",
                                request_type: "balance",
                                provider: "manual_bank",
                                amount: Math.max(
                                  0,
                                  number(summary.outgoing_obligations) -
                                    received -
                                    pendingReceipts,
                                ),
                                expires_at: "",
                                idempotency_key: `funding-${settlement.id}-${Date.now()}`,
                              })
                            }
                          >
                            Request funds
                          </Button>
                        ) : null
                      }
                    >
                      {fundingRequests.length ? (
                        <DataTable
                          columns={[
                            {
                              key: "buyer",
                              header: "Buyer",
                              render: (row) => {
                                const party = transactionParties.find(
                                  (item) => Number(item.id) === Number(row.transaction_party_id),
                                );
                                return party ? PartyName({ party }) : `Party #${row.transaction_party_id}`;
                              },
                            },
                            {
                              key: "request",
                              header: "Request",
                              render: (row) => (
                                <div>
                                  {title(row.request_type)}
                                  <div className="cell-sub">{title(row.provider)}</div>
                                </div>
                              ),
                            },
                            {
                              key: "amount",
                              header: "Amount",
                              render: (row) => <strong className="pm-num">{money(row.amount)}</strong>,
                            },
                            {
                              key: "status",
                              header: "Status",
                              render: (row) => <StatusBadge status={row.status} />,
                            },
                            {
                              key: "action",
                              header: "",
                              render: (row) => {
                                if (!["draft", "failed"].includes(row.status)) return null;
                                if (row.provider === "sslcommerz" && canPrepare) {
                                  return (
                                    <Button size="sm" onClick={() => initiateFundingRequest(row)}>
                                      Open payment page
                                    </Button>
                                  );
                                }
                                if (row.provider === "manual_bank" && canAccounts) {
                                  return (
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        openDrawer("payment", {
                                          direction: "incoming",
                                          lock_direction: true,
                                          payment_kind: "buyer_receipt",
                                          transaction_party_id: row.transaction_party_id,
                                          funding_request_id: row.id,
                                          amount: row.amount,
                                          payment_at: new Date().toISOString().slice(0, 16),
                                          value_date: new Date().toISOString().slice(0, 10),
                                          method: "bank_transfer",
                                          status: "pending",
                                          reference: row.provider_reference || "",
                                          idempotency_key: `funding-payment-${row.id}`,
                                        })
                                      }
                                    >
                                      Record receipt
                                    </Button>
                                  );
                                }
                                return null;
                              },
                            },
                          ]}
                          rows={fundingRequests}
                        />
                      ) : (
                        <Empty
                          icon={Link2}
                          heading="No funding requests"
                          text="Create a request when the buyer needs bank-transfer instructions or an SSLCommerz payment page."
                        />
                      )}
                    </Panel>

                    <Panel
                      icon={FileCheck2}
                      heading="Trust-bank statement lines"
                      sub="Import each signed bank movement before matching it to a payment"
                      action={
                        canAccounts && settlement.status !== "locked" ? (
                          <Button
                            size="sm"
                            icon={Plus}
                            onClick={() =>
                              openDrawer("bank-line", {
                                date: new Date().toISOString().slice(0, 10),
                                amount: "",
                                description: "",
                                reference: "",
                              })
                            }
                          >
                            Import line
                          </Button>
                        ) : null
                      }
                    >
                      {bankLines.length ? (
                        <DataTable
                          columns={[
                            { key: "date", header: "Date", render: (row) => dateOnly(row.date) },
                            {
                              key: "description",
                              header: "Description / reference",
                              render: (row) => (
                                <div>
                                  {row.description || "—"}
                                  <div className="cell-sub">{row.reference || "No reference"}</div>
                                </div>
                              ),
                            },
                            {
                              key: "amount",
                              header: "Signed amount",
                              render: (row) => (
                                <strong
                                  className="pm-num"
                                  style={{ color: number(row.amount) < 0 ? "var(--bad)" : "var(--good)" }}
                                >
                                  {money(row.amount)}
                                </strong>
                              ),
                            },
                            { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
                          ]}
                          rows={bankLines}
                        />
                      ) : (
                        <Empty
                          icon={FileCheck2}
                          heading="No bank lines imported"
                          text={
                            profile.trust_bank_account_id
                              ? "Import the relevant trust-bank movements, then reconcile receipts and payouts against them."
                              : "Configure the physical trust bank account in the sales profile first."
                          }
                        />
                      )}
                    </Panel>

                    <Panel
                      icon={WalletCards}
                      heading="Beneficiary trust ledgers"
                      sub="Virtual balances inside the shared physical trust account"
                    >
                      {array(trust.accounts).length ? (
                        <>
                          <DataTable
                            columns={[
                              {
                                key: "beneficiary",
                                header: "Beneficiary",
                                render: (row) => (
                                  <div>
                                    {title(row.account_type)}
                                    <div className="cell-sub">{row.beneficiary_key}</div>
                                  </div>
                                ),
                              },
                              { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
                              {
                                key: "balance",
                                header: "Balance",
                                render: (row) => (
                                  <strong
                                    className="pm-num"
                                    style={{ color: minor(row.balance) === 0 ? "var(--good)" : "var(--ink)" }}
                                  >
                                    {money(row.balance)}
                                  </strong>
                                ),
                              },
                            ]}
                            rows={array(trust.accounts)}
                          />
                          <div className="between" style={{ marginTop: 12, fontWeight: 800 }}>
                            <span>Virtual-ledger total</span>
                            <span className="pm-num">{money(trust.total_balance)}</span>
                          </div>
                        </>
                      ) : (
                        <Empty
                          icon={WalletCards}
                          heading="Trust allocations not created yet"
                          text="Approval allocates the clearing balance across vendor, buyer, agency and third-party beneficiary ledgers."
                        />
                      )}
                    </Panel>
                    </>
                  )}

                  {settleTab === "payouts" && (
                    <>
                      {!transactionCancelled &&
                        settlement.status !== "approved" &&
                        settlement.status !== "locked" && (
                          <div className="st-notice">
                            <Lock size={15} />
                            <span>
                              Payouts can be prepared now, but money can only
                              leave the trust account after the settlement is
                              approved.
                            </span>
                          </div>
                        )}
                      {/* What is still owed out of the trust account, from the
                          same figures as the summary strip. */}
                      <div className="st-summary">
                        {[
                          ["Funds held", fundsHeld, null],
                          [
                            isWithdrawal
                              ? "Owner credit to pay"
                              : "Vendor proceeds to pay",
                            Math.max(0, vendorRemaining),
                            "vendor",
                          ],
                          [
                            "Refund to pay",
                            Math.max(0, refundRemaining),
                            "refund_due",
                          ],
                          !isWithdrawal
                            ? [
                                "Agency fees to pay",
                                Math.max(
                                  0,
                                  number((deductions - agencyPaid).toFixed(2)),
                                ),
                                "fees",
                              ]
                            : null,
                        ]
                          .filter(Boolean)
                          .map(([label, value, key]) => (
                            <button
                              key={label}
                              type="button"
                              className="st-cell"
                              onClick={() =>
                                key
                                  ? openDrawer("breakdown", { key })
                                  : undefined
                              }
                            >
                              <span>{label}</span>
                              <strong className="pm-num">{money(value)}</strong>
                              <small> </small>
                            </button>
                          ))}
                      </div>
                      {(() => {
                        const pendingTotal = disbursements
                          .filter((item) => !["paid", "cancelled"].includes(item.status))
                          .reduce((sum, item) => sum + number(item.amount), 0);
                        return minor(pendingTotal) > minor(fundsHeld) ? (
                          <div className="st-notice st-notice-error">
                            <AlertTriangle size={15} />
                            <span>
                              Pending payouts total {money(pendingTotal)} but
                              only {money(fundsHeld)} is held in the trust
                              account — they can never all be paid. Cancel or
                              reduce a payout.
                            </span>
                          </div>
                        ) : null;
                      })()}
                      <Panel
                        icon={ShieldCheck}
                        heading="Verified payout accounts"
                        sub="Recipient accounts must be independently verified before a payout is prepared"
                        action={
                          canAccounts ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={Plus}
                              onClick={() =>
                                openDrawer("party-bank-account", {
                                  transaction_party_id: "",
                                  contact_id: "",
                                  bank_name: "",
                                  bank_branch: "",
                                  account_name: "",
                                  account_number: "",
                                  routing_number: "",
                                  is_primary: true,
                                })
                              }
                            >
                              Add recipient account
                            </Button>
                          ) : null
                        }
                      >
                        {partyBankAccounts.length ? (
                          <DataTable
                            columns={[
                              {
                                key: "recipient",
                                header: "Recipient",
                                render: (row) => {
                                  const party = transactionParties.find(
                                    (item) => Number(item.contact_id) === Number(row.contact_id),
                                  );
                                  return (
                                    <div>
                                      {party ? PartyName({ party }) : row.account_name}
                                      <div className="cell-sub">{title(row.role_type)}</div>
                                    </div>
                                  );
                                },
                              },
                              {
                                key: "account",
                                header: "Bank account",
                                render: (row) => (
                                  <div>
                                    {row.bank_name}
                                    <div className="cell-sub">
                                      {row.account_name} · {row.masked_account_number || row.account_number}
                                    </div>
                                  </div>
                                ),
                              },
                              { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
                              {
                                key: "action",
                                header: "",
                                render: (row) =>
                                  canAccounts && row.status === "pending" ? (
                                    Number(row.created_by) === Number(user?.id) ? (
                                      <span className="cell-sub">Second accounts user required</span>
                                    ) : (
                                    <div style={{ display: "flex", gap: 4 }}>
                                      <Button size="sm" onClick={() => verifyPartyBankAccount(row, "verify")}>Verify</Button>
                                      <Button size="sm" variant="ghost" onClick={() => verifyPartyBankAccount(row, "reject")}>Reject</Button>
                                    </div>
                                    )
                                  ) : null,
                              },
                            ]}
                            rows={partyBankAccounts}
                          />
                        ) : (
                          <Empty
                            icon={ShieldCheck}
                            heading="No recipient accounts"
                            text="Add and verify vendor, buyer-refund or third-party bank details before preparing payouts."
                          />
                        )}
                      </Panel>
                      <Panel
                        icon={Banknote}
                        heading="Payouts"
                        sub="Vendor proceeds, agency fees and third-party payments with evidence"
                        action={
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            {canPrepare &&
                              !transactionCancelled &&
                              ["draft", "returned"].includes(
                                settlement.status,
                              ) &&
                              !completionConversionBlocked && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  openDrawer("withdrawal", {
                                    buyer_party_id:
                                      transactionParties.find(
                                        (party) =>
                                          party.party_type === "buyer" &&
                                          party.status === "active",
                                      )?.id || "",
                                    withdrawal_date: new Date()
                                      .toISOString()
                                      .slice(0, 10),
                                    owner_deduction: 0,
                                    company_deduction: 0,
                                    reason: "",
                                  })
                                }
                              >
                                Buyer withdrawal / refund
                              </Button>
                            )}
                            {canAccounts &&
                              !transactionCancelled &&
                              ["draft", "returned"].includes(
                                settlement.status,
                              ) && (
                              <Button
                                size="sm"
                                icon={Banknote}
                                onClick={() =>
                                  openDrawer("disbursement", {
                                    settlement_line_id: "",
                                    payee_type: "vendor",
                                    transaction_party_id: "",
                                    party_bank_account_id: "",
                                    destination_bank_account_id:
                                      profile.agency_bank_account_id || "",
                                    payout_method: "manual_bank",
                                    source_payment_id: "",
                                    amount: "",
                                    reference: "",
                                    proof_url: "",
                                  })
                                }
                              >
                                Create payout
                              </Button>
                            )}
                          </div>
                        }
                      >
                        {disbursements.length ? (
                          <DataTable
                            columns={[
                              {
                                key: "payee",
                                header: "Payee",
                                render: (row) => (
                                  <div>
                                    {PartyName({
                                      party:
                                        transactionParties.find(
                                          (party) =>
                                            party.id ===
                                            row.transaction_party_id,
                                        ) || row,
                                    })}
                                    <div className="cell-sub">
                                      {title(row.payee_type)}
                                    </div>
                                  </div>
                                ),
                              },
                              {
                                key: "destination",
                                header: "Destination account",
                                render: (row) => (
                                  <div>
                                    {row.bank_name || "—"}
                                    <div className="cell-sub">
                                      {[
                                        row.bank_account_name,
                                        row.bank_account_number,
                                      ]
                                        .filter(Boolean)
                                        .join(" · ") || "Account not set"}
                                    </div>
                                  </div>
                                ),
                              },
                              {
                                key: "date",
                                header: "Date",
                                render: (row) =>
                                  dateTime(row.paid_at || row.created_at),
                              },
                              {
                                key: "amount",
                                header: "Amount",
                                render: (row) => (
                                  <strong className="pm-num">
                                    {money(row.amount)}
                                  </strong>
                                ),
                              },
                              {
                                key: "reference",
                                header: "Reference / proof",
                                render: (row) => (
                                  <div>
                                    {row.reference || "—"}
                                    {row.proof_url && (
                                      <div>
                                        <a
                                          className="pm-link"
                                          href={fileSrc(row.proof_url)}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          <ExternalLink size={12} /> Proof
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                ),
                              },
                              {
                                key: "status",
                                header: "Status",
                                render: (row) => (
                                  <StatusBadge status={row.status} />
                                ),
                              },
                              {
                                key: "action",
                                header: "",
                                render: (row) => {
                                  if (!canAccounts || ["paid", "cancelled"].includes(row.status))
                                    return null;
                                  return (
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: 4,
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      {settlement.status === "approved" &&
                                        ["prepared", "pending", "failed"].includes(row.status) && (
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            openDrawer("submit-disbursement", {
                                              ...row,
                                              reference: row.reference || row.provider_reference || "",
                                              idempotency_key: `payout-${row.id}-attempt-${number(row.attempt_count) + 1}`,
                                            })
                                          }
                                        >
                                          {row.status === "failed" ? "Retry" : "Submit"}
                                        </Button>
                                      )}
                                      {settlement.status === "approved" &&
                                        ["prepared", "pending", "submitted", "processing", "failed"].includes(row.status) && (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={() =>
                                            openDrawer("pay-disbursement", {
                                              ...row,
                                              payment_id: "",
                                            })
                                          }
                                        >
                                          Allocate payment
                                        </Button>
                                      )}
                                      {settlement.status === "approved" &&
                                        ["prepared", "submitted", "failed"].includes(row.status) && (
                                        <Button size="sm" variant="ghost" onClick={() => recordOutgoingPaymentFor(row)}>
                                          Record bank payment
                                        </Button>
                                      )}
                                      {row.status === "processing" && row.payout_method === "sslcommerz_refund" && (
                                        <Button size="sm" variant="ghost" onClick={() => syncDisbursement(row)}>
                                          Sync refund
                                        </Button>
                                      )}
                                      {["submitted", "processing"].includes(row.status) && (
                                        <Button size="sm" variant="ghost" onClick={() => failDisbursement(row)}>
                                          Mark failed
                                        </Button>
                                      )}
                                      {["draft", "returned"].includes(
                                        settlement.status,
                                      ) &&
                                        !transactionCancelled && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() =>
                                            cancelDisbursement(row)
                                          }
                                        >
                                          Cancel
                                        </Button>
                                      )}
                                    </div>
                                  );
                                },
                              },
                            ]}
                            rows={disbursements}
                          />
                        ) : (
                          <Empty
                            icon={Banknote}
                            heading="No payouts yet"
                            text="Create the vendor, agency-fee and third-party payouts from the statement."
                          />
                        )}
                      </Panel>
                    </>
                  )}

                  {settleTab === "audit" && (
                    <>
                      <Panel
                        icon={FileText}
                        heading="Trust account statement"
                        sub="Every movement in order with the running client-funds balance"
                      >
                        {statement?.entries?.length ? (
                          <>
                            <DataTable
                              columns={[
                                {
                                  key: "date",
                                  header: "Date",
                                  render: (row) => dateTime(row.date),
                                },
                                {
                                  key: "entry",
                                  header: "Entry",
                                  render: (row) => (
                                    <div>
                                      <strong>{title(row.entry_kind)}</strong>
                                      <div className="cell-sub">
                                        {row.reference || "—"}
                                        {row.party ? ` · ${row.party}` : ""}
                                      </div>
                                      {row.entry_kind === "reversal" && (
                                        <div
                                          className="cell-sub"
                                          style={{ color: "var(--bad)" }}
                                        >
                                          {row.description}
                                        </div>
                                      )}
                                      {row.disbursement && (
                                        <div className="cell-sub">
                                          Pays{" "}
                                          {title(row.disbursement.payee_type)}{" "}
                                          payout{" "}
                                          {row.disbursement.reference ||
                                            `#${row.disbursement.id}`}
                                        </div>
                                      )}
                                    </div>
                                  ),
                                },
                                {
                                  key: "in",
                                  header: "In",
                                  render: (row) =>
                                    row.amount_in ? (
                                      <span className="pm-money pm-num">
                                        {money(row.amount_in)}
                                      </span>
                                    ) : (
                                      <span className="cell-sub">—</span>
                                    ),
                                },
                                {
                                  key: "out",
                                  header: "Out",
                                  render: (row) =>
                                    row.amount_out ? (
                                      <span className="pm-money-out pm-num">
                                        {money(row.amount_out)}
                                      </span>
                                    ) : (
                                      <span className="cell-sub">—</span>
                                    ),
                                },
                                {
                                  key: "balance",
                                  header: "Balance",
                                  render: (row) =>
                                    row.moves_funds ? (
                                      <strong className="pm-num">
                                        {money(row.running_balance)}
                                      </strong>
                                    ) : (
                                      <span className="cell-sub">
                                        {title(row.status)}
                                      </span>
                                    ),
                                },
                                {
                                  key: "recon",
                                  header: "Reconciliation",
                                  render: (row) => (
                                    <div>
                                      <StatusBadge
                                        status={row.reconciliation_status}
                                      />
                                      {row.statement_url && (
                                        <div>
                                          <a
                                            className="pm-link"
                                            href={fileSrc(row.statement_url)}
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            <FileCheck2 size={12} /> Statement
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  ),
                                },
                              ]}
                              rows={statement.entries}
                            />
                            <div
                              style={{
                                display: "flex",
                                gap: 24,
                                flexWrap: "wrap",
                                marginTop: 12,
                                padding: "10px 12px",
                                borderRadius: 10,
                                background: "var(--surface-2)",
                                fontSize: 13,
                              }}
                            >
                              <span>
                                Opening{" "}
                                <strong className="pm-num">
                                  {money(statement.opening_balance)}
                                </strong>
                              </span>
                              <span>
                                In{" "}
                                <strong className="pm-money pm-num">
                                  {money(statement.totals?.cleared_in)}
                                </strong>
                              </span>
                              <span>
                                Out{" "}
                                <strong className="pm-money-out pm-num">
                                  {money(statement.totals?.cleared_out)}
                                </strong>
                              </span>
                              <span>
                                Closing{" "}
                                <strong className="pm-num">
                                  {money(statement.closing_balance)}
                                </strong>
                              </span>
                              <span>
                                Unreconciled{" "}
                                <strong>
                                  {statement.totals?.unreconciled_count ?? 0}
                                </strong>
                              </span>
                            </div>
                          </>
                        ) : (
                          <Empty
                            icon={FileText}
                            heading="No statement entries yet"
                            text="Entries appear as receipts, refunds, payouts and reversals are recorded."
                          />
                        )}
                      </Panel>
                      {array(statement?.approvals).length > 0 && (
                        <Panel
                          icon={CheckCircle2}
                          heading="Approval history"
                          sub="Who moved this settlement, when, and why"
                        >
                          <div className="st-history">
                            {array(statement?.approvals).map((row) => (
                              <div className="st-history-row" key={row.id}>
                                <span className="st-history-dot" />
                                <div>
                                  <strong>
                                    {title(row.action)} ·{" "}
                                    {title(row.from_status)} →{" "}
                                    {title(row.to_status)}
                                  </strong>
                                  {row.reason && <span>{row.reason}</span>}
                                </div>
                                <time>{dateTime(row.created_at)}</time>
                              </div>
                            ))}
                          </div>
                        </Panel>
                      )}
                    </>
                  )}
                </div>

                {/* ── Right rail: where we are + the one next step ── */}
                <div className="st-rail">
                  <div className="pm-eyebrow">Settlement process</div>
                  <h3>
                    {transactionCancelled
                      ? "Cancelled"
                      : settlement.status === "returned"
                        ? "Returned — fix and resubmit"
                        : title(settlement.status)}
                  </h3>
                  <div className="st-stages">
                    {SETTLEMENT_STAGES.map(([stage, label], index) => {
                      const currentIndex = SETTLEMENT_STAGES.findIndex(
                        ([key]) =>
                          key ===
                          (settlement.status === "returned"
                            ? "draft"
                            : settlement.status),
                      );
                      const state =
                        index < currentIndex
                          ? "done"
                          : index === currentIndex
                            ? "current"
                            : "todo";
                      return (
                        <div className={`st-stage ${state}`} key={stage}>
                          <i />
                          <span>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p>
                    {transactionCancelled
                      ? "This transaction was cancelled and its records are read-only. Accept a new offer to start a fresh settlement cycle."
                      : SETTLEMENT_GUIDE[settlement.status] || ""}
                  </p>
                  {!transactionCancelled && blockers.length > 0 && settlement.status !== "locked" && (
                    <div className="st-blockers">
                      {blockers.map((blocker) => (
                        <div className="st-blocker" key={String(blocker)}>
                          <AlertTriangle size={13} />
                          <span>
                            {blockerText(blocker)}
                            {String(blocker) ===
                              "settlement_residual_nonzero" &&
                              ` (${money(residual)})`}
                            {String(blocker) ===
                              "outgoing_obligations_unpaid" &&
                              ` (${money(unpaidObligations)})`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {!transactionCancelled &&
                    SETTLEMENT_NEXT[settlement.status] &&
                    ((SETTLEMENT_NEXT[settlement.status].action === "submit" &&
                      canPrepare) ||
                      (SETTLEMENT_NEXT[settlement.status].action === "review" &&
                        canAccounts) ||
                      (["approve", "lock"].includes(
                        SETTLEMENT_NEXT[settlement.status].action,
                      ) && canAdmin)) && (
                    <button
                      type="button"
                      className="st-rail-btn"
                      disabled={
                        saving ||
                        (settlement.status === "approved" && blockers.length > 0)
                      }
                      onClick={() =>
                        settlementAction(
                          SETTLEMENT_NEXT[settlement.status].action,
                        )
                      }
                    >
                      {SETTLEMENT_NEXT[settlement.status].label}
                    </button>
                  )}
                  {!transactionCancelled &&
                    canAccounts &&
                    ["submitted", "reviewed", "approved"].includes(
                      settlement.status,
                    ) && (
                    <button
                      type="button"
                      className="st-rail-ghost"
                      onClick={() => openDrawer("return", { reason: "" })}
                    >
                      Return to draft
                    </button>
                  )}
                  {!transactionCancelled &&
                    canPrepare &&
                    zeroFunds &&
                    ["draft", "returned"].includes(settlement.status) && (
                      <button
                        type="button"
                        className="st-rail-ghost"
                        onClick={() =>
                          openDrawer("cancel-transaction", { reason: "" })
                        }
                      >
                        Cancel — offer withdrawn
                      </button>
                    )}
                  {(() => {
                    if (transactionCancelled) return null;
                    const next = SETTLEMENT_NEXT[settlement.status]?.action;
                    const mine = (value) =>
                      value != null && Number(value) === Number(user?.id);
                    const conflict =
                      (next === "review" && mine(settlement.prepared_by)) ||
                      (["approve", "lock"].includes(next) &&
                        (mine(settlement.prepared_by) ||
                          mine(settlement.reviewed_by)));
                    return conflict ? (
                      <div className="st-blocker" style={{ marginTop: 12 }}>
                        <ShieldCheck size={13} />
                        <span>
                          You{" "}
                          {next === "review"
                            ? "prepared this settlement"
                            : "already acted on this settlement"}
                          , so this step needs a different user. Clicking the
                          button will offer the super-admin override with a
                          written reason.
                        </span>
                      </div>
                    ) : null;
                  })()}
                  <div className="st-note">
                    <ShieldCheck size={14} />
                    <span>
                      Separation of duties: preparer, reviewer and approver
                      must be different users. Every action is recorded on the
                      audit trail.
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {section === "onboarding" && (
        <div className="pm-main">
          <Panel
            icon={ClipboardCheck}
            heading="Sales onboarding"
            sub="Profile, terms, assessment and compliance"
          >
            <OnboardingRow
              label="Sales profile / fee terms"
              status={
                profile.status ||
                (Object.keys(profile).length ? "completed" : "pending")
              }
              actionLabel="Edit"
              onAction={canPrepare ? () => openDrawer("profile", { ...profile }) : null}
            />
            <OnboardingRow
              label="Assessment"
              status={assessmentStatus}
              actionLabel="Open workspace"
              onAction={() => openSection("assessment")}
            />
            <OnboardingRow
              label="Compliance"
              status={complianceStatus}
              actionLabel="Update"
              onAction={canPrepare ? () => openDrawer("profile", { ...profile }) : null}
            />
            <OnboardingRow
              label="Agreement"
              status={agreementStatus}
              actionLabel="Manage"
              onAction={() =>
                navigate(
                  `/role-onboarding?property_id=${propertyId}&sales_roles=1${vendorRoleProfile ? `&profile_id=${vendorRoleProfile.id}` : ""}`,
                )
              }
            />
            <OnboardingRow
              label={`KYC${salesRoleProfiles.length ? ` (${salesRoleProfiles.length} parties)` : ""}`}
              status={kycStatus}
              actionLabel={kycStatus === "complete" ? "Review" : "Complete / review"}
              onAction={() =>
                navigate(
                  `/role-onboarding?property_id=${propertyId}&sales_roles=1${pendingKycProfile ? `&profile_id=${pendingKycProfile.id}` : ""}`,
                )
              }
            />
            {salesRoleProfiles.some(
              (role) => role.kyc_status !== "complete",
            ) && (
              <div
                className="cell-sub"
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginTop: 10,
                  padding: "9px 12px",
                  borderRadius: 10,
                  background: "var(--cyan-weak)",
                }}
              >
                <span style={{ flex: 1, minWidth: 200 }}>
                  Already onboarded before? Verified KYC from a contact's
                  previous role carries over — identity documents for any role,
                  role documents for the same role. Only property-specific
                  documents and this property's agreement remain.
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      const pendingProfiles = salesRoleProfiles.filter(
                        (role) => role.kyc_status !== "complete",
                      );
                      const messages = [];
                      for (const role of pendingProfiles) {
                        const response = await api.post(
                          `/party-role-profiles/${role.id}/kyc-reuse`,
                        );
                        const body = unwrap(response);
                        messages.push(
                          `${title(role.role_type)}: ${response.data?.kyc_reused ?? body?.kyc_reused ?? 0} reused`,
                        );
                      }
                      toast.success(
                        `Verified KYC reuse applied — ${messages.join(" · ")}`,
                      );
                      await load();
                    } catch (error) {
                      toast.error(
                        error.response?.data?.error ||
                          "KYC reuse could not be applied",
                      );
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Reuse verified KYC
                </Button>
              </div>
            )}
          </Panel>
          <Panel
            icon={Link2}
            heading="Connected workflows"
            sub="Open existing shared administration tools"
          >
            <div className="pm-col">
              <Button
                variant="ghost"
                onClick={() =>
                  navigate(
                    `/role-onboarding?property_id=${propertyId}&sales_roles=1`,
                  )
                }
              >
                <Users size={15} /> Agreements and KYC profiles
              </Button>
              <Button variant="ghost" onClick={() => navigate("/agreements")}>
                <FileCheck2 size={15} /> Agreements
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  navigate(
                    `/compliance?listing_type=sale&property_id=${propertyId}`,
                  )
                }
              >
                <ShieldCheck size={15} /> Document verification / compliance
              </Button>
              <Button variant="ghost" onClick={() => openSection("assessment")}>
                <ClipboardCheck size={15} /> Assessment / inspections
              </Button>
            </div>
          </Panel>
        </div>
      )}

      {section === "documents" && (
        <Panel
          icon={FileText}
          heading="Sales documents"
          sub="Private proof, agreements, title records and settlement evidence"
          action={
            <Button
              size="sm"
              variant="ghost"
              icon={Upload}
              onClick={() => navigate("/documents")}
            >
              Document centre
            </Button>
          }
        >
          {documents.length ? (
            <DataTable
              columns={[
                {
                  key: "title",
                  header: "Document",
                  render: (row) => (
                    <div className="cell-strong">
                      {row.title || row.file_name || "Document"}
                    </div>
                  ),
                },
                {
                  key: "type",
                  header: "Type",
                  render: (row) =>
                    title(row.doc_type || row.document_type || row.category),
                },
                {
                  key: "status",
                  header: "Verification",
                  render: (row) => (
                    <StatusBadge
                      status={
                        row.verification_status || row.status || "pending"
                      }
                    />
                  ),
                },
                {
                  key: "date",
                  header: "Uploaded",
                  render: (row) => dateTime(row.created_at || row.uploaded_at),
                },
                {
                  key: "view",
                  header: "",
                  render: (row) =>
                    row.file_url || row.url ? (
                      <a
                        className="pm-link"
                        href={fileSrc(row.file_url || row.url)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink size={13} /> View
                      </a>
                    ) : (
                      "—"
                    ),
                },
              ]}
              rows={documents}
            />
          ) : (
            <Empty
              icon={FileText}
              heading="No documents returned"
              text="Property documents and financial proof will appear here when the API links them to this sale."
              action={
                <Button variant="ghost" onClick={() => navigate("/documents")}>
                  Open document centre
                </Button>
              }
            />
          )}
        </Panel>
      )}

      {section === "activity" && (
        <Panel
          icon={Activity}
          heading="Activity and audit"
          sub="Operational timeline and immutable financial history"
        >
          <div className="pm-segment" style={{ marginBottom: 14 }}>
            <button
              className={activityTab === "activity" ? "on" : ""}
              onClick={() => setActivityTab("activity")}
            >
              Activity
            </button>
            <button
              className={activityTab === "audit" ? "on" : ""}
              onClick={() => setActivityTab("audit")}
            >
              Audit log
            </button>
          </div>
          {(activityTab === "activity" ? activities : audit).length ? (
            <div className="pm-col">
              {(activityTab === "activity" ? activities : audit).map(
                (item, index) => (
                  <div
                    key={item.id || index}
                    style={{
                      borderLeft: `3px solid ${activityTab === "audit" ? "var(--navy)" : "var(--cyan)"}`,
                      padding: "9px 12px",
                      background: "var(--surface-2)",
                    }}
                  >
                    <div className="between">
                      <strong style={{ fontSize: 13 }}>
                        {item.title || item.action || item.event || "Activity"}
                      </strong>
                      <span className="cell-sub">
                        {dateTime(item.occurred_at || item.created_at)}
                      </span>
                    </div>
                    <div className="cell-sub" style={{ marginTop: 3 }}>
                      {item.description ||
                        item.body ||
                        item.notes ||
                        item.message ||
                        `${item.entity || ""}${item.entity_id ? ` #${item.entity_id}` : ""}`}
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : (
            <Empty
              icon={Activity}
              heading={`No ${activityTab === "audit" ? "audit events" : "activity"} returned`}
              text="Sales lifecycle and financial actions will appear here."
            />
          )}
        </Panel>
      )}

      {drawer === "profile" && (
        <Drawer
          title="Sales Profile & Fee Terms"
          onClose={closeDrawer}
          width={660}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={saveProfile}
              saving={saving}
            />
          }
        >
          <ErrorBox error={formError} />
          <div className="form-grid">
            <Field label="Asking price (BDT)">
              <Input
                type="number"
                value={form.asking_price || ""}
                onChange={(event) => set("asking_price", event.target.value)}
              />
            </Field>
            <Field label="Authority type">
              <Select
                value={form.agency_type || "exclusive"}
                onChange={(event) => set("agency_type", event.target.value)}
              >
                <option value="exclusive">Exclusive</option>
                <option value="open">Open</option>
                <option value="sole">Sole agency</option>
              </Select>
            </Field>
            <Field label="Authority starts">
              <Input
                type="date"
                value={form.agreement_start_date || ""}
                onChange={(event) =>
                  set("agreement_start_date", event.target.value)
                }
              />
            </Field>
            <Field label="Authority ends">
              <Input
                type="date"
                value={form.agreement_end_date || ""}
                onChange={(event) =>
                  set("agreement_end_date", event.target.value)
                }
              />
            </Field>
            <Field label="Commission type">
              <Select
                value={form.commission_type || "percentage"}
                onChange={(event) => set("commission_type", event.target.value)}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount</option>
              </Select>
            </Field>
            {form.commission_type === "fixed" ? (
              <Field label="Commission amount">
                <Input
                  type="number"
                  value={form.commission_fixed || ""}
                  onChange={(event) =>
                    set("commission_fixed", event.target.value)
                  }
                />
              </Field>
            ) : (
              <Field label="Commission rate %">
                <Input
                  type="number"
                  step="0.01"
                  value={form.commission_percent || ""}
                  onChange={(event) =>
                    set("commission_percent", event.target.value)
                  }
                />
              </Field>
            )}
            <Field label="Marketing budget">
              <Input
                type="number"
                value={form.marketing_budget || ""}
                onChange={(event) =>
                  set("marketing_budget", event.target.value)
                }
              />
            </Field>
            <Field label="Agreement status">
              <Select
                value={form.agreement_status || "not_started"}
                onChange={(event) =>
                  set("agreement_status", event.target.value)
                }
              >
                {[
                  "not_started",
                  "draft",
                  "sent",
                  "signed",
                  "expired",
                  "terminated",
                ].map((value) => (
                  <option key={value} value={value}>
                    {title(value)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Assessment status">
              <div
                style={{
                  minHeight: 44,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                  padding: "8px 10px",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  background: "var(--surface-2)",
                }}
              >
                <div>
                  <StatusBadge status={assessmentStatus} />
                  <div className="cell-sub" style={{ marginTop: 4 }}>
                    Managed from the Assessment workspace.
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    closeDrawer();
                    openSection("assessment");
                  }}
                >
                  Open Assessment
                </Button>
              </div>
            </Field>
            <Field label="Compliance status">
              <Select
                value={form.compliance_status || "pending"}
                onChange={(event) =>
                  set("compliance_status", event.target.value)
                }
              >
                {["pending", "clear", "blocked"].map((value) => (
                  <option key={value} value={value}>
                    {title(value)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Target settlement date">
              <Input
                type="date"
                value={form.target_settlement_date || ""}
                onChange={(event) =>
                  set("target_settlement_date", event.target.value)
                }
              />
            </Field>
          </div>
          {canAccounts && (
            <div className="pm-card" style={{ padding: 14, marginBottom: 14 }}>
              <div className="between" style={{ marginBottom: 10 }}>
                <div>
                  <strong>Trust and accounting setup</strong>
                  <div className="cell-sub">
                    Bind the shared physical bank accounts and ledger accounts used for mandatory postings.
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    openDrawer("physical-bank-account", {
                      account_type: "trust",
                      account_name: "",
                      account_number: "",
                      bank_name: "",
                      routing_number: "",
                    })
                  }
                >
                  Add physical account
                </Button>
              </div>
              <div className="form-grid">
                <Field label="Physical trust bank">
                  <Select
                    value={form.trust_bank_account_id || ""}
                    onChange={(event) => set("trust_bank_account_id", event.target.value)}
                  >
                    <option value="">Select trust account</option>
                    {physicalBankAccounts
                      .filter((account) => account.account_type === "trust")
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.account_name} · {account.bank_name} · {account.account_number}
                        </option>
                      ))}
                  </Select>
                </Field>
                <Field label="Agency operating bank">
                  <Select
                    value={form.agency_bank_account_id || ""}
                    onChange={(event) => set("agency_bank_account_id", event.target.value)}
                  >
                    <option value="">Select operating account</option>
                    {physicalBankAccounts
                      .filter((account) => account.account_type === "operating")
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.account_name} · {account.bank_name} · {account.account_number}
                        </option>
                      ))}
                  </Select>
                </Field>
                {[
                  ["client_money_bank_account_id", "Trust bank ledger", "asset"],
                  ["client_funds_liability_account_id", "Client-funds liability", "liability"],
                  ["agency_operating_account_id", "Agency operating ledger", "asset"],
                  ["commission_revenue_account_id", "Commission revenue", "revenue"],
                  ["marketing_revenue_account_id", "Marketing revenue", "revenue"],
                ].map(([key, label, type]) => (
                  <Field key={key} label={label}>
                    <Select value={form[key] || ""} onChange={(event) => set(key, event.target.value)}>
                      <option value="">Select ledger account</option>
                      {ledgerAccounts
                        .filter((account) => account.type === type)
                        .map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} · {account.name}
                          </option>
                        ))}
                    </Select>
                  </Field>
                ))}
              </div>
            </div>
          )}
          <Field label="Terms and notes">
            <Textarea
              rows={5}
              value={form.notes || ""}
              onChange={(event) => set("notes", event.target.value)}
            />
          </Field>
        </Drawer>
      )}

      {drawer === "accounting" && (
        <Drawer
          title="Settlement Accounting Setup"
          onClose={closeDrawer}
          width={660}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={saveAccountingProfile}
              saving={saving}
              disabled={
                !form.trust_bank_account_id ||
                !form.agency_bank_account_id ||
                !form.client_money_bank_account_id ||
                !form.client_funds_liability_account_id ||
                !form.agency_operating_account_id ||
                !form.commission_revenue_account_id ||
                !form.marketing_revenue_account_id
              }
              label="Save accounting setup"
            />
          }
        >
          <ErrorBox error={formError} />
          <div className="between" style={{ marginBottom: 14 }}>
            <div className="cell-sub">
              One physical trust account holds client money. Virtual beneficiary ledgers preserve ownership inside it.
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                openDrawer("physical-bank-account", {
                  account_type: "trust",
                  account_name: "",
                  account_number: "",
                  bank_name: "",
                  routing_number: "",
                })
              }
            >
              Add physical account
            </Button>
          </div>
          <div className="form-grid">
            <Field label="Physical trust bank" required>
              <Select value={form.trust_bank_account_id || ""} onChange={(event) => set("trust_bank_account_id", event.target.value)}>
                <option value="">Select trust account</option>
                {physicalBankAccounts.filter((account) => account.account_type === "trust").map((account) => (
                  <option key={account.id} value={account.id}>{account.account_name} · {account.bank_name} · {account.account_number}</option>
                ))}
              </Select>
            </Field>
            <Field label="Agency operating bank" required>
              <Select value={form.agency_bank_account_id || ""} onChange={(event) => set("agency_bank_account_id", event.target.value)}>
                <option value="">Select operating account</option>
                {physicalBankAccounts.filter((account) => account.account_type === "operating").map((account) => (
                  <option key={account.id} value={account.id}>{account.account_name} · {account.bank_name} · {account.account_number}</option>
                ))}
              </Select>
            </Field>
            {[
              ["client_money_bank_account_id", "Trust bank ledger", "asset"],
              ["client_funds_liability_account_id", "Client-funds liability", "liability"],
              ["agency_operating_account_id", "Agency operating ledger", "asset"],
              ["commission_revenue_account_id", "Commission revenue", "revenue"],
              ["marketing_revenue_account_id", "Marketing revenue", "revenue"],
            ].map(([key, label, type]) => (
              <Field key={key} label={label} required>
                <Select value={form[key] || ""} onChange={(event) => set(key, event.target.value)}>
                  <option value="">Select ledger account</option>
                  {ledgerAccounts.filter((account) => account.type === type).map((account) => (
                    <option key={account.id} value={account.id}>{account.code} · {account.name}</option>
                  ))}
                </Select>
              </Field>
            ))}
          </div>
        </Drawer>
      )}

      {drawer === "enquiry" && (
        <Drawer
          title="Log a Buyer Enquiry"
          width={560}
          onClose={closeDrawer}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={saveEnquiry}
              saving={saving}
              label="Log enquiry"
            />
          }
        >
          <ErrorBox error={formError} />
          <div className="cell-sub" style={{ marginBottom: 14 }}>
            Logged against <strong>{property.title || "this property"}</strong>.
            The buyer is created as a Contact and a buyer Client automatically.
          </div>
          <div className="form-grid">
            <Field label="Buyer name" required>
              <Input
                value={form.enquirer_name || ""}
                onChange={(event) => set("enquirer_name", event.target.value)}
              />
            </Field>
            <Field label="Contact number">
              <Input
                value={form.phone || ""}
                onChange={(event) => set("phone", event.target.value)}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email || ""}
                onChange={(event) => set("email", event.target.value)}
              />
            </Field>
            <Field label="Source">
              <Select
                value={form.source || "walk_in"}
                onChange={(event) => set("source", event.target.value)}
              >
                <option value="walk_in">Walk-in</option>
                <option value="phone">Phone</option>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="staff">Staff</option>
              </Select>
            </Field>
            <Field label="Budget (BDT)">
              <Input
                type="number"
                value={form.budget || ""}
                onChange={(event) => set("budget", event.target.value)}
              />
            </Field>
            <Field label="Viewing / appointment">
              <Input
                type="datetime-local"
                value={form.viewing_date || ""}
                onChange={(event) => set("viewing_date", event.target.value)}
              />
            </Field>
            <Field label="Follow-up date">
              <Input
                type="date"
                value={form.follow_up_date || ""}
                onChange={(event) => set("follow_up_date", event.target.value)}
              />
            </Field>
          </div>
          <Field label="Message / notes">
            <Textarea
              rows={3}
              value={form.message || ""}
              onChange={(event) => set("message", event.target.value)}
            />
          </Field>
        </Drawer>
      )}

      {drawer === "party" && (
        <Drawer
          title={form.id ? "Edit Sales Party" : "Add Sales Party"}
          onClose={closeDrawer}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={saveParty}
              saving={saving}
            />
          }
        >
          <ErrorBox error={formError} />
          <Field label="Contact" required>
            <Combo
              endpoint="/contacts"
              labelFn={contactLabel}
              value={form.contact_id}
              onChange={(value, contact) =>
                setForm((current) => ({
                  ...current,
                  contact_id: value,
                  full_name: contact?.full_name || current.full_name,
                }))
              }
              placeholder="Search contacts…"
            />
          </Field>
          <div className="form-grid">
            <Field label="Role">
              <Select
                value={form.role || "vendor"}
                onChange={(event) => set("role", event.target.value)}
              >
                <option value="vendor">Vendor / owner</option>
                <option value="solicitor">Solicitor</option>
                <option value="representative">
                  Authorized representative
                </option>
              </Select>
            </Field>
            <Field label="Ownership %">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.ownership_percent || ""}
                onChange={(event) =>
                  set("ownership_percent", event.target.value)
                }
                disabled={form.role !== "vendor"}
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status || "active"}
                onChange={(event) => set("status", event.target.value)}
              >
                <option value="active">Active</option>
                <option value="withdrawn">Withdrawn</option>
              </Select>
            </Field>
            <Field label="Primary party">
              <Select
                value={form.is_primary ? "yes" : "no"}
                onChange={(event) =>
                  set("is_primary", event.target.value === "yes")
                }
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </Select>
            </Field>
          </div>
          <Field label="Notes">
            <Textarea
              value={form.notes || ""}
              onChange={(event) => set("notes", event.target.value)}
            />
          </Field>
        </Drawer>
      )}

      {drawer === "offer" && (
        <Drawer
          title={form.id ? "Edit Purchase Offer" : "Record Purchase Offer"}
          onClose={closeDrawer}
          width={700}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={saveOffer}
              saving={saving}
              label={form.id ? "Update offer" : "Record offer"}
            />
          }
        >
          <ErrorBox error={formError} />
          <div className="form-grid">
            <Field label="Offer amount (BDT)" required>
              <Input
                type="number"
                value={form.amount ?? form.offer_amount ?? ""}
                onChange={(event) => set("amount", event.target.value)}
              />
            </Field>
            <Field label="Deposit amount">
              <Input
                type="number"
                min="0"
                value={form.deposit_amount || ""}
                onChange={(event) => set("deposit_amount", event.target.value)}
              />
            </Field>
            <Field label="Expires">
              <Input
                type="date"
                value={form.expiry_date || ""}
                onChange={(event) => set("expiry_date", event.target.value)}
              />
            </Field>
            <Field label="Proposed completion">
              <Input
                type="date"
                value={form.proposed_completion_date || ""}
                onChange={(event) =>
                  set("proposed_completion_date", event.target.value)
                }
              />
            </Field>
            <Field label="Finance status">
              <Select
                value={form.finance_status || "cash"}
                onChange={(event) => set("finance_status", event.target.value)}
              >
                <option value="cash">Cash / own funds</option>
                <option value="mortgage_pending">Mortgage pending</option>
                <option value="mortgage_approved">Mortgage approved</option>
                <option value="mixed">Mixed funds</option>
              </Select>
            </Field>
          </div>
          <h4 className="form-section-title">Buyers and allocations</h4>
          {(form.buyers || []).map((buyer, index) => (
            <div
              className="card"
              key={index}
              style={{ padding: 12, marginBottom: 10 }}
            >
              <div className="between" style={{ marginBottom: 8 }}>
                <strong>Buyer {index + 1}</strong>
                {form.buyers.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      set(
                        "buyers",
                        form.buyers.filter((_, position) => position !== index),
                      )
                    }
                  >
                    <Trash2 size={13} /> Remove
                  </Button>
                )}
              </div>
              <Field label="Buyer contact">
                <Combo
                  endpoint="/clients?role=buyer"
                  labelFn={buyerLabel}
                  value={buyer.client_id}
                  onChange={(value, client) => {
                    const contact = client?.Contact || client?.contact;
                    updateBuyer(index, "client_id", value);
                    updateBuyer(
                      index,
                      "contact_id",
                      client?.contact_id || contact?.id || null,
                    );
                    updateBuyer(index, "full_name", contact?.full_name || "");
                  }}
                  placeholder="Search buyer…"
                />
              </Field>
              <div className="form-grid">
                <Field label="Allocation %">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={buyer.allocation_pct || ""}
                    onChange={(event) =>
                      updateBuyer(index, "allocation_pct", event.target.value)
                    }
                  />
                </Field>
                <Field label="Primary buyer">
                  <Select
                    value={buyer.is_primary ? "yes" : "no"}
                    onChange={(event) =>
                      updateBuyer(
                        index,
                        "is_primary",
                        event.target.value === "yes",
                      )
                    }
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </Select>
                </Field>
              </div>
            </div>
          ))}
          <Button
            size="sm"
            variant="ghost"
            icon={Plus}
            onClick={() =>
              set("buyers", [
                ...(form.buyers || []),
                {
                  contact_id: null,
                  full_name: "",
                  allocation_pct: "",
                  is_primary: false,
                },
              ])
            }
          >
            Add buyer
          </Button>
          <Field label="Proof of funds" full>
            <FileUpload
              folder="documents"
              value={form.proof_url || ""}
              onChange={(value) => set("proof_url", value)}
              label="Private bank letter or funding evidence"
            />
          </Field>
          <h4 className="form-section-title">
            Buyer solicitor (information only)
          </h4>
          <div className="form-grid">
            <Field label="Solicitor name">
              <Input
                value={form.solicitor_name || ""}
                onChange={(event) => set("solicitor_name", event.target.value)}
              />
            </Field>
            <Field label="Solicitor email">
              <Input
                type="email"
                value={form.solicitor_email || ""}
                onChange={(event) => set("solicitor_email", event.target.value)}
              />
            </Field>
            <Field label="Solicitor phone">
              <Input
                value={form.solicitor_phone || ""}
                onChange={(event) => set("solicitor_phone", event.target.value)}
              />
            </Field>
          </div>
          <Field label="Offer terms / conditions">
            <Textarea
              rows={4}
              value={form.terms || form.notes || ""}
              onChange={(event) => set("terms", event.target.value)}
            />
          </Field>
        </Drawer>
      )}

      {drawer === "offer-status" && (
        <Drawer
          title="Update Offer Status"
          onClose={closeDrawer}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={saveOfferStatus}
              saving={saving}
              label="Update status"
            />
          }
        >
          <ErrorBox error={formError} />
          <Field label="Status">
            <Select
              value={form.status || "submitted"}
              onChange={(event) => set("status", event.target.value)}
            >
              {[
                "submitted",
                "countered",
                "rejected",
                "withdrawn",
                "expired",
              ].map((value) => (
                <option value={value} key={value}>
                  {title(value)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reason">
            <Textarea
              value={form.reason || ""}
              onChange={(event) => set("reason", event.target.value)}
            />
          </Field>
        </Drawer>
      )}

      {drawer === "transaction-party" && (
        <Drawer
          title={
            form.id
              ? "Withdraw Transaction Party"
              : "Add / Replace Transaction Buyer"
          }
          onClose={closeDrawer}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={saveTransactionParty}
              saving={saving}
            />
          }
        >
          <ErrorBox error={formError} />
          {!form.id && (
            <>
              <Field label="Buyer contact" required>
                <Combo
                  endpoint="/clients?role=buyer"
                  labelFn={buyerLabel}
                  value={form.client_id}
                  onChange={(value, client) =>
                    setForm((current) => ({
                      ...current,
                      client_id: value,
                      contact_id:
                        client?.contact_id || client?.Contact?.id || null,
                    }))
                  }
                  placeholder="Search buyer…"
                />
              </Field>
              <div className="form-grid">
                <Field label="Allocation %">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.ownership_percent || ""}
                    onChange={(event) =>
                      set("ownership_percent", event.target.value)
                    }
                  />
                </Field>
                <Field label="Replaces transaction party">
                  <Select
                    value={form.replaced_party_id || ""}
                    onChange={(event) =>
                      set("replaced_party_id", event.target.value)
                    }
                  >
                    <option value="">Does not replace anyone</option>
                    {transactionParties
                      .filter(
                        (item) =>
                          item.party_type === "buyer" &&
                          item.status === "active",
                      )
                      .map((item) => (
                        <option value={item.id} key={item.id}>
                          {PartyName({ party: item })}
                        </option>
                      ))}
                  </Select>
                </Field>
              </div>
            </>
          )}
          <Field
            label={form.id ? "Withdrawal reason" : "Replacement reason"}
            required={!!(form.id || form.replaced_party_id)}
          >
            <Textarea
              value={form.replacement_reason || ""}
              onChange={(event) =>
                set("replacement_reason", event.target.value)
              }
            />
          </Field>
        </Drawer>
      )}

      {drawer === "settlement" && (
        <Drawer
          title="Create Settlement Statement"
          onClose={closeDrawer}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={createSettlement}
              saving={saving}
              label="Create statement"
            />
          }
        >
          <ErrorBox error={formError} />
          <Field label="Purchase price (BDT)" required>
            <Input
              type="number"
              value={form.purchase_price || ""}
              onChange={(event) => set("purchase_price", event.target.value)}
            />
          </Field>
          <Field label="Settlement date" required>
            <Input
              type="date"
              value={form.settlement_date || ""}
              onChange={(event) => set("settlement_date", event.target.value)}
            />
          </Field>
          <Field label="Notes">
            <Textarea
              value={form.notes || ""}
              onChange={(event) => set("notes", event.target.value)}
            />
          </Field>
        </Drawer>
      )}

      {drawer === "lines" && (
        <Drawer
          title="Edit Settlement Line Items"
          onClose={closeDrawer}
          width={720}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={saveLines}
              saving={saving}
              label="Save line items"
            />
          }
        >
          <ErrorBox error={formError} />
          {(form.lines || []).map((line, index) => (
            <div
              className="card"
              style={{ padding: 12, marginBottom: 10 }}
              key={line.id || index}
            >
              <div className="between">
                <strong>Line {index + 1}</strong>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={
                    hasLineProvenance(line) ||
                    referencedLineIds.has(Number(line.id))
                  }
                  onClick={() =>
                    set(
                      "lines",
                      form.lines.filter((_, position) => position !== index),
                    )
                  }
                >
                  <Trash2 size={13} />
                </Button>
              </div>
              <div className="form-grid">
                <Field label="Type">
                  <Select
                    value={line.line_type || "commission"}
                    disabled={
                      hasLineProvenance(line) ||
                      activeReferencedLineIds.has(Number(line.id))
                    }
                    onChange={(event) =>
                      updateLine(index, "line_type", event.target.value)
                    }
                  >
                    {[
                      "purchase_price",
                      "deposit",
                      "buyer_receipt",
                      "buyer_refund",
                      "commission",
                      "agency_fee",
                      "advertising",
                      "admin_fee",
                      "vat_tax",
                      "legal_fee",
                      "registration_fee",
                      "lender_payoff",
                      "rates_adjustment",
                      "utility_adjustment",
                      "third_party",
                      "vendor_proceeds",
                      "rounding",
                    ].map((value) => (
                      <option
                        key={value}
                        value={value}
                        disabled={["commission", "advertising"].includes(value)}
                      >
                        {title(value)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Direction">
                  <Select
                    value={line.direction || "debit"}
                    disabled={
                      hasLineProvenance(line) ||
                      activeReferencedLineIds.has(Number(line.id))
                    }
                    onChange={(event) =>
                      updateLine(index, "direction", event.target.value)
                    }
                  >
                    <option value="debit">Debit / deduction</option>
                    <option value="credit">Credit / reduction</option>
                  </Select>
                </Field>
                <Field label="Amount">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.amount || ""}
                    disabled={
                      hasLineProvenance(line) ||
                      activeReferencedLineIds.has(Number(line.id))
                    }
                    onChange={(event) =>
                      updateLine(index, "amount", event.target.value)
                    }
                  />
                </Field>
                <Field label="Due date">
                  <Input
                    type="date"
                    value={line.due_date || ""}
                    onChange={(event) =>
                      updateLine(index, "due_date", event.target.value)
                    }
                  />
                </Field>
              </div>
              <Field label="Description">
                <Input
                  value={line.description || ""}
                  onChange={(event) =>
                    updateLine(index, "description", event.target.value)
                  }
                />
              </Field>
              {(hasLineProvenance(line) ||
                activeReferencedLineIds.has(Number(line.id))) && (
                <div className="between" style={{ gap: 8 }}>
                  <div className="cell-sub">
                    Financial fields are protected because this line carries
                    fee provenance or is linked to a payout.
                  </div>
                  {hasLineProvenance(line) &&
                    !referencedLineIds.has(Number(line.id)) && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          openDrawer("fee", { ...line, edit_reason: "" })
                        }
                      >
                        Edit fee with reason
                      </Button>
                    )}
                </div>
              )}
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            icon={Plus}
            onClick={() =>
              set("lines", [
                ...(form.lines || []),
                {
                  line_type: "admin_fee",
                  direction: "debit",
                  description: "",
                  amount: "",
                },
              ])
            }
          >
            Add line
          </Button>
          <label
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginTop: 14,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form.auto_balance !== false}
              onChange={(event) => set("auto_balance", event.target.checked)}
            />
            Auto-balance vendor proceeds (price − fees − refunds due) after
            saving
          </label>
        </Drawer>
      )}

      {drawer === "fee" && (
        <Drawer
          title="Edit Agency Fee"
          onClose={closeDrawer}
          width={560}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={saveFeeLine}
              saving={saving}
              disabled={!String(form.edit_reason || "").trim()}
              label="Save fee variation"
            />
          }
        >
          <ErrorBox error={formError} />
          <div className="pm-card" style={{ padding: 12, marginBottom: 14 }}>
            <KV k="Fee" v={title(form.line_type)} />
            <KV k="Agreement amount" v={money(form.auto_amount)} />
          </div>
          <div className="form-grid">
            <Field label="Basis">
              <Select
                value={form.fee_basis || "fixed"}
                onChange={(event) => set("fee_basis", event.target.value)}
              >
                <option value="fixed">Fixed amount</option>
                <option value="percent">Percent of sale value</option>
              </Select>
            </Field>
            {form.fee_basis === "percent" ? (
              <Field label="Rate (%)" required>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.fee_rate || ""}
                  onChange={(event) => set("fee_rate", event.target.value)}
                />
              </Field>
            ) : (
              <Field label="Amount (BDT)" required>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount || ""}
                  onChange={(event) => set("amount", event.target.value)}
                />
              </Field>
            )}
          </div>
          <Field label="Variation reason / term" required>
            <Textarea
              rows={4}
              value={form.edit_reason || ""}
              onChange={(event) => set("edit_reason", event.target.value)}
              placeholder="State why the agreed fee changed; this appears on the vendor invoice."
            />
          </Field>
        </Drawer>
      )}

      {drawer === "payment" && (
        <Drawer
          title={
            form.lock_direction
              ? form.direction === "outgoing"
                ? "Add Payment — Money Out of the Trust Account"
                : "Add Receipt — Money Into the Trust Account"
              : "Record Receipt / Payment"
          }
          onClose={closeDrawer}
          width={620}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={savePayment}
              saving={saving}
              label={
                form.direction === "outgoing" ? "Add payment" : "Add receipt"
              }
            />
          }
        >
          <ErrorBox error={formError} />
          <div className="cell-sub" style={{ marginBottom: 12, lineHeight: 1.55 }}>
            {form.direction === "outgoing"
              ? "Money leaving the vendor's trust account — a buyer refund, vendor payout or third-party payment. Requires an approved settlement."
              : "Money received into the vendor's trust account from the buyer, checked against the accepted offer / sale agreement."}
          </div>
          {form.direction !== "outgoing" &&
            (() => {
              // Check this receipt against the sale agreement figures live.
              const agreed = purchasePrice;
              const thisAmount = Math.max(0, number(form.amount));
              const afterThis = received + thisAmount;
              const remaining = agreed - afterThis;
              const overpaid = minor(remaining) < 0;
              return (
                <div
                  className="pm-card"
                  style={{ padding: 14, marginBottom: 14 }}
                >
                  <div className="pm-eyebrow" style={{ marginBottom: 8 }}>
                    Against the accepted offer / sale agreement
                  </div>
                  <KV
                    k={
                      isWithdrawal
                        ? "Buyer funds on this settlement"
                        : "Agreed sale price"
                    }
                    v={money(agreed)}
                  />
                  <KV k="Cleared so far" v={money(received)} />
                  {pendingReceipts > 0 && (
                    <KV k="Pending clearance" v={money(pendingReceipts)} />
                  )}
                  <KV k="This receipt" v={money(thisAmount)} />
                  <div
                    className="between"
                    style={{
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: "1px solid var(--line)",
                      fontWeight: 800,
                      color: overpaid ? "var(--bad)" : "var(--ink)",
                    }}
                  >
                    <span>
                      {overpaid
                        ? "Over the agreed price by"
                        : "Remaining after this receipt"}
                    </span>
                    <span className="pm-num">
                      {money(Math.abs(remaining))}
                    </span>
                  </div>
                  {overpaid && (
                    <div
                      className="cell-sub"
                      style={{ color: "var(--bad)", marginTop: 6 }}
                    >
                      This receipt takes the buyer past the agreed price —
                      check the amount or record the excess as an adjustment.
                    </div>
                  )}
                </div>
              );
            })()}
          <div className="form-grid">
            {form.lock_direction ? (
              <Field label="Direction">
                <Input
                  value={
                    form.direction === "outgoing"
                      ? "Refund or payout — funds out"
                      : "Receipt — funds in"
                  }
                  disabled
                  readOnly
                />
              </Field>
            ) : (
              <Field label="Direction">
                <Select
                  value={form.direction || "incoming"}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      direction: event.target.value,
                      payment_kind:
                        event.target.value === "outgoing"
                          ? "buyer_refund"
                          : "buyer_receipt",
                    }))
                  }
                >
                  <option value="incoming">Receipt / funds in</option>
                  <option value="outgoing">
                    Refund or payout / funds out
                  </option>
                </Select>
              </Field>
            )}
            <Field label="Transaction type">
              <Select
                value={
                  form.payment_kind ||
                  (form.direction === "outgoing"
                    ? "buyer_refund"
                    : "buyer_receipt")
                }
                onChange={(event) =>
                  // The type decides who the counterparty is — reset the
                  // party so a vendor never stays selected on a buyer refund.
                  setForm((current) => ({
                    ...current,
                    payment_kind: event.target.value,
                    transaction_party_id: "",
                    counterparty_name: "",
                    counterparty_phone: "",
                  }))
                }
              >
                {form.direction === "outgoing" ? (
                  <>
                    <option value="buyer_refund">Buyer refund</option>
                    <option value="vendor_payout">Vendor payout</option>
                    <option value="agency_fee">
                      Agency — commission & marketing fees
                    </option>
                    <option value="third_party">Third-party payment</option>
                    <option value="adjustment">Adjustment</option>
                  </>
                ) : (
                  <>
                    <option value="buyer_receipt">
                      Buyer receipt / installment
                    </option>
                    <option value="adjustment">Adjustment</option>
                  </>
                )}
              </Select>
            </Field>
            {(() => {
              const kind =
                form.payment_kind ||
                (form.direction === "outgoing"
                  ? "buyer_refund"
                  : "buyer_receipt");
              const partyRole = kind.startsWith("buyer_")
                ? "buyer"
                : kind === "vendor_payout"
                  ? "vendor"
                  : null;
              if (partyRole) {
                const candidates = transactionParties.filter(
                  (party) =>
                    party.status === "active" &&
                    party.party_type === partyRole,
                );
                return (
                  <Field
                    label={partyRole === "buyer" ? "Buyer" : "Vendor"}
                    required
                  >
                    <Select
                      value={form.transaction_party_id || ""}
                      onChange={(event) =>
                        set("transaction_party_id", event.target.value)
                      }
                    >
                      <option value="">
                        Select {partyRole === "buyer" ? "buyer" : "vendor"}
                      </option>
                      {candidates.map((party) => (
                        <option key={party.id} value={party.id}>
                          {PartyName({ party })}
                          {party.ownership_percent != null
                            ? ` · ${party.ownership_percent}%`
                            : ""}
                        </option>
                      ))}
                    </Select>
                    {!candidates.length && (
                      <div
                        className="cell-sub"
                        style={{ color: "var(--bad)", marginTop: 4 }}
                      >
                        No active {partyRole} on this transaction — add one in
                        the Parties tab first.
                      </div>
                    )}
                  </Field>
                );
              }
              if (kind === "agency_fee") {
                return (
                  <Field label="Payee">
                    <Input
                      value="Seventh Sky (agency) — commission & marketing fees"
                      disabled
                      readOnly
                    />
                  </Field>
                );
              }
              if (kind === "third_party") {
                return (
                  <>
                    <Field label="Third-party name" required>
                      <Input
                        value={form.counterparty_name || ""}
                        onChange={(event) =>
                          set("counterparty_name", event.target.value)
                        }
                        placeholder="e.g. Dhaka Land Registry Office"
                      />
                    </Field>
                    <Field label="Third-party phone" required>
                      <Input
                        value={form.counterparty_phone || ""}
                        onChange={(event) =>
                          set("counterparty_phone", event.target.value)
                        }
                        placeholder="e.g. 01700-000000"
                      />
                    </Field>
                  </>
                );
              }
              return (
                <Field label="Related party (optional)">
                  <Select
                    value={form.transaction_party_id || ""}
                    onChange={(event) =>
                      set("transaction_party_id", event.target.value)
                    }
                  >
                    <option value="">Unallocated</option>
                    {transactionParties
                      .filter((party) => party.status === "active")
                      .map((party) => (
                        <option key={party.id} value={party.id}>
                          {PartyName({ party })} · {title(party.party_type)}
                        </option>
                      ))}
                  </Select>
                </Field>
              );
            })()}
            <Field label="Exact date / time">
              <Input
                type="datetime-local"
                value={form.payment_at || ""}
                onChange={(event) => set("payment_at", event.target.value)}
              />
            </Field>
            <Field label="Value date">
              <Input
                type="date"
                value={form.value_date || ""}
                onChange={(event) => set("value_date", event.target.value)}
              />
            </Field>
            <Field label="Amount (BDT)" required>
              <Input
                type="number"
                step="0.01"
                value={form.amount || ""}
                onChange={(event) => set("amount", event.target.value)}
              />
            </Field>
            <Field label="Method">
              <Select
                value={form.method || "bank_transfer"}
                onChange={(event) => set("method", event.target.value)}
              >
                <option value="bank_transfer">Bank transfer</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
                <option value="mobile_banking">Mobile banking</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Posting status">
              <Select
                value={form.status || "pending"}
                onChange={(event) => set("status", event.target.value)}
              >
                <option value="pending">Pending clearance</option>
                <option value="cleared">Cleared</option>
              </Select>
            </Field>
            <Field
              label={
                form.direction === "outgoing"
                  ? "From — trust account name"
                  : "From — buyer's account name"
              }
            >
              <Input
                value={form.from_account_name || ""}
                onChange={(event) =>
                  set("from_account_name", event.target.value)
                }
              />
            </Field>
            <Field
              label={
                form.direction === "outgoing"
                  ? "From — trust account number"
                  : "From — buyer's account number"
              }
            >
              <Input
                value={form.from_account_number || ""}
                onChange={(event) =>
                  set("from_account_number", event.target.value)
                }
              />
            </Field>
            <Field
              label={
                form.direction === "outgoing"
                  ? "To — payee account name"
                  : "To — trust account name"
              }
            >
              <Input
                value={form.to_account_name || ""}
                onChange={(event) => set("to_account_name", event.target.value)}
              />
            </Field>
            <Field
              label={
                form.direction === "outgoing"
                  ? "To — payee account number"
                  : "To — trust account number"
              }
            >
              <Input
                value={form.to_account_number || ""}
                onChange={(event) =>
                  set("to_account_number", event.target.value)
                }
              />
            </Field>
            <Field label="Reference" required>
              <Input
                value={form.reference || ""}
                onChange={(event) => set("reference", event.target.value)}
              />
            </Field>
          </div>
          <div className="cell-sub" style={{ marginBottom: 12 }}>
            New payments are always unreconciled. Use the separate Reconcile
            action with bank-statement evidence after the payment clears.
          </div>
          <Field label="Payment proof">
            <FileUpload
              folder="documents"
              value={form.proof_url || ""}
              onChange={(value) => set("proof_url", value)}
              label="Private receipt, transfer slip or cheque image"
            />
          </Field>
        </Drawer>
      )}

      {drawer === "reconcile" && (
        <Drawer
          title="Reconcile Against Bank Statement"
          onClose={closeDrawer}
          width={560}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={saveReconciliation}
              saving={saving}
              disabled={
                form.reconciliation_status === "reconciled" &&
                (!form.statement_url || !form.bank_statement_line_id)
              }
              label="Save reconciliation"
            />
          }
        >
          <ErrorBox error={formError} />
          <div className="pm-card" style={{ padding: 12, marginBottom: 14 }}>
            <KV k="Payment" v={form.reference || `#${form.id}`} />
            <KV k="Direction" v={title(form.direction)} />
            <KV k="Amount" v={money(form.amount)} />
            <KV k="Date" v={dateTime(form.payment_at)} />
          </div>
          <Field label="Reconciliation result" required>
            <Select
              value={form.reconciliation_status || "reconciled"}
              onChange={(event) =>
                set("reconciliation_status", event.target.value)
              }
            >
              <option value="matched">
                Matched — found on the statement, checking amounts
              </option>
              <option value="reconciled">
                Reconciled — confirmed against the bank statement
              </option>
            </Select>
          </Field>
          {form.reconciliation_status === "reconciled" && (
            <Field label="Exact trust-bank line" required>
              <Select
                value={form.bank_statement_line_id || ""}
                onChange={(event) => set("bank_statement_line_id", event.target.value)}
              >
                <option value="">Select the matching signed movement</option>
                {matchingBankLines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {dateOnly(line.date)} · {line.reference || line.description || `Line #${line.id}`} · {money(line.amount)}
                  </option>
                ))}
              </Select>
              {!matchingBankLines.length && (
                <div className="cell-sub" style={{ color: "var(--bad)", marginTop: 4 }}>
                  No unused bank line has this exact amount and direction. Import it in the Trust account tab first.
                </div>
              )}
            </Field>
          )}
          <Field
            label="Bank statement"
            required={form.reconciliation_status === "reconciled"}
          >
            <FileUpload
              folder="documents"
              value={form.statement_url || ""}
              onChange={(value) => set("statement_url", value)}
              label="Upload the bank statement (or statement page) showing this transaction"
            />
          </Field>
          <Field label="Note">
            <Textarea
              rows={3}
              value={form.note || ""}
              onChange={(event) => set("note", event.target.value)}
              placeholder="e.g. Statement line 14 of 30 Jun statement, matches reference"
            />
          </Field>
          <div className="cell-sub">
            The reconciliation, statement file, who reconciled it and when are
            all recorded on the trust account statement for audit.
          </div>
        </Drawer>
      )}

      {drawer === "bank-line" && (
        <Drawer
          title="Import Trust-Bank Statement Line"
          onClose={closeDrawer}
          width={540}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={saveBankLine}
              saving={saving}
              disabled={!form.date || minor(form.amount) === 0}
              label="Import line"
            />
          }
        >
          <ErrorBox error={formError} />
          <div className="st-notice" style={{ marginBottom: 14 }}>
            <FileCheck2 size={15} />
            <span>Use a positive amount for money in and a negative amount for money out.</span>
          </div>
          <div className="form-grid">
            <Field label="Bank date" required>
              <Input type="date" value={form.date || ""} onChange={(event) => set("date", event.target.value)} />
            </Field>
            <Field label="Signed amount (BDT)" required>
              <Input type="number" step="0.01" value={form.amount || ""} onChange={(event) => set("amount", event.target.value)} />
            </Field>
            <Field label="Bank reference">
              <Input value={form.reference || ""} onChange={(event) => set("reference", event.target.value)} />
            </Field>
            <Field label="Import key (optional)">
              <Input value={form.import_key || ""} onChange={(event) => set("import_key", event.target.value)} />
            </Field>
          </div>
          <Field label="Statement description">
            <Textarea rows={3} value={form.description || ""} onChange={(event) => set("description", event.target.value)} />
          </Field>
        </Drawer>
      )}

      {drawer === "funding-request" && (
        <Drawer
          title="Request Buyer Funds"
          onClose={closeDrawer}
          width={560}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={saveFundingRequest}
              saving={saving}
              disabled={!form.transaction_party_id || minor(form.amount) <= 0}
              label="Create request"
            />
          }
        >
          <ErrorBox error={formError} />
          <div className="form-grid">
            <Field label="Buyer" required>
              <Select value={form.transaction_party_id || ""} onChange={(event) => set("transaction_party_id", event.target.value)}>
                <option value="">Select buyer</option>
                {transactionParties
                  .filter((party) => party.party_type === "buyer" && party.status === "active")
                  .map((party) => <option key={party.id} value={party.id}>{PartyName({ party })}</option>)}
              </Select>
            </Field>
            <Field label="Request type">
              <Select value={form.request_type || "balance"} onChange={(event) => set("request_type", event.target.value)}>
                {['deposit', 'balance', 'full', 'top_up'].map((value) => <option key={value} value={value}>{title(value)}</option>)}
              </Select>
            </Field>
            <Field label="Amount (BDT)" required>
              <Input type="number" min="0.01" step="0.01" value={form.amount || ""} onChange={(event) => set("amount", event.target.value)} />
            </Field>
            <Field label="Collection method">
              <Select value={form.provider || "manual_bank"} onChange={(event) => set("provider", event.target.value)}>
                <option value="manual_bank">Manual bank transfer</option>
                <option value="sslcommerz">SSLCommerz payment page</option>
              </Select>
            </Field>
            <Field label="Expires at">
              <Input type="datetime-local" value={form.expires_at || ""} onChange={(event) => set("expires_at", event.target.value)} />
            </Field>
          </div>
          {form.provider === "sslcommerz" && number(form.amount) > 500000 && (
            <div className="st-notice st-notice-error">
              <AlertTriangle size={15} />
              <span>SSLCommerz requests are limited to {money(500000)}. Split this into installments.</span>
            </div>
          )}
        </Drawer>
      )}

      {drawer === "physical-bank-account" && (
        <Drawer
          title="Add Physical Bank Account"
          onClose={closeDrawer}
          width={540}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={savePhysicalBankAccount}
              saving={saving}
              disabled={!form.account_name || !form.account_number || !form.bank_name}
              label="Add account"
            />
          }
        >
          <ErrorBox error={formError} />
          <div className="form-grid">
            <Field label="Purpose" required>
              <Select value={form.account_type || "trust"} onChange={(event) => set("account_type", event.target.value)}>
                <option value="trust">Shared client trust account</option>
                <option value="operating">Agency operating account</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Bank name" required>
              <Input value={form.bank_name || ""} onChange={(event) => set("bank_name", event.target.value)} />
            </Field>
            <Field label="Account name" required>
              <Input value={form.account_name || ""} onChange={(event) => set("account_name", event.target.value)} />
            </Field>
            <Field label="Account number" required>
              <Input value={form.account_number || ""} onChange={(event) => set("account_number", event.target.value)} />
            </Field>
            <Field label="Routing number">
              <Input value={form.routing_number || ""} onChange={(event) => set("routing_number", event.target.value)} />
            </Field>
          </div>
        </Drawer>
      )}

      {drawer === "party-bank-account" && (
        <Drawer
          title="Add Recipient Bank Account"
          onClose={closeDrawer}
          width={580}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={savePartyBankAccount}
              saving={saving}
              disabled={
                (!form.transaction_party_id && !form.contact_id) ||
                !form.bank_name ||
                !form.account_name ||
                !form.account_number
              }
              label="Add for verification"
            />
          }
        >
          <ErrorBox error={formError} />
          <Field label="Transaction party">
            <Select
              value={form.transaction_party_id || ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  transaction_party_id: event.target.value,
                  contact_id: event.target.value ? "" : current.contact_id,
                }))
              }
            >
              <option value="">Other third-party contact</option>
              {transactionParties
                .filter((party) => party.status === "active")
                .map((party) => (
                  <option key={party.id} value={party.id}>
                    {PartyName({ party })} · {title(party.party_type)}
                  </option>
                ))}
            </Select>
          </Field>
          {!form.transaction_party_id && (
            <Field label="Third-party contact" required>
              <Combo
                endpoint="/contacts"
                labelFn={contactLabel}
                value={form.contact_id}
                onChange={(value) => set("contact_id", value)}
                placeholder="Search recipient contact…"
              />
            </Field>
          )}
          <div className="form-grid">
            <Field label="Bank name" required>
              <Input value={form.bank_name || ""} onChange={(event) => set("bank_name", event.target.value)} />
            </Field>
            <Field label="Bank branch">
              <Input value={form.bank_branch || ""} onChange={(event) => set("bank_branch", event.target.value)} />
            </Field>
            <Field label="Account name" required>
              <Input value={form.account_name || ""} onChange={(event) => set("account_name", event.target.value)} />
            </Field>
            <Field label="Account number" required>
              <Input value={form.account_number || ""} onChange={(event) => set("account_number", event.target.value)} />
            </Field>
            <Field label="Routing number">
              <Input value={form.routing_number || ""} onChange={(event) => set("routing_number", event.target.value)} />
            </Field>
          </div>
          <div className="cell-sub">
            The account starts Pending. A separate verification action is required before it can be selected for a payout.
          </div>
        </Drawer>
      )}

      {drawer === "breakdown" &&
        (() => {
          const breakdown = breakdownFor(form.key);
          return (
            <Drawer
              title={`How “${breakdown.title}” is calculated`}
              onClose={closeDrawer}
              width={560}
              footer={<Button onClick={closeDrawer}>Close</Button>}
            >
              <div className="cell-sub" style={{ marginBottom: 12 }}>
                {breakdown.formula}
              </div>
              {breakdown.rows.length ? (
                <DataTable
                  columns={[
                    {
                      key: "label",
                      header: "Source",
                      render: (row) => row.label,
                    },
                    {
                      key: "amount",
                      header: "Amount",
                      render: (row) => (
                        <span
                          className="pm-num"
                          style={{
                            color: row.amount < 0 ? "var(--bad)" : undefined,
                          }}
                        >
                          {money(row.amount)}
                        </span>
                      ),
                    },
                  ]}
                  rows={breakdown.rows}
                />
              ) : (
                <div className="cell-sub">
                  Nothing contributes to this figure yet.
                </div>
              )}
              <div
                className="between"
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "var(--surface-soft)",
                  fontWeight: 800,
                }}
              >
                <span>Total</span>
                <span className="pm-num">{money(breakdown.total)}</span>
              </div>
            </Drawer>
          );
        })()}

      {drawer === "blockers" && (
        <Drawer
          title={`Blockers — ${blockers.length} step${blockers.length === 1 ? "" : "s"} to completion`}
          onClose={closeDrawer}
          width={560}
          footer={<Button onClick={closeDrawer}>Close</Button>}
        >
          <div className="cell-sub" style={{ marginBottom: 14, lineHeight: 1.55 }}>
            Work through these in order — each one must be cleared before the
            settlement can be locked and the sale completed.
          </div>
          <div>
            {blockers.map((blocker, index) => {
              const targetSection =
                blocker.section ||
                blocker.tab ||
                (String(blocker).includes("settlement") ||
                String(blocker).includes("payment") ||
                String(blocker).includes("payout") ||
                String(blocker).includes("posting") ||
                String(blocker).includes("refund") ||
                String(blocker).includes("withdrawal") ||
                String(blocker).includes("disbursement") ||
                String(blocker).includes("obligation") ||
                String(blocker).includes("residual") ||
                String(blocker).includes("allocation") ||
                String(blocker).includes("reconciled") ||
                String(blocker).includes("trust")
                  ? "settlement"
                  : "onboarding");
              return (
                <div
                  key={blocker.key || blocker || index}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom:
                      index === blockers.length - 1
                        ? "none"
                        : "1px solid var(--line-soft)",
                  }}
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      background: "var(--warn-bg)",
                      color: "var(--warn)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 12.5,
                      fontWeight: 800,
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    {index + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 650 }}>
                      {blocker.label || blocker.title || blockerText(blocker)}
                    </div>
                    <div className="cell-sub" style={{ marginTop: 2 }}>
                      Resolve in the{" "}
                      {targetSection === "settlement"
                        ? "Settlement"
                        : "Onboarding"}{" "}
                      tab
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      closeDrawer();
                      openSection(targetSection);
                    }}
                  >
                    Go
                  </Button>
                </div>
              );
            })}
          </div>
        </Drawer>
      )}

      {drawer === "cancel-transaction" && (
        <Drawer
          title="Cancel Transaction — Offer Withdrawn"
          onClose={closeDrawer}
          width={520}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={cancelTransaction}
              saving={saving}
              disabled={!String(form.reason || "").trim()}
              label="Cancel transaction"
            />
          }
        >
          <ErrorBox error={formError} />
          <p className="cell-sub" style={{ lineHeight: 1.6, marginTop: 0 }}>
            This unwinds a deal where <strong>no client money has cleared</strong>:
            the accepted offer becomes withdrawn, the transaction is cancelled,
            and the property returns to the market so a new offer can be
            accepted with a fresh settlement. Everything stays on the audit
            trail.
          </p>
          <div className="st-notice" style={{ marginBottom: 14 }}>
            <AlertTriangle size={15} />
            <span>
              If the buyer paid anything, use Buyer withdrawal / refund instead
              — that is the only path that returns and accounts for their money.
            </span>
          </div>
          <Field label="Cancellation reason (recorded on the audit trail)" required>
            <Textarea
              rows={3}
              value={form.reason || ""}
              onChange={(event) => set("reason", event.target.value)}
              placeholder="e.g. Buyer withdrew before paying the deposit"
            />
          </Field>
        </Drawer>
      )}

      {drawer === "override" && (
        <Drawer
          title="Independent Check Required"
          onClose={closeDrawer}
          width={540}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={() =>
                settlementAction(form.action, {
                  override: true,
                  override_reason: form.override_reason,
                })
              }
              saving={saving}
              disabled={
                !String(form.override_reason || "").trim() ||
                user?.role !== "super_admin"
              }
              label={`Override & ${title(form.action)}`}
            />
          }
        >
          <ErrorBox error={formError} />
          <div className="st-notice" style={{ marginBottom: 14 }}>
            <AlertTriangle size={15} />
            <span>{form.message}</span>
          </div>
          <p className="cell-sub" style={{ lineHeight: 1.6, marginTop: 0 }}>
            Separation of duties: the person who prepared a settlement cannot
            also review, approve or lock it — that is the independent check
            protecting client money. If no second staff member is available, a{" "}
            <strong>super admin</strong> may override with a written reason,
            which is recorded permanently on the approval trail.
          </p>
          {user?.role !== "super_admin" && (
            <div className="st-notice st-notice-error">
              <AlertTriangle size={15} />
              <span>
                You are signed in as {title(user?.role || "staff")}. Ask a
                different user to complete this step, or a super admin to
                override.
              </span>
            </div>
          )}
          <Field label="Override reason (recorded on the audit trail)" required>
            <Textarea
              rows={3}
              value={form.override_reason || ""}
              onChange={(event) => set("override_reason", event.target.value)}
              placeholder="e.g. Single-staff branch — no second reviewer available today"
            />
          </Field>
        </Drawer>
      )}

      {drawer === "disbursement" && (
        <Drawer
          title="Create Disbursement"
          onClose={closeDrawer}
          width={620}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={saveDisbursement}
              saving={saving}
              disabled={
                !form.settlement_line_id ||
                minor(form.amount) <= 0 ||
                (form.payee_type === "agency"
                  ? !(form.destination_bank_account_id || profile.agency_bank_account_id)
                  : form.payout_method === "sslcommerz_refund"
                    ? !form.source_payment_id
                    : !form.party_bank_account_id)
              }
              label="Create payout"
            />
          }
        >
          <ErrorBox error={formError} />
          <Field label="Settlement obligation" required>
            <Select
              value={form.settlement_line_id || ""}
              onChange={(event) => {
                const settlementLine = lines.find(
                  (line) => String(line.id) === event.target.value,
                );
                if (!settlementLine) {
                  setForm((current) => ({ ...current, settlement_line_id: "" }));
                  return;
                }
                const agencyLine = ["commission", "agency_fee", "advertising", "admin_fee"].includes(
                  settlementLine.line_type,
                );
                setForm((current) => ({
                  ...current,
                  settlement_line_id: settlementLine.id,
                  payee_type:
                    settlementLine.line_type === "vendor_proceeds"
                      ? "vendor"
                      : agencyLine
                        ? "agency"
                        : "third_party",
                  transaction_party_id:
                    settlementLine.payee_transaction_party_id || "",
                  contact_id: settlementLine.payee_contact_id || "",
                  amount: remainingForLine(settlementLine),
                  payout_method: "manual_bank",
                  party_bank_account_id: "",
                  source_payment_id: "",
                  destination_bank_account_id: agencyLine
                    ? profile.agency_bank_account_id || ""
                    : "",
                }));
              }}
            >
              <option value="">Select an unpaid obligation</option>
              {payoutObligations.map((line) => (
                <option key={line.id} value={line.id}>
                  {title(line.line_type)} · {money(remainingForLine(line))} remaining
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Payee type">
            <Select
              value={form.payee_type || "vendor"}
              onChange={(event) => set("payee_type", event.target.value)}
              disabled={Boolean(form.settlement_line_id)}
            >
              <option value="vendor">Vendor</option>
              <option value="third_party">Third party</option>
              <option value="agency">Agency (commission & fees)</option>
            </Select>
          </Field>
          {form.payee_type === "agency" ? (
            <div className="cell-sub" style={{ marginBottom: 12 }}>
              Pays Seventh Sky's commission and marketing fee out of client
              funds, as quoted on the vendor invoice.
            </div>
          ) : form.payee_type !== "third_party" ? (
            <Field label="Transaction vendor" required>
              <Select
                value={form.transaction_party_id || ""}
                onChange={(event) =>
                  set("transaction_party_id", event.target.value)
                }
              >
                <option value="">Select vendor</option>
                {transactionParties
                  .filter(
                    (party) =>
                      party.party_type === "vendor" &&
                      party.status === "active",
                  )
                  .map((party) => (
                    <option key={party.id} value={party.id}>
                      {PartyName({ party })}
                    </option>
                  ))}
              </Select>
            </Field>
          ) : formPayeeParty?.party_type === "buyer" ? (
            <Field label="Refund recipient">
              <Input value={PartyName({ party: formPayeeParty })} disabled readOnly />
            </Field>
          ) : (
            <Field label="Third-party contact" required>
              <Combo
                endpoint="/contacts"
                labelFn={contactLabel}
                value={form.contact_id}
                onChange={(value) => set("contact_id", value)}
                placeholder="Search payee contact…"
              />
            </Field>
          )}
          <div className="form-grid">
            <Field label="Amount (BDT)" required>
              <Input
                type="number"
                step="0.01"
                value={form.amount || ""}
                onChange={(event) => set("amount", event.target.value)}
              />
            </Field>
            {form.payee_type !== "agency" && formPayeeParty?.party_type === "buyer" && refundablePayments.length > 0 && (
              <Field label="Payout method">
                <Select
                  value={form.payout_method || "manual_bank"}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      payout_method: event.target.value,
                      party_bank_account_id: "",
                      source_payment_id: "",
                    }))
                  }
                >
                  <option value="manual_bank">Verified bank transfer</option>
                  <option value="sslcommerz_refund">Refund original SSLCommerz payer</option>
                </Select>
              </Field>
            )}
            {form.payee_type === "agency" ? (
              <Field label="Agency operating bank" required>
                <Select
                  value={form.destination_bank_account_id || profile.agency_bank_account_id || ""}
                  onChange={(event) => set("destination_bank_account_id", event.target.value)}
                >
                  <option value="">Select operating account</option>
                  {physicalBankAccounts
                    .filter((account) => account.account_type === "operating")
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.account_name} · {account.bank_name} · {account.account_number}
                      </option>
                    ))}
                </Select>
              </Field>
            ) : form.payout_method === "sslcommerz_refund" ? (
              <Field label="Original SSLCommerz receipt" required>
                <Select value={form.source_payment_id || ""} onChange={(event) => set("source_payment_id", event.target.value)}>
                  <option value="">Select refundable receipt</option>
                  {refundablePayments.map((payment) => (
                    <option key={payment.id} value={payment.id}>
                      {payment.reference} · {money(payment.gross_amount || payment.amount)} · {dateOnly(payment.payment_at)}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <Field label="Verified recipient bank account" required>
                <Select value={form.party_bank_account_id || ""} onChange={(event) => set("party_bank_account_id", event.target.value)}>
                  <option value="">Select verified account</option>
                  {availablePayoutAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.bank_name} · {account.account_name} · {account.masked_account_number || account.account_number}
                    </option>
                  ))}
                </Select>
                {payoutContactId && !availablePayoutAccounts.length && (
                  <div className="cell-sub" style={{ color: "var(--bad)", marginTop: 4 }}>
                    No verified account belongs to this recipient. Add and verify one in the Payouts tab first.
                  </div>
                )}
              </Field>
            )}
            <Field label="Transaction reference">
              <Input
                value={form.reference || ""}
                onChange={(event) => set("reference", event.target.value)}
              />
            </Field>
          </div>
          <Field label="Payout proof">
            <FileUpload
              folder="documents"
              value={form.proof_url || ""}
              onChange={(value) => set("proof_url", value)}
              label="Private bank transfer proof"
            />
          </Field>
        </Drawer>
      )}

      {drawer === "submit-disbursement" && (
        <Drawer
          title={form.status === "failed" ? "Retry Payout Transfer" : "Submit Payout Transfer"}
          onClose={closeDrawer}
          width={540}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={submitDisbursement}
              saving={saving}
              disabled={!String(form.reference || "").trim()}
              label={form.status === "failed" ? "Retry payout" : "Submit payout"}
            />
          }
        >
          <ErrorBox error={formError} />
          <div className="pm-card" style={{ padding: 12, marginBottom: 14 }}>
            <KV k="Payee" v={PartyName({ party: form })} />
            <KV k="Amount" v={money(form.amount)} />
            <KV k="Method" v={title(form.payout_method || "manual_bank")} />
            {form.failure_reason && <KV k="Last failure" v={form.failure_reason} />}
          </div>
          <Field label="Transfer / refund reference" required>
            <Input value={form.reference || ""} onChange={(event) => set("reference", event.target.value)} />
          </Field>
          <Field label="Transfer proof">
            <FileUpload
              folder="documents"
              value={form.proof_url || ""}
              onChange={(value) => set("proof_url", value)}
              label="Private bank transfer or refund evidence"
            />
          </Field>
          <div className="cell-sub">
            A failed payout must be retried with a new attempt key. The system generates one when this form is submitted.
          </div>
        </Drawer>
      )}

      {drawer === "pay-disbursement" && (
        <Drawer
          title="Confirm Disbursement Payment"
          onClose={closeDrawer}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={payDisbursement}
              saving={saving}
              disabled={!form.payment_id || settlement.status !== "approved"}
              label="Allocate & mark paid"
            />
          }
        >
          <ErrorBox error={formError} />
          <div className="pm-card" style={{ padding: 12, marginBottom: 14 }}>
            <KV k="Amount" v={money(form.amount)} />
            <KV
              k="Destination"
              v={[
                form.bank_name,
                form.bank_account_name,
                form.bank_account_number,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          </div>
          <Field label="Cleared outgoing payment" required>
            <Select
              value={form.payment_id || ""}
              onChange={(event) => set("payment_id", event.target.value)}
            >
              <option value="">Select payment</option>
              {eligibleOutgoingPayments.map((payment) => (
                  <option key={payment.id} value={payment.id}>
                    {payment.reference} · {money(payment.amount)} ·{" "}
                    {dateTime(payment.payment_at)}
                  </option>
                ))}
            </Select>
            {!eligibleOutgoingPayments.length && (
              <div
                className="pm-card"
                style={{
                  padding: 14,
                  marginTop: 10,
                  background: "var(--surface-soft)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  <AlertTriangle size={16} /> No eligible payment available
                </div>
                <div className="cell-sub">
                  {settlement.status !== "approved"
                    ? `This settlement is ${title(settlement.status)}. Complete Submit, Review and Approve before recording money out.`
                    : "Record and clear an outgoing payment with the exact payout amount, then reconcile it to an exact trust-bank statement line before selecting it here."}
                </div>
                {settlement.status === "approved" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Receipt}
                    style={{ marginTop: 10 }}
                    onClick={() => recordOutgoingPaymentFor(form)}
                  >
                    Record outgoing payment
                  </Button>
                )}
              </div>
            )}
          </Field>
          <Field label="Final payout proof">
            <FileUpload
              folder="documents"
              value={form.proof_url || ""}
              onChange={(value) => set("proof_url", value)}
              label="Private bank transfer proof"
            />
          </Field>
        </Drawer>
      )}

      {drawer === "new-buyer" && (
        <Drawer
          title={
            buyerDestination === "vendor"
              ? "Create New Vendor"
              : "Create New Buyer"
          }
          onClose={closeDrawer}
          width={720}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={saveNewBuyer}
              saving={saving}
              label={
                buyerDestination === "vendor" ? "Create vendor" : "Create buyer"
              }
            />
          }
        >
          <ErrorBox error={formError} />
          <div className="form-grid">
            <Field label="Contact type">
              <Select
                value={form.contact_type || "individual"}
                onChange={(event) => set("contact_type", event.target.value)}
              >
                <option value="individual">Individual</option>
                <option value="company">Company</option>
              </Select>
            </Field>
            {form.contact_type === "company" ? (
              <Field label="Company name" required>
                <Input
                  value={form.company_name || ""}
                  onChange={(event) => set("company_name", event.target.value)}
                />
              </Field>
            ) : (
              <>
                <Field label="First name" required>
                  <Input
                    value={form.first_name || ""}
                    onChange={(event) => set("first_name", event.target.value)}
                  />
                </Field>
                <Field label="Last name">
                  <Input
                    value={form.last_name || ""}
                    onChange={(event) => set("last_name", event.target.value)}
                  />
                </Field>
              </>
            )}
            <Field label="Phone" required>
              <Input
                value={form.primary_phone || ""}
                onChange={(event) => set("primary_phone", event.target.value)}
              />
            </Field>
            <Field label="WhatsApp">
              <Input
                value={form.whatsapp || ""}
                onChange={(event) => set("whatsapp", event.target.value)}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email || ""}
                onChange={(event) => set("email", event.target.value)}
              />
            </Field>
            <Field label="Date of birth">
              <Input
                type="date"
                value={form.date_of_birth || ""}
                onChange={(event) => set("date_of_birth", event.target.value)}
              />
            </Field>
            <Field label="Gender">
              <Select
                value={form.gender || ""}
                onChange={(event) => set("gender", event.target.value)}
              >
                <option value="">Not specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Nationality">
              <Input
                value={form.nationality || ""}
                onChange={(event) => set("nationality", event.target.value)}
              />
            </Field>
            <Field label="National ID">
              <Input
                value={form.national_id || ""}
                onChange={(event) => set("national_id", event.target.value)}
              />
            </Field>
            <Field label="Passport number">
              <Input
                value={form.passport_no || ""}
                onChange={(event) => set("passport_no", event.target.value)}
              />
            </Field>
            <Field label="TIN">
              <Input
                value={form.tin || ""}
                onChange={(event) => set("tin", event.target.value)}
              />
            </Field>
            <Field label="NRB buyer">
              <Select
                value={form.is_nrb ? "yes" : "no"}
                onChange={(event) =>
                  set("is_nrb", event.target.value === "yes")
                }
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </Select>
            </Field>
            {form.is_nrb && (
              <Field label="NRB country">
                <Input
                  value={form.nrb_country || ""}
                  onChange={(event) => set("nrb_country", event.target.value)}
                />
              </Field>
            )}
            <Field label="Address">
              <Input
                value={form.address_line1 || ""}
                onChange={(event) => set("address_line1", event.target.value)}
              />
            </Field>
            <Field label="Area">
              <Input
                value={form.area || ""}
                onChange={(event) => set("area", event.target.value)}
              />
            </Field>
            <Field label="City">
              <Input
                value={form.city || ""}
                onChange={(event) => set("city", event.target.value)}
              />
            </Field>
            <Field label="District">
              <Input
                value={form.district || ""}
                onChange={(event) => set("district", event.target.value)}
              />
            </Field>
            <Field label="Postal code">
              <Input
                value={form.postal_code || ""}
                onChange={(event) => set("postal_code", event.target.value)}
              />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea
              rows={4}
              value={form.notes || ""}
              onChange={(event) => set("notes", event.target.value)}
            />
          </Field>
          <div className="cell-sub">
            After creation, the contact is linked to this{" "}
            {buyerDestination === "vendor"
              ? "property as vendor"
              : "buyer directory"}
            . KYC photos, IDs and financial evidence are collected through the
            linked onboarding profile.
          </div>
        </Drawer>
      )}

      {drawer === "withdrawal" &&
        (() => {
          // Mirror the backend attribution: cleared, unreversed receipts for
          // the chosen buyer — unallocated receipts count when they are the
          // only active buyer.
          const activeBuyers = transactionParties.filter(
            (party) =>
              party.party_type === "buyer" && party.status === "active",
          );
          const buyerCleared = (buyerId) =>
            payments
              .filter(
                (payment) =>
                  payment.direction === "incoming" &&
                  payment.status === "cleared" &&
                  !payment.reversal_of_payment_id &&
                  !reversedPaymentIds.has(Number(payment.id)) &&
                  (Number(payment.transaction_party_id) === Number(buyerId) ||
                    (!payment.transaction_party_id &&
                      activeBuyers.length === 1)),
              )
              .reduce((sum, payment) => sum + number(payment.amount), 0);
          const receivedFromBuyer = form.buyer_party_id
            ? buyerCleared(form.buyer_party_id)
            : 0;
          const forfeit = Math.max(0, number(form.owner_deduction));
          const companyFee = Math.max(0, number(form.company_deduction));
          const refundToBuyer = receivedFromBuyer - forfeit - companyFee;
          const overDeducted = minor(refundToBuyer) < 0;
          return (
            <Drawer
              title="Buyer Withdrawal — Forfeit, Fees & Refund"
              onClose={closeDrawer}
              width={650}
              footer={
                <DrawerActions
                  close={closeDrawer}
                  save={prepareWithdrawal}
                  saving={saving}
                  disabled={overDeducted || !form.buyer_party_id}
                  label="Prepare withdrawal"
                />
              }
            >
              <ErrorBox error={formError} />
              <p className="cell-sub" style={{ lineHeight: 1.6, marginTop: 0 }}>
                The buyer's money sits in the vendor's trust account. On
                withdrawal, the forfeit / fine and fees are deducted first and{" "}
                <strong>stay credited to the vendor's trust account</strong>;
                whatever remains is refunded to the buyer. The offer and full
                payment history are preserved, and the figures must pass
                accounts review and admin approval before any money moves.
              </p>
              <Field label="Withdrawing buyer" required>
                <Select
                  value={form.buyer_party_id || ""}
                  onChange={(event) =>
                    set("buyer_party_id", event.target.value)
                  }
                >
                  <option value="">Select buyer</option>
                  {activeBuyers.map((party) => (
                    <option key={party.id} value={party.id}>
                      {PartyName({ party })} · cleared{" "}
                      {money(buyerCleared(party.id))}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="form-grid">
                <Field label="Withdrawal date">
                  <Input
                    type="date"
                    value={form.withdrawal_date || ""}
                    onChange={(event) =>
                      set("withdrawal_date", event.target.value)
                    }
                  />
                </Field>
                <Field label="Forfeit / fine kept for the vendor (BDT)">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.owner_deduction || ""}
                    onChange={(event) =>
                      set("owner_deduction", event.target.value)
                    }
                  />
                </Field>
                <Field label="Seventh Sky admin fee (BDT)">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.company_deduction || ""}
                    onChange={(event) =>
                      set("company_deduction", event.target.value)
                    }
                  />
                </Field>
              </div>
              <div
                className="pm-card"
                style={{ padding: 14, margin: "4px 0 14px" }}
              >
                <div className="pm-eyebrow" style={{ marginBottom: 8 }}>
                  Live calculation
                </div>
                <KV
                  k="Cleared funds from this buyer"
                  v={money(receivedFromBuyer)}
                />
                <KV
                  k="Less forfeit / fine → vendor trust account"
                  v={`− ${money(forfeit)}`}
                />
                <KV
                  k="Less Seventh Sky admin fee"
                  v={`− ${money(companyFee)}`}
                />
                <div
                  className="between"
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: "1px solid var(--line)",
                    fontWeight: 800,
                    color: overDeducted ? "var(--bad)" : "var(--good)",
                  }}
                >
                  <span>Refund to buyer</span>
                  <span className="pm-num">{money(refundToBuyer)}</span>
                </div>
                {overDeducted && (
                  <div
                    className="cell-sub"
                    style={{ color: "var(--bad)", marginTop: 6 }}
                  >
                    Deductions exceed the buyer's cleared funds — reduce the
                    forfeit or fee.
                  </div>
                )}
              </div>
              <Field label="Withdrawal and deduction reason" required>
                <Textarea
                  rows={4}
                  value={form.reason || ""}
                  onChange={(event) => set("reason", event.target.value)}
                  placeholder="e.g. Buyer withdrew after finance fell through — 10% forfeit per clause 7 of the sale agreement"
                />
              </Field>
              <div className="cell-sub">
                After approval: pay the refund as an outgoing Buyer Refund
                payment; the forfeit stays as the vendor's trust balance until
                their payout. Cancellation completes when the withdrawal
                settlement is locked.
              </div>
            </Drawer>
          );
        })()}

      {drawer === "return" && (
        <Drawer
          title="Return Settlement"
          onClose={closeDrawer}
          footer={
            <DrawerActions
              close={closeDrawer}
              save={() => settlementAction("return")}
              saving={saving}
              label="Return for correction"
            />
          }
        >
          <ErrorBox error={formError} />
          <div
            style={{
              background: "var(--warn-bg)",
              border: "1px solid var(--warn)",
              padding: 12,
              borderRadius: 10,
              marginBottom: 12,
            }}
          >
            <strong>Approval will stop until corrections are submitted.</strong>
          </div>
          <Field label="Return reason" required>
            <Textarea
              rows={5}
              value={form.reason || ""}
              onChange={(event) => set("reason", event.target.value)}
            />
          </Field>
        </Drawer>
      )}
    </div>
  );
}
