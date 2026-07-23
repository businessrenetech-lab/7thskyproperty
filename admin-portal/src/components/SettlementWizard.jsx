import React, { useState } from 'react';
import { LogOut, Ban, Plus, Trash2, Calculator, CheckCircle2, ArrowRight, Send, ShieldCheck, Stamp, Lock, Undo2, Circle } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Drawer, Spinner, Button, Field, Input, Select, Badge, Textarea } from '../ui/kit';

/* End / terminate a tenancy through a staff-reviewed settlement that actually
   moves money: refund the net to the tenant (funded from the owner) or collect
   the shortfall into the owner's balance. Tenancy ends only on finalise. */
const money = (v) => '৳' + Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const REASONS = [['mutual', 'Mutual agreement'], ['tenant_request', 'Tenant request'], ['owner_request', 'Owner request'], ['breach', 'Breach of agreement'], ['non_payment', 'Non-payment'], ['other', 'Other']];

/* The settlement control chain. Each stage is a separate action by a separate
   person — the preparer cannot review or approve their own figures, and money
   only moves at the final lock. */
const STAGES = [
  { key: 'submit', label: 'Submitted', icon: Send },
  { key: 'review', label: 'Independent review', icon: ShieldCheck },
  { key: 'approve', label: 'Approved', icon: Stamp },
  { key: 'lock', label: 'Finalised & locked', icon: Lock },
];
const stageIndexFor = (status) => ({
  computing: 0, pending_owner: 0, disputed: 0, pending_review: 1, reviewed: 2, approved: 3, refunded: 4, closed: 4,
}[status] ?? 0);

