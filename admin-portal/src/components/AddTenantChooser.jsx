import React, { useState } from 'react';
import { X, Search, Send, UserPlus, FileText, Copy, CheckCircle2, ChevronRight } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Spinner, Button, Field, Input, Badge } from '../ui/kit';

/* "Add tenant" chooser — three paths:
   1. Pull from an existing tenant application (search email/phone → convert)
   2. Send a branded application link (prefilled with this property)
   3. Add tenancy manually (existing drawer)                                  */
export default function AddTenantChooser({ propertyId, onManual, onClose, onDone }) {
  const toast = useToast();
  const [mode, setMode] = useState(null); // null | pull | link

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 75, display: 'grid', placeItems: 'center', padding: 20 }} onClick={onClose}>
      <div className="pm-scope" onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: 'min(640px,96vw)', maxHeight: '86vh', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--line,#e5e7eb)' }}>
          <b>Add tenant</b>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ padding: 18, overflowY: 'auto' }}>
          {!mode && (
            <div style={{ display: 'grid', gap: 10 }}>
              <ChoiceCard icon={FileText} title="Pull from tenant application"
                desc="Search submitted applications by email or phone, then convert the approved one into a tenancy."
                onClick={() => setMode('pull')} />
              <ChoiceCard icon={Send} title="Send tenant application link"
                desc="Email a branded application form prefilled with this property. The applicant fills everything themselves."
                onClick={() => setMode('link')} />
              <ChoiceCard icon={UserPlus} title="Add tenant & tenancy manually"
                desc="Type the tenant and lease details yourself (existing contact required)."
                onClick={() => { onClose(); onManual(); }} />
            </div>
          )}
          {mode === 'pull' && <PullPanel propertyId={propertyId} onBack={() => setMode(null)} onDone={onDone} toast={toast} />}
          {mode === 'link' && <LinkPanel propertyId={propertyId} onBack={() => setMode(null)} toast={toast} />}
        </div>
      </div>
    </div>
  );
}

