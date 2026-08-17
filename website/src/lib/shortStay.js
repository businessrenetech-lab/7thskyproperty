import { getPublicImageUrl } from "./imageUrl";

export const SITE_URL = "https://seventhskybd.com";

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function parseJson(value) {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!text || (!text.startsWith("[") && !text.startsWith("{"))) return value;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

function asArray(value) {
  const parsed = parseJson(value);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    if (Array.isArray(parsed.items)) return parsed.items;
    return [parsed];
  }
  if (typeof parsed === "string" && parsed.trim()) {
    return parsed.split(/\r?\n|,(?=\s*[A-Za-z])/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function cleanText(value) {
  if (typeof value === "number") return String(value);
  return typeof value === "string" ? value.trim() : "";
}

function itemLabel(item) {
  if (typeof item === "string" || typeof item === "number") return cleanText(item);
  if (!item || typeof item !== "object") return "";
  const name = cleanText(firstValue(item.label, item.name, item.title, item.amenity, item.feature, item.place));
  const detail = cleanText(firstValue(item.distance, item.description, item.note));
  return name && detail ? `${name} - ${detail}` : name || detail;
}

function textItems(value) {
  return asArray(value).map(itemLabel).filter(Boolean);
}

function policyText(value) {
  const parsed = parseJson(value);
  if (typeof parsed === "string") return cleanText(parsed);
  if (Array.isArray(parsed)) return parsed.map(itemLabel).filter(Boolean).join("\n");
  if (parsed && typeof parsed === "object") {
    return cleanText(firstValue(parsed.description, parsed.text, parsed.summary, parsed.policy)) || itemLabel(parsed);
  }
  return "";
}

function numberValue(value) {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function safeUrl(value, { allowRelative = true } = {}) {
  const url = cleanText(value);
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (allowRelative && url.startsWith("/") && !url.startsWith("//")) return url;
  return "";
}

function mediaItems(...sources) {
  const items = sources.flatMap(asArray);
  return items.flatMap((item) => {
    if (typeof item === "string") return [{ url: item, caption: "" }];
    if (!item || typeof item !== "object") return [];
    const type = cleanText(firstValue(item.media_type, item.type)).toLowerCase();
    if (type && !["image", "photo", "picture"].includes(type)) return [];
    return [{
      url: firstValue(item.file_url, item.url, item.image_url, item.src),
      caption: cleanText(firstValue(item.caption, item.alt, item.title)),
    }];
  }).map((item) => {
    const checked = safeUrl(item.url);
    return checked ? { ...item, url: getPublicImageUrl(checked, "") } : null;
  }).filter(Boolean);
}

export function normalizeListing(raw) {
  if (!raw || typeof raw !== "object") return null;
  const source = raw.data && !Array.isArray(raw.data) && typeof raw.data === "object" ? raw.data : raw;
  const property = source.property && typeof source.property === "object" ? source.property : {};
  const area = cleanText(firstValue(source.area, property.area));
  const city = cleanText(firstValue(source.city, property.city));
  const district = cleanText(firstValue(source.district, property.district));
  const slug = cleanText(firstValue(source.public_slug, source.slug));
  const headline = cleanText(firstValue(source.public_headline, source.headline, source.title, property.title));
  const images = mediaItems(
    firstValue(source.featured_image_url, source.cover_image_url, property.featured_image_url),
    source.media,
    source.images,
    property.media
  );
  const dedupedImages = images.filter((image, index) => images.findIndex((candidate) => candidate.url === image.url) === index);

  return {
    profileId: firstValue(source.profile_id, source.id),
    slug,
    headline: headline || `Short stay${area ? ` in ${area}` : ""}`,
    description: cleanText(firstValue(source.public_description, source.description, property.description)),
    accommodationType: cleanText(firstValue(source.accommodation_type, source.property_type, property.property_type)),
    bedrooms: numberValue(firstValue(source.bedrooms, property.bedrooms)),
    bathrooms: numberValue(firstValue(source.bathrooms, property.bathrooms)),
    maxGuests: numberValue(firstValue(source.max_guests, source.guests, source.capacity)),
    maxAdults: numberValue(source.max_adults),
    maxChildren: numberValue(source.max_children),
    furnishingStatus: cleanText(firstValue(source.furnishing_status, property.furnishing)),
    amenities: textItems(firstValue(source.amenities, property.amenities)),
    features: textItems(firstValue(source.features, property.features)),
    baseRate: numberValue(firstValue(source.base_nightly_rate, source.nightly_rate, source.rate)),
    weekendRate: numberValue(source.weekend_rate),
    weeklyRate: numberValue(source.weekly_rate),
    monthlyRate: numberValue(source.monthly_rate),
    cleaningFee: numberValue(source.cleaning_fee),
    securityDeposit: numberValue(source.security_deposit),
    extraGuestFee: numberValue(source.extra_guest_fee),
    earlyCheckinFee: numberValue(source.early_checkin_fee),
    lateCheckoutFee: numberValue(source.late_checkout_fee),
    currency: cleanText(firstValue(source.currency, property.currency)) || "BDT",
    checkinTime: cleanText(firstValue(source.checkin_time, source.check_in_time)),
    checkoutTime: cleanText(firstValue(source.checkout_time, source.check_out_time)),
    houseRules: textItems(source.house_rules),
    cancellationPolicy: policyText(firstValue(source.cancellation_policy, source.cancellation_terms)),
    address: cleanText(firstValue(source.address, property.address)),
    area,
    city,
    district,
    postalCode: cleanText(firstValue(source.postal_code, property.postal_code)),
    country: cleanText(firstValue(source.country, property.country)) || "Bangladesh",
    latitude: numberValue(firstValue(source.latitude, property.latitude)),
    longitude: numberValue(firstValue(source.longitude, property.longitude)),
    mapUrl: safeUrl(firstValue(source.map_url, property.map_url), { allowRelative: false }),
    nearbyPlaces: textItems(firstValue(source.nearby_places, property.nearby_places)),
    images: dedupedImages,
    videoTourUrl: safeUrl(firstValue(source.video_tour_url, property.video_tour_url), { allowRelative: false }),
    droneVideoUrl: safeUrl(firstValue(source.drone_video_url, property.drone_video_url), { allowRelative: false }),
    virtualTourUrl: safeUrl(firstValue(source.virtual_tour_url, property.virtual_tour_url), { allowRelative: false }),
    floorPlanUrl: safeUrl(firstValue(source.floor_plan_url, property.floor_plan_url)),
    featured: Boolean(firstValue(source.is_featured_on_website, source.is_featured, property.is_featured)),
    seoTitle: cleanText(firstValue(source.seo_title, property.seo_title)),
    seoDescription: cleanText(firstValue(source.seo_description, property.seo_description)),
    updatedAt: firstValue(source.updated_at, property.updated_at),
  };
}

export function normalizeListingsResponse(payload) {
  const records = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.listings)
        ? payload.listings
        : [];
  const pagination = !Array.isArray(payload) && payload?.pagination && typeof payload.pagination === "object"
    ? payload.pagination
    : null;

  return {
    listings: records.map(normalizeListing).filter((listing) => listing?.slug),
    pagination: pagination ? {
      page: numberValue(firstValue(pagination.page, pagination.current_page)) || 1,
      totalPages: numberValue(firstValue(pagination.total_pages, pagination.pages, pagination.last_page)),
      total: numberValue(firstValue(pagination.total, pagination.count)),
    } : null,
  };
}

export function formatMoney(value, currency = "BDT") {
  if (value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) <= 0) return "Contact for rate";
  try {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency,
      maximumFractionDigits: Number(value) % 1 === 0 ? 0 : 2,
    }).format(Number(value));
  } catch {
    return `${currency} ${Number(value).toLocaleString("en-BD")}`;
  }
}

export function absoluteUrl(value) {
  const url = safeUrl(value);
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `${SITE_URL}${url}`;
}
