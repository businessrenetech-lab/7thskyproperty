import React, { useState, useMemo } from 'react';
import { Plus, Eye, Trash2, Phone, Mail, MessageSquare, MapPin, StickyNote } from 'lucide-react';
import {
  WtHead, WtTabs, dateTimeFmt, titleCase, useCollection, CreateDrawer, RecordDrawer,
  RowActions, Loading, EmptyState, toast, errText,
} from './common';

const CHANNELS = ['call', 'email', 'sms', 'whatsapp', 'visit', 'note'];
const CHANNEL_ICON = { call: Phone, email: Mail, sms: MessageSquare, whatsapp: MessageSquare, visit: MapPin, note: StickyNote };

const FIELDS = [
  { key: 'client_name', label: 'Client name', required: true },
  { key: 'channel', label: 'Channel', type: 'select', options: CHANNELS },
  { key: 'direction', label: 'Direction', type: 'select', options: ['inbound', 'outbound'] },
  { key: 'ref_type', label: 'Reference type' },
  { key: 'ref_code', label: 'Reference code' },
  { key: 'summary', label: 'Summary', type: 'textarea' },
];

export default function CommLog() {
  const { rows, loading, error, reload, patch, remove } = useCollection('comms');
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(null);
  const [tab, setTab] = useState('All');
  const [q, setQ] = useState('');

  const counts = useMemo(() => {
    const c = { All: rows.length };
    CHANNELS.forEach((ch) => { c[titleCase(ch)] = rows.filter((r) => (r.channel || '').toLowerCase() === ch).length; });
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => (tab === 'All' || (r.channel || '').toLowerCase() === tab.toLowerCase())
      && (!term || [r.client_name, r.summary, r.ref_code].some((v) => String(v || '').toLowerCase().includes(term))));
  }, [rows, tab, q]);

  const current = open ? rows.find((r) => r.id === open.id) || open : null;

  return (
    <>
      <WtHead
        title="Communication Log"
        subtitle="Every client & provider interaction across the lifecycle"
        search={q} onSearch={setQ}
      >
        <button className="wt-btn primary" onClick={() => setCreating(true)}><Plus size={15} /> Log Entry</button>
      </WtHead>
      <WtTabs tabs={['All', ...CHANNELS.map(titleCase)]} value={tab} onChange={setTab} counts={counts} />

      <div className="wt-card wt-tblcard">
        {loading ? <Loading /> : error ? (
          <EmptyState eyebrow="Error" title="Could not load the log" hint={error}
            action={<button className="wt-btn" onClick={reload}>Retry</button>} />
        ) : (
          <>
            <table className="wt-tbl">
              <thead><tr><th style={{ width: 168 }}>When</th><th style={{ width: 190 }}>Client</th><th style={{ width: 118 }}>Channel</th><th style={{ width: 102 }}>Direction</th><th>Summary</th><th style={{ width: 110 }}>Ref</th><th style={{ width: 44 }} /></tr></thead>
              <tbody>
                {shown.map((r) => {
                  const Icon = CHANNEL_ICON[(r.channel || '').toLowerCase()] || StickyNote;
                  return (
                    <tr key={r.id} className="click" onClick={() => setOpen(r)}>
                      <td className="muted">{dateTimeFmt(r.logged_at || r.createdAt)}</td>
                      <td><strong>{r.client_name}</strong></td>
                      <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon size={13} style={{ color: 'var(--wt-muted)' }} />{titleCase(r.channel)}</span></td>
                      <td className={(r.direction || '').toLowerCase() === 'inbound' ? '' : 'muted'}>{titleCase(r.direction)}</td>
                      <td className="muted" style={{ maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.summary}</td>
                      <td className="id">{r.ref_code || '—'}</td>
                      <td>
                        <RowActions items={[
                          { label: 'Open', icon: Eye, onClick: () => setOpen(r) },
                          { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(r.id, 'Entry deleted').catch((e) => toast.err(errText(e))) },
                        ]} />
                      </td>
                    </tr>
                  );
                })}
                {!shown.length && <tr className="wt-empty-row"><td colSpan={7}>{q ? `Nothing matches “${q}”.` : `No entries in “${tab}”.`}</td></tr>}
              </tbody>
            </table>
            <div className="wt-tblfoot"><span>Showing {shown.length} of {rows.length} entries</span></div>
          </>
        )}
      </div>

      {creating && (
        <CreateDrawer entity="comms" singular="entry" fields={FIELDS}
          initial={{ channel: 'call', direction: 'outbound', logged_at: new Date().toISOString() }}
          onClose={() => setCreating(false)} onDone={() => { setCreating(false); reload(); }} />
      )}

      {current && (
        <RecordDrawer
          record={current} singular="entry" fields={FIELDS}
          title={`${titleCase(current.channel)} · ${current.client_name}`}
          subtitle={dateTimeFmt(current.logged_at || current.createdAt)}
          onClose={() => setOpen(null)}
          onSave={(body) => patch(current.id, body)}
          onDelete={() => remove(current.id, 'Entry deleted')}
        />
      )}
    </>
  );
}
