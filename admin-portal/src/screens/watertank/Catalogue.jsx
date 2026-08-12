import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, RefreshCw, Pencil, Copy, Archive, RotateCcw, Trash2, History, AlertTriangle, Check,
} from 'lucide-react';
import api from '../../services/api';
import {
  WtHead, WtTabs, Pill, bdt, dateFmt, dateTimeFmt, WtDrawer, Loading, EmptyState,
  toast, errText, titleCase,
} from './common';

/*
 * Catalogue — the standard price schedule quotations and agreements are built
 * from, and the one screen where it can be changed.
 *
 * Two things drive the design, both of them consequences of what this list is
 * for rather than preferences:
 *
 *   Usage is shown before anything is changed. A price here is the figure on
 *   signed agreements, so "3 records use this" belongs next to the edit button,
 *   not behind a confirmation dialog after the fact.
 *
 *   Withdrawing is the normal way to remove something; deleting is the
 *   exception. An item under contract cannot be deleted at all — the API
 *   refuses it — so the UI leads with Archive and keeps Delete for items
 *   nothing has ever priced against.
 */

const GROUPS = ['service', 'material', 'labour'];
const num = (v) => Number(v || 0);

const CHANGE_LABEL = {
  created: 'Added', price_changed: 'Price changed', renamed: 'Renamed',
  archived: 'Withdrawn', restored: 'Restored', cloned: 'Cloned',
};

