// Drawing helpers shared by the Seventh Sky FigCraft generators: shapes, text,
// the app's own lucide icons, the logo, and compact chart primitives.
// Each generator collects `steps` and prints them as a FigCraft command script.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const ICONS = path.join(ROOT, 'admin-portal/node_modules/lucide-react/dist/esm/icons');
const LOGO = path.join(ROOT, 'admin-portal/src/assets/logo-mark.png');

const C = {
  board: '#E7ECF2', page: '#F6F8FA', surface: '#FFFFFF', line: '#E2E8F0', line2: '#EEF2F6', grid: '#EEF2F6',
  ink: '#0F172A', ink2: '#475569', mute: '#64748B', mute2: '#94A3B8',
  rail: '#0D1638', rail2: '#16214A', railLine: '#232F5C', railMute: '#8794BD', sky: '#1CC4FA',
  alert: '#E5484D', red: '#C2272D', redBg: '#FEF2F2', amber: '#B45309', amberBg: '#FEF3C7',
  green: '#047857', greenBg: '#ECFDF5', blue: '#1D4ED8', blueBg: '#EFF6FF', slateBg: '#F1F5F9',
  // Data colours (validated with the dataviz palette checker): one series is blue.
  s1: '#2A78D6', s2: '#EB6834', s3: '#1BAF7A', s4: '#EDA100',
  seq: ['#C9DDF6', '#7FAEE8', '#2A78D6', '#1B4F8F'],
  warm: ['#FCE3D3', '#F5A77E', '#EB6834', '#B8431A'],
};

const steps = [];
let n = 0;
const ref = () => `n${n++}`;
const add = (command, params, as) => { const s = { command, params }; if (as) s.as = as; steps.push(s); return as ? { $ref: as } : null; };
const frame = (parent, name, x, y, w, h, props = {}) =>
  add('node.create', { type: 'frame', name, parent, x, y, width: w, height: h, select: false, props: { fill: C.surface, ...props } }, ref());
const rect = (parent, x, y, w, h, fill, props = {}) =>
  add('node.create', { type: 'rectangle', parent, x, y, width: Math.max(w, 0.5), height: Math.max(h, 0.5), select: false, props: { fill, ...props } });
const ellipse = (parent, x, y, d, fill, props = {}) =>
  add('node.create', { type: 'ellipse', parent, x, y, width: d, height: d, select: false, props: { fill, ...props } });
const W = { r: 'Regular', m: 'Medium', s: 'SemiBold', b: 'Bold' };
const text = (parent, x, y, str, size, color, weight = 'r', opts = {}) => {
  const props = { fontFamily: 'Inter', fontStyle: W[weight], fontSize: size, fill: color, features: { tnum: true }, ...(opts.props || {}) };
  if (opts.width) { props.textAutoResize = 'height'; props.width = opts.width; props.textAlign = opts.align || 'left'; }
  add('node.create', { type: 'text', parent, x, y, text: String(str), select: false, props });
};
// Rough Inter advance width, for placing chips and right-aligned runs.
const tw = (str, size, weight = 'r') => String(str).length * size * (weight === 'r' ? 0.54 : weight === 'b' ? 0.66 : 0.6);
const path_ = (parent, d, stroke, weight = 2, props = {}) =>
  add('node.create', { type: 'vector', parent, x: 0, y: 0, path: d, select: false, props: { fill: 'none', stroke, strokeWeight: weight, strokeCap: 'round', strokeJoin: 'round', ...props } });

const toD = (tag, a) => {
  // A path that opens with a relative "m" starts from the previous subpath once
  // joined, so make the first move absolute (its trailing pairs stay relative lines).
  if (tag === 'path') return a.d.replace(/^m\s*(-?[\d.]+)[\s,]*(-?[\d.]+)\s*(?=[-\d.])?/, (m0, x, y) => {
    const rest = a.d.slice(m0.length).trimStart();
    return `M${x} ${y}` + (/^[-\d.]/.test(rest) ? 'l' : '');
  });
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
  const m = src.match(/const __iconNode = (\[[\s\S]*?\]);\n/);
  if (!m) throw new Error(`lucide "${name}" is an alias; use the icon it points to`);
  return Function('return ' + m[1])().map(([t, a]) => toD(t, a)).join(' ');
};
const icon = (parent, name, x, y, size, color, weight = 2) => {
  const box = add('node.create', { type: 'frame', name: 'icon/' + name, parent, x, y, width: 24, height: 24, select: false, props: { fill: 'none' } }, ref());
  add('node.create', { type: 'vector', parent: box, x: 0, y: 0, path: iconPath(name), select: false,
    props: { fill: 'none', stroke: color, strokeWeight: weight, strokeCap: 'round', strokeJoin: 'round' } });
  if (size !== 24) add('transform.scale', { ids: [box], factor: size / 24 });
};
const logo = (parent, x, y, d) => add('image.place', { path: LOGO, parent, x, y, width: d, height: d });

