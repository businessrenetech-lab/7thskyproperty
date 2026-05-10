import { headers } from "next/headers";
import { getApiBase } from "./api";

function getRequestApiBase() {
  const requestHeaders = headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  if (!host) return "";

  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${protocol}://${host}`;
}

export async function fetchPublicJson(path, options = {}) {
  const { fallback = null, requireNonEmptyArray = false } = options;
  const bases = [getApiBase(), getRequestApiBase()].filter(Boolean);
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
