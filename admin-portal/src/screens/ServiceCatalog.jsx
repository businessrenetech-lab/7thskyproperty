import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, ChevronRight, ChevronDown, Plus, Edit, Trash2, FolderPlus, Wrench, Package, Droplet } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Spinner, Badge, Button, Drawer, Field, Input, Select, Textarea, EmptyState } from '../ui/kit';

const money = (v) => '৳' + Number(v || 0).toLocaleString();
const FEE_MODELS = [['fixed', 'Fixed price'], ['quote', 'Quote / on assessment'], ['hourly', 'Hourly'], ['per_visit', 'Per visit'], ['call_out', 'Call-out'], ['amc', 'AMC (contract)']];
const DELIVERY = [['either', 'Provider or internal'], ['provider', 'Third-party provider'], ['internal', 'Our own team']];

// Flatten the category tree into rows with depth, for the left rail.
function flatten(nodes, depth = 0, out = []) {
  for (const n of nodes) { out.push({ ...n, depth }); if (n.children?.length) flatten(n.children, depth + 1, out); }
  return out;
}
const countServices = (n) => (n.services?.length || 0) + (n.children || []).reduce((a, c) => a + countServices(c), 0);

export default function ServiceCatalog() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState([]);
  const [vertical, setVertical] = useState('water_tank');
  const [verticals, setVerticals] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [catDrawer, setCatDrawer] = useState(null);   // { mode, data }
  const [svcDrawer, setSvcDrawer] = useState(null);   // { mode, data }

  const load = useCallback(async (v) => {
    setLoading(true);
    try {
      const [vr, tr] = await Promise.all([
        api.get('/service-catalog/verticals'),
        api.get(`/service-catalog/tree?vertical=${v || vertical}`),
      ]);
      setVerticals(vr.data.data || []);
      setTree(tr.data.data || []);
      // auto-expand roots
      const exp = {}; (tr.data.data || []).forEach((r) => { exp[r.id] = true; });
      setExpanded((e) => ({ ...exp, ...e }));
    } catch { toast.error('Failed to load service catalog'); } finally { setLoading(false); }
  }, [vertical, toast]);
  useEffect(() => { load(vertical); }, [vertical, load]);

  const flat = useMemo(() => flatten(tree), [tree]);
  const visibleFlat = flat.filter((n) => {
    // hide a node if any ancestor is collapsed
    let d = n.depth, i = flat.indexOf(n) - 1;
    while (i >= 0 && d > 0) { const a = flat[i]; if (a.depth === d - 1) { if (!expanded[a.id]) return false; d = a.depth; } i--; }
    return true;
  });
  const selected = useMemo(() => flat.find((n) => n.id === selectedId) || tree[0] || null, [flat, selectedId, tree]);

  const saveCategory = async (form) => {
    try {
      if (catDrawer.mode === 'edit') await api.put(`/service-catalog/categories/${form.id}`, form);
      else await api.post('/service-catalog/categories', { ...form, vertical });
      toast.success('Category saved'); setCatDrawer(null); load(vertical);
    } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
  };
  const deleteCategory = async (id) => {
    try { await api.delete(`/service-catalog/categories/${id}`); toast.success('Category deleted'); load(vertical); }
    catch (e) { toast.error(e.response?.data?.error || 'Delete failed'); }
  };
  const saveService = async (form) => {
    try {
      if (svcDrawer.mode === 'edit') await api.put(`/service-catalog/items/${form.id}`, form);
      else await api.post('/service-catalog/items', { ...form, vertical, category_id: selected?.id });
      toast.success('Service saved'); setSvcDrawer(null); load(vertical);
    } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
  };
  const deleteService = async (id) => {
    try { await api.delete(`/service-catalog/items/${id}`); toast.success('Service deleted'); load(vertical); }
    catch (e) { toast.error(e.response?.data?.error || 'Delete failed'); }
  };

  return (
    <div className="pm-scope">
      <PageHead title="Property Care Services"
        desc="Your service catalog — categories, sub-categories, services and the fee each one carries."
        actions={<Button icon={FolderPlus} onClick={() => setCatDrawer({ mode: 'create', data: { parent_id: null } })}>New top category</Button>} />

      {verticals.length > 1 && (
        <div className="pm-segment" style={{ marginBottom: 16 }}>
          {verticals.map((v) => <button key={v.vertical} className={vertical === v.vertical ? 'on' : ''} onClick={() => setVertical(v.vertical)}>{v.name}</button>)}
        </div>
      )}

      {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : !tree.length ? (
        <div className="pm-card"><EmptyState icon={Layers} title="No services yet" hint="Create your first category to start building the catalog." /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }} className="pm-detail-grid">
          {/* Category tree */}
          <div className="pm-card" style={{ overflow: 'hidden' }}>
            <div className="pm-card-h"><div className="ic"><Droplet size={16} /></div><h3>Categories</h3></div>
            <div style={{ padding: '4px 8px 12px' }}>
              {visibleFlat.map((n) => {
                const hasKids = (n.children?.length || 0) > 0;
                const isSel = selected?.id === n.id;
                return (
                  <div key={n.id} className="pm-cat-row" onClick={() => setSelectedId(n.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 8px', paddingLeft: 8 + n.depth * 16, borderRadius: 8, cursor: 'pointer', background: isSel ? 'var(--cyan-weak)' : 'transparent' }}>
                    <button onClick={(e) => { e.stopPropagation(); setExpanded((x) => ({ ...x, [n.id]: !x[n.id] })); }} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)', width: 16, padding: 0, visibility: hasKids ? 'visible' : 'hidden' }}>
                      {expanded[n.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: isSel ? 700 : 600, color: isSel ? 'var(--navy)' : 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.name}</span>
                    <Badge tone="grey">{countServices(n)}</Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected category detail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="pm-card">
              <div className="pm-card-h" style={{ flexWrap: 'wrap' }}>
                <div className="ic"><Package size={16} /></div>
                <div><h3>{selected?.name || 'Select a category'}</h3><div className="hsub">{selected?.code}{selected?.description ? ` · ${selected.description}` : ''}</div></div>
                <div className="sp" />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button size="sm" variant="ghost" icon={FolderPlus} onClick={() => setCatDrawer({ mode: 'create', data: { parent_id: selected?.id } })}>Sub-category</Button>
                  <Button size="sm" variant="ghost" icon={Edit} onClick={() => setCatDrawer({ mode: 'edit', data: selected })}>Edit</Button>
                  <Button size="sm" variant="ghost" icon={Trash2} onClick={() => window.confirm('Delete this category?') && deleteCategory(selected.id)}>Delete</Button>
                  <Button size="sm" icon={Plus} onClick={() => setSvcDrawer({ mode: 'create', data: { fee_model: 'quote', sspc_fee_type: 'percentage', sspc_fee_value: 20, provider_pay_type: 'remainder', delivery_mode: 'either' } })}>Add service</Button>
                </div>
              </div>
              <div className="pm-card-body flush" style={{ overflowX: 'auto' }}>
                {selected?.services?.length ? (
                  <table className="pm-tbl">
                    <thead><tr><th>Service</th><th>Fee model</th><th>Base price</th><th>Our fee</th><th>Delivery</th><th>Status</th><th /></tr></thead>
                    <tbody>
                      {selected.services.map((s) => (
                        <tr key={s.id} onClick={() => setSvcDrawer({ mode: 'edit', data: s })}>
                          <td><div className="cell-strong">{s.name}</div><div className="cell-sub">{s.code}{s.unit ? ` · ${s.unit}` : ''}</div></td>
                          <td><Badge tone="blue">{(FEE_MODELS.find((f) => f[0] === s.fee_model) || [])[1] || s.fee_model}</Badge></td>
                          <td className="pm-num">{Number(s.base_price) > 0 ? money(s.base_price) : <span className="cell-sub">On quote</span>}</td>
                          <td className="pm-num">{s.sspc_fee_type === 'percentage' ? `${Number(s.sspc_fee_value)}%` : money(s.sspc_fee_value)}</td>
                          <td><Badge tone={s.delivery_mode === 'internal' ? 'green' : s.delivery_mode === 'provider' ? 'amber' : 'grey'}>{(DELIVERY.find((d) => d[0] === s.delivery_mode) || [])[1]}</Badge></td>
                          <td>{s.is_active ? <Badge tone="green" dot>Active</Badge> : <Badge tone="grey" dot>Inactive</Badge>}</td>
                          <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="ghost" icon={Trash2} onClick={() => window.confirm(`Delete "${s.name}"?`) && deleteService(s.id)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="pm-empty"><div className="ic"><Wrench size={22} /></div>No services in this category yet. Add one, or create a sub-category.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {catDrawer && <CategoryDrawer drawer={catDrawer} onClose={() => setCatDrawer(null)} onSave={saveCategory} />}
      {svcDrawer && <ServiceDrawer drawer={svcDrawer} categoryName={selected?.name} onClose={() => setSvcDrawer(null)} onSave={saveService} />}
    </div>
  );
}

function CategoryDrawer({ drawer, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', description: '', icon: '', is_active: true, ...drawer.data });
  return (
    <Drawer title={drawer.mode === 'edit' ? 'Edit category' : (form.parent_id ? 'New sub-category' : 'New category')} width={460} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => form.name ? onSave(form) : null} disabled={!form.name}>Save</Button></>}>
      <Field label="Name" required><Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Residential Services" /></Field>
      <Field label="Description"><Textarea rows={2} value={form.description || ''} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} /></Field>
      <Field label="Active"><Select value={form.is_active ? '1' : '0'} onChange={(e) => setForm((s) => ({ ...s, is_active: e.target.value === '1' }))}><option value="1">Active</option><option value="0">Inactive</option></Select></Field>
    </Drawer>
  );
}

function ServiceDrawer({ drawer, categoryName, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', description: '', fee_model: 'quote', base_price: 0, unit: '', sspc_fee_type: 'percentage', sspc_fee_value: 20, provider_pay_type: 'remainder', provider_pay_value: 0, delivery_mode: 'either', requires_site_assessment: false, is_active: true, ...drawer.data });
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  return (
    <Drawer title={drawer.mode === 'edit' ? 'Edit service' : `New service${categoryName ? ' · ' + categoryName : ''}`} width={560} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => form.name ? onSave(form) : null} disabled={!form.name}>Save service</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Field label="Service name" required><Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Rooftop Water Tank Cleaning" /></Field>
        <Field label="Description"><Textarea rows={2} value={form.description || ''} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="form-grid">
          <Field label="Fee model"><Select value={form.fee_model} onChange={(e) => set('fee_model', e.target.value)}>{FEE_MODELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
          <Field label="Base price (৳)"><Input type="number" value={form.base_price} onChange={(e) => set('base_price', e.target.value)} /></Field>
          <Field label="Unit"><Input value={form.unit || ''} onChange={(e) => set('unit', e.target.value)} placeholder="per tank / per visit…" /></Field>
          <Field label="Delivery"><Select value={form.delivery_mode} onChange={(e) => set('delivery_mode', e.target.value)}>{DELIVERY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        </div>
        <div className="form-section-title">Seventh Sky fee &amp; provider split</div>
        <div className="form-grid">
          <Field label="Our fee type"><Select value={form.sspc_fee_type} onChange={(e) => set('sspc_fee_type', e.target.value)}><option value="percentage">% of service value</option><option value="fixed">Fixed ৳</option></Select></Field>
          <Field label={form.sspc_fee_type === 'percentage' ? 'Our fee (%)' : 'Our fee (৳)'}><Input type="number" value={form.sspc_fee_value} onChange={(e) => set('sspc_fee_value', e.target.value)} /></Field>
          <Field label="Provider paid"><Select value={form.provider_pay_type} onChange={(e) => set('provider_pay_type', e.target.value)}><option value="remainder">Remainder after our fee</option><option value="percentage">% of service value</option><option value="fixed">Fixed ৳</option></Select></Field>
          {form.provider_pay_type !== 'remainder' && <Field label={form.provider_pay_type === 'percentage' ? 'Provider (%)' : 'Provider (৳)'}><Input type="number" value={form.provider_pay_value} onChange={(e) => set('provider_pay_value', e.target.value)} /></Field>}
        </div>
        <div className="form-grid">
          <Field label="Requires site assessment"><Select value={form.requires_site_assessment ? '1' : '0'} onChange={(e) => set('requires_site_assessment', e.target.value === '1')}><option value="0">No</option><option value="1">Yes</option></Select></Field>
          <Field label="Status"><Select value={form.is_active ? '1' : '0'} onChange={(e) => set('is_active', e.target.value === '1')}><option value="1">Active</option><option value="0">Inactive</option></Select></Field>
        </div>
        <div className="cell-sub" style={{ fontSize: 12 }}>The fee split decides how a work order divides client payment between Seventh Sky income and the provider payout.</div>
      </div>
    </Drawer>
  );
}
