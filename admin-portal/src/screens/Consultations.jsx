import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Calendar, DollarSign, FileText, User, Briefcase } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  PageHead, Button, DataTable, StatusBadge, Badge, Drawer, Field,
  Input, Textarea, Select, KV, Spinner, EmptyState
} from '../ui/kit';

export default function Consultations() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [defs, setDefs] = useState([]);
  const [activeDef, setActiveDef] = useState(null);
  
  // Entity selectors
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);

  // Form states
  const [drawer, setDrawer] = useState(null); // 'create' | 'edit'
  const [editingEntry, setEditingEntry] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  // 1. Fetch register definitions and find Consultation register
  useEffect(() => {
    api.get('/registers/definitions')
      .then(({ data }) => {
        const list = data.data || [];
        setDefs(list);
        const consDef = list.find(d => d.register_key === 'consultation_and_phase_1');
        if (consDef) {
          setActiveDef(consDef);
        }
      })
      .catch(() => {});
      
    // Fetch clients and projects for dropdowns
    api.get('/clients?limit=100').then(({ data }) => setClients(data.data || [])).catch(() => {});
    api.get('/projects?limit=100').then(({ data }) => setProjects(data.data || [])).catch(() => {});
  }, []);

  // 2. Load entries
  const load = useCallback(async () => {
    if (!activeDef) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/registers/entries?register_definition_id=${activeDef.id}`);
      setRows(data.data || []);
    } catch {
      toast.error('Failed to load consultation entries');
    } finally {
      setLoading(false);
    }
  }, [activeDef, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm({
      consultation_date: new Date().toISOString().slice(0, 10),
      payment_status: 'Unpaid',
      proceed_to_phase_2: 'Under Consideration'
    });
    setEditingEntry(null);
    setDrawer('create');
  };

  const openEdit = (row) => {
    setEditingEntry(row);
    setForm({
      client_id: row.client_id || '',
      project_id: row.project_id || '',
      ...row.data
    });
    setDrawer('edit');
  };

  const save = async (e) => {
    e.preventDefault();
    if (!activeDef) return;
    
    // Find client and project codes/names
    const selectedClient = clients.find(c => c.id === Number(form.client_id));
    const selectedProject = projects.find(p => p.id === Number(form.project_id));
    
    setSaving(true);
    try {
      const dataPayload = {
        consultation_id: editingEntry?.data?.consultation_id || `CONS-${Date.now().toString().slice(-4)}`,
        buyer_id: selectedClient?.client_code || '—',
        project_id: selectedProject?.project_code || '—',
        consultation_date: form.consultation_date,
        topics_covered: form.topics_covered,
        budget_discussed: Number(form.budget_discussed || 0),
        finance_readiness: form.finance_readiness,
        market_feasibility: form.market_feasibility,
        concerns_identified: form.concerns_identified,
        recommendation: form.recommendation,
        phase_1_fee: Number(form.phase_1_fee || 0),
        payment_status: form.payment_status,
        proceed_to_phase_2: form.proceed_to_phase_2,
        officer_notes: form.officer_notes
      };

      const payload = {
        register_definition_id: activeDef.id,
        vertical_key: 'properties',
        client_id: form.client_id ? Number(form.client_id) : null,
        project_id: form.project_id ? Number(form.project_id) : null,
        data: dataPayload,
        status: form.payment_status
      };

      if (drawer === 'edit') {
        await api.put(`/registers/entries/${editingEntry.id}`, payload);
        toast.success('Consultation entry updated');
      } else {
        await api.post('/registers/entries', payload);
        toast.success('Consultation entry logged');
      }

      setDrawer(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save consultation');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Are you sure you want to delete this consultation record?')) return;
    try {
      await api.delete(`/registers/entries/${id}`);
      toast.success('Consultation removed');
      load();
    } catch {
      toast.error('Failed to remove consultation');
    }
  };

  const columns = [
    {
      key: 'consultation_id',
      header: 'ID',
      render: (r) => <span className="code-chip">{r.data?.consultation_id || `CONS-${r.id}`}</span>
    },
    {
      key: 'client',
      header: 'Client / Buyer',
      render: (r) => {
        const cl = clients.find(c => c.id === r.client_id);
        return (
          <div>
            <div className="cell-strong">{cl?.Contact?.full_name || '—'}</div>
            <div className="cell-sub">{cl?.client_code || '—'}</div>
          </div>
        );
      }
    },
    {
      key: 'project',
      header: 'Project Connected',
      render: (r) => {
        const pr = projects.find(p => p.id === r.project_id);
        return (
          <div>
            <div className="cell-strong">{pr?.title || '—'}</div>
            <div className="cell-sub">{pr?.project_code || '—'}</div>
          </div>
        );
      }
    },
    {
      key: 'date',
      header: 'Date',
      render: (r) => r.data?.consultation_date || '—'
    },
    {
      key: 'budget',
      header: 'Budget Discussed',
      render: (r) => r.data?.budget_discussed ? `৳ ${Number(r.data.budget_discussed).toLocaleString()}` : '—'
    },
    {
      key: 'phase_2',
      header: 'Proceed Phase 2?',
      render: (r) => <Badge tone={r.data?.proceed_to_phase_2 === 'Yes' ? 'green' : r.data?.proceed_to_phase_2 === 'No' ? 'red' : 'amber'}>{r.data?.proceed_to_phase_2 || '—'}</Badge>
    },
    {
      key: 'fee',
      header: 'Fee & Payment',
      render: (r) => (
        <div>
          <div>৳ {Number(r.data?.phase_1_fee || 0).toLocaleString()}</div>
          <Badge tone={r.data?.payment_status === 'Paid' ? 'green' : 'red'}>{r.data?.payment_status || 'Unpaid'}</Badge>
        </div>
      )
    },
    {
      key: '_actions',
      header: 'Actions',
      render: (r) => (
        <div className="row" style={{ gap: 4 }}>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(r)}><Edit2 size={13} /></button>
          <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(r.id)}><Trash2 size={13} /></button>
        </div>
      )
    }
  ];

  if (!activeDef) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;

  return (
    <>
      <PageHead
        title="Consultations"
        desc="Manage buyer property consultations, budget feasibility, and Phase 1 checklist registers."
        actions={<Button icon={Plus} onClick={openCreate}>New Consultation</Button>}
      />

      <div className="card">
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          empty={<EmptyState icon={Calendar} title="No consultations logged" sub="Log your first buyer consultation session." />}
        />
      </div>

      {drawer && (
        <Drawer
          title={drawer === 'create' ? 'New Consultation Session' : 'Edit Consultation Session'}
          onClose={() => setDrawer(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDrawer(null)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? <Spinner /> : 'Save Session'}</Button>
            </>
          }
        >
          <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-section-title">Client & Project Alignment</div>
            <div className="form-grid">
              <Field label="Buyer / Client" required>
                <Select value={form.client_id || ''} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                  <option value="">— Select Buyer —</option>
                  {clients.filter(c => c.is_buyer).map(c => (
                    <option key={c.id} value={c.id}>{c.Contact?.full_name} ({c.client_code})</option>
                  ))}
                </Select>
              </Field>
              <Field label="Project Association">
                <Select value={form.project_id || ''} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                  <option value="">— Select Project —</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.title} ({p.project_code})</option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="form-section-title">Consultation details</div>
            <div className="form-grid">
              <Field label="Consultation Date" required>
                <Input type="date" value={form.consultation_date || ''} onChange={(e) => setForm({ ...form, consultation_date: e.target.value })} />
              </Field>
              <Field label="Budget Discussed (BDT)" required>
                <Input type="number" value={form.budget_discussed || ''} onChange={(e) => setForm({ ...form, budget_discussed: e.target.value })} />
              </Field>
              <Field label="Finance Readiness" required>
                <Select value={form.finance_readiness || ''} onChange={(e) => setForm({ ...form, finance_readiness: e.target.value })}>
                  <option value="">— Select Status —</option>
                  <option value="Self Funded (Cash ready)">Self Funded (Cash ready)</option>
                  <option value="Bank Pre-approval Active">Bank Pre-approval Active</option>
                  <option value="Awaiting Loan Approval">Awaiting Loan Approval</option>
                  <option value="Overseas Transfer Pending">Overseas Transfer Pending</option>
                </Select>
              </Field>
              <Field label="Market Feasibility" required>
                <Select value={form.market_feasibility || ''} onChange={(e) => setForm({ ...form, market_feasibility: e.target.value })}>
                  <option value="">— Select Feasibility —</option>
                  <option value="Highly Feasible">Highly Feasible</option>
                  <option value="Feasible with Compromise">Feasible with Compromise</option>
                  <option value="Not Feasible at current budget">Not Feasible at current budget</option>
                </Select>
              </Field>
            </div>

            <Field label="Topics Covered / Client Requirements" required full>
              <Textarea value={form.topics_covered || ''} onChange={(e) => setForm({ ...form, topics_covered: e.target.value })} placeholder="Gulshan-2 3BHK preferences, floor height, parking space..." />
            </Field>
            
            <Field label="Concerns / Risks Identified" full>
              <Textarea value={form.concerns_identified || ''} onChange={(e) => setForm({ ...form, concerns_identified: e.target.value })} placeholder="Stamp duty cost, developer reputation worries..." />
            </Field>

            <Field label="Recommendation / Action Plan" required full>
              <Textarea value={form.recommendation || ''} onChange={(e) => setForm({ ...form, recommendation: e.target.value })} placeholder="Shortlist developer properties, arrange lawyer deeds review..." />
            </Field>

            <div className="form-section-title">Phase 1 Agreement & Closure</div>
            <div className="form-grid">
              <Field label="Phase 1 Fee (BDT)" required>
                <Input type="number" value={form.phase_1_fee || ''} onChange={(e) => setForm({ ...form, phase_1_fee: e.target.value })} />
              </Field>
              <Field label="Payment Status">
                <Select value={form.payment_status || 'Unpaid'} onChange={(e) => setForm({ ...form, payment_status: e.target.value })}>
                  <option value="Unpaid">Unpaid / Pending</option>
                  <option value="Paid">Paid</option>
                </Select>
              </Field>
              <Field label="Proceed to Phase 2?">
                <Select value={form.proceed_to_phase_2 || 'Under Consideration'} onChange={(e) => setForm({ ...form, proceed_to_phase_2: e.target.value })}>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="Under Consideration">Under Consideration</option>
                </Select>
              </Field>
            </div>
            
            <Field label="Officer Notes / Remarks" full>
              <Textarea value={form.officer_notes || ''} onChange={(e) => setForm({ ...form, officer_notes: e.target.value })} />
            </Field>
          </form>
        </Drawer>
      )}
    </>
  );
}
