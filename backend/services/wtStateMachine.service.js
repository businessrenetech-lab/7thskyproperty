/**
 * wtStateMachine.service.js — what may happen next, declared once.
 *
 * The transitions were always there, spread across controllers as ad-hoc `if`
 * statements: one screen refused to void a paid invoice, another let it through;
 * "can this quotation be approved?" was answered differently by the button that
 * showed the action and the endpoint that performed it. When the rule lives in
 * two places it is really two rules, and they drift.
 *
 * So every lifecycle rule for the water-tank entities is declared here, once, and
 * both questions are answered from the same table:
 *
 *   availableActions()  what the UI should offer, and why the rest are greyed out
 *   assertAction()      what the API enforces before it writes
 *
 * Two kinds of obstacle, deliberately distinct:
 *
 *   BLOCKER   the transition is refused. Reserved for things that would corrupt
 *             the record or break a contractual or legal rule — voiding an
 *             invoice a client has already paid, approving a quotation bound to
 *             a signed agreement.
 *
 *   WARNING   the transition proceeds, with a note. This follows the advisory
 *             pattern already used by wtProject.stageWarning(): the SOP has an
 *             order, but reality does not always follow it, and software that
 *             refuses to record what actually happened just gets worked around
 *             in a spreadsheet. Warn, record, move on.
 *
 * Adding an entity means adding a table entry, not another branch in a controller.
 */

const eq = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
const oneOf = (v, list) => list.some((x) => eq(v, x));
const num = (v) => Number(v || 0);
const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
};

/*
 * Role tiers, matching middleware/wtRoles.js so the answer the UI gets and the
 * answer the route enforces come from one vocabulary:
 *   operate   — coordinators running the job
 *   transact  — money
 *   bind      — committing Seventh Sky to a counterparty
 *   administer— corrections and destructive acts
 */
