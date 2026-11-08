// Generates a FigCraft command script for the six service-line dashboard designs.
// Each business model gets its own layout; every line uses its model's layout.
// Headline counts follow the local copy; monthly series are illustrative, shaped
// on it, and "Tk" stands in for the taka sign (Inter in FigCraft lacks it).
// Run from the repo root:
//   node docs/design/admin-line-dashboards.gen.js > s.json && figcraft-cli run s.json --out docs/design/admin-line-dashboards.figcraft
const K = require('./figcraft-kit');
const { C, steps, add, frame, rect, ellipse, text, tw, icon, logo, badge, panel, legend, legendRight, vbars, pairbars, hbars, linechart, kpiStrip, table, segmented, button } = K;

const BW = 1440, BH = 900, RAIL = 72, CW = BW - RAIL, CH = BH - 64, P = 24, IW = CW - P * 2;
const tk = (v) => 'Tk ' + Math.round(v).toLocaleString('en-IN');
const tkShort = (v) => (v >= 1e7 ? `${(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `${(v / 1e5).toFixed(v >= 1e6 ? 0 : 1)}L` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(Math.round(v)));
const MONTHS6 = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
const MONTHS12 = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];

const COLS = 3, GAP = 100;
const board = add('node.create', { type: 'frame', name: 'Service line dashboards', x: 0, y: 0, width: COLS * BW + (COLS - 1) * GAP + 80, height: 2 * BH + GAP + 150, select: false, props: { fill: C.board } }, 'board');
text(board, 40, 24, 'Service line dashboards: one design per business model', 22, C.ink, 'b');
text(board, 40, 56, 'Headline counts follow the local data; monthly series are illustrative. Compact: 12 to 13.5 px text, 10 px radius, 16 px panel padding.', 14, C.ink2, 'r');

let slot = 0;
const win = (name, lines, accent, consoleIcon, crumbs, current, heading, sub, action) => {
  const x = 40 + (slot % COLS) * (BW + GAP), y = 130 + Math.floor(slot / COLS) * (BH + GAP);
  slot++;
  text(board, x, y - 34, name, 16, C.ink, 'b');
  text(board, x + tw(name, 16, 'b') + 14, y - 32, lines, 13, C.mute, 'r');
  const w = frame(board, 'Window ' + name, x, y, BW, BH, { fill: C.page, cornerRadius: 10, clip: true });
  const sb = frame(w, 'Sidebar', 0, 0, RAIL, BH, { fill: C.rail });
  logo(sb, 18, 20, 36);
  icon(sb, 'arrow-left', 27, 76, 18, C.railMute);
  rect(sb, 16, 104, 40, 40, accent, { cornerRadius: 9 });
  icon(sb, consoleIcon, 26, 114, 20, '#FFFFFF');
  icon(sb, 'search', 27, 160, 18, C.railMute);
  rect(sb, 14, 192, 44, 1, C.railLine);
  rect(sb, 14, 204, 44, 36, C.sky, { cornerRadius: 8, opacity: 0.14 });
  rect(sb, 0, 212, 3, 20, C.sky, { cornerRadius: [0, 3, 3, 0] });
  ['layout-dashboard', 'inbox', 'calendar', 'contact', 'users', 'clipboard-list', 'file-text', 'folder-kanban', 'wrench', 'receipt', 'chart-column'].forEach((ic, i) =>
    icon(sb, ic, 27, 213 + i * 42, 18, i === 0 ? C.sky : C.railMute));
  const tb = frame(w, 'Top bar', RAIL, 0, CW, 64, { stroke: C.line, strokeWeight: 1, strokeAlign: 'inside', strokeSides: [0, 0, 1, 0] });
  text(tb, 32, 12, crumbs, 12, C.mute, 'm');
  text(tb, 32, 30, 'Dashboard', 18, C.ink, 'b');
  text(tb, CW - 470, 13, '1:46 pm', 15, C.ink, 's', { width: 200, align: 'right' });
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
  const pg = frame(w, 'Page', RAIL, 64, CW, CH, { fill: 'none', clip: true });
  text(pg, P, 18, heading, 19, C.ink, 'b');
  text(pg, P, 44, sub, 12.5, C.mute, 'r');
  const bw = tw(action, 12.5, 's') + 44;
  button(pg, CW - P - bw, 20, action, 'primary', 'plus');
  segmented(pg, CW - P - bw - 12, 20, ['Month', 'Quarter', 'Year'], 0);
  return pg;
};
const TOP = 160;                 // panels start under the figures strip
const H = CH - TOP - P;          // height left for panels

/* ── 1. Field service ─────────────────────────────────────── */
{
  const pg = win('Field service', 'Water Tank, Air Conditioning, Removal & Relocation, Property Care & Concierge', '#12B6F3', 'droplets',
    'Operations   /   Water Tank Cleaning', 0, 'Water Tank Cleaning', 'Jobs, providers and service quality across Dhaka', 'New service request');
  kpiStrip(pg, P, 72, IW, [
    ['Jobs completed', '13', '+4 vs Sep', 'up', [3, 5, 4, 6, 9, 13]],
    ['In progress', '3', '8 issued', 'flat', [4, 6, 5, 3, 4, 3]],
    ['On-time rate', '86%', 'target 90%', 'down', [91, 88, 90, 85, 87, 86]],
    ['Revenue invoiced', 'Tk 96,600', '+50%', 'up', [41, 52, 48, 60, 64, 97]],
    ['Open complaints', '6', '9 about quality', 'down', [2, 3, 3, 5, 4, 6]],
  ]);
  const wA = Math.round(IW * 0.62), wB = IW - wA - 16, h1 = 286;
  const a = panel(pg, 'Jobs per week', P, TOP, wA, h1, 'Jobs per week');
  legendRight(a, wA - 16, 16, [['Scheduled', C.seq[0]], ['In progress', C.seq[1]], ['Completed', C.seq[2]]]);
  const wk = ['W31', 'W32', 'W33', 'W34', 'W35', 'W36', 'W37', 'W38', 'W39', 'W40', 'W41', 'W42'];
  const st = [[1, 0, 2], [0, 1, 1], [2, 1, 2], [1, 2, 3], [0, 1, 3], [1, 1, 3], [2, 0, 1], [1, 2, 2], [0, 1, 1], [2, 1, 2], [3, 2, 0], [4, 1, 0]];
  vbars(a, 16, 52, wA - 32, h1 - 86, wk, st.map(([c, p, s]) => [s, p, c].reverse()), [C.seq[2], C.seq[1], C.seq[0]], { max: 8, gap: 0.42 });
  const b = panel(pg, 'On time by provider', P + wA + 16, TOP, wB, h1, 'On time, by provider', 'last 90 days');
  text(b, 16, 46, '86%', 30, C.ink, 'b');
  text(b, 16 + tw('86%', 30, 'b') + 12, 60, 'of jobs finished by their target date', 12, C.mute, 'r');
  rect(b, 16, 92, wB - 32, 8, C.grid, { cornerRadius: 4 });
  rect(b, 16, 92, (wB - 32) * 0.86, 8, C.s1, { cornerRadius: 4 });
  rect(b, 16 + (wB - 32) * 0.9 - 1, 86, 2, 20, C.ink);
  text(b, 16 + (wB - 32) * 0.9 - 40, 108, 'Target 90%', 11, C.ink2, 's', { width: 80, align: 'center' });
  hbars(b, 16, 136, wB - 32, [['Pure Flow Tank Services', 70, '10 jobs'], ['Apex Water Care', 100, '3 jobs'], ['MegaClean Bangladesh', 80, '1 job'], ['Sikder Tank Services', 50, '1 job']], { max: 100, rowH: 34, labelW: 170, fmt: (v) => v + '%', colorFor: (i) => (i === 3 ? C.s2 : C.s1) });
  const y2 = TOP + h1 + 16, h2 = H - h1 - 16;
  const wC = Math.round(IW * 0.5), wD = Math.round((IW - wC - 32) / 2), wE = IW - wC - wD - 32;
  const c = panel(pg, 'Providers', P, y2, wC, h2, 'Providers', 'View all');
  table(c, 16, 44, wC - 32, [['Provider', 0], ['Jobs', 200, 50, 'right'], ['On time', 270, 120], ['Rating', 410, 50, 'right'], ['Payout due', 480, wC - 32 - 480, 'right']], [
    ['Pure Flow Tank Services', '10', { bar: 70 }, '4.4', 'Tk 1,26,000'],
    ['Apex Water Care', '3', { bar: 100 }, '4.8', 'Tk 41,200'],
    ['MegaClean Bangladesh', '1', { bar: 80 }, '4.1', 'Tk 18,400'],
    ['Sikder Tank Services', '1', { bar: 50, color: C.s2 }, '3.6', { t: 'Tk 9,800', tone: C.red, weight: 's' }],
    ['Clear Flow Services', '1', { bar: 100 }, '4.6', 'Tk 0'],
    [{ t: 'Not assigned', tone: C.amber }, '40', { bar: 0 }, '', { t: 'Assign providers', tone: '#0A6C93', weight: 's' }],
  ], { rowH: 34 });
  const d = panel(pg, 'Revenue', P + wC + 16, y2, wD, h2, 'Revenue invoiced');
  vbars(d, 12, 50, wD - 28, h2 - 84, MONTHS6, [41000, 52000, 48000, 64600, 96600, 30200], [C.s1], { fmt: tkShort, highlightLast: true });
  const e = panel(pg, 'Complaints', P + wC + wD + 32, y2, wE, h2, 'Complaints by reason');
  hbars(e, 16, 52, wE - 32, [['Service quality', 9], ['Water discoloration', 1], ['Pressure valve leak', 1], ['Late arrival', 0]], { labelW: 130, valueW: 30, rowH: 30, color: C.s2 });
  text(e, 16, 186, 'Median time to resolve', 12, C.mute, 'm');
  text(e, 16, 204, '31 hours', 19, C.ink, 'b');
  text(e, 16, 234, 'Target 24 hours', 12, C.mute, 'r');
  text(e, 16, h2 - 30, '6 open, 2 past their response time', 12, C.red, 's');
}

/* ── 2. Projects (interior) ───────────────────────────────── */
{
  const pg = win('Projects', 'Residential, Commercial, Fitness Room, Prayer Room Interior, Custom Fit-Out, Furniture & Styling, Space Planning', '#9333EA', 'sofa',
    'Operations   /   Interior Design   /   Residential Interior', 0, 'Residential Interior Design', 'Projects from brief to handover, budgets and milestone payments', 'New project');
  kpiStrip(pg, P, 72, IW, [
    ['Active projects', '17', '+2 this month', 'up', [9, 11, 12, 14, 15, 17]],
    ['Contract value', 'Tk 84.6L', 'across 17', 'flat', [40, 52, 58, 66, 79, 85]],
    ['Collected', 'Tk 31.2L', '37% of value', 'flat', [8, 12, 17, 22, 27, 31]],
    ['Milestones due', '6', 'next 30 days', 'flat', [3, 4, 2, 5, 4, 6]],
    ['Over budget', '2', 'variation orders', 'down', [0, 0, 1, 1, 2, 2]],
  ]);
  const h1 = 124;
  const a = panel(pg, 'By phase', P, TOP, IW, h1, 'Projects by phase', '17 active');
  const phases = [['Brief', 1], ['Concept', 3], ['Design', 4], ['Approval', 3], ['Execution', 5], ['Handover', 1]];
  let px = 16; const pw = IW - 32;
  phases.forEach(([l, v], i) => {
    const w = (pw * v) / 17;
    rect(a, px, 50, w - 3, 26, [C.seq[0], C.seq[0], C.seq[1], C.seq[1], C.seq[2], C.seq[3]][i], { cornerRadius: 5 });
    text(a, px, 84, l, 12, C.ink2, 'm');
    text(a, px, 100, `${v} project${v > 1 ? 's' : ''}`, 11.5, C.mute, 'r');
    px += w;
  });
  const y2 = TOP + h1 + 16, h2 = 300, wA = Math.round(IW * 0.58), wB = IW - wA - 16;
  const b = panel(pg, 'Budget', P, y2, wA, h2, 'Budget against invoiced', 'largest projects');
  legendRight(b, wA - 16, 40, [['Invoiced', C.s1], ['Contract', C.grid]]);
  [['RIDS-P0014  Gulshan duplex, full interior', 1450000, 1160000, 'Execution'], ['RIDS-P0011  Banani apartment, living and kitchen', 980000, 1030000, 'Execution'], ['RIDS-P0009  Dhanmondi 3-bed refresh', 760000, 380000, 'Design'], ['RIDS-P0016  Uttara penthouse', 1240000, 310000, 'Approval'], ['RIDS-P0007  Bashundhara villa, master suite', 640000, 640000, 'Handover']].forEach(([l, cv, inv, ph], i) => {
    const ry = 66 + i * 44, bw = wA - 32 - 170;
    text(b, 16, ry, l, 12, C.ink, 's');
    rect(b, 16, ry + 20, bw, 10, C.grid, { cornerRadius: 3 });
    rect(b, 16, ry + 20, Math.min(bw, (bw * inv) / 1450000), 10, inv > cv ? C.s2 : C.s1, { cornerRadius: 3 });
    rect(b, 16 + (bw * cv) / 1450000 - 1, ry + 16, 2, 18, C.ink);
    text(b, wA - 16 - 150, ry + 7, `${tkShort(inv)} of ${tkShort(cv)}`, 12, inv > cv ? C.red : C.ink2, 's', { width: 150, align: 'right' });
  });
  const c = panel(pg, 'Payments', P + wA + 16, y2, wB, h2, 'Milestone payments');
  legendRight(c, wB - 16, 16, [['Scheduled', C.seq[1]], ['Collected', C.s1]]);
  pairbars(c, 12, 52, wB - 28, h2 - 86, MONTHS6, [420000, 510000, 380000, 620000, 700000, 560000], [400000, 470000, 300000, 560000, 640000, 350000], [C.seq[1], C.s1], { fmt: tkShort });
  const y3 = y2 + h2 + 16, h3 = CH - y3 - P;
  const d = panel(pg, 'Timeline', P, y3, IW, h3, 'Next eight weeks', 'Site visits and milestones');
  const wk = ['2 Nov', '9 Nov', '16 Nov', '23 Nov', '30 Nov', '7 Dec', '14 Dec', '21 Dec'];
  const lx = 260, colW = (IW - 32 - lx) / 8;
  wk.forEach((l, i) => { text(d, 16 + lx + i * colW, 42, l, 11, C.mute, 'm'); rect(d, 16 + lx + i * colW, 58, 1, h3 - 70, C.line2); });
  [['RIDS-P0014  Gulshan duplex', 0, 3, 'Carpentry install'], ['RIDS-P0011  Banani apartment', 1, 2, 'Kitchen fit-out'], ['RIDS-P0016  Uttara penthouse', 2, 4, 'Design approval, then sourcing'], ['RIDS-P0009  Dhanmondi refresh', 4, 3, 'Paint and lighting']].forEach(([l, s, len, what], i) => {
    const ry = 66 + i * 30;
    text(d, 16, ry + 3, l, 12, C.ink, 's');
    rect(d, 16 + lx + s * colW + 2, ry, len * colW - 4, 22, i === 2 ? C.seq[1] : C.s1, { cornerRadius: 5 });
    text(d, 16 + lx + s * colW + 10, ry + 4, what, 11.5, i === 2 ? C.ink : '#FFFFFF', 's');
  });
}

/* ── 3. Cases (advisory & registration) ───────────────────── */
{
  const pg = win('Cases', 'Business Registration, Land & Property Assessment, Loan Support, Documentation & Verification, Will & Succession', '#0D9488', 'briefcase',
    'Operations   /   Business   /   Registration', 0, 'Business Registration', 'Cases from enquiry to certificate, turnaround and what each one waits on', 'New case');
  kpiStrip(pg, P, 72, IW, [
    ['Open cases', '33', '+6 this month', 'up', [18, 21, 24, 26, 27, 33]],
    ['Median turnaround', '21 days', 'target 18', 'down', [26, 24, 23, 22, 22, 21]],
    ['Waiting on client', '12', 'documents due', 'flat', [6, 8, 9, 11, 10, 12]],
    ['Filed with RJSC', '9', 'awaiting approval', 'flat', [3, 4, 6, 7, 8, 9]],
    ['Fees invoiced', 'Tk 4.2L', '+18%', 'up', [2.1, 2.6, 2.9, 3.4, 3.6, 4.2]],
  ]);
  const h1 = 300, wA = Math.round(IW * 0.56), wB = IW - wA - 16;
  const a = panel(pg, 'Stages', P, TOP, wA, h1, 'Cases by stage', '33 open');
  const stages = [['Enquiry', 14], ['Assessment', 11], ['Agreement', 19], ['Documents', 12], ['Filed', 9], ['Certified', 4]];
  const sw = (wA - 32) / stages.length, M = 20, ch = h1 - 120;
  stages.forEach(([l, v], i) => {
    const bh = (ch * v) / M, bx = 16 + i * sw + 10;
    rect(a, bx, 60 + ch - bh, sw - 20, bh, i < 3 ? C.seq[1] : C.s1, { cornerRadius: [4, 4, 0, 0] });
    text(a, bx, 60 + ch - bh - 20, String(v), 13, C.ink, 'b', { width: sw - 20, align: 'center' });
    text(a, bx - 6, 60 + ch + 8, l, 12, C.ink2, 'm', { width: sw - 8, align: 'center' });
  });
  rect(a, 16, 60 + ch, wA - 32, 1, C.line);
  text(a, 16, h1 - 28, 'Agreement is the bottleneck: 19 cases, median 9 days waiting for a signature.', 12, C.ink2, 'm');
  const b = panel(pg, 'Ageing', P + wA + 16, TOP, wB, h1, 'Open cases by age');
  vbars(b, 12, 52, wB - 28, h1 - 86, ['0 to 7 d', '8 to 14 d', '15 to 30 d', '31 to 60 d', 'Over 60 d'], [[6], [5], [8], [11], [3]].map((x) => x[0]), [C.s1], { max: 12, gap: 0.45 });
  const y2 = TOP + h1 + 16, h2 = H - h1 - 16, wC = Math.round(IW * 0.42), wD = IW - wC - 16;
  const c = panel(pg, 'Turnaround', P, y2, wC, h2, 'Turnaround, median days', 'target 18');
  linechart(c, 12, 52, wC - 28, h2 - 86, MONTHS6, [26, 24, 23, 22, 22, 21], { max: 30, target: 18, ticks: 3 });
  const d = panel(pg, 'Waiting on', P + wC + 16, y2, wD, h2, 'Waiting on', '12 cases');
  table(d, 16, 44, wD - 32, [['Case', 0], ['Client', 120], ['Waiting for', 330], ['Days', 560, 40, 'right'], ['', 620, wD - 32 - 620, 'right']], [
    ['BRP-0031', 'Rahman Traders', 'Trade licence copy', '14', { t: 'Client', badge: 'amber' }],
    ['BRP-0027', 'Nahar Foods Ltd', 'Director NID, 2 of 3', '11', { t: 'Client', badge: 'amber' }],
    ['BRP-0024', 'Sky Fashion House', 'Name clearance', '9', { t: 'RJSC', badge: 'blue' }],
    ['BRP-0022', 'Green Agro BD', 'Signed agreement', '9', { t: 'Signature', badge: 'slate' }],
    ['BRP-0019', 'Dhaka Build Co.', 'TIN certificate', '6', { t: 'NBR', badge: 'blue' }],
    ['BRP-0017', 'Lotus Garments', 'Bank solvency letter', '5', { t: 'Client', badge: 'amber' }],
    ['BRP-0015', 'Meghna Logistics', 'Office lease deed', '3', { t: 'Client', badge: 'amber' }],
    ['BRP-0012', 'Padma Tech Ltd', 'Incorporation certificate', '2', { t: 'RJSC', badge: 'blue' }],
  ], { rowH: 34 });
}

/* ── 4. Rentals ───────────────────────────────────────────── */
{
  const pg = win('Rentals', 'Property Management, Commercial Rent, Business Rent, Rural Rent', '#8B5CF6', 'key-round',
    'Operations   /   Residential   /   Property Management', 0, 'Property Management', 'Rent roll, collections, arrears and leases across managed properties', 'Receive payment');
  kpiStrip(pg, P, 72, IW, [
    ['Occupancy', '53%', '33 of 62 units', 'flat', [61, 58, 57, 55, 54, 53]],
    ['Rent roll', 'Tk 11.1L', 'a month', 'flat', [9.8, 10.2, 10.4, 10.9, 11, 11.1]],
    ['Collected', 'Tk 6.7L', '98% of due', 'up', [7.2, 7.8, 8.1, 8.6, 9.2, 6.7]],
    ['Arrears', 'Tk 3.0L', '8 tenants', 'down', [1.2, 1.5, 1.9, 2.2, 2.6, 3.0]],
    ['Leases ending', '5', 'next 60 days', 'flat', [2, 3, 1, 4, 3, 5]],
  ]);
  const h1 = 290, wA = Math.round(IW * 0.64), wB = IW - wA - 16;
  const a = panel(pg, 'Billed vs collected', P, TOP, wA, h1, 'Rent billed and collected');
  legendRight(a, wA - 16, 16, [['Billed', C.seq[1]], ['Collected', C.s1]]);
  pairbars(a, 12, 52, wA - 28, h1 - 86, MONTHS12, [980, 1010, 1020, 1040, 1060, 1080, 1090, 1100, 1100, 1110, 1110, 1110].map((x) => x * 1000), [950, 990, 940, 1000, 1030, 1010, 1060, 1040, 1000, 1080, 1020, 670].map((x) => x * 1000), [C.seq[1], C.s1], { fmt: tkShort });
  const b = panel(pg, 'Occupancy', P + wA + 16, TOP, wB, h1, 'Occupancy by type');
  hbars(b, 16, 50, wB - 32, [['Residential', 25, '25 of 52 let'], ['Business', 8, '8 of 8 let'], ['Commercial', 0, '0 of 1 let'], ['Rural', 0, '0 of 1 let']], { max: 52, rowH: 40, labelW: 100, valueW: 50, fmt: (v) => v });
  text(b, 16, h1 - 44, '18 units under notice, 11 vacant over 30 days', 12, C.ink2, 'm');
  text(b, 16, h1 - 26, 'View vacancies', 12, '#0A6C93', 's');
  const y2 = TOP + h1 + 16, h2 = H - h1 - 16, wC = Math.round(IW * 0.58), wD = IW - wC - 16;
  const c = panel(pg, 'Arrears', P, y2, wC, h2, 'Arrears by age', 'Tk 3.0L across 8 tenants');
  const ag = [['Under 30 days', 82000], ['30 to 60', 96000], ['61 to 90', 70000], ['Over 90', 52000]];
  let ax = 16; const aw = wC - 32;
  ag.forEach(([l, v], i) => { const w = (aw * v) / 300000; rect(c, ax, 46, w - 2, 16, C.warm[i], { cornerRadius: 3 }); ax += w; });
  legend(c, 16, 70, ag.map(([l, v], i) => [`${l}  ${tkShort(v)}`, C.warm[i]]));
  table(c, 16, 96, wC - 32, [['Tenant', 0], ['Property', 200], ['Owed', 400, 90, 'right'], ['Oldest', 510, 80, 'right'], ['', 610, wC - 32 - 610, 'right']], [
    ['Karim Ahmed', 'SSPC-PR-000153, Mirpur', 'Tk 70,000', '74 days', { t: 'Notice sent', badge: 'red' }],
    ['Nusrat Jahan', 'SSPC-PR-000148, Uttara', 'Tk 52,500', '41 days', { t: 'Reminder 2', badge: 'amber' }],
    ['Bright Pharma Ltd', 'Business unit B-2', 'Tk 48,000', '33 days', { t: 'Reminder 1', badge: 'amber' }],
    ['Shahid Ullah', 'SSPC-PR-000131, Mohammadpur', 'Tk 35,000', '28 days', { t: 'Reminder 1', badge: 'amber' }],
    ['Rokeya Begum', 'SSPC-PR-000127, Badda', 'Tk 30,000', '19 days', { t: 'Due', badge: 'slate' }],
  ], { rowH: 34 });
  const d = panel(pg, 'Leases', P + wC + 16, y2, wD, h2, 'Leases ending');
  vbars(d, 12, 50, wD - 28, h2 - 110, ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'], [[2, 1], [1, 2], [0, 3], [1, 1], [0, 2], [0, 1]], [C.s1, C.seq[0]], { max: 4, gap: 0.5 });
  legend(d, 16, h2 - 30, [['Renewal agreed', C.s1], ['Not started', C.seq[0]]]);
}

/* ── 5. Sales ─────────────────────────────────────────────── */
{
  const pg = win('Sales', 'Residential, Commercial, Business and Rural Sale; the four Buyer Services', '#10B981', 'house',
    'Operations   /   Residential   /   Sell', 0, 'Residential Sales', 'Listings, deals and commission from first enquiry to settlement', 'New listing');
  kpiStrip(pg, P, 72, IW, [
    ['Pipeline value', 'Tk 10.3Cr', '96 open deals', 'flat', [6.1, 7, 7.8, 8.6, 9.4, 10.3]],
    ['Settled this year', '39', 'Tk 12.6Cr', 'up', [4, 9, 15, 22, 31, 39]],
    ['Commission earned', 'Tk 25.2L', '2% average', 'up', [3, 7, 11, 15, 20, 25]],
    ['New enquiries', '24', '22 from website', 'up', [8, 10, 12, 15, 19, 24]],
    ['Days on market', '47', 'median', 'up', [62, 58, 55, 51, 49, 47]],
  ]);
  const h1 = 300, wA = Math.round(IW * 0.46), wB = IW - wA - 16;
  const a = panel(pg, 'Pipeline', P, TOP, wA, h1, 'Pipeline by stage', 'count and value');
  hbars(a, 16, 52, wA - 32, [['Lead', 8, 'Tk 54L'], ['Viewing', 6, 'Tk 72L'], ['Offer', 4, 'Tk 58L'], ['Agreed', 1, 'Tk 2.6L'], ['Settlement', 87, 'Tk 9.75Cr']], { rowH: 44, labelW: 100, valueW: 60, max: 87 });
  const b = panel(pg, 'Commission', P + wA + 16, TOP, wB, h1, 'Commission by month', 'settled deals');
  vbars(b, 12, 52, wB - 28, h1 - 86, MONTHS12, [120, 180, 90, 210, 260, 150, 300, 240, 330, 280, 410, 190].map((x) => x * 1000), [C.s1], { fmt: tkShort, highlightLast: true });
  const y2 = TOP + h1 + 16, h2 = H - h1 - 16, wC = Math.round((IW - 32) * 0.3), wD = Math.round((IW - 32) * 0.3), wE = IW - wC - wD - 32;
  const c = panel(pg, 'Sources', P, y2, wC, h2, 'Enquiries by source');
  hbars(c, 16, 52, wC - 32, [['Website', 22], ['Walk-in', 2], ['Referral', 0], ['Portal listing', 0]], { labelW: 110, valueW: 30, rowH: 32 });
  text(c, 16, 196, 'Enquiry to viewing', 12, C.mute, 'm');
  text(c, 16, 214, '38%', 19, C.ink, 'b');
  text(c, 16, 244, 'Viewing to offer  ·  29%', 12, C.ink2, 'm');
  const d = panel(pg, 'Days on market', P + wC + 16, y2, wD, h2, 'Days on market', 'sold listings');
  vbars(d, 12, 52, wD - 28, h2 - 86, ['0 to 30', '31 to 60', '61 to 90', '91 to 120', '120+'], [9, 14, 8, 5, 3], [C.s1], { max: 16, gap: 0.4 });
  const e = panel(pg, 'Agents', P + wC + wD + 32, y2, wE, h2, 'Agents', 'this year');
  table(e, 16, 44, wE - 32, [['Agent', 0], ['Settled', 170, 60, 'right'], ['Value', 250, 90, 'right'], ['Commission', 350, wE - 32 - 350, 'right']], [
    ['Farhana Akter', '14', 'Tk 4.6Cr', 'Tk 9.2L'],
    ['Imran Hossain', '11', 'Tk 3.5Cr', 'Tk 7.0L'],
    ['Tanvir Rahman', '9', 'Tk 2.9Cr', 'Tk 5.8L'],
    ['Sadia Islam', '5', 'Tk 1.6Cr', 'Tk 3.2L'],
    ['Mahmud Karim', '0', 'Tk 0', 'Tk 0'],
  ], { rowH: 34 });
  text(e, 16, h2 - 30, 'Commission is 2% of the sale price on settled deals', 12, C.mute, 'r');
}

/* ── 6. Short stay ────────────────────────────────────────── */
{
  const pg = win('Short stay', 'Short Term Stay', '#F59E0B', 'bed-double',
    'Operations   /   Residential   /   Short Term Stay', 0, 'Short Term Stay', 'Bookings, nights and revenue across serviced apartments', 'New booking');
  kpiStrip(pg, P, 72, IW, [
    ['Occupancy', '64%', 'this month', 'up', [41, 48, 52, 57, 60, 64]],
    ['Nights booked', '38', 'across 6 units', 'up', [14, 19, 22, 27, 31, 38]],
    ['Average nightly rate', 'Tk 6,850', '+4%', 'up', [6.1, 6.3, 6.4, 6.6, 6.6, 6.9]],
    ['Revenue', 'Tk 2.4L', '+22%', 'up', [0.9, 1.2, 1.4, 1.7, 2, 2.4]],
    ['Awaiting agreement', '3', 'bookings', 'flat', [1, 2, 1, 2, 2, 3]],
  ]);
  const h1 = 262;
  const a = panel(pg, 'Calendar', P, TOP, IW, h1, 'Occupancy, next 30 days');
  legendRight(a, IW - 16, 16, [['Booked', C.s1], ['Pending agreement', C.seq[1]], ['Blocked', '#CBD5E1']]);
  const units = ['Gulshan 2, Studio A', 'Gulshan 2, Studio B', 'Banani 1-bed', 'Dhanmondi 2-bed', 'Uttara serviced flat', 'Bashundhara suite'];
  const lw = 170, dw = (IW - 32 - lw) / 30;
  const day = (dd) => { const dt = new Date(2026, 9, 30 + dd); return dd === 0 ? 'Today' : dt.getDate() === 1 ? dt.toLocaleString('en-GB', { month: 'short' }) : String(dt.getDate()); };
  for (let dd = 0; dd < 30; dd++) if (dd % 2 === 0) text(a, 16 + lw + dd * dw - 6, 44, day(dd), 10, dd === 0 ? C.ink : C.mute, dd === 0 ? 's' : 'm', { width: dw + 12, align: 'center' });
  const plan = [[[0, 4, 1], [6, 3, 1], [12, 5, 2], [20, 6, 1]], [[2, 3, 1], [8, 7, 1], [18, 2, 3], [24, 4, 1]], [[0, 9, 1], [14, 3, 2], [21, 5, 1]], [[4, 2, 3], [10, 6, 1], [22, 3, 1]], [[1, 5, 1], [9, 4, 1], [16, 8, 1]], [[5, 3, 2], [13, 2, 1], [26, 4, 3]]];
  units.forEach((u, i) => {
    const ry = 62 + i * 31;
    text(a, 16, ry + 5, u, 12, C.ink2, 'm');
    rect(a, 16 + lw, ry, IW - 32 - lw, 24, C.grid, { cornerRadius: 4 });
    plan[i].forEach(([s, len, kind]) => rect(a, 16 + lw + s * dw + 1, ry + 1, len * dw - 2, 22, kind === 1 ? C.s1 : kind === 2 ? C.seq[1] : '#CBD5E1', { cornerRadius: 4 }));
  });
  const y2 = TOP + h1 + 16, h2 = H - h1 - 16, wA = Math.round(IW * 0.44), wB = Math.round(IW * 0.24), wC = IW - wA - wB - 32;
  const b = panel(pg, 'Revenue', P, y2, wA, h2, 'Revenue by month');
  vbars(b, 12, 52, wA - 28, h2 - 86, MONTHS6, [92000, 118000, 141000, 168000, 197500, 240000], [C.s1], { fmt: tkShort });
  const c = panel(pg, 'Channels', P + wA + 16, y2, wB, h2, 'Bookings by channel');
  hbars(c, 16, 52, wB - 32, [['Direct', 8], ['Website', 2], ['Booking.com', 0], ['Airbnb', 0]], { labelW: 90, valueW: 26, rowH: 32 });
  text(c, 16, 196, 'Average stay', 12, C.mute, 'm');
  text(c, 16, 214, '4.2 nights', 19, C.ink, 'b');
  text(c, 16, 244, 'Booked 11 days ahead on average', 12, C.ink2, 'm');
  const d = panel(pg, 'Today', P + wA + wB + 32, y2, wC, h2, 'Today', 'Fri 30 Oct');
  [['log-in', 'Check-in, 2:00 pm', 'Gulshan 2, Studio A  ·  Mr. Hasan, 3 nights', 'Verified', 'green'], ['log-out', 'Check-out, 11:00 am', 'Banani 1-bed  ·  Ms. Chowdhury', 'Deposit due back', 'amber'], ['sparkles', 'Housekeeping, 12:00 pm', 'Banani 1-bed turnover', 'Assigned', 'slate'], ['file-pen-line', 'Agreement pending', 'Uttara serviced flat  ·  arriving Sun', 'Not signed', 'red']].forEach(([ic, t, s, b_, tone], i) => {
    const ry = 50 + i * 50;
    rect(d, 16, ry, 32, 32, C.slateBg, { cornerRadius: 8 });
    icon(d, ic, 24, ry + 8, 16, C.ink2);
    text(d, 58, ry, t, 12.5, C.ink, 's');
    text(d, 58, ry + 18, s, 11.5, C.mute, 'r');
    badge(d, wC - 16, ry + 6, b_, tone, 'right');
  });
}

process.stdout.write(JSON.stringify(steps));
