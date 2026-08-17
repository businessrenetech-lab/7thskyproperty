import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Phone, Building2, ExternalLink, Mail, Users, Filter, Clock, Calendar, CheckCircle2 } from "lucide-react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import {
  DataTable, Drawer, Button, Field, Input, Select, Textarea,
  StatusBadge, SearchInput, EmptyState, Badge
} from "../ui/kit";
import { Combo } from "../ui/pickers";
import { propertyFilePath } from './sales/paths';

const money = (v) => v == null || v === "" ? "—" : `৳${Number(v).toLocaleString("en-BD")}`;
const dateTime = (v) => v ? new Date(v).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";

const STAGES = [
  { key: "new", label: "New Enquiry" },
  { key: "contacted", label: "Contacted" },
  { key: "viewing_scheduled", label: "Viewing Scheduled" },
  { key: "viewed", label: "Viewed" },
  { key: "offer_made", label: "Offer Made" },
  { key: "converted", label: "Converted / Won" },
  { key: "rejected", label: "Rejected / Closed" },
];

// High-Density Executive KPI Card
const CompactKpi = ({ icon: Icon, label, value, tone = "blue" }) => {
  const tones = {
    blue: { bg: "linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%)", border: "#bae6fd", iconBg: "#0284c7" },
    green: { bg: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", border: "#bbf7d0", iconBg: "#16a34a" },
    amber: { bg: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", border: "#fde68a", iconBg: "#d97706" },
    sky: { bg: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", border: "#e2e8f0", iconBg: "#475569" },
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
        <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ink)", lineHeight: 1.2, marginTop: 1 }}>
          {value}
        </div>
      </div>
    </div>
  );
};

const emptyForm = {
  property_id: null,
  enquirer_name: "",
  phone: "",
  email: "",
  source: "walk_in",
  budget: "",
  preferred_area: "",
  viewing_date: "",
  next_action: "",
  follow_up_date: "",
  message: "",
};

export default function SalesEnquiries({ category = "residential", title = "Buyer Enquiries", desc = "All buyer enquiries for sale properties." }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("all");
  const [drawer, setDrawer] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      params.set("limit", "200");
      const { data } = await api.get(`/sales-enquiries?${params.toString()}`);
      setRows(data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load buyer enquiries");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [category, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (stage !== "all" && row.stage !== stage) return false;
        if (!search.trim()) return true;
        const hay = [
          row.enquirer_name, row.phone, row.email, row.enquiry_code, row.property?.title
        ].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(search.trim().toLowerCase());
      }),
    [rows, search, stage],
  );

  // Click buyer name → opens their Buyer Client profile directly
  const openBuyer = (row) => {
    if (row.client_id) {
      navigate(`/clients?client=${row.client_id}`);
    } else if (row.contact_id) {
      navigate(`/clients?contact=${row.contact_id}`);
    } else {
      toast.error("No linked buyer record for this enquiry.");
    }
  };

  const saveEnquiry = async () => {
    if (!form.enquirer_name?.trim()) return toast.error("Buyer name is required.");
    setSaving(true);
    try {
      await api.post("/sales-enquiries", {
        ...form,
        budget: form.budget || null,
        viewing_date: form.viewing_date || null,
        follow_up_date: form.follow_up_date || null,
      });
      toast.success("Buyer enquiry recorded");
      setDrawer(null);
      setForm(emptyForm);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not save the enquiry");
    } finally {
      setSaving(false);
    }
  };

  const updateStage = async (row, next) => {
    try {
      await api.patch(`/sales-enquiries/${row.id}/move`, { stage: next });
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || "Could not update stage");
    }
  };

  const stats = useMemo(() => ({
    total: rows.length,
    new: rows.filter((r) => r.stage === 'new').length,
    scheduled: rows.filter((r) => r.stage === 'viewing_scheduled').length,
    converted: rows.filter((r) => r.stage === 'converted').length,
  }), [rows]);

  const columns = [
    {
      key: "buyer",
      header: "Buyer Name",
      render: (row) => (
        <button
          type="button"
          onClick={() => openBuyer(row)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            textAlign: "left",
            cursor: "pointer",
          }}
          title="Open Buyer Client Profile"
        >
          <div className="cell-strong" style={{ color: "var(--navy)", fontWeight: 750, fontSize: 13.5 }}>
            {row.enquirer_name || "Unnamed Buyer"}
          </div>
          <div className="cell-sub" style={{ fontSize: 11 }}>
            <span className="code-chip" style={{ fontSize: 10, padding: "1px 5px" }}>{row.enquiry_code}</span>
          </div>
        </button>
      ),
    },
    {
      key: "contact",
      header: "Contact Details",
      render: (row) => (
        <div style={{ fontSize: 12.5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Phone size={12} style={{ color: "var(--cyan)" }} />
            <span>{row.phone || "—"}</span>
          </div>
          {row.email && (
            <div className="cell-sub" style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2, fontSize: 11.5 }}>
              <Mail size={11} />
              <span>{row.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "property",
      header: "Related Property",
      render: (row) =>
        row.property ? (
          <button
            type="button"
            onClick={() => navigate(propertyFilePath(category, row.property.id))}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              textAlign: "left",
              cursor: "pointer",
            }}
            title="Open property file"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Building2 size={13} style={{ color: "var(--cyan)" }} />
              <span className="cell-strong" style={{ fontSize: 13 }}>{row.property.title}</span>
            </div>
            <div className="cell-sub" style={{ fontSize: 11 }}>
              {[row.property.property_code, row.property.area].filter(Boolean).join(" · ")}
            </div>
          </button>
        ) : (
          <span className="cell-sub" style={{ fontSize: 12 }}>General Sales Enquiry</span>
        ),
    },
    {
      key: "date",
      header: "Enquiry Date & Time",
      render: (row) => (
        <span style={{ fontSize: 12, fontWeight: 600 }}>{dateTime(row.created_at)}</span>
      ),
    },
    {
      key: "stage",
      header: "Enquiry Stage",
      render: (row) => (
        <Select
          value={row.stage || "new"}
          onChange={(e) => updateStage(row, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={{ padding: "4px 8px", fontSize: 12, borderRadius: 8, minWidth: 140 }}
        >
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </Select>
      ),
    },
    {
      key: "open",
      header: "",
      render: (row) => (
        <Button size="sm" variant="ghost" icon={ExternalLink} onClick={() => openBuyer(row)}>
          Buyer Profile
        </Button>
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
            <div className="pm-eyebrow">Buyer Relationship Pipeline</div>
            <h1 style={{ margin: "4px 0 2px", fontSize: 22, fontWeight: 800, color: "var(--ink)" }}>{title}</h1>
            <div className="pm-meta" style={{ fontSize: 12.5 }}>{desc}</div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button
              size="sm"
              icon={Plus}
              className="btn-primary"
              onClick={() => {
                setForm(emptyForm);
                setDrawer("create");
              }}
            >
              Add New Buyer Enquiry
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <CompactKpi icon={Users} label="Total Enquiries" value={stats.total} tone="blue" />
        <CompactKpi icon={Clock} label="New Enquiries" value={stats.new} tone="amber" />
        <CompactKpi icon={Calendar} label="Viewings Scheduled" value={stats.scheduled} tone="sky" />
        <CompactKpi icon={CheckCircle2} label="Converted / Won" value={stats.converted} tone="green" />
      </div>

      {/* Filter & Toolbar */}
      <div className="card" style={{ padding: "10px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 10 }}>
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by buyer name, phone, email, enquiry code or property..."
          />
          <Select value={stage} onChange={(e) => setStage(e.target.value)} style={{ padding: "6px 10px", fontSize: 12.5 }}>
            <option value="all">All Stages</option>
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading}
          empty={
            <EmptyState
              icon={Users}
              title="No buyer enquiries found"
              sub="Create a new enquiry or change search and stage filters."
            />
          }
        />
      </div>

      {/* Create Enquiry Drawer */}
      {drawer === "create" && (
        <Drawer
          title="Record New Buyer Enquiry"
          width={600}
          onClose={() => setDrawer(null)}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setDrawer(null)}>Cancel</Button>
              <Button onClick={saveEnquiry} disabled={saving} size="sm" className="btn-primary">
                {saving ? "Saving…" : "Save Buyer Enquiry"}
              </Button>
            </>
          }
        >
          <div style={{ display: "grid", gap: 12 }}>
            <Field label="Buyer Full Name" required>
              <Input
                value={form.enquirer_name}
                onChange={(e) => setForm({ ...form, enquirer_name: e.target.value })}
                placeholder="e.g. Sayem Ahmed"
              />
            </Field>
            <Field label="Contact Phone">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+8801700000000"
              />
            </Field>
            <Field label="Email Address">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="buyer@example.com"
              />
            </Field>
            <Field label="Interested Sale Property">
              <Combo
                endpoint="/properties?listing_type=sale"
                labelFn={(p) => `${p.title} (${p.property_code || `#${p.id}`})`}
                value={form.property_id}
                onChange={(v) => setForm({ ...form, property_id: v })}
                placeholder="Select property…"
              />
            </Field>
            <Field label="Buyer Budget (৳)">
              <Input
                type="number"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                placeholder="e.g. 15000000"
              />
            </Field>
            <Field label="Message / Enquiry Notes">
              <Textarea
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Record buyer preferences, location requirements, or specific requests…"
              />
            </Field>
          </div>
        </Drawer>
      )}
    </div>
  );
}
