// admin-portal/src/screens/sales/SalesAgreementScreen.jsx
//
// Parametric builder for the residential sales service agreements (RPPS/RPSS).
// kind = 'purchase' | 'sale'. Drives /api/sales-agreements/:kind (meta / catalog
// / preview / agreements) and the existing eSign flow. The Schedule A scope and
// Schedule D checklist taxonomies come from the server (meta) so the ticked
// boxes on the signed document match exactly.
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Plus, Copy, Eye, Send, Pencil, FileText, Download,
  ArrowLeft, Maximize2, Save, ExternalLink, X, RefreshCw, ShieldCheck, Check,
  FileSignature
} from 'lucide-react';
import api from '../../services/api';
import { Spinner } from '../../ui/kit';
import { Combo } from '../../ui/pickers';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import AgreementRegisterView from '../agreements/AgreementRegisterView';

const bdt = (v) => '৳' + Number(v || 0).toLocaleString('en-BD');
const sel = { border: '1px solid var(--line)', borderRadius: 10, padding: '9px 12px', background: 'var(--surface)', font: 'inherit', color: 'var(--ink)', width: '100%' };
const lbl = { fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 };

const KIND_META = {
  purchase: {
    party: 'Buyer',
    partyPlural: 'Buyers',
    title: 'Purchase Agreements',
    newTitle: 'New Property Purchase Service Agreement',
    base: '/sales-agreements/purchase',
    docCode: 'SSPC-RPPS-01 (v0.2)',
    agencyRole: "Buyer's Acquisition Agency",
    subtitle: 'Residential Property Purchase Service Agreement',
    summaryTitle: 'Property Purchase Summary',
    summarySubtitle: 'Official reference tracking codes, search criteria, budget parameters, and acquisition timeline',
    feeLabel: 'Professional Success Fee / Commission (Schedule C)',
  },
  sale: {
    party: 'Seller',
    partyPlural: 'Sellers',
    title: 'Sale Agreements',
    newTitle: 'New Property Sale Service Agreement',
    base: '/sales-agreements/sale',
    docCode: 'SSPC-RPSS-01 (v0.2)',
    agencyRole: 'Listing Agency & Broker',
    subtitle: 'Residential Property Sale Service Agreement',
    summaryTitle: 'Property Sale Summary',
    summarySubtitle: 'Official reference tracking codes, property selection, target pricing, and timeframe',
    feeLabel: 'Professional Sales Commission (Schedule C)',
  },
};

function safeJson(val) {
  if (!val) return {};
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return {}; }
}

const emptyState = () => ({
  effective_date: new Date().toISOString().slice(0, 10),
  org: {
    name: 'Seventh Sky Residential Property Services',
    address: 'Dhaka, Bangladesh',
    phone: '',
    email: '',
    represented_by: '',
    position: 'Sales & Acquisition Director',
  },
  client_contact_id: '', property_id: '',
  client: { full_name: '', nid: '', property_address: '', phone: '', email: '', rep: '', rep_position: '' },
  // Co-owners / co-buyers who each sign the same agreement (jointly & severally).
  additional_clients: [],
  property_type: '',
  services: [],       // Schedule A — selected service labels (checkboxes)
  checklist: [],      // Schedule D — ticked checklist items
  witnesses: [{ name: '', nid: '', email: '' }, { name: '', nid: '', email: '' }],
  schedule_b: {
    work_order_no: '',
    quotation_no: '',
    engagement_type: 'Non-exclusive',
    target_value: '',
    timeframe: '',
    commencement_date: '',
    special_requirements: '',
    listing_price: '',
    market_value: '',
    min_price: '',
    marketing_date: '',
    settlement_date: '',
    budget_range: '',
    finance_method: '',
    intended_use: '',
    expected_date: '',
    preferred_location: '',
  },
  pricing_input: {
    discount: 0,
    vat_percent: 0,
    third_party_costs: 0,
    admin_charges: 0,
    selected: [],
    commission: { mode: 'percent', percent: '2', amount: '', base_price: '' },
  },
});

