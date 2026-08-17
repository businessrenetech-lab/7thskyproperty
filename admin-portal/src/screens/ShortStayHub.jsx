import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Button, Drawer, Field, Input, Select, Textarea } from '../ui/kit';
import { Combo } from '../ui/pickers';
import { useToast } from '../context/ToastContext';
import { bdt } from './shortstay/common';

import Dashboard from './shortstay/Dashboard';
import Availability from './shortstay/Availability';
import Bookings from './shortstay/Bookings';
import Properties from './shortstay/Properties';
import CheckInOut from './shortstay/CheckInOut';
import Enquiries from './shortstay/Enquiries';
import Guests from './shortstay/Guests';
import Housekeeping from './shortstay/Housekeeping';
import Maintenance from './shortstay/Maintenance';
import OwnerAgreements from './shortstay/OwnerAgreements';
import GuestAgreements from './shortstay/GuestAgreements';
import Payments from './shortstay/Payments';
import OwnerDisbursement from './shortstay/OwnerDisbursement';
import OwnerStatements from './shortstay/OwnerStatements';
import Reports from './shortstay/Reports';
import Settings from './shortstay/Settings';

const EMPTY_BOOKING = {
  property_id: '', lead_guest_contact_id: '', check_in_date: '', check_out_date: '',
  adults_count: 2, children_count: 0, nightly_rate: '',
};

// Every Short Term Stay screen now has a real implementation — no build-queue stubs remain.
const STUBS = {};
const SCREENS = ['dashboard', 'availability', 'enquiries', 'bookings', 'guests', 'checkin', 'properties', 'housekeeping', 'maintenance', 'owner-agreements', 'guest-agreements', 'payments', 'owner-disbursement', 'owner-statements', 'reports', 'settings'];
const VALID = new Set([...SCREENS, ...Object.keys(STUBS)]);

