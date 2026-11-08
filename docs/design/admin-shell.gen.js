// Generates a FigCraft command script for the Seventh Sky admin shell: sidebar,
// top bar (breadcrumb, live date/time, notifications, profile) and their states.
// Run from the repo root:
//   node docs/design/admin-shell.gen.js > s.json && figcraft-cli run s.json --out docs/design/admin-shell.figcraft
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const ICONS = path.join(ROOT, 'admin-portal/node_modules/lucide-react/dist/esm/icons');
const LOGO = path.join(ROOT, 'admin-portal/src/assets/logo-mark.png');

const C = {
  board: '#E7ECF2', page: '#F6F8FA', surface: '#FFFFFF', line: '#E2E8F0', line2: '#EEF2F6',
  ink: '#0F172A', ink2: '#475569', mute: '#64748B', mute2: '#94A3B8',
  // Sidebar: the logo's own navy, one step deeper so the mark stands on it.
  rail: '#0D1638', rail2: '#16214A', railLine: '#232F5C', railInk: '#C3CBE4', railMute: '#7684B0',
  sky: '#1CC4FA', skyInk: '#0A6C93', alert: '#E5484D', amberBg: '#FEF3C7', amber: '#B45309',
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

/* Lucide icons, read from the package the app ships, so the mockup's icons are the app's. */
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
const lift = (node) => {
  add('effect.add', { ids: [node], type: 'dropShadow', effect: { type: 'dropShadow', color: '#0F172A24', offset: [0, 16], radius: 40, spread: -8 } });
  add('effect.add', { ids: [node], type: 'dropShadow', effect: { type: 'dropShadow', color: '#0F172A0F', offset: [0, 2], radius: 6, spread: 0 } });
  return node;
};

/* ── Board ─────────────────────────────────────────────── */
const BW = 1980, BH = 1100, SW = 264, MW = 1440, MH = 1000;
const board = add('node.create', { type: 'frame', name: 'Admin shell', x: 0, y: 0, width: BW, height: BH, select: false, props: { fill: C.board } }, 'board');
text(board, 40, 16, 'Desktop, 1440 — Property Management open, notifications open', 13, C.ink2, 's');
const app = frame(board, 'Desktop 1440', 40, 44, MW, MH, { fill: C.page, clip: true, cornerRadius: 10 });

/* ── Sidebar ───────────────────────────────────────────── */
const sb = frame(app, 'Sidebar', 0, 0, SW, MH, { fill: C.rail });
logo(sb, 20, 20, 36);
text(sb, 66, 21, 'Seventh Sky', 15.5, '#FFFFFF', 'b');
text(sb, 66, 40, 'Property Care', 11.5, C.railMute, 'm');
icon(sb, 'panel-left-close', 226, 30, 17, C.railMute, 2);

rect(sb, 16, 78, 232, 36, C.rail2, { cornerRadius: 8, stroke: C.railLine, strokeWeight: 1, strokeAlign: 'inside' });
icon(sb, 'search', 28, 88, 16, C.railMute);
text(sb, 52, 87, 'Jump to a page', 13, C.railMute, 'r');
rect(sb, 206, 85, 32, 22, 'none', { cornerRadius: 5, stroke: C.railLine, strokeWeight: 1, strokeAlign: 'inside' });
text(sb, 212, 89, '⌘K', 11, C.railMute, 'm');

let y = 132;
const item = (label, ic, { active, group, open } = {}) => {
  if (active) {
    rect(sb, 12, y, 240, 36, C.sky, { cornerRadius: 8, opacity: 0.14 });
    rect(sb, 0, y + 8, 3, 20, C.sky, { cornerRadius: [0, 3, 3, 0] });
  }
  const tone = active || open ? '#FFFFFF' : C.railInk;
  icon(sb, ic, 26, y + 9, 18, active ? C.sky : open ? '#FFFFFF' : C.railMute, 2);
  text(sb, 54, y + 9, label, 13.5, tone, active || open ? 's' : 'm');
  if (group) icon(sb, open ? 'chevron-up' : 'chevron-down', 228, y + 11, 14, C.railMute, 2);
  y += 38;
};
const section = (label) => { y += 10; text(sb, 26, y, label, 11.5, C.railMute, 's'); y += 22; };
const subs = (labels, current) => {
  const top = y;
  labels.forEach((l) => {
    const on = l === current;
    if (on) { rect(sb, 44, y, 208, 32, C.sky, { cornerRadius: 7, opacity: 0.14 }); rect(sb, 36, y + 9, 2, 14, C.sky, { cornerRadius: 2 }); }
    text(sb, 56, y + 8, l, 13, on ? '#FFFFFF' : C.railInk, on ? 's' : 'r');
    y += 32;
  });
  rect(sb, 36, top, 1, y - top, C.railLine);
  y += 6;
};
item('Dashboard', 'layout-dashboard');
item('CRM', 'contact', { group: true });
section('Operations');
item('Residential', 'house', { group: true, open: true });
subs(['Property Management', 'Sell', 'Buy', 'Short Term Stay'], 'Property Management');
item('Commercial', 'building-2', { group: true });
item('Business', 'briefcase', { group: true });
item('Rural', 'trees', { group: true });
item('Interior Design', 'sofa', { group: true });
item('Air Conditioning', 'air-vent');
item('Water Tank Cleaning', 'droplets');
item('Doc Verification & Transfer', 'file-search', { group: true });
item('Property Care & Concierge', 'concierge-bell');
item('Removal & Relocation', 'truck');
section('Management');
item('Accounting', 'calculator', { group: true });
item('Website Management', 'globe', { group: true });
item('Global Settings', 'settings', { group: true });

rect(sb, 0, MH - 64, SW, 1, C.railLine);
icon(sb, 'building', 24, MH - 42, 18, C.railMute);
text(sb, 54, MH - 47, 'Head Office', 13, '#FFFFFF', 's');
text(sb, 54, MH - 29, 'Seventh Sky Property Care', 11.5, C.railMute, 'r');

/* ── Top bar ───────────────────────────────────────────── */
const TW = MW - SW;
const tb = frame(app, 'Top bar', SW, 0, TW, 64, { stroke: C.line, strokeWeight: 1, strokeAlign: 'inside', strokeSides: [0, 0, 1, 0] });
text(tb, 32, 12, 'Operations   /   Residential', 12, C.mute, 'm');
text(tb, 32, 30, 'Property Management', 18, C.ink, 'b');

const PX = TW - 24 - 200;                  // profile block
ellipse(tb, PX, 14, 36, C.rail);
text(tb, PX + 9, 25, 'SA', 12, '#FFFFFF', 'b');
text(tb, PX + 46, 14, 'Super Admin', 13.5, C.ink, 's');
text(tb, PX + 46, 33, 'Super admin', 12, C.mute, 'r');
icon(tb, 'chevron-down', PX + 182, 25, 14, C.mute2);
rect(tb, PX - 16, 18, 1, 28, C.line);

const BX = PX - 16 - 16 - 40;               // bell, shown pressed (panel open)
rect(tb, BX, 12, 40, 40, '#EEF4FB', { cornerRadius: 10 });
icon(tb, 'bell', BX + 11, 23, 18, C.ink, 2);
ellipse(tb, BX + 23, 7, 20, C.alert, { stroke: '#FFFFFF', strokeWeight: 2, strokeAlign: 'outside' });
text(tb, BX + 23, 11, '13', 10, '#FFFFFF', 'b', { width: 20, align: 'center' });
rect(tb, BX - 16, 18, 1, 28, C.line);

const DX = BX - 16 - 16 - 200;              // date and time, right-aligned to the divider
text(tb, DX, 13, '12:54 pm', 15, C.ink, 's', { width: 200, align: 'right', props: { features: { tnum: true } } });
text(tb, DX, 34, 'Thursday, 30 October 2026', 12, C.mute, 'r', { width: 200, align: 'right' });

/* Page body: a quiet skeleton, so the shell is what reads first */
const body = frame(app, 'Page', SW, 64, TW, MH - 64, { fill: 'none' });
[0, 1, 2, 3].forEach((i) => {
  const w = (TW - 64 - 48) / 4, x = 32 + i * (w + 16);
  rect(body, x, 28, w, 96, C.surface, { cornerRadius: 12, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
  rect(body, x + 20, 50, 80, 10, C.line2, { cornerRadius: 5 });
  rect(body, x + 20, 76, 120, 18, C.line2, { cornerRadius: 6 });
});
rect(body, 32, 144, TW - 64, 560, C.surface, { cornerRadius: 12, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
for (let r = 0; r < 9; r++) {
  rect(body, 32, 208 + r * 54, TW - 64, 1, C.line2);
  rect(body, 56, 226 + r * 54, 180, 10, C.line2, { cornerRadius: 5 });
  rect(body, 420, 226 + r * 54, 120, 10, C.line2, { cornerRadius: 5 });
  rect(body, TW - 200, 226 + r * 54, 110, 10, C.line2, { cornerRadius: 5 });
}
rect(body, 56, 172, 220, 14, '#E2E8F0', { cornerRadius: 6 });

/* Notifications panel (real rows from the local copy) */
const NW = 380;
const np = lift(frame(app, 'Notifications panel', SW + BX + 40 - NW, 60, NW, 496, { cornerRadius: 12, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside', clip: true }));
text(np, 20, 18, 'Notifications', 15, C.ink, 'b');
text(np, 20, 40, '13 unread', 12, C.mute, 'r');
text(np, NW - 20 - 140, 22, 'Mark all as read', 12.5, C.skyInk, 's', { width: 140, align: 'right' });
rect(np, 0, 66, NW, 1, C.line);
[['#399', '27 Sep, 9:37 am · 1 month ago'], ['#378', '27 Sep, 9:07 am · 1 month ago'], ['#352', '27 Sep, 8:25 am · 1 month ago'], ['#341', '27 Sep, 6:40 am · 1 month ago']]
  .forEach(([p, when], i) => {
    const ry = 67 + i * 96;
    rect(np, 0, ry, NW, 96, i === 0 ? '#F5F9FE' : C.surface);
    ellipse(np, 20, ry + 16, 34, C.amberBg);
    icon(np, 'triangle-alert', 29, ry + 25, 16, C.amber, 2);
    text(np, 66, ry + 14, 'Compliance risk escalated', 13.5, C.ink, 's');
    text(np, 66, ry + 34, `Trade licence flagged on property ${p}: licence expired`, 12.5, C.ink2, 'r', { width: 282 });
    text(np, 66, ry + 70, when, 11.5, C.mute2, 'r');
    ellipse(np, NW - 22, ry + 20, 8, C.sky);
    rect(np, 0, ry + 95, NW, 1, C.line2);
  });
text(np, 0, 464, 'Showing the 20 most recent', 12, C.mute, 'r', { width: NW, align: 'center' });

/* ── Side column: other states ─────────────────────────── */
const CX = 40 + MW + 40;
text(board, CX, 16, 'Profile menu', 13, C.ink2, 's');
const pm = lift(frame(board, 'Profile menu', CX, 44, 300, 320, { cornerRadius: 12, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' }));
ellipse(pm, 20, 20, 44, C.rail);
text(pm, 20, 34, 'SA', 15, '#FFFFFF', 'b', { width: 44, align: 'center' });
text(pm, 76, 20, 'Super Admin', 15, C.ink, 'b');
text(pm, 76, 42, 'admin@seventhskyproperty.com', 12, C.mute, 'r');
rect(pm, 20, 80, 260, 52, C.page, { cornerRadius: 8 });
text(pm, 32, 88, 'Super admin', 12.5, C.ink, 's');
text(pm, 32, 108, 'Head Office · signed in 9:12 am', 12, C.mute, 'r');
rect(pm, 0, 146, 300, 1, C.line);
[['user', 'My account'], ['settings', 'System settings'], ['users', 'Users & roles']].forEach(([ic, l], i) => {
  icon(pm, ic, 22, 160 + i * 36, 17, C.ink2);
  text(pm, 52, 160 + i * 36, l, 13.5, C.ink, 'm');
});
rect(pm, 0, 268, 300, 1, C.line);
icon(pm, 'log-out', 22, 284, 17, '#C2272D');
text(pm, 52, 284, 'Sign out', 13.5, '#C2272D', 's');

text(board, CX, 394, 'Collapsed sidebar', 13, C.ink2, 's');
const rail = frame(board, 'Collapsed sidebar', CX, 422, 72, 390, { fill: C.rail, cornerRadius: 10, clip: true });
logo(rail, 18, 20, 36);
rect(rail, 12, 76, 48, 1, C.railLine);
['layout-dashboard', 'contact', 'house', 'building-2', 'briefcase', 'trees', 'sofa', 'air-vent', 'droplets'].forEach((ic, i) => {
  const iy = 92 + i * 36;
  if (ic === 'house') { rect(rail, 14, iy - 6, 44, 34, C.sky, { cornerRadius: 8, opacity: 0.14 }); rect(rail, 0, iy + 2, 3, 18, C.sky, { cornerRadius: [0, 3, 3, 0] }); }
  icon(rail, ic, 27, iy + 2, 18, ic === 'house' ? C.sky : C.railMute);
});
const tip = frame(board, 'Tooltip', CX + 84, 422 + 160, 112, 30, { fill: C.ink, cornerRadius: 6 });
text(tip, 0, 7, 'Residential', 12.5, '#FFFFFF', 's', { width: 112, align: 'center' });

text(board, CX + 220, 394, 'Hover and focus', 13, C.ink2, 's');
const hv = frame(board, 'Nav states', CX + 220, 422, 220, 170, { fill: C.rail, cornerRadius: 10 });
[['Default', null], ['Hover', C.rail2], ['Current', 'cur']].forEach(([l, bg], i) => {
  const ry = 14 + i * 50;
  if (bg === 'cur') { rect(hv, 10, ry, 200, 36, C.sky, { cornerRadius: 8, opacity: 0.14 }); rect(hv, 0, ry + 8, 3, 20, C.sky, { cornerRadius: [0, 3, 3, 0] }); }
  else if (bg) rect(hv, 10, ry, 200, 36, bg, { cornerRadius: 8 });
  icon(hv, 'droplets', 22, ry + 9, 18, bg === 'cur' ? C.sky : C.railMute);
  text(hv, 50, ry + 9, l, 13.5, bg === 'cur' ? '#FFFFFF' : C.railInk, bg === 'cur' ? 's' : 'm');
});

text(board, CX, 840, 'Phone header, 390', 13, C.ink2, 's');
const ph = frame(board, 'Phone header', CX, 868, 390, 60, { stroke: C.line, strokeWeight: 1, strokeAlign: 'inside', strokeSides: [0, 0, 1, 0], cornerRadius: 10, clip: true });
icon(ph, 'menu', 16, 19, 22, C.ink);
logo(ph, 52, 16, 28);
text(ph, 90, 10, 'Residential', 11.5, C.mute, 'm');
text(ph, 90, 27, 'Property Manage…', 15, C.ink, 'b');
text(ph, 258, 21, '12:54', 14, C.ink, 's', { props: { features: { tnum: true } } });
icon(ph, 'bell', 312, 19, 20, C.ink);
ellipse(ph, 324, 10, 16, C.alert);
text(ph, 324, 13, '13', 9, '#FFFFFF', 'b', { width: 16, align: 'center' });
ellipse(ph, 346, 14, 32, C.rail);
text(ph, 346, 23, 'SA', 11, '#FFFFFF', 'b', { width: 32, align: 'center' });

process.stdout.write(JSON.stringify(steps));
