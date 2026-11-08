// Generates a FigCraft command script for the HRM screens (plan Task 0.2).
// Twenty-one windows, one or more for every section of the client spec (docs/hrm/requirements-v0.1.txt);
// docs/hrm/requirements-coverage.md maps each requirement to its window.
// People and numbers are sample data; "Tk" stands in for the taka sign.
// Run from the repo root:
//   node docs/design/hrm-screens.gen.js > s.json && figcraft-cli run s.json --out docs/design/hrm-screens.figcraft
const K = require('./figcraft-kit');
const { C, steps, add, frame, rect, ellipse, text, tw, icon, logo, badge, panel, legendRight, vbars, hbars, linechart, kpiStrip, table, segmented, button } = K;

const BW = 1440, BH = 900, SIDE = 264, CW = BW - SIDE, CH = BH - 64, P = 24, IW = CW - P * 2;
const HR = '#0EA5A4';                // HR console accent
const COLS = 3, GAP = 100;
const ROWS = 7;
const board = add('node.create', { type: 'frame', name: 'HRM screens', x: 0, y: 0, width: COLS * BW + (COLS - 1) * GAP + 80, height: ROWS * BH + (ROWS - 1) * GAP + 190, select: false, props: { fill: C.board } }, 'board');
text(board, 40, 24, 'Seventh Sky HRM: organisation, employees and recruitment', 22, C.ink, 'b');
text(board, 40, 56, 'Plan Task 0.2. Sample people and numbers. Same navy shell and compact type as the console dashboards; HR console accent teal. Approval states are shown where the spec requires them.', 14, C.ink2, 'r');

/* ── shared pieces ─────────────────────────────────────────── */

