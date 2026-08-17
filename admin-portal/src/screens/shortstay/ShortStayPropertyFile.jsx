import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Banknote, BedDouble, Building2, CalendarDays, CheckCircle2,
  ClipboardCheck, Clock3, Edit3, ExternalLink, FileCheck2, FileText, Globe2, Home,
  Image as ImageIcon, KeyRound, MapPin, Plus, RefreshCw, ShieldCheck, Sparkles,
  Trash2, UserRound, UsersRound, WalletCards, Wrench,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button, Field, Input, Select, Spinner, Textarea } from '../../ui/kit';
import { fileSrc } from '../../ui/FileUpload';
import PropertyMediaGallery from '../../components/PropertyMediaGallery';
import { bdtFull, Chip, fmtDate, fmtRange, Kpi } from './common';

const SECTIONS = [
  ['overview', 'Overview'], ['listing', 'Public listing'], ['rates', 'Rates & availability'],
  ['reservations', 'Reservations'], ['guests', 'Guests'], ['operations', 'Operations'],
  ['owner', 'Owner & compliance'], ['finance', 'Finance'], ['documents', 'Documents'], ['activity', 'Activity'],
];

const arrayValue = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean); }
  }
  return [];
};

const records = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.rows)) return value.rows;
  if (!value) return [];
  return [value];
};

const dataOf = (response) => response?.data?.data || response?.data || {};
const titleCase = (value = '') => String(value).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
const display = (value) => {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ') || '—';
  if (typeof value === 'object') return value.name || value.title || value.label || value.status || 'Recorded';
  return String(value);
};
const dateTime = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' });
};
const amount = (value) => bdtFull(Number(value || 0));

function Panel({ icon: Icon, title, note, action, children, className = '' }) {
  return (
    <section className={`pm-card ss-file-panel ${className}`}>
      <div className="pm-card-h">
        {Icon && <div className="ic"><Icon size={17} /></div>}
        <div><h3>{title}</h3>{note && <div className="hsub">{note}</div>}</div>
        <div className="sp" />{action}
      </div>
      <div className="pm-card-body">{children}</div>
    </section>
  );
}

function Empty({ children }) {
  return <div className="ss-file-empty">{children}</div>;
}

function Facts({ items }) {
  return <dl className="ss-file-facts">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{display(value)}</dd></div>)}</dl>;
}

function Table({ headers, children, empty, colSpan }) {
  return (
    <div className="ss-table-scroll">
      <table className="pm-tbl">
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>{children || <tr><td colSpan={colSpan || headers.length}><Empty>{empty}</Empty></td></tr>}</tbody>
      </table>
    </div>
  );
}

