/* One-off generator: parse the extracted V0.2 agreement text into a CLAUSES
 * module (verbatim). Produces services/rppsClauses.js and services/rpssClauses.js
 * as `module.exports = [[title, htmlBody], ...]` for the render services.
 *
 * Run from backend/: node scripts/genSalesAgreementClauses.js
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', '..', 'docs', 'superpowers');
const JOBS = [
  { txt: 'Residential Property Purchase Service Agreement - V0.2.txt', out: 'rppsClauses.js' },
  { txt: 'Residential Property Sale Service Agreement - V0.2.txt', out: 'rpssClauses.js' },
  { txt: 'Commercial Property Purchase Service Agreement - V0.2.txt', out: 'cppsClauses.js' },
  { txt: 'Commercial Property Sale Service Agreement - V0.2.txt', out: 'cpssClauses.js' },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const isHeading = (l) => /^\d{1,2}[A-Z]?\.\s+[A-Z]/.test(l); // "1. PURPOSE", "4A. SELLER..."

const SUBHEADS = new Set([
  'Property Assessment & Sales Strategy',
  'Property Preparation',
  'Marketing & Promotion',
  'Buyer Management',
  'Negotiation & Transaction Support',
  'Documentation & Professional Coordination',
  'Additional Services',
  'Buyer Consultation & Planning',
  'Property Search',
  'Inspection & Property Coordination',
  'Additional Support Services',
  'Property Sale Services',
  'Property Purchase Services',
  'Commission-Based Engagement',
  'Success Fee Engagement',
  'Professional Service Fees',
  'Buyer Consultation',
  'Commercial Property Search',
  'Due Diligence & Purchase Coordination',
  'Documentation & Settlement'
]);

// Turn a run of body lines into HTML: properly grouped bullet lists, checkbox
// items, styled subheadings, and paragraphs. Never mutates or alters text.
function toHtml(lines, clauseNum) {
  const elements = [];
  let inBulletList = false;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (!l) continue;

    if (/^[☐☑]\s?/.test(l)) {
      elements.push({ type: 'checkbox', raw: l });
      inBulletList = false;
      continue;
    }

    if (/^\d{1,2}\.\d+\s+[A-Z]/.test(l) || SUBHEADS.has(l)) {
      elements.push({ type: 'subhead', raw: l });
      inBulletList = false;
      continue;
    }

    if (l.endsWith(':')) {
      elements.push({ type: 'leadin', raw: l });
      if (l === 'Unless otherwise agreed in writing:' && (clauseNum === '9' || lines[i+1]?.trim() === 'Property Sale Services' || lines[i+1]?.trim() === 'Property Purchase Services' || lines[i+1]?.trim() === 'Professional Service Fees')) {
        inBulletList = false;
      } else {
        inBulletList = true;
      }
      continue;
    }

    if (inBulletList) {
      if (/[;]\s*(?:and|or)?$/i.test(l)) {
        elements.push({ type: 'bullet', raw: l });
        continue;
      }

      if (clauseNum === '16' && (l.startsWith('Seventh Sky will') || l.startsWith('Seventh Sky is') || l.startsWith('The Client') || l.startsWith('Buyers') || l.startsWith('Independent') || l.startsWith('Neither') || l.startsWith('Property sellers'))) {
        elements.push({ type: 'bullet', raw: l });
        continue;
      }

      elements.push({ type: 'bullet', raw: l });
      inBulletList = false;
      continue;
    }

    if ((clauseNum === '9') && (l.startsWith('Deposit upon acceptance') || l.startsWith('Progress payments') || l.startsWith('Final payment'))) {
      elements.push({ type: 'bullet', raw: l });
      continue;
    }

    elements.push({ type: 'paragraph', raw: l });
  }

  const out = [];
  let activeList = null; // { type: 'bullet'|'checkbox', items: [] }
  const flush = () => {
    if (!activeList) return;
    if (activeList.type === 'bullet') {
      out.push(`<ul style="margin:4px 0 8px 18px;padding:0;list-style-type:disc;">${activeList.items.map(it => `<li style="margin:2px 0;">${esc(it)}</li>`).join('')}</ul>`);
    } else if (activeList.type === 'checkbox') {
      out.push(`<ul style="margin:4px 0 8px 6px;padding:0;list-style:none;">${activeList.items.map(it => `<li style="margin:2px 0;">${esc(it)}</li>`).join('')}</ul>`);
    }
    activeList = null;
  };

  for (const el of elements) {
    if (el.type === 'bullet') {
      if (!activeList || activeList.type !== 'bullet') {
        flush();
        activeList = { type: 'bullet', items: [] };
      }
      activeList.items.push(el.raw);
    } else if (el.type === 'checkbox') {
      if (!activeList || activeList.type !== 'checkbox') {
        flush();
        activeList = { type: 'checkbox', items: [] };
      }
      activeList.items.push(el.raw);
    } else if (el.type === 'subhead') {
      flush();
      out.push(`<p style="margin:10px 0 4px;font-weight:700;color:#012a4e;">${esc(el.raw)}</p>`);
    } else if (el.type === 'leadin') {
      flush();
      out.push(`<p style="margin:6px 0;">${esc(el.raw)}</p>`);
    } else {
      flush();
      out.push(`<p style="margin:6px 0;">${esc(el.raw)}</p>`);
    }
  }
  flush();
  return out.join('');
}

for (const job of JOBS) {
  const raw = fs.readFileSync(path.join(SRC, job.txt), 'utf8').split('\n');
  // Find the body start: the first standalone heading "1. PURPOSE" AFTER the TOC.
  // The TOC lists headings with " PAGEREF" — skip those.
  const bodyLines = raw.filter((l) => !/PAGEREF|_Toc|\\h \d/.test(l));
  const start = bodyLines.findIndex((l) => /^1\.\s+PURPOSE/i.test(l.trim()));
  // End the clause region at the FIRST of "SCHEDULE A" or the "SIGNATURES" block
  // (which sits between clause 25 and Schedule A). Cutting at SIGNATURES keeps the
  // execution-signature table out of clause 25 — the renderer draws its own.
  const endA = bodyLines.findIndex((l, i) => i > start && /^SCHEDULE\s+A\b/i.test(l.trim()));
  const endSig = bodyLines.findIndex((l, i) => i > start && /^SIGNATURES?\s*$/i.test(l.trim()));
  const ends = [endA, endSig].filter((i) => i > 0);
  const endMarker = ends.length ? Math.min(...ends) : -1;
  const region = bodyLines.slice(start, endMarker > 0 ? endMarker : undefined);

  const clauses = [];
  let cur = null;
  for (const line of region) {
    const l = line.trim();
    if (isHeading(l)) {
      if (cur) clauses.push(cur);
      const m = l.match(/^(\d{1,2}[A-Z]?)\.\s+(.*)$/);
      cur = { num: m[1], title: m[2].trim(), body: [] };
    } else if (cur) {
      cur.body.push(l);
    }
  }
  if (cur) clauses.push(cur);

  const arr = clauses.map((c) => `  [${JSON.stringify(c.title)}, ${JSON.stringify(toHtml(c.body, c.num))}]`);
  const out = `// AUTO-GENERATED from "${job.txt}" (V0.2) by scripts/genSalesAgreementClauses.js.\n// Verbatim clause text; do not hand-edit — re-run the generator to refresh.\nmodule.exports = [\n${arr.join(',\n')},\n];\n`;
  fs.writeFileSync(path.join(__dirname, '..', 'services', job.out), out);
  console.log(`${job.out}: ${clauses.length} clauses (${clauses.map((c) => c.num).join(', ')})`);
}
