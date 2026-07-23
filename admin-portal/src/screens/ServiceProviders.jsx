import React, { useCallback, useEffect, useState } from 'react';
import { HardHat, Plus, Link2, Check, ShieldCheck, FileText, Users, MapPin, CreditCard, Wrench, Copy, Building2 } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Spinner, Badge, Button, Drawer, Field, Input, Select, Textarea, EmptyState } from '../ui/kit';
import FileUpload from '../ui/FileUpload';

const STAGE_META = {
  applied: ['Applied', 'grey'], kyc_submitted: ['KYC submitted', 'blue'], verifying: ['Verifying', 'amber'],
  agreement_pending: ['Agreement pending', 'amber'], active: ['Active', 'green'], suspended: ['Suspended', 'red'], terminated: ['Terminated', 'red'],
};
const DOC_GROUPS = [['kyc', 'KYC & Identity'], ['compliance', 'Licensing & Compliance'], ['insurance', 'Insurance'], ['certification', 'Certifications']];

export default function ServiceProviders() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/providers?limit=200'); setRows(data.data || []); }
    catch { toast.error('Failed to load providers'); } finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const shown = rows.filter((r) => typeFilter === 'all' || r.provider_type === typeFilter);
  const progress = (p) => {
    const flags = [p.kyc_verified, p.compliance_verified, p.insurance_verified, p.capability_verified, p.payment_verified, p.agreement_status === 'signed'];
    return Math.round((flags.filter(Boolean).length / flags.length) * 100);
  };

  return (
    <div className="pm-scope">
      <PageHead title="Service Providers"
        desc="Third-party contractors and our own internal service teams — onboarding, verification and agreements."
        actions={<Button icon={Plus} onClick={() => setAddOpen(true)}>Add provider</Button>} />

      <div className="pm-segment" style={{ marginBottom: 16 }}>
        {[['all', 'All'], ['third_party', 'Third party'], ['internal', 'Our team']].map(([k, l]) => (
          <button key={k} className={typeFilter === k ? 'on' : ''} onClick={() => setTypeFilter(k)}>{l}</button>
        ))}
      </div>

      {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : !shown.length ? (
        <div className="pm-card"><EmptyState icon={HardHat} title="No providers yet" hint="Add a provider or send a registration link to onboard one." /></div>
      ) : (
        <div className="pm-card" style={{ overflowX: 'auto' }}>
          <table className="pm-tbl">
            <thead><tr><th>Provider</th><th>Type</th><th>Stage</th><th>Verification</th><th>Folio</th><th /></tr></thead>
            <tbody>
              {shown.map((p) => {
                const pct = progress(p); const [sl, st] = STAGE_META[p.onboarding_stage] || ['—', 'grey'];
                return (
                  <tr key={p.id} onClick={() => setDetailId(p.id)}>
                    <td><div className="pm-who"><div className="av" style={{ background: p.provider_type === 'internal' ? 'linear-gradient(140deg,#0ea371,#0a6b4c)' : 'linear-gradient(140deg,#12b6f3,#024b86)' }}>{(p.company_name || '?').slice(0, 2).toUpperCase()}</div><div><div className="nm">{p.company_name}</div><div className="ph">{p.contact_person || ''}{p.phone ? ` · ${p.phone}` : ''}</div></div></div></td>
                    <td><Badge tone={p.provider_type === 'internal' ? 'green' : 'blue'}>{p.provider_type === 'internal' ? 'Our team' : 'Third party'}</Badge></td>
                    <td><Badge tone={st} dot>{sl}</Badge></td>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 90, height: 6, borderRadius: 5, background: 'var(--surface-3)', overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? 'var(--good)' : 'var(--cyan)' }} /></div><span className="pm-num" style={{ fontSize: 12, color: 'var(--muted)' }}>{pct}%</span></div></td>
                    <td>{p.folio_id ? <span className="code-chip">Folio #{p.folio_id}</span> : <span className="cell-sub">—</span>}</td>
                    <td style={{ textAlign: 'right' }}><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setDetailId(p.id); }}>Open</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {addOpen && <AddProviderDrawer onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); load(); }} />}
      {detailId && <ProviderDrawer id={detailId} onClose={() => setDetailId(null)} onChanged={load} />}
    </div>
  );
}