export default function ShortStayPropertyFile() {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [active, setActive] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [block, setBlock] = useState({ start_date: '', end_date: '', block_type: 'owner_hold', notes: '' });
  const [ratePlan, setRatePlan] = useState({ name: '', start_date: '', end_date: '', nightly_rate: '', weekend_rate: '', min_nights: 1, priority: 0 });
  const [readinessForm, setReadinessForm] = useState({ items: [], notes: '', photos: [], is_passed: false });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(dataOf(await api.get(`/short-stay/properties/${profileId}/dashboard`)));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not load the property workspace.');
    } finally {
      setLoading(false);
    }
  }, [profileId, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (data?.property_readiness) setReadinessForm(data.property_readiness);
  }, [data]);

  const profile = data?.profile || {};
  const property = data?.property || {};
  const media = records(data?.media);
  const documents = records(data?.documents);
  const bookings = records(data?.bookings);
  const blocks = records(data?.availability_blocks);
  const ratePlans = records(data?.rate_plans);
  const readiness = records(data?.readiness);
  const housekeeping = records(data?.housekeeping);
  const incidents = records(data?.incidents);
  const ownerRecords = records(data?.owner_management);
  const owner = ownerRecords[0] || {};
  const finance = data?.finance || {};
  const blockers = records(data?.blockers);
  const kpis = data?.kpis || {};

  const cover = property.featured_image_url
    || media.find((item) => item.is_featured || item.is_cover)?.file_url
    || media.find((item) => item.media_type !== 'video')?.file_url;
  const address = [property.address, property.area, property.city, property.district, property.country].filter(Boolean).join(', ');
  const websiteBase = (import.meta.env.VITE_WEBSITE_URL || window.location.origin).replace(/\/$/, '');

  const activity = useMemo(() => {
    const collected = [];
    const add = (rows, label, detail) => records(rows).forEach((row) => {
      const timestamp = row.updated_at || row.updatedAt || row.created_at || row.createdAt || row.reported_at || row.scheduled_date || row.check_in_date;
      if (timestamp) collected.push({ id: `${label}-${row.id || collected.length}`, label, detail: detail(row), timestamp });
    });
    add(bookings, 'Reservation', (row) => `${row.booking_code || 'Booking'} · ${row.lead_guest?.full_name || row.guest_name || 'Guest'} · ${titleCase(row.status)}`);
    add(blocks, 'Availability block', (row) => `${titleCase(row.block_type || 'manual block')} · ${fmtRange(row.start_date, row.end_date)}`);
    add(housekeeping, 'Housekeeping', (row) => `${titleCase(row.task_type || 'Task')} · ${titleCase(row.status)}`);
    add(incidents, 'Incident', (row) => `${titleCase(row.severity)} · ${row.description || titleCase(row.category)}`);
    add(documents, 'Document', (row) => `${row.title || row.name || row.document_type || 'Document'} · ${titleCase(row.status || 'uploaded')}`);
    add(readiness, 'Readiness', (row) => `${titleCase(row.check_type || row.type || 'Check')} · ${row.is_passed ? 'Passed' : titleCase(row.status || 'Recorded')}`);
    add(ownerRecords, 'Owner management', (row) => `Agreement ${titleCase(row.status || row.agreement_status || 'recorded')}`);
    return collected.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [bookings, blocks, housekeeping, incidents, documents, readiness, ownerRecords]);

  const guests = useMemo(() => bookings.flatMap((booking) => {
    const lead = booking.lead_guest || (booking.guest_name ? { full_name: booking.guest_name } : null);
    const rows = lead ? [{ ...lead, role: 'Lead guest', booking }] : [];
    return rows.concat(records(booking.occupants).map((guest) => ({ ...guest, role: guest.relationship || 'Occupant', booking })));
  }), [bookings]);

  const togglePublish = async () => {
    setBusy('publish');
    try {
      await api.patch(`/short-stay/properties/${profile.id || profileId}/website-toggle`, { is_website_listed: !profile.is_website_listed });
      toast.success(profile.is_website_listed ? 'Listing unpublished.' : 'Listing published.');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not update the website listing.');
    } finally { setBusy(''); }
  };

  const createBlock = async (event) => {
    event.preventDefault();
    if (!block.start_date || !block.end_date) return toast.error('Start and end dates are required.');
    if (block.end_date <= block.start_date) return toast.error('End date must be after the start date.');
    setBusy('block');
    try {
      await api.post('/short-stay/availability/blocks', { property_id: property.id || profile.property_id, ...block });
      toast.success('Availability block added.');
      setBlock({ start_date: '', end_date: '', block_type: 'owner_hold', notes: '' });
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not create the block.');
    } finally { setBusy(''); }
  };

  const removeBlock = async (row) => {
    if (!window.confirm(`Remove the ${titleCase(row.block_type || 'manual')} block?`)) return;
    setBusy(`block-${row.id}`);
    try {
      await api.delete(`/short-stay/availability/blocks/${row.id}`);
      toast.success('Availability block removed.');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Could not remove the block.');
    } finally { setBusy(''); }
  };

  const createRatePlan = async (event) => {
    event.preventDefault();
    if (!ratePlan.name.trim() || !ratePlan.start_date || !ratePlan.end_date || ratePlan.nightly_rate === '') return toast.error('Name, dates, and nightly rate are required.');
    if (ratePlan.end_date <= ratePlan.start_date) return toast.error('Rate-plan end date must be after its start date.');
    setBusy('rate-plan');
    try {
      await api.post(`/short-stay/properties/${profile.id || profileId}/rate-plans`, {
        ...ratePlan,
        nightly_rate: Number(ratePlan.nightly_rate),
        weekend_rate: ratePlan.weekend_rate === '' ? null : Number(ratePlan.weekend_rate),
        min_nights: Number(ratePlan.min_nights || 1),
        priority: Number(ratePlan.priority || 0),
      });
      toast.success('Seasonal rate plan added.');
      setRatePlan({ name: '', start_date: '', end_date: '', nightly_rate: '', weekend_rate: '', min_nights: 1, priority: 0 });
      await load();
    } catch (error) { toast.error(error.response?.data?.error || 'Could not add the rate plan.'); }
    finally { setBusy(''); }
  };

  const removeRatePlan = async (row) => {
    if (!window.confirm(`Remove rate plan “${row.name}”?`)) return;
    setBusy(`rate-${row.id}`);
    try {
      await api.delete(`/short-stay/rate-plans/${row.id}`);
      toast.success('Rate plan removed.');
      await load();
    } catch (error) { toast.error(error.response?.data?.error || 'Could not remove the rate plan.'); }
    finally { setBusy(''); }
  };

  const savePropertyReadiness = async (pass) => {
    setBusy('property-readiness');
    try {
      await api.put(`/short-stay/properties/${profile.id || profileId}/readiness`, { ...readinessForm, is_passed: pass });
      toast.success(pass ? 'Property readiness passed.' : 'Readiness progress saved.');
      await load();
    } catch (error) { toast.error(error.response?.data?.error || 'Could not save property readiness.'); }
    finally { setBusy(''); }
  };

  if (loading && !data) return <div className="ss-center"><Spinner /></div>;
  if (!data) return <div className="pm-card"><div className="pm-empty">Property workspace unavailable.</div></div>;

  const renderOverview = () => (
    <div className="ss-file-grid two">
      <Panel icon={Home} title="Property brief" note="Canonical record shared across channels">
        <Facts items={[
          ['Property code', property.property_code], ['Property type', property.property_type],
          ['Accommodation', titleCase(profile.accommodation_type)], ['Address', address],
          ['Configuration', `${profile.bedrooms ?? property.bedrooms ?? 0} bed · ${profile.bathrooms ?? property.bathrooms ?? 0} bath`],
          ['Capacity', `${profile.max_guests || 0} guests · ${profile.max_adults || 0} adults · ${profile.max_children || 0} children`],
          ['Check-in / out', `${profile.checkin_time || '—'} / ${profile.checkout_time || '—'}`],
          ['Canonical channel', titleCase(property.listing_type)],
        ]} />
      </Panel>
      <Panel icon={CalendarDays} title="Next reservation" note="Nearest recorded guest stay">
        {bookings.length ? (() => {
          const next = [...bookings].filter((row) => !['cancelled', 'closed'].includes(row.status)).sort((a, b) => String(a.check_in_date).localeCompare(String(b.check_in_date)))[0] || bookings[0];
          return <><div className="ss-next-booking"><strong>{next.lead_guest?.full_name || next.guest_name || 'Guest'}</strong><Chip k={next.status} /></div><Facts items={[["Reference", next.booking_code], ['Stay', fmtRange(next.check_in_date, next.check_out_date)], ['Party', `${next.adults_count || 0} adults · ${next.children_count || 0} children`], ['Value', amount(next.total_booking_value)]]} /></>;
        })() : <Empty>No reservations recorded for this property.</Empty>}
      </Panel>
      <Panel icon={ClipboardCheck} title="Readiness position" note="Latest property and stay checks">
        {readiness.length ? <div className="ss-status-list">{readiness.slice(0, 6).map((row, index) => <div key={row.id || index}><span><strong>{titleCase(row.check_type || row.type || 'Readiness check')}</strong><small>{row.notes || `${arrayValue(row.items).filter((item) => item.completed || item.checked).length} completed items`}</small></span><Chip k={row.is_passed ? 'ready' : row.status || 'pending'} /></div>)}</div> : <Empty>No readiness checks recorded yet.</Empty>}
      </Panel>
      <Panel icon={AlertTriangle} title="Open attention" note="Current blockers and operational issues">
        {blockers.length ? <div className="ss-blocker-list">{blockers.map((row, index) => <div key={row.id || row.key || index}><AlertTriangle size={15} /><span><strong>{row.title || row.label || row.message || display(row)}</strong>{row.detail && <small>{row.detail}</small>}</span></div>)}</div> : <div className="ss-clear-state"><CheckCircle2 size={22} /><span><strong>No active blockers</strong><small>The property has no reported onboarding or operating blockers.</small></span></div>}
      </Panel>
    </div>
  );

  const renderListing = () => (
    <div className="ss-file-stack">
      <Panel icon={Globe2} title="Guest-facing listing" note={profile.is_website_listed ? 'Currently visible on the public website' : 'Draft or unpublished'} action={profile.public_slug && <a className="pm-btn" href={`${websiteBase}/short-stays/${profile.public_slug}`} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Preview</a>}>
        <div className="ss-listing-copy"><div><span>Headline</span><h2>{profile.public_headline || property.title}</h2></div><div><span>Public description</span><p>{profile.public_description || property.description || 'No guest-facing description has been supplied.'}</p></div></div>
        <div className="ss-chip-cloud" aria-label="Amenities">{arrayValue(profile.amenities).map((item) => <span key={item}>{item}</span>)}{!arrayValue(profile.amenities).length && <small>No amenities recorded.</small>}</div>
        <Facts items={[["Minimum stay", `${profile.min_nights || 1} night${Number(profile.min_nights || 1) === 1 ? '' : 's'}`], ['Cancellation policy', profile.cancellation_policy], ['House rules', arrayValue(profile.house_rules)], ['SEO title', profile.seo_title || property.seo_title], ['SEO description', profile.seo_description || property.seo_description]]} />
      </Panel>
      <Panel icon={ImageIcon} title="Public media" note="Upload, remove, and choose the canonical cover image">
        <PropertyMediaGallery propertyId={property.id || profile.property_id} media={media} featuredUrl={property.featured_image_url} onChange={load} />
      </Panel>
    </div>
  );

  const renderRates = () => (
    <div className="ss-file-stack">
      <div className="ss-rate-grid">
        {[
          ['Nightly', profile.base_nightly_rate], ['Weekend', profile.weekend_rate], ['Weekly', profile.weekly_rate], ['Monthly', profile.monthly_rate],
          ['Cleaning', profile.cleaning_fee], ['Deposit', profile.security_deposit], ['Extra guest', profile.extra_guest_fee], ['Early / late', Number(profile.early_checkin_fee || 0) + Number(profile.late_checkout_fee || 0)],
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{amount(value)}</strong></div>)}
      </div>
      <Panel icon={Banknote} title="Seasonal rate plans" note="Higher-priority plans override base rates for their date window.">
        <form className="ss-rate-plan-form" onSubmit={createRatePlan}>
          <Field label="Plan name" required><Input value={ratePlan.name} onChange={(e) => setRatePlan((current) => ({ ...current, name: e.target.value }))} placeholder="Eid peak, winter corporate…" /></Field>
          <Field label="Start" required><Input type="date" value={ratePlan.start_date} onChange={(e) => setRatePlan((current) => ({ ...current, start_date: e.target.value }))} /></Field>
          <Field label="End (exclusive)" required><Input type="date" value={ratePlan.end_date} onChange={(e) => setRatePlan((current) => ({ ...current, end_date: e.target.value }))} /></Field>
          <Field label="Nightly rate"><Input type="number" min="0" value={ratePlan.nightly_rate} onChange={(e) => setRatePlan((current) => ({ ...current, nightly_rate: e.target.value }))} /></Field>
          <Field label="Weekend rate"><Input type="number" min="0" value={ratePlan.weekend_rate} onChange={(e) => setRatePlan((current) => ({ ...current, weekend_rate: e.target.value }))} /></Field>
          <Field label="Minimum nights"><Input type="number" min="1" value={ratePlan.min_nights} onChange={(e) => setRatePlan((current) => ({ ...current, min_nights: e.target.value }))} /></Field>
          <Field label="Priority"><Input type="number" value={ratePlan.priority} onChange={(e) => setRatePlan((current) => ({ ...current, priority: e.target.value }))} /></Field>
          <Button type="submit" icon={Plus} disabled={busy === 'rate-plan'}>{busy === 'rate-plan' ? 'Adding…' : 'Add rate plan'}</Button>
        </form>
        <Table headers={['Plan', 'Date window', 'Nightly', 'Weekend', 'Minimum', 'Priority', 'Action']} empty="No seasonal rate plans. Base property rates apply.">
          {ratePlans.length ? ratePlans.map((row) => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{fmtRange(row.start_date, row.end_date)}</td><td>{amount(row.nightly_rate)}</td><td>{row.weekend_rate != null ? amount(row.weekend_rate) : '—'}</td><td>{row.min_nights} nights</td><td>{row.priority}</td><td><button type="button" className="pm-btn ss-icon-btn" onClick={() => removeRatePlan(row)} disabled={busy === `rate-${row.id}`} aria-label={`Remove ${row.name}`}><Trash2 size={14} /></button></td></tr>) : null}
        </Table>
      </Panel>
      <Panel icon={Plus} title="Add manual availability block" note="Use for owner stays, maintenance, or other non-bookable periods.">
        <form className="ss-block-form" onSubmit={createBlock}>
          <Field label="Start" required><Input type="date" value={block.start_date} onChange={(e) => setBlock((current) => ({ ...current, start_date: e.target.value }))} required /></Field>
          <Field label="End" required><Input type="date" value={block.end_date} onChange={(e) => setBlock((current) => ({ ...current, end_date: e.target.value }))} required /></Field>
          <Field label="Block type"><Select value={block.block_type} onChange={(e) => setBlock((current) => ({ ...current, block_type: e.target.value }))}><option value="owner_hold">Owner stay</option><option value="maintenance">Maintenance</option><option value="blocked">Unavailable</option><option value="cleaning">Cleaning reset</option></Select></Field>
          <Field label="Reason"><Input value={block.notes} onChange={(e) => setBlock((current) => ({ ...current, notes: e.target.value }))} placeholder="Internal reason" /></Field>
          <Button type="submit" icon={Plus} disabled={busy === 'block'}>{busy === 'block' ? 'Adding…' : 'Add block'}</Button>
        </form>
      </Panel>
      <Panel icon={CalendarDays} title="Manual blocks" note={`${blocks.length} recorded period${blocks.length === 1 ? '' : 's'}`}>
        <Table headers={['Type', 'Period', 'Reason', 'Status', 'Action']} empty="No manual blocks recorded.">
          {blocks.length ? blocks.map((row, index) => <tr key={row.id || index}><td>{titleCase(row.block_type)}</td><td>{fmtRange(row.start_date, row.end_date)}</td><td>{row.reason || row.notes || '—'}</td><td><Chip k={row.status || 'active'} /></td><td><button type="button" className="pm-btn ss-icon-btn" onClick={() => removeBlock(row)} disabled={!row.id || busy === `block-${row.id}`} aria-label={`Remove ${titleCase(row.block_type)} block`}><Trash2 size={14} /></button></td></tr>) : null}
        </Table>
      </Panel>
    </div>
  );

  const renderReservations = () => (
    <Panel icon={CalendarDays} title="Reservations" note="Every booking attached to this property">
      <Table headers={['Reference', 'Guest', 'Stay', 'Party', 'Source', 'Value', 'Status']} empty="No reservations recorded.">
        {bookings.length ? bookings.map((row, index) => <tr key={row.id || index}><td><strong>{row.booking_code || `#${row.id}`}</strong></td><td>{row.lead_guest?.full_name || row.guest_name || '—'}</td><td>{fmtRange(row.check_in_date, row.check_out_date)}</td><td>{row.adults_count || 0} adults · {row.children_count || 0} children</td><td>{titleCase(row.booking_source || 'direct')}</td><td>{amount(row.total_booking_value)}</td><td><Chip k={row.status} /></td></tr>) : null}
      </Table>
    </Panel>
  );

  const renderGuests = () => (
    <Panel icon={UsersRound} title="Guests" note="Lead guests and recorded occupants across this property's stays">
      <Table headers={['Guest', 'Role', 'Reservation', 'Stay', 'Verification', 'Contact']} empty="No guest records are attached yet.">
        {guests.length ? guests.map((row, index) => <tr key={`${row.booking?.id}-${row.id || index}`}><td><strong>{row.full_name || row.name || 'Guest'}</strong></td><td>{titleCase(row.role)}</td><td>{row.booking?.booking_code || '—'}</td><td>{fmtRange(row.booking?.check_in_date, row.booking?.check_out_date)}</td><td><Chip k={row.verification_status || row.verification || 'not_started'} /></td><td>{row.primary_phone || row.phone || row.email || '—'}</td></tr>) : null}
      </Table>
    </Panel>
  );

  const renderOperations = () => (
    <div className="ss-file-stack">
      <Panel icon={ShieldCheck} title="Property readiness assessment" note="Required before activation and website publication.">
        <div className="ss-readiness-checklist">
          {records(readinessForm.items).map((item, index) => <button type="button" key={`${item.label}-${index}`} className={item.done ? 'done' : ''} onClick={() => setReadinessForm((current) => ({ ...current, is_passed: false, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, done: !row.done } : row) }))}><span>{item.done ? <CheckCircle2 size={15} /> : index + 1}</span>{item.label}</button>)}
        </div>
        <Field label="Readiness notes"><Textarea rows={3} value={readinessForm.notes || ''} onChange={(e) => setReadinessForm((current) => ({ ...current, notes: e.target.value, is_passed: false }))} placeholder="Outstanding work, evidence, or approval notes…" /></Field>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button type="button" variant="ghost" onClick={() => savePropertyReadiness(false)} disabled={busy === 'property-readiness'}>Save progress</Button>
          <Button type="button" icon={ShieldCheck} onClick={() => savePropertyReadiness(true)} disabled={busy === 'property-readiness' || !readinessForm.items?.length || readinessForm.items.some((item) => !item.done)}>Pass readiness</Button>
        </div>
      </Panel>
      <div className="ss-file-grid two">
        <Panel icon={Sparkles} title="Housekeeping" note={`${housekeeping.filter((row) => row.status !== 'completed').length} open task(s)`}>
          {housekeeping.length ? <div className="ss-status-list">{housekeeping.map((row, index) => <div key={row.id || index}><span><strong>{titleCase(row.task_type || 'Task')}</strong><small>{fmtDate(row.scheduled_date)} · {row.provider_name || 'Unassigned'} · {amount(row.cost)}</small></span><Chip k={row.status} /></div>)}</div> : <Empty>No housekeeping tasks recorded.</Empty>}
        </Panel>
        <Panel icon={Wrench} title="Incidents & maintenance" note={`${incidents.filter((row) => !['resolved', 'closed'].includes(row.status)).length} open incident(s)`}>
          {incidents.length ? <div className="ss-status-list">{incidents.map((row, index) => <div key={row.id || index}><span><strong>{row.description || titleCase(row.category)}</strong><small>{titleCase(row.severity)} · {row.provider_name || 'Unassigned'} · est. {amount(row.estimated_cost)}</small></span><Chip k={row.status} /></div>)}</div> : <Empty>No incidents recorded.</Empty>}
        </Panel>
      </div>
      <Panel icon={ClipboardCheck} title="Readiness checks" note="Pre-arrival, exit, and property setup checks">
        <Table headers={['Check', 'Reservation', 'Progress', 'Notes', 'Updated', 'Result']} empty="No readiness records available.">
          {readiness.length ? readiness.map((row, index) => { const items = arrayValue(row.items); const complete = items.filter((item) => item.completed || item.checked || item.done).length; return <tr key={row.id || index}><td>{titleCase(row.check_type || row.type || 'Readiness')}</td><td>{row.booking_code || row.booking_id || 'Property'}</td><td>{items.length ? `${complete}/${items.length}` : 'Recorded'}</td><td>{row.notes || '—'}</td><td>{dateTime(row.updated_at || row.updatedAt)}</td><td><Chip k={row.is_passed ? 'ready' : row.status || 'pending'} /></td></tr>; }) : null}
        </Table>
      </Panel>
    </div>
  );

  const renderOwner = () => (
    <div className="ss-file-grid two">
      <Panel icon={UserRound} title="Owner management" note="Authority, commercial terms, and agreement position">
        {ownerRecords.length ? <Facts items={[
          ['Owner', owner.owner_name || owner.primary_owner?.full_name || owner.primary_owner_contact_id],
          ['Agreement status', titleCase(owner.agreement_status || owner.status)], ['Revenue share', owner.revenue_share_percent != null ? `${owner.revenue_share_percent}%` : null],
          ['Effective from', fmtDate(owner.effective_date || owner.start_date)], ['Agreement reference', owner.agreement_code || owner.envelope_code || owner.agreement_envelope_id],
          ['Management status', titleCase(profile.status)],
        ]} /> : <Empty>No owner management record is linked yet.</Empty>}
      </Panel>
      <Panel icon={ShieldCheck} title="Compliance position" note="Documents and readiness evidence">
        <Facts items={[
          ['Documents', `${documents.length} attached`], ['Readiness checks', `${readiness.length} recorded`],
          ['Open incidents', incidents.filter((row) => !['resolved', 'closed'].includes(row.status)).length],
          ['Listing status', profile.is_website_listed ? 'Published' : 'Not published'], ['Property lifecycle', titleCase(profile.status)],
          ['Blockers', blockers.length],
        ]} />
      </Panel>
    </div>
  );

  const renderFinance = () => {
    const financeKpis = finance.kpis || finance.kpi || (typeof finance === 'object' && !Array.isArray(finance) ? finance : {});
    const summary = Object.entries(financeKpis).filter(([, value]) => ['number', 'string'].includes(typeof value)).slice(0, 8);
    const charges = records(finance.charges || finance.transactions || finance.entries);
    return <div className="ss-file-stack">
      <div className="ss-rate-grid">{summary.length ? summary.map(([key, value]) => <div key={key}><span>{titleCase(key)}</span><strong>{/amount|revenue|income|expense|fee|payable|deposit|balance|paid|due/i.test(key) ? amount(value) : display(value)}</strong></div>) : <div><span>Booking value</span><strong>{amount(bookings.reduce((total, row) => total + Number(row.total_booking_value || 0), 0))}</strong></div>}</div>
      <Panel icon={Banknote} title="Charges & transactions" note="Property-level financial records returned by the dashboard">
        <Table headers={['Reference', 'Description', 'Date', 'Amount', 'Due', 'Status']} empty="No property-level finance entries recorded.">
          {charges.length ? charges.map((row, index) => <tr key={row.id || index}><td>{row.reference || row.booking_code || `#${row.id || index + 1}`}</td><td>{row.description || row.charge_type || row.type || 'Transaction'}</td><td>{fmtDate(row.date || row.created_at || row.createdAt)}</td><td>{amount(row.amount || row.total)}</td><td>{amount(row.due || row.balance)}</td><td><Chip k={row.status || (row.due ? 'due' : 'paid')} /></td></tr>) : null}
        </Table>
      </Panel>
    </div>;
  };

  const renderDocuments = () => (
    <Panel icon={FileText} title="Property documents" note="Agreements, compliance records, and operating files">
      <Table headers={['Document', 'Type', 'Reference', 'Uploaded', 'Status', 'File']} empty="No documents are attached to this property.">
        {documents.length ? documents.map((row, index) => { const url = row.file_url || row.url || row.document_url; return <tr key={row.id || index}><td><strong>{row.title || row.name || row.document_name || 'Document'}</strong></td><td>{titleCase(row.document_type || row.type || row.category)}</td><td>{row.reference || row.document_code || '—'}</td><td>{fmtDate(row.created_at || row.createdAt || row.uploaded_at)}</td><td><Chip k={row.status || 'active'} /></td><td>{url ? <a className="pm-btn ss-icon-btn" href={fileSrc(url)} target="_blank" rel="noreferrer" aria-label={`Open ${row.title || row.name || 'document'}`}><ExternalLink size={14} /></a> : '—'}</td></tr>; }) : null}
      </Table>
    </Panel>
  );

  const renderActivity = () => (
    <Panel icon={Clock3} title="Property activity" note="Chronology derived from bookings, blocks, operations, documents, and owner records">
      {activity.length ? <ol className="ss-activity">{activity.map((item) => <li key={item.id}><span className="dot" /><div><strong>{item.label}</strong><p>{item.detail}</p></div><time dateTime={new Date(item.timestamp).toISOString()}>{dateTime(item.timestamp)}</time></li>)}</ol> : <Empty>No timestamped property activity is available.</Empty>}
    </Panel>
  );

  const content = {
    overview: renderOverview, listing: renderListing, rates: renderRates, reservations: renderReservations,
    guests: renderGuests, operations: renderOperations, owner: renderOwner, finance: renderFinance,
    documents: renderDocuments, activity: renderActivity,
  }[active];

  return (
    <div className="ss-property-file">
      <button type="button" className="pm-link ss-file-back" onClick={() => navigate('/short-stay/properties')}><ArrowLeft size={14} /> All short-stay properties</button>

      <header className="ss-file-hero">
        <div className="ss-file-cover" style={cover ? { backgroundImage: `url("${fileSrc(cover)}")` } : undefined}>{!cover && <Building2 size={38} />}</div>
        <div className="ss-file-identity">
          <div className="ss-file-chips"><Chip k={profile.status} />{profile.is_website_listed ? <span className="pm-chip good"><span className="d" />Website live</span> : <span className="pm-chip grey"><span className="d" />Not listed</span>}</div>
          <h1>{profile.public_headline || property.title || 'Short-stay property'}</h1>
          <div className="ss-file-address"><MapPin size={14} /> {address || 'Address not recorded'}</div>
          <div className="ss-file-code">{property.property_code || `Property #${property.id || profile.property_id}`} · Stay profile #{profile.id || profileId}</div>
        </div>
        <div className="ss-file-actions">
          <Button variant="ghost" icon={Edit3} onClick={() => navigate(`/short-stay/properties/${profileId}/edit`)}>Edit</Button>
          <Button variant="ghost" icon={CalendarDays} onClick={() => navigate('/short-stay/bookings')}>Booking hub</Button>
          <Button variant="ghost" icon={FileCheck2} onClick={() => navigate('/short-stay/owner-agreements')}>Owner terms</Button>
          <Button icon={Globe2} onClick={togglePublish} disabled={busy === 'publish'}>{busy === 'publish' ? 'Updating…' : profile.is_website_listed ? 'Unpublish' : 'Publish'}</Button>
        </div>
      </header>

      <div className="ss-file-kpis">
        <Kpi label="Occupancy" value={kpis.occupancy_rate ?? kpis.occupancy ?? 0} unit="%" sub={titleCase(profile.current_occupancy_status || 'available')} />
        <Kpi tone="good" label="Revenue" value={amount(kpis.revenue ?? kpis.month_revenue ?? 0)} sub="dashboard period" />
        <Kpi tone={Number(kpis.open_incidents || 0) ? 'bad' : 'ink'} label="Open incidents" value={kpis.open_incidents ?? incidents.filter((row) => !['resolved', 'closed'].includes(row.status)).length} sub={`${housekeeping.filter((row) => row.status !== 'completed').length} housekeeping open`} />
        <Kpi tone={blockers.length ? 'warn' : 'good'} label="Readiness" value={kpis.readiness_percent ?? (blockers.length ? 'Action' : 'Clear')} unit={kpis.readiness_percent != null ? '%' : ''} sub={`${blockers.length} blocker${blockers.length === 1 ? '' : 's'}`} />
      </div>

      {blockers.length > 0 && <div className="ss-file-blockers"><AlertTriangle size={18} /><div><strong>{blockers.length} item{blockers.length === 1 ? '' : 's'} blocking readiness or publication</strong><span>{blockers.map((row) => row.title || row.label || row.message || display(row)).join(' · ')}</span></div><button type="button" className="pm-btn" onClick={() => setActive('owner')}>Review</button></div>}

      <nav className="ss-file-tabs" aria-label="Property workspace sections">{SECTIONS.map(([key, label]) => <button type="button" key={key} className={active === key ? 'active' : ''} onClick={() => setActive(key)} aria-current={active === key ? 'page' : undefined}>{label}</button>)}</nav>

      <main className="ss-file-content" id={`section-${active}`}>{content?.()}</main>

      <div className="ss-file-mobile-actions">
        <Link className="pm-btn" to={`/short-stay/properties/${profileId}/edit`}><Edit3 size={14} /> Edit</Link>
        <button type="button" className="pm-btn" onClick={() => navigate('/short-stay/bookings')}><CalendarDays size={14} /> Bookings</button>
        <button type="button" className="pm-btn" onClick={() => navigate('/short-stay/owner-agreements')}><FileCheck2 size={14} /> Terms</button>
        <button type="button" className="pm-btn" onClick={togglePublish} disabled={busy === 'publish'}><Globe2 size={14} /> {profile.is_website_listed ? 'Unpublish' : 'Publish'}</button>
        <button type="button" className="pm-btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
      </div>
    </div>
  );
}
