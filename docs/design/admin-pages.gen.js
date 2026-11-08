// Generates a FigCraft command script for the Seventh Sky page system: the four
// templates every console screen is built from (dashboard, list, form, record).
// Numbers come from the Water Tank console on the local copy; "Tk" stands in for
// the taka sign only because Inter in FigCraft lacks the glyph.
// Run from the repo root:
//   node docs/design/admin-pages.gen.js > s.json && figcraft-cli run s.json --out docs/design/admin-pages.figcraft
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const ICONS = path.join(ROOT, 'admin-portal/node_modules/lucide-react/dist/esm/icons');
const LOGO = path.join(ROOT, 'admin-portal/src/assets/logo-mark.png');

const C = {
  board: '#E7ECF2', page: '#F6F8FA', surface: '#FFFFFF', line: '#E2E8F0', line2: '#EEF2F6',
  ink: '#0F172A', ink2: '#475569', mute: '#64748B', mute2: '#94A3B8',
  rail: '#0D1638', rail2: '#16214A', railLine: '#232F5C', railMute: '#8794BD',
  sky: '#1CC4FA', accent: '#12B6F3', accentInk: '#0A6C93', accentTint: '#E3F6FD',
  alert: '#E5484D',
  red: '#C2272D', redBg: '#FEF2F2', amber: '#B45309', amberBg: '#FEF3C7',
  green: '#047857', greenBg: '#ECFDF5', blue: '#1D4ED8', blueBg: '#EFF6FF', slateBg: '#F1F5F9',
  bar: '#2A78D6',
};

const steps = [];
let n = 0;
const ref = () => `n${n++}`;
const add = (command, params, as) => { const s = { command, params }; if (as) s.as = as; steps.push(s); return as ? { $ref: as } : null; };
const frame = (parent, name, x, y, w, h, props = {}) =>
  add('node.create', { type: 'frame', name, parent, x, y, width: w, height: h, select: false, props: { fill: C.surface, ...props } }, ref());
const rect = (parent, x, y, w, h, fill, props = {}) =>
  add('node.create', { type: 'rectangle', parent, x, y, width: w, height: h, select: false, props: { fill, ...props } });
const ellipse = (parent, x, y, d, fill, props = {}) =>
  add('node.create', { type: 'ellipse', parent, x, y, width: d, height: d, select: false, props: { fill, ...props } });
const W = { r: 'Regular', m: 'Medium', s: 'SemiBold', b: 'Bold' };
const text = (parent, x, y, str, size, color, weight = 'r', opts = {}) => {
  const props = { fontFamily: 'Inter', fontStyle: W[weight], fontSize: size, fill: color, ...(opts.props || {}) };
  if (opts.width) { props.textAutoResize = 'height'; props.width = opts.width; props.textAlign = opts.align || 'left'; }
  add('node.create', { type: 'text', parent, x, y, text: str, select: false, props });
};
const tw = (str, size, weight = 'r') => str.length * size * (weight === 'r' ? 0.54 : 0.575);

