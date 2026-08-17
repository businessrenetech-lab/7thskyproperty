import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Building2, CalendarClock, CheckCircle2, Clock3, Edit,
  FileSearch, HandCoins, Plus, Scale, Search, Users, WalletCards, ArrowRight,
  TrendingUp, Phone, Mail, FileText, CheckCircle, ExternalLink, Filter
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import {
  Button, DataTable, EmptyState, SearchInput, Select, StatusBadge, Badge
} from "../ui/kit";
import { propertyFilePath, propertyWizardPath } from "./sales/paths";

const unwrap = (payload) => payload?.data?.data ?? payload?.data ?? payload ?? {};
const listFrom = (payload) => {
  const body = unwrap(payload);
  if (Array.isArray(body)) return body;
  const list = body.properties || body.listings || body.sales || body.rows || body.items || [];
  return Array.isArray(list) ? list : list.rows || list.items || list.data || [];
};
const num = (value) => Number(value || 0);
const bdt = (value) => `৳${num(value).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const metric = (metrics, ...keys) => keys.reduce((value, key) => value ?? metrics?.[key], undefined) ?? 0;

// High-Density Executive Stat KPI Card
const CompactKpi = ({ icon: Icon, label, value, tone = "blue", sub }) => {
  const tones = {
    blue: { bg: "linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%)", border: "#bae6fd", iconBg: "#0284c7" },
    green: { bg: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", border: "#bbf7d0", iconBg: "#16a34a" },
    amber: { bg: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", border: "#fde68a", iconBg: "#d97706" },
    sky: { bg: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", border: "#e2e8f0", iconBg: "#475569" },
    red: { bg: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)", border: "#fca5a5", iconBg: "#dc2626" },
  }[tone] || tones.blue;

  return (
    <div style={{
      background: tones.bg,
      border: `1px solid ${tones.border}`,
      borderRadius: 12,
      padding: "10px 14px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      boxShadow: "0 1px 3px rgba(13,27,47,0.04)",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9, background: tones.iconBg, color: "#ffffff",
        display: "grid", placeItems: "center", flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.12)"
      }}>
        <Icon size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)" }}>
          {label}
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ink)", lineHeight: 1.2, marginTop: 1, fontVariantNumeric: "tabular-nums" }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>}
      </div>
    </div>
  );
};

const PROPERTY_TABS = [
  { key: "all", label: "Properties (All)" },
  { key: "listed", label: "Listed & Live" },
  { key: "under_offer", label: "Under Offer" },
  { key: "settled", label: "Settled" },
  { key: "draft", label: "Drafts" },
  { key: "withdrawn", label: "Withdrawn" },
];

export default function PropertySellDashboard({ category = "residential", title = "Residential · Sales Dashboard", desc = "Seller service — listings, owners, agreements, commission and settlement." }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState({});
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/sales/dashboard", { params: { category } });
      const body = unwrap(response);
      setDashboard(body);
      setRows(listFrom(response));
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load sales dashboard");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [category, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = dashboard.metrics || dashboard.kpis || dashboard.summary || {};
  const values = {
    active_listings: metric(metrics, "active_listings", "listings", "active", "listings_active"),
    offers_awaiting_review: metric(metrics, "offers_awaiting_review", "offers_pending_review", "pending_offers"),
    under_contract: metrics.accepted_under_contract ?? (num(metrics.accepted_offers) + num(metrics.under_contract)),
    client_funds_held: metric(metrics, "client_funds_held", "funds_held"),
    settlements_review: metrics.settlements_needing_review_approval ?? (num(metrics.settlements_needing_review || metrics.settlement_review) + num(metrics.settlements_needing_approval)),
    payout_exceptions: metric(metrics, "payout_exceptions", "exceptions"),
    completed_sales: metric(metrics, "completed_sales", "completed"),
    open_enquiries: metric(metrics, "open_enquiries", "enquiries"),
  };
  const activity = dashboard.activity || {};

  // Tab Filtering Logic
  // Classify a property row into ONE lifecycle bucket. The backend's
  // lifecycle_state is the raw property status ("available"/"reserved"/"sold")
  // when there's no settlement, or the settlement status once one exists — so
  // the tabs must account for both, plus the presence of an active transaction.
  const classifyRow = (row) => {
    const st = String(
      row.lifecycle_state || row.sale_status || row.status || "",
    ).toLowerCase();
    if (["sold", "completed", "settled", "locked"].includes(st)) return "settled";
    if (["withdrawn", "cancelled", "terminated"].includes(st)) return "withdrawn";
    if (
      row.active_transaction ||
      [
        "reserved", "under_offer", "under_contract", "conditional", "accepted",
        "submitted", "reviewed", "returned", "approved",
      ].includes(st)
    )
      return "under_offer";
    if (["available", "listed", "active", "live"].includes(st) || row.is_live)
      return "listed";
    return "draft";
  };

  const tabFiltered = useMemo(() => {
    if (activeTab === "all") return rows;
    return rows.filter((row) => classifyRow(row) === activeTab);
  }, [rows, activeTab]);

  const filtered = useMemo(() => {
    return tabFiltered.filter((row) => {
      if (!search.trim()) return true;
      const haystack = [
        row.title, row.property_code, row.area, row.city, row.district,
        row.vendor?.full_name, row.owner?.full_name
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });
  }, [tabFiltered, search]);

  // Tab counts — same classification as the filter, so they always agree.
  const tabCounts = useMemo(() => {
    const counts = { all: rows.length, listed: 0, under_offer: 0, settled: 0, draft: 0, withdrawn: 0 };
    rows.forEach((row) => { counts[classifyRow(row)] += 1; });
    return counts;
  }, [rows]);

  const openBuyerClient = (enquiry) => {
    if (enquiry.client_id) {
      navigate(`/clients?client=${enquiry.client_id}`);
    } else if (enquiry.contact_id) {
      navigate(`/clients?contact=${enquiry.contact_id}`);
    } else {
      toast.error("No linked buyer contact found for this enquiry");
    }
  };

  const columns = [
    {
      key: "property",
      header: "Property & Code",
      render: (row) => (
        <div>
          <div className="cell-strong" style={{ fontSize: 13.5 }}>{row.title || "Untitled property"}</div>
          <div className="cell-sub" style={{ fontSize: 11.5 }}>
            <span className="code-chip" style={{ fontSize: 11, padding: "1px 6px", marginRight: 6 }}>
              {row.property_code || `#${row.id}`}
            </span>
            {[row.area, row.city || row.district].filter(Boolean).join(", ") || "Location not set"}
          </div>
        </div>
      ),
    },
    {
      key: "vendor",
      header: "Vendor / Owner",
      render: (row) => (
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
          {row.vendor?.full_name || row.owner?.full_name || row.vendor_name || "—"}
        </span>
      ),
    },
    {
      key: "price",
      header: "Asking / Sale Price",
      render: (row) => (
        <b style={{ fontSize: 13, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
          {bdt(row.sale_price || row.asking_price || row.price)}
        </b>
      ),
    },
    {
      key: "offers",
      header: "Offers Received",
      render: (row) => (
        <Badge tone={num(row.offer_count ?? row.offers_count ?? row.offers?.length) > 0 ? "amber" : "grey"}>
          {num(row.offer_count ?? row.offers_count ?? row.offers?.length)} offers
        </Badge>
      ),
    },
    {
      key: "funds",
      header: "Client Funds Held",
      render: (row) => (
        <span style={{ fontWeight: 700, color: num(row.funds_held || row.client_funds_held) > 0 ? "var(--good)" : "var(--muted)", fontSize: 13 }}>
          {bdt(row.funds_held || row.client_funds_held)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Lifecycle Stage",
      render: (row) => (
        <StatusBadge status={row.lifecycle_state || row.sale_status || row.status || "draft"} />
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div style={{ display: "flex", gap: 6 }}>
          <Button
            size="sm"
            variant="ghost"
            icon={Edit}
            onClick={(e) => {
              e.stopPropagation();
              navigate(propertyWizardPath(category, row.id, `listing_type=sale&category=${encodeURIComponent(category)}`));
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={ExternalLink}
            onClick={(e) => {
              e.stopPropagation();
              navigate(propertyFilePath(category, row.id));
            }}
          >
            View File
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="pm-scope pm-col" style={{ gap: 14 }}>
      {/* Executive Command Header Banner */}
      <div className="card" style={{
        padding: "16px 20px",
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        border: "1px solid var(--line)",
        borderLeft: "5px solid var(--cyan)",
        borderRadius: 14,
        boxShadow: "0 2px 8px rgba(13,27,47,0.04)"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="pm-eyebrow" style={{ letterSpacing: "0.12em" }}>Sales Intelligence Cockpit</div>
            <h1 style={{ margin: "4px 0 2px", fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>{title}</h1>
            <div className="pm-meta" style={{ fontSize: 12.5 }}>{desc}</div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button
              size="sm"
              variant="ghost"
              icon={Users}
              onClick={() => navigate(`/${category}/enquiry`)}
            >
              Buyer Enquiries ({num(values.open_enquiries)})
            </Button>
            <Button
              size="sm"
              icon={Plus}
              className="btn-primary"
              onClick={() => navigate(propertyWizardPath(category, null, `listing_type=sale&category=${encodeURIComponent(category)}`))}
            >
              New Sale Listing
            </Button>
          </div>
        </div>
      </div>

      {/* 4-Column Executive KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <CompactKpi icon={Building2} label="Active Listings" value={num(values.active_listings)} tone="blue" />
        <CompactKpi icon={Users} label="Buyer Enquiries" value={num(values.open_enquiries)} tone="sky" />
        <CompactKpi icon={Clock3} label="Pending Offers" value={num(values.offers_awaiting_review)} tone="amber" />
        <CompactKpi icon={CheckCircle2} label="Under Contract" value={num(values.under_contract)} tone="green" />
        <CompactKpi icon={WalletCards} label="Client Funds Held" value={bdt(values.client_funds_held)} tone="green" />
        <CompactKpi icon={HandCoins} label="Completed Sales" value={num(values.completed_sales)} tone="blue" />
      </div>

      {/* System Activity & Operations Widgets */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        {/* Buyer Enquiries Widget */}
        <div className="pm-card" style={{ overflow: "hidden" }}>
          <div className="pm-card-h" style={{ padding: "12px 16px" }}>
            <div className="ic" style={{ width: 28, height: 28 }}><Users size={16} /></div>
            <div>
              <h3 style={{ fontSize: 13.5 }}>Recent Buyer Enquiries</h3>
              <div className="hsub" style={{ fontSize: 11 }}>Click buyer name to open Buyer Client profile</div>
            </div>
            <div style={{ flex: 1 }} />
            <button
              type="button"
              onClick={() => navigate(`/${category}/enquiry`)}
              style={{ border: "none", background: "none", color: "var(--cyan)", fontSize: 11.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3 }}
            >
              View All <ArrowRight size={12} />
            </button>
          </div>
          <div className="pm-card-body" style={{ padding: "0 16px 12px" }}>
            {(activity.enquiries || []).length ? (
              (activity.enquiries || []).slice(0, 5).map((e) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line-soft)" }}>
                  <div>
                    <button
                      type="button"
                      onClick={() => openBuyerClient(e)}
                      style={{
                        background: "none", border: "none", padding: 0, color: "var(--navy)",
                        fontWeight: 750, fontSize: 13, cursor: "pointer", textAlign: "left"
                      }}
                      title="Open Buyer Client Profile"
                    >
                      {e.enquirer_name || "Unnamed Buyer"}
                    </button>
                    <div className="cell-sub" style={{ fontSize: 11.5 }}>
                      {e.phone || e.email || "—"} {e.property_title ? `· ${e.property_title}` : ""}
                    </div>
                  </div>
                  <StatusBadge status={e.stage || "new"} />
                </div>
              ))
            ) : (
              <div className="cell-sub" style={{ padding: "12px 0", fontSize: 12 }}>No recent buyer enquiries recorded.</div>
            )}
          </div>
        </div>

        {/* Appointments Widget */}
        <div className="pm-card" style={{ overflow: "hidden" }}>
          <div className="pm-card-h" style={{ padding: "12px 16px" }}>
            <div className="ic" style={{ width: 28, height: 28 }}><CalendarClock size={16} /></div>
            <div>
              <h3 style={{ fontSize: 13.5 }}>Scheduled Appointments</h3>
              <div className="hsub" style={{ fontSize: 11 }}>Property viewings &amp; meetings</div>
            </div>
          </div>
          <div className="pm-card-body" style={{ padding: "0 16px 12px" }}>
            {(activity.appointments || []).length ? (
              (activity.appointments || []).slice(0, 5).map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line-soft)", fontSize: 12.5 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{a.enquirer_name}</div>
                    <div className="cell-sub" style={{ fontSize: 11.5 }}>{a.property_title || "Viewing"}</div>
                  </div>
                  <span className="cell-sub" style={{ fontSize: 11, fontWeight: 600 }}>
                    {new Date(a.when).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
              ))
            ) : (
              <div className="cell-sub" style={{ padding: "12px 0", fontSize: 12 }}>No upcoming appointments scheduled.</div>
            )}
          </div>
        </div>

        {/* Current Sales & Transactions */}
        <div className="pm-card" style={{ overflow: "hidden" }}>
          <div className="pm-card-h" style={{ padding: "12px 16px" }}>
            <div className="ic" style={{ width: 28, height: 28 }}><Scale size={16} /></div>
            <div>
              <h3 style={{ fontSize: 13.5 }}>Current Sales in Progress</h3>
              <div className="hsub" style={{ fontSize: 11 }}>Contracts under settlement</div>
            </div>
          </div>
          <div className="pm-card-body" style={{ padding: "0 16px 12px" }}>
            {(activity.current_sales || []).length ? (
              (activity.current_sales || []).slice(0, 5).map((s) => (
                <div
                  key={s.transaction_id}
                  onClick={() => navigate(propertyFilePath(category, s.property_id))}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line-soft)", cursor: "pointer" }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{s.property_title || "Sale Property"}</div>
                    <div className="cell-sub" style={{ fontSize: 11.5 }}>
                      {s.funds_held ? `${bdt(s.funds_held)} held` : "In progress"}
                    </div>
                  </div>
                  <StatusBadge status={s.settlement_status || s.status || "under_contract"} />
                </div>
              ))
            ) : (
              <div className="cell-sub" style={{ padding: "12px 0", fontSize: 12 }}>No active sales transactions currently settling.</div>
            )}
          </div>
        </div>
      </div>

      {/* Property Lifecycle Tabs & Search Bar */}
      <div className="card" style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 4, overflowX: "auto" }}>
            {PROPERTY_TABS.map((t) => {
              const active = activeTab === t.key;
              const count = tabCounts[t.key] || 0;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: active ? 700 : 600,
                    borderRadius: 20,
                    border: active ? "1px solid var(--cyan)" : "1px solid var(--line)",
                    background: active ? "var(--cyan-weak)" : "var(--surface)",
                    color: active ? "var(--navy)" : "var(--muted)",
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                >
                  <span>{t.label}</span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 10,
                    background: active ? "#ffffff" : "var(--surface-3)",
                    color: active ? "var(--navy)" : "var(--muted)"
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ width: 260 }}>
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search properties, vendors, locations…"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading}
          onRowClick={(row) => navigate(propertyFilePath(category, row.id))}
          empty={
            <EmptyState
              icon={Building2}
              title="No sale properties found"
              sub="Create a new listing or switch property status tabs."
            />
          }
        />
      </div>
    </div>
  );
}
