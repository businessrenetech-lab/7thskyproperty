/**
 * Education and work experience of a staff member (owner request 2026-10-09: no JSON, no "one per line").
 *
 * STORED SHAPE (staff_profiles.educational_background / work_experience, JSON columns): an array of objects
 *   education:  [{ degree, institution, year, result }]                       degree required per row
 *   experience: [{ title, company, from, to, description }]                   title required per row
 *               from / to are 'YYYY-MM'; to may also be 'present' or ''
 * Every value is a plain string ('' when not given). At most MAX_ROWS rows.
 *
 *   readEducation(value) / readExperience(value)  -> rows in the stored shape, from anything stored before:
 *       a JSON array of strings (the old "one per line" rows), a JSON array of objects (any key names),
 *       a JSON string of either, or a plain string. A legacy text row becomes ONE row with the whole text in the
 *       first field (degree / title), so nothing is lost. Never returns a string.
 *   cleanEducation(value) / cleanExperience(value) -> validated rows for saving; throws 400 with `field`
 *       ('educational_background' | 'work_experience') and `row` / `key`. A string (raw JSON or text) is refused:
 *       the API takes a list of rows. A list of plain strings is accepted as legacy rows (an older form).
 */
const MAX_ROWS = 20;
const EDU_KEYS = ['degree', 'institution', 'year', 'result'];
const EXP_KEYS = ['title', 'company', 'from', 'to', 'description'];
const EDU_LEN = { degree: 160, institution: 160, year: 4, result: 60 };
const EXP_LEN = { title: 160, company: 160, from: 7, to: 7, description: 500 };
const ALIASES = {
  degree: ['degree', 'certificate', 'qualification', 'name', 'title', 'course', 'text'],
  institution: ['institution', 'school', 'university', 'college', 'board', 'place'],
  year: ['year', 'passing_year', 'passed', 'graduated'],
  result: ['result', 'grade', 'gpa', 'cgpa', 'division'],
  title: ['title', 'job_title', 'position', 'designation', 'role', 'name', 'text'],
  company: ['company', 'employer', 'organization', 'organisation', 'place'],
  from: ['from', 'start', 'start_date', 'from_date'],
  to: ['to', 'end', 'end_date', 'to_date'],
  description: ['description', 'details', 'summary', 'notes'],
};

const httpError = (status, message, extra = {}) => Object.assign(new Error(message), { status, ...extra });
const str = (v) => (v === undefined || v === null ? '' : String(v).trim());

function parse(value) {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return [value];
  const text = String(value).trim();
  if (!text) return [];
  if (/^[[{"]/.test(text)) {
    try { const p = JSON.parse(text); return parse(p); } catch { /* not JSON: plain text below */ }
  }
  return [text];
}

function toRow(item, keys) {
  if (item === null || item === undefined) return null;
  if (typeof item !== 'object') {
    const text = str(item);
    return text ? Object.fromEntries(keys.map((k, i) => [k, i === 0 ? text : ''])) : null;
  }
  const row = {};
  const used = new Set();
  for (const k of keys) {
    const hit = ALIASES[k].find((a) => !used.has(a) && str(item[a]));
    row[k] = hit ? str(item[hit]) : '';
    if (hit) used.add(hit);
  }
  // Values under keys we do not know are added to the first field, so nothing is dropped.
  const extra = Object.entries(item).filter(([k, v]) => !used.has(k) && str(v) && typeof v !== 'object').map(([, v]) => str(v));
  if (extra.length) row[keys[0]] = [row[keys[0]], ...extra].filter(Boolean).join(', ');
  return keys.some((k) => row[k]) ? row : null;
}

const read = (keys) => (value) => parse(value).map((i) => toRow(i, keys)).filter(Boolean);
const readEducation = read(EDU_KEYS);
const readExperience = read(EXP_KEYS);

function cleaner(field, keys, LEN, check) {
  return (value) => {
    if (value === undefined) return undefined; // not sent: leave the stored rows alone
    if (value === null) return [];
    if (!Array.isArray(value)) throw httpError(400, 'Send the rows as a list, not as text', { field });
    if (value.length > MAX_ROWS) throw httpError(400, `At most ${MAX_ROWS} rows`, { field });
    const rows = [];
    value.forEach((item, i) => {
      if (typeof item === 'string') { const r = toRow(item, keys); if (r) rows.push(r); return; }
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw httpError(400, `Row ${i + 1} is not a row`, { field, row: i });
      const row = Object.fromEntries(keys.map((k) => [k, str(item[k])]));
      if (keys.every((k) => !row[k])) return; // an empty row is dropped
      for (const k of keys) {
        if (row[k].length > LEN[k]) throw httpError(400, `Row ${i + 1}: keep ${k} to ${LEN[k]} characters`, { field, row: i, key: k });
      }
      check(row, i);
      rows.push(row);
    });
    return rows;
  };
}

const cleanEducation = cleaner('educational_background', EDU_KEYS, EDU_LEN, (row, i) => {
  const field = 'educational_background';
  if (!row.degree) throw httpError(400, `Row ${i + 1}: enter the degree or certificate`, { field, row: i, key: 'degree' });
  if (row.year && (!/^\d{4}$/.test(row.year) || Number(row.year) < 1950 || Number(row.year) > 2100)) {
    throw httpError(400, `Row ${i + 1}: the year is four digits, e.g. 2020`, { field, row: i, key: 'year' });
  }
});

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const cleanExperience = cleaner('work_experience', EXP_KEYS, { ...EXP_LEN, to: 7 }, (row, i) => {
  const field = 'work_experience';
  if (!row.title) throw httpError(400, `Row ${i + 1}: enter the job title`, { field, row: i, key: 'title' });
  if (row.from && !MONTH.test(row.from)) throw httpError(400, `Row ${i + 1}: "from" is a month, e.g. 2021-03`, { field, row: i, key: 'from' });
  if (row.to && row.to !== 'present' && !MONTH.test(row.to)) throw httpError(400, `Row ${i + 1}: "to" is a month or "present"`, { field, row: i, key: 'to' });
  if (row.from && MONTH.test(row.to) && row.to < row.from) throw httpError(400, `Row ${i + 1}: "to" is before "from"`, { field, row: i, key: 'to' });
});

module.exports = { readEducation, readExperience, cleanEducation, cleanExperience, MAX_ROWS, EDU_KEYS, EXP_KEYS };
