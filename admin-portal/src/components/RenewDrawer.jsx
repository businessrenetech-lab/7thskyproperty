import React, { useState } from 'react';
import { RefreshCw, FileSignature, TrendingUp, Download, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Drawer, Spinner, Button, Field, Input, Badge } from '../ui/kit';

/* Renew a tenancy — two paths:
   · Quick renew: extend at the same terms, no re-signing.
   · Renew with changes: review rent/service, auto-issue an increment notice,
     then send a renewal agreement for e-signing.                            */
const money = (v) => '৳' + Number(v || 0).toLocaleString();
const pct = (from, to) => { const f = Number(from || 0); if (!f) return null; return Math.round(((Number(to || 0) - f) / f) * 100); };

export default function RenewDrawer({ tenancy: t, onClose, onDone }) {
  const toast = useToast();
  const [mode, setMode] = useState('quick'); // 'quick' | 'changes'
  const [busy, setBusy] = useState(false);
  const [proposed, setProposed] = useState(null); // increment info after proposing
  const [months, setMonths] = useState(t.minimum_lease_period_months || 12);
  const [f, setF] = useState({
    new_rent: t.monthly_rent || '', new_service_charge: t.service_charge || '',
    new_lease_end: '', effective_date: t.lease_end ? new Date(new Date(t.lease_end).getTime() + 86400000).toISOString().slice(0, 10) : '',
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const quickRenew = async () => {
    setBusy(true);
    try { const { data } = await api.post(`/tenancies/${t.id}/renewal/quick`, { months }); toast.success(data.message); onDone?.(); }
    catch (e) { toast.error(e.response?.data?.error || 'Renew failed.'); }
    finally { setBusy(false); }
  };

  const propose = async () => {
    if (!f.new_lease_end) { toast.error('Set the new lease end date.'); return; }
    setBusy(true);
    try {
      const { data } = await api.post(`/tenancies/${t.id}/renewal/propose`, {
        new_rent: f.new_rent, new_service_charge: f.new_service_charge, new_lease_end: f.new_lease_end, effective_date: f.effective_date,
      });
      setProposed(data.increment || { has_increase: false });
      toast.success(data.message);
    } catch (e) { toast.error(e.response?.data?.error || 'Propose failed.'); }
    finally { setBusy(false); }
  };

  const sendAgreement = async () => {
    setBusy(true);
    try {
      await api.post(`/tenancies/${t.id}/renewal/decide`, { decision: 'approved', note: 'Approved by staff from the property renewal workflow.' });
      const { data } = await api.post(`/tenancies/${t.id}/send-agreement`, { renewal: true });
      toast.success(data.message); onDone?.();
    }
    catch (e) { toast.error(e.response?.data?.error || 'Could not send the renewal agreement.'); }
    finally { setBusy(false); }
  };

  const downloadNotice = async () => {
    try {
      const { buildIncrementNoticeBlob } = await import('../utils/sspcPdf');
      const blob = await buildIncrementNoticeBlob({ tenancy: t, increment: proposed, effective_date: f.effective_date || f.new_lease_end });
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `rent-notice-${t.tenancy_code}.pdf`; a.click(); URL.revokeObjectURL(url);
    } catch { toast.error('Could not generate the notice PDF.'); }
  };

  const rentPct = pct(t.monthly_rent, f.new_rent);
  const svcPct = pct(t.service_charge, f.new_service_charge);

  return (
    <Drawer title={`Renew tenancy — ${t.tenancy_code}`} width={560} onClose={onClose}
      footer={mode === 'quick'
        ? <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={RefreshCw} onClick={quickRenew} disabled={busy}>{busy ? <Spinner /> : 'Quick renew'}</Button></>
        : proposed
          ? <><Button variant="ghost" onClick={onClose}>Close</Button><Button icon={FileSignature} onClick={sendAgreement} disabled={busy}>{busy ? <Spinner /> : 'Approve & send renewal agreement'}</Button></>
          : <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button icon={TrendingUp} onClick={propose} disabled={busy}>{busy ? <Spinner /> : 'Propose & notify'}</Button></>}>
      <div className="pm-scope">
        <div className="pm-seg" style={{ marginBottom: 14 }}>
          <button className={mode === 'quick' ? 'on' : ''} onClick={() => { setMode('quick'); setProposed(null); }}>Quick renew</button>
          <button className={mode === 'changes' ? 'on' : ''} onClick={() => setMode('changes')}>Renew with changes</button>
        </div>

        <div className="pm-card" style={{ padding: 12, background: 'var(--surface-2)', marginBottom: 14, fontSize: 13 }}>
          Current: <b>{money(t.monthly_rent)}</b>/mo + {money(t.service_charge)} service · lease ends <b>{t.lease_end || '—'}</b>
        </div>

        {mode === 'quick' ? (
          <>
            <p className="cell-sub" style={{ marginTop: 0 }}>Extend the lease at the same rent and service charge — no new signing.</p>
            <Field label="Extend by (months)"><Input type="number" value={months} onChange={(e) => setMonths(e.target.value)} /></Field>
          </>
        ) : proposed ? (
          <div style={{ textAlign: 'center', padding: '6px 0' }}>
            <CheckCircle2 size={34} color="#16a34a" />
            <h4 style={{ margin: '8px 0 4px' }}>{proposed.has_increase ? 'Increment notice issued' : 'Renewal proposed'}</h4>
            <p className="cell-sub" style={{ margin: 0 }}>{proposed.has_increase ? (proposed.emailed ? 'The rent/service review notice was emailed to the tenant.' : proposed.email_reason || 'The notice was logged for manual delivery.') : 'No increase — proceeding to the renewal agreement.'}</p>
            {proposed.has_increase && (
              <div className="pm-card" style={{ padding: 12, margin: '12px 0', textAlign: 'left', fontSize: 13 }}>
                {Number(proposed.rent_to) > Number(proposed.rent_from) && <div>Rent: {money(proposed.rent_from)} → <b>{money(proposed.rent_to)}</b></div>}
                {Number(proposed.service_to) > Number(proposed.service_from) && <div>Service: {money(proposed.service_from)} → <b>{money(proposed.service_to)}</b></div>}
                <div className="cell-sub">Effective {f.effective_date || f.new_lease_end}</div>
              </div>
            )}
            {proposed.has_increase && <Button variant="ghost" icon={Download} onClick={downloadNotice}>Download notice PDF</Button>}
            <p className="cell-sub" style={{ fontSize: 12, marginTop: 12 }}>Next: send the renewal agreement for e-signing. The new terms go live once signed.</p>
          </div>
        ) : (
          <>
            <div className="form-grid">
              <Field label="New monthly rent (৳)">
                <Input type="number" value={f.new_rent} onChange={(e) => set('new_rent', e.target.value)} />
                {rentPct != null && rentPct !== 0 && <div style={{ fontSize: 11.5, color: rentPct > 0 ? '#b45309' : '#15803d', marginTop: 3 }}>{rentPct > 0 ? '+' : ''}{rentPct}% vs current</div>}
              </Field>
              <Field label="New service charge (৳)">
                <Input type="number" value={f.new_service_charge} onChange={(e) => set('new_service_charge', e.target.value)} />
                {svcPct != null && svcPct !== 0 && <div style={{ fontSize: 11.5, color: svcPct > 0 ? '#b45309' : '#15803d', marginTop: 3 }}>{svcPct > 0 ? '+' : ''}{svcPct}% vs current</div>}
              </Field>
              <Field label="New lease end date"><Input type="date" value={f.new_lease_end} onChange={(e) => set('new_lease_end', e.target.value)} /></Field>
              <Field label="Effective date"><Input type="date" value={f.effective_date} onChange={(e) => set('effective_date', e.target.value)} /></Field>
            </div>
            <p className="cell-sub" style={{ fontSize: 12 }}>An increase automatically issues a rent/service review notice to the tenant, then a renewal agreement is sent for signing.</p>
          </>
        )}
      </div>
    </Drawer>
  );
}
