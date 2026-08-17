import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  BedDouble,
  MapPin,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import ShortStayImage from "@/components/ShortStayImage";
import { fetchPublicJson } from "@/lib/serverApi";
import { formatMoney, normalizeListingsResponse } from "@/lib/shortStay";

export const metadata = {
  title: "Short Stays in Dhaka",
  description: "Explore furnished short-stay apartments and serviced accommodation in Dhaka, managed by Seventh Sky Properties.",
  alternates: { canonical: "/short-stays" },
  openGraph: {
    title: "Short Stays in Dhaka | Seventh Sky Properties",
    description: "Furnished, professionally managed short-stay homes in Dhaka.",
    url: "/short-stays",
  },
};

const inputClass = "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

function paramValue(searchParams, key, fallback = "") {
  const value = searchParams?.[key];
  if (Array.isArray(value)) return String(value[0] || fallback);
  return value === undefined || value === null ? fallback : String(value);
}

function detailHref(listing, filters) {
  const params = new URLSearchParams();
  if (filters.checkIn) params.set("check_in", filters.checkIn);
  if (filters.checkOut) params.set("check_out", filters.checkOut);
  if (filters.guests) params.set("adults", filters.guests);
  const query = params.toString();
  return `/short-stays/${encodeURIComponent(listing.slug)}${query ? `?${query}` : ""}`;
}

function pageHref(searchParams, page) {
  const params = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(searchParams || {})) {
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  params.set("page", String(page));
  return `/short-stays?${params}`;
}