function ChoiceCard({ icon: Icon, title, desc, onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left', padding: 14, borderRadius: 12, border: '1px solid var(--line,#e5e7eb)', background: '#fff', cursor: 'pointer' }}>
      <span style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--cyan-weak,#eff6ff)', color: 'var(--navy,#003768)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon size={18} /></span>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontWeight: 750, fontSize: 14 }}>{title}</span>
        <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted,#64748b)', marginTop: 2 }}>{desc}</span>
      </span>
      <ChevronRight size={16} color="var(--muted-2,#94a3b8)" />
    </button>
  );
}

const STATUS_TONE = { approved: 'green', submitted: 'blue', converted: 'grey', rejected: 'red' };

function PullPanel({ propertyId, onBack, onDone, toast }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [selected, setSelected] = useState(null);
  const [cf, setCf] = useState({});
  const [busy, setBusy] = useState(false);

  const search = async () => {
    try { const { data } = await api.get('/tenant-applications', { params: { search: q, limit: 8 } }); setRows(data.data || []); }
    catch { setRows([]); }
  };

  // Prefill the tenancy fields from the application's proposed values (editable).
  const pick = (r) => {
    setSelected(r);
    setCf({
      monthly_rent: r.proposed_monthly_rent || r.approved_rent || r.property?.approved_monthly_rent || '',
      service_charge: r.proposed_service_charge || '',
      advance_rent: r.proposed_advance_rent || '',
      security_deposit: r.proposed_security_deposit || '',
      lease_start: r.proposed_lease_start || r.lease_start_target || '',
      lease_end: '',
      minimum_lease_period_months: r.proposed_lease_term_months || r.property?.lease_min_period_months || 12,
      rent_due_day: r.property?.rent_due_day || 5,
    });
  };

  const create = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/tenant-applications/${selected.id}/convert-to-tenancy`, cf);
      toast.success(data.message || 'Tenancy created.');
      onDone?.();
    } catch (e) { toast.error(e.response?.data?.error || 'Convert failed.'); }
    finally { setBusy(false); }
  };

  // Step 2 — review the prefilled tenancy form.
  if (selected) {
    const set = (k, v) => setCf((s) => ({ ...s, [k]: v }));
    return (
      <div>
        <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>← Back to results</Button>
        <div style={{ margin: '10px 0', fontWeight: 700 }}>{selected.applicant_name} <span style={{ color: '#94a3b8', fontWeight: 500 }}>· {selected.application_code}</span></div>
        <p className="cell-sub" style={{ marginTop: 0 }}>Prefilled from the application — review and adjust, then create the tenancy.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Monthly rent (৳)"><Input type="number" value={cf.monthly_rent} onChange={(e) => set('monthly_rent', e.target.value)} /></Field>
          <Field label="Service charge (৳)"><Input type="number" value={cf.service_charge} onChange={(e) => set('service_charge', e.target.value)} /></Field>
          <Field label="Advance rent (৳)"><Input type="number" value={cf.advance_rent} onChange={(e) => set('advance_rent', e.target.value)} /></Field>
          <Field label="Security deposit (৳)"><Input type="number" value={cf.security_deposit} onChange={(e) => set('security_deposit', e.target.value)} /></Field>
          <Field label="Lease start"><Input type="date" value={cf.lease_start || ''} onChange={(e) => set('lease_start', e.target.value)} /></Field>
          <Field label="Lease end"><Input type="date" value={cf.lease_end || ''} onChange={(e) => set('lease_end', e.target.value)} /></Field>
          <Field label="Lease term (months)"><Input type="number" value={cf.minimum_lease_period_months} onChange={(e) => set('minimum_lease_period_months', e.target.value)} /></Field>
          <Field label="Rent due day"><Input type="number" min="1" max="28" value={cf.rent_due_day} onChange={(e) => set('rent_due_day', e.target.value)} /></Field>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <Button onClick={create} disabled={busy}>{busy ? <Spinner /> : 'Create tenancy'}</Button>
        </div>
      </div>
    );
  }

  // Step 1 — search + pick.
  return (
    <div>
      <Button size="sm" variant="ghost" onClick={onBack}>← Back</Button>
      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <Input placeholder="Search by tenant email or phone…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
        <Button variant="ghost" icon={Search} onClick={search}>Search</Button>
      </div>
      {rows === null ? <p className="cell-sub">Type an email or phone number and search.</p>
        : !rows.length ? <p className="cell-sub">No applications matched. Try the application link instead.</p>
          : rows.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #eef2f7', borderRadius: 10, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.applicant_name} <span style={{ color: '#94a3b8', fontWeight: 500 }}>· {r.application_code}</span></div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{[r.email, r.mobile, r.property?.title].filter(Boolean).join(' · ')}</div>
              </div>
              <Badge tone={STATUS_TONE[r.status] || 'grey'}>{r.status}</Badge>
              {r.status === 'approved'
                ? <Button size="sm" onClick={() => pick(r)}>Review &amp; convert</Button>
                : <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{r.status === 'converted' ? 'Already converted' : 'Approve it first'}</span>}
            </div>
          ))}
    </div>
  );
}

function LinkPanel({ propertyId, onBack, toast }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const send = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/tenant-applications/send-link', { property_id: propertyId, email: email || undefined, applicant_name: name || undefined });
      setResult(data.data);
      toast.success(data.message);
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to create link.'); }
    finally { setBusy(false); }
  };

  if (result) return (
    <div style={{ textAlign: 'center', padding: '10px 0' }}>
      <CheckCircle2 size={36} color="#16a34a" />
      <h4 style={{ margin: '10px 0 4px' }}>Application link ready{result.emailed ? ' — emailed' : ''}</h4>
      <p className="cell-sub" style={{ wordBreak: 'break-all', fontSize: 12.5 }}>{result.link}</p>
      <Button icon={Copy} onClick={() => { navigator.clipboard.writeText(result.link); toast.success('Copied'); }}>Copy link</Button>
      <p className="cell-sub" style={{ fontSize: 12, marginTop: 10 }}>Share it via WhatsApp/SMS too. It expires in 14 days.</p>
    </div>
  );

  return (
    <div>
      <Button size="sm" variant="ghost" onClick={onBack}>← Back</Button>
      <p className="cell-sub" style={{ margin: '10px 0' }}>The form opens prefilled with this property. The applicant completes their details, uploads photo + NID, lists occupants, and accepts the declaration.</p>
      <Field label="Applicant email (optional — emails the link)"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Applicant name (optional)"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <Button icon={Send} onClick={send} disabled={busy}>{busy ? <Spinner /> : 'Create application link'}</Button>
      </div>
    </div>
  );
}
