function toMinor(value) {
  if (value == null || value === '') return 0;
  const raw = typeof value === 'number' ? value.toFixed(2) : String(value).trim();
  const match = raw.match(/^(-)?(\d+)(?:\.(\d+))?$/);
  if (!match) throw Object.assign(new Error(`Invalid money value: ${value}`), { status: 400 });
  const sign = match[1] ? -1 : 1;
  const fraction = `${match[3] || ''}00`;
  const cents = Number(fraction.slice(0, 2));
  const third = Number(fraction[2] || 0);
  return sign * (Number(match[2]) * 100 + cents + (third >= 5 ? 1 : 0));
}

function fromMinor(value) {
  return Number((Number(value || 0) / 100).toFixed(2));
}

function decimalFromMinor(value) {
  const minor = Number(value || 0);
  const sign = minor < 0 ? '-' : '';
  const absolute = Math.abs(minor);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
}

function sumMinor(items, selector = (item) => item) {
  return items.reduce((sum, item) => sum + toMinor(selector(item)), 0);
}

module.exports = { toMinor, fromMinor, decimalFromMinor, sumMinor };
