import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import api from '../../services/api';
import { useSvcNav, Pill } from './common';

/*
 * CommandPalette — one search box for the whole Water Tank console.
 * ⌘K / Ctrl-K anywhere. Types a code (SR-1095) or a client name and jumps
 * straight to the record; with no query it lists the console's screens.
 */

const ROUTE = {
  clients: '/water-tank/clients',
  'service-requests': '/water-tank/service-requests',
  'site-assessments': '/water-tank/site-assessments',
  quotations: '/water-tank/quotations',
  'work-orders': '/water-tank/work-orders',
  projects: '/water-tank/projects',
  providers: '/water-tank/providers',
  amc: '/water-tank/amc',
  invoices: '/water-tank/invoices',
  complaints: '/water-tank/complaints',
  comms: '/water-tank/communication',
};
const GROUP = {
  clients: 'Clients', 'service-requests': 'Service Requests', 'site-assessments': 'Site Assessments',
  quotations: 'Quotations', 'work-orders': 'Work Orders', projects: 'Projects', providers: 'Providers',
  amc: 'AMC Contracts', invoices: 'Invoices', complaints: 'Complaints', comms: 'Communication Log',
};
// records that own a dedicated page get deep-linked; the rest open their list focused on the row
const DEEP = {
  clients: (h) => `/water-tank/clients/${h.code}`,
  projects: (h) => `/water-tank/projects/${h.code}`,
  providers: (h) => `/water-tank/providers/${h.id}`,
};

export default function CommandPalette({ open, onClose, nav: navItems }) {
  const nav = useSvcNav();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (open) { setQ(''); setHits([]); setCursor(0); setTimeout(() => inputRef.current?.focus(), 20); } }, [open]);

  // debounced server search
  useEffect(() => {
    if (!open) return undefined;
    const term = q.trim();
    if (term.length < 2) { setHits([]); setLoading(false); return undefined; }
    setLoading(true);
    const t = setTimeout(() => {
      api.get('/wt-ops/search', { params: { q: term } })
        .then((r) => setHits(Array.isArray(r.data) ? r.data : []))
        .catch(() => setHits([]))
        .finally(() => setLoading(false));
    }, 180);
    return () => clearTimeout(t);
  }, [q, open]);

  // screens matching the query (always available, even offline)
  const screens = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (navItems || []).filter((n) => !term || n.label.toLowerCase().includes(term));
  }, [q, navItems]);

  const items = useMemo(() => [
    ...screens.map((s) => ({ kind: 'screen', label: s.label, to: s.to, icon: s.icon })),
    ...hits.map((h) => ({ kind: 'record', ...h, to: DEEP[h.entity] ? DEEP[h.entity](h) : `${ROUTE[h.entity]}?focus=${encodeURIComponent(h.code)}` })),
  ], [screens, hits]);

  useEffect(() => { setCursor(0); }, [q]);

  const go = (item) => { if (!item) return; onClose(); nav(item.to); };

  const onKey = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, items.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); go(items[cursor]); }
  };

  if (!open) return null;

  let lastGroup = null;
  return (
    <div className="wt-cmd-overlay" onClick={onClose}>
      <div className="wt-cmd" onClick={(e) => e.stopPropagation()}>
        <div className="wt-cmd-input">
          <Search />
          <input
            ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
            placeholder="Search clients, requests, quotes, work orders, invoices…"
          />
          <kbd>ESC</kbd>
        </div>

        <div className="wt-cmd-list">
          {items.map((it, i) => {
            const group = it.kind === 'screen' ? 'Go to' : GROUP[it.entity] || it.entity;
            const header = group !== lastGroup ? group : null;
            lastGroup = group;
            return (
              <React.Fragment key={`${it.kind}-${it.to}-${i}`}>
                {header && <div className="wt-cmd-group">{header}</div>}
                <button
                  className={`wt-cmd-item${i === cursor ? ' on' : ''}`}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => go(it)}
                >
                  {it.kind === 'screen'
                    ? <>{it.icon && <it.icon size={15} style={{ color: 'var(--wt-accent-ink)' }} />}<span className="ttl">{it.label}</span></>
                    : <><span className="code">{it.code}</span><span className="ttl">{it.title}</span>
                        {it.subtitle && <span className="sub">{it.subtitle}</span>}
                        {it.status && <Pill value={it.status} sm />}</>}
                </button>
              </React.Fragment>
            );
          })}
          {!items.length && (
            <div className="wt-cmd-empty">
              {loading ? 'Searching…' : q.trim().length < 2 ? 'Type at least 2 characters to search records.' : `Nothing matches “${q.trim()}”.`}
            </div>
          )}
        </div>

        <div className="wt-cmd-foot">
          <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
          {loading && <span style={{ marginLeft: 'auto' }}>searching…</span>}
        </div>
      </div>
    </div>
  );
}
