# Sales Inbox — Conversations, Participants, Visibility & Assignment — design spec

**Date:** 2026-09-11 · **Branch:** `air-conditioning/phase-0-duplicate` (not merged)
**Plan:** `PROPERTY_SALES_SAAS_PHASED_PLAN.md` §Phase 5 (extend the inbox to sales, explicit participants, internal/client visibility, assignments).
**Status:** design approved in brainstorming; awaiting spec review before the implementation plan.

**Phase 5, sub-project A of 3** (B = templates/delivery/SMS provider; C = service
coordination). A **dedicated residential-sales inbox** over the existing
`Communication` model: sales-enquiry + deal/property conversations, with explicit
thread **participants** (multiple buyers on one property), an internal-vs-client
**visibility** flag, and per-conversation **assignment** — leaving the rental
inbox untouched.

Verified against current source 2026-09-11. `Communication` (table
`communications`) has channel/direction/subject/body/status/occurred_at/
read_at/is_draft + `entity_type`+`entity_id` (thread key) and property/contact
columns, but **no explicit participants, visibility, or assignee**. The existing
`communications.controller` inbox is **rental-only** (seeded from `RentalEnquiry`,
in-memory grouped by `commKey`); `thread/reply/compose/update/markRead` are
generic over `entity_type`/`entity_id`; `communication.service.sendEmail` is real
(nodemailer). `SalesEnquiry` (property_id, contact_id, enquirer_name, phone,
email, status new→converted, assigned_officer_id) is the sales lead source.
`commKey` maps `rental_enquiry`→`enquiry:<id>`.

---

## 1. Goal

A "Sales Inbox" in the residential console listing sales conversations —
seeded from `SalesEnquiry` plus any deal/property-scoped `Communication` threads —
each showing its participants, whether a message is internal or client-facing,
and who it's assigned to. Staff open a thread, reply (email or logged
call/sms/note), add participants, toggle a message's visibility, and assign the
conversation — reusing the existing thread/reply/compose plumbing.

## 2. Scope

**In:**
- **Schema (migration 0112):**
  - `comm_participants` table: `id, branch_id, thread_key STRING (e.g.
    'sales_enquiry:12' / 'property:40' / 'deal:7'), contact_id?, user_id?,
    role STRING ('buyer'|'seller'|'agent'|'solicitor'|'other'), added_by,
    timestamps`. Index `(branch_id, thread_key)`.
  - `Communication` gains `visibility ENUM('internal','client') default 'client'`
    and `assigned_to INTEGER` (additive).
- **`commKey`**: add sales mappings — `sale`/`sales_enquiry`→`sales_enquiry:<id>`,
  and property/deal comms already key as `property:<id>` (kept). Sales threads use
  `sales_enquiry:<id>`, `property:<id>`, or `deal:<id>` keys.
- **Sales inbox endpoint** `GET /api/sales/inbox[?status&channel&property_id&q&assigned_to&mine]`:
  seed conversations from `SalesEnquiry` (branch), attach the matching
  `Communication` thread (grouped by key), plus any property/deal comm threads
  with no enquiry; each item: `{ key, source:'sales_enquiry'|'property'|'deal',
  title, subtitle, channel, snippet, last_at, status, needs_reply, unread,
  messages, property_id, participants:[{name,role}], assigned_to }`.
  Branch-scoped, read.
