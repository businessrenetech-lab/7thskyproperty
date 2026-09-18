// admin-portal/src/screens/WtCustomerAgreements.jsx
//
// Parametric builder for Customer Service Agreements across all Property Care
// service lines (Water Tank, Air Conditioning, Residential Interior Design,
// Property Documentation, Relocation, etc.).
//
// High-density Figma-grade 2-column live workspace matching the Sales Agreement
// architecture:
// - Left: Categorised form cards with quick-jump navigation, contact pickers,
//   Schedule A scope checkboxes, Schedule B space & finish specifications,
//   Schedule C interactive pricing catalog, and witness attestation.
// - Right: Sticky real-time A4 agreement preview with live server recalculation,
//   Table of Contents, pricing breakdown, and full-screen preview modal.
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, ArrowLeft, Send, Copy, Eye, Lock, FolderOpen,
  Maximize2, RefreshCw, ShieldCheck, Check, Sparkles, Layout,
  DollarSign, FileSignature, CheckCircle, AlertCircle, X,
  Layers, HardHat, FileText, Download, Printer, UserCheck, HelpCircle
} from 'lucide-react';
import api from '../services/api';
import { Spinner } from '../ui/kit';
import { Combo } from '../ui/pickers';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { svcProfile, svcBase } from './watertank/common';

const bdt = (v) => '৳' + Number(v || 0).toLocaleString('en-BD');
const sel = {
  border: '1px solid var(--line, #cbd5e1)',
  borderRadius: 10,
  padding: '9px 12px',
  background: 'var(--surface, #ffffff)',
  font: 'inherit',
  color: 'var(--ink, #0f172a)',
  width: '100%',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};
const lbl = {
  fontSize: 11.5,
  fontWeight: 600,
  color: 'var(--muted, #64748b)',
  display: 'block',
  marginBottom: 5,
};

const SECTIONS = [
  { id: 'all', label: 'All Sections' },
  { id: 'parties', label: '1. Parties & Rep' },
  { id: 'services', label: '2. Scope (Schedule A)' },
  { id: 'project', label: '3. Space & Specs (Schedule B)' },
  { id: 'pricing', label: '4. Pricing & Advance (Schedule C)' },
  { id: 'checklist', label: '5. Quality & Witnesses' },
];

const ADVANCE_PRESETS = [20, 25, 30, 40, 50];

function RefField({ label, value, hint }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input
        readOnly
        value={value || ''}
        placeholder="Not yet issued"
        style={{
          ...sel,
          background: 'var(--surface-2, #f1f5f9)',
          color: value ? 'var(--ink, #0f172a)' : 'var(--muted, #94a3b8)',
          fontWeight: value ? 700 : 400,
          cursor: 'default',
        }}
      />
      <div style={{ fontSize: 11, color: 'var(--muted, #94a3b8)', marginTop: 4 }}>{hint}</div>
    </div>
  );
}