const AV = ['#0EA5A4', '#2A78D6', '#8B5CF6', '#EB6834', '#10B981', '#EDA100', '#E5484D', '#0D1638'];
const initials = (n) => n.split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase();
const avatar = (p, x, y, d, name, k = 0) => {
  ellipse(p, x, y, d, AV[k % AV.length]);
  text(p, x, y + d / 2 - d * 0.19, initials(name), Math.round(d * 0.36), '#FFFFFF', 'b', { width: d, align: 'center' });
};
const chip = (p, x, y, label, on = false) => {
  const w = tw(label, 12, 'm') + 22;
  rect(p, x, y, w, 28, on ? '#E6F6F6' : C.surface, { cornerRadius: 7, stroke: on ? HR : C.line, strokeWeight: 1, strokeAlign: 'inside' });
  text(p, x + 11, y + 7, label, 12, on ? '#0B7C7B' : C.ink2, 'm');
  return w;
};
const select = (p, x, y, w, label, value) => {
  if (label) text(p, x, y, label, 11.5, C.mute, 'm');
  const yy = label ? y + 18 : y;
  rect(p, x, yy, w, 32, C.surface, { cornerRadius: 7, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
  text(p, x + 10, yy + 8, value, 12.5, value.startsWith('All') || value.startsWith('Any') ? C.mute : C.ink, 'r');
  icon(p, 'chevron-down', x + w - 24, yy + 9, 14, C.mute);
};
const field = (p, x, y, w, label, value, { req, ph, h = 34, lock, note } = {}) => {
  text(p, x, y, label + (req ? ' *' : ''), 11.5, C.ink2, 'm');
  rect(p, x, y + 18, w, h, lock ? '#F8FAFC' : C.surface, { cornerRadius: 7, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
  text(p, x + 10, y + 18 + (h - 16) / 2, value || ph || '', 12.5, value ? C.ink : C.mute2, 'r');
  if (lock) icon(p, 'lock', x + w - 24, y + 18 + (h - 14) / 2, 13, C.mute2);
  if (note) text(p, x, y + 18 + h + 4, note, 11, C.mute, 'r');
};
const bw = (label, ic) => tw(label, 12.5, 's') + 24 + (ic ? 20 : 0);
// Lays buttons out right to left so they end at `right`; returns the left edge.
const buttonsRight = (p, right, y, items) => {
  items.slice().reverse().forEach(([label, kind, ic]) => { right -= bw(label, ic); button(p, right, y, label, kind, ic); right -= 10; });
  return right + 10;
};
const kv = (p, x, y, w, k, v, tone) => {
  text(p, x, y, k, 11.5, C.mute, 'r');
  text(p, x, y + 16, v, 12.5, tone || C.ink, 's', { width: w });
};
const tabs = (p, x, y, items, on, w) => {
  rect(p, x, y + 33, w, 1, C.line);
  let tx = x;
  items.forEach((t, i) => {
    const tw_ = tw(t, 13, 's');
    text(p, tx, y + 8, t, 13, i === on ? C.ink : C.mute, i === on ? 's' : 'm');
    if (i === on) rect(p, tx, y + 31, tw_, 2, HR, { cornerRadius: 1 });
    tx += tw_ + 26;
  });
};
const searchBox = (p, x, y, w, ph) => {
  rect(p, x, y, w, 32, C.surface, { cornerRadius: 7, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
  icon(p, 'search', x + 10, y + 9, 14, C.mute);
  text(p, x + 32, y + 8, ph, 12.5, C.mute2, 'r');
};

/* HR console sidebar. `items` groups: [group, [[icon, label, count?]...]] */
const HR_NAV = [
  ['Home', [['layout-dashboard', 'Dashboard'], ['stamp', 'Approvals', '7']]],
  ['Organisation', [['building', 'Company'], ['network', 'Structure'], ['git-fork', 'Org chart'], ['briefcase', 'Positions']]],
  ['People', [['users', 'Employees'], ['user-check', 'My team'], ['clipboard-check', 'Onboarding', '3'], ['folder-open', 'Documents', '6']]],
  ['Time & leave', [['calendar-clock', 'Attendance'], ['calendar-off', 'Leave'], ['clock', 'Shift planner'], ['fingerprint', 'Biometric']]],
  ['Recruitment', [['file-plus', 'Requests'], ['book-open', 'Job descriptions'], ['megaphone', 'Vacancies'], ['kanban', 'Pipeline'], ['archive', 'Talent pool']]],
  ['Insights', [['chart-column', 'Reports']]],
];
const ME_NAV = [
  ['My HR', [['user-round', 'My profile'], ['folder-open', 'My documents'], ['send', 'My requests', '1'], ['book-open', 'Policies']]],
  ['Time & leave', [['clock', 'My attendance'], ['calendar-days', 'My leave'], ['calendar-range', 'My roster']]],
  ['Coming soon', [['graduation-cap', 'Training']]],
];
const sidebar = (w, nav, active, cardTitle, cardSub, who) => {
  const sb = frame(w, 'Sidebar', 0, 0, SIDE, BH, { fill: C.rail });
  logo(sb, 18, 16, 36);
  text(sb, 64, 18, 'Seventh Sky', 15, '#FFFFFF', 'b');
  text(sb, 64, 37, 'Property Care', 11.5, C.railMute, 'r');
  icon(sb, 'panel-left', SIDE - 38, 26, 16, C.railMute);
  icon(sb, 'arrow-left', 22, 80, 15, C.railMute);
  text(sb, 46, 79, 'Main menu', 12.5, C.railMute, 'm');
  rect(sb, 14, 106, SIDE - 28, 50, C.rail2, { cornerRadius: 9, stroke: C.railLine, strokeWeight: 1, strokeAlign: 'inside' });
  rect(sb, 24, 115, 32, 32, HR, { cornerRadius: 8 });
  icon(sb, 'id-card', 31, 122, 18, '#FFFFFF');
  text(sb, 66, 114, cardTitle, 13, '#FFFFFF', 's');
  text(sb, 66, 133, cardSub, 11, C.railMute, 'r');
  rect(sb, 14, 168, SIDE - 28, 34, C.rail2, { cornerRadius: 8, stroke: C.railLine, strokeWeight: 1, strokeAlign: 'inside' });
  icon(sb, 'search', 26, 178, 14, C.railMute);
  text(sb, 48, 177, 'Search people, roles…', 12, C.railMute, 'r');
  text(sb, SIDE - 50, 178, '⌘K', 10.5, C.railMute, 'm');
  let y = 220;
  nav.forEach(([g, items]) => {
    // Groups fold like the console sidebar: Home and the active item's group are open.
    const open = nav === ME_NAV || g === 'Home' || items.some((it) => it[1] === active);
    text(sb, 24, y, g, 11, C.railMute, 's');
    icon(sb, open ? 'chevron-down' : 'chevron-right', SIDE - 42, y - 3, 14, C.railMute);
    if (!open) { y += 30; return; }
    y += 22;
    items.forEach(([ic, label, count]) => {
      const on = label === active;
      if (on) { rect(sb, 12, y - 7, SIDE - 24, 32, '#16285A', { cornerRadius: 8 }); rect(sb, 0, y - 1, 3, 20, C.sky, { cornerRadius: [0, 3, 3, 0] }); }
      icon(sb, ic, 26, y + 1, 16, on ? C.sky : C.railMute);
      text(sb, 52, y, label, 13, on ? '#FFFFFF' : '#C9D1EA', on ? 's' : 'm');
      if (count) { rect(sb, SIDE - 48, y - 1, 24, 18, count === '7' ? C.alert : '#2B3A6E', { cornerRadius: 9 }); text(sb, SIDE - 48, y + 1, count, 10.5, '#FFFFFF', 'b', { width: 24, align: 'center' }); }
      y += 34;
    });
    y += 8;
  });
  rect(sb, 0, BH - 64, SIDE, 1, C.railLine);
  icon(sb, 'building-2', 22, BH - 44, 16, C.railMute);
  text(sb, 48, BH - 48, who[0], 12.5, '#FFFFFF', 's');
  text(sb, 48, BH - 30, who[1], 11, C.railMute, 'r');
};
const topbar = (w, crumbs, title, user = ['Nusrat Jahan', 'HR Manager']) => {
  const tb = frame(w, 'Top bar', SIDE, 0, CW, 64, { stroke: C.line, strokeWeight: 1, strokeAlign: 'inside', strokeSides: [0, 0, 1, 0] });
  text(tb, 32, 12, crumbs, 12, C.mute, 'm');
  text(tb, 32, 30, title, 18, C.ink, 'b');
  text(tb, CW - 500, 13, '2:40 pm', 15, C.ink, 's', { width: 200, align: 'right' });
  text(tb, CW - 500, 34, 'Friday, 30 October 2026', 12, C.mute, 'r', { width: 200, align: 'right' });
  rect(tb, CW - 284, 18, 1, 28, C.line);
  icon(tb, 'bell', CW - 257, 23, 18, C.ink);
  ellipse(tb, CW - 244, 9, 20, C.alert, { stroke: '#FFFFFF', strokeWeight: 2, strokeAlign: 'outside' });
  text(tb, CW - 244, 13, '4', 10, '#FFFFFF', 'b', { width: 20, align: 'center' });
  rect(tb, CW - 212, 18, 1, 28, C.line);
  avatar(tb, CW - 196, 14, 36, user[0], 1);
  text(tb, CW - 150, 14, user[0], 13.5, C.ink, 's');
  text(tb, CW - 150, 33, user[1], 12, C.mute, 'r');
};

let slot = 0;
const win = (name, note, { nav = HR_NAV, active, crumbs, title, card = ['Human Resources', 'People & organisation'], who = ['Head Office', 'Seventh Sky Property Care'], user } = {}) => {
  const x = 40 + (slot % COLS) * (BW + GAP), y = 150 + Math.floor(slot / COLS) * (BH + GAP);
  slot++;
  text(board, x, y - 34, `${slot}. ${name}`, 16, C.ink, 'b');
  text(board, x + tw(`${slot}. ${name}`, 16, 'b') + 14, y - 32, note, 13, C.mute, 'r');
  const w = frame(board, 'Window ' + name, x, y, BW, BH, { fill: C.page, cornerRadius: 10, clip: true });
  sidebar(w, nav, active, card[0], card[1], who);
  topbar(w, crumbs, title, user);
  return frame(w, 'Page', SIDE, 64, CW, CH, { fill: 'none', clip: true });
};
const heading = (pg, h, sub, actions = []) => {
  text(pg, P, 18, h, 19, C.ink, 'b');
  if (sub) text(pg, P, 44, sub, 12.5, C.mute, 'r');
  return buttonsRight(pg, CW - P, 20, actions);
};

/* ── 1. HR dashboard ───────────────────────────────────────── */
{
  const pg = win('HR dashboard: People', 'M2 §15 (all 13 widgets) + today\'s attendance', { active: 'Dashboard', crumbs: 'Human Resources', title: 'Dashboard' });
  const left = heading(pg, 'People overview', 'Seventh Sky Property Care, all branches', [['Add employee', 'primary', 'user-plus']]);
  segmented(pg, left - 12, 20, ['People', 'Organisation', 'Recruitment'], 0);
  kpiStrip(pg, P, 72, IW, [
    ['Employees', '48', '+3', 'up', [39, 41, 42, 44, 45, 48]],
    ['Active', '41', '85%', 'flat', [34, 36, 37, 38, 39, 41]],
    ['On probation', '7', '3 due', 'down', [4, 5, 6, 6, 5, 7]],
    ['New joiners', '3', 'this month', 'flat', [1, 2, 0, 2, 1, 3]],
    ['Present today', '38', 'of 41', 'flat', null],
  ]);
  const TOP = 160, wA = 430, wB = 330, wC = IW - wA - wB - 32, h1 = 300;
  const a = panel(pg, 'Headcount', P, TOP, wA, h1, 'Headcount by department', '48 people');
  hbars(a, 16, 50, wA - 32, [['Water Tank Services', 11], ['Interior Design', 8], ['Removal & Relocation', 6], ['Leasing & Tenancy', 6], ['Finance', 4], ['HR', 3], ['Marketing', 3], ['IT & Admin', 7]], { max: 12, rowH: 29, labelW: 150, valueW: 28 });
  const b = panel(pg, 'Types', P + wA + 16, TOP, wB, h1, 'Employees by type');
  vbars(b, 12, 52, wB - 28, h1 - 86, ['Full', 'Part', 'Contract', 'Field', 'Intern', 'Other'], [26, 4, 6, 8, 2, 2], [C.s1], { max: 30, ticks: 3 });
  const c = panel(pg, 'Needs attention', P + wA + wB + 32, TOP, wC, h1, 'Needs attention');
  [['file-exclamation-point', 'Missing documents', '6 employees', 'red'], ['calendar-clock', 'Documents expiring in 30 days', '5', 'amber'], ['hourglass', 'Probation reviews due', '3 this month', 'amber'], ['file-clock', 'Contracts ending in 60 days', '2', 'amber'], ['user-x', 'Departments with no manager', '2', 'red'], ['file-question-mark', 'Positions without a job description', '4', 'slate']].forEach(([ic, t, s, tone], i) => {
    const ry = 48 + i * 40;
    rect(c, 16, ry, 28, 28, tone === 'red' ? C.redBg : tone === 'amber' ? C.amberBg : C.slateBg, { cornerRadius: 7 });
    icon(c, ic, 22, ry + 6, 16, tone === 'red' ? C.red : tone === 'amber' ? C.amber : C.ink2);
    text(c, 54, ry + 6, t, 12.5, C.ink, 'm');
    text(c, wC - 16 - 140, ry + 6, s, 12, tone === 'red' ? C.red : tone === 'amber' ? C.amber : C.ink2, 's', { width: 140, align: 'right' });
    if (i < 5) rect(c, 16, ry + 35, wC - 32, 1, C.line2);
  });
  const y2 = TOP + h1 + 16, h2 = CH - y2 - P;
  const d = panel(pg, 'Workforce', P, y2, wA, h2, 'Workforce', 'Active employees');
  text(d, 16, 48, 'Gender ratio', 12, C.mute, 'm');
  const gw = wA - 32, gm = Math.round(gw * 31 / 48), gf = Math.round(gw * 16 / 48);
  rect(d, 16, 70, gm - 1, 12, C.s1, { cornerRadius: [4, 0, 0, 4] });
  rect(d, 16 + gm + 1, 70, gf - 2, 12, C.s2);
  rect(d, 16 + gm + gf + 1, 70, gw - gm - gf - 1, 12, C.s3, { cornerRadius: [0, 4, 4, 0] });
  [['Male', '31', C.s1], ['Female', '16', C.s2], ['Other', '1', C.s3]].forEach(([l, v, col], i) => { rect(d, 16 + i * 110, 96, 10, 10, col, { cornerRadius: 2 }); text(d, 32 + i * 110, 92, `${l}  ${v}`, 12, C.ink2, 'm'); });
  rect(d, 16, 126, gw, 1, C.line2);
  text(d, 16, 142, 'Average tenure', 12, C.mute, 'm');
  text(d, 16, 160, '1 yr 7 mo', 19, C.ink, 'b');
  text(d, 150, 142, 'Late today', 12, C.mute, 'm');
  text(d, 150, 160, '3', 19, C.ink, 'b');
  text(d, 284, 142, 'On leave today', 12, C.mute, 'm');
  text(d, 284, 160, '2', 19, C.ink, 'b');
  text(d, 16, 200, 'Attendance comes from the biometric devices and staff check-ins.', 11.5, C.mute, 'r', { width: gw });
  const e = panel(pg, 'Turnover', P + wA + 16, y2, wB, h2, 'Turnover, last 12 months', '% of headcount');
  linechart(e, 12, 52, wB - 28, h2 - 112, ['N', 'D', 'J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O'], [2.1, 1.8, 1.6, 2.0, 2.4, 2.2, 1.9, 1.7, 1.8, 2.3, 2.0, 1.9], { max: 3, ticks: 3, fmt: (v) => v + '%' });
  text(e, 12, h2 - 30, 'Average 2.0% a month, 11 leavers', 11.5, C.mute, 'r');
  const f = panel(pg, 'Joiners', P + wA + wB + 32, y2, wC, h2, 'New joiners this month', 'View all');
  [['Sadia Akter', 'Service Coordinator · Water Tank', '1 Oct'], ['Tanvir Hossain', 'Interior Designer · Interior Design', '12 Oct'], ['Mahfuz Alam', 'Field Technician · Air Conditioning', '27 Oct']].forEach(([n, r, d_], i) => {
    const ry = 50 + i * 52;
    avatar(f, 16, ry, 34, n, i + 2);
    text(f, 60, ry + 1, n, 12.5, C.ink, 's');
    text(f, 60, ry + 18, r, 11.5, C.mute, 'r');
    text(f, wC - 16 - 60, ry + 8, d_, 12, C.ink2, 'm', { width: 60, align: 'right' });
  });
}

/* ── 2. Organisation structure ─────────────────────────────── */
{
  const pg = win('Organisation structure', 'M1 §3–4, §6: tree, detail, change waiting for approval', { active: 'Structure', crumbs: 'Human Resources   /   Organisation', title: 'Structure' });
  heading(pg, 'Organisation structure', 'Company, divisions, departments and teams. Changes to departments and positions go to the HR Manager and CEO.', [['Export', 'secondary', 'download'], ['Add', 'primary', 'plus']]);
  const tW = 360, TOP = 76;
  const t = panel(pg, 'Tree', P, TOP, tW, CH - TOP - P, 'Seventh Sky Private Ltd', '4 divisions');
  searchBox(t, 16, 44, tW - 32, 'Find a division, department or team');
  const tree = [
    [0, 'Seventh Sky Property Care', 'DIV-0001', '41', true],
    [1, 'Water Tank Services', 'DEP-0003', '11', false, true],
    [2, 'Operations Team', 'TEAM-0004', '8'],
    [2, 'Client Service Team', 'TEAM-0005', '3'],
    [1, 'Interior Design', 'DEP-0005', '8'],
    [1, 'Removal & Relocation', 'DEP-0002', '6'],
    [1, 'Leasing & Tenancy', 'DEP-0007', '6'],
    [1, 'Solar & Energy', 'DEP-0011', '0', false, false, 'No manager'],
    [1, 'Finance', 'DEP-0012', '4'],
    [1, 'Marketing', 'DEP-0014', '3', false, false, 'No manager'],
    [0, 'Global Education & Migration', 'DIV-0002', '4'],
    [0, 'Training & Workforce Solutions', 'DIV-0003', '2'],
    [0, 'Café & Lounge', 'DIV-0004', '1'],
  ];
  tree.forEach(([lvl, name, code, hc, open, sel, warn], i) => {
    const ry = 90 + i * 40, ix = 16 + lvl * 18;
    if (sel) rect(t, 8, ry - 6, tW - 16, 36, '#E6F6F6', { cornerRadius: 7 });
    icon(t, lvl === 0 ? (open ? 'chevron-down' : 'chevron-right') : lvl === 1 ? (sel ? 'chevron-down' : 'chevron-right') : 'dot', ix, ry + 3, 14, C.mute);
    icon(t, lvl === 0 ? 'building-2' : lvl === 1 ? 'layers' : 'users', ix + 18, ry + 2, 15, sel ? '#0B7C7B' : C.ink2);
    text(t, ix + 40, ry, name, 12.5, C.ink, lvl === 0 || sel ? 's' : 'm');
    text(t, ix + 40, ry + 16, code + (warn ? '' : ''), 11, C.mute, 'r');
    if (warn) badge(t, ix + 40 + tw(code, 11, 'r') + 8, ry + 13, warn, 'red');
    text(t, tW - 16 - 40, ry + 6, hc, 12, C.ink2, 's', { width: 40, align: 'right' });
  });
  const dx = P + tW + 16, dW = IW - tW - 16;
  const d = frame(pg, 'Detail', dx, TOP, dW, CH - TOP - P, { cornerRadius: 10, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside', clip: true });
  text(d, 20, 18, 'Water Tank Services', 17, C.ink, 'b');
  badge(d, 20 + tw('Water Tank Services', 17, 's') + 4, 21, 'Active', 'green');
  text(d, 20, 44, 'DEP-0003  ·  Department in Seventh Sky Property Care', 12, C.mute, 'r');
  buttonsRight(d, dW - 20, 16, [['Edit details', 'secondary', 'pencil']]);
  rect(d, 20, 76, dW - 40, 48, '#FFFBEB', { cornerRadius: 8, stroke: '#FDE68A', strokeWeight: 1, strokeAlign: 'inside' });
  icon(d, 'clock', 32, 92, 16, C.amber);
  text(d, 56, 84, 'Change waiting for approval: new position "Water Quality Inspector" (HCR-0018)', 12.5, C.ink, 's');
  text(d, 56, 102, 'Approved by HR Manager on 29 Oct · waiting for CEO', 11.5, C.ink2, 'r');
  text(d, dW - 36 - 90, 92, 'View request', 12, '#0B7C7B', 's', { width: 90, align: 'right' });
  const cw = (dW - 40) / 4;
  [['Manager', 'Rafiq Ahmed'], ['Division head', 'Kamal Hossain'], ['Location', 'Cumilla Office'], ['Cost centre', 'CC-0003 Water Tank'], ['Teams', '2'], ['Positions', '6 active'], ['Headcount', '11 of 13'], ['Vacancies', '2 open']].forEach(([k, v], i) => kv(d, 20 + (i % 4) * cw, 140 + Math.floor(i / 4) * 46, cw - 12, k, v, k === 'Vacancies' ? C.amber : undefined));
  text(d, 20, 244, 'Positions', 13.5, C.ink, 's');
  buttonsRight(d, dW - 20, 236, [['New position', 'secondary', 'plus']]);
  table(d, 20, 276, dW - 40, [['Position', 0], ['Code', 220], ['Reports to', 300], ['Grade', 450], ['Filled', 520], ['', 590, dW - 40 - 590, 'right']], [
    [{ t: 'Operations Manager', sub: 'Full-time' }, 'POS-0011', 'Division Head', 'Grade 6', { t: '1 of 1' }, { t: 'Complete', badge: 'green' }],
    [{ t: 'Service Coordinator', sub: 'Full-time' }, 'POS-0012', 'Operations Manager', 'Grade 4', { t: '2 of 3', tone: C.amber, weight: 's' }, { t: '1 vacancy', badge: 'amber' }],
    [{ t: 'Field Technician', sub: 'Field staff' }, 'POS-0013', 'Service Coordinator', 'Grade 2', { t: '6 of 6' }, { t: 'Complete', badge: 'green' }],
    [{ t: 'Client Relationship Officer', sub: 'Full-time' }, 'POS-0014', 'Operations Manager', 'Grade 3', { t: '1 of 2', tone: C.amber, weight: 's' }, { t: '1 vacancy', badge: 'amber' }],
    [{ t: 'Quality Supervisor', sub: 'Full-time' }, 'POS-0015', 'Operations Manager', 'Grade 4', { t: '1 of 1' }, { t: 'No job description', badge: 'red' }],
    [{ t: 'Water Quality Inspector', sub: 'Proposed' }, 'pending', 'Quality Supervisor', 'Grade 3', { t: '—' }, { t: 'Waiting for CEO', badge: 'slate' }],
  ], { rowH: 44 });
}

/* ── 3. Org chart ──────────────────────────────────────────── */
{
  const pg = win('Org chart', 'M1 §5: six filters, vacant seats dashed', { active: 'Org chart', crumbs: 'Human Resources   /   Organisation', title: 'Org chart' });
  heading(pg, 'Organisation chart', 'Seventh Sky Property Care  ·  41 people, 6 vacant seats', [['Download PDF', 'secondary', 'download']]);
  [['Division', 'Property Care'], ['Department', 'All departments'], ['Branch', 'All branches'], ['Position', 'Any position'], ['Manager', 'Any manager'], ['Status', 'Active']].forEach(([l, v], i) => select(pg, P + i * 186, 68, 174, l, v));
  const cv = frame(pg, 'Canvas', P, 136, IW, CH - 136 - P, { cornerRadius: 10, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside', clip: true, fill: '#FBFCFD' });
  const node = (x, y, name, role, dept, k, opts = {}) => {
    const w = 200, h = 70;
    rect(cv, x, y, w, h, opts.vacant ? '#FBFCFD' : C.surface, { cornerRadius: 9, stroke: opts.vacant ? C.mute2 : opts.top ? HR : C.line, strokeWeight: opts.top ? 1.5 : 1, strokeAlign: 'inside', dashes: opts.vacant ? [5, 4] : undefined });
    if (opts.vacant) { rect(cv, x + 12, y + 17, 36, 36, C.slateBg, { cornerRadius: 18 }); icon(cv, 'user-plus', x + 21, y + 26, 18, C.mute); }
    else avatar(cv, x + 12, y + 17, 36, name, k);
    text(cv, x + 58, y + 14, opts.vacant ? 'Vacant' : name, 12.5, opts.vacant ? C.mute : C.ink, 's');
    text(cv, x + 58, y + 32, role, 11.5, C.ink2, 'r');
    text(cv, x + 58, y + 48, dept, 10.5, C.mute, 'r');
    if (opts.count) { rect(cv, x + w - 34, y - 9, 28, 18, C.rail, { cornerRadius: 9 }); text(cv, x + w - 34, y - 7, opts.count, 10.5, '#FFFFFF', 'b', { width: 28, align: 'center' }); }
  };
  const line = (x1, y1, x2, y2) => { if (x1 === x2) rect(cv, x1, Math.min(y1, y2), 1.5, Math.abs(y2 - y1), '#C3CCD8'); else rect(cv, Math.min(x1, x2), y1, Math.abs(x2 - x1), 1.5, '#C3CCD8'); };
  const cx = IW / 2;
  node(cx - 100, 26, 'Abdullah Al Redowan', 'Chief Executive Officer', 'Seventh Sky Private Ltd', 7, { top: true });
  line(cx, 96, cx, 120);
  node(cx - 100, 120, 'Kamal Hossain', 'Division Head', 'Property Care', 1, { count: '41' });
  line(cx, 190, cx, 214);
  const depts = [['Rafiq Ahmed', 'Operations Manager', 'Water Tank Services', '11'], ['Farzana Karim', 'Design Lead', 'Interior Design', '8'], ['Imran Kabir', 'Relocation Manager', 'Removal & Relocation', '6'], ['Shirin Sultana', 'Leasing Manager', 'Leasing & Tenancy', '6'], [null, 'Department Manager', 'Solar & Energy', '0']];
  const gap = (IW - 40 - 5 * 200) / 4;
  const xs = depts.map((_, i) => 20 + i * (200 + gap));
  line(xs[0] + 100, 214, xs[4] + 100, 214);
  depts.forEach(([n, r, d], i) => { line(xs[i] + 100, 214, xs[i] + 100, 236); node(xs[i], 236, n || '', r, d, i + 2, { vacant: !n, count: n ? depts[i][3] : null }); });
  // Under Water Tank: team leads and seats
  const sx = xs[0] + 100;
  line(sx, 306, sx, 336);
  const kids = [['Sadia Akter', 'Service Coordinator'], [null, 'Service Coordinator'], ['Jahid Hasan', 'Quality Supervisor']];
  kids.forEach(([n, r], i) => { const ky = 336 + i * 86; line(sx, ky + 35, sx + 20, ky + 35); node(xs[0] + 115, ky, n || '', r, 'Water Tank Services', i + 4, { vacant: !n }); });
  rect(cv, sx, 336, 1.5, 2 * 86 + 35, '#C3CCD8');
  // Under Interior Design
  const ix = xs[1] + 100;
  line(ix, 306, ix, 336);
  [['Tanvir Hossain', 'Interior Designer'], ['Mitu Rahman', 'Interior Designer']].forEach(([n, r], i) => { const ky = 336 + i * 86; line(ix, ky + 35, ix + 20, ky + 35); node(xs[1] + 115, ky, n, r, 'Interior Design', i + 5); });
  rect(cv, ix, 336, 1.5, 86 + 35, '#C3CCD8');
  text(cv, 20, CH - 136 - P - 36, 'Showing 2 levels below departments. Click a card to expand it, or open the person.', 11.5, C.mute, 'r');
  rect(cv, IW - 128, CH - 136 - P - 48, 108, 32, C.surface, { cornerRadius: 8, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
  icon(cv, 'minus', IW - 118, CH - 136 - P - 40, 15, C.ink2);
  text(cv, IW - 98, CH - 136 - P - 40, '100%', 12, C.ink2, 's', { width: 48, align: 'center' });
  icon(cv, 'plus', IW - 44, CH - 136 - P - 40, 15, C.ink2);
}

/* ── 4. Employees ──────────────────────────────────────────── */
{
  const pg = win('Employees', 'M2 §7: search and filters, saved views', { active: 'Employees', crumbs: 'Human Resources   /   People', title: 'Employees' });
  heading(pg, 'Employees', '48 people across 4 divisions', [['Export', 'secondary', 'download'], ['Add employee', 'primary', 'user-plus']]);
  let cx = P;
  [['All', '48', true], ['Active', '41'], ['On probation', '7'], ['Contract ending', '2'], ['Missing documents', '6'], ['Archived', '3']].forEach(([l, n, on]) => { cx += chip(pg, cx, 68, `${l}  ${n}`, on) + 8; });
  searchBox(pg, P, 108, 260, 'Search by name, ID, phone or skill');
  [['Department', 'All departments', 160], ['Status', 'Any status', 124], ['Type', 'Any type', 116], ['Location', 'All locations', 136], ['Supervisor', 'Any supervisor', 148]].reduce((x, [, v, w]) => { select(pg, x, 108, w, null, v); return x + w + 8; }, P + 268);
  buttonsRight(pg, CW - P, 108, [['More filters', 'secondary', 'sliders-horizontal']]);
  const t = frame(pg, 'Table', P, 152, IW, CH - 152 - P, { cornerRadius: 10, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside', clip: true });
  const rows = [
    ['Ayesha Rahman', 'SSPC-EMP-0001', 'Client Relationship Officer', 'Water Tank Services', 'Rafiq Ahmed', 'Full-time', ['Active', 'green'], '01 Nov 2025', 'Cumilla Office', '8 of 8'],
    ['Sadia Akter', 'SSPC-EMP-0046', 'Service Coordinator', 'Water Tank Services', 'Rafiq Ahmed', 'Full-time', ['Probation', 'amber'], '01 Oct 2026', 'Head Office', '6 of 8'],
    ['Tanvir Hossain', 'SSPC-EMP-0047', 'Interior Designer', 'Interior Design', 'Farzana Karim', 'Full-time', ['Probation', 'amber'], '12 Oct 2026', 'Head Office', '7 of 8'],
    ['Mahfuz Alam', 'SSPC-EMP-0048', 'Field Technician', 'Air Conditioning', 'Jahid Hasan', 'Field staff', ['Onboarding', 'blue'], '27 Oct 2026', 'Field', '3 of 8'],
    ['Imran Kabir', 'SSPC-EMP-0009', 'Relocation Manager', 'Removal & Relocation', 'Kamal Hossain', 'Full-time', ['Confirmed', 'green'], '15 Mar 2025', 'Head Office', '8 of 8'],
    ['Shirin Sultana', 'SSPC-EMP-0011', 'Leasing Manager', 'Leasing & Tenancy', 'Kamal Hossain', 'Full-time', ['Confirmed', 'green'], '02 May 2025', 'Head Office', '8 of 8'],
    ['Rubel Mia', 'SSPC-EMP-0031', 'Field Technician', 'Water Tank Services', 'Sadia Akter', 'Contract', ['Active', 'green'], '10 Jan 2026', 'Field', '5 of 8'],
    ['Nadia Islam', 'SSPC-EMP-0024', 'Accounts Officer', 'Finance', 'Habib Rahman', 'Part-time', ['Active', 'green'], '20 Aug 2025', 'Head Office', '8 of 8'],
    ['Arif Chowdhury', 'SSPC-EMP-0017', 'Digital Marketing Officer', 'Marketing', 'Kamal Hossain', 'Full-time', ['Suspended', 'red'], '05 Jun 2025', 'Head Office', '8 of 8'],
    ['Mitu Rahman', 'SSPC-EMP-0038', 'Interior Designer', 'Interior Design', 'Farzana Karim', 'Intern', ['Active', 'green'], '01 Jul 2026', 'Head Office', '6 of 8'],
  ];
  const X = { pos: 280, sup: 500, type: 640, st: 740, join: 850, loc: 950, docs: IW - 76 };
  const cols = [['Employee', 16, 240], ['Position', X.pos, 200], ['Supervisor', X.sup, 130], ['Type', X.type, 90], ['Status', X.st, 100], ['Joined', X.join, 96], ['Location', X.loc, 100], ['Docs', X.docs, 60, 'right']];
  rect(t, 0, 0, IW, 34, '#F8FAFC');
  rect(t, 0, 33, IW, 1, C.line);
  rect(t, 16, 11, 13, 13, C.surface, { cornerRadius: 3, stroke: C.mute2, strokeWeight: 1, strokeAlign: 'inside' });
  cols.forEach(([l, x, w, al]) => text(t, x + (l === 'Employee' ? 24 : 0), 10, l, 11.5, C.mute, 's', { width: w, align: al || 'left' }));
  rows.forEach((r, i) => {
    const ry = 34 + i * 54;
    if (i === 1) rect(t, 0, ry, IW, 54, '#F7FBFB');
    rect(t, 16, ry + 21, 13, 13, C.surface, { cornerRadius: 3, stroke: C.mute2, strokeWeight: 1, strokeAlign: 'inside' });
    avatar(t, 40, ry + 11, 32, r[0], i);
    text(t, 82, ry + 11, r[0], 12.5, C.ink, 's');
    text(t, 82, ry + 28, r[1], 11, C.mute, 'r');
    text(t, X.pos, ry + 11, r[2], 12.5, C.ink, 'm');
    text(t, X.pos, ry + 28, r[3], 11, C.mute, 'r');
    text(t, X.sup, ry + 19, r[4], 12.5, C.ink2, 'r');
    text(t, X.type, ry + 19, r[5], 12.5, C.ink2, 'r');
    badge(t, X.st, ry + 17, r[6][0], r[6][1]);
    text(t, X.join, ry + 19, r[7], 12.5, C.ink2, 'r');
    text(t, X.loc, ry + 19, r[8], 12.5, C.ink2, 'r');
    const [have, of] = r[9].split(' of ').map(Number);
    text(t, IW - 76, ry + 19, r[9], 12.5, have < of ? C.red : C.ink2, have < of ? 's' : 'r', { width: 60, align: 'right' });
    rect(t, 0, ry + 53, IW, 1, C.line2);
  });
  const fy = 34 + rows.length * 54;
  text(t, 16, fy + 16, 'Showing 1–10 of 48', 12, C.mute, 'r');
  ['‹', '1', '2', '3', '4', '5', '›'].forEach((s, i) => { const bx = IW - 16 - (7 - i) * 34; rect(t, bx, fy + 10, 28, 28, i === 1 ? C.rail : C.surface, { cornerRadius: 6, stroke: i === 1 ? C.rail : C.line, strokeWeight: 1, strokeAlign: 'inside' }); text(t, bx, fy + 16, s, 12, i === 1 ? '#FFFFFF' : C.ink2, 's', { width: 28, align: 'center' }); });
}

/* ── 5. Employee profile ───────────────────────────────────── */
{
  const pg = win('Employee profile', 'M2 §3–6, §10: reporting line, restricted payroll, history', { active: 'Employees', crumbs: 'Human Resources   /   Employees   /   SSPC-EMP-0046', title: 'Sadia Akter' });
  const hd = frame(pg, 'Header', P, 20, IW, 140, { cornerRadius: 10, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
  avatar(hd, 20, 22, 64, 'Sadia Akter', 0);
  text(hd, 100, 22, 'Sadia Akter', 19, C.ink, 'b');
  badge(hd, 100 + tw('Sadia Akter', 19, 'b') + 10, 25, 'Probation', 'amber');
  text(hd, 100, 50, 'Service Coordinator  ·  Water Tank Services  ·  SSPC-EMP-0046', 12.5, C.ink2, 'r');
  text(hd, 100, 70, 'Full-time  ·  Head Office  ·  Joined 1 Oct 2026', 12, C.mute, 'r');
  rect(hd, IW - 20 - 32, 20, 32, 32, C.surface, { cornerRadius: 8, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
  icon(hd, 'ellipsis', IW - 20 - 24, 28, 16, C.ink2);
  buttonsRight(hd, IW - 20 - 32 - 10, 20, [['Edit', 'primary', 'pencil'], ['Change position', 'secondary', 'arrow-right-left']]);
  rect(hd, 20, 98, IW - 40, 1, C.line2);
  text(hd, 20, 112, 'Reports to', 11.5, C.mute, 'm');
  let rx = 100;
  [['Rafiq Ahmed', 'Supervisor'], ['Rafiq Ahmed', 'Department manager'], ['Kamal Hossain', 'Division head'], ['Abdullah Al Redowan', 'CEO']].forEach(([n, r], i) => {
    if (i) { icon(hd, 'chevron-right', rx, 112, 13, C.mute2); rx += 22; }
    text(hd, rx, 111, n, 12, C.ink, 's');
    const nx = rx + tw(n, 12, 's') * 0.92 + 6;
    text(hd, nx, 111, r, 12, C.mute, 'r');
    rx = nx + tw(r, 12, 'r') + 6;
  });
  tabs(pg, P, 168, ['Overview', 'Contact', 'Employment', 'Payroll', 'Documents', 'History'], 0, IW);
  icon(pg, 'lock', P + 320, 179, 12, C.mute2);
  const TOP = 218, lW = Math.round(IW * 0.58), rW = IW - lW - 16;
  const a = panel(pg, 'Employment', P, TOP, lW, 236, 'Employment');
  const cw = (lW - 32) / 3;
  [['Company', 'Seventh Sky Private Ltd'], ['Division', 'Property Care'], ['Department', 'Water Tank Services'], ['Team', 'Operations Team'], ['Position', 'Service Coordinator'], ['Salary grade', 'Grade 4'], ['Work schedule', 'Sun–Thu, 9:00–18:00'], ['Notice period', '30 days'], ['Cost centre', 'CC-0003']].forEach(([k, v], i) => kv(a, 16 + (i % 3) * cw, 48 + Math.floor(i / 3) * 50, cw - 12, k, v));
  const b = panel(pg, 'Probation', P + lW + 16, TOP, rW, 112, 'Probation', 'Review due in 62 days');
  text(b, 16, 46, '1 Oct 2026', 12, C.ink2, 'm');
  text(b, rW - 16 - 100, 46, '31 Dec 2026', 12, C.ink2, 'm', { width: 100, align: 'right' });
  rect(b, 16, 68, rW - 32, 8, C.grid, { cornerRadius: 4 });
  rect(b, 16, 68, (rW - 32) * 0.33, 8, C.s4, { cornerRadius: 4 });
  text(b, 16, 84, '30 of 91 days', 11.5, C.mute, 'r');
  const c = panel(pg, 'Payroll', P + lW + 16, TOP + 124, rW, 112, 'Payroll');
  badge(c, rW - 16, 14, 'HR and Finance only', 'slate', 'right');
  kv(c, 16, 48, 140, 'Basic salary', 'Tk 32,000 / month');
  kv(c, 180, 48, 140, 'Paid to', 'bKash  ·  ••• 4471');
  icon(c, 'lock', rW - 32, 52, 14, C.mute2);
  const y2 = TOP + 236 + 16, h2 = CH - y2 - P;
  const d = panel(pg, 'Documents', P, y2, lW, h2, 'Documents', '6 of 8 on file');
  table(d, 16, 44, lW - 32, [['Document', 0], ['Uploaded', 230], ['Expires', 340], ['Status', 450, lW - 32 - 450, 'right']], [
    ['National ID', '28 Sep 2026', '—', { t: 'Verified', badge: 'green' }],
    ['Employment Agreement', '30 Sep 2026', '—', { t: 'Verified', badge: 'green' }],
    ['Educational Certificates', '28 Sep 2026', '—', { t: 'Waiting for check', badge: 'amber' }],
    ['Police Clearance', '—', '—', { t: 'Missing', badge: 'red' }],
    ['Medical Certificate', '—', '—', { t: 'Missing', badge: 'red' }],
  ], { rowH: 34 });
  const e = panel(pg, 'History', P + lW + 16, y2, rW, h2, 'History', 'Nothing is deleted');
  [['Probation started', 'Status set to Probation', '1 Oct 2026', 'Nusrat Jahan'], ['Supervisor assigned', 'Rafiq Ahmed', '30 Sep 2026', 'HCR-0014 · approved'], ['Employee created', 'From candidate CAN-2026-0021', '30 Sep 2026', 'HCR-0013 · approved']].forEach(([t1, t2, dt, by], i) => {
    const ry = 50 + i * 58;
    ellipse(e, 16, ry + 3, 10, i ? C.mute2 : HR);
    if (i < 2) rect(e, 20.5, ry + 16, 1, 46, C.line);
    text(e, 36, ry, t1, 12.5, C.ink, 's');
    text(e, 36, ry + 17, t2, 11.5, C.ink2, 'r');
    text(e, 36, ry + 33, `${dt}  ·  ${by}`, 11, C.mute, 'r');
  });
}

/* ── 6. Approvals ──────────────────────────────────────────── */
{
  const pg = win('Approvals', 'M1 §6, M2 §9, M3 §5: one inbox, chain timeline, no self-approval', { active: 'Approvals', crumbs: 'Human Resources', title: 'Approvals' });
  heading(pg, 'Approvals', 'Changes that need a decision. Nothing changes until the last approver says yes.');
  let cx = P;
  [['Waiting for me', '4', true], ['I raised', '2'], ['All open', '7'], ['Decided', '58']].forEach(([l, n, on]) => { cx += chip(pg, cx, 72, `${l}  ${n}`, on) + 8; });
  const lW = 470, TOP = 116;
  const l = frame(pg, 'List', P, TOP, lW, CH - TOP - P, { cornerRadius: 10, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside', clip: true });
  [['HCR-0021', 'Salary change', 'Sadia Akter · Tk 32,000 → Tk 36,000', 'HR Manager → CEO', '2 h', 'amber', true],
   ['HCR-0018', 'New position', 'Water Quality Inspector · Water Tank', 'HR Manager ✓ → CEO', '1 d', 'slate'],
   ['VAC-REQ-0007', 'Vacancy request', '2 × Field Technician · Air Conditioning', 'Dept ✓ → HR → Finance → CEO', '1 d', 'blue'],
   ['HCR-0020', 'Bank account change', 'Rubel Mia · new bKash number', 'Finance', '3 h', 'slate'],
   ['HCR-0019', 'Department transfer', 'Mitu Rahman → Space Planning', 'HR Manager', '5 h', 'slate'],
   ['HCR-0017', 'Address update', 'Nadia Islam · self-service', 'HR Manager', '2 d', 'slate'],
  ].forEach(([code, kind, what, chain, age, tone, sel], i) => {
    const ry = i * 84;
    if (sel) { rect(l, 0, ry, lW, 84, '#F2FAFA'); rect(l, 0, ry, 3, 84, HR); }
    text(l, 18, ry + 14, kind, 13, C.ink, 's');
    text(l, 18 + tw(kind, 13, 's') + 8, ry + 15, code, 11.5, C.mute, 'r');
    text(l, lW - 18 - 40, ry + 15, age, 11.5, C.mute, 'r', { width: 40, align: 'right' });
    text(l, 18, ry + 34, what, 12, C.ink2, 'r');
    text(l, 18, ry + 54, chain, 11.5, tone === 'amber' ? C.amber : C.mute, 'm');
    rect(l, 0, ry + 83, lW, 1, C.line2);
  });
  const dx = P + lW + 16, dW = IW - lW - 16;
  const d = frame(pg, 'Detail', dx, TOP, dW, CH - TOP - P, { cornerRadius: 10, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside', clip: true });
  text(d, 20, 18, 'Salary change for Sadia Akter', 16, C.ink, 'b');
  text(d, 20, 42, 'HCR-0021  ·  raised by Nusrat Jahan (HR Manager) today at 12:31 pm', 12, C.mute, 'r');
  rect(d, 20, 72, dW - 40, 110, '#F8FAFC', { cornerRadius: 8 });
  text(d, 36, 84, 'What changes', 11.5, C.mute, 's');
  [['Basic salary', 'Tk 32,000', 'Tk 36,000'], ['Salary grade', 'Grade 4', 'Grade 4'], ['Effective from', '—', '1 Nov 2026']].forEach(([k, a, b], i) => {
    const ry = 106 + i * 24;
    text(d, 36, ry, k, 12.5, C.ink2, 'm');
    text(d, 200, ry, a, 12.5, a === b ? C.ink2 : C.mute, 'r', { props: a === b ? {} : { textDecoration: 'STRIKETHROUGH' } });
    text(d, 300, ry, '→', 12.5, C.mute2, 'r');
    text(d, 324, ry, b, 12.5, a === b ? C.ink2 : C.ink, a === b ? 'r' : 's');
  });
  text(d, 20, 200, 'Reason', 11.5, C.mute, 's');
  text(d, 20, 218, 'Confirmed early after strong first-month review; matches Grade 4 midpoint.', 12.5, C.ink, 'r');
  text(d, 20, 256, 'Approval chain', 13, C.ink, 's');
  [['Requested', 'Nusrat Jahan · HR Manager', 'Today 12:31 pm', 'done'], ['HR Manager review', 'Another HR Manager must approve. You raised this request.', 'Waiting', 'block'], ['CEO approval', 'Abdullah Al Redowan', 'Not yet', 'todo'], ['System updated', 'Salary and history log', '', 'todo']].forEach(([t1, t2, when, st], i) => {
    const ry = 288 + i * 58;
    const col = st === 'done' ? C.green : st === 'block' ? C.amber : C.mute2;
    ellipse(d, 20, ry, 22, st === 'done' ? C.greenBg : st === 'block' ? C.amberBg : C.slateBg);
    icon(d, st === 'done' ? 'check' : st === 'block' ? 'clock' : 'circle', 24, ry + 4, 14, col);
    if (i < 3) rect(d, 30.5, ry + 26, 1, 30, C.line);
    text(d, 56, ry + 1, t1, 12.5, C.ink, 's');
    text(d, 56, ry + 19, t2, 11.5, st === 'block' ? C.amber : C.ink2, st === 'block' ? 'm' : 'r');
    text(d, dW - 20 - 120, ry + 1, when, 11.5, C.mute, 'r', { width: 120, align: 'right' });
  });
  const fy = CH - TOP - P - 70;
  rect(d, 0, fy, dW, 1, C.line);
  rect(d, 20, fy + 18, dW - 40 - 230, 34, C.surface, { cornerRadius: 7, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
  text(d, 32, fy + 27, 'Add a comment for the next approver', 12.5, C.mute2, 'r');
  button(d, dW - 20 - 92, fy + 19, 'Approve', 'primary', 'check');
  button(d, dW - 20 - 92 - 10 - 92, fy + 19, 'Reject', 'secondary', 'x');
}

/* ── 7. Recruitment pipeline ───────────────────────────────── */
{
  const pg = win('Recruitment pipeline', 'M3 §2, §10: board by stage, scores, flags', { active: 'Pipeline', crumbs: 'Human Resources   /   Recruitment', title: 'Pipeline' });
  heading(pg, 'Service Coordinator', 'VAC-2026-0004  ·  Water Tank Services  ·  Head Office  ·  2 positions  ·  closes 15 Nov', [['Share vacancy', 'secondary', 'share-2'], ['Add candidate', 'primary', 'plus']]);
  select(pg, P, 68, 320, null, 'VAC-2026-0004  Service Coordinator');
  let cx = P + 332;
  [['Published on 4 channels', false], ['Priority: High', false], ['23 applicants', false], ['Closed: 3 not selected, 1 declined, 2 in pool', false]].forEach(([l]) => { cx += chip(pg, cx, 70, l) + 8; });
  const cols = [['Applied', 6, 'Received · Under review'], ['Screening', 5, 'Under review'], ['Shortlisted', 4, 'Shortlisted'], ['Interview', 3, 'Scheduled · Completed'], ['Assessment', 2, 'Pending · Completed'], ['Checks', 1, 'Reference check'], ['Offer', 1, 'Pending · Sent · Accepted']];
  const colW = (IW - 6 * 10) / 7, TOP = 116;
  const cards = {
    Applied: [['Rakib Hasan', 'Website', '2 d', null], ['Sumaiya Khan', 'Bdjobs', '2 d', null], ['Faisal Ahmed', 'LinkedIn', '3 d', 'Duplicate?'], ['Tania Sultana', 'Referral', '4 d', null]],
    Screening: [['Masud Rana', 'Bdjobs', '1 d', null, 72], ['Lima Akter', 'Website', '3 d', null, 64], ['Hasib Uddin', 'Facebook', '5 d', null, 58]],
    Shortlisted: [['Nabila Khan', 'Website', '2 d', null, 84], ['Saif Islam', 'LinkedIn', '4 d', null, 79]],
    Interview: [['Rehana Parvin', 'Bdjobs', 'Mon 10:00', 'Panel interview', 81], ['Ovi Rahman', 'Website', 'Tue 15:00', 'Online', 76]],
    Assessment: [['Jannat Ara', 'Referral', '1 d', null, 83]],
    Checks: [['Shakil Ahmed', 'Website', '3 d', '2 checks left', 88]],
    Offer: [['Moumita Das', 'LinkedIn', 'Sent 28 Oct', 'Awaiting reply', 90]],
  };
  cols.forEach(([name, n, sts], i) => {
    const x = P + i * (colW + 10);
    const col = frame(pg, 'Column ' + name, x, TOP, colW, CH - TOP - P, { fill: '#EEF2F6', cornerRadius: 10, clip: true });
    text(col, 12, 12, name, 12.5, C.ink, 's');
    text(col, colW - 12 - 30, 12, String(n), 12, C.mute, 's', { width: 30, align: 'right' });
    text(col, 12, 30, sts, 10.5, C.mute, 'r', { width: colW - 24 });
    (cards[name] || []).forEach(([cn, src, when, flag, score], k) => {
      const cy = 52 + k * 104;
      const cd = frame(col, 'Card', 8, cy, colW - 16, 96, { cornerRadius: 8, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
      avatar(cd, 10, 10, 26, cn, i + k);
      text(cd, 42, 10, cn, 12, C.ink, 's', { width: colW - 16 - 50 });
      text(cd, 42, 26, src, 11, C.mute, 'r');
      if (score) { rect(cd, colW - 16 - 42, 45, 32, 20, score >= 80 ? C.greenBg : C.slateBg, { cornerRadius: 5 }); text(cd, colW - 16 - 42, 48, String(score), 11.5, score >= 80 ? C.green : C.ink2, 'b', { width: 32, align: 'center' }); }
      icon(cd, 'clock', 10, 50, 12, C.mute2);
      text(cd, 26, 49, when, 11, C.ink2, 'r');
      if (flag) badge(cd, 10, 68, flag, flag.startsWith('Duplicate') ? 'red' : flag.includes('left') ? 'amber' : 'blue');
    });
  });
  text(pg, P, CH - P + 4, '', 1, C.mute);
}

/* ── 8. Candidate profile ──────────────────────────────────── */
{
  const pg = win('Candidate', 'M3 §9–15, §20: scorecard, interviews, checks gate, offer, AI suggestions', { active: 'Pipeline', crumbs: 'Recruitment   /   Service Coordinator   /   CAN-2026-0031', title: 'Shakil Ahmed' });
  const hd = frame(pg, 'Header', P, 20, IW, 96, { cornerRadius: 10, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
  avatar(hd, 20, 20, 56, 'Shakil Ahmed', 5);
  text(hd, 92, 20, 'Shakil Ahmed', 19, C.ink, 'b');
  badge(hd, 92 + tw('Shakil Ahmed', 19, 'b') + 10, 23, 'Reference Check', 'blue');
  text(hd, 92, 48, 'Applied for Service Coordinator (VAC-2026-0004) on 12 Oct  ·  via Website  ·  CAN-2026-0031', 12.5, C.ink2, 'r');
  text(hd, 92, 68, '4 years in facilities operations  ·  BBA, University of Dhaka  ·  Expects Tk 38,000  ·  30 days notice', 12, C.mute, 'r');
  rect(hd, IW - 20 - 380, 20, 1, 56, C.line2);
  text(hd, IW - 20 - 360, 22, 'Screening score', 11.5, C.mute, 'm');
  text(hd, IW - 20 - 360, 38, '88', 28, C.ink, 'b');
  text(hd, IW - 20 - 360 + tw('88', 28, 'b') + 2, 52, '/ 100', 12, C.mute, 'r');
  buttonsRight(hd, IW - 20, 32, [['Not selected', 'secondary'], ['Move stage', 'primary', 'arrow-right']]);
  const TOP = 132, w1 = 360, w2 = 420, w3 = IW - w1 - w2 - 32;
  const a = panel(pg, 'Scorecard', P, TOP, w1, 300, 'Screening scorecard', 'weights from spec');
  [['Education', 15, 4], ['Relevant experience', 30, 5], ['Technical skills', 20, 4], ['Communication', 15, 5], ['Cultural fit', 10, 4], ['Certifications', 10, 3]].forEach(([k, wgt, s], i) => {
    const ry = 50 + i * 38;
    text(a, 16, ry, k, 12.5, C.ink, 'm');
    text(a, 16, ry + 17, `${wgt}%`, 11, C.mute, 'r');
    [0, 1, 2, 3, 4].forEach((d) => rect(a, 170 + d * 26, ry + 4, 20, 20, d < s ? C.s1 : C.grid, { cornerRadius: 4 }));
    text(a, w1 - 16 - 40, ry + 6, `${s} / 5`, 12, C.ink2, 's', { width: 40, align: 'right' });
  });
  const b = panel(pg, 'Interviews', P + w1 + 16, TOP, w2, 300, 'Interviews and evaluation');
  [['Phone interview', '15 Oct, 11:00  ·  Nusrat Jahan', 'Recommended', 'green'], ['Panel interview', '21 Oct, 10:00  ·  2 panelists', 'Highly recommended', 'green']].forEach(([t1, t2, rec, tone], i) => {
    const ry = 48 + i * 64;
    rect(b, 16, ry, 32, 32, C.slateBg, { cornerRadius: 8 });
    icon(b, i ? 'users' : 'phone', 24, ry + 8, 16, C.ink2);
    text(b, 58, ry + 1, t1, 12.5, C.ink, 's');
    text(b, 58, ry + 18, t2, 11.5, C.mute, 'r');
    badge(b, w2 - 16, ry + 6, rec, tone, 'right');
  });
  text(b, 16, 186, 'Panel competency average', 11.5, C.mute, 'm');
  hbars(b, 16, 206, w2 - 32, [['Communication', 4.5], ['Problem solving', 4], ['Customer service', 5]], { max: 5, rowH: 26, labelW: 130, valueW: 30, fmt: (v) => v.toFixed(1) });
  const c = panel(pg, 'Checks', P + w1 + w2 + 32, TOP, w3, 300, 'Pre-employment checks');
  [['Reference Checks', 'done'], ['Identity Verification', 'done'], ['Qualification Verification', 'done'], ['Right to Work Verification', 'done'], ['Police Clearance', 'pending'], ['Medical Assessment', 'pending'], ['Professional Licence', 'na']].forEach(([k, st], i) => {
    const ry = 46 + i * 30;
    icon(c, st === 'done' ? 'circle-check' : st === 'pending' ? 'circle-dashed' : 'circle-minus', 16, ry, 16, st === 'done' ? C.green : st === 'pending' ? C.amber : C.mute2);
    text(c, 42, ry, k, 12.5, st === 'na' ? C.mute : C.ink, 'm');
    text(c, w3 - 16 - 100, ry, st === 'done' ? 'Verified' : st === 'pending' ? 'Required' : 'Not needed', 11.5, st === 'pending' ? C.amber : C.mute, st === 'pending' ? 's' : 'r', { width: 100, align: 'right' });
  });
  rect(c, 16, 258, w3 - 32, 30, C.amberBg, { cornerRadius: 7 });
  text(c, 28, 265, 'Offer unlocks when 2 required checks are done.', 11.5, C.amber, 's');
  const y2 = TOP + 316, h2 = CH - y2 - P, wL = Math.round(IW * 0.5);
  const d = panel(pg, 'Offer', P, y2, wL, h2, 'Offer', 'Template: Employment Offer v2');
  [['Position', 'Service Coordinator'], ['Salary', 'Tk 36,000 / month'], ['Employment type', 'Full-time'], ['Probation', '3 months'], ['Start date', '1 Dec 2026'], ['Supervisor', 'Rafiq Ahmed'], ['Work location', 'Head Office']].forEach(([k, v], i) => kv(d, 16 + (i % 4) * ((wL - 32) / 4), 48 + Math.floor(i / 4) * 50, (wL - 32) / 4 - 10, k, v));
  button(d, 16, h2 - 50, 'Preview letter', 'secondary', 'file-text');
  const sx = 16 + bw('Preview letter', 1) + 10, sw = bw('Send for e-acceptance', 1);
  rect(d, sx, h2 - 50, sw, 32, '#B9C1D3', { cornerRadius: 8 });
  icon(d, 'send', sx + 11, h2 - 42, 15, '#FFFFFF');
  text(d, sx + 32, h2 - 42, 'Send for e-acceptance', 12.5, '#FFFFFF', 's');
  text(d, sx + sw + 12, h2 - 42, 'Unlocks after required checks', 11.5, C.mute, 'r');
  const e = frame(pg, 'AI', P + wL + 16, y2, IW - wL - 16, h2, { cornerRadius: 10, stroke: '#C7D2FE', strokeWeight: 1, strokeAlign: 'inside', fill: '#F8F9FF' });
  const eW = IW - wL - 16;
  icon(e, 'sparkles', 16, 15, 16, '#4F46E5');
  text(e, 40, 14, 'Suggestions', 13.5, C.ink, 's');
  badge(e, eW - 16, 13, 'Review before use', 'blue', 'right');
  text(e, 16, 46, 'Skills gap', 11.5, C.mute, 's');
  text(e, 16, 64, 'Strong: scheduling, client calls, vendor follow-up. Missing: water-quality testing certificate (listed as preferred).', 12, C.ink2, 'r', { width: eW - 32 });
  text(e, 16, 110, 'Suggested questions for the final interview', 11.5, C.mute, 's');
  ['How would you reschedule 6 tank cleanings when a provider cancels on the day?', 'Tell us about a client complaint you closed within 24 hours.'].forEach((q, i) => text(e, 16, 130 + i * 22, '•  ' + q, 12, C.ink2, 'r', { width: eW - 32 }));
  button(e, 16, h2 - 50, 'Use questions', 'secondary');
  button(e, 16 + bw('Use questions') + 10, h2 - 50, 'Dismiss', 'secondary');
}

/* ── 9. Careers application (public) ───────────────────────── */
{
  const x = 40 + (slot % COLS) * (BW + GAP), y = 150 + Math.floor(slot / COLS) * (BH + GAP);
  slot++;
  text(board, x, y - 34, `${slot}. Careers application`, 16, C.ink, 'b');
  text(board, x + tw(`${slot}. Careers application`, 16, 'b') + 14, y - 32, 'M3 §8: public page, no login; one form for every vacancy', 13, C.mute, 'r');
  const w = frame(board, 'Window Careers application', x, y, BW, BH, { fill: '#F6F8FA', cornerRadius: 10, clip: true });
  const nb = frame(w, 'Site header', 0, 0, BW, 68, { stroke: C.line, strokeWeight: 1, strokeAlign: 'inside', strokeSides: [0, 0, 1, 0] });
  logo(nb, 120, 16, 36);
  text(nb, 166, 18, 'Seventh Sky', 15, C.ink, 'b');
  text(nb, 166, 37, 'Careers', 11.5, C.mute, 'r');
  ['Open roles', 'Life at Seventh Sky', 'Contact'].forEach((s, i) => text(nb, 900 + i * 140, 25, s, 13, i === 0 ? C.ink : C.ink2, i === 0 ? 's' : 'm'));
  const L = frame(w, 'Role', 120, 96, 400, 760, { cornerRadius: 12, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
  text(L, 24, 24, 'Service Coordinator', 20, C.ink, 'b');
  text(L, 24, 54, 'Water Tank Services  ·  Seventh Sky Property Care', 12.5, C.ink2, 'r');
  [['map-pin', 'Head Office, Dhaka'], ['briefcase', 'Full-time, 3-month probation'], ['banknote', 'Tk 32,000 – 38,000 a month'], ['calendar', 'Apply by 15 November 2026']].forEach(([ic, s], i) => { icon(L, ic, 24, 92 + i * 28, 15, C.mute); text(L, 48, 91 + i * 28, s, 12.5, C.ink2, 'r'); });
  rect(L, 24, 212, 352, 1, C.line2);
  text(L, 24, 230, 'About the role', 13.5, C.ink, 's');
  text(L, 24, 254, 'Plan and track tank cleaning jobs across Dhaka, keep clients informed, and make sure every job is finished on time and to standard.', 12.5, C.ink2, 'r', { width: 352 });
  text(L, 24, 330, 'You will', 13.5, C.ink, 's');
  ['Schedule providers and crews each day', 'Call clients before and after every visit', 'Close complaints within 24 hours', 'Keep job records and photos complete'].forEach((s, i) => text(L, 24, 354 + i * 24, '•  ' + s, 12.5, C.ink2, 'r'));
  text(L, 24, 470, 'You have', 13.5, C.ink, 's');
  ['A bachelor’s degree', '2+ years in operations or customer service', 'Good spoken Bangla and English'].forEach((s, i) => text(L, 24, 494 + i * 24, '•  ' + s, 12.5, C.ink2, 'r'));
  const R = frame(w, 'Form', 544, 96, 776, 760, { cornerRadius: 12, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
  text(R, 28, 24, 'Apply for this role', 18, C.ink, 'b');
  text(R, 28, 50, 'It takes about 5 minutes. Fields marked * are required.', 12.5, C.mute, 'r');
  const fw = (776 - 56 - 16) / 2;
  text(R, 28, 86, 'Personal details', 13.5, C.ink, 's');
  field(R, 28, 110, fw, 'Full name', 'Shakil Ahmed', { req: true });
  field(R, 28 + fw + 16, 110, fw, 'Date of birth', '14 / 03 / 1996', { req: true });
  field(R, 28, 170, fw, 'Mobile', '+880 1711 000000', { req: true });
  field(R, 28 + fw + 16, 170, fw, 'Email', 'shakil.ahmed@mail.com', { req: true });
  field(R, 28, 230, 776 - 56, 'Address', 'House 12, Road 4, Mirpur 10, Dhaka', { req: true });
  text(R, 28, 300, 'Education and work', 13.5, C.ink, 's');
  const f3 = (776 - 56 - 32) / 3;
  field(R, 28, 324, f3, 'Highest qualification', 'BBA', { req: true });
  field(R, 28 + f3 + 16, 324, f3, 'Institution', 'University of Dhaka', { req: true });
  field(R, 28 + 2 * (f3 + 16), 324, f3, 'Graduation year', '2018', { req: true });
  field(R, 28, 384, f3, 'Current employer', 'CleanCo Facilities');
  field(R, 28 + f3 + 16, 384, f3, 'Current position', 'Operations Executive');
  field(R, 28 + 2 * (f3 + 16), 384, f3, 'Years of experience', '4');
  field(R, 28, 444, f3, 'Expected salary', 'Tk 38,000');
  field(R, 28 + f3 + 16, 444, f3, 'Notice period', '30 days');
  text(R, 28, 512, 'Documents', 13.5, C.ink, 's');
  const f4 = (776 - 56 - 36) / 4;
  [['CV', 'shakil-ahmed-cv.pdf', true, true], ['Photograph', 'photo.jpg', true, true], ['National ID', '', true], ['Certificates', ''], ['Cover letter', ''], ['Portfolio', ''], ['Licences', '']].forEach(([k, f, req, done], i) => {
    const bx = 28 + (i % 4) * (f4 + 12), by = 536 + Math.floor(i / 4) * 62;
    rect(R, bx, by, f4, 54, done ? '#F2FAF6' : '#FBFCFD', { cornerRadius: 8, stroke: done ? '#A7E3C4' : C.mute2, strokeWeight: 1, strokeAlign: 'inside', dashes: done ? undefined : [5, 4] });
    icon(R, done ? 'file-check' : 'upload', bx + 12, by + 10, 16, done ? C.green : C.mute);
    text(R, bx + 36, by + 9, k + (req ? ' *' : ''), 12.5, C.ink, 's');
    text(R, bx + 36, by + 28, done ? f : 'PDF or image', 11, done ? C.ink2 : C.mute, 'r', { width: f4 - 44 });
  });
  rect(R, 28, 672, 16, 16, HR, { cornerRadius: 4 });
  icon(R, 'check', 30, 674, 12, '#FFFFFF');
  text(R, 54, 672, 'I confirm the information is true and agree to Seventh Sky keeping my details for future roles.', 12, C.ink2, 'r');
  rect(R, 776 - 28 - 190, 706, 190, 40, C.rail, { cornerRadius: 9 });
  text(R, 776 - 28 - 190, 717, 'Submit application', 13.5, '#FFFFFF', 's', { width: 190, align: 'center' });
  text(R, 28, 718, 'You’ll get an email confirming we received it.', 12, C.mute, 'r');
}

/* ── 10. My profile (self-service) ─────────────────────────── */
{
  const pg = win('My profile', 'M2 §12: employee self-service; changes go to HR', { nav: ME_NAV, active: 'My profile', crumbs: 'My HR', title: 'My profile', card: ['My HR', 'Employee self-service'], who: ['Head Office', 'Seventh Sky Property Care'], user: ['Sadia Akter', 'Service Coordinator'] });
  const hd = frame(pg, 'Header', P, 20, IW, 104, { cornerRadius: 10, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
  avatar(hd, 20, 20, 64, 'Sadia Akter', 0);
  text(hd, 100, 22, 'Sadia Akter', 19, C.ink, 'b');
  text(hd, 100, 50, 'Service Coordinator  ·  Water Tank Services  ·  SSPC-EMP-0046', 12.5, C.ink2, 'r');
  text(hd, 100, 70, 'Reports to Rafiq Ahmed  ·  Probation ends 31 Dec 2026', 12, C.mute, 'r');
  buttonsRight(hd, IW - 20, 22, [['Download ID letter', 'secondary', 'download']]);
  rect(pg, P, 140, IW, 46, '#FFFBEB', { cornerRadius: 8, stroke: '#FDE68A', strokeWeight: 1, strokeAlign: 'inside' });
  icon(pg, 'clock', P + 14, 155, 16, C.amber);
  text(pg, P + 40, 148, 'Your address change is waiting for HR approval', 12.5, C.ink, 's');
  text(pg, P + 40, 166, 'Sent 29 Oct. Your current address stays on file until HR approves it.', 11.5, C.ink2, 'r');
  const TOP = 202, lW = Math.round(IW * 0.56), rW = IW - lW - 16, h = CH - TOP - P;
  const a = panel(pg, 'Contact', P, TOP, lW, h, 'Contact details', 'Changes go to HR for approval');
  const fw = (lW - 48) / 2;
  field(a, 16, 46, lW - 32, 'Present address', 'Flat 5B, Road 7, Dhanmondi, Dhaka 1205', { note: 'Pending: House 22, Road 3, Mohammadpur, Dhaka 1207' });
  field(a, 16, 124, fw, 'Personal mobile', '+880 1812 345678');
  field(a, 32 + fw, 124, fw, 'Personal email', 'sadia.akter@mail.com');
  text(a, 16, 192, 'Emergency contact', 13, C.ink, 's');
  field(a, 16, 216, fw, 'Name', 'Rahela Begum');
  field(a, 32 + fw, 216, fw, 'Relationship', 'Mother');
  field(a, 16, 276, fw, 'Phone', '+880 1911 222333');
  field(a, 32 + fw, 276, fw, 'National ID', '•••• •••• 4521', { lock: true, note: 'Ask HR to change this' });
  buttonsRight(a, lW - 16, h - 52, [['Cancel', 'secondary'], ['Send to HR', 'primary', 'send']]);
  const b = panel(pg, 'Docs', P + lW + 16, TOP, rW, 262, 'My documents', '6 of 8');
  [['Employment Agreement', 'Verified', 'green'], ['National ID', 'Verified', 'green'], ['Educational Certificates', 'Being checked', 'amber'], ['Police Clearance', 'Please upload', 'red'], ['Medical Certificate', 'Please upload', 'red']].forEach(([k, s, tone], i) => {
    const ry = 46 + i * 40;
    icon(b, 'file-text', 16, ry + 2, 15, C.ink2);
    text(b, 40, ry + 1, k, 12.5, C.ink, 'm');
    if (tone === 'red') { buttonsRight(b, rW - 16, ry - 6, [['Upload', 'secondary', 'upload']]); }
    else badge(b, rW - 16, ry, s, tone, 'right');
    if (i < 4) rect(b, 16, ry + 30, rW - 32, 1, C.line2);
  });
  const c = panel(pg, 'Quick', P + lW + 16, TOP + 278, rW, h - 278, 'Quick links');
  [['calendar-days', 'My leave', '12 days left'], ['clock', 'My attendance', 'In at 9:02 today'], ['calendar-range', 'My roster', 'Day shift, Sun–Thu'], ['file-down', 'My letters', 'Approved leave letters'], ['book-open', 'Policies', 'Leave, conduct, IT use'], ['graduation-cap', 'Training', 'Coming soon']].forEach(([ic, t, s], i) => {
    const bx = 16 + (i % 2) * ((rW - 40) / 2 + 8), by = 46 + Math.floor(i / 2) * 62;
    const soon = s === 'Coming soon';
    rect(c, bx, by, (rW - 40) / 2, 54, soon ? '#FAFBFC' : C.surface, { cornerRadius: 8, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
    icon(c, ic, bx + 12, by + 18, 16, soon ? C.mute2 : HR);
    text(c, bx + 38, by + 10, t, 12.5, soon ? C.mute : C.ink, 's');
    text(c, bx + 38, by + 28, s, 11, C.mute, 'r');
  });
}


/* ── shared for the windows below ───────────────────────────── */
const box = (p, x, y, on) => {
  rect(p, x, y, 16, 16, on ? HR : C.surface, { cornerRadius: 4, stroke: on ? HR : C.mute2, strokeWeight: 1, strokeAlign: 'inside' });
  if (on) icon(p, 'check', x + 2, y + 2, 12, '#FFFFFF');
};
const banner = (p, x, y, w, title, sub, tone = 'amber') => {
  const bg = tone === 'amber' ? '#FFFBEB' : tone === 'red' ? C.redBg : tone === 'green' ? C.greenBg : C.blueBg;
  const ln = tone === 'amber' ? '#FDE68A' : tone === 'red' ? '#FECACA' : tone === 'green' ? '#A7E3C4' : '#BFDBFE';
  const fg = tone === 'amber' ? C.amber : tone === 'red' ? C.red : tone === 'green' ? C.green : C.blue;
  rect(p, x, y, w, sub ? 48 : 36, bg, { cornerRadius: 8, stroke: ln, strokeWeight: 1, strokeAlign: 'inside' });
  icon(p, tone === 'green' ? 'circle-check' : tone === 'red' ? 'circle-alert' : tone === 'blue' ? 'info' : 'clock', x + 12, y + (sub ? 16 : 10), 16, fg);
  text(p, x + 38, y + (sub ? 8 : 10), title, 12.5, C.ink, 's', { width: w - 50 });
  if (sub) text(p, x + 38, y + 26, sub, 11.5, C.ink2, 'r', { width: w - 50 });
};
const steps_ = (p, x, y, w, items, gap = 54) => items.forEach(([t1, t2, when, st], i) => {
  const ry = y + i * gap;
  const col = st === 'done' ? C.green : st === 'now' ? C.amber : C.mute2;
  ellipse(p, x, ry, 22, st === 'done' ? C.greenBg : st === 'now' ? C.amberBg : C.slateBg);
  icon(p, st === 'done' ? 'check' : st === 'now' ? 'clock' : 'circle', x + 4, ry + 4, 14, col);
  if (i < items.length - 1) rect(p, x + 10.5, ry + 26, 1, gap - 28, C.line);
  text(p, x + 36, ry + 1, t1, 12.5, C.ink, 's');
  if (t2) text(p, x + 36, ry + 18, t2, 11.5, C.ink2, 'r', { width: w - 36 - 130 });
  if (when) text(p, x + w - 120, ry + 1, when, 11.5, C.mute, 'r', { width: 120, align: 'right' });
});

/* ── 11. HR dashboard: Organisation tab ─────────────────────── */
{
  const pg = win('HR dashboard: Organisation', 'M1 §12 (all 9 widgets), §9 alerts and change history', { active: 'Dashboard', crumbs: 'Human Resources', title: 'Dashboard' });
  const left = heading(pg, 'Organisation overview', 'Seventh Sky Private Ltd, all divisions', [['Open structure', 'secondary', 'network']]);
  segmented(pg, left - 12, 20, ['People', 'Organisation', 'Recruitment'], 1);
  kpiStrip(pg, P, 72, IW, [
    ['Divisions', '4', null, 'flat', null],
    ['Departments', '14', '1 inactive', 'flat', null],
    ['Active positions', '63', null, 'flat', [55, 57, 58, 60, 61, 63]],
    ['Vacant positions', '6', '2 critical', 'down', [3, 4, 4, 5, 5, 6]],
    ['New this month', '2', 'positions', 'flat', null],
  ]);
  const TOP = 160, wA = 560, wB = IW - wA - 16, h1 = 330;
  const a = panel(pg, 'Headcount', P, TOP, wA, h1, 'Headcount by department', '48 people, 6 vacant seats');
  hbars(a, 16, 50, wA - 32, [['Water Tank Services', 11], ['Interior Design', 8], ['Removal & Relocation', 6], ['Leasing & Tenancy', 6], ['Finance', 4], ['HR', 3], ['Marketing', 3], ['IT & Admin', 7], ['Solar & Energy', 0]], { max: 12, rowH: 29, labelW: 170, valueW: 28 });
  const b = panel(pg, 'Alerts', P + wA + 16, TOP, wB, h1, 'Needs attention', 'HR is alerted automatically');
  [['user-x', 'Departments without a manager', 'Solar & Energy, Marketing', '2', 'red'], ['git-fork', 'Positions without a supervisor', 'Quality Supervisor', '1', 'red'], ['file-question-mark', 'Positions without a job description', 'Field Supervisor, 3 more', '4', 'amber'], ['circle-pause', 'Inactive departments', 'Event Services', '1', 'slate'], ['briefcase', 'Vacant positions', '2 critical, 3 high, 1 normal', '6', 'amber']].forEach(([ic, t, s, n, tone], i) => {
    const ry = 48 + i * 54;
    rect(b, 16, ry, 32, 32, tone === 'red' ? C.redBg : tone === 'amber' ? C.amberBg : C.slateBg, { cornerRadius: 8 });
    icon(b, ic, 24, ry + 8, 16, tone === 'red' ? C.red : tone === 'amber' ? C.amber : C.ink2);
    text(b, 60, ry + 1, t, 12.5, C.ink, 's');
    text(b, 60, ry + 18, s, 11.5, C.mute, 'r');
    text(b, wB - 16 - 40, ry + 7, n, 15, tone === 'red' ? C.red : tone === 'amber' ? C.amber : C.ink2, 'b', { width: 40, align: 'right' });
    if (i < 4) rect(b, 16, ry + 44, wB - 32, 1, C.line2);
  });
  const y2 = TOP + h1 + 16, h2 = CH - y2 - P, wC = 420;
  const c = panel(pg, 'Divisions', P, y2, wC, h2, 'Headcount by division');
  vbars(c, 12, 52, wC - 28, h2 - 90, ['Property Care', 'Education', 'Workforce', 'Café'], [41, 4, 2, 1], [C.s1], { max: 45, ticks: 3 });
  const d = panel(pg, 'Changes', P + wC + 16, y2, IW - wC - 16, h2, 'Recent structure changes', 'History log');
  table(d, 16, 44, IW - wC - 48, [['Change', 0], ['By', 340], ['Approved', 470], ['Managers', 580, IW - wC - 48 - 580, 'right']], [
    [{ t: 'New position: Water Quality Inspector', sub: 'HCR-0018 · Water Tank Services' }, 'Nusrat Jahan', 'Waiting for CEO', { t: 'Pending', badge: 'slate' }],
    [{ t: 'Reporting line change: Field Technician', sub: 'HCR-0016 · now Quality Supervisor, 6 updated' }, 'Nusrat Jahan', '27 Oct, CEO', { t: '2 notified', badge: 'green' }],
    [{ t: 'Department restructure: Solar split from AC', sub: 'HCR-0012 · DEP-0011 created' }, 'Nusrat Jahan', '14 Oct, CEO', { t: '3 notified', badge: 'green' }],
    [{ t: 'Salary grade 4 range updated', sub: 'HCR-0010' }, 'Habib Rahman', '2 Oct, CEO', { t: '—', badge: 'slate' }],
  ], { rowH: 46 });
}

/* ── 12. HR dashboard: Recruitment tab ──────────────────────── */
{
  const pg = win('HR dashboard: Recruitment', 'M3 §19 (all 11 widgets)', { active: 'Dashboard', crumbs: 'Human Resources', title: 'Dashboard' });
  const left = heading(pg, 'Recruitment overview', 'All open vacancies, last 90 days', [['New request', 'primary', 'file-plus']]);
  segmented(pg, left - 12, 20, ['People', 'Organisation', 'Recruitment'], 2);
  kpiStrip(pg, P, 72, IW, [
    ['Open vacancies', '5', '2 critical', 'down', null],
    ['Applications', '64', '+18', 'up', [20, 28, 35, 44, 52, 64]],
    ['Shortlisted', '18', null, 'flat', null],
    ['Interviews', '6', 'scheduled', 'flat', null],
    ['Offers pending', '2', null, 'flat', null],
    ['Offers accepted', '2', '67%', 'up', null],
  ]);
  const TOP = 160, w1 = 360, w2 = 360, w3 = IW - w1 - w2 - 32, h1 = 300;
  const a = panel(pg, 'Funnel', P, TOP, w1, h1, 'Pipeline', 'this quarter');
  hbars(a, 16, 50, w1 - 32, [['Applications', 64], ['Shortlisted', 18], ['Interviewed', 9], ['Offers sent', 3], ['Accepted', 2], ['Vacancies filled', 3]], { max: 64, rowH: 34, labelW: 120, valueW: 28 });
  const b = panel(pg, 'Sources', P + w1 + 16, TOP, w2, h1, 'Candidate sources');
  hbars(b, 16, 50, w2 - 32, [['Website', 21], ['Bdjobs', 17], ['LinkedIn', 11], ['Facebook', 8], ['Referral', 5], ['Email campaign', 2]], { max: 22, rowH: 34, labelW: 120, valueW: 28 });
  const c = panel(pg, 'Numbers', P + w1 + w2 + 32, TOP, w3, h1, 'Time and cost');
  [['Average time to hire', '24 days', 'from application to offer accepted'], ['Recruitment cost', 'Tk 46,500', 'this quarter, Tk 15,500 per hire'], ['Vacancies filled', '3', 'this quarter'], ['Talent pool', '31', 'people kept for future roles']].forEach(([k, v, s], i) => {
    const ry = 48 + i * 60;
    text(c, 16, ry, k, 12, C.mute, 'm');
    text(c, 16, ry + 18, v, 19, C.ink, 'b');
    text(c, 16 + tw(v, 19, 'b') + 10, ry + 24, s, 11.5, C.mute, 'r');
  });
  const y2 = TOP + h1 + 16, h2 = CH - y2 - P;
  const d = panel(pg, 'Vacancies', P, y2, IW, h2, 'Open vacancies', 'Vacancy age counts from publishing');
  table(d, 16, 44, IW - 32, [['Vacancy', 0], ['Department', 300], ['Priority', 480], ['Applicants', 580], ['Stage', 690], ['Age', 900], ['', 980, IW - 32 - 980, 'right']], [
    [{ t: 'Service Coordinator', sub: 'VAC-2026-0004 · 2 positions' }, 'Water Tank Services', { t: 'High', badge: 'amber' }, '23', 'Checks and offer', '26 days', { t: 'Open', badge: 'green' }],
    [{ t: 'Field Technician', sub: 'VAC-2026-0006 · 2 positions' }, 'Air Conditioning', { t: 'Critical', badge: 'red' }, '17', 'Interviews', '12 days', { t: 'Open', badge: 'green' }],
    [{ t: 'Solar Project Coordinator', sub: 'VAC-2026-0007' }, 'Solar & Energy', { t: 'Critical', badge: 'red' }, '9', 'Screening', '8 days', { t: 'Open', badge: 'green' }],
    [{ t: 'Digital Marketing Officer', sub: 'VAC-2026-0005' }, 'Marketing', { t: 'Normal', badge: 'slate' }, '15', 'Shortlisting', '19 days', { t: 'Open', badge: 'green' }],
  ], { rowH: 44 });
}

/* ── 13. Company profile and divisions ──────────────────────── */
{
  const pg = win('Company and divisions', 'M1 §4.1 company profile, §4.2 divisions, §13 up to 10 trading businesses', { active: 'Company', crumbs: 'Human Resources   /   Organisation', title: 'Company' });
  const left = heading(pg, 'Seventh Sky Private Ltd', 'Company 1 of 1  ·  up to 10 trading businesses', [['Add company', 'secondary', 'plus'], ['Edit profile', 'primary', 'pencil']]);
  const TOP = 76, lW = 420, rW = IW - lW - 16;
  const a = panel(pg, 'Profile', P, TOP, lW, 440, 'Company profile');
  rect(a, 16, 46, 56, 56, C.rail, { cornerRadius: 10 });
  logo(a, 26, 56, 36);
  text(a, 86, 52, 'Seventh Sky Private Ltd', 14, C.ink, 's');
  text(a, 86, 72, 'Trading as Seventh Sky Property Care', 12, C.mute, 'r');
  const hw = (lW - 32) / 2;
  [['Registration no.', 'C-178245/2024'], ['TIN', '4561 2378 9012'], ['BIN', '004512378-0101'], ['Phone', '+880 1700 777777']].forEach(([k, v], i) => kv(a, 16 + (i % 2) * hw, 120 + Math.floor(i / 2) * 48, hw - 10, k, v));
  kv(a, 16, 216, lW - 32, 'Email', 'info@seventhskyproperty.com');
  kv(a, 16, 264, lW - 32, 'Address', 'House 42, Road 11, Banani, Dhaka 1213');
  text(a, 16, 318, 'Branches', 11.5, C.mute, 'r');
  let bx = 16;
  ['Head Office, Dhaka', 'Cumilla Office', 'Field'].forEach((s) => { bx += chip(a, bx, 338, s) + 6; });
  text(a, 16, 388, 'Logo, divisions, branches and policies are all edited here.', 11.5, C.mute, 'r', { width: lW - 32 });
  const b = panel(pg, 'Divisions', P + lW + 16, TOP, rW, 440, 'Divisions');
  buttonsRight(b, rW - 16, 8, [['Add division', 'secondary', 'plus']]);
  table(b, 16, 44, rW - 32, [['Division', 0], ['Code', 250], ['Head', 340], ['Business function', 470], ['Status', 600, rW - 32 - 600, 'right']], [
    [{ t: 'Seventh Sky Property Care', sub: 'seventhskypropertycare.com' }, 'DIV-0001', 'Kamal Hossain', 'Property services', { t: 'Active', badge: 'green' }],
    [{ t: 'Global Education & Migration', sub: 'seventhskyeducationandmigration.com' }, 'DIV-0002', 'Farhana Yasmin', 'Education, visas', { t: 'Active', badge: 'green' }],
    [{ t: 'Training & Workforce Solutions', sub: 'seventhskyworkforcesolutions.com' }, 'DIV-0003', 'Mizanur Rahman', 'Training, staffing', { t: 'Active', badge: 'green' }],
    [{ t: 'Café & Lounge', sub: 'seventhskycafe.com' }, 'DIV-0004', { t: 'No head', tone: C.red, weight: 's' }, 'Hospitality', { t: 'Active', badge: 'green' }],
  ], { rowH: 52 });
  text(b, 16, 300, 'Deactivating a division is refused while it still has active departments or employees.', 11.5, C.mute, 'r', { width: rW - 32 });
  const y2 = TOP + 456, h2 = CH - y2 - P, wP = 520;
  const c = panel(pg, 'Policies', P, y2, wP, h2, 'Company policies', 'Employees see these in self-service');
  [['Leave policy', 'v3 · 1 Oct 2026', '46 of 48 acknowledged'], ['Code of conduct', 'v2 · 1 Jan 2026', '48 of 48'], ['IT and data use', 'v1 · 1 Jan 2026', '44 of 48'], ['Health and safety (field)', 'v2 · 12 Jun 2026', '18 of 19 field staff']].forEach(([t, v, s], i) => {
    const ry = 46 + i * 50;
    icon(c, 'file-text', 16, ry + 4, 16, C.ink2);
    text(c, 42, ry + 1, t, 12.5, C.ink, 's');
    text(c, 42, ry + 18, v, 11.5, C.mute, 'r');
    text(c, wP - 16 - 180, ry + 8, s, 11.5, s.startsWith('48') ? C.green : C.amber, 's', { width: 180, align: 'right' });
  });
  const d = panel(pg, 'CostCentres', P + wP + 16, y2, IW - wP - 16, h2, 'Cost centres and salary grades', 'Finance sees these');
  const dw = IW - wP - 48;
  // The grades table goes first: each table's header band starts at x 0 and would cover the other's.
  table(d, 16 + dw / 2 + 8, 44, dw / 2 - 8, [['Grade', 0], ['Range (Tk / month)', 80]], [['Grade 2', '18,000 – 25,000'], ['Grade 3', '24,000 – 32,000'], ['Grade 4', '30,000 – 40,000'], ['Grade 6', '55,000 – 80,000']], { rowH: 34 });
  table(d, 16, 44, dw / 2 - 8, [['Cost centre', 0], ['Departments', 170]], [['CC-0001 Head Office', '5'], ['CC-0003 Water Tank', '1'], ['CC-0005 Interior', '1'], ['CC-0009 Field Ops', '3']], { rowH: 34 });
}

/* ── 14. Position and job description ───────────────────────── */
{
  const pg = win('Position and job description', 'M1 §4.4 position fields, M3 §6 job description library (clone and edit)', { active: 'Positions', crumbs: 'Human Resources   /   Positions   /   POS-0012', title: 'Service Coordinator' });
  heading(pg, 'Service Coordinator', 'POS-0012  ·  Water Tank Services  ·  2 of 3 filled', [['Clone', 'secondary', 'copy'], ['Edit', 'primary', 'pencil']]);
  const TOP = 76, lW = 400, rW = IW - lW - 16;
  const a = panel(pg, 'Position', P, TOP, lW, CH - TOP - P, 'Position');
  badge(a, lW - 16, 13, 'Active', 'green', 'right');
  [['Position title', 'Service Coordinator'], ['Position code', 'POS-0012 (automatic)'], ['Department', 'Water Tank Services'], ['Reports to', 'Operations Manager (POS-0011)'], ['Employment type', 'Full-time'], ['Salary grade', 'Grade 4 · Tk 30,000 – 40,000'], ['Required qualifications', 'Bachelor’s degree'], ['Required experience', '2+ years in operations or customer service'], ['Approval authority', 'Approves field job sign-off, up to Tk 20,000 provider bills']].forEach(([k, v], i) => kv(a, 16, 48 + i * 50, lW - 32, k, v));
  text(a, 16, 504, 'Required skills', 11.5, C.mute, 'r');
  let sx = 16, sy = 524;
  ['Scheduling', 'Client calls', 'Vendor follow-up', 'Excel', 'Bangla + English'].forEach((s) => { const w = tw(s, 12, 'm') + 22; if (sx + w > lW - 16) { sx = 16; sy += 36; } chip(a, sx, sy, s); sx += w + 6; });
  banner(a, 16, CH - TOP - P - 72, lW - 32, 'Changes need approval', 'Title, grade or reporting line: HR Manager, then CEO', 'blue');
  const b = panel(pg, 'JD', P + lW + 16, TOP, rW, CH - TOP - P, 'Job description', 'v3, cloned from Field Coordinator');
  const cw = (rW - 48) / 2;
  const block = (x, y, w, k, v) => { text(b, x, y, k, 11.5, C.mute, 's'); text(b, x, y + 18, v, 12.5, C.ink2, 'r', { width: w }); };
  block(16, 48, rW - 32, 'Job summary', 'Plans and tracks water tank cleaning jobs across Dhaka, keeps clients informed and makes sure every job is finished on time and to standard.');
  block(16, 116, cw, 'Duties', '•  Schedule providers and crews each day\n•  Call clients before and after every visit\n•  Keep job records and photos complete');
  block(32 + cw, 116, cw, 'Responsibilities', '•  On-time completion for the team\n•  Complaints closed within 24 hours\n•  Provider quality follow-up');
  block(16, 216, cw, 'Technical skills', 'Job scheduling, CRM work orders, Excel');
  block(32 + cw, 216, cw, 'Soft skills', 'Clear phone manner, calm under pressure');
  block(16, 276, cw, 'Working hours', 'Sun–Thu, 9:00–18:00; some Saturdays');
  block(32 + cw, 276, cw, 'Qualifications and experience', 'Bachelor’s degree; 2+ years');
  block(16, 336, rW - 32, 'KPIs', '•  95% of jobs finished on the booked day   •  Client rating 4.5 or higher   •  No complaint open over 24 hours');
  block(16, 396, rW - 32, 'Career path', 'Service Coordinator → Senior Coordinator → Operations Manager');
  rect(b, 16, 452, rW - 32, 1, C.line2);
  text(b, 16, 468, 'Used by', 11.5, C.mute, 's');
  table(b, 16, 490, rW - 32, [['Holder', 0], ['Since', 240], ['Status', 380, rW - 32 - 380, 'right']], [
    ['Sadia Akter', '1 Oct 2026', { t: 'Probation', badge: 'amber' }],
    ['Lutfor Rahman', '3 Mar 2025', { t: 'Confirmed', badge: 'green' }],
    [{ t: 'Vacant seat', tone: C.mute }, 'VAC-2026-0004', { t: 'Recruiting', badge: 'blue' }],
  ], { rowH: 36 });
}

/* ── 15. Workforce and vacancy request ──────────────────────── */
{
  const pg = win('Vacancy request', 'M3 §3 workforce request, §4 vacancy, §5 four-step approval, §7 one-click publishing', { active: 'Requests', crumbs: 'Human Resources   /   Recruitment', title: 'VAC-REQ-0007' });
  heading(pg, '2 × Field Technician, Air Conditioning', 'VAC-REQ-0007  ·  raised by Jahid Hasan (Department Manager) on 29 Oct', []);
  const TOP = 76, lW = 640, rW = IW - lW - 16;
  const a = panel(pg, 'Request', P, TOP, lW, CH - TOP - P, 'Workforce request and vacancy');
  const fw = (lW - 48) / 2, f3 = (lW - 64) / 3;
  field(a, 16, 46, fw, 'Department', 'Air Conditioning', { req: true });
  field(a, 32 + fw, 46, fw, 'Position', 'Field Technician (POS-0031)', { req: true });
  field(a, 16, 106, fw, 'Reason for recruitment', 'Summer service contracts doubled', { req: true });
  field(a, 32 + fw, 106, fw, 'New position or replacement', 'New position', { req: true });
  field(a, 16, 166, f3, 'Number of vacancies', '2', { req: true });
  field(a, 32 + f3, 166, f3, 'Proposed salary range', 'Tk 18,000 – 24,000', { req: true });
  field(a, 48 + 2 * f3, 166, f3, 'Employment type', 'Field staff', { req: true });
  field(a, 16, 226, f3, 'Expected joining date', '1 Dec 2026', { req: true });
  field(a, 32 + f3, 226, f3, 'Budget available', 'Yes, CC-0009 Field Ops', { req: true });
  field(a, 48 + 2 * f3, 226, f3, 'Approving manager', 'Kamal Hossain', { req: true });
  rect(a, 16, 298, lW - 32, 1, C.line2);
  text(a, 16, 312, 'Vacancy', 13, C.ink, 's');
  field(a, 16, 336, f3, 'Vacancy ID', 'Assigned when approved', { lock: true });
  field(a, 32 + f3, 336, f3, 'Reports to', 'Quality Supervisor');
  field(a, 48 + 2 * f3, 336, f3, 'Salary grade', 'Grade 2');
  field(a, 16, 396, f3, 'Location', 'Field, Dhaka north');
  field(a, 32 + f3, 396, f3, 'Closing date', '20 Nov 2026');
  field(a, 48 + 2 * f3, 396, f3, 'Job description', 'Field Technician v2');
  text(a, 16, 458, 'Recruitment priority', 11.5, C.ink2, 'm');
  let px = 16;
  ['Critical', 'High', 'Normal', 'Future'].forEach((s, i) => { px += chip(a, px, 478, s, i === 0) + 8; });
  rect(a, 16, 526, lW - 32, 1, C.line2);
  text(a, 16, 540, 'Publish to', 13, C.ink, 's');
  text(a, lW - 16 - 300, 541, 'One click publishes to every ticked channel', 11.5, C.mute, 'r', { width: 300, align: 'right' });
  [['Seventh Sky website', true], ['Careers portal', true], ['Internal vacancy board', true], ['LinkedIn', true], ['Facebook', true], ['Bdjobs', true], ['Email campaign', false]].forEach(([s, on], i) => { const cx = 16 + (i % 3) * ((lW - 32) / 3), cy = 568 + Math.floor(i / 3) * 30; box(a, cx, cy, on); text(a, cx + 26, cy, s, 12.5, C.ink, 'm'); });
  const fy = CH - TOP - P - 52;
  rect(a, lW - 16 - 210, fy, 210, 34, '#B9C1D3', { cornerRadius: 8 });
  icon(a, 'megaphone', lW - 16 - 196, fy + 9, 15, '#FFFFFF');
  text(a, lW - 16 - 174, fy + 9, 'Publish to 6 channels', 12.5, '#FFFFFF', 's');
  text(a, 16, fy + 9, 'Publishing unlocks after the CEO approves.', 11.5, C.mute, 'r');
  const b = panel(pg, 'Chain', P + lW + 16, TOP, rW, CH - TOP - P, 'Approval', 'Date, time, approver, comment kept');
  steps_(b, 16, 50, rW - 32, [
    ['Department Manager', 'Jahid Hasan: "Two crews short from December."', '29 Oct, 10:14 am', 'done'],
    ['HR Manager', 'Nusrat Jahan: "Position and JD checked."', '29 Oct, 3:40 pm', 'done'],
    ['Finance verification', 'Habib Rahman · budget against CC-0009', 'Waiting', 'now'],
    ['CEO approval', 'Abdullah Al Redowan', 'Not yet', 'todo'],
    ['Vacancy published', 'VAC-2026-0008 is created and goes live', '', 'todo'],
  ], 74);
  const cy2 = 50 + 5 * 74 + 10;
  rect(b, 16, cy2, rW - 32, 1, C.line2);
  text(b, 16, cy2 + 16, 'Your decision (Finance)', 12.5, C.ink, 's');
  rect(b, 16, cy2 + 40, rW - 32, 64, C.surface, { cornerRadius: 7, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
  text(b, 28, cy2 + 50, 'Comment for the next approver', 12.5, C.mute2, 'r');
  buttonsRight(b, rW - 16, cy2 + 120, [['Return', 'secondary', 'x'], ['Verify budget', 'primary', 'check']]);
}

/* ── 16. Onboarding ─────────────────────────────────────────── */
{
  const pg = win('Onboarding', 'M3 §21 transfer gate, M2 §11 onboarding automation, M1 §10 required links', { active: 'Onboarding', crumbs: 'Human Resources   /   People', title: 'Onboarding' });
  heading(pg, 'Onboarding', '3 people joining. An employee record is created only after every gate is met.', []);
  const TOP = 76, lW = 340, rW = IW - lW - 16;
  const l = frame(pg, 'List', P, TOP, lW, CH - TOP - P, { cornerRadius: 10, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside', clip: true });
  [['Shakil Ahmed', 'Service Coordinator · starts 1 Dec', '2 gates left', 'amber', true], ['Mahfuz Alam', 'Field Technician · started 27 Oct', '5 of 9 tasks', 'blue'], ['Moumita Das', 'Service Coordinator · starts 15 Dec', 'Offer sent', 'slate']].forEach(([n, r, s, tone, sel], i) => {
    const ry = i * 76;
    if (sel) { rect(l, 0, ry, lW, 76, '#F2FAFA'); rect(l, 0, ry, 3, 76, HR); }
    avatar(l, 16, ry + 18, 36, n, i + 4);
    text(l, 62, ry + 16, n, 13, C.ink, 's');
    text(l, 62, ry + 34, r, 11.5, C.mute, 'r');
    badge(l, lW - 16, ry + 14, s, tone, 'right');
    rect(l, 0, ry + 75, lW, 1, C.line2);
  });
  const d = frame(pg, 'Detail', P + lW + 16, TOP, rW, CH - TOP - P, { cornerRadius: 10, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside', clip: true });
  text(d, 20, 18, 'Shakil Ahmed', 17, C.ink, 'b');
  text(d, 20, 44, 'CAN-2026-0031 → Service Coordinator, Water Tank Services  ·  supervisor Rafiq Ahmed  ·  starts 1 Dec 2026', 12, C.mute, 'r');
  const hw = (rW - 56) / 2;
  const g = panel(d, 'Gate', 20, 76, hw, 260, 'Before the employee record is created');
  [['Offer accepted', 'Signed electronically 30 Oct, 11:02 am', 'done'], ['Mandatory checks complete', 'Police clearance, medical assessment still open', 'now'], ['Required approvals', 'rec.hire: HR Manager', 'now'], ['HR confirms onboarding', 'Nusrat Jahan', 'todo']].forEach(([t1, t2, st], i) => {
    const ry = 48 + i * 50;
    icon(g, st === 'done' ? 'circle-check' : st === 'now' ? 'circle-dashed' : 'circle', 16, ry, 16, st === 'done' ? C.green : st === 'now' ? C.amber : C.mute2);
    text(g, 42, ry, t1, 12.5, C.ink, 's');
    text(g, 42, ry + 17, t2, 11.5, C.mute, 'r', { width: hw - 60 });
  });
  const lk = panel(d, 'Links', 36 + hw, 76, hw, 260, 'Organisation links', 'All five required');
  [['Company', 'Seventh Sky Private Ltd'], ['Division', 'Property Care'], ['Department', 'Water Tank Services'], ['Position', 'Service Coordinator (POS-0012)'], ['Supervisor', 'Rafiq Ahmed']].forEach(([k, v], i) => {
    const ry = 48 + i * 40;
    icon(lk, 'circle-check', 16, ry, 15, C.green);
    text(lk, 40, ry, k, 12, C.mute, 'm');
    text(lk, 140, ry, v, 12.5, C.ink, 's');
  });
  const ck = panel(d, 'Checklist', 20, 352, rW - 40, CH - TOP - P - 352 - 76, 'Onboarding checklist', 'Created when the record is approved');
  [['Employee ID', 'SSPC-EMP-0049; never changes', 'Automatic'], ['Notify manager', 'Rafiq Ahmed, new-joiner notice', 'Automatic'], ['Notify Finance', 'Payroll setup, Grade 4', 'Automatic'], ['Notify IT', 'Create email and CRM login', 'Automatic'], ['Collect documents', '3 of 8 on file, 5 missing', 'HR'], ['Policy acknowledgement', 'Leave, conduct, IT use', 'Employee'], ['Probation review reminder', 'Set for 28 Feb 2027', 'Automatic']].forEach(([t1, t2, who], i) => {
    const cw2 = (rW - 72) / 2, cx = 16 + (i % 2) * (cw2 + 8), cy = 46 + Math.floor(i / 2) * 52;
    box(ck, cx, cy + 2, false);
    text(ck, cx + 26, cy, t1, 12.5, C.ink, 's');
    text(ck, cx + 26, cy + 17, t2, 11, C.mute, 'r', { width: cw2 - 110 });
    badge(ck, cx + cw2 - 8, cy, who, who === 'Automatic' ? 'blue' : 'slate', 'right');
  });
  const fy = CH - TOP - P - 60;
  rect(d, 0, fy, rW, 1, C.line);
  text(d, 20, fy + 20, 'Create employee record unlocks when the 3 open gates are met.', 12, C.mute, 'r');
  const bx2 = rW - 20 - bw('Create employee record', 1);
  rect(d, bx2, fy + 13, bw('Create employee record', 1), 32, '#B9C1D3', { cornerRadius: 8 });
  icon(d, 'user-plus', bx2 + 11, fy + 21, 15, '#FFFFFF');
  text(d, bx2 + 32, fy + 21, 'Create employee record', 12.5, '#FFFFFF', 's');
}

/* ── 17. New employee ───────────────────────────────────────── */
{
  const pg = win('New employee', 'M1 §10 five required links, M2 §2–3 fields, §4 automatic ID, §9 HR Manager approval', { active: 'Employees', crumbs: 'Human Resources   /   Employees', title: 'New employee' });
  heading(pg, 'New employee', 'Step 2 of 4: employment. The record goes to the HR Manager before it becomes active.', [['Cancel', 'secondary'], ['Send for approval', 'primary', 'send']]);
  let sx = P;
  ['Basic information', 'Employment', 'Contact and emergency', 'Payroll and documents'].forEach((s, i) => {
    ellipse(pg, sx, 72, 22, i < 1 ? C.greenBg : i === 1 ? HR : C.slateBg);
    if (i < 1) icon(pg, 'check', sx + 4, 76, 14, C.green); else text(pg, sx, 75, String(i + 1), 11.5, i === 1 ? '#FFFFFF' : C.mute, 'b', { width: 22, align: 'center' });
    text(pg, sx + 30, 75, s, 12.5, i === 1 ? C.ink : C.mute, i === 1 ? 's' : 'm');
    sx += 30 + tw(s, 12.5, 's') + 40;
  });
  const TOP = 112, lW = 760, rW = IW - lW - 16;
  const a = panel(pg, 'Form', P, TOP, lW, CH - TOP - P, 'Employment');
  const f3 = (lW - 64) / 3;
  banner(a, 16, 44, lW - 32, 'Supervisor is required', 'Every employee must be linked to a company, division, department, position and supervisor.', 'red');
  field(a, 16, 106, f3, 'Company', 'Seventh Sky Private Ltd', { req: true });
  field(a, 32 + f3, 106, f3, 'Division', 'Property Care', { req: true });
  field(a, 48 + 2 * f3, 106, f3, 'Department', 'Interior Design', { req: true });
  field(a, 16, 166, f3, 'Team', 'Design Studio');
  field(a, 32 + f3, 166, f3, 'Position', 'Interior Designer (POS-0021)', { req: true });
  text(a, 48 + 2 * f3, 166, 'Supervisor *', 11.5, C.red, 'm');
  rect(a, 48 + 2 * f3, 184, f3, 34, C.surface, { cornerRadius: 7, stroke: C.red, strokeWeight: 1.5, strokeAlign: 'inside' });
  text(a, 58 + 2 * f3, 192, 'Choose a supervisor', 12.5, C.mute2, 'r');
  field(a, 16, 226, f3, 'Employee type', 'Full-time', { req: true, note: '11 types: full-time … temporary worker' });
  field(a, 32 + f3, 226, f3, 'Employment status', 'Probation', { req: true });
  field(a, 48 + 2 * f3, 226, f3, 'Joining date', '1 Dec 2026', { req: true });
  field(a, 16, 306, f3, 'Probation end date', '28 Feb 2027');
  field(a, 32 + f3, 306, f3, 'Confirmation date', '—');
  field(a, 48 + 2 * f3, 306, f3, 'Contract end date', '—');
  field(a, 16, 366, f3, 'Work location', 'Head Office');
  field(a, 32 + f3, 366, f3, 'Cost centre', 'CC-0005 Interior', { lock: true, note: 'From the department' });
  field(a, 48 + 2 * f3, 366, f3, 'Salary grade', 'Grade 3', { lock: true, note: 'From the position' });
  field(a, 16, 446, f3, 'Work schedule', 'Day shift, Sun–Thu');
  field(a, 32 + f3, 446, f3, 'Notice period', '30 days');
  field(a, 48 + 2 * f3, 446, f3, 'Department manager', 'Farzana Karim', { lock: true, note: 'From the department' });
  const b = panel(pg, 'Summary', P + lW + 16, TOP, rW, 300, 'Record');
  kv(b, 16, 48, rW - 32, 'Employee ID', 'SSPC-EMP-0049, assigned on approval');
  kv(b, 16, 98, rW - 32, 'Name', 'Rumana Haque');
  kv(b, 16, 148, rW - 32, 'Reporting line', 'Supervisor → Farzana Karim → Kamal Hossain → CEO');
  kv(b, 16, 214, rW - 32, 'Approval', 'HR Manager (new employee)');
  const c = panel(pg, 'After', P + lW + 16, TOP + 316, rW, CH - TOP - P - 316, 'When approved');
  ['Onboarding checklist created', 'Probation review reminder set', 'Manager, Finance and IT notified', 'Headcount and department counts updated', 'Shown in attendance, leave and roster'].forEach((s, i) => { icon(c, 'circle-check', 16, 48 + i * 32, 15, C.green); text(c, 40, 48 + i * 32, s, 12.5, C.ink2, 'r'); });
}

/* ── 18. My team (manager view) ─────────────────────────────── */
{
  const pg = win('My team', 'M2 §13 manager view; no salary or confidential records', { active: 'My team', crumbs: 'Human Resources   /   People', title: 'My team', user: ['Rafiq Ahmed', 'Operations Manager'] });
  heading(pg, 'My team', '11 people report to you, directly or through a supervisor', [['Approve leave (2)', 'primary', 'calendar-check']]);
  banner(pg, P, 68, IW, 'Salary, bank and confidential HR records are hidden in this view.', null, 'blue');
  const TOP = 118, tW = IW - 316, rW = 300;
  const t = panel(pg, 'Team', P, TOP, tW, CH - TOP - P, 'Team list');
  table(t, 16, 44, tW - 32, [['Employee', 0], ['Status', 190], ['Attendance', 290], ['Leave left', 390], ['Training', 470], ['Next review', 560], ['Contract', 660, tW - 32 - 660, 'right']], [
    [{ t: 'Sadia Akter', sub: 'Service Coordinator' }, { t: 'Probation', badge: 'amber' }, '96%', '12 days', 'On track', { t: '31 Dec', tone: C.amber, weight: 's' }, 'Permanent'],
    [{ t: 'Lutfor Rahman', sub: 'Service Coordinator' }, { t: 'Confirmed', badge: 'green' }, '100%', '18 days', 'On track', '15 Mar', 'Permanent'],
    [{ t: 'Jahid Hasan', sub: 'Quality Supervisor' }, { t: 'Active', badge: 'green' }, '92%', '9 days', '1 overdue', '2 Feb', 'Permanent'],
    [{ t: 'Rubel Mia', sub: 'Field Technician' }, { t: 'Active', badge: 'green' }, '88%', '6 days', 'On track', '10 Jan', { t: 'Ends 9 Jan', tone: C.red, weight: 's' }],
    [{ t: 'Sohel Rana', sub: 'Field Technician' }, { t: 'Active', badge: 'green' }, '95%', '14 days', 'On track', '20 Apr', 'Permanent'],
    [{ t: 'Kabir Hossain', sub: 'Field Technician' }, { t: 'On leave', badge: 'blue' }, '90%', '3 days', 'On track', '5 May', 'Contract'],
    [{ t: 'Mahfuz Alam', sub: 'Field Technician' }, { t: 'Onboarding', badge: 'blue' }, '—', '—', 'Induction', '27 Jan', 'Permanent'],
  ], { rowH: 50 });
  const p = panel(pg, 'Pending', P + tW + 16, TOP, rW, CH - TOP - P, 'Waiting for you');
  [['Leave request', 'Sohel Rana · 2 days casual', 'calendar-days'], ['Leave request', 'Kabir Hossain · 1 day sick', 'calendar-days'], ['Probation review', 'Sadia Akter · due 31 Dec', 'hourglass'], ['Contract renewal', 'Rubel Mia · ends 9 Jan', 'file-clock']].forEach(([t1, t2, ic], i) => {
    const ry = 48 + i * 58;
    rect(p, 16, ry, 32, 32, C.slateBg, { cornerRadius: 8 });
    icon(p, ic, 24, ry + 8, 16, C.ink2);
    text(p, 58, ry + 1, t1, 12.5, C.ink, 's');
    text(p, 58, ry + 18, t2, 11.5, C.mute, 'r');
    if (i < 3) rect(p, 16, ry + 46, rW - 32, 1, C.line2);
  });
}

/* ── 19. Reports ────────────────────────────────────────────── */
{
  const pg = win('Reports', 'M1 §8 (9), M2 §14 (14), M3 §18 (10): every report, CSV or PDF', { active: 'Reports', crumbs: 'Human Resources   /   Insights', title: 'Reports' });
  heading(pg, 'HR reports', 'Each report respects your access: payroll columns only for HR and Finance.', []);
  const groups = [
    ['Organisation', ['Organisation structure', 'Department list', 'Position list', 'Reporting lines', 'Vacancy by department', 'Headcount by division', 'Headcount by department', 'Active and inactive positions', 'Cost centres']],
    ['Employees', ['Employee master', 'Active employees', 'Inactive employees', 'Probation employees', 'New joiners', 'Department headcount', 'Employee type', 'Contract expiry', 'Missing documents', 'Document expiry', 'Salary grade', 'Employee transfers', 'Employee history', 'Emergency contacts']],
    ['Recruitment', ['Recruitment pipeline', 'Vacancies by department', 'Time to hire', 'Cost per hire', 'Source of candidates', 'Interview success rate', 'Offer acceptance rate', 'Recruitment status', 'Talent pool', 'Vacancy age']],
  ];
  const cw = (IW - 32) / 3;
  groups.forEach(([g, list], k) => {
    const pn = panel(pg, g, P + k * (cw + 16), 76, cw, CH - 76 - P, g, `${list.length} reports`);
    list.forEach((r, i) => {
      const ry = 46 + i * 46;
      icon(pn, 'file-spreadsheet', 16, ry + 4, 15, C.ink2);
      text(pn, 40, ry + 4, r, 12.5, C.ink, 'm');
      text(pn, cw - 16 - 70, ry + 4, 'CSV   PDF', 12, '#0B7C7B', 's', { width: 70, align: 'right' });
      if (g === 'Employees' && r === 'Salary grade') badge(pn, cw - 16 - 78, ry + 2, 'HR, Finance', 'slate', 'right');
      if (i < list.length - 1) rect(pn, 16, ry + 34, cw - 32, 1, C.line2);
    });
  });
}

/* ── 20. Talent pool ────────────────────────────────────────── */
{
  const pg = win('Talent pool', 'M3 §16 six filters; unsuccessful candidates stay searchable', { active: 'Talent pool', crumbs: 'Human Resources   /   Recruitment', title: 'Talent pool' });
  heading(pg, 'Talent pool', '31 people kept for future roles', [['Invite to apply', 'primary', 'send']]);
  [['Skills', 'Scheduling, Excel'], ['Position', 'Any position'], ['Experience', '2+ years'], ['Education', 'Any'], ['Location', 'Dhaka'], ['Availability', 'Any']].forEach(([l, v], i) => select(pg, P + i * 186, 68, 174, l, v));
  const t = panel(pg, 'Pool', P, 136, IW, CH - 136 - P, 'Matching people', '9 of 31');
  table(t, 16, 44, IW - 32, [['Candidate', 0], ['Last applied for', 230], ['Experience', 450], ['Education', 560], ['Location', 680], ['Availability', 790], ['Score', 900], ['', 960, IW - 32 - 960, 'right']], [
    [{ t: 'Nabila Khan', sub: 'CAN-2026-0019' }, 'Service Coordinator', '3 years', 'BBA', 'Dhaka', 'Immediately', '84', { t: 'Strong match', badge: 'green' }],
    [{ t: 'Saif Islam', sub: 'CAN-2026-0024' }, 'Service Coordinator', '5 years', 'MBA', 'Dhaka', '30 days', '79', { t: 'Strong match', badge: 'green' }],
    [{ t: 'Masud Rana', sub: 'CAN-2026-0011' }, 'Field Technician', '4 years', 'Diploma', 'Dhaka', '15 days', '72', { t: 'Good', badge: 'blue' }],
    [{ t: 'Lima Akter', sub: 'CAN-2025-0088' }, 'Accounts Officer', '2 years', 'BBA', 'Dhaka', 'Immediately', '64', { t: 'Good', badge: 'blue' }],
    [{ t: 'Hasib Uddin', sub: 'CAN-2025-0071' }, 'Digital Marketing Officer', '2 years', 'BSS', 'Dhaka', '60 days', '58', { t: 'Consider', badge: 'slate' }],
    [{ t: 'Rehana Parvin', sub: 'CAN-2025-0064' }, 'Service Coordinator', '6 years', 'MBA', 'Dhaka', '30 days', '81', { t: 'Strong match', badge: 'green' }],
  ], { rowH: 52 });
}

/* ── 21. Offer acceptance (public) ──────────────────────────── */
{
  const x = 40 + (slot % COLS) * (BW + GAP), y = 150 + Math.floor(slot / COLS) * (BH + GAP);
  slot++;
  text(board, x, y - 34, `${slot}. Offer acceptance`, 16, C.ink, 'b');
  text(board, x + tw(`${slot}. Offer acceptance`, 16, 'b') + 14, y - 32, 'M3 §15: public link, accept or decline electronically', 13, C.mute, 'r');
  const w = frame(board, 'Window Offer acceptance', x, y, BW, BH, { fill: '#F6F8FA', cornerRadius: 10, clip: true });
  const nb = frame(w, 'Site header', 0, 0, BW, 68, { stroke: C.line, strokeWeight: 1, strokeAlign: 'inside', strokeSides: [0, 0, 1, 0] });
  logo(nb, 120, 16, 36);
  text(nb, 166, 18, 'Seventh Sky', 15, C.ink, 'b');
  text(nb, 166, 37, 'Careers', 11.5, C.mute, 'r');
  const L = frame(w, 'Letter', 120, 96, 780, 760, { cornerRadius: 12, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
  text(L, 40, 36, 'Offer of employment', 20, C.ink, 'b');
  text(L, 40, 66, '30 October 2026  ·  Ref OFR-2026-0012', 12, C.mute, 'r');
  text(L, 40, 104, 'Dear Shakil Ahmed,', 13, C.ink, 'r');
  text(L, 40, 132, 'We are pleased to offer you the position of Service Coordinator with Seventh Sky Property Care, on the terms below. This offer follows the approved Employment Offer template.', 13, C.ink2, 'r', { width: 700 });
  [['Position', 'Service Coordinator'], ['Salary', 'Tk 36,000 a month'], ['Employment type', 'Full-time'], ['Probation period', '3 months'], ['Start date', '1 December 2026'], ['Supervisor', 'Rafiq Ahmed, Operations Manager'], ['Work location', 'Head Office, Dhaka']].forEach(([k, v], i) => {
    const ry = 206 + i * 38;
    text(L, 40, ry, k, 12.5, C.mute, 'm');
    text(L, 240, ry, v, 13, C.ink, 's');
    rect(L, 40, ry + 28, 700, 1, C.line2);
  });
  text(L, 40, 490, 'Please confirm by 6 November 2026. Your employment starts after the remaining pre-employment checks are complete.', 13, C.ink2, 'r', { width: 700 });
  text(L, 40, 560, 'Nusrat Jahan', 13, C.ink, 's');
  text(L, 40, 580, 'HR Manager, Seventh Sky Property Care', 12, C.mute, 'r');
  const R = frame(w, 'Respond', 924, 96, 396, 330, { cornerRadius: 12, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
  text(R, 24, 24, 'Your response', 16, C.ink, 'b');
  text(R, 24, 52, 'Type your full name to sign.', 12.5, C.mute, 'r');
  field(R, 24, 80, 348, 'Full name', 'Shakil Ahmed', { req: true });
  box(R, 24, 148, true);
  text(R, 50, 148, 'I accept the offer and its terms.', 12.5, C.ink2, 'r');
  rect(R, 24, 190, 348, 40, C.rail, { cornerRadius: 9 });
  text(R, 24, 201, 'Accept offer', 13.5, '#FFFFFF', 's', { width: 348, align: 'center' });
  rect(R, 24, 240, 348, 40, C.surface, { cornerRadius: 9, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
  text(R, 24, 251, 'Decline', 13.5, C.ink2, 's', { width: 348, align: 'center' });
  text(R, 24, 294, 'We record the time and your network address.', 11.5, C.mute, 'r');
}

process.stdout.write(JSON.stringify(steps));