- **Thread + actions:** reuse `GET /api/communications/thread` +
  `reply/compose/update/markRead` (they already work by key). New participant +
  assignment + visibility endpoints under `/api/sales/inbox`:
  - `GET /:threadKey/participants`, `POST /:threadKey/participants {contact_id?,user_id?,role}`, `DELETE /participants/:id`.
  - `POST /:threadKey/assign {assigned_to}` (stamps `assigned_to` on the thread's comms + returns the value; also settable per-message).
  - `reply`/`compose` accept `visibility` ('internal' hides from any client-facing
    export; default 'client'); internal notes never dispatch email.
- **Frontend `SalesInbox.jsx`** (residential console, nav under **Home** near Work
  Queue): a two-pane inbox (conversation list + thread) showing participants,
  visibility badges on messages (internal = muted "Internal"), an assignee
  selector, an "add participant" control, and a reply box with an
  internal/client toggle. Mirrors the rental inbox's UX but sales-scoped.

**Out (deferred / non-goals):**
- Message **templates**, persisted **delivery status**, **SMS provider**
  integration, inbound replies, retries, suppression → sub-project B.
- Service-request / provider-progress / financial linking → sub-project C.
- Touching or merging the **rental inbox** (left entirely as-is).
- Real-time push / websockets (poll/refetch like the rest of the app).

## 3. Threading model

A conversation is a `thread_key`. Sales keys: `sales_enquiry:<id>` (enquiry
lead), `property:<id>` (property-scoped), `deal:<id>` (deal-scoped). `commKey(c)`
derives the key from a `Communication`'s `entity_type`/`entity_id`; the sales
inbox seeds enquiry threads from `SalesEnquiry` and merges their comms.
Participants attach to a `thread_key` (not per-message) so a property thread with
two buyers + an agent lists all three. Assignment is per-thread (stamped on the
comms sharing the key) so the inbox can filter `?mine`.

## 4. Backend

New `salesInbox.controller.js` + routes at `/api/sales/inbox`
(READ/PREPARE roles), reusing `Communication`, `SalesEnquiry`, `Property`,
`Contact`, and a new `CommParticipant` model. The inbox handler mirrors the
rental one's grouping but over `SalesEnquiry` + sales-keyed comms, and enriches
each item with participants (one `CommParticipant.findAll` by the branch's thread
keys, id-mapped to names) and `assigned_to`. `visibility` defaults 'client';
`reply`/`compose` for an `internal` message set direction where relevant and
never call `sendEmail`. Mounted before `/api/sales` is not required (distinct
path `/api/sales/inbox` — but declare before any `/api/sales/:x` catch-alls;
`/api/sales` mounts a router, so add these routes inside sales.routes or a
dedicated mount `/api/sales/inbox` placed before `/api/sales`). Mount in server.js
+ manifest.js.

## 5. Frontend

`admin-portal/src/screens/sales/SalesInbox.jsx`, route `/residential/inbox`, nav
under **Home**. Left: conversation list (title/subtitle, channel icon, unread dot,
assignee chip, participant count, needs-reply flag) with filters (status, channel,
mine, search). Right: the selected thread — messages with a per-message
visibility badge (client/internal), a participants strip (add/remove via the
participant endpoints, `Combo` on contacts + a role select), an assignee selector
(`Combo`/select on users) calling assign, and a reply composer with an
Internal/Client toggle (internal → logged only, no email). Reuse `ui/kit` +
`ui/pickers`.

## 6. Testing & verification

- **Migration:** 0112 creates `comm_participants` + adds `visibility`/`assigned_to`
  to `communications`; `down` reverses.
- **Inbox (live):** `GET /api/sales/inbox` lists sales-enquiry conversations for
  the branch (seeded from SalesEnquiry) + any property/deal threads; filters
  (`status`, `channel`, `q`, `mine`, `assigned_to`) narrow correctly; the rental
  inbox (`GET /api/communications/inbox`) is unchanged.
- **Participants/assign/visibility (live):** add two buyer participants + an agent
  to a property thread → the inbox item lists 3 participants; assign the thread to
  a user → `?mine` (as that user) includes it; post an `internal` reply → it is
  stored, dispatches no email, and carries `visibility:'internal'`; a `client`
  reply emails (or logs) as today.
- **Browser:** the Sales Inbox lists conversations, opens a thread, shows
  participants + visibility badges + assignee, adds a participant, assigns, and
  sends an internal vs client reply.
- **Non-regression:** rental inbox + generic communications endpoints unchanged;
  backend `npm test` (7+5+27) + `npm run test:full` (28/0) unaffected; build clean.
- **Acceptance:** sales conversations are visible and workable with explicit
  participants, per-message internal/client visibility, and per-thread assignment;
  rental untouched.

## 7. File plan

**Backend (new):** `migrations/0112-sales-inbox.js`, `models/CommParticipant.js`,
`controllers/salesInbox.controller.js`, `routes/salesInbox.routes.js`.
**Backend (modify):** `models/Communication.js` (+`visibility`,+`assigned_to`),
`controllers/communications.controller.js` (`commKey` sales mappings;
`reply`/`compose` honour `visibility`), `server.js` + `routes/manifest.js` (mount
`/api/sales/inbox` before `/api/sales`).
**Frontend (new):** `admin-portal/src/screens/sales/SalesInbox.jsx`.
**Frontend (modify):** `config/consoles.js` (nav), `App.jsx` (route).
**Schema:** migration 0112 (1 table + 2 columns).

## 8. Risks & non-goals

- **Route ordering:** `/api/sales/inbox` must resolve before the `/api/sales`
  router swallows it (mount the dedicated router first, like
  `/api/sales/introductions` and `/api/sales/calendar`).
- **Shared Communication model:** `visibility`/`assigned_to` are additive and
  default to today's behaviour (`client`, null) so rental/other comms are
  unaffected; internal-visibility only suppresses email on the sales reply path.
- **Grouping cost:** the inbox groups comms in memory like the rental one, bounded
  by a branch limit; acceptable now (Phase 7 can move to server-side pagination).
- **Participants are advisory metadata**, not access control — they describe who's
  on a thread, not who may see it (visibility is the message-level control).
- **Non-goals:** templates, delivery-status persistence, SMS provider, inbound
  replies, rental-inbox changes, real-time.
