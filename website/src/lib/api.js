/**
 * Returns the internal API base URL for server-side fetches.
 * In production, the API runs on the same process, so we use localhost.
 * In development, it goes through the gateway on port 3000.
 */
export function getApiBase() {
  if (process.env.INTERNAL_API_URL) return process.env.INTERNAL_API_URL;
  if (process.env.NODE_ENV !== 'production') return 'http://127.0.0.1:3000';

  const port = process.env.PORT || 3000;
  return `http://127.0.0.1:${port}`;
}