function PropertyCard({ listing, filters }) {
  const location = [listing.area, listing.city].filter(Boolean).join(", ") || listing.district || "Dhaka";
  const highlights = [...listing.amenities, ...listing.features].slice(0, 3);

  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-slate-950/20 transition hover:-translate-y-1 hover:border-slate-700">
      <Link href={detailHref(listing, filters)} className="block focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
          <ShortStayImage
            src={listing.images[0]?.url}
            alt={listing.images[0]?.caption || listing.headline}
            className="transition duration-500 group-hover:scale-105"
          />
          {listing.featured && (
            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-slate-950/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.13em] text-amber-300 backdrop-blur">
              <Sparkles size={12} aria-hidden="true" /> Featured
            </span>
          )}
        </div>
        <div className="p-5 sm:p-6">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-400">
            <MapPin size={13} aria-hidden="true" /> {location}
          </p>
          <h2 className="mt-3 text-xl font-bold leading-snug text-white transition group-hover:text-blue-300">{listing.headline}</h2>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
            {listing.maxGuests !== null && <span className="flex items-center gap-1.5"><Users size={15} aria-hidden="true" /> {listing.maxGuests} guests</span>}
            {listing.bedrooms !== null && <span className="flex items-center gap-1.5"><BedDouble size={15} aria-hidden="true" /> {listing.bedrooms} bed{listing.bedrooms === 1 ? "" : "s"}</span>}
            {listing.bathrooms !== null && <span className="flex items-center gap-1.5"><Bath size={15} aria-hidden="true" /> {listing.bathrooms} bath{listing.bathrooms === 1 ? "" : "s"}</span>}
          </div>
          {highlights.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {highlights.map((item) => <span key={item} className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300">{item}</span>)}
            </div>
          )}
          <div className="mt-5 flex items-end justify-between border-t border-slate-800 pt-5">
            <div>
              <p className="text-lg font-extrabold text-white">{formatMoney(listing.baseRate, listing.currency)}</p>
              {listing.baseRate !== null && <p className="text-[11px] text-slate-500">per night, before fees</p>}
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-blue-400">View stay <ArrowRight size={15} aria-hidden="true" /></span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export default async function ShortStaysPage({ searchParams }) {
  const params = await searchParams;
  const filters = {
    q: paramValue(params, "q"),
    checkIn: paramValue(params, "check_in"),
    checkOut: paramValue(params, "check_out"),
    guests: paramValue(params, "guests"),
    bedrooms: paramValue(params, "bedrooms"),
    minRate: paramValue(params, "min_rate"),
    maxRate: paramValue(params, "max_rate"),
    page: paramValue(params, "page", "1"),
  };
  const apiQuery = new URLSearchParams({ page: filters.page, limit: "12" });
  for (const [key, value] of [
    ["q", filters.q],
    ["guests", filters.guests],
    ["bedrooms", filters.bedrooms],
    ["min_rate", filters.minRate],
    ["max_rate", filters.maxRate],
    ["check_in", filters.checkIn],
    ["check_out", filters.checkOut],
  ]) {
    if (value) apiQuery.set(key, value);
  }

  const payload = await fetchPublicJson(`/api/public/short-stay/listings?${apiQuery}`, { fallback: [] });
  const { listings, pagination } = normalizeListingsResponse(payload);
  const currentPage = pagination?.page || Math.max(1, Number(filters.page) || 1);
  const totalPages = pagination?.totalPages || null;

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-slate-100">
      <section className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(37,99,235,0.18),transparent_34%)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <span className="inline-flex rounded-full border border-blue-400/20 bg-blue-500/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-300">Stay with Seventh Sky</span>
          <div className="mt-5 max-w-3xl">
            <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">A better base for your time in Dhaka.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">Furnished homes, practical comforts, and local support from a property team that manages every stay with care.</p>
          </div>

          <form method="get" className="mt-9 rounded-3xl border border-slate-700/80 bg-slate-900/85 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-semibold text-slate-300 sm:col-span-2 lg:col-span-2">
                Location or property
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 mt-1 -translate-y-1/2 text-slate-500" size={17} aria-hidden="true" />
                  <input className={`${inputClass} pl-10`} name="q" defaultValue={filters.q} placeholder="Dhanmondi, Gulshan, Banani..." />
                </span>
              </label>
              <label className="text-xs font-semibold text-slate-300">
                Check-in
                <input className={inputClass} type="date" name="check_in" defaultValue={filters.checkIn} />
              </label>
              <label className="text-xs font-semibold text-slate-300">
                Check-out
                <input className={inputClass} type="date" name="check_out" min={filters.checkIn || undefined} defaultValue={filters.checkOut} />
              </label>
              <label className="text-xs font-semibold text-slate-300">
                Guests
                <input className={inputClass} type="number" name="guests" min="1" defaultValue={filters.guests} placeholder="2" />
              </label>
              <label className="text-xs font-semibold text-slate-300">
                Bedrooms
                <input className={inputClass} type="number" name="bedrooms" min="0" defaultValue={filters.bedrooms} placeholder="Any" />
              </label>
              <label className="text-xs font-semibold text-slate-300">
                Minimum nightly rate
                <input className={inputClass} type="number" name="min_rate" min="0" defaultValue={filters.minRate} placeholder="BDT" />
              </label>
              <label className="text-xs font-semibold text-slate-300">
                Maximum nightly rate
                <input className={inputClass} type="number" name="max_rate" min="0" defaultValue={filters.maxRate} placeholder="BDT" />
              </label>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Link href="/short-stays" className="px-4 py-2 text-center text-sm font-semibold text-slate-400 transition hover:text-white">Clear filters</Link>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900">
                <Search size={16} aria-hidden="true" /> Search stays
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16" aria-labelledby="available-stays">
        <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-400">Managed short stays</p>
            <h2 id="available-stays" className="mt-2 text-2xl font-bold text-white sm:text-3xl">Find your place</h2>
          </div>
          <p className="text-sm text-slate-500">{pagination?.total !== null && pagination?.total !== undefined ? `${pagination.total} available properties` : `${listings.length} properties shown`}</p>
        </div>

        {listings.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => <PropertyCard key={listing.slug} listing={listing} filters={filters} />)}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-16 text-center">
            <h2 className="text-xl font-bold text-white">No stays found</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">Try widening your location, guest, or price filters. New managed properties are added regularly.</p>
            <Link href="/short-stays" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-slate-600 hover:bg-slate-800">View all stays</Link>
          </div>
        )}

        {totalPages && totalPages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Short-stay results pages">
            {currentPage > 1 ? (
              <Link href={pageHref(params, currentPage - 1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"><ArrowLeft size={15} aria-hidden="true" /> Previous</Link>
            ) : <span />}
            <span className="px-3 text-sm text-slate-400">Page {currentPage} of {totalPages}</span>
            {currentPage < totalPages ? (
              <Link href={pageHref(params, currentPage + 1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">Next <ArrowRight size={15} aria-hidden="true" /></Link>
            ) : <span />}
          </nav>
        )}
      </section>
    </div>
  );
}
