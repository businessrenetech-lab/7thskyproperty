import React, { useCallback, useEffect, useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { usePmScope } from '../../config/pmScope';
import { useToast } from '../../context/ToastContext';
import { PageHead, Button, Field, Input, Select, Textarea, Drawer, Spinner, Badge, StatCard } from '../../ui/kit';

/**
 * Rural disputes — ownership, boundary, succession, encumbrance, access,
 * environmental, regulatory and tenant default (SOP §6 Step 4).
 *
 * A dispute is a `property_risks` row with a lifecycle: raised → under review →
 * escalated → resolved → closed. The stages, the categories and what each row may
 * do next all come from the API, so the frontend never guesses a transition the
 * backend would refuse.
 */
const STAGE_TONE = {
  raised: 'blue', under_review: 'amber', escalated: 'red', resolved: 'green', closed: 'grey',
};
const label = (s) => String(s || '').replace(/_/g, ' ');

/**
 * `scope` picks the category list: 'rent' offers the eight lease-side risks,
 * 'sale' the eleven sale-side ones. Without it the API returns the union, which
 * would offer a Rural Rent user "Registration Delay".
 */
export default function RuralDisputes({ scope: disputeScope = 'rent' }) {
  const scope = usePmScope();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [meta, setMeta] = useState({ stages: [], categories: [], by_stage: {}, escalated: 0 });
  const [stage, setStage] = useState('');
  const [properties, setProperties] = useState([]);
  const [form, setForm] = useState(null);
  const [move, setMove] = useState(null);

  useEffect(() => {
    api.get(`/properties?category=${scope.category}&listing_type=${scope.listingType || 'rent'}&limit=200`)
      .then(({ data }) => setProperties(data.data || []))
      .catch(() => setProperties([]));
  }, [scope.category, scope.listingType]);

  const load = useCallback(async () => {
    setRows(null);
    try {
      const { data } = await api.get(`/property-risks/disputes?scope=${disputeScope}${stage ? `&dispute_stage=${stage}` : ''}`);
      setRows(data.data || []);
      setMeta(data.meta || {});
    } catch {
      setRows([]);
      toast.error('Could not load the dispute register');
    }
  }, [stage, disputeScope, toast]);
  useEffect(() => { load(); }, [load]);

  const raise = async () => {
    try {
      await api.post(`/property-risks/disputes?scope=${disputeScope}`, { ...form, property_id: Number(form.property_id) || null });
      toast.success('Dispute raised');
      setForm(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Could not raise the dispute');
    }
  };

  const advance = async () => {
    try {
      const { data } = await api.patch(`/property-risks/${move.id}/dispute-stage`, {
        dispute_stage: move.dispute_stage,
        note: move.note || undefined,
        escalated_to: move.escalated_to || undefined,
        resolution: move.resolution || undefined,
      });
      toast.success(data.message || 'Dispute updated');
      setMove(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Could not move the dispute');
    }
  };

  const open = (rows || []).filter((d) => !['resolved', 'closed'].includes(d.dispute_stage)).length;

  return (
    <div>
      <PageHead
        title="Rural · Disputes"
        desc="Ownership, boundary, succession, access, environmental and regulatory disputes — raised, escalated and resolved with a recorded trail (SOP §6 Step 4)."
        actions={<Button icon={Plus} onClick={() => setForm({ risk_category: (meta.categories || [])[0] || '', description: '', property_id: '', likelihood: 'Medium', impact: 'High' })}>Raise dispute</Button>}
      />

      <div className="grid grid-4" style={{ marginTop: 12 }}>
        <StatCard icon={AlertTriangle} label="Open disputes" value={rows === null ? '—' : open} tone="amber" />
        <StatCard icon={AlertTriangle} label="Escalated" value={meta.escalated ?? '—'} tone="red" />
        <StatCard icon={AlertTriangle} label="Resolved" value={meta.by_stage?.resolved ?? '—'} tone="green" />
        <StatCard icon={AlertTriangle} label="Closed" value={meta.by_stage?.closed ?? '—'} tone="blue" />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-head between">
          <Select value={stage} onChange={(e) => setStage(e.target.value)} style={{ minWidth: 200 }}>
            <option value="">All stages</option>
            {(meta.stages || []).map((s) => (
              <option key={s} value={s}>{label(s)}{meta.by_stage?.[s] !== undefined ? ` (${meta.by_stage[s]})` : ''}</option>
            ))}
          </Select>
          {rows !== null && <span className="cell-sub">{rows.length} dispute{rows.length === 1 ? '' : 's'}</span>}
        </div>
        <div className="card-pad">
          {rows === null ? <Spinner /> : (
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr><th>Code</th><th>Category</th><th>Description</th><th>Stage</th><th>Escalated to</th><th>Resolved</th><th /></tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={7} className="cell-sub">No disputes recorded.</td></tr>}
                {rows.map((d) => (
                  <tr key={d.id}>
                    <td className="cell-strong">{d.risk_code}</td>
                    <td>{d.risk_category || '—'}</td>
                    <td className="cell-sub" style={{ maxWidth: 320 }}>{d.description || '—'}</td>
                    <td>
                      <Badge tone={STAGE_TONE[d.dispute_stage] || 'grey'} dot>{label(d.dispute_stage)}</Badge>
                      {d.needs_attention && <span className="cell-sub"> · needs attention</span>}
                    </td>
                    <td className="cell-sub">{d.escalated_to || '—'}</td>
                    <td className="cell-sub">{d.resolved_on || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {/* Only the transitions the API will accept are offered. */}
                      {(d.next_stages || []).length === 0
                        ? <span className="cell-sub">—</span>
                        : (d.next_stages || []).map((s) => (
                          <Button key={s} size="sm" variant="ghost" onClick={() => setMove({ id: d.id, code: d.risk_code, dispute_stage: s })}>
                            {label(s)}
                          </Button>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {form && (
        <Drawer
          open
          title="Raise a dispute"
          width={480}
          onClose={() => setForm(null)}
          footer={(
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
              <Button onClick={raise} disabled={!form.risk_category || !form.description}>Raise</Button>
            </div>
          )}
        >
          <Field label="Property">
            <Select value={form.property_id} onChange={(e) => setForm({ ...form, property_id: e.target.value })}>
              <option value="">Not property-specific</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.property_code} — {p.title}{p.mouza ? ` · ${p.mouza}` : ''}</option>
              ))}
            </Select>
          </Field>
          <Field label="Category" required>
            <Select value={form.risk_category} onChange={(e) => setForm({ ...form, risk_category: e.target.value })}>
              {(meta.categories || []).map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="What is disputed" required full>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Likelihood">
            <Select value={form.likelihood} onChange={(e) => setForm({ ...form, likelihood: e.target.value })}>
              {['Low', 'Medium', 'High'].map((v) => <option key={v} value={v}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Impact">
            <Select value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })}>
              {['Low', 'Medium', 'High'].map((v) => <option key={v} value={v}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Mitigation / first action" full>
            <Textarea rows={2} value={form.mitigation || ''} onChange={(e) => setForm({ ...form, mitigation: e.target.value })} />
          </Field>
        </Drawer>
      )}

      {move && (
        <Drawer
          open
          title={`${move.code} → ${label(move.dispute_stage)}`}
          width={460}
          onClose={() => setMove(null)}
          footer={(
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setMove(null)}>Cancel</Button>
              <Button onClick={advance}>Confirm</Button>
            </div>
          )}
        >
          {/* The API refuses an escalation with no recipient and a resolution with
              no text, so both are asked for here rather than discovered on save. */}
          {move.dispute_stage === 'escalated' && (
            <Field label="Escalated to" required>
              <Input
                value={move.escalated_to || ''}
                onChange={(e) => setMove({ ...move, escalated_to: e.target.value })}
                placeholder="AC Land, legal counsel, union office…"
              />
            </Field>
          )}
          {move.dispute_stage === 'resolved' && (
            <>
              <Field label="Resolution" required full>
                <Textarea rows={3} value={move.resolution || ''} onChange={(e) => setMove({ ...move, resolution: e.target.value })} />
              </Field>
              <Field label="Resolved on">
                <Input type="date" value={move.resolved_on || ''} onChange={(e) => setMove({ ...move, resolved_on: e.target.value })} />
              </Field>
            </>
          )}
          <Field label="Note for the trail" full>
            <Textarea rows={2} value={move.note || ''} onChange={(e) => setMove({ ...move, note: e.target.value })} />
          </Field>
        </Drawer>
      )}
    </div>
  );
}
