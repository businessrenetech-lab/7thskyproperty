export const COURSE_FALLBACKS = [
  {
    id: 3,
    title: "PTE Basic",
    slug: "pte-basic",
    category: "PTE",
    level: "beginner",
    base_fee: 5500,
    duration_weeks: 2,
    image_url: null,
    short_description: "2 Weeks, 4 classes. Unlimited mock test included.",
    description: "Perfect for students who need a quick refresher. Covers the PTE format over 4 specialized classes, and includes access to our unlimited mock test platform.",
    what_you_will_learn: [
      "Understand the PTE exam format",
      "Refresh speaking, writing, reading, and listening modules",
      "Build time management strategies",
      "Use unlimited mock tests for confidence building",
    ],
    modules: [
      { title: "Week 1: Foundations", lessons: [{ title: "Speaking & Writing format", duration: "90m" }, { title: "Reading & Listening format", duration: "90m" }] },
      { title: "Week 2: Practice", lessons: [{ title: "Timed practice and review", duration: "90m" }, { title: "Mock test strategy", duration: "90m" }] },
    ],
  },
  {
    id: 4,
    title: "PTE Core",
    slug: "pte-core",
    category: "PTE",
    level: "intermediate",
    base_fee: 10500,
    duration_weeks: 4,
    image_url: null,
    short_description: "4 Weeks, 8 classes with unlimited mock test and class access.",
    description: "Our standard PTE preparation track for strategy, templates, fluency, and regular mock practice.",
  },
  {
    id: 5,
    title: "PTE Advanced",
    slug: "pte-advanced",
    category: "PTE",
    level: "advanced",
    base_fee: 18000,
    duration_weeks: 8,
    image_url: null,
    short_description: "8 Weeks, 16 classes for students targeting a 79+ score.",
    description: "Advanced PTE preparation with deeper practice across speaking, writing, reading, and listening.",
  },
  {
    id: 6,
    title: "PTE Premium",
    slug: "pte-premium",
    category: "PTE",
    level: "advanced",
    base_fee: 25000,
    duration_weeks: 12,
    image_url: null,
    short_description: "12 Weeks, 24 classes with complete mock and class access.",
    description: "A complete PTE preparation package for students who need structured support from fundamentals to advanced scoring.",
  },
];

export function getFallbackCourse(slugOrId) {
  const value = String(slugOrId || "").trim();
  return COURSE_FALLBACKS.find((course) => course.slug === value || String(course.id) === value) || null;
}
