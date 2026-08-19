# Seventh Sky Property Care — Design System

The single source of truth for the admin CRM's look, feel, and front-end conventions.
Everything here is taken from the live code — build new screens against these tokens,
classes, and components so the product reads as one system.

- **Base theme** → `admin-portal/src/theme.css` (global tokens + app shell + `.card`, `.btn`, `.tbl`, `.badge`, `.field`, `.drawer`, `.tabs`…)
- **PM cockpit system** → `admin-portal/src/styles/pm-design.css` (scoped to `.pm-scope`; the premium dashboard/data-viz layer)
- **Component kit** → `admin-portal/src/ui/kit.jsx` and `admin-portal/src/ui/pickers.jsx`
- Loaded once in `main.jsx`: `import './theme.css'` then `import './styles/pm-design.css'`

---

## 1. Design principles

- **Clean, premium, white-canvas.** White surfaces, cool cyan-biased neutrals, generous radius, soft shadows. No heavy borders or flat grey boxes.
- **Cyan is the brand accent; navy is the anchor.** Cyan for primary actions and highlights, navy for depth (rails, avatars, gradients).
- **Tabular numbers everywhere money appears.** `font-variant-numeric: tabular-nums` (built into `.pm-scope` and `.pm-num`).
- **Status is color-coded and consistent.** Green = good/done, amber = pending/attention, red = bad/overdue, blue = new/in-flight, grey = neutral/draft.
- **Two layers, one language.** New operational screens (property management, sales, short-term-stay) use the `.pm-scope` cockpit system. Simple CRUD/list screens can use the base kit alone. Both share the same tokens.
- **Scope, don't fork.** The premium styling is namespaced under `.pm-scope` so it never leaks into landlord/tenant/accounting portals. Wrap a premium screen's root in `className="pm-scope"`.

---

## 2. Color tokens

### Base theme (`:root` in `theme.css`)

| Token | Value | Use |
|-------|-------|-----|
| `--primary` | `#1cc4fa` | Brand cyan — primary buttons, focus, active nav |
| `--primary-600` | `#003768` | Primary hover / deep navy |
| `--primary-700` | `#002244` | Darkest navy, active nav text |
| `--primary-50` | `#e6fafe` | Cyan tint — active nav bg, row hover |
| `--primary-100` | `#b3eeff` | Cyan focus ring, badges |
| `--accent` | `#003768` | Navy accent (gradients) |
| `--bg` / `--surface` | `#ffffff` | Canvas / cards |
| `--surface-2` | `#f1f5f9` | Insets, table headers, search box |
| `--border` | `#e2e8f0` | Hairline borders |
| `--border-strong` | `#cbd5e1` | Input borders |
| `--text` | `#0f172a` | Primary text |
| `--muted` | `#475569` | Secondary text |
| `--muted-2` | `#94a3b8` | Tertiary / placeholder |
| `--success` `#10b981` / `--success-bg` `#ecfdf5` | | Positive |
| `--warning` `#f59e0b` / `--warning-bg` `#fffbeb` | | Attention |
| `--danger` `#ef4444` / `--danger-bg` `#fef2f2` | | Negative |
| `--info` `#0ea5e9` / `--info-bg` `#f0f9ff` | | Informational |

### PM cockpit palette (`.pm-scope` in `pm-design.css`)

Slightly warmer inks and a brighter cyan for the data-dense screens.

| Token | Value | Use |
|-------|-------|-----|
| `--canvas` / `--surface` | `#ffffff` | Canvas / cards |
| `--surface-2` | `#f6f8fc` | Table header, insets |
| `--surface-3` | `#eff3f9` | Segment control, chips |
| `--line` `#e4eaf2` / `--line-soft` `#edf1f7` | | Borders / row dividers |
| `--ink` `#0d1b2f` / `--ink-soft` `#26374f` | | Text |
| `--muted` `#5c6c84` / `--muted-2` `#8a99ae` | | Secondary / tertiary text |
| `--navy` | `#003768` | Rails, avatars, primary-on-dark |
| `--cyan` `#12b6f3` / `--cyan-weak` `#e7f7fe` | | Accent / accent tint |
| `--good` `#0ea371` / `--good-bg` `#e6f7f0` | | Positive (money in, done) |
| `--warn` `#d98a00` / `--warn-bg` `#fbf1de` | | Attention |
| `--bad` `#e5484d` / `--bad-bg` `#fdecec` | | Negative (money out, blockers) |

