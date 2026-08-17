import React, { useEffect, useState, useCallback, useRef } from 'react';
import { KeyRound, Check, ChevronRight, Upload, X, Camera, LogIn, LogOut } from 'lucide-react';
import api from '../../services/api';
import { Spinner } from '../../ui/kit';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { fileSrc } from '../../ui/FileUpload';
import { initials, Chip, fmtDate, ScreenHead } from './common';

// ── Progress pill for a check-in / check-out cell ─────────────
function ProgressCell({ state, kind }) {
  if (state.complete) return <span className="pm-chip good"><span className="d" />Complete</span>;
  if (kind === 'checkout' && !state.applicable) return <span style={{ color: 'var(--muted-2)', fontSize: 12 }}>—</span>;
  const pct = state.total ? Math.round((state.done / state.total) * 100) : 0;
  return (
    <div style={{ minWidth: 120 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
        <span>{state.done}/{state.total}</span>{state.photos > 0 && <span>{state.photos} 📷</span>}
      </div>
      <div style={{ height: 5, borderRadius: 4, background: 'var(--line)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? 'var(--good)' : 'var(--cyan)' }} />
      </div>
    </div>
  );
}

// ── The check-in / check-out modal (checklist + photos + notes) ─
function CheckModal({ bookingId, mode, onClose, onDone }) {
  const toast = useToast();
  const fileRef = useRef();
  const drawerRef = useRef();
  const closeRef = useRef();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const checkType = mode === 'out' ? 'exit_inspection' : 'pre_arrival';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get(`/short-stay/bookings/${bookingId}/readiness`, { params: { type: checkType } })
      .then((r) => { if (active) setData(r.data); })
      .catch((err) => { if (active) { setData(null); setError(err.response?.data?.error || 'Could not load the readiness checklist.'); } })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [bookingId, checkType]);

  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = [...drawerRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href]')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus?.(); };
  }, [onClose]);

  const toggle = (i) => setData((d) => ({ ...d, items: d.items.map((it, j) => j === i ? { ...it, done: !it.done } : it) }));
  const setNotes = (v) => setData((d) => ({ ...d, notes: v }));

  const persist = (is_passed) => api.post('/short-stay/readiness', {
    booking_id: bookingId, check_type: checkType, items: data.items, notes: data.notes || '', photos: data.photos || [], is_passed,
  });

  const onUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const f of files) {
        const fd = new FormData(); fd.append('file', f);
        const r = await api.post('/uploads?folder=documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (r.data?.data?.url) urls.push(r.data.data.url);
      }
      setData((d) => ({ ...d, photos: [...(d.photos || []), ...urls] }));
      toast.success(`${urls.length} photo${urls.length === 1 ? '' : 's'} uploaded`);
    } catch (err) { toast.error(err.response?.data?.error || 'Upload failed'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const removePhoto = (url) => setData((d) => ({ ...d, photos: (d.photos || []).filter((p) => p !== url) }));

  const saveProgress = async () => {
    setBusy(true);
    try { await persist(false); toast.success('Progress saved'); onDone(false); }
    catch (err) { toast.error(err.response?.data?.error || 'Could not save'); }
    finally { setBusy(false); }
  };
  const complete = async () => {
    setBusy(true);
    try {
      await persist(true);
      await api.post(mode === 'out' ? '/short-stay/check-out' : '/short-stay/check-in',
        mode === 'out' ? { booking_id: bookingId, keys_returned: true } : { booking_id: bookingId, house_rules_acknowledged: true });
      toast.success(mode === 'out' ? 'Guest checked out — turnover scheduled' : 'Guest checked in');
      onDone(true);
    } catch (err) { toast.error(err.response?.data?.error || 'Could not complete'); }
    finally { setBusy(false); }
  };

  const doneCount = data?.items?.filter((i) => i.done).length || 0;
  const total = data?.items?.length || 0;

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside ref={drawerRef} className="drawer" role="dialog" aria-modal="true" aria-labelledby="check-drawer-title" style={{ width: 'min(560px, 96vw)' }}>
        <div className="drawer-head">
          <h2 id="check-drawer-title">{mode === 'out' ? 'Check-out' : 'Check-in'}{data ? ` · ${data.booking_code}` : ''}</h2>
          <button ref={closeRef} type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close check-in drawer"><X size={18} /></button>
        </div>
        <div className="drawer-body">
          {loading ? <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div> : error ? <div style={{ padding: 40, textAlign: 'center' }}><p style={{ color: 'var(--bad)' }}>{error}</p><button type="button" className="pm-btn" onClick={onClose}>Close</button></div> : data ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div className="pm-avatar">{initials(data.guest_name)}</div>
                <div>
                  <div style={{ fontWeight: 650, fontSize: 13.5, color: 'var(--ink)' }}>{data.guest_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{data.property_title} · {fmtDate(data.check_in_date)} → {fmtDate(data.check_out_date)}</div>
                </div>
              </div>

              {/* Checklist */}
              <div style={{ fontSize: 11, fontWeight: 750, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--muted-2)', marginBottom: 6 }}>Checklist · {doneCount}/{total}</div>
              <div style={{ marginBottom: 18 }}>
                {data.items.map((it, i) => (
                  <button key={i} onClick={() => toggle(i)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '9px 0', borderBottom: '1px solid var(--line-soft)', background: 'none', border: 'none', borderBottomStyle: 'solid', cursor: 'pointer', textAlign: 'left', font: 'inherit' }}>
                    <span style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: 'grid', placeItems: 'center', background: it.done ? 'var(--good)' : 'transparent', border: it.done ? '1.5px solid var(--good)' : '1.5px solid var(--line)', transition: 'all .12s' }}>
                      {it.done && <Check size={13} color="#fff" strokeWidth={3} />}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: it.done ? 'var(--ink)' : 'var(--ink-soft)', fontWeight: it.done ? 600 : 500 }}>{it.label}</span>
                  </button>
                ))}
              </div>

              {/* Photos */}
              <div style={{ fontSize: 11, fontWeight: 750, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--muted-2)', marginBottom: 8 }}>Condition photos</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
                {(data.photos || []).map((url) => (
                  <div key={url} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }}>
                    <img src={fileSrc(url)} alt="Property condition evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" aria-label="Remove condition photo" onClick={() => removePhoto(url)} style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.6)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X size={12} /></button>
                  </div>
                ))}
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  style={{ aspectRatio: '1', border: '1px dashed var(--line)', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'pointer', display: 'grid', placeItems: 'center', gap: 4, fontSize: 10.5 }}>
                  {uploading ? <Spinner /> : <><Camera size={16} /> Add</>}
                </button>
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={onUpload} style={{ display: 'none' }} />
              </div>

              {/* Notes */}
              <div style={{ fontSize: 11, fontWeight: 750, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--muted-2)', marginBottom: 6 }}>Condition notes</div>
              <textarea rows={2} value={data.notes || ''} onChange={(e) => setNotes(e.target.value)} placeholder="Notes shown on the guest acknowledgement…"
                style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', font: 'inherit', fontSize: 12.5, resize: 'vertical', color: 'var(--ink)', background: 'var(--surface)' }} />
            </>
          ) : null}
        </div>
        {data && !loading && (
          <div className="drawer-foot" style={{ display: 'flex', gap: 8 }}>
            <button className="pm-btn" style={{ flex: 1, justifyContent: 'center' }} disabled={busy} onClick={saveProgress}>Save progress</button>
            <button className="pm-btn primary" style={{ flex: 1, justifyContent: 'center' }} disabled={busy || doneCount !== total || total === 0} onClick={complete}>
              {mode === 'out' ? <><ChevronRight size={15} /> Complete check-out</> : <><KeyRound size={15} /> Complete check-in</>}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

export default function CheckInOut({ goTab, refreshKey, focusBooking }) {
  const { user } = useAuth();
  const canManage = ['super_admin', 'branch_admin', 'property_manager'].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { bookingId, mode }
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/short-stay/checkinout'); setRows(Array.isArray(r.data) ? r.data : []); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load, refreshKey]);

  // Deep-link from other screens → open the right modal for a booking
  useEffect(() => {
    if (!canManage || !focusBooking || !rows.length) return;
    const row = rows.find((r) => r.booking_id === focusBooking);
    if (row) setModal({ bookingId: focusBooking, mode: row.checkin.complete ? 'out' : 'in' });
  }, [canManage, focusBooking, rows]);

  const closeModal = () => setModal(null);
  const onModalDone = (completed) => { if (completed) closeModal(); load(); };

  const shown = rows.filter((r) => filter === 'all'
    || (filter === 'arrivals' && !r.checkin.complete)
    || (filter === 'inhouse' && r.checkin.complete && !r.checkout.complete)
    || (filter === 'departed' && r.checkout.complete));

  const arrivals = rows.filter((r) => !r.checkin.complete).length;
  const inhouse = rows.filter((r) => r.checkin.complete && !r.checkout.complete).length;
  const departed = rows.filter((r) => r.checkout.complete).length;

  const rowAction = (r) => {
    if (!canManage) return <Chip k={r.status} />;
    if (!r.checkin.complete) return <button className="pm-btn primary" style={btn} onClick={() => setModal({ bookingId: r.booking_id, mode: 'in' })}><LogIn size={13} /> Check-in</button>;
    if (!r.checkout.complete) return <button className="pm-btn primary" style={btn} onClick={() => setModal({ bookingId: r.booking_id, mode: 'out' })}><LogOut size={13} /> Check-out</button>;
    return <span className="pm-chip good"><span className="d" />Departed</span>;
  };

  return (
    <div>
      <ScreenHead title="Check-in & check-out" desc="Guided arrivals and departures — every guest's checklist and condition photos in one place." />

      {/* Summary + filter */}
      <div className="pm-segment" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All <span style={{ opacity: 0.6, marginLeft: 4 }}>{rows.length}</span></button>
        <button className={filter === 'arrivals' ? 'on' : ''} onClick={() => setFilter('arrivals')}>Awaiting check-in <span style={{ opacity: 0.6, marginLeft: 4 }}>{arrivals}</span></button>
        <button className={filter === 'inhouse' ? 'on' : ''} onClick={() => setFilter('inhouse')}>In house <span style={{ opacity: 0.6, marginLeft: 4 }}>{inhouse}</span></button>
        <button className={filter === 'departed' ? 'on' : ''} onClick={() => setFilter('departed')}>Departed <span style={{ opacity: 0.6, marginLeft: 4 }}>{departed}</span></button>
      </div>

      {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : (
        <div className="pm-card"><div className="pm-card-body ss-table-scroll" style={{ padding: 0 }}>
          <table className="pm-tbl">
            <thead><tr><th>Guest</th><th>Property</th><th>Stay</th><th>Check-in</th><th>Check-out</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.booking_id}>
                  <td>
                    <div className="pm-who">
                      <div className="pm-avatar">{initials(r.guest_name)}</div>
                      <div><div className="nm">{r.guest_name}</div><div className="ph">{r.booking_code} · {r.pax} pax</div></div>
                    </div>
                  </td>
                  <td><div className="nm" style={{ fontWeight: 650 }}>{r.property_title}</div><div className="ph" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{r.area || '—'}</div></td>
                  <td style={{ fontSize: 12.5 }}>{fmtDate(r.check_in_date)} → {fmtDate(r.check_out_date)}</td>
                  <td><ProgressCell state={r.checkin} kind="checkin" /></td>
                  <td><ProgressCell state={r.checkout} kind="checkout" /></td>
                  <td><Chip k={r.status} /></td>
                  <td style={{ textAlign: 'right' }}>{rowAction(r)}</td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 34, color: 'var(--muted)' }}>No guests in this view. Confirmed bookings appear here for check-in.</td></tr>}
            </tbody>
          </table>
        </div></div>
      )}

      {modal && <CheckModal bookingId={modal.bookingId} mode={modal.mode} onClose={closeModal} onDone={onModalDone} />}
    </div>
  );
}

const btn = { padding: '5px 12px', fontSize: 12 };