function AddProviderDrawer({ onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ company_name: '', contact_person: '', phone: '', email: '', provider_type: 'third_party', vertical: 'water_tank' });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!f.company_name) return toast.error('Company name required');
    setBusy(true);
    try { await api.post('/providers', f); toast.success('Provider added'); onSaved(); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed'); } finally { setBusy(false); }
  };
  return (
    <Drawer title="Add service provider" width={480} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? <Spinner /> : 'Add provider'}</Button></>}>
      <Field label="Type"><Select value={f.provider_type} onChange={(e) => setF((s) => ({ ...s, provider_type: e.target.value }))}><option value="third_party">Third-party contractor</option><option value="internal">Our own team</option></Select></Field>
      <Field label="Company / team name" required><Input value={f.company_name} onChange={(e) => setF((s) => ({ ...s, company_name: e.target.value }))} /></Field>
      <div className="form-grid">
        <Field label="Contact person"><Input value={f.contact_person} onChange={(e) => setF((s) => ({ ...s, contact_person: e.target.value }))} /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={(e) => setF((s) => ({ ...s, phone: e.target.value }))} /></Field>
      </div>
      <Field label="Email"><Input value={f.email} onChange={(e) => setF((s) => ({ ...s, email: e.target.value }))} /></Field>
      <div className="cell-sub" style={{ fontSize: 12 }}>After adding, open the provider to send a registration link, verify documents, and activate.</div>
    </Drawer>
  );
}

