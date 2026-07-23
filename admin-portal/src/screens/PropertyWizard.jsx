import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  X,
  Check,
  ChevronRight,
  Home,
  ListChecks,
  Zap,
  Image as ImageIcon,
  FileText,
  KeyRound,
  Flag,
  Plus,
  Trash2,
} from "lucide-react";
import api from "../services/api";
import { useToast } from "../context/ToastContext";
import { Spinner, Button, Field, Input, Select, Textarea } from "../ui/kit";
import PropertyMediaGallery from "../components/PropertyMediaGallery";
import FileUpload from "../ui/FileUpload";

/* Step-by-step "Add rental property" wizard. Creates a DRAFT on step 1 and
   saves progressively (PUT per step) so a half-done property can be resumed
   at /property-management/rentals/new/:id. Finish flips status → available. */

const PROPERTY_TYPES = [
  "Apartment",
  "House",
  "Duplex",
  "Furnished Apartment",
  "Office",
  "Retail Shop",
  "Commercial Floor",
  "Warehouse",
  "Land",
  "Entire Building",
  "Other",
];
const DEFAULT_UTILITIES = [
  { key: "gas", label: "Gas", active: false },
  { key: "water", label: "Water", active: false },
  { key: "generator", label: "Generator", active: false },
  { key: "lift", label: "Lift", active: false },
];
const FEATURE_SUGGESTIONS = [
  "Balcony",
  "Parking",
  "Servant room",
  "Store room",
  "Rooftop access",
  "CCTV",
  "Security guard",
  "Intercom",
  "Solar backup",
  "Tiles floor",
  "South facing",
];

const STEPS = [
  { key: "basics", label: "Basics", icon: Home },
  { key: "details", label: "Details & address", icon: ListChecks },
  { key: "utilities", label: "Utilities", icon: Zap },
  { key: "media", label: "Photos & videos", icon: ImageIcon },
  { key: "description", label: "Description", icon: FileText },
  { key: "access", label: "Access & ownership", icon: KeyRound },
  { key: "review", label: "Review & finish", icon: Flag },
];

const parseArr = (v) => {
  if (Array.isArray(v)) return v;
  try {
    const p = JSON.parse(v || "[]");
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
};
const youtubeEmbed = (url) => {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const id = parsed.hostname.includes("youtu.be")
      ? parsed.pathname.slice(1)
      : parsed.searchParams.get("v") ||
        parsed.pathname.split("/").filter(Boolean).pop();
    return id &&
      /^(www\.)?(youtube\.com|youtu\.be)$/.test(
        parsed.hostname.replace("www.", ""),
      )
      ? `https://www.youtube.com/embed/${id}`
      : "";
  } catch {
    return "";
  }
};

