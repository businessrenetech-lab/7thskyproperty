/**
 * Returns the internal API base URL for server-side fetches.
 * Server rendering must use the API configured for the current environment.
 */
export function getApiBase() {
  const base = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_ORIGIN;
  if (!base) throw new Error('INTERNAL_API_URL or NEXT_PUBLIC_API_ORIGIN must be configured.');
  return base.replace(/\/+$/, '');
}

/**
 * Builds a browser-safe public API URL. An empty public base intentionally uses
 * same-origin requests so the Next.js production rewrite can proxy the API.
 */
export function getClientApiUrl(path) {
  const requestPath = String(path || '').startsWith('/') ? String(path) : `/${path}`;
  let base = String(
    process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_ORIGIN || ''
  ).trim().replace(/\/+$/, '');

  if (!base) return requestPath;
  if (/\/api$/i.test(base) && requestPath.startsWith('/api/')) {
    base = base.replace(/\/api$/i, '');
  }
  return `${base}${requestPath}`;
}
