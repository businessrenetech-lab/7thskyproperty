# Real Estate & Property Management Platform — Phased Build Roadmap

A phased build plan for a property management + real estate platform: a public
website + an admin portal + secure no-login public links, all on one backend.

Each phase is a self-contained prompt you hand to an AI coding agent **in order**.
Every phase ships something usable; the hard part (settlement) comes last, after
its foundations exist. Paste the **Shared Context** at the top of every phase.

---

## SHARED CONTEXT (paste at the top of EVERY phase)

You are a senior full-stack engineer building a Real Estate & Property
Management platform: a public website + an admin portal + secure no-login public
links, all on one backend. Work in small verified increments. After each feature,
run the real app in a browser, screenshot it, and fix what's broken before moving
on. Never say "done" without exercising the actual flow.

**STACK:** Node.js + Express, Sequelize, MySQL (numbered idempotent migrations
with up/down). React + Vite admin portal with one scoped design system (CSS vars,
light/dark) and a reusable kit (Button, Drawer, DataTable, Field, StatusBadge,
FileUpload, Combo, Toast). Public website responsive + SEO-friendly. JWT auth,
role-based middleware, branch-scoped multi-tenancy (every row has branch_id,
every query is branch-scoped). Real private file uploads via an endpoint.

**IRON RULES:**
- ALL money is DECIMAL(15,2) in DB, but every calculation is done in integer
  minor units via a shared money util. Never do float math on currency.
- Audit trail on every status change and money movement (who/when/why/IP).
- Plain-language errors; never invent data.
- Ask before any destructive/irreversible step.

---

## PHASE 0 — FOUNDATION
**Goal: a running skeleton both apps talk to**

Build:
- Backend scaffold: Express app, Sequelize connection, migration runner, health
  route, error handler, config via .env (document the PORT).
- Auth: user model, register/login (bcrypt + JWT), authMiddleware,
  roleMiddleware. Roles: super_admin, branch_admin, property_manager,
  sales_executive, accounts.
- Multi-tenancy: Branch model; branchScope helper; seed one branch + one
  super_admin (print the seeded email/password).
- Shared utils: money util (toMinor/fromMinor, exact rounding), controller
  helpers (asyncHandler, pick, pagination), code generator for entity codes.
- Admin portal shell: Vite app, login screen, authenticated layout with sidebar,
  the design-system CSS + reusable kit components, a Toast context, an api
  service with the JWT interceptor.
- Public website shell: home page, responsive header/footer, routing.

**DONE WHEN:** you can log into the admin portal, hit an authenticated endpoint,
and the public site home page renders. Screenshot both.

---

## PHASE 1 — PUBLIC WEBSITE + CRM
**Goal: leads flow from web into admin**

Build:
- Property model + listings: sale & rental, categories (residential, commercial,
  rural, business), photos, price, area, district, type, status. Admin CRUD +
  a property wizard.
- Public listings: browse/search with filters (price, area, beds, district,
  type), map view, photo gallery, video/virtual tour, SEO-friendly detail pages,
  share links, admin toggle to show/hide pricing.
- CRM: Contact + Client models, admin directory, communications log,
  tasks/follow-ups.
- Public lead capture (each creates a Contact + admin record): enquiry form,
  viewing request, "list your property" (owner), "apply to rent" (tenant
  application). Leads board in admin.

**DONE WHEN:** a visitor submits an enquiry on the public site and it appears in
the admin CRM. Screenshot the public form and the admin lead.

---

## PHASE 2 — PROPERTY MANAGEMENT
**Goal: run rentals end to end**

Build:
- Owners, tenancies, lease terms, rent schedule.
- Rent invoices, receipts, owner statements (folio = the owner's trust account
  on rentals), landlord bills, arrears tracking + reminders.
- Maintenance/work orders, inspections, move-in checklist.
- Basic accounting spine used by the above: chart of accounts, account
  categories, journals, payments, folios.

**DONE WHEN:** create a tenancy, raise a rent invoice, record a payment, see it
on the owner statement. Screenshot the statement.

---

## PHASE 3 — ONBOARDING, KYC & AGREEMENTS
**Goal: verify people once, sign per deal**

Build:
- Role profiles: one per (contact, role) — roles: buyer, vendor, tenant,
  landlord, third_party, provider. Status machine (draft → kyc_pending →
  documents_pending → agreement_pending → signing_sent → signed → active).
- KYC document center + a review center (submit/verify/reject/resubmit), a
  role-based required-documents schema.
- **KYC REUSE RULE — "KYC follows the person, agreements follow the property":**
  classify each doc by scope — **identity** (reused across ALL roles/properties),
  **role** (reused across properties for the SAME role), **property** (NEVER
  reused). Expired docs never reused; reused docs record which verified original
  they came from (provenance) for audit. A fully-reused profile still lands on
  agreement_pending because every property needs its own signed agreement. Wire
  reuse into every place a role profile is created + a manual "Reuse verified
  KYC" action. Write a regression test (buyer→buyer full reuse + agreement
  pending; buyer→vendor identity-only; provenance; idempotency).
- Agreement generation (prefilled per role) + e-signing envelopes (signer
  fields, send, track status). Secure no-login public link for KYC intake +
  signing.

**DONE WHEN:** verify a buyer's KYC once, create a second buyer profile for
another property, confirm KYC auto-reuses and only the agreement remains. Test
passes.