const toD = (tag, a) => {
  if (tag === 'path') return a.d;
  if (tag === 'line') return `M${a.x1} ${a.y1}L${a.x2} ${a.y2}`;
  if (tag === 'polyline') { const v = a.points.trim().split(/[\s,]+/); const p = []; for (let i = 0; i < v.length; i += 2) p.push(v[i] + ' ' + v[i + 1]); return 'M' + p.join('L'); }
  if (tag === 'circle') return `M${a.cx - a.r} ${a.cy}a${a.r} ${a.r} 0 1 0 ${2 * a.r} 0a${a.r} ${a.r} 0 1 0 ${-2 * a.r} 0`;
  if (tag === 'rect') {
    const x = +a.x, y = +a.y, w = +a.width, h = +a.height, r = +(a.rx || 0);
    if (!r) return `M${x} ${y}h${w}v${h}h${-w}Z`;
    return `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}Z`;
  }
  throw new Error('icon element ' + tag);
};
const iconPath = (name) => {
  const src = fs.readFileSync(path.join(ICONS, name + '.js'), 'utf8');
  const nodes = Function('return ' + src.match(/const __iconNode = (\[[\s\S]*?\]);\n/)[1])();
  return nodes.map(([t, a]) => toD(t, a)).join(' ');
};
const icon = (parent, name, x, y, size, color, weight = 2) => {
  const box = add('node.create', { type: 'frame', name: 'icon/' + name, parent, x, y, width: 24, height: 24, select: false, props: { fill: 'none' } }, ref());
  add('node.create', { type: 'vector', parent: box, x: 0, y: 0, path: iconPath(name), select: false,
    props: { fill: 'none', stroke: color, strokeWeight: weight, strokeCap: 'round', strokeJoin: 'round' } });
  if (size !== 24) add('transform.scale', { ids: [box], factor: size / 24 });
};
const logo = (parent, x, y, d) => add('image.place', { path: LOGO, parent, x, y, width: d, height: d });
const lift = (node, strong) => {
  add('effect.add', { ids: [node], type: 'dropShadow', effect: { type: 'dropShadow', color: strong ? '#0F172A40' : '#0F172A24', offset: [0, 16], radius: 40, spread: -8 } });
  return node;
};
const card = (parent, name, x, y, w, h, props = {}) => frame(parent, name, x, y, w, h, { cornerRadius: 12, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside', clip: true, ...props });

/* Shared pieces ------------------------------------------------------------ */
const TONES = { green: [C.greenBg, C.green], amber: [C.amberBg, C.amber], red: [C.redBg, C.red], blue: [C.blueBg, C.blue], slate: [C.slateBg, C.ink2], sky: [C.accentTint, C.accentInk] };
const badge = (parent, x, y, label, tone) => {
  const [bg, fg] = TONES[tone];
  const w = tw(label, 12, 's') + 22;
  rect(parent, x, y, w, 22, bg, { cornerRadius: 11 });
  ellipse(parent, x + 9, y + 8, 6, fg);
  text(parent, x + 18, y + 4, label, 12, fg, 's');
  return w;
};
const button = (parent, x, y, label, kind = 'primary', ic) => {
  const w = tw(label, 13.5, 's') + 28 + (ic ? 24 : 0);
  if (kind === 'primary') rect(parent, x, y, w, 38, C.rail, { cornerRadius: 9 });
  else rect(parent, x, y, w, 38, C.surface, { cornerRadius: 9, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
  const fg = kind === 'primary' ? '#FFFFFF' : C.ink;
  if (ic) icon(parent, ic, x + 14, y + 11, 16, fg);
  text(parent, x + 14 + (ic ? 24 : 0), y + 10, label, 13.5, fg, 's');
  return w;
};
const buttonsRight = (parent, right, y, list) => {
  let x = right;
  [...list].reverse().forEach(([label, kind, ic]) => { const w = tw(label, 13.5, 's') + 28 + (ic ? 24 : 0); x -= w; button(parent, x, y, label, kind, ic); x -= 10; });
};
const pageHead = (parent, title, sub, actions, w) => {
  text(parent, 32, 28, title, 22, C.ink, 'b');
  text(parent, 32, 60, sub, 14, C.mute, 'r');
  buttonsRight(parent, w - 32, 30, actions);
};

/* A full window: icon-only sidebar (the remembered collapsed state) and the shared top bar. */
let lastWin = null;
const BW = 1440, BH = 900, RAIL = 72, CW = BW - RAIL, CH = BH - 64;
const windowFrame = (board, name, x, y, title, crumbs, current) => {
  text(board, x, y - 30, name, 15, C.ink2, 's');
  const win = frame(board, name, x, y, BW, BH, { fill: C.page, cornerRadius: 10, clip: true });
  const sb = frame(win, 'Sidebar', 0, 0, RAIL, BH, { fill: C.rail });
  logo(sb, 18, 20, 36);
  icon(sb, 'arrow-left', 27, 76, 18, C.railMute);
  rect(sb, 16, 106, 40, 40, C.accent, { cornerRadius: 9 });
  icon(sb, 'droplets', 26, 116, 20, '#FFFFFF');
  icon(sb, 'search', 27, 162, 18, C.railMute);
  rect(sb, 14, 196, 44, 1, C.railLine);
  ['layout-dashboard', 'inbox', 'calendar', 'contact', 'users', 'clipboard-list', 'file-text', 'folder-kanban', 'wrench', 'file-pen-line', 'shield-check', 'receipt'].forEach((ic, i) => {
    const iy = 210 + i * 42;
    if (ic === current) { rect(sb, 14, iy, 44, 36, C.sky, { cornerRadius: 8, opacity: 0.14 }); rect(sb, 0, iy + 8, 3, 20, C.sky, { cornerRadius: [0, 3, 3, 0] }); }
    icon(sb, ic, 27, iy + 9, 18, ic === current ? C.sky : C.railMute);
  });
  const tb = frame(win, 'Top bar', RAIL, 0, CW, 64, { stroke: C.line, strokeWeight: 1, strokeAlign: 'inside', strokeSides: [0, 0, 1, 0] });
  text(tb, 32, 12, crumbs, 12, C.mute, 'm');
  text(tb, 32, 30, title, 18, C.ink, 'b');
  text(tb, CW - 470, 13, '1:24 pm', 15, C.ink, 's', { width: 200, align: 'right' });
  text(tb, CW - 470, 34, 'Friday, 30 October 2026', 12, C.mute, 'r', { width: 200, align: 'right' });
  rect(tb, CW - 254, 18, 1, 28, C.line);
  icon(tb, 'bell', CW - 227, 23, 18, C.ink);
  ellipse(tb, CW - 214, 9, 20, C.alert, { stroke: '#FFFFFF', strokeWeight: 2, strokeAlign: 'outside' });
  text(tb, CW - 214, 13, '12', 10, '#FFFFFF', 'b', { width: 20, align: 'center' });
  rect(tb, CW - 182, 18, 1, 28, C.line);
  ellipse(tb, CW - 166, 14, 36, C.rail);
  text(tb, CW - 166, 25, 'SA', 12, '#FFFFFF', 'b', { width: 36, align: 'center' });
  text(tb, CW - 120, 14, 'Super Admin', 13.5, C.ink, 's');
  text(tb, CW - 120, 33, 'Super admin', 12, C.mute, 'r');
  lastWin = win;
  return frame(win, 'Page', RAIL, 64, CW, CH, { fill: 'none', clip: true });
};

/* Board: 2 x 2 windows */
const GAP = 120;
const board = add('node.create', { type: 'frame', name: 'Page system', x: 0, y: 0, width: BW * 2 + GAP + 80, height: BH * 2 + GAP + 120, select: false, props: { fill: C.board } }, 'board');

/* ── 1. Console dashboard ─────────────────────────────────── */
{
  const pg = windowFrame(board, '1  Console dashboard', 40, 60, 'Dashboard', 'Operations   /   Water Tank Cleaning', 'layout-dashboard');
  pageHead(pg, 'Water Tank Cleaning', 'Tanks surveyed, quoted, cleaned and invoiced across Dhaka', [['Contacts & leads', 'secondary', 'contact'], ['New service request', 'primary', 'plus']], CW);

  // Needs attention: one strip, each queue a doorway.
  const at = card(pg, 'Needs attention', 32, 104, CW - 64, 92);
  text(at, 20, 14, 'Needs your attention', 13.5, C.ink, 's');
  text(at, CW - 64 - 220, 15, '28 items across 5 queues', 12.5, C.mute, 'r', { width: 200, align: 'right' });
  const qs = [['4', 'New leads to triage', C.ink], ['2', 'Site visits to book', C.ink], ['5', 'Quotes awaiting decision', C.ink], ['11', 'Work orders in progress', C.ink], ['6', 'Complaints open', C.red]];
  const qw = (CW - 64 - 40) / 5;
  qs.forEach(([nm, l, col], i) => {
    const qx = 20 + i * qw;
    if (i) rect(at, qx - 1, 44, 1, 36, C.line2);
    text(at, qx + (i ? 16 : 0), 44, nm, 22, col, 'b');
    text(at, qx + (i ? 16 : 0) + tw(nm, 22, 'b') + 10, 52, l, 13, C.ink2, 'm');
    icon(at, 'chevron-right', qx + qw - 34, 52, 16, C.mute2);
  });

  // KPI tiles
  const kpis = [['Active projects', '32', '20 open service requests', 'folder-kanban'], ['Revenue this month', 'Tk 3,02,500', '+12% on September', 'trending-up'], ['AMC contracts', '11', 'Tk 4,63,200 a year', 'shield-check'], ['Unpaid invoices', 'Tk 0', 'Nothing overdue', 'receipt']];
  const kw = (CW - 64 - 48) / 4;
  kpis.forEach(([l, v, s, ic], i) => {
    const k = card(pg, 'KPI ' + l, 32 + i * (kw + 16), 212, kw, 112);
    rect(k, 20, 20, 36, 36, C.accentTint, { cornerRadius: 9 });
    icon(k, ic, 29, 29, 18, C.accentInk);
    text(k, 68, 20, l, 13, C.mute, 'm');
    text(k, 68, 38, v, 22, C.ink, 'b');
    text(k, 20, 80, s, 12.5, i === 1 ? C.green : C.mute, i === 1 ? 's' : 'r');
  });

  // Pipeline (real stage counts)
  const pw = Math.round((CW - 64) * 0.58);
  const pl = card(pg, 'Pipeline', 32, 340, pw, 300);
  text(pl, 20, 18, 'Service pipeline', 15, C.ink, 's');
  text(pl, 20, 40, 'Active requests by the furthest stage reached', 12.5, C.mute, 'r');
  const stages = [['Lead received', 4], ['Site assessment', 7], ['Quotation sent', 27], ['Agreement signed', 24], ['Work order dispatched', 11], ['Completed and invoiced', 13]];
  stages.forEach(([l, v], i) => {
    const sy = 76 + i * 36;
    text(pl, 20, sy + 4, l, 13, C.ink2, 'm');
    rect(pl, 200, sy, pw - 280, 22, C.line2, { cornerRadius: 4 });
    rect(pl, 200, sy, Math.max(8, (pw - 280) * v / 27), 22, C.bar, { cornerRadius: 4 });
    text(pl, pw - 70, sy + 3, String(v), 13.5, C.ink, 's', { width: 50, align: 'right' });
  });

  // Due this week
  const dw = CW - 64 - pw - 16;
  const du = card(pg, 'Due this week', 32 + pw + 16, 340, dw, 300);
  text(du, 20, 18, 'Due this week', 15, C.ink, 's');
  text(du, dw - 120, 20, 'View calendar', 12.5, C.accentInk, 's', { width: 100, align: 'right' });
  [['WO-0544', 'Gulshan 2 · rooftop tank', 'Mon 2 Nov', 'amber'], ['WO-0546', 'Banani · 2 underground tanks', 'Tue 3 Nov', 'slate'], ['WO-0548', 'Uttara 7 · AMC visit', 'Wed 4 Nov', 'slate'], ['WO-0541', 'Dhanmondi · re-test water', 'Thu 5 Nov', 'red']].forEach(([c, d, when, tone], i) => {
    const ry = 58 + i * 58;
    if (i) rect(du, 20, ry - 8, dw - 40, 1, C.line2);
    text(du, 20, ry, c, 13.5, C.ink, 's');
    text(du, 20, ry + 20, d, 12.5, C.mute, 'r');
    badge(du, dw - 20 - (tw(when, 12, 's') + 22), ry + 6, when, tone);
  });

  // Recent work orders (compact table)
  const rt = card(pg, 'Recent work orders', 32, 656, CW - 64, 164);
  text(rt, 20, 16, 'Recent work orders', 15, C.ink, 's');
  text(rt, CW - 64 - 120, 18, 'View all', 12.5, C.accentInk, 's', { width: 100, align: 'right' });
  [['WO-0541', 'Audit Client 780983', 'Apex Water Care', 'Tk 18,400', 'Completed', 'green'], ['WO-0540', 'Audit Client 333893', 'Apex Water Care', 'Tk 18,400', 'Completed', 'green']].forEach((r, i) => {
    const ry = 56 + i * 52;
    rect(rt, 0, ry - 10, CW - 64, 1, C.line2);
    text(rt, 20, ry + 6, r[0], 13.5, C.ink, 's');
    text(rt, 160, ry + 6, r[1], 13.5, C.ink2, 'r');
    text(rt, 420, ry + 6, r[2], 13.5, C.ink2, 'r');
    text(rt, 720, ry + 6, r[3], 13.5, C.ink, 's', { width: 120, align: 'right', props: { features: { tnum: true } } });
    badge(rt, 900, ry + 4, r[4], r[5]);
  });
}

/* ── 2. List page ─────────────────────────────────────────── */
const listPage = (pg, dim) => {
  pageHead(pg, 'Work orders', 'Raised when the customer agreement is signed, then assigned, delivered and verified', [['Export', 'secondary', 'download'], ['New work order', 'primary', 'plus']], CW);
  const st = card(pg, 'Summary', 32, 104, CW - 64, 84);
  [['Awaiting assignment', '41', 'No provider yet', C.amber], ['Awaiting acceptance', '11', 'Assigned, not confirmed', C.ink], ['In progress', '3', '13 completed this month', C.ink], ['Provider payouts due', 'Tk 3,43,859', 'Across 9 providers', C.ink]].forEach(([l, v, s, col], i) => {
    const sw = (CW - 64) / 4, sx = i * sw;
    if (i) rect(st, sx, 16, 1, 52, C.line2);
    text(st, sx + 20, 14, l, 12.5, C.mute, 'm');
    text(st, sx + 20, 32, v, 21, col, 'b');
    text(st, sx + 20 + tw(v, 21, 'b') + 10, 41, s, 12, C.mute, 'r');
  });
  const cb = frame(pg, 'Callout', 32, 204, CW - 64, 44, { fill: C.amberBg, cornerRadius: 10 });
  icon(cb, 'triangle-alert', 16, 13, 18, C.amber);
  text(cb, 44, 13, '41 work orders need a provider. Only approved providers with a signed master agreement can be assigned.', 13.5, '#78350F', 'm');
  text(cb, CW - 64 - 180, 13, 'Assign providers', 13.5, C.amber, 's', { width: 160, align: 'right' });

  const tb = card(pg, 'Table', 32, 264, CW - 64, CH - 264 - 24);
  const TW_ = CW - 64;
  // tabs
  let tx = 20;
  [['All', 60], ['Draft', 36], ['Issued', 6], ['Accepted', 0], ['In progress', 3], ['Completed', 13], ['Cancelled', 0]].forEach(([l, c], i) => {
    const on = i === 0;
    text(tb, tx, 18, l, 13.5, on ? C.ink : C.mute, on ? 's' : 'm');
    const cx = tx + tw(l, 13.5, on ? 's' : 'm') + 8;
    rect(tb, cx, 17, tw(String(c), 11.5, 's') + 14, 20, on ? C.rail : C.slateBg, { cornerRadius: 10 });
    text(tb, cx + 7, 20, String(c), 11.5, on ? '#FFFFFF' : C.ink2, 's');
    if (on) rect(tb, tx, 50, cx + tw(String(c), 11.5, 's') + 14 - tx, 2, C.rail);
    tx = cx + tw(String(c), 11.5, 's') + 14 + 24;
  });
  rect(tb, TW_ - 20 - 260 - 108, 10, 260, 36, C.surface, { cornerRadius: 8, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
  icon(tb, 'search', TW_ - 20 - 260 - 108 + 12, 20, 16, C.mute2);
  text(tb, TW_ - 20 - 260 - 108 + 36, 19, 'Search work orders', 13, C.mute2, 'r');
  rect(tb, TW_ - 20 - 96, 10, 96, 36, C.surface, { cornerRadius: 8, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
  icon(tb, 'sliders-horizontal', TW_ - 20 - 84, 20, 16, C.ink);
  text(tb, TW_ - 20 - 60, 19, 'Filters', 13, C.ink, 's');
  rect(tb, 0, 52, TW_, 1, C.line);
  // header
  rect(tb, 0, 53, TW_, 40, '#F8FAFC');
  const cols = [[52, 'Work order'], [300, 'Client'], [520, 'Provider'], [720, 'Progress'], [880, 'Target date'], [970, 'Contract'], [1110, 'Status']];
  rect(tb, 20, 65, 16, 16, C.surface, { cornerRadius: 4, stroke: C.mute2, strokeWeight: 1.5, strokeAlign: 'inside' });
  cols.forEach(([x, l]) => text(tb, x, 64, l, 12.5, C.mute, 's', l === 'Contract' ? { width: 110, align: 'right' } : {}));
  rect(tb, 0, 93, TW_, 1, C.line);
  const rows = [
    ['WO-0541', 'Rooftop tank evacuation & wash', 'Audit Client 780983', '01700 0780983', 'Apex Water Care', 95, 'Sep 20, 2026', 'Tk 18,400', '', 'Completed', 'green'],
    ['WO-0540', 'Rooftop tank evacuation & wash', 'Audit Client 333893', '01700 0333893', 'Apex Water Care', 95, 'Sep 20, 2026', 'Tk 18,400', '', 'Completed', 'green'],
    ['WO-0539', 'Rooftop tank evacuation & wash', 'Audit Client 202774', '01700 0202774', 'Apex Water Care', 75, 'Sep 20, 2026', 'Tk 18,400', 'Tk 13,175 due', 'In progress', 'blue'],
    ['WO-0538', 'Underground tank, 2 chambers', 'Audit Client 002788', '01700 0002788', 'Apex Water Care', 60, 'Sep 20, 2026', 'Tk 18,400', 'Tk 13,175 due', 'In progress', 'blue'],
    ['WO-0537', 'Residential tank wash', 'WT Full 592161', '01800 0592161', 'Not assigned', 0, 'Aug 30, 2026', 'Tk 800', 'Tk 288 due', 'Awaiting provider', 'amber'],
    ['WO-0536', 'Commercial tank, 10,000 L', 'Rahman Tower', '01711 482910', 'Clear Flow Services', 40, 'Aug 28, 2026', 'Tk 32,000', '', 'Accepted', 'sky'],
    ['WO-0535', 'AMC quarterly visit', 'Green Valley School', '01913 220041', 'Apex Water Care', 0, 'Aug 25, 2026', 'Tk 6,500', '', 'Draft', 'slate'],
  ];
  rows.forEach((r, i) => {
    const ry = 94 + i * 56;
    if (i === 2) rect(tb, 0, ry, TW_, 56, '#F8FAFC');
    rect(tb, 20, ry + 20, 16, 16, C.surface, { cornerRadius: 4, stroke: C.mute2, strokeWeight: 1.5, strokeAlign: 'inside' });
    text(tb, 52, ry + 9, r[0], 13.5, C.ink, 's');
    text(tb, 52, ry + 29, r[1], 12.5, C.mute, 'r');
    text(tb, 300, ry + 9, r[2], 13.5, C.ink, 'm');
    text(tb, 300, ry + 29, r[3], 12.5, C.mute, 'r');
    text(tb, 520, ry + 20, r[4], 13.5, r[4] === 'Not assigned' ? C.amber : C.ink2, r[4] === 'Not assigned' ? 's' : 'r');
    rect(tb, 720, ry + 27, 100, 6, C.line2, { cornerRadius: 3 });
    if (r[5]) rect(tb, 720, ry + 27, r[5], 6, C.bar, { cornerRadius: 3 });
    text(tb, 828, ry + 21, r[5] + '%', 12, C.mute, 'm');
    text(tb, 880, ry + 20, r[6], 13.5, C.ink2, 'r');
    text(tb, 970, ry + (r[8] ? 11 : 20), r[7], 13.5, C.ink, 's', { width: 110, align: 'right' });
    if (r[8]) text(tb, 970, ry + 31, r[8], 12, C.red, 's', { width: 110, align: 'right' });
    badge(tb, 1110, ry + 17, r[9], r[10]);
    icon(tb, 'ellipsis', TW_ - 44, ry + 17, 20, C.mute);
    rect(tb, 0, ry + 55, TW_, 1, C.line2);
  });
  const fy = CH - 264 - 24 - 52;
  rect(tb, 0, fy, TW_, 1, C.line);
  text(tb, 20, fy + 17, 'Showing 1 to 7 of 60 work orders', 13, C.mute, 'r');
  ['chevron-left', null, null, null, 'chevron-right'].forEach((ic, i) => {
    const bx = TW_ - 20 - (5 - i) * 40;
    rect(tb, bx, fy + 10, 34, 32, i === 1 ? C.rail : C.surface, { cornerRadius: 8, stroke: i === 1 ? C.rail : C.line, strokeWeight: 1, strokeAlign: 'inside' });
    if (ic) icon(tb, ic, bx + 9, fy + 18, 16, C.ink);
    else text(tb, bx, fy + 17, String(i), 13, i === 1 ? '#FFFFFF' : C.ink, 's', { width: 34, align: 'center' });
  });
  if (dim) rect(lastWin, 0, 0, BW, BH, C.rail, { opacity: 0.45 });
};
{
  const pg = windowFrame(board, '2  List page', 40 + BW + GAP, 60, 'Work orders', 'Operations   /   Water Tank Cleaning', 'folder-kanban');
  listPage(pg, false);
}

/* ── 3. Form in a drawer ──────────────────────────────────── */
{
  const pg = windowFrame(board, '3  Form (drawer over its list)', 40, 60 + BH + GAP, 'Work orders', 'Operations   /   Water Tank Cleaning', 'folder-kanban');
  listPage(pg, true);
  const DW = 600;
  const dr = lift(frame(lastWin, 'Drawer', BW - DW, 0, DW, BH, { fill: C.surface }), true);
  text(dr, 32, 26, 'New work order', 20, C.ink, 'b');
  text(dr, 32, 54, 'A provider can be assigned now or later', 13.5, C.mute, 'r');
  rect(dr, DW - 32 - 36, 24, 36, 36, C.surface, { cornerRadius: 8 });
  icon(dr, 'x', DW - 32 - 28, 32, 20, C.ink2);
  rect(dr, 0, 92, DW, 1, C.line);
  const field = (x, y, w, label, value, opts = {}) => {
    text(dr, x, y, label + (opts.req ? ' *' : ''), 13, C.ink, 's');
    const err = !!opts.error;
    rect(dr, x, y + 24, w, 40, opts.disabled ? C.slateBg : C.surface, { cornerRadius: 8, stroke: err ? C.red : C.line, strokeWeight: err ? 1.5 : 1, strokeAlign: 'inside' });
    text(dr, x + 12, y + 35, value, 14, opts.placeholder ? C.mute2 : C.ink, 'r');
    if (opts.select) icon(dr, 'chevron-down', x + w - 30, y + 36, 16, C.mute);
    if (opts.suffix) text(dr, x + w - 12 - tw(opts.suffix, 13), y + 36, opts.suffix, 13, C.mute, 'r');
    if (opts.icon) icon(dr, opts.icon, x + w - 32, y + 35, 18, C.mute);
    if (err) { icon(dr, 'circle-alert', x, y + 72, 14, C.red); text(dr, x + 20, y + 71, opts.error, 12.5, C.red, 'm'); }
    else if (opts.help) text(dr, x, y + 71, opts.help, 12.5, C.mute, 'r');
  };
  const section = (y, label, sub) => { text(dr, 32, y, label, 15, C.ink, 's'); text(dr, 32, y + 22, sub, 12.5, C.mute, 'r'); };
  const FW = DW - 64, HW = (FW - 16) / 2;
  section(116, 'Client and site', 'Who the job is for and where it happens');
  field(32, 164, FW, 'Client', 'Choose a client', { req: true, select: true, placeholder: true, error: 'Choose the client this job is for.' });
  field(32, 262, FW, 'Site address', 'House 12, Road 7, Gulshan 2, Dhaka', { req: true });
  rect(dr, 32, 360, FW, 1, C.line2);
  section(380, 'Service', 'What will be done, and when');
  field(32, 428, HW, 'Service', 'Rooftop tank wash', { req: true, select: true });
  field(32 + HW + 16, 428, HW, 'Tank capacity', '5,000', { suffix: 'litres', help: 'Sets the quoted price' });
  field(32, 526, HW, 'Target date', '20 Nov 2026', { req: true, icon: 'calendar' });
  text(dr, 32 + HW + 16, 526, 'Time window', 13, C.ink, 's');
  rect(dr, 32 + HW + 16, 550, HW, 40, C.slateBg, { cornerRadius: 8 });
  ['Morning', 'Afternoon', 'Evening'].forEach((l, i) => {
    const sw = (HW - 8) / 3, sx = 32 + HW + 16 + 4 + i * sw;
    if (i === 0) rect(dr, sx, 554, sw, 32, C.surface, { cornerRadius: 6 });
    text(dr, sx, 563, l, 13, i === 0 ? C.ink : C.mute, i === 0 ? 's' : 'm', { width: sw, align: 'center' });
  });
  rect(dr, 32, 624, FW, 1, C.line2);
  section(644, 'Assignment', 'Optional now');
  field(32, 692, FW, 'Provider', 'Assign later', { select: true, placeholder: true, help: 'Only approved providers with a signed master agreement are listed.' });
  rect(dr, 0, BH - 76, DW, 76, C.surface);
  rect(dr, 0, BH - 76, DW, 1, C.line);
  buttonsRight(dr, DW - 32, BH - 57, [['Cancel', 'secondary'], ['Save as draft', 'secondary'], ['Create work order', 'primary']]);
}

/* ── 4. Record page ───────────────────────────────────────── */
{
  const pg = windowFrame(board, '4  Record page', 40 + BW + GAP, 60 + BH + GAP, 'WO-0539', 'Water Tank Cleaning   /   Work orders', 'folder-kanban');
  const hd = card(pg, 'Record header', 32, 24, CW - 64, 196);
  icon(hd, 'arrow-left', 24, 24, 16, C.mute);
  text(hd, 46, 23, 'Work orders', 13, C.mute, 'm');
  text(hd, 24, 54, 'Rooftop tank evacuation & wash', 22, C.ink, 'b');
  rect(hd, 24, 92, 70, 24, C.slateBg, { cornerRadius: 6 });
  text(hd, 32, 96, 'WO-0539', 12.5, C.ink2, 's');
  badge(hd, 104, 93, 'In progress', 'blue');
  text(hd, 220, 96, 'Audit Client 202774   ·   Gulshan 2, Dhaka   ·   Target Sep 20, 2026', 13.5, C.ink2, 'r');
  buttonsRight(hd, CW - 64 - 24, 50, [['', 'secondary', 'ellipsis'], ['Message client', 'secondary', 'message-square'], ['Record payment', 'primary', 'banknote']]);
  // stepper
  const st = ['Issued', 'Accepted', 'In progress', 'Verified', 'Completed'];
  const sx0 = 24, sw = (CW - 64 - 48) / st.length;
  st.forEach((l, i) => {
    const x = sx0 + i * sw, done = i < 2, now = i === 2;
    if (i) { const px = x - sw, from = px + 32 + tw(st[i - 1], 13, 'm') + 14; rect(hd, from, 147, x - 10 - from, 2, done || now ? C.bar : C.line); }
    ellipse(hd, x, 136, 24, done ? C.bar : now ? C.surface : C.surface, { stroke: done || now ? C.bar : C.line, strokeWeight: 2, strokeAlign: 'inside' });
    if (done) icon(hd, 'check', x + 5, 141, 14, '#FFFFFF', 3);
    if (now) ellipse(hd, x + 7, 143, 10, C.bar);
    text(hd, x + 32, 140, l, 13, done || now ? C.ink : C.mute, now ? 's' : 'm');
    text(hd, x + 32, 160, ['Sep 12', 'Sep 13', 'Since Sep 15', '', ''][i], 12, C.mute, 'r');
  });
  // tabs
  let tx = 32;
  ['Overview', 'Line items', 'Invoices', 'Documents', 'Activity'].forEach((l, i) => {
    text(pg, tx, 240, l, 14, i === 0 ? C.ink : C.mute, i === 0 ? 's' : 'm');
    if (i === 0) rect(pg, tx, 266, tw(l, 14, 's'), 2, C.rail);
    tx += tw(l, 14, i === 0 ? 's' : 'm') + 32;
  });
  rect(pg, 32, 268, CW - 64, 1, C.line);
  const LW = Math.round((CW - 64) * 0.64), RW = CW - 64 - LW - 16;
  const dt = card(pg, 'Details', 32, 288, LW, 248);
  text(dt, 24, 20, 'Job details', 15, C.ink, 's');
  [['Service', 'Rooftop tank evacuation & wash'], ['Tank', '1 rooftop tank, 5,000 litres'], ['Site', 'House 12, Road 7, Gulshan 2'], ['Time window', 'Morning, 9 am to 12 pm'], ['Agreement', 'Signed Sep 11, 2026'], ['Source', 'Customer service agreement']].forEach(([k, v], i) => {
    const col = i % 2, row = Math.floor(i / 2), x = 24 + col * (LW / 2), y = 60 + row * 60;
    text(dt, x, y, k, 12.5, C.mute, 'm');
    text(dt, x, y + 20, v, 14, C.ink, 'm');
  });
  const li = card(pg, 'Charges', 32, 552, LW, 220);
  text(li, 24, 20, 'Charges', 15, C.ink, 's');
  [['Tank evacuation and wash, 5,000 L', 'Tk 14,000'], ['Disinfection and water test', 'Tk 3,200'], ['Travel, Gulshan zone', 'Tk 1,200']].forEach(([l, v], i) => {
    const y = 58 + i * 40;
    rect(li, 24, y - 8, LW - 48, 1, C.line2);
    text(li, 24, y + 4, l, 13.5, C.ink2, 'r');
    text(li, LW - 24 - 140, y + 4, v, 13.5, C.ink, 's', { width: 140, align: 'right' });
  });
  rect(li, 24, 178, LW - 48, 1, C.line);
  text(li, 24, 188, 'Total   ·   Tk 5,225 paid   ·   Tk 13,175 due', 13.5, C.ink2, 'm');
  text(li, LW - 24 - 140, 188, 'Tk 18,400', 15, C.ink, 'b', { width: 140, align: 'right' });

  const cl = card(pg, 'People', 32 + LW + 16, 288, RW, 248);
  text(cl, 20, 20, 'People', 15, C.ink, 's');
  [['AC', 'Audit Client 202774', 'Client · 01700 0202774', C.accentTint, C.accentInk], ['AW', 'Apex Water Care', 'Provider · accepted Sep 13', '#EDE9FE', '#6D28D9'], ['RH', 'Rafiq Hasan', 'Supervisor on site', C.slateBg, C.ink2]].forEach(([ini, nm, s, bg, fg], i) => {
    const y = 60 + i * 60;
    ellipse(cl, 20, y, 38, bg);
    text(cl, 20, y + 11, ini, 12.5, fg, 'b', { width: 38, align: 'center' });
    text(cl, 70, y + 2, nm, 13.5, C.ink, 's');
    text(cl, 70, y + 21, s, 12.5, C.mute, 'r');
  });
  const ac = card(pg, 'Activity', 32 + LW + 16, 552, RW, 220);
  text(ac, 20, 20, 'Activity', 15, C.ink, 's');
  rect(ac, 27, 64, 2, 132, C.line);
  [['Payment of Tk 5,225 recorded', 'Sep 16, 11:20 am · Super Admin'], ['Work started on site', 'Sep 15, 9:05 am · Apex Water Care'], ['Provider accepted the job', 'Sep 13, 4:42 pm · Apex Water Care']].forEach(([l, s], i) => {
    const y = 58 + i * 50;
    ellipse(ac, 22, y + 2, 12, i === 0 ? C.bar : C.surface, { stroke: i === 0 ? C.bar : C.mute2, strokeWeight: 2, strokeAlign: 'inside' });
    text(ac, 46, y - 2, l, 13.5, C.ink, 'm');
    text(ac, 46, y + 17, s, 12, C.mute, 'r');
  });
}

process.stdout.write(JSON.stringify(steps));