**Money convention:** `.pm-money` (green, money in) / `.pm-money-out` (red, money out).

---

## 3. Typography

- **Font:** `--font: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`. Base body `14px`.
- **Weights:** body 600 for labels, 700 for emphasis, **780** for big numbers/headlines (cockpit), 800 for base-theme stat values.
- **Negative letter-spacing on large text:** headings use `-.02em` to `-.03em` for a tight, premium feel.
- **Scale in use:**
  - Page title (base): `.page-head .title` — 22px / 800
  - Cockpit H1: `.pm-head h1` — 25px / 780 / `-.025em`
  - KPI value: `.pm-kpi .val` — 29px / 780
  - Card heading: `.pm-card-h h3` — 14.5px / 720
  - Table body: 13–13.5px; table head: 10.5–11px uppercase, `.08em` tracking, muted
  - Eyebrow/section label: 10.5–11px uppercase, `.14em` tracking, cyan or muted

---

## 4. Shape, elevation, spacing, layout

| Token | Base | PM cockpit |
|-------|------|------------|
| Radius (card) | `--radius: 14px` | `--pm-radius: 16px` |
| Radius (small) | `--radius-sm: 10px` | `--pm-radius-sm: 11px` |
| Radius (large) | `--radius-lg: 20px` | — |
| Shadow (rest) | `--shadow-sm` | `--pm-sh1` (1–3px, barely there) |
| Shadow (raised/hover) | `--shadow` / `--shadow-lg` | `--pm-sh2` (soft 34px spread) |

- **Buttons** are pill-ish: base `6px` radius, cockpit `11px`.
- **Grid gap** standard is `16px`. Card padding `16–18px`.
- **Shell:** `--sidebar-w: 256px`, `--topbar-h: 64px` (topbar renders at 56px). Content max-width `1400px`, `24px` padding, centered.
- **Hover motion:** cards/KPIs lift `translateY(-2px…-3px)` with `--pm-sh2`. Buttons lift `-1px`. All transitions ~`.15s`. Respect `prefers-reduced-motion` (already handled in `.pm-scope`).

---

## 5. App shell

```
.app-shell            flex row, min-height 100vh
  .sidebar            fixed 256px, white, right hairline border
    .sidebar-brand    logo (cyan→navy gradient tile) + name + uppercase sub
    .nav              scrollable
      .nav-section    uppercase group label
      .nav-item       row; .active → cyan-50 bg + 3px cyan left bar
      .nav-badge      count pill
  .main               margin-left 256px
    .topbar           sticky 56px, breadcrumb + search + avatar
    .content          padding 24px, max-width 1400px, centered
```

Sidebar collapses off-canvas under 900px (`.sidebar.open` to reveal). Router uses `basename="/admin"`.

Nav is defined declaratively in `ui/Layout.jsx` (the active shell). Each top-level group is
`{ key, label, to, icon, children:[{ to, label }] }`. Keep child menus to real, reachable
destinations — deep-link to a hub tab with `?tab=` rather than adding dead routes.

---

## 6. Component kit (`ui/kit.jsx`)

Import shared components instead of hand-rolling markup.