function AdvanceEditor({ d, setD, preview, onApply, compact, accent = '#9333ea' }) {
  const pi = d.pricing_input;
  const s = preview?.pricing?.summary;
  const total = Number(s?.total_contract_value || 0);
  const shownPct = s?.advance_percent ?? null;

  const setPct = (v) => setD((p) => ({ ...p, pricing_input: { ...p.pricing_input, advance_percent: v, advance_amount: '' } }));
  const setAmt = (v) => setD((p) => ({ ...p, pricing_input: { ...p.pricing_input, advance_percent: '', advance_amount: v } }));

  return (
    <div style={{
      marginTop: compact ? 0 : 14,
      padding: 16,
      border: '1.5px solid var(--line, #e2e8f0)',
      borderRadius: 12,
      background: 'var(--surface-2, #f8fafc)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy, #0f172a)' }}>
          Advance / Deposit Payable on Acceptance
        </div>
        {shownPct != null && (
          <span style={{ fontSize: 12, fontWeight: 700, color: accent, background: '#fff', padding: '2px 8px', borderRadius: 6, border: `1px solid ${accent}40` }}>
            {shownPct}% Deposit
          </span>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--muted, #64748b)', marginBottom: 12 }}>
        Set the share of the contract price the customer pays up front. Schedule B, Schedule C, and the payment schedule all quote this figure.
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {ADVANCE_PRESETS.map((v) => {
          const on = String(pi.advance_percent) === String(v);
          return (
            <button
              key={v}
              type="button"
              className={`pm-btn${on ? ' primary' : ''}`}
              style={{
                padding: '6px 14px',
                fontSize: 12.5,
                fontWeight: on ? 700 : 500,
                ...(on ? { background: accent, borderColor: accent, color: '#fff' } : {}),
              }}
              onClick={() => { setPct(v); setTimeout(onApply, 50); }}
            >
              {v}%
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: 12, alignItems: 'end' }}>
        <div>
          <label style={lbl}>Advance Percentage (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            style={sel}
            value={pi.advance_percent}
            placeholder="e.g. 30"
            onChange={(e) => setPct(e.target.value)}
          />
        </div>
        <div style={{ textAlign: 'center', paddingBottom: 10, fontSize: 12, color: 'var(--muted, #94a3b8)' }}>or</div>
        <div>
          <label style={lbl}>Advance Fixed Amount (৳)</label>
          <input
            type="number"
            min="0"
            style={sel}
            value={pi.advance_amount}
            placeholder="e.g. 150000"
            onChange={(e) => setAmt(e.target.value)}
          />
        </div>
        <div>
          <button
            type="button"
            className="pm-btn primary"
            style={{ background: accent, borderColor: accent }}
            onClick={onApply}
          >
            Apply
          </button>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--ink-soft, #334155)', marginTop: 10, background: '#fff', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line, #e2e8f0)' }}>
        {s?.advance_amount != null ? (
          <>
            The agreement will read: <strong>Advance payable on acceptance
            {shownPct != null ? ` (${shownPct}% of contract price)` : ''} — {bdt(s.advance_amount)}</strong>,
            balance on completion <strong>{bdt(s.balance_due)}</strong>
            {total ? ` of ${bdt(total)}` : ''}.
          </>
        ) : (
          <span style={{ color: 'var(--muted, #64748b)' }}>
            Nothing set — the agreement falls back to the standard 40 / 30 / 30 schedule. Pick a preset percentage above to change it.
          </span>
        )}
      </div>

      {(pi.advance_percent !== '' || pi.advance_amount !== '') && (
        <button
          type="button"
          className="pm-btn"
          style={{ marginTop: 10, padding: '4px 12px', fontSize: 12 }}
          onClick={() => {
            setD((p) => ({ ...p, pricing_input: { ...p.pricing_input, advance_percent: '', advance_amount: '' } }));
            setTimeout(onApply, 50);
          }}
        >
          Reset to default 40 / 30 / 30 schedule
        </button>
      )}
    </div>
  );
}

const buildInitialState = (user, profile) => ({
  effective_date: new Date().toISOString().slice(0, 10),
  org: {
    name: profile.full_label ? `Seventh Sky ${profile.full_label}` : 'Seventh Sky Property Care',
    address: 'Dhaka, Bangladesh',
    phone: '+880 1819-000000',
    email: user?.email || 'admin@seventhskyproperty.com',
    represented_by: user?.name || 'Authorized Signatory',
    position: profile.doc_code === 'RIDS' ? 'Design Director & Managing Signatory' : 'Managing Representative',
  },
  contact_id: '',
  related_id: '',
  client_type: 'Residential',
  client: {
    full_name: '',
    nid: '',
    company: '',
    address: '',
    phone: '',
    email: '',
    service_address: '',
    business_type: '',
    trade_licence_no: '',
    registration_no: '',
    tin: '',
    bin: '',
    representative_name: '',
    representative_position: '',
    accounts_contact: '',
    accounts_email: '',
    alt_contact: '',
  },
  property_type: profile.doc_code === 'RIDS' ? 'Apartment' : '',
  services: [],
  checklist: [],
  witnesses: [
    { name: '', nid: '', email: '' },
    { name: '', nid: '', email: '' },
  ],
  schedule_b: {
    project_no: '',
    work_order_no: '',
    quotation_no: '',
    property_address: '',
    property_type: profile.doc_code === 'RIDS' ? 'Apartment' : '',
    tank_type: profile.doc_code === 'RIDS' ? 'Apartment' : '',
    tank_capacity: profile.doc_code === 'RIDS' ? '1,800 sq ft' : '',
    tanks_count: profile.doc_code === 'RIDS' ? '4 Rooms / Zones' : '',
    water_source: profile.doc_code === 'RIDS' ? 'Contemporary Modern' : '',
    scope: '',
    materials: '',
    materials_finishes: '',
    furniture_requirements: '',
    provider_name: '',
    site_contact_name: '',
    site_contact_phone: '',
    access_notes: '',
    start_date: '',
    completion_date: '',
    under_amc: false,
    amc_code: '',
    amc_package: '',
    amc_frequency: '',
    amc_payment_frequency: '',
    amc_start: '',
    amc_expiry: '',
    warranty_period: profile.doc_code === 'RIDS' ? '12 Months Workmanship Warranty' : '6 Months Standard Warranty',
    special_conditions: '',
  },
  pricing_input: {
    discount: 0,
    vat_percent: 0,
    transport: 0,
    govt_fees: 0,
    selected: [],
    advance_amount: '',
    advance_percent: profile.doc_code === 'RIDS' ? '40' : '',
  },
});

export default function WtCustomerAgreements() {
  const toast = useToast();
  const { user } = useAuth();
  const profile = svcProfile();
  const [params, setParams] = useSearchParams();
  const projectCode = params.get('project');
  const [mode, setMode] = useState(projectCode ? 'build' : 'list');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lineLabel, setLineLabel] = useState('');

  useEffect(() => {
    if (projectCode) setMode('build');
  }, [projectCode]);

  useEffect(() => {
    api.get('/wt-agreements/customer/meta')
      .then((r) => setLineLabel(r.data?.full_label || profile.label || ''))
      .catch(() => {});
  }, [profile.label]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/wt-agreements/customer/agreements');
      setList(Array.isArray(r.data) ? r.data : []);
    } catch {
      // safe fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (mode === 'build') {
    return (
      <Builder
        projectCode={projectCode}
        user={user}
        profile={profile}
        onDone={() => { setMode('list'); setParams({}, { replace: true }); load(); }}
        onCancel={() => { setMode('list'); setParams({}, { replace: true }); }}
      />
    );
  }

  const chip = (s) => ({
    completed: 'good', active: 'good', sent: 'warn',
    viewed: 'info', partially_signed: 'warn',
    declined: 'bad', voided: 'grey', draft: 'grey',
  }[s] || 'grey');

  const accent = profile.accent || '#9333ea';

  return (
    <div className="pm-scope">
      <div className="pm-head">
        <div>
          <div className="pm-eyebrow" style={{ color: accent }}>{profile.label || 'Agreements'}</div>
          <h1>{lineLabel || profile.label || 'Customer'} — Customer Agreements</h1>
          <div className="pm-meta">
            {lineLabel || profile.label} Customer Service Agreements — build, price, and send for legal e-signature.
          </div>
        </div>
        <div className="pm-head-actions">
          <button
            className="pm-btn primary"
            style={{ background: accent, borderColor: accent }}
            onClick={() => setMode('build')}
          >
            <Plus size={15} /> New agreement
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
      ) : (
        <div className="pm-card" style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div className="pm-card-body" style={{ padding: 0 }}>
            <table className="pm-tbl">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Contract Value</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong style={{ color: 'var(--navy, #0f172a)', fontFamily: 'monospace', fontSize: 12.5 }}>
                        {a.envelope_code}
                      </strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{a.signer?.name || '—'}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted, #64748b)' }}>{a.signer?.email || ''}</div>
                    </td>
                    <td>{a.total_contract_value != null ? bdt(a.total_contract_value) : '—'}</td>
                    <td>
                      <span className={`pm-chip ${chip(a.status)}`}>
                        <span className="d" />
                        {a.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {a.signer?.status !== 'signed' && (
                        <button
                          className="pm-btn"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => copyLink(a, toast)}
                        >
                          <Copy size={13} /> Copy link
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!list.length && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 36, color: 'var(--muted, #64748b)' }}>
                      No agreements found for this service line. Click <strong>“New agreement”</strong> to launch the live builder.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

async function copyLink(a, toast) {
  try {
    const { data: hub } = await api.get(`/wt-agreement-hub/${a.id}`);
    const signer = (hub?.agreement?.signers || []).find((x) => x.status !== 'signed' && x.status !== 'declined');
    if (!signer) return toast.error('Every party has already signed.');
    const { data } = await api.post(`/wt-agreement-hub/${a.id}/signing-link/${signer.id}`);
    const url = `${window.location.origin}${data.signing_path}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`Link for ${signer.name} copied — treat it as their signature`);
    } catch {
      window.prompt('Signing link:', url);
    }
  } catch (e) {
    toast.error(e?.response?.data?.error || 'Could not issue the signing link');
  }
}

export function CustomerAgreementBuilder({
  onDone,
  onCancel,
  onClose,
  projectCode,
  user: propUser,
  profile: propProfile,
  isModal = false,
  editEnvelopeId,
}) {
  const toast = useToast();
  const auth = useAuth();
  const user = propUser || auth?.user;
  const profile = propProfile || svcProfile();
  const accent = profile.accent || '#9333ea';
  const accentSoft = profile.accent_soft || '#f3e8ff';
  const docCode = `SSPC-${profile.doc_code || 'RIDS'}-CSA-01`;

  const [activeSection, setActiveSection] = useState('all');
  const [d, setD] = useState(() => buildInitialState(user, profile));
  const [meta, setMeta] = useState({ service_groups: {}, checklist_groups: {} });
  const [catalog, setCatalog] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [autoDraftTime, setAutoDraftTime] = useState('');

  const [source, setSource] = useState(null);
  const [hydrating, setHydrating] = useState(!!projectCode);

  const previewRef = useRef(null);
  const previewScroll = useRef(0);

  const draftStorageKey = useMemo(() => {
    const code = profile.doc_code || 'csa';
    return `sspc_csa_draft_${code}_${projectCode || 'new'}`;
  }, [profile.doc_code, projectCode]);

  useEffect(() => {
    api.get('/wt-agreements/customer/meta').then((r) => setMeta(r.data || {})).catch(() => {});
    api.get('/wt-agreements/customer/catalog').then((r) => setCatalog(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  // Restore auto-draft from localStorage if available
  useEffect(() => {
    if (projectCode) return;
    try {
      const saved = localStorage.getItem(draftStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.data) {
          setD(parsed.data);
          setAutoDraftTime(parsed.time || 'Restored');
        }
      }
    } catch {}
  }, [draftStorageKey, projectCode]);

  // Save auto-draft with debounce
  useEffect(() => {
    const t = setTimeout(() => {
      if (d.client?.full_name || d.pricing_input?.selected?.length) {
        try {
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          localStorage.setItem(draftStorageKey, JSON.stringify({ data: d, time: timeStr }));
          setAutoDraftTime(timeStr);
        } catch {}
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [d, draftStorageKey]);

  const clearAutoDraft = () => {
    try { localStorage.removeItem(draftStorageKey); } catch {}
    setAutoDraftTime('');
    setD(buildInitialState(user, profile));
    toast.success('Auto-draft cleared');
  };

  // Hydrate from Project File
  useEffect(() => {
    if (!projectCode) return;
    let cancelled = false;
    setHydrating(true);
    api.get(`/wt-projects/${projectCode}/agreement-draft`)
      .then(({ data }) => {
        if (cancelled) return;
        setSource(data.source || null);
        setD((prev) => ({
          ...prev,
          related_id: data.related_id ?? prev.related_id,
          project_code: data.project_code,
          effective_date: data.effective_date || prev.effective_date,
          client: { ...prev.client, ...data.client },
          property_type: data.property_type || prev.property_type,
          schedule_b: { ...prev.schedule_b, ...data.schedule_b },
          services: data.services?.length ? data.services : prev.services,
          pricing_input: { ...prev.pricing_input, ...data.pricing_input },
        }));
      })
      .catch((e) => toast.error(e.response?.data?.error || `Could not load project ${projectCode}`))
      .finally(() => { if (!cancelled) setHydrating(false); });
    return () => { cancelled = true; };
  }, [projectCode, toast]);

  // Hydrate from existing envelope if editEnvelopeId is passed
  useEffect(() => {
    if (!editEnvelopeId) return;
    let cancelled = false;
    setHydrating(true);
    api.get(`/wt-agreement-hub/${editEnvelopeId}`)
      .then(({ data }) => {
        if (cancelled) return;
        const agr = data?.agreement || {};
        let terms = agr.terms;
        if (typeof terms === 'string') {
          try { terms = JSON.parse(terms); } catch {}
        } else if (terms && terms['0']) {
          try { terms = JSON.parse(Object.values(terms).join('')); } catch {}
        }
        if (terms) {
          setD((prev) => ({
            ...prev,
            ...terms,
            client: {
              ...prev.client,
              ...(terms.client || {}),
              full_name: agr.client_name || terms.client?.full_name || prev.client.full_name,
              email: agr.client_email || terms.client?.email || prev.client.email,
            },
            schedule_b: { ...prev.schedule_b, ...(terms.schedule_b || {}) },
            pricing_input: { ...prev.pricing_input, ...(terms.pricing_input || {}) },
            witnesses: (terms.witnesses && terms.witnesses.length) ? terms.witnesses : prev.witnesses,
            org: { ...prev.org, ...(terms.org || {}) },
          }));
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setHydrating(false); });
    return () => { cancelled = true; };
  }, [editEnvelopeId]);

  const set = (path, value) => setD((prev) => {
    const n = structuredClone(prev);
    let o = n;
    const ks = path.split('.');
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
    o[ks[ks.length - 1]] = value;
    return n;
  });

  const toggleArr = (path, item) => setD((prev) => {
    const n = structuredClone(prev);
    let o = n;
    const ks = path.split('.');
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
    const arr = o[ks[ks.length - 1]];
    const i = arr.indexOf(item);
    if (i >= 0) arr.splice(i, 1);
    else arr.push(item);
    return n;
  });

  const isBusiness = ['commercial', 'industrial', 'institutional']
    .includes(String(d.client_type || '').toLowerCase());

  const selCodes = useMemo(() => new Set(d.pricing_input.selected.map((s) => s.code)), [d.pricing_input.selected]);

  const toggleLine = (code) => setD((prev) => {
    const n = structuredClone(prev);
    const arr = n.pricing_input.selected;
    const i = arr.findIndex((s) => s.code === code);
    if (i >= 0) arr.splice(i, 1);
    else arr.push({ code, qty: 1, agreed_price: '' });
    return n;
  });

  const setField = (code, field, v) => setD((prev) => {
    const n = structuredClone(prev);
    const row = n.pricing_input.selected.find((s) => s.code === code);
    if (row) row[field] = v;
    return n;
  });

  // Live Preview calculation with scroll preservation
  const refreshPreview = useCallback(async () => {
    try {
      if (previewRef.current?.contentWindow) {
        previewScroll.current = previewRef.current.contentWindow.scrollY || 0;
      }
    } catch {}
    setPreviewing(true);
    try {
      const r = await api.post('/wt-agreements/customer/preview', d);
      if (r?.data) setPreview(r.data);
    } catch {
      // preview error handled gracefully
    } finally {
      setPreviewing(false);
    }
  }, [d]);

  useEffect(() => {
    const t = setTimeout(() => {
      refreshPreview();
    }, 450);
    return () => clearTimeout(t);
  }, [d, refreshPreview]);

  const send = async () => {
    if (!d.client.full_name) {
      toast.error('Enter the customer name (Section 1)');
      setActiveSection('parties');
      return;
    }
    if (!d.client.email) {
      toast.error('Enter the customer email (Section 1)');
      setActiveSection('parties');
      return;
    }
    if (!d.org.email) {
      toast.error('Enter the Seventh Sky countersigner email (Section 1)');
      setActiveSection('parties');
      return;
    }
    setBusy(true);
    try {
      const r = await api.post('/wt-agreements/customer/agreements', d);
      try { localStorage.removeItem(draftStorageKey); } catch {}
      setSent(r.data);
      if (projectCode) {
        await api.post(`/wt-projects/${projectCode}/link-agreement`, {
          envelope_id: r.data.id,
          envelope_code: r.data.envelope_code,
          status: 'Sent',
        }).catch(() => {});
      }
      toast.success('Agreement sent to customer for signature');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not send agreement');
    } finally {
      setBusy(false);
    }
  };

  const onClient = (id, row) => {
    set('contact_id', id);
    if (row) {
      setD((p) => ({
        ...p,
        client: {
          ...p.client,
          full_name: row.full_name || '',
          phone: row.primary_phone || '',
          email: row.email || '',
          nid: row.national_id || row.passport_no || '',
          service_address: row.address_line1 || p.client.service_address,
          address: row.address_line1 || p.client.address,
        },
        schedule_b: {
          ...p.schedule_b,
          property_address: row.address_line1 || p.schedule_b.property_address,
        },
      }));
    }
  };

  const grouped = useMemo(() => {
    const g = { service: [], material: [], labour: [] };
    catalog.forEach((c) => (g[c.group] || g.service).push(c));
    return g;
  }, [catalog]);

  const eq = meta.equipment || profile.equipment || {};

  if (sent) {
    const url = `${window.location.origin}${sent.signing_path}`;
    return (
      <div className="pm-scope">
        <div className="pm-head">
          <div>
            <div className="pm-eyebrow" style={{ color: accent }}>{profile.label} Contracts</div>
            <h1>Agreement Sent for Signature</h1>
          </div>
        </div>
        <div className="pm-card" style={{ maxWidth: 680, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div className="pm-card-body" style={{ padding: 28 }}>
            <div className="pm-chip good" style={{ marginBottom: 14, fontSize: 13, padding: '4px 12px' }}>
              <span className="d" />
              {sent.envelope_code} · Dispatched to Customer
            </div>
            <p style={{ fontSize: 14, color: 'var(--ink-soft, #334155)', lineHeight: 1.5 }}>
              The customer can review the full agreement (including Table of Contents, Schedule B specifications, and Schedule C pricing) and e-sign at the secure link below:
            </p>
            <div style={{ display: 'flex', gap: 8, margin: '14px 0' }}>
              <input readOnly value={url} style={{ ...sel, fontSize: 12.5, fontFamily: 'monospace' }} />
              <button
                type="button"
                className="pm-btn"
                onClick={() => {
                  navigator.clipboard.writeText(url).then(() => toast.success('Signing link copied'));
                }}
              >
                <Copy size={14} /> Copy
              </button>
              <a
                className="pm-btn primary"
                href={url}
                target="_blank"
                rel="noopener"
                style={{ textDecoration: 'none', background: accent, borderColor: accent }}
              >
                <Eye size={14} /> Open
              </a>
            </div>
            <div style={{ marginTop: 20, borderTop: '1px solid var(--line, #e2e8f0)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--muted, #64748b)' }}>
                Once signed by the client, Seventh Sky officer will be prompted to countersign.
              </div>
              <button type="button" className="pm-btn" onClick={onDone}>
                Back to agreements
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const render7thSkyRepCard = () => (
    <div className="pm-card" style={{
      border: `1.5px solid ${accent}40`,
      background: `${accentSoft}25`,
      boxShadow: `0 2px 12px ${accent}10`,
      borderRadius: 12,
    }}>
      <div className="pm-card-h" style={{ borderBottom: `1px solid ${accent}25`, background: `${accentSoft}60`, padding: '12px 18px' }}>
        <div className="ic" style={{ background: accent, color: '#fff' }}>
          <ShieldCheck size={16} />
        </div>
        <div>
          <h3 style={{ color: 'var(--navy, #0f172a)', fontSize: 14 }}>
            Seventh Sky Representative &amp; Countersigner
          </h3>
          <div className="hsub" style={{ fontSize: 11.5 }}>
            Authorized officer details, official signing email, and countersignature representation for {profile.label}
          </div>
        </div>
      </div>
      <div className="pm-card-body" style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={lbl}>Represented by *</label>
            <input
              style={sel}
              value={d.org.represented_by}
              onChange={(e) => set('org.represented_by', e.target.value)}
              placeholder="e.g. Design Director / Managing Signatory"
            />
          </div>
          <div>
            <label style={lbl}>Position / Designation *</label>
            <input
              style={sel}
              value={d.org.position}
              onChange={(e) => set('org.position', e.target.value)}
              placeholder="e.g. Managing Director / Lead Architect"
            />
          </div>
          <div>
            <label style={lbl}>Countersigner Email * (Required to sign)</label>
            <input
              style={sel}
              type="email"
              value={d.org.email}
              onChange={(e) => set('org.email', e.target.value)}
              placeholder="e.g. design@seventhskyproperty.com"
            />
          </div>
          <div>
            <label style={lbl}>Official Phone No *</label>
            <input
              style={sel}
              value={d.org.phone || ''}
              onChange={(e) => set('org.phone', e.target.value)}
              placeholder="+880 1819-000000"
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>Company / Entity Name</label>
            <input
              style={sel}
              value={d.org.name || ''}
              onChange={(e) => set('org.name', e.target.value)}
              placeholder={profile.full_label ? `Seventh Sky ${profile.full_label}` : 'Seventh Sky Property Care'}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pm-scope">
      {/* ── Top Pinned Executive Header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--line, #e2e8f0)',
        padding: '12px 20px',
        marginBottom: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className="pm-btn" onClick={onClose || onCancel} style={{ padding: '6px 12px' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--navy, #0f172a)' }}>
                New {profile.label} Agreement
              </h2>
              <span style={{
                fontSize: 11.5,
                background: `${accentSoft}`,
                color: accent,
                padding: '2px 8px',
                borderRadius: 6,
                fontWeight: 700,
                border: `1px solid ${accent}40`,
              }}>
                {docCode}
              </span>
              <span style={{ fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 5, color: '#16a34a', fontWeight: 600 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} /> Live Sync Active
              </span>
              {autoDraftTime && (
                <span style={{
                  fontSize: 11.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  color: accent,
                  background: `${accentSoft}`,
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontWeight: 600,
                }}>
                  ● Auto-draft saved ({autoDraftTime})
                  <button
                    type="button"
                    onClick={clearAutoDraft}
                    title="Clear saved draft"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, padding: '0 2px', fontSize: 11, textDecoration: 'underline' }}
                  >
                    Clear
                  </button>
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted, #64748b)', marginTop: 2 }}>
              {preview?.title || `${profile.full_label || profile.label} Customer Service Agreement`} · Live 2-Column Workspace
              {d.client.full_name ? ` · Client: ${d.client.full_name}` : ''}
              {d.schedule_b.property_address ? ` · Property: ${d.schedule_b.property_address}` : ''}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="pm-btn"
            onClick={() => refreshPreview()}
            disabled={previewing}
            title="Force reload preview"
          >
            <RefreshCw size={14} className={previewing ? 'pm-spin' : ''} /> Refresh preview
          </button>
          <button
            type="button"
            className="pm-btn"
            onClick={() => setShowFullPreview(true)}
            disabled={!preview?.html}
          >
            <Maximize2 size={14} /> Full preview
          </button>
          <button
            type="button"
            className="pm-btn primary"
            disabled={busy}
            style={{ background: accent, borderColor: accent }}
            onClick={send}
          >
            <Send size={14} /> {busy ? 'Sending…' : 'Send for signature'}
          </button>
          {(onClose || isModal) && (
            <button
              type="button"
              className="pm-btn"
              onClick={onClose || onCancel}
              title="Close window"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <X size={14} /> Close
            </button>
          )}
        </div>
      </div>

      {hydrating && (
        <div className="pm-card" style={{ marginBottom: 14 }}>
          <div className="pm-card-body" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Spinner /> <span style={{ fontSize: 13 }}>Loading project data from {projectCode}…</span>
          </div>
        </div>
      )}

      {source && (
        <div className="pm-card" style={{ marginBottom: 14, borderLeft: `4px solid ${accent}` }}>
          <div className="pm-card-body" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <FolderOpen size={16} style={{ color: accent }} />
            <span style={{ fontSize: 13 }}>
              Built from Project <strong>{source.project?.code}</strong> — {source.project?.name}
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted, #64748b)' }}>
              {source.service_count} service line(s) · {bdt(source.contract_value)}
              {source.quotation ? ` · Quotation ${source.quotation.code}` : ''}
              {source.work_order ? ` · Work Order ${source.work_order.code}` : ''}
            </span>
          </div>
        </div>
      )}

      {/* ── Side-by-Side Responsive Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(500px, 1.15fr) minmax(460px, 1fr)',
        gap: 20,
        alignItems: 'start',
      }}>

        {/* ── Left Column: Structured Form Sections ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Quick Jump Bar */}
          <div className="pm-segment" style={{ flexWrap: 'wrap', width: '100%', marginBottom: 4 }}>
            {SECTIONS.map((sec) => (
              <button
                key={sec.id}
                type="button"
                className={activeSection === sec.id ? 'on' : ''}
                style={activeSection === sec.id ? { background: accent, borderColor: accent, color: '#fff' } : {}}
                onClick={() => setActiveSection(sec.id)}
              >
                {sec.label}
              </button>
            ))}
          </div>

          {/* 1. Parties & Representation */}
          {(activeSection === 'all' || activeSection === 'parties') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="pm-card" style={{ borderRadius: 12 }}>
                <div className="pm-card-h" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line, #e2e8f0)' }}>
                  <div className="ic" style={{ background: `${accentSoft}`, color: accent }}>
                    <FileSignature size={16} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 14 }}>1. Parties &amp; Client Representation</h3>
                    <div className="hsub" style={{ fontSize: 11.5 }}>
                      Client contact selection, client type credentials, effective date, and service address
                    </div>
                  </div>
                </div>

                <div className="pm-card-body" style={{ padding: '16px 18px 18px', display: 'grid', gap: 14 }}>
                  <div>
                    <label style={lbl}>Customer — Pick Saved Contact</label>
                    <Combo
                      endpoint="/contacts"
                      labelFn={(c) => `${c.full_name || 'Contact'} · ${c.primary_phone || c.email || ''}`}
                      value={d.contact_id ? Number(d.contact_id) : ''}
                      onChange={onClient}
                      placeholder="Search saved contacts by name, phone or email…"
                    />
                  </div>

                  <div>
                    <label style={lbl}>Client Type</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {(meta.client_types || ['Residential', 'Commercial', 'Industrial', 'Institutional']).map((t) => {
                        const on = (d.client_type || 'Residential') === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            className={`pm-btn${on ? ' primary' : ''}`}
                            style={{
                              padding: '6px 14px',
                              fontSize: 12.5,
                              ...(on ? { background: accent, borderColor: accent, color: '#fff' } : {}),
                            }}
                            onClick={() => set('client_type', t)}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={lbl}>{isBusiness ? 'Business / Legal Entity Name *' : 'Client Full Legal Name *'}</label>
                      <input
                        style={sel}
                        value={d.client.full_name}
                        onChange={(e) => set('client.full_name', e.target.value)}
                        placeholder="e.g. Tanvir Ahmed"
                      />
                    </div>
                    <div>
                      <label style={lbl}>Client Email * (for electronic signing)</label>
                      <input
                        style={sel}
                        type="email"
                        value={d.client.email}
                        onChange={(e) => set('client.email', e.target.value)}
                        placeholder="client@example.com"
                      />
                    </div>
                    <div>
                      <label style={lbl}>{eq.type_label || 'Property Type'}</label>
                      <input
                        style={sel}
                        list="builder-property-types"
                        value={d.property_type}
                        onChange={(e) => {
                          set('property_type', e.target.value);
                          set('schedule_b.property_type', e.target.value);
                          if (profile.doc_code === 'RIDS') set('schedule_b.tank_type', e.target.value);
                        }}
                        placeholder="e.g. Apartment, Duplex, Villa"
                      />
                      <datalist id="builder-property-types">
                        {(eq.type_options || ['Apartment', 'House', 'Duplex', 'Villa', 'Studio', 'Penthouse', 'Other']).map((o) => (
                          <option key={o} value={o} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label style={lbl}>Effective Date</label>
                      <input
                        type="date"
                        style={sel}
                        value={d.effective_date}
                        onChange={(e) => set('effective_date', e.target.value)}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={lbl}>Service / Project Site Address</label>
                      <input
                        style={sel}
                        value={d.client.service_address}
                        onChange={(e) => {
                          set('client.service_address', e.target.value);
                          set('schedule_b.property_address', e.target.value);
                        }}
                        placeholder="e.g. Flat 6B, Road 11, Banani, Dhaka"
                      />
                    </div>
                  </div>

                  {isBusiness ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 4 }}>
                        <div>
                          <label style={lbl}>Registered Company Name</label>
                          <input style={sel} value={d.client.company} onChange={(e) => set('client.company', e.target.value)} placeholder="If different from trading name" />
                        </div>
                        <div>
                          <label style={lbl}>Business Type</label>
                          <input style={sel} value={d.client.business_type || ''} onChange={(e) => set('client.business_type', e.target.value)} placeholder="Private Ltd, partnership…" />
                        </div>
                        <div>
                          <label style={lbl}>Trade Licence No.</label>
                          <input style={sel} value={d.client.trade_licence_no || ''} onChange={(e) => set('client.trade_licence_no', e.target.value)} />
                        </div>
                        <div>
                          <label style={lbl}>Company Registration No.</label>
                          <input style={sel} value={d.client.registration_no || ''} onChange={(e) => set('client.registration_no', e.target.value)} />
                        </div>
                        <div>
                          <label style={lbl}>TIN</label>
                          <input style={sel} value={d.client.tin || ''} onChange={(e) => set('client.tin', e.target.value)} />
                        </div>
                        <div>
                          <label style={lbl}>BIN / VAT Registration No.</label>
                          <input style={sel} value={d.client.bin || ''} onChange={(e) => set('client.bin', e.target.value)} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={lbl}>Registered Office Address</label>
                          <input style={sel} value={d.client.address} onChange={(e) => set('client.address', e.target.value)} />
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid var(--line, #e2e8f0)', marginTop: 8, paddingTop: 14 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy, #0f172a)', marginBottom: 4 }}>
                          Authorised Corporate Representative
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted, #64748b)', marginBottom: 12 }}>
                          The officer signing on behalf of the company — their details appear on the signature block.
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                          <div>
                            <label style={lbl}>Representative Name</label>
                            <input style={sel} value={d.client.representative_name || ''} onChange={(e) => set('client.representative_name', e.target.value)} placeholder="e.g. Managing Director" />
                          </div>
                          <div>
                            <label style={lbl}>Position / Designation</label>
                            <input style={sel} value={d.client.representative_position || ''} onChange={(e) => set('client.representative_position', e.target.value)} placeholder="e.g. Director" />
                          </div>
                          <div>
                            <label style={lbl}>Representative Phone</label>
                            <input style={sel} value={d.client.phone} onChange={(e) => set('client.phone', e.target.value)} />
                          </div>
                          <div>
                            <label style={lbl}>Representative NID / Passport</label>
                            <input style={sel} value={d.client.nid} onChange={(e) => set('client.nid', e.target.value)} />
                          </div>
                          <div>
                            <label style={lbl}>Accounts Contact Person</label>
                            <input style={sel} value={d.client.accounts_contact || ''} onChange={(e) => set('client.accounts_contact', e.target.value)} placeholder="Who invoices go to" />
                          </div>
                          <div>
                            <label style={lbl}>Accounts Email</label>
                            <input style={sel} value={d.client.accounts_email || ''} onChange={(e) => set('client.accounts_email', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 4 }}>
                      <div>
                        <label style={lbl}>Phone Number</label>
                        <input style={sel} value={d.client.phone} onChange={(e) => set('client.phone', e.target.value)} placeholder="+880 1..." />
                      </div>
                      <div>
                        <label style={lbl}>NID / Passport Number</label>
                        <input style={sel} value={d.client.nid} onChange={(e) => set('client.nid', e.target.value)} placeholder="National ID or Passport" />
                      </div>
                      <div>
                        <label style={lbl}>Billing / Residential Address</label>
                        <input style={sel} value={d.client.address} onChange={(e) => set('client.address', e.target.value)} placeholder="Primary residential address" />
                      </div>
                      <div>
                        <label style={lbl}>Alternate Contact (Optional)</label>
                        <input style={sel} value={d.client.alt_contact || ''} onChange={(e) => set('client.alt_contact', e.target.value)} placeholder="Secondary name and number" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Seventh Sky Countersigner Card */}
              {render7thSkyRepCard()}
            </div>
          )}

          {/* 2. Scope of Services (Schedule A) */}
          {(activeSection === 'all' || activeSection === 'services') && (
            <div className="pm-card" style={{ borderRadius: 12 }}>
              <div className="pm-card-h" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line, #e2e8f0)' }}>
                <div className="ic" style={{ background: `${accentSoft}`, color: accent }}>
                  <Layers size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: 14 }}>2. Scope of Services (Schedule A)</h3>
                  <div className="hsub" style={{ fontSize: 11.5 }}>
                    Clause 3 limits the contract to what is selected here. Any service priced in Schedule C is ticked automatically on the signed document.
                  </div>
                </div>
              </div>

              <div className="pm-card-body" style={{ padding: '16px 18px 18px' }}>
                <div style={{ display: 'grid', gap: 16 }}>
                  {Object.entries(meta.service_groups || {}).map(([g, items]) => {
                    const selectedInGroup = items.filter((it) => d.services.includes(it)).length;
                    return (
                      <div key={g} style={{
                        border: '1px solid var(--line, #e2e8f0)',
                        borderRadius: 10,
                        padding: '12px 14px',
                        background: selectedInGroup > 0 ? `${accentSoft}15` : 'var(--surface-2, #f8fafc)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy, #0f172a)' }}>
                            {g}
                          </div>
                          {selectedInGroup > 0 && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: accent, background: '#fff', padding: '2px 8px', borderRadius: 6, border: `1px solid ${accent}40` }}>
                              {selectedInGroup} of {items.length} selected
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px' }}>
                          {items.map((it) => {
                            const checked = d.services.includes(it);
                            return (
                              <label
                                key={it}
                                style={{
                                  fontSize: 12.5,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 7,
                                  cursor: 'pointer',
                                  padding: '5px 10px',
                                  borderRadius: 8,
                                  background: checked ? '#ffffff' : 'transparent',
                                  border: checked ? `1px solid ${accent}60` : '1px solid transparent',
                                  boxShadow: checked ? '0 1px 4px rgba(0,0,0,0.04)' : 'none',
                                  fontWeight: checked ? 600 : 400,
                                  color: checked ? 'var(--navy, #0f172a)' : 'var(--ink-soft, #475569)',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleArr('services', it)}
                                  style={{ accentColor: accent }}
                                />
                                {it}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 3. Space & Project Specifications (Schedule B) */}
          {(activeSection === 'all' || activeSection === 'project') && (
            <div className="pm-card" style={{ borderRadius: 12 }}>
              <div className="pm-card-h" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line, #e2e8f0)' }}>
                <div className="ic" style={{ background: `${accentSoft}`, color: accent }}>
                  <Layout size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: 14 }}>3. Space &amp; Project Specifications (Schedule B)</h3>
                  <div className="hsub" style={{ fontSize: 11.5 }}>
                    Official project reference codes, space dimensions, design styling parameters, finishes, and project timeline
                  </div>
                </div>
              </div>

              <div className="pm-card-body" style={{ padding: '16px 18px 18px', display: 'grid', gap: 16 }}>
                {/* System Generated Reference Numbers */}
                <div style={{ padding: 14, background: 'var(--surface-2, #f8fafc)', borderRadius: 10, border: '1px solid var(--line, #e2e8f0)' }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy, #0f172a)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Lock size={13} style={{ color: accent }} /> Reference Numbers — System Generated
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <RefField label="Project No." value={d.schedule_b.project_no} hint="From the linked project file" />
                    <RefField label="Work Order No." value={d.schedule_b.work_order_no} hint="Issued upon execution" />
                    <RefField label="Quotation No." value={d.schedule_b.quotation_no} hint="Raised quotation reference" />
                  </div>
                </div>

                {/* Space Details */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy, #0f172a)', marginBottom: 10 }}>
                    {eq.section_label || 'Space & Property Details'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={lbl}>Property Address</label>
                      <input
                        style={sel}
                        value={d.schedule_b.property_address}
                        onChange={(e) => set('schedule_b.property_address', e.target.value)}
                        placeholder="e.g. Apartment 8A, Road 27, Gulshan-1, Dhaka"
                      />
                    </div>
                    <div>
                      <label style={lbl}>{eq.type_label || 'Property Type'}</label>
                      <input
                        style={sel}
                        list="builder-scheduleb-types"
                        value={d.schedule_b.tank_type}
                        onChange={(e) => {
                          set('schedule_b.tank_type', e.target.value);
                          set('schedule_b.property_type', e.target.value);
                        }}
                        placeholder="e.g. Apartment / Duplex"
                      />
                      <datalist id="builder-scheduleb-types">
                        {(eq.type_options || []).map((o) => <option key={o} value={o} />)}
                      </datalist>
                    </div>
                    <div>
                      <label style={lbl}>{eq.capacity_label || 'Approximate Area'}</label>
                      <input
                        style={sel}
                        value={d.schedule_b.tank_capacity}
                        onChange={(e) => set('schedule_b.tank_capacity', e.target.value)}
                        placeholder={eq.capacity_placeholder || 'e.g. 2,200 sq ft'}
                      />
                    </div>
                    <div>
                      <label style={lbl}>{eq.count_label || 'Number of Rooms / Zones'}</label>
                      <input
                        style={sel}
                        value={d.schedule_b.tanks_count}
                        onChange={(e) => set('schedule_b.tanks_count', e.target.value)}
                        placeholder="e.g. 3 Bedrooms + Living + Dining"
                      />
                    </div>
                    <div>
                      <label style={lbl}>{eq.source_label || 'Design Style'}</label>
                      <input
                        style={sel}
                        list="builder-scheduleb-sources"
                        value={d.schedule_b.water_source}
                        onChange={(e) => set('schedule_b.water_source', e.target.value)}
                        placeholder={eq.source_options?.[0] || 'e.g. Contemporary Modern'}
                      />
                      <datalist id="builder-scheduleb-sources">
                        {(eq.source_options || []).map((o) => <option key={o} value={o} />)}
                      </datalist>
                    </div>
                    {!meta.no_provider && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={lbl}>Service Delivery Provider</label>
                        <input
                          style={sel}
                          value={d.schedule_b.provider_name}
                          onChange={(e) => set('schedule_b.provider_name', e.target.value)}
                          placeholder="Appointed service partner name"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Scope & Finishes Textareas */}
                <div style={{ borderTop: '1px solid var(--line, #e2e8f0)', paddingTop: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy, #0f172a)', marginBottom: 10 }}>
                    Scope Description &amp; Material Specifications
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={lbl}>Scope of Work Description</label>
                      <textarea
                        rows={2}
                        style={{ ...sel, resize: 'vertical' }}
                        value={d.schedule_b.scope}
                        onChange={(e) => set('schedule_b.scope', e.target.value)}
                        placeholder="Detailed narrative of design services, demolition, carpentry, lighting, fit-out..."
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={lbl}>Materials &amp; Finishes Specifications (Schedule B)</label>
                      <input
                        style={sel}
                        value={d.schedule_b.materials || d.schedule_b.materials_finishes || ''}
                        onChange={(e) => {
                          set('schedule_b.materials', e.target.value);
                          set('schedule_b.materials_finishes', e.target.value);
                        }}
                        placeholder="e.g. Italian Statuario marble, natural oak veneer, DuPont Corian, Blum soft-close hardware, Dulux velvet emulsion"
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={lbl}>Furniture &amp; Styling Requirements (Schedule B)</label>
                      <input
                        style={sel}
                        value={d.schedule_b.furniture_requirements || ''}
                        onChange={(e) => set('schedule_b.furniture_requirements', e.target.value)}
                        placeholder="e.g. Custom master bedroom wardrobes, modular L-shaped sofa, 8-seater solid wood dining table, acoustic wall panelling"
                      />
                    </div>
                    <div>
                      <label style={lbl}>Site Contact Person</label>
                      <input
                        style={sel}
                        value={d.schedule_b.site_contact_name}
                        onChange={(e) => set('schedule_b.site_contact_name', e.target.value)}
                        placeholder="Name of site supervisor / resident"
                      />
                    </div>
                    <div>
                      <label style={lbl}>Site Contact Phone</label>
                      <input
                        style={sel}
                        value={d.schedule_b.site_contact_phone}
                        onChange={(e) => set('schedule_b.site_contact_phone', e.target.value)}
                        placeholder="+880 1..."
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={lbl}>Site Access &amp; Delivery Constraints</label>
                      <textarea
                        rows={2}
                        style={{ ...sel, resize: 'vertical' }}
                        value={d.schedule_b.access_notes}
                        onChange={(e) => set('schedule_b.access_notes', e.target.value)}
                        placeholder="Lift availability, service stairs, delivery hours, building management clearance..."
                      />
                    </div>
                    <div>
                      <label style={lbl}>Estimated Commencement Date</label>
                      <input
                        type="date"
                        style={sel}
                        value={d.schedule_b.start_date}
                        onChange={(e) => set('schedule_b.start_date', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={lbl}>Estimated Completion Date</label>
                      <input
                        type="date"
                        style={sel}
                        value={d.schedule_b.completion_date}
                        onChange={(e) => set('schedule_b.completion_date', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={lbl}>Warranty Period</label>
                      <input
                        style={sel}
                        value={d.schedule_b.warranty_period}
                        onChange={(e) => set('schedule_b.warranty_period', e.target.value)}
                        placeholder="e.g. 12 Months Workmanship Warranty"
                      />
                    </div>
                    <div>
                      <label style={lbl}>Special Conditions / Client Notes</label>
                      <input
                        style={sel}
                        value={d.schedule_b.special_conditions}
                        onChange={(e) => set('schedule_b.special_conditions', e.target.value)}
                        placeholder="Any non-standard clauses or deliverables"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. Schedule C Pricing & Advance */}
          {(activeSection === 'all' || activeSection === 'pricing') && (
            <div className="pm-card" style={{ borderRadius: 12 }}>
              <div className="pm-card-h" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line, #e2e8f0)' }}>
                <div className="ic" style={{ background: `${accentSoft}`, color: accent }}>
                  <DollarSign size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: 14 }}>4. Schedule C Pricing, Catalog &amp; Advance Deposit</h3>
                  <div className="hsub" style={{ fontSize: 11.5 }}>
                    Tick items from the official service catalog, adjust quantities and agreed pricing, and set deposit milestones
                  </div>
                </div>
              </div>

              <div className="pm-card-body" style={{ padding: '16px 18px 18px' }}>
                <p style={{ fontSize: 12, color: 'var(--muted, #64748b)', marginTop: 0, marginBottom: 12 }}>
                  Schedule C itemizes every payable service, material and labour component. Standard prices appear automatically; entering an Agreed unit price overrides the standard.
                </p>

                {/* Catalog Group Tables */}
                {['service', 'material', 'labour'].map((grp) => {
                  const items = grouped[grp] || [];
                  if (!items.length) return null;
                  const grpLabel = grp === 'service' ? 'Service Design & Execution Items' : grp === 'material' ? 'Materials & Finishes Catalog' : 'Labour & Specialist Workmanship';
                  return (
                    <div key={grp} style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy, #0f172a)', margin: '6px 0 8px' }}>
                        {grpLabel}
                      </div>
                      <table className="pm-tbl">
                        <thead>
                          <tr>
                            <th style={{ width: 36 }}></th>
                            <th>Code</th>
                            <th>Item Name</th>
                            <th>Unit</th>
                            <th style={{ textAlign: 'right' }}>Standard</th>
                            <th style={{ textAlign: 'center', width: 70 }}>Qty</th>
                            <th style={{ textAlign: 'right', width: 120 }}>Agreed (৳)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((l) => {
                            const on = selCodes.has(l.code);
                            const row = d.pricing_input.selected.find((s) => s.code === l.code);
                            return (
                              <tr key={l.code} style={{ opacity: on ? 1 : 0.65, background: on ? `${accentSoft}15` : 'transparent' }}>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={on}
                                    onChange={() => toggleLine(l.code)}
                                    style={{ accentColor: accent }}
                                  />
                                </td>
                                <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{l.code}</td>
                                <td style={{ fontSize: 12.5, fontWeight: on ? 600 : 400 }}>{l.name}</td>
                                <td style={{ fontSize: 12, color: 'var(--muted, #64748b)' }}>{l.unit}</td>
                                <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted, #64748b)' }}>{bdt(l.standard_price)}</td>
                                <td style={{ textAlign: 'center' }}>
                                  {on ? (
                                    <input
                                      type="number"
                                      min={1}
                                      style={{ ...sel, width: 60, padding: '4px 6px', textAlign: 'center' }}
                                      value={row?.qty ?? 1}
                                      onChange={(e) => setField(l.code, 'qty', Number(e.target.value))}
                                    />
                                  ) : '—'}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  {on ? (
                                    <input
                                      type="number"
                                      min={0}
                                      style={{ ...sel, width: 110, padding: '4px 8px', textAlign: 'right' }}
                                      placeholder={String(l.standard_price)}
                                      value={row?.agreed_price ?? ''}
                                      onChange={(e) => setField(l.code, 'agreed_price', e.target.value)}
                                    />
                                  ) : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}

                {/* Adjustments & Taxes */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 10, padding: 14, background: 'var(--surface-2, #f8fafc)', borderRadius: 10, border: '1px solid var(--line, #e2e8f0)' }}>
                  <div>
                    <label style={lbl}>Transport / Logistics (৳)</label>
                    <input type="number" style={sel} value={d.pricing_input.transport} onChange={(e) => set('pricing_input.transport', Number(e.target.value))} />
                  </div>
                  <div>
                    <label style={lbl}>Govt / Official Fees (৳)</label>
                    <input type="number" style={sel} value={d.pricing_input.govt_fees} onChange={(e) => set('pricing_input.govt_fees', Number(e.target.value))} />
                  </div>
                  <div>
                    <label style={lbl}>Contract Discount (৳)</label>
                    <input type="number" style={sel} value={d.pricing_input.discount} onChange={(e) => set('pricing_input.discount', Number(e.target.value))} />
                  </div>
                  <div>
                    <label style={lbl}>VAT Rate (%)</label>
                    <input type="number" style={sel} value={d.pricing_input.vat_percent} onChange={(e) => set('pricing_input.vat_percent', Number(e.target.value))} />
                  </div>
                </div>

                {/* Advance / Deposit Editor */}
                <AdvanceEditor
                  d={d}
                  setD={setD}
                  preview={preview}
                  onApply={refreshPreview}
                  accent={accent}
                />

                {/* Live Pricing Breakdown & Milestones */}
                {preview?.pricing && (
                  <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="pm-card" style={{ background: 'var(--surface-2, #f8fafc)', borderRadius: 10 }}>
                      <div className="pm-card-body" style={{ padding: 14 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--navy, #0f172a)' }}>
                          Contract Cost Summary
                        </div>
                        {[
                          ['Service Charges', preview.pricing.summary.service_charges],
                          ['Labour Charges', preview.pricing.summary.labour],
                          ['Materials & Supplies', preview.pricing.summary.materials],
                          ['Transport / Delivery', preview.pricing.summary.transport],
                          ['Government / Official Fees', preview.pricing.summary.govt_fees],
                          ['Discount', -preview.pricing.summary.discount],
                          ['VAT Amount', preview.pricing.summary.vat],
                        ].map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '3px 0' }}>
                            <span style={{ color: 'var(--muted, #64748b)' }}>{k}</span>
                            <span style={{ fontWeight: 500 }}>{bdt(v)}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderTop: '1px solid var(--line, #e2e8f0)', marginTop: 8, paddingTop: 8, fontSize: 13 }}>
                          <span>Total Contract Price</span>
                          <span style={{ color: accent }}>{bdt(preview.pricing.summary.total_contract_value)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pm-card" style={{ background: 'var(--surface-2, #f8fafc)', borderRadius: 10 }}>
                      <div className="pm-card-body" style={{ padding: 14 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--navy, #0f172a)' }}>
                          Payment Milestones Schedule
                        </div>
                        {(preview.pricing.payment_schedule || []).map((p, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '3px 0' }}>
                            <span style={{ color: 'var(--muted, #64748b)' }}>{p.stage}</span>
                            <span style={{ fontWeight: 600 }}>{bdt(p.amount)}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderTop: '1px solid var(--line, #e2e8f0)', marginTop: 8, paddingTop: 8, fontSize: 12.5 }}>
                          <span>Total Scheduled</span>
                          <span>{bdt((preview.pricing.payment_schedule || []).reduce((s, p) => s + Number(p.amount || 0), 0))}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Quality Checklist & Witnesses */}
          {(activeSection === 'all' || activeSection === 'checklist') && (
            <div className="pm-card" style={{ borderRadius: 12 }}>
              <div className="pm-card-h" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line, #e2e8f0)' }}>
                <div className="ic" style={{ background: `${accentSoft}`, color: accent }}>
                  <UserCheck size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: 14 }}>5. Quality Checklist &amp; Witnesses (Electronic Attestation)</h3>
                  <div className="hsub" style={{ fontSize: 11.5 }}>
                    Schedule D warranty coverage items and dual electronic witness attestation blocks
                  </div>
                </div>
              </div>

              <div className="pm-card-body" style={{ padding: '16px 18px 18px' }}>
                {Object.entries(meta.checklist_groups || {}).map(([g, items]) => (
                  <div key={g} style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 12.5, margin: '8px 0 6px', color: 'var(--navy, #0f172a)' }}>
                      {g}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px' }}>
                      {items.map((it) => (
                        <label
                          key={it}
                          style={{
                            fontSize: 12.5,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={d.checklist.includes(it)}
                            onChange={() => toggleArr('checklist', it)}
                            style={{ accentColor: accent }}
                          />
                          {it}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div style={{ borderTop: '1px solid var(--line, #e2e8f0)', marginTop: 14, paddingTop: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy, #0f172a)', marginBottom: 4 }}>
                    Witnesses (Electronic Attestation)
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted, #64748b)', marginTop: 0, marginBottom: 12 }}>
                    Each witness entered below with an email address will receive an electronic signing link to attest what they have witnessed.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {d.witnesses.map((w, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'grid',
                          gap: 8,
                          background: 'var(--surface-2, #f8fafc)',
                          padding: 14,
                          borderRadius: 10,
                          border: '1px solid var(--line, #e2e8f0)',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy, #0f172a)' }}>
                          Witness {i + 1}
                        </div>
                        <div>
                          <label style={lbl}>Witness Full Legal Name</label>
                          <input
                            style={sel}
                            placeholder="Full name"
                            value={w.name}
                            onChange={(e) => setD((p) => {
                              const n = structuredClone(p);
                              n.witnesses[i].name = e.target.value;
                              return n;
                            })}
                          />
                        </div>
                        <div>
                          <label style={lbl}>Email Address (to receive signing ceremony)</label>
                          <input
                            style={sel}
                            type="email"
                            placeholder="witness@example.com"
                            value={w.email || ''}
                            onChange={(e) => setD((p) => {
                              const n = structuredClone(p);
                              n.witnesses[i].email = e.target.value;
                              return n;
                            })}
                          />
                        </div>
                        <div>
                          <label style={lbl}>NID / Passport</label>
                          <input
                            style={sel}
                            placeholder="National ID or Passport"
                            value={w.nid}
                            onChange={(e) => setD((p) => {
                              const n = structuredClone(p);
                              n.witnesses[i].nid = e.target.value;
                              return n;
                            })}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 14, padding: 12, background: `${accentSoft}30`, borderRadius: 8, border: `1px solid ${accent}30`, fontSize: 12, color: 'var(--ink-soft, #334155)' }}>
                  <strong>Execution Order:</strong> The client signs first. Once the client executes, Seventh Sky&rsquo;s countersigner ({d.org.email || 'pending'}) is notified to sign, followed by the witnesses.
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── Right Column: Sticky Live Agreement Preview ── */}
        <div style={{ position: 'sticky', top: 75, height: isModal ? 'calc(96vh - 120px)' : 'calc(100vh - 95px)', display: 'flex', flexDirection: 'column' }}>
          <div className="pm-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', borderRadius: 12, border: '1px solid var(--line, #e2e8f0)' }}>
            
            {/* Header */}
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--line, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface, #ffffff)' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--navy, #0f172a)', letterSpacing: '-0.2px' }}>
                  {preview?.title || `${profile.label} Customer Service Agreement`}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted, #64748b)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                  Live Preview · Real-time A4 rendering
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {previewing && <Spinner size={14} />}
                <button
                  type="button"
                  className="pm-btn"
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  onClick={() => setShowFullPreview(true)}
                  disabled={!preview?.html}
                >
                  <Maximize2 size={13} /> Full preview
                </button>
              </div>
            </div>

            {/* Frame Body */}
            <div style={{ flex: 1, background: '#f8fafc', padding: 12, overflow: 'hidden' }}>
              {preview?.html ? (
                <iframe
                  ref={previewRef}
                  title="Agreement live preview"
                  srcDoc={preview.html}
                  sandbox="allow-same-origin"
                  onLoad={() => {
                    try {
                      previewRef.current?.contentWindow?.scrollTo(0, previewScroll.current);
                    } catch {}
                  }}
                  style={{ width: '100%', height: '100%', border: 0, borderRadius: 8, background: '#ffffff', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}
                />
              ) : (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--muted, #64748b)' }}>
                  <Spinner />
                  <span style={{ fontSize: 13 }}>Generating live document preview…</span>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* ── In-App Full Document Preview Modal ── */}
      {showFullPreview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(5px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 32px',
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            maxWidth: 1100,
            height: '100%',
            margin: '0 auto',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--line, #e2e8f0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface, #ffffff)',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--navy, #0f172a)' }}>
                  {preview?.title || 'Agreement Preview'}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--muted, #64748b)', marginTop: 2 }}>
                  Full legal contract document · Ready for dispatch
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  className="pm-btn"
                  onClick={() => {
                    const w = window.open('', '_blank');
                    if (w) {
                      w.document.write(preview.html);
                      w.document.close();
                      w.print();
                    }
                  }}
                >
                  <Printer size={14} /> Print
                </button>
                <button
                  type="button"
                  className="pm-btn"
                  onClick={() => setShowFullPreview(false)}
                >
                  <X size={16} /> Close
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, padding: 16, background: '#f1f5f9', overflow: 'hidden' }}>
              <iframe
                title="Full document preview"
                srcDoc={preview?.html}
                sandbox="allow-same-origin"
                style={{ width: '100%', height: '100%', border: 0, borderRadius: 8, background: '#ffffff', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Builder = CustomerAgreementBuilder;
export { Builder };
