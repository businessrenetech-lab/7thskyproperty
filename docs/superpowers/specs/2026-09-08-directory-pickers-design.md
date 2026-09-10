# Directory-loaded pickers + cascade — design

**Date:** 2026-09-08
**Status:** Approved, building
**Scope:** frontend only (admin-portal); all service lines via shared screens

## Problem

A few shared operations screens still make staff TYPE an identifier into a free-text
box — a client code, a work-order code, or a project id — which is error-prone and
lets a record point at something that does not exist. Everything should instead be
**picked from the directory** (loaded from the backend) and related references should
**prefill automatically**. Most core screens (New Project, Create Invoice, Project
detail, client portal) already use backend-loaded `<select>`s and are out of scope.

## Decisions (with the user)

- **Scope:** fix the remaining free-text id fields + add client→related cascade; leave
  the already-working dropdowns alone.
- **Cascade rule:** client-first. Dependent pickers (project / WO / quotation) stay
  disabled until a client is chosen, then load scoped to that client and auto-select
  when exactly one exists.

## Why frontend-only

`GET /wt-clients/:code` already returns the client's full dossier — `projects`,
`quotations`, `work_orders`, `invoices` — so a picker can fetch a client once and
cascade its related records. `ClientLookupField` (search clients, line-scoped) already
exists. No new endpoints.

## Shared building blocks (admin-portal/src/screens/watertank/common.jsx)

- **ClientLookupField** *(exists)* — debounced search of `/wt-clients/lookup`, scoped to
  the active line by the `X-Service-Line` header; `onPick(client|null)` returns
  `{ code, name, mobile, email, service_address }`.
- **useClientDossier(clientCode)** *(new hook)* — when `clientCode` is set, fetches
  `/wt-clients/:code` once and returns `{ projects, work_orders, quotations, loading }`,
  each a list of `{ code, label }` (label = code + client/summary context). Returns empty
  lists when no client is selected. Re-fetches when the code changes.
- **RefPicker** *(new)* — a searchable single-select. Fed EITHER a static `options`
  array (cascaded from the dossier) OR an async `fetchOptions(term)` (standalone search).
  Behaviour: auto-select when exactly one option; `disabled` with a hint when its
  prerequisite (e.g. a client) is not yet set; shows the chosen value as a chip with a
  "Change" affordance; renders each option as `CODE · label`.

## Screens converted (all shared → every line inherits the fix)

1. **BeneficiaryRegister** — client_code text input → `ClientLookupField` (client only).
2. **VerificationRegister** — client_code text input → `ClientLookupField` (client only).
3. **LoanApplications** — client_code text input → `ClientLookupField` (client only).
4. **Concierge** (visit drawer) — work_order_code text input → `RefPicker` fed the picked
   client's dossier `work_orders`; disabled until the client is chosen; auto-select single.
5. **ServiceReports** — client_name text input → `ClientLookupField` (stores client_code
   for cascade, back-fills client_name); work_order_code text input → `RefPicker` from
   that client's `work_orders`.
6. **AssessmentForm** — client_name text input → `ClientLookupField` (stores client_code,
   back-fills client_name); project_id text input → `RefPicker` from that client's
   `projects`.

Each screen keeps a `client_code` in its form state (added where missing) so the dossier
cascade has the key, even when the record itself is keyed by client_name. Submitted
payloads are unchanged apart from now carrying a valid code/name from a real record.

## Left untouched

Screens already loading from the directory via working `<select>`: New Project
(assessment/quotation selects), Create Invoice (client picker + project select), Project
detail (WO select), client/provider portals.

## Error handling

- Lookup/dossier failures: the picker shows "couldn't load" and still allows retry; it
  never blocks the rest of the form.
- A dependent picker with zero options after a client is chosen shows "no work orders /
  projects for this client yet" rather than an empty disabled control.

## Verification

- `npm run build` passes.
- Smoke-test against the running backend: pick a client on a converted screen → its
  work-orders / projects populate and auto-select when there is exactly one; the id sent
  on save matches a real record.

## Non-goals (YAGNI)

- No re-skin of the existing working dropdowns.
- No new backend endpoints; no change to what the save payloads mean.
- No global search across all lines — pickers stay scoped to the active line.