function ProviderDrawer({ id, onClose, onChanged }) {
  const toast = useToast();
  const [p, setP] = useState(null);
  const [cats, setCats] = useState([]);
  const [busy, setBusy] = useState(false);
  const [newDoc, setNewDoc] = useState({ doc_category: 'kyc', title: '', file_url: '' });
  const [agr, setAgr] = useState(null); // agreement send form / result

  const load = useCallback(async () => {
    try {
      const [pr, tr] = await Promise.all([api.get(`/providers/${id}`), api.get('/service-catalog/tree?vertical=water_tank')]);
      setP(pr.data.data);
      const flat = []; const walk = (n) => { if (n.parent_id !== null || n.parent_id === undefined) { /* include sub-cats */ } };
      // flatten categories (children of root)
      const roots = tr.data.data || []; const out = [];
      roots.forEach((r) => (r.children || []).forEach((c) => out.push({ id: c.id, name: c.name })));
      setCats(out);
    } catch { toast.error('Failed to load provider'); }
  }, [id, toast]);
  useEffect(() => { load(); }, [load]);

  if (!p) return <Drawer title="Provider" width={760} onClose={onClose}><div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div></Drawer>;

  const capIds = new Set((p.capabilities || []).map((c) => c.category_id));
  const act = async (fn, ok) => { setBusy(true); try { await fn(); toast.success(ok); await load(); onChanged?.(); } catch (e) { toast.error(e.response?.data?.error || 'Failed'); } finally { setBusy(false); } };
  const verify = (aspect, value) => act(() => api.patch(`/providers/${id}/verify`, { aspect, value }), 'Updated');
  const toggleCap = (cid) => { const next = new Set(capIds); next.has(cid) ? next.delete(cid) : next.add(cid); act(() => api.put(`/providers/${id}/capabilities`, { category_ids: [...next] }), 'Capabilities saved'); };
  const addDoc = () => { if (!newDoc.file_url || !newDoc.title) return toast.error('Title + file required'); act(async () => { await api.post(`/providers/${id}/documents`, newDoc); setNewDoc({ doc_category: newDoc.doc_category, title: '', file_url: '' }); }, 'Document added'); };
  const regLink = () => act(async () => { const { data } = await api.post(`/providers/${id}/registration-link`); await navigator.clipboard.writeText(location.origin + data.data.link).catch(() => {}); toast.success('Link copied to clipboard'); }, 'Registration link generated');
  const activate = () => act(() => api.post(`/providers/${id}/activate`), 'Provider activated + folio created');

  const [sl, st] = STAGE_META[p.onboarding_stage] || ['—', 'grey'];
  const Sec = ({ icon: Ic, title, children, right }) => (
    <div className="pm-card" style={{ marginBottom: 14 }}>
      <div className="pm-card-h"><div className="ic"><Ic size={16} /></div><h3>{title}</h3><div className="sp" />{right}</div>
      <div style={{ padding: '0 16px 16px' }}>{children}</div>
    </div>
  );

  return (
    <Drawer title={p.company_name} width={780} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Close</Button>{p.onboarding_stage !== 'active' && <Button icon={Check} onClick={activate} disabled={busy || !p.ready_to_activate} title={p.ready_to_activate ? '' : 'Complete all verification checks first'}>Activate provider</Button>}</>}>
      <div className="pm-scope">
        {/* header */}
        <div className="between" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge tone={p.provider_type === 'internal' ? 'green' : 'blue'}>{p.provider_type === 'internal' ? 'Our team' : 'Third party'}</Badge>
            <Badge tone={st} dot>{sl}</Badge>
            {p.folio_id && <span className="code-chip">Folio #{p.folio_id}</span>}
          </div>
          <Button size="sm" variant="ghost" icon={Link2} onClick={regLink}>Registration link</Button>
        </div>

        <Sec icon={ShieldCheck} title="Verification checklist">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(p.checklist || []).map((c) => (
              <div key={c.key} className="pm-row" style={{ padding: '9px 0' }}>
                <div style={{ width: 22, height: 22, borderRadius: 7, display: 'grid', placeItems: 'center', background: c.done ? 'var(--good-bg)' : 'var(--surface-3)', color: c.done ? 'var(--good)' : 'var(--muted-2)' }}><Check size={13} /></div>
                <div className="grow"><div style={{ fontSize: 13, fontWeight: 600 }}>{c.label}</div><div className="sub">{c.count} item{c.count === 1 ? '' : 's'}</div></div>
                {c.key !== 'agreement' && <Button size="sm" variant={c.done ? 'ghost' : 'primary'} onClick={() => verify(c.key, !c.done)}>{c.done ? 'Unverify' : 'Verify'}</Button>}
                {c.key === 'agreement' && (
                  p.agreement_status === 'signed'
                    ? <Badge tone="green" dot>Signed</Badge>
                    : <Button size="sm" variant={p.agreement_status === 'sent' ? 'ghost' : 'primary'} onClick={() => setAgr({ commission_pct: p.rate_card?.commission_pct || 20, countersigner_email: '' })}>{p.agreement_status === 'sent' ? 'Resend agreement' : 'Generate & send'}</Button>
                )}
              </div>
            ))}
          </div>
        </Sec>

        <Sec icon={FileText} title="Documents · KYC / compliance / insurance">
          {(p.compliance || []).length ? (p.compliance || []).map((d) => (
            <div key={d.id} className="pm-row" style={{ padding: '9px 0' }}>
              <FileText size={16} color="var(--navy)" />
              <div className="grow"><div style={{ fontSize: 13, fontWeight: 600 }}>{d.title || d.doc_type}</div><div className="sub" style={{ textTransform: 'capitalize' }}>{d.doc_category}{d.expiry_date ? ` · expires ${d.expiry_date}` : ''}</div></div>
              {d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">View</a>}
              <Button size="sm" variant={d.verified ? 'ghost' : 'primary'} onClick={() => act(() => api.patch(`/providers/${id}/documents/${d.id}/verify`, { verified: !d.verified }), 'Updated')}>{d.verified ? '✓ Verified' : 'Verify'}</Button>
            </div>
          )) : <div className="cell-sub">No documents uploaded yet.</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ width: 150 }}><Field label="Type"><Select value={newDoc.doc_category} onChange={(e) => setNewDoc((s) => ({ ...s, doc_category: e.target.value }))}>{DOC_GROUPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field></div>
            <div style={{ flex: 1, minWidth: 140 }}><Field label="Title"><Input value={newDoc.title} onChange={(e) => setNewDoc((s) => ({ ...s, title: e.target.value }))} placeholder="Trade Licence…" /></Field></div>
            <div style={{ flex: 1, minWidth: 200 }}><Field label="File"><FileUpload compact value={newDoc.file_url} onChange={(url) => setNewDoc((s) => ({ ...s, file_url: url }))} /></Field></div>
            <Button size="sm" icon={Plus} onClick={addDoc}>Add</Button>
          </div>
        </Sec>

        <Sec icon={Wrench} title="Capability matrix">
          <div className="cell-sub" style={{ fontSize: 12, marginBottom: 8 }}>Which service categories this provider can deliver.</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {cats.map((c) => <button key={c.id} className={`pm-pill ${capIds.has(c.id) ? 'active' : ''}`} onClick={() => toggleCap(c.id)}>{capIds.has(c.id) ? <Check size={12} /> : null} {c.name}</button>)}
          </div>
        </Sec>

        <Sec icon={CreditCard} title="Profile & payment">
          <ProfileForm p={p} onSave={(patch) => act(() => api.put(`/providers/${id}`, patch), 'Saved')} />
        </Sec>
      </div>

      {agr && <AgreementDrawer providerId={id} form={agr} onClose={() => setAgr(null)} onSent={() => { setAgr(null); load(); onChanged?.(); }} />}
    </Drawer>
  );
}

