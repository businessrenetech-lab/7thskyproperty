import { getApiBase } from "./api";

export async function fetchPublicJson(path, options = {}) {
  const { fallback = null, requireNonEmptyArray = false } = options;
  const base = getApiBase();
  try {
    const res = await fetch(`${base}${path}`, { cache: "no-store" });
    if (!res.ok) return fallback;
    const data = await res.json();
    if (requireNonEmptyArray && Array.isArray(data) && data.length === 0) return fallback;
    return data;
  } catch (error) {
    console.error(`Error fetching ${path} from ${base}:`, error);
  }
  return fallback;
}