const TONES = { green: [C.greenBg, C.green], amber: [C.amberBg, C.amber], red: [C.redBg, C.red], blue: [C.blueBg, C.blue], slate: [C.slateBg, C.ink2] };
const badge = (parent, x, y, label, tone, align = 'left') => {
  const [bg, fg] = TONES[tone];
  const w = tw(label, 11.5, 's') + 14;
  const bx = align === 'right' ? x - w : x;
  rect(parent, bx, y, w, 20, bg, { cornerRadius: 5 });
  text(parent, bx + 7, y + 3, label, 11.5, fg, 's');
  return w;
};

/* Compact panel: title row, optional note on the right; content starts at y = 44. */
const panel = (parent, name, x, y, w, h, title, note, noteTone) => {
  const p = frame(parent, name, x, y, w, h, { cornerRadius: 10, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside', clip: true });
  text(p, 16, 14, title, 13.5, C.ink, 's');
  if (note) text(p, w - 16 - 260, 15, note, 12, noteTone || C.mute, noteTone ? 's' : 'r', { width: 260, align: 'right' });
  return p;
};
const legend = (parent, x, y, items) => {
  let lx = x;
  items.forEach(([l, col]) => { rect(parent, lx, y + 3, 9, 9, col, { cornerRadius: 2 }); text(parent, lx + 14, y, l, 11.5, C.ink2, 'm'); lx += 14 + tw(l, 11.5, 'm') + 14; });
};
const legendRight = (parent, right, y, items) => {
  const wsum = items.reduce((s, [l]) => s + 14 + tw(l, 11.5, 'm') + 14, -14);
  legend(parent, right - wsum, y, items);
};
const niceStep = (v) => { const p = 10 ** Math.floor(Math.log10(v || 1)); const m = v / p; return [1, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => m <= s) * p; };
const niceMax = (v, ticks = 4) => niceStep(v / ticks) * ticks;

/* Vertical bars, stacked when a point has several values. Gridlines carry the axis labels. */
const vbars = (p, x, y, w, h, labels, series, colors, { max, fmt = (v) => v, gap = 0.36, ticks = 4, highlightLast = false } = {}) => {
  const totals = series.map((s) => (Array.isArray(s) ? s.reduce((a, b) => a + b, 0) : s));
  const M = max || niceMax(Math.max(...totals), ticks);
  const ax = 40;
  for (let t = 0; t <= ticks; t++) {
    const gy = y + h - (h * t) / ticks;
    rect(p, x + ax, gy, w - ax, 1, t ? C.grid : C.line);
    text(p, x, gy - 7, fmt((M * t) / ticks), 10.5, C.mute2, 'r', { width: ax - 8, align: 'right' });
  }
  const slot = (w - ax) / labels.length, bw = slot * (1 - gap);
  labels.forEach((l, i) => {
    const bx = x + ax + i * slot + (slot - bw) / 2;
    let base = y + h;
    (Array.isArray(series[i]) ? series[i] : [series[i]]).forEach((v, k, arr) => {
      const bh = (h * v) / M;
      if (bh > 0.5) {
        const top = k === arr.length - 1 || arr.slice(k + 1).every((z) => !z);
        rect(p, bx, base - bh, bw, bh - (top ? 0 : 1), colors[k] || colors[0], { cornerRadius: top ? [3, 3, 0, 0] : 0, opacity: highlightLast && i < labels.length - 1 && !Array.isArray(series[i]) ? 0.55 : 1 });
      }
      base -= bh;
    });
    text(p, bx - 10, y + h + 6, l, 10.5, C.mute, 'r', { width: bw + 20, align: 'center' });
  });
};
/* Paired bars (two series side by side), e.g. billed vs collected. */
const pairbars = (p, x, y, w, h, labels, a, b, colors, { fmt = (v) => v, ticks = 4 } = {}) => {
  const M = niceMax(Math.max(...a, ...b), ticks);
  const ax = 44;
  for (let t = 0; t <= ticks; t++) {
    const gy = y + h - (h * t) / ticks;
    rect(p, x + ax, gy, w - ax, 1, t ? C.grid : C.line);
    text(p, x, gy - 7, fmt((M * t) / ticks), 10.5, C.mute2, 'r', { width: ax - 8, align: 'right' });
  }
  const slot = (w - ax) / labels.length, bw = slot * 0.3;
  labels.forEach((l, i) => {
    const bx = x + ax + i * slot + slot * 0.18;
    [[a[i], colors[0]], [b[i], colors[1]]].forEach(([v, col], k) => {
      const bh = (h * v) / M;
      if (bh > 0.5) rect(p, bx + k * (bw + 2), y + h - bh, bw, bh, col, { cornerRadius: [3, 3, 0, 0] });
    });
    text(p, x + ax + i * slot, y + h + 6, l, 10.5, C.mute, 'r', { width: slot, align: 'center' });
  });
};
/* Horizontal bars: label left, bar, value right. */
const hbars = (p, x, y, w, rows, { max, color = C.s1, rowH = 26, labelW = 150, valueW = 70, fmt = (v) => v, colorFor } = {}) => {
  const M = max || Math.max(...rows.map((r) => r[1]));
  rows.forEach(([l, v, sub], i) => {
    const ry = y + i * rowH;
    text(p, x, ry + 2, l, 12, C.ink2, 'm', { width: labelW - 8 });
    const bw = w - labelW - valueW;
    rect(p, x + labelW, ry + 3, bw, 12, C.grid, { cornerRadius: 3 });
    if (v) rect(p, x + labelW, ry + 3, Math.max(3, (bw * v) / M), 12, colorFor ? colorFor(i) : color, { cornerRadius: 3 });
    text(p, x + w - valueW, ry + 1, fmt(v), 12, C.ink, 's', { width: valueW, align: 'right' });
    if (sub) text(p, x + labelW, ry + 17, sub, 10.5, C.mute, 'r');
  });
};
/* A line over gridlines; optional dashed target line. */
const linechart = (p, x, y, w, h, labels, values, { color = C.s1, max, min = 0, fmt = (v) => v, target, area = true, ticks = 4 } = {}) => {
  const M = max || niceMax(Math.max(...values, target || 0), ticks);
  const ax = 36;
  for (let t = 0; t <= ticks; t++) {
    const gy = y + h - (h * t) / ticks;
    rect(p, x + ax, gy, w - ax, 1, t ? C.grid : C.line);
    text(p, x, gy - 7, fmt(min + ((M - min) * t) / ticks), 10.5, C.mute2, 'r', { width: ax - 8, align: 'right' });
  }
  const px = (i) => x + ax + 8 + (i * (w - ax - 16)) / (values.length - 1);
  const py = (v) => y + h - (h * (v - min)) / (M - min);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join('');
  if (area) path_(p, `${d}L${px(values.length - 1)} ${y + h}L${px(0)} ${y + h}Z`, 'none', 0, { fill: color, opacity: 0.08, stroke: 'none' });
  if (target != null) path_(p, `M${x + ax} ${py(target)}L${x + w} ${py(target)}`, C.mute, 1.2, { dashes: [4, 4] });
  path_(p, d, color, 2);
  ellipse(p, px(values.length - 1) - 4, py(values[values.length - 1]) - 4, 8, color, { stroke: '#FFFFFF', strokeWeight: 2, strokeAlign: 'outside' });
  labels.forEach((l, i) => { if (l) text(p, px(i) - 24, y + h + 6, l, 10.5, C.mute, 'r', { width: 48, align: 'center' }); });
};
const spark = (p, x, y, w, h, values, color = C.s1) => {
  const M = Math.max(...values), m = Math.min(...values);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${(x + (i * w) / (values.length - 1)).toFixed(1)} ${(y + h - (h * (v - m)) / (M - m || 1)).toFixed(1)}`).join('');
  path_(p, d, color, 1.5);
};
/* One-card strip of headline figures with dividers; delta tone: 'up' good, 'down' bad, 'flat'. */
const kpiStrip = (parent, x, y, w, items) => {
  const s = frame(parent, 'Figures', x, y, w, 72, { cornerRadius: 10, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
  const cw = w / items.length;
  items.forEach(([label, value, delta, tone, sp], i) => {
    const cx = i * cw;
    if (i) rect(s, cx, 14, 1, 44, C.line2);
    text(s, cx + 16, 12, label, 12, C.mute, 'm');
    if (delta) text(s, cx + 16 + tw(label, 12, 'm') + 8, 12, delta, 11.5, tone === 'up' ? C.green : tone === 'down' ? C.red : C.mute, 's');
    text(s, cx + 16, 32, value, 19, C.ink, 'b');
    if (sp) spark(s, cx + cw - 16 - 56, 34, 56, 20, sp, tone === 'down' ? C.alert : C.s1);
  });
  return s;
};
/* Compact table. cols: [label, x, width, align]; rows: arrays of cells, a cell may be {t, tone, badge, sub, w}. */
const table = (p, x, y, w, cols, rows, { rowH = 36, head = true } = {}) => {
  let ry = y;
  if (head) {
    rect(p, 0, y, w + x * 2, 30, '#F8FAFC');
    rect(p, 0, y + 29, w + x * 2, 1, C.line);
    cols.forEach(([l, cx, cw, al]) => text(p, x + cx, y + 8, l, 11.5, C.mute, 's', cw ? { width: cw, align: al || 'left' } : {}));
    ry += 30;
  }
  rows.forEach((r) => {
    cols.forEach(([, cx, cw, al], k) => {
      const c = r[k];
      if (c == null) return;
      const cell = typeof c === 'object' ? c : { t: c };
      if (cell.badge) badge(p, al === 'right' ? x + cx + cw : x + cx, ry + (rowH - 20) / 2, cell.t, cell.badge, al === 'right' ? 'right' : 'left');
      else if (cell.bar != null) {
        rect(p, x + cx, ry + rowH / 2 - 3, cw - 40, 6, C.grid, { cornerRadius: 3 });
        rect(p, x + cx, ry + rowH / 2 - 3, Math.max(2, ((cw - 40) * cell.bar) / 100), 6, cell.color || C.s1, { cornerRadius: 3 });
        text(p, x + cx + cw - 34, ry + rowH / 2 - 8, cell.bar + '%', 11.5, C.ink2, 's', { width: 34, align: 'right' });
      } else {
        const ty = cell.sub ? ry + rowH / 2 - 15 : ry + rowH / 2 - 8;
        text(p, x + cx, ty, cell.t, 12.5, cell.tone || (k === 0 ? C.ink : C.ink2), cell.weight || (k === 0 ? 's' : 'r'), cw ? { width: cw, align: al || 'left' } : {});
        if (cell.sub) text(p, x + cx, ty + 17, cell.sub, 11, cell.subTone || C.mute, 'r', cw ? { width: cw, align: al || 'left' } : {});
      }
    });
    ry += rowH;
    rect(p, 0, ry - 1, w + x * 2, 1, C.line2);
  });
  return ry;
};
const segmented = (parent, right, y, options, on = 0) => {
  const ws = options.map((o) => tw(o, 12.5, 'm') + 22);
  const total = ws.reduce((a, b) => a + b, 0) + 6;
  const x0 = right - total;
  rect(parent, x0, y, total, 32, C.slateBg, { cornerRadius: 8 });
  let ox = x0 + 3;
  options.forEach((o, i) => {
    if (i === on) rect(parent, ox, y + 3, ws[i], 26, C.surface, { cornerRadius: 6 });
    text(parent, ox, y + 9, o, 12.5, i === on ? C.ink : C.mute, i === on ? 's' : 'm', { width: ws[i], align: 'center' });
    ox += ws[i];
  });
  return x0;
};
const button = (parent, x, y, label, kind = 'primary', ic) => {
  const w = tw(label, 12.5, 's') + 24 + (ic ? 20 : 0);
  if (kind === 'primary') rect(parent, x, y, w, 32, C.rail, { cornerRadius: 8 });
  else rect(parent, x, y, w, 32, C.surface, { cornerRadius: 8, stroke: C.line, strokeWeight: 1, strokeAlign: 'inside' });
  const fg = kind === 'primary' ? '#FFFFFF' : C.ink;
  if (ic) icon(parent, ic, x + 11, y + 8, 15, fg);
  text(parent, x + 12 + (ic ? 20 : 0), y + 8, label, 12.5, fg, 's');
  return w;
};

module.exports = { C, steps, add, ref, frame, rect, ellipse, text, tw, path_, icon, logo, badge, panel, legend, legendRight, niceMax, vbars, pairbars, hbars, linechart, spark, kpiStrip, table, segmented, button };
