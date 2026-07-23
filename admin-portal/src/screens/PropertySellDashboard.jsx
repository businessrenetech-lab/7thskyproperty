import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  Edit,
  HandCoins,
  Plus,
  Search,
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
  };

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