| Component | Signature | Notes |
|-----------|-----------|-------|
| `PageHead` | `{ title, desc, actions }` | Standard page header (base screens) |
| `Button` | `{ variant='primary', size, icon, ...rest }` | variants: `primary` / `ghost` / `danger`; `size="sm"` |
| `Badge` | `{ tone='grey', dot, children }` | tones: `blue/green/amber/red/grey` |
| `StatusBadge` | `{ status }` | Maps a raw status string → tone via `TONE` map; humanizes the label |
| `Field` | `{ label, required, full, children }` | Form field wrapper (label + `.req` asterisk) |
| `Input` / `Textarea` / `Select` | native props | `.input` / `.textarea` / `.select` |
| `Drawer` | `{ title, onClose, children, footer, width }` | **No `isOpen` prop** — render conditionally: `{open && <Drawer …/>}` |
| `SearchInput` | `{ value, onChange, placeholder }` | Icon + input in a `.search-box` |
| `DataTable` | `{ columns, rows, onRowClick, loading, empty }` | `columns:[{ key, header, render, thStyle, tdStyle }]` |
| `EmptyState` | `{ icon, title, sub, action }` | Centered empty placeholder |
| `StatCard` | `{ icon, label, value, tone, trend }` | Base KPI tile |
| `KV` | `{ k, v }` | Key/value row |
| `Spinner` | — | Inline loader |

**Pickers (`ui/pickers.jsx`)**
- `Combo` — `{ endpoint, labelFn, value, onChange, placeholder, mapData }`. Searchable async select. Hits `endpoint?search=&limit=20` (reads `res.data.data`, or `mapData(res)`); resolves the current value via `endpoint/{value}`. `onChange(id, row)`. Use this for selecting properties/contacts/owners — **never raw ID inputs**.
- `PlusButton` — `{ onClick, label }` — inline "add" affordance.

### StatusBadge tone map (canonical)

Green: `active, available, completed, paid, approved, signed, valid, matched, reconciled, cleared`
Grey: `draft, inactive, closed, archived, cancelled`
Amber: `pending, follow_up, partially_paid, partial, sent, expiring, in_progress, due`
Blue: `new, contacted, meeting, reserved, prospect, viewed, unmatched`
Red: `lost, overdue, declined, voided, expired, suspended, terminated, arrears`

Add new statuses to this map in `kit.jsx` rather than styling badges ad-hoc.

---

## 7. PM cockpit classes (`pm-design.css`, under `.pm-scope`)

Building blocks for the premium operational screens. Wrap the screen root in `className="pm-scope"`.

**Header & controls**
- `.pm-head` → `.pm-eyebrow` (cyan uppercase kicker) + `h1` + `.pm-meta`; `.pm-head-actions` on the right
- `.pm-segment` / `.pm-segment button(.on)` → tab strip (pill segment control)
- `.pm-btn` / `.pm-btn.primary` → cockpit buttons (primary is a cyan gradient)
- `.pm-pill(.active)` → filter pills

**Cards**
- `.pm-card` → `.pm-card-h` (`.ic` icon tile + `h3` + `.hsub`) + `.pm-card-body`
- `.pm-link` → inline cyan text action

**KPIs & data-viz**
- `.pm-kpis` (responsive 4-col grid) → `.pm-kpi` → `.top`(`.lab` + `.pm-delta up/down/flat`) + `.val` + `.foot`
- `.pm-minis` → `.pm-mini` compact stat tiles
- `.pm-progress`, `.pm-ring`, `.pm-spark`, `.pm-donut`, `.pm-aging`, `.pm-legend` → chart primitives
- `.pm-disb` → navy gradient "owner disbursement" hero panel

**Tables & rows**
- `.pm-tbl` → the cockpit table (uppercase muted header, hover row tint)
- `.pm-who` (`.pm-avatar` navy-gradient initials + `.nm` + `.ph`) → person cell
- `.pm-row` → generic list row; `.pm-act` (`.sev-bad/.sev-warn/.sev-info/.sev-good`) → severity-striped action row

**Status & money**
- `.pm-chip.good/.bad/.warn/.info/.grey` (with `.d` dot) → inline status chip
- `.pm-money` / `.pm-money-out` → colored money

**Empty / loading**
- `.pm-empty` (`.ic` icon) → empty state within cockpit

