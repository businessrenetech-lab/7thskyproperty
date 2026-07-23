import React, { useState } from 'react';
import { X, Search, Send, UserPlus, Users, Copy, CheckCircle2, ChevronRight } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Spinner, Button, Field, Input, Badge } from '../ui/kit';
import { Combo } from '../ui/pickers';

/* "Add owner / landlord" chooser — three paths (mirrors AddTenantChooser):
   1. Pull from the landlord role-onboarding list → auto-fills the owner wizard
   2. Send a registration link (landlord submits KYC + payment + property docs)
   3. Add manually                                                            */
export default function AddOwnerChooser({ property, onManual, onPrefill, onClose, onSentLink }) {
  const toast = useToast();
  const [mode, setMode] = useState(null); // null | pull | link

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 75, display: 'grid', placeItems: 'center', padding: 20 }} onClick={onClose}>
      <div className="pm-scope" onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: 'min(640px,96vw)', maxHeight: '86vh', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--line,#e5e7eb)' }}>
          <b>Add owner / landlord</b>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ padding: 18, overflowY: 'auto' }}>
          {!mode && (
            <div style={{ display: 'grid', gap: 10 }}>
              <ChoiceCard icon={Users} title="Pull from landlord list"
                desc="Search landlords already on the role-onboarding page; their details auto-fill the owner form."
                onClick={() => setMode('pull')} />
              <ChoiceCard icon={Send} title="Send registration link"
                desc="Email the landlord a branded link to submit their KYC, payment details and property documents (deed, khazna, tax, utility)."
                onClick={() => setMode('link')} />
              <ChoiceCard icon={UserPlus} title="Add manually"
                desc="Enter the owner details yourself. You can upload their NID / property documents, or request them via a link."
                onClick={() => { onClose(); onManual(); }} />
            </div>
          )}
          {mode === 'pull' && <PullPanel property={property} onBack={() => setMode(null)} onPrefill={onPrefill} toast={toast} />}
          {mode === 'link' && <LinkPanel property={property} onBack={() => setMode(null)} toast={toast} onSentLink={onSentLink} />}
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

const SRC_TONE = { website: 'green', staff: 'grey', application: 'blue' };

function PullPanel({ property, onBack, onPrefill, toast }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const search = async () => {
    try { const { data } = await api.get('/party-role-profiles', { params: { role_type: 'landlord', search: q, limit: 10 } }); setRows(data.data || []); }
    catch { setRows([]); }
  };

  const use = async (r) => {
    setBusyId(r.id);
    try {
      const { data } = await api.get('/party-role-profiles/landlord-prefill', { params: { contact_id: r.contact_id } });
      onPrefill({ ...data.data, __contact: r.contact });
      toast.success(`Loaded ${r.contact?.full_name || 'landlord'} — review and save.`);
    } catch (e) { toast.error(e.response?.data?.error || 'Could not load landlord.'); }
    finally { setBusyId(null); }
  };

  return (
    <div>
      <Button size="sm" variant="ghost" onClick={onBack}>← Back</Button>
      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <Input placeholder="Search landlord by code or name…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
        <Button variant="ghost" icon={Search} onClick={search}>Search</Button>
      </div>
      {rows === null ? <p className="cell-sub">Search the landlords already onboarded on the role-onboarding page.</p>
        : !rows.length ? <p className="cell-sub">No landlords found. Send a registration link or add manually.</p>
          : rows.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #eef2f7', borderRadius: 10, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{r.contact?.full_name || r.profile_code}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{[r.contact?.primary_phone, r.contact?.email, r.property?.title].filter(Boolean).join(' · ')}</div>
              </div>
              <Badge tone={SRC_TONE[r.source] || 'grey'}>{r.source === 'website' ? 'via website' : 'staff'}</Badge>
              <Button size="sm" onClick={() => use(r)} disabled={busyId === r.id}>{busyId === r.id ? <Spinner /> : 'Use'}</Button>
            </div>
          ))}
    </div>
  );
}

function LinkPanel({ property, onBack, toast, onSentLink }) {
  const [contactId, setContactId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const send = async () => {
    if (!contactId) { toast.error('Select or create the owner contact first.'); return; }
    setBusy(true);
    try {
      // Create (or reuse) a landlord role profile for this property, then generate its link.
      const { data: prof } = await api.post('/party-role-profiles', { contact_id: contactId, role_type: 'landlord', property_id: property.id, source: 'staff' });
      const { data: link } = await api.post(`/party-role-profiles/${prof.data.id}/registration-link`, {});
      setResult(link.data);
      toast.success(link.message || 'Registration link ready.');
      onSentLink?.();
    } catch (e) { toast.error(e.response?.data?.error || 'Could not create the link.'); }
    finally { setBusy(false); }
  };

  if (result) return (
    <div style={{ textAlign: 'center', padding: '10px 0' }}>
      <CheckCircle2 size={36} color="#16a34a" />
      <h4 style={{ margin: '10px 0 4px' }}>Registration link ready{result.emailed ? ' — emailed' : ''}</h4>
      <p className="cell-sub" style={{ wordBreak: 'break-all', fontSize: 12.5 }}>{result.link}</p>
      <Button icon={Copy} onClick={() => { navigator.clipboard.writeText(result.link); toast.success('Copied'); }}>Copy link</Button>
      <p className="cell-sub" style={{ fontSize: 12, marginTop: 10 }}>The landlord submits KYC, payment details and property documents. It appears on the role-onboarding page (source: via website) once submitted.</p>
    </div>
  );

  return (
    <div>
      <Button size="sm" variant="ghost" onClick={onBack}>← Back</Button>
      <p className="cell-sub" style={{ margin: '10px 0' }}>The landlord opens a branded link to submit their identity/KYC, bank/payment details, and upload property documents (NID, ownership deed, khazna/mutation, tax, utility bill) for verification.</p>
      <Field label="Owner contact"><Combo endpoint="/contacts" labelFn={(c) => `${c.full_name}${c.primary_phone ? ' · ' + c.primary_phone : ''}`} value={contactId} onChange={setContactId} placeholder="Search or add the owner…" /></Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <Button icon={Send} onClick={send} disabled={busy}>{busy ? <Spinner /> : 'Create registration link'}</Button>
      </div>
    </div>
  );
}
