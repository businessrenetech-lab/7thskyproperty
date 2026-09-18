import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Send, Copy, Eye, RefreshCw, FileSignature, ShieldCheck, ArrowLeft, Maximize2, Save, ExternalLink, X } from 'lucide-react';
import api from './../services/api';
import { Spinner } from '../ui/kit';
import { Combo } from '../ui/pickers';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import AgreementRegisterView from './agreements/AgreementRegisterView';
import AgreementPreviewPane from './agreements/AgreementPreviewPane';

const bdt = (v) => '৳' + Number(v || 0).toLocaleString('en-BD');
const sel = { border: '1px solid var(--line)', borderRadius: 10, padding: '9px 12px', background: 'var(--surface)', font: 'inherit', color: 'var(--ink)', width: '100%' };
const lbl = { fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5 };

const EMPTY = {
  effective_date: new Date().toISOString().slice(0, 10),
  org: { name: 'Seventh Sky Property Care', address: '', phone: '', email: '', represented_by: '', position: '' },
  client_contact_id: '', property_id: '',
  client: { full_name: '', nid: '', current_address: '', phone: '', email: '', rep: '', rep_position: '' },
  property_type: '',
  services: [], checklist: [], witnesses: [{ name: '', nid: '', email: '' }, { name: '', nid: '', email: '' }],
  schedule_b: { property_address: '', max_guests: '', booking_platforms: '', management_package: '', commencement_date: '', reporting_frequency: 'Monthly', special_requirements: '', work_order_no: '', quotation_no: '' },
  pricing_input: { discount: 0, vat_percent: 0, selected: [] },
};

export default function StsAgreements() {
  const toast = useToast();
  const [mode, setMode] = useState('list');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/sts/agreements');
      setList(Array.isArray(r.data) ? r.data : []);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const done = () => { setMode('list'); load(); };
  const openNew = () => { setMode('build'); };

  const tabs = useMemo(() => [
    { key: 'all', label: 'All' },
    { key: 'awaiting', label: 'Awaiting Signature', filterFn: (r) => !r.fully_signed && r.pending_count > 0 && r.status !== 'voided' && r.status !== 'declined' },
    { key: 'draft', label: 'Drafts', filterFn: (r) => r.status === 'draft' },
    { key: 'completed', label: 'Fully Executed', filterFn: (r) => r.fully_signed || r.status === 'completed' || r.status === 'active' },
    { key: 'declined', label: 'Declined / Voided', filterFn: (r) => r.status === 'declined' || r.status === 'voided' || r.declined_count > 0 },
  ], []);

  const modalTitle = 'New Short-Term Rental Management Agreement';

  return (
    <AgreementRegisterView
      title="Short-Term Rental Agreements"
      subtitle="Short-Term Rental Management Service Agreements — build, price and send to owners for e-signature. The agreed fee drives owner disbursements."
      docCode="SSPC-STRMS-01 (v0.2)"
      accent="#0284c7"
      accentSoft="rgba(2, 132, 199, 0.12)"
      partyLabel="Owner"
      newButtonLabel="New owner agreement"
      tabs={tabs}
      rows={list}
      loading={loading}
      onRefresh={load}
      onNew={openNew}
      toast={toast}
      showBuilderModal={mode === 'build'}
      builderModalTitle={modalTitle}
      onCloseBuilderModal={done}
      renderBuilder={() => (
        <Builder
          isModal
          onDone={done}
          onCancel={done}
        />
      )}
    />
  );
}