const MACHINES = {
  quotation: {
    field: 'decision',
    label: 'Quotation',
    states: ['Pending', 'Sent', 'Approved', 'Rejected', 'Expired', 'Converted'],
    actions: {
      send: {
        label: 'Send to client', to: 'Sent', from: ['Pending'], tier: 'operate',
        check: (q) => {
          const blockers = [];
          if (!asArray(q.lines).length && num(q.total) <= 0) blockers.push('This quotation has no priced lines.');
          return { blockers, warnings: [] };
        },
      },
      approve: {
        label: 'Client approved', to: 'Approved', from: ['Pending', 'Sent'], tier: 'operate',
        check: (q, ctx) => {
          const blockers = []; const warnings = [];
          if (ctx?.boundToSignedAgreement) blockers.push('This quotation is bound to a signed agreement — its terms are fixed.');
          if (num(q.total) <= 0) blockers.push('A quotation with no value cannot be approved.');
          if (eq(q.decision, 'Pending')) warnings.push('This quotation was never sent to the client (Sec. 7 Step 5).');
          return { blockers, warnings };
        },
      },
      reject: { label: 'Client declined', to: 'Rejected', from: ['Pending', 'Sent'], tier: 'operate' },
      expire: { label: 'Mark expired', to: 'Expired', from: ['Pending', 'Sent'], tier: 'operate' },
      convert: {
        label: 'Raise work order', to: 'Converted', from: ['Approved'], tier: 'bind',
        check: (q, ctx) => ({
          blockers: ctx?.hasWorkOrder ? ['A work order already exists for this quotation.'] : [],
          warnings: [],
        }),
      },
    },
  },

  work_order: {
    field: 'status',
    label: 'Work order',
    states: ['Draft', 'Issued', 'Accepted', 'Scheduled', 'In Progress', 'Completed', 'Verified', 'Closed', 'Cancelled'],
    actions: {
      assign: {
        label: 'Assign provider', to: 'Issued', from: ['Draft', 'Issued'], tier: 'operate',
        check: (w) => ({
          blockers: [],
          warnings: num(w.provider_fee) > 0 ? [] : ['No provider fee is set — the payout will have nothing to draw against.'],
        }),
      },
      accept: {
        label: 'Provider accepted', to: 'Accepted', from: ['Issued'], tier: 'operate',
        check: (w) => ({ blockers: w.provider_name ? [] : ['Assign a provider before recording an acceptance.'], warnings: [] }),
      },
      decline: { label: 'Provider declined', to: 'Draft', from: ['Issued'], tier: 'operate' },
      schedule: { label: 'Schedule', to: 'Scheduled', from: ['Accepted', 'Issued'], tier: 'operate' },
      start: { label: 'Work started', to: 'In Progress', from: ['Scheduled', 'Accepted'], tier: 'operate' },
      complete: {
        label: 'Mark complete', to: 'Completed', from: ['In Progress', 'Scheduled'], tier: 'operate',
        check: (w) => ({
          blockers: [],
          warnings: w.wo_signed_at ? [] : ['The work order was never signed by the provider (SOP-02 Sec. 8).'],
        }),
      },
      verify: {
        label: 'Verify completion', to: 'Verified', from: ['Completed'], tier: 'operate',
        check: (w) => ({
          blockers: [],
          // Completion verification is what releases the provider's money on most
          // agreements, so a missing report is worth saying out loud.
          warnings: asArray(w.photos).length || w.completion_notes ? [] : ['No completion evidence recorded (photos or notes).'],
        }),
      },
      close: {
        label: 'Close', to: 'Closed', from: ['Verified', 'Completed'], tier: 'operate',
        check: (w, ctx) => ({
          blockers: [],
          warnings: num(ctx?.payoutRemaining) > 0.009
            ? [`The provider is still owed ${num(ctx.payoutRemaining).toLocaleString('en-BD')} on this work order.`] : [],
        }),
      },
      cancel: {
        label: 'Cancel', to: 'Cancelled', from: ['Draft', 'Issued', 'Accepted', 'Scheduled'], tier: 'bind',
        check: (w, ctx) => ({
          blockers: num(ctx?.payoutPaid) > 0 ? ['A work order the provider has already been paid against cannot be cancelled — reverse the payout first.'] : [],
          warnings: [],
        }),
      },
    },
  },

  invoice: {
    field: 'status',
    label: 'Invoice',
    states: ['Draft', 'Sent', 'Viewed', 'Part Paid', 'Paid', 'Overdue', 'Void'],
    actions: {
      send: {
        label: 'Send to client', to: 'Sent', from: ['Draft'], tier: 'transact',
        check: (i) => {
          const blockers = [];
          if (!asArray(i.lines).length) blockers.push('An invoice with no lines cannot be sent.');
          if (num(i.amount) <= 0) blockers.push('An invoice with no value cannot be sent.');
          const warnings = [];
          if (!i.due_date) warnings.push('No due date is set, so this will never age into Overdue.');
          if (!i.bill_to_email) warnings.push('No billing email on file — this will have to be delivered by hand.');
          return { blockers, warnings };
        },
      },
      // Receipts are not a transition here: money is posted through
      // wtLedger.service, which derives the status from the ledger. Listing a
      // "mark paid" action would create a second way to change the same thing,
      // which is the exact problem this file exists to prevent.
      void: {
        label: 'Void', to: 'Void', from: ['Draft', 'Sent', 'Viewed', 'Part Paid', 'Overdue'], tier: 'transact',
        check: (i, ctx) => {
          const blockers = [];
          if (num(ctx?.received) > 0) {
            blockers.push('Money has been received against this invoice. Reverse the receipt first, so the correction is on the record.');
          }
          return { blockers, warnings: ['Voiding keeps the number on the register — it is never reused.'] };
        },
      },
      remove: {
        label: 'Delete', to: null, from: ['Draft'], tier: 'administer',
        check: (i) => ({
          blockers: eq(i.status, 'draft') ? [] : ['Only a draft can be deleted. Void an issued invoice instead so the numbering stays continuous.'],
          warnings: [],
        }),
      },
    },
  },

  amc: {
    field: 'status',
    label: 'AMC contract',
    states: ['Draft', 'Active', 'Suspended', 'Expired', 'Cancelled', 'Renewed'],
    actions: {
      activate: {
        label: 'Activate', to: 'Active', from: ['Draft', 'Suspended'], tier: 'bind',
        check: (a) => {
          const blockers = []; const warnings = [];
          if (!a.start_date || !a.end_date) blockers.push('An AMC needs a start and end date before it can run.');
          if (num(a.contract_value) <= 0) blockers.push('An AMC with no contract value cannot be activated.');
          if (!a.agreement_code) warnings.push('No signed agreement is linked to this contract (Clause 2).');
          return { blockers, warnings };
        },
      },
      suspend: { label: 'Suspend', to: 'Suspended', from: ['Active'], tier: 'bind' },
      expire: { label: 'Mark expired', to: 'Expired', from: ['Active', 'Suspended'], tier: 'operate' },
      renew: {
        label: 'Renew', to: 'Renewed', from: ['Active', 'Expired'], tier: 'bind',
        check: (a, ctx) => ({ blockers: ctx?.hasRenewal ? ['A renewal contract already exists.'] : [], warnings: [] }),
      },
      cancel: {
        label: 'Cancel', to: 'Cancelled', from: ['Draft', 'Active', 'Suspended'], tier: 'bind',
        check: (a, ctx) => ({
          blockers: [],
          warnings: num(ctx?.unpaidInstalments) > 0
            ? [`${ctx.unpaidInstalments} instalment invoice(s) are still outstanding on this contract.`] : [],
        }),
      },
    },
  },
};

