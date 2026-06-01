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
    default: "PTE Coaching Centre Dhaka | PTE Practice Online & IELTS Course — Language Academy",
    template: "%s | Language Academy Bangladesh",
  },
  description:
    "Best PTE coaching centre in Dhaka, Bangladesh. PTE practice online with AI mock tests, expert trainers & small batches. IELTS preparation, online PTE course & study abroad consulting. Enroll now!",
  keywords: [
    "PTE coaching centre Dhaka",
    "PTE practice online",
    "best PTE coaching",
    "PTE course",
    "online PTE course",
    "PTE centre Dhaka Bangladesh",
    "IELTS coaching Dhaka",
    "IELTS preparation Bangladesh",
    "study abroad Bangladesh",
    "PTE Academic preparation Dhaka",
    "PTE mock test online Bangladesh",
    "best IELTS coaching centre Bangladesh",
    "Spoken English course Dhaka",
    "Language Academy Bangladesh",
    "PTE classes online Bangladesh",
    "PTE coaching near me Dhanmondi",
    "PTE vs IELTS Bangladesh",
    "PTE score for Australia migration",
    "study abroad from Bangladesh Australia Canada UK",
    "English proficiency test preparation Dhaka",
    "PTE training centre Dhaka",
    "IELTS 7 band preparation Bangladesh",
    "PTE score requirement Australia PR",
    "best PTE coaching centre in Dhaka",
    "PTE exam preparation Bangladesh",
    "affordable PTE coaching Dhaka",
    "PTE weekend batch Dhaka",
    "PTE online classes with AI feedback",
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

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://languageacademy.com.bd",
    siteName: "Language Academy Bangladesh",
    title: "PTE Coaching Centre Dhaka | PTE Practice Online & IELTS Course — Language Academy",
    description:
      "Best PTE coaching centre in Dhaka. PTE practice online with AI mock tests, expert trainers & IELTS preparation. Online PTE course available. Enroll today!",
    images: [
      {
        url: "/hero_banner.webp",
        width: 1200,
        height: 630,
        alt: "PTE Coaching Centre Dhaka - Language Academy Bangladesh",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "PTE Coaching Centre Dhaka | PTE Practice Online & IELTS — Language Academy",
    description:
      "Best PTE coaching in Dhaka with AI mock tests, expert trainers, small batches & online PTE courses. IELTS & study abroad support. Enroll now!",
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
    "DC.title": "PTE Coaching Centre Dhaka | PTE Practice Online & IELTS Course — Language Academy Bangladesh",
    "DC.creator": "Language Academy Bangladesh",
    "DC.subject": "PTE Coaching Centre, PTE Practice Online, PTE Course, Online PTE Course, IELTS Coaching, Study Abroad, Dhaka Bangladesh",
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
