import { getApiBase } from "./api";

const PUBLIC_API_FALLBACK =
  process.env.NEXT_PUBLIC_API_URL
  || process.env.NEXT_PUBLIC_SITE_URL
  || process.env.PUBLIC_SITE_URL
  || "https://darkslateblue-cormorant-104679.hostingersite.com";

export async function fetchPublicJson(path, options = {}) {
  const { fallback = null, requireNonEmptyArray = false } = options;
  const bases = [getApiBase(), PUBLIC_API_FALLBACK].filter(Boolean);
  const uniqueBases = [...new Set(bases.map((base) => base.replace(/\/$/, "")))];

  for (const base of uniqueBases) {
    try {
      const res = await fetch(`${base}${path}`, { cache: "no-store" });
      if (!res.ok) continue;

      const data = await res.json();
      if (requireNonEmptyArray && Array.isArray(data) && data.length === 0) continue;
      return data;
    } catch (error) {
      console.error(`Error fetching ${path} from ${base}:`, error);
    }
  }

  return fallback;
}
