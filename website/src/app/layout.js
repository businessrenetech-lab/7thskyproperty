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
    default: "Language Academy | Best PTE Coaching Centre in Bangladesh",
    template: "%s | Language Academy Bangladesh",
  },
  description:
    "Language Academy is the best PTE coaching centre in Dhaka, Bangladesh. Expert-led PTE Academic, IELTS preparation, and Spoken English courses — online & offline. 94% target-score success rate.",
  keywords: [
    "best PTE coaching centre Bangladesh",
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
    icon: [{ url: "/logo.png", type: "image/png" }],
    shortcut: ["/logo.png"],
    apple: [{ url: "/logo.png", type: "image/png" }],
  },

  alternates: {
    canonical: "https://languageacademy.com.bd",
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://languageacademy.com.bd",
    siteName: "Language Academy Bangladesh",
    title: "Language Academy | Best PTE & IELTS Coaching in Dhaka, Bangladesh",
    description:
      "Expert-led PTE Academic, IELTS, and Spoken English courses in Dhaka. Online & offline classes with 94% target-score success rate. Book a free consultation today.",
    images: [
      {
        url: "/hero_banner.png",
        width: 1200,
        height: 630,
        alt: "Language Academy Bangladesh — Best PTE Coaching Centre in Dhaka",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Language Academy | Best PTE Coaching Centre in Bangladesh",
    description:
      "Expert-led PTE, IELTS, and Spoken English courses in Dhaka. 94% success rate. Online & offline.",
    images: ["/hero_banner.png"],
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
    "DC.title": "Language Academy — Best PTE Coaching Centre in Bangladesh",
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