function Builder({ isModal, onDone, onCancel }) {
  const toast = useToast();
  const { user } = useAuth();
  const draftStorageKey = 'sspc_sts_draft_new';
  const [activeSection, setActiveSection] = useState('all');
  const [autoDraftTime, setAutoDraftTime] = useState(() => {
    try {
      const saved = localStorage.getItem(draftStorageKey);
      if (saved) {
        const p = JSON.parse(saved);
        return p?.savedAt ? new Date(p.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null;
      }
    } catch {}
    return null;
  });

  const [d, setD] = useState(() => {
    const initialOrg = {
      name: 'Seventh Sky Property Care',
      address: '',
      phone: user?.phone || '',
      email: user?.email || '',
      represented_by: user?.name || '',
      position: user?.role === 'super_admin' ? 'Managing Operator' : (user?.role || 'Managing Operator'),
    };
    try {
      const saved = localStorage.getItem(draftStorageKey);
      if (saved) {
        const p = JSON.parse(saved);
        if (p?.d) {
          return {
            ...EMPTY,
            ...p.d,
            org: { ...initialOrg, ...(p.d.org || {}) },
            services: Array.isArray(p.d.services) ? p.d.services : [],
            checklist: Array.isArray(p.d.checklist) ? p.d.checklist : [],
            pricing_input: { ...EMPTY.pricing_input, ...(p.d.pricing_input || {}), selected: (p.d.pricing_input || {}).selected || [] },
            witnesses: (p.d.witnesses && p.d.witnesses.length) ? p.d.witnesses : EMPTY.witnesses,
          };
        }
      }
    } catch {}
    return {
      ...EMPTY,
      org: initialOrg,
    };
  });
  const [meta, setMeta] = useState({ service_groups: {}, checklist_groups: {} });
  const [catalog, setCatalog] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);
  const [showFullPreview, setShowFullPreview] = useState(false);

  const previewRef = useRef(null);
  const previewScroll = useRef(0);

  useEffect(() => {
    api.get('/sts/meta').then((r) => {
      const metaData = r.data || {};
      setMeta(metaData);
      if (metaData.defaults) {
        setD((prev) => ({
          ...prev,
          schedule_b: {
            ...prev.schedule_b,
            work_order_no: prev.schedule_b.work_order_no || metaData.defaults.work_order_no || '',
            quotation_no: prev.schedule_b.quotation_no || metaData.defaults.quotation_no || '',
          },
          org: {
            ...prev.org,
            represented_by: prev.org.represented_by || metaData.defaults.org?.represented_by || user?.name || '',
            position: prev.org.position || metaData.defaults.org?.position || '',
            email: prev.org.email || metaData.defaults.org?.email || user?.email || '',
            phone: prev.org.phone || metaData.defaults.org?.phone || user?.phone || '',
          },
        }));
      }
    }).catch(() => {});
    api.get('/sts/catalog').then((r) => setCatalog(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [user]);

  const set = (path, value) => setD((prev) => {
    const next = structuredClone(prev); let o = next; const ks = path.split('.');
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = value; return next;
  });
  const toggleArr = (path, item) => setD((prev) => {
    const next = structuredClone(prev); let o = next; const ks = path.split('.');
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; const arr = o[ks[ks.length - 1]];
    const i = arr.indexOf(item); if (i >= 0) arr.splice(i, 1); else arr.push(item); return next;
  });

  const generateNewWo = () => {
    const code = `SSPC-WO-${Date.now().toString().slice(-6)}`;
    set('schedule_b.work_order_no', code);
  };
  const generateNewQt = () => {
    const code = `SSPC-QT-${Date.now().toString().slice(-6)}`;
    set('schedule_b.quotation_no', code);
  };

  const selCodes = useMemo(() => new Set(d.pricing_input.selected.map((s) => s.code)), [d.pricing_input.selected]);
  const toggleLine = (code) => setD((prev) => {
    const next = structuredClone(prev); const arr = next.pricing_input.selected;
    const i = arr.findIndex((s) => s.code === code); if (i >= 0) arr.splice(i, 1); else arr.push({ code, agreed_price: '' }); return next;
  });
  const setAgreed = (code, v) => setD((prev) => {
    const next = structuredClone(prev); const row = next.pricing_input.selected.find((s) => s.code === code); if (row) row.agreed_price = v; return next;
  });

  const refreshPreview = useCallback(async () => {
    try {
      previewScroll.current = previewRef.current?.contentWindow?.scrollY || previewScroll.current;
    } catch { /* cross-origin guard */ }
    setPreviewing(true);
    try {
      const r = await api.post('/sts/preview', d);
      if (r?.data) { setPreview(r.data); setPreviewError(false); }
      else setPreviewError(true);
    } catch (e) {
      console.error(e);
      setPreviewError(true);
    } finally {
      setPreviewing(false);
    }
  }, [d]);

  // First preview paints immediately on open; later edits stay debounced.
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
    setD({
      ...EMPTY,
      org: {
        name: 'Seventh Sky Property Care',
        address: '',
        phone: user?.phone || '',
        email: user?.email || '',
        represented_by: user?.name || '',
        position: user?.role === 'super_admin' ? 'Managing Operator' : (user?.role || 'Managing Operator'),
      },
    });
    toast.success('Auto-draft cleared');
  };

  const openPreview = () => {
    if (!preview?.html) return;
    setShowFullPreview(true);
  };

  const send = async () => {
    if (!d.client.full_name) return toast.error('Enter the owner full name');
    if (!d.client.email) return toast.error('Enter the owner email to send for signature');
    setBusy(true);
    try {
      const r = await api.post('/sts/agreements', d);
      try { localStorage.removeItem(draftStorageKey); setAutoDraftTime(null); } catch {}
      setSent(r.data);
      toast.success('Agreement sent to owner for signature');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not send');
    } finally {
      setBusy(false);
    }
  };

  const onClient = (id, row) => { set('client_contact_id', id); if (row) setD((p) => ({ ...p, client: { ...p.client, full_name: row.full_name || '', phone: row.primary_phone || '', email: row.email || '', nid: row.national_id || row.passport_no || '', current_address: row.address_line1 || p.client.current_address } })); };
  const onProperty = async (id, row) => {
    set('property_id', id);
    if (row) {
      setD((p) => ({
        ...p,
        property_type: row.property_type || p.property_type,
        schedule_b: {
          ...p.schedule_b,
          property_address: row.address || row.title || p.schedule_b.property_address,
        },
      }));
    }
    if (id) {
      try {
        const res = await api.get(`/sts/property-defaults/${id}`);
        if (res.data) {
          setD((p) => ({
            ...p,
            property_type: res.data.property_type || p.property_type,
            schedule_b: {
              ...p.schedule_b,
              property_address: p.schedule_b.property_address || res.data.property_address || '',
              work_order_no: p.schedule_b.work_order_no || res.data.work_order_no || '',
              quotation_no: p.schedule_b.quotation_no || res.data.quotation_no || '',
            },
          }));
        }
      } catch {}
    }
  };

  if (sent) {
    const url = `${window.location.origin}${sent.signing_path}`;
    return (
      <div className="pm-scope">
        <div className="pm-head"><div><div className="pm-eyebrow">Agreements</div><h1>Agreement sent</h1></div></div>
        <div className="pm-card" style={{ maxWidth: 640 }}><div className="pm-card-body" style={{ padding: 24 }}>
          <div className="pm-chip good" style={{ marginBottom: 12 }}><span className="d" />{sent.envelope_code} · sent for signature</div>
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>The owner can review the full agreement (with Table of Contents and Schedule C pricing) and sign at:</p>
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
    { id: 'parties', label: '1. Owner & 7th Sky Rep' },
    { id: 'property', label: '2. Property' },
    { id: 'services', label: '3. Services' },
    { id: 'pricing', label: '4. Pricing & Fee' },
    { id: 'checklist', label: '5. Checklist, 7th Sky Rep & Witnesses' },
  ];

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
                New Agreement
              </h2>
              <span style={{ fontSize: 11.5, background: 'var(--blue-weak)', color: 'var(--blue-strong)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                SSPC-STRMS-01 (v0.2)
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
              Short-Term Rental Management Agreement · Live 2-Column Editor
              {d.client.full_name ? ` · Owner: ${d.client.full_name}` : ''}
              {d.schedule_b.property_address ? ` · Property: ${d.schedule_b.property_address}` : ''}
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
          <button className="pm-btn primary" disabled={busy} onClick={send}>
            <Send size={14} /> {busy ? 'Sending…' : 'Send to owner for signature'}
          </button>
          {isModal && (
            <button type="button" className="pm-btn" onClick={onCancel || onDone} title="Close window">
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
            <div className="pm-card">
              <div className="pm-card-h">
                <div className="ic"><FileSignature size={16} /></div>
                <div>
                  <h3>1. Parties — Owner &amp; Property</h3>
                  <div className="hsub">Property owner details, property selection, and representative info</div>
                </div>
              </div>
              <div className="pm-card-body" style={{ padding: '0 18px 18px' }}>
                <div style={{ display: 'grid', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={lbl}>Client (Owner) — pick contact</label>
                      <Combo endpoint="/contacts" labelFn={(c) => `${c.full_name || 'Contact'} · ${c.primary_phone || c.email || ''}`} value={d.client_contact_id ? Number(d.client_contact_id) : ''} onChange={onClient} placeholder="Search a contact…" />
                    </div>
                    <div>
                      <label style={lbl}>Property — pick</label>
                      <Combo endpoint="/properties" labelFn={(p) => p.title || `Property #${p.id}`} value={d.property_id ? Number(d.property_id) : ''} onChange={onProperty} placeholder="Search a property…" />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div><label style={lbl}>Full name *</label><input style={sel} value={d.client.full_name} onChange={(e) => set('client.full_name', e.target.value)} placeholder="Owner legal name" /></div>
                    <div><label style={lbl}>NID / Passport</label><input style={sel} value={d.client.nid} onChange={(e) => set('client.nid', e.target.value)} placeholder="Govt ID / Passport" /></div>
                    <div><label style={lbl}>Email *</label><input style={sel} type="email" value={d.client.email} onChange={(e) => set('client.email', e.target.value)} placeholder="owner@example.com" /></div>
                    <div><label style={lbl}>Phone</label><input style={sel} value={d.client.phone} onChange={(e) => set('client.phone', e.target.value)} placeholder="017xxxxxxxx" /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Current address</label><input style={sel} value={d.client.current_address} onChange={(e) => set('client.current_address', e.target.value)} placeholder="Owner residential address" /></div>
                    <div><label style={lbl}>Authorized rep (if any)</label><input style={sel} value={d.client.rep} onChange={(e) => set('client.rep', e.target.value)} placeholder="Representative name" /></div>
                    <div><label style={lbl}>Representative position</label><input style={sel} value={d.client.rep_position} onChange={(e) => set('client.rep_position', e.target.value)} placeholder="Relationship / Title" /></div>
                    <div><label style={lbl}>Property type</label><input style={sel} value={d.property_type} onChange={(e) => set('property_type', e.target.value)} placeholder="Apartment / Villa" /></div>
                    <div><label style={lbl}>Effective date</label><input type="date" style={sel} value={d.effective_date} onChange={(e) => set('effective_date', e.target.value)} /></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 7th Sky Representative Card (Prominently visible in Parties, Checklist/Witnesses, and All) */}
          {(activeSection === 'all' || activeSection === 'parties' || activeSection === 'checklist') && (
            <div className="pm-card" style={{ border: '1.5px solid #2563eb35', background: '#f8faff', boxShadow: '0 2px 10px rgba(37,99,235,0.05)' }}>
              <div className="pm-card-h" style={{ borderBottom: '1px solid #dbeafe', background: '#eff6ff' }}>
                <div className="ic" style={{ background: '#2563eb', color: '#fff' }}><ShieldCheck size={16} /></div>
                <div>
                  <h3 style={{ color: '#1e40af' }}>7th Sky Representative (Managing Operator)</h3>
                  <div className="hsub">Authorized representative, official contact details, and countersigning officer for Seventh Sky</div>
                </div>
              </div>
              <div className="pm-card-body" style={{ padding: '16px 18px 18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={lbl}>7th Sky Representative Name *</label>
                    <input style={sel} value={d.org?.represented_by || ''} onChange={(e) => set('org.represented_by', e.target.value)} placeholder="e.g. Super Admin / Operations Manager" />
                  </div>
                  <div>
                    <label style={lbl}>Position / Designation *</label>
                    <input style={sel} value={d.org?.position || ''} onChange={(e) => set('org.position', e.target.value)} placeholder="e.g. Managing Operator / Host Lead" />
                  </div>
                  <div>
                    <label style={lbl}>Official Email *</label>
                    <input style={sel} type="email" value={d.org?.email || ''} onChange={(e) => set('org.email', e.target.value)} placeholder="e.g. rep@seventhskyproperty.com" />
                  </div>
                  <div>
                    <label style={lbl}>Official Phone No *</label>
                    <input style={sel} value={d.org?.phone || ''} onChange={(e) => set('org.phone', e.target.value)} placeholder="e.g. +880 1819-000000" />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={lbl}>Company / Agency Name</label>
                    <input style={sel} value={d.org?.name || ''} onChange={(e) => set('org.name', e.target.value)} placeholder="Seventh Sky Property Care" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Property */}
          {(activeSection === 'all' || activeSection === 'property') && (
            <div className="pm-card">
              <div className="pm-card-h">
                <div className="ic"><FileSignature size={16} /></div>
                <div>
                  <h3>2. Schedule B — STR Property Summary</h3>
                  <div className="hsub">Address, guest capacity, booking platforms, and management parameters</div>
                </div>
              </div>
              <div className="pm-card-body" style={{ padding: '0 18px 18px' }}>
                {/* Official Reference Codes */}
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16 }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Property address</label><input style={sel} value={d.schedule_b.property_address} onChange={(e) => set('schedule_b.property_address', e.target.value)} placeholder="Full physical address" /></div>
                  <div><label style={lbl}>Max guest capacity</label><input style={sel} value={d.schedule_b.max_guests} onChange={(e) => set('schedule_b.max_guests', e.target.value)} placeholder="e.g. 6 guests" /></div>
                  <div><label style={lbl}>Booking platform(s)</label><input style={sel} value={d.schedule_b.booking_platforms} onChange={(e) => set('schedule_b.booking_platforms', e.target.value)} placeholder="Airbnb, Booking.com, Direct" /></div>
                  <div><label style={lbl}>Management package</label><input style={sel} value={d.schedule_b.management_package} onChange={(e) => set('schedule_b.management_package', e.target.value)} placeholder="Full Service / Standard" /></div>
                  <div><label style={lbl}>Commencement date</label><input type="date" style={sel} value={d.schedule_b.commencement_date} onChange={(e) => set('schedule_b.commencement_date', e.target.value)} /></div>
                  <div><label style={lbl}>Reporting frequency</label><select style={sel} value={d.schedule_b.reporting_frequency} onChange={(e) => set('schedule_b.reporting_frequency', e.target.value)}>{['Monthly', 'Bi-weekly', 'Quarterly'].map((f) => <option key={f}>{f}</option>)}</select></div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Special requirements</label><textarea rows={2} style={{ ...sel, resize: 'vertical' }} value={d.schedule_b.special_requirements} onChange={(e) => set('schedule_b.special_requirements', e.target.value)} placeholder="Access instructions, parking codes, house rules" /></div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Services */}
          {(activeSection === 'all' || activeSection === 'services') && (
            <div className="pm-card">
              <div className="pm-card-h">
                <div className="ic"><FileSignature size={16} /></div>
                <div>
                  <h3>3. Schedule A — Selected Services Scope</h3>
                  <div className="hsub">Select hospitality setup, listing management, and operational services</div>
                </div>
              </div>
              <div className="pm-card-body" style={{ padding: '0 18px 18px' }}>
                {Object.entries(meta.service_groups).map(([g, items]) => (
                  <div key={g} style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy)', margin: '8px 0 6px' }}>{g}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px' }}>
                      {items.map((it) => (
                        <label key={it} style={{ fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: d.services.includes(it) ? 'var(--cyan-weak)' : 'var(--surface-2)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--line)' }}>
                          <input type="checkbox" checked={d.services.includes(it)} onChange={() => toggleArr('services', it)} />
                          <span style={{ fontWeight: d.services.includes(it) ? 700 : 500 }}>{it}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Pricing & Fee */}
          {(activeSection === 'all' || activeSection === 'pricing') && (
            <div className="pm-card">
              <div className="pm-card-h">
                <div className="ic"><FileSignature size={16} /></div>
                <div>
                  <h3>4. Schedule C — Price Schedule &amp; Fee Model</h3>
                  <div className="hsub">Tick setup items and select ongoing management fee (fixed vs revenue share)</div>
                </div>
              </div>
              <div className="pm-card-body" style={{ padding: '0 18px 18px' }}>
                <table className="pm-tbl">
                  <thead><tr><th></th><th>Code</th><th>Item / Service</th><th>Unit</th><th style={{ textAlign: 'right' }}>Standard</th><th style={{ textAlign: 'right' }}>Agreed</th></tr></thead>
                  <tbody>
                    {catalog.map((l) => {
                      const on = selCodes.has(l.code);
                      const row = d.pricing_input.selected.find((s) => s.code === l.code);
                      const std = l.price_label || (l.price_type === 'from' ? `From ${bdt(l.standard_price)}` : bdt(l.standard_price));
                      return (
                        <tr key={l.code} style={{ opacity: on ? 1 : 0.6 }}>
                          <td><input type="checkbox" checked={on} onChange={() => toggleLine(l.code)} /></td>
                          <td style={{ fontSize: 12 }}>{l.code}</td><td style={{ fontSize: 12.5 }}>{l.name}</td><td style={{ fontSize: 12 }}>{l.unit}</td>
                          <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>{std}</td>
                          <td style={{ textAlign: 'right' }}>{on && l.price_type !== 'included' ? <input type="number" style={{ ...sel, width: 110, padding: '5px 8px', textAlign: 'right' }} placeholder={l.price_type === 'revenue_share' ? '% share' : String(l.standard_price)} value={row?.agreed_price ?? ''} onChange={(e) => setAgreed(l.code, e.target.value)} /> : <span style={{ color: 'var(--muted-2)' }}>{l.price_type === 'included' ? 'Included' : '—'}</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 14 }}>
                  <div><label style={lbl}>Discount (৳)</label><input type="number" style={sel} value={d.pricing_input.discount} onChange={(e) => set('pricing_input.discount', Number(e.target.value))} /></div>
                  <div><label style={lbl}>VAT (%)</label><input type="number" style={sel} value={d.pricing_input.vat_percent} onChange={(e) => set('pricing_input.vat_percent', Number(e.target.value))} /></div>
                  <div style={{ alignSelf: 'end' }}><button className="pm-btn" onClick={refreshPreview}><RefreshCw size={13} /> Recalculate</button></div>
                </div>
                {preview?.pricing && (
                  <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="pm-card" style={{ background: 'var(--surface-2)' }}><div className="pm-card-body" style={{ padding: 14 }}>
                      <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 8, color: 'var(--navy)' }}>Cost summary</div>
                      {[['Setup fees', preview.pricing.summary.initial_setup_fees], ['Monthly fee', preview.pricing.summary.monthly_management_fees], ['Discount', -preview.pricing.summary.discount], ['VAT', preview.pricing.summary.vat]].map(([k, v]) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}><span style={{ color: 'var(--muted)' }}>{k}</span><span>{bdt(v)}</span></div>)}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderTop: '1px solid var(--line)', marginTop: 6, paddingTop: 6 }}><span>Total contract value</span><span>{bdt(preview.pricing.summary.total_contract_value)}</span></div>
                    </div></div>
                    <div className="pm-card" style={{ background: 'var(--surface-2)' }}><div className="pm-card-body" style={{ padding: 14 }}>
                      <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 8, color: 'var(--navy)' }}>Payment schedule</div>
                      {preview.pricing.payment_schedule.map((p, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}><span style={{ color: 'var(--muted)' }}>{p.stage}</span><span>{p.amount ? bdt(p.amount) : 'Per cycle'}</span></div>)}
                    </div></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. Checklist & Witnesses */}
          {(activeSection === 'all' || activeSection === 'checklist') && (
            <div className="pm-card">
              <div className="pm-card-h">
                <div className="ic"><FileSignature size={16} /></div>
                <div>
                  <h3>5. Schedule D — Setup Checklist &amp; Witnesses</h3>
                  <div className="hsub">Readiness audit verification and witness attestation counterparts</div>
                </div>
              </div>
              <div className="pm-card-body" style={{ padding: '0 18px 18px' }}>
                {Object.entries(meta.checklist_groups).map(([g, items]) => (
                  <div key={g} style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--navy)', margin: '8px 0 6px' }}>{g}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px' }}>
                      {items.map((it) => (
                        <label key={it} style={{ fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: d.checklist.includes(it) ? 'var(--cyan-weak)' : 'var(--surface-2)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--line)' }}>
                          <input type="checkbox" checked={d.checklist.includes(it)} onChange={() => toggleArr('checklist', it)} />
                          <span style={{ fontWeight: d.checklist.includes(it) ? 700 : 500 }}>{it}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
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
                          <input style={sel} placeholder="Witness full legal name" value={w.name || ''} onChange={(e) => setD((p) => { const n = structuredClone(p); n.witnesses[i].name = e.target.value; return n; })} />
                        </div>
                        <div>
                          <label style={lbl}>Email (to send signing link)</label>
                          <input style={sel} type="email" placeholder="witness@example.com" value={w.email || ''} onChange={(e) => setD((p) => { const n = structuredClone(p); n.witnesses[i].email = e.target.value; return n; })} />
                        </div>
                        <div>
                          <label style={lbl}>NID / Passport</label>
                          <input style={sel} placeholder="National ID or Passport" value={w.nid || ''} onChange={(e) => setD((p) => { const n = structuredClone(p); n.witnesses[i].nid = e.target.value; return n; })} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Sticky Live Agreement Preview */}
        <AgreementPreviewPane
          title={preview?.title || 'Short-Term Rental Management Service Agreement'}
          html={preview?.html}
          previewing={previewing}
          error={previewError}
          onFullPreview={() => setShowFullPreview(true)}
          onRetry={refreshPreview}
          previewRef={previewRef}
          previewScrollRef={previewScroll}
        />

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
                  SSPC-STRMS-01 v0.2
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