export default function PropertyWizard() {
  const { id: resumeId } = useParams();
  const [query] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const queryListingType = query.get("listing_type");
  const queryCategory = query.get("category");
  const [propertyId, setPropertyId] = useState(resumeId || null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [media, setMedia] = useState([]);
  const [featuredUrl, setFeaturedUrl] = useState(null);
  const [f, setF] = useState({
    title: "",
    category: queryCategory || "residential",
    property_type: "Apartment",
    property_type_other: "",
    listing_type: queryListingType || "rent",
    bedrooms: "",
    bathrooms: "",
    balconies: "",
    drawing_rooms: "",
    dining_rooms: "",
    parking: "",
    furnishing: "unfurnished",
    property_condition: "",
    land_size: "",
    building_size: "",
    floor_number: "",
    total_floors: "",
    total_units: "",
    building_height: "",
    year_built: "",
    address: "",
    area: "",
    city: "",
    district: "",
    postal_code: "",
    country: "Bangladesh",
    map_url: "",
    nearby_places: [],
    features: [],
    utilities: DEFAULT_UTILITIES,
    description: "",
    remarks: "",
    access_contacts: [],
    ownership_type: "",
    approved_monthly_rent: "",
    market_rent_min: "",
    market_rent_max: "",
    asking_price: "",
    is_negotiable: true,
    video_tour_url: "",
    drone_video_url: "",
    floor_plan_url: "",
    virtual_tour_url: "",
    unit_floor_plans: [],
    is_published: false,
    is_featured: false,
    seo_title: "",
    seo_description: "",
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const saleMode = f.listing_type === "sale";
  const salesHome = `/${f.category || queryCategory || "residential"}/sell`;

  // Resume a draft.
  useEffect(() => {
    if (!resumeId) return;
    (async () => {
      try {
        const { data } = await api.get(`/properties/${resumeId}`);
        const p = data.data || data;
        setPropertyId(p.id);
        setMedia(p.media || []);
        setFeaturedUrl(p.featured_image_url || null);
        setF((s) => ({
          ...s,
          ...Object.fromEntries(
            Object.entries(p).filter(([k, v]) => k in s && v != null),
          ),
          features: parseArr(p.features),
          nearby_places: parseArr(p.nearby_places),
          unit_floor_plans: parseArr(p.unit_floor_plans),
          utilities: parseArr(p.utilities).length
            ? parseArr(p.utilities)
            : DEFAULT_UTILITIES,
          access_contacts: parseArr(p.access_contacts),
          property_type: PROPERTY_TYPES.includes(p.property_type)
            ? p.property_type
            : p.property_type
              ? "Other"
              : "Apartment",
          property_type_other: PROPERTY_TYPES.includes(p.property_type)
            ? ""
            : p.property_type || "",
          asking_price: p.asking_price ?? p.price ?? s.asking_price,
        }));
      } catch {
        toast.error("Could not load the draft property.");
      }
    })();
  }, [resumeId]);

  const reloadMedia = async () => {
    if (!propertyId) return;
    const { data } = await api.get(`/properties/${propertyId}`);
    setMedia(data.data.media || []);
    setFeaturedUrl(data.data.featured_image_url || null);
  };

  const payloadFor = (stepKey) => {
    const property_type =
      f.property_type === "Other"
        ? f.property_type_other || "Other"
        : f.property_type;
    const base = {
      basics: {
        title: f.title,
        category: f.category,
        property_type,
        listing_type: f.listing_type,
      },
      details: {
        bedrooms: f.bedrooms || null,
        bathrooms: f.bathrooms || null,
        balconies: f.balconies || null,
        drawing_rooms: f.drawing_rooms || null,
        dining_rooms: f.dining_rooms || null,
        parking: f.parking || null,
        furnishing: f.furnishing,
        property_condition: f.property_condition,
        land_size: f.land_size,
        building_size: f.building_size,
        floor_number: f.floor_number,
        total_floors: f.total_floors,
        total_units: f.total_units || null,
        building_height: f.building_height,
        year_built: f.year_built,
        address: f.address,
        area: f.area,
        city: f.city,
        district: f.district,
        postal_code: f.postal_code,
        country: f.country,
        map_url: f.map_url,
        nearby_places: f.nearby_places,
        features: f.features,
      },
      utilities: { utilities: f.utilities },
      media: {
        video_tour_url: f.video_tour_url,
        drone_video_url: f.drone_video_url,
        floor_plan_url: f.floor_plan_url,
        virtual_tour_url: f.virtual_tour_url,
        unit_floor_plans: f.unit_floor_plans,
      },
      description: {
        description: f.description,
        remarks: f.remarks,
        seo_title: f.seo_title,
        seo_description: f.seo_description,
      },
      access: {
        access_contacts: f.access_contacts.filter((c) => c.name || c.phone),
        ownership_type: f.ownership_type || null,
      },
      review: {
        ...(saleMode
          ? {
              price: f.asking_price || null,
              is_negotiable: !!f.is_negotiable,
              is_published: !!f.is_published,
              is_featured: !!f.is_featured,
            }
          : {
              approved_monthly_rent: f.approved_monthly_rent || null,
              market_rent_min: f.market_rent_min || null,
              market_rent_max: f.market_rent_max || null,
            }),
      },
    };
    return base[stepKey] || {};
  };

  const saveStep = async () => {
    const key = STEPS[step].key;
    if (
      key === "media" &&
      saleMode &&
      f.video_tour_url &&
      !youtubeEmbed(f.video_tour_url)
    ) {
      toast.error("Enter a valid YouTube URL for the property video.");
      return false;
    }
    setBusy(true);
    try {
      if (!propertyId) {
        if (!f.title.trim()) {
          toast.error("Give the property a title.");
          setBusy(false);
          return false;
        }
        const { data } = await api.post("/properties", payloadFor("basics"));
        const created = data.data || data;
        setPropertyId(created.id);
        nav(
          saleMode
            ? `/sales/properties/new/${created.id}?listing_type=sale&category=${encodeURIComponent(f.category)}`
            : `/property-management/rentals/new/${created.id}`,
          { replace: true },
        );
        toast.success("Draft created — progress saves as you go.");
      } else {
        await api.put(`/properties/${propertyId}`, payloadFor(key));
      }
      return true;
    } catch (e) {
      toast.error(e.response?.data?.error || "Save failed.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    if (await saveStep()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const finish = async () => {
    setBusy(true);
    try {
      await api.put(`/properties/${propertyId}`, {
        ...payloadFor("review"),
        status: "available",
      });
      toast.success(
        saleMode
          ? "Sales listing is ready."
          : "Property is ready. Next: assessment, owner and tenant.",
      );
      nav(
        saleMode
          ? `/sales/property/${propertyId}`
          : `/property-management/rentals?open=${propertyId}`,
      );
    } catch (e) {
      toast.error(e.response?.data?.error || "Could not finish.");
    } finally {
      setBusy(false);
    }
  };

  const stepState = (i) => (i < step ? "done" : i === step ? "active" : "todo");
  const current = STEPS[step].key;

  const toggleFeature = (name) =>
    set(
      "features",
      f.features.includes(name)
        ? f.features.filter((x) => x !== name)
        : [...f.features, name],
    );
  const setUtility = (i, patch) =>
    set(
      "utilities",
      f.utilities.map((u, idx) => (idx === i ? { ...u, ...patch } : u)),
    );
  const setAccess = (i, patch) =>
    set(
      "access_contacts",
      f.access_contacts.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    );
  const setUnitPlan = (i, patch) =>
    set(
      "unit_floor_plans",
      f.unit_floor_plans.map((plan, idx) =>
        idx === i ? { ...plan, ...patch } : plan,
      ),
    );

  return (
    <div className="pm-scope">
      <div className="pm-wizard">
        <div className="pm-wizard-head">
          <div>
            <h2 style={{ margin: 0, fontSize: 21 }}>
              {propertyId
                ? f.title ||
                  `New ${saleMode ? "sales listing" : "rental property"}`
                : `New ${saleMode ? "sales listing" : "rental property"}`}
            </h2>
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
              Step {step + 1} of {STEPS.length} — {STEPS[step].label}
              {propertyId ? " · draft saved" : ""}
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() =>
                nav(saleMode ? salesHome : "/property-management/rentals")
              }
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="pm-wizard-body">
          <div className="pm-wizard-rail">
            {STEPS.map((s, i) => {
              const st = stepState(i);
              return (
                <div
                  key={s.key}
                  className={`pm-wizard-step ${st}`}
                  onClick={() => {
                    if (propertyId || i <= step) setStep(i);
                  }}
                >
                  <span className="num">
                    {st === "done" ? <Check size={14} /> : i + 1}
                  </span>
                  <span className="lbl">{s.label}</span>
                  {st === "active" && (
                    <ChevronRight
                      size={14}
                      style={{ marginLeft: "auto", color: "var(--cyan)" }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="pm-wizard-main">
            <div className="pm-wizard-card">
              {current === "basics" && (
                <div className="pm-card" style={{ padding: 22 }}>
                  <h3 style={{ marginTop: 0 }}>Basics</h3>
                  <Field label="Property title *">
                    <Input
                      value={f.title}
                      onChange={(e) => set("title", e.target.value)}
                      placeholder="e.g. 3-bed apartment, Road 5, Banani"
                    />
                  </Field>
                  <div className="form-grid">
                    <Field label="Listing for">
                      <div className="pm-seg">
                        {(saleMode
                          ? ["residential", "commercial", "rural"]
                          : ["residential", "commercial"]
                        ).map((c) => (
                          <button
                            key={c}
                            className={f.category === c ? "on" : ""}
                            onClick={() => set("category", c)}
                          >
                            {c.charAt(0).toUpperCase() + c.slice(1)}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Listing type">
                      {saleMode ? (
                        <Input value="Sale" disabled />
                      ) : (
                        <Select
                          value={f.listing_type}
                          onChange={(e) => set("listing_type", e.target.value)}
                        >
                          <option value="rent">Rent</option>
                          <option value="lease">Lease</option>
                          <option value="short_term">Short term</option>
                        </Select>
                      )}
                    </Field>
                  </div>
                  <Field label="Property type">
                    <div className="pm-chip-row">
                      {PROPERTY_TYPES.map((t) => (
                        <button
                          key={t}
                          className={`pm-chip ${f.property_type === t ? "on" : ""}`}
                          onClick={() => set("property_type", t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </Field>
                  {f.property_type === "Other" && (
                    <Field label="Other — specify">
                      <Input
                        value={f.property_type_other}
                        onChange={(e) =>
                          set("property_type_other", e.target.value)
                        }
                      />
                    </Field>
                  )}
                </div>
              )}

              {current === "details" && (
                <div className="pm-card" style={{ padding: 22 }}>
                  <h3 style={{ marginTop: 0 }}>Details &amp; address</h3>
                  <div className="form-grid">
                    <Field label="Bedrooms">
                      <Input
                        type="number"
                        value={f.bedrooms}
                        onChange={(e) => set("bedrooms", e.target.value)}
                      />
                    </Field>
                    <Field label="Bathrooms">
                      <Input
                        type="number"
                        value={f.bathrooms}
                        onChange={(e) => set("bathrooms", e.target.value)}
                      />
                    </Field>
                    <Field label="Balconies">
                      <Input
                        type="number"
                        min="0"
                        value={f.balconies}
                        onChange={(e) => set("balconies", e.target.value)}
                      />
                    </Field>
                    <Field label="Drawing rooms">
                      <Input
                        type="number"
                        value={f.drawing_rooms}
                        onChange={(e) => set("drawing_rooms", e.target.value)}
                      />
                    </Field>
                    <Field label="Dining rooms">
                      <Input
                        type="number"
                        value={f.dining_rooms}
                        onChange={(e) => set("dining_rooms", e.target.value)}
                      />
                    </Field>
                    <Field label="Parking spaces">
                      <Input
                        type="number"
                        value={f.parking}
                        onChange={(e) => set("parking", e.target.value)}
                      />
                    </Field>
                    <Field label="Furnishing">
                      <Select
                        value={f.furnishing}
                        onChange={(e) => set("furnishing", e.target.value)}
                      >
                        <option value="unfurnished">Unfurnished</option>
                        <option value="semi_furnished">Semi-furnished</option>
                        <option value="furnished">Furnished</option>
                      </Select>
                    </Field>
                    <Field label="Size (sqft)">
                      <Input
                        value={f.building_size}
                        onChange={(e) => set("building_size", e.target.value)}
                      />
                    </Field>
                    <Field label="Land size">
                      <Input
                        value={f.land_size}
                        onChange={(e) => set("land_size", e.target.value)}
                        placeholder="e.g. 5 katha / 7,200 sqft"
                      />
                    </Field>
                    <Field label="Floor">
                      <Input
                        value={f.floor_number}
                        onChange={(e) => set("floor_number", e.target.value)}
                        placeholder="e.g. 4th"
                      />
                    </Field>
                    <Field label="Total floors">
                      <Input
                        value={f.total_floors}
                        onChange={(e) => set("total_floors", e.target.value)}
                      />
                    </Field>
                    <Field label="Total units">
                      <Input
                        type="number"
                        min="0"
                        value={f.total_units}
                        onChange={(e) => set("total_units", e.target.value)}
                      />
                    </Field>
                    <Field label="Building height">
                      <Input
                        value={f.building_height}
                        onChange={(e) => set("building_height", e.target.value)}
                        placeholder="e.g. 10 storeys / 120 ft"
                      />
                    </Field>
                    <Field label="Year built">
                      <Input
                        value={f.year_built}
                        onChange={(e) => set("year_built", e.target.value)}
                        placeholder="YYYY"
                      />
                    </Field>
                    <Field label="Property condition">
                      <Input
                        value={f.property_condition}
                        onChange={(e) =>
                          set("property_condition", e.target.value)
                        }
                        placeholder="e.g. Good — recently painted"
                      />
                    </Field>
                  </div>
                  <Field label="Features">
                    <div className="pm-chip-row">
                      {[
                        ...new Set([...FEATURE_SUGGESTIONS, ...f.features]),
                      ].map((name) => (
                        <button
                          key={name}
                          className={`pm-chip ${f.features.includes(name) ? "on" : ""}`}
                          onClick={() => toggleFeature(name)}
                        >
                          {name}
                        </button>
                      ))}
                      <AddChip
                        onAdd={(v) => {
                          if (v && !f.features.includes(v))
                            set("features", [...f.features, v]);
                        }}
                      />
                    </div>
                  </Field>
                  <div className="form-section-title">Address</div>
                  <Field label="Street address">
                    <Input
                      value={f.address}
                      onChange={(e) => set("address", e.target.value)}
                    />
                  </Field>
                  <div className="form-grid">
                    <Field label="Area">
                      <Input
                        value={f.area}
                        onChange={(e) => set("area", e.target.value)}
                      />
                    </Field>
                    <Field label="City">
                      <Input
                        value={f.city}
                        onChange={(e) => set("city", e.target.value)}
                      />
                    </Field>
                    <Field label="District">
                      <Input
                        value={f.district}
                        onChange={(e) => set("district", e.target.value)}
                      />
                    </Field>
                    <Field label="Postal code">
                      <Input
                        value={f.postal_code}
                        onChange={(e) => set("postal_code", e.target.value)}
                      />
                    </Field>
                    <Field label="Country">
                      <Input
                        value={f.country}
                        onChange={(e) => set("country", e.target.value)}
                      />
                    </Field>
                  </div>
                  <Field label="Google Maps URL">
                    <Input
                      value={f.map_url}
                      onChange={(e) => set("map_url", e.target.value)}
                      placeholder="https://maps.google.com/..."
                    />
                  </Field>
                  <Field label="Nearby places (one per line)">
                    <Textarea
                      rows={3}
                      value={f.nearby_places.join("\n")}
                      onChange={(e) =>
                        set(
                          "nearby_places",
                          e.target.value
                            .split("\n")
                            .map((v) => v.trim())
                            .filter(Boolean),
                        )
                      }
                      placeholder={
                        "School - 5 min\nHospital - 8 min\nShopping - 3 min"
                      }
                    />
                  </Field>
                </div>
              )}

              {current === "utilities" && (
                <div className="pm-card" style={{ padding: 22 }}>
                  <h3 style={{ marginTop: 0 }}>Available utilities</h3>
                  <p
                    style={{
                      color: "var(--muted)",
                      fontSize: 13,
                      marginTop: 4,
                    }}
                  >
                    Toggle what this property has. Add anything extra below.
                  </p>
                  {f.utilities.map((u, i) => (
                    <div key={u.key || i} className="pm-toggle-row">
                      <span style={{ fontWeight: 600 }}>{u.label}</span>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <button
                          type="button"
                          className={`pm-toggle ${u.active ? "on" : ""}`}
                          onClick={() => setUtility(i, { active: !u.active })}
                          aria-label={u.label}
                        />
                        {!DEFAULT_UTILITIES.some((d) => d.key === u.key) && (
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() =>
                              set(
                                "utilities",
                                f.utilities.filter((_, idx) => idx !== i),
                              )
                            }
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <AddChip
                    label="Add utility…"
                    onAdd={(v) => {
                      if (v)
                        set("utilities", [
                          ...f.utilities,
                          {
                            key: v.toLowerCase().replace(/\s+/g, "_"),
                            label: v,
                            active: true,
                          },
                        ]);
                    }}
                  />
                </div>
              )}

              {current === "media" && (
                <div className="pm-card" style={{ padding: 22 }}>
                  <h3 style={{ marginTop: 0 }}>Photos &amp; videos</h3>
                  <p
                    style={{
                      color: "var(--muted)",
                      fontSize: 13,
                      marginTop: 4,
                    }}
                  >
                    These are used on the website listing later. Upload at least
                    a cover photo.
                  </p>
                  <PropertyMediaGallery
                    propertyId={propertyId}
                    media={media}
                    featuredUrl={featuredUrl}
                    onChange={reloadMedia}
                    imagesOnly={saleMode}
                  />
                  {saleMode && (
                    <>
                      <div className="form-section-title">YouTube video</div>
                      <Field label="YouTube URL">
                        <Input
                          value={f.video_tour_url}
                          onChange={(e) =>
                            set("video_tour_url", e.target.value)
                          }
                          placeholder="https://www.youtube.com/watch?v=..."
                        />
                      </Field>
                      {youtubeEmbed(f.video_tour_url) && (
                        <div
                          style={{
                            aspectRatio: "16/9",
                            maxWidth: 640,
                            borderRadius: 12,
                            overflow: "hidden",
                            marginBottom: 14,
                          }}
                        >
                          <iframe
                            title="Property YouTube preview"
                            src={youtubeEmbed(f.video_tour_url)}
                            style={{ width: "100%", height: "100%", border: 0 }}
                            allowFullScreen
                          />
                        </div>
                      )}
                      <Field label="Drone video YouTube URL (optional)">
                        <Input
                          value={f.drone_video_url}
                          onChange={(e) =>
                            set("drone_video_url", e.target.value)
                          }
                          placeholder="https://youtu.be/..."
                        />
                      </Field>
                      <div className="form-grid">
                        <Field label="Floor plan URL (optional)">
                          <Input
                            value={f.floor_plan_url}
                            onChange={(e) =>
                              set("floor_plan_url", e.target.value)
                            }
                          />
                        </Field>
                        <Field label="Virtual tour URL (optional)">
                          <Input
                            value={f.virtual_tour_url}
                            onChange={(e) =>
                              set("virtual_tour_url", e.target.value)
                            }
                          />
                        </Field>
                      </div>
                      <div className="form-section-title">
                        Unit-wise floor plans
                      </div>
                      <p style={{ color: "var(--muted)", fontSize: 13 }}>
                        Upload a separate plan for each unit and record exactly
                        what the plan contains.
                      </p>
                      {f.unit_floor_plans.map((plan, i) => (
                        <div
                          className="pm-card"
                          key={i}
                          style={{ padding: 14, marginBottom: 12 }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 10,
                            }}
                          >
                            <strong>Unit plan {i + 1}</strong>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                set(
                                  "unit_floor_plans",
                                  f.unit_floor_plans.filter(
                                    (_, idx) => idx !== i,
                                  ),
                                )
                              }
                            >
                              <Trash2 size={13} /> Remove
                            </Button>
                          </div>
                          <div className="form-grid">
                            <Field label="Unit name / number">
                              <Input
                                value={plan.unit_label || ""}
                                onChange={(e) =>
                                  setUnitPlan(i, { unit_label: e.target.value })
                                }
                                placeholder="e.g. Unit A / Apartment 4B"
                              />
                            </Field>
                            <Field label="Floor">
                              <Input
                                value={plan.floor || ""}
                                onChange={(e) =>
                                  setUnitPlan(i, { floor: e.target.value })
                                }
                                placeholder="e.g. 4th floor"
                              />
                            </Field>
                            <Field label="Bedrooms shown">
                              <Input
                                type="number"
                                min="0"
                                value={plan.bedrooms || ""}
                                onChange={(e) =>
                                  setUnitPlan(i, { bedrooms: e.target.value })
                                }
                              />
                            </Field>
                            <Field label="Bathrooms shown">
                              <Input
                                type="number"
                                min="0"
                                value={plan.bathrooms || ""}
                                onChange={(e) =>
                                  setUnitPlan(i, { bathrooms: e.target.value })
                                }
                              />
                            </Field>
                            <Field label="Balconies shown">
                              <Input
                                type="number"
                                min="0"
                                value={plan.balconies || ""}
                                onChange={(e) =>
                                  setUnitPlan(i, { balconies: e.target.value })
                                }
                              />
                            </Field>
                            <Field label="Living areas shown">
                              <Input
                                type="number"
                                min="0"
                                value={plan.living_areas || ""}
                                onChange={(e) =>
                                  setUnitPlan(i, {
                                    living_areas: e.target.value,
                                  })
                                }
                              />
                            </Field>
                          </div>
                          <Field label="Floor plan image or PDF">
                            <FileUpload
                              folder="properties"
                              value={plan.file_url || ""}
                              onChange={(value) =>
                                setUnitPlan(i, { file_url: value })
                              }
                              label="Upload public unit floor plan"
                            />
                          </Field>
                          <Field label="Plan notes">
                            <Input
                              value={plan.notes || ""}
                              onChange={(e) =>
                                setUnitPlan(i, { notes: e.target.value })
                              }
                              placeholder="Optional website caption"
                            />
                          </Field>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Plus}
                        onClick={() =>
                          set("unit_floor_plans", [
                            ...f.unit_floor_plans,
                            {
                              unit_label: "",
                              floor: "",
                              bedrooms: "",
                              bathrooms: "",
                              balconies: "",
                              living_areas: "",
                              file_url: "",
                              notes: "",
                            },
                          ])
                        }
                      >
                        Add unit floor plan
                      </Button>
                    </>
                  )}
                </div>
              )}

              {current === "description" && (
                <div className="pm-card" style={{ padding: 22 }}>
                  <h3 style={{ marginTop: 0 }}>Description</h3>
                  <Field label="Public description (website listing)">
                    <Textarea
                      rows={6}
                      value={f.description}
                      onChange={(e) => set("description", e.target.value)}
                      placeholder="Describe the property, its condition, key features and availability…"
                    />
                  </Field>
                  <Field label="Internal remarks (staff only)">
                    <Textarea
                      rows={3}
                      value={f.remarks}
                      onChange={(e) => set("remarks", e.target.value)}
                    />
                  </Field>
                  {saleMode && (
                    <>
                      <div className="form-section-title">
                        Website search preview
                      </div>
                      <Field label="SEO title">
                        <Input
                          value={f.seo_title}
                          onChange={(e) => set("seo_title", e.target.value)}
                          placeholder={f.title || "Property listing title"}
                        />
                      </Field>
                      <Field label="SEO description">
                        <Textarea
                          rows={3}
                          maxLength={500}
                          value={f.seo_description}
                          onChange={(e) =>
                            set("seo_description", e.target.value)
                          }
                          placeholder="Short summary for Google and social sharing"
                        />
                      </Field>
                    </>
                  )}
                </div>
              )}

              {current === "access" && (
                <div className="pm-card" style={{ padding: 22 }}>
                  <h3 style={{ marginTop: 0 }}>Access to the property</h3>
                  <p
                    style={{
                      color: "var(--muted)",
                      fontSize: 13,
                      marginTop: 4,
                    }}
                  >
                    Who lets us in for assessments, viewings and maintenance?
                  </p>
                  {f.access_contacts.map((c, i) => (
                    <div
                      key={i}
                      className="form-grid"
                      style={{ alignItems: "end", marginBottom: 6 }}
                    >
                      <Field label="Name">
                        <Input
                          value={c.name || ""}
                          onChange={(e) =>
                            setAccess(i, { name: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Phone">
                        <Input
                          value={c.phone || ""}
                          onChange={(e) =>
                            setAccess(i, { phone: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Relation">
                        <div style={{ display: "flex", gap: 6 }}>
                          <Select
                            value={c.relation || "owner"}
                            onChange={(e) =>
                              setAccess(i, { relation: e.target.value })
                            }
                          >
                            <option value="owner">Owner</option>
                            <option value="caretaker">Caretaker</option>
                            <option value="family">Family member</option>
                          </Select>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() =>
                              set(
                                "access_contacts",
                                f.access_contacts.filter((_, idx) => idx !== i),
                              )
                            }
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </Field>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    icon={Plus}
                    onClick={() =>
                      set("access_contacts", [
                        ...f.access_contacts,
                        { name: "", phone: "", relation: "owner" },
                      ])
                    }
                  >
                    Add access contact
                  </Button>

                  <div className="form-section-title" style={{ marginTop: 18 }}>
                    Ownership
                  </div>
                  <Field label="Property ownership">
                    <div className="pm-seg">
                      {[
                        ["sole", "Sole owner"],
                        ["joint", "Joint owners"],
                      ].map(([v, l]) => (
                        <button
                          key={v}
                          className={f.ownership_type === v ? "on" : ""}
                          onClick={() => set("ownership_type", v)}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <p style={{ fontSize: 12, color: "var(--muted)" }}>
                    Owner details and agreement terms are added in the next
                    stage (Add owner) — this just records the ownership
                    structure.
                  </p>
                </div>
              )}

              {current === "review" && (
                <div className="pm-card" style={{ padding: 22 }}>
                  <h3 style={{ marginTop: 0 }}>Review &amp; finish</h3>
                  {saleMode ? (
                    <>
                      <Field label="Asking price (BDT)">
                        <Input
                          type="number"
                          value={f.asking_price}
                          onChange={(e) => set("asking_price", e.target.value)}
                          placeholder="৳"
                        />
                      </Field>
                      <div className="form-grid">
                        <Field label="Price negotiable">
                          <Select
                            value={f.is_negotiable ? "yes" : "no"}
                            onChange={(e) =>
                              set("is_negotiable", e.target.value === "yes")
                            }
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </Select>
                        </Field>
                        <Field label="Website visibility">
                          <Select
                            value={f.is_published ? "published" : "draft"}
                            onChange={(e) =>
                              set(
                                "is_published",
                                e.target.value === "published",
                              )
                            }
                          >
                            <option value="draft">Keep website draft</option>
                            <option value="published">
                              Publish on website
                            </option>
                          </Select>
                        </Field>
                        <Field label="Featured listing">
                          <Select
                            value={f.is_featured ? "yes" : "no"}
                            onChange={(e) =>
                              set("is_featured", e.target.value === "yes")
                            }
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </Select>
                        </Field>
                      </div>
                    </>
                  ) : (
                    <div className="form-grid">
                      <Field label="Expected monthly rent (optional)">
                        <Input
                          type="number"
                          value={f.approved_monthly_rent}
                          onChange={(e) =>
                            set("approved_monthly_rent", e.target.value)
                          }
                          placeholder="৳"
                        />
                      </Field>
                      <Field label="Market rent range (optional)">
                        <div style={{ display: "flex", gap: 6 }}>
                          <Input
                            type="number"
                            value={f.market_rent_min}
                            onChange={(e) =>
                              set("market_rent_min", e.target.value)
                            }
                            placeholder="min"
                          />
                          <Input
                            type="number"
                            value={f.market_rent_max}
                            onChange={(e) =>
                              set("market_rent_max", e.target.value)
                            }
                            placeholder="max"
                          />
                        </div>
                      </Field>
                    </div>
                  )}
                  <div
                    className="pm-card"
                    style={{
                      padding: 14,
                      background: "var(--surface-2)",
                      marginTop: 8,
                    }}
                  >
                    <SummaryRow
                      k="Property"
                      v={`${f.title} — ${f.property_type === "Other" ? f.property_type_other : f.property_type}, ${f.category}`}
                    />
                    <SummaryRow
                      k="Layout"
                      v={
                        [
                          f.bedrooms && `${f.bedrooms} bed`,
                          f.bathrooms && `${f.bathrooms} bath`,
                          f.balconies && `${f.balconies} balcony`,
                          f.total_units && `${f.total_units} units`,
                          f.drawing_rooms && `${f.drawing_rooms} drawing`,
                          f.dining_rooms && `${f.dining_rooms} dining`,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"
                      }
                    />
                    <SummaryRow
                      k="Dimensions"
                      v={
                        [
                          f.land_size && `Land ${f.land_size}`,
                          f.building_size && `Building ${f.building_size}`,
                          f.building_height && `Height ${f.building_height}`,
                          f.total_floors && `${f.total_floors} floors`,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"
                      }
                    />
                    <SummaryRow
                      k="Address"
                      v={
                        [f.address, f.area, f.city]
                          .filter(Boolean)
                          .join(", ") || "—"
                      }
                    />
                    <SummaryRow
                      k="Utilities"
                      v={
                        f.utilities
                          .filter((u) => u.active)
                          .map((u) => u.label)
                          .join(", ") || "None recorded"
                      }
                    />
                    <SummaryRow
                      k="Media"
                      v={`${media.length} file${media.length === 1 ? "" : "s"}${featuredUrl ? " · cover set" : ""}`}
                    />
                    {saleMode && (
                      <SummaryRow
                        k="Unit plans"
                        v={`${f.unit_floor_plans.length} unit floor plan${f.unit_floor_plans.length === 1 ? "" : "s"}`}
                      />
                    )}
                    <SummaryRow
                      k="Access"
                      v={
                        f.access_contacts
                          .filter((c) => c.name)
                          .map((c) => `${c.name} (${c.relation})`)
                          .join(", ") || "—"
                      }
                    />
                    <SummaryRow
                      k="Ownership"
                      v={
                        f.ownership_type
                          ? f.ownership_type === "sole"
                            ? "Sole owner"
                            : "Joint owners"
                          : "—"
                      }
                    />
                    {saleMode && (
                      <SummaryRow
                        k="Asking price"
                        v={
                          f.asking_price
                            ? `৳${Number(f.asking_price).toLocaleString("en-BD")}`
                            : "—"
                        }
                      />
                    )}
                    {saleMode && (
                      <SummaryRow
                        k="Website"
                        v={`${f.is_published ? "Published" : "Draft"}${f.is_featured ? " · Featured" : ""}${f.video_tour_url ? " · YouTube video set" : ""}`}
                      />
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: "var(--muted)",
                      marginTop: 10,
                    }}
                  >
                    {saleMode
                      ? "After finishing, add vendors, fee terms and offers from the sales property file."
                      : "After finishing you can run the market rental assessment, add the owner, and add the tenant — step by step from the property page."}
                  </p>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 16,
                }}
              >
                <Button
                  variant="ghost"
                  onClick={back}
                  disabled={step === 0 || busy}
                >
                  Back
                </Button>
                {current === "review" ? (
                  <Button onClick={finish} disabled={busy || !propertyId}>
                    {busy ? <Spinner /> : "Finish — property is ready"}
                  </Button>
                ) : (
                  <Button
                    onClick={next}
                    disabled={busy || (current === "media" && !propertyId)}
                  >
                    {busy ? <Spinner /> : "Save & continue"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ k, v }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "6px 0",
        borderBottom: "1px solid var(--line-soft,#f1f5f9)",
        fontSize: 13.5,
      }}
    >
      <span style={{ width: 110, color: "var(--muted)", flexShrink: 0 }}>
        {k}
      </span>
      <span style={{ fontWeight: 600 }}>{v}</span>
    </div>
  );
}

function AddChip({ label = "Add…", onAdd }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState("");
  if (!open)
    return (
      <button className="pm-chip" onClick={() => setOpen(true)}>
        <Plus size={12} style={{ verticalAlign: -2 }} /> {label}
      </button>
    );
  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      <Input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onAdd(v.trim());
            setV("");
            setOpen(false);
          }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={label}
        style={{ maxWidth: 180 }}
      />
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          onAdd(v.trim());
          setV("");
          setOpen(false);
        }}
      >
        Add
      </Button>
    </span>
  );
}
