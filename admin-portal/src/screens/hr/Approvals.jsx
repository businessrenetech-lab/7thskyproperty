import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, X, Clock, Circle, ArrowRight, Undo2 } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../ui/kit';
import { useHrMe, errText, Loading, Tag, ago, fmtDate } from './hrShared';

/*
 * Approvals (M1 §6, M2 §9, M3 §5; design window "Approvals"). One inbox for every HR change. Nothing
 * changes until the last approver says yes; nobody can approve their own request.
 */

const TABS = [['mine', 'Waiting for me'], ['waiting', 'I raised'], ['open', 'All open'], ['decided', 'Decided']];
const STATUS = { approved: ['green', 'Approved'], rejected: ['red', 'Rejected'], withdrawn: ['slate', 'Withdrawn'], pending: ['amber', 'Pending'] };

const show = (v) => (v == null || v === '' ? '—' : Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v));
const FIELD = { name: 'Name', title: 'Title', division_id: 'Division', department_id: 'Department', team_id: 'Team', reports_to_position_id: 'Reports to',
  salary_grade_id: 'Salary grade', min_amount: 'Minimum', max_amount: 'Maximum', is_active: 'Active', headcount: 'Seats', employment_type: 'Employment type',
  job_description: 'Job description', location_branch_id: 'Location', cost_centre_id: 'Cost centre', is_top: 'Top of the company', skills: 'Skills',
  qualifications: 'Qualifications', experience: 'Experience', approval_authority: 'Approval authority' };

export default function Approvals() {
  const toast = useToast();
  const { can } = useHrMe();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') || 'mine');
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const selected = params.get('id');
  const seeAll = can('emp.view_any') || can('org.edit');
  const tabs = TABS.filter(([k]) => k !== 'open' || seeAll);

  const load = useCallback(() => {
    setError(null);
    api.get('/hr/approvals', { params: { scope: tab, limit: 100 } })
      .then((r) => setList(r.data))
      .catch((e) => setError(errText(e, 'The approvals could not be loaded.')));
  }, [tab]);
  useEffect(load, [load]);

  const [detail, setDetail] = useState(null);
  useEffect(() => {
    setComment('');
    if (!selected) { setDetail(null); return; }
    const inList = list?.data.find((r) => String(r.id) === selected);
    if (inList) { setDetail(inList); return; }
    api.get(`/hr/approvals/${selected}`).then((r) => setDetail(r.data)).catch(() => setDetail(null));
  }, [selected, list]);

  const pick = (id) => setParams((p) => { const n = new URLSearchParams(p); n.set('id', id); return n; }, { replace: true });
  const switchTab = (k) => { setTab(k); setList(null); setParams({ tab: k }, { replace: true }); };

  const decide = async (decision) => {
    if (decision === 'reject' && !comment.trim()) { toast.error('Say why it is rejected'); return; }
    setBusy(true);
    try {
      const r = await api.post(`/hr/approvals/${detail.id}/decision`, { decision, comment });
      const s = r.data.request.status;
      toast.success(s === 'approved' ? 'Approved and applied' : s === 'rejected' ? 'Rejected' : `Approved. Now waiting for the ${r.data.request.waiting_for}`);
      setDetail(r.data.request);
      load();
    } catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };
  const withdraw = async () => {
    setBusy(true);
    try { const r = await api.post(`/hr/approvals/${detail.id}/withdraw`); toast.success('Withdrawn'); setDetail(r.data); load(); }
    catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };

  return (
    <div className="hrm">
      <div className="hrm-head">
        <div>
          <h1>Approvals</h1>
          <p>Changes that need a decision. Nothing changes until the last approver says yes.</p>
        </div>
      </div>
      <div className="hrm-tabs" role="group" aria-label="Which requests">
        {tabs.map(([k, label]) => (
          <button key={k} type="button" aria-pressed={tab === k} onClick={() => switchTab(k)}>{label}{list?.counts?.[k] != null && <b>{list.counts[k]}</b>}</button>
        ))}
      </div>

      {!list ? <Loading error={error} reload={load} /> : (
        <div className="hrm-split wide-left">
          <section className="hrm-card" aria-label="Requests">
            {list.data.length ? (
              <div className="hrm-inbox">
                {list.data.map((r) => (
                  <button key={r.id} type="button" className="hrm-req" aria-current={String(r.id) === selected} onClick={() => pick(r.id)}>
                    <div className="top"><b>{r.label}</b><code>{r.code}</code><span className="when">{ago(r.createdAt)}</span></div>
                    <p>{r.payload?.title || r.payload?.name || (r.entity_id ? `${r.entity_type.replace('_', ' ')} #${r.entity_id}` : '')}{r.requested_by_name ? ` · by ${r.requested_by_name}` : ''}</p>
                    <div className="chain">
                      {r.chain.map((s, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && ' → '}
                          <span className={r.status === 'pending' && i === r.step ? 'now' : ''}>{s.role_label}{s.decision === 'approve' ? ' ✓' : s.decision === 'reject' ? ' ✗' : ''}</span>
                        </React.Fragment>
                      ))}
                      {r.status !== 'pending' && <> · <Tag tone={STATUS[r.status][0]}>{STATUS[r.status][1]}</Tag></>}
                    </div>
                  </button>
                ))}
              </div>
            ) : <div className="hrm-empty">{tab === 'mine' ? 'Nothing is waiting for you.' : tab === 'waiting' ? 'You have no open requests.' : 'No requests here.'}</div>}
          </section>

          {detail ? <Detail r={detail} comment={comment} setComment={setComment} busy={busy} onDecide={decide} onWithdraw={withdraw} />
            : <section className="hrm-card"><div className="hrm-empty">Choose a request to see what changes and who approves it.</div></section>}
        </div>
      )}
    </div>
  );
}