/* ── the edit / create form ────────────────────────────────────────────── */
function ItemDrawer({ item, usage, onClose, onSaved }) {
  const editing = !!item;
  const [f, setF] = useState({
    code: item?.code || '',
    name: item?.name || '',
    description: item?.description || '',
    unit: item?.unit || '',
    standard_price: item?.standard_price ?? '',
    group: item?.group || 'service',
    notes: item?.notes || '',
    reason: '',
    effective_from: '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const committed = num(usage?.total) > 0;
  const priceMoved = editing && num(f.standard_price) !== num(item.standard_price);

  const save = async () => {
    if (!String(f.name).trim()) { setErr('Give the item a name.'); return; }
    setBusy(true); setErr('');
    try {
      const body = {
        name: f.name, description: f.description || null, unit: f.unit || null,
        standard_price: num(f.standard_price), group: f.group, notes: f.notes || null,
        reason: f.reason || null, effective_from: f.effective_from || null,
      };
      // The code is only sent when it can legally change; the API refuses it for
      // a referenced item, and sending it unchanged would be a needless refusal.
      if (!editing || (!committed && f.code !== item.code)) body.code = f.code || undefined;

      const r = editing
        ? await api.patch(`/wt-catalogue/${item.id}`, body)
        : await api.post('/wt-catalogue', body);
      (r.data.warnings || []).forEach((w) => toast.ok(w));
      toast.ok(r.data.message || 'Saved.');
      onSaved();
    } catch (e) { setErr(errText(e, 'Could not save this item')); setBusy(false); }
  };

  return (
    <WtDrawer
      title={editing ? `Edit ${item.code}` : 'New catalogue item'}
      subtitle={editing ? item.name : 'Added to the standard price schedule'}
      onClose={onClose}
      footer={<>
        <button className="wt-btn" onClick={onClose}>Cancel</button>
        <button className="wt-btn primary" disabled={busy} onClick={save}>
          <Check size={14} /> {busy ? 'Saving…' : 'Save'}
        </button>
      </>}
    >
      {err && <div className="wt-formerr">{err}</div>}

      {committed && (
        <div className="wt-note" style={{ display: 'flex', gap: 9 }}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <b>{usage.total} record{usage.total === 1 ? '' : 's'} already use {item.code}.</b>{' '}
            They keep the wording and price agreed at the time — anything you change here applies to new work only.
            The code itself is fixed, because that is how those records find this item.
          </span>
        </div>
      )}

      <div className="wt-field">
        <label>Code</label>
        <input className="wt-input" value={f.code} onChange={set('code')}
          disabled={editing && committed}
          placeholder={editing ? '' : 'Left blank, the next code in the group is used'} />
        {editing && committed && <span className="hint">Fixed — {usage.total} record(s) reference it.</span>}
      </div>

      <div className="wt-field">
        <label>Name</label>
        <input className="wt-input" value={f.name} onChange={set('name')} placeholder="e.g. Overhead Water Tank Cleaning" />
      </div>

      <div className="wt-field">
        <label>Description</label>
        <textarea className="wt-input" rows={2} value={f.description} onChange={set('description')} />
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div className="wt-field" style={{ flex: 1 }}>
          <label>Group</label>
          <select className="wt-select" value={f.group} onChange={set('group')}>
            {GROUPS.map((g) => <option key={g} value={g}>{titleCase(g)}</option>)}
          </select>
        </div>
        <div className="wt-field" style={{ flex: 1 }}>
          <label>Unit</label>
          <input className="wt-input" value={f.unit} onChange={set('unit')} placeholder="Tank / Visit / Hour" />
        </div>
      </div>

      <div className="wt-field">
        <label>Standard price</label>
        <input className="wt-input" type="number" value={f.standard_price} onChange={set('standard_price')} />
        <span className="hint">Leave at 0 for items always priced on quote.</span>
      </div>

      {priceMoved && (
        <>
          <div className="wt-field">
            <label>Reason for the change</label>
            <input className="wt-input" value={f.reason} onChange={set('reason')}
              placeholder="e.g. Annual review, supplier increase" />
            <span className="hint">Kept on the price history, so the change can be explained later.</span>
          </div>
          <div className="wt-field">
            <label>Effective from</label>
            <input className="wt-input" type="date" value={f.effective_from} onChange={set('effective_from')} />
            <span className="hint">Leave blank for today.</span>
          </div>
        </>
      )}

      <div className="wt-field">
        <label>Internal notes</label>
        <textarea className="wt-input" rows={2} value={f.notes} onChange={set('notes')} />
      </div>
    </WtDrawer>
  );
}

/* ── history + usage for one item ──────────────────────────────────────── */
function HistoryDrawer({ item, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get(`/wt-catalogue/${item.id}`).then((r) => setData(r.data)).catch(() => setData({ history: [], usage: null }));
  }, [item.id]);

  const u = data?.usage;
  const rows = [
    ['Quotations', u?.quotations], ['Work orders', u?.work_orders], ['Invoices', u?.invoices],
    ['Agreements', u?.agreements], ['Provider rates', u?.provider_rates],
  ].filter(([, n]) => num(n) > 0);

  return (
    <WtDrawer title={`${item.code} — history`} subtitle={item.name} onClose={onClose} wide
      footer={<button className="wt-btn" onClick={onClose}>Close</button>}>
      {!data ? <Loading /> : (
        <>
          <h3 className="wt-section-title" style={{ fontSize: 13, marginBottom: 10 }}>Where it is used</h3>
          {rows.length ? (
            <div style={{ display: 'grid', gap: 6, marginBottom: 22 }}>
              {rows.map(([label, n]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 11px', border: '1px solid var(--wt-line)', borderRadius: 7, fontSize: 13 }}>
                  <span className="muted">{label}</span><b>{n}</b>
                </div>
              ))}
            </div>
          ) : (
            <p className="wt-subtitle" style={{ marginBottom: 22 }}>
              Nothing has been priced against this item yet, so it can still be deleted outright.
            </p>
          )}

          <h3 className="wt-section-title" style={{ fontSize: 13, marginBottom: 10 }}>Change history</h3>
          {data.history?.length ? (
            <table className="wt-tbl">
              <thead><tr><th>When</th><th>Change</th><th style={{ textAlign: 'right' }}>Price</th><th>By</th></tr></thead>
              <tbody>
                {data.history.map((h) => (
                  <tr key={h.id}>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                      {dateTimeFmt(h.changed_at)}
                      {h.effective_from && <div style={{ fontSize: 11 }}>eff. {dateFmt(h.effective_from)}</div>}
                    </td>
                    <td>
                      {CHANGE_LABEL[h.change_type] || titleCase(h.change_type)}
                      {h.reason && <div className="muted" style={{ fontSize: 11 }}>{h.reason}</div>}
                      {h.old_name && h.new_name && h.old_name !== h.new_name
                        && <div className="muted" style={{ fontSize: 11 }}>“{h.old_name}” → “{h.new_name}”</div>}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {h.old_price != null && num(h.old_price) !== num(h.new_price)
                        ? <><span className="muted" style={{ textDecoration: 'line-through' }}>{bdt(h.old_price)}</span> {bdt(h.new_price)}</>
                        : (h.new_price != null ? bdt(h.new_price) : '—')}
                    </td>
                    <td className="muted">{h.actor || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState eyebrow="History" title="No changes recorded yet" />}
        </>
      )}
    </WtDrawer>
  );
}

/* ── screen ────────────────────────────────────────────────────────────── */
export default function Catalogue() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('All');
  const [editing, setEditing] = useState(null);   // item | 'new'
  const [history, setHistory] = useState(null);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.get('/wt-catalogue', { params: { include_archived: 1, with_usage: 1 } })
      .then((r) => setData(r.data))
      .catch((e) => { setData(null); setError(errText(e, 'Could not load the catalogue')); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const items = data?.items || [];
  const s = data?.summary || {};

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((i) => {
      if (tab === 'Withdrawn') { if (i.is_active) return false; } else if (!i.is_active) return false;
      if (tab !== 'All' && tab !== 'Withdrawn' && i.group !== tab.toLowerCase()) return false;
      return !term || [i.code, i.name, i.unit].some((v) => String(v || '').toLowerCase().includes(term));
    });
  }, [items, q, tab]);

  const act = async (fn, okMsg) => {
    try { const r = await fn(); toast.ok(r?.data?.message || okMsg); load(); }
    catch (e) { toast.err(errText(e, 'That did not work')); }
  };

  const archive = (i) => act(() => api.post(`/wt-catalogue/${i.id}/archive`), 'Withdrawn.');
  const restore = (i) => act(() => api.post(`/wt-catalogue/${i.id}/restore`), 'Restored.');
  const clone = (i) => act(() => api.post(`/wt-catalogue/${i.id}/clone`), 'Cloned.');
  const remove = (i) => act(() => api.delete(`/wt-catalogue/${i.id}`), `${i.code} deleted.`);

  const counts = {
    All: items.filter((i) => i.is_active).length,
    Service: items.filter((i) => i.is_active && i.group === 'service').length,
    Material: items.filter((i) => i.is_active && i.group === 'material').length,
    Labour: items.filter((i) => i.is_active && i.group === 'labour').length,
    Withdrawn: items.filter((i) => !i.is_active).length,
  };

  if (loading) return (<><WtHead title="Price Schedule" subtitle="The catalogue quotations and agreements are priced from" /><Loading /></>);

  if (error) return (
    <>
      <WtHead title="Price Schedule" subtitle="The catalogue quotations and agreements are priced from" />
      <div className="wt-card"><EmptyState eyebrow="Error" title="Could not load the catalogue" hint={error}
        action={<button className="wt-btn primary" onClick={load}><RefreshCw size={14} /> Retry</button>} /></div>
    </>
  );

  return (
    <>
      <WtHead title="Price Schedule" subtitle="The catalogue quotations and agreements are priced from"
        search={q} onSearch={setQ}>
        <button className="wt-btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
        <button className="wt-btn primary" onClick={() => setEditing('new')}><Plus size={14} /> New item</button>
      </WtHead>

      <div className="wt-kpis">
        <div className="wt-card wt-kpi"><span className="wt-kpi-label">Items on offer</span><b>{counts.All}</b></div>
        <div className="wt-card wt-kpi"><span className="wt-kpi-label">Priced</span><b>{s.priced || 0}</b>
          <span className="wt-kpi-sub">{s.unpriced || 0} on quote</span></div>
        <div className="wt-card wt-kpi"><span className="wt-kpi-label">Average price</span><b>{bdt(s.average_price)}</b></div>
        <div className="wt-card wt-kpi"><span className="wt-kpi-label">Withdrawn</span><b>{counts.Withdrawn}</b>
          <span className="wt-kpi-sub">still on old documents</span></div>
      </div>

      <div className="wt-card wt-tblcard">
        <WtTabs tabs={['All', 'Service', 'Material', 'Labour', 'Withdrawn']} value={tab} onChange={setTab} counts={counts} />

        {shown.length ? (
          <table className="wt-tbl">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Code</th>
                <th>Item</th>
                <th style={{ width: 100 }}>Group</th>
                <th style={{ width: 110 }}>Unit</th>
                <th style={{ width: 130, textAlign: 'right' }}>Standard price</th>
                <th style={{ width: 110 }}>In use</th>
                <th style={{ width: 210 }} />
              </tr>
            </thead>
            <tbody>
              {shown.map((i) => {
                const used = num(i.usage?.total);
                return (
                  <tr key={i.id} style={i.is_active ? undefined : { opacity: 0.62 }}>
                    <td className="id">{i.code}</td>
                    <td>
                      {i.name}
                      {!i.is_active && <Pill value="Withdrawn" sm force="slate" />}
                      {i.description && <div className="muted" style={{ fontSize: 11 }}>{i.description}</div>}
                    </td>
                    <td className="muted">{titleCase(i.group)}</td>
                    <td className="muted">{i.unit || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      {i.standard_price > 0 ? bdt(i.standard_price) : <span className="muted">On quote</span>}
                    </td>
                    <td>
                      {used > 0
                        ? <button className="wt-btn sm" onClick={() => setHistory(i)}>{used} record{used === 1 ? '' : 's'}</button>
                        : <span className="muted">—</span>}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="wt-btn sm" title="History and usage" onClick={() => setHistory(i)}><History size={13} /></button>{' '}
                      <button className="wt-btn sm" title="Edit" onClick={() => setEditing(i)}><Pencil size={13} /></button>{' '}
                      <button className="wt-btn sm" title="Duplicate" onClick={() => clone(i)}><Copy size={13} /></button>{' '}
                      {i.is_active
                        ? <button className="wt-btn sm" title="Withdraw from the schedule" onClick={() => archive(i)}><Archive size={13} /></button>
                        : <button className="wt-btn sm" title="Return to the schedule" onClick={() => restore(i)}><RotateCcw size={13} /></button>}
                      {/*
                        * Delete only appears for an item nothing has priced against.
                        * Anything else is refused by the API, and offering a button
                        * that always fails teaches the operator nothing.
                        */}
                      {used === 0 && (
                        <>{' '}<button className="wt-btn sm danger" title="Delete permanently" onClick={() => remove(i)}><Trash2 size={13} /></button></>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState
            eyebrow="Price schedule"
            title={q ? 'Nothing matches that search' : 'Nothing in this group yet'}
            action={<button className="wt-btn primary" onClick={() => setEditing('new')}><Plus size={14} /> New item</button>}
          />
        )}
      </div>

      {editing && (
        <ItemDrawer
          item={editing === 'new' ? null : editing}
          usage={editing === 'new' ? null : editing.usage}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      {history && <HistoryDrawer item={history} onClose={() => setHistory(null)} />}
    </>
  );
}
