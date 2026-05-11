import "./globals.css";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import FacebookPixel from "@/components/FacebookPixel";
import JsonLd, { localBusinessSchema, websiteSchema, breadcrumbSchema } from "@/components/JsonLd";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-inter", // Re-using variable name to limit CSS changes
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

/* ─── Global Metadata (Next.js App Router) ─────────────────── */
export const metadata = {
  metadataBase: new URL("https://languageacademy.com.bd"),

  title: {
    default: "Language Academy Bangladesh | Best PTE Centre in Dhaka, Bangladesh",
    template: "%s | Language Academy Bangladesh",
  },
  description:
    "Language Academy Bangladesh is a world-class PTE centre in Dhaka. Prepare smarter with expert trainers, unlimited mock tests, small batches, and IELTS and English language courses.",
  keywords: [
    "best PTE centre Dhaka Bangladesh",
    "PTE coaching Dhaka",
    "PTE Academic preparation",
    "IELTS coaching Dhaka",
    "IELTS preparation Bangladesh",
    "Spoken English course Dhaka",
    "Language Academy Bangladesh",
    "English language centre Dhaka",
    "PTE classes online Bangladesh",
    "best IELTS coaching Bangladesh",
    "PTE mock test Dhaka",
    "study abroad Bangladesh",
    "English proficiency test preparation",
    "Dhanmondi language school",
    "PTE coaching near me",
  ],

  authors: [{ name: "Language Academy Bangladesh", url: "https://languageacademy.com.bd" }],
  creator: "Language Academy Bangladesh",
  publisher: "Language Academy Bangladesh",

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

  alternates: {
    canonical: "https://languageacademy.com.bd",
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://languageacademy.com.bd",
    siteName: "Language Academy Bangladesh",
    title: "Language Academy Bangladesh | Best PTE Centre in Dhaka, Bangladesh",
    description:
      "World-class PTE preparation in Dhaka with expert trainers, unlimited mock tests, small batches, and IELTS and English language courses also available.",
    images: [
      {
        url: "/hero_banner.webp",
        width: 1200,
        height: 630,
        alt: "Language Academy Bangladesh - Best PTE Centre in Dhaka",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Language Academy Bangladesh | Best PTE Centre in Dhaka, Bangladesh",
    description:
      "World-class PTE preparation in Dhaka with IELTS and English language courses also available.",
    images: ["/hero_banner.webp"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  category: "education",
  classification: "Language School",

  other: {
    "geo.region": "BD-13",
    "geo.placename": "Dhaka, Bangladesh",
    "geo.position": "23.7461;90.3742",
    "ICBM": "23.7461, 90.3742",
    "rating": "General",
    "revisit-after": "7 days",
    "DC.title": "Language Academy Bangladesh - Best PTE Centre in Dhaka, Bangladesh",
    "DC.creator": "Language Academy Bangladesh",
    "DC.subject": "PTE Coaching, IELTS Preparation, Spoken English, Dhaka",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${outfit.variable}`}>
      <head>
        {/* ── Structured Data for AI + Search Engines ─── */}
        <JsonLd data={localBusinessSchema()} />
        <JsonLd data={websiteSchema()} />
        <JsonLd data={breadcrumbSchema([
          { name: "Home", url: "https://languageacademy.com.bd" },
        ])} />
      </head>
      <body className={`${jakarta.className} bg-background text-foreground`}>
        <div className="page-shell flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1 pt-[124px] md:pt-[138px]">{children}</main>
          <Footer />
        </div>
        <WhatsAppButton />
        <FacebookPixel />
      </body>
    </html>
  );
}
