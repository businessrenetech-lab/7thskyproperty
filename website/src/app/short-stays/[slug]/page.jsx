import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  Check,
  Clock3,
  ExternalLink,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import BookingRequestForm from "@/components/BookingRequestForm";
import ShortStayImage from "@/components/ShortStayImage";
import { fetchPublicJson } from "@/lib/serverApi";
import { absoluteUrl, formatMoney, normalizeListing, SITE_URL } from "@/lib/shortStay";

async function getListing(slug) {
  const payload = await fetchPublicJson(
    `/api/public/short-stay/listings/${encodeURIComponent(slug)}`,
    { fallback: null }
  );
  return normalizeListing(payload);
}

function metaDescription(listing) {
  const source = listing.seoDescription || listing.description || `Request a professionally managed short stay in ${listing.area || listing.city || "Dhaka"}.`;
  return source.length > 158 ? `${source.slice(0, 155).trim()}...` : source;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const listing = await getListing(slug);
  if (!listing?.slug) return { title: "Short stay not found" };

  const title = listing.seoTitle || listing.headline;
  const description = metaDescription(listing);
  const images = listing.images[0]?.url ? [{ url: listing.images[0].url, alt: listing.headline }] : [];
  return {
    title,
    description,
    alternates: { canonical: `/short-stays/${listing.slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/short-stays/${listing.slug}`,
      images,
    },
    twitter: { card: "summary_large_image", title, description, images: images.map((image) => image.url) },
  };
}

