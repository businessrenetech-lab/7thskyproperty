# Rural portals and the public website surface

**Date:** 2026-09-27
**Status:** scoped, ready to execute
**Parent:** `docs/superpowers/specs/2026-09-26-rural-rent-completion-design.md` §1 (plan C of three)
**Sources:** SOP Rural Property Sale V0.1 §8 (Phase 4 marketing: "Website advertising", "NRB
marketing campaigns"), SOP Rural Rental Management V0.1 §8, the rural land record (migration 0156).

---

## 1. What is actually missing (measured, 2026-09-27)

Less than the plan assumed, and in different places.

**The portals are not category-blind — they are person-scoped**, and that is stronger. `portal.controller.js`
filters on `owner_contact_id`, `tenant_contact_id`, `buyer_client_id` and `provider_id`. A rural
owner signing in already sees exactly their own rural property; no category leak is possible. Two
real gaps remain:

| Gap | Detail |
|---|---|
| The land record is absent | The owner and tenant property lists return `property_code, title, status, area, district`. A rural parcel is identified by **mouza, khatiyan and dag** — an owner of three plots in one upazila cannot tell their rows apart. |
| A seller has no view | Roles are tenant / buyer / owner / supplier. A rural **seller** is an `owner` whose property is `listing_type = 'sale'`, and the owner section answers with tenancies and disbursements — neither of which a sale-side owner has. They need offers, marketing progress and commission. |

**The public website already accepts rural.** `/api/public/properties` takes `?category=rural` and
`?listing_type=sale|rent`, the site already offers a "Rural Estates" filter, and
`DetailFilterModal` already hides bedrooms and bathrooms for rural. What is missing:

| Gap | Detail |
|---|---|
| The land record is not public | `services/publicPropertyShape.js` is an explicit **allowlist** — "any column added to properties later stays private by default" — and none of the eight 0156 columns are in it. This is the allowlist working correctly, so opening it is a deliberate act. |
| No land search | The public list filters on category, listing_type, district and a text query. A rural buyer searches by **upazila and mouza**; migration 0156 indexed both, and nothing uses the index publicly. |
| The card and detail page show the wrong shape | A rural listing renders with bedrooms/bathrooms/balconies and no land area or current use. |

## 2. Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Publish **district, upazila, union, village, mouza, land_area_decimal, current_use**. Withhold **khatiyan and dag**. | Mouza-level location plus area and use is what a buyer searches on, and is what rural land advertising normally carries. Khatiyan and dag are the **parcel-level identifiers in the public land records** — publishing them next to a named listing lets anyone look up the registered owner of a private individual's land. That is a privacy decision for the client to make explicitly, not a default for me to set. The fields exist and are one line away if they say yes. |
| 2 | Portals gain the land record for **rural properties only** | Adding mouza/khatiyan/dag to every portal row would put empty columns in front of every residential owner. Inside the portal, khatiyan and dag ARE shown — the owner is the owner of that land. |
| 3 | A seller view is the **owner section, conditioned on listing_type**, not a new role | A person can own a rental plot and a plot for sale at once. One `owner` role whose sections follow the properties is correct; a second role would force them to log in twice. |
| 4 | Public rural filters are **server-side**, using the 0156 indexes | The same decision the admin Land Records screen made. A client-side filter over one page of results is not a search. |
| 5 | No new tables and no migration | Everything needed is already a column. |

## 3. Design

**`publicPropertyShape.js`** gains a `RURAL_PUBLIC_FIELDS` list and applies it only when
`category === 'rural'`, so the allowlist stays closed for every other category. A unit test asserts
khatiyan and dag are absent from a rural public payload, and that no rural field leaks into a
residential one.

**`/api/public/properties`** accepts `upazila` and `mouza` (exact, indexed) and reports the rural
facets it can offer — the distinct upazilas and mouzas in the published rural book — so the site can
populate a picker rather than asking a buyer to guess.

**The website** gets a rural shape on the card and the detail page: land area, current use and the
mouza line in place of bedrooms/bathrooms, plus upazila and mouza selects in the filter modal when
the category is rural.

**`portal.controller.js`**: the owner and tenant property queries return the land record when the
property is rural, and the owner section splits by `listing_type` — rental properties keep tenancies
and disbursements; sale properties gain their offers (from the `offer_register`), marketing progress
(from the `marketing_register`) and the deal's commission position.

## 4. Verification

- **Unit:** `testPublicPropertyShape` extended — a rural payload carries mouza and land area, and
  carries **no** khatiyan or dag; a residential payload is unchanged field-for-field.
- **E2E:** extend `scripts/e2e/ruralSale.js` — publish a rural sale property, fetch it from the
  public list filtered by mouza and by upazila, assert the land record is there and the withheld
  fields are not, and assert a residential published property's public payload has not changed.
- **Portal:** a rural owner's dashboard carries the land record and, for a sale listing, the offers
  and marketing rows; a residential owner's payload is unchanged.
- **Baseline:** residential 53 managed / 103 open actions; both builds clean.

## 5. Out of scope

NRB-specific marketing campaigns (the SOP names them; they are a marketing-automation feature, not a
listing surface). Also unchanged: the 19 fixture register entries and 118 fixture properties in the
production DB, which await the user's decision.
