import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search, X, Check, AlertCircle, Info, Pencil, Trash2, ArrowRight, MoreHorizontal,
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '../../services/api';
import { Spinner } from '../../ui/kit';

/* Shared toolkit for the Water Tank operations screens (wt-scope). */

// The current console's URL base, so shared screens navigate within whichever
// service the user is in (/air-conditioning/* vs /water-tank/*). Use it in place
// of a hard-coded '/water-tank' prefix: nav(`${svcBase()}/quotations`).
export const svcBase = () => {
  try { return (window.location.pathname || '').includes('/air-conditioning') ? '/air-conditioning' : '/water-tank'; }
  catch { return '/water-tank'; }
};

export const bdt = (v) => '৳' + Number(v || 0).toLocaleString('en-BD');
export const money = (v) => (v == null || v === '' ? '—' : bdt(v));
export const dateFmt = (v) => {
  if (!v) return '—';
  const d = new Date(v); if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};
export const dateTimeFmt = (v) => {
  if (!v) return '—';
  const d = new Date(v); if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};
export const titleCase = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
export const parseJson = (v, f) => { if (v == null) return f; if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch { return f; } };
export const errText = (e, fallback = 'Something went wrong') => e?.response?.data?.error || e?.message || fallback;

/* ── toasts ────────────────────────────────────────────────── */
const toastListeners = new Set();
let toastSeq = 0;
const emitToast = (message, kind) => {
  const t = { id: ++toastSeq, message, kind };
  toastListeners.forEach((l) => l(t));
};
export const toast = {
  ok: (m) => emitToast(m, 'ok'),
  err: (m) => emitToast(m, 'err'),
  info: (m) => emitToast(m, 'info'),
};

export function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const listener = (t) => {
      setItems((s) => [...s, t]);
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== t.id)), 4000);
    };
    toastListeners.add(listener);
    return () => { toastListeners.delete(listener); };
  }, []);
  const Icon = { ok: Check, err: AlertCircle, info: Info };
  return (
    <div className="wt-toasts">
      {items.map((t) => {
        const I = Icon[t.kind] || Info;
        return (
          <div key={t.id} className={`wt-toast ${t.kind}`} role="status">
            <I size={15} /><span>{t.message}</span>
            <button onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))}><X size={13} /></button>
          </div>
        );
      })}
    </div>
  );
}

/* ── status pills ──────────────────────────────────────────── */
const TONE = {
  high: 'red', medium: 'amber', low: 'slate',
  new: 'blue', 'new lead': 'blue', 'assessment scheduled': 'amber', 'in progress': 'amber', assigned: 'amber',
  completed: 'green', 'active (amc)': 'green', active: 'green', approved: 'green', paid: 'green', resolved: 'green', cleared: 'green', proposed: 'blue',
  cancelled: 'red', rejected: 'red', expired: 'red', overdue: 'red', open: 'red', 'active blacklist': 'red', suspended: 'red',
  draft: 'slate', issued: 'blue', sent: 'blue', pending: 'amber', 'pending approval': 'amber', conditional: 'amber', investigating: 'amber',
  invoiced: 'blue', 'not due': 'slate', closed: 'slate', scheduled: 'amber',
};
export const tone = (v) => TONE[String(v || '').toLowerCase()] || 'slate';
export const Pill = ({ value, label, sm, force }) => (value == null || value === '')
  ? <span className="muted">—</span>
  : <span className={`wt-pill ${sm ? 'sm' : ''} ${force || tone(value)}`}>{label || titleCase(value)}</span>;

