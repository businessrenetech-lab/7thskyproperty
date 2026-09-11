// admin-portal/src/screens/sales/LeadAutomation.jsx
//
// Lead automation admin: routing rules (how new enquiries are assigned) and
// follow-up sequences (staged templated messages on a business-day cadence).
// Read/writes /api/sales/lead-rules + /api/sales/lead-sequences; steps pick
// from /api/message-templates.
import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Sparkles, Route } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, Button, Spinner, Badge, Field, Input, Select, Drawer, DataTable, EmptyState } from '../../ui/kit';

const emptyRule = { name: '', priority: 100, match_category: '', match_area: '', match_source: '', assign_to: '', assign_pool: '', default_sequence_id: '', active: true };
const emptySeq = { name: '', active: true, steps: [{ day_offset: 0, channel: 'email', template_id: '' }] };

export default function LeadAutomation() {
  const toast = useToast();
  const [tab, setTab] = useState('rules');
  const [rules, setRules] = useState(null);
  const [sequences, setSequences] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [drawer, setDrawer] = useState(null); // { kind: 'rule'|'seq', form, id? }

  const load = useCallback(async () => {
    try {
      const [r, s, t] = await Promise.all([
        api.get('/sales/lead-rules'),
        api.get('/sales/lead-sequences'),
        api.get('/message-templates').catch(() => ({ data: { data: [] } })),
      ]);
      setRules(r.data.data || []);
      setSequences(s.data.data || []);
      setTemplates(t.data.data || t.data || []);
    } catch { toast.error('Failed to load lead automation'); setRules([]); setSequences([]); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const seqName = (id) => sequences?.find((s) => s.id === Number(id))?.name || '—';
  const tplName = (id) => templates.find((t) => t.id === Number(id))?.name || `#${id}`;

  // ── save handlers ──
  const saveRule = async () => {
    const f = drawer.form;
    if (!f.name) { toast.error('Name is required'); return; }
    const payload = {
      ...f,
      priority: Number(f.priority) || 100,
      match_category: f.match_category || null,
      match_area: f.match_area || null,
      match_source: f.match_source || null,
      assign_to: f.assign_to ? Number(f.assign_to) : null,
      assign_pool: f.assign_pool ? String(f.assign_pool).split(',').map((x) => Number(x.trim())).filter(Boolean) : null,
      default_sequence_id: f.default_sequence_id ? Number(f.default_sequence_id) : null,
    };
    try {
      if (drawer.id) await api.put(`/sales/lead-rules/${drawer.id}`, payload);
      else await api.post('/sales/lead-rules', payload);
      toast.success('Rule saved'); setDrawer(null); load();
    } catch (e) { toast.error(e.response?.data?.error || 'Could not save the rule'); }
  };
  const saveSeq = async () => {
    const f = drawer.form;
    if (!f.name) { toast.error('Name is required'); return; }
    const steps = (f.steps || []).filter((s) => s.template_id);
    if (!steps.length) { toast.error('Add at least one step with a template'); return; }
    try {
      if (drawer.id) await api.put(`/sales/lead-sequences/${drawer.id}`, { ...f, steps });
      else await api.post('/sales/lead-sequences', { ...f, steps });
      toast.success('Sequence saved'); setDrawer(null); load();
    } catch (e) { toast.error(e.response?.data?.error || 'Could not save the sequence'); }
  };
  const removeRule = async (id) => { try { await api.delete(`/sales/lead-rules/${id}`); toast.success('Rule removed'); load(); } catch { toast.error('Could not remove'); } };
  const removeSeq = async (id) => { try { await api.delete(`/sales/lead-sequences/${id}`); toast.success('Sequence removed'); load(); } catch { toast.error('Could not remove'); } };

  // ── step editor helpers ──
  const setStep = (i, patch) => setDrawer((d) => ({ ...d, form: { ...d.form, steps: d.form.steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) } }));
  const addStep = () => setDrawer((d) => ({ ...d, form: { ...d.form, steps: [...d.form.steps, { day_offset: 0, channel: 'email', template_id: '' }] } }));
  const removeStep = (i) => setDrawer((d) => ({ ...d, form: { ...d.form, steps: d.form.steps.filter((_, idx) => idx !== i) } }));

  const loading = rules === null || sequences === null;

  return (
    <>
      <PageHead
        title="Lead Automation"
        desc="Route new enquiries to officers by rule, and nurture them with follow-up sequences."
        actions={
          tab === 'rules'
            ? <Button icon={Plus} onClick={() => setDrawer({ kind: 'rule', form: { ...emptyRule } })}>Add rule</Button>
            : <Button icon={Plus} onClick={() => setDrawer({ kind: 'seq', form: { ...emptySeq, steps: [{ day_offset: 0, channel: 'email', template_id: '' }] } })}>Add sequence</Button>
        }
      />

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <Button variant={tab === 'rules' ? 'primary' : 'ghost'} icon={Route} onClick={() => setTab('rules')}>Routing rules</Button>
        <Button variant={tab === 'sequences' ? 'primary' : 'ghost'} icon={Sparkles} onClick={() => setTab('sequences')}>Sequences</Button>
      </div>

      {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : tab === 'rules' ? (
        <DataTable
          rows={rules}
          empty={<EmptyState icon={Route} title="No routing rules" sub="Without a rule, new leads round-robin across active sales officers." />}
          columns={[
            { key: 'priority', header: 'Priority' },
            { key: 'name', header: 'Name' },
            { key: 'match', header: 'Match', render: (r) => [r.match_category, r.match_area, r.match_source].filter(Boolean).join(' / ') || 'Any' },
            { key: 'target', header: 'Target', render: (r) => (r.assign_to ? `Officer #${r.assign_to}` : (Array.isArray(r.assign_pool) && r.assign_pool.length ? `Pool (${r.assign_pool.length})` : 'Round-robin')) },
            { key: 'seq', header: 'Sequence', render: (r) => (r.default_sequence_id ? seqName(r.default_sequence_id) : '—') },
            { key: 'active', header: 'Active', render: (r) => <Badge tone={r.active ? 'green' : 'grey'}>{r.active ? 'Active' : 'Off'}</Badge> },
            { key: 'actions', header: '', render: (r) => (
              <span style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="ghost" onClick={() => setDrawer({ kind: 'rule', id: r.id, form: { ...emptyRule, ...r, assign_to: r.assign_to || '', default_sequence_id: r.default_sequence_id || '', assign_pool: Array.isArray(r.assign_pool) ? r.assign_pool.join(',') : '' } })}>Edit</Button>
                <Button size="sm" variant="ghost" icon={Trash2} onClick={() => removeRule(r.id)}>Delete</Button>
              </span>
            ) },
          ]}
        />
      ) : (
        <DataTable
          rows={sequences}
          empty={<EmptyState icon={Sparkles} title="No sequences" sub="Create a follow-up sequence of templated messages on a business-day cadence." />}
          columns={[
            { key: 'name', header: 'Name' },
            { key: 'steps', header: 'Steps', render: (s) => (Array.isArray(s.steps) ? s.steps.length : 0) },
            { key: 'cadence', header: 'Cadence', render: (s) => (Array.isArray(s.steps) ? s.steps.map((x) => `d${x.day_offset}`).join(', ') : '') },
            { key: 'active', header: 'Active', render: (s) => <Badge tone={s.active ? 'green' : 'grey'}>{s.active ? 'Active' : 'Off'}</Badge> },
            { key: 'actions', header: '', render: (s) => (
              <span style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="ghost" onClick={() => setDrawer({ kind: 'seq', id: s.id, form: { name: s.name, active: s.active, steps: (Array.isArray(s.steps) && s.steps.length ? s.steps : [{ day_offset: 0, channel: 'email', template_id: '' }]).map((x) => ({ ...x, template_id: x.template_id || '' })) } })}>Edit</Button>
                <Button size="sm" variant="ghost" icon={Trash2} onClick={() => removeSeq(s.id)}>Delete</Button>
              </span>
            ) },
          ]}
        />
      )}

      {drawer?.kind === 'rule' && (
        <Drawer title={drawer.id ? 'Edit routing rule' : 'New routing rule'} onClose={() => setDrawer(null)}
          footer={<><Button variant="ghost" onClick={() => setDrawer(null)}>Cancel</Button><Button onClick={saveRule}>Save</Button></>}>
          <Field label="Name" required><Input value={drawer.form.name} onChange={(e) => setDrawer((d) => ({ ...d, form: { ...d.form, name: e.target.value } }))} /></Field>
          <Field label="Priority (lower runs first)"><Input type="number" value={drawer.form.priority} onChange={(e) => setDrawer((d) => ({ ...d, form: { ...d.form, priority: e.target.value } }))} /></Field>
          <Field label="Match category (blank = any)"><Select value={drawer.form.match_category} onChange={(e) => setDrawer((d) => ({ ...d, form: { ...d.form, match_category: e.target.value } }))}><option value="">Any</option>{['residential', 'commercial', 'rural', 'business'].map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
          <Field label="Match area (blank = any)"><Input value={drawer.form.match_area} onChange={(e) => setDrawer((d) => ({ ...d, form: { ...d.form, match_area: e.target.value } }))} /></Field>
          <Field label="Match source (blank = any)"><Input value={drawer.form.match_source} onChange={(e) => setDrawer((d) => ({ ...d, form: { ...d.form, match_source: e.target.value } }))} placeholder="website / walk_in / referral…" /></Field>
          <Field label="Assign to officer id (single)"><Input type="number" value={drawer.form.assign_to} onChange={(e) => setDrawer((d) => ({ ...d, form: { ...d.form, assign_to: e.target.value } }))} placeholder="leave blank to use pool / round-robin" /></Field>
          <Field label="Or pool of officer ids (comma-separated)"><Input value={drawer.form.assign_pool} onChange={(e) => setDrawer((d) => ({ ...d, form: { ...d.form, assign_pool: e.target.value } }))} placeholder="e.g. 4,5,6" /></Field>
          <Field label="Enrol into sequence on match"><Select value={drawer.form.default_sequence_id} onChange={(e) => setDrawer((d) => ({ ...d, form: { ...d.form, default_sequence_id: e.target.value } }))}><option value="">None</option>{(sequences || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Active"><Select value={drawer.form.active ? '1' : '0'} onChange={(e) => setDrawer((d) => ({ ...d, form: { ...d.form, active: e.target.value === '1' } }))}><option value="1">Active</option><option value="0">Off</option></Select></Field>
        </Drawer>
      )}

      {drawer?.kind === 'seq' && (
        <Drawer title={drawer.id ? 'Edit sequence' : 'New sequence'} onClose={() => setDrawer(null)} width={520}
          footer={<><Button variant="ghost" onClick={() => setDrawer(null)}>Cancel</Button><Button onClick={saveSeq}>Save</Button></>}>
          <Field label="Name" required><Input value={drawer.form.name} onChange={(e) => setDrawer((d) => ({ ...d, form: { ...d.form, name: e.target.value } }))} /></Field>
          <Field label="Active"><Select value={drawer.form.active ? '1' : '0'} onChange={(e) => setDrawer((d) => ({ ...d, form: { ...d.form, active: e.target.value === '1' } }))}><option value="1">Active</option><option value="0">Off</option></Select></Field>
          <div style={{ fontWeight: 700, fontSize: 13, margin: '10px 0 6px' }}>Steps (business days from enrolment)</div>
          {drawer.form.steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-end', marginBottom: 8 }}>
              <Field label="Day"><Input type="number" style={{ width: 70 }} value={s.day_offset} onChange={(e) => setStep(i, { day_offset: Number(e.target.value) || 0 })} /></Field>
              <Field label="Channel"><Select value={s.channel} onChange={(e) => setStep(i, { channel: e.target.value })}><option value="email">Email</option><option value="sms">SMS</option></Select></Field>
              <Field label="Template"><Select value={s.template_id} onChange={(e) => setStep(i, { template_id: e.target.value })}><option value="">Select…</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
              <Button size="sm" variant="ghost" icon={Trash2} onClick={() => removeStep(i)} />
            </div>
          ))}
          <Button size="sm" variant="ghost" icon={Plus} onClick={addStep}>Add step</Button>
          {templates.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>No message templates yet — create them from the Sales Inbox composer first.</p>}
        </Drawer>
      )}
    </>
  );
}