function Detail({ r, comment, setComment, busy, onDecide, onWithdraw }) {
  const keys = Object.keys(r.payload || {});
  const creating = !r.entity_id || r.kind.endsWith('.create');
  const rejectedAt = r.chain.findIndex((s) => s.decision === 'reject');
  return (
    <section className="hrm-card" aria-label={`${r.label} ${r.code}`} style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="hrm-card-head" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: 17 }}>{r.label}{r.entity_name || r.payload?.title || r.payload?.name ? `: ${r.entity_name || r.payload.title || r.payload.name}` : ''}</h2>
          <small>{r.code} · raised by {r.requested_by_name || 'someone'} on {fmtDate(r.createdAt)}</small>
        </div>
        <Tag tone={STATUS[r.status][0]}>{STATUS[r.status][1]}</Tag>
      </div>

      <div className="hrm-diff">
        <span className="h">{creating ? 'What will be created' : 'What changes'}</span>
        {keys.map((k) => (
          <React.Fragment key={k}>
            <span>{FIELD[k] || k}</span>
            {creating ? <span /> : <s>{show((r.before_display || r.before)?.[k])}</s>}
            {creating ? <span /> : <ArrowRight size={14} aria-hidden="true" />}
            <b>{show((r.payload_display || r.payload)[k])}</b>
          </React.Fragment>
        ))}
        {(r.hidden_fields || []).map((k) => (
          <React.Fragment key={k}>
            <span>{FIELD[k] || k.replace(/_/g, ' ')}</span>
            <span /><span />
            <b className="hrm-note">Restricted by your access</b>
          </React.Fragment>
        ))}
      </div>
      {r.reason && <div className="hrm-pad"><span className="hrm-note">Reason</span><p className="hrm-text">{r.reason}</p></div>}

      <div className="hrm-card-head"><h2>Approval chain</h2></div>
      <ol className="hrm-steps">
        <li>
          <span className="dot ok"><Check size={12} /></span>
          <div><b>Requested</b><small>{r.requested_by_name || '—'}</small></div>
          <span className="at">{fmtDate(r.createdAt)}</span>
        </li>
        {r.chain.map((s, i) => {
          const now = r.status === 'pending' && i === r.step;
          const skipped = rejectedAt >= 0 && i > rejectedAt;
          return (
            <li key={i}>
              <span className={`dot ${s.decision === 'approve' ? 'ok' : s.decision === 'reject' ? 'no' : now ? 'now' : ''}`}>
                {s.decision === 'approve' ? <Check size={12} /> : s.decision === 'reject' ? <X size={12} /> : now ? <Clock size={12} /> : <Circle size={8} />}
              </span>
              <div>
                <b>{s.role_label} {i === r.chain.length - 1 && r.chain.length > 1 ? 'approval' : 'review'}</b>
                {s.decided_by_name && <small>{s.decided_by_name}{s.comment ? `: “${s.comment}”` : ''}</small>}
                {now && !r.can_decide && r.can_withdraw && <small className="warn">Another {s.role_label} must decide. You raised this request.</small>}
              </div>
              <span className="at">{s.at ? fmtDate(s.at) : skipped ? 'Not needed' : now ? 'Waiting' : r.status === 'pending' ? 'Not yet' : '—'}</span>
            </li>
          );
        })}
        <li>
          <span className={`dot ${r.status === 'approved' ? 'ok' : ''}`}>{r.status === 'approved' ? <Check size={12} /> : <Circle size={8} />}</span>
          <div><b>System updated</b><small>The change and its history log</small></div>
          <span className="at">{r.status === 'approved' ? 'Done' : ''}</span>
        </li>
      </ol>

      <div style={{ flex: 1 }} />
      {r.can_decide && (
        <div className="hrm-decide">
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment for the next approver (needed to reject)" aria-label="Comment" />
          <Button variant="secondary" icon={X} disabled={busy} onClick={() => onDecide('reject')}>Reject</Button>
          <Button icon={Check} disabled={busy} onClick={() => onDecide('approve')}>Approve</Button>
        </div>
      )}
      {r.can_withdraw && (
        <div className="hrm-decide"><span className="hrm-note" style={{ flex: 1 }}>You raised this. You can withdraw it while it is open.</span><Button variant="secondary" icon={Undo2} disabled={busy} onClick={onWithdraw}>Withdraw</Button></div>
      )}
    </section>
  );
}