**Complex workspaces (self-contained families):**
- `.pm-wizard*` — full-screen onboarding wizards (property/owner/tenant): head, left step rail (`.pm-wizard-step .num`, states `active/done/todo`), main, media grid, toggles (`.pm-toggle`), segmented (`.pm-seg`), chips (`.pm-chip`).
- `.sa-*` — sales **assessment** workspace (green-accented: `--sa-green #215b47`): command band, sticky stage nav, main surface + sticky action zone, accordions, evidence/photo strips.
- `.st-*` — sales **settlement** workspace: money summary strip (`.st-summary`/`.st-cell`, residual is the only colored cell), navy sticky process rail (`.st-rail` with `.st-stages` timeline, `.st-rail-btn`, `.st-blockers`), approval history.

These three families are intentionally self-contained so a restyle elsewhere can never strip them.

---

## 8. Standard screen patterns

**Operational hub / dashboard** (e.g. Property Management, Short Term Stay):
1. Root `div.pm-scope`
2. `.pm-head` (eyebrow + title + meta + actions)
3. `.pm-kpis` row of `.pm-kpi` tiles (each number links to its filtered list)
4. `.pm-segment` tab strip + `SearchInput` on the same row
5. Tab panels of `.pm-card` → `.pm-tbl`, with empty-state rows
6. Actions open a `Drawer` (conditionally rendered) with `Field` + `Input`/`Select`/`Combo`

**List/detail (base kit):** `PageHead` + `.card` + `DataTable`, row-click opens a `Drawer` or detail route.

**Forms:** `Field` wrappers; `.form-grid` for two-column; `.form-section-title` for grouped sections; required marked with `.req`. Focus ring is a 3px cyan halo.

**Money & audit surfaces:** tabular numbers, colored money, and an explicit blocker/next-action pattern (return clear blocker lists, not generic errors — mirrored in the UI as `.st-blockers` / notices).

---

## 9. Dark theme

The admin is light today, but `.pm-scope` ships a correct dark palette under
`:root[data-theme="dark"] .pm-scope` (deep navy canvas, brightened cyan). Keep any new
tokens defined for both so a future dark toggle "just works." Don't hard-code hex values in
components — always reference the CSS variables.

---

## 10. Accessibility & responsiveness

- **Touch targets:** interactive controls in workspaces use `min-height: 44px`.
- **Focus visible:** 3px cyan (`--cyan-weak`) halo on inputs/buttons; workspaces add `:focus-visible` outlines.
- **Reduced motion:** `.pm-scope` disables transitions under `prefers-reduced-motion`.
- **Responsive:** KPI grids collapse 4→2→1; wizard rail becomes a horizontal scroller under 860px; sidebar goes off-canvas under 900px. Wide content (tables, workspaces) scrolls inside its own container — the page body never scrolls horizontally.

---

## 11. Front-end integration contract (for new screens/modules)

Follow these so a new screen behaves like the rest of the app:

- **API:** import the shared axios instance `services/api.js` (baseURL `VITE_API_URL || '/api'`). Never hard-code URLs. It attaches auth and unwraps envelopes.
- **Feedback:** use `useToast()` (`toast.success/error/warning/info`) — **never `alert()`**.
- **Selection:** use `Combo` pickers bound to list endpoints — never raw numeric ID text inputs.
- **Drawers:** the kit `Drawer` has no `isOpen`; gate it with `{open && <Drawer onClose=…/>}`.
- **Status:** render with `StatusBadge`; extend the `TONE` map for new statuses.
- **Routing:** register routes in `App.jsx` (Router `basename="/admin"`); reach every screen from the `ui/Layout.jsx` nav. Prefer a tabbed hub with `?tab=` deep-links over many thin routes.
- **Scope:** wrap premium screens in `className="pm-scope"` and reuse `pm-*` classes rather than inventing one-off components.
- **Currency:** Bangladeshi Taka (৳). Compact form `৳3.5k / ৳12.4L / ৳2.30Cr` for tiles; full `৳12,345.00` for ledgers. Use tabular numbers; never do floating-point money math in the client — read computed values from the API.

---

_Last updated from the live code in `theme.css`, `styles/pm-design.css`, `ui/kit.jsx`, and `ui/pickers.jsx`._
