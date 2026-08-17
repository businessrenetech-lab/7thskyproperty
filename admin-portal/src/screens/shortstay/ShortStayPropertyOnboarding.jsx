import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Check, ChevronLeft, ChevronRight, Home, Link2, Save } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button, Field, Input, Select, Spinner, Textarea } from '../../ui/kit';
import { Combo } from '../../ui/pickers';
import PropertyMediaGallery from '../../components/PropertyMediaGallery';

const STEPS = ['Property', 'Location & details', 'Guest listing', 'Rates & access'];

const EMPTY_PROPERTY = {
  title: '', category: 'residential', property_type: 'Apartment', listing_type: 'short_term',
  address: '', area: '', city: '', district: '', postal_code: '', country: 'Bangladesh',
  latitude: '', longitude: '', map_url: '', bedrooms: '', bathrooms: '', balconies: '', parking: '',
  land_size: '', building_size: '', floor_number: '', total_floors: '', total_units: '',
  building_height: '', year_built: '', furnishing: 'furnished', features: '', description: '',
  seo_title: '', seo_description: '',
};

const EMPTY_PROFILE = {
  public_headline: '', public_description: '', accommodation_type: 'serviced_apartment',
  bedrooms: '', bathrooms: '', max_guests: 2, max_adults: 2, max_children: 0,
  furnishing_status: 'furnished', amenities: '', base_nightly_rate: '', weekend_rate: '',
  weekly_rate: '', monthly_rate: '', cleaning_fee: '', security_deposit: '', extra_guest_fee: '',
  early_checkin_fee: '', late_checkout_fee: '', min_nights: 1, cancellation_policy: '',
  house_rules: '', checkin_time: '14:00', checkout_time: '11:00', access_instructions: '',
  wifi_name: '', wifi_password: '', seo_title: '', seo_description: '',
};

const ARRAY_FIELDS = new Set(['features', 'amenities', 'house_rules']);
const PROPERTY_NUMBER_FIELDS = new Set(['latitude', 'longitude', 'bedrooms', 'bathrooms', 'balconies', 'parking', 'total_units']);
const PROFILE_NUMBER_FIELDS = new Set([
  'bedrooms', 'bathrooms', 'max_guests', 'max_adults', 'max_children', 'base_nightly_rate',
  'weekend_rate', 'weekly_rate', 'monthly_rate', 'cleaning_fee', 'security_deposit',
  'extra_guest_fee', 'early_checkin_fee', 'late_checkout_fee', 'min_nights',
]);

const parseArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
};

const arrayText = (value) => parseArray(value).join('\n');
const numeric = (value) => (value === '' || value == null ? null : Number(value));
const responseRecord = (response) => response?.data?.data || response?.data || {};

function prefillProperty(record = {}) {
  return Object.fromEntries(Object.keys(EMPTY_PROPERTY).map((key) => [
    key,
    key === 'features' ? arrayText(record[key]) : (record[key] ?? EMPTY_PROPERTY[key]),
  ]));
}

function prefillProfile(record = {}, property = {}) {
  const next = Object.fromEntries(Object.keys(EMPTY_PROFILE).map((key) => [
    key,
    ARRAY_FIELDS.has(key) ? arrayText(record[key]) : (record[key] ?? EMPTY_PROFILE[key]),
  ]));
  next.public_headline ||= property.title || '';
  next.public_description ||= property.description || '';
  next.bedrooms = record.bedrooms ?? property.bedrooms ?? '';
  next.bathrooms = record.bathrooms ?? property.bathrooms ?? '';
  next.seo_title ||= property.seo_title || '';
  next.seo_description ||= property.seo_description || '';
  return next;
}

function Grid({ children, columns = 2 }) {
  return <div className={`ss-onboard-grid cols-${columns}`}>{children}</div>;
}

function Section({ title, note, children }) {
  return (
    <section className="pm-card ss-onboard-section">
      <div className="pm-card-h"><div><h3>{title}</h3>{note && <div className="hsub">{note}</div>}</div></div>
      <div className="pm-card-body">{children}</div>
    </section>
  );
}

