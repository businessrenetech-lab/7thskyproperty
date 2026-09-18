// admin-portal/src/screens/WtProviderAgreements.jsx
//
// Parametric builder for Service Delivery Provider Master Agreements across all
// Property Care service lines (Water Tank, Air Conditioning, Land Property Assessment, etc.).
//
// High-density Figma-grade 2-column live workspace matching the Customer & Sales
// Agreement architecture:
// - Left: Categorised form cards with quick-jump navigation, provider directory selector,
//   commercial terms, Schedule B agreed rate schedule with live override inputs,
//   Schedule C compliance checklist & legal inputs, and ordered witness attestation.
// - Right: Sticky real-time A4 agreement preview with live server recalculation,
//   Table of Contents, rate schedule breakdown, and full-screen preview modal with print support.
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Plus, FileSignature, Search, ChevronRight, RefreshCw, Send, Save, Eye,
  ArrowLeft, ArrowRight, Copy, Bell, Ban, Check, ShieldCheck, CalendarClock,
  Maximize2, X, Download, Printer, HardHat, Building, Phone, Mail, MapPin,
  CheckCircle, AlertCircle, Sparkles, DollarSign, Layers, CheckSquare, Square
} from 'lucide-react';
import api from '../services/api';
import { Spinner } from '../ui/kit';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  WtHead, Loading, EmptyState, Pill, DatePicker, bdt, dateFmt, toast, errText,
  svcProfile, svcBase,
} from './watertank/common';

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
  { id: 'provider', label: '1. Provider & Rep' },
  { id: 'commercial', label: '2. Commercial Terms' },
  { id: 'rates', label: '3. Agreed Rate Schedule (Schedule B)' },
  { id: 'legal', label: '4. Legal Inputs & Checklist (Schedule C)' },
  { id: 'witnesses', label: '5. Witnesses & Execution' },
];

const parseObject = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};
const parseArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

const buildInitialState = (user, profile) => ({
  effective_date: new Date().toISOString().slice(0, 10),
  term_months: 12,
  notice_days: 30,
  commission_pct: 10,
  payment_model: 'Project Based',
  payout_trigger: 'Completion Verified',
  payment_due_days: 7,
  payment_terms: 'Payment released upon completion verification and supervisor signoff.',
  fee_notes: 'Standard 10% commission applies on all completed work orders.',
  cumilla_exclusive: false,
  services: [],
  checklist: [
    'Trade Licence', 'Company Registration', 'TIN',
    'Public Liability', 'Workers’ Compensation (where applicable)',
    `Trade Licence for ${profile?.label || 'Property Care'} Services`,
  ],
  pricing_input: { selected: [] },
  template_values: {
    defect_rectification_days: 2,
  },
  witnesses: [
    { name: '', nid: '', email: '' },
    { name: '', nid: '', email: '' },
  ],
  org: {
    name: 'Seventh Sky Property Care',
    address: 'Dhaka, Bangladesh',
    represented_by: user?.name || 'Authorized Signatory',
    position: 'Managing Director',
    phone: '+880 1819-000000',
    email: user?.email || 'admin@seventhskyproperty.com',
  },
  provider: {
    business_name: '',
    legal_name: '',
    contact_person: '',
    represented_by: '',
    position: 'Authorized Signatory',
    phone: '',
    email: '',
    address: '',
    registered_address: '',
    registration_no: '',
    trade_licence_no: '',
    tin: '',
    bin: '',
  },
  bank_details: {
    account_name: '',
    bank_name: '',
    branch: '',
    account_number: '',
    routing_number: '',
    mobile_banking: '',
  },
});

export default function WtProviderAgreements() {
  const { id } = useParams();
  const location = useLocation();
  const building = location.pathname.endsWith('/new') || location.pathname.endsWith('/edit');
  if (building) return <ProviderAgreementBuilder id={id} />;
  if (id) return <AgreementDetail id={id} />;
  return <AgreementRegister />;
}

