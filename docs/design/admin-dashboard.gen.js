// Generates a FigCraft command script for the Seventh Sky admin dashboard mockup.
// Usage: node gen.js > dashboard.json && figcraft-cli run dashboard.json --out dashboard.figcraft
const C = {
  page: '#F6F8FA', surface: '#FFFFFF', line: '#E2E8F0', grid: '#EEF2F6',
  ink: '#0F172A', ink2: '#475569', mute: '#94A3B8',
  navy: '#002244', navy2: '#0B3157', sky: '#1CC4FA', skySoft: '#8FD9F5', bandLabel: '#A7C1D9',
  up: '#4ADE80', down: '#F87171', danger: '#DC2626',
  s1: '#2a78d6', s2: '#eb6834', s3: '#1baf7a', s4: '#eda100',
  seq: ['#C9DDF6', '#7FAEE8', '#2a78d6'],
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
const W = { r: 'Regular', s: 'SemiBold', b: 'Bold' };
const text = (parent, x, y, str, size, color, weight = 'r', opts = {}) => {
  const props = { fontFamily: 'Inter', fontStyle: W[weight], fontSize: size, fill: color, ...(opts.props || {}) };
  if (opts.width) { props.textAutoResize = 'height'; props.width = opts.width; props.textAlign = opts.align || 'left'; }
  add('node.create', { type: 'text', parent, x, y, text: str, select: false, props });
};
const path = (parent, d, stroke, weight = 2, props = {}) =>
  add('node.create', { type: 'vector', parent, x: 0, y: 0, path: d, select: false, props: { fill: 'none', stroke, strokeWeight: weight, strokeCap: 'round', strokeJoin: 'round', ...props } });
const panel = (parent, name, x, y, w, h) => frame(parent, name, x, y, w, h, { stroke: C.line, strokeWeight: 1, strokeAlign: 'inside', cornerRadius: 12, clip: true });
const taka = (v) => 'Tk ' + Math.round(v).toLocaleString('en-IN');
const short = (v) => (v >= 1e6 ? `Tk ${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `Tk ${Math.round(v / 1e3)}k` : `Tk ${v}`);

/* ── Canvas ─────────────────────────────────────────────── */
const PAGE_W = 1440, PAGE_H = 1480;
const root = add('node.create', { type: 'frame', name: 'Admin Dashboard', x: 0, y: 0, width: PAGE_W, height: PAGE_H, select: false, props: { fill: C.page } }, 'root');

/* Sidebar (existing shell, shown for context) */
const sb = frame(root, 'Sidebar', 0, 0, 256, PAGE_H, { stroke: C.line, strokeWeight: 1, strokeAlign: 'inside', strokeSides: [0, 1, 0, 0] });
rect(sb, 20, 18, 36, 36, C.sky, { cornerRadius: 10 });
text(sb, 29, 27, '7S', 14, '#FFFFFF', 'b');
text(sb, 66, 19, 'Seventh Sky', 15, C.ink, 'b');
text(sb, 66, 38, 'Property Care', 11, C.mute, 's');
rect(sb, 0, 72, 256, 1, C.line);
rect(sb, 12, 86, 232, 36, '#E6FAFE', { cornerRadius: 10 });
rect(sb, 0, 94, 3, 20, C.sky, { cornerRadius: 3 });
let sy = 95;
const navItem = (label, active) => { text(sb, 52, sy, label, 13.5, active ? '#002244' : C.ink2, 's'); ellipse(sb, 26, sy + 3, 12, 'none', { stroke: active ? '#002244' : C.mute, strokeWeight: 1.5 }); sy += 38; };
navItem('Dashboard', true); navItem('CRM');
sy += 10; text(sb, 24, sy, 'Operations', 11, C.mute, 's'); sy += 26;
['Residential', 'Commercial', 'Business', 'Rural', 'Interior Design', 'Air Conditioning', 'Water Tank Cleaning', 'Doc Verification & Transfer', 'Property Care & Concierge', 'Removal & Relocation'].forEach((l) => navItem(l));
sy += 10; text(sb, 24, sy, 'Management', 11, C.mute, 's'); sy += 26;
['Accounting', 'HRM', 'Website Management', 'Global Settings'].forEach((l) => navItem(l));

/* Top bar */
const tb = frame(root, 'Top bar', 256, 0, PAGE_W - 256, 56, { stroke: C.line, strokeWeight: 1, strokeAlign: 'inside', strokeSides: [0, 0, 1, 0] });
text(tb, 32, 18, 'Dashboard', 16, C.ink, 'b');
ellipse(tb, PAGE_W - 256 - 200, 12, 32, C.navy);
text(tb, PAGE_W - 256 - 191, 21, 'SA', 11, '#FFFFFF', 'b');
text(tb, PAGE_W - 256 - 158, 12, 'Super Admin', 13, C.ink, 's');
text(tb, PAGE_W - 256 - 158, 30, 'All branches', 11, C.mute);

/* ── Content ────────────────────────────────────────────── */
const X = 288, CW = PAGE_W - X - 32; // 1120

/* Header: greeting, period switch, branch, new */
text(root, X, 84, 'Good afternoon, Super Admin', 24, C.ink, 'b', { props: { letterSpacing: '-1%' } });
text(root, X, 116, 'Here is how Seventh Sky is doing this month across all ten business areas.', 13.5, C.ink2);
const seg = frame(root, 'Period', X + CW - 520, 88, 300, 36, { fill: '#EEF2F6', cornerRadius: 9 });
[['Month', true], ['Quarter'], ['Year'], ['12 months']].forEach(([l, on], i) => {
  if (on) rect(seg, 3 + i * 74, 3, 72, 30, C.surface, { cornerRadius: 7, stroke: C.line, strokeWeight: 1 });
  text(seg, 3 + i * 74, 12, l, 12.5, on ? C.ink : C.ink2, on ? 's' : 'r', { width: 72, align: 'center' });
});
const br = frame(root, 'Branch', X + CW - 208, 88, 120, 36, { stroke: C.line, strokeWeight: 1, cornerRadius: 9 });
text(br, 14, 11, 'All branches', 12.5, C.ink, 's');
path(br, 'M 100 16 L 104 20 L 108 16', C.ink2, 1.5);
const nb = frame(root, 'New', X + CW - 76, 88, 76, 36, { fill: C.navy, cornerRadius: 9 });
text(nb, 14, 10, '+  New', 13, '#FFFFFF', 's');

/* KPI band — the one bold element */
const band = frame(root, 'KPI band', X, 148, CW, 132, { fill: C.navy, cornerRadius: 14 });
const kpis = [
  { label: 'Revenue invoiced', value: taka(3131500), delta: '+18% vs September', up: true, spark: [12, 18, 15, 22, 30, 41] },
  { label: 'Cash collected', value: taka(2544600), delta: '+9% vs September', up: true, spark: [10, 14, 13, 19, 24, 27] },
  { label: 'New enquiries', value: '97', delta: '+67 vs September', up: true, spark: [3, 6, 9, 14, 30, 97] },
  { label: 'Jobs completed', value: '16', delta: '−7 vs September', up: false, spark: [8, 12, 15, 19, 23, 16] },
];
const kw = CW / 4;
kpis.forEach((k, i) => {
  const kx = i * kw;
  if (i) rect(band, kx, 24, 1, 84, C.navy2);
  text(band, kx + 24, 24, k.label, 12.5, C.bandLabel, 's');
  text(band, kx + 24, 46, k.value, 28, '#FFFFFF', 'b', { props: { letterSpacing: '-2%' } });
  text(band, kx + 24, 88, k.delta, 12, k.up ? C.up : C.down, 's');
  const max = Math.max(...k.spark), sx0 = kx + kw - 104, sw = 80, sh = 22, sy0 = 104;
  const pts = k.spark.map((v, j) => [sx0 + (j * sw) / (k.spark.length - 1), sy0 - (v / max) * sh]);
  path(band, 'M ' + pts.map((p) => p.map((c) => c.toFixed(1)).join(' ')).join(' L '), C.sky, 2);
  const last = pts[pts.length - 1]; ellipse(band, last[0] - 3.5, last[1] - 3.5, 7, C.sky, { stroke: C.navy, strokeWeight: 2 });
});

/* Row 2: revenue by business area (hero chart) + pipeline */
const R2 = 304, R2H = 336, LW = 728, RW = CW - LW - 16;
const rev = panel(root, 'Revenue by business area', X, R2, LW, R2H);
text(rev, 24, 20, 'Revenue by business area', 15, C.ink, 'b');
text(rev, 24, 42, 'Invoiced each month, last six months', 12.5, C.ink2);
const areas = [['Property', C.s1], ['Services', C.s2], ['Interior', C.s3], ['Advisory', C.s4]];
let lx = LW - 24;
[...areas].reverse().forEach(([l, c]) => { const w = l.length * 6.6 + 22; lx -= w; rect(rev, lx, 26, 10, 10, c, { cornerRadius: 3 }); text(rev, lx + 15, 22, l, 12, C.ink2, 's'); });
const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
const revData = [ // thousands BDT per area
  [180, 40, 0, 10], [420, 60, 30, 20], [633, 120, 80, 25], [520, 180, 160, 40], [900, 640, 610, 180], [1240, 820, 760, 310],
];
const cX = 68, cY = 80, cW = LW - cX - 24, cH = 184, yMax = 3500;
[0, 1000, 2000, 3000].forEach((v) => {
  const y = cY + cH - (v / yMax) * cH;
  rect(rev, cX, y, cW, 1, v ? C.grid : C.line);
  text(rev, 8, y - 8, v ? `Tk ${v / 1000}M` : '0', 11, C.mute, 'r', { width: 48, align: 'right' });
});
const slot = cW / months.length, bw = 44;
revData.forEach((m, i) => {
  const bx = cX + i * slot + (slot - bw) / 2;
  let top = cY + cH;
  m.forEach((v, a) => {
    if (!v) return;
    const h = (v / yMax) * cH;
    top -= h;
    const isTop = m.slice(a + 1).every((x) => !x);
    rect(rev, bx, top + (isTop ? 0 : 0), bw, h - 2, areas[a][1], { cornerRadius: isTop ? [4, 4, 0, 0] : 0 });
  });
  text(rev, bx - 10, cY + cH + 10, months[i], 11.5, C.ink2, i === 5 ? 's' : 'r', { width: bw + 20, align: 'center' });
  const total = m.reduce((s, v) => s + v, 0);
  if (i === 5) text(rev, bx - 20, top - 22, short(total * 1000), 12, C.ink, 'b', { width: bw + 40, align: 'center' });
});
text(rev, 24, R2H - 28, 'Property is 40% of October revenue. Services and Interior grew fastest since August.', 12, C.ink2);

const pipe = panel(root, 'Enquiry pipeline', X + LW + 16, R2, RW, R2H);
text(pipe, 24, 20, 'Enquiry pipeline', 15, C.ink, 'b');
text(pipe, 24, 42, 'All business areas, this month', 12.5, C.ink2);
const stages = [['New', 128], ['Contacted', 74], ['Viewing or site visit', 41], ['Offer or quotation', 22], ['Won', 12]];
stages.forEach(([l, v], i) => {
  const y = 84 + i * 46, w = RW - 48, bwid = Math.max(6, (v / 128) * w);
  text(pipe, 24, y, l, 12.5, C.ink2, 's');
  text(pipe, 24, y, String(v), 12.5, C.ink, 'b', { width: w, align: 'right' });
  rect(pipe, 24, y + 20, w, 8, '#EEF2F6', { cornerRadius: 4 });
  rect(pipe, 24, y + 20, bwid, 8, i === 4 ? C.navy : C.s1, { cornerRadius: 4 });
});
text(pipe, 24, R2H - 28, '9.4% of new enquiries were won', 12, C.ink2, 's');

/* Row 3: enquiries trend · occupancy · jobs by service */
const R3 = R2 + R2H + 16, R3H = 268, TW = (CW - 32) / 3;
const enq = panel(root, 'Enquiries', X, R3, TW, R3H);
text(enq, 24, 20, 'Enquiries', 15, C.ink, 'b');
text(enq, 24, 42, 'New each month', 12.5, C.ink2);
const ev = [3, 6, 9, 30, 97, 74]; const eMax = 100, eX = 56, eY = 84, eW = TW - 80, eH = 132;
[0, 50, 100].forEach((v) => { const y = eY + eH - (v / eMax) * eH; rect(enq, eX, y, eW, 1, v ? C.grid : C.line); text(enq, 16, y - 7, String(v), 10.5, C.mute, 'r', { width: 30, align: 'right' }); });
const ep = ev.map((v, i) => [eX + (i * eW) / (ev.length - 1), eY + eH - (v / eMax) * eH]);
path(enq, `M ${ep[0][0]} ${eY + eH} L ` + ep.map((p) => p.join(' ')).join(' L ') + ` L ${ep[5][0]} ${eY + eH} Z`, 'none', 0, { fill: '#2a78d61A', stroke: 'none' });
path(enq, 'M ' + ep.map((p) => p.join(' ')).join(' L '), C.s1, 2);
ep.forEach((p, i) => { if (i === 4 || i === 5) ellipse(enq, p[0] - 4, p[1] - 4, 8, C.s1, { stroke: C.surface, strokeWeight: 2 }); });
text(enq, ep[4][0] - 40, ep[4][1] - 22, '97 in Sep', 11.5, C.ink, 'b', { width: 80, align: 'center' });
months.forEach((m, i) => text(enq, eX + (i * eW) / 5 - 20, eY + eH + 8, m, 11, C.ink2, 'r', { width: 40, align: 'center' }));

const occ = panel(root, 'Occupancy', X + TW + 16, R3, TW, R3H);
text(occ, 24, 20, 'Rental occupancy', 15, C.ink, 'b');
text(occ, 24, 42, 'Let units out of all rental units', 12.5, C.ink2);
text(occ, 24, 66, '48%', 30, C.ink, 'b');
text(occ, 96, 80, '34 of 70 units let', 12, C.ink2);
const occRows = [['Residential', 26, 52], ['Business', 8, 16], ['Commercial', 0, 1], ['Rural', 0, 1]];
occRows.forEach(([l, a, t], i) => {
  const y = 122 + i * 34, w = TW - 48;
  text(occ, 24, y, l, 12, C.ink2, 's');
  text(occ, 24, y, `${a} / ${t}`, 12, C.ink, 's', { width: w, align: 'right' });
  rect(occ, 24, y + 18, w, 8, '#EEF2F6', { cornerRadius: 4 });
  if (a) rect(occ, 24, y + 18, (a / t) * w, 8, C.s1, { cornerRadius: 4 });
});

const jobs = panel(root, 'Jobs by service', X + 2 * (TW + 16), R3, TW, R3H);
text(jobs, 24, 20, 'Jobs by service', 15, C.ink, 'b');
text(jobs, 24, 42, 'Work orders this month', 12.5, C.ink2);
const jl = [['Scheduled', C.seq[0]], ['In progress', C.seq[1]], ['Completed', C.seq[2]]];
let jx = 24; jl.forEach(([l, c]) => { rect(jobs, jx, 68, 10, 10, c, { cornerRadius: 3 }); text(jobs, jx + 15, 64, l, 11.5, C.ink2, 's'); jx += l.length * 6.4 + 30; });
const jr = [['Water Tank', [8, 3, 9]], ['Air Conditioning', [6, 2, 4]], ['Interior Design', [5, 2, 1]], ['Removal', [2, 0, 1]], ['Care & Concierge', [1, 1, 1]], ['Doc Verification', [2, 1, 0]]];
const jMax = 20, jW = TW - 48 - 112;
jr.forEach(([l, vals], i) => {
  const y = 96 + i * 26;
  text(jobs, 24, y, l, 12, C.ink2, 'r', { width: 104 });
  let bx = 24 + 112;
  vals.forEach((v, k) => { if (!v) return; const w = (v / jMax) * jW; rect(jobs, bx, y + 2, w - 2, 14, C.seq[k], { cornerRadius: k === vals.length - 1 || !vals.slice(k + 1).some(Boolean) ? [0, 4, 4, 0] : 0 }); bx += w; });
  text(jobs, bx + 6, y, String(vals.reduce((s, v) => s + v, 0)), 11.5, C.ink, 's');
});

/* Row 4: business lines table + activity */
const R4 = R3 + R3H + 16, R4H = 520;
const tbl = panel(root, 'Business lines', X, R4, LW, R4H);
text(tbl, 24, 20, 'Business lines', 15, C.ink, 'b');
text(tbl, 24, 42, 'This month, sorted by revenue', 12.5, C.ink2);
const cols = [['Line', 24, 200, 'left'], ['Enquiries', 216, 76, 'right'], ['Active', 300, 104, 'right'], ['Revenue', 412, 112, 'right'], ['Trend', 552, 110, 'left']];
rect(tbl, 0, 72, LW, 1, C.line);
cols.forEach(([l, x, w, a]) => text(tbl, x, 82, l, 11.5, C.mute, 's', { width: w, align: a }));
rect(tbl, 0, 106, LW, 1, C.line);
const rows = [
  ['Residential', C.s1, 28, '26 tenancies', 1180000, [4, 6, 8, 7, 11, 12]],
  ['Interior Design', C.s3, 4, '8 jobs', 760000, [0, 1, 2, 4, 8, 9]],
  ['Water Tank Cleaning', C.s2, 18, '20 jobs', 412000, [3, 5, 6, 7, 9, 8]],
  ['Air Conditioning', C.s2, 16, '12 jobs', 286000, [1, 2, 4, 5, 6, 7]],
  ['Business', C.s1, 14, '8 leases', 99500, [2, 2, 3, 2, 4, 3]],
  ['Doc Verification & Transfer', C.s4, 7, '3 cases', 210000, [0, 0, 1, 2, 3, 4]],
  ['Business Registration', C.s4, 3, '2 projects', 100000, [0, 1, 1, 2, 2, 3]],
  ['Removal & Relocation', C.s2, 7, '3 moves', 74000, [0, 1, 1, 1, 2, 2]],
  ['Property Care & Concierge', C.s2, 1, '3 visits', 48000, [0, 0, 1, 1, 1, 2]],
  ['Commercial', C.s1, 1, '0 leases', 0, [0, 0, 0, 0, 0, 0]],
  ['Rural', C.s1, 0, '0 leases', 0, [0, 0, 0, 0, 0, 0]],
];
rows.forEach(([l, c, e, act, r, tr], i) => {
  const y = 118 + i * 34;
  rect(tbl, 24, y + 4, 8, 8, c, { cornerRadius: 2 });
  text(tbl, 40, y, l, 13, C.ink, 's');
  text(tbl, 216, y, String(e), 13, e ? C.ink : C.mute, 'r', { width: 76, align: 'right' });
  text(tbl, 300, y, act, 13, C.ink2, 'r', { width: 104, align: 'right' });
  text(tbl, 412, y, r ? taka(r) : '—', 13, r ? C.ink : C.mute, r ? 's' : 'r', { width: 112, align: 'right' });
  const m = Math.max(1, ...tr), px = 552, pw = 96;
  path(tbl, 'M ' + tr.map((v, j) => `${(px + (j * pw) / 5).toFixed(1)} ${(y + 14 - (v / m) * 12).toFixed(1)}`).join(' L '), tr.some(Boolean) ? C.s1 : C.line, 1.5);
  text(tbl, LW - 44, y - 1, '›', 16, C.mute, 'r');
  if (i < rows.length - 1) rect(tbl, 24, y + 25, LW - 48, 1, C.grid);
});

const act = panel(root, 'Recent activity', X + LW + 16, R4, RW, R4H);
text(act, 24, 20, 'Recent activity', 15, C.ink, 'b');
text(act, 24, 42, 'Across every business line', 12.5, C.ink2);
const feed = [
  ['New enquiry for Flat 4B, Gulshan', 'Residential sale', '12 min ago', C.s1],
  ['Invoice WT-INV-0321 paid, Tk 18,500', 'Water Tank Cleaning', '40 min ago', C.s2],
  ['Site assessment booked for Banani office', 'Air Conditioning', '1 h ago', C.s2],
  ['Lease signed, Shop 12 Motijheel', 'Business rent', '3 h ago', C.s1],
  ['Design approved, RIDW-0014', 'Interior Design', '5 h ago', C.s3],
  ['Title search completed, PDVW-0003', 'Doc Verification', 'Yesterday', C.s4],
];
feed.forEach(([t, s, w, c], i) => {
  const y = 80 + i * 56;
  ellipse(act, 24, y + 5, 8, c);
  if (i < feed.length - 1) rect(act, 27.5, y + 17, 1, 44, C.grid);
  text(act, 44, y, t, 13, C.ink, 's', { width: RW - 68 });
  text(act, 44, y + 20, `${s}, ${w}`, 11.5, C.mute);
});
const due = frame(act, 'Overdue note', 16, R4H - 64, RW - 32, 48, { fill: '#FEF2F2', cornerRadius: 10 });
text(due, 14, 8, '41 invoices overdue, Tk 9,15,800', 12.5, C.danger, 's');
text(due, 14, 26, 'Open the collections list', 11.5, '#991B1B');

process.stdout.write(JSON.stringify(steps));