export default function SalesAgreementScreen({ kind, category = 'residential' }) {
  const km = KIND_META[kind];
  const toast = useToast();
  const location = useLocation();
  const prefill = useMemo(() => {
    const p = location.state?.prefill || {};
    const sp = new URLSearchParams(location.search);
    const contactId = sp.get('contact_id') || sp.get('contact');
    const clientId = sp.get('client_id') || sp.get('client');
    const name = sp.get('name') || sp.get('full_name');
    const email = sp.get('email');
    const phone = sp.get('phone');
    return {
      ...p,
      ...(contactId ? { client_contact_id: Number(contactId) } : {}),
      ...(clientId ? { client_id: Number(clientId) } : {}),
      ...(name ? { full_name: name } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
    };
  }, [location.state, location.search]);
  const hasPrefill = Boolean(location.state?.prefill || location.search);
  const [mode, setMode] = useState(hasPrefill ? 'build' : 'list');
  const [editEnvelope, setEditEnvelope] = useState(null); // { id, prefill } for editing a draft
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get(`${km.base}/agreements`, { params: { category } }); setList(Array.isArray(r.data) ? r.data : []); }
    finally { setLoading(false); }
  }, [km.base]);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditEnvelope(null); setMode('build'); };

  // Edit a DRAFT in place: reconstruct the builder state from the envelope terms + signers.
  const editDraft = async (a) => {
    try {
      const r = await api.get(`/signing/envelopes/${a.id}`);
      const env = r.data?.data || {};
      const t = safeJson(env.terms);
      const clientSigners = (env.signers || []).filter((s) => s.role === 'client').sort((x, y) => (x.signer_order || 0) - (y.signer_order || 0));
      const client = clientSigners[0] || {};
      const witnesses = (env.signers || []).filter((s) => s.role === 'witness').map((s) => ({ name: s.name || '', nid: s.national_id || '', email: s.email || '' }));
      const seventhSky = (env.signers || []).find((s) => s.role === 'staff_countersign' || s.role === 'org') || {};

      const savedWitnesses = Array.isArray(t.witnesses) && t.witnesses.length ? t.witnesses : null;
      const witnessList = savedWitnesses || (witnesses.length ? witnesses : [{ name: '', nid: '', email: '' }, { name: '', nid: '', email: '' }]);

      const pf = {
        effective_date: t.effective_date || env.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        property_id: t.property_id || env.related_id || '',
        property_type: t.property_type || '',
        client: {
          full_name: t.client?.full_name || client.name || '',
          email: t.client?.email || client.email || '',
          phone: t.client?.phone || client.phone || '',
          nid: t.client?.nid || '',
          property_address: t.client?.property_address || '',
          rep: t.client?.rep || '',
          rep_position: t.client?.rep_position || '',
        },
        client_contact_id: t.client_contact_id || client.contact_id || '',
        additional_clients: (t.additional_clients && t.additional_clients.length)
          ? t.additional_clients
          : clientSigners.slice(1).map((s) => ({ full_name: s.name || '', email: s.email || '', phone: s.phone || '', nid: '', contact_id: s.contact_id || '' })),
        services: t.services || t.selected_services || [],
        checklist: t.checklist || [],
        witnesses: witnessList,
        org: {
          name: t.org?.name || 'Seventh Sky Residential Property Services',
          represented_by: t.org?.represented_by || seventhSky.name || '',
          position: t.org?.position || '',
          email: t.org?.email || seventhSky.email || '',
          phone: t.org?.phone || '',
        },
        schedule_b: t.schedule_b || {},
        pricing_input: t.pricing_input || {
          selected: (t.agreed_lines || []).map((l) => ({ code: l.code, agreed_price: l.agreed_price })),
          commission: {
            mode: t.commission_mode || 'percent',
            percent: t.commission_percent || '',
            amount: t.commission_mode === 'fixed' ? t.commission : '',
            base_price: t.pricing_summary?.commission_base || '',
          },
          discount: t.pricing_summary?.discount || 0,
          vat_percent: t.pricing_summary?.vat_percent || 0,
          third_party_costs: t.pricing_summary?.third_party_costs || 0,
          admin_charges: t.pricing_summary?.admin_charges || 0,
        },
      };
      setEditEnvelope({ id: a.id, prefill: pf });
      setMode('build');
    } catch { toast.error('Could not load the draft'); }
  };

  const sendDraft = async (a) => {
    try { await api.post(`${km.base}/agreements/${a.id}/send`, undefined, { params: { category } }); toast.success('Agreement sent for signature'); load(); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not send'); }
  };
  const reissue = async (a) => {
    try {
      const r = await api.post(`/sales-agreements/contracts/${a.id}/variation`, undefined, { params: { category } });
      toast.success('Original voided — edit and reissue');
      setEditEnvelope(null);
      // reopen builder prefilled from the variation payload
      window.history.replaceState({ prefill: r.data.prefill }, '');
      setMode('build');
      setBuilderPrefill(r.data.prefill);
    } catch (e) { toast.error(e.response?.data?.error || 'Could not start reissue'); }
  };
  const [builderPrefill, setBuilderPrefill] = useState(null);

  const docCode = category === 'commercial'
    ? (kind === 'purchase' ? 'SSPC-CPPS-01 (v0.2)' : 'SSPC-CPSS-01 (v0.2)')
    : (kind === 'purchase' ? 'SSPC-RPPS-01 (v0.2)' : 'SSPC-RPSS-01 (v0.2)');

  const tabs = useMemo(() => [
    { key: 'all', label: 'All' },
    { key: 'awaiting', label: 'Awaiting Signature', filterFn: (r) => !r.fully_signed && r.pending_count > 0 && r.status !== 'voided' && r.status !== 'declined' },
    { key: 'draft', label: 'Drafts', filterFn: (r) => r.status === 'draft' },
    { key: 'completed', label: 'Fully Executed', filterFn: (r) => r.fully_signed || r.status === 'completed' || r.status === 'active' },
    { key: 'declined', label: 'Declined / Voided', filterFn: (r) => r.status === 'declined' || r.status === 'voided' || r.declined_count > 0 },
  ], []);

  const modalTitle = editEnvelope
    ? `Edit Draft #${editEnvelope.id} — ${category === 'commercial' ? 'Commercial' : 'Residential'} ${km.party === 'Buyer' ? 'Purchase' : 'Sale'} Agreement`
    : `New ${category === 'commercial' ? 'Commercial' : 'Residential'} ${km.party === 'Buyer' ? 'Purchase' : 'Sale'} Agreement`;

  return (
    <AgreementRegisterView
      title={km.title}
      subtitle={`${category === 'commercial' ? 'Commercial' : 'Residential'} Property ${km.party === 'Buyer' ? 'Purchase' : 'Sale'} Service Agreements — build, price and send to the ${km.party.toLowerCase()} for legal e-signature.`}
      docCode={docCode}
      accent={category === 'commercial' ? '#0284c7' : '#2563eb'}
      accentSoft={category === 'commercial' ? 'rgba(2, 132, 199, 0.12)' : 'rgba(37, 99, 235, 0.12)'}
      partyLabel={km.party}
      newButtonLabel={`New ${km.party.toLowerCase()} agreement`}
      tabs={tabs}
      rows={list}
      loading={loading}
      onRefresh={load}
      onNew={openNew}
      onEditDraft={editDraft}
      onSendDraft={sendDraft}
      onReissue={reissue}
      toast={toast}
      showBuilderModal={mode === 'build'}
      builderModalTitle={modalTitle}
      onCloseBuilderModal={() => { setMode('list'); setEditEnvelope(null); setBuilderPrefill(null); }}
      renderBuilder={() => (
        <Builder
          kind={kind}
          category={category}
          prefill={builderPrefill || editEnvelope?.prefill || prefill}
          editId={editEnvelope?.id || null}
          isModal
          onDone={() => { setMode('list'); setEditEnvelope(null); setBuilderPrefill(null); load(); }}
          onCancel={() => { setMode('list'); setEditEnvelope(null); setBuilderPrefill(null); }}
        />
      )}
    />
  );
}

