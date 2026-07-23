import "./globals.css";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";

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
    default: "Seventh Sky Properties | Premium Property Care & Rental Management Bangladesh",
    template: "%s | Seventh Sky Properties",
  },
  description:
    "Premium property care, tenant placement, rent collection, facility management, and landlord services in Dhaka, Bangladesh.",
  keywords: [
    "property care dhaka",
    "rental management bangladesh",
    "property management dhaka",
    "tenant placement bangladesh",
    "landlord services dhaka",
    "dhaka real estate care",
    "rent collection services bangladesh",
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
    title: "Seventh Sky Properties | Premium Property Care & Rental Management Bangladesh",
    description:
      "Premium property care, tenant placement, rent collection, and facility management services in Dhaka, Bangladesh.",
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
    title: "Seventh Sky Properties | Premium Property Care & Rental Management Bangladesh",
    description:
      "Premium property care, tenant placement, rent collection, and facility management services in Dhaka, Bangladesh.",
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
        {/* Simple Header */}
        <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-extrabold text-white">
                S7
              </div>
              <span className="text-lg font-bold tracking-tight text-white">Seventh Sky Properties</span>
            </div>
            <a href="tel:+8801913373581" className="text-xs sm:text-sm font-semibold text-blue-400 hover:text-blue-300">
              Call: +880 1913-373581
            </a>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">{children}</main>

        {/* Simple Footer */}
        <footer className="border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© {new Date().getFullYear()} Seventh Sky Properties. All rights reserved.</p>
            <div className="flex gap-4">
              <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
              <span className="hover:text-slate-400 cursor-pointer">Terms of Service</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
