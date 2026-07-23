import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileCheck2,
  FileClock,
  FileDown,
  FileText,
  History,
  ImagePlus,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import api from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Field,
  Input,
  Select,
  Spinner,
  StatusBadge,
  Textarea,
} from "../../ui/kit";
import FileUpload, { fileSrc } from "../../ui/FileUpload";

const TABS = [
  { key: "workflow", label: "Overview", icon: ClipboardCheck },
  { key: "site", label: "Site Assessment", icon: CheckCircle2 },
  { key: "appraisal", label: "Market Appraisal", icon: BarChart3 },
  { key: "proposal", label: "Owner Proposal", icon: FileCheck2 },
  { key: "kyc", label: "KYC & Verification", icon: ShieldCheck },
  { key: "reports", label: "Reports & History", icon: History },
];

const unwrap = (response) =>
  response?.data?.data ?? response?.data ?? response ?? {};

const parseArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return entry;
      return Object.fromEntries(
        Object.entries(entry).filter(([key]) => !/^\d+$/.test(key)),
      );
    });
  }
  if (typeof value === "string") {
    try {
      return parseArray(JSON.parse(value));
    } catch {
      return [];
    }
  }
  if (value && typeof value === "object") {
    return parseArray(value.rows || value.items || value.data || []);
  }
  return [];
};

const parseTextList = (value) => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    // Text columns may contain either JSON arrays or ordinary line-separated copy.
  }
  return value
    .split(/\r?\n/)
    .map((entry) => entry.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
};

const itemRating = (item) => {
  const value = item.condition_rating || item.condition_status;
  return value || "not_assessed";
};

const normalizeAssessmentItem = (item) => ({
  ...item,
  assessment_item: item.assessment_item || item.label || item.item_key || "",
  condition_rating: itemRating(item),
  finding: item.finding ?? item.notes ?? "",
  required_action: item.required_action ?? item.recommendation ?? "",
  is_blocking: item.is_blocking ?? item.priority === "critical",
  is_clean: item.is_clean ?? null,
  is_undamaged: item.is_undamaged ?? null,
  is_working: item.is_working ?? null,
});

const normalizeWorkspace = (raw) => {
  const assessment = raw.assessment
    ? {
        ...raw.assessment,
        condition_score:
          raw.assessment.condition_score ?? raw.assessment.overall_score,
        items: parseArray(raw.assessment.items).map(normalizeAssessmentItem),
      }
    : null;
  const appraisal = raw.appraisal
    ? {
        ...raw.appraisal,
        comparables: parseArray(raw.appraisal.comparables).map((entry) => ({
          ...entry,
          sale_date: entry.sale_date || entry.transaction_date || "",
        })),
        market_min:
          raw.appraisal.market_min ?? raw.appraisal.market_value_min,
        market_max:
          raw.appraisal.market_max ?? raw.appraisal.market_value_max,
        method: raw.appraisal.method || raw.appraisal.valuation_method,
        confidence:
          raw.appraisal.confidence ?? raw.appraisal.confidence_score,
        commentary:
          raw.appraisal.commentary ?? raw.appraisal.market_summary,
        strengths: parseTextList(raw.appraisal.strengths),
        weaknesses: parseTextList(raw.appraisal.weaknesses),
        assumptions: parseTextList(raw.appraisal.assumptions),
      }
    : null;
  return {
    ...raw,
    assessment,
    appraisal,
    proposals: parseArray(raw.proposals),
    reports: parseArray(raw.reports),
    vendors: parseArray(raw.vendors),
    role_profiles: parseArray(raw.role_profiles),
    kyc_documents: parseArray(raw.kyc_documents),
    documents: parseArray(raw.documents),
  };
};

const title = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const dateOnly = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-BD", { dateStyle: "medium" })
    : "Not set";

const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-BD", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not recorded";

const money = (value) =>
  value === null || value === undefined || value === ""
    ? "Not set"
    : `৳${Number(value || 0).toLocaleString("en-BD", {
        maximumFractionDigits: 0,
      })}`;

const optionalNumber = (value) =>
  value === "" || value === null || value === undefined ? null : Number(value);

