// admin-portal/src/screens/sales/settlement-desk/MatchBankView.jsx
//
// View 4 — Match bank. Every cleared, not-yet-reconciled payment, with
// client-ranked candidate trust-bank lines (exact signed-amount matches first).
// Confirm a match against a real bank line + an uploaded statement document, or
// import a bank line. A match is never fabricated; unmatched rows stay as
// outstanding exceptions.
import React, { useState } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { Button, Input, Field, Select, Badge } from '../../../ui/kit';
import UploadButton from '../../../ui/UploadButton';
import { money, deskRoles, STATUS_TONE } from './settlementMoney';

const STMT_RE = /^\/uploads\/documents\/[a-z0-9._-]+$/i;
const minor = (v) => Math.round(Number(v || 0) * 100);

export default function MatchBankView({ picture, desk }) {
  const { user } = useAuth();
  const { canAccounts } = deskRoles(user);
  const [forms, setForms] = useState({}); // paymentId -> { bank_statement_line_id, statement_url }
  const [importOpen, setImportOpen] = useState(false);
  const [imp, setImp] = useState({ date: new Date().toISOString().slice(0, 10), description: '', reference: '', amount: '' });

  if (!picture.settlement) return <div className="pm-card card-pad">No settlement yet.</div>;
  const sid = picture.settlement.id;
  const locked = picture.settlement.status === 'locked';

  const pending = picture.payments.filter((p) => p.status === 'cleared' && p.reconciliation_status !== 'reconciled');
  const expectedMinor = (p) => (p.direction === 'incoming' ? 1 : -1) * minor(p.amount);
  const candidatesFor = (p) => picture.bankLines
    .filter((l) => l.status === 'unmatched' || (l.matched_entity_type === 'sale_payment' && Number(l.matched_entity_id) === Number(p.id)))
    .map((l) => ({ l, exact: minor(l.amount) === expectedMinor(p) }))
    .sort((a, b) => (b.exact - a.exact));

  // Default the bank line to the top exact candidate; once the user touches the
  // row, `forms[p.id]` holds their edits.
  const formFor = (p) => forms[p.id] || { bank_statement_line_id: candidatesFor(p).find((c) => c.exact)?.l.id || '', statement_url: '' };
  const setForm = (p, patch) => setForms((prev) => ({ ...prev, [p.id]: { ...formFor(p), ...patch } }));

  const match = (p) => {
    const f = formFor(p);
    if (!f.bank_statement_line_id) return;
    if (!STMT_RE.test(String(f.statement_url || ''))) return;
    desk.call(() => api.post(`/sales/payments/${p.id}/reconcile`, {
      reconciliation_status: 'reconciled',
      bank_statement_line_id: Number(f.bank_statement_line_id),
      statement_url: f.statement_url,
    }), 'Payment matched');
  };

  const importLine = () => {
    const amt = Number(imp.amount);
    if (!imp.date || !amt) return;
    desk.call(() => api.post(`/sales/settlements/${sid}/bank-lines`, {
      date: imp.date, description: imp.description, reference: imp.reference, amount: amt,
    }), 'Bank line imported').then((ok) => { if (ok) { setImp({ date: new Date().toISOString().slice(0, 10), description: '', reference: '', amount: '' }); setImportOpen(false); } });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="pm-card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>Payments awaiting a bank match</h3>
          {canAccounts && !locked && <Button size="sm" variant="ghost" onClick={() => setImportOpen((v) => !v)}>{importOpen ? 'Close' : 'Import a bank line'}</Button>}
        </div>

        {importOpen && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 8, padding: 8, background: 'var(--wash, #f8fafc)', borderRadius: 6 }}>
            <Field label="Date" required><Input type="date" value={imp.date} onChange={(e) => setImp({ ...imp, date: e.target.value })} /></Field>
            <Field label="Description"><Input value={imp.description} onChange={(e) => setImp({ ...imp, description: e.target.value })} /></Field>
            <Field label="Reference"><Input value={imp.reference} onChange={(e) => setImp({ ...imp, reference: e.target.value })} /></Field>
            <Field label="Signed amount (+ in / − out)" required><Input type="number" step="0.01" value={imp.amount} onChange={(e) => setImp({ ...imp, amount: e.target.value })} /></Field>
            <Button onClick={importLine} disabled={!imp.date || !Number(imp.amount)}>Import</Button>
          </div>
        )}

        {pending.length === 0 ? (
          <p className="cell-sub" style={{ marginTop: 8 }}>Nothing awaiting a match — every cleared payment is reconciled.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            {pending.map((p) => {
              const cands = candidatesFor(p);
              const f = formFor(p);
              return (
                <div key={p.id} className="pm-card card-pad" style={{ border: '1px solid var(--line, #e5e7eb)' }}>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Badge tone={STATUS_TONE[p.direction === 'incoming' ? 'received' : 'in_progress'] || 'grey'}>{p.direction === 'incoming' ? 'Receipt' : 'Payout'}</Badge>
                    <strong className="pm-num">{money(p.amount)}</strong>
                    <span className="cell-sub">{p.reference || `#${p.id}`}</span>
                  </div>
                  {cands.length === 0 ? (
                    <p className="cell-sub" style={{ marginTop: 8 }}>No candidate bank line yet — import the matching statement line above. (Exception: stays outstanding until matched.)</p>
                  ) : (
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 8 }}>
                      <Field label="Matching bank line">
                        <Select value={f.bank_statement_line_id} onChange={(e) => setForm(p, { bank_statement_line_id: e.target.value })}>
                          <option value="">Select…</option>
                          {cands.map(({ l, exact }) => (
                            <option key={l.id} value={l.id}>{(l.date || '').slice(0, 10)} · {money(l.amount)} · {l.reference || l.description || `#${l.id}`}{exact ? ' · exact match' : ''}</option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Bank statement document" required>
                        <UploadButton value={f.statement_url} onChange={(url) => setForm(p, { statement_url: url })} folder="documents" label="Upload statement" />
                      </Field>
                      <Button disabled={!canAccounts || locked || !f.bank_statement_line_id || !STMT_RE.test(String(f.statement_url || ''))} onClick={() => match(p)}>Match</Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {!canAccounts && <p className="cell-sub">Reconciliation requires the accounts role.</p>}
      </div>
    </div>
  );
}
