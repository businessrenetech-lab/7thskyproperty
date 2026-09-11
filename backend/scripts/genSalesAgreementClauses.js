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
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const isHeading = (l) => /^\d{1,2}[A-Z]?\.\s+[A-Z]/.test(l); // "1. PURPOSE", "4A. SELLER..."

// Turn a run of body lines into HTML: ☐/☑ lines and short ";"-terminated lines
// become list items; everything else a paragraph. Consecutive list items group.
function toHtml(lines) {
  const out = [];
  let list = null; // {type:'check'|'bullet', items:[]}
  const flush = () => { if (list) { out.push(`<ul style="margin:4px 0 8px 18px;padding:0;">${list.items.map((i) => `<li style="margin:2px 0;">${i}</li>`).join('')}</ul>`); list = null; } };
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) continue;
    const check = /^[☐☑]\s?/.test(l);
    const bullet = !check && /[;:]$/.test(l) && l.length < 140 && !/[.]$/.test(l);
    if (check) {
      if (!list || list.type !== 'check') { flush(); list = { type: 'check', items: [] }; }
      list.items.push('☐ ' + esc(l.replace(/^[☐☑]\s?/, '')));
    } else if (bullet) {
      if (!list || list.type !== 'bullet') { flush(); list = { type: 'bullet', items: [] }; }
      list.items.push(esc(l));
    } else {
      flush();
      out.push(`<p style="margin:6px 0;">${esc(l)}</p>`);
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
  const endMarker = bodyLines.findIndex((l, i) => i > start && /^SCHEDULE\s+A\b/i.test(l.trim()));
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

  const arr = clauses.map((c) => `  [${JSON.stringify(c.num + '. ' + c.title)}, ${JSON.stringify(toHtml(c.body))}]`);
  const out = `// AUTO-GENERATED from "${job.txt}" (V0.2) by scripts/genSalesAgreementClauses.js.\n// Verbatim clause text; do not hand-edit — re-run the generator to refresh.\nmodule.exports = [\n${arr.join(',\n')},\n];\n`;
  fs.writeFileSync(path.join(__dirname, '..', 'services', job.out), out);
  console.log(`${job.out}: ${clauses.length} clauses (${clauses.map((c) => c.num).join(', ')})`);
}