class TransitionError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; Object.assign(this, extra); }
}

/** The machine for an entity, or null if it has none declared. */
const machineFor = (entity) => MACHINES[entity] || null;

/** The record's current state, read from whichever column that entity uses. */
const stateOf = (entity, record) => {
  const m = machineFor(entity);
  return m ? String(record?.[m.field] ?? '').trim() : null;
};

function evaluate(entity, action, record, ctx = {}) {
  const m = machineFor(entity);
  if (!m) throw new TransitionError(500, `No state machine is declared for "${entity}".`);
  const def = m.actions[action];
  if (!def) throw new TransitionError(400, `"${action}" is not an action on a ${m.label.toLowerCase()}.`);

  const current = stateOf(entity, record);
  const blockers = []; const warnings = [];

  if (!oneOf(current, def.from)) {
    // These strings are shown to operators, so the article has to agree.
    const noun = m.label.toLowerCase();
    const article = /^[aeiou]/.test(noun) ? 'An' : 'A';
    blockers.push(`${article} ${noun} in "${current || 'no state'}" cannot be ${def.label.toLowerCase()} — that needs ${def.from.join(' or ')}.`);
  }
  if (def.check) {
    const out = def.check(record, ctx) || {};
    (out.blockers || []).forEach((b) => blockers.push(b));
    (out.warnings || []).forEach((w) => warnings.push(w));
  }

  return {
    action, label: def.label, from: current, to: def.to, tier: def.tier,
    allowed: blockers.length === 0, blockers, warnings,
  };
}

/**
 * Every action for this record, allowed or not, each carrying its reason.
 *
 * The refused ones are returned deliberately: a greyed-out button that says why
 * teaches the operator the process, where a hidden one just looks broken.
 */
function availableActions(entity, record, ctx = {}) {
  const m = machineFor(entity);
  if (!m) return [];
  return Object.keys(m.actions).map((a) => evaluate(entity, a, record, ctx));
}

/** The one an operator should probably do next — the first allowed action. */
function nextRecommended(entity, record, ctx = {}) {
  return availableActions(entity, record, ctx).find((a) => a.allowed) || null;
}

/**
 * Enforce. Throws with the blockers if the transition is not legal, and returns
 * the evaluation (warnings included) if it is, so the caller can surface them.
 */
function assertAction(entity, action, record, ctx = {}) {
  const out = evaluate(entity, action, record, ctx);
  if (!out.allowed) {
    throw new TransitionError(409, out.blockers[0], { blockers: out.blockers, action, from: out.from });
  }
  return out;
}

module.exports = {
  MACHINES, TransitionError,
  machineFor, stateOf, evaluate, availableActions, nextRecommended, assertAction,
};
