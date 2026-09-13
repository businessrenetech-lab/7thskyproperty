import React, { Suspense } from "react";
import ServicesDirectoryClient from "./ServicesDirectoryClient";

export const metadata = {
  title: "Services | Seventh Sky Property Care & Management",
  description:
    "Explore full-spectrum property management, interior design, facility care, AC solutions, water tank sanitisation, and legal verification.",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Property Care & Real Estate Services | Seventh Sky Properties",
    description:
      "Engineered property care, interior design, tenant placement, and asset protection for modern homeowners and expatriate NRBs.",
    url: "/services",
  },
};

export default function ServicesPage({ searchParams }) {
  const initialCategory = typeof searchParams?.category === "string" ? searchParams.category : "all";

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">Loading services...</div>}>
      <ServicesDirectoryClient initialCategory={initialCategory} />
    </Suspense>
  );
}
