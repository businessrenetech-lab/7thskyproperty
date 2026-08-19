/**
 * docTemplate.service.js
 * ------------------------------------------------------------------
 * Turns an uploaded .docx agreement into a reusable dynamic template:
 *   · convert docx → HTML (mammoth)
 *   · auto-detect fillable fields (blanks ____, checkboxes ☐, [placeholders])
 *   · detect signature blocks → signer roles
 *   · return content_html with {{key}} tokens + fields[] + signers[]
 * plus merge(content_html, values) to fill a template for signing.
 */
const mammoth = require('mammoth');

const stripTags = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const slug = (s) => stripTags(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'field';

// Infer a field type from its label.
function inferType(label) {
  const l = label.toLowerCase();
  if (/\bdate\b|effective date|d\.o\.b/.test(l)) return 'date';
  if (/%|percent|per cent/.test(l)) return 'percentage';
  if (/bdt|amount|fee|value|deposit|price|payment|cost|charge/.test(l)) return 'currency';
  if (/email/.test(l)) return 'email';
  if (/phone|mobile|contact no/.test(l)) return 'tel';
  if (/signature/.test(l)) return 'signature';
  return 'text';
}

// Derive a human label from the text immediately preceding a blank.
// Walk backwards over the trailing words, stopping at a value (digit), an
// ALL-CAPS heading word, or stray punctuation — so the label is just the field
// name (e.g. "Version: 0.1 Effective Date:" → "Effective Date").
function labelFromContext(before) {
  let t = stripTags(before).replace(/\s+/g, ' ');
  const cut = Math.max(t.lastIndexOf('___'), t.lastIndexOf('}}'), t.lastIndexOf('•'), t.lastIndexOf('☐'), t.lastIndexOf('☒'));
  if (cut >= 0) t = t.slice(cut + 1);
  const seg = (t.trim().endsWith(':') ? t.trim().slice(0, -1) : t.trim());
  const words = seg.split(' ').filter(Boolean);
  const out = [];
  for (let i = words.length - 1; i >= 0 && out.length < 6; i--) {
    const w = words[i];
    const bare = w.replace(/[^A-Za-z]/g, '');
    if (/\d/.test(w)) break;                       // values: 0.1, dates, codes
    if (bare.length > 2 && bare === bare.toUpperCase()) break; // ALL-CAPS heading word
    if (/^[)"'”’.,•]+$/.test(w)) break;            // stray punctuation
    out.unshift(w);
  }
  const label = out.join(' ').replace(/^[^A-Za-z(]+/, '').replace(/[:\s]+$/, '').trim();
  return label || 'Field';
}

// True selection groups are short noun-phrase checklists (services, tank types),
// not disclaimer sentences or mis-grouped generic labels.
function isSelectionGroup(g) {
  const h = g.heading.trim().toLowerCase();
  if (/^(date|options|other|selected value|value)$/.test(h)) return false;
  if (/guarantee|acknowledg|however|accordingly|the client|the part|do not|does not|following|shall|may include/.test(h)) return false;
  const longOpts = g.options.filter((o) => o.split(' ').length > 7).length;
  if (longOpts > g.options.length / 2) return false;
  return true;
}

// Detect signer roles from signature-block headings.
function detectSigners(html) {
  const text = stripTags(html).toUpperCase();
  const signers = [];
  const add = (role, label, order, is_org) => signers.push({ role, label, order, is_org: !!is_org });
  if (/SIGNED BY CLIENT|CLIENT REPRESENTATIVE|CLIENT DETAILS/.test(text)) add('client', 'Client', 1, false);
  if (/SIGNED FOR SEVENTH SKY|SEVENTH SKY REPRESENTATIVE|FOR SEVENTH SKY/.test(text)) add('seventh_sky', 'Seventh Sky', 2, true);
  if (/WITNESS 1|WITNESS ONE/.test(text)) add('witness_1', 'Witness 1', 3, false);
  if (/WITNESS 2|WITNESS TWO/.test(text)) add('witness_2', 'Witness 2', 4, false);
  if (!signers.length) { add('party_a', 'First Party', 1, false); add('seventh_sky', 'Seventh Sky', 2, true); }
  return signers.sort((a, b) => a.order - b.order);
}

/**
 * Detect fillable fields + tokenise the HTML.
 * @returns { content_html, fields, signers, stats }
 */
function detectFields(html) {
  const fields = [];
  const used = {};
  const keyFor = (label) => { let base = slug(label); let k = base; let n = 2; while (used[k]) k = `${base}_${n++}`; used[k] = true; return k; };

  // 1. Explicit placeholders {{X}} / [X] / «X»
  let out = html.replace(/\{\{\s*([^}]{1,50})\s*\}\}|«\s*([^»]{1,50})\s*»|\[\s*([A-Za-z][^\]]{1,50})\s*\]/g, (m, a, b, c) => {
    const label = (a || b || c).trim();
    const key = keyFor(label);
    fields.push({ key, label, type: inferType(label), required: false, group: 'General' });
    return `{{${key}}}`;
  });

  // 2. Blank runs ____ (and date sequences ___ / ___ / ___) — reverse-replace to keep indices valid.
  const BLANK = /_{3,}(?:\s*[\/.]\s*_{3,})*/g;
  const matches = [];
  let m; while ((m = BLANK.exec(out))) matches.push({ index: m.index, len: m[0].length, isDate: /[\/]/.test(m[0]) });
  for (let i = matches.length - 1; i >= 0; i--) {
    const { index, len, isDate } = matches[i];
    const before = out.slice(Math.max(0, index - 140), index);
    let label = labelFromContext(before);
    if (isDate && !/date/i.test(label)) label = label ? `${label} (date)` : 'Date';
    const key = keyFor(label);
    const type = isDate ? 'date' : inferType(label);
    fields.push({ key, label: label.replace(/\s*\(date\)$/i, ''), type, required: false, group: groupFor(label) });
    out = out.slice(0, index) + `{{${key}}}` + out.slice(index + len);
  }

  // 3. Checkboxes ☐ / ☒ → grouped multi-select (content keeps the box glyph; merge flips selected).
  const groups = detectCheckboxGroups(out);
  for (const g of groups) {
    const key = keyFor(g.heading + ' selection');
    fields.push({ key, label: g.heading, type: 'checkbox_group', required: false, group: 'Selections', options: g.options });
  }

  fields.reverse(); // present roughly in document order
  return { content_html: out, fields, signers: detectSigners(html), stats: { blanks: matches.length, checkbox_groups: groups.length } };
}

function groupFor(label) {
  const l = label.toLowerCase();
  if (/name|nid|passport|company|address|phone|email|position|represent/.test(l)) return 'Parties';
  if (/date/.test(l)) return 'Dates';
  if (/tank|property|capacity|facility/.test(l)) return 'Property & Tank';
  if (/%|percent|bdt|amount|fee|deposit|payment|value/.test(l)) return 'Payment';
  if (/warrant/.test(l)) return 'Warranty';
  return 'General';
}

// Group consecutive ☐ items under the nearest preceding <strong> heading.
function detectCheckboxGroups(html) {
  const groups = [];
  let current = null;
  // Walk headings + checkbox lines in document order. A heading is a <strong>…
  // OR a short plain line that ends in ":" (e.g. "Property Type:", "Known Issues:").
  const TOKEN = /<strong>([^<]{2,80})<\/strong>|(?:<p>|<br\s*\/?>)([A-Z][^<:{]{2,50}):(?:<|\s)|[☐☒]\s*([^<\n{]{2,70})/g;
  let m;
  while ((m = TOKEN.exec(html))) {
    const heading = m[1] || m[2];
    if (heading) { // heading (strong or "Label:")
      const h = heading.replace(/&amp;/g, '&').trim();
      if (h.length > 2 && !/^☐|^☒/.test(h)) current = { heading: h, options: [] };
    } else if (m[3]) { // checkbox option
      const opt = m[3].replace(/&amp;/g, '&').replace(/\{\{[^}]+\}\}/g, '').trim();
      if (!opt) continue;
      if (!current) current = { heading: 'Options', options: [] };
      if (!groups.includes(current)) groups.push(current);
      if (!current.options.includes(opt)) current.options.push(opt);
    }
  }
  return groups.filter((g) => g.options.length && isSelectionGroup(g));
}

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

/** Fill a template's HTML with values. Dynamic values are always treated as text. */
function merge(contentHtml, values = {}, opts = {}) {
  let html = contentHtml;
  // 1. Optional blocks: {{#if key}}...{{/if}}
  html = html.replace(/\{\{#if\s+([a-z0-9_]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/gi, (m, key, body) => {
    const value = values[key];
    return value == null || value === '' || (Array.isArray(value) && !value.length) ? '' : body;
  });
  // 2. {{key}} placeholders
  html = html.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (m, key) => {
    const v = values[key];
    if (v == null || v === '') return opts.keepEmpty ? '<span style="border-bottom:1px solid #999;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>' : '__________';
    if (Array.isArray(v)) return v.map(escapeHtml).join(', ');
    return escapeHtml(v);
  });
  // 3. checkbox_group selections → flip ☐ to ☒ for chosen options
  for (const key of Object.keys(values)) {
    const v = values[key];
    if (Array.isArray(v)) for (const opt of v) {
      const safe = String(opt).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(new RegExp('☐(\\s*' + safe + ')', 'g'), '☒$1');
    }
  }
  return html;
}

async function parseDocx(input) {
  const res = await mammoth.convertToHtml(input.buffer ? { buffer: input.buffer } : { path: input.path });
  return detectFields(res.value);
}

module.exports = { parseDocx, detectFields, merge, detectSigners };
