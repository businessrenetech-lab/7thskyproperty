import React, { useCallback, useEffect, useState } from 'react';
import { LogIn, LogOut, CircleCheck, CalendarDays } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, Button, Badge, EmptyState, Spinner } from '../../ui/kit';
import '../../styles/hr.css';

/*
 * My attendance: check in / check out for today and the last 60 days. Ported from the Hadi Real Estate staff
 * portal (MyAttendance). The server takes the time (Asia/Dhaka) and refuses a second check-in.
 */
const getPosition = () => new Promise((resolve) => {
  if (!navigator.geolocation) return resolve({});
  navigator.geolocation.getCurrentPosition(
    (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
    () => resolve({}),
    { timeout: 5000 },
  );
});

const TONE = { present: 'green', late: 'amber', half_day: 'amber', absent: 'red', on_leave: 'blue' };
const LABEL = { present: 'Present', late: 'Late', half_day: 'Half day', absent: 'Absent', on_leave: 'On leave' };
const todayYmd = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
const time = (t) => (t ? String(t).slice(0, 5) : '–');
const day = (d) => new Date(`${String(d).slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });

export default function MyAttendance() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get('/hrm/me/attendance')
      .then((r) => { setRows(r.data); setError(''); })
      .catch((e) => setError(e.response?.data?.error || 'Could not load your attendance'));
  }, []);
  useEffect(load, [load]);

  const today = (rows || []).find((r) => String(r.date).slice(0, 10) === todayYmd());
  const checkedIn = !!today?.check_in;
  const checkedOut = !!today?.check_out;

  const act = async (kind) => {
    setBusy(true);
    try {
      await api.post(`/hrm/me/attendance/${kind}`, await getPosition());
      toast.success(kind === 'check-in' ? 'Checked in' : 'Checked out');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'That did not work. Try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="hr">
      <PageHead title="My attendance" desc="Check in when you start work and check out when you leave." />
      {error && <div className="hr-alert">{error}</div>}
      {!rows && !error ? <Spinner /> : (
        <div className="hr-grid">
          <section className="hr-card">
            <p className="hr-hint">{new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h2 className="hr-big">
              {!checkedIn ? 'Not checked in yet' : checkedOut ? 'Done for today' : `Checked in at ${time(today.check_in)}`}
            </h2>
            {checkedIn && (
              <dl className="hr-dl">
                <div><dt>Check in</dt><dd>{time(today.check_in)}</dd></div>
                <div><dt>Check out</dt><dd>{checkedOut ? time(today.check_out) : '–'}</dd></div>
              </dl>
            )}
            {!checkedIn && <Button icon={LogIn} disabled={busy} onClick={() => act('check-in')}>Check in</Button>}
            {checkedIn && !checkedOut && <Button icon={LogOut} disabled={busy} onClick={() => act('check-out')}>Check out</Button>}
            {checkedOut && <p className="hr-hint hr-row"><CircleCheck size={16} /> See you tomorrow.</p>}
            {!checkedIn && <p className="hr-hint">Your location is saved with the check-in if your browser allows it.</p>}
          </section>

          <section className="hr-card">
            <h3 className="hr-card__title">Last 60 days</h3>
            {!rows?.length ? <EmptyState icon={CalendarDays} title="No attendance yet" sub="Your check-ins will appear here." /> : (
              <div className="hr-list">
                {rows.map((r) => (
                  <div key={r.id} className="hr-list__row">
                    <span>
                      <strong>{day(r.date)}</strong>
                      <span className="hr-hint">In {time(r.check_in)}, out {time(r.check_out)}</span>
                    </span>
                    <Badge tone={TONE[r.status] || 'grey'}>{LABEL[r.status] || r.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
