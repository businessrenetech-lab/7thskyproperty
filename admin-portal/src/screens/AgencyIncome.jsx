// admin-portal/src/screens/AgencyIncome.jsx
//
// "Our fees" — read-only agency income for the property-management / accounting
// section: every agreement-fee invoice (from signed sales & PM agreements)
// rolled up into billed / received / dues / drafts, the invoice list, and the
// recurring management fees. Reads GET /invoices/agency-income.
import React, { useEffect, useState, useCallback } from 'react';
import { Wallet, RefreshCw, FileText, Eye, Download, Link2 } from 'lucide-react';
import api from '../services/api';
import { Spinner } from '../ui/kit';
import { useToast } from '../context/ToastContext';

const bdt = (v) => '৳' + Number(v || 0).toLocaleString('en-BD');
const dateFmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const chip = (s) => ({ paid: 'good', sent: 'warn', partial: 'warn', pending: 'warn', draft: 'grey', void: 'grey', overdue: 'bad' }[s] || 'grey');

export default function AgencyIncome() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all'); // all | draft | outstanding | paid | recurring

  const load = useCallback(async () => {
    setLoading(true);
    // scope=pm → only property-management + tenancy agreement fees (this is the PM
    // console's income view; sales fees live under the residential/sales section).
    try { const r = await api.get('/invoices/agency-income?scope=pm'); setData(r.data); }
    catch { toast.error('Failed to load agency income'); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const openInvoice = async (id) => {
    // The document endpoint is auth-gated, so fetch it with the token and open a
    // blob URL rather than a bare window.open (which would 401).
    try {
      const r = await api.get(`/invoices/${id}/document`, { responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { toast.error('Could not open the invoice'); }
  };

  // Online collection: generate an SSLCommerz pay-link and copy it (manual
  // recording stays available). Until the store keys are set in Settings →
  // Integrations, the backend returns a clear "not configured" message.
  const payLink = async (id) => {
    try {
      const r = await api.post(`/invoices/${id}/pay-link`);
      const url = r.data?.data?.gateway_url;
      if (!url) return toast.error('Could not create the pay-link');
      try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
      window.open(url, '_blank');
      toast.success('Pay-link created and copied');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Could not create the pay-link');
    }
  };

  const s = data?.summary || {};
  const invoices = data?.invoices || [];
  const recurring = data?.recurring || [];
  const filtered = invoices.filter((i) => {
    if (tab === 'draft') return i.status === 'draft';
    if (tab === 'paid') return i.status === 'paid' || i.balance <= 0 && i.status !== 'draft';
    if (tab === 'outstanding') return i.status !== 'draft' && i.balance > 0;
    return true;
  });

  const Stat = ({ label, value, hint, accent }) => (
    <div className="card stat" style={{ padding: '12px 16px', borderRadius: 12, borderLeft: accent ? `4px solid ${accent}` : undefined }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent || 'var(--ink)' }}>{bdt(value)}</div>
      {hint != null && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{hint}</div>}
    </div>
  );

  return (
    <div className="pm-scope">
      <div className="pm-head">
        <div><div className="pm-eyebrow">Accounting</div><h1>Agency Income — Our Fees</h1><div className="pm-meta">Agreement fees from signed sales &amp; property-management agreements — billed, received, dues, drafts, and recurring management fees. Read-only.</div></div>
        <div className="pm-head-actions"><button className="pm-btn" onClick={load} disabled={loading}><RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh</button></div>
      </div>

      {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : !data ? null : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
            <Stat label="Total billed" value={s.billed} hint={`${s.count - s.draft_count} sent invoice(s)`} accent="#0284c7" />
            <Stat label="Received" value={s.received} hint={`${s.paid_count} paid`} accent="#16a34a" />
            <Stat label="Dues (outstanding)" value={s.dues} hint={`${s.outstanding_count} awaiting payment`} accent="#d97706" />
            <Stat label="Drafts" value={s.drafted} hint={`${s.draft_count} not yet sent`} accent="#64748b" />
          </div>

          <div className="pm-segment" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
            {[['all', 'All'], ['draft', 'Drafts'], ['outstanding', 'Dues'], ['paid', 'Paid'], ['recurring', 'Recurring fees']].map(([k, l]) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>

          {tab === 'recurring' ? (
            <div className="pm-card"><div className="pm-card-body" style={{ padding: 0 }}>
              <table className="pm-tbl">
                <thead><tr><th>Fee</th><th>Category</th><th>Trigger</th><th style={{ textAlign: 'right' }}>Amount</th><th>Property</th></tr></thead>
                <tbody>
                  {recurring.map((f) => (
                    <tr key={f.id}>
                      <td><strong>{f.fee_name}</strong></td>
                      <td style={{ textTransform: 'capitalize' }}>{f.fee_category || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>{(f.fee_trigger || '').replace(/_/g, ' ')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{f.amount_type === 'percentage' ? `${f.amount_value}%` : bdt(f.amount_value)}</td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{f.property_id ? `#${f.property_id}` : '—'}</td>
                    </tr>
                  ))}
                  {!recurring.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No recurring management fees yet — they are created when a management agreement is signed.</td></tr>}
                </tbody>
              </table>
            </div></div>
          ) : (
            <div className="pm-card"><div className="pm-card-body" style={{ padding: 0 }}>
              <table className="pm-tbl">
                <thead><tr><th>Invoice</th><th>Fee</th><th>Client</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Paid</th><th style={{ textAlign: 'right' }}>Balance</th><th>Status</th><th>Due</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                <tbody>
                  {filtered.map((i) => (
                    <tr key={i.id}>
                      <td><strong style={{ color: 'var(--navy)' }}>{i.invoice_code}</strong></td>
                      <td style={{ fontSize: 12.5 }}>{i.title}</td>
                      <td style={{ fontSize: 12.5 }}>{i.contact_name || '—'}</td>
                      <td style={{ textAlign: 'right' }}>{bdt(i.total)}</td>
                      <td style={{ textAlign: 'right', color: '#16a34a' }}>{bdt(i.amount_paid)}</td>
                      <td style={{ textAlign: 'right', color: i.balance > 0 ? '#d97706' : 'var(--muted)' }}>{bdt(i.balance)}</td>
                      <td><span className={`pm-chip ${chip(i.status)}`}><span className="d" />{i.status}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>{dateFmt(i.due_date)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="pm-btn" style={{ padding: '4px 9px', fontSize: 12 }} onClick={() => openInvoice(i.id)}><Eye size={13} /> Open</button>
                        {i.status !== 'draft' && i.balance > 0 && <button className="pm-btn" style={{ padding: '4px 9px', fontSize: 12 }} onClick={() => payLink(i.id)} title="Create an online SSLCommerz pay-link"><Link2 size={13} /> Pay link</button>}
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 28, color: 'var(--muted)' }}>No invoices in this view.</td></tr>}
                </tbody>
              </table>
            </div></div>
          )}
        </>
      )}
    </div>
  );
}