/* ── page chrome ───────────────────────────────────────────── */
export function WtHead({ title, subtitle, search, onSearch, children, crumb }) {
  return (
    <div className="wt-head">
      <div>
        {crumb}
        <h1 className="wt-title">{title}</h1>
        {subtitle && <p className="wt-subtitle">{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {onSearch && <label className="wt-search"><Search /><input placeholder="Search…" value={search} onChange={(e) => onSearch(e.target.value)} /></label>}
        {children}
      </div>
    </div>
  );
}

export function WtTabs({ tabs, value, onChange, counts }) {
  return <div className="wt-tabs">{tabs.map((t) => {
    const v = typeof t === 'string' ? t : t.value; const l = typeof t === 'string' ? t : t.label;
    const n = counts?.[v];
    return (
      <button key={v} className={`wt-tab${value === v ? ' on' : ''}`} onClick={() => onChange(v)}>
        {l}{n != null && <span className="wt-tab-n">{n}</span>}
      </button>
    );
  })}</div>;
}

export function WtDrawer({ title, subtitle, onClose, children, footer, wide }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="wt-drawer-overlay" onClick={onClose}>
      <div className={`wt-drawer${wide ? ' wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="wt-drawer-head">
          <div><h3>{title}</h3>{subtitle && <span className="sub">{subtitle}</span>}</div>
          <button className="wt-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="wt-drawer-body">{children}</div>
        {footer && <div className="wt-drawer-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ eyebrow, title, hint, action }) {
  return <div className="wt-empty"><span className="eyebrow">{eyebrow}</span><h3>{title}</h3>{hint && <p>{hint}</p>}{action}</div>;
}

export const Loading = () => <div style={{ padding: 60, textAlign: 'center' }}><Spinner /></div>;

/* ── data hook: GET /wt-ops/:entity + write helpers ─────────── */
export function useCollection(entity, params = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const key = JSON.stringify(params);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const r = await api.get(`/wt-ops/${entity}`, { params }); setRows(Array.isArray(r.data) ? r.data : []); }
    catch (e) { setRows([]); setError(errText(e, 'Could not load records')); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity, key]);
  useEffect(() => { load(); }, [load]);

  const patch = useCallback(async (id, body, msg) => {
    const r = await api.patch(`/wt-ops/${entity}/${id}`, body);
    setRows((rs) => rs.map((x) => (x.id === id ? r.data : x)));
    if (msg) toast.ok(msg);
    return r.data;
  }, [entity]);

  const remove = useCallback(async (id, msg) => {
    await api.delete(`/wt-ops/${entity}/${id}`);
    setRows((rs) => rs.filter((x) => x.id !== id));
    if (msg !== false) toast.ok(msg || 'Record deleted');
  }, [entity]);

  const advance = useCallback(async (id, body) => {
    const r = await api.post(`/wt-ops/${entity}/${id}/advance`, body || {});
    await load();
    return r.data;
  }, [entity, load]);

  return { rows, loading, error, reload: load, setRows, patch, remove, advance };
}

/**
 * useCatalog — the WTC standard price schedule from the service catalog.
 * Quotations price from this list, so it is fetched once and shared.
 */
export function useCatalog(vertical = 'water_tank_csa') {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    api.get('/service-catalog/items', { params: { vertical } })
      .then((r) => { if (alive) setItems(Array.isArray(r.data?.data) ? r.data.data : []); })
      .catch(() => { if (alive) setItems([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [vertical]);
  return { items, loading };
}

/**
 * useFocusedRecord — opens the record named by ?focus=CODE (how the
 * command palette deep-links into a list screen) and clears the param.
 */
export function useFocusedRecord(rows, onFocus) {
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current || !rows.length) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('focus');
    if (!code) { applied.current = true; return; }
    const hit = rows.find((r) => r.code === code);
    if (hit) {
      applied.current = true;
      onFocus(hit);
      params.delete('focus');
      const qs = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);
}

/**
 * useRoutedRecord — give a register's records a real, shareable URL.
 *
 * `useFocusedRecord` above deep-links via ?focus=CODE and then DELETES the
 * param, which is right for the command palette (it is a jump, not a location)
 * and wrong for everything else: the address bar goes back to the bare register,
 * so the record cannot be linked, bookmarked or reached with the back button.
 *
 * This keeps the record in the path. Opening one navigates to `${base}/${code}`;
 * closing returns to `base`. Arriving directly on `${base}/${code}` opens the
 * record as soon as the rows land.
 *
 * A code in the URL that matches nothing is left alone rather than redirected —
 * the rows may simply not have loaded yet, and bouncing the user off a URL they
 * just pasted is worse than showing them the register for a moment.
 */
export function useRoutedRecord({ rows, base, current, setCurrent, key = 'code' }) {
  const { code } = useParams();
  const nav = useNavigate();

  useEffect(() => {
    if (!code) { if (current) setCurrent(null); return; }
    if (current && String(current[key]) === String(code)) return;
    const hit = (rows || []).find((r) => String(r[key]) === String(code));
    if (hit) setCurrent(hit);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, rows]);

  return {
    /** The code in the URL, if any — useful for an "not found" message. */
    routedCode: code || null,
    open: (r) => nav(`${base}/${r[key]}`),
    close: () => nav(base),
  };
}

/**
 * useUrlTab — let a link land on a register with a filter already applied.
 *
 * Dashboard KPIs used to navigate to the bare register: "Pending Invoices ৳4.2m"
 * opened the full invoice list, leaving the operator to reproduce by hand the
 * filter the number was computed from. A KPI that does not take you to the rows
 * it counted is a decoration.
 *
 * `?tab=Overdue` now seeds the register's own tab state. Matching is
 * case-insensitive so links can be written readably, and an unrecognised value
 * is ignored rather than leaving the screen on an empty filter nobody chose.
 */
export function useUrlTab(tabs, setTab, param = 'tab') {
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    const wanted = new URLSearchParams(window.location.search).get(param);
    if (!wanted) return;
    const hit = (tabs || []).find((t) => {
      const value = typeof t === 'string' ? t : t.value;
      return String(value).toLowerCase() === wanted.toLowerCase();
    });
    if (hit) setTab(typeof hit === 'string' ? hit : hit.value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/* ── calendar date picker ──────────────────────────────────── */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * DatePicker — a real calendar dropdown, used everywhere a date is captured.
 * Value is an ISO `YYYY-MM-DD` string, so it drops straight into the API.
 */
export function DatePicker({ value, onChange, placeholder = 'Select date…', min, max, clearable = true }) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T00:00:00`) : null;
  const valid = selected && !Number.isNaN(selected.getTime());
  const [cursor, setCursor] = useState(() => (valid ? new Date(selected) : new Date()));
  const ref = useRef(null);

  useEffect(() => { if (valid) setCursor(new Date(selected)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayIso = iso(new Date());

  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);

  const disabled = (day) => {
    const s = iso(new Date(year, month, day));
    return (min && s < min) || (max && s > max);
  };
  const pick = (day) => { onChange(iso(new Date(year, month, day))); setOpen(false); };
  const shift = (n) => setCursor(new Date(year, month + n, 1));
  // ten years back, five forward — covers service history and renewal dates
  const years = Array.from({ length: 16 }, (_, i) => new Date().getFullYear() - 10 + i);

  return (
    <div className="wt-datepicker" ref={ref}>
      <button type="button" className={`wt-dateinput${open ? ' on' : ''}`} onClick={() => setOpen((o) => !o)}>
        <CalendarIcon size={14} />
        <span className={valid ? 'v' : 'p'}>{valid ? dateFmt(value) : placeholder}</span>
        {valid && clearable && (
          <span
            role="button" tabIndex={-1} className="clr" aria-label="Clear date"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
          ><X size={12} /></span>
        )}
      </button>

      {open && (
        <div className="wt-calendar">
          <div className="wt-cal-head">
            <button type="button" onClick={() => shift(-1)} aria-label="Previous month"><ChevronLeft size={15} /></button>
            <div className="wt-cal-sel">
              <select value={month} onChange={(e) => setCursor(new Date(year, Number(e.target.value), 1))}>
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select value={year} onChange={(e) => setCursor(new Date(Number(e.target.value), month, 1))}>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => shift(1)} aria-label="Next month"><ChevronRight size={15} /></button>
          </div>

          <div className="wt-cal-grid">
            {WEEKDAYS.map((w) => <span key={w} className="wd">{w}</span>)}
            {cells.map((day, i) => {
              if (!day) return <span key={`e${i}`} />;
              const s = iso(new Date(year, month, day));
              return (
                <button
                  key={s} type="button" disabled={disabled(day)}
                  className={`d${s === value ? ' sel' : ''}${s === todayIso ? ' today' : ''}`}
                  onClick={() => pick(day)}
                >{day}</button>
              );
            })}
          </div>

          <div className="wt-cal-foot">
            <button type="button" onClick={() => { onChange(todayIso); setOpen(false); }}>Today</button>
            {clearable && <button type="button" onClick={() => { onChange(''); setOpen(false); }}>Clear</button>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── field rendering (shared by create + edit) ──────────────── */
function FieldInput({ f, value, onChange }) {
  const set = (v) => onChange(f.key, v);
  // every date field gets the calendar dropdown, never the native picker
  if (f.type === 'date') return <DatePicker value={value || ''} onChange={set} min={f.min} max={f.max} />;
  if (f.type === 'select') {
    return (
      <select className="wt-select" value={value ?? ''} onChange={(e) => set(e.target.value)}>
        <option value="">Select…</option>
        {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (f.type === 'textarea') {
    return <textarea className="wt-input" rows={3} style={{ resize: 'vertical' }} value={value ?? ''} onChange={(e) => set(e.target.value)} />;
  }
  if (f.type === 'boolean') {
    return (
      <label className="wt-toggle">
        <input type="checkbox" checked={!!value} onChange={(e) => set(e.target.checked)} />
        <span>{value ? 'Yes' : 'No'}</span>
      </label>
    );
  }
  return (
    <input
      className="wt-input"
      type={f.type || 'text'}
      value={value ?? ''}
      onChange={(e) => set(f.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
    />
  );
}

function FieldSet({ fields, form, onChange }) {
  return fields.map((f) => (
    <div className="wt-field" key={f.key}>
      <label>{f.label}{f.required ? ' *' : ''}</label>
      <FieldInput f={f} value={form[f.key]} onChange={onChange} />
      {f.hint && <span className="hint">{f.hint}</span>}
    </div>
  ));
}

const displayValue = (f, v) => {
  if (v == null || v === '') return '—';
  if (f.type === 'boolean') return v ? 'Yes' : 'No';
  if (f.type === 'number') return f.money ? bdt(v) : String(v);
  if (f.type === 'date') return dateFmt(v);
  return String(v);
};

/* ── create-record drawer driven by a fields[] config ───────── */
export function CreateDrawer({ entity, singular, fields, onDone, onClose, initial, postTo }) {
  const [form, setForm] = useState(initial || {});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const change = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    const missing = fields.filter((f) => f.required && !form[f.key]);
    if (missing.length) { setErr(`${missing.map((m) => m.label).join(', ')} required`); return; }
    setBusy(true); setErr('');
    try { await api.post(postTo || `/wt-ops/${entity}`, form); toast.ok(`${titleCase(singular)} created`); onDone(); }
    catch (e) { setErr(errText(e, 'Could not save')); }
    finally { setBusy(false); }
  };

  return (
    <WtDrawer title={`New ${singular}`} onClose={onClose}
      footer={<><button className="wt-btn" onClick={onClose}>Cancel</button><button className="wt-btn primary" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Create'}</button></>}>
      {err && <div className="wt-formerr">{err}</div>}
      <FieldSet fields={fields} form={form} onChange={change} />
    </WtDrawer>
  );
}

/**
 * RecordDrawer — view / edit / delete any record, plus the
 * "advance to next stage" action where the pipeline allows it.
 */
export function RecordDrawer({
  record, singular, fields, onClose, onSave, onDelete,
  title, subtitle, extra, advanceLabel, onAdvance,
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(record);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirming, setConfirming] = useState(false);
  useEffect(() => { setForm(record); }, [record]);
  const change = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setBusy(true); setErr('');
    try {
      const body = {};
      fields.forEach((f) => { if (form[f.key] !== record[f.key]) body[f.key] = form[f.key]; });
      if (!Object.keys(body).length) { setEditing(false); return; }
      await onSave(body);
      toast.ok(`${titleCase(singular)} updated`);
      setEditing(false);
    } catch (e) { setErr(errText(e, 'Could not save')); }
    finally { setBusy(false); }
  };

  const doDelete = async () => {
    setBusy(true);
    try { await onDelete(); onClose(); }
    catch (e) { setErr(errText(e, 'Could not delete')); setBusy(false); }
  };

  return (
    <WtDrawer
      title={title || record.code || `${titleCase(singular)} detail`}
      subtitle={subtitle}
      onClose={onClose}
      footer={editing
        ? <><button className="wt-btn" onClick={() => { setForm(record); setEditing(false); setErr(''); }}>Cancel</button>
            <button className="wt-btn primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button></>
        : <>
            {onDelete && (confirming
              ? <><span className="wt-confirm">Delete permanently?</span>
                  <button className="wt-btn" onClick={() => setConfirming(false)}>No</button>
                  <button className="wt-btn danger" disabled={busy} onClick={doDelete}>Yes, delete</button></>
              : <button className="wt-btn danger-ghost" onClick={() => setConfirming(true)}><Trash2 size={14} /> Delete</button>)}
            {!confirming && <>
              <button className="wt-btn" onClick={() => setEditing(true)}><Pencil size={14} /> Edit</button>
              {onAdvance && <button className="wt-btn primary" disabled={busy} onClick={onAdvance}>{advanceLabel} <ArrowRight size={14} /></button>}
            </>}
          </>}
    >
      {err && <div className="wt-formerr">{err}</div>}
      {editing
        ? <FieldSet fields={fields} form={form} onChange={change} />
        : <div className="wt-readfields">
            {fields.map((f) => (
              <div className="wt-readfield" key={f.key}>
                <div className="k">{f.label}</div>
                <div className="v">{f.pill ? <Pill value={record[f.key]} sm /> : displayValue(f, record[f.key])}</div>
              </div>
            ))}
          </div>}
      {!editing && extra}
    </WtDrawer>
  );
}

/**
 * AdvanceDrawer — collects the details needed to create the next
 * record in the pipeline (assessment → quotation → WO → invoice).
 */
export function AdvanceDrawer({ record, label, fields, onClose, onConfirm, note }) {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const change = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const go = async () => {
    setBusy(true); setErr('');
    try { await onConfirm(form); }
    catch (e) { setErr(errText(e, 'Could not advance')); setBusy(false); }
  };

  return (
    <WtDrawer title={label} subtitle={`From ${record.code} · ${record.client_name || record.name || ''}`} onClose={onClose}
      footer={<><button className="wt-btn" onClick={onClose}>Cancel</button><button className="wt-btn primary" disabled={busy} onClick={go}>{busy ? 'Working…' : label}</button></>}>
      {err && <div className="wt-formerr">{err}</div>}
      {note && <div className="wt-note">{note}</div>}
      <FieldSet fields={fields} form={form} onChange={change} />
    </WtDrawer>
  );
}

/* ── inline status changer ─────────────────────────────────── */
export function StatusCell({ value, options, onChange, field = 'status' }) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  const pick = async (v) => {
    setOpen(false);
    if (v === value) return;
    setBusy(true);
    try { await onChange({ [field]: v }); }
    catch (e) { toast.err(errText(e, 'Could not update status')); }
    finally { setBusy(false); }
  };

  return (
    <span className="wt-statuscell" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button className="wt-statusbtn" disabled={busy} onClick={() => setOpen((o) => !o)}>
        <Pill value={value} sm />
      </button>
      {open && (
        <div className="wt-statusmenu">
          {options.map((o) => (
            <button key={o} className={o === value ? 'on' : ''} onClick={() => pick(o)}>
              <Pill value={o} sm />
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

/* ── row action menu ───────────────────────────────────────── */
export function RowActions({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);
  const shown = items.filter(Boolean);
  if (!shown.length) return null;
  return (
    <span className="wt-rowactions" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button className="wt-iconbtn" onClick={() => setOpen((o) => !o)} aria-label="Actions"><MoreHorizontal size={16} /></button>
      {open && (
        <div className="wt-actionmenu">
          {shown.map((it) => (
            <button key={it.label} className={it.danger ? 'danger' : ''} onClick={() => { setOpen(false); it.onClick(); }}>
              {it.icon && <it.icon size={14} />}{it.label}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

/* ── KPI card row ──────────────────────────────────────────── */
export function StatCards({ items }) {
  return (
    <div className="wt-kpis" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((s) => (
        <div key={s.label} className="wt-card" style={{ padding: '18px 20px' }}>
          <div className="wt-kpi-label">{s.label}</div>
          <div className="wt-kpi-value" style={{ margin: '4px 0 2px', color: s.color }}>{s.value}</div>
          <div className="wt-kpi-sub">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

// re-exported so screens can pull the whole toolkit from one module
export { default as RecordComments } from './RecordComments';