const lines = (value) =>
  String(value || "")
    .split(/\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const messageFor = (error, fallback = "The request could not be completed") =>
  error.response?.data?.error || error.response?.data?.message || fallback;

const completedStatus = (status) =>
  ["approved", "accepted", "completed", "complete", "clear", "verified"].includes(
    String(status || "").toLowerCase(),
  );

const latestProposal = (proposals) =>
  [...proposals].sort(
    (left, right) =>
      new Date(right.updated_at || right.created_at || 0) -
      new Date(left.updated_at || left.created_at || 0),
  )[0] || null;

function WorkspacePanel({ icon: Icon, title: heading, sub, actions, children }) {
  return (
    <section className="pm-card sa-panel">
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
        {actions && <div className="sa-actions">{actions}</div>}
      </div>
      <div className="pm-card-body">{children}</div>
    </section>
  );
}

function ErrorNotice({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="sa-notice sa-notice-error" role="alert">
      <AlertTriangle size={18} />
      <span>{error}</span>
      {onRetry && (
        <Button size="sm" variant="ghost" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

function Choice({ label, value, onChange, disabled }) {
  return (
    <div className="sa-choice-field">
      <span>{label}</span>
      <div className="sa-choice" role="group" aria-label={label}>
        {[
          { value: true, label: "Yes" },
          { value: false, label: "No" },
          { value: null, label: "N/A" },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            className={value === option.value ? "on" : ""}
            onClick={() => onChange(option.value)}
            disabled={disabled}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PrivateEvidencePhoto({ itemId, index, alt, onRemove, disabled }) {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    api.get(`/sales/assessment-items/${itemId}/photos/${index}`, { responseType: "blob" })
      .then((response) => {
        if (!active) return;
        objectUrl = window.URL.createObjectURL(response.data);
        setSrc(objectUrl);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [itemId, index]);

  return (
    <figure>
      {src ? (
        <a href={src} target="_blank" rel="noreferrer">
          <img src={src} alt={alt} />
        </a>
      ) : (
        <div className="sa-private-photo-state">{failed ? "Preview unavailable" : <Spinner />}</div>
      )}
      <button type="button" aria-label={`Remove evidence photo ${index + 1}`} onClick={onRemove} disabled={disabled}>
        <X size={14} />
      </button>
    </figure>
  );
}

export default function SalesAssessmentWorkspace({
  propertyId,
  property: propertyProp,
  profile: profileProp,
  onChanged,
  onDirtyChange,
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [tab, setTab] = useState("workflow");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState("");
  const [openItem, setOpenItem] = useState(null);
  const [uploadState, setUploadState] = useState({});
  const [newItem, setNewItem] = useState({
    section: "",
    assessment_item: "",
    condition_rating: "not_assessed",
    is_blocking: false,
  });
  const [assessmentForm, setAssessmentForm] = useState({});
  const [assessmentBaseline, setAssessmentBaseline] = useState({});
  const [appraisalForm, setAppraisalForm] = useState({});
  const [appraisalBaseline, setAppraisalBaseline] = useState({});
  const [newComparable, setNewComparable] = useState({
    address: "",
    sale_price: "",
    sale_date: "",
    source: "",
    notes: "",
  });
  const [selectedProposalId, setSelectedProposalId] = useState("");
  const [proposalForm, setProposalForm] = useState({});
  const [proposalBaseline, setProposalBaseline] = useState({});
  const [dirtyItemIds, setDirtyItemIds] = useState([]);
  const [dirtyComparableIds, setDirtyComparableIds] = useState([]);

  const hydrate = (raw, preferredProposalId = selectedProposalId) => {
    const normalized = normalizeWorkspace(raw);
    setWorkspace(normalized);
    const assessment = normalized.assessment || {};
    const appraisal = normalized.appraisal || {};
    const nextAssessmentForm = {
      assessment_date: assessment.assessment_date || "",
      inspector_name: assessment.inspector_name || assessment.assessor_name || "",
      condition_score: assessment.condition_score ?? "",
      marketability_score: assessment.marketability_score ?? "",
      occupancy_status: assessment.occupancy_status || "",
      access_notes: assessment.access_notes || "",
      summary: assessment.summary || assessment.condition_summary || "",
      marketability_notes: assessment.marketability_notes || "",
      recommended_actions: assessment.recommended_actions || "",
    };
    const nextAppraisalForm = {
      market_min: appraisal.market_min ?? appraisal.market_value_min ?? "",
      market_max: appraisal.market_max ?? appraisal.market_value_max ?? "",
      recommended_value:
        appraisal.recommended_value ?? appraisal.recommended_price ?? "",
      approved_value: appraisal.approved_value ?? appraisal.approved_price ?? "",
      reserve_value: appraisal.reserve_value ?? appraisal.reserve_price ?? "",
      quick_sale_value: appraisal.quick_sale_value ?? "",
      method: appraisal.method || appraisal.valuation_method || "comparative_market",
      expected_days: appraisal.expected_days ?? appraisal.expected_days_on_market ?? "",
      confidence:
        appraisal.confidence ?? appraisal.confidence_level ?? appraisal.confidence_score ?? "",
      commentary: appraisal.commentary || "",
      strengths: parseTextList(appraisal.strengths).join("\n"),
      weaknesses: parseTextList(appraisal.weaknesses).join("\n"),
      assumptions: parseTextList(appraisal.assumptions).join("\n"),
      disclaimer: appraisal.disclaimer || "",
    };
    setAssessmentForm(nextAssessmentForm);
    setAssessmentBaseline(nextAssessmentForm);
    setAppraisalForm(nextAppraisalForm);
    setAppraisalBaseline(nextAppraisalForm);
    setDirtyItemIds([]);
    setDirtyComparableIds([]);
    const proposals = normalized.proposals;
    const selected =
      proposals.find((entry) => String(entry.id) === String(preferredProposalId)) ||
      latestProposal(proposals);
    if (selected) {
      setSelectedProposalId(String(selected.id));
      const nextProposalForm = {
        title: selected.title || selected.summary || "",
        strategy: parseTextList(
          selected.strategy || selected.marketing_plan,
        ).join("\n"),
        terms: selected.terms || "",
        asking_price:
          selected.asking_price ??
          selected.proposed_asking_price ??
          selected.proposed_value ??
          selected.list_price ??
          "",
        reserve_price:
          selected.reserve_price ?? selected.proposed_reserve_price ?? "",
        agency_type: selected.agency_type || "exclusive",
        commission_percent: selected.commission_percent ?? "",
        commission_fixed: selected.commission_fixed ?? "",
        marketing_budget: selected.marketing_budget ?? "",
        valid_until: selected.valid_until || selected.valid_date || "",
      };
      setProposalForm(nextProposalForm);
      setProposalBaseline(nextProposalForm);
    } else {
      setSelectedProposalId("");
      setProposalForm({});
      setProposalBaseline({});
    }
  };

  const loadWorkspace = async (quiet = false, preferredProposalId) => {
    if (!quiet) setLoading(true);
    setLoadError("");
    try {
      const response = await api.get(
        `/sales/properties/${propertyId}/assessment-workspace`,
      );
      hydrate(unwrap(response), preferredProposalId);
    } catch (error) {
      setLoadError(messageFor(error, "Failed to load the assessment workspace"));
      if (!quiet) setWorkspace(null);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    api
      .get(`/sales/properties/${propertyId}/assessment-workspace`)
      .then((response) => {
        if (active) hydrate(unwrap(response));
      })
      .catch((error) => {
        if (active) {
          setWorkspace(null);
          setLoadError(messageFor(error, "Failed to load the assessment workspace"));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // The parent property object can refresh independently; the workspace keys off the id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const run = async (key, request, success, options = {}) => {
    if (options.confirm && !window.confirm(options.confirm)) return false;
    setBusy(key);
    setActionError("");
    try {
      const response = await request();
      toast.success(success);
      const payload = unwrap(response);
      if (options.reload !== false) {
        await loadWorkspace(true, options.proposalId?.(payload));
      }
      onChanged?.();
      return payload || true;
    } catch (error) {
      const message = messageFor(error);
      setActionError(message);
      toast.error(message);
      return false;
    } finally {
      setBusy("");
    }
  };

  const property = workspace?.property || propertyProp || {};
  const profile = workspace?.profile || profileProp || {};
  const assessment = workspace?.assessment || null;
  const appraisal = workspace?.appraisal || null;
  const proposals = workspace?.proposals || [];
  const reports = workspace?.reports || [];
  const roleProfiles = workspace?.role_profiles || [];
  const kycDocuments = workspace?.kyc_documents || [];
  const documents = workspace?.documents || [];
  const proposal =
    proposals.find((entry) => String(entry.id) === String(selectedProposalId)) ||
    latestProposal(proposals);

  const roleKycComplete =
    roleProfiles.length > 0 &&
    roleProfiles.every((entry) =>
      completedStatus(entry.kyc_status || entry.verification_status || entry.status)
      && completedStatus(entry.documents_status),
    );
  const kycStatus = roleKycComplete
    ? "complete"
    : roleProfiles.length
      ? "in_progress"
      : "not_started";

  const assessmentApproved = completedStatus(assessment?.status);
  const appraisalApproved = completedStatus(appraisal?.status);
  const proposalAccepted = String(proposal?.status || "").toLowerCase() === "accepted";
  const canPrepare = ["super_admin", "branch_admin", "property_manager", "sales_executive"].includes(user?.role);
  const canReview = ["super_admin", "branch_admin", "property_manager"].includes(user?.role);
  const assessmentEditable =
    canPrepare && (!assessment || ["draft", "changes_requested"].includes(assessment.status));
  const appraisalEditable =
    canPrepare && (!appraisal || ["draft", "changes_requested"].includes(appraisal.status));
  const proposalEditable =
    canPrepare && (!proposal || ["draft", "generated"].includes(proposal.status));
  const assessmentDirty = Boolean(assessment) &&
    JSON.stringify(assessmentForm) !== JSON.stringify(assessmentBaseline);
  const appraisalDirty = Boolean(appraisal) &&
    JSON.stringify(appraisalForm) !== JSON.stringify(appraisalBaseline);
  const proposalDirty = Boolean(proposal) &&
    JSON.stringify(proposalForm) !== JSON.stringify(proposalBaseline);
  const hasDirtyState = assessmentDirty || appraisalDirty || proposalDirty ||
    dirtyItemIds.length > 0 || dirtyComparableIds.length > 0;
  const tabIsDirty = {
    site: assessmentDirty || dirtyItemIds.length > 0,
    appraisal: appraisalDirty || dirtyComparableIds.length > 0,
    proposal: proposalDirty,
  }[tab];

  useEffect(() => {
    if (!hasDirtyState) return undefined;
    const warnBeforeLeave = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [hasDirtyState]);

  useEffect(() => {
    onDirtyChange?.(hasDirtyState);
    return () => onDirtyChange?.(false);
  }, [hasDirtyState, onDirtyChange]);

  const openTab = (nextTab) => {
    if (nextTab === tab) return;
    if (
      tabIsDirty &&
      !window.confirm("You have unsaved changes in this stage. Leave without saving them?")
    ) {
      return;
    }
    if (tabIsDirty) loadWorkspace(true);
    setTab(nextTab);
  };

  let nextAction = {
    label: "Create the site assessment",
    tab: "site",
    detail: "Record room condition and private evidence before pricing.",
  };
  if (assessment && !assessmentApproved) {
    nextAction = {
      label:
        assessment.status === "submitted"
          ? "Review and approve the site assessment"
          : "Complete and submit the site assessment",
      tab: "site",
      detail: "Resolve blockers and make sure every inspected item is recorded.",
    };
  } else if (assessmentApproved && !appraisal) {
    nextAction = {
      label: "Prepare the market appraisal",
      tab: "appraisal",
      detail: "Set the recommended range and supporting comparables.",
    };
  } else if (appraisal && !appraisalApproved) {
    nextAction = {
      label:
        appraisal.status === "submitted"
          ? "Approve the appraisal"
          : "Complete and submit the appraisal",
      tab: "appraisal",
      detail: "Validate the pricing rationale before owner presentation.",
    };
  } else if (appraisalApproved && !proposal) {
    nextAction = {
      label: "Create the owner proposal",
      tab: "proposal",
      detail: "Turn the approved appraisal and fee profile into owner-facing terms.",
    };
  } else if (proposal && !proposalAccepted) {
    nextAction = {
      label:
        proposal.status === "sent"
          ? "Follow up on owner acceptance"
          : "Generate and send the owner proposal",
      tab: "proposal",
      detail: "This proposal is for the property owner, not a buyer offer.",
    };
  } else if (!roleKycComplete) {
    nextAction = {
      label: "Complete vendor KYC and verification",
      tab: "kyc",
      detail: "Keep identity and ownership evidence private and branch protected.",
    };
  } else {
    nextAction = {
      label: "Assessment pack complete",
      tab: "reports",
      detail: "Review generated versions and proceed with the sales listing workflow.",
    };
  }

  const stages = [
    {
      label: "Overview",
      detail: "Sales terms and vendor authority are recorded.",
      done: Boolean(profile?.id || Object.keys(profile || {}).length),
      tab: "workflow",
    },
    {
      label: "Site Assessment",
      detail: assessment
        ? `${assessment.items?.length || 0} condition items · ${title(assessment.status)}`
        : "Room condition, findings, blockers and private photos.",
      done: assessmentApproved,
      current: Boolean(assessment) || Boolean(profile?.id),
      locked: !profile?.id && !Object.keys(profile || {}).length,
      tab: "site",
    },
    {
      label: "Market Appraisal",
      detail: appraisal
        ? `${money(appraisal.recommended_value ?? appraisal.recommended_price)} recommended · ${title(appraisal.status)}`
        : "Pricing range, method, assumptions and comparables.",
      done: appraisalApproved,
      current: assessmentApproved,
      locked: !assessmentApproved,
      tab: "appraisal",
    },
    {
      label: "Owner Proposal",
      detail: proposal
        ? `${title(proposal.status)} · ${dateOnly(proposal.valid_until || proposal.valid_date)}`
        : "Owner-facing strategy, value, commission and budget.",
      done: proposalAccepted,
      current: appraisalApproved,
      locked: !appraisalApproved,
      tab: "proposal",
    },
    {
      label: "KYC & Verification",
      detail: `${roleProfiles.length} role profile${roleProfiles.length === 1 ? "" : "s"} · ${kycDocuments.length} KYC document${kycDocuments.length === 1 ? "" : "s"}`,
      done: roleKycComplete,
      current: Boolean(profile?.id),
      locked: !profile?.id,
      tab: "kyc",
    },
    {
      label: "Reports & History",
      detail: "Owner acceptance, KYC and approved assessment pack are complete.",
      done: proposalAccepted && roleKycComplete && appraisalApproved,
      current: proposalAccepted && roleKycComplete,
      locked: !(proposalAccepted && roleKycComplete),
      tab: "reports",
    },
  ];

  const createAssessment = () =>
    run(
      "create-assessment",
      () =>
        api.post(`/sales/properties/${propertyId}/assessments`, {
          assessment_date: new Date().toISOString().slice(0, 10),
        }),
      "Site assessment created",
    );

  const saveAssessment = async () => {
    const saved = await run(
      "save-assessment",
      () =>
        api.put(`/sales/assessments/${assessment.id}`, {
          assessment_date: assessmentForm.assessment_date || null,
          inspector_name: assessmentForm.inspector_name || "",
          occupancy_status: assessmentForm.occupancy_status || "",
          condition_score: optionalNumber(assessmentForm.condition_score),
          marketability_score: optionalNumber(assessmentForm.marketability_score),
          overall_score: optionalNumber(assessmentForm.condition_score),
          summary: assessmentForm.summary || "",
          condition_summary: assessmentForm.summary || "",
          access_notes: assessmentForm.access_notes || "",
          marketability_notes: assessmentForm.marketability_notes || "",
          recommended_actions: assessmentForm.recommended_actions || "",
        }),
      "Assessment header saved",
      { reload: false },
    );
    if (saved) setAssessmentBaseline({ ...assessmentForm });
    return saved;
  };

  const assessmentAction = async (action) =>
    {
      const reason =
        action === "reopen"
          ? window.prompt("Reason for reopening this assessment:")
          : "";
      if (action === "reopen" && !reason?.trim()) return;
      if (action === "submit") {
        if (assessmentDirty && !(await saveAssessment())) return;
        for (const itemId of dirtyItemIds) {
          const dirtyItem = assessment.items.find((entry) => entry.id === itemId);
          if (dirtyItem && !(await saveItem(dirtyItem))) return;
        }
      }
      return run(
        `assessment-${action}`,
        () =>
          api.post(`/sales/assessments/${assessment.id}/${action}`, {
            ...(reason ? { reason: reason.trim() } : {}),
          }),
        `Assessment ${{ submit: "submitted", approve: "approved", reopen: "reopened" }[action]}`,
        action === "reopen"
          ? { confirm: "Reopen this assessment for editing?" }
          : {},
      );
    };

  const addItem = async () => {
    if (!newItem.section.trim() || !newItem.assessment_item.trim()) {
      setActionError("Area and assessment item are required.");
      return;
    }
    const added = await run(
      "add-item",
      () =>
        api.post(`/sales/assessments/${assessment.id}/items`, {
          ...newItem,
          label: newItem.assessment_item,
          condition_status: newItem.condition_rating || "not_assessed",
          priority: newItem.is_blocking ? "critical" : "low",
        }),
      "Assessment item added",
      { reload: false },
    );
    if (added) {
      setWorkspace((current) => ({
        ...current,
        assessment: {
          ...current.assessment,
          items: [...current.assessment.items, normalizeAssessmentItem(added)],
        },
      }));
      setNewItem({
        section: "",
        assessment_item: "",
        condition_rating: "not_assessed",
        is_blocking: false,
      });
    }
  };

  const patchLocalItem = (itemId, key, value) => {
    setDirtyItemIds((current) =>
      current.includes(itemId) ? current : [...current, itemId],
    );
    setWorkspace((current) => ({
      ...current,
      assessment: {
        ...current.assessment,
        items: current.assessment.items.map((entry) =>
          entry.id === itemId ? { ...entry, [key]: value } : entry,
        ),
      },
    }));
  };

  const saveItem = async (item) => {
    const saved = await run(
      `save-item-${item.id}`,
      () =>
        api.put(`/sales/assessment-items/${item.id}`, {
          section: item.section,
          label: item.assessment_item,
          assessment_item: item.assessment_item,
          is_clean: item.is_clean ?? null,
          is_undamaged: item.is_undamaged ?? null,
          is_working: item.is_working ?? null,
          condition_rating: item.condition_rating || "not_assessed",
          condition_status: item.condition_rating || "not_assessed",
          finding: item.finding || "",
          notes: item.finding || "",
          required_action: item.required_action || "",
          recommendation: item.required_action || "",
          is_blocking: Boolean(item.is_blocking),
          priority: item.is_blocking ? "critical" : "low",
          photos: parseArray(item.photos),
        }),
      "Assessment item saved",
      { reload: false },
    );
    if (saved) {
      setDirtyItemIds((current) => current.filter((id) => id !== item.id));
    }
    return saved;
  };

  const deleteItem = async (item) => {
    const deleted = await run(
      `delete-item-${item.id}`,
      () => api.delete(`/sales/assessment-items/${item.id}`),
      "Assessment item removed",
      { confirm: `Delete “${item.assessment_item || "this item"}”?`, reload: false },
    );
    if (deleted) {
      setDirtyItemIds((current) => current.filter((id) => id !== item.id));
      setWorkspace((current) => ({
        ...current,
        assessment: {
          ...current.assessment,
          items: current.assessment.items.filter((entry) => entry.id !== item.id),
        },
      }));
    }
  };

  const persistPhotos = async (item, photos, success) => {
    setActionError("");
    try {
      await api.put(`/sales/assessment-items/${item.id}`, { photos });
      toast.success(success);
      setWorkspace((current) => ({
        ...current,
        assessment: {
          ...current.assessment,
          items: current.assessment.items.map((entry) =>
            entry.id === item.id ? { ...entry, photos } : entry,
          ),
        },
      }));
      onChanged?.();
    } catch (error) {
      const message = messageFor(error, "Could not save the photo evidence");
      setActionError(message);
      toast.error(message);
      throw error;
    }
  };

  const appendUploadedPhoto = async (item, url) => {
    if (!url) return;
    const photos = [...parseArray(item.photos), url];
    setUploadState((current) => ({ ...current, [item.id]: "Saving photo…" }));
    try {
      await persistPhotos(item, photos, "Private photo added");
    } catch {
      // persistPhotos already reports the API error in the workspace and toast.
    } finally {
      setUploadState((current) => ({ ...current, [item.id]: "" }));
    }
  };

  const uploadPhotoFiles = async (item, fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setActionError("");
    const uploaded = [];
    try {
      for (let index = 0; index < files.length; index += 1) {
        const formData = new FormData();
        formData.append("file", files[index]);
        setUploadState((current) => ({
          ...current,
          [item.id]: `Uploading ${index + 1} of ${files.length}…`,
        }));
        const response = await api.post("/uploads?folder=documents", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (event) => {
            if (!event.total) return;
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadState((current) => ({
              ...current,
              [item.id]: `Uploading ${index + 1} of ${files.length} · ${percent}%`,
            }));
          },
        });
        const payload = unwrap(response);
        const url = payload.url || payload.file_url || response.data?.url;
        if (!url) throw new Error("Upload did not return a file URL");
        uploaded.push(url);
      }
      setUploadState((current) => ({ ...current, [item.id]: "Saving photos…" }));
      await persistPhotos(
        item,
        [...parseArray(item.photos), ...uploaded],
        `${uploaded.length} private photo${uploaded.length === 1 ? "" : "s"} added`,
      );
    } catch (error) {
      if (!error.response) {
        setActionError(error.message || "Photo upload failed");
        toast.error(error.message || "Photo upload failed");
      }
    } finally {
      setUploadState((current) => ({ ...current, [item.id]: "" }));
    }
  };

  const removePhoto = async (item, photo) => {
    try {
      await persistPhotos(
        item,
        parseArray(item.photos).filter((entry) => entry !== photo),
        "Private photo removed",
      );
    } catch {
      // persistPhotos already reports the API error in the workspace and toast.
    }
  };

  const validateAppraisal = () => {
    const errors = [];
    const min = optionalNumber(appraisalForm.market_min);
    const max = optionalNumber(appraisalForm.market_max);
    const recommended = optionalNumber(appraisalForm.recommended_value);
    if (min === null || max === null || recommended === null) {
      errors.push("Market minimum, maximum and recommended value are required.");
    }
    if (min !== null && max !== null && min > max) {
      errors.push("Market minimum cannot exceed market maximum.");
    }
    if (
      recommended !== null &&
      min !== null &&
      max !== null &&
      (recommended < min || recommended > max)
    ) {
      errors.push("Recommended value must sit inside the market range.");
    }
    if (!appraisalForm.method) errors.push("Select an appraisal method.");
    setActionError(errors.join(" "));
    return errors.length === 0;
  };

  const appraisalPayload = () => ({
    market_min: optionalNumber(appraisalForm.market_min),
    market_max: optionalNumber(appraisalForm.market_max),
    market_value_min: optionalNumber(appraisalForm.market_min),
    market_value_max: optionalNumber(appraisalForm.market_max),
    recommended_value: optionalNumber(appraisalForm.recommended_value),
    approved_value: optionalNumber(appraisalForm.approved_value),
    reserve_value: optionalNumber(appraisalForm.reserve_value),
    quick_sale_value: optionalNumber(appraisalForm.quick_sale_value),
    method: appraisalForm.method,
    valuation_method: appraisalForm.method,
    expected_days: optionalNumber(appraisalForm.expected_days),
    confidence: optionalNumber(appraisalForm.confidence),
    confidence_score: optionalNumber(appraisalForm.confidence),
    commentary: appraisalForm.commentary || "",
    market_summary: appraisalForm.commentary || "",
    strengths: lines(appraisalForm.strengths),
    weaknesses: lines(appraisalForm.weaknesses),
    assumptions: lines(appraisalForm.assumptions).join("\n"),
    disclaimer: appraisalForm.disclaimer || "",
  });

  const saveAppraisal = async () => {
    if (!validateAppraisal()) return;
    const saved = await run(
      "save-appraisal",
      () =>
        appraisal
          ? api.put(`/sales/appraisals/${appraisal.id}`, appraisalPayload())
          : api.post(
              `/sales/assessments/${assessment.id}/appraisal`,
              appraisalPayload(),
            ),
      appraisal ? "Appraisal saved" : "Appraisal created",
      appraisal ? { reload: false } : {},
    );
    if (saved && appraisal) setAppraisalBaseline({ ...appraisalForm });
    return saved;
  };

  const appraisalAction = async (action) => {
    if (action === "submit" && !validateAppraisal()) return;
    if (action === "submit") {
      if (appraisalDirty && !(await saveAppraisal())) return;
      for (const comparableId of dirtyComparableIds) {
        const dirtyComparable = appraisal.comparables.find(
          (entry) => entry.id === comparableId,
        );
        if (dirtyComparable && !(await saveComparable(dirtyComparable))) return;
      }
    }
    return run(
      `appraisal-${action}`,
      () => api.post(`/sales/appraisals/${appraisal.id}/${action}`),
      action === "generate-report"
        ? "Appraisal report generated"
        : `Appraisal ${{ submit: "submitted", approve: "approved" }[action]}`,
    );
  };

  const patchComparable = (id, key, value) => {
    setDirtyComparableIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
    setWorkspace((current) => ({
      ...current,
      appraisal: {
        ...current.appraisal,
        comparables: current.appraisal.comparables.map((entry) =>
          entry.id === id ? { ...entry, [key]: value } : entry,
        ),
      },
    }));
  };

  const addComparable = async () => {
    if (!newComparable.address.trim() || !newComparable.sale_price) {
      setActionError("Comparable address and sale price are required.");
      return;
    }
    const added = await run(
      "add-comparable",
      () =>
        api.post(`/sales/appraisals/${appraisal.id}/comparables`, {
          ...newComparable,
          sale_price: optionalNumber(newComparable.sale_price),
          transaction_date: newComparable.sale_date || null,
        }),
      "Comparable added",
      { reload: false },
    );
    if (added) {
      setWorkspace((current) => ({
        ...current,
        appraisal: {
          ...current.appraisal,
          comparables: [
            ...current.appraisal.comparables,
            { ...added, sale_date: added.sale_date || added.transaction_date || "" },
          ],
        },
      }));
      setNewComparable({
        address: "",
        sale_price: "",
        sale_date: "",
        source: "",
        notes: "",
      });
    }
  };

  const saveComparable = async (entry) => {
    const saved = await run(
      `save-comparable-${entry.id}`,
      () =>
        api.put(`/sales/appraisal-comparables/${entry.id}`, {
          address: entry.address || entry.property_address || "",
          sale_price: optionalNumber(entry.sale_price || entry.price),
          sale_date: entry.sale_date || entry.transaction_date || null,
          transaction_date: entry.sale_date || entry.transaction_date || null,
          source: entry.source || "",
          notes: entry.notes || "",
        }),
      "Comparable saved",
      { reload: false },
    );
    if (saved) {
      setDirtyComparableIds((current) => current.filter((id) => id !== entry.id));
    }
    return saved;
  };

  const deleteComparable = async (entry) => {
    const deleted = await run(
      `delete-comparable-${entry.id}`,
      () => api.delete(`/sales/appraisal-comparables/${entry.id}`),
      "Comparable removed",
      { confirm: `Delete comparable “${entry.address || entry.property_address}”?`, reload: false },
    );
    if (deleted) {
      setDirtyComparableIds((current) => current.filter((id) => id !== entry.id));
      setWorkspace((current) => ({
        ...current,
        appraisal: {
          ...current.appraisal,
          comparables: current.appraisal.comparables.filter((item) => item.id !== entry.id),
        },
      }));
    }
  };

  const createProposal = async () => {
    if (proposalDirty && !(await saveProposal())) return;
    const proposedValue =
      appraisal?.approved_value ??
      appraisal?.approved_price ??
      appraisal?.recommended_value ??
      appraisal?.recommended_price ??
      "";
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + 14);
    run(
      "create-proposal",
      () => {
        const proposalTitle = `${property.title || property.property_code || "Property"} sales proposal`;
        const proposalStrategy =
          "Launch at the approved recommended value, supported by the appraisal evidence.";
        return api.post(`/sales/assessments/${assessment.id}/proposals`, {
          appraisal_id: appraisal.id,
          title: proposalTitle,
          summary: proposalTitle,
          strategy: proposalStrategy,
          marketing_strategy: proposalStrategy,
          marketing_plan: [proposalStrategy],
          terms: profile.notes || "",
          asking_price: optionalNumber(proposedValue),
          proposed_asking_price: optionalNumber(proposedValue),
          reserve_price: optionalNumber(
            profile.reserve_price ?? appraisal.reserve_value,
          ),
          proposed_reserve_price: optionalNumber(
            profile.reserve_price ?? appraisal.reserve_value,
          ),
          agency_type: profile.agency_type || "exclusive",
          commission_percent: optionalNumber(profile.commission_percent),
          commission_fixed: optionalNumber(profile.commission_fixed),
          marketing_budget: optionalNumber(profile.marketing_budget),
          valid_until: validDate.toISOString().slice(0, 10),
        });
      },
      "Owner proposal created from the appraisal and sales profile",
      { proposalId: (created) => String(created.id) },
    );
  };

  const saveProposal = async () => {
    if (!proposalForm.title?.trim()) {
      setActionError("Owner-facing proposal title is required.");
      return;
    }
    const saved = await run(
      "save-proposal",
      () =>
        api.put(`/sales/proposals/${proposal.id}`, {
          title: proposalForm.title,
          summary: proposalForm.title,
          strategy: proposalForm.strategy || "",
          marketing_strategy: proposalForm.strategy || "",
          marketing_plan: lines(proposalForm.strategy),
          terms: proposalForm.terms || "",
          asking_price: optionalNumber(proposalForm.asking_price),
          proposed_asking_price: optionalNumber(proposalForm.asking_price),
          reserve_price: optionalNumber(proposalForm.reserve_price),
          proposed_reserve_price: optionalNumber(proposalForm.reserve_price),
          agency_type: proposalForm.agency_type || null,
          commission_percent: optionalNumber(proposalForm.commission_percent),
          commission_fixed: optionalNumber(proposalForm.commission_fixed),
          marketing_budget: optionalNumber(proposalForm.marketing_budget),
          valid_until: proposalForm.valid_until || null,
        }),
      "Owner proposal saved",
      { reload: false },
    );
    if (saved) setProposalBaseline({ ...proposalForm });
    return saved;
  };

  const proposalAction = async (action) => {
    const reason =
      action === "reject"
        ? window.prompt("Reason for rejecting this owner proposal:")
        : "";
    if (action === "reject" && !reason?.trim()) return;
    if (["generate", "send"].includes(action) && proposalDirty) {
      if (!(await saveProposal())) return;
    }
    return run(
      `proposal-${action}`,
      () =>
        api.post(`/sales/proposals/${proposal.id}/${action}`, {
          ...(reason ? { reason: reason.trim() } : {}),
        }),
      action === "generate"
        ? "Owner proposal PDF generated"
        : `Owner proposal ${action === "send" ? "sent" : `${action}ed`}`,
      ["accept", "reject"].includes(action)
        ? { confirm: `${title(action)} this owner proposal?` }
        : {},
    );
  };

  const selectProposal = (id) => {
    if (
      proposalDirty &&
      !window.confirm("Leave this proposal version without saving your changes?")
    ) {
      return;
    }
    const selected = proposals.find((entry) => String(entry.id) === String(id));
    setSelectedProposalId(String(id));
    if (!selected) return;
    const nextProposalForm = {
      title: selected.title || selected.summary || "",
      strategy: parseTextList(
        selected.strategy || selected.marketing_plan,
      ).join("\n"),
      terms: selected.terms || "",
      asking_price:
        selected.asking_price ??
        selected.proposed_asking_price ??
        selected.proposed_value ??
        selected.list_price ??
        "",
      reserve_price:
        selected.reserve_price ?? selected.proposed_reserve_price ?? "",
      agency_type: selected.agency_type || "exclusive",
      commission_percent: selected.commission_percent ?? "",
      commission_fixed: selected.commission_fixed ?? "",
      marketing_budget: selected.marketing_budget ?? "",
      valid_until: selected.valid_until || selected.valid_date || "",
    };
    setProposalForm(nextProposalForm);
    setProposalBaseline(nextProposalForm);
  };

  const downloadReport = async (report) => {
    setBusy(`download-${report.id}`);
    setActionError("");
    try {
      const response = await api.get(`/sales/reports/${report.id}/download`, {
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(response.data);
      const disposition = response.headers?.["content-disposition"] || "";
      const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const plainName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
      const name = encodedName
        ? decodeURIComponent(encodedName)
        : plainName ||
          `${report.report_type || report.kind || report.report_kind || "sales-report"}-v${report.version_number || report.version || 1}.pdf`;
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      const message = messageFor(error, "Report download failed");
      setActionError(message);
      toast.error(message);
    } finally {
      setBusy("");
    }
  };

  if (loading) {
    return (
      <div className="sa-workspace sa-loading">
        <Spinner />
        <span>Loading assessment workspace…</span>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="sa-workspace">
        <ErrorNotice error={loadError} onRetry={() => loadWorkspace()} />
        <EmptyState
          icon={ClipboardCheck}
          title="Assessment workspace unavailable"
          sub="The sales assessment API did not return this property workspace."
          action={
            <Button icon={RefreshCw} onClick={() => loadWorkspace()}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  const conditionScore =
    assessment?.condition_score === null || assessment?.condition_score === undefined
      ? "—"
      : `${assessment.condition_score}/100`;
  const marketabilityScore =
    assessment?.marketability_score === null ||
    assessment?.marketability_score === undefined
      ? "—"
      : `${assessment.marketability_score}/100`;
  const approvedValue =
    appraisal?.approved_value ??
    appraisal?.approved_price ??
    appraisal?.recommended_value ??
    appraisal?.recommended_price;
  const rangeMin = appraisal?.market_min ?? appraisal?.market_value_min;
  const rangeMax = appraisal?.market_max ?? appraisal?.market_value_max;
  const activeStage = stages.find((stage) => stage.tab === tab) || stages[0];
  const activeTab = TABS.find((entry) => entry.key === tab) || TABS[0];
  const completedStages = stages.filter((stage) => stage.done).length;
  const blockingItems = assessment?.items?.filter((item) => item.is_blocking).length || 0;
  const activeStatus = tab === "site"
    ? assessment?.status || "not_started"
    : tab === "appraisal"
      ? appraisal?.status || "not_started"
      : tab === "proposal"
        ? proposal?.status || "not_started"
        : tab === "kyc"
          ? kycStatus
          : tab === "reports"
            ? reports.length ? "available" : "not_started"
            : completedStages === stages.length ? "complete" : "in_progress";

  const contextualActions = (() => {
    if (tab === "site") {
      if (!assessment) {
        return canPrepare ? (
          <Button icon={Plus} onClick={createAssessment} disabled={Boolean(busy) || !assessmentEditable}>
            {busy === "create-assessment" ? <Spinner /> : "Create assessment"}
          </Button>
        ) : null;
      }
      return (
        <>
          <Button variant="ghost" icon={Save} onClick={saveAssessment} disabled={Boolean(busy) || !assessmentEditable || !assessmentDirty}>
            {busy === "save-assessment" ? <Spinner /> : "Save changes"}
          </Button>
          {canPrepare && ["draft", "changes_requested"].includes(assessment.status) && (
            <Button onClick={() => assessmentAction("submit")} disabled={Boolean(busy) || !assessmentEditable}>Submit assessment</Button>
          )}
          {canReview && assessment.status === "submitted" && (
            <Button onClick={() => assessmentAction("approve")} disabled={Boolean(busy)}>Approve assessment</Button>
          )}
          {canReview && assessmentApproved && (
            <Button variant="ghost" onClick={() => assessmentAction("reopen")} disabled={Boolean(busy)}>Reopen</Button>
          )}
        </>
      );
    }
    if (tab === "appraisal") {
      if (!assessmentApproved) return <Button onClick={() => openTab("site")}>Open site assessment</Button>;
      return (
        <>
          <Button variant="ghost" icon={Save} onClick={saveAppraisal} disabled={Boolean(busy) || !appraisalEditable || (Boolean(appraisal) && !appraisalDirty)}>
            {busy === "save-appraisal" ? <Spinner /> : appraisal ? "Save changes" : "Create appraisal"}
          </Button>
          {canPrepare && appraisal && ["draft", "changes_requested"].includes(appraisal.status) && (
            <Button onClick={() => appraisalAction("submit")} disabled={Boolean(busy) || !appraisalEditable}>Submit appraisal</Button>
          )}
          {canReview && appraisal?.status === "submitted" && (
            <Button onClick={() => appraisalAction("approve")} disabled={Boolean(busy)}>Approve appraisal</Button>
          )}
          {canPrepare && appraisal?.status === "approved" && (
            <Button variant="ghost" icon={FileDown} onClick={() => appraisalAction("generate-report")} disabled={Boolean(busy) || !appraisalEditable}>Generate report</Button>
          )}
        </>
      );
    }
    if (tab === "proposal") {
      if (!appraisalApproved) return <Button onClick={() => openTab("appraisal")}>Open appraisal</Button>;
      if (!proposal) {
        return canPrepare ? (
          <Button icon={Plus} onClick={createProposal} disabled={Boolean(busy) || !proposalEditable}>
            {busy === "create-proposal" ? <Spinner /> : "Create owner proposal"}
          </Button>
        ) : null;
      }
      return (
        <>
          <Button variant="ghost" icon={Save} onClick={saveProposal} disabled={Boolean(busy) || !proposalEditable || !proposalDirty}>
            {busy === "save-proposal" ? <Spinner /> : "Save changes"}
          </Button>
          {canPrepare && proposalEditable && (
            <Button variant="ghost" icon={FileDown} onClick={() => proposalAction("generate")} disabled={Boolean(busy) || !proposalEditable}>Generate PDF</Button>
          )}
          {canPrepare && proposal.status === "generated" && (
            <Button icon={Send} onClick={() => proposalAction("send")} disabled={Boolean(busy) || !proposalEditable}>Send to owner</Button>
          )}
          {canPrepare && proposal.status === "sent" && (
            <><Button onClick={() => proposalAction("accept")} disabled={Boolean(busy)}>Accept</Button><Button variant="danger" onClick={() => proposalAction("reject")} disabled={Boolean(busy)}>Reject</Button></>
          )}
          {canPrepare && <Button variant="ghost" icon={Plus} onClick={createProposal} disabled={Boolean(busy) || !proposalEditable}>New version</Button>}
        </>
      );
    }
    if (tab === "kyc") {
      return (
        <>
          <Button variant="ghost" icon={ExternalLink} onClick={() => navigate(`/role-onboarding?property_id=${propertyId}&sales_roles=1`)}>Role onboarding</Button>
          <Button icon={ExternalLink} onClick={() => navigate(`/compliance?listing_type=sale&property_id=${propertyId}`)}>Compliance review</Button>
        </>
      );
    }
    if (tab === "reports") {
      return <Button variant="ghost" icon={RefreshCw} onClick={() => loadWorkspace()} disabled={Boolean(busy)}>Refresh records</Button>;
    }
    return <Button onClick={() => openTab(nextAction.tab)}>Continue <ChevronRight size={16} /></Button>;
  })();

  return (
    <div className="sa-workspace">
      <section className="sa-command-band" aria-labelledby="sa-command-title">
        <div className="sa-command-copy">
          <span className="pm-eyebrow">Next best action</span>
          <h2 id="sa-command-title">{nextAction.label}</h2>
          <p>{nextAction.detail}</p>
        </div>
        <dl className="sa-command-facts">
          <div><dt>Progress</dt><dd>{completedStages}/6 stages</dd></div>
          <div><dt>Condition</dt><dd>{conditionScore}</dd></div>
          <div><dt>Market value</dt><dd>{money(approvedValue)}</dd></div>
          <div><dt>Verification</dt><dd>{title(kycStatus)}</dd></div>
        </dl>
        <Button onClick={() => openTab(nextAction.tab)}>Open stage <ChevronRight size={16} /></Button>
      </section>

      <nav className="sa-stage-nav-wrap" aria-label="Sales assessment stages">
        <ol className="sa-stage-nav">
          {TABS.map(({ key, label, icon: Icon }, index) => {
            const stage = stages[index];
            const state = stage.done ? "completed" : stage.locked ? "locked" : stage.current ? "current" : "upcoming";
            return (
              <li key={key} className={state}>
                <button
                  type="button"
                  aria-current={tab === key ? "step" : undefined}
                  className={tab === key ? "active" : ""}
                  disabled={stage.locked}
                  title={stage.locked ? "Complete the previous stage to unlock this section" : undefined}
                  onClick={() => openTab(key)}
                >
                  <span className="sa-stage-nav-icon" aria-hidden="true">
                    {stage.done ? <Check size={15} /> : stage.locked ? <Lock size={14} /> : <Icon size={15} />}
                  </span>
                  <span><small>0{index + 1}</small>{label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <ErrorNotice error={actionError || loadError} />
      {!canPrepare && !canReview && (
        <div className="sa-notice"><Lock size={17} /><span>Read-only access. Assessment records and approvals can be viewed but not changed.</span></div>
      )}

      <div className="sa-shell">
        <main className="sa-main-surface" aria-label={`${activeTab.label} workspace`}>
      {tab === "workflow" && (
        <section className="sa-overview" aria-labelledby="sa-overview-title">
          <div className="sa-overview-head">
            <div><span className="pm-eyebrow">Assessment brief</span><h2 id="sa-overview-title">{property.title || property.property_code || "Sales readiness"}</h2></div>
            <span className="sa-record-code">{property.property_code || assessment?.assessment_code || "Sales property"}</span>
          </div>
          <div className="sa-overview-grid">
            <div className="sa-overview-section">
              <h3>Commercial position</h3>
              <dl className="sa-brief-list">
                <div><dt>Agency</dt><dd>{title(profile.agency_type || "Not set")}</dd></div>
                <div><dt>Recommended value</dt><dd>{money(approvedValue)}</dd></div>
                <div><dt>Market range</dt><dd>{money(rangeMin)} - {money(rangeMax)}</dd></div>
                <div><dt>Reserve</dt><dd>{money(profile.reserve_price ?? appraisal?.reserve_value)}</dd></div>
                <div><dt>Commission</dt><dd>{profile.commission_percent ? `${profile.commission_percent}%` : money(profile.commission_fixed)}</dd></div>
              </dl>
            </div>
            <div className="sa-overview-section">
              <h3>Readiness evidence</h3>
              <dl className="sa-brief-list">
                <div><dt>Condition / marketability</dt><dd>{conditionScore} / {marketabilityScore}</dd></div>
                <div><dt>Assessment items</dt><dd>{assessment?.items?.length || 0} recorded · {blockingItems} blockers</dd></div>
                <div><dt>Vendor profiles</dt><dd>{roleProfiles.length} linked · {kycDocuments.length} KYC files</dd></div>
                <div><dt>Owner proposal</dt><dd>{title(proposal?.status || "Not started")}</dd></div>
                <div><dt>Generated reports</dt><dd>{reports.length} version{reports.length === 1 ? "" : "s"}</dd></div>
              </dl>
            </div>
          </div>
        </section>
      )}

      {tab === "site" && !assessment && (
        <WorkspacePanel
          icon={ClipboardCheck}
          title="Site assessment"
          sub="Start the room-by-room sales readiness record"
        >
          <EmptyState
            icon={ClipboardCheck}
            title="No site assessment yet"
            sub="Create one to record condition scores, findings, blockers and private photo evidence."
          />
        </WorkspacePanel>
      )}

      {tab === "site" && assessment && (
        <div className="sa-stack">
          <WorkspacePanel
            icon={ClipboardCheck}
            title={assessment.assessment_code || "Site assessment"}
            sub="Header scores and visit context"
          >
            <div className="sa-form-grid three">
              <Field label="Assessment date">
                <Input
                  type="date"
                  value={assessmentForm.assessment_date || ""}
                  disabled={!assessmentEditable}
                  onChange={(event) =>
                    setAssessmentForm((current) => ({
                      ...current,
                      assessment_date: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Assessor">
                <Input
                  value={assessmentForm.inspector_name || ""}
                  disabled={!assessmentEditable}
                  onChange={(event) =>
                    setAssessmentForm((current) => ({
                      ...current,
                      inspector_name: event.target.value,
                    }))
                  }
                  placeholder="Name of assessor"
                />
              </Field>
              <Field label="Occupancy status">
                <Select
                  value={assessmentForm.occupancy_status || ""}
                  disabled={!assessmentEditable}
                  onChange={(event) =>
                    setAssessmentForm((current) => ({
                      ...current,
                      occupancy_status: event.target.value,
                    }))
                  }
                >
                  <option value="">Select status</option>
                  <option value="vacant">Vacant</option>
                  <option value="owner_occupied">Owner occupied</option>
                  <option value="tenant_occupied">Tenant occupied</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
              <Field label="Condition score (0–100)">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={assessmentForm.condition_score ?? ""}
                  disabled={!assessmentEditable}
                  onChange={(event) =>
                    setAssessmentForm((current) => ({
                      ...current,
                      condition_score: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Marketability score (0–100)">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={assessmentForm.marketability_score ?? ""}
                  disabled={!assessmentEditable}
                  onChange={(event) =>
                    setAssessmentForm((current) => ({
                      ...current,
                      marketability_score: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Access notes">
                <Input
                  value={assessmentForm.access_notes || ""}
                  disabled={!assessmentEditable}
                  onChange={(event) =>
                    setAssessmentForm((current) => ({
                      ...current,
                      access_notes: event.target.value,
                    }))
                  }
                  placeholder="Keys, access limits, contact"
                />
              </Field>
            </div>
            <Field label="Assessment summary">
              <Textarea
                rows={3}
                value={assessmentForm.summary || ""}
                disabled={!assessmentEditable}
                onChange={(event) =>
                  setAssessmentForm((current) => ({
                    ...current,
                    summary: event.target.value,
                  }))
                }
                placeholder="Overall condition, market readiness and priority work"
              />
            </Field>
            <div className="sa-form-grid two">
              <Field label="Marketability notes">
                <Textarea
                  rows={3}
                  value={assessmentForm.marketability_notes || ""}
                  disabled={!assessmentEditable}
                  onChange={(event) =>
                    setAssessmentForm((current) => ({
                      ...current,
                      marketability_notes: event.target.value,
                    }))
                  }
                  placeholder="Presentation, access or market-readiness observations"
                />
              </Field>
              <Field label="Recommended actions">
                <Textarea
                  rows={3}
                  value={assessmentForm.recommended_actions || ""}
                  disabled={!assessmentEditable}
                  onChange={(event) =>
                    setAssessmentForm((current) => ({
                      ...current,
                      recommended_actions: event.target.value,
                    }))
                  }
                  placeholder="Priority work before launch"
                />
              </Field>
            </div>
          </WorkspacePanel>

          <WorkspacePanel
            icon={CheckCircle2}
            title="Room & area findings"
            sub={`${assessment.items?.length || 0} item${assessment.items?.length === 1 ? "" : "s"} · photos are private evidence`}
          >
            <div className="sa-private-note">
              <Lock size={16} />
              <div>
                <strong>Private assessment evidence</strong>
                <span>
                  Photos upload to the protected documents folder. They are not published to the property listing.
                </span>
              </div>
            </div>

            {assessment.items?.length ? (
              <div className="sa-accordion-list">
                {assessment.items.map((item) => {
                  const expanded = openItem === item.id;
                  const photos = parseArray(item.photos);
                  const uploading = uploadState[item.id];
                  return (
                    <article
                      key={item.id}
                      className={`sa-accordion${item.is_blocking ? " blocking" : ""}`}
                    >
                      <button
                        type="button"
                        className="sa-accordion-head"
                        onClick={() => setOpenItem(expanded ? null : item.id)}
                        aria-expanded={expanded}
                      >
                        {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        <div>
                          <span>{item.section || "General"}</span>
                          <strong>{item.assessment_item || item.item || "Assessment item"}</strong>
                        </div>
                        <Badge
                          tone={
                            item.condition_rating === "good"
                              ? "green"
                              : item.condition_rating === "poor"
                                ? "red"
                                : "amber"
                          }
                        >
                          {title(item.condition_rating || "not assessed")}
                        </Badge>
                        {item.is_blocking && <Badge tone="red">Blocker</Badge>}
                        <span className="sa-photo-count">{photos.length} photo{photos.length === 1 ? "" : "s"}</span>
                      </button>

                      {expanded && (
                        <div className="sa-accordion-body">
                          <div className="sa-form-grid two">
                            <Field label="Area / room">
                              <Input
                                value={item.section || ""}
                                disabled={!assessmentEditable}
                                onChange={(event) =>
                                  patchLocalItem(item.id, "section", event.target.value)
                                }
                              />
                            </Field>
                            <Field label="Assessment item">
                              <Input
                                value={item.assessment_item || ""}
                                disabled={!assessmentEditable}
                                onChange={(event) =>
                                  patchLocalItem(
                                    item.id,
                                    "assessment_item",
                                    event.target.value,
                                  )
                                }
                              />
                            </Field>
                          </div>
                          <div className="sa-verdicts">
                            <Choice
                              label="Clean"
                              value={item.is_clean ?? null}
                              onChange={(value) =>
                                patchLocalItem(item.id, "is_clean", value)
                              }
                              disabled={!assessmentEditable}
                            />
                            <Choice
                              label="Undamaged"
                              value={item.is_undamaged ?? null}
                              onChange={(value) =>
                                patchLocalItem(item.id, "is_undamaged", value)
                              }
                              disabled={!assessmentEditable}
                            />
                            <Choice
                              label="Working"
                              value={item.is_working ?? null}
                              onChange={(value) =>
                                patchLocalItem(item.id, "is_working", value)
                              }
                              disabled={!assessmentEditable}
                            />
                            <Field label="Condition rating">
                              <Select
                                value={item.condition_rating || "not_assessed"}
                                disabled={!assessmentEditable}
                                onChange={(event) =>
                                  patchLocalItem(
                                    item.id,
                                    "condition_rating",
                                    event.target.value,
                                  )
                                }
                              >
                                {[
                                  "not_assessed",
                                  "not_applicable",
                                  "excellent",
                                  "good",
                                  "fair",
                                  "poor",
                                ].map((value) => (
                                  <option key={value} value={value}>
                                    {title(value)}
                                  </option>
                                ))}
                              </Select>
                            </Field>
                          </div>
                          <div className="sa-form-grid two">
                            <Field label="Finding">
                              <Textarea
                                rows={3}
                                value={item.finding || ""}
                                disabled={!assessmentEditable}
                                onChange={(event) =>
                                  patchLocalItem(item.id, "finding", event.target.value)
                                }
                                placeholder="What was observed?"
                              />
                            </Field>
                            <Field label="Required action">
                              <Textarea
                                rows={3}
                                value={item.required_action || ""}
                                disabled={!assessmentEditable}
                                onChange={(event) =>
                                  patchLocalItem(
                                    item.id,
                                    "required_action",
                                    event.target.value,
                                  )
                                }
                                placeholder="Work required before marketing"
                              />
                            </Field>
                          </div>
                          <label className="sa-check-row">
                            <input
                              type="checkbox"
                              checked={Boolean(item.is_blocking)}
                              disabled={!assessmentEditable}
                              onChange={(event) =>
                                patchLocalItem(item.id, "is_blocking", event.target.checked)
                              }
                            />
                            <span>
                              <strong>Sales blocker</strong>
                              <small>Prevents this assessment from being treated as market ready.</small>
                            </span>
                          </label>

                          <div className="sa-evidence">
                            <div className="sa-evidence-head">
                              <div>
                                <strong>Private photo evidence</strong>
                                <span>Branch-protected. Never shown on the public listing.</span>
                              </div>
                              {uploading && (
                                <span className="sa-upload-progress">
                                  <Spinner /> {uploading}
                                </span>
                              )}
                            </div>
                            {photos.length > 0 && (
                              <div className="sa-photo-strip">
                                 {photos.map((photo, index) => (
                                   <PrivateEvidencePhoto
                                     key={`${photo}-${index}`}
                                     itemId={item.id}
                                     index={index}
                                     alt={`${item.assessment_item || "Assessment"} evidence ${index + 1}`}
                                     onRemove={() => removePhoto(item, photo)}
                                     disabled={Boolean(uploading) || !assessmentEditable}
                                   />
                                 ))}
                              </div>
                            )}
                            {assessmentEditable && <div className="sa-upload-options">
                              <div className="sa-single-upload">
                                <FileUpload
                                  compact
                                  folder="documents"
                                  accept="image/*"
                                  value=""
                                  onChange={(url) => appendUploadedPhoto(item, url)}
                                  label="Add one protected image"
                                />
                              </div>
                              <label
                                className={`btn btn-ghost${uploading ? " disabled" : ""}`}
                              >
                                <ImagePlus size={16} /> Select multiple
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  disabled={Boolean(uploading)}
                                  onChange={(event) => {
                                    uploadPhotoFiles(item, event.target.files);
                                    event.target.value = "";
                                  }}
                                />
                              </label>
                              <label
                                className={`btn btn-ghost sa-capture${uploading ? " disabled" : ""}`}
                              >
                                <Camera size={16} /> Take photo
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  disabled={Boolean(uploading)}
                                  onChange={(event) => {
                                    uploadPhotoFiles(item, event.target.files);
                                    event.target.value = "";
                                  }}
                                />
                              </label>
                            </div>}
                          </div>

                          <div className="sa-actions end">
                            <Button
                              variant="danger"
                              icon={Trash2}
                              onClick={() => deleteItem(item)}
                              disabled={
                                busy === `delete-item-${item.id}` ||
                                !assessmentEditable
                              }
                            >
                              Delete item
                            </Button>
                            <Button
                              onClick={() => saveItem(item)}
                              disabled={
                                busy === `save-item-${item.id}` ||
                                Boolean(uploading) ||
                                !assessmentEditable
                              }
                            >
                              {busy === `save-item-${item.id}` ? <Spinner /> : "Save item"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={CheckCircle2}
                title="No room or area items"
                sub="Add the first inspected item below."
              />
            )}

            <div className="sa-add-row">
              <div>
                <span className="pm-eyebrow">New assessment item</span>
                <strong>Add a room, area or fixture finding</strong>
              </div>
              <Input
                value={newItem.section}
                disabled={!assessmentEditable}
                onChange={(event) =>
                  setNewItem((current) => ({ ...current, section: event.target.value }))
                }
                placeholder="Area, e.g. Kitchen"
                aria-label="New item area"
              />
              <Input
                value={newItem.assessment_item}
                disabled={!assessmentEditable}
                onChange={(event) =>
                  setNewItem((current) => ({
                    ...current,
                    assessment_item: event.target.value,
                  }))
                }
                placeholder="Item, e.g. Cabinet doors"
                aria-label="New assessment item"
              />
              <Button
                icon={Plus}
                onClick={addItem}
                disabled={busy === "add-item" || !assessmentEditable}
              >
                Add item
              </Button>
            </div>
          </WorkspacePanel>
        </div>
      )}

      {tab === "appraisal" && !assessmentApproved && (
        <WorkspacePanel icon={BarChart3} title="Appraisal" sub="A site assessment is required first">
          <EmptyState
            icon={Lock}
            title="Appraisal is locked"
            sub="Complete and approve the site assessment before preparing the pricing recommendation."
          />
        </WorkspacePanel>
      )}

      {tab === "appraisal" && assessmentApproved && (
        <div className="sa-stack">
          <WorkspacePanel
            icon={BarChart3}
            title={appraisal ? appraisal.appraisal_code || "Market appraisal" : "New market appraisal"}
            sub="Internal pricing recommendation, approval range and rationale"
          >
            <div className="sa-form-grid three">
              <Field label="Market minimum" required>
                <Input
                  type="number"
                  min="0"
                  value={appraisalForm.market_min ?? ""}
                  disabled={!appraisalEditable}
                  onChange={(event) =>
                    setAppraisalForm((current) => ({ ...current, market_min: event.target.value }))
                  }
                />
              </Field>
              <Field label="Market maximum" required>
                <Input
                  type="number"
                  min="0"
                  value={appraisalForm.market_max ?? ""}
                  disabled={!appraisalEditable}
                  onChange={(event) =>
                    setAppraisalForm((current) => ({ ...current, market_max: event.target.value }))
                  }
                />
              </Field>
              <Field label="Recommended value" required>
                <Input
                  type="number"
                  min="0"
                  value={appraisalForm.recommended_value ?? ""}
                  disabled={!appraisalEditable}
                  onChange={(event) =>
                    setAppraisalForm((current) => ({
                      ...current,
                      recommended_value: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Approved value">
                <Input
                  type="number"
                  min="0"
                  value={appraisalForm.approved_value ?? ""}
                  disabled={!appraisalEditable}
                  onChange={(event) =>
                    setAppraisalForm((current) => ({
                      ...current,
                      approved_value: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Reserve value">
                <Input
                  type="number"
                  min="0"
                  value={appraisalForm.reserve_value ?? ""}
                  disabled={!appraisalEditable}
                  onChange={(event) =>
                    setAppraisalForm((current) => ({
                      ...current,
                      reserve_value: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Quick-sale value">
                <Input
                  type="number"
                  min="0"
                  value={appraisalForm.quick_sale_value ?? ""}
                  disabled={!appraisalEditable}
                  onChange={(event) =>
                    setAppraisalForm((current) => ({
                      ...current,
                      quick_sale_value: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Method" required>
                <Select
                  value={appraisalForm.method || "comparative_market"}
                  disabled={!appraisalEditable}
                  onChange={(event) =>
                    setAppraisalForm((current) => ({ ...current, method: event.target.value }))
                  }
                >
                  <option value="comparative_market">Comparative market analysis</option>
                  <option value="income">Income approach</option>
                  <option value="cost">Cost approach</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
              <Field label="Expected days on market">
                <Input
                  type="number"
                  min="0"
                  value={appraisalForm.expected_days ?? ""}
                  disabled={!appraisalEditable}
                  onChange={(event) =>
                    setAppraisalForm((current) => ({
                      ...current,
                      expected_days: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Confidence (0–100)">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={appraisalForm.confidence ?? ""}
                  disabled={!appraisalEditable}
                  onChange={(event) =>
                    setAppraisalForm((current) => ({
                      ...current,
                      confidence: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <Field label="Appraisal commentary">
              <Textarea
                rows={4}
                value={appraisalForm.commentary || ""}
                disabled={!appraisalEditable}
                onChange={(event) =>
                  setAppraisalForm((current) => ({
                    ...current,
                    commentary: event.target.value,
                  }))
                }
                placeholder="Pricing rationale and market context"
              />
            </Field>
            <div className="sa-form-grid three">
              <Field label="Strengths (one per line)">
                <Textarea
                  rows={5}
                  value={appraisalForm.strengths || ""}
                  disabled={!appraisalEditable}
                  onChange={(event) =>
                    setAppraisalForm((current) => ({
                      ...current,
                      strengths: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Weaknesses (one per line)">
                <Textarea
                  rows={5}
                  value={appraisalForm.weaknesses || ""}
                  disabled={!appraisalEditable}
                  onChange={(event) =>
                    setAppraisalForm((current) => ({
                      ...current,
                      weaknesses: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Assumptions (one per line)">
                <Textarea
                  rows={5}
                  value={appraisalForm.assumptions || ""}
                  disabled={!appraisalEditable}
                  onChange={(event) =>
                    setAppraisalForm((current) => ({
                      ...current,
                      assumptions: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <Field label="Disclaimer">
              <Textarea
                rows={3}
                value={appraisalForm.disclaimer || ""}
                disabled={!appraisalEditable}
                onChange={(event) =>
                  setAppraisalForm((current) => ({
                    ...current,
                    disclaimer: event.target.value,
                  }))
                }
                placeholder="Scope, reliance and market-change disclaimer"
              />
            </Field>
          </WorkspacePanel>

          {appraisal && (
            <WorkspacePanel
              icon={BarChart3}
              title="Comparable evidence"
              sub="Properties supporting the recommended market range"
            >
              {appraisal.comparables?.length ? (
                <div className="sa-comparable-list">
                  {appraisal.comparables.map((entry) => (
                    <div key={entry.id} className="sa-comparable-row">
                      <Input
                        value={entry.address || entry.property_address || ""}
                        onChange={(event) => patchComparable(entry.id, "address", event.target.value)}
                        aria-label="Comparable address"
                        disabled={!appraisalEditable}
                      />
                      <Input
                        type="number"
                        value={entry.sale_price ?? entry.price ?? ""}
                        onChange={(event) =>
                          patchComparable(entry.id, "sale_price", event.target.value)
                        }
                        aria-label="Comparable sale price"
                        disabled={!appraisalEditable}
                      />
                      <Input
                        type="date"
                        value={entry.sale_date || ""}
                        onChange={(event) =>
                          patchComparable(entry.id, "sale_date", event.target.value)
                        }
                        aria-label="Comparable sale date"
                        disabled={!appraisalEditable}
                      />
                      <Input
                        value={entry.source || ""}
                        onChange={(event) => patchComparable(entry.id, "source", event.target.value)}
                        placeholder="Source"
                        aria-label="Comparable source"
                        disabled={!appraisalEditable}
                      />
                      <div className="sa-row-actions">
                        <Button size="sm" variant="ghost" onClick={() => saveComparable(entry)} disabled={!appraisalEditable}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          icon={Trash2}
                          onClick={() => deleteComparable(entry)}
                          aria-label="Delete comparable"
                          disabled={!appraisalEditable}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={BarChart3}
                  title="No comparables yet"
                  sub="Add sold or listed properties that support this appraisal."
                />
              )}
              <div className="sa-add-row sa-comparable-add">
                <div>
                  <span className="pm-eyebrow">New comparable</span>
                  <strong>Add market evidence</strong>
                </div>
                <Input
                  value={newComparable.address}
                  onChange={(event) =>
                    setNewComparable((current) => ({ ...current, address: event.target.value }))
                  }
                  placeholder="Property address"
                  aria-label="New comparable address"
                  disabled={!appraisalEditable}
                />
                <Input
                  type="number"
                  value={newComparable.sale_price}
                  onChange={(event) =>
                    setNewComparable((current) => ({
                      ...current,
                      sale_price: event.target.value,
                    }))
                  }
                  placeholder="Sale price"
                  aria-label="New comparable price"
                  disabled={!appraisalEditable}
                />
                <Input
                  type="date"
                  value={newComparable.sale_date}
                  onChange={(event) =>
                    setNewComparable((current) => ({
                      ...current,
                      sale_date: event.target.value,
                    }))
                  }
                  aria-label="New comparable sale date"
                  disabled={!appraisalEditable}
                />
                <Button icon={Plus} onClick={addComparable} disabled={busy === "add-comparable" || !appraisalEditable}>
                  Add
                </Button>
              </div>
            </WorkspacePanel>
          )}
        </div>
      )}

      {tab === "proposal" && !appraisalApproved && (
        <WorkspacePanel icon={FileCheck2} title="Owner proposal" sub="An appraisal is required first">
          <EmptyState
            icon={Lock}
            title="Owner proposal is locked"
            sub="Complete and approve the appraisal before preparing owner-facing sales terms."
          />
        </WorkspacePanel>
      )}

      {tab === "proposal" && appraisalApproved && !proposal && (
        <WorkspacePanel
          icon={FileCheck2}
          title="Owner proposal"
          sub="This is for the property owner. It is not a buyer offer."
        >
          <div className="sa-owner-callout">
            <UserCheck size={24} />
            <div>
              <strong>Owner-facing sales recommendation</strong>
              <p>
                Create a proposal from the appraisal and sales profile, then review the strategy, value, commission and marketing budget before sending.
              </p>
            </div>
          </div>
        </WorkspacePanel>
      )}

      {tab === "proposal" && proposal && (
        <WorkspacePanel
          icon={FileCheck2}
          title="Owner-facing sales proposal"
          sub="Not a buyer offer · presented to the vendor for authority and acceptance"
          actions={
            <>
              {proposals.length > 1 && (
                <Select
                  value={selectedProposalId}
                  onChange={(event) => selectProposal(event.target.value)}
                  aria-label="Proposal version"
                >
                  {proposals.map((entry, index) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.proposal_number || entry.proposal_code || `Proposal ${proposals.length - index}`} · {title(entry.status)}
                    </option>
                  ))}
                </Select>
              )}
            </>
          }
        >
          <div className="sa-owner-label">
            <UserCheck size={17} /> Owner-facing document · buyer offers remain in the Sales Property File Offers section
          </div>
          <div className="sa-form-grid two">
            <Field label="Owner-facing title" required>
              <Input
                value={proposalForm.title || ""}
                disabled={!proposalEditable}
                onChange={(event) =>
                  setProposalForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </Field>
            <Field label="Valid until">
              <Input
                type="date"
                value={proposalForm.valid_until || ""}
                disabled={!proposalEditable}
                onChange={(event) =>
                  setProposalForm((current) => ({ ...current, valid_until: event.target.value }))
                }
              />
            </Field>
          </div>
          <Field label="Recommended sales strategy">
            <Textarea
              rows={4}
              value={proposalForm.strategy || ""}
              disabled={!proposalEditable}
              onChange={(event) =>
                setProposalForm((current) => ({ ...current, strategy: event.target.value }))
              }
            />
          </Field>
          <div className="sa-form-grid three">
            <Field label="Proposed asking price">
              <Input
                type="number"
                min="0"
                value={proposalForm.asking_price ?? ""}
                disabled={!proposalEditable}
                onChange={(event) =>
                  setProposalForm((current) => ({
                    ...current,
                    asking_price: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Proposed reserve price">
              <Input
                type="number"
                min="0"
                value={proposalForm.reserve_price ?? ""}
                disabled={!proposalEditable}
                onChange={(event) =>
                  setProposalForm((current) => ({
                    ...current,
                    reserve_price: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Agency type">
              <Select
                value={proposalForm.agency_type || "exclusive"}
                disabled={!proposalEditable}
                onChange={(event) =>
                  setProposalForm((current) => ({
                    ...current,
                    agency_type: event.target.value,
                  }))
                }
              >
                <option value="exclusive">Exclusive</option>
                <option value="sole">Sole</option>
                <option value="joint">Joint</option>
                <option value="open">Open</option>
              </Select>
            </Field>
            <Field label="Commission %">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={proposalForm.commission_percent ?? ""}
                disabled={!proposalEditable}
                onChange={(event) =>
                  setProposalForm((current) => ({
                    ...current,
                    commission_percent: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Fixed commission">
              <Input
                type="number"
                min="0"
                value={proposalForm.commission_fixed ?? ""}
                disabled={!proposalEditable}
                onChange={(event) =>
                  setProposalForm((current) => ({
                    ...current,
                    commission_fixed: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Marketing budget">
              <Input
                type="number"
                min="0"
                value={proposalForm.marketing_budget ?? ""}
                disabled={!proposalEditable}
                onChange={(event) =>
                  setProposalForm((current) => ({
                    ...current,
                    marketing_budget: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
          <Field label="Owner terms">
            <Textarea
              rows={5}
              value={proposalForm.terms || ""}
              disabled={!proposalEditable}
              onChange={(event) =>
                setProposalForm((current) => ({ ...current, terms: event.target.value }))
              }
              placeholder="Authority, fees, campaign scope and owner obligations"
            />
          </Field>
        </WorkspacePanel>
      )}

      {tab === "kyc" && (
        <div className="sa-stack">
          <WorkspacePanel
            icon={ShieldCheck}
            title="Vendor KYC & verification"
            sub="Role profiles, protected identity documents and compliance status"
          >
            <div className="sa-private-note">
              <ShieldCheck size={17} />
              <div>
                <strong>Private verification records</strong>
                <span>
                  Identity numbers and evidence remain branch protected. Nothing in this workspace publishes private data.
                </span>
              </div>
            </div>
            {roleProfiles.length ? (
              <div className="sa-role-list">
                {roleProfiles.map((entry) => {
                  const vendor = (workspace.vendors || []).find(
                    (candidate) =>
                      candidate.id === entry.vendor_id ||
                      candidate.contact_id === entry.contact_id,
                  );
                  const profileDocs = kycDocuments.filter(
                    (document) =>
                      document.party_role_profile_id === entry.id ||
                      (entry.contact_id && document.contact_id === entry.contact_id),
                  );
                  return (
                    <div key={entry.id} className="sa-role-row">
                      <div className="sa-role-person">
                        <div className="pm-avatar">
                          {(entry.full_name || entry.name || vendor?.full_name || "V")
                            .slice(0, 1)
                            .toUpperCase()}
                        </div>
                        <div>
                          <strong>
                            {entry.full_name ||
                              entry.name ||
                              entry.contact?.full_name ||
                              vendor?.full_name ||
                              `Vendor profile #${entry.id}`}
                          </strong>
                          <span>{title(entry.role || entry.role_type || "vendor")}</span>
                        </div>
                      </div>
                      <div>
                        <span className="sa-row-label">KYC status</span>
                        <StatusBadge
                          status={entry.kyc_status || entry.verification_status || entry.status}
                        />
                      </div>
                      <div>
                        <span className="sa-row-label">Documents</span>
                        <strong>{profileDocs.length}</strong>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          navigate(
                            `/role-onboarding?property_id=${propertyId}&sales_roles=1&profile_id=${entry.id}`,
                          )
                        }
                      >
                        Review profile
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={UserCheck}
                title="No vendor role profiles"
                sub="Create or link vendor profiles in role onboarding before completing KYC."
              />
            )}
          </WorkspacePanel>

          <WorkspacePanel
            icon={FileCheck2}
            title="KYC documents"
            sub={`${kycDocuments.length} protected identity document${kycDocuments.length === 1 ? "" : "s"} · read-only in this workspace`}
          >
            {kycDocuments.length ? (
              <DataTable
                rows={kycDocuments}
                columns={[
                  {
                    key: "document",
                    header: "Document",
                    render: (row) => (
                      <div>
                        <strong>
                          {row.title || title(row.doc_type || row.document_type)}
                        </strong>
                        <div className="cell-sub">
                          {title(row.role || row.kyc_role || "vendor")} · Private
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "status",
                    header: "Verification",
                    render: (row) => (
                      <StatusBadge status={row.status || "submitted"} />
                    ),
                  },
                  {
                    key: "date",
                    header: "Submitted",
                    render: (row) => dateOnly(row.submitted_at || row.created_at),
                  },
                  {
                    key: "action",
                    header: "",
                    render: (row) => (
                      <div className="sa-actions">
                        {row.file_url && (
                          <a
                            className="btn btn-ghost btn-sm"
                            href={fileSrc(row.file_url)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View file
                          </a>
                        )}
                        {row.file_url_back && (
                          <a
                            className="btn btn-ghost btn-sm"
                            href={fileSrc(row.file_url_back)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View back
                          </a>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            ) : (
              <EmptyState
                icon={FileCheck2}
                title="No KYC documents submitted"
                sub="Open role onboarding or compliance review to collect and verify vendor documents."
              />
            )}
          </WorkspacePanel>

          <WorkspacePanel
            icon={FileText}
            title="Property documents"
            sub="Protected ownership, authority and assessment records"
          >
            {documents.length ? (
              <DataTable
                rows={documents}
                columns={[
                  {
                    key: "document",
                    header: "Document",
                    render: (row) => (
                      <div>
                        <strong>{row.title || row.file_name || "Property document"}</strong>
                        <div className="cell-sub">
                          {title(row.doc_type || row.document_type || row.category)}
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (row) => <StatusBadge status={row.status || "stored"} />,
                  },
                  {
                    key: "privacy",
                    header: "Access",
                    render: () => <Badge tone="grey">Private</Badge>,
                  },
                  {
                    key: "action",
                    header: "",
                    render: (row) =>
                      row.file_url || row.url ? (
                        <a
                          className="btn btn-ghost btn-sm"
                          href={fileSrc(row.file_url || row.url)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open protected file
                        </a>
                      ) : (
                        <span className="cell-sub">No file</span>
                      ),
                  },
                ]}
              />
            ) : (
              <EmptyState
                icon={FileText}
                title="No property documents"
                sub="Ownership and authority documents will appear here without being published."
              />
            )}
          </WorkspacePanel>
        </div>
      )}

      {tab === "reports" && (
        <div className="sa-stack">
          <WorkspacePanel
            icon={FileClock}
            title="Assessment reports"
            sub="Versioned, branch-protected appraisal and proposal outputs"
          >
            {reports.length ? (
              <DataTable
                rows={reports}
                columns={[
                  {
                    key: "kind",
                    header: "Report",
                    render: (row) => (
                      <div>
                        <strong>
                          {title(row.report_type || row.kind || row.report_kind || "sales report")}
                        </strong>
                        <div className="cell-sub">
                          Version {row.version_number || row.version || 1}
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "date",
                    header: "Generated",
                    render: (row) => dateTime(row.generated_at || row.created_at),
                  },
                  {
                    key: "user",
                    header: "Generated by",
                    render: (row) =>
                      row.generated_user?.name ||
                      row.generated_by_name ||
                      row.user?.name ||
                      (row.generated_by ? `User #${row.generated_by}` : "System"),
                  },
                  {
                    key: "download",
                    header: "",
                    render: (row) => (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Download}
                        onClick={() => downloadReport(row)}
                        disabled={busy === `download-${row.id}`}
                      >
                        {busy === `download-${row.id}` ? <Spinner /> : "Download"}
                      </Button>
                    ),
                  },
                ]}
              />
            ) : (
              <EmptyState
                icon={FileDown}
                title="No generated reports"
                sub="Generate an appraisal report or owner proposal PDF to create the first protected version."
              />
            )}
          </WorkspacePanel>

          <WorkspacePanel
            icon={History}
            title="Record history"
            sub="Key assessment pack milestones from the current workspace"
          >
            <div className="sa-history">
              {[
                assessment && {
                  id: `assessment-${assessment.id}`,
                  label: `Assessment ${title(assessment.status)}`,
                  date: assessment.updated_at || assessment.created_at,
                  detail: assessment.assessment_code || "Site assessment",
                },
                appraisal && {
                  id: `appraisal-${appraisal.id}`,
                  label: `Appraisal ${title(appraisal.status)}`,
                  date: appraisal.updated_at || appraisal.created_at,
                  detail: appraisal.appraisal_code || money(approvedValue),
                },
                ...proposals.map((entry) => ({
                  id: `proposal-${entry.id}`,
                  label: `Owner proposal ${title(entry.status)}`,
                  date: entry.updated_at || entry.created_at,
                  detail:
                    entry.proposal_number ||
                    entry.proposal_code ||
                    entry.title ||
                    entry.summary ||
                    "Owner proposal",
                })),
                ...reports.map((entry) => ({
                  id: `report-${entry.id}`,
                  label: `${title(entry.report_type || entry.kind || entry.report_kind)} generated`,
                  date: entry.generated_at || entry.created_at,
                  detail: `Version ${entry.version_number || entry.version || 1}`,
                })),
              ]
                .filter(Boolean)
                .sort((left, right) => new Date(right.date || 0) - new Date(left.date || 0))
                .map((entry) => (
                  <div key={entry.id} className="sa-history-row">
                    <div className="sa-history-dot" />
                    <div>
                      <strong>{entry.label}</strong>
                      <span>{entry.detail}</span>
                    </div>
                    <time>{dateTime(entry.date)}</time>
                  </div>
                ))}
              {!assessment && !appraisal && !proposals.length && !reports.length && (
                <EmptyState
                  icon={History}
                  title="No assessment history"
                  sub="Milestones appear as the site assessment, appraisal and proposal progress."
                />
              )}
            </div>
          </WorkspacePanel>
        </div>
      )}
        </main>
        <aside className="sa-action-zone" aria-label={`${activeTab.label} actions`}>
          <div className="sa-action-zone-head">
            <div>
              <span className="pm-eyebrow">Current stage</span>
              <h2>{activeTab.label}</h2>
            </div>
            <StatusBadge status={activeStatus} />
          </div>
          <p>{activeStage.detail}</p>
          {tabIsDirty && (
            <div className="sa-dirty-state" role="status">
              <span /> Unsaved changes
            </div>
          )}
          <div className="sa-action-zone-actions">{contextualActions}</div>
          <div className="sa-action-zone-foot">
            <ShieldCheck size={14} />
            <span>{tab === "kyc" ? "Identity evidence remains branch protected." : "Actions use the existing approval gates."}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
