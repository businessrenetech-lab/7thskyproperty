import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Plus } from 'lucide-react';
import api from '../services/api';

/**
 * Combo — searchable remote select.
 * props: endpoint, labelFn(row), valueFn(row)=row.id, value, onChange(value,row),
 *        placeholder, mapData(resp)=resp.data.data
 */
export function Combo({ endpoint, labelFn, value, onChange, placeholder = 'Select…', mapData }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState(null);
  const ref = useRef();

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (value) {
      if (picked && picked.id === value) return;
      let active = true;
      const base = endpoint.split('?')[0];
      api.get(`${base}/${value}`)
        .then((r) => { if (active) setPicked(r.data?.data || r.data); })
        .catch(() => {});
      return () => { active = false; };
    } else {
      setPicked(null);
    }
  }, [value, endpoint, picked]);

  useEffect(() => {
    if (!open) return;
    let active = true; setLoading(true);
    const sep = endpoint.includes('?') ? '&' : '?';
    api.get(`${endpoint}${sep}search=${encodeURIComponent(q)}&limit=20`)
      .then((r) => { if (active) setRows((mapData ? mapData(r) : r.data?.data) || []); })
      .catch(() => active && setRows([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [open, q, endpoint]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="input" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpen((o) => !o)}>
        <span style={{ flex: 1, color: picked ? 'var(--text)' : 'var(--muted-2)' }}>{picked ? labelFn(picked) : placeholder}</span>
        <ChevronDown size={15} color="var(--muted)" />
      </div>
      {open && (
        <div className="card" style={{ position: 'absolute', zIndex: 60, top: '105%', left: 0, right: 0, boxShadow: 'var(--shadow-lg)', maxHeight: 280, overflow: 'auto' }}>
          <div style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
            <input className="input" autoFocus placeholder="Type to search…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {loading ? <div style={{ padding: 14 }}><span className="spinner" /></div>
            : rows.length ? rows.map((r) => (
              <div key={r.id} className="nav-item" style={{ margin: 4 }} onClick={() => { setPicked(r); onChange?.(r.id, r); setOpen(false); }}>
                {value === r.id && <Check size={14} color="var(--primary)" />} {labelFn(r)}
              </div>
            )) : <div style={{ padding: 14, color: 'var(--muted)', fontSize: 13 }}>No matches.</div>}
        </div>
      )}
    </div>
  );
}

export const PlusButton = ({ onClick, label }) => (
  <button type="button" className="btn btn-ghost btn-sm" onClick={onClick}><Plus size={14} /> {label}</button>
);
