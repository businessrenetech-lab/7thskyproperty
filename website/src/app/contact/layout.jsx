import JsonLd, { faqSchema, breadcrumbSchema } from "@/components/JsonLd";

export const metadata = {
  title: "Contact Us — Book a Free PTE & IELTS Consultation in Dhaka",
  description:
    "Get in touch with Language Academy Bangladesh, a world-class PTE centre in Dhaka. Visit our Dhanmondi campus, call +880 1913-373581, or book a free consultation for PTE, IELTS, and English language courses.",
  alternates: { canonical: "https://languageacademy.com.bd/contact" },
  openGraph: {
    title: "Contact Language Academy — Free PTE & IELTS Consultation",
    description: "Visit our Dhanmondi campus or book a free online consultation. Phone: +880 1913-373581",
    url: "https://languageacademy.com.bd/contact",
    images: [{ url: "/hero_banner.webp", width: 1200, height: 630, alt: "Contact Language Academy Dhaka" }],
  },
};

const contactFaqs = [
  ["How quickly will you respond?", "Our team typically responds within 2-4 hours during business hours. For urgent queries, call us directly or message us on WhatsApp."],
  ["Can I visit the campus before enrolling?", "Absolutely! We encourage campus visits. Book a consultation and we'll give you a full tour of our facilities."],
  ["Do you offer online consultations?", "Yes. We offer both in-person and online consultations via Zoom. Choose whichever is convenient for you."],
  ["What documents do I need for enrollment?", "Just a valid ID (NID or passport), a recent photo, and your previous test scores (if any). We'll guide you through everything."],
];

export default function ContactLayout({ children }) {
  return (
    <>
      <JsonLd data={faqSchema(contactFaqs)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: "https://languageacademy.com.bd" },
        { name: "Contact", url: "https://languageacademy.com.bd/contact" },
      ])} />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "ContactPage",
        "name": "Contact Language Academy Bangladesh",
        "description": "Get in touch with Language Academy Bangladesh for PTE preparation, IELTS, and English language courses in Dhaka.",
        "url": "https://languageacademy.com.bd/contact",
        "mainEntity": {
          "@type": "LocalBusiness",
          "name": "Language Academy Bangladesh",
          "telephone": "+880-1913-373581",
          "email": "info@languageacademy.com.bd",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "SEL SUFI SQUARE, Unit: 1104, Level: 11, Plot: 58, Road: 16 (New) / 27 (Old), Dhanmondi R/A",
            "addressLocality": "Dhaka",
            "postalCode": "1209",
            "addressCountry": "BD"
          },
          "openingHoursSpecification": {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
            "opens": "09:00",
            "closes": "20:00"
          }
        }
      }} />
      {children}
    </>
  );
}