export function ProviderAgreementBuilder({
  id: propId,
  isModal = false,
  user: propUser,
  profile: propProfile,
  onCancel,
  onClose,
  onDone,
  editEnvelopeId,
}) {
  const { id: routeId } = useParams();
  const id = propId || routeId;
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const providerCode = searchParams.get('provider');
  const supersedesId = searchParams.get('supersedes');
  const { user: authUser } = useAuth();
  const user = propUser || authUser;
  const profile = propProfile || svcProfile();
  const base = svcBase();

  const accent = profile.accent || '#00AEEF';
  const accentSoft = profile.accent_soft || '#e0f2fe';
  const docCode = `SSPC-${profile.doc_code || 'WTCM'}-SDPMA-01`;

  const [activeSection, setActiveSection] = useState('all');
  const [form, setForm] = useState(() => buildInitialState(user, profile));
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [meta, setMeta] = useState({ template_fields: [], payment_models: [], payout_triggers: [] });
  const [catalog, setCatalog] = useState([]);
  const [preview, setPreview] = useState(null);
  const [agreement, setAgreement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState('');
  const [providerSearch, setProviderSearch] = useState('');
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [sent, setSent] = useState(null);
  const [hasAutoDraft, setHasAutoDraft] = useState(false);

  const previewRef = useRef(null);
  const previewScroll = useRef(0);
  const draftStorageKey = `sspc_provider_agreement_draft_${profile.doc_code || 'WTCM'}`;

  // Track iframe scroll position to avoid jumping on refresh
  useEffect(() => {
    const frame = previewRef.current;
    if (!frame) return;
    const handleScroll = () => {
      try {
        previewScroll.current = frame.contentWindow?.scrollY || 0;
      } catch {}
    };
    try {
      frame.contentWindow?.addEventListener('scroll', handleScroll);
      return () => frame.contentWindow?.removeEventListener('scroll', handleScroll);
    } catch {}
  }, [preview?.html]);

  // Load directory, metadata, and catalog
  useEffect(() => {
    Promise.all([
      api.get('/wt-providers/directory').catch(() => ({ data: { providers: [] } })),
      api.get('/wt-agreements/provider/meta').catch(() => ({ data: {} })),
      api.get('/wt-agreements/provider/catalog').catch(() => ({ data: [] })),
      ...(id ? [api.get(`/wt-agreements/provider/agreements/${id}`).catch(() => ({ data: null }))] : []),
    ])
      .then(([directory, metadata, cat, detail]) => {
        const list = directory.data?.providers || [];
        setProviders(list);
        setMeta(metadata.data || {});
        const catalogList = Array.isArray(cat.data) ? cat.data : [];
        setCatalog(catalogList);

        if (detail?.data) {
          const snapshot = parseObject(detail.data.agreement?.terms_snapshot, {});
          setAgreement(detail.data.agreement);
          setSelectedProvider(detail.data.provider);
          setForm((prev) => ({
            ...prev,
            ...snapshot,
            provider_id: detail.data.provider?.id || snapshot.provider_id,
            provider: {
              ...(prev.provider || {}),
              ...(snapshot.provider || {}),
              business_name: detail.data.provider?.business_name || snapshot.provider?.business_name || '',
              contact_person: detail.data.provider?.contact_person || snapshot.provider?.contact_person || '',
              phone: detail.data.provider?.contact_phone || detail.data.provider?.phone || snapshot.provider?.phone || '',
              email: detail.data.provider?.contact_email || detail.data.provider?.email || snapshot.provider?.email || '',
              address: detail.data.provider?.address || snapshot.provider?.address || '',
            },
            bank_details: snapshot.bank_details || detail.data.provider?.bank_details || {},
            pricing_input: snapshot.pricing_input || { selected: [] },
            template_values: snapshot.template_values || {},
          }));
          if (detail.data.html) {
            setPreview({ html: detail.data.html, doc_no: docCode, title: 'Master Service Delivery Provider Agreement' });
          }
        } else {
          // Check local draft or prefilled provider from query
          let restored = false;
          if (!id) {
            try {
              const raw = localStorage.getItem(draftStorageKey);
              if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                  setForm(parsed);
                  setHasAutoDraft(true);
                  restored = true;
                  if (parsed.provider_id) {
                    const match = list.find((p) => p.id === parsed.provider_id);
                    if (match) setSelectedProvider(match);
                  }
                }
              }
            } catch {}
          }
          if (!restored && providerCode) {
            const selected = list.find((item) => item.code === providerCode || String(item.id) === providerCode);
            if (selected) selectProvider(selected, catalogList);
          }
        }
      })
      .catch((e) => setError(errText(e, 'Could not load agreement builder')))
      .finally(() => setLoading(false));
  }, [id, providerCode]);

  // Hydrate from existing envelope if editEnvelopeId is passed
  useEffect(() => {
    if (!editEnvelopeId) return;
    let cancelled = false;
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
          setForm((prev) => ({
            ...prev,
            ...terms,
            provider_id: agr.related_id || terms.provider_id || prev.provider_id,
            provider: {
              ...(prev.provider || {}),
              ...(terms.provider || {}),
              business_name: agr.client_name || terms.provider?.business_name || prev.provider?.business_name,
              contact_email: agr.client_email || terms.provider?.contact_email || prev.provider?.contact_email,
            },
            bank_details: terms.bank_details || prev.bank_details,
            pricing_input: terms.pricing_input || prev.pricing_input,
            template_values: terms.template_values || prev.template_values,
          }));
          if (data.document_html) {
            setPreview({ html: data.document_html, doc_no: docCode, title: 'Master Service Delivery Provider Agreement' });
          }
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [editEnvelopeId, docCode]);

  // Select provider from directory
  const selectProvider = (row, catalogOverride = catalog) => {
    setSelectedProvider(row);
    const proposed = parseArray(row.proposed_rates);
    const selectedRates = proposed
      .map((rate) => ({
        code: rate.code,
        agreed_price: rate.proposed_rate ?? rate.standard_price,
      }))
      .filter((rate) => (catalogOverride || []).some((item) => item.code === rate.code));

    setForm((current) => {
      const updated = {
        ...current,
        provider_id: row.id,
        services: parseArray(row.service_categories).length
          ? parseArray(row.service_categories)
          : current.services,
        bank_details: parseObject(row.bank_details, current.bank_details || {}),
        cumilla_exclusive: !!row.cumilla_exclusive,
        pricing_input: {
          selected: selectedRates.length ? selectedRates : current.pricing_input.selected,
        },
        provider: {
          ...current.provider,
          business_name: row.business_name || '',
          legal_name: row.legal_name || row.business_name || '',
          contact_person: row.contact_person || '',
          represented_by: row.contact_person || row.represented_by || '',
          position: row.position || 'Authorized Signatory',
          phone: row.contact_phone || row.phone || '',
          email: row.contact_email || row.email || '',
          address: row.address || '',
          registered_address: row.address || '',
          registration_no: row.registration_no || '',
          trade_licence_no: row.trade_licence_no || row.trade_licence || '',
          tin: row.tin || '',
          bin: row.bin || '',
        },
        template_values: {
          ...(current.template_values || {}),
          sp_business_name: row.business_name || '',
          sp_rep_name: row.contact_person || '',
          sp_rep_phone: row.contact_phone || '',
          sp_rep_email: row.contact_email || '',
          registered_address: row.address || '',
          trade_licence_no: row.trade_licence_no || row.trade_licence || '',
          company_registration_no: row.registration_no || '',
        },
      };
      return updated;
    });
  };

  const setField = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));
  const setNested = (parent, key, val) =>
    setForm((prev) => ({ ...prev, [parent]: { ...(prev[parent] || {}), [key]: val } }));
  const setWitness = (i, key, val) =>
    setForm((prev) => {
      const list = [0, 1].map((n) => ({ ...(prev.witnesses?.[n] || {}) }));
      list[i][key] = val;
      return { ...prev, witnesses: list };
    });

  // Auto-save form to localStorage on changes
  useEffect(() => {
    if (!id && form.provider_id) {
      try {
        localStorage.setItem(draftStorageKey, JSON.stringify(form));
        setHasAutoDraft(true);
      } catch {}
    }
  }, [form, id, draftStorageKey]);

  const clearAutoDraft = () => {
    try {
      localStorage.removeItem(draftStorageKey);
      setHasAutoDraft(false);
      setForm(buildInitialState(user, profile));
      setSelectedProvider(null);
      toast.ok('Draft cleared');
    } catch {}
  };

  // Pricing & catalog helpers
  const rateMap = useMemo(
    () => new Map((form.pricing_input?.selected || []).map((rate) => [rate.code, rate])),
    [form.pricing_input]
  );

  const toggleRate = (item) => {
    setForm((current) => {
      const rows = [...(current.pricing_input?.selected || [])];
      const idx = rows.findIndex((rate) => rate.code === item.code);
      if (idx >= 0) {
        rows.splice(idx, 1);
      } else {
        rows.push({ code: item.code, agreed_price: item.standard_price });
      }
      return { ...current, pricing_input: { selected: rows } };
    });
  };

  const setAgreedPrice = (code, val) => {
    setForm((current) => ({
      ...current,
      pricing_input: {
        selected: (current.pricing_input?.selected || []).map((rate) =>
          rate.code === code ? { ...rate, agreed_price: val } : rate
        ),
      },
    }));
  };

  const selectAllRates = () => {
    const all = catalog.map((item) => {
      const existing = rateMap.get(item.code);
      return {
        code: item.code,
        agreed_price: existing?.agreed_price ?? item.standard_price,
      };
    });
    setForm((prev) => ({ ...prev, pricing_input: { selected: all } }));
  };

  const clearAllRates = () => {
    setForm((prev) => ({ ...prev, pricing_input: { selected: [] } }));
  };

  const groupedCatalog = useMemo(() => {
    const g = { service: [], material: [], labour: [] };
    catalog.forEach((c) => (g[c.group] || g.service).push(c));
    return g;
  }, [catalog]);

  // Payload for preview and saving
  const getPayload = useCallback(
    () => ({
      ...form,
      provider_id: selectedProvider?.id || form.provider_id,
      agreement_id: agreement?.id,
      supersedes_id: form.supersedes_id || (supersedesId ? Number(supersedesId) : null),
      pricing_input: form.pricing_input || { selected: [] },
    }),
    [form, selectedProvider, agreement, supersedesId]
  );

  // Real-time server preview recalculation
  const refreshPreview = useCallback(async () => {
    if (!selectedProvider) return;
    setPreviewing(true);
    try {
      const r = await api.post('/wt-agreements/provider/preview', getPayload());
      setPreview(r.data);
      setError('');
    } catch (e) {
      console.error('[ProviderPreview]', e);
    } finally {
      setPreviewing(false);
    }
  }, [selectedProvider, getPayload]);

  // Debounced auto-preview
  useEffect(() => {
    if (!selectedProvider) return;
    const t = setTimeout(() => {
      refreshPreview();
    }, 450);
    return () => clearTimeout(t);
  }, [form, selectedProvider, refreshPreview]);

  // Save Draft
  const save = async () => {
    if (!selectedProvider) {
      toast.err('Select a service provider first.');
      setActiveSection('provider');
      return null;
    }
    setBusy(true);
    setError('');
    try {
      const payload = getPayload();
      const res = agreement
        ? await api.patch(`/wt-agreements/provider/agreements/${agreement.code || agreement.id}`, payload)
        : await api.post('/wt-agreements/provider/agreements', payload);
      const row = res.data.agreement;
      setAgreement(row);
      toast.ok(`Draft ${row.code} saved`);
      try { localStorage.removeItem(draftStorageKey); setHasAutoDraft(false); } catch {}
      if (!agreement && !isModal) {
        nav(`${base}/agreements/provider/${row.code}/edit`, { replace: true });
      }
      return row;
    } catch (e) {
      const msg = errText(e, 'Could not save the agreement draft');
      setError(msg);
      toast.err(msg);
      return null;
    } finally {
      setBusy(false);
    }
  };

  // Send for signature
  const send = async () => {
    if (!selectedProvider) {
      toast.err('Select a service provider first (Section 1)');
      setActiveSection('provider');
      return;
    }
    const providerEmail = form.provider?.email || selectedProvider.contact_email;
    if (!providerEmail) {
      toast.err('Provider representative email is required to send for signature (Section 1)');
      setActiveSection('provider');
      return;
    }
    if (!form.org?.email) {
      toast.err('Seventh Sky countersigner email is required (Section 1)');
      setActiveSection('provider');
      return;
    }

    setBusy(true);
    try {
      const row = agreement || (await save());
      if (!row) return;

      const r = await api.post(`/wt-agreements/provider/agreements/${row.code || row.id}/send`);
      try { localStorage.removeItem(draftStorageKey); } catch {}
      setSent(r.data);
      toast.ok('Agreement dispatched to provider for ordered e-signature');
      if (onDone) onDone();
    } catch (e) {
      const msg = errText(e, 'Could not send the agreement for signature');
      setError(msg);
      toast.err(msg);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading />;

  // Dispatched confirmation screen
  if (sent) {
    const signingUrl = sent.signing_path
      ? `${window.location.origin}${sent.signing_path}`
      : sent.links?.[0]?.signing_path
      ? `${window.location.origin}${sent.links[0].signing_path}`
      : '';
    return (
      <div className="pm-scope">
        <div className="pm-head">
          <div>
            <div className="pm-eyebrow" style={{ color: accent }}>{profile.label} Provider Master Agreements</div>
            <h1>Agreement Sent for Ordered Signature</h1>
          </div>
        </div>
        <div className="pm-card" style={{ maxWidth: 720, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div className="pm-card-body" style={{ padding: 28 }}>
            <div className="pm-chip good" style={{ marginBottom: 14, fontSize: 13, padding: '4px 12px' }}>
              <span className="d" />
              {sent.envelope_code || sent.code} · Dispatched for Execution
            </div>
            <p style={{ fontSize: 14, color: 'var(--ink-soft, #334155)', lineHeight: 1.6 }}>
              The Service Provider representative has been notified by email to complete the first signature. Once signed, Seventh Sky will countersign, followed by witness attestations.
            </p>
            {signingUrl && (
              <div style={{ margin: '18px 0' }}>
                <label style={lbl}>Provider Electronic Signing Ceremony Link</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input readOnly value={signingUrl} style={{ ...sel, fontSize: 12.5, fontFamily: 'monospace' }} />
                  <button
                    type="button"
                    className="pm-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(signingUrl).then(() => toast.ok('Signing link copied'));
                    }}
                  >
                    <Copy size={14} /> Copy
                  </button>
                  <a
                    className="pm-btn primary"
                    href={signingUrl}
                    target="_blank"
                    rel="noopener"
                    style={{ textDecoration: 'none', background: accent, borderColor: accent }}
                  >
                    <Eye size={14} /> Open
                  </a>
                </div>
              </div>
            )}
            <div style={{ marginTop: 24, borderTop: '1px solid var(--line, #e2e8f0)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--muted, #64748b)' }}>
                Agreed rates and operational terms become active upon complete multi-party execution.
              </div>
              <button
                type="button"
                className="pm-btn"
                onClick={onDone || (() => nav(`${base}/agreements/provider`))}
              >
                Back to agreements
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredProviders = providers.filter(
    (item) =>
      !providerSearch ||
      [item.code, item.business_name, item.contact_email, item.contact_person].some((val) =>
        String(val || '').toLowerCase().includes(providerSearch.toLowerCase())
      )
  );

  return (
    <div className="pm-scope" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ── Top Pinned Executive Header Bar ── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'var(--surface, #ffffff)',
          borderBottom: '1px solid var(--line, #e2e8f0)',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="pm-btn"
            style={{ padding: '6px 12px', fontSize: 13 }}
            onClick={onCancel || onClose || (() => nav(`${base}/agreements/provider`))}
          >
            <ArrowLeft size={15} /> Back
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--navy, #0f172a)' }}>
                {agreement ? `Edit Draft ${agreement.code}` : `Draft ${profile.label} Provider Master Agreement`}
              </h1>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'var(--surface-2, #f1f5f9)',
                  color: 'var(--navy, #012a4e)',
                  border: '1px solid var(--line, #cbd5e1)',
                }}
              >
                {docCode}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted, #64748b)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <span>V0.2 Master Template</span>
              <span>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#16a34a', fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
                Live Sync Active
              </span>
              {hasAutoDraft && !id && (
                <>
                  <span>·</span>
                  <span style={{ color: 'var(--muted, #64748b)' }}>Draft restored</span>
                  <button
                    type="button"
                    onClick={clearAutoDraft}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    Clear draft
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="pm-btn"
            disabled={previewing || !selectedProvider}
            onClick={refreshPreview}
            title="Force refresh live preview"
          >
            <RefreshCw size={14} className={previewing ? 'wt-spin' : ''} />
            <span style={{ display: 'none', '@media (min-width: 768px)': { display: 'inline' } }}>Refresh</span>
          </button>
          <button
            type="button"
            className="pm-btn"
            disabled={!preview?.html}
            onClick={() => setShowFullPreview(true)}
            title="Open full document modal preview"
          >
            <Maximize2 size={14} /> Full preview
          </button>
          <button
            type="button"
            className="pm-btn"
            disabled={busy || !selectedProvider}
            onClick={save}
          >
            <Save size={14} /> Save draft
          </button>
          <button
            type="button"
            className="pm-btn primary"
            disabled={busy || !selectedProvider}
            onClick={send}
            style={{ background: accent, borderColor: accent }}
          >
            <Send size={14} /> Send for signature
          </button>
          {isModal && (
            <button
              type="button"
              className="pm-btn"
              onClick={onClose}
              style={{ marginLeft: 4 }}
              title="Close window"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── Quick Jump Segment Navigation Pills ── */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          padding: '10px 20px',
          background: 'var(--surface-2, #f8fafc)',
          borderBottom: '1px solid var(--line, #e2e8f0)',
        }}
      >
        {SECTIONS.map((sec) => {
          const active = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                border: `1px solid ${active ? accent : 'var(--line, #cbd5e1)'}`,
                background: active ? accent : '#ffffff',
                color: active ? '#ffffff' : 'var(--ink, #0f172a)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {sec.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div
          style={{
            margin: '12px 20px 0',
            padding: '10px 14px',
            borderRadius: 8,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {(form.supersedes_id || supersedesId) && !agreement && (
        <div
          style={{
            margin: '12px 20px 0',
            padding: '10px 14px',
            borderRadius: 8,
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            fontSize: 12.5,
          }}
        >
          <strong>Contract Renewal:</strong> This draft supersedes existing agreement #{form.supersedes_id || supersedesId}. The existing agreement is marked Superseded automatically upon completion of signatures.
        </div>
      )}

      {/* ── 2-Column Live Workspace ── */}
      <div
        style={{
          display: 'flex',
          gap: 20,
          padding: '18px 20px 32px',
          alignItems: 'flex-start',
        }}
      >
        {/* Left Column: Forms */}
        <div style={{ flex: '1 1 58%', minWidth: 460, display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Section 1: Provider Directory & Representative */}
          {(activeSection === 'all' || activeSection === 'provider') && (
            <div className="pm-card" style={{ borderRadius: 12 }}>
              <div className="pm-card-h" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line, #e2e8f0)' }}>
                <div className="ic" style={{ background: `${accentSoft}`, color: accent }}>
                  <Building size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: 14 }}>1. Appointed Service Provider &amp; Seventh Sky Representative</h3>
                  <div className="hsub" style={{ fontSize: 11.5 }}>
                    Select a verified partner from the directory or prefill from onboarding dossier
                  </div>
                </div>
              </div>

              <div className="pm-card-body" style={{ padding: '16px 18px' }}>
                {/* Search / Select Provider */}
                <div style={{ marginBottom: 16 }}>
                  <label style={lbl}>Search &amp; Select Service Provider *</label>
                  <div style={{ position: 'relative', marginBottom: 10 }}>
                    <Search size={15} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted, #94a3b8)' }} />
                    <input
                      style={{ ...sel, paddingLeft: 34 }}
                      placeholder="Search provider business name, code, contact or email…"
                      value={providerSearch}
                      onChange={(e) => setProviderSearch(e.target.value)}
                    />
                  </div>

                  {/* Provider Pill Cards Grid */}
                  <div
                    style={{
                      maxHeight: 180,
                      overflowY: 'auto',
                      border: '1px solid var(--line, #e2e8f0)',
                      borderRadius: 10,
                      background: 'var(--surface-2, #f8fafc)',
                      padding: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    {filteredProviders.length ? (
                      filteredProviders.map((row) => {
                        const isSelected = selectedProvider?.id === row.id;
                        return (
                          <div
                            key={row.id}
                            onClick={() => selectProvider(row)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 8,
                              cursor: 'pointer',
                              background: isSelected ? '#ffffff' : 'transparent',
                              border: `1px solid ${isSelected ? accent : 'transparent'}`,
                              boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? accent : 'var(--navy, #0f172a)' }}>
                                {row.business_name}
                              </div>
                              <div style={{ fontSize: 11.5, color: 'var(--muted, #64748b)', marginTop: 2 }}>
                                {row.code} · {row.contact_person} · {row.contact_email || row.contact_phone}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Pill value={row.onboarding_submission_status || row.status || 'Active'} sm />
                              {isSelected && <Check size={16} style={{ color: accent }} />}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: 14, textAlign: 'center', fontSize: 12, color: 'var(--muted, #94a3b8)' }}>
                        No providers found matching &ldquo;{providerSearch}&rdquo;
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Provider Dossier Details */}
                {selectedProvider && (
                  <div
                    style={{
                      padding: 14,
                      background: 'var(--surface-2, #f8fafc)',
                      borderRadius: 10,
                      border: '1px solid var(--line, #e2e8f0)',
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy, #0f172a)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle size={14} style={{ color: '#16a34a' }} />
                      Selected Partner Legal Dossier (Editable for this contract)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={lbl}>Business / Trading Name</label>
                        <input
                          style={sel}
                          value={form.provider.business_name}
                          onChange={(e) => setNested('provider', 'business_name', e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={lbl}>Representative Contact Person</label>
                        <input
                          style={sel}
                          value={form.provider.contact_person}
                          onChange={(e) => {
                            setNested('provider', 'contact_person', e.target.value);
                            setNested('provider', 'represented_by', e.target.value);
                          }}
                        />
                      </div>
                      <div>
                        <label style={lbl}>Representative Phone</label>
                        <input
                          style={sel}
                          value={form.provider.phone}
                          onChange={(e) => setNested('provider', 'phone', e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={lbl}>Representative Signing Email *</label>
                        <input
                          type="email"
                          style={sel}
                          value={form.provider.email}
                          onChange={(e) => setNested('provider', 'email', e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={lbl}>Trade Licence No.</label>
                        <input
                          style={sel}
                          value={form.provider.trade_licence_no}
                          onChange={(e) => setNested('provider', 'trade_licence_no', e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={lbl}>Company Registration No.</label>
                        <input
                          style={sel}
                          value={form.provider.registration_no}
                          onChange={(e) => setNested('provider', 'registration_no', e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={lbl}>Tax Identification No. (TIN)</label>
                        <input
                          style={sel}
                          value={form.provider.tin}
                          onChange={(e) => setNested('provider', 'tin', e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={lbl}>Business Identification No. (BIN)</label>
                        <input
                          style={sel}
                          value={form.provider.bin}
                          onChange={(e) => setNested('provider', 'bin', e.target.value)}
                        />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={lbl}>Registered Business Address</label>
                        <input
                          style={sel}
                          value={form.provider.address}
                          onChange={(e) => {
                            setNested('provider', 'address', e.target.value);
                            setNested('provider', 'registered_address', e.target.value);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Seventh Sky Representative Card */}
                <div
                  style={{
                    padding: 14,
                    background: `${accentSoft}25`,
                    borderRadius: 10,
                    border: `1px solid ${accent}40`,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy, #0f172a)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={15} style={{ color: accent }} />
                    Seventh Sky Principal Representative &amp; Countersigner
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={lbl}>Authorized Signatory Name</label>
                      <input
                        style={sel}
                        value={form.org.represented_by}
                        onChange={(e) => setNested('org', 'represented_by', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={lbl}>Signatory Position</label>
                      <input
                        style={sel}
                        value={form.org.position}
                        onChange={(e) => setNested('org', 'position', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={lbl}>Official Signing Email *</label>
                      <input
                        type="email"
                        style={sel}
                        value={form.org.email}
                        onChange={(e) => setNested('org', 'email', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={lbl}>Contact Phone</label>
                      <input
                        style={sel}
                        value={form.org.phone}
                        onChange={(e) => setNested('org', 'phone', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Commercial Terms */}
          {(activeSection === 'all' || activeSection === 'commercial') && (
            <div className="pm-card" style={{ borderRadius: 12 }}>
              <div className="pm-card-h" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line, #e2e8f0)' }}>
                <div className="ic" style={{ background: `${accentSoft}`, color: accent }}>
                  <DollarSign size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: 14 }}>2. Commercial Arrangements &amp; Bank Details</h3>
                  <div className="hsub" style={{ fontSize: 11.5 }}>
                    Contract duration, commission percentage, payout conditions and settlement account
                  </div>
                </div>
              </div>

              <div className="pm-card-body" style={{ padding: '16px 18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={lbl}>Effective Date</label>
                    <DatePicker
                      value={form.effective_date}
                      onChange={(v) => setField('effective_date', v)}
                    />
                  </div>
                  <div>
                    <label style={lbl}>Agreement Term (Months)</label>
                    <input
                      type="number"
                      min={1}
                      style={sel}
                      value={form.term_months}
                      onChange={(e) => setField('term_months', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label style={lbl}>Notice Period (Days)</label>
                    <input
                      type="number"
                      min={1}
                      style={sel}
                      value={form.notice_days}
                      onChange={(e) => setField('notice_days', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label style={lbl}>Seventh Sky Commission (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      style={sel}
                      value={form.commission_pct}
                      onChange={(e) => setField('commission_pct', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label style={lbl}>Payment Model</label>
                    <select
                      style={sel}
                      value={form.payment_model}
                      onChange={(e) => setField('payment_model', e.target.value)}
                    >
                      {(meta.payment_models?.length ? meta.payment_models : ['Project Based', 'AMC', 'Emergency / Call-Out']).map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Provider Payout Trigger</label>
                    <select
                      style={sel}
                      value={form.payout_trigger}
                      onChange={(e) => setField('payout_trigger', e.target.value)}
                    >
                      {(meta.payout_triggers?.length ? meta.payout_triggers : ['Completion Verified', 'Client Payment Received', 'Approved Milestone']).map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={lbl}>Payment Due After Trigger (Days)</label>
                    <input
                      type="number"
                      min={0}
                      style={sel}
                      value={form.payment_due_days}
                      onChange={(e) => setField('payment_due_days', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label style={lbl}>Payment Terms Note</label>
                    <input
                      style={sel}
                      value={form.payment_terms}
                      onChange={(e) => setField('payment_terms', e.target.value)}
                      placeholder="e.g. Net 7 days after completion verified"
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={lbl}>Fee Notes &amp; Special Commercial Conditions</label>
                    <textarea
                      rows={2}
                      style={{ ...sel, resize: 'vertical' }}
                      value={form.fee_notes}
                      onChange={(e) => setField('fee_notes', e.target.value)}
                      placeholder="Any additional commission tiers or special milestone notes..."
                    />
                  </div>
                </div>

                {/* Bank Details Sub-card */}
                <div style={{ padding: 14, background: 'var(--surface-2, #f8fafc)', borderRadius: 10, border: '1px solid var(--line, #e2e8f0)' }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy, #0f172a)', marginBottom: 8 }}>
                    Service Provider Payout Account (Bank / MFS)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <div>
                      <label style={lbl}>Account Name</label>
                      <input
                        style={sel}
                        value={form.bank_details.account_name}
                        onChange={(e) => setNested('bank_details', 'account_name', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={lbl}>Bank Name</label>
                      <input
                        style={sel}
                        value={form.bank_details.bank_name}
                        onChange={(e) => setNested('bank_details', 'bank_name', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={lbl}>Branch</label>
                      <input
                        style={sel}
                        value={form.bank_details.branch}
                        onChange={(e) => setNested('bank_details', 'branch', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={lbl}>Account Number</label>
                      <input
                        style={sel}
                        value={form.bank_details.account_number}
                        onChange={(e) => setNested('bank_details', 'account_number', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={lbl}>Routing Number</label>
                      <input
                        style={sel}
                        value={form.bank_details.routing_number}
                        onChange={(e) => setNested('bank_details', 'routing_number', e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={lbl}>bKash / Nagad Number</label>
                      <input
                        style={sel}
                        value={form.bank_details.mobile_banking}
                        onChange={(e) => setNested('bank_details', 'mobile_banking', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Agreed Rate Schedule (Schedule B) */}
          {(activeSection === 'all' || activeSection === 'rates') && (
            <div className="pm-card" style={{ borderRadius: 12 }}>
              <div className="pm-card-h" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="ic" style={{ background: `${accentSoft}`, color: accent }}>
                    <Layers size={16} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 14 }}>3. Agreed Provider Rate Schedule (Schedule B)</h3>
                    <div className="hsub" style={{ fontSize: 11.5 }}>
                      Tick authorized services and set approved agreed rates in BDT (৳)
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="pm-btn" style={{ fontSize: 11.5, padding: '3px 10px' }} onClick={selectAllRates}>
                    Select all
                  </button>
                  <button type="button" className="pm-btn" style={{ fontSize: 11.5, padding: '3px 10px' }} onClick={clearAllRates}>
                    Clear
                  </button>
                </div>
              </div>

              <div className="pm-card-body" style={{ padding: '16px 18px' }}>
                <div style={{ fontSize: 12, color: 'var(--muted, #64748b)', marginBottom: 14 }}>
                  Only checked services will appear in <strong>Schedule B</strong> of the Provider Master Agreement and be eligible for auto-pricing on work orders.
                </div>

                {['service', 'material', 'labour'].map((grpKey) => {
                  const items = groupedCatalog[grpKey] || [];
                  if (!items.length) return null;
                  const title =
                    grpKey === 'service'
                      ? `${profile.label} Core Services & Solutions`
                      : grpKey === 'material'
                      ? 'Materials & Consumables'
                      : 'Labour & Specialist Workmanship';
                  return (
                    <div key={grpKey} style={{ marginBottom: 18 }}>
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy, #0f172a)', margin: '6px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
                        {title}
                      </div>
                      <table className="pm-tbl" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th style={{ width: 36, textAlign: 'center' }}></th>
                            <th style={{ width: 90 }}>Code</th>
                            <th>Service / Deliverable</th>
                            <th style={{ width: 80 }}>Unit</th>
                            <th style={{ width: 110, textAlign: 'right' }}>Standard</th>
                            <th style={{ width: 130, textAlign: 'right' }}>Agreed Price (৳)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => {
                            const on = rateMap.has(item.code);
                            const currentRate = rateMap.get(item.code);
                            return (
                              <tr
                                key={item.code}
                                style={{
                                  background: on ? `${accentSoft}20` : 'transparent',
                                  opacity: on ? 1 : 0.65,
                                }}
                              >
                                <td style={{ textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={on}
                                    onChange={() => toggleRate(item)}
                                    style={{ accentColor: accent, cursor: 'pointer' }}
                                  />
                                </td>
                                <td style={{ fontSize: 11.5, fontFamily: 'monospace', fontWeight: 600, color: 'var(--navy, #012a4e)' }}>
                                  {item.code}
                                </td>
                                <td style={{ fontSize: 12.5, fontWeight: on ? 600 : 400 }}>
                                  {item.name}
                                </td>
                                <td style={{ fontSize: 12, color: 'var(--muted, #64748b)' }}>
                                  {item.unit || '—'}
                                </td>
                                <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted, #64748b)' }}>
                                  {bdt(item.standard_price)}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  {on ? (
                                    <input
                                      type="number"
                                      min={0}
                                      style={{ ...sel, width: 110, padding: '4px 8px', textAlign: 'right', fontWeight: 700 }}
                                      placeholder={String(item.standard_price)}
                                      value={currentRate?.agreed_price ?? ''}
                                      onChange={(e) => setAgreedPrice(item.code, e.target.value)}
                                    />
                                  ) : (
                                    <span style={{ color: 'var(--muted, #94a3b8)', fontSize: 12 }}>—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}

                <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--surface-2, #f8fafc)', borderRadius: 8, border: '1px solid var(--line, #e2e8f0)', fontSize: 12, color: 'var(--ink-soft, #334155)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Selected Rate Lines: <strong>{(form.pricing_input?.selected || []).length} items</strong></span>
                  <span style={{ color: 'var(--muted, #64748b)' }}>Schedule B automatically renders these lines</span>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Legal Inputs & Compliance Checklist (Schedule C) */}
          {(activeSection === 'all' || activeSection === 'legal') && (
            <div className="pm-card" style={{ borderRadius: 12 }}>
              <div className="pm-card-h" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line, #e2e8f0)' }}>
                <div className="ic" style={{ background: `${accentSoft}`, color: accent }}>
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: 14 }}>4. Legal Parameters &amp; Schedule C Compliance</h3>
                  <div className="hsub" style={{ fontSize: 11.5 }}>
                    Defect rectification response, insurance verification, and required certifications
                  </div>
                </div>
              </div>

              <div className="pm-card-body" style={{ padding: '16px 18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={lbl}>Clause 22: Defect Rectification Response (Business Days)</label>
                    <input
                      type="number"
                      min={1}
                      style={sel}
                      value={form.template_values?.defect_rectification_days ?? 2}
                      onChange={(e) => setNested('template_values', 'defect_rectification_days', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label style={lbl}>Territory Exclusivity</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12.5, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!!form.cumilla_exclusive}
                        onChange={(e) => setField('cumilla_exclusive', e.target.checked)}
                        style={{ accentColor: accent }}
                      />
                      <span>Exclusive territory partner for designated zone</span>
                    </label>
                  </div>
                </div>

                {/* Schedule C Checklist Selector */}
                <div style={{ borderTop: '1px solid var(--line, #e2e8f0)', paddingTop: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy, #0f172a)', marginBottom: 8 }}>
                    Schedule C Compliance &amp; Document Verification Checklist
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      'Trade Licence',
                      'Company Registration',
                      'TIN Certificate',
                      'BIN Certificate',
                      'Public Liability Insurance',
                      'Workers’ Compensation Insurance',
                      'Employer Liability Insurance',
                      'Motor Vehicle Insurance',
                      'Professional Indemnity',
                      `Trade Licence for ${profile.label || 'Property Care'} Services`,
                      'Quality Testing Accreditation',
                      'Public Health / Environmental Compliance Certification',
                    ].map((item) => {
                      const on = (form.checklist || []).includes(item);
                      return (
                        <label
                          key={item}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '6px 10px',
                            borderRadius: 6,
                            background: on ? `${accentSoft}25` : 'var(--surface-2, #f8fafc)',
                            border: `1px solid ${on ? `${accent}40` : 'var(--line, #e2e8f0)'}`,
                            fontSize: 12,
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => {
                              const list = [...(form.checklist || [])];
                              const idx = list.indexOf(item);
                              if (idx >= 0) list.splice(idx, 1);
                              else list.push(item);
                              setField('checklist', list);
                            }}
                            style={{ accentColor: accent }}
                          />
                          <span style={{ color: on ? 'var(--navy, #0f172a)' : 'var(--muted, #64748b)', fontWeight: on ? 600 : 400 }}>
                            {item}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Witnesses & Execution */}
          {(activeSection === 'all' || activeSection === 'witnesses') && (
            <div className="pm-card" style={{ borderRadius: 12 }}>
              <div className="pm-card-h" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line, #e2e8f0)' }}>
                <div className="ic" style={{ background: `${accentSoft}`, color: accent }}>
                  <FileSignature size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: 14 }}>5. Witnesses &amp; Multi-Party Execution Order</h3>
                  <div className="hsub" style={{ fontSize: 11.5 }}>
                    Attestation witnesses and digital signature dispatch workflow
                  </div>
                </div>
              </div>

              <div className="pm-card-body" style={{ padding: '16px 18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      style={{
                        padding: 14,
                        background: 'var(--surface-2, #f8fafc)',
                        borderRadius: 10,
                        border: '1px solid var(--line, #e2e8f0)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy, #0f172a)' }}>
                        Witness {i + 1} (Electronic Attestation)
                      </div>
                      <div>
                        <label style={lbl}>Full Legal Name</label>
                        <input
                          style={sel}
                          value={form.witnesses?.[i]?.name || ''}
                          onChange={(e) => setWitness(i, 'name', e.target.value)}
                          placeholder="e.g. Tanvir Ahmed"
                        />
                      </div>
                      <div>
                        <label style={lbl}>NID / Passport Number</label>
                        <input
                          style={sel}
                          value={form.witnesses?.[i]?.nid || ''}
                          onChange={(e) => setWitness(i, 'nid', e.target.value)}
                          placeholder="National ID or Passport"
                        />
                      </div>
                      <div>
                        <label style={lbl}>Signing Email Address (to receive ceremony link)</label>
                        <input
                          type="email"
                          style={sel}
                          value={form.witnesses?.[i]?.email || ''}
                          onChange={(e) => setWitness(i, 'email', e.target.value)}
                          placeholder="witness@example.com"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ordered signing ceremony note */}
                <div
                  style={{
                    padding: 12,
                    background: `${accentSoft}30`,
                    borderRadius: 8,
                    border: `1px solid ${accent}30`,
                    fontSize: 12,
                    color: 'var(--ink-soft, #334155)',
                    lineHeight: 1.6,
                  }}
                >
                  <strong>Enforced Execution Order:</strong>
                  <ol style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                    <li><strong>Service Provider</strong> ({form.provider.email || 'pending email'}) signs the agreement first.</li>
                    <li><strong>Seventh Sky Authorized Officer</strong> ({form.org.email}) countersigns upon partner submission.</li>
                    <li><strong>Witnesses 1 &amp; 2</strong> receive their attestation links once both principals have executed.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Sticky Live Agreement Preview */}
        <div
          style={{
            flex: '1 1 42%',
            minWidth: 420,
            position: 'sticky',
            top: 75,
            height: isModal ? 'calc(96vh - 120px)' : 'calc(100vh - 95px)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            className="pm-card"
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              borderRadius: 12,
              border: '1px solid var(--line, #e2e8f0)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid var(--line, #e2e8f0)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--surface, #ffffff)',
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--navy, #0f172a)', letterSpacing: '-0.2px' }}>
                  {preview?.title || `Master Service Delivery Provider Agreement`}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted, #64748b)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                  Live Preview · Real-time A4 rendering ({docCode})
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
                  title="Provider Agreement live preview"
                  srcDoc={preview.html}
                  sandbox="allow-same-origin"
                  onLoad={() => {
                    try {
                      previewRef.current?.contentWindow?.scrollTo(0, previewScroll.current);
                    } catch {}
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 0,
                    borderRadius: 8,
                    background: '#ffffff',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                  }}
                />
              ) : (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    color: 'var(--muted, #64748b)',
                    padding: 24,
                    textAlign: 'center',
                  }}
                >
                  <Spinner />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {selectedProvider ? 'Generating live document preview…' : 'Select a service provider to load live preview'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── In-App Full Document Preview Modal ── */}
      {showFullPreview && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 32px',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowFullPreview(false);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '14px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                  {preview?.title || 'Master Service Delivery Provider Agreement'}
                </h3>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Full A4 Document Preview · Ref: {docCode}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  className="pm-btn"
                  onClick={async () => {
                    try {
                      const { default: html2pdf } = await import('html2pdf.js');
                      const iframe = document.getElementById('provider-full-preview-frame');
                      const doc = iframe?.contentDocument?.body || iframe?.contentWindow?.document?.body;
                      if (!doc) return;
                      const opt = {
                        margin: [10, 10, 12, 10],
                        filename: `${(preview?.doc_no || form.provider.business_name || 'Provider-Agreement').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                        pagebreak: { mode: ['css', 'avoid-all'] },
                      };
                      await html2pdf().set(opt).from(doc).save();
                    } catch (err) {
                      console.error('PDF export failed:', err);
                      toast.err('PDF generation failed. Please use Print Document.');
                    }
                  }}
                >
                  <Download size={14} /> Download PDF
                </button>
                <button
                  type="button"
                  className="pm-btn"
                  onClick={() => {
                    const iframe = document.getElementById('provider-full-preview-frame');
                    if (iframe?.contentWindow) {
                      iframe.contentWindow.focus();
                      iframe.contentWindow.print();
                    }
                  }}
                >
                  <Printer size={14} /> Print Document
                </button>
                <button
                  type="button"
                  className="pm-btn"
                  onClick={() => setShowFullPreview(false)}
                >
                  <X size={15} /> Close
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, background: '#e2e8f0', padding: 20, overflow: 'hidden' }}>
              <iframe
                id="provider-full-preview-frame"
                title="Full Agreement Document Preview"
                srcDoc={preview?.html}
                sandbox="allow-same-origin allow-modals"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 0,
                  borderRadius: 8,
                  background: '#ffffff',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AgreementRegister() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const base = svcBase();

  const load = () => {
    setLoading(true);
    api.get('/wt-agreements/provider/agreements')
      .then((r) => setRows(Array.isArray(r.data) ? r.data : []))
      .catch((e) => toast.err(errText(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const shown = rows.filter((row) =>
    !q || [row.code, row.provider?.business_name, row.status].some((value) =>
      String(value || '').toLowerCase().includes(q.toLowerCase())
    )
  );
  const completed = rows.filter((row) => row.status === 'Completed');
  const sent = rows.filter((row) => row.status === 'Sent');
  const expiring = completed.filter(
    (row) =>
      row.expiry_date &&
      (new Date(row.expiry_date) - Date.now()) / 864e5 <= 60 &&
      new Date(row.expiry_date) >= new Date()
  );

  return (
    <>
      <WtHead
        title="Provider Master Agreements"
        subtitle="Canonical 25-clause agreement · approved rates · ordered multi-party e-signature"
        search={q}
        onSearch={setQ}
      >
        <button className="wt-btn" onClick={load}>
          <RefreshCw size={14} /> Refresh
        </button>
        <button className="wt-btn primary" onClick={() => nav(`${base}/agreements/provider/new`)}>
          <Plus size={14} /> New agreement
        </button>
      </WtHead>
      <div className="wt-kpis">
        <Metric
          icon={FileSignature}
          label="All agreements"
          value={rows.length}
          sub={`${rows.filter((r) => r.status === 'Draft').length} drafts`}
        />
        <Metric
          icon={ShieldCheck}
          label="Completed & active"
          value={completed.length}
          sub="Both parties signed"
          tone="var(--wt-green)"
        />
        <Metric
          icon={Send}
          label="Awaiting signatures"
          value={sent.length}
          sub={`${sent.reduce(
            (sum, row) => sum + (row.signers || []).filter((s) => s.status !== 'signed').length,
            0
          )} signatures outstanding`}
          tone="var(--wt-amber)"
        />
        <Metric
          icon={CalendarClock}
          label="Expiring in 60 days"
          value={expiring.length}
          sub="Renew before assignment blocks"
          tone={expiring.length ? 'var(--wt-red)' : undefined}
        />
      </div>
      <div className="wt-card wt-tblcard">
        {loading ? (
          <Loading />
        ) : shown.length ? (
          <table className="wt-tbl">
            <thead>
              <tr>
                <th>Agreement</th>
                <th>Provider</th>
                <th>Version</th>
                <th>Effective term</th>
                <th>Rates</th>
                <th>Signatures</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr
                  className="click"
                  key={row.id}
                  onClick={() => nav(`${base}/agreements/provider/${row.code}`)}
                >
                  <td className="id">{row.code}</td>
                  <td>
                    <strong>{row.provider?.business_name || 'Provider unavailable'}</strong>
                    <div className="cell-sub">{row.provider?.code}</div>
                  </td>
                  <td>v{row.version_no}</td>
                  <td>
                    {dateFmt(row.effective_date)}
                    <div className="cell-sub">to {dateFmt(row.expiry_date)}</div>
                  </td>
                  <td>
                    {Array.isArray(row.authorised_services) ? row.authorised_services.length : '—'} services
                  </td>
                  <td>
                    {(row.signers || []).filter((s) => s.status === 'signed').length}/
                    {(row.signers || []).length || 2}
                  </td>
                  <td>
                    <Pill value={row.status} sm />
                  </td>
                  <td>
                    <ChevronRight size={15} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            eyebrow="Provider agreements"
            title="No agreements found"
            hint="Start from a provider file or create a provider-prefilled agreement here."
            action={
              <button className="wt-btn primary" onClick={() => nav(`${base}/agreements/provider/new`)}>
                <Plus size={14} /> New agreement
              </button>
            }
          />
        )}
      </div>
    </>
  );
}

function AgreementDetail({ id }) {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const base = svcBase();

  const load = () => {
    setLoading(true);
    api.get(`/wt-agreements/provider/agreements/${id}`)
      .then((r) => setData(r.data))
      .catch((e) => setError(errText(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const remind = async () => {
    try {
      await api.post(`/signing/envelopes/${data.agreement.envelope_id}/remind`);
      toast.ok('Outstanding signer reminded');
      load();
    } catch (e) {
      toast.err(errText(e));
    }
  };

  const voidAgreement = async () => {
    const reason = window.prompt('Reason for voiding this agreement:');
    if (!reason) return;
    try {
      await api.post(`/signing/envelopes/${data.agreement.envelope_id}/void`, { reason });
      toast.ok('Agreement voided');
      load();
    } catch (e) {
      toast.err(errText(e));
    }
  };

  if (loading) return <Loading />;
  if (error || !data) return <EmptyState eyebrow="Agreement" title="Could not load agreement" hint={error} />;

  const { agreement, provider, rates, envelope } = data;
  return (
    <>
      <WtHead
        crumb={
          <div className="wt-crumb">
            <span className="lnk" onClick={() => nav(`${base}/agreements/provider`)}>
              Provider Agreements
            </span>{' '}
            › <span>{agreement.code}</span>
          </div>
        }
        title={agreement.code}
        subtitle={`${provider?.business_name || ''} · version ${agreement.version_no}`}
      >
        {agreement.status === 'Draft' && (
          <button className="wt-btn primary" onClick={() => nav(`${base}/agreements/provider/${agreement.code}/edit`)}>
            <FileSignature size={14} /> Edit draft
          </button>
        )}
        {['sent', 'viewed', 'partially_signed'].includes(String(envelope?.status || '').toLowerCase()) && (
          <>
            <button className="wt-btn" onClick={remind}>
              <Bell size={14} /> Remind
            </button>
            <button className="wt-btn danger-ghost" onClick={voidAgreement}>
              <Ban size={14} /> Void & reissue
            </button>
          </>
        )}
        <button
          className="wt-btn"
          onClick={async () => {
            try {
              const { default: html2pdf } = await import('html2pdf.js');
              const el = document.querySelector('.wt-agreement-preview');
              if (!el) return;
              const opt = {
                margin: [10, 10, 12, 10],
                filename: `${(agreement.code || 'Provider_Agreement').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak: { mode: ['css', 'avoid-all'] },
              };
              await html2pdf().set(opt).from(el).save();
            } catch (err) {
              console.error('PDF export failed:', err);
              toast.err('PDF export failed.');
            }
          }}
        >
          <Download size={14} /> Download PDF
        </button>
        <button className="wt-btn" onClick={() => window.print()}>
          <Printer size={14} /> Print
        </button>
        {agreement.status === 'Completed' && (
          <button
            className="wt-btn primary"
            onClick={() => nav(`${base}/agreements/provider/new?provider=${provider.code}&supersedes=${agreement.id}`)}
          >
            <RefreshCw size={14} /> Amend or renew
          </button>
        )}
      </WtHead>
      <div className="wt-statusstrip">
        <Pill value={agreement.status} />
        <span className="wt-pill slate">v{agreement.version_no}</span>
        <span>
          {dateFmt(agreement.effective_date)} → {dateFmt(agreement.expiry_date)}
        </span>
        <span>{Number(agreement.commission_pct || 0)}% commission</span>
        <span>{rates.length} agreed rates</span>
      </div>
      <div className="wt-detail-grid">
        <aside>
          <div className="wt-card" style={{ padding: 18 }}>
            <h3 className="wt-section-title">Commercial terms</h3>
            <Profile
              rows={[
                ['Provider', provider?.business_name],
                ['Term', `${agreement.term_months} months`],
                ['Notice', `${agreement.notice_days} days`],
                ['Payment model', agreement.payment_model],
                ['Payout trigger', agreement.payout_trigger],
                ['Payment due', `${agreement.payment_due_days} days`],
              ]}
            />
          </div>
          <div className="wt-card" style={{ padding: 18, marginTop: 12 }}>
            <h3 className="wt-section-title">Signature progress</h3>
            {(envelope?.signers || [])
              .sort((a, b) => a.signer_order - b.signer_order)
              .map((signer) => (
                <div className="wt-signer" key={signer.id}>
                  <span className={signer.status === 'signed' ? 'ok' : ''}>
                    {signer.status === 'signed' ? <Check size={12} /> : signer.signer_order}
                  </span>
                  <div>
                    <strong>{signer.name}</strong>
                    <small>
                      {signer.role.replace(/_/g, ' ')} · {signer.status}
                    </small>
                  </div>
                  {signer.access_token && signer.status !== 'signed' && (
                    <button
                      className="wt-btn sm"
                      onClick={() =>
                        navigator.clipboard
                          .writeText(`${window.location.origin}/admin/sign/${signer.access_token}`)
                          .then(() => toast.ok('Signing link copied'))
                      }
                    >
                      <Copy size={12} />
                    </button>
                  )}
                </div>
              ))}
          </div>
        </aside>
        <main>
          <div className="wt-card" style={{ padding: 18 }}>
            <h3 className="wt-section-title">Executed document</h3>
            <div className="wt-agreement-preview" dangerouslySetInnerHTML={{ __html: data.html }} />
          </div>
        </main>
      </div>
    </>
  );
}

function Metric({ icon: Icon, label, value, sub, tone }) {
  return (
    <div className="wt-card wt-kpi">
      <span className="wt-kpi-ic">
        <Icon />
      </span>
      <div>
        <div className="wt-kpi-label">{label}</div>
        <div className="wt-kpi-value" style={{ color: tone }}>
          {value}
        </div>
        <div className="wt-kpi-sub">{sub}</div>
      </div>
    </div>
  );
}

function Profile({ rows }) {
  return (
    <div className="wt-profile">
      {rows.map(([key, value]) => (
        <div className="f" key={key}>
          <div className="k">{key}</div>
          <div className="v">{value || '—'}</div>
        </div>
      ))}
    </div>
  );
}
