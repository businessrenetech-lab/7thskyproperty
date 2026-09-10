// admin-portal/src/screens/sales/settlement-desk/SettlementDesk.jsx
//
// The canonical five-view Settlement Desk: one full-page workspace over the
// existing /sales engine. Header = property + four evidence-derived badges +
// one prominent next action. A quiet stepper selects the active view (a free
// selector via ?view=, never a forced sequence). Raw ledger detail lives in the
// AuditPanel disclosure. All money rules stay server-side; this is a client.
import React from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { PageHead, Button, Badge, Spinner } from '../../../ui/kit';
import { useSettlementDesk } from './useSettlementDesk';
import { deskBadges, STATUS_TONE, label } from './settlementMoney';
import AuditPanel from './AuditPanel';
import PrepareView from './PrepareView';
import ReviewApproveView from './ReviewApproveView';
import RecordMoneyView from './RecordMoneyView';
import MatchBankView from './MatchBankView';
import CompleteView from './CompleteView';
import './settlement-desk.css';

const VIEWS = [
  { key: 'prepare', label: 'Prepare', C: PrepareView },
  { key: 'review', label: 'Review & approve', C: ReviewApproveView },
  { key: 'record', label: 'Record money', C: RecordMoneyView },
  { key: 'match', label: 'Match bank', C: MatchBankView },
  { key: 'complete', label: 'Complete', C: CompleteView },
];

// Which view owns each compliance blocker, so a Resolve link jumps to the right
// place. Anything unmapped falls through to Complete.
const BLOCKER_VIEW = {
  pending_payments: 'record', outgoing_obligations_unpaid: 'record', pending_disbursements: 'record',
  unallocated_outgoing_payments: 'record', settlement_residual_nonzero: 'record',
  unreconciled_payments: 'match', posting_required: 'match',
  invalid_settlement_schedule: 'prepare', invalid_disbursement_allocations: 'prepare',
};

// Maps the property-file next_action string to a { label, view?, action? }.
function nextActionSpec(nextAction) {
  if (!nextAction) return null;
  if (nextAction.startsWith('clear:')) {
    const blocker = nextAction.slice('clear:'.length);
    return { label: `Resolve: ${label(blocker)}`, view: BLOCKER_VIEW[blocker] || 'complete' };
  }
  const map = {
    submit_settlement: { label: 'Submit for review', view: 'review' },
    review_settlement: { label: 'Review settlement', view: 'review' },
    approve_settlement: { label: 'Approve settlement', view: 'review' },
    lock_settlement: { label: 'Lock & complete', view: 'complete' },
    complete: { label: 'Complete', view: 'complete' },
  };
  return map[nextAction] || { label: label(nextAction), view: 'complete' };
}

export default function SettlementDesk() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const desk = useSettlementDesk(id);
  const view = sp.get('view') || 'prepare';
  const goView = (k) => setSp((prev) => {
    const n = new URLSearchParams(prev);
    n.set('view', k);
    return n;
  }, { replace: true });

  if (desk.error) {
    return (
      <div className="pm-card card-pad">
        {desk.error} <Button variant="ghost" size="sm" onClick={desk.refetch}>Retry</Button>
      </div>
    );
  }
  if (!desk.picture) return <div className="card-pad"><Spinner /></div>;

  const { picture } = desk;
  const badges = deskBadges(picture);
  const Active = (VIEWS.find((v) => v.key === view) || VIEWS[0]).C;
  const na = nextActionSpec(picture.nextAction);
  const isWithdrawal = picture.settlement?.settlement_type === 'withdrawal';
  const viewLabel = (v) => (isWithdrawal && v.key === 'prepare' ? 'Withdrawal schedule' : v.label);

  return (
    <div className="settlement-desk">
      <PageHead
        title={`Settlement · ${picture.property?.property_code || picture.property?.title || ''}`}
        desc={picture.settlement
          ? `${label(picture.settlement.settlement_type)} settlement ${picture.settlement.settlement_code}`
          : 'No settlement yet — accept an offer and open a settlement from the sales file'}
        actions={<Button variant="ghost" size="sm" onClick={() => navigate(-1)}>Back</Button>}
      />

      <div className="desk-badges">
        {[['Contract', badges.contract], ['Settlement', badges.settlement], ['Money due', badges.payment], ['Payouts', badges.payout]].map(([k, v]) => (
          <div key={k} className="card card-pad">
            <div className="cell-sub">{k}</div>
            <Badge tone={STATUS_TONE[v] || 'grey'}>{label(v)}</Badge>
          </div>
        ))}
      </div>

      {na && (
        <div className="desk-nextaction card card-pad">
          <span><strong>Next:</strong> {na.label}</span>
          <Button size="sm" onClick={() => (na.view ? goView(na.view) : null)}>{na.label}</Button>
        </div>
      )}

      <nav className="desk-stepper" role="tablist">
        {VIEWS.map((v) => (
          <button key={v.key} role="tab" aria-selected={view === v.key} className={view === v.key ? 'on' : ''} onClick={() => goView(v.key)}>
            {viewLabel(v)}
          </button>
        ))}
      </nav>

      <div className="desk-view">
        <Active picture={picture} desk={desk} goView={goView} />
      </div>

      <AuditPanel picture={picture} />
    </div>
  );
}
