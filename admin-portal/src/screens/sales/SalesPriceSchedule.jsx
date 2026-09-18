// admin-portal/src/screens/sales/SalesPriceSchedule.jsx
//
// The editable Schedule C price schedules for the property SALES / RENTAL lines
// — the same idea as the Water Tank "Price Schedule", for Residential (Sale,
// Purchase/Buy, Rental Management, Tenancy) and Commercial (Sale, Purchase/Buy).
// A price edited here becomes the new standard price quotations & agreements are
// built from; signed agreements keep the figure captured at signing.
import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

const bdt = (n) => '৳' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
const PRICE_TYPES = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'from', label: 'From (min.)' },
  { value: 'percent', label: 'Percent / As agreed' },
  { value: 'included', label: 'Included' },
];
const typeLabel = (it) => {
  if (it.price_label) return it.price_label;
  if (it.price_type === 'from') return `From ${bdt(it.standard_price)}`;
  if (it.price_type === 'included') return 'Included';
  if (it.price_type === 'percent') return '% as agreed';
  return bdt(it.standard_price);
};
const blankRow = (vertical) => ({ vertical, name: '', unit: 'Service', standard_price: 0, price_type: 'fixed', price_label: '' });

export default function SalesPriceSchedule({ scope = 'residential', title, verticals }) {
  const [schedules, setSchedules] = useState([]);
  const [vertical, setVertical] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [editId, setEditId] = useState(null);   // id being edited, or 'new'
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);

  // Load the list of schedules for this scope.
  useEffect(() => {
    let alive = true;
    api.get('/sales-catalog/schedules', { params: { scope } })
      .then((r) => {
        if (!alive) return;
        // Optionally narrow to a subset of verticals (e.g. only the Property
        // Management schedules when embedded in the PM console).
        const rows = (Array.isArray(r.data) ? r.data : [])
          .filter((row) => !verticals || verticals.includes(row.vertical));
        setSchedules(rows);
        setVertical((v) => (v && rows.some((row) => row.vertical === v) ? v : rows[0]?.vertical || null));
      })
      .catch((e) => setErr(e?.response?.data?.error || 'Could not load the price schedules.'));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, (verticals || []).join(',')]);

  const load = (v) => {
    if (!v) return;
    setLoading(true); setErr(''); setEditId(null); setDraft(null);
    api.get('/sales-catalog', { params: { vertical: v } })
      .then((r) => setData(r.data))
      .catch((e) => { setData(null); setErr(e?.response?.data?.error || 'Could not load this price schedule.'); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(vertical); /* eslint-disable-next-line */ }, [vertical]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 2500); };
  const startEdit = (it) => { setEditId(it.id); setDraft({ ...it, price_label: it.price_label || '' }); };
  const startNew = () => { setEditId('new'); setDraft(blankRow(vertical)); };
  const cancel = () => { setEditId(null); setDraft(null); };
  const setD = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const save = async () => {
    if (!draft?.name?.trim()) { setErr('A service name is required.'); return; }
    setBusy(true); setErr('');
    const body = {
      name: draft.name, unit: draft.unit || null,
      standard_price: Number(draft.standard_price) || 0,
      price_type: draft.price_type, price_label: draft.price_label || null,
    };
    try {
      if (editId === 'new') await api.post('/sales-catalog', { ...body, vertical });
      else await api.patch(`/sales-catalog/${editId}`, body);
      cancel(); load(vertical); flash(editId === 'new' ? 'Item added.' : 'Price updated.');
    } catch (e) { setErr(e?.response?.data?.error || 'Could not save.'); }
    finally { setBusy(false); }
  };

  const activeMeta = useMemo(() => schedules.find((s) => s.vertical === vertical), [schedules, vertical]);
  const s = data?.summary || {};
  const items = data?.items || [];

  return (
    <div className="pm-scope sales-price-schedule" style={{ padding: '18px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>{title || `${scope === 'commercial' ? 'Commercial' : 'Residential'} · Price Schedules`}</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>
            The standard prices quotations & agreements are built from. Editing a price applies to new work only.
          </p>
        </div>
        <button className="pm-btn" onClick={startNew} disabled={!vertical}>+ New item</button>
      </div>

      {/* Schedule selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
        {schedules.map((sc) => (
          <button key={sc.vertical} onClick={() => setVertical(sc.vertical)}
            className="pm-btn"
            style={{
              background: sc.vertical === vertical ? '#0284c7' : '#fff',
              color: sc.vertical === vertical ? '#fff' : '#334155',
              border: '1px solid ' + (sc.vertical === vertical ? '#0284c7' : '#d9dee6'),
            }}>
            {sc.label} <span style={{ opacity: 0.7 }}>· {sc.count}</span>
          </button>
        ))}
      </div>

      {msg && <div className="pm-card" style={{ padding: '8px 12px', marginBottom: 12, color: '#047857', background: '#ecfdf5' }}>{msg}</div>}
      {err && <div className="pm-card" style={{ padding: '8px 12px', marginBottom: 12, color: '#b91c1c', background: '#fef2f2' }}>{err}</div>}

      {activeMeta && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <div className="pm-card" style={{ padding: '10px 14px' }}><div style={{ fontSize: 11, color: '#6b7280' }}>Items</div><b>{s.total || 0}</b></div>
          <div className="pm-card" style={{ padding: '10px 14px' }}><div style={{ fontSize: 11, color: '#6b7280' }}>Priced</div><b>{s.priced || 0}</b> <span style={{ color: '#6b7280', fontSize: 12 }}>· {s.unpriced || 0} on quote</span></div>
          <div className="pm-card" style={{ padding: '10px 14px' }}><div style={{ fontSize: 11, color: '#6b7280' }}>Average price</div><b>{bdt(s.average_price)}</b></div>
        </div>
      )}

      <div className="pm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f6f8fb', textAlign: 'left' }}>
              {['Code', 'Service', 'Unit', 'Price type', 'Standard price', ''].map((h, i) => (
                <th key={i} style={{ padding: '9px 12px', borderBottom: '1px solid #e5e9f0', textAlign: i === 4 ? 'right' : 'left', width: i === 5 ? 90 : undefined }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {editId === 'new' && draft && (
              <EditRow draft={draft} setD={setD} save={save} cancel={cancel} busy={busy} isNew />
            )}
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 18, textAlign: 'center', color: '#9aa4b2' }}>Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 18, textAlign: 'center', color: '#9aa4b2' }}>No items in this schedule yet.</td></tr>
            ) : items.map((it) => (
              editId === it.id && draft
                ? <EditRow key={it.id} draft={draft} setD={setD} save={save} cancel={cancel} busy={busy} code={it.code} />
                : (
                  <tr key={it.id} style={{ borderBottom: '1px solid #eef2f7', opacity: it.is_active ? 1 : 0.5 }}>
                    <td style={{ padding: '9px 12px', fontFamily: 'monospace', color: '#6b7280' }}>{it.code}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 600 }}>{it.name}</td>
                    <td style={{ padding: '9px 12px', color: '#6b7280' }}>{it.unit || '—'}</td>
                    <td style={{ padding: '9px 12px', color: '#6b7280' }}>{PRICE_TYPES.find((t) => t.value === it.price_type)?.label || it.price_type}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700 }}>{it.standard_price > 0 || it.price_type !== 'fixed' ? typeLabel(it) : <span style={{ color: '#9aa4b2' }}>On quote</span>}</td>
                    <td style={{ padding: '9px 12px' }}><button className="pm-link" onClick={() => startEdit(it)}>Edit</button></td>
                  </tr>
                )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditRow({ draft, setD, save, cancel, busy, isNew, code }) {
  const inp = { width: '100%', padding: '6px 8px', border: '1px solid #d9dee6', borderRadius: 6, fontSize: 13 };
  return (
    <tr style={{ background: '#f0f9ff', borderBottom: '1px solid #e5e9f0' }}>
      <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#6b7280' }}>{isNew ? 'NEW' : code}</td>
      <td style={{ padding: '8px 12px' }}><input style={inp} value={draft.name} onChange={setD('name')} placeholder="Service name" /></td>
      <td style={{ padding: '8px 12px' }}><input style={{ ...inp, width: 90 }} value={draft.unit || ''} onChange={setD('unit')} placeholder="Unit" /></td>
      <td style={{ padding: '8px 12px' }}>
        <select style={inp} value={draft.price_type} onChange={setD('price_type')}>
          {PRICE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </td>
      <td style={{ padding: '8px 12px' }}>
        <input style={{ ...inp, textAlign: 'right' }} type="number" value={draft.standard_price} onChange={setD('standard_price')} />
        {(draft.price_type === 'from' || draft.price_type === 'percent') && (
          <input style={{ ...inp, marginTop: 4, fontSize: 12 }} value={draft.price_label || ''} onChange={setD('price_label')} placeholder="Display label (optional)" />
        )}
      </td>
      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
        <button className="pm-btn" style={{ padding: '4px 10px', marginRight: 4 }} disabled={busy} onClick={save}>Save</button>
        <button className="pm-link" onClick={cancel}>Cancel</button>
      </td>
    </tr>
  );
}
