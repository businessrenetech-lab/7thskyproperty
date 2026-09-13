import "./globals.css";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import Link from "next/link";
import HeaderNav from "@/components/HeaderNav";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-inter", 
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

/* ─── Seventh Sky Metadata ─────────────────────────────────── */
export const metadata = {
  metadataBase: new URL("https://seventhskybd.com"),

  title: {
    default: "Seventh Sky Properties | Premium Property Care & Rental Management",
    template: "%s | Seventh Sky Properties",
  },
  description:
    "Premium property care, tenant placement, rent collection, facility management, and landlord services.",
  keywords: [
    "property care",
    "rental management",
    "property management",
    "tenant placement",
    "landlord services",
    "real estate care",
    "rent collection services",
  ],

  authors: [{ name: "Seventh Sky Properties", url: "https://seventhskybd.com" }],
  creator: "Seventh Sky Properties",
  publisher: "Seventh Sky Properties",

  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },

  icons: {
    icon: [{ url: "/logo.webp", type: "image/webp" }],
    shortcut: ["/logo.webp"],
    apple: [{ url: "/logo.webp", type: "image/webp" }],
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://seventhskybd.com",
    siteName: "Seventh Sky Properties",
    title: "Seventh Sky Properties | Premium Property Care & Rental Management",
    description:
      "Premium property care, tenant placement, rent collection, and facility management services.",
    images: [
      {
        url: "/hero_banner.webp",
        width: 1200,
        height: 630,
        alt: "Seventh Sky Properties",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Seventh Sky Properties | Premium Property Care & Rental Management",
    description:
      "Premium property care, tenant placement, rent collection, and facility management services.",
    images: ["/hero_banner.webp"],
  },

  robots: {
    index: true,
    follow: true,
  },

  category: "real estate",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${outfit.variable}`}>
      <body className={`${jakarta.className} bg-slate-900 text-slate-100 min-h-screen flex flex-col`}>
        {/* Header */}
        <header className="border-b border-slate-800 bg-slate-950/85 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-extrabold text-white shadow-md shadow-blue-600/20">
                S7
              </div>
              <span className="hidden text-lg font-bold tracking-tight text-white sm:inline">Seventh Sky Properties</span>
              <span className="text-base font-bold tracking-tight text-white sm:hidden">Seventh Sky</span>
            </Link>

            <HeaderNav />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">{children}</main>

        {/* Comprehensive Footer */}
        <footer className="border-t border-slate-800 bg-slate-950 text-slate-400 text-xs">
          <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-extrabold text-white text-xs">
                  S7
                </div>
                <span className="font-bold text-white text-sm">Seventh Sky Properties</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Institutional property care, rental folios, turnkey interior design, and facility engineering.
              </p>
              <div className="text-[11px] text-slate-400 pt-1">
                SEL Sufi Square, Unit 1104, Level 11, Corporate Headquarters
              </div>
              <div className="text-[11px] text-blue-400 font-medium">
                Direct: +880 1913-373581 | WhatsApp Available
              </div>
            </div>

            {/* Property Care Services */}
            <div>
              <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-3">
                Property Care & Fit-Out
              </h5>
              <ul className="space-y-2 text-[11px]">
                <li>
                  <Link href="/services/interior-design" className="hover:text-blue-400 transition">
                    Interior Design & Turnkey Renovation
                  </Link>
                </li>
                <li>
                  <Link href="/services/water-tank" className="hover:text-blue-400 transition">
                    Water Tank Cleaning & Sanitisation
                  </Link>
                </li>
                <li>
                  <Link href="/services/air-conditioning" className="hover:text-blue-400 transition">
                    Air Conditioning Servicing & AMC
                  </Link>
                </li>
                <li>
                  <Link href="/services/removal-relocation" className="hover:text-blue-400 transition">
                    Home & Office Relocation
                  </Link>
                </li>
                <li>
                  <Link href="/services?category=care-maintenance" className="hover:text-blue-400 transition text-blue-400 font-semibold">
                    View All Maintenance Services →
                  </Link>
                </li>
              </ul>
            </div>

            {/* Tenancy & Legal */}
            <div>
              <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-3">
                Asset & Tenancy Management
              </h5>
              <ul className="space-y-2 text-[11px]">
                <li>
                  <Link href="/services/property-management" className="hover:text-blue-400 transition">
                    Residential Tenancy & Rent Collection
                  </Link>
                </li>
                <li>
                  <Link href="/services/property-care-concierge" className="hover:text-blue-400 transition">
                    NRB Expat Keyholding & Concierge
                  </Link>
                </li>
                <li>
                  <Link href="/services/property-documentation-verification" className="hover:text-blue-400 transition">
                    Title Search & Deed Vetting
                  </Link>
                </li>
                <li>
                  <Link href="/services/land-property-assessment" className="hover:text-blue-400 transition">
                    Land Survey & Mouza Mapping
                  </Link>
                </li>
                <li>
                  <Link href="/short-stays" className="hover:text-blue-400 transition">
                    Serviced Apartments & Short Stays
                  </Link>
                </li>
              </ul>
            </div>

            {/* Coverage & Direct Access */}
            <div>
              <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-3">
                Coverage & Service Enclaves
              </h5>
              <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                Prime Residential Enclaves • Diplomatic Zones • Commercial Districts • Luxury Residential Towers • Waterfront Properties
              </p>
              <div className="pt-2 border-t border-slate-900 flex flex-col gap-2">
                <Link
                  href="/services"
                  className="rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2 text-center text-[11px] font-semibold text-white hover:border-slate-700 transition"
                >
                  Explore All Care Services
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-900/80 py-6 px-6">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
              <p>© {new Date().getFullYear()} Seventh Sky Properties. All rights reserved.</p>
              <div className="flex gap-4">
                <Link href="/services" className="hover:text-slate-300">Services</Link>
                <Link href="/short-stays" className="hover:text-slate-300">Short Stays</Link>
                <span className="hover:text-slate-300 cursor-pointer">Privacy Policy</span>
                <span className="hover:text-slate-300 cursor-pointer">Terms of Service</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
