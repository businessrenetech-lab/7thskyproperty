import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2, Edit, ExternalLink, Filter, Plus, RefreshCw, Search,
  WalletCards, CheckCircle2, Clock, Tag, ArrowRight, ShieldCheck,
  Briefcase, HandCoins, AlertCircle
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../services/api";
import { useToast } from "../../context/ToastContext";
import {
  Button, DataTable, EmptyState, SearchInput, StatusBadge, Badge
} from "../../ui/kit";
import { propertyFilePath, propertyWizardPath } from "./paths";

const unwrap = (payload) => payload?.data?.data ?? payload?.data ?? payload ?? {};
const listFrom = (payload) => {
  const body = unwrap(payload);
  if (Array.isArray(body)) return body;
  const list = body.properties || body.listings || body.sales || body.rows || body.items || [];
  return Array.isArray(list) ? list : list.rows || list.items || list.data || [];
};
const num = (value) => Number(value || 0);
const bdt = (value) => `৳${num(value).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PROPERTY_TABS = [
  { key: "all", label: "All Properties" },
  { key: "listed", label: "Listed & Live" },
  { key: "under_offer", label: "Under Offer" },
  { key: "settled", label: "Settled" },
  { key: "draft", label: "Drafts" },
  { key: "withdrawn", label: "Withdrawn" },
];

export default function SalesProperties({
  category = "residential",
  title = "Residential · Properties",
  desc = "Manage sales listings, lifecycle stages, vendor representations, and property files."
}) {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const activeTab = searchParams.get("tab") || "all";

  const setActiveTab = (tabKey) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tabKey === "all") {
        next.delete("tab");
      } else {
        next.set("tab", tabKey);
      }
      return next;
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/sales/dashboard", { params: { category } });
      setRows(listFrom(response));
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load properties");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [category, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Classify a property row into ONE lifecycle bucket
  const classifyRow = (row) => {
    const st = String(
      row.lifecycle_state || row.sale_status || row.status || ""
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

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts = { all: rows.length, listed: 0, under_offer: 0, settled: 0, draft: 0, withdrawn: 0 };
    rows.forEach((row) => {
      const bucket = classifyRow(row);
      if (counts[bucket] !== undefined) counts[bucket] += 1;
    });
    return counts;
  }, [rows]);

  // Tab filtering
  const tabFiltered = useMemo(() => {
    if (activeTab === "all") return rows;
    return rows.filter((row) => classifyRow(row) === activeTab);
  }, [rows, activeTab]);

  // Search filtering
  const filtered = useMemo(() => {
    if (!search.trim()) return tabFiltered;
    const q = search.trim().toLowerCase();
    return tabFiltered.filter((row) => {
      const haystack = [
        row.title,
        row.property_code,
        row.area,
        row.city,
        row.district,
        row.vendor?.full_name,
        row.owner?.full_name,
        row.property_type
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [tabFiltered, search]);

  // Portfolio metrics summary
  const summary = useMemo(() => {
    let liveValue = 0;
    let fundsInTrust = 0;
    let activeOffers = 0;

    rows.forEach((r) => {
      const bucket = classifyRow(r);
      const price = num(r.sale_price || r.asking_price || r.price);
      if (bucket === "listed" || bucket === "under_offer") {
        liveValue += price;
      }
      fundsInTrust += num(r.funds_held || r.client_funds_held);
      activeOffers += num(r.offer_count ?? r.open_offer_count ?? 0);
    });

    return {
      total: rows.length,
      listed: tabCounts.listed,
      under_offer: tabCounts.under_offer,
      settled: tabCounts.settled,
      liveValue,
      fundsInTrust,
      activeOffers
    };
  }, [rows, tabCounts]);

  const columns = [
    {
      key: "property",
      header: "Property & Location",
      render: (row) => (
        <div style={{ maxWidth: 320 }}>
          <div className="cell-strong" style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", lineHeight: 1.3 }}>
            {row.title || "Untitled Property"}
          </div>
          <div className="cell-sub" style={{ fontSize: 11.5, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
            <span className="code-chip" style={{ fontSize: 10.5, padding: "1px 6px", fontWeight: 700 }}>
              {row.property_code || `#${row.id}`}
            </span>
            <span style={{ color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {[row.area, row.city || row.district].filter(Boolean).join(", ") || "Location unassigned"}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => (
        <span style={{
          fontSize: 11.5,
          fontWeight: 600,
          textTransform: "capitalize",
          color: "var(--muted)",
          background: "var(--surface-3, #f1f5f9)",
          padding: "3px 8px",
          borderRadius: 6
        }}>
          {row.property_type || "Residential"}
        </span>
      ),
    },
    {
      key: "vendor",
      header: "Vendor / Owner",
      render: (row) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 650, color: "var(--ink)" }}>
            {row.vendor?.full_name || row.owner?.full_name || row.vendor_name || "—"}
          </div>
          {row.vendor?.phone && (
            <div className="cell-sub" style={{ fontSize: 11, color: "var(--muted)" }}>
              {row.vendor.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "price",
      header: "Asking / Sale Price",
      render: (row) => (
        <div style={{ fontVariantNumeric: "tabular-nums" }}>
          <b style={{ fontSize: 13, color: "var(--ink)", fontWeight: 750 }}>
            {bdt(row.sale_price || row.asking_price || row.price)}
          </b>
        </div>
      ),
    },
    {
      key: "offers",
      header: "Offers",
      render: (row) => {
        const count = num(row.offer_count ?? row.open_offer_count ?? row.offers_count);
        return (
          <Badge tone={count > 0 ? "amber" : "grey"}>
            {count} {count === 1 ? "offer" : "offers"}
          </Badge>
        );
      },
    },
    {
      key: "funds",
      header: "Client Funds Held",
      render: (row) => {
        const held = num(row.funds_held || row.client_funds_held);
        return (
          <span style={{
            fontWeight: 700,
            fontSize: 12.5,
            color: held > 0 ? "var(--good, #16a34a)" : "var(--muted)",
            fontVariantNumeric: "tabular-nums"
          }}>
            {bdt(held)}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Lifecycle Stage",
      render: (row) => (
        <StatusBadge status={row.lifecycle_state || row.sale_status || row.status || "draft"} />
      ),
    },
    {
      key: "next_action",
      header: "Next Action",
      render: (row) => (
        <span style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: row.next_action === "Admin approval" || row.next_action === "Finance review"
            ? "#b45309"
            : "var(--muted)",
          display: "inline-flex",
          alignItems: "center",
          gap: 4
        }}>
          {row.next_action || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <Button
            size="sm"
            variant="ghost"
            icon={Edit}
            title="Edit Property Listing"
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
            title="Open Full Property Workspace File"
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
      {/* Executive Command Header */}
      <div className="card" style={{
        padding: "16px 20px",
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        border: "1px solid var(--line)",
        borderLeft: "5px solid var(--cyan, #0ea5e9)",
        borderRadius: 14,
        boxShadow: "0 2px 8px rgba(13,27,47,0.04)"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="pm-eyebrow" style={{ letterSpacing: "0.12em" }}>RESIDENTIAL SALES · PORTFOLIO REGISTER</div>
            <h1 style={{ margin: "4px 0 2px", fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>{title}</h1>
            <div className="pm-meta" style={{ fontSize: 12.5 }}>{desc}</div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Button
              size="sm"
              variant="ghost"
              icon={RefreshCw}
              onClick={load}
              disabled={loading}
            >
              Refresh
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

      {/* Portfolio Quick Health Strip */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
        gap: 10
      }}>
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 2
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total Properties
          </span>
          <span style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
            {summary.total}
          </span>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>All stages</span>
        </div>

        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 2
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--cyan, #0284c7)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Live Listings
          </span>
          <span style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
            {summary.listed}
          </span>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>Available on market</span>
        </div>

        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 2
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Under Offer
          </span>
          <span style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
            {summary.under_offer}
          </span>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>Contracts in progress</span>
        </div>

        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 2
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--good, #16a34a)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Completed / Settled
          </span>
          <span style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
            {summary.settled}
          </span>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>Fully closed deals</span>
        </div>

        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 2
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Active Market Value
          </span>
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {bdt(summary.liveValue)}
          </span>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>Live + Under Offer</span>
        </div>

        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 2
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--good, #16a34a)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Escrow Funds Held
          </span>
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--good, #16a34a)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {bdt(summary.fundsInTrust)}
          </span>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>In client trust account</span>
        </div>
      </div>

      {/* Main Table Card with Stage Tabs and Search */}
      <div className="card" style={{ padding: "14px 18px", borderRadius: 12 }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
          borderBottom: "1px solid var(--line-soft, #f1f5f9)",
          paddingBottom: 12
        }}>
          {/* Stage Tabs */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            {PROPERTY_TABS.map((t) => {
              const active = activeTab === t.key;
              const count = tabCounts[t.key] ?? 0;
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
                    fontWeight: active ? 700 : 550,
                    borderRadius: 8,
                    border: active ? "1px solid var(--cyan, #0ea5e9)" : "1px solid var(--line, #e2e8f0)",
                    background: active ? "var(--cyan-weak, #f0f9ff)" : "var(--surface, #ffffff)",
                    color: active ? "var(--navy, #0f172a)" : "var(--muted, #64748b)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease"
                  }}
                >
                  <span>{t.label}</span>
                  <span style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 10,
                    background: active ? "rgba(14, 165, 233, 0.18)" : "var(--surface-3, #f1f5f9)",
                    color: active ? "var(--navy, #0f172a)" : "var(--muted, #64748b)",
                    fontVariantNumeric: "tabular-nums"
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div style={{ width: 280, maxWidth: "100%" }}>
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search properties, code, vendor…"
            />
          </div>
        </div>

        {/* Properties Data Table */}
        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading}
          onRowClick={(row) => navigate(propertyFilePath(category, row.id))}
          empty={
            <EmptyState
              icon={Building2}
              title="No properties match your filter"
              sub={search ? "Try adjusting your search terms or clearing the filter." : "No properties found in this lifecycle stage."}
              action={
                <Button
                  size="sm"
                  icon={Plus}
                  className="btn-primary"
                  onClick={() => navigate(propertyWizardPath(category, null, `listing_type=sale&category=${encodeURIComponent(category)}`))}
                >
                  Create Sale Listing
                </Button>
              }
            />
          }
        />
      </div>
    </div>
  );
}