function DetailSection({ title, children, className = "" }) {
  return (
    <section className={`rounded-3xl border border-slate-800 bg-slate-900/55 p-6 sm:p-8 ${className}`}>
      <h2 className="text-xl font-bold text-white sm:text-2xl">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function FeatureList({ items }) {
  const uniqueItems = [...new Set(items)];
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {uniqueItems.map((item) => (
        <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-300">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400"><Check size={12} aria-hidden="true" /></span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function RateRow({ label, value, currency, suffix, showWhenUnavailable = false }) {
  if ((value === null || value === undefined || Number(value) <= 0) && !showWhenUnavailable) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-800 py-3 last:border-0">
      <dt className="text-sm text-slate-400">{label}</dt>
      <dd className="text-right text-sm font-bold text-white">{formatMoney(value, currency)}{suffix ? <span className="ml-1 font-normal text-slate-500">{suffix}</span> : null}</dd>
    </div>
  );
}

function lodgingSchema(listing) {
  const location = [listing.area, listing.city, listing.district, listing.country].filter(Boolean);
  const schema = {
    "@context": "https://schema.org",
    "@type": ["LodgingBusiness", "Accommodation"],
    "@id": `${SITE_URL}/short-stays/${listing.slug}#lodging`,
    name: listing.headline,
    description: listing.description || undefined,
    url: `${SITE_URL}/short-stays/${listing.slug}`,
    image: listing.images.map((image) => absoluteUrl(image.url)).filter(Boolean),
    address: location.length ? {
      "@type": "PostalAddress",
      addressLocality: listing.area || listing.city || undefined,
      addressRegion: listing.district || undefined,
      addressCountry: listing.country || "Bangladesh",
    } : undefined,
    numberOfRooms: listing.bedrooms ?? undefined,
    occupancy: listing.maxGuests ? {
      "@type": "QuantitativeValue",
      maxValue: listing.maxGuests,
      unitText: "guests",
    } : undefined,
    amenityFeature: [...new Set([...listing.amenities, ...listing.features])].map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    })),
    checkinTime: listing.checkinTime || undefined,
    checkoutTime: listing.checkoutTime || undefined,
    petsAllowed: undefined,
    offers: listing.baseRate && listing.baseRate > 0 ? {
      "@type": "Offer",
      price: listing.baseRate,
      priceCurrency: listing.currency,
      url: `${SITE_URL}/short-stays/${listing.slug}`,
      availability: "https://schema.org/LimitedAvailability",
      unitCode: "DAY",
    } : undefined,
  };
  return schema;
}

function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export default async function ShortStayDetailPage({ params, searchParams }) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const listing = await getListing(slug);
  if (!listing?.slug) notFound();

  const location = [listing.area, listing.city, listing.district].filter(Boolean).join(", ");
  const allFeatures = [...listing.amenities, ...listing.features];
  const mediaLinks = [
    ["Video tour", listing.videoTourUrl],
    ["Drone video", listing.droneVideoUrl],
    ["Virtual tour", listing.virtualTourUrl],
    ["Floor plan", listing.floorPlanUrl],
  ].filter(([, url]) => url);
  const initialValues = {
    checkIn: typeof query?.check_in === "string" ? query.check_in : "",
    checkOut: typeof query?.check_out === "string" ? query.check_out : "",
    adults: Math.max(1, Number(typeof query?.adults === "string" ? query.adults : 1) || 1),
    children: Math.max(0, Number(typeof query?.children === "string" ? query.children : 0) || 0),
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-slate-100">
      <JsonLd data={lodgingSchema(listing)} />
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <Link href="/short-stays" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-400">
          <ArrowLeft size={16} aria-hidden="true" /> All short stays
        </Link>

        <header className="mt-7">
          <div className="flex flex-wrap items-center gap-3">
            {listing.featured && <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300"><Sparkles size={12} aria-hidden="true" /> Featured stay</span>}
            {listing.accommodationType && <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300">{listing.accommodationType.replaceAll("_", " ")}</span>}
          </div>
          <h1 className="mt-4 max-w-4xl text-3xl font-extrabold leading-tight text-white sm:text-5xl">{listing.headline}</h1>
          {location && (
            <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-slate-400 sm:text-base">
              <MapPin className="mt-0.5 shrink-0 text-blue-400" size={17} aria-hidden="true" />
              {location}
            </p>
          )}
        </header>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2" aria-label="Property gallery">
          <div className={`aspect-[4/3] overflow-hidden rounded-3xl bg-slate-900 sm:col-span-2 lg:row-span-2 lg:aspect-auto lg:min-h-[520px] ${listing.images.length > 1 ? "lg:col-span-3" : "lg:col-span-4"}`}>
            <ShortStayImage src={listing.images[0]?.url} alt={listing.images[0]?.caption || listing.headline} eager />
          </div>
          {listing.images[1] && (
            <div className={`aspect-[4/3] overflow-hidden rounded-3xl bg-slate-900 lg:aspect-auto ${listing.images[2] ? "" : "lg:row-span-2"}`}>
              <ShortStayImage src={listing.images[1].url} alt={listing.images[1].caption || `${listing.headline} view 2`} />
            </div>
          )}
          {listing.images[2] && (
            <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-slate-900 lg:aspect-auto">
              <ShortStayImage src={listing.images[2].url} alt={listing.images[2].caption || `${listing.headline} view 3`} />
            </div>
          )}
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div className="space-y-6">
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Property capacity">
              {listing.maxGuests !== null && <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"><Users className="text-blue-400" size={20} aria-hidden="true" /><p className="mt-3 text-sm font-bold text-white">{listing.maxGuests} guests</p></div>}
              {listing.bedrooms !== null && <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"><BedDouble className="text-blue-400" size={20} aria-hidden="true" /><p className="mt-3 text-sm font-bold text-white">{listing.bedrooms} bedroom{listing.bedrooms === 1 ? "" : "s"}</p></div>}
              {listing.bathrooms !== null && <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"><Bath className="text-blue-400" size={20} aria-hidden="true" /><p className="mt-3 text-sm font-bold text-white">{listing.bathrooms} bathroom{listing.bathrooms === 1 ? "" : "s"}</p></div>}
              {listing.furnishingStatus && <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"><Building2 className="text-blue-400" size={20} aria-hidden="true" /><p className="mt-3 text-sm font-bold capitalize text-white">{listing.furnishingStatus.replaceAll("_", " ")}</p></div>}
            </section>

            {listing.description && (
              <DetailSection title="About this stay">
                <p className="whitespace-pre-line text-[15px] leading-7 text-slate-300">{listing.description}</p>
              </DetailSection>
            )}

            {allFeatures.length > 0 && (
              <DetailSection title="Amenities and features">
                <FeatureList items={allFeatures} />
              </DetailSection>
            )}

            <DetailSection title="Your stay at a glance">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-950/60 p-4">
                  <Clock3 className="text-blue-400" size={20} aria-hidden="true" />
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Check-in</p>
                  <p className="mt-1 font-bold text-white">{listing.checkinTime || "Confirmed with your booking"}</p>
                </div>
                <div className="rounded-2xl bg-slate-950/60 p-4">
                  <Clock3 className="text-blue-400" size={20} aria-hidden="true" />
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Check-out</p>
                  <p className="mt-1 font-bold text-white">{listing.checkoutTime || "Confirmed with your booking"}</p>
                </div>
              </div>
            </DetailSection>

            {(listing.houseRules.length > 0 || listing.cancellationPolicy) && (
              <DetailSection title="Policies">
                <div className="space-y-6">
                  {listing.houseRules.length > 0 && <div><h3 className="font-bold text-white">House rules</h3><div className="mt-3"><FeatureList items={listing.houseRules} /></div></div>}
                  {listing.cancellationPolicy && <div><h3 className="font-bold text-white">Cancellation policy</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-300">{listing.cancellationPolicy}</p></div>}
                </div>
              </DetailSection>
            )}

            {listing.nearbyPlaces.length > 0 && (
              <DetailSection title="Nearby places">
                <FeatureList items={listing.nearbyPlaces} />
              </DetailSection>
            )}

            <DetailSection title="Rates and fees">
              <dl>
                <RateRow label="Nightly rate" value={listing.baseRate} currency={listing.currency} suffix="/ night" showWhenUnavailable />
                <RateRow label="Weekend rate" value={listing.weekendRate} currency={listing.currency} suffix="/ night" />
                <RateRow label="Weekly rate" value={listing.weeklyRate} currency={listing.currency} suffix="/ week" />
                <RateRow label="Monthly rate" value={listing.monthlyRate} currency={listing.currency} suffix="/ month" />
                <RateRow label="Cleaning fee" value={listing.cleaningFee} currency={listing.currency} />
                <RateRow label="Security deposit" value={listing.securityDeposit} currency={listing.currency} />
                <RateRow label="Extra guest fee" value={listing.extraGuestFee} currency={listing.currency} />
                <RateRow label="Early check-in fee" value={listing.earlyCheckinFee} currency={listing.currency} />
                <RateRow label="Late check-out fee" value={listing.lateCheckoutFee} currency={listing.currency} />
              </dl>
              <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 shrink-0" size={14} aria-hidden="true" /> Final pricing and availability are confirmed by our team before payment.</p>
            </DetailSection>

            {(mediaLinks.length > 0 || listing.mapUrl) && (
              <DetailSection title="Explore more">
                <div className="flex flex-wrap gap-3">
                  {mediaLinks.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">{label} <ExternalLink size={14} aria-hidden="true" /></a>)}
                  {listing.mapUrl && <a href={listing.mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">View map <ExternalLink size={14} aria-hidden="true" /></a>}
                </div>
              </DetailSection>
            )}
          </div>

          <aside className="rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl shadow-black/30 sm:p-6 lg:sticky lg:top-24" aria-label="Booking request">
            <div className="mb-6 border-b border-slate-800 pb-5">
              <p className="text-2xl font-extrabold text-white">{formatMoney(listing.baseRate, listing.currency)}</p>
              {listing.baseRate !== null && <p className="mt-1 text-xs text-slate-500">per night, before applicable fees</p>}
            </div>
            <BookingRequestForm listing={listing} initialValues={initialValues} />
          </aside>
        </div>
      </div>
    </div>
  );
}
