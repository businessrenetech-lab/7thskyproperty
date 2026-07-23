import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Edit,
  FileSearch,
  HandCoins,
  Plus,
  Scale,
  Search,
  Users,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import {
  Button,
  DataTable,
  EmptyState,
  SearchInput,
  Select,
  StatusBadge,
} from "../ui/kit";

const unwrap = (payload) =>
  payload?.data?.data ?? payload?.data ?? payload ?? {};
const listFrom = (payload) => {
  const body = unwrap(payload);
  if (Array.isArray(body)) return body;
  const list =
    body.properties ||
    body.listings ||
    body.sales ||
    body.rows ||
    body.items ||
    [];
  return Array.isArray(list)
    ? list
    : list.rows || list.items || list.data || [];
};
const num = (value) => Number(value || 0);
const bdt = (value) =>
  `৳${num(value).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const metric = (metrics, ...keys) =>
  keys.reduce((value, key) => value ?? metrics?.[key], undefined) ?? 0;

const KPI_DEFS = [
  ["active_listings", "Listings", Building2, "pm-kpi--cyan"],
  ["open_enquiries", "Open buyer enquiries", HandCoins, "pm-kpi--cyan"],
  ["offers_awaiting_review", "Pending offers", Clock3, "pm-kpi--amber"],
  ["under_contract", "Accepted / under contract", CheckCircle2, "pm-kpi--navy"],
  [
    "client_funds_held",
    "Client funds held",
    WalletCards,
    "pm-kpi--green",
    true,
  ],
  [
    "settlements_review",
    "Settlement review / approval",
    HandCoins,
    "pm-kpi--amber",
  ],
  ["payout_exceptions", "Payout exceptions", AlertTriangle, "pm-kpi--red"],
  ["completed_sales", "Completed sales", CheckCircle2, "pm-kpi--green"],
];

export default function PropertySellDashboard({ category, title, desc }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState({});
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/sales/dashboard", {
        params: { category },
      });
      const body = unwrap(response);
      setDashboard(body);
      setRows(listFrom(response));
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Failed to load the sales dashboard",
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [category, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const metrics =
    dashboard.metrics || dashboard.kpis || dashboard.summary || {};
  const values = {
    active_listings: metric(
      metrics,
      "active_listings",
      "listings",
      "active",
      "listings_active",
    ),
    offers_awaiting_review: metric(
      metrics,
      "offers_awaiting_review",
      "offers_pending_review",
      "pending_offers",
    ),
    under_contract:
      metrics.accepted_under_contract ??
      num(metrics.accepted_offers) + num(metrics.under_contract),
    client_funds_held: metric(metrics, "client_funds_held", "funds_held"),
    settlements_review:
      metrics.settlements_needing_review_approval ??
      num(metrics.settlements_needing_review || metrics.settlement_review) +
        num(metrics.settlements_needing_approval),
    payout_exceptions: metric(metrics, "payout_exceptions", "exceptions"),
    completed_sales: metric(metrics, "completed_sales", "completed"),
    open_enquiries: metric(metrics, "open_enquiries", "enquiries"),
  };
  const activity = dashboard.activity || {};

  const statuses = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => row.lifecycle_state || row.sale_status || row.status)
            .filter(Boolean),
        ),
      ),
    [rows],
  );
  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const rowStatus =
          row.lifecycle_state || row.sale_status || row.status || "";
        if (status !== "all" && rowStatus !== status) return false;
        if (!search.trim()) return true;
        const haystack = [
          row.title,
          row.property_code,
          row.area,
          row.city,
          row.district,
          row.vendor?.full_name,
          row.owner?.full_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(search.trim().toLowerCase());
      }),
    [rows, search, status],
  );

  const columns = [
    {
      key: "property",
      header: "Property",
      render: (row) => (
        <div>
          <div className="cell-strong">{row.title || "Untitled property"}</div>
          <div className="cell-sub">
            {row.property_code || `Property #${row.id}`} ·{" "}
            {[row.area, row.city || row.district].filter(Boolean).join(", ") ||
              "Location not set"}
          </div>
        </div>
      ),
    },
    {
      key: "vendor",
      header: "Vendor",
      render: (row) =>
        row.vendor?.full_name || row.owner?.full_name || row.vendor_name || "—",
    },
    {
      key: "price",
      header: "Asking / Sale price",
      render: (row) => (
        <span className="pm-num">
          {bdt(row.sale_price || row.asking_price || row.price)}
        </span>
      ),
    },
    {
      key: "offers",
      header: "Offers",
      render: (row) =>
        num(row.offer_count ?? row.offers_count ?? row.offers?.length),
    },
    {
      key: "funds",
      header: "Funds held",
      render: (row) => (
        <span
          className={
            num(row.funds_held || row.client_funds_held)
              ? "pm-money"
              : "cell-sub"
          }
        >
          {bdt(row.funds_held || row.client_funds_held)}
        </span>
      ),
    },
    {
      key: "next",
      header: "Next action",
      render: (row) => (
        <span className="cell-sub">
          {row.next_action?.title || row.next_action || "Open property file"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Lifecycle",
      render: (row) => (
        <StatusBadge
          status={
            row.lifecycle_state || row.sale_status || row.status || "draft"
          }
        />
      ),
    },
    {
      key: "edit",
      header: "",
      render: (row) => (
        <Button
          size="sm"
          variant="ghost"
          icon={Edit}
          onClick={(event) => {
            event.stopPropagation();
            navigate(
              `/sales/properties/new/${row.id}?listing_type=sale&category=${encodeURIComponent(category)}`,
            );
          }}
        >
          Edit property
        </Button>
      ),
    },
  ];

  return (
    <div className="pm-scope pm-col">
      <div className="pm-head">
        <div>
          <div className="pm-eyebrow">Professional sales</div>
          <h1>{title}</h1>
          <div className="pm-meta">{desc}</div>
        </div>
        <div className="pm-head-actions">
          <Button
            icon={Plus}
            onClick={() =>
              navigate(
                `/sales/properties/new?listing_type=sale&category=${encodeURIComponent(category)}`,
              )
            }
          >
            New Listing
          </Button>
        </div>
      </div>

      <div
        className="pm-kpis"
        style={{ gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))" }}
      >
        {KPI_DEFS.map(([key, label, Icon, tone, money]) => (
          <div className={`pm-kpi ${tone}`} key={key}>
            <div className="top">
              <span className="lab">{label}</span>
              <Icon size={17} color="var(--muted)" />
            </div>
            <div className="val pm-num" style={{ fontSize: money ? 21 : 27 }}>
              {money ? bdt(values[key]) : num(values[key]).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* ── What's happening in sales ─────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
          gap: 16,
        }}
      >
        {/* Recent buyer enquiries — name links to the buyer client */}
        <div className="pm-card" style={{ overflow: "hidden" }}>
          <div
            className="pm-card-h"
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/${category}/enquiry`)}
          >
            <div className="ic">
              <Users size={16} />
            </div>
            <div>
              <h3>Buyer enquiries</h3>
              <div className="hsub">Latest interest in your listings</div>
            </div>
            <div className="sp" />
            <span className="cell-sub">{num(values.open_enquiries)} open</span>
          </div>
          <div className="pm-card-body" style={{ paddingTop: 0 }}>
            {(activity.enquiries || []).length ? (
              (activity.enquiries || []).slice(0, 6).map((e) => (
                <div
                  key={e.id}
                  className="pm-row"
                  style={{ padding: "9px 0", cursor: "default" }}
                >
                  <div className="grow">
                    <button
                      type="button"
                      className="title"
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: "var(--primary)",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                      onClick={() =>
                        e.client_id
                          ? navigate(`/clients?client=${e.client_id}`)
                          : navigate(`/contacts?contact=${e.contact_id}`)
                      }
                    >
                      {e.enquirer_name}
                    </button>
                    <div className="sub">
                      {e.phone || e.email || "—"}
                      {e.property_title ? ` · ${e.property_title}` : ""}
                    </div>
                  </div>
                  <StatusBadge status={e.stage} />
                </div>
              ))
            ) : (
              <div className="cell-sub" style={{ padding: "10px 0" }}>
                No buyer enquiries yet.
              </div>
            )}
          </div>
        </div>

        {/* Upcoming appointments / viewings */}
        <div className="pm-card" style={{ overflow: "hidden" }}>
          <div className="pm-card-h">
            <div className="ic">
              <CalendarClock size={16} />
            </div>
            <div>
              <h3>Appointments</h3>
              <div className="hsub">Scheduled viewings</div>
            </div>
            <div className="sp" />
            <span className="cell-sub">
              {num(values.upcoming_appointments ?? (activity.appointments || []).length)}
            </span>
          </div>
          <div className="pm-card-body" style={{ paddingTop: 0 }}>
            {(activity.appointments || []).length ? (
              (activity.appointments || []).slice(0, 6).map((a) => (
                <div key={a.id} className="pm-row" style={{ padding: "9px 0" }}>
                  <div className="grow">
                    <div className="title">{a.enquirer_name}</div>
                    <div className="sub">{a.property_title || "—"}</div>
                  </div>
                  <span className="cell-sub">
                    {new Date(a.when).toLocaleString("en-BD", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              ))
            ) : (
              <div className="cell-sub" style={{ padding: "10px 0" }}>
                No upcoming appointments.
              </div>
            )}
          </div>
        </div>

        {/* Appraisals / assessments */}
        <div className="pm-card" style={{ overflow: "hidden" }}>
          <div className="pm-card-h">
            <div className="ic">
              <FileSearch size={16} />
            </div>
            <div>
              <h3>Appraisals</h3>
              <div className="hsub">Assessment &amp; valuation</div>
            </div>
          </div>
          <div className="pm-card-body" style={{ paddingTop: 0 }}>
            {(activity.appraisals || []).length ? (
              (activity.appraisals || []).slice(0, 6).map((a) => (
                <div
                  key={a.id}
                  className="pm-row"
                  style={{ padding: "9px 0", cursor: "pointer" }}
                  onClick={() => navigate(`/sales/property/${a.property_id}`)}
                >
                  <div className="grow">
                    <div className="title">{a.property_title || "Property"}</div>
                    <div className="sub">
                      {a.overall_score != null
                        ? `Score ${a.overall_score}`
                        : "In progress"}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))
            ) : (
              <div className="cell-sub" style={{ padding: "10px 0" }}>
                No appraisals yet.
              </div>
            )}
          </div>
        </div>

        {/* Current sales in progress */}
        <div className="pm-card" style={{ overflow: "hidden" }}>
          <div className="pm-card-h">
            <div className="ic">
              <Scale size={16} />
            </div>
            <div>
              <h3>Current sales</h3>
              <div className="hsub">Under contract &amp; settling</div>
            </div>
          </div>
          <div className="pm-card-body" style={{ paddingTop: 0 }}>
            {(activity.current_sales || []).length ? (
              (activity.current_sales || []).slice(0, 6).map((s) => (
                <div
                  key={s.transaction_id}
                  className="pm-row"
                  style={{ padding: "9px 0", cursor: "pointer" }}
                  onClick={() => navigate(`/sales/property/${s.property_id}`)}
                >
                  <div className="grow">
                    <div className="title">{s.property_title || "Property"}</div>
                    <div className="sub">
                      {s.funds_held ? `${bdt(s.funds_held)} held` : "In progress"}
                    </div>
                  </div>
                  <StatusBadge status={s.settlement_status || s.status} />
                </div>
              ))
            ) : (
              <div className="cell-sub" style={{ padding: "10px 0" }}>
                No sales in progress.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pm-card" style={{ padding: 14 }}>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1, minWidth: 230 }}>
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search property, code, location or vendor…"
            />
          </div>
          <div style={{ minWidth: 210 }}>
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">All lifecycle states</option>
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {String(item).replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>
          <span className="cell-sub">
            <Search size={13} /> {filtered.length} result
            {filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="pm-card" style={{ overflow: "hidden" }}>
        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading}
          onRowClick={(row) => navigate(`/sales/property/${row.id}`)}
          empty={
            <EmptyState
              icon={Building2}
              title="No sales properties found"
              sub="Create a sale property or change the search and lifecycle filters."
            />
          }
        />
      </div>
    </div>
  );
}
