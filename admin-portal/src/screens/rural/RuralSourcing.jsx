import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, Button, Field, Input, Select, Textarea, Drawer, Spinner, Badge } from '../../ui/kit';

/**
 * Rural Tenant Sourcing — the tenant side of the Rural Rent console.
 *
 * The SOP pipeline (requirement → search → shortlist) rides the three register
 * definitions the client's CRM workbook already defined: 158 requirement,
 * 159 property search, 160 shortlist. This is the pipeline view over them; the
 * same rows remain visible through Compliance → Registers.
 */
const TABS = [['briefs', 'Tenant briefs'], ['search', 'Property search'], ['shortlist', 'Shortlist']];

const EMPTY = {
  briefs: { requirement: '', required: 'Yes', notes: '' },
  search: { property_id: '', location: '', type: '', rent: '', source: 'Internal database', status: 'Identified' },
  shortlist: { property: '', inspection_date: '', outcome: '', priority: 'Medium' },
};

const OUTCOME_TONE = { Shortlisted: 'green', Rejected: 'red', Inspected: 'blue' };

export default function RuralSourcing() {
  const toast = useToast();
  const [tab, setTab] = useState('briefs');
  const [rows, setRows] = useState(null);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(null);

  const load = useCallback(async () => {
    setRows(null);
    try {
      const { data } = await api.get(`/rural-sourcing/${tab}`);
      setRows(data.data || []);
      setSummary(data.summary || null);
    } catch {
      setRows([]);
      toast.error('Could not load the sourcing register');
    }
  }, [tab, toast]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      await api.post(`/rural-sourcing/${tab}`, form);
      toast.success('Saved');
      setForm(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Save failed');
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <PageHead
        title="Rural · Tenant Sourcing"
        desc="Requirement, property search and shortlist — the SOP pipeline over the registers the CRM workbook defines."
      />

      <div className="tabs" style={{ margin: '12px 0' }}>
        {TABS.map(([k, label]) => (
          <button key={k} type="button" className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-head between">
          <div>
            {summary && (
              <span className="cell-sub">
                {summary.total} row(s)
                {Object.entries(summary.byOutcome || {}).map(([k, v]) => (
                  <Badge key={k} tone={OUTCOME_TONE[k] || 'grey'} style={{ marginLeft: 6 }}>{k}: {v}</Badge>
                ))}
              </span>
            )}
          </div>
          <Button icon={Plus} onClick={() => setForm({ ...EMPTY[tab] })}>Add</Button>
        </div>
        <div className="card-pad">
          {rows === null ? <Spinner /> : (
            <table className="data-table" style={{ width: '100%' }}>
              {tab === 'briefs' && (
                <>
                  <thead><tr><th>Requirement</th><th>Required</th><th>Notes</th></tr></thead>
                  <tbody>
                    {rows.length === 0 && <tr><td colSpan={3} className="cell-sub">No tenant briefs yet.</td></tr>}
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className="cell-strong">{r.requirement || '—'}</td>
                        <td className="cell-sub">{r.required || '—'}</td>
                        <td className="cell-sub">{r.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
              {tab === 'search' && (
                <>
                  <thead><tr><th>Location</th><th>Type</th><th>Rent</th><th>Source</th><th>Status</th></tr></thead>
                  <tbody>
                    {rows.length === 0 && <tr><td colSpan={5} className="cell-sub">No properties searched yet.</td></tr>}
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className="cell-strong">{r.location || '—'}</td>
                        <td className="cell-sub">{r.type || '—'}</td>
                        <td>{r.rent || '—'}</td>
                        <td className="cell-sub">{r.source || '—'}</td>
                        <td><Badge tone="grey">{r.status || 'Identified'}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
              {tab === 'shortlist' && (
                <>
                  <thead><tr><th>Property</th><th>Inspection</th><th>Outcome</th><th>Priority</th></tr></thead>
                  <tbody>
                    {rows.length === 0 && <tr><td colSpan={4} className="cell-sub">Nothing shortlisted yet.</td></tr>}
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className="cell-strong">{r.property || '—'}</td>
                        <td className="cell-sub">{r.inspection_date || '—'}</td>
                        <td><Badge tone={OUTCOME_TONE[r.outcome] || 'grey'}>{r.outcome || 'unrecorded'}</Badge></td>
                        <td className="cell-sub">{r.priority || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          )}
        </div>
      </div>

      {form && (
        <Drawer
          open
          title={`Add — ${TABS.find(([k]) => k === tab)[1]}`}
          width={480}
          onClose={() => setForm(null)}
          footer={(
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          )}
        >
          {tab === 'briefs' && (
            <>
              <Field label="Requirement *">
                <Input value={form.requirement} onChange={set('requirement')} placeholder="Agricultural land, fishery, orchard…" />
              </Field>
              <Field label="Required">
                <Select value={form.required} onChange={set('required')}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </Select>
              </Field>
              <Field label="Notes"><Textarea rows={3} value={form.notes} onChange={set('notes')} placeholder="Land area, district, budget, lease term…" /></Field>
            </>
          )}
          {tab === 'search' && (
            <>
              <Field label="Location"><Input value={form.location} onChange={set('location')} placeholder="District / upazila / mouza" /></Field>
              <Field label="Property type"><Input value={form.type} onChange={set('type')} /></Field>
              <Field label="Rent"><Input type="number" value={form.rent} onChange={set('rent')} /></Field>
              <Field label="Source">
                <Select value={form.source} onChange={set('source')}>
                  <option>Internal database</option>
                  <option>Active listings</option>
                  <option>Off-market</option>
                  <option>Rural network</option>
                  <option>Landlord referral</option>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={form.status} onChange={set('status')}>
                  <option>Identified</option>
                  <option>Contacted</option>
                  <option>Unavailable</option>
                </Select>
              </Field>
            </>
          )}
          {tab === 'shortlist' && (
            <>
              <Field label="Property"><Input value={form.property} onChange={set('property')} /></Field>
              <Field label="Inspection date"><Input type="date" value={form.inspection_date} onChange={set('inspection_date')} /></Field>
              <Field label="Outcome">
                <Select value={form.outcome} onChange={set('outcome')}>
                  <option value="">— not yet —</option>
                  <option>Inspected</option>
                  <option>Shortlisted</option>
                  <option>Rejected</option>
                </Select>
              </Field>
              <Field label="Priority">
                <Select value={form.priority} onChange={set('priority')}>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </Select>
              </Field>
            </>
          )}
        </Drawer>
      )}
    </div>
  );
}