export default function ShortStayHub() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') || 'dashboard';
  const activeTab = VALID.has(rawTab) ? rawTab : 'dashboard';
  const focusBooking = searchParams.get('booking') ? Number(searchParams.get('booking')) : null;

  const goTab = (id, extra = {}) => {
    const next = id === 'dashboard' ? {} : { tab: id, ...(extra.booking ? { booking: String(extra.booking) } : {}) };
    setSearchParams(next, { replace: true });
  };

  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);
  const [busy, setBusy] = useState(false);
  const [properties, setProperties] = useState([]);

  // Drawers
  const [bookingDrawer, setBookingDrawer] = useState(false);
  const [ownerDrawer, setOwnerDrawer] = useState(null);
  const [activateDrawer, setActivateDrawer] = useState(null);
  const [confirmDrawer, setConfirmDrawer] = useState(null);
  const [cancelDrawer, setCancelDrawer] = useState(null);
  const [rescheduleDrawer, setRescheduleDrawer] = useState(null);
  const [incidentDrawer, setIncidentDrawer] = useState(false);
  const [hkDrawer, setHkDrawer] = useState(false);
  const [assignDrawer, setAssignDrawer] = useState(null);  // { kind:'housekeeping'|'incident', row }
  const [chargeDrawer, setChargeDrawer] = useState(null);  // incident row
  const [assignProvider, setAssignProvider] = useState('');
  const [chargeAmount, setChargeAmount] = useState('');

  const [bookingForm, setBookingForm] = useState(EMPTY_BOOKING);
  const [ownerForm, setOwnerForm] = useState({ primary_owner_contact_id: '', revenue_share_percent: 15 });
  const [activateReason, setActivateReason] = useState('');
  const [confirmForm, setConfirmForm] = useState({ paid_amount: '', security_deposit_paid: '' });
  const [cancelForm, setCancelForm] = useState({ reason: '', refund_amount: '', deposit_refunded_amount: '' });
  const [rescheduleForm, setRescheduleForm] = useState({ check_in_date: '', check_out_date: '', adults_count: 1, children_count: 0, reason: '' });
  const [incidentForm, setIncidentForm] = useState({ property_id: '', severity: 'medium', category: 'damage', description: '', estimated_cost: '' });
  const [hkForm, setHkForm] = useState({ property_id: '', task_type: 'turnover', scheduled_date: '', cost: '', charge_to: 'owner' });

  // Stay-property list is only needed to populate the booking drawer's property picker
  const loadProperties = useCallback(async () => {
    const res = await api.get('/short-stay/properties').catch(() => ({ data: [] }));
    setProperties(Array.isArray(res.data) ? res.data : []);
  }, []);
  useEffect(() => { loadProperties(); }, [loadProperties, refreshKey]);

  const errMsg = (err) => err.response?.data?.error || err.message || 'Something went wrong';

  // ── Mutations ──────────────────────────────────────────────
  const createBooking = async (e) => {
    e.preventDefault();
    if (!bookingForm.property_id) return toast.error('Choose a stay property');
    if (!bookingForm.lead_guest_contact_id) return toast.error('Choose the lead guest');
    setBusy(true);
    try {
      await api.post('/short-stay/bookings', bookingForm);
      toast.success('Reservation created (on hold)');
      setBookingDrawer(false); setBookingForm(EMPTY_BOOKING); bump();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const toggleWebsite = async (row) => {
    try {
      await api.patch(`/short-stay/properties/${row.id}/website-toggle`, { is_website_listed: !row.is_website_listed });
      toast.success(row.is_website_listed ? 'Unpublished from website' : 'Published on website');
      bump();
    } catch (err) { toast.error(errMsg(err)); }
  };
  const submitActivate = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.patch(`/short-stay/properties/${activateDrawer.id}/status`, {
        status: 'active', ...(activateReason.trim() ? { override_reason: activateReason.trim() } : {}),
      });
      toast.success('Property activated for booking');
      setActivateDrawer(null); setActivateReason(''); bump();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const buildOwnerAgreement = async (e) => {
    e.preventDefault();
    if (!ownerForm.primary_owner_contact_id) return toast.error('Choose the primary owner');
    setBusy(true);
    try {
      await api.post('/short-stay/owner-agreements/build', { property_id: ownerDrawer.property_id, ...ownerForm });
      toast.success('STS-Owner agreement envelope generated & sent');
      setOwnerDrawer(null); setOwnerForm({ primary_owner_contact_id: '', revenue_share_percent: 15 }); bump();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const buildGuestAgreement = async (bookingId) => {
    try {
      await api.post('/short-stay/guest-agreements/build', { booking_id: bookingId });
      toast.success('Guest tenancy agreement sent for signature');
      bump();
    } catch (err) { toast.error(errMsg(err)); }
  };
  const submitConfirm = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/short-stay/bookings/${confirmDrawer.id}/confirm`, {
        paid_amount: Number(confirmForm.paid_amount || 0),
        security_deposit_paid: Number(confirmForm.security_deposit_paid || 0),
      });
      toast.success('Booking confirmed — ready for check-in');
      setConfirmDrawer(null); bump();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const submitCancel = async (e) => {
    e.preventDefault();
    if (!cancelForm.reason.trim()) return toast.error('Enter the cancellation reason');
    setBusy(true);
    try {
      await api.post(`/short-stay/bookings/${cancelDrawer.id}/cancel`, {
        reason: cancelForm.reason.trim(),
        refund_amount: Number(cancelForm.refund_amount || 0),
        deposit_refunded_amount: Number(cancelForm.deposit_refunded_amount || 0),
      });
      toast.success('Booking cancelled and dates released');
      setCancelDrawer(null); bump();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const submitReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleForm.reason.trim()) return toast.error('Enter the amendment reason');
    setBusy(true);
    try {
      await api.patch(`/short-stay/bookings/${rescheduleDrawer.id}`, {
        ...rescheduleForm,
        adults_count: Number(rescheduleForm.adults_count),
        children_count: Number(rescheduleForm.children_count),
        reason: rescheduleForm.reason.trim(),
      });
      toast.success('Booking amended — updated guest terms are required');
      setRescheduleDrawer(null); bump();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const checkIn = async (bookingId) => {
    try {
      await api.post('/short-stay/check-in', { booking_id: bookingId, house_rules_acknowledged: true });
      toast.success('Guest checked in'); bump();
    } catch (err) { toast.error(errMsg(err)); }
  };
  const checkOut = async (bookingId) => {
    try {
      await api.post('/short-stay/check-out', { booking_id: bookingId, keys_returned: true });
      toast.success('Guest checked out — turnover cleaning scheduled'); bump();
    } catch (err) { toast.error(errMsg(err)); }
  };
  const updateHousekeeping = async (id, status) => {
    try {
      await api.patch(`/short-stay/housekeeping/${id}`, { status });
      toast.success(status === 'completed' ? 'Turnover completed' : 'Turnover started'); bump();
    } catch (err) { toast.error(errMsg(err)); }
  };
  const updateIncident = async (id, status) => {
    try {
      await api.patch(`/short-stay/incidents/${id}`, { status });
      toast.success(status === 'resolved' ? 'Incident resolved' : 'Incident escalated'); bump();
    } catch (err) { toast.error(errMsg(err)); }
  };
  const qualifyEnquiry = async (row) => {
    try { await api.post(`/short-stay/enquiries/${row.id}/qualify`, { source_record: row.source_record }); toast.success(row.source_record === 'website_enquiry' ? 'Website enquiry marked as contacted' : 'Enquiry qualified — ready to convert'); bump(); }
    catch (err) { toast.error(errMsg(err)); }
  };
  const convertEnquiry = async (row) => {
    try {
      await api.post(`/short-stay/enquiries/${row.id}/convert`);
      toast.success('Website request converted to a held reservation');
      bump();
      goTab('bookings');
    } catch (err) { toast.error(errMsg(err)); }
  };
  const submitAssign = async (e) => {
    e.preventDefault();
    if (!assignProvider) return toast.error('Choose a provider');
    setBusy(true);
    try {
      const url = assignDrawer.kind === 'housekeeping' ? `/short-stay/housekeeping/${assignDrawer.row.id}` : `/short-stay/incidents/${assignDrawer.row.id}`;
      await api.patch(url, { assigned_provider_id: Number(assignProvider), ...(assignDrawer.kind === 'incident' ? { status: 'investigating' } : {}) });
      toast.success('Provider assigned'); setAssignDrawer(null); setAssignProvider(''); bump();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const submitCharge = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.patch(`/short-stay/incidents/${chargeDrawer.id}`, { deduct_from_deposit_amount: Number(chargeAmount || 0) });
      toast.success('Deposit charge recorded'); setChargeDrawer(null); setChargeAmount(''); bump();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const submitIncident = async (e) => {
    e.preventDefault();
    if (!incidentForm.property_id) return toast.error('Choose the property');
    if (!incidentForm.description.trim()) return toast.error('Describe the incident');
    setBusy(true);
    try {
      await api.post('/short-stay/incidents', { ...incidentForm, estimated_cost: Number(incidentForm.estimated_cost || 0) });
      toast.success('Incident reported');
      setIncidentDrawer(false); setIncidentForm({ property_id: '', severity: 'medium', category: 'damage', description: '', estimated_cost: '' }); bump();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  const submitHk = async (e) => {
    e.preventDefault();
    if (!hkForm.property_id) return toast.error('Choose the property');
    if (!hkForm.scheduled_date) return toast.error('Pick a scheduled date');
    setBusy(true);
    try {
      await api.post('/short-stay/housekeeping', { ...hkForm, cost: Number(hkForm.cost || 0) });
      toast.success('Housekeeping task added');
      setHkDrawer(false); setHkForm({ property_id: '', task_type: 'turnover', scheduled_date: '', cost: '', charge_to: 'owner' }); bump();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const openConfirm = (b) => {
    setConfirmForm({ paid_amount: b.total_booking_value || 0, security_deposit_paid: b.security_deposit_amount || 0 });
    setConfirmDrawer(b);
  };

  const actions = {
    addProperty: () => navigate('/short-term-stay/properties/new'),
    editProperty: (p) => navigate(`/short-term-stay/properties/${p.id}/edit`),
    addBooking: () => { setBookingForm(EMPTY_BOOKING); setBookingDrawer(true); },
    activate: (p) => { setActivateReason(''); setActivateDrawer(p); },
    ownerTerms: (p) => { setOwnerForm({ primary_owner_contact_id: '', revenue_share_percent: 15 }); setOwnerDrawer({ property_id: p.property_id, title: p.public_headline || p.property?.title }); },
    toggleWebsite,
    confirm: openConfirm,
    cancelBooking: (booking) => {
      setCancelForm({ reason: '', refund_amount: booking.paid_amount || '', deposit_refunded_amount: booking.security_deposit_paid || '' });
      setCancelDrawer(booking);
    },
    rescheduleBooking: (booking) => {
      setRescheduleForm({ check_in_date: booking.check_in_date, check_out_date: booking.check_out_date, adults_count: booking.adults_count || 1, children_count: booking.children_count || 0, reason: '' });
      setRescheduleDrawer(booking);
    },
    sendGuestAgreement: buildGuestAgreement,
    checkIn, checkOut,
    updateHousekeeping, updateIncident, qualifyEnquiry, convertEnquiry,
    reportIncident: () => { setIncidentForm({ property_id: '', severity: 'medium', category: 'damage', description: '', estimated_cost: '' }); setIncidentDrawer(true); },
    addHousekeeping: () => { setHkForm({ property_id: '', task_type: 'turnover', scheduled_date: '', cost: '', charge_to: 'owner' }); setHkDrawer(true); },
    assignHousekeeping: (row) => { setAssignProvider(row.assigned_provider_id || ''); setAssignDrawer({ kind: 'housekeeping', row }); },
    assignIncident: (row) => { setAssignProvider(row.assigned_provider_id || ''); setAssignDrawer({ kind: 'incident', row }); },
    chargeIncident: (row) => { setChargeAmount(row.deduct_from_deposit_amount || row.estimated_cost || ''); setChargeDrawer(row); },
  };

  const screenProps = { actions, goTab, refreshKey };

  return (
    <div className="pm-scope">
      {activeTab === 'dashboard' && <Dashboard {...screenProps} />}
      {activeTab === 'availability' && <Availability {...screenProps} />}
      {activeTab === 'enquiries' && <Enquiries {...screenProps} />}
      {activeTab === 'bookings' && <Bookings {...screenProps} />}
      {activeTab === 'guests' && <Guests {...screenProps} />}
      {activeTab === 'checkin' && <CheckInOut {...screenProps} focusBooking={focusBooking} />}
      {activeTab === 'properties' && <Properties {...screenProps} />}
      {activeTab === 'housekeeping' && <Housekeeping {...screenProps} />}
      {activeTab === 'maintenance' && <Maintenance {...screenProps} />}
      {activeTab === 'owner-agreements' && <OwnerAgreements {...screenProps} />}
      {activeTab === 'guest-agreements' && <GuestAgreements {...screenProps} />}
      {activeTab === 'payments' && <Payments {...screenProps} />}
      {activeTab === 'owner-disbursement' && <OwnerDisbursement onBack={() => goTab('payments')} />}
      {activeTab === 'owner-statements' && <OwnerStatements {...screenProps} />}
      {activeTab === 'reports' && <Reports {...screenProps} />}
      {activeTab === 'settings' && <Settings {...screenProps} />}

      {/* ── Drawers ── */}
      {bookingDrawer && (
        <Drawer title="Create Short Term Stay Reservation" onClose={() => setBookingDrawer(false)}>
          <form onSubmit={createBooking} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Stay property" required>
              <Select value={bookingForm.property_id} onChange={(e) => {
                const prop = properties.find((p) => String(p.property_id) === e.target.value);
                setBookingForm({ ...bookingForm, property_id: e.target.value, nightly_rate: prop?.base_nightly_rate || bookingForm.nightly_rate });
              }}>
                <option value="">Select a stay property…</option>
                {properties.map((p) => <option key={p.id} value={p.property_id}>{p.public_headline || p.property?.title || `Property #${p.property_id}`}</option>)}
              </Select>
            </Field>
            <Field label="Lead guest" required>
              <Combo endpoint="/contacts" labelFn={(c) => `${c.full_name || 'Contact'} · ${c.primary_phone || c.email || ''}`} value={bookingForm.lead_guest_contact_id ? Number(bookingForm.lead_guest_contact_id) : ''} onChange={(id) => setBookingForm({ ...bookingForm, lead_guest_contact_id: id })} placeholder="Search a guest contact…" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Check-in date" required><Input type="date" value={bookingForm.check_in_date} onChange={(e) => setBookingForm({ ...bookingForm, check_in_date: e.target.value })} required /></Field>
              <Field label="Check-out date" required><Input type="date" value={bookingForm.check_out_date} onChange={(e) => setBookingForm({ ...bookingForm, check_out_date: e.target.value })} required /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Adults"><Input type="number" value={bookingForm.adults_count} onChange={(e) => setBookingForm({ ...bookingForm, adults_count: e.target.value })} /></Field>
              <Field label="Children"><Input type="number" value={bookingForm.children_count} onChange={(e) => setBookingForm({ ...bookingForm, children_count: e.target.value })} /></Field>
            </div>
            <Field label="Nightly rate (৳)"><Input type="number" value={bookingForm.nightly_rate} onChange={(e) => setBookingForm({ ...bookingForm, nightly_rate: e.target.value })} placeholder="Defaults to the property base rate" /></Field>
            <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Creating…' : 'Create Reservation'}</Button>
          </form>
        </Drawer>
      )}

      {ownerDrawer && (
        <Drawer title={`STS-Owner Agreement — ${ownerDrawer.title || ''}`} onClose={() => setOwnerDrawer(null)}>
          <form onSubmit={buildOwnerAgreement} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Primary owner" required>
              <Combo endpoint="/contacts" labelFn={(c) => `${c.full_name || 'Contact'} · ${c.primary_phone || c.email || ''}`} value={ownerForm.primary_owner_contact_id ? Number(ownerForm.primary_owner_contact_id) : ''} onChange={(id) => setOwnerForm({ ...ownerForm, primary_owner_contact_id: id })} placeholder="Search an owner contact…" />
            </Field>
            <Field label="Revenue share (%)"><Input type="number" value={ownerForm.revenue_share_percent} onChange={(e) => setOwnerForm({ ...ownerForm, revenue_share_percent: e.target.value })} /></Field>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>Generates the Short Term Rental Management Service Agreement envelope and sends it to the owner for e-signature. The property activates for booking once signed.</p>
            <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Generating…' : 'Generate & Send Agreement'}</Button>
          </form>
        </Drawer>
      )}

      {activateDrawer && (
        <Drawer title={`Activate — ${activateDrawer.public_headline || activateDrawer.property?.title || 'Property'}`} onClose={() => setActivateDrawer(null)}>
          <form onSubmit={submitActivate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
              Activation normally requires a signed STS-Owner management agreement. A super admin may override with a written reason, which is recorded.
            </p>
            <Field label="Override reason (optional)">
              <Textarea rows={2} value={activateReason} onChange={(e) => setActivateReason(e.target.value)} placeholder="e.g. Owner agreement signed offline — ref …" />
            </Field>
            <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Activating…' : 'Activate for Booking'}</Button>
          </form>
        </Drawer>
      )}

      {confirmDrawer && (
        <Drawer title={`Confirm Booking — ${confirmDrawer.booking_code}`} onClose={() => setConfirmDrawer(null)}>
          <form onSubmit={submitConfirm} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="pm-chip info" style={{ alignSelf: 'flex-start' }}><span className="d" />Total due {bdt(confirmDrawer.total_booking_value)} · deposit {bdt(confirmDrawer.security_deposit_amount)}</div>
            <Field label="Payment received (৳)" required><Input type="number" value={confirmForm.paid_amount} onChange={(e) => setConfirmForm({ ...confirmForm, paid_amount: e.target.value })} required /></Field>
            <Field label="Security deposit received (৳)"><Input type="number" value={confirmForm.security_deposit_paid} onChange={(e) => setConfirmForm({ ...confirmForm, security_deposit_paid: e.target.value })} /></Field>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>The payment posts to the guest folio and the booking advances to <strong>confirmed</strong> (check-in ready). Full payment and the required deposit must be recorded.</p>
            <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Confirming…' : 'Confirm & Reserve'}</Button>
          </form>
        </Drawer>
      )}

      {cancelDrawer && (
        <Drawer title={`Cancel Booking — ${cancelDrawer.booking_code}`} onClose={() => setCancelDrawer(null)}>
          <form onSubmit={submitCancel} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="pm-chip warn" style={{ alignSelf: 'flex-start' }}><span className="d" />Cancelling releases the reserved dates immediately</div>
            <Field label="Cancellation reason" required><Textarea rows={3} value={cancelForm.reason} onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })} required /></Field>
            <Field label="Guest payment refund (৳)"><Input type="number" min="0" max={cancelDrawer.paid_amount || 0} value={cancelForm.refund_amount} onChange={(e) => setCancelForm({ ...cancelForm, refund_amount: e.target.value })} /></Field>
            <Field label="Deposit refund (৳)"><Input type="number" min="0" max={cancelDrawer.security_deposit_paid || 0} value={cancelForm.deposit_refunded_amount} onChange={(e) => setCancelForm({ ...cancelForm, deposit_refunded_amount: e.target.value })} /></Field>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>Charge reversal and refund adjustments are posted to the guest folio. Enter only amounts actually approved for refund.</p>
            <Button type="submit" variant="danger" disabled={busy}>{busy ? 'Cancelling…' : 'Cancel Booking & Release Dates'}</Button>
          </form>
        </Drawer>
      )}

      {rescheduleDrawer && (
        <Drawer title={`Amend Booking — ${rescheduleDrawer.booking_code}`} onClose={() => setRescheduleDrawer(null)}>
          <form onSubmit={submitReschedule} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="pm-chip warn" style={{ alignSelf: 'flex-start' }}><span className="d" />Existing guest terms will be voided and must be sent again</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Check-in date" required><Input type="date" value={rescheduleForm.check_in_date} onChange={(e) => setRescheduleForm({ ...rescheduleForm, check_in_date: e.target.value })} required /></Field>
              <Field label="Check-out date" required><Input type="date" min={rescheduleForm.check_in_date || undefined} value={rescheduleForm.check_out_date} onChange={(e) => setRescheduleForm({ ...rescheduleForm, check_out_date: e.target.value })} required /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Adults"><Input type="number" min="1" value={rescheduleForm.adults_count} onChange={(e) => setRescheduleForm({ ...rescheduleForm, adults_count: e.target.value })} /></Field>
              <Field label="Children"><Input type="number" min="0" value={rescheduleForm.children_count} onChange={(e) => setRescheduleForm({ ...rescheduleForm, children_count: e.target.value })} /></Field>
            </div>
            <Field label="Amendment reason" required><Textarea rows={3} value={rescheduleForm.reason} onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })} required /></Field>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>The stay will be re-priced from the current rate plan. Any difference is posted to the guest folio while recorded payments remain intact.</p>
            <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Updating…' : 'Update Stay & Reissue Terms'}</Button>
          </form>
        </Drawer>
      )}

      {incidentDrawer && (
        <Drawer title="Report Incident" onClose={() => setIncidentDrawer(false)}>
          <form onSubmit={submitIncident} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Property" required>
              <Select value={incidentForm.property_id} onChange={(e) => setIncidentForm({ ...incidentForm, property_id: e.target.value })}>
                <option value="">Select a stay property…</option>
                {properties.map((p) => <option key={p.id} value={p.property_id}>{p.public_headline || p.property?.title || `Property #${p.property_id}`}</option>)}
              </Select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Severity">
                <Select value={incidentForm.severity} onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}>
                  {['low', 'medium', 'high', 'critical'].map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Category">
                <Select value={incidentForm.category} onChange={(e) => setIncidentForm({ ...incidentForm, category: e.target.value })}>
                  {['damage', 'noise_complaint', 'missing_item', 'safety', 'breach'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Description" required><Textarea rows={3} value={incidentForm.description} onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })} placeholder="What happened, where, and who is affected…" /></Field>
            <Field label="Estimated cost (৳)"><Input type="number" value={incidentForm.estimated_cost} onChange={(e) => setIncidentForm({ ...incidentForm, estimated_cost: e.target.value })} /></Field>
            <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Reporting…' : 'Report Incident'}</Button>
          </form>
        </Drawer>
      )}

      {hkDrawer && (
        <Drawer title="Add Housekeeping Task" onClose={() => setHkDrawer(false)}>
          <form onSubmit={submitHk} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Property" required>
              <Select value={hkForm.property_id} onChange={(e) => setHkForm({ ...hkForm, property_id: e.target.value })}>
                <option value="">Select a stay property…</option>
                {properties.map((p) => <option key={p.id} value={p.property_id}>{p.public_headline || p.property?.title || `Property #${p.property_id}`}</option>)}
              </Select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Task type">
                <Select value={hkForm.task_type} onChange={(e) => setHkForm({ ...hkForm, task_type: e.target.value })}>
                  {['turnover', 'mid_stay', 'deep_clean'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </Select>
              </Field>
              <Field label="Scheduled date" required><Input type="date" value={hkForm.scheduled_date} onChange={(e) => setHkForm({ ...hkForm, scheduled_date: e.target.value })} required /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Cost (৳)"><Input type="number" value={hkForm.cost} onChange={(e) => setHkForm({ ...hkForm, cost: e.target.value })} /></Field>
              <Field label="Charge to">
                <Select value={hkForm.charge_to} onChange={(e) => setHkForm({ ...hkForm, charge_to: e.target.value })}>
                  {['owner', 'guest', 'agency'].map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Field>
            </div>
            <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Adding…' : 'Add Task'}</Button>
          </form>
        </Drawer>
      )}

      {assignDrawer && (
        <Drawer title={`Assign provider — ${assignDrawer.kind === 'housekeeping' ? 'housekeeping' : 'incident'}`} onClose={() => setAssignDrawer(null)}>
          <form onSubmit={submitAssign} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>
              {assignDrawer.row.property?.title || `Property #${assignDrawer.row.property_id}`}{assignDrawer.kind === 'incident' ? ` · ${String(assignDrawer.row.category || '').replace(/_/g, ' ')}` : ` · ${String(assignDrawer.row.task_type || '').replace(/_/g, ' ')}`}
            </p>
            <Field label="Service provider" required>
              <Combo endpoint="/providers" labelFn={(p) => p.company_name || p.contact_person || `Provider #${p.id}`} value={assignProvider ? Number(assignProvider) : ''} onChange={(id) => setAssignProvider(id)} placeholder="Search a provider…" />
            </Field>
            <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Assigning…' : 'Assign Provider'}</Button>
          </form>
        </Drawer>
      )}

      {chargeDrawer && (
        <Drawer title={`Charge deposit — ${chargeDrawer.property?.title || `#${chargeDrawer.property_id}`}`} onClose={() => setChargeDrawer(null)}>
          <form onSubmit={submitCharge} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: 0 }}>Records a deduction from the guest's security deposit for <strong>{String(chargeDrawer.category || 'damage').replace(/_/g, ' ')}</strong>. This shows on the guest's deposit reconciliation.</p>
            <Field label="Amount to deduct from deposit (৳)" required><Input type="number" value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} required /></Field>
            <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Recording…' : 'Record Deposit Charge'}</Button>
          </form>
        </Drawer>
      )}
    </div>
  );
}