export default function SettlementWizard({ tenancy: t, mode, onClose, onDone }) {
  const toast = useToast();
  const { user } = useAuth();
  const me = user?.id;
  const isSuper = user?.role === 'super_admin';
  const terminate = mode === 'terminate';
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [s, setS] = useState(null); // settlement
  const [reason, setReason] = useState('mutual');
  const [effective, setEffective] = useState('');
  const [ded, setDed] = useState({ damages_lines: [], cleaning: '', utility_dues: '', other_deductions: '' });
  const [ref, setRef] = useState({ method: 'bank', reference: '' });
  const [notes, setNotes] = useState('');
  const [override, setOverride] = useState({ on: false, reason: '' });
  const [reopening, setReopening] = useState({ on: false, reason: '' });

  const open = async () => {
    setBusy(true);
    try {
      const url = terminate ? `/tenancies/${t.id}/terminate` : `/tenancies/${t.id}/end`;
      const { data } = await api.post(url, terminate ? { reason, effective_date: effective || undefined } : { effective_date: effective || undefined });
      setS(data.data.settlement);
      setStep(1);
    } catch (e) { toast.error(e.response?.data?.error || 'Could not open the settlement.'); }
    finally { setBusy(false); }
  };

  const recompute = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/deposit-settlements/${s.id}/recompute`, {
        damages_lines: ded.damages_lines.filter((l) => l.label || l.amount),
        cleaning: Number(ded.cleaning || 0), utility_dues: Number(ded.utility_dues || 0), other_deductions: Number(ded.other_deductions || 0),
      });
      setS(data.data || data);
      toast.success('Recomputed.');
    } catch (e) { toast.error(e.response?.data?.error || 'Recompute failed.'); }
    finally { setBusy(false); }
  };

  // One recorded action per stage. The server is the authority — it rejects
  // anything that breaks separation of duties, and we surface the reason.
  const act = async (path, body) => {
    setBusy(true);
    try {
      const { data } = await api.post(`/deposit-settlements/${s.id}/${path}`, body);
      setS(data.data || data);
      setNotes(''); setOverride({ on: false, reason: '' }); setReopening({ on: false, reason: '' });
      toast.success(data.message || 'Done.');
    } catch (e) { toast.error(e.response?.data?.error || 'Action failed.'); }
    finally { setBusy(false); }
  };

  const ovr = override.on ? { override: true, override_reason: override.reason } : {};
  const submit = () => act('submit', { notes: notes || undefined });
  const review = () => act('review', { decision: 'reviewed', notes: notes || undefined, ...ovr });
  const sendBack = () => act('review', { decision: 'rejected', notes: notes || undefined });
  const approve = () => act('approve', { note: notes || undefined, ...ovr });
  const reopen = () => act('reopen', { reason: reopening.reason });

  // The only step that moves money. Guarded server-side by status === 'approved'.
  const finalize = async () => {
    setBusy(true);
    try {
      const isColl = s.settlement_direction === 'collect';
      const { data } = await api.post(`/deposit-settlements/${s.id}/mark-refunded`, isColl
        ? { collection_method: ref.method, collection_reference: ref.reference }
        : { refund_method: ref.method, refund_reference: ref.reference });
      toast.success(data.message || 'Settlement finalised. Tenancy closed.');
      onDone?.();
    } catch (e) { toast.error(e.response?.data?.error || 'Finalise failed.'); }
    finally { setBusy(false); }
  };

  const setDamage = (i, patch) => setDed((d) => ({ ...d, damages_lines: d.damages_lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) }));
  const isCollect = s?.settlement_direction === 'collect';

  // Who may act now — mirrors the server's separation-of-duties rules.
  const stageIdx = s ? stageIndexFor(s.status) : 0;
  const blockedBecause = !s ? null
    : s.status === 'pending_review' && s.submitted_by && s.submitted_by === me
      ? 'You submitted this settlement, so someone else must review it.'
      : s.status === 'reviewed' && ((s.reviewed_by && s.reviewed_by === me) || (s.submitted_by && s.submitted_by === me))
        ? `You ${s.reviewed_by === me ? 'reviewed' : 'submitted'} this settlement, so someone else must approve it.`
        : null;

  return (
    <Drawer title={`${terminate ? 'Terminate' : 'End'} tenancy — ${t.tenancy_code}`} width={620} onClose={onClose}
      footer={
        step === 0 ? <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={terminate ? Ban : LogOut} onClick={open} disabled={busy}>{busy ? <Spinner /> : 'Open settlement'}</Button></>
          : step === 1 ? <><Button variant="ghost" onClick={recompute} disabled={busy || stageIdx > 0}>{busy ? <Spinner /> : 'Recompute'}</Button><Button icon={ArrowRight} onClick={() => setStep(2)}>Continue to controls</Button></>
            : <>
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              {stageIdx === 0 && <Button icon={Send} onClick={submit} disabled={busy}>{busy ? <Spinner /> : 'Submit for review'}</Button>}
              {stageIdx === 1 && <>
                <Button variant="ghost" onClick={sendBack} disabled={busy}>Send back</Button>
                <Button icon={ShieldCheck} onClick={review} disabled={busy || (!!blockedBecause && !override.on)}>{busy ? <Spinner /> : 'Record review'}</Button>
              </>}
              {stageIdx === 2 && <Button icon={Stamp} onClick={approve} disabled={busy || (!!blockedBecause && !override.on)}>{busy ? <Spinner /> : 'Approve'}</Button>}
              {stageIdx === 3 && <Button icon={Lock} onClick={finalize} disabled={busy}>{busy ? <Spinner /> : 'Finalise & lock'}</Button>}
              {stageIdx === 4 && <Button variant="ghost" onClick={onDone}>Close</Button>}
            </>
      }>
      <div className="pm-scope">
        {step === 0 && (
          <>
            <p className="cell-sub" style={{ marginTop: 0 }}>
              {terminate ? 'Ending the lease early. ' : 'Ending the lease at expiry. '}
              This opens a settlement review — the tenancy stays active until all dues are settled and you finalise.
            </p>
            {terminate && <Field label="Reason"><Select value={reason} onChange={(e) => setReason(e.target.value)}>{REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>}
            <Field label={terminate ? 'Effective date' : 'Move-out date'}><Input type="date" value={effective} onChange={(e) => setEffective(e.target.value)} /></Field>
          </>
        )}

        {step === 1 && s && (
          <>
            <div className="pm-card" style={{ padding: 12, background: 'var(--surface-2)', marginBottom: 12 }}>
              <div className="form-grid" style={{ fontSize: 13 }}>
                <div>Deposit held <b>{money(s.deposit_held)}</b></div>
                <div>Advance held <b>{money(s.advance_rent_held)}</b></div>
                <div>Unpaid rent/service <b style={{ color: 'var(--bad)' }}>{money(s.unpaid_rent)}</b></div>
                <div>Utility dues <b style={{ color: 'var(--bad)' }}>{money(s.utility_dues)}</b></div>
              </div>
            </div>
            <div className="form-section-title" style={{ marginTop: 0 }}>Deductions</div>
            {ded.damages_lines.map((l, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 34px', gap: 8, marginBottom: 6 }}>
                <Input placeholder="Damage description" value={l.label || ''} onChange={(e) => setDamage(i, { label: e.target.value })} />
                <Input type="number" placeholder="৳" value={l.amount || ''} onChange={(e) => setDamage(i, { amount: e.target.value })} />
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDed((d) => ({ ...d, damages_lines: d.damages_lines.filter((_, idx) => idx !== i) }))}><Trash2 size={13} /></button>
              </div>
            ))}
            <Button size="sm" variant="ghost" icon={Plus} onClick={() => setDed((d) => ({ ...d, damages_lines: [...d.damages_lines, { label: '', amount: '' }] }))}>Add damage</Button>
            <div className="form-grid" style={{ marginTop: 10 }}>
              <Field label="Cleaning (৳)"><Input type="number" value={ded.cleaning} onChange={(e) => setDed({ ...ded, cleaning: e.target.value })} /></Field>
              <Field label="Extra utility dues (৳)"><Input type="number" value={ded.utility_dues} onChange={(e) => setDed({ ...ded, utility_dues: e.target.value })} /></Field>
              <Field label="Other deductions (৳)"><Input type="number" value={ded.other_deductions} onChange={(e) => setDed({ ...ded, other_deductions: e.target.value })} /></Field>
            </div>
            <NetCard s={s} isCollect={isCollect} />
          </>
        )}

        {step === 2 && s && (
          <>
            <NetCard s={s} isCollect={isCollect} big />
            <StageChain s={s} stageIdx={stageIdx} />

            {blockedBecause && (
              <div style={{ display: 'flex', gap: 9, padding: '10px 12px', borderRadius: 10, background: '#fffbeb', border: '1px solid #fde68a', marginBottom: 12 }}>
                <ShieldCheck size={16} color="#b45309" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 12.5, color: '#92400e' }}>
                  <b>Separation of duties.</b> {blockedBecause}
                  {isSuper && (
                    <div style={{ marginTop: 8 }}>
                      <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
                        <input type="checkbox" checked={override.on} onChange={(e) => setOverride({ ...override, on: e.target.checked })} />
                        Override as super admin (recorded on the settlement)
                      </label>
                      {override.on && <Input style={{ marginTop: 6 }} value={override.reason} placeholder="Why is a second person not available?"
                        onChange={(e) => setOverride({ ...override, reason: e.target.value })} />}
                    </div>
                  )}
                </div>
              </div>
            )}

            {stageIdx < 3 && (
              <Field label={stageIdx === 0 ? 'Note for the reviewer (optional)' : stageIdx === 1 ? 'Review notes (what did you check?)' : 'Approval note (optional)'}>
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder={stageIdx === 1 ? 'e.g. deposit and deductions agree to the folio and the exit report' : ''} />
              </Field>
            )}

            {stageIdx === 3 && (
              <div style={{ marginTop: 14 }}>
                <div className="form-grid">
                  <Field label={isCollect ? 'Collection method' : 'Refund method'}>
                    <Select value={ref.method} onChange={(e) => setRef({ ...ref, method: e.target.value })}>
                      <option value="bank">Bank transfer</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="cash">Cash</option><option value="cheque">Cheque</option>
                    </Select>
                  </Field>
                  <Field label="Reference"><Input value={ref.reference} onChange={(e) => setRef({ ...ref, reference: e.target.value })} placeholder="Txn / cheque no." /></Field>
                </div>
                <p className="cell-sub" style={{ fontSize: 12 }}>
                  {isCollect
                    ? 'Finalising records the collected amount into the owner’s balance and closes the tenancy. Recurring rent stops. The settlement locks — nothing can be changed after this.'
                    : 'Finalising pays the refund from the owner’s held balance to the tenant and closes the tenancy. Recurring rent stops. The settlement locks — nothing can be changed after this.'}
                </p>
              </div>
            )}

            {stageIdx > 0 && stageIdx < 4 && (
              reopening.on ? (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
                  <Field label="Why is this being reopened?">
                    <Input autoFocus value={reopening.reason} onChange={(e) => setReopening({ ...reopening, reason: e.target.value })} placeholder="e.g. tenant disputed the cleaning charge" />
                  </Field>
                  <p className="cell-sub" style={{ fontSize: 11.5, marginTop: 0 }}>Reopening clears the review and approval — the chain must run again.</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button size="sm" variant="ghost" onClick={() => setReopening({ on: false, reason: '' })}>Cancel</Button>
                    <Button size="sm" icon={Undo2} onClick={reopen} disabled={busy || !reopening.reason.trim()}>Reopen to draft</Button>
                  </div>
                </div>
              ) : (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setReopening({ on: true, reason: '' })}>
                  <Undo2 size={13} /> Reopen for changes
                </button>
              )
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}

/* The four controls, in order, with who completed each one. */
function StageChain({ s, stageIdx }) {
  const when = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : null);
  const meta = [
    s.submitted_at ? `by user #${s.submitted_by} · ${when(s.submitted_at)}` : null,
    s.reviewed_at ? `by user #${s.reviewed_by} · ${when(s.reviewed_at)}` : null,
    s.approved_at ? `by user #${s.approved_by} · ${when(s.approved_at)}` : null,
    s.locked_at ? `by user #${s.locked_by} · ${when(s.locked_at)}` : null,
  ];
  return (
    <div style={{ margin: '14px 0', padding: 12, borderRadius: 10, background: 'var(--surface-2)' }}>
      {STAGES.map((st, i) => {
        const done = i < stageIdx;
        const current = i === stageIdx;
        const Icon = done ? CheckCircle2 : current ? st.icon : Circle;
        const color = done ? 'var(--good, #15803d)' : current ? 'var(--brand, #2563eb)' : 'var(--muted, #94a3b8)';
        return (
          <div key={st.key} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '5px 0' }}>
            <Icon size={15} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12.5 }}>
              <span style={{ fontWeight: current ? 700 : 500, color: done || current ? 'var(--text)' : 'var(--muted, #94a3b8)' }}>{st.label}</span>
              {current && i < 4 && <span style={{ color: 'var(--brand, #2563eb)', fontWeight: 600 }}> — next</span>}
              {meta[i] && <div style={{ color: 'var(--muted, #94a3b8)', fontSize: 11.5 }}>{meta[i]}</div>}
            </div>
          </div>
        );
      })}
      {s.override_reason && (
        <div style={{ marginTop: 8, fontSize: 11.5, color: '#b45309', borderTop: '1px solid var(--border)', paddingTop: 8 }}>{s.override_reason}</div>
      )}
    </div>
  );
}

function NetCard({ s, isCollect, big }) {
  const amt = isCollect ? s.amount_to_collect : s.refund_amount;
  const tone = isCollect ? { bg: '#fffbeb', fg: '#b45309' } : { bg: '#ecfdf5', fg: '#15803d' };
  return (
    <div style={{ marginTop: 14, padding: big ? 18 : 12, borderRadius: 12, background: tone.bg, textAlign: 'center' }}>
      <div style={{ fontSize: 12.5, color: tone.fg, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5 }}>
        {isCollect ? 'Collect from tenant → owner balance' : 'Refund to tenant (funded from owner)'}
      </div>
      <div style={{ fontSize: big ? 30 : 22, fontWeight: 800, color: tone.fg, marginTop: 4 }}>{money(amt)}</div>
      <div style={{ fontSize: 11.5, color: tone.fg }}>Deposit {money(s.deposit_held)} + advance {money(s.advance_rent_held)} − deductions {money(s.total_deductions)}</div>
    </div>
  );
}