export default function ShortStayPropertyOnboarding() {
  const { profileId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const editing = Boolean(profileId);
  const routeMode = location.pathname.endsWith('/link') ? 'existing' : 'new';
  const [mode, setMode] = useState(routeMode);
  const [step, setStep] = useState(0);
  const [propertyId, setPropertyId] = useState('');
  const [property, setProperty] = useState(EMPTY_PROPERTY);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [media, setMedia] = useState([]);
  const [featuredUrl, setFeaturedUrl] = useState('');
  const [loading, setLoading] = useState(editing);
  const [loadingProperty, setLoadingProperty] = useState(false);
  const [busy, setBusy] = useState(false);

  const setPropertyField = (key, value) => setProperty((current) => ({ ...current, [key]: value }));
  const setProfileField = (key, value) => setProfile((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!editing) {
      setMode(routeMode);
      return;
    }
    let active = true;
    setLoading(true);
    api.get(`/short-stay/properties/${profileId}/dashboard`)
      .then((response) => {
        if (!active) return;
        const data = responseRecord(response);
        const canonical = data.property || {};
        const listing = data.profile || {};
        setPropertyId(canonical.id || listing.property_id || '');
        setProperty(prefillProperty(canonical));
        setProfile(prefillProfile(listing, canonical));
        setMedia(Array.isArray(data.media) ? data.media : []);
        setFeaturedUrl(canonical.featured_image_url || '');
      })
      .catch((error) => toast.error(error.response?.data?.error || 'Could not load this short-stay property.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [editing, profileId, routeMode, toast]);

  const loadExisting = async (id, selected) => {
    setPropertyId(id || '');
    if (!id) return;
    setLoadingProperty(true);
    try {
      const record = responseRecord(await api.get(`/properties/${id}`));
      setProperty(prefillProperty(record));
      setProfile((current) => ({ ...prefillProfile(current, record), public_headline: current.public_headline || record.title || '' }));
      setMedia(Array.isArray(record.media) ? record.media : []);
      setFeaturedUrl(record.featured_image_url || '');
    } catch (error) {
      if (selected) {
        setProperty(prefillProperty(selected));
        setProfile((current) => ({ ...prefillProfile(current, selected), public_headline: current.public_headline || selected.title || '' }));
      }
      toast.error(error.response?.data?.error || 'Could not load the full property record.');
    } finally {
      setLoadingProperty(false);
    }
  };

  const reloadMedia = async () => {
    if (!propertyId) return;
    const record = responseRecord(await api.get(`/properties/${propertyId}`));
    setMedia(Array.isArray(record.media) ? record.media : []);
    setFeaturedUrl(record.featured_image_url || '');
  };

  const chooseMode = (nextMode) => {
    if (editing) return;
    setMode(nextMode);
    navigate(nextMode === 'existing' ? '/short-stay/properties/link' : '/short-stay/properties/new', { replace: true });
  };

  const buildPropertyPayload = () => Object.fromEntries(Object.entries(property).map(([key, value]) => {
    if (key === 'features') return [key, parseArray(value)];
    if (PROPERTY_NUMBER_FIELDS.has(key)) return [key, numeric(value)];
    return [key, value];
  }));

  const buildProfilePayload = () => Object.fromEntries(Object.entries(profile).filter(([key, value]) => !(editing && key === 'wifi_password' && !value)).map(([key, value]) => {
    if (ARRAY_FIELDS.has(key)) return [key, parseArray(value)];
    if (PROFILE_NUMBER_FIELDS.has(key)) return [key, numeric(value)];
    return [key, value];
  }));

  const save = async (event) => {
    event.preventDefault();
    if (!property.title.trim()) return toast.error('Property title is required.');
    if (mode === 'existing' && !propertyId) return toast.error('Select an existing property first.');
    if (!profile.public_headline.trim()) return toast.error('Public headline is required.');
    setBusy(true);
    try {
      const payload = { property: buildPropertyPayload(), profile: buildProfilePayload() };
      const response = editing
        ? await api.put(`/short-stay/properties/${profileId}`, payload)
        : await api.post('/short-stay/properties/onboard', { mode, ...(mode === 'existing' ? { property_id: Number(propertyId) } : {}), ...payload });
      const record = responseRecord(response);
      const savedProfile = record.profile || record;
      const savedId = savedProfile.id || record.profile_id || profileId;
      if (!savedId) throw new Error('The API did not return the short-stay profile id.');
      toast.success(editing ? 'Short-stay property updated.' : 'Short-stay property created.');
      navigate(`/short-stay/properties/${savedId}`);
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Could not save the property.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="ss-center"><Spinner /></div>;

  return (
    <div className="ss-onboard">
      <div className="pm-head">
        <div>
          <button type="button" className="pm-link" onClick={() => navigate(editing ? `/short-stay/properties/${profileId}` : '/short-stay/properties')}><ArrowLeft size={14} /> Back to properties</button>
          <div className="pm-eyebrow" style={{ marginTop: 10 }}>Short Term Stay</div>
          <h1>{editing ? 'Edit property listing' : 'Onboard a stay property'}</h1>
          <div className="pm-meta">Canonical property details and guest-facing stay settings in one record.</div>
        </div>
      </div>

      {!editing && (
        <div className="ss-entry-modes" aria-label="Property entry mode">
          <button type="button" className={mode === 'new' ? 'active' : ''} onClick={() => chooseMode('new')} aria-pressed={mode === 'new'}>
            <span className="icon"><Home size={20} /></span><span><strong>Create new property</strong><small>Build a new canonical property and short-stay profile together.</small></span>{mode === 'new' && <Check size={18} />}
          </button>
          <button type="button" className={mode === 'existing' ? 'active' : ''} onClick={() => chooseMode('existing')} aria-pressed={mode === 'existing'}>
            <span className="icon"><Link2 size={20} /></span><span><strong>Link existing property</strong><small>Reuse a sales or rental record without removing it from that channel.</small></span>{mode === 'existing' && <Check size={18} />}
          </button>
        </div>
      )}

      {mode === 'existing' && !editing && (
        <div className="ss-channel-note">
          <Building2 size={18} />
          <div><strong>The original rental or sales channel remains active.</strong><span>Short stay adds a linked operating profile; it does not replace, unpublish, or move the canonical property.</span></div>
        </div>
      )}

      <nav className="ss-onboard-steps" aria-label="Onboarding sections">
        {STEPS.map((label, index) => <button type="button" key={label} className={step === index ? 'active' : index < step ? 'done' : ''} onClick={() => setStep(index)}><span>{index < step ? <Check size={13} /> : index + 1}</span>{label}</button>)}
      </nav>

      <form onSubmit={save}>
        {step === 0 && (
          <div className="ss-onboard-stack">
            {mode === 'existing' && !editing && (
              <Section title="Choose the canonical property" note="Search all properties available to your branch.">
                <Field label="Existing property" required>
                  <Combo endpoint="/properties" labelFn={(row) => `${row.title || `Property #${row.id}`}${row.property_code ? ` · ${row.property_code}` : ''}${row.district ? ` · ${row.district}` : ''}`} value={propertyId ? Number(propertyId) : ''} onChange={loadExisting} placeholder="Search property title or code…" />
                </Field>
                {loadingProperty && <div className="ss-inline-loading"><Spinner /> Loading property details…</div>}
              </Section>
            )}
            <Section title="Canonical property" note="This information is shared by every channel using the property.">
              <Grid columns={3}>
                <Field label="Property title" required><Input value={property.title} onChange={(e) => setPropertyField('title', e.target.value)} required /></Field>
                <Field label="Category"><Select value={property.category} onChange={(e) => setPropertyField('category', e.target.value)}><option value="residential">Residential</option><option value="commercial">Commercial</option><option value="rural">Rural</option><option value="business">Business</option></Select></Field>
                <Field label="Property type"><Input value={property.property_type} onChange={(e) => setPropertyField('property_type', e.target.value)} placeholder="Apartment, villa, house…" /></Field>
              </Grid>
              <Grid columns={2}>
                <Field label="Public property description"><Textarea rows={5} value={property.description} onChange={(e) => setPropertyField('description', e.target.value)} /></Field>
                <Field label="Features" full><Textarea rows={5} value={property.features} onChange={(e) => setPropertyField('features', e.target.value)} placeholder={'Balcony\nLift\n24-hour security'} /><small className="ss-field-help">One per line or comma-separated.</small></Field>
              </Grid>
              <Grid columns={2}>
                <Field label="SEO title"><Input value={property.seo_title} onChange={(e) => setPropertyField('seo_title', e.target.value)} /></Field>
                <Field label="SEO description"><Textarea rows={2} maxLength={500} value={property.seo_description} onChange={(e) => setPropertyField('seo_description', e.target.value)} /></Field>
              </Grid>
            </Section>
          </div>
        )}

        {step === 1 && (
          <div className="ss-onboard-stack">
            <Section title="Address & map" note="Use precise guest-facing location details; access instructions remain private.">
              <Grid columns={3}>
                <Field label="Street address" full><Input value={property.address} onChange={(e) => setPropertyField('address', e.target.value)} /></Field>
                <Field label="Area"><Input value={property.area} onChange={(e) => setPropertyField('area', e.target.value)} /></Field>
                <Field label="City"><Input value={property.city} onChange={(e) => setPropertyField('city', e.target.value)} /></Field>
                <Field label="District"><Input value={property.district} onChange={(e) => setPropertyField('district', e.target.value)} /></Field>
                <Field label="Postal code"><Input value={property.postal_code} onChange={(e) => setPropertyField('postal_code', e.target.value)} /></Field>
                <Field label="Country"><Input value={property.country} onChange={(e) => setPropertyField('country', e.target.value)} /></Field>
                <Field label="Latitude"><Input type="number" step="any" value={property.latitude} onChange={(e) => setPropertyField('latitude', e.target.value)} /></Field>
                <Field label="Longitude"><Input type="number" step="any" value={property.longitude} onChange={(e) => setPropertyField('longitude', e.target.value)} /></Field>
                <Field label="Map URL"><Input type="url" value={property.map_url} onChange={(e) => setPropertyField('map_url', e.target.value)} /></Field>
              </Grid>
            </Section>
            <Section title="Dimensions & configuration">
              <Grid columns={4}>
                {[
                  ['bedrooms', 'Bedrooms'], ['bathrooms', 'Bathrooms'], ['balconies', 'Balconies'], ['parking', 'Parking spaces'],
                ].map(([key, label]) => <Field key={key} label={label}><Input type="number" min="0" value={property[key]} onChange={(e) => setPropertyField(key, e.target.value)} /></Field>)}
                <Field label="Land size"><Input value={property.land_size} onChange={(e) => setPropertyField('land_size', e.target.value)} placeholder="e.g. 5 katha" /></Field>
                <Field label="Building / unit size"><Input value={property.building_size} onChange={(e) => setPropertyField('building_size', e.target.value)} placeholder="e.g. 1,850 sq ft" /></Field>
                <Field label="Floor"><Input value={property.floor_number} onChange={(e) => setPropertyField('floor_number', e.target.value)} /></Field>
                <Field label="Total floors"><Input value={property.total_floors} onChange={(e) => setPropertyField('total_floors', e.target.value)} /></Field>
                <Field label="Total units"><Input type="number" min="0" value={property.total_units} onChange={(e) => setPropertyField('total_units', e.target.value)} /></Field>
                <Field label="Building height"><Input value={property.building_height} onChange={(e) => setPropertyField('building_height', e.target.value)} /></Field>
                <Field label="Year built"><Input value={property.year_built} onChange={(e) => setPropertyField('year_built', e.target.value)} /></Field>
                <Field label="Furnishing"><Select value={property.furnishing} onChange={(e) => setPropertyField('furnishing', e.target.value)}><option value="furnished">Furnished</option><option value="semi_furnished">Semi furnished</option><option value="unfurnished">Unfurnished</option></Select></Field>
              </Grid>
            </Section>
          </div>
        )}

        {step === 2 && (
          <div className="ss-onboard-stack">
            <Section title="Public stay listing" note="The short-stay headline and copy can differ from the canonical listing.">
              <Grid columns={2}>
                <Field label="Public headline" required><Input value={profile.public_headline} onChange={(e) => setProfileField('public_headline', e.target.value)} required /></Field>
                <Field label="Accommodation type"><Select value={profile.accommodation_type} onChange={(e) => setProfileField('accommodation_type', e.target.value)}><option value="serviced_apartment">Serviced apartment</option><option value="furnished_apartment">Furnished apartment</option><option value="holiday_home">Holiday home</option><option value="guest_house">Guest house</option><option value="executive_suite">Executive suite</option><option value="vacation_rental">Vacation rental</option></Select></Field>
                <Field label="Public guest description" full><Textarea rows={6} value={profile.public_description} onChange={(e) => setProfileField('public_description', e.target.value)} /></Field>
              </Grid>
              <Grid columns={4}>
                <Field label="Bedrooms"><Input type="number" min="0" value={profile.bedrooms} onChange={(e) => setProfileField('bedrooms', e.target.value)} /></Field>
                <Field label="Bathrooms"><Input type="number" min="0" step="1" value={profile.bathrooms} onChange={(e) => setProfileField('bathrooms', e.target.value)} /></Field>
                <Field label="Maximum guests"><Input type="number" min="1" value={profile.max_guests} onChange={(e) => setProfileField('max_guests', e.target.value)} /></Field>
                <Field label="Maximum adults"><Input type="number" min="1" value={profile.max_adults} onChange={(e) => setProfileField('max_adults', e.target.value)} /></Field>
                <Field label="Maximum children"><Input type="number" min="0" value={profile.max_children} onChange={(e) => setProfileField('max_children', e.target.value)} /></Field>
                <Field label="Furnishing status"><Select value={profile.furnishing_status} onChange={(e) => setProfileField('furnishing_status', e.target.value)}><option value="furnished">Furnished</option><option value="semi_furnished">Semi furnished</option><option value="unfurnished">Unfurnished</option></Select></Field>
              </Grid>
              <Field label="Guest amenities"><Textarea rows={4} value={profile.amenities} onChange={(e) => setProfileField('amenities', e.target.value)} placeholder={'Air conditioning\nKitchen\nWasher\nDedicated workspace'} /><small className="ss-field-help">One per line or comma-separated.</small></Field>
              <Grid columns={2}>
                <Field label="Listing SEO title"><Input value={profile.seo_title} onChange={(e) => setProfileField('seo_title', e.target.value)} /></Field>
                <Field label="Listing SEO description"><Textarea rows={2} maxLength={500} value={profile.seo_description} onChange={(e) => setProfileField('seo_description', e.target.value)} /></Field>
              </Grid>
            </Section>
          </div>
        )}

        {step === 3 && (
          <div className="ss-onboard-stack">
            <Section title="Rates & fees" note="Enter BDT amounts. Leave an optional rate empty when it does not apply.">
              <Grid columns={4}>
                {[
                  ['base_nightly_rate', 'Base nightly rate'], ['weekend_rate', 'Weekend nightly rate'], ['weekly_rate', 'Weekly rate'], ['monthly_rate', 'Monthly rate'],
                  ['cleaning_fee', 'Cleaning fee'], ['security_deposit', 'Security deposit'], ['extra_guest_fee', 'Extra guest fee'], ['early_checkin_fee', 'Early check-in fee'], ['late_checkout_fee', 'Late check-out fee'],
                ].map(([key, label]) => <Field key={key} label={`${label} (৳)`}><Input type="number" min="0" step="0.01" value={profile[key]} onChange={(e) => setProfileField(key, e.target.value)} /></Field>)}
                <Field label="Minimum nights"><Input type="number" min="1" value={profile.min_nights} onChange={(e) => setProfileField('min_nights', e.target.value)} /></Field>
              </Grid>
              <Field label="Cancellation policy"><Textarea rows={3} value={profile.cancellation_policy} onChange={(e) => setProfileField('cancellation_policy', e.target.value)} /></Field>
              <Field label="House rules"><Textarea rows={5} value={profile.house_rules} onChange={(e) => setProfileField('house_rules', e.target.value)} placeholder={'No smoking\nNo parties\nQuiet hours after 10 PM'} /><small className="ss-field-help">One rule per line.</small></Field>
            </Section>
            <Section title="Check-in & private access" note="Access instructions and Wi-Fi credentials are operational data and are not shown on public listing cards.">
              <Grid columns={2}>
                <Field label="Check-in time"><Input type="time" value={profile.checkin_time} onChange={(e) => setProfileField('checkin_time', e.target.value)} /></Field>
                <Field label="Check-out time"><Input type="time" value={profile.checkout_time} onChange={(e) => setProfileField('checkout_time', e.target.value)} /></Field>
                <Field label="Private access instructions" full><Textarea rows={4} value={profile.access_instructions} onChange={(e) => setProfileField('access_instructions', e.target.value)} /></Field>
                <Field label="Wi-Fi network"><Input value={profile.wifi_name} onChange={(e) => setProfileField('wifi_name', e.target.value)} autoComplete="off" /></Field>
                <Field label="Wi-Fi password"><Input type="password" value={profile.wifi_password} onChange={(e) => setProfileField('wifi_password', e.target.value)} autoComplete="new-password" /></Field>
              </Grid>
            </Section>
            {editing && propertyId && (
              <Section title="Canonical property media" note="These public photos and videos are reused by the website listing.">
                <PropertyMediaGallery propertyId={propertyId} media={media} featuredUrl={featuredUrl} onChange={reloadMedia} />
              </Section>
            )}
          </div>
        )}

        <div className="ss-onboard-actions">
          <Button type="button" variant="ghost" icon={ChevronLeft} disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>Previous</Button>
          {step < STEPS.length - 1
            ? <Button type="button" icon={ChevronRight} onClick={() => setStep((current) => Math.min(STEPS.length - 1, current + 1))}>Continue</Button>
            : <Button type="submit" icon={editing ? Save : Home} disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : mode === 'existing' ? 'Link & create listing' : 'Create property'}</Button>}
        </div>
      </form>
    </div>
  );
}