function AgreementDrawer({ providerId, form: initial, onClose, onSent }) {
  const toast = useToast();
  const [form, setForm] = useState({ commission_pct: initial.commission_pct || 20, term_months: 12, countersigner_email: '' });
  const [busy, setBusy] = useState(false);
  const [links, setLinks] = useState(null);
  const send = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/providers/${providerId}/send-agreement`, { terms: { commission_pct: Number(form.commission_pct), term_months: Number(form.term_months) }, countersigner_email: form.countersigner_email || undefined });
      setLinks(data.links || []); toast.success(data.message);
    } catch (e) { toast.error(e.response?.data?.error || 'Send failed'); } finally { setBusy(false); }
  };
  return (
    <Drawer title="Send Master Agreement" width={520} onClose={onClose}
      footer={links ? <Button onClick={onSent}>Done</Button> : <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={send} disabled={busy}>{busy ? <Spinner /> : 'Generate & send'}</Button></>}>
      {links ? (
        <div>
          <div className="cell-sub" style={{ marginBottom: 10 }}>Agreement sent. Signing links (also emailed):</div>
          {links.map((l, i) => (
            <div key={i} className="pm-row" style={{ padding: '9px 0' }}>
              <div className="grow"><div style={{ fontWeight: 600, fontSize: 13 }}>{l.name} <span className="cell-sub">· signer {l.order}</span></div><div className="sub" style={{ wordBreak: 'break-all' }}>{l.link}</div></div>
              <Button size="sm" variant="ghost" icon={Copy} onClick={() => { navigator.clipboard.writeText(l.link); toast.success('Copied'); }} />
            </div>
          ))}
          <div className="cell-sub" style={{ fontSize: 12, marginTop: 10 }}>The provider is verified automatically once both parties sign.</div>
        </div>
      ) : (
        <div>
          <div className="cell-sub" style={{ marginBottom: 12 }}>The agreement is auto-populated from this provider's profile, capability matrix and territory.</div>
          <div className="form-grid">
            <Field label="Seventh Sky fee (%)"><Input type="number" value={form.commission_pct} onChange={(e) => setForm((s) => ({ ...s, commission_pct: e.target.value }))} /></Field>
            <Field label="Term (months)"><Input type="number" value={form.term_months} onChange={(e) => setForm((s) => ({ ...s, term_months: e.target.value }))} /></Field>
          </div>
          <Field label="Seventh Sky counter-signer email"><Input value={form.countersigner_email} onChange={(e) => setForm((s) => ({ ...s, countersigner_email: e.target.value }))} placeholder="Defaults to you" /></Field>
        </div>
      )}
    </Drawer>
  );
}

function ProfileForm({ p, onSave }) {
  const [f, setF] = useState({
    company_name: p.company_name || '', contact_person: p.contact_person || '', phone: p.phone || '', email: p.email || '',
    trade_licence_no: p.trade_licence_no || '', tin: p.tin || '', bin: p.bin || '',
    bank_details: p.bank_details || {}, cumilla_restricted: !!p.cumilla_restricted,
  });
  const setBank = (k, v) => setF((s) => ({ ...s, bank_details: { ...s.bank_details, [k]: v } }));
  return (
    <div>
      <div className="form-grid">
        <Field label="Contact person"><Input value={f.contact_person} onChange={(e) => setF((s) => ({ ...s, contact_person: e.target.value }))} /></Field>
        <Field label="Phone"><Input value={f.phone} onChange={(e) => setF((s) => ({ ...s, phone: e.target.value }))} /></Field>
        <Field label="Trade licence no."><Input value={f.trade_licence_no} onChange={(e) => setF((s) => ({ ...s, trade_licence_no: e.target.value }))} /></Field>
        <Field label="TIN"><Input value={f.tin} onChange={(e) => setF((s) => ({ ...s, tin: e.target.value }))} /></Field>
        <Field label="Bank name"><Input value={f.bank_details.bank_name || ''} onChange={(e) => setBank('bank_name', e.target.value)} /></Field>
        <Field label="Account number"><Input value={f.bank_details.account_number || ''} onChange={(e) => setBank('account_number', e.target.value)} /></Field>
        <Field label="bKash"><Input value={f.bank_details.bkash || ''} onChange={(e) => setBank('bkash', e.target.value)} /></Field>
        <Field label="Cumilla exclusivity"><Select value={f.cumilla_restricted ? '1' : '0'} onChange={(e) => setF((s) => ({ ...s, cumilla_restricted: e.target.value === '1' }))}><option value="0">No restriction</option><option value="1">Cumilla-restricted</option></Select></Field>
      </div>
      <Button size="sm" onClick={() => onSave(f)}>Save profile</Button>
    </div>
  );
}