---

## PHASE 4 — SALES PIPELINE
**Goal: listing → offer → accepted transaction**

Build:
- Sale profile per property (agency agreement terms: commission fixed or %,
  marketing fee, dates, agreement status; trust bank account config).
- Parties: vendors/owners on the property; solicitors/representatives.
- Offers: multi-buyer with ownership %, deposit, proof-of-funds upload; status
  machine (draft/submitted/countered/accepted/rejected/withdrawn/expired);
  edit while draft/submitted/countered; cancel with written reason.
- Accept offer → creates a transaction + transaction parties (buyers/vendors),
  auto-creates role profiles (KYC reuse fires here), supersedes other accepted
  offers, property → reserved.
- Assessment/appraisal workspace (comparables, proposals) as a guided sub-flow.

**DONE WHEN:** record an offer with proof of funds, accept it, see the
transaction created with parties and role profiles. Screenshot.

---

## PHASE 5 — SETTLEMENT ENGINE
**Goal: the trust-accounting core — get it exact**

A settlement is trust accounting for one sale. Build the money model server-side
as the single source of truth.

Build:
- Settlement + statement lines (purchase_price, commission, advertising,
  admin_fee, legal_fee, vat_tax, buyer_refund, vendor_proceeds…).
- **Identity (completion sale):** vendor_proceeds = purchase_price − fees −
  refunds due. Auto-rebalance vendor proceeds on any fee/line change; one-click
  Rebalance; never leave a silent residual.
- Trust movements = PAYMENTS (incoming receipts / outgoing refunds+payouts).
  Disbursements are payout instructions evidenced by a matching cleared outgoing
  payment (don't double-count).
- **Computed figures:** received (cleared in), pending_receipts (separate, never
  counted as received), refunded (buyer refunds actually paid — vendor payouts do
  NOT count), disbursed, funds_held = received − paid, unpaid_obligations,
  residual = funds_held − unpaid_obligations (MUST be 0 to lock).
- **REVERSALS:** a payment and its reversal always drop out together; reversing
  an outgoing payment that funded a paid payout reverts that payout to pending.
- **Payment kinds drive the form:** buyer_* → buyer party only; vendor_payout →
  vendor only; agency_fee → fixed "our agency" payee (no party); third_party →
  require payee name+phone; adjustment → optional.
- **Lifecycle:** draft→submitted→reviewed→approved→locked (+returned). Separation
  of duties enforced by USER (preparer≠reviewer≠approver); super-admin override
  with written reason. Prepare payouts in draft; money leaves only after
  approved; locked = immutable.
- **BUYER WITHDRAWAL:** refund_to_buyer = buyer_cleared_funds − forfeit − fees
  (forfeit + fees stay credited to the vendor). Live calc in the form; block
  over-deduction. Two unwind paths: money cleared → withdrawal settlement → lock;
  zero cleared funds → fast Cancel (refuse if any cleared/pending money or paid
  payout exists). After unwind: offer→withdrawn, transaction→cancelled,
  property→available; accepting a NEW offer creates a fresh transaction +
  settlement; cancelled settlements render read-only with no blockers.
- **Agency fees:** commission + marketing from the vendor's agreement carried
  onto the line + vendor invoice; staff edits require a written term shown on
  invoice.

Write regression tests for: reversal-pair exclusion, refund-vs-payout,
pending-exclusion, withdrawal allocation, residual, transition guards.

**DONE WHEN:** record receipts, prepare payouts, walk a settlement to locked with
residual 0; run a buyer withdrawal and confirm forfeit stays with vendor. Tests
pass. Screenshot the balanced statement.

---

## PHASE 6 — RECONCILIATION, LEDGER & POLISH
**Goal: audit-grade + Figma-level UI**

Build:
- Import signed trust-bank statement lines (+ in, − out). Reconcile a CLEARED
  payment against a line whose signed amount EXACTLY equals the payment's;
  require uploaded bank-statement evidence; flip the line to Matched. Distinguish
  provisional "Matched" (no evidence) from final "Reconciled" (line consumed).
- Ledger posting: post journals for cleared payments; only require posting when
  ledger accounts are configured.
- Trust account statement (chronological, running balance, reconciliation status)
  + approval history timeline as the audit views.
- Reports: settlement summaries, funds held, payout exceptions, completed sales.
- UI polish pass (apply everywhere): calm low-noise screens, one primary action
  per stage, status-driven stepper that never shows a button that will 409;
  blockers hidden behind a "N blockers — view checklist" button opening a
  numbered linear modal with a "Go" to each fix; every summary figure clickable
  to a breakdown with its formula; modals locked to purpose (Add receipt = in,
  Add payment = out) with live checks against the offer/agreement; responsive,
  light/dark, accessible.

**DONE WHEN:** import a bank line, reconcile a payment against it with evidence,
see it Matched on the audit statement, and the blockers checklist + figure
breakdowns work. Screenshot the reconciled statement.

---

## Notes

- **You can stop and use it at any phase boundary** — after Phase 2 you already
  have a working rental business; after Phase 4 a working sales pipeline; Phase
  5–6 add the accounting depth.
- **Phase 5 is the risky one** — budget the most time there and insist the agent
  write the regression tests *first*, because that's exactly where systems
  silently miscalculate (reversals, refund-vs-payout, withdrawal forfeit).
