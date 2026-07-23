import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Phone, Building2, ExternalLink } from "lucide-react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import {
  PageHead,
  DataTable,
  Drawer,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  StatusBadge,
  SearchInput,
  EmptyState,
} from "../ui/kit";
import { Combo } from "../ui/pickers";

const money = (v) =>
  v == null || v === "" ? "—" : `৳${Number(v).toLocaleString("en-BD")}`;
const dateTime = (v) =>
  v
    ? new Date(v).toLocaleString("en-BD", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

const STAGES = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "viewing_scheduled", label: "Viewing scheduled" },
  { key: "viewed", label: "Viewed" },
  { key: "offer_made", label: "Offer made" },
  { key: "converted", label: "Converted" },
  { key: "rejected", label: "Rejected" },
];

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

export default function SalesEnquiries({ category, title, desc }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("all");
  const [drawer, setDrawer] = useState(null); // 'create' | enquiry object
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
      toast.error(
        error.response?.data?.error || "Failed to load buyer enquiries",
      );
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
          row.enquirer_name,
          row.phone,
          row.email,
          row.enquiry_code,
          row.property?.title,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(search.trim().toLowerCase());
      }),
    [rows, search, stage],
  );

  // Click the buyer name → open their buyer client workspace.
  const openBuyer = (row) => {
    if (row.client_id) navigate(`/clients?client=${row.client_id}`);
    else if (row.contact_id) navigate(`/contacts?contact=${row.contact_id}`);
    else toast.error("No linked buyer record for this enquiry.");
  };

  const saveEnquiry = async () => {
    if (!form.enquirer_name?.trim())
      return toast.error("Buyer name is required.");
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
      toast.error(
        error.response?.data?.error || "Could not save the enquiry",
      );
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

  const columns = [
    {
      key: "buyer",
      header: "Buyer",
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
          title="Open the buyer client workspace"
        >
          <div
            className="cell-strong"
            style={{ color: "var(--primary)", fontWeight: 700 }}
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
      render: (row) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Phone size={13} /> {row.phone || row.email || "—"}
        </span>
      ),
    },
    {
      key: "property",
      header: "Related property",
      render: (row) =>
        row.property ? (
          <button
            type="button"
            onClick={() => navigate(`/sales/property/${row.property.id}`)}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              textAlign: "left",
              cursor: "pointer",
            }}
            title="Open the property file"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Building2 size={13} />
              <span className="cell-strong">{row.property.title}</span>
            </div>
            <div className="cell-sub">
              {[row.property.property_code, row.property.area]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </button>
        ) : (
          <span className="cell-sub">General enquiry</span>
        ),
    },
    {
      key: "date",
      header: "Enquiry date / time",
      render: (row) => dateTime(row.created_at),
    },
    {
      key: "stage",
      header: "Stage",
      render: (row) => (
        <Select
          value={row.stage}
          onChange={(e) => updateStage(row, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          style={{ minWidth: 150 }}
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
        <Button size="sm" variant="ghost" onClick={() => openBuyer(row)}>
          <ExternalLink size={13} /> Buyer
        </Button>
      ),
    },
  ];

  return (
    <div className="pm-scope pm-col">
      <PageHead
        title={title || "Buyer Enquiries"}
        desc={
          desc ||
          "Every buyer who enquired on a sale property. Click a name to open their buyer client workspace."
        }
        actions={
          <Button
            icon={Plus}
            onClick={() => {
              setForm(emptyForm);
              setDrawer("create");
            }}
          >
            Record enquiry
          </Button>
        }
      />

      <div
        className="card"
        style={{
          padding: 14,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1, minWidth: 230 }}>
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search buyer, phone, code or property…"
          />
        </div>
        <div style={{ minWidth: 190 }}>
          <Select value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="all">All stages</option>
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <span className="cell-sub">
          {filtered.length} enquir{filtered.length === 1 ? "y" : "ies"}
        </span>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading}
          empty={
            <EmptyState
              icon={Building2}
              title="No buyer enquiries yet"
              sub="Enquiries from the website and walk-ins will appear here. Record one manually with the button above."
            />
          }
        />
      </div>

      {drawer === "create" && (
        <Drawer
          title="Record Buyer Enquiry"
          width={560}
          onClose={() => setDrawer(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDrawer(null)}>
                Cancel
              </Button>
              <Button onClick={saveEnquiry} disabled={saving}>
                {saving ? "Saving…" : "Save enquiry"}
              </Button>
            </>
          }
        >
          <div className="cell-sub" style={{ marginBottom: 14 }}>
            The buyer is created as a Contact and a buyer Client automatically,
            so they show in Clients and their name links to their workspace.
          </div>
          <Field label="Related sale property">
            <Combo
              endpoint={`/properties?listing_type=sale${category ? `&category=${category}` : ""}`}
              labelFn={(p) =>
                `${p.title || "Property"}${p.property_code ? ` · ${p.property_code}` : ""}`
              }
              value={form.property_id}
              onChange={(v) => setForm((f) => ({ ...f, property_id: v }))}
              placeholder="Search a sale property…"
            />
          </Field>
          <div className="form-grid">
            <Field label="Buyer name" required>
              <Input
                value={form.enquirer_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, enquirer_name: e.target.value }))
                }
              />
            </Field>
            <Field label="Contact number">
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </Field>
            <Field label="Source">
              <Select
                value={form.source}
                onChange={(e) =>
                  setForm((f) => ({ ...f, source: e.target.value }))
                }
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
                value={form.budget}
                onChange={(e) =>
                  setForm((f) => ({ ...f, budget: e.target.value }))
                }
              />
            </Field>
            <Field label="Preferred area">
              <Input
                value={form.preferred_area}
                onChange={(e) =>
                  setForm((f) => ({ ...f, preferred_area: e.target.value }))
                }
              />
            </Field>
            <Field label="Viewing / appointment">
              <Input
                type="datetime-local"
                value={form.viewing_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, viewing_date: e.target.value }))
                }
              />
            </Field>
            <Field label="Follow-up date">
              <Input
                type="date"
                value={form.follow_up_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, follow_up_date: e.target.value }))
                }
              />
            </Field>
          </div>
          <Field label="Message / notes">
            <Textarea
              rows={3}
              value={form.message}
              onChange={(e) =>
                setForm((f) => ({ ...f, message: e.target.value }))
              }
            />
          </Field>
        </Drawer>
      )}
    </div>
  );
}
