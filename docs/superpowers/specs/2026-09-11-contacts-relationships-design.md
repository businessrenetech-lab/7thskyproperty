# Contacts — Relationships, Duplicates & Authorisation — design spec

**Date:** 2026-09-11 · **Branch:** `air-conditioning/phase-0-duplicate` (not merged)
**Plan:** `PROPERTY_SALES_SAAS_PHASED_PLAN.md` §Phase 4 (expand Contacts with engagement/property relationships, verified duplicate handling, authorisation and preferences).
**Status:** design approved in brainstorming; awaiting spec review before the implementation plan.

**Phase 4, sub-project D of 4 — the last (A builders ✅, B Contracts hub ✅,
C signing→billing ✅).** Expand the existing Contacts screen with three
capabilities: the contact's **engagement/property relationships** across sales,
**duplicate detection** (detect + warn + review, no merge), and an
**authorised-representatives** record. (Preferences are already on the model and
out of scope here.)

Verified against current source 2026-09-11. `Contact` (table `contacts`) is rich
(identity, `preferred_contact_method`/`preferred_language`, `national_id`/
`passport_no`, `tags`, `status`, `assigned_to`). `contact.controller` has
`list/create/getOne/update/remove/addDocument/addCommunication/convertToClient`;
`getOne` already returns documents/client/communications/invoices/payments/
registers but **no sales engagements**. `ContactDetail.jsx` is a tabbed screen.
`update` whitelists `CONTACT_FIELDS`. All sales records are queryable by contact:
`PropertyDeal.seller_contact_id`/`owner_contact_id`, `SaleOfferParty.contact_id`,
`SaleTransactionParty.contact_id`, `PartyRoleProfile.contact_id`,
`BuyerMandate.buyer_contact_id`, `NonCircumventionRecord.owner_contact_id`/
`tenant_contact_id`, `EnvelopeSigner.contact_id`.

---

## 1. Goal

On a contact's detail page, staff see: everything this person is party to across
sales (deals, offers, transactions, roles, buyer mandates, introductions, signed
agreements) grouped by property; a "possible duplicates" panel (other contacts
sharing a phone/email/national-ID); and an editable list of people authorised to
act on this contact's behalf.

## 2. Scope

**In:**
- **Relationships endpoint** `GET /api/contacts/:id/relationships` → the contact's
  sales footprint, grouped by property plus property-less items:
  `{ by_property:[{ property:{id,code,title}, deals[], offers[], transactions[],
  roles[], introductions[] }], mandates[], agreements[] }`. Branch-scoped,
  read-only. Each sub-item carries only display essentials (code, status, role,
  amount, date).
- **Duplicates endpoint** `GET /api/contacts/:id/duplicates` → other active
  contacts in the branch (excluding self) matching on `primary_phone`, `email`,
  `national_id`, or `passport_no`, each with `{ id, contact_code, full_name,
  matched_on:[fields] }`. Detect + warn only (no merge, no data movement).
- **Authorisation store:** additive `authorisations` JSON column on `contacts`
  (list of `{ name, relationship, phone, email, note }`), added to
  `CONTACT_FIELDS` so it saves through the existing `update`. Represents people
  authorised to act for this contact.
- **Frontend (ContactDetail):** a new **"Relationships"** tab showing the
  engagements-by-property, the duplicates panel (with a link to each match), and
  the authorised-representatives list (add/remove, saved via the existing update).

**Out (deferred / non-goals):**
- Duplicate **merge** (repointing related records) — detect + warn only this
  sub-project; merge is a separate, riskier feature.
- **Preferences** editing (method/language/consent) — the fields exist on the
  model and in the Overview tab already; no change here.
- Cross-branch duplicate detection (branch-scoped only).
- Any change to how the sales records themselves are created.

## 3. Backend — relationships aggregation

`contact.controller.relationships` (new), route `GET /api/contacts/:id/relationships`
(same `CRM_ROLES` middleware). Load the contact (branch-scoped, 404 if missing),
then in parallel:
- `PropertyDeal.findAll({ where: { branch, [Op.or]: [{seller_contact_id:id},{owner_contact_id:id}] } })` → `{ deal_code, status, property_id, role: seller|owner }`.
- `SaleOfferParty.findAll({ where: { contact_id:id } , include offer→property })` → `{ offer_code, amount, status, property_id }`.
- `SaleTransactionParty.findAll({ where:{ contact_id:id }, include transaction→property })` → `{ party_type, status, property_id }`.
- `PartyRoleProfile.findAll({ where:{ contact_id:id } })` → `{ profile_code, role_type, status, property_id }`.
- `BuyerMandate.findAll({ where:{ buyer_contact_id:id } })` → `{ mandate_code, status }` (no property).
- `NonCircumventionRecord.findAll({ where:{ branch, context:'sale', [Op.or]:[{owner_contact_id:id},{tenant_contact_id:id}] } })` → `{ record_code, status, property_id, side: seller|buyer }`.
- `EnvelopeSigner.findAll({ where:{ contact_id:id }, include envelope })` → `{ envelope_code, title, status, related_type, property_id: envelope.related_id }`.
Resolve all referenced `property_id`s in one `Property.findAll` id-map (code/title),
group the property-bearing items under `by_property`, and return `mandates`
(property-less) and `agreements` separately. Everything read-only; empty arrays
for a contact with no sales footprint.

