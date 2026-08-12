import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Pencil, Download, Mail, FileSignature, RefreshCw, Trash2, Loader2, Check, Ban,
  Send, MessageSquare, FileText, ClipboardList, ChevronRight, Eye,
} from 'lucide-react';
import api from '../../services/api';
import {
  WtHead, Pill, Loading, EmptyState, dateFmt, dateTimeFmt, bdt,
  toast, errText, parseJson,
} from './common';
import RecordComments from './RecordComments';
import QuotationSendDrawer from './QuotationSend';

/*
 * One quotation — its own route, reading as the document the client receives,
 * with every action that moves it forward: edit, download, email, approve,
 * and turn it into the Customer Service Agreement.
 */

const DECISIONS = ['Pending', 'Sent', 'Approved', 'Rejected'];

const Section = ({ icon: Icon, title, right, children }) => (
  <div className="wt-asec">
    <div className="wt-asec-h">
      <Icon size={15} style={{ color: 'var(--wt-accent-ink)' }} />
      <h3>{title}</h3>
      {right}
    </div>
    <div className="wt-asec-b">{children}</div>
  </div>
);

export default function QuotationDetail() {
  const { code } = useParams();
  const nav = useNavigate();
  const [q, setQ] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.get(`/wt-quotes/${code}/document`)
      .then(({ data }) => { setQ(data.quote); setClient(data.client); })
      .catch((e) => { setQ(null); setError(errText(e, 'Could not load this quotation')); })
      .finally(() => setLoading(false));
  }, [code]);
  useEffect(load, [load]);

  const buildPdf = async () => {
    const { data: doc } = await api.get(`/wt-quotes/${q.id}/document`);
    const { default: html2pdf } = await import('html2pdf.js');
    const holder = document.createElement('div');
    holder.style.width = '794px';
    holder.innerHTML = doc.html;
    document.body.appendChild(holder);
    try {
      return await html2pdf().set({
        margin: [10, 10, 12, 10],
        filename: `Quotation-${doc.quote.code}.pdf`,
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(holder).outputPdf('blob');
    } finally { document.body.removeChild(holder); }
  };

  const download = async () => {
    setBusy('pdf');
    try {
      const blob = await buildPdf();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `Quotation-${q.code}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast.ok('Quotation PDF downloaded');
    } catch (e) { toast.err(errText(e, 'Could not build the PDF')); }
    finally { setBusy(''); }
  };

  const preview = async () => {
    try {
      const { data: doc } = await api.get(`/wt-quotes/${q.id}/document`);
      const w = window.open('', '_blank');
      if (w) { w.document.write(doc.html); w.document.close(); }
      else toast.err('Allow pop-ups to preview the quotation.');
    } catch (e) { toast.err(errText(e)); }
  };

  const setDecision = async (decision) => {
    setBusy('decision');
    try {
      const { data } = await api.patch(`/wt-ops/quotations/${q.id}`, { decision });
      setQ((s) => ({ ...s, ...data }));
      toast.ok(`${q.code} → ${decision}`);
    } catch (e) { toast.err(errText(e, 'Could not update the quotation')); }
    finally { setBusy(''); }
  };

  const remove = async () => {
    setBusy('del');
    try {
      await api.delete(`/wt-ops/quotations/${q.id}`);
      toast.ok(`${q.code} deleted`);
      nav('/water-tank/quotations');
    } catch (e) { toast.err(errText(e, 'Could not delete')); setBusy(''); }
  };

  if (loading) return <Loading />;
  if (error || !q) return (
    <>
      <WtHead title="Quotation not found"
        crumb={<div className="wt-crumb"><span className="lnk" onClick={() => nav('/water-tank/quotations')}>Quotations</span></div>} />
      <div className="wt-card"><EmptyState eyebrow="Error" title={`No quotation with code ${code}`} hint={error}
        action={<button className="wt-btn primary" onClick={() => nav('/water-tank/quotations')}>Back to the register</button>} /></div>
    </>
  );

  const lines = parseJson(q.lines, []) || [];
  const services = lines.filter((l) => l.kind !== 'fee');
  const fees = lines.filter((l) => l.kind === 'fee');
  const lineTotal = (l) => Number(l.price || 0) * (Number(l.qty) || 1);
  const decision = String(q.decision || '').toLowerCase();
  const editPath = q.source_assessment
    ? `/water-tank/site-assessments/${q.source_assessment}/quotation`
    : `/water-tank/quotations/${q.code}/edit`;

  const lineRows = (rows, label) => (rows.length ? (
    <>
      <tr className="wt-grouprow"><td colSpan={6}>{label}</td></tr>
      {rows.map((l, i) => {
        const adjusted = Number(l.standard_price) > 0 && Number(l.price) !== Number(l.standard_price);
        return (
          <tr key={`${label}-${i}`}>
            <td className="id">{l.code || '—'}</td>
            <td>
              <strong>{l.name}</strong>
              {l.description && <div className="cell-sub">{l.description}</div>}
              {adjusted && <div className="cell-sub" style={{ color: 'var(--wt-accent-ink)' }}>Standard {bdt(l.standard_price)} · agreed {bdt(l.price)}</div>}
            </td>
            <td className="muted">{l.unit || '—'}</td>
            <td style={{ textAlign: 'center' }}>{Number(l.qty) || 1}</td>
            <td style={{ textAlign: 'right' }}>{bdt(l.price)}</td>
            <td style={{ textAlign: 'right', fontWeight: 700 }}>{bdt(lineTotal(l))}</td>
          </tr>
        );
      })}
    </>
  ) : null);

  return (
    <>
      <WtHead
        crumb={<div className="wt-crumb">
          <span className="lnk" onClick={() => nav('/water-tank/quotations')}>Quotations</span>
          {' › '}<span style={{ color: 'var(--wt-accent-ink)' }}>{q.code}</span>
        </div>}
        title={q.client_name}
        subtitle={`${q.code} · ${bdt(q.total)}${q.source_assessment ? ` · from assessment ${q.source_assessment}` : ''}`}
      >
        <button className="wt-btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
        <button className="wt-btn" onClick={preview}><Eye size={14} /> Preview</button>
        <button className="wt-btn" onClick={() => nav(editPath)}><Pencil size={14} /> Edit</button>
        <button className="wt-btn primary" disabled={busy === 'pdf'} onClick={download}>
          {busy === 'pdf' ? <Loader2 size={14} className="wt-spin" /> : <Download size={14} />} PDF
        </button>
      </WtHead>

      {/* ── status strip ── */}
      <div className="wt-statusstrip">
        <Pill value={q.decision} />
        <span className="wt-pill cyan">{lines.length} line{lines.length === 1 ? '' : 's'}</span>
        <span className="wt-pill blue">{bdt(q.total)}</span>
        {q.validity && <span className="wt-pill slate">Valid {q.validity}</span>}
        {q.sent_at
          ? <span className="wt-pill green"><Send size={11} /> Emailed {dateFmt(q.sent_at)}</span>
          : <span className="wt-pill amber">Not yet sent</span>}
        {q.agreement_code && <span className="wt-pill green"><FileSignature size={11} /> {q.agreement_code}</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {decision !== 'approved' && (
            <button className="wt-btn sm" disabled={!!busy} onClick={() => setDecision('Approved')}><Check size={12} /> Approve</button>
          )}
          {decision !== 'rejected' && decision !== 'approved' && (
            <button className="wt-btn sm" disabled={!!busy} onClick={() => setDecision('Rejected')}><Ban size={12} /> Reject</button>
          )}
        </div>
      </div>

      <div className="wt-detail-grid" style={{ gridTemplateColumns: '340px 1fr' }}>
        {/* ── left rail ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignSelf: 'start' }}>
          <div className="wt-card wt-detailcard">
            <div className="eyebrow">Quotation</div>
            <div className="wt-profile">
              {[['Number', q.code], ['Client', q.client_name], ['Project', q.project_id],
                ['From assessment', q.source_assessment], ['Raised', dateFmt(q.createdAt)],
                ['Validity', q.validity], ['Decision', q.decision],
                ['Emailed to', q.sent_to], ['Emailed on', q.sent_at ? dateTimeFmt(q.sent_at) : null],
                ['Agreement', q.agreement_code]]
                .map(([k, v]) => <div className="f" key={k}><div className="k">{k}</div><div className="v">{v || '—'}</div></div>)}
            </div>
          </div>

          {client && (
            <div className="wt-card wt-detailcard">
              <div className="eyebrow">Client</div>
              <div className="wt-profile">
                {[['Name', client.name], ['Mobile', client.mobile], ['Email', client.email],
                  ['Address', client.service_address], ['Property', client.property_type],
                  ['Tank', [client.tank_type, client.tank_capacity].filter(Boolean).join(' · ')]]
                  .map(([k, v]) => <div className="f" key={k}><div className="k">{k}</div><div className="v">{v || '—'}</div></div>)}
              </div>
              <button className="wt-btn" style={{ justifyContent: 'center' }} onClick={() => nav(`/water-tank/clients/${client.code}`)}>
                Open client file <ChevronRight size={13} />
              </button>
            </div>
          )}

          <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="wt-sec-title">Actions</div>
            <button className="wt-btn" style={{ justifyContent: 'center' }} disabled={busy === 'pdf'} onClick={download}>
              {busy === 'pdf' ? <Loader2 size={14} className="wt-spin" /> : <Download size={14} />} Download PDF
            </button>
            <button className="wt-btn" style={{ justifyContent: 'center' }} onClick={() => setSending(true)}>
              <Mail size={14} /> {q.sent_at ? 'Re-send to client' : 'Email to client'}
            </button>
            <button className="wt-btn" style={{ justifyContent: 'center', borderColor: 'var(--wt-accent)', color: 'var(--wt-accent-ink)' }}
              onClick={() => nav(q.source_assessment
                ? `/water-tank/site-assessments/${q.source_assessment}/quotation/${q.code}/agreement`
                : `/water-tank/quotations/${q.code}/agreement`)}>
              <FileSignature size={14} /> {q.agreement_code ? 'Agreement raised' : 'Create Service Agreement'}
            </button>
            {q.source_assessment && (
              <button className="wt-btn" style={{ justifyContent: 'center' }}
                onClick={() => nav(`/water-tank/site-assessments/${q.source_assessment}`)}>
                <ClipboardList size={14} /> View site assessment
              </button>
            )}
            <button className="wt-btn danger-ghost" style={{ justifyContent: 'center', marginRight: 0 }} disabled={busy === 'del'} onClick={remove}>
              <Trash2 size={14} /> Delete quotation
            </button>
          </div>
        </div>

        {/* ── document body ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Section icon={FileText} title="Cost Sheet"
            right={<button className="wt-btn sm" onClick={() => nav(editPath)}><Pencil size={12} /> Edit lines</button>}>
            {lines.length ? (
              <table className="wt-tbl">
                <thead><tr>
                  <th style={{ width: 88 }}>Code</th><th>Description</th><th style={{ width: 92 }}>Unit</th>
                  <th style={{ width: 56, textAlign: 'center' }}>Qty</th>
                  <th style={{ width: 104, textAlign: 'right' }}>Rate</th>
                  <th style={{ width: 110, textAlign: 'right' }}>Amount</th>
                </tr></thead>
                <tbody>
                  {lineRows(services, 'Services')}
                  {lineRows(fees, 'Additional Fees & Materials')}
                </tbody>
              </table>
            ) : <EmptyState eyebrow="Cost sheet" title="No lines on this quotation"
              action={<button className="wt-btn primary" onClick={() => nav(editPath)}>Add services</button>} />}

            <div style={{ marginLeft: 'auto', width: 320 }}>
              <div className="wt-costrow"><span>Service charges</span><span>{bdt(q.service_charges)}</span></div>
              {Number(q.other_fees) > 0 && <div className="wt-costrow"><span>Additional fees</span><span>{bdt(q.other_fees)}</span></div>}
              {Number(q.provider_allocation_fee) > 0 && <div className="wt-costrow"><span>Provider allocation</span><span>{bdt(q.provider_allocation_fee)}</span></div>}
              {Number(q.discount) > 0 && <div className="wt-costrow"><span style={{ color: 'var(--wt-green)' }}>Discount</span><span style={{ color: 'var(--wt-green)' }}>− {bdt(q.discount)}</span></div>}
              <div className="wt-costrow"><span>VAT &amp; processing</span><span>{q.vat_exempt ? 'Exempt' : bdt(q.vat)}</span></div>
              <div className="wt-costrow total"><span>Total Payable</span><span className="amt">{bdt(q.total)}</span></div>
            </div>
          </Section>

          {(q.payment_terms || q.notes) && (
            <Section icon={FileText} title="Terms & Notes">
              {q.payment_terms && (
                <div>
                  <div className="wt-sec-title" style={{ marginBottom: 4 }}>Payment terms</div>
                  <p style={{ fontSize: 12.5, color: 'var(--wt-ink-2)', lineHeight: 1.6, margin: 0 }}>{q.payment_terms}</p>
                </div>
              )}
              {q.notes && (
                <div>
                  <div className="wt-sec-title" style={{ marginBottom: 4 }}>Notes to the client</div>
                  <p style={{ fontSize: 12.5, color: 'var(--wt-ink-2)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{q.notes}</p>
                </div>
              )}
            </Section>
          )}

          <Section icon={MessageSquare} title="Comments & Observations">
            <RecordComments entityType="quotations" entityId={q.id} />
          </Section>
        </div>
      </div>

      {sending && (
        <QuotationSendDrawer
          quote={q} client={client} buildPdf={buildPdf}
          onClose={() => setSending(false)}
          onSent={(to) => { setSending(false); setQ((s) => ({ ...s, sent_at: new Date().toISOString(), sent_to: to, decision: s.decision === 'Pending' ? 'Sent' : s.decision })); }}
        />
      )}
    </>
  );
}