function Builder({ kind, category = 'residential', prefill, editId, onDone, onCancel, isModal = false }) {
  const km = KIND_META[kind];
  const toast = useToast();
  const { user } = useAuth();
  const draftStorageKey = `sspc_${kind}_draft_${editId || 'new'}`;

  const [activeSection, setActiveSection] = useState('all');
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [autoDraftTime, setAutoDraftTime] = useState(null);

  const previewRef = useRef(null);
  const previewScroll = useRef(0);

  const [meta, setMeta] = useState({ schedule_a: [], schedule_d: [], commission_label: '', work_order_no: '', quotation_no: '', org: {} });
  const [catalog, setCatalog] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);

  const [d, setD] = useState(() => {
    const base = emptyState();
    if (prefill && Object.keys(prefill).length > 0) {
      return {
        ...base,
        client_contact_id: prefill.client_contact_id || prefill.contact_id || base.client_contact_id,
        property_id: prefill.property_id || base.property_id,
        property_type: prefill.property_type || base.property_type,
        org: { ...base.org, ...(prefill.org || {}) },
        client: {
          ...base.client,
          ...(prefill.client || {}),
          full_name: prefill.client?.full_name || prefill.full_name || prefill.name || base.client.full_name,
          email: prefill.client?.email || prefill.email || base.client.email,
          phone: prefill.client?.phone || prefill.phone || prefill.primary_phone || base.client.phone,
          nid: prefill.client?.nid || prefill.nid || prefill.national_id || base.client.nid,
          property_address: prefill.client?.property_address || prefill.property_address || prefill.address || base.client.property_address,
          rep: prefill.client?.rep || base.client.rep,
          rep_position: prefill.client?.rep_position || base.client.rep_position,
        },
        additional_clients: prefill.additional_clients || base.additional_clients,
        services: prefill.services || base.services,
        checklist: prefill.checklist || base.checklist,
        witnesses: prefill.witnesses || base.witnesses,
        schedule_b: { ...base.schedule_b, ...(prefill.schedule_b || {}), special_requirements: [(prefill.schedule_b || {}).special_requirements, prefill.supersedes ? `Variation of ${prefill.supersedes}` : ''].filter(Boolean).join(' — ') },
        pricing_input: { ...base.pricing_input, ...(prefill.pricing_input || {}), selected: (prefill.pricing_input || {}).selected || [], commission: { ...base.pricing_input.commission, ...((prefill.pricing_input || {}).commission || {}) } },
      };
    }
    // Check localStorage auto-draft if new agreement
    if (!editId) {
      try {
        const saved = localStorage.getItem(`sspc_${kind}_draft_new`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.d) return parsed.d;
        }
      } catch {}
    }
    return base;
  });

  // Restore saved timestamp
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.savedAt) {
          const dt = new Date(parsed.savedAt);
          setAutoDraftTime(dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      }
    } catch {}
  }, [draftStorageKey]);

  // Load catalog & meta
  useEffect(() => {
    api.get(`${km.base}/catalog`, { params: { category } }).then((r) => setCatalog(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get(`${km.base}/meta`, { params: { category } }).then((r) => {
      const m = r.data || {};
      const defs = m.defaults || {};
      setMeta(m);
      setD((prev) => ({
        ...prev,
        schedule_b: {
          ...prev.schedule_b,
          work_order_no: prev.schedule_b.work_order_no || m.work_order_no || defs.work_order_no || '',
          quotation_no: prev.schedule_b.quotation_no || m.quotation_no || defs.quotation_no || '',
        },
        org: {
          ...prev.org,
          represented_by: prev.org.represented_by || m.org?.represented_by || defs.org?.represented_by || user?.name || user?.full_name || '',
          position: prev.org.position || m.org?.position || defs.org?.position || 'Sales & Acquisition Director',
          email: prev.org.email || m.org?.email || defs.org?.email || user?.email || '',
          phone: prev.org.phone || m.org?.phone || defs.org?.phone || user?.phone || '',
        },
      }));
    }).catch(() => {});
  }, [km.base, user]);

  // Client contact lookup
  useEffect(() => {
    if (d.client_contact_id && (!d.client.full_name || !d.client.email)) {
      api.get(`/contacts/${d.client_contact_id}`).then(({ data }) => {
        const c = data?.data || data;
        if (c) setD((p) => ({ ...p, client: { ...p.client, full_name: p.client.full_name || c.full_name || '', email: p.client.email || c.email || '', phone: p.client.phone || c.primary_phone || '', nid: p.client.nid || c.national_id || c.passport_no || '', property_address: p.client.property_address || c.address_line1 || c.area || '' } }));
      }).catch(() => {});
    }
  }, [d.client_contact_id]);

  const set = (path, value) => setD((prev) => {
    const next = structuredClone(prev); let o = next; const ks = path.split('.');
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = value; return next;
  });

  const selCodes = useMemo(() => new Set(d.pricing_input.selected.map((s) => s.code)), [d.pricing_input.selected]);
  const toggleLine = (code) => setD((prev) => {
    const next = structuredClone(prev); const arr = next.pricing_input.selected;
    const i = arr.findIndex((s) => s.code === code);
    if (i >= 0) arr.splice(i, 1); else arr.push({ code, agreed_price: '' });
    return next;
  });
  const setAgreed = (code, v) => setD((prev) => { const next = structuredClone(prev); const row = next.pricing_input.selected.find((s) => s.code === code); if (row) row.agreed_price = v; return next; });

  const svcSet = useMemo(() => new Set(d.services), [d.services]);
  const toggleService = (label) => setD((prev) => {
    const has = prev.services.includes(label);
    return { ...prev, services: has ? prev.services.filter((s) => s !== label) : [...prev.services, label] };
  });

  const chkSet = useMemo(() => new Set(d.checklist), [d.checklist]);
  const toggleCheck = (label) => setD((prev) => {
    const has = prev.checklist.includes(label);
    return { ...prev, checklist: has ? prev.checklist.filter((s) => s !== label) : [...prev.checklist, label] };
  });

  const setWitness = (i, key, v) => setD((prev) => { const next = structuredClone(prev); next.witnesses[i][key] = v; return next; });

  const addParty = () => setD((prev) => ({ ...prev, additional_clients: [...(prev.additional_clients || []), { full_name: '', nid: '', phone: '', email: '', contact_id: '' }] }));
  const removeParty = (i) => setD((prev) => ({ ...prev, additional_clients: (prev.additional_clients || []).filter((_, idx) => idx !== i) }));
  const setParty = (i, key, v) => setD((prev) => { const next = structuredClone(prev); next.additional_clients[i][key] = v; return next; });
  const onPartyContact = (i, id, row) => setD((prev) => { const next = structuredClone(prev); next.additional_clients[i].contact_id = id || ''; if (row) { next.additional_clients[i].full_name = row.full_name || ''; next.additional_clients[i].phone = row.primary_phone || ''; next.additional_clients[i].email = row.email || ''; next.additional_clients[i].nid = row.national_id || row.passport_no || ''; } return next; });

  const allParties = () => [
    { ...d.client, contact_id: d.client_contact_id || null },
    ...((d.additional_clients || []).filter((p) => (p.full_name || '').trim())),
  ];

  // Debounced auto-save to localStorage
  useEffect(() => {
    if (!d) return undefined;
    const timer = setTimeout(() => {
      try {
        const now = new Date();
        localStorage.setItem(draftStorageKey, JSON.stringify({ d, savedAt: now.toISOString() }));
        setAutoDraftTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch (e) {
        console.warn('Auto-draft save failed:', e);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [d, draftStorageKey]);

  const clearAutoDraft = () => {
    try {
      localStorage.removeItem(draftStorageKey);
    } catch {}
    setAutoDraftTime(null);
    const base = emptyState();
    if (user) {
      base.org.represented_by = user.name || user.full_name || '';
      base.org.email = user.email || '';
      base.org.phone = user.phone || '';
    }
    setD(base);
    toast.success('Auto-draft cleared');
  };

  const refreshPreview = useCallback(async () => {
    try {
      previewScroll.current = previewRef.current?.contentWindow?.scrollY || previewScroll.current;
    } catch { /* cross-origin guard */ }
    setPreviewing(true);
    try {
      const parties = [
        { ...d.client, contact_id: d.client_contact_id || null },
        ...((d.additional_clients || []).filter((p) => (p.full_name || '').trim()))
      ];
      const r = await api.post(`${km.base}/preview`, { ...d, clients: parties }, { params: { category } }).catch(() => null);
      if (r?.data) { setPreview(r.data); setPreviewError(false); }
      else setPreviewError(true);
    } catch (e) {
      console.error(e);
      setPreviewError(true);
    } finally {
      setPreviewing(false);
    }
  }, [d, km.base]);

  // The first preview fires immediately so the window paints the document as soon
  // as it opens; later edits stay debounced (400ms) to avoid a render per keystroke.
  const firstPreviewRun = useRef(true);
  useEffect(() => {
    if (!d) return undefined;
    if (firstPreviewRun.current) {
      firstPreviewRun.current = false;
      refreshPreview();
      return undefined;
    }
    const t = setTimeout(() => refreshPreview(), 400);
    return () => clearTimeout(t);
  }, [d, refreshPreview]);

  const generateNewWo = () => {
    const rnd = Math.floor(100000 + Math.random() * 900000);
    set('schedule_b.work_order_no', `SSPC-WO-${rnd}`);
  };
  const generateNewQt = () => {
    const rnd = Math.floor(100000 + Math.random() * 900000);
    set('schedule_b.quotation_no', `SSPC-QT-${rnd}`);
  };

  const onClient = (id, row) => {
    set('client_contact_id', id);
    if (row) setD((p) => ({ ...p, client: { ...p.client, full_name: row.full_name || '', phone: row.primary_phone || '', email: row.email || '', nid: row.national_id || row.passport_no || '', property_address: row.address_line1 || p.client.property_address } }));
  };

  const onProperty = async (id, row) => {
    set('property_id', id);
    if (row) {
      setD((p) => ({
        ...p,
        property_type: row.property_type || p.property_type,
        client: { ...p.client, property_address: row.address || row.title || p.client.property_address },
        schedule_b: {
          ...p.schedule_b,
          preferred_location: p.schedule_b.preferred_location || row.area || row.address || '',
        },
      }));
    }
    if (id) {
      try {
        const res = await api.get(`${km.base}/property-defaults/${id}`, { params: { category } });
        if (res.data) {
          setD((p) => ({
            ...p,
            property_type: res.data.property_type || p.property_type,
            client: {
              ...p.client,
              property_address: p.client.property_address || res.data.property_address || '',
            },
            schedule_b: {
              ...p.schedule_b,
              work_order_no: p.schedule_b.work_order_no || res.data.work_order_no || '',
              quotation_no: p.schedule_b.quotation_no || res.data.quotation_no || '',
              target_value: p.schedule_b.target_value || res.data.target_value || '',
              preferred_location: p.schedule_b.preferred_location || res.data.preferred_location || res.data.property_address || '',
              budget_range: p.schedule_b.budget_range || res.data.budget_range || '',
            },
            pricing_input: {
              ...p.pricing_input,
              commission: {
                ...p.pricing_input.commission,
                base_price: p.pricing_input.commission.base_price || res.data.base_price || '',
              },
            },
          }));
        }
      } catch {}
    }
  };

  const submit = async (asDraft) => {
    if (!d.client.full_name) { toast.error(`Enter the ${km.party.toLowerCase()} name (Section 1)`); setActiveSection('parties'); return; }
    const parties = allParties();
    if (!asDraft && parties.some((p) => !p.email)) { toast.error(`Every ${km.party.toLowerCase()} needs an email to send (Section 1)`); setActiveSection('parties'); return; }
    const payload = { ...d, clients: parties };
    setBusy(true);
    try {
      if (editId) {
        await api.put(`${km.base}/agreements/${editId}`, payload, { params: { category } });
        if (!asDraft) await api.post(`${km.base}/agreements/${editId}/send`, undefined, { params: { category } });
        try { localStorage.removeItem(draftStorageKey); } catch {}
        toast.success(asDraft ? 'Draft updated' : 'Agreement sent for signature');
        onDone();
      } else {
        const r = await api.post(`${km.base}/agreements`, { ...payload, save_as_draft: asDraft }, { params: { category } });
        try { localStorage.removeItem(draftStorageKey); } catch {}
        if (asDraft) { toast.success('Draft saved'); onDone(); }
        else { setSent(r.data); toast.success(`Agreement sent to the ${km.party.toLowerCase()} for signature`); }
      }
    } catch (err) { toast.error(err.response?.data?.error || 'Could not save'); } finally { setBusy(false); }
  };

  if (sent) {
    const url = `${window.location.origin}${sent.signing_path}`;
    return (
      <div className="pm-scope"><div className="pm-head"><div><div className="pm-eyebrow">Contracts</div><h1>Agreement sent</h1></div></div>
        <div className="pm-card" style={{ maxWidth: 640 }}><div className="pm-card-body" style={{ padding: 24 }}>
          <div className="pm-chip good" style={{ marginBottom: 12 }}><span className="d" />{sent.envelope_code} · sent for signature</div>
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>The {km.party.toLowerCase()} signs first; Seventh Sky then countersigns and any witnesses attest. The {km.party.toLowerCase()}'s link:</p>
          <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
            <input readOnly value={url} style={{ ...sel, fontSize: 12.5 }} />
            <button className="pm-btn" onClick={() => { navigator.clipboard.writeText(url).then(() => toast.success('Copied')); }}><Copy size={14} /></button>
            <a className="pm-btn primary" href={url} target="_blank" rel="noopener" style={{ textDecoration: 'none' }}><Eye size={14} /> Open</a>
          </div>
          <button className="pm-btn" style={{ marginTop: 12 }} onClick={onDone}>Back to agreements</button>
        </div></div>
      </div>
    );
  }

  const SECTIONS = [
    { id: 'all', label: 'All Sections' },
    { id: 'parties', label: `1. Parties — ${km.party} & Property` },
    { id: 'property', label: kind === 'purchase' ? '2. Schedule B — Acquisition Terms' : '2. Schedule B — Commercial Terms' },
    { id: 'services', label: '3. Schedule A — Scope' },
    { id: 'pricing', label: '4. Schedule C — Pricing' },
    { id: 'checklist', label: '5. Schedule D — Checklist & Signers' },
  ];

  const calcCommission = () => {
    if (d.pricing_input.commission.mode === 'percent') {
      const base = Number(d.pricing_input.commission.base_price || 0);
      const pct = Number(d.pricing_input.commission.percent || 0);
      return Math.round((base * pct) / 100);
    }
    return Number(d.pricing_input.commission.amount || 0);
  };

  const render7thSkyRepCard = () => (
    <div className="pm-card" style={{ border: '1.5px solid #2563eb35', background: '#f8faff', boxShadow: '0 2px 10px rgba(37,99,235,0.05)' }}>
      <div className="pm-card-h" style={{ borderBottom: '1px solid #dbeafe', background: '#eff6ff' }}>
        <div className="ic" style={{ background: '#2563eb', color: '#fff' }}><ShieldCheck size={16} /></div>
        <div>
          <h3 style={{ color: '#1e40af' }}>7th Sky Representative ({km.agencyRole || (kind === 'sale' ? 'Listing Agency' : 'Acquisition Agency')})</h3>
          <div className="hsub">{kind === 'purchase' ? "Authorized buyer's acquisition representative, official contact details, and countersigning officer" : "Authorized listing representative, official contact details, and countersigning officer"}</div>
        </div>
      </div>
      <div className="pm-card-body" style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={lbl}>7th Sky Representative Name *</label>
            <input style={sel} value={d.org?.represented_by || ''} onChange={(e) => set('org.represented_by', e.target.value)} placeholder="e.g. Sales Director / Managing Representative" />
          </div>
          <div>
            <label style={lbl}>Position / Designation *</label>
            <input style={sel} value={d.org?.position || ''} onChange={(e) => set('org.position', e.target.value)} placeholder="e.g. Sales & Acquisition Director" />
          </div>
          <div>
            <label style={lbl}>Official Signing Email *</label>
            <input style={sel} type="email" value={d.org?.email || ''} onChange={(e) => set('org.email', e.target.value)} placeholder="e.g. sales@seventhskyproperty.com" />
          </div>
          <div>
            <label style={lbl}>Official Phone No *</label>
            <input style={sel} value={d.org?.phone || ''} onChange={(e) => set('org.phone', e.target.value)} placeholder="e.g. +880 1819-000000" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>Company / Agency Name</label>
            <input style={sel} value={d.org?.name || ''} onChange={(e) => set('org.name', e.target.value)} placeholder="Seventh Sky Residential Property Services" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pm-scope">
      {/* ── Top Pinned Action Bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--line)',
        padding: '12px 20px',
        marginBottom: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="pm-btn" onClick={onCancel} style={{ padding: '6px 12px' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--navy)' }}>
                {editId ? 'Edit Draft Agreement' : (category === 'commercial' ? (kind === 'sale' ? 'New Commercial Property Sale Agreement' : 'New Commercial Property Purchase Agreement') : km.newTitle)}
              </h2>
              <span style={{ fontSize: 11.5, background: 'var(--blue-weak)', color: 'var(--blue-strong)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                {category === 'commercial' ? (kind === 'sale' ? 'SSPC-CPSS-01 (v0.2)' : 'SSPC-CPPS-01 (v0.2)') : `${km.docCode} (v0.2)`}
              </span>
              <span style={{ fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 5, color: '#16a34a', fontWeight: 600 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} /> Live Sync Active
              </span>
              {autoDraftTime && (
                <span style={{ fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 5, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                  ● Auto-draft saved ({autoDraftTime})
                  <button type="button" onClick={clearAutoDraft} title="Clear saved auto-draft" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0284c7', padding: '0 2px', fontSize: 11, textDecoration: 'underline' }}>Clear</button>
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {category === 'commercial' ? (kind === 'sale' ? 'Commercial Property Sale Service Agreement' : 'Commercial Property Purchase Service Agreement') : (kind === 'sale' ? 'Residential Property Sale Service Agreement' : 'Residential Property Purchase Service Agreement')} · Live 2-Column Editor
              {d.client.full_name ? ` · ${km.party}: ${d.client.full_name}` : ''}
              {d.client.property_address ? ` · Property: ${d.client.property_address}` : ''}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="pm-btn" onClick={() => refreshPreview()} disabled={previewing} title="Force reload preview">
            <RefreshCw size={14} className={previewing ? 'pm-spin' : ''} /> Refresh preview
          </button>
          <button className="pm-btn" onClick={() => setShowFullPreview(true)}>
            <Maximize2 size={14} /> Full preview
          </button>
          <button className="pm-btn" disabled={busy} onClick={() => submit(true)}>
            <Save size={14} /> {busy ? 'Saving…' : (editId ? 'Update draft' : 'Save as draft')}
          </button>
          <button className="pm-btn primary" disabled={busy} onClick={() => submit(false)}>
            <Send size={14} /> {busy ? 'Sending…' : (editId ? 'Send for signature' : `Send to ${km.party.toLowerCase()} for signature`)}
          </button>
          {isModal && (
            <button type="button" className="pm-btn" onClick={onCancel} title="Close window">
              <X size={14} /> Close
            </button>
          )}
        </div>
      </div>

      {/* ── Side-by-Side Responsive Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(480px, 1.15fr) minmax(460px, 1fr)', gap: 20, alignItems: 'start' }}>

        {/* Left Column: Form Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Quick Jump Bar */}
          <div className="pm-segment" style={{ flexWrap: 'wrap', width: '100%', marginBottom: 4 }}>
            {SECTIONS.map((sec) => (
              <button
                key={sec.id}
                className={activeSection === sec.id ? 'on' : ''}
                onClick={() => setActiveSection(sec.id)}
              >
                {sec.label}
              </button>
            ))}
          </div>

          {/* 1. Parties */}
          {(activeSection === 'all' || activeSection === 'parties') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="pm-card">
                <div className="pm-card-h">
                  <div className="ic"><FileSignature size={16} /></div>
                  <div>
                    <h3>1. Parties — {km.party} &amp; Property</h3>
                    <div className="hsub">Primary client, property binding, contact selection, and co-signers</div>
                  </div>
                </div>
                <div className="pm-card-body" style={{ padding: '0 18px 18px' }}>
                  <div style={{ display: 'grid', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        <label style={lbl}>{km.party} — Pick existing contact</label>
                        <Combo endpoint="/contacts" labelFn={(c) => `${c.full_name}${c.primary_phone ? ' · ' + c.primary_phone : ''}`} value={d.client_contact_id ? Number(d.client_contact_id) : ''} onChange={onClient} placeholder="Search a contact…" />
                      </div>
                      <div>
                        <label style={lbl}>{kind === 'purchase' ? 'Target / Shortlisted property (optional)' : 'Bound property — pick listing property'}</label>
                        <Combo endpoint={`/properties?category=${category}`} labelFn={(p) => `${p.property_code || ''} · ${p.title || p.address || ''}`} value={d.property_id ? Number(d.property_id) : ''} onChange={onProperty} placeholder={kind === 'purchase' ? 'Search shortlisted property (optional)…' : 'Search listing property…'} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        <label style={lbl}>Effective date</label>
                        <input type="date" style={sel} value={d.effective_date} onChange={(e) => set('effective_date', e.target.value)} />
                      </div>
                      <div>
                        <label style={lbl}>{kind === 'purchase' ? 'Preferred property type *' : 'Property type'}</label>
                        <input style={sel} value={d.property_type || ''} onChange={(e) => set('property_type', e.target.value)} placeholder={category === 'commercial' ? 'e.g. Commercial Office Space / Retail Showroom / Warehouse' : 'e.g. 3-4 BHK Apartment / Luxury Penthouse / Duplex'} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div><label style={lbl}>{km.party} full name *</label><input style={sel} value={d.client.full_name} onChange={(e) => set('client.full_name', e.target.value)} placeholder="Full legal name" /></div>
                      <div><label style={lbl}>{km.party} email *</label><input type="email" style={sel} value={d.client.email} onChange={(e) => set('client.email', e.target.value)} placeholder="email@example.com" /></div>
                      <div><label style={lbl}>Phone</label><input style={sel} value={d.client.phone} onChange={(e) => set('client.phone', e.target.value)} placeholder="017xxxxxxxx" /></div>
                      <div><label style={lbl}>NID / Passport</label><input style={sel} value={d.client.nid} onChange={(e) => set('client.nid', e.target.value)} placeholder="National ID or Passport no" /></div>
                      <div><label style={lbl}>Authorised representative (if applicable)</label><input style={sel} value={d.client.rep} onChange={(e) => set('client.rep', e.target.value)} placeholder="Attorney or legal representative" /></div>
                      <div><label style={lbl}>Representative position / relationship</label><input style={sel} value={d.client.rep_position} onChange={(e) => set('client.rep_position', e.target.value)} placeholder="e.g. Attorney-in-fact / Director / Spouse" /></div>
                      <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Current residential / correspondence address</label><input style={sel} value={d.client.property_address} onChange={(e) => set('client.property_address', e.target.value)} placeholder="Client permanent / registered address" /></div>
                    </div>

                    {/* Additional parties — co-owners (sale) / co-buyers (purchase). Each signs. */}
                    <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 13 }}>Additional {km.party}s (Co-signers)</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Joint signers who will each receive an electronic signature invite</div>
                      </div>
                      <button type="button" className="pm-btn" style={{ padding: '5px 12px', fontSize: 12 }} onClick={addParty}><Plus size={13} /> Add {km.party.toLowerCase()}</button>
                    </div>
                    {(d.additional_clients || []).map((p, i) => (
                      <div key={i} style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr', border: '1px solid var(--line)', borderRadius: 10, padding: 14, background: 'var(--surface-2, #f8fafc)' }}>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: 12.5, color: 'var(--navy)' }}>Co-{km.party} {i + 2}</strong>
                          <button type="button" className="pm-btn" style={{ padding: '3px 9px', fontSize: 12, color: 'var(--bad)' }} onClick={() => removeParty(i)}>Remove</button>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Find contact</label><Combo endpoint="/contacts" labelFn={(c) => `${c.full_name}${c.primary_phone ? ' · ' + c.primary_phone : ''}`} value={p.contact_id ? Number(p.contact_id) : ''} onChange={(id, row) => onPartyContact(i, id, row)} placeholder="Search a contact…" /></div>
                        <div><label style={lbl}>Full name *</label><input style={sel} value={p.full_name} onChange={(e) => setParty(i, 'full_name', e.target.value)} /></div>
                        <div><label style={lbl}>Email *</label><input type="email" style={sel} value={p.email} onChange={(e) => setParty(i, 'email', e.target.value)} /></div>
                        <div><label style={lbl}>Phone</label><input style={sel} value={p.phone} onChange={(e) => setParty(i, 'phone', e.target.value)} /></div>
                        <div><label style={lbl}>NID / Passport</label><input style={sel} value={p.nid} onChange={(e) => setParty(i, 'nid', e.target.value)} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Prominent 7th Sky Representative Card in Section 1 */}
              {render7thSkyRepCard()}
            </div>
          )}

          {/* 2. Schedule B — Commercial & Property Terms / Search Criteria & Acquisition Terms */}
          {(activeSection === 'all' || activeSection === 'property') && (
            <div className="pm-card">
              <div className="pm-card-h">
                <div className="ic"><FileSignature size={16} /></div>
                <div>
                  <h3>2. Schedule B — {kind === 'purchase' ? 'Search Criteria & Acquisition Terms' : 'Commercial & Property Terms'}</h3>
                  <div className="hsub">{kind === 'purchase' ? 'Acquisition parameters, search criteria, budget, and financing structure' : 'Official tracking codes, listing price, target valuation, and marketing covenants'}</div>
                </div>
              </div>
              <div className="pm-card-body" style={{ padding: '0 18px 18px' }}>
                {/* Official Reference Codes */}
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 12.5, color: '#334155', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Official Tracking &amp; Reference Codes</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Auto-generated for audit trail &amp; Schedule B</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={lbl}>Work Order No.</label>
                        <button type="button" onClick={generateNewWo} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>↻ Generate</button>
                      </div>
                      <input style={{ ...sel, fontFamily: 'monospace', fontWeight: 600 }} value={d.schedule_b?.work_order_no || ''} onChange={(e) => set('schedule_b.work_order_no', e.target.value)} placeholder="SSPC-WO-XXXXXX" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={lbl}>Quotation No.</label>
                        <button type="button" onClick={generateNewQt} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>↻ Generate</button>
                      </div>
                      <input style={{ ...sel, fontFamily: 'monospace', fontWeight: 600 }} value={d.schedule_b?.quotation_no || ''} onChange={(e) => set('schedule_b.quotation_no', e.target.value)} placeholder="SSPC-QT-XXXXXX" />
                    </div>
                  </div>
                </div>

                {kind === 'purchase' ? (
                  /* ── Property Purchase Search & Acquisition Criteria (RPPS / CPPS) ── */
                  <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
                    <div>
                      <label style={lbl}>Preferred Property Type *</label>
                      <input style={sel} value={d.property_type || ''} onChange={(e) => set('property_type', e.target.value)} placeholder={category === 'commercial' ? 'e.g. Commercial Office Space / Retail Showroom / Warehouse' : 'e.g. 3-4 BHK Apartment / Luxury Penthouse / Duplex'} />
                    </div>
                    <div>
                      <label style={lbl}>Engagement Type</label>
                      <select style={sel} value={d.schedule_b?.engagement_type || 'Non-exclusive'} onChange={(e) => set('schedule_b.engagement_type', e.target.value)}>
                        <option>Non-exclusive</option>
                        <option>Exclusive Buyer Representation</option>
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Preferred Location(s) / Area(s) *</label>
                      <input style={sel} value={d.schedule_b?.preferred_location || ''} onChange={(e) => set('schedule_b.preferred_location', e.target.value)} placeholder="e.g. Gulshan-2, Banani, Baridhara Diplomatic Zone, Motijheel" />
                    </div>
                    <div>
                      <label style={lbl}>Budget Range (BDT) *</label>
                      <input
                        style={sel}
                        value={d.schedule_b?.budget_range || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          set('schedule_b.budget_range', val);
                          const digits = val.replace(/[^0-9]/g, '');
                          if (digits && !d.pricing_input.commission.base_price) {
                            set('pricing_input.commission.base_price', digits);
                          }
                        }}
                        placeholder="e.g. 25,000,000 - 35,000,000 BDT"
                      />
                    </div>
                    <div>
                      <label style={lbl}>Finance Method</label>
                      <select style={sel} value={d.schedule_b?.finance_method || 'Cash / Self-Funded'} onChange={(e) => set('schedule_b.finance_method', e.target.value)}>
                        <option value="Cash / Self-Funded">Cash / Self-Funded</option>
                        <option value="Bank Home Loan / Mortgage">Bank Home Loan / Mortgage</option>
                        <option value="Developer Installment Plan">Developer Installment Plan</option>
                        <option value="Partial Loan & Cash">Partial Loan &amp; Cash</option>
                        <option value="Other / Mixed">Other / Mixed</option>
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Intended Use</label>
                      <select style={sel} value={d.schedule_b?.intended_use || (category === 'commercial' ? 'Commercial / Office Operations' : 'Owner Occupier')} onChange={(e) => set('schedule_b.intended_use', e.target.value)}>
                        {category === 'commercial' ? (
                          <>
                            <option value="Commercial / Office Operations">Commercial / Office Operations</option>
                            <option value="Retail / Commercial Showroom">Retail / Commercial Showroom</option>
                            <option value="Rental Yield / Commercial Investment">Rental Yield / Commercial Investment</option>
                            <option value="Warehouse / Logistics">Warehouse / Logistics</option>
                            <option value="Mixed Use Development">Mixed Use Development</option>
                          </>
                        ) : (
                          <>
                            <option value="Owner Occupier">Owner Occupier</option>
                            <option value="Rental Investment / High Yield">Rental Investment / High Yield</option>
                            <option value="Capital Appreciation">Capital Appreciation</option>
                            <option value="Vacation / Secondary Home">Vacation / Secondary Home</option>
                            <option value="Commercial / Mixed Use">Commercial / Mixed Use</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Expected Purchase / Closing Date</label>
                      <input type="date" style={sel} value={d.schedule_b?.expected_date || ''} onChange={(e) => set('schedule_b.expected_date', e.target.value)} />
                    </div>
                    <div>
                      <label style={lbl}>Search &amp; Acquisition Timeframe</label>
                      <input style={sel} value={d.schedule_b?.timeframe || ''} onChange={(e) => set('schedule_b.timeframe', e.target.value)} placeholder="e.g. 90 Days / 6 Months" />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={lbl}>Special Requirements &amp; Acquisition Criteria</label>
                      <textarea rows={2} style={{ ...sel, resize: 'vertical' }} value={d.schedule_b?.special_requirements || ''} onChange={(e) => set('schedule_b.special_requirements', e.target.value)} placeholder="e.g. South facing, minimum 2 car parks, reputed developer with RAJUK approval, handover within 6 months" />
                    </div>
                  </div>
                ) : (
                  /* ── Property Sale & Listing Parameters (RPSS / CPSS) ── */
                  <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
                    <div>
                      <label style={lbl}>Property Type</label>
                      <input style={sel} value={d.property_type || ''} onChange={(e) => set('property_type', e.target.value)} placeholder={category === 'commercial' ? 'e.g. Commercial Office / Retail Showroom' : 'e.g. 3BHK Apartment / Penthouse'} />
                    </div>
                    <div>
                      <label style={lbl}>Engagement Type</label>
                      <select style={sel} value={d.schedule_b?.engagement_type || 'Non-exclusive'} onChange={(e) => set('schedule_b.engagement_type', e.target.value)}>
                        <option>Non-exclusive</option>
                        <option>Exclusive</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={lbl}>Subject Property Address *</label>
                      <input style={sel} value={d.client?.property_address || ''} onChange={(e) => set('client.property_address', e.target.value)} placeholder="Full physical address of the subject property" />
                    </div>
                    <div>
                      <label style={lbl}>Estimated Market Value (BDT)</label>
                      <input style={sel} value={d.schedule_b?.market_value || ''} onChange={(e) => set('schedule_b.market_value', e.target.value)} placeholder="e.g. 26,000,000" />
                    </div>
                    <div>
                      <label style={lbl}>Agreed Listing Price (BDT) *</label>
                      <input
                        style={sel}
                        value={d.schedule_b?.listing_price || d.schedule_b?.target_value || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          set('schedule_b.listing_price', val);
                          set('schedule_b.target_value', val);
                          const digits = val.replace(/[^0-9]/g, '');
                          if (digits && !d.pricing_input.commission.base_price) {
                            set('pricing_input.commission.base_price', digits);
                          }
                        }}
                        placeholder="e.g. 25,000,000"
                      />
                    </div>
                    <div>
                      <label style={lbl}>Minimum Acceptable Sale Price (BDT)</label>
                      <input style={sel} value={d.schedule_b?.min_price || ''} onChange={(e) => set('schedule_b.min_price', e.target.value)} placeholder="e.g. 23,500,000" />
                    </div>
                    <div>
                      <label style={lbl}>Marketing Commencement Date</label>
                      <input type="date" style={sel} value={d.schedule_b?.marketing_date || d.schedule_b?.commencement_date || ''} onChange={(e) => { set('schedule_b.marketing_date', e.target.value); set('schedule_b.commencement_date', e.target.value); }} />
                    </div>
                    <div>
                      <label style={lbl}>Expected Settlement Date</label>
                      <input type="date" style={sel} value={d.schedule_b?.settlement_date || ''} onChange={(e) => set('schedule_b.settlement_date', e.target.value)} />
                    </div>
                    <div>
                      <label style={lbl}>Listing Timeframe / Mandate Duration</label>
                      <input style={sel} value={d.schedule_b?.timeframe || ''} onChange={(e) => set('schedule_b.timeframe', e.target.value)} placeholder="e.g. 180 Days / 6 Months" />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={lbl}>Special Instructions &amp; Marketing Conditions</label>
                      <textarea rows={2} style={{ ...sel, resize: 'vertical' }} value={d.schedule_b?.special_requirements || ''} onChange={(e) => set('schedule_b.special_requirements', e.target.value)} placeholder="Any special instructions, reserve price terms, or variation details" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Services */}
          {(activeSection === 'all' || activeSection === 'services') && (
            <div className="pm-card">
              <div className="pm-card-h">
                <div className="ic"><FileSignature size={16} /></div>
                <div>
                  <h3>3. Schedule A — Selected Service Scope</h3>
                  <div className="hsub">Tick every service that forms part of this engagement — ticked items appear as ☑ in Schedule A</div>
                </div>
              </div>
              <div className="pm-card-body" style={{ padding: '0 18px 18px' }}>
                {(meta.schedule_a || []).map(([group, items]) => (
                  <div key={group} style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy)', margin: '8px 0 6px' }}>{group}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px' }}>
                      {items.map((it) => {
                        const isChecked = svcSet.has(it);
                        return (
                          <label
                            key={it}
                            style={{
                              fontSize: 12.5,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 7,
                              cursor: 'pointer',
                              background: isChecked ? 'var(--cyan-weak)' : 'var(--surface-2)',
                              padding: '5px 12px',
                              borderRadius: 8,
                              border: isChecked ? '1px solid var(--primary, #0284c7)' : '1px solid var(--line)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <input type="checkbox" checked={isChecked} onChange={() => toggleService(it)} />
                            <span style={{ fontWeight: isChecked ? 700 : 500, color: isChecked ? 'var(--navy)' : 'inherit' }}>{it}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Pricing & Commission */}
          {(activeSection === 'all' || activeSection === 'pricing') && (
            <div className="pm-card">
              <div className="pm-card-h">
                <div className="ic"><FileSignature size={16} /></div>
                <div>
                  <h3>4. Schedule C — Pricing &amp; Commission Model</h3>
                  <div className="hsub">Select service line items, customize agreed pricing, and configure commission model</div>
                </div>
              </div>
              <div className="pm-card-body" style={{ padding: '0 18px 18px' }}>
                <table className="pm-tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}></th>
                      <th>Code</th>
                      <th>Service</th>
                      <th>Unit</th>
                      <th style={{ textAlign: 'right' }}>Standard</th>
                      <th style={{ textAlign: 'right' }}>Agreed (BDT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.map((c) => {
                      const on = selCodes.has(c.code);
                      const row = d.pricing_input.selected.find((s) => s.code === c.code);
                      const std = c.price_label || (c.price_type === 'from' ? `From ${bdt(c.standard_price)}` : bdt(c.standard_price));
                      return (
                        <tr key={c.code} style={{ opacity: on ? 1 : 0.65 }}>
                          <td><input type="checkbox" checked={on} onChange={() => toggleLine(c.code)} /></td>
                          <td style={{ fontSize: 12 }}>{c.code}</td>
                          <td style={{ fontSize: 12.5 }}>{c.name}</td>
                          <td style={{ fontSize: 12 }}>{c.unit}</td>
                          <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>{std}</td>
                          <td style={{ textAlign: 'right' }}>
                            {on && c.price_type !== 'included' && c.price_type !== 'percent' ? (
                              <input
                                style={{ ...sel, padding: '5px 8px', width: 120, textAlign: 'right' }}
                                type="number"
                                value={row?.agreed_price ?? ''}
                                placeholder={String(c.standard_price)}
                                onChange={(e) => setAgreed(c.code, e.target.value)}
                              />
                            ) : (on ? <span style={{ color: 'var(--muted)' }}>{c.price_label || 'As agreed'}</span> : '')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Commission / Success Fee Box */}
                <div style={{ border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface-2, #f8fafc)', padding: 16, marginTop: 16 }}>
                  <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 13, marginBottom: 12 }}>
                    {km.feeLabel || meta.commission_label || 'Agency Commission / Success Fee'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 12, alignItems: 'end' }}>
                    <div>
                      <label style={lbl}>Fee Type</label>
                      <select style={sel} value={d.pricing_input.commission.mode} onChange={(e) => set('pricing_input.commission.mode', e.target.value)}>
                        <option value="percent">Percent of price (%)</option>
                        <option value="fixed">Fixed amount (BDT)</option>
                      </select>
                    </div>
                    {d.pricing_input.commission.mode === 'percent' ? (
                      <>
                        <div>
                          <label style={lbl}>Commission Rate (%)</label>
                          <input type="number" style={sel} value={d.pricing_input.commission.percent} onChange={(e) => set('pricing_input.commission.percent', e.target.value)} placeholder="e.g. 2" />
                        </div>
                        <div>
                          <label style={lbl}>{kind === 'sale' ? 'Sale / listing price (BDT)' : 'Purchase price / budget base (BDT)'}</label>
                          <input type="number" style={sel} value={d.pricing_input.commission.base_price} onChange={(e) => set('pricing_input.commission.base_price', e.target.value)} placeholder="e.g. 25000000" />
                        </div>
                        <div style={{ padding: '8px 12px', background: '#e0f2fe', borderRadius: 8, color: '#0369a1', fontWeight: 700, fontSize: 13, height: 42, display: 'flex', alignItems: 'center' }}>
                          = {bdt(calcCommission())}
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label style={lbl}>Fixed Fee Amount (BDT)</label>
                          <input type="number" style={sel} value={d.pricing_input.commission.amount} onChange={(e) => set('pricing_input.commission.amount', e.target.value)} placeholder="e.g. 500000" />
                        </div>
                        <div />
                        <div />
                      </>
                    )}
                  </div>

                  {/* Cost adjustments */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginTop: 14 }}>
                    <div><label style={lbl}>Third-party costs (৳)</label><input type="number" style={sel} value={d.pricing_input.third_party_costs} onChange={(e) => set('pricing_input.third_party_costs', Number(e.target.value))} /></div>
                    <div><label style={lbl}>Administrative charges (৳)</label><input type="number" style={sel} value={d.pricing_input.admin_charges} onChange={(e) => set('pricing_input.admin_charges', Number(e.target.value))} /></div>
                    <div><label style={lbl}>Discount (৳)</label><input type="number" style={sel} value={d.pricing_input.discount} onChange={(e) => set('pricing_input.discount', Number(e.target.value))} /></div>
                    <div><label style={lbl}>VAT (%)</label><input type="number" style={sel} value={d.pricing_input.vat_percent} onChange={(e) => set('pricing_input.vat_percent', Number(e.target.value))} /></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                    <button type="button" className="pm-btn" onClick={refreshPreview} disabled={previewing}>
                      <RefreshCw size={13} className={previewing ? 'pm-spin' : ''} /> Recalculate preview
                    </button>
                  </div>
                </div>

                {preview?.pricing?.summary && (
                  <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="pm-card" style={{ background: 'var(--surface-2)' }}>
                      <div className="pm-card-body" style={{ padding: 14 }}>
                        <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 8, color: 'var(--navy)' }}>Cost Summary Breakdown</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}><span style={{ color: 'var(--muted)' }}>Estimated Commission</span><span>{bdt(preview.pricing.summary.commission)}</span></div>
                        {preview.pricing.summary.third_party_costs > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}><span style={{ color: 'var(--muted)' }}>Third-party costs</span><span>{bdt(preview.pricing.summary.third_party_costs)}</span></div>}
                        {preview.pricing.summary.admin_charges > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}><span style={{ color: 'var(--muted)' }}>Admin charges</span><span>{bdt(preview.pricing.summary.admin_charges)}</span></div>}
                        {preview.pricing.summary.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}><span style={{ color: 'var(--muted)' }}>Discount</span><span>-{bdt(preview.pricing.summary.discount)}</span></div>}
                        {preview.pricing.summary.vat > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}><span style={{ color: 'var(--muted)' }}>VAT</span><span>{bdt(preview.pricing.summary.vat)}</span></div>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderTop: '1px solid var(--line)', marginTop: 6, paddingTop: 6 }}>
                          <span>Estimated Total Contract Value</span><span>{bdt(preview.pricing.summary.total_contract_value || preview.pricing.summary.total)}</span>
                        </div>
                      </div>
                    </div>
                    {preview.pricing.payment_schedule && (
                      <div className="pm-card" style={{ background: 'var(--surface-2)' }}>
                        <div className="pm-card-body" style={{ padding: 14 }}>
                          <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 8, color: 'var(--navy)' }}>Payment Milestones</div>
                          {preview.pricing.payment_schedule.map((p, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}>
                              <span style={{ color: 'var(--muted)' }}>{p.stage}</span>
                              <span>{p.amount ? bdt(p.amount) : 'Upon closing'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Checklist & Witnesses */}
          {(activeSection === 'all' || activeSection === 'checklist') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="pm-card">
                <div className="pm-card-h">
                  <div className="ic"><FileSignature size={16} /></div>
                  <div>
                    <h3>5. Schedule D — Readiness Checklist &amp; Witnesses</h3>
                    <div className="hsub">Readiness audit verification, signing counterpart verification, and witness attestations</div>
                  </div>
                </div>
                <div className="pm-card-body" style={{ padding: '0 18px 18px' }}>
                  {(meta.schedule_d || []).length > 0 && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)', marginBottom: 8 }}>{kind === 'purchase' ? 'Schedule D — Property Purchase Checklist' : 'Schedule D — Property Sale Checklist'}</div>
                      {(meta.schedule_d || []).map(([group, items]) => (
                        <div key={group} style={{ marginBottom: 12 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--muted)', margin: '4px 0' }}>{group}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px' }}>
                            {items.map((it) => {
                              const isChecked = chkSet.has(it);
                              return (
                                <label
                                  key={it}
                                  style={{
                                    fontSize: 12.5,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    cursor: 'pointer',
                                    background: isChecked ? 'var(--cyan-weak)' : 'var(--surface-2)',
                                    padding: '4px 10px',
                                    borderRadius: 8,
                                    border: isChecked ? '1px solid var(--primary, #0284c7)' : '1px solid var(--line)',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <input type="checkbox" checked={isChecked} onChange={() => toggleCheck(it)} />
                                  <span style={{ fontWeight: isChecked ? 700 : 500 }}>{it}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ borderTop: (meta.schedule_d || []).length ? '1px solid var(--line)' : 'none', paddingTop: (meta.schedule_d || []).length ? 14 : 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)', marginBottom: 4 }}>Witnesses (Electronic Attestation)</div>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 0, marginBottom: 12 }}>
                      Each witness entered below with an email address will receive an electronic signing link to attest the agreement.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {d.witnesses.map((w, i) => (
                        <div key={i} style={{ display: 'grid', gap: 8, background: 'var(--surface-2, #f8fafc)', padding: 14, borderRadius: 10, border: '1px solid var(--line, #e2e8f0)' }}>
                          <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--ink)' }}>Witness {i + 1}</div>
                          <div>
                            <label style={lbl}>Full name</label>
                            <input style={sel} placeholder="Witness full legal name" value={w.name || ''} onChange={(e) => setWitness(i, 'name', e.target.value)} />
                          </div>
                          <div>
                            <label style={lbl}>Email (to send signing link)</label>
                            <input style={sel} type="email" placeholder="witness@example.com" value={w.email || ''} onChange={(e) => setWitness(i, 'email', e.target.value)} />
                          </div>
                          <div>
                            <label style={lbl}>NID / Passport</label>
                            <input style={sel} placeholder="National ID or Passport" value={w.nid || ''} onChange={(e) => setWitness(i, 'nid', e.target.value)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Duplicate 7th Sky Representative Card in Section 5 so user can review countersigner before sending */}
              {render7thSkyRepCard()}
            </div>
          )}

        </div>

        {/* Right Column: Sticky Live Agreement Preview */}
        <div style={{ position: 'sticky', top: 90, height: 'calc(100vh - 110px)', display: 'flex', flexDirection: 'column' }}>
          <div className="pm-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--pm-sh2)' }}>
            
            {/* Header */}
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--navy)', letterSpacing: '-0.2px' }}>
                  {preview?.title || (kind === 'sale' ? 'Residential Property Sale Service Agreement' : 'Residential Property Purchase Service Agreement')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--good)' }} />
                  Live Preview · Auto-updates as you edit
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {previewing && <Spinner size={14} />}
                <button className="pm-btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setShowFullPreview(true)} disabled={!preview?.html}>
                  <Maximize2 size={13} /> Full preview
                </button>
              </div>
            </div>

            {/* Frame Body */}
            <div style={{ flex: 1, background: '#f1f5f9', padding: 12, overflow: 'hidden' }}>
              {preview?.html ? (
                <iframe
                  ref={previewRef}
                  title="Agreement live preview"
                  srcDoc={preview.html}
                  sandbox="allow-same-origin"
                  onLoad={() => {
                    try {
                      previewRef.current?.contentWindow?.scrollTo(0, previewScroll.current);
                    } catch { /* cross-origin guard */ }
                  }}
                  style={{ width: '100%', height: '100%', border: 0, borderRadius: 8, background: '#ffffff', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
                />
              ) : previewError && !previewing ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--muted)' }}>
                  <span style={{ fontSize: 13 }}>Could not generate the preview.</span>
                  <button type="button" className="pm-btn" onClick={() => refreshPreview()}>
                    <RefreshCw size={13} /> Retry
                  </button>
                </div>
              ) : (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--muted)' }}>
                  <Spinner />
                  <span style={{ fontSize: 13 }}>Generating live document preview…</span>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* In-App Full Document Preview Modal */}
      {showFullPreview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
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
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>
                  Full Document Preview
                </span>
                <span style={{ fontSize: 12, background: 'var(--blue-weak)', color: 'var(--blue-strong)', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                  {km.docCode}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  className="pm-btn"
                  style={{ padding: '5px 12px', fontSize: 12 }}
                  onClick={() => {
                    const w = window.open('', '_blank');
                    if (w) {
                      w.document.write(preview?.html || '');
                      w.document.close();
                    }
                  }}
                >
                  <ExternalLink size={13} /> Open in new window
                </button>
                <button
                  className="pm-btn primary"
                  style={{ padding: '5px 14px', fontSize: 12 }}
                  onClick={() => setShowFullPreview(false)}
                >
                  <X size={14} style={{ marginRight: 4 }} /> Close
                </button>
              </div>
            </div>
            {/* Modal Body */}
            <div style={{ flex: 1, background: '#f8fafc', padding: 16, overflow: 'hidden' }}>
              <iframe
                title="Full agreement document"
                srcDoc={preview?.html || ''}
                sandbox="allow-same-origin"
                style={{ width: '100%', height: '100%', border: '1px solid var(--line)', borderRadius: 8, background: '#ffffff' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