## 4. Backend — duplicates + authorisation

- `contact.controller.duplicates` (new), route `GET /api/contacts/:id/duplicates`:
  load the contact; build an `Op.or` of the non-empty identifiers
  (`primary_phone`, `email`, `national_id`, `passport_no`); query other contacts
  (`id != self`, same branch, `status:'active'`); for each, compute `matched_on`.
  Return `{ data: [...] }` (empty when the contact has no identifiers or no matches).
- **Authorisation:** migration `0111` adds `authorisations` JSON (default `[]`)
  to `contacts`; model gains the field; `CONTACT_FIELDS` gains `'authorisations'`
  so the existing `PUT /api/contacts/:id` saves it. No new endpoint.

## 5. Frontend — ContactDetail "Relationships" tab

`ContactDetail.jsx`: add a `relationships` tab. On open, fetch
`GET /contacts/:id/relationships` and `GET /contacts/:id/duplicates`.
- **Engagements by property:** one card per property (code/title link to the sale
  property file) listing its deals/offers/transactions/roles/introductions as
  compact rows; below, a "Buyer mandates" list and an "Agreements" list
  (envelope code + title + status, linking to the Contracts hub / signing view).
  Empty state when the contact has no sales footprint.
- **Possible duplicates panel:** a warning-styled list of matches (full_name,
  code, matched_on chips) each linking to that contact; hidden when none.
- **Authorised representatives:** an editable list (name, relationship, phone,
  email, note) with add/remove, persisted by PUT `/contacts/:id`
  `{ authorisations }`. Reuse the screen's existing edit/save pattern.
Reuse the screen's existing tab + card styling; no new design system.

## 6. Testing & verification

- **Migration:** `db:migrate` adds `authorisations` to `contacts`; `down` removes it.
- **Relationships (live):** for a contact who is a seller on a deal / a buyer on an
  offer / an introduced party, `GET …/relationships` returns those under the right
  property with correct codes/roles; a contact with no sales footprint returns all
  empty. (Use the existing test data — e.g. the introductions/offers created earlier.)
- **Duplicates (live):** create/pick two contacts sharing a phone → each lists the
  other with `matched_on:['primary_phone']`; a contact with a unique phone/email
  returns none; self is never listed.
- **Authorisation (live):** `PUT /contacts/:id { authorisations:[{name,...}] }`
  persists and `getOne` returns it.
- **Browser:** the Relationships tab renders engagements grouped by property, the
  duplicates panel when matches exist, and add/remove of an authorised rep saves
  and reloads.
- **Non-regression:** backend `npm test` (7+5+27) + `npm run test:full` (28/0)
  unaffected (additive); `admin-portal npm run build` clean; existing contact
  getOne/update behaviour unchanged apart from the new whitelisted field.
- **Acceptance:** a contact page shows the person's full sales footprint,
  surfaces likely duplicates for review, and records authorised representatives.

## 7. File plan

**Backend (new):** `migrations/0111-contact-authorisations.js`.
**Backend (modify):** `models/Contact.js` (+`authorisations`),
`controllers/contact.controller.js` (+`relationships`, +`duplicates`,
`CONTACT_FIELDS` += `authorisations`), `routes/contact.routes.js` (2 routes).
**Frontend (modify):** `admin-portal/src/screens/ContactDetail.jsx` (Relationships tab).
**Schema:** migration 0111 (one JSON column).

## 8. Risks & non-goals

- **Read-heavy aggregation:** ~7 indexed queries + one property id-map per contact,
  only when the Relationships tab is opened (not in `getOne`).
- **Duplicates are advisory:** detection only; no automatic merge or edit — staff
  decide. Branch-scoped; identifiers may legitimately repeat (e.g. a company
  switchboard) so it's a review list, never an auto-block.
- **Authorisation is a lightweight JSON list**, not a contact↔contact graph — a
  faithful record of "who may act", not an access-control mechanism.
- **Shared screen:** ContactDetail is global; the sales aggregation simply returns
  empty for non-sales contacts, so the tab is harmless everywhere.
- **Non-goals:** merge, preferences editing, cross-branch dedup, access control.
