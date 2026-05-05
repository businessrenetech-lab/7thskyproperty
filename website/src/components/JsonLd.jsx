/**
 * Reusable JSON-LD structured data component for SEO & AI search visibility.
 * Usage: <JsonLd data={{ "@context": "https://schema.org", ... }} />
 */
export default function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/* ─── Pre-built Schema Generators ──────────────────────────── */

export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["EducationalOrganization", "LocalBusiness"],
    "@id": "https://languageacademy.com.bd/#organization",
    "name": "Language Academy Bangladesh",
    "alternateName": ["Language Academy", "Language Academy BD", "LA Bangladesh"],
    "description": "Language Academy Bangladesh is a world-class PTE centre in Dhaka, offering PTE Academic preparation as its core focus with IELTS and English language courses also available.",
    "url": "https://languageacademy.com.bd",
    "logo": "https://languageacademy.com.bd/logo.png",
    "image": "https://languageacademy.com.bd/hero_banner.png",
    "telephone": "+880-1913-373581",
    "email": "hello@languageacademy.com.bd",
    "priceRange": "৳৳",
    "currenciesAccepted": "BDT",
    "paymentAccepted": "Cash, Card, bKash, Nagad",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "SEL SUFI SQUARE, Unit: 1104, Level: 11, Plot: 58, Road: 16 (New) / 27 (Old), Dhanmondi R/A",
      "addressLocality": "Dhaka",
      "addressRegion": "Dhaka Division",
      "postalCode": "1209",
      "addressCountry": "BD"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 23.7461,
      "longitude": 90.3742
    },
    "areaServed": [
      { "@type": "City", "name": "Dhaka" },
      { "@type": "Country", "name": "Bangladesh" }
    ],
    "serviceArea": {
      "@type": "GeoShape",
      "name": "Bangladesh (Online classes available nationwide)"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Language Courses",
      "itemListElement": [
        { "@type": "OfferCatalog", "name": "PTE Academic Preparation" },
        { "@type": "OfferCatalog", "name": "IELTS Preparation" },
        { "@type": "OfferCatalog", "name": "Spoken English" },
        { "@type": "OfferCatalog", "name": "Study Abroad Consulting" }
      ]
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
        "opens": "09:00",
        "closes": "20:00"
      }
    ],
    "sameAs": [
      "https://www.facebook.com/languageacademybangladesh",
      "https://instagram.com/languageacademy.bd/",
      "https://linkedin.com/company/languageacademybangladesh",
      "https://tiktok.com/@languageacademybangladesh"
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "156",
      "bestRating": "5"
    },
    "founder": {
      "@type": "Person",
      "name": "Language Academy Team"
    },
    "foundingDate": "2023",
    "knowsAbout": [
      "PTE Academic exam preparation",
      "IELTS exam preparation",
      "Spoken English training",
      "English proficiency coaching",
      "Study abroad consulting Bangladesh"
    ],
    "slogan": "Best PTE Centre in Dhaka, Bangladesh"
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://languageacademy.com.bd/#website",
    "name": "Language Academy Bangladesh",
    "alternateName": "Language Academy",
    "url": "https://languageacademy.com.bd",
    "description": "Best PTE Centre in Dhaka, Bangladesh. World-class PTE preparation with IELTS and English language courses also available.",
    "publisher": { "@id": "https://languageacademy.com.bd/#organization" },
    "inLanguage": ["en", "bn"],
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://languageacademy.com.bd/courses?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };
}

export function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      "item": item.url,
    }))
  };
}

export function courseSchema(course) {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": course.title,
    "description": course.description || course.short_description,
    "url": `https://languageacademy.com.bd/courses/${course.slug}`,
    "provider": {
      "@type": "EducationalOrganization",
      "@id": "https://languageacademy.com.bd/#organization",
      "name": "Language Academy Bangladesh",
      "sameAs": "https://languageacademy.com.bd"
    },
    "educationalLevel": course.level || "All Levels",
    "courseCode": course.slug,
    "numberOfCredits": course.duration_weeks || undefined,
    "timeRequired": course.duration_weeks ? `P${course.duration_weeks}W` : undefined,
    "teaches": course.category,
    "inLanguage": "en",
    "availableLanguage": ["English", "Bengali"],
    "courseMode": ["Blended", "Online", "Onsite"],
    "offers": {
      "@type": "Offer",
      "price": course.base_fee || 0,
      "priceCurrency": "BDT",
      "availability": "https://schema.org/InStock",
      "url": `https://languageacademy.com.bd/enroll?course=${course.slug}`,
      "validFrom": new Date().toISOString().split("T")[0],
    },
    "hasCourseInstance": course.Batches?.map(batch => ({
      "@type": "CourseInstance",
      "name": batch.name,
      "startDate": batch.start_date,
      "courseMode": "Blended",
      "location": {
        "@type": "Place",
        "name": "Language Academy Bangladesh - Dhanmondi Campus",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "SEL SUFI SQUARE, Unit: 1104, Level: 11",
          "addressLocality": "Dhaka",
          "addressCountry": "BD"
        }
      },
      "instructor": course.instructor_name ? {
        "@type": "Person",
        "name": course.instructor_name
      } : undefined,
    })) || [],
    "image": course.image_url || "https://languageacademy.com.bd/hero_banner.png",
  };
}

export function faqSchema(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(([question, answer]) => ({
      "@type": "Question",
      "name": question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": answer,
      }
    }))
  };
}

export function courseListSchema(courses) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Language Academy Courses",
    "description": "PTE-focused courses in Dhaka, with IELTS preparation and English language courses also available",
    "numberOfItems": courses.length,
    "itemListElement": courses.map((course, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": course.title,
      "url": `https://languageacademy.com.bd/courses/${course.slug}`,
      "item": {
        "@type": "Course",
        "name": course.title,
        "description": course.short_description || course.description,
        "provider": { "@type": "EducationalOrganization", "name": "Language Academy Bangladesh" },
        "offers": { "@type": "Offer", "price": course.base_fee || 0, "priceCurrency": "BDT" },
      }
    }))
  };
}
