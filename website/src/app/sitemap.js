import { getApiBase } from "@/lib/api";
import { fetchPublicJson } from "@/lib/serverApi";
import { normalizeListingsResponse, SITE_URL } from "@/lib/shortStay";

export const dynamic = "force-dynamic";


async function getCourses() {
  try {
    const res = await fetch(`${getApiBase()}/api/public/courses`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  } catch { return []; }
}

async function getBlogs() {
  try {
    const res = await fetch(`${getApiBase()}/api/public/blog`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  } catch { return []; }
}

async function getBranches() {
  try {
    const res = await fetch(`${getApiBase()}/api/public/branches`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  } catch { return []; }
}

async function getShortStays() {
  const payload = await fetchPublicJson("/api/public/short-stay/listings?limit=100", { fallback: [] });
  return normalizeListingsResponse(payload).listings;
}

export default async function sitemap() {
  const courses = await getCourses();
  const blogs = await getBlogs();
  const branches = await getBranches();
  const shortStays = await getShortStays();

  const staticRoutes = [
    { url: `${SITE_URL}`, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/short-stays`, lastModified: new Date(), changeFrequency: "daily", priority: 0.95 },
    { url: `${SITE_URL}/courses`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/blog/best-pte-coaching-centre-in-dhaka`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/branches`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/trial-class`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
  ];

  const courseRoutes = courses.map((course) => ({
    url: `${SITE_URL}/courses/${course.slug}`,
    lastModified: course.updated_at ? new Date(course.updated_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  const blogRoutes = blogs.map((blog) => ({
    url: `${SITE_URL}/blog/${blog.slug}`,
    lastModified: blog.updated_at ? new Date(blog.updated_at) : new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const branchRoutes = branches
    .filter((branch) => branch.is_active)
    .map((branch) => ({
      url: `${SITE_URL}/branches/${branch.slug || branch.id}`,
      lastModified: branch.updated_at ? new Date(branch.updated_at) : new Date(),
      changeFrequency: "weekly",
      priority: branch.type === "head" ? 0.85 : 0.75,
    }));

  const shortStayRoutes = shortStays.map((listing) => ({
    url: `${SITE_URL}/short-stays/${listing.slug}`,
    lastModified: listing.updatedAt ? new Date(listing.updatedAt) : new Date(),
    changeFrequency: "daily",
    priority: listing.featured ? 0.9 : 0.8,
  }));

  const allRoutes = [...staticRoutes, ...courseRoutes, ...blogRoutes, ...branchRoutes, ...shortStayRoutes];
  const uniqueRoutes = [];
  const visitedUrls = new Set();

  for (const route of allRoutes) {
    if (!visitedUrls.has(route.url)) {
      visitedUrls.add(route.url);
      uniqueRoutes.push(route);
    }
  }

  return uniqueRoutes;
}
