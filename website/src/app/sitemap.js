import { getApiBase } from "@/lib/api";

const SITE_URL = "https://languageacademy.com.bd";

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

export default async function sitemap() {
  const courses = await getCourses();
  const blogs = await getBlogs();
  const branches = await getBranches();

  const staticRoutes = [
    { url: `${SITE_URL}`, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/courses`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/branches`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/enroll`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/materials`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
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

  return [...staticRoutes, ...courseRoutes, ...blogRoutes, ...branchRoutes];
}
