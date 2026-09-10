# Detail dashboards — production redesign

**Date:** 2026-09-08
**Status:** Approved, building
**Scope:** frontend only; the three shared detail screens (all service lines inherit)
**Design tooling:** tidyfactor-styler `redesign` workflow + quality bar; conform to the
existing `wt-scope` design system (no new styling system, no Tailwind).

## Problem

The per-record detail screens read as "confusing / not organised". Root causes found in
the audit:
- **ClientDashboard** has 9 overlapping tabs (Account vs Transactions vs AMC & Warranty;
  Journey vs Timeline) and ~847 lines of largely inline styles.
- **ProjectDetail** (880 lines) is structurally sound (7 tabs) but inline-styled and a
  little redundant (Timeline as its own tab).
- **WorkOrderDetail** (599 lines) is a single mixed scroll with no clear zones.
- No consistent "what am I looking at / what do I do next" header across the three.

The list screens (Projects, Work Orders) are already close to production quality and are
OUT of scope.

## Shared "detail dashboard" pattern (common.jsx primitives)

Built once so the three screens cannot drift apart; all use existing `wt-scope` classes
and CSS variables.

- **DashHeader** — identity line (name/code + status pill + breadcrumb), a compact **KPI
  strip** (3–5 numbers that matter for the record), and the single **primary next-action**
  button. Same shape on all three.
- **Section / DashCard** — one titled card component replacing the many inline
  `padding/gap/color` cards; consistent spacing scale and section titles.
- Consistent **loading / empty / error** states; **responsive** (KPI cards wrap, tables
  scroll inside their own container); **accessibility** (tab semantics with roles + arrow
  keys, visible focus, aria on progress bars).

These are additive to `common.jsx`; existing exports are unchanged.

## Information architecture (the de-cluttering)

- **Client dashboard: 9 tabs → 5** — `Overview` · `Journey` (workflow gates + timeline,
  merged) · `Service & Jobs` (service history + work orders + AMC + warranty + complaints)
  · `Financials` (account summary + quotations + invoices + transactions, merged) ·
  `Documents` (agreements + reports + handover + client docs). Overview leads with the KPI
  strip, next action, and workflow progress. Same data, regrouped.
- **Project detail: 7 tabs → 6** — fold `Timeline` into `Overview` (recent-activity panel);
  keep `Overview · Lifecycle · Work Orders · Billing · Documents · Closure`. Mostly a
  consistency pass.
- **Work order detail** — keep the linear cockpit (no tabs); reorganise into three stacked
  zones under the new header: **Delivery** (progress + next step), **Commercials**
  (contract, fees, payout), **Record** (scope, conditions, completion, comments).

## Constraints

- No route, endpoint, or data-shape changes. Every existing action, field, drawer and
  navigation target is preserved — only grouped and styled consistently.
- Behaviour parity: all current buttons/actions still work and point at the same handlers.
- Conform to `wt-scope.css`; reuse `wt-card`, `wt-pkpi`, `wt-sec-title`, `wt-tbl`,
  `wt-tblcard`, `wt-cards3`, `wt-subtab`, `Pill`, `EmptyState`, etc. Add small utility
  classes only where a genuine gap exists.

## Sequence

Screen by screen, building after each: Client dashboard → Project detail → Work order
detail. `npm run build` must pass after each; a manual read of each screen's actions
confirms behaviour parity.

## Non-goals (YAGNI)

- No changes to the list/index screens.
- No new data or backend work.
- No motion library; only lightweight CSS transitions already available.
