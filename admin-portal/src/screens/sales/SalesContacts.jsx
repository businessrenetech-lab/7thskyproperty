// admin-portal/src/screens/sales/SalesContacts.jsx
//
// High-density CRM Contacts Hub for Residential Sales.
// Consolidates:
// 1. All Contacts directory (individuals & organisations)
// 2. Leads (website property enquiries as Buyer leads, seller requests as Vendor leads)
// 3. Vendors (property sellers ready for Sale Agreements)
// 4. Buyers (property buyers ready for Purchase Agreements)
// 5. Automations (routing rules & follow-up sequences)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users, UserCheck, UserPlus, Building2, Phone, Mail, FileSignature,
  FileText, CheckCircle2, ArrowRight, Search, Filter, Sparkles,
  Calendar, DollarSign, Globe, Plus, RefreshCw, X, ExternalLink,
  Shield, Tag, ChevronRight, MessageSquare, ArrowUpRight, Check,
  AlertCircle, Clock, Eye, Send, Home, Briefcase, Pencil, Megaphone,
  Upload, Download, FileSpreadsheet, Layers, ListFilter, Sliders, Compass, UserCog
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Button, Spinner, Badge, StatusBadge, Drawer, Field, Input, Select, Textarea
} from '../../ui/kit';
import NewPartyKycDrawer from './NewPartyKycDrawer';

const money = (v) => '৳' + Number(v || 0).toLocaleString('en-BD');
const dateFmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const dateTimeFmt = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');

const safeJsonParse = (val, fallback = []) => {
  if (!val) return fallback;
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return val.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return fallback;
};

const getInitials = (name) => {
  if (!name) return 'CT';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export default function SalesContacts({ scope }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const isRentalScope = scope === 'rental' || queryParams.get('scope') === 'rental';
  const isInteriorScope = scope === 'interior' || queryParams.get('scope') === 'interior' || location.pathname.includes('/residential-interior-design') || location.pathname.includes('/fitness-room-interior-design') || location.pathname.includes('/commercial-interior-design') || location.pathname.includes('/custom-design-fit-out') || location.pathname.includes('/furniture-styling-consultation') || location.pathname.includes('/prayer-room-interior-design');
  const isOpsServiceScope = Boolean(scope && !['sales', 'buy', 'rental'].includes(scope)) || location.pathname.includes('/residential-interior-design') || location.pathname.includes('/fitness-room-interior-design') || location.pathname.includes('/commercial-interior-design') || location.pathname.includes('/custom-design-fit-out') || location.pathname.includes('/furniture-styling-consultation') || location.pathname.includes('/prayer-room-interior-design') || location.pathname.includes('/water-tank') || location.pathname.includes('/air-conditioning') || location.pathname.includes('/short-stay');

  const svcBase = useCallback(() => {
    const p = location.pathname || '';
    const bases = ['/fitness-room-interior-design', '/commercial-interior-design', '/custom-design-fit-out', '/furniture-styling-consultation', '/prayer-room-interior-design', '/residential-interior-design', '/water-tank', '/air-conditioning', '/short-stay', '/property-care-concierge', '/land-property-assessment', '/loan-financial-support', '/property-documentation-verification', '/property-will-succession', '/removal-relocation'];
    return bases.find((b) => p.includes(b)) || (isInteriorScope ? '/residential-interior-design' : '/water-tank');
  }, [location.pathname, isInteriorScope]);

  const { user } = useAuth();
  const toast = useToast();
  const isManager = ['super_admin', 'branch_admin', 'property_manager'].includes(user?.role);

  // Active primary tab: 'contacts' | 'leads' | 'vendors' | 'buyers' | 'clients' | 'projects' | 'automations'
  // The buy console leads with buyers.
  const [activeTab, setActiveTab] = useState(
    queryParams.get('tab') || (scope === 'buy' ? 'buyers' : 'contacts')
  );

  // Search & Global state
  const [search, setSearch] = useState(queryParams.get('search') || '');
  const [loading, setLoading] = useState(true);

  // Directory Data
  const [contacts, setContacts] = useState([]);
  const [contactsCount, setContactsCount] = useState(0);

  const [leads, setLeads] = useState([]);
  const [enquiries, setEnquiries] = useState([]);

  const [vendors, setVendors] = useState([]);
  const [buyers, setBuyers] = useState([]);

  // Property Management specific datasets (scope === 'rental')
  const [rentalEnquiries, setRentalEnquiries] = useState([]);
  const [tenantApplications, setTenantApplications] = useState([]);
  const [tenancies, setTenancies] = useState([]);
  const [landlords, setLandlords] = useState([]);

  // Operations / Interior Design specific datasets (isInteriorScope || isOpsServiceScope)
  const [interiorRequests, setInteriorRequests] = useState([]);
  const [interiorProjects, setInteriorProjects] = useState([]);
  const [interiorClients, setInteriorClients] = useState([]);

  // Auxiliary: properties & staff
  const [properties, setProperties] = useState([]);
  const [staff, setStaff] = useState([]);

  // Sub-filters
  const [leadTypeFilter, setLeadTypeFilter] = useState(scope === 'buy' ? 'buyer' : 'all'); // 'all' | 'buyer' | 'vendor'
  const [leadStageFilter, setLeadStageFilter] = useState('all');
  const [contactTypeFilter, setContactTypeFilter] = useState('all'); // 'all' | 'individual' | 'company'
  const [selectedContactIds, setSelectedContactIds] = useState([]);

  // Modals & Drawers
  const [newLeadDrawer, setNewLeadDrawer] = useState(false);
  const [newContactDrawer, setNewContactDrawer] = useState(false);
  const [newPartyDrawer, setNewPartyDrawer] = useState(null); // null | 'buyer' | 'vendor'
  const [dossierDrawer, setDossierDrawer] = useState(null); // contact or client
  const [convertModal, setConvertModal] = useState(null); // lead to convert
  const [convertRole, setConvertRole] = useState('seller'); // 'seller' | 'buyer'
  const [converting, setConverting] = useState(false);
  const [convertSuccess, setConvertSuccess] = useState(null); // result after conversion

  // Edit Lead Modal State
  const [editLeadOpen, setEditLeadOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [editLeadSaving, setEditLeadSaving] = useState(false);
  const [editLeadForm, setEditLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    lead_type: 'buyer',
    stage: 'new',
    source: 'website',
    priority: 'medium',
    budget: '',
    preferred_area: '',
    property_id: '',
    assigned_to: '',
    notes: '',
    requirement: '',
  });

  // Edit Buyer/Vendor Modal State
  const [editPartyOpen, setEditPartyOpen] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [editPartyRole, setEditPartyRole] = useState('vendor'); // 'vendor' | 'buyer'
  const [editPartySaving, setEditPartySaving] = useState(false);
  const [editPartyForm, setEditPartyForm] = useState({
    contact_id: null,
    client_id: null,
    full_name: '',
    company_name: '',
    primary_phone: '',
    whatsapp: '',
    email: '',
    address_line1: '',
    area: '',
    city: 'Dhaka',
    district: '',
    national_id: '',
    passport_no: '',
    client_segment: 'standard',
    status: 'active',
    notes: '',
    budget: '',
  });

  // Signed Agreements Tracking
  const [completedAgreements, setCompletedAgreements] = useState([]);

  // Contact Lists, Real Estate Lead & Sorting (Migration 0127)
  const initialLookingFor = queryParams.get('looking_for') || (isRentalScope ? 'rent' : 'all');
  const initialContactList = queryParams.get('contact_list') || 'all';

  const [contactListFilter, setContactListFilter] = useState(initialContactList);
  const [contactLookingForFilter, setContactLookingForFilter] = useState(initialLookingFor);
  const [contactLists, setContactLists] = useState([]);
  const [contactSortBy, setContactSortBy] = useState('created_at'); // 'created_at' | 'updated_at' | 'last_contacted_at' | 'full_name' | 'budget_max'
  const [contactSortOrder, setContactSortOrder] = useState('DESC');

  // URL query action handlers (e.g. ?action=new or ?action=import)
  useEffect(() => {
    const action = queryParams.get('action');
    if (action === 'new') {
      setNewContactDrawer(true);
    } else if (action === 'import') {
      setBulkImportOpen(true);
    }
  }, [queryParams]);

  // Edit Contact Drawer State
  const [editContactOpen, setEditContactOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [editContactSaving, setEditContactSaving] = useState(false);
  const [editContactForm, setEditContactForm] = useState({
    id: null,
    full_name: '',
    first_name: '',
    last_name: '',
    contact_type: 'individual',
    company_name: '',
    designation: '',
    primary_phone: '',
    alt_phone: '',
    whatsapp: '',
    email: '',
    alt_email: '',
    address_line1: '',
    area: '',
    city: 'Dhaka',
    contact_list: isRentalScope ? 'Rental Leads' : isInteriorScope ? 'Interior Design Leads' : isOpsServiceScope ? 'Service Leads' : 'General Leads',
    lead_status: 'new',
    lead_source: '',
    looking_for: isRentalScope ? 'rent' : isInteriorScope ? 'interior' : isOpsServiceScope ? 'service' : 'buy',
    preferred_areas: '',
    property_types: '',
    budget_min: '',
    budget_max: '',
    bedrooms_min: '',
    bathrooms_min: '',
    size_min_sft: '',
    financing_status: isRentalScope ? 'employed' : isInteriorScope ? 'budget_approved' : 'cash_buyer',
    urgency: 'immediate',
    last_contacted_at: '',
    notes: '',
    lead_notes: '',
  });

  // Real Estate Lead Profile Drawer State
  const [leadProfileOpen, setLeadProfileOpen] = useState(false);
  const [leadProfileContact, setLeadProfileContact] = useState(null);
  const [leadProfileSaving, setLeadProfileSaving] = useState(false);
  const [quickLeadNotes, setQuickLeadNotes] = useState('');

  // Bulk Excel Import Modal State
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importDefaultList, setImportDefaultList] = useState(
    isRentalScope ? 'Rental Leads' : isInteriorScope ? 'Interior Design Leads' : isOpsServiceScope ? 'Service Leads' : 'General Leads'
  );
  const [importUpdateDuplicates, setImportUpdateDuplicates] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // Forms
  const [leadForm, setLeadForm] = useState({
    name: '',
    phone: '',
    email: '',
    lead_type: 'buyer', // 'buyer' | 'vendor'
    property_id: '',
    requirement: '',
    estimated_value: '',
    source: 'Website Enquiry',
    priority: 'medium',
    assigned_to: '',
    notes: '',
  });

  const [contactForm, setContactForm] = useState({
    full_name: '',
    contact_type: 'individual',
    primary_phone: '',
    email: '',
    company_name: '',
    contact_list: isRentalScope ? 'Rental Leads' : isInteriorScope ? 'Interior Design Leads' : isOpsServiceScope ? 'Service Leads' : 'General Leads',
    looking_for: isRentalScope ? 'rent' : isInteriorScope ? 'interior' : isOpsServiceScope ? 'service' : 'buy',
    lead_status: 'new',
    area: '',
    city: 'Dhaka',
    notes: '',
  });

  // Load auxiliary data
  useEffect(() => {
    api.get('/auth/staff').then((r) => setStaff(r.data || [])).catch(() => {});
    api.get('/sales/dashboard?category=residential')
      .then((r) => {
        const body = r.data?.data ?? r.data ?? {};
        setProperties(body.properties || body.listings || []);
      })
      .catch(() => {});
  }, []);

  // Main fetcher
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      if (isRentalScope) {
        const [cRes, reRes, taRes, tnRes, ownRes, listRes] = await Promise.all([
          api.get('/contacts?limit=500&scope=rental').catch(() => ({ data: { data: [] } })),
          api.get('/rental-enquiries?limit=100').catch(() => ({ data: { data: [] } })),
          api.get('/tenant-applications?limit=100').catch(() => ({ data: { data: [] } })),
          api.get('/tenancies?limit=100').catch(() => ({ data: { data: [] } })),
          api.get('/clients?role=owner&limit=100').catch(() => ({ data: { data: [] } })),
          api.get('/contacts/lists?scope=rental').catch(() => ({ data: { data: [] } })),
        ]);

        setContacts(cRes.data?.data || []);
        setContactsCount(cRes.data?.pagination?.total || cRes.data?.data?.length || 0);
        setContactLists(listRes.data?.data || []);

        const reData = reRes.data?.data ?? reRes.data ?? [];
        setRentalEnquiries(Array.isArray(reData) ? reData : []);

        const taData = taRes.data?.data ?? taRes.data ?? [];
        setTenantApplications(Array.isArray(taData) ? taData : []);

        const tnData = tnRes.data?.data ?? tnRes.data ?? [];
        setTenancies(Array.isArray(tnData) ? tnData : []);

        const ownData = ownRes.data?.data ?? ownRes.data ?? [];
        setLandlords(Array.isArray(ownData) ? ownData : []);
      } else if (isInteriorScope || isOpsServiceScope) {
        const contactScopeParam = isInteriorScope ? 'interior' : (scope || 'all');
        const [cRes, reqRes, projRes, clRes, listRes] = await Promise.all([
          api.get(`/contacts?limit=500&scope=${encodeURIComponent(contactScopeParam)}`).catch(() => ({ data: { data: [] } })),
          api.get('/wt-ops/service-requests?limit=100').catch(() => ({ data: { data: [] } })),
          api.get('/wt-projects?limit=100').catch(() => ({ data: { data: [] } })),
          api.get('/wt-ops/clients?limit=100').catch(() => ({ data: { data: [] } })),
          api.get(`/contacts/lists?scope=${encodeURIComponent(contactScopeParam)}`).catch(() => ({ data: { data: [] } })),
        ]);

        setContacts(cRes.data?.data || []);
        setContactsCount(cRes.data?.pagination?.total || cRes.data?.data?.length || 0);
        setContactLists(listRes.data?.data || []);

        const reqData = reqRes.data?.data ?? reqRes.data ?? [];
        setInteriorRequests(Array.isArray(reqData) ? reqData : []);

        const projData = projRes.data?.data ?? projRes.data ?? [];
        setInteriorProjects(Array.isArray(projData) ? projData : []);

        const clData = clRes.data?.data ?? clRes.data ?? [];
        setInteriorClients(Array.isArray(clData) ? clData : []);
      } else {
        const [cRes, lRes, eqRes, vRes, bRes, agrRes, listRes] = await Promise.all([
          api.get('/contacts?limit=500&scope=sales').catch(() => ({ data: { data: [] } })),
          api.get('/leads?limit=100').catch(() => ({ data: { data: [] } })),
          api.get('/sales-enquiries?limit=100').catch(() => ({ data: { data: [] } })),
          api.get('/clients?role=seller&limit=100').catch(() => ({ data: { data: [] } })),
          api.get('/clients?role=buyer&limit=100').catch(() => ({ data: { data: [] } })),
          api.get('/sales-agreements/contracts').catch(() => ({ data: { buckets: {} } })),
          api.get('/contacts/lists?scope=sales').catch(() => ({ data: { data: [] } })),
        ]);

        setContacts(cRes.data?.data || []);
        setContactsCount(cRes.data?.pagination?.total || cRes.data?.data?.length || 0);
        setContactLists(listRes.data?.data || []);

        setLeads(lRes.data?.data || []);
        setEnquiries(eqRes.data?.data || []);

        setVendors(vRes.data?.data || []);
        setBuyers(bRes.data?.data || []);

        const completed = agrRes.data?.buckets?.completed || [];
        setCompletedAgreements(completed);
      }
    } catch (e) {
      toast.error('Failed to load contacts directory');
    } finally {
      setLoading(false);
    }
  }, [isRentalScope, isInteriorScope, isOpsServiceScope, scope, toast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Set of signed contact IDs, emails and names for vendors
  const signedVendors = useMemo(() => {
    const contactIds = new Set();
    const emails = new Set();
    const names = new Set();
    completedAgreements.forEach((a) => {
      if (a.kind === 'sale') {
        if (a.party_contact_id) contactIds.add(Number(a.party_contact_id));
        if (a.party_email) emails.add(a.party_email.trim().toLowerCase());
        if (a.party_name) names.add(a.party_name.trim().toLowerCase());
      }
    });
    return { contactIds, emails, names };
  }, [completedAgreements]);

  // Set of signed contact IDs, emails and names for buyers
  const signedBuyers = useMemo(() => {
    const contactIds = new Set();
    const emails = new Set();
    const names = new Set();
    completedAgreements.forEach((a) => {
      if (a.kind === 'purchase') {
        if (a.party_contact_id) contactIds.add(Number(a.party_contact_id));
        if (a.party_email) emails.add(a.party_email.trim().toLowerCase());
        if (a.party_name) names.add(a.party_name.trim().toLowerCase());
      }
    });
    return { contactIds, emails, names };
  }, [completedAgreements]);

  const isSignedVendor = useCallback((v) => {
    if (!v) return false;
    const cid = v.contact_id || v.Contact?.id;
    if (cid && signedVendors.contactIds.has(Number(cid))) return true;
    const email = v.Contact?.email?.trim().toLowerCase();
    if (email && signedVendors.emails.has(email)) return true;
    const name = v.Contact?.full_name?.trim().toLowerCase();
    if (name && signedVendors.names.has(name)) return true;
    return false;
  }, [signedVendors]);

  const isSignedBuyer = useCallback((b) => {
    if (!b) return false;
    const cid = b.contact_id || b.Contact?.id;
    if (cid && signedBuyers.contactIds.has(Number(cid))) return true;
    const email = b.Contact?.email?.trim().toLowerCase();
    if (email && signedBuyers.emails.has(email)) return true;
    const name = b.Contact?.full_name?.trim().toLowerCase();
    if (name && signedBuyers.names.has(name)) return true;
    return false;
  }, [signedBuyers]);

  const isSignedLead = useCallback((l) => {
    if (!l) return false;
    if (l.lead_type === 'vendor') {
      const cid = l.contact_id;
      if (cid && signedVendors.contactIds.has(Number(cid))) return true;
      if (l.email && signedVendors.emails.has(l.email.trim().toLowerCase())) return true;
      if (l.name && signedVendors.names.has(l.name.trim().toLowerCase())) return true;
    } else {
      const cid = l.contact_id;
      if (cid && signedBuyers.contactIds.has(Number(cid))) return true;
      if (l.email && signedBuyers.emails.has(l.email.trim().toLowerCase())) return true;
      if (l.name && signedBuyers.names.has(l.name.trim().toLowerCase())) return true;
    }
    return false;
  }, [signedVendors, signedBuyers]);

  // Combined Leads List (Rental Enquiries & Applications for rental, Website Enquiries & Seller Leads for sales)
  const unifiedLeads = useMemo(() => {
    const list = [];

    if (isRentalScope) {
      // 1. Rental Enquiries from website (Prospective Tenant leads)
      (rentalEnquiries || []).forEach((re) => {
        list.push({
          id: `rental-enquiry-${re.id}`,
          rawId: re.id,
          isRentalEnquiry: true,
          code: re.enquiry_code || `RENQ-${re.id}`,
          name: re.enquirer_name || re.name || 'Prospective Tenant',
          phone: re.phone,
          email: re.email,
          lead_type: 'tenant',
          intent_label: 'Rental Enquiry (Tenant Lead)',
          property_id: re.property_id,
          property_code: re.property?.property_code,
          property_title: re.property?.title,
          property_area: re.preferred_area || re.property?.area || 'Dhaka',
          estimated_value: re.budget,
          source: re.source || 'Website',
          stage: re.stage || 'new',
          created_at: re.createdAt || re.created_at,
          notes: re.notes || re.occupancy_requirement || '',
          lease_period: re.lease_period,
          preferred_move_in: re.preferred_move_in,
          contact_id: re.contact_id,
        });
      });

      // 2. Tenant Applications (Screening & Application pipeline)
      (tenantApplications || []).forEach((ta) => {
        list.push({
          id: `application-${ta.id}`,
          rawId: ta.id,
          isApplication: true,
          code: ta.application_code || `APP-${ta.id}`,
          name: ta.applicant_name || ta.tenant?.full_name || 'Tenant Applicant',
          phone: ta.mobile || ta.tenant?.primary_phone,
          email: ta.email || ta.tenant?.email,
          lead_type: 'tenant',
          intent_label: 'Tenant Application',
          property_id: ta.property_id,
          property_code: ta.property?.property_code,
          property_title: ta.property?.title,
          property_area: ta.property?.area || 'Dhaka',
          estimated_value: ta.budget || ta.proposed_monthly_rent,
          source: ta.source || 'Application Form',
          stage: ta.status || 'pending',
          created_at: ta.createdAt || ta.created_at,
          notes: ta.notes || ta.screening_notes || '',
          lease_period: ta.lease_period,
          contact_id: ta.tenant_contact_id || ta.tenant?.id,
        });
      });

      return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    if (isInteriorScope || isOpsServiceScope) {
      // 1. Contacts with lead status / active inquiry
      contacts.forEach((c) => {
        const lookingFor = (c.looking_for || '').toLowerCase();
        const listName = (c.contact_list || '').toLowerCase();
        if (isInteriorScope) {
          const isInterior = ['interior', 'renovation', 'fitout', 'design'].includes(lookingFor);
          const isInteriorList = listName.includes('interior') || listName.includes('design') || listName.includes('renovation') || listName.includes('fitout') || listName.includes('styling');
          if (!isInterior && !isInteriorList) return;
        }
        list.push({
          id: `contact-lead-${c.id}`,
          rawId: c.id,
          isContactLead: true,
          code: c.contact_code || `LEAD-${c.id}`,
          name: c.full_name,
          phone: c.primary_phone,
          email: c.email,
          lead_type: 'client_lead',
          intent_label: c.contact_list || (isInteriorScope ? 'Interior Design Consultation' : 'Service Lead'),
          property_id: null,
          property_code: null,
          property_title: c.property_types ? safeJsonParse(c.property_types, []).join(', ') : (isInteriorScope ? 'Residential Property' : 'Property'),
          property_area: c.area || (c.preferred_areas ? safeJsonParse(c.preferred_areas, []).join(', ') : 'Dhaka'),
          estimated_value: c.budget_max || c.budget_min,
          source: c.lead_source || 'Direct Enquiry',
          stage: c.lead_status || 'new',
          created_at: c.createdAt || c.created_at,
          notes: c.lead_notes || c.notes,
          contact_id: c.id,
          contact_raw: c,
        });
      });

      // 2. Inbound Service Requests from wt-ops
      (interiorRequests || []).forEach((sr) => {
        list.push({
          id: `service-request-${sr.id}`,
          rawId: sr.id,
          isServiceRequest: true,
          code: sr.code || `SR-${sr.id}`,
          name: sr.client_name || sr.name || 'Client Lead',
          phone: sr.client_phone || sr.phone,
          email: sr.client_email || sr.email,
          lead_type: 'client_lead',
          intent_label: sr.service_category || (isInteriorScope ? 'Design Request' : 'Service Request'),
          property_id: null,
          property_code: null,
          property_title: sr.property_type || 'Apartment / Space',
          property_area: sr.service_address || sr.area || 'Dhaka',
          estimated_value: sr.estimated_budget,
          source: sr.source || 'Website / Portal',
          stage: sr.status || 'new',
          created_at: sr.createdAt || sr.created_at,
          notes: sr.notes || sr.scope_summary || '',
        });
      });

      return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    // 1. Sales Enquiries from website (All are Buyer Leads)
    enquiries.forEach((eq) => {
      list.push({
        id: `enquiry-${eq.id}`,
        rawId: eq.id,
        isEnquiry: true,
        code: eq.enquiry_code,
        name: eq.enquirer_name,
        phone: eq.phone,
        email: eq.email,
        lead_type: 'buyer',
        intent_label: 'Buyer Lead (Property Enquiry)',
        property_id: eq.property_id,
        property_code: eq.property?.property_code,
        property_title: eq.property?.title,
        property_area: eq.property?.area,
        estimated_value: eq.budget,
        source: eq.source || 'Website',
        utm_source: eq.utm_source,
        utm_campaign: eq.utm_campaign,
        stage: eq.stage || 'new',
        assigned_to: eq.assigned_officer_id,
        created_at: eq.createdAt || eq.created_at,
        notes: eq.message,
        contact_id: eq.contact_id,
        client_id: eq.client_id,
      });
    });

    // 2. Direct Leads (from leads table — filter out any rent leads from sales)
    leads.forEach((ld) => {
      const vert = (ld.vertical_key || '').toLowerCase();
      const req = (ld.requirement || '').toLowerCase();
      if (vert === 'rent' || vert === 'rental' || req.includes('rent')) {
        return; // Exclude rental leads from sales
      }
      const isSeller = vert === 'seller' || vert === 'vendor' || req.includes('sell');
      list.push({
        id: `lead-${ld.id}`,
        rawId: ld.id,
        isEnquiry: false,
        code: ld.lead_code,
        name: ld.name,
        phone: ld.phone,
        email: ld.email,
        lead_type: isSeller ? 'vendor' : 'buyer',
        intent_label: isSeller ? 'Vendor / Seller Lead' : 'Buyer Lead',
        property_id: ld.property_id,
        property_code: ld.property?.property_code,
        property_title: ld.property?.title,
        property_area: ld.property?.area,
        estimated_value: ld.estimated_value,
        source: ld.source || 'Step Form / Direct',
        stage: ld.status || 'new',
        assigned_to: ld.assigned_to,
        created_at: ld.created_at,
        notes: ld.requirement || ld.notes,
        contact_id: ld.contact_id,
        converted_client_id: ld.converted_client_id,
      });
    });

    // Sort newest first
    return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [isRentalScope, isInteriorScope, isOpsServiceScope, rentalEnquiries, tenantApplications, contacts, interiorRequests, enquiries, leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return unifiedLeads.filter((l) => {
      if (isRentalScope) {
        if (leadTypeFilter !== 'all' && l.lead_type !== leadTypeFilter) return false;
        if (leadStageFilter !== 'all' && l.stage !== leadStageFilter) return false;
      } else if (isInteriorScope || isOpsServiceScope) {
        if (leadStageFilter !== 'all' && l.stage !== leadStageFilter) return false;
      } else {
        // The buy console shows buyer leads only, whatever the filter.
        if (scope === 'buy' && l.lead_type !== 'buyer') return false;
        if (leadTypeFilter !== 'all' && l.lead_type !== leadTypeFilter) return false;
        if (leadStageFilter !== 'all' && l.stage !== leadStageFilter) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = l.name?.toLowerCase().includes(q);
        const matchPhone = l.phone?.toLowerCase().includes(q);
        const matchEmail = l.email?.toLowerCase().includes(q);
        const matchProp = l.property_title?.toLowerCase().includes(q) || l.property_code?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchProp) return false;
      }
      return true;
    });
  }, [unifiedLeads, leadTypeFilter, leadStageFilter, search, scope, isRentalScope, isInteriorScope, isOpsServiceScope]);

  // Filtered Contacts with Lists, Lead Fields, Dates & Sorting
  const filteredContacts = useMemo(() => {
    let result = contacts.filter((c) => {
      const lookingFor = (c.looking_for || '').toLowerCase();
      const listName = (c.contact_list || '').toLowerCase();
      const listsArr = safeJsonParse(c.contact_lists, []).map((l) => String(l).toLowerCase());

      if (isRentalScope) {
        // Property Management scope: ONLY rental leads / prospective tenants / landlords
        const isRent = lookingFor === 'rent';
        const isRentalList =
          listName.includes('rental') ||
          listName.includes('tenant') ||
          listName.includes('landlord') ||
          listsArr.some((l) => l.includes('rental') || l.includes('tenant') || l.includes('landlord'));
        if (!isRent && !isRentalList) return false;
      } else if (isInteriorScope) {
        // Residential Interior Design scope: ONLY interior / renovation / fitout / design / styling
        const isInterior = ['interior', 'renovation', 'fitout', 'design'].includes(lookingFor);
        const isInteriorList =
          listName.includes('interior') ||
          listName.includes('design') ||
          listName.includes('renovation') ||
          listName.includes('fitout') ||
          listName.includes('styling') ||
          listName.includes('kitchen') ||
          listsArr.some((l) => l.includes('interior') || l.includes('design') || l.includes('renovation') || l.includes('fitout') || l.includes('styling') || l.includes('kitchen'));
        if (!isInterior && !isInteriorList) return false;
      } else if (isOpsServiceScope) {
        // Generic ops scope: exclude rental and sales buy/sell
        const isRent = lookingFor === 'rent';
        const isSale = ['buy', 'sell'].includes(lookingFor);
        if (isRent || isSale) return false;
      } else {
        // Residential Sales scope: STRICTLY EXCLUDE any rental leads or tenant / interior lists
        const isRent = lookingFor === 'rent';
        const isInterior = ['interior', 'renovation', 'fitout', 'design'].includes(lookingFor);
        const isExcludedList =
          listName.includes('rental') ||
          listName.includes('tenant') ||
          listName.includes('interior') ||
          listName.includes('design') ||
          listName.includes('renovation') ||
          listName.includes('fitout') ||
          listsArr.some((l) => l.includes('rental') || l.includes('tenant') || l.includes('interior') || l.includes('renovation'));
        if (isRent || isInterior || isExcludedList) return false;
      }

      if (contactTypeFilter !== 'all' && c.contact_type !== contactTypeFilter) return false;
      if (contactLookingForFilter !== 'all') {
        const lf = (c.looking_for || '').toLowerCase();
        if (lf !== contactLookingForFilter.toLowerCase()) return false;
      }
      if (contactListFilter !== 'all') {
        const primaryList = (c.contact_list || 'General Leads').trim();
        const listsArr = safeJsonParse(c.contact_lists, []);
        if (primaryList !== contactListFilter && !listsArr.includes(contactListFilter)) {
          return false;
        }
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = c.full_name?.toLowerCase().includes(q);
        const matchPhone = c.primary_phone?.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        const matchCode = c.contact_code?.toLowerCase().includes(q);
        const matchCompany = c.company_name?.toLowerCase().includes(q);
        const matchList = c.contact_list?.toLowerCase().includes(q);
        const matchArea = c.area?.toLowerCase().includes(q);
        const matchLeadStatus = c.lead_status?.toLowerCase().includes(q);
        const matchLookingFor = c.looking_for?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchCode && !matchCompany && !matchList && !matchArea && !matchLeadStatus && !matchLookingFor) {
          return false;
        }
      }
      return true;
    });

    // Sort
    result = [...result].sort((a, b) => {
      if (contactSortBy === 'full_name') {
        const cmp = (a.full_name || '').localeCompare(b.full_name || '');
        return contactSortOrder === 'ASC' ? cmp : -cmp;
      }
      if (contactSortBy === 'budget_max') {
        const bA = Number(a.budget_max || 0);
        const bB = Number(b.budget_max || 0);
        return contactSortOrder === 'ASC' ? bA - bB : bB - bA;
      }
      if (contactSortBy === 'updated_at') {
        const tA = new Date(a.updatedAt || a.updated_at || a.created_at || 0).getTime();
        const tB = new Date(b.updatedAt || b.updated_at || b.created_at || 0).getTime();
        return contactSortOrder === 'ASC' ? tA - tB : tB - tA;
      }
      if (contactSortBy === 'last_contacted_at') {
        const tA = a.last_contacted_at ? new Date(a.last_contacted_at).getTime() : 0;
        const tB = b.last_contacted_at ? new Date(b.last_contacted_at).getTime() : 0;
        return contactSortOrder === 'ASC' ? tA - tB : tB - tA;
      }
      // default: created_at
      const tA = new Date(a.createdAt || a.created_at || 0).getTime();
      const tB = new Date(b.createdAt || b.created_at || 0).getTime();
      return contactSortOrder === 'ASC' ? tA - tB : tB - tA;
    });

    return result;
  }, [contacts, contactTypeFilter, contactLookingForFilter, contactListFilter, search, contactSortBy, contactSortOrder, isRentalScope, isInteriorScope, isOpsServiceScope]);

  // Filtered Interior / Operations Clients
  const filteredInteriorClients = useMemo(() => {
    return (interiorClients || []).filter((c) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchMobile = c.mobile?.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        const matchCode = c.code?.toLowerCase().includes(q);
        const matchAddr = c.service_address?.toLowerCase().includes(q);
        const matchStage = c.workflow_stage?.toLowerCase().includes(q);
        if (!matchName && !matchMobile && !matchEmail && !matchCode && !matchAddr && !matchStage) return false;
      }
      return true;
    });
  }, [interiorClients, search]);

  // Filtered Interior / Operations Projects
  const filteredInteriorProjects = useMemo(() => {
    return (interiorProjects || []).filter((p) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = p.name?.toLowerCase().includes(q);
        const matchCode = p.code?.toLowerCase().includes(q);
        const matchClient = p.client_name?.toLowerCase().includes(q);
        const matchPhone = p.client_phone?.toLowerCase().includes(q);
        const matchStage = p.stage?.toLowerCase().includes(q);
        const matchStatus = p.status?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchClient && !matchPhone && !matchStage && !matchStatus) return false;
      }
      return true;
    });
  }, [interiorProjects, search]);

  // ── Edit Contact Handlers ──────────────────────────────────────────────────
  const openEditContact = (c) => {
    const areas = safeJsonParse(c.preferred_areas, []);
    const types = safeJsonParse(c.property_types, []);
    setEditContactForm({
      id: c.id,
      full_name: c.full_name || '',
      first_name: c.first_name || '',
      last_name: c.last_name || '',
      contact_type: c.contact_type || 'individual',
      company_name: c.company_name || '',
      designation: c.designation || '',
      primary_phone: c.primary_phone || '',
      alt_phone: c.alt_phone || '',
      whatsapp: c.whatsapp || '',
      email: c.email || '',
      alt_email: c.alt_email || '',
      address_line1: c.address_line1 || '',
      area: c.area || '',
      city: c.city || 'Dhaka',
      contact_list: c.contact_list || 'General Leads',
      lead_status: c.lead_status || 'new',
      lead_source: c.lead_source || c.source || '',
      looking_for: c.looking_for || 'buy',
      preferred_areas: Array.isArray(areas) ? areas.join(', ') : '',
      property_types: Array.isArray(types) ? types.join(', ') : '',
      budget_min: c.budget_min || '',
      budget_max: c.budget_max || '',
      bedrooms_min: c.bedrooms_min || '',
      bathrooms_min: c.bathrooms_min || '',
      size_min_sft: c.size_min_sft || '',
      financing_status: c.financing_status || 'cash_buyer',
      urgency: c.urgency || 'immediate',
      last_contacted_at: c.last_contacted_at ? new Date(c.last_contacted_at).toISOString().slice(0, 10) : '',
      notes: c.notes || '',
      lead_notes: c.lead_notes || '',
    });
    setEditingContact(c);
    setEditContactOpen(true);
  };

  const saveContactEdit = async (e) => {
    e.preventDefault();
    if (!editContactForm.full_name?.trim()) {
      toast.error('Contact full name is required');
      return;
    }
    setEditContactSaving(true);
    try {
      const areasArr = editContactForm.preferred_areas
        ? editContactForm.preferred_areas.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const typesArr = editContactForm.property_types
        ? editContactForm.property_types.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const payload = {
        full_name: editContactForm.full_name.trim(),
        first_name: editContactForm.first_name.trim() || null,
        last_name: editContactForm.last_name.trim() || null,
        contact_type: editContactForm.contact_type,
        company_name: editContactForm.company_name.trim() || null,
        designation: editContactForm.designation.trim() || null,
        primary_phone: editContactForm.primary_phone.trim() || null,
        alt_phone: editContactForm.alt_phone.trim() || null,
        whatsapp: editContactForm.whatsapp.trim() || null,
        email: editContactForm.email.trim() || null,
        alt_email: editContactForm.alt_email.trim() || null,
        address_line1: editContactForm.address_line1.trim() || null,
        area: editContactForm.area.trim() || null,
        city: editContactForm.city.trim() || 'Dhaka',
        contact_list: editContactForm.contact_list.trim() || 'General Leads',
        contact_lists: [editContactForm.contact_list.trim() || 'General Leads'],
        lead_status: editContactForm.lead_status,
        lead_source: editContactForm.lead_source.trim() || null,
        looking_for: editContactForm.looking_for || null,
        preferred_areas: areasArr,
        property_types: typesArr,
        budget_min: editContactForm.budget_min ? Number(editContactForm.budget_min) : null,
        budget_max: editContactForm.budget_max ? Number(editContactForm.budget_max) : null,
        bedrooms_min: editContactForm.bedrooms_min ? Number(editContactForm.bedrooms_min) : null,
        bathrooms_min: editContactForm.bathrooms_min ? Number(editContactForm.bathrooms_min) : null,
        size_min_sft: editContactForm.size_min_sft ? Number(editContactForm.size_min_sft) : null,
        financing_status: editContactForm.financing_status || null,
        urgency: editContactForm.urgency || null,
        last_contacted_at: editContactForm.last_contacted_at ? new Date(editContactForm.last_contacted_at) : null,
        notes: editContactForm.notes,
        lead_notes: editContactForm.lead_notes,
      };

      const res = await api.put(`/contacts/${editContactForm.id}`, payload);
      const updated = res.data?.data;
      if (updated) {
        setContacts((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
      }
      toast.success('Contact updated successfully');
      setEditContactOpen(false);
      setEditingContact(null);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update contact');
    } finally {
      setEditContactSaving(false);
    }
  };

  // ── Log Last Contacted Date ────────────────────────────────────────────────
  const logTouchContact = async (contactId) => {
    try {
      const res = await api.post(`/contacts/${contactId}/touch`);
      const touchedDate = res.data?.data?.last_contacted_at || new Date();
      setContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, last_contacted_at: touchedDate, updatedAt: touchedDate } : c)));
      if (leadProfileContact && leadProfileContact.id === contactId) {
        setLeadProfileContact((prev) => ({ ...prev, last_contacted_at: touchedDate, updatedAt: touchedDate }));
      }
      toast.success('Interaction logged for today');
    } catch (err) {
      toast.error('Failed to log contact touch');
    }
  };

  // ── Real Estate Lead Profile Drawer Handlers ──────────────────────────────
  const openLeadProfile = (c) => {
    setLeadProfileContact(c);
    setQuickLeadNotes(c.lead_notes || c.notes || '');
    setLeadProfileOpen(true);
  };

  const updateLeadStatusQuick = async (newStatus) => {
    if (!leadProfileContact) return;
    try {
      await api.put(`/contacts/${leadProfileContact.id}`, { lead_status: newStatus });
      setLeadProfileContact((prev) => ({ ...prev, lead_status: newStatus }));
      setContacts((prev) => prev.map((c) => (c.id === leadProfileContact.id ? { ...c, lead_status: newStatus } : c)));
      toast.success(`Lead stage set to ${newStatus.replace('_', ' ')}`);
    } catch (err) {
      toast.error('Failed to update stage');
    }
  };

  const saveLeadProfileNotes = async () => {
    if (!leadProfileContact) return;
    setLeadProfileSaving(true);
    try {
      await api.put(`/contacts/${leadProfileContact.id}`, { lead_notes: quickLeadNotes });
      setContacts((prev) => prev.map((c) => (c.id === leadProfileContact.id ? { ...c, lead_notes: quickLeadNotes } : c)));
      toast.success('Lead requirements saved');
    } catch (err) {
      toast.error('Failed to save requirements');
    } finally {
      setLeadProfileSaving(false);
    }
  };

  // ── Template Download & Bulk Import ───────────────────────────────────────
  const downloadSampleTemplate = async (format = 'xlsx') => {
    setDownloadingTemplate(true);
    try {
      const res = await api.get(`/contacts/sample-template?format=${format}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], {
        type: format === 'csv'
          ? 'text/csv;charset=utf-8;'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `seventh-sky-crm-contacts-template.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Sample ${format.toUpperCase()} template downloaded`);
    } catch (err) {
      toast.error('Failed to download template');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!importFile) {
      toast.error('Please select an Excel or CSV file to import');
      return;
    }
    setImportLoading(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('default_contact_list', importDefaultList);
      formData.append('update_duplicates', importUpdateDuplicates ? 'true' : 'false');

      const res = await api.post('/contacts/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setImportResult(res.data?.data || null);
      toast.success(res.data?.message || 'Bulk import completed successfully');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Bulk import failed');
    } finally {
      setImportLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedContactIds.length === filteredContacts.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(filteredContacts.map(c => c.id));
    }
  };

  const toggleSelectContact = (id) => {
    setSelectedContactIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Filtered Vendors
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = v.Contact?.full_name?.toLowerCase().includes(q);
        const matchPhone = v.Contact?.primary_phone?.toLowerCase().includes(q);
        const matchEmail = v.Contact?.email?.toLowerCase().includes(q);
        const matchCode = v.client_code?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchCode) return false;
      }
      return true;
    });
  }, [vendors, search]);

  // Filtered Buyers
  const filteredBuyers = useMemo(() => {
    return buyers.filter((b) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = b.Contact?.full_name?.toLowerCase().includes(q);
        const matchPhone = b.Contact?.primary_phone?.toLowerCase().includes(q);
        const matchEmail = b.Contact?.email?.toLowerCase().includes(q);
        const matchCode = b.client_code?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchCode) return false;
      }
      return true;
    });
  }, [buyers, search]);

  // Filtered Landlords (Property Management)
  const filteredLandlords = useMemo(() => {
    return (landlords || []).filter((l) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const contact = l.Contact || {};
        const matchName = contact.full_name?.toLowerCase().includes(q);
        const matchPhone = contact.primary_phone?.toLowerCase().includes(q);
        const matchEmail = contact.email?.toLowerCase().includes(q);
        const matchCode = l.client_code?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchCode) return false;
      }
      return true;
    });
  }, [landlords, search]);

  // Filtered Tenancies (Property Management)
  const filteredTenancies = useMemo(() => {
    return (tenancies || []).filter((t) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchCode = t.tenancy_code?.toLowerCase().includes(q);
        const matchTenant = t.tenant?.full_name?.toLowerCase().includes(q) || t.tenant?.primary_phone?.toLowerCase().includes(q);
        const matchOwner = t.owner?.full_name?.toLowerCase().includes(q);
        const matchProp = t.Property?.title?.toLowerCase().includes(q) || t.Property?.property_code?.toLowerCase().includes(q);
        if (!matchCode && !matchTenant && !matchOwner && !matchProp) return false;
      }
      return true;
    });
  }, [tenancies, search]);

  // Contact Lists Scoped for Dropdown
  const scopedContactLists = useMemo(() => {
    if (isRentalScope) {
      return contactLists.filter((l) => {
        const n = (l.name || '').toLowerCase();
        return n.includes('rental') || n.includes('tenant') || n.includes('landlord');
      });
    }
    if (isInteriorScope) {
      return contactLists.filter((l) => {
        const n = (l.name || '').toLowerCase();
        return n.includes('interior') || n.includes('design') || n.includes('renovation') || n.includes('fitout') || n.includes('styling') || n.includes('kitchen');
      });
    }
    return contactLists.filter((l) => {
      const n = (l.name || '').toLowerCase();
      return !n.includes('rental') && !n.includes('tenant') && !n.includes('interior') && !n.includes('renovation');
    });
  }, [contactLists, isRentalScope, isInteriorScope]);

  // Counters
  const counters = useMemo(() => {
    if (isRentalScope) {
      const activeLeadsCount = unifiedLeads.filter(
        (l) => l.stage !== 'converted' && l.stage !== 'rejected' && l.stage !== 'lost' && l.stage !== 'declined'
      ).length;
      const activeTenanciesCount = (tenancies || []).filter((t) => t.status === 'active').length;
      const readyAgreementsCount = unifiedLeads.filter((l) => l.stage === 'approved' || l.stage === 'converted').length;

      return {
        contacts: filteredContacts.length,
        leads: activeLeadsCount,
        totalLeads: unifiedLeads.length,
        landlords: filteredLandlords.length,
        tenancies: activeTenanciesCount,
        readyAgreements: readyAgreementsCount,
      };
    }

    if (isInteriorScope || isOpsServiceScope) {
      const activeLeadsCount = unifiedLeads.filter(
        (l) => l.stage !== 'converted' && l.stage !== 'rejected' && l.stage !== 'lost' && l.stage !== 'completed'
      ).length;
      const activeProjectsCount = (interiorProjects || []).filter((p) => p.status === 'Open' || p.status === 'Active' || !p.status).length;
      const agreementReadyCount = (interiorClients || []).filter((c) => c.agreement_status === 'Signed' || c.agreement_status === 'Ready').length;

      return {
        contacts: filteredContacts.length,
        leads: activeLeadsCount,
        totalLeads: unifiedLeads.length,
        clients: (interiorClients || []).length,
        projects: activeProjectsCount,
        readyAgreements: agreementReadyCount,
      };
    }

    const totalLeadsCount = unifiedLeads.length;
    const activeLeadsCount = unifiedLeads.filter((l) => l.stage !== 'converted' && l.stage !== 'rejected' && l.stage !== 'lost').length;
    const readyForAgreementCount = unifiedLeads.filter((l) => l.stage === 'offer_made' || l.stage === 'converted').length;

    return {
      contacts: filteredContacts.length,
      leads: activeLeadsCount,
      totalLeads: totalLeadsCount,
      vendors: vendors.length,
      buyers: buyers.length,
      readyAgreements: readyForAgreementCount,
    };
  }, [isRentalScope, isInteriorScope, isOpsServiceScope, filteredContacts.length, unifiedLeads, filteredLandlords.length, tenancies, vendors.length, buyers.length, interiorProjects, interiorClients]);

  // ── Create New Lead ────────────────────────────────────────────────────────
  const submitNewLead = async (e) => {
    e.preventDefault();
    if (!leadForm.name.trim()) {
      toast.error('Lead name is required');
      return;
    }

    try {
      const payload = {
        name: leadForm.name.trim(),
        phone: leadForm.phone.trim() || null,
        email: leadForm.email.trim() || null,
        vertical_key: leadForm.lead_type === 'vendor' ? 'seller' : 'buyer',
        property_id: leadForm.property_id ? Number(leadForm.property_id) : null,
        requirement: leadForm.requirement || leadForm.notes,
        estimated_value: leadForm.estimated_value ? Number(leadForm.estimated_value) : null,
        source: leadForm.source,
        priority: leadForm.priority,
        assigned_to: leadForm.assigned_to ? Number(leadForm.assigned_to) : null,
        notes: leadForm.notes,
      };

      await api.post('/leads', payload);
      toast.success('New lead created successfully');
      setNewLeadDrawer(false);
      setLeadForm({
        name: '',
        phone: '',
        email: '',
        lead_type: 'buyer',
        property_id: '',
        requirement: '',
        estimated_value: '',
        source: 'Website Enquiry',
        priority: 'medium',
        assigned_to: '',
        notes: '',
      });
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create lead');
    }
  };

  // ── Create New Contact ─────────────────────────────────────────────────────
  const submitNewContact = async (e) => {
    e.preventDefault();
    if (!contactForm.full_name.trim()) {
      toast.error('Contact full name is required');
      return;
    }

    try {
      await api.post('/contacts', {
        full_name: contactForm.full_name.trim(),
        contact_type: contactForm.contact_type,
        primary_phone: contactForm.primary_phone.trim() || null,
        email: contactForm.email.trim() || null,
        company_name: contactForm.company_name.trim() || null,
        contact_list: contactForm.contact_list.trim() || (isRentalScope ? 'Rental Leads' : 'General Leads'),
        looking_for: contactForm.looking_for || (isRentalScope ? 'rent' : 'buy'),
        lead_status: contactForm.lead_status || 'new',
        area: contactForm.area.trim() || null,
        city: contactForm.city.trim() || 'Dhaka',
        notes: contactForm.notes,
      });
      toast.success('Contact created successfully');
      setNewContactDrawer(false);
      setContactForm({
        full_name: '',
        contact_type: 'individual',
        primary_phone: '',
        email: '',
        company_name: '',
        contact_list: isRentalScope ? 'Rental Leads' : 'General Leads',
        looking_for: isRentalScope ? 'rent' : 'buy',
        lead_status: 'new',
        area: '',
        city: 'Dhaka',
        notes: '',
      });
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create contact');
    }
  };

  // ── Execute Lead Conversion ────────────────────────────────────────────────
  const executeConversion = async () => {
    if (!convertModal) return;
    setConverting(true);
    try {
      const isSeller = convertRole === 'seller';
      const isBuyer = convertRole === 'buyer';

      let resData = null;

      if (convertModal.isEnquiry) {
        // Enquiries already have Contact and Client created upon receipt
        // Ensure client is updated with target role
        if (convertModal.client_id) {
          await api.put(`/clients/${convertModal.client_id}`, {
            is_seller: isSeller,
            is_buyer: isBuyer,
          });
        }
        resData = {
          clientId: convertModal.client_id,
          contactId: convertModal.contact_id,
          clientCode: convertModal.code,
          name: convertModal.name,
          phone: convertModal.phone,
          email: convertModal.email,
          budget: convertModal.budget || convertModal.estimated_value,
          property_id: convertModal.property_id,
          role: convertRole,
        };
      } else {
        // Direct Lead conversion via /api/leads/:id/convert
        const { data } = await api.post(`/leads/${convertModal.rawId}/convert`, {
          target_role: convertRole,
          is_seller: isSeller,
          is_buyer: isBuyer,
        });
        resData = {
          clientId: data.data.client?.id,
          contactId: data.data.contact?.id,
          clientCode: data.data.client?.client_code,
          name: convertModal.name,
          phone: convertModal.phone,
          email: convertModal.email,
          budget: convertModal.budget || convertModal.estimated_value,
          property_id: convertModal.property_id,
          role: convertRole,
        };
      }

      toast.success(`Lead successfully converted to ${isSeller ? 'Vendor' : 'Buyer'}!`);
      setConvertSuccess(resData);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to convert lead');
    } finally {
      setConverting(false);
    }
  };

  // ── Navigation to Agreements with Rich Prefill ────────────────────────────
  const goToAgreement = (role, contactId, name, phone, email, extra = {}) => {
    const isSeller = role === 'seller' || role === 'vendor';
    const targetPath = isSeller ? '/residential/agreements/sale' : '/residential/agreements/purchase';

    navigate(targetPath, {
      state: {
        prefill: {
          client_contact_id: contactId || '',
          property_id: extra.property_id || '',
          property_type: extra.property_type || '',
          client_id: extra.client_id || '',
          client: {
            full_name: name || '',
            phone: phone || '',
            email: email || '',
            nid: extra.nid || '',
            property_address: extra.address || '',
          },
          schedule_b: {
            target_value: extra.budget || extra.target_value || '',
          },
        },
      },
    });
  };

  // ── Edit Lead Handlers ─────────────────────────────────────────────────────
  const openEditLead = (l) => {
    setEditingLead(l);
    setEditLeadForm({
      name: l.name || '',
      phone: l.phone || '',
      email: l.email || '',
      lead_type: l.lead_type || (l.isEnquiry ? 'buyer' : 'vendor'),
      stage: l.stage || 'new',
      source: l.source || (l.isEnquiry ? 'Website Enquiry' : 'General Lead'),
      priority: l.priority || 'medium',
      budget: l.budget || l.estimated_value || '',
      preferred_area: l.preferred_area || '',
      property_id: l.property_id || '',
      assigned_to: l.assigned_to || l.assigned_officer_id || '',
      notes: l.notes || '',
      requirement: l.requirement || l.message || '',
    });
    setEditLeadOpen(true);
  };

  const saveLeadEdit = async (e) => {
    if (e) e.preventDefault();
    if (!editLeadForm.name?.trim()) {
      return toast.error('Lead name is required');
    }
    setEditLeadSaving(true);
    try {
      if (editingLead.isEnquiry) {
        await api.put(`/sales-enquiries/${editingLead.rawId}`, {
          enquirer_name: editLeadForm.name,
          phone: editLeadForm.phone,
          email: editLeadForm.email,
          stage: editLeadForm.stage,
          source: editLeadForm.source,
          budget: editLeadForm.budget || null,
          preferred_area: editLeadForm.preferred_area || null,
          property_id: editLeadForm.property_id || null,
          assigned_officer_id: editLeadForm.assigned_to || null,
          notes: editLeadForm.notes || null,
          message: editLeadForm.requirement || null,
        });
      } else {
        await api.put(`/leads/${editingLead.rawId}`, {
          name: editLeadForm.name,
          phone: editLeadForm.phone,
          email: editLeadForm.email,
          status: editLeadForm.stage,
          source: editLeadForm.source,
          priority: editLeadForm.priority,
          estimated_value: editLeadForm.budget || null,
          property_id: editLeadForm.property_id || null,
          assigned_to: editLeadForm.assigned_to || null,
          notes: editLeadForm.notes || null,
          requirement: editLeadForm.requirement || null,
        });
      }
      toast.success('Lead updated successfully');
      setEditLeadOpen(false);
      setEditingLead(null);
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update lead');
    } finally {
      setEditLeadSaving(false);
    }
  };

  // ── Edit Party (Buyer/Vendor) Handlers ─────────────────────────────────────
  const openEditParty = (role, record) => {
    const contact = record.Contact || {};
    setEditingParty(record);
    setEditPartyRole(role);
    setEditPartyForm({
      contact_id: record.contact_id || contact.id,
      client_id: record.id,
      full_name: contact.full_name || '',
      company_name: contact.company_name || '',
      primary_phone: contact.primary_phone || '',
      whatsapp: contact.whatsapp || '',
      email: contact.email || '',
      address_line1: contact.address_line1 || '',
      area: contact.area || '',
      city: contact.city || 'Dhaka',
      district: contact.district || '',
      national_id: contact.national_id || '',
      passport_no: contact.passport_no || '',
      client_segment: record.client_segment || 'standard',
      status: record.status || 'active',
      notes: record.notes || contact.notes || '',
      budget: record.budget || '',
    });
    setEditPartyOpen(true);
  };

  const savePartyEdit = async (e) => {
    if (e) e.preventDefault();
    if (!editPartyForm.full_name?.trim()) {
      return toast.error('Full name is required');
    }
    setEditPartySaving(true);
    try {
      if (editPartyForm.contact_id) {
        await api.put(`/contacts/${editPartyForm.contact_id}`, {
          full_name: editPartyForm.full_name,
          company_name: editPartyForm.company_name,
          primary_phone: editPartyForm.primary_phone,
          whatsapp: editPartyForm.whatsapp,
          email: editPartyForm.email,
          address_line1: editPartyForm.address_line1,
          area: editPartyForm.area,
          city: editPartyForm.city,
          district: editPartyForm.district,
          national_id: editPartyForm.national_id,
          passport_no: editPartyForm.passport_no,
          notes: editPartyForm.notes,
        });
      }
      if (editPartyForm.client_id) {
        await api.put(`/clients/${editPartyForm.client_id}`, {
          client_segment: editPartyForm.client_segment,
          status: editPartyForm.status,
          notes: editPartyForm.notes,
        });
      }
      toast.success(`${editPartyRole === 'vendor' ? 'Vendor' : 'Buyer'} details updated successfully`);
      setEditPartyOpen(false);
      setEditingParty(null);
      await loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update party details');
    } finally {
      setEditPartySaving(false);
    }
  };

  // ── Open Client Dashboard ──────────────────────────────────────────────────
  // In the buy console the client dashboard opens inside the buyer section.
  const clientsBase = scope === 'buy' ? '/residential/buyer/clients' : '/residential/contacts/clients';
  const openClientDashboard = (clientId, contactId) => {
    if (clientId) {
      navigate(`${clientsBase}?client=${clientId}`);
    } else if (contactId) {
      navigate(`${clientsBase}?contact=${contactId}`);
    } else {
      navigate(clientsBase);
    }
  };

  return (
    <div className="pm-scope">
      {/* ── Top Header Cockpit ────────────────────────────────────────────── */}
      <div className="pm-head" style={{ marginBottom: 14 }}>
        <div>
          <div className="pm-eyebrow">
            {isRentalScope
              ? 'Property Management · Rental CRM'
              : isInteriorScope
              ? 'Residential Interior Design · Contacts & Leads CRM'
              : isOpsServiceScope
              ? 'Operations Console · Contacts & Leads CRM'
              : (scope === 'buy' ? 'Residential · Buyer Service' : 'Residential Sales · Directory & Pipeline')}
          </div>
          <h1>
            {isRentalScope
              ? 'Rental Leads & Contacts'
              : isInteriorScope
              ? 'Interior Design Contacts & Leads'
              : isOpsServiceScope
              ? 'Service Contacts & Leads'
              : (scope === 'buy' ? 'Buyer Contacts & Leads' : 'Contacts & Leads')}
          </h1>
          <div className="pm-meta">
            {isRentalScope
              ? 'Integrated CRM directory for rental leads, prospective tenants, landlord representations, and agreement onboarding.'
              : isInteriorScope
              ? 'Integrated CRM directory for interior design consultation leads, renovation requests, project clients, and fit-out contracts.'
              : isOpsServiceScope
              ? 'Integrated CRM directory for service client profiles, inbound inquiries, work orders, and operations pipeline.'
              : 'Integrated CRM directory for client profiles, seller leads, buyer enquiries, and agreement onboarding.'}
          </div>
        </div>
        <div className="pm-head-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="pm-btn"
            onClick={loadAll}
            disabled={loading}
            title="Refresh directory"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>

          <button
            type="button"
            className="pm-btn"
            onClick={() => {
              setImportFile(null);
              setImportResult(null);
              setBulkImportOpen(true);
            }}
            style={{ borderColor: '#0284c7', color: '#0369a1', fontWeight: 700, background: '#f0f9ff' }}
            title="Bulk Lead & Contact Import via Excel / CSV"
          >
            <FileSpreadsheet size={14} /> Import Excel
          </button>

          <button
            type="button"
            className="pm-btn"
            onClick={() => setNewContactDrawer(true)}
          >
            <Plus size={14} /> New Contact
          </button>

          {isRentalScope ? (
            <>
              <button
                type="button"
                className="pm-btn primary"
                onClick={() => {
                  setContactForm((prev) => ({ ...prev, looking_for: 'rent', contact_list: 'Rental Leads' }));
                  setNewContactDrawer(true);
                }}
                style={{ background: '#0284c7', color: '#ffffff' }}
              >
                <UserPlus size={14} /> + New Rental Lead
              </button>

              <button
                type="button"
                className="pm-btn"
                onClick={() => {
                  setContactForm((prev) => ({ ...prev, looking_for: 'sell', contact_list: 'Landlords / Lessors' }));
                  setNewContactDrawer(true);
                }}
                style={{ borderColor: '#d97706', color: '#b45309' }}
              >
                <Building2 size={14} /> + New Landlord
              </button>

              <button
                type="button"
                className="pm-btn"
                onClick={() => navigate('/property-management/marketing')}
                style={{ borderColor: '#003768', color: '#003768', fontWeight: 700, background: '#f0f9ff' }}
                title="Open Property Management Marketing Activities"
              >
                <Megaphone size={14} /> Marketing Activities &rarr;
              </button>
            </>
          ) : isInteriorScope ? (
            <>
              <button
                type="button"
                className="pm-btn primary"
                onClick={() => {
                  setContactForm((prev) => ({ ...prev, looking_for: 'interior', contact_list: 'Interior Design Leads' }));
                  setNewContactDrawer(true);
                }}
                style={{ background: '#9333ea', color: '#ffffff' }}
              >
                <UserPlus size={14} /> + New Design Lead
              </button>

              <button
                type="button"
                className="pm-btn"
                onClick={() => navigate('/residential-interior-design')}
                style={{ borderColor: '#9333ea', color: '#7e22ce', fontWeight: 700, background: '#faf5ff' }}
                title="Open Residential Interior Design Operations Dashboard"
              >
                <Building2 size={14} /> Design Dashboard &rarr;
              </button>
            </>
          ) : isOpsServiceScope ? (
            <>
              <button
                type="button"
                className="pm-btn primary"
                onClick={() => {
                  setContactForm((prev) => ({ ...prev, looking_for: 'service', contact_list: 'Service Leads' }));
                  setNewContactDrawer(true);
                }}
                style={{ background: '#0284c7', color: '#ffffff' }}
              >
                <UserPlus size={14} /> + New Service Lead
              </button>

              <button
                type="button"
                className="pm-btn"
                onClick={() => navigate(svcBase())}
                style={{ borderColor: '#0284c7', color: '#0369a1', fontWeight: 700, background: '#f0f9ff' }}
                title="Open Operations Dashboard"
              >
                <Building2 size={14} /> Service Dashboard &rarr;
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="pm-btn"
                onClick={() => setNewLeadDrawer(true)}
              >
                <UserPlus size={14} /> New Lead
              </button>

              {scope !== 'buy' && (
                <button
                  type="button"
                  className="pm-btn"
                  onClick={() => setNewPartyDrawer('vendor')}
                  style={{ borderColor: '#d97706', color: '#b45309' }}
                >
                  <Building2 size={14} /> New Seller
                </button>
              )}

              <button
                type="button"
                className="pm-btn primary"
                onClick={() => setNewPartyDrawer('buyer')}
                style={{ background: '#4f46e5', color: '#ffffff' }}
              >
                <Briefcase size={14} /> + New Buyer
              </button>

              <button
                type="button"
                className="pm-btn"
                onClick={() => navigate('/residential/marketing')}
                style={{ borderColor: '#003768', color: '#003768', fontWeight: 700, background: '#f0f9ff' }}
                title="Open Residential Marketing & Campaigns Hub"
              >
                <Megaphone size={14} /> Marketing Hub &rarr;
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Executive Metric Strip ────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div className="card stat" style={{ padding: '12px 16px', borderRadius: 12 }}>
          <div className="label" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
            {isRentalScope ? 'Rental Contacts' : isInteriorScope ? 'Design Contacts' : isOpsServiceScope ? 'Service Contacts' : 'Total Contacts'}
          </div>
          <div className="value" style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)' }}>
            {counters.contacts}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            {isRentalScope ? 'Prospective tenants & rental CRM' : isInteriorScope ? 'Design directory' : isOpsServiceScope ? 'Client & lead records' : 'Master directory'}
          </div>
        </div>

        <div className="card stat" style={{ padding: '12px 16px', borderRadius: 12, borderLeft: isInteriorScope ? '4px solid #9333ea' : '4px solid #0284c7' }}>
          <div className="label" style={{ fontSize: 11.5, fontWeight: 700, color: isInteriorScope ? '#7e22ce' : '#0369a1', textTransform: 'uppercase' }}>
            {isRentalScope ? 'Rental Leads' : isInteriorScope ? 'Active Design Leads' : 'Active Leads'}
          </div>
          <div className="value" style={{ fontSize: 24, fontWeight: 800, color: isInteriorScope ? '#9333ea' : '#0284c7' }}>
            {counters.leads}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            {isRentalScope ? 'Enquiries & tenant applicants' : isInteriorScope ? 'Consultation & design inquiries' : isOpsServiceScope ? 'Inbound service inquiries' : 'Enquiries & Seller leads'}
          </div>
        </div>

        <div className="card stat" style={{ padding: '12px 16px', borderRadius: 12, borderLeft: '4px solid #d97706' }}>
          <div className="label" style={{ fontSize: 11.5, fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
            {isRentalScope ? 'Landlords & Owners' : isInteriorScope ? 'Design Clients' : isOpsServiceScope ? 'Service Clients' : 'Vendors (Sellers)'}
          </div>
          <div className="value" style={{ fontSize: 24, fontWeight: 800, color: '#d97706' }}>
            {isRentalScope ? counters.landlords : (isInteriorScope || isOpsServiceScope) ? counters.clients : counters.vendors}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            {isRentalScope ? 'Property owner representations' : isInteriorScope ? 'Onboarded client profiles' : isOpsServiceScope ? 'Onboarded clients' : 'Ready for Sale Agreements'}
          </div>
        </div>

        <div className="card stat" style={{ padding: '12px 16px', borderRadius: 12, borderLeft: '4px solid #7c3aed' }}>
          <div className="label" style={{ fontSize: 11.5, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
            {isRentalScope ? 'Active Tenancies' : (isInteriorScope || isOpsServiceScope) ? 'Active Projects' : 'Buyers'}
          </div>
          <div className="value" style={{ fontSize: 24, fontWeight: 800, color: '#7c3aed' }}>
            {isRentalScope ? counters.tenancies : (isInteriorScope || isOpsServiceScope) ? counters.projects : counters.buyers}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            {isRentalScope ? 'Active managed leases' : isInteriorScope ? 'In-progress interior spaces' : isOpsServiceScope ? 'In-progress operations' : 'Purchase prospects'}
          </div>
        </div>

        <div className="card stat" style={{ padding: '12px 16px', borderRadius: 12, borderLeft: '4px solid #16a34a' }}>
          <div className="label" style={{ fontSize: 11.5, fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>
            {isRentalScope ? 'Ready / Approved' : (isInteriorScope || isOpsServiceScope) ? 'Agreement Signed' : 'Agreement Ready'}
          </div>
          <div className="value" style={{ fontSize: 24, fontWeight: 800, color: '#16a34a' }}>
            {counters.readyAgreements}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            {isRentalScope ? 'Approved tenant pipeline' : isInteriorScope ? 'Executed design agreements' : isOpsServiceScope ? 'Signed service agreements' : 'Converted pipeline'}
          </div>
        </div>
      </div>

      {/* ── Primary Tabs Navigation ───────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--line, #e2e8f0)',
          marginBottom: 16,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          {(isRentalScope
            ? [
                { key: 'contacts', label: 'Rental Leads & Contacts', count: counters.contacts, icon: Users },
                { key: 'leads', label: 'Rental Inquiries & Applicants', count: counters.leads, icon: Sparkles },
                { key: 'landlords', label: 'Landlords & Owners', count: counters.landlords, icon: Building2 },
                { key: 'tenancies', label: 'Active Tenancies', count: counters.tenancies, icon: Home },
                { key: 'automations', label: 'Automations', icon: Send },
              ]
            : (isInteriorScope || isOpsServiceScope)
            ? [
                { key: 'contacts', label: isInteriorScope ? 'Design Contacts & Leads' : 'Contacts & Leads', count: counters.contacts, icon: Users },
                { key: 'leads', label: isInteriorScope ? 'Consultations & Inquiries' : 'Service Inquiries', count: counters.leads, icon: Sparkles },
                { key: 'clients', label: isInteriorScope ? 'Design Clients' : 'Clients', count: counters.clients, icon: Building2 },
                { key: 'projects', label: isInteriorScope ? 'Active Projects' : 'Projects', count: counters.projects, icon: Briefcase },
                { key: 'automations', label: 'Automations', icon: Send },
              ]
            : [
                { key: 'contacts', label: 'All Contacts', count: counters.contacts, icon: Users },
                { key: 'leads', label: scope === 'buy' ? 'Buyer Leads' : 'Leads', count: counters.leads, icon: Sparkles },
                // The buy console never lists vendors (sellers).
                ...(scope === 'buy' ? [] : [{ key: 'vendors', label: 'Vendors', count: counters.vendors, icon: Building2 }]),
                { key: 'buyers', label: 'Buyers', count: counters.buyers, icon: Briefcase },
                { key: 'automations', label: 'Automations', icon: Send },
              ]
          ).map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '10px 15px',
                  background: 'none',
                  border: 'none',
                  borderBottom: active ? '3px solid var(--navy, #003768)' : '3px solid transparent',
                  color: active ? 'var(--navy, #003768)' : 'var(--muted, #64748b)',
                  fontWeight: active ? 750 : 600,
                  fontSize: 13.5,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={16} />
                <span>{t.label}</span>
                {t.count !== undefined && (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 750,
                      background: active ? 'var(--navy, #003768)' : 'var(--surface-3, #f1f5f9)',
                      color: active ? '#ffffff' : 'var(--muted, #64748b)',
                      padding: '1px 6px',
                      borderRadius: 10,
                    }}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Global Search Bar */}
        {activeTab !== 'automations' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 260 }}>
            <div className="search-box" style={{ width: '100%' }}>
              <Search size={15} color="var(--muted)" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${activeTab}...`}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
         TAB 1: ALL CONTACTS
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'contacts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Subfilter strip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: 'All Contacts' },
                { key: 'individual', label: 'Individuals' },
                { key: 'company', label: 'Companies' },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setContactTypeFilter(f.key)}
                  style={{
                    fontSize: 12,
                    fontWeight: contactTypeFilter === f.key ? 750 : 550,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--line, #e2e8f0)',
                    background: contactTypeFilter === f.key ? 'var(--navy, #003768)' : '#ffffff',
                    color: contactTypeFilter === f.key ? '#ffffff' : 'var(--ink)',
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}

              {/* Contact Lists Filter Dropdown */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 8, paddingLeft: 8, borderLeft: '1px solid #cbd5e1' }}>
                <Layers size={13} style={{ color: '#64748b' }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#475569' }}>List:</span>
                <select
                  value={contactListFilter}
                  onChange={(e) => setContactListFilter(e.target.value)}
                  style={{
                    fontSize: 12,
                    fontWeight: 650,
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">All Lists ({filteredContacts.length})</option>
                  {scopedContactLists.map((l) => (
                    <option key={l.name} value={l.name}>
                      {l.name} ({l.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Intent / Looking For Filter */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 6, paddingLeft: 8, borderLeft: '1px solid #cbd5e1' }}>
                <Compass size={13} style={{ color: '#64748b' }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#475569' }}>Intent:</span>
                <select
                  value={contactLookingForFilter}
                  onChange={(e) => setContactLookingForFilter(e.target.value)}
                  style={{
                    fontSize: 12,
                    fontWeight: 650,
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: contactLookingForFilter !== 'all' ? '#eff6ff' : '#ffffff',
                    color: contactLookingForFilter !== 'all' ? '#1d4ed8' : '#0f172a',
                    cursor: 'pointer',
                  }}
                >
                  {isRentalScope ? (
                    <>
                      <option value="all">All Rental Leads</option>
                      <option value="rent">🏠 Rent (Prospective Tenants)</option>
                      <option value="sell">🔑 Landlords / Owners</option>
                    </>
                  ) : isInteriorScope ? (
                    <>
                      <option value="all">All Interior Requirements</option>
                      <option value="interior">🎨 Interior Design & Planning</option>
                      <option value="renovation">🔨 Full Home Renovation</option>
                      <option value="fitout">🏢 Commercial / Office Fit-Out</option>
                      <option value="design">✨ Luxury Villa & Styling</option>
                    </>
                  ) : isOpsServiceScope ? (
                    <>
                      <option value="all">All Service Inquiries</option>
                      <option value="service">🛠️ Service Requests</option>
                      <option value="amc">🛡️ Maintenance & Contracts</option>
                    </>
                  ) : (
                    <>
                      <option value="all">All Sales Intents</option>
                      <option value="buy">🏢 Buy (Buyer Leads)</option>
                      <option value="sell">🏷️ Sell (Sellers / Vendors)</option>
                      <option value="invest">💼 Invest (Investors)</option>
                    </>
                  )}
                </select>
                {contactLookingForFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setContactLookingForFilter('all')}
                    title="Clear Intent Filter"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Sort By Dropdown */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 6, paddingLeft: 8, borderLeft: '1px solid #cbd5e1' }}>
                <ListFilter size={13} style={{ color: '#64748b' }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#475569' }}>Sort:</span>
                <select
                  value={contactSortBy}
                  onChange={(e) => setContactSortBy(e.target.value)}
                  style={{
                    fontSize: 12,
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    cursor: 'pointer',
                  }}
                >
                  <option value="created_at">Added Date</option>
                  <option value="updated_at">Last Updated Date</option>
                  <option value="last_contacted_at">Last Contacted Date</option>
                  <option value="full_name">Contact Name (A–Z)</option>
                  <option value="budget_max">Highest Budget</option>
                </select>
                <button
                  type="button"
                  onClick={() => setContactSortOrder((prev) => (prev === 'DESC' ? 'ASC' : 'DESC'))}
                  title={`Order: ${contactSortOrder === 'DESC' ? 'Descending' : 'Ascending'}`}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '3px 7px',
                    borderRadius: 5,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  {contactSortOrder === 'DESC' ? '↓ Desc' : '↑ Asc'}
                </button>
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
              Showing {filteredContacts.length} of {contacts.length} contacts
            </div>
          </div>

          {/* Contacts Table */}
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
          ) : filteredContacts.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', borderRadius: 12 }}>
              <Users size={32} style={{ color: 'var(--muted)', margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>No contacts found</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                Try adjusting your search criteria, contact list filter, or import contacts via Excel.
              </div>
            </div>
          ) : (
            <>
              {selectedContactIds.length > 0 && (
                <div style={{
                  background: '#012a4e', color: '#fff', padding: '10px 16px', borderRadius: 8,
                  marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 800, fontSize: 12, background: '#0284c7', padding: '2px 8px', borderRadius: 4 }}>
                      {selectedContactIds.length} Selected
                    </span>
                    <span style={{ fontSize: 13, color: '#e2e8f0' }}>Contacts ready for bulk campaign</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => navigate('/residential/marketing', { state: { channel: 'email', target_type: 'selected_contacts', contact_ids: selectedContactIds, initialTab: 'broadcast' } })}
                      style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Mail size={13} /> Email Campaign
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/residential/marketing', { state: { channel: 'sms', target_type: 'selected_contacts', contact_ids: selectedContactIds, initialTab: 'broadcast' } })}
                      style={{ background: '#d97706', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <MessageSquare size={13} /> Bulk SMS
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/residential/marketing', { state: { channel: 'whatsapp', target_type: 'selected_contacts', contact_ids: selectedContactIds, initialTab: 'broadcast' } })}
                      style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Phone size={13} /> WhatsApp Broadcast
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedContactIds([])}
                      style={{ background: 'transparent', color: '#94a3b8', border: 'none', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', marginLeft: 6 }}
                    >
                      Deselect
                    </button>
                  </div>
                </div>
              )}

              <div className="card" style={{ overflow: 'hidden', borderRadius: 12 }}>
                <div className="table-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th style={{ width: 36, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={filteredContacts.length > 0 && selectedContactIds.length === filteredContacts.length}
                            onChange={toggleSelectAll}
                          />
                        </th>
                        <th style={{ width: 250 }}>Contact Name &amp; List</th>
                        <th>Communication</th>
                        <th>Organization / Location</th>
                        <th>Real Estate Requirements</th>
                        <th>Dates &amp; Outreach</th>
                        <th style={{ textAlign: 'right', width: 170 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContacts.map((c) => {
                        const areas = safeJsonParse(c.preferred_areas, []);
                        const types = safeJsonParse(c.property_types, []);
                        const hasLeadReqs = c.looking_for || c.budget_max || areas.length > 0 || types.length > 0;
                        const leadStageLabel = (c.lead_status || 'new').replace('_', ' ');

                        return (
                          <tr key={c.id}>
                            <td style={{ width: 36, textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={selectedContactIds.includes(c.id)}
                                onChange={() => toggleSelectContact(c.id)}
                              />
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div
                                  style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 8,
                                    background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                                    color: '#0369a1',
                                    fontWeight: 800,
                                    fontSize: 12,
                                    display: 'grid',
                                    placeItems: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  {getInitials(c.full_name)}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div
                                    style={{ fontWeight: 750, color: 'var(--ink)', cursor: 'pointer' }}
                                    onClick={() => openClientDashboard(null, c.id)}
                                    title="Click to view client dossier"
                                  >
                                    {c.full_name}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                                    {c.contact_code && (
                                      <span className="code-chip" style={{ fontSize: 9.5 }}>
                                        {c.contact_code}
                                      </span>
                                    )}
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        padding: '1px 6px',
                                        borderRadius: 8,
                                        background: '#f3e8ff',
                                        color: '#6b21a8',
                                        border: '1px solid #e9d5ff',
                                      }}
                                      title="Contact List Group"
                                    >
                                      {c.contact_list || 'General Leads'}
                                    </span>
                                    {c.contact_type === 'company' && (
                                      <Badge tone="sky">Company</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {c.primary_phone ? (
                                  <a
                                    href={`tel:${c.primary_phone}`}
                                    style={{ fontSize: 12, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  >
                                    <Phone size={11} color="var(--muted)" /> {c.primary_phone}
                                  </a>
                                ) : (
                                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>No phone</span>
                                )}
                                {c.whatsapp && (
                                  <a
                                    href={`https://wa.me/${c.whatsapp.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ fontSize: 11, color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 600 }}
                                  >
                                    <Phone size={10} /> WhatsApp
                                  </a>
                                )}
                                {c.email && (
                                  <a
                                    href={`mailto:${c.email}`}
                                    style={{ fontSize: 11.5, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  >
                                    <Mail size={11} color="var(--muted)" /> {c.email}
                                  </a>
                                )}
                              </div>
                            </td>

                            <td>
                              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
                                {c.company_name || '—'}
                              </div>
                              {c.designation && (
                                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.designation}</div>
                              )}
                              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                                {[c.area, c.city].filter(Boolean).join(', ') || 'Dhaka, Bangladesh'}
                              </div>
                              {c.is_nrb && <Badge tone="amber">NRB ({c.nrb_country || 'Abroad'})</Badge>}
                            </td>

                            {/* Real Estate Lead Requirements */}
                            <td>
                              {hasLeadReqs ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                    {c.looking_for && (
                                      <span
                                        style={{
                                          fontSize: 10,
                                          fontWeight: 800,
                                          textTransform: 'uppercase',
                                          padding: '1px 6px',
                                          borderRadius: 4,
                                          background: c.looking_for === 'buy' ? '#ede9fe' : c.looking_for === 'invest' ? '#fef3c7' : '#e0f2fe',
                                          color: c.looking_for === 'buy' ? '#6d28d9' : c.looking_for === 'invest' ? '#b45309' : '#0369a1',
                                        }}
                                      >
                                        Looking to {c.looking_for}
                                      </span>
                                    )}
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        padding: '1px 6px',
                                        borderRadius: 4,
                                        background: '#f1f5f9',
                                        color: '#334155',
                                        textTransform: 'capitalize',
                                      }}
                                    >
                                      {leadStageLabel}
                                    </span>
                                  </div>

                                  {c.budget_max && (
                                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#047857' }}>
                                      Budget: {money(c.budget_min || 0)} – {money(c.budget_max)}
                                    </div>
                                  )}

                                  {(areas.length > 0 || types.length > 0) && (
                                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                                      {[types.slice(0, 1).join(''), areas.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openEditContact(c)}
                                  style={{
                                    fontSize: 11,
                                    color: '#0284c7',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                    textDecoration: 'underline',
                                  }}
                                >
                                  + Set Preferences
                                </button>
                              )}
                            </td>

                            {/* Dates & Outreach */}
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                                  Added: <strong style={{ color: 'var(--ink)' }}>{dateFmt(c.createdAt || c.created_at)}</strong>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                                  Updated: <span style={{ color: 'var(--ink)' }}>{dateFmt(c.updatedAt || c.updated_at)}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                  <Clock size={10} color="#64748b" />
                                  <span style={{ fontSize: 10.5, color: c.last_contacted_at ? '#0f172a' : '#94a3b8', fontWeight: c.last_contacted_at ? 650 : 400 }}>
                                    {c.last_contacted_at ? dateFmt(c.last_contacted_at) : 'Never touched'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => logTouchContact(c.id)}
                                    title="Log outreach / touch for today"
                                    style={{
                                      background: '#f1f5f9',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: 4,
                                      padding: '1px 5px',
                                      fontSize: 10,
                                      cursor: 'pointer',
                                      color: '#0f172a',
                                      fontWeight: 650,
                                      marginLeft: 2,
                                    }}
                                  >
                                    Log Call
                                  </button>
                                </div>
                              </div>
                            </td>

                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => openEditContact(c)}
                                  style={{ fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 7px' }}
                                  title="Edit Contact & Lead Preferences"
                                >
                                  <Pencil size={11} /> Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => openLeadProfile(c)}
                                  style={{ fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 3, color: '#0284c7', padding: '3px 7px' }}
                                  title="Real Estate Lead Profile"
                                >
                                  <Compass size={11} /> Lead
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => openClientDashboard(null, c.id)}
                                  style={{ fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 7px' }}
                                  title="Open Dossier / Profile"
                                >
                                  <ExternalLink size={11} /> Dossier
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
         TAB 2: LEADS (WEBSITE ENQUIRIES + SELLER LEADS)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'leads' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Subfilter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(isRentalScope
                ? [
                    { key: 'all', label: 'All Rental Enquiries & Applicants' },
                    { key: 'tenant', label: 'Tenant Leads' },
                  ]
                : isInteriorScope
                ? [
                    { key: 'all', label: 'All Design Leads & Inquiries' },
                  ]
                : isOpsServiceScope
                ? [
                    { key: 'all', label: 'All Service Inquiries' },
                  ]
                : scope === 'buy'
                ? [{ key: 'buyer', label: 'Buyer Enquiries (Website)' }]
                : [
                    { key: 'all', label: 'All Leads' },
                    { key: 'buyer', label: 'Buyer Enquiries (Website)' },
                    { key: 'vendor', label: 'Vendor / Seller Leads' },
                  ]).map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setLeadTypeFilter(f.key)}
                  style={{
                    fontSize: 12,
                    fontWeight: leadTypeFilter === f.key ? 700 : 550,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--line, #e2e8f0)',
                    background: leadTypeFilter === f.key ? 'var(--navy, #003768)' : '#ffffff',
                    color: leadTypeFilter === f.key ? '#ffffff' : 'var(--ink)',
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}

              <span style={{ borderRight: '1px solid var(--line, #e2e8f0)', margin: '0 4px' }} />

              {[
                { key: 'all', label: 'All Stages' },
                { key: 'new', label: 'New' },
                { key: 'contacted', label: 'Contacted' },
                { key: 'viewing_scheduled', label: 'Viewing / Meeting' },
                { key: 'converted', label: 'Converted' },
              ].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setLeadStageFilter(s.key)}
                  style={{
                    fontSize: 11.5,
                    fontWeight: leadStageFilter === s.key ? 700 : 500,
                    padding: '3px 8px',
                    borderRadius: 5,
                    border: '1px solid var(--line, #e2e8f0)',
                    background: leadStageFilter === s.key ? 'var(--surface-3, #e2e8f0)' : '#ffffff',
                    color: 'var(--ink)',
                    cursor: 'pointer',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Showing {filteredLeads.length} leads
            </div>
          </div>

          {/* Leads Table / Cards */}
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
          ) : filteredLeads.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', borderRadius: 12 }}>
              <Sparkles size={32} style={{ color: 'var(--muted)', margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>No leads matching criteria</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                {isRentalScope
                  ? 'All rental website enquiries and tenant applications will stream here.'
                  : isInteriorScope
                  ? 'All interior design consultation requests, renovation inquiries and fit-out leads will stream here.'
                  : isOpsServiceScope
                  ? 'All inbound service requests and operations leads will stream here.'
                  : 'All website enquiries and seller requests will stream here.'}
              </div>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden', borderRadius: 12 }}>
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 230 }}>Lead Name &amp; Contact</th>
                      <th>Intent / Classification</th>
                      <th>Target Property / Need</th>
                      <th>Budget / Asking Price</th>
                      <th>Source &amp; Attribution</th>
                      <th>Stage</th>
                      <th style={{ textAlign: 'right', width: 220 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((l) => {
                      const isVendor = l.lead_type === 'vendor';
                      const isConverted = l.stage === 'converted';

                      return (
                        <tr key={l.id}>
                          <td>
                            <div style={{ fontWeight: 750, color: 'var(--ink)', fontSize: 13 }}>
                              {l.name}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                              {l.phone && (
                                <a
                                  href={`tel:${l.phone}`}
                                  style={{ fontSize: 11.5, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  <Phone size={11} color="var(--muted)" /> {l.phone}
                                </a>
                              )}
                              {l.email && (
                                <a
                                  href={`mailto:${l.email}`}
                                  style={{ fontSize: 11, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  <Mail size={11} color="var(--muted)" /> {l.email}
                                </a>
                              )}
                            </div>
                          </td>

                          <td>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 750,
                                color: isRentalScope || l.isRentalEnquiry || l.isApplication ? '#0369a1' : isInteriorScope ? '#7e22ce' : isOpsServiceScope ? '#0369a1' : isVendor ? '#b45309' : '#0369a1',
                                background: isRentalScope || l.isRentalEnquiry || l.isApplication ? '#e0f2fe' : isInteriorScope ? '#f3e8ff' : isOpsServiceScope ? '#e0f2fe' : isVendor ? '#fef3c7' : '#e0f2fe',
                                border: `1px solid ${isRentalScope || l.isRentalEnquiry || l.isApplication ? '#bae6fd' : isInteriorScope ? '#e9d5ff' : isOpsServiceScope ? '#bae6fd' : isVendor ? '#fde68a' : '#bae6fd'}`,
                                padding: '2px 7px',
                                borderRadius: 5,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              {isRentalScope || l.isRentalEnquiry || l.isApplication ? <Home size={11} /> : isInteriorScope ? <Sparkles size={11} /> : isVendor ? <Building2 size={11} /> : <Briefcase size={11} />}
                              {l.intent_label || (isVendor ? 'Vendor / Seller Lead' : 'Buyer Lead')}
                            </span>
                            {l.code && (
                              <div style={{ marginTop: 3 }}>
                                <span className="code-chip" style={{ fontSize: 10 }}>{l.code}</span>
                              </div>
                            )}
                          </td>

                          <td>
                            {l.property_title ? (
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 650, color: 'var(--ink)' }}>
                                  {l.property_title}
                                </div>
                                <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                                  {l.property_code && `${l.property_code} · `}{l.property_area || 'Dhaka'}
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                                {l.notes || 'General residential interest'}
                              </span>
                            )}
                          </td>

                          <td>
                            {l.estimated_value ? (
                              <span style={{ fontSize: 12.5, fontWeight: 750, color: 'var(--ink)' }}>
                                {money(l.estimated_value)}
                              </span>
                            ) : (
                              <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>—</span>
                            )}
                          </td>

                          <td>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                              {l.source}
                            </div>
                            {l.utm_source && (
                              <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                                utm: {l.utm_source}
                              </div>
                            )}
                          </td>

                          <td>
                            <StatusBadge
                              status={l.stage === 'converted' ? 'approved' : l.stage === 'rejected' ? 'rejected' : 'pending'}
                            >
                              {l.stage}
                            </StatusBadge>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                              {l.phone && (
                                <a
                                  href={`https://wa.me/${l.phone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="pm-btn btn-sm"
                                  style={{
                                    fontSize: 11.5,
                                    padding: '4px 8px',
                                    color: '#15803d',
                                    borderColor: '#86efac',
                                    background: '#f0fdf4',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                  title="Chat on WhatsApp"
                                >
                                  <MessageSquare size={12} /> WhatsApp
                                </a>
                              )}

                              {isRentalScope ? (
                                <button
                                  type="button"
                                  className="pm-btn primary btn-sm"
                                  onClick={() => navigate('/property-management/rentals')}
                                  style={{
                                    fontSize: 11.5,
                                    background: '#0284c7',
                                    color: '#ffffff',
                                    padding: '4px 9px',
                                    borderRadius: 6,
                                  }}
                                  title="Manage in Property Management"
                                >
                                  Manage &rarr;
                                </button>
                              ) : isInteriorScope ? (
                                <button
                                  type="button"
                                  className="pm-btn primary btn-sm"
                                  onClick={() => {
                                    if (l.contact_raw) openLeadProfile(l.contact_raw);
                                    else navigate('/residential-interior-design');
                                  }}
                                  style={{
                                    fontSize: 11.5,
                                    background: '#9333ea',
                                    color: '#ffffff',
                                    padding: '4px 9px',
                                    borderRadius: 6,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                  title="View Design Consultation & Lead Profile"
                                >
                                  <Eye size={12} /> View Lead
                                </button>
                              ) : isOpsServiceScope ? (
                                <button
                                  type="button"
                                  className="pm-btn primary btn-sm"
                                  onClick={() => {
                                    if (l.contact_raw) openLeadProfile(l.contact_raw);
                                    else navigate(svcBase());
                                  }}
                                  style={{
                                    fontSize: 11.5,
                                    background: '#0284c7',
                                    color: '#ffffff',
                                    padding: '4px 9px',
                                    borderRadius: 6,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                  title="View Service Lead Profile"
                                >
                                  <Eye size={12} /> View Lead
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="pm-btn btn-sm"
                                    onClick={() => openEditLead(l)}
                                    style={{
                                      fontSize: 11.5,
                                      padding: '4px 8px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                    title="Edit Lead Details"
                                  >
                                    <Pencil size={12} /> Edit
                                  </button>

                                  {!isConverted ? (
                                    <button
                                      type="button"
                                      className="pm-btn primary btn-sm"
                                      onClick={() => {
                                        setConvertModal(l);
                                        setConvertRole(isVendor ? 'seller' : 'buyer');
                                        setConvertSuccess(null);
                                      }}
                                      style={{
                                        fontSize: 11.5,
                                        background: '#0284c7',
                                        color: '#ffffff',
                                        padding: '4px 9px',
                                        borderRadius: 6,
                                      }}
                                    >
                                      <UserCheck size={13} /> Convert Lead
                                    </button>
                                  ) : isSignedLead(l) ? (
                                    <span
                                      className="pm-chip good"
                                      style={{
                                        fontSize: 11,
                                        padding: '3px 8px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                      }}
                                      title="Service agreement already signed"
                                    >
                                      <CheckCircle2 size={11} /> Agreement Signed
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      className="pm-btn btn-sm"
                                      onClick={() => goToAgreement(
                                        l.lead_type === 'vendor' ? 'seller' : 'buyer',
                                        l.contact_id,
                                        l.name,
                                        l.phone,
                                        l.email,
                                        {
                                          budget: l.budget || l.estimated_value || '',
                                          property_id: l.property_id || '',
                                        }
                                      )}
                                      style={{ fontSize: 11.5, padding: '4px 9px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                      title="Sign Service Agreement"
                                    >
                                      <FileSignature size={13} /> Sign {isVendor ? 'Sale' : 'Purchase'}
                                    </button>
                                  )}
                                </>
                              )}

                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => openClientDashboard(l.client_id || l.converted_client_id, l.contact_id)}
                                title="Open Dossier"
                              >
                                <ExternalLink size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
         TAB: LANDLORDS / OWNERS (PROPERTY MANAGEMENT)
         ══════════════════════════════════════════════════════════════════════ */}
      {isRentalScope && activeTab === 'landlords' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Property owners and landlords represented by Seventh Sky Property Management.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Showing {filteredLandlords.length} landlords
              </div>
              <button
                type="button"
                className="pm-btn primary"
                onClick={() => {
                  setContactForm((prev) => ({ ...prev, looking_for: 'sell', contact_list: 'Landlords / Lessors' }));
                  setNewContactDrawer(true);
                }}
                style={{ background: '#d97706', color: '#fff' }}
              >
                <Plus size={14} /> New Landlord
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
          ) : filteredLandlords.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', borderRadius: 12 }}>
              <Building2 size={32} style={{ color: 'var(--muted)', margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>No landlords registered yet</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                Register property owners or convert landlord contacts.
              </div>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden', borderRadius: 12 }}>
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 260 }}>Landlord / Owner Name</th>
                      <th>Communication</th>
                      <th>Client Segment</th>
                      <th>Onboarded</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right', width: 200 }}>Actions &amp; Dossier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLandlords.map((l) => {
                      const contact = l.Contact || {};
                      return (
                        <tr key={l.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 8,
                                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                  color: '#b45309',
                                  fontWeight: 800,
                                  fontSize: 12,
                                  display: 'grid',
                                  placeItems: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {getInitials(contact.full_name)}
                              </div>
                              <div>
                                <div
                                  style={{ fontWeight: 750, color: 'var(--ink)', cursor: 'pointer' }}
                                  onClick={() => openClientDashboard(l.id, l.contact_id)}
                                  title="Click to view owner profile"
                                >
                                  {contact.full_name || 'Landlord Profile'}
                                </div>
                                <span className="code-chip" style={{ fontSize: 10 }}>
                                  {l.client_code}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {contact.primary_phone && (
                                <a
                                  href={`tel:${contact.primary_phone}`}
                                  style={{ fontSize: 11.5, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  <Phone size={11} color="var(--muted)" /> {contact.primary_phone}
                                </a>
                              )}
                              {contact.email && (
                                <a
                                  href={`mailto:${contact.email}`}
                                  style={{ fontSize: 11, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  <Mail size={11} color="var(--muted)" /> {contact.email}
                                </a>
                              )}
                            </div>
                          </td>
                          <td>
                            <Badge variant="outline">{l.client_segment || 'standard'}</Badge>
                          </td>
                          <td>
                            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                              {dateFmt(l.onboarded_at || l.createdAt)}
                            </span>
                          </td>
                          <td>
                            <StatusBadge status={l.status === 'active' ? 'active' : 'inactive'}>
                              {l.status}
                            </StatusBadge>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                              {contact.primary_phone && (
                                <a
                                  href={`https://wa.me/${contact.primary_phone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="pm-btn btn-sm"
                                  style={{ fontSize: 11.5, padding: '4px 8px', color: '#15803d', borderColor: '#86efac', background: '#f0fdf4' }}
                                  title="Chat on WhatsApp"
                                >
                                  <MessageSquare size={12} /> WhatsApp
                                </a>
                              )}
                              <button
                                type="button"
                                className="pm-btn btn-sm"
                                onClick={() => navigate(`/property-management/statements?owner_id=${l.id}`)}
                                style={{ fontSize: 11.5, padding: '4px 8px' }}
                                title="View Owner Statements"
                              >
                                Statements &rarr;
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => openClientDashboard(l.id, l.contact_id)}
                                title="Open Owner Dossier"
                              >
                                <ExternalLink size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
         TAB: ACTIVE TENANCIES (PROPERTY MANAGEMENT)
         ══════════════════════════════════════════════════════════════════════ */}
      {isRentalScope && activeTab === 'tenancies' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Active and executed residential rental tenancies managed by Seventh Sky.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Showing {filteredTenancies.length} tenancies
              </div>
              <button
                type="button"
                className="pm-btn primary"
                onClick={() => navigate('/property-management/tenancy-agreements')}
                style={{ background: '#0284c7', color: '#fff' }}
              >
                <Plus size={14} /> New Tenancy Agreement
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
          ) : filteredTenancies.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', borderRadius: 12 }}>
              <Home size={32} style={{ color: 'var(--muted)', margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>No tenancies registered yet</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                Approved applications convert into active managed tenancies.
              </div>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden', borderRadius: 12 }}>
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 220 }}>Tenancy Code &amp; Property</th>
                      <th>Tenant Name &amp; Contact</th>
                      <th>Landlord / Owner</th>
                      <th>Monthly Rent &amp; Due</th>
                      <th>Lease Term</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right', width: 200 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTenancies.map((tn) => {
                      const prop = tn.Property || {};
                      const tenant = tn.tenant || {};
                      const owner = tn.owner || {};

                      return (
                        <tr key={tn.id}>
                          <td>
                            <div style={{ fontWeight: 750, color: 'var(--ink)', fontSize: 13 }}>
                              {prop.title || 'Managed Unit'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <span className="code-chip" style={{ fontSize: 10 }}>{tn.tenancy_code}</span>
                              {prop.property_code && (
                                <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{prop.property_code}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 12.5 }}>
                              {tenant.full_name || 'Tenant'}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
                              {tenant.primary_phone && (
                                <a
                                  href={`tel:${tenant.primary_phone}`}
                                  style={{ fontSize: 11, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  <Phone size={10} color="var(--muted)" /> {tenant.primary_phone}
                                </a>
                              )}
                              {tenant.email && (
                                <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{tenant.email}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                              {owner.full_name || 'Owner'}
                            </div>
                            {owner.primary_phone && (
                              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{owner.primary_phone}</div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--ink)' }}>
                              {money(tn.monthly_rent)}/mo
                            </div>
                            <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                              Due day {tn.rent_due_day || 5} of month
                            </div>
                          </td>
                          <td>
                            <div style={{ fontSize: 12, color: 'var(--ink)' }}>
                              {dateFmt(tn.lease_start)} &rarr; {dateFmt(tn.lease_end)}
                            </div>
                            <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                              {tn.minimum_lease_period_months ? `${tn.minimum_lease_period_months} mos min` : 'Standard'}
                            </div>
                          </td>
                          <td>
                            <StatusBadge status={tn.status === 'active' ? 'active' : 'inactive'}>
                              {tn.status}
                            </StatusBadge>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                              {tenant.primary_phone && (
                                <a
                                  href={`https://wa.me/${tenant.primary_phone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="pm-btn btn-sm"
                                  style={{ fontSize: 11.5, padding: '4px 8px', color: '#15803d', borderColor: '#86efac', background: '#f0fdf4' }}
                                  title="Chat with Tenant"
                                >
                                  <MessageSquare size={12} /> WhatsApp
                                </a>
                              )}
                              <button
                                type="button"
                                className="pm-btn btn-sm"
                                onClick={() => navigate('/property-management/rentals')}
                                style={{ fontSize: 11.5, padding: '4px 8px' }}
                                title="View Property & Tenancy"
                              >
                                Details &rarr;
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
         TAB: CLIENTS (INTERIOR DESIGN / OPERATIONS CONSOLE)
         ══════════════════════════════════════════════════════════════════════ */}
      {(isInteriorScope || isOpsServiceScope) && activeTab === 'clients' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {isInteriorScope
                ? 'Onboarded residential interior design clients, project briefs and design service agreements.'
                : 'Onboarded operations clients and service agreements.'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Showing {filteredInteriorClients.length} clients
              </div>
              <button
                type="button"
                className="pm-btn primary"
                onClick={() => {
                  setContactForm((prev) => ({
                    ...prev,
                    looking_for: isInteriorScope ? 'interior' : 'service',
                    contact_list: isInteriorScope ? 'Interior Design Leads' : 'Service Leads',
                  }));
                  setNewContactDrawer(true);
                }}
                style={{ background: isInteriorScope ? '#9333ea' : '#0284c7', color: '#fff' }}
              >
                <Plus size={14} /> {isInteriorScope ? 'New Design Client' : 'New Client'}
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
          ) : filteredInteriorClients.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', borderRadius: 12 }}>
              <Building2 size={32} style={{ color: 'var(--muted)', margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>No clients found</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                {isInteriorScope ? 'Interior design clients will show here once onboarded or converted.' : 'Clients will appear here once registered.'}
              </div>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden', borderRadius: 12 }}>
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 260 }}>Client Name &amp; Code</th>
                      <th>Space / Property</th>
                      <th>Service Location</th>
                      <th>Workflow Stage</th>
                      <th>Agreement Status</th>
                      <th style={{ textAlign: 'right', width: 200 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInteriorClients.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 8,
                                background: isInteriorScope ? 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)' : 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
                                color: isInteriorScope ? '#7e22ce' : '#0369a1',
                                fontWeight: 800,
                                fontSize: 12,
                                display: 'grid',
                                placeItems: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {getInitials(c.name)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 750, color: 'var(--ink)', fontSize: 13 }}>
                                {c.name}
                              </div>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                                {c.code && <span className="code-chip" style={{ fontSize: 10 }}>{c.code}</span>}
                                {c.client_type && <span style={{ fontSize: 11, color: 'var(--muted)' }}>• {c.client_type}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                            {c.property_type || 'Residential Space'}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {c.requested_service || 'Full Interior Design'}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontSize: 12, color: 'var(--ink)' }}>
                            {c.service_address || 'Dhaka'}
                          </div>
                          {c.district && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.district}</div>}
                        </td>

                        <td>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: '#f1f5f9',
                              color: '#334155',
                              border: '1px solid #e2e8f0',
                              display: 'inline-block',
                            }}
                          >
                            {c.workflow_stage || c.current_status || 'Active'}
                          </span>
                        </td>

                        <td>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 6,
                              background: c.agreement_status === 'Signed' ? '#f0fdf4' : '#fef3c7',
                              color: c.agreement_status === 'Signed' ? '#15803d' : '#b45309',
                              border: `1px solid ${c.agreement_status === 'Signed' ? '#bbf7d0' : '#fde68a'}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            {c.agreement_status === 'Signed' ? <Check size={11} /> : <Clock size={11} />}
                            {c.agreement_status || 'Draft'}
                          </span>
                          {c.agreement_code && (
                            <div style={{ marginTop: 2 }}>
                              <span className="code-chip" style={{ fontSize: 9.5 }}>{c.agreement_code}</span>
                            </div>
                          )}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                            {c.mobile && (
                              <a
                                href={`tel:${c.mobile}`}
                                className="pm-btn btn-sm"
                                style={{ padding: '4px 8px' }}
                                title="Call Client"
                              >
                                <Phone size={12} />
                              </a>
                            )}
                            <button
                              type="button"
                              className="pm-btn primary btn-sm"
                              onClick={() => navigate(`${svcBase()}/clients?search=${encodeURIComponent(c.code || c.name)}`)}
                              style={{ background: isInteriorScope ? '#9333ea' : '#0284c7', color: '#fff', fontSize: 11.5 }}
                            >
                              Client Profile &rarr;
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
         TAB: ACTIVE PROJECTS (INTERIOR DESIGN / OPERATIONS CONSOLE)
         ══════════════════════════════════════════════════════════════════════ */}
      {(isInteriorScope || isOpsServiceScope) && activeTab === 'projects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {isInteriorScope
                ? 'Active interior design & renovation projects being executed by Seventh Sky Property Care.'
                : 'Active operations projects and service delivery.'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Showing {filteredInteriorProjects.length} projects
              </div>
              <button
                type="button"
                className="pm-btn primary"
                onClick={() => navigate(`${svcBase()}/projects`)}
                style={{ background: isInteriorScope ? '#9333ea' : '#0284c7', color: '#fff' }}
              >
                <Plus size={14} /> Open Projects Board
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
          ) : filteredInteriorProjects.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', borderRadius: 12 }}>
              <Briefcase size={32} style={{ color: 'var(--muted)', margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>No projects found</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                {isInteriorScope ? 'Interior design projects will appear here once initiated.' : 'Projects will appear here.'}
              </div>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden', borderRadius: 12 }}>
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 280 }}>Project &amp; Code</th>
                      <th>Client</th>
                      <th>Stage &amp; Status</th>
                      <th>Contract Value</th>
                      <th>Start Date</th>
                      <th style={{ textAlign: 'right', width: 180 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInteriorProjects.map((p) => {
                      const contractVal = p.financials?.contract_value != null ? p.financials.contract_value : (p.contract_value || 0);
                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ fontWeight: 750, color: 'var(--ink)', fontSize: 13 }}>
                              {p.name || `Project ${p.code}`}
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                              <span className="code-chip" style={{ fontSize: 10 }}>{p.code}</span>
                              {p.project_type && <span style={{ fontSize: 11, color: 'var(--muted)' }}>• {p.project_type}</span>}
                            </div>
                          </td>

                          <td>
                            <div style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--ink)' }}>
                              {p.client_name || 'Client'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                              {p.client_phone || p.client_email || '—'}
                            </div>
                          </td>

                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: 6,
                                  background: isInteriorScope ? '#f3e8ff' : '#e0f2fe',
                                  color: isInteriorScope ? '#7e22ce' : '#0369a1',
                                  border: `1px solid ${isInteriorScope ? '#e9d5ff' : '#bae6fd'}`,
                                }}
                              >
                                {p.stage || 'In Progress'}
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                                ({p.status || 'Open'})
                              </span>
                            </div>
                          </td>

                          <td>
                            <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--ink)' }}>
                              {contractVal > 0 ? money(contractVal) : '—'}
                            </div>
                            {p.financials?.receivable > 0 && (
                              <div style={{ fontSize: 10.5, color: '#dc2626' }}>
                                Due: {money(p.financials.receivable)}
                              </div>
                            )}
                          </td>

                          <td>
                            <div style={{ fontSize: 12, color: 'var(--ink)' }}>
                              {dateFmt(p.start_date || p.createdAt)}
                            </div>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="pm-btn primary btn-sm"
                              onClick={() => navigate(`${svcBase()}/projects`)}
                              style={{ background: isInteriorScope ? '#9333ea' : '#0284c7', color: '#fff', fontSize: 11.5 }}
                            >
                              View Project &rarr;
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
         TAB 3: VENDORS (PROPERTY SELLERS)
         ══════════════════════════════════════════════════════════════════════ */}
      {!isRentalScope && !isInteriorScope && !isOpsServiceScope && activeTab === 'vendors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Property sellers verified and ready to execute residential <strong>Sale Agreements</strong>.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Showing {filteredVendors.length} vendors
              </div>
              <button type="button" className="pm-btn primary" onClick={() => setNewPartyDrawer('vendor')} style={{ background: '#d97706', color: '#fff' }}>
                <Plus size={14} /> New Seller
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
          ) : filteredVendors.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', borderRadius: 12 }}>
              <Building2 size={32} style={{ color: 'var(--muted)', margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>No vendors registered yet</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                Convert seller leads or register clients with the seller role.
              </div>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden', borderRadius: 12 }}>
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 260 }}>Vendor Name</th>
                      <th>Communication</th>
                      <th>Client Segment</th>
                      <th>Onboarded</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right', width: 230 }}>Agreements &amp; Dossier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVendors.map((v) => {
                      const contact = v.Contact || {};
                      return (
                        <tr key={v.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 8,
                                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                                  color: '#b45309',
                                  fontWeight: 800,
                                  fontSize: 12,
                                  display: 'grid',
                                  placeItems: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {getInitials(contact.full_name)}
                              </div>
                              <div>
                                <div
                                  style={{ fontWeight: 750, color: 'var(--ink)', cursor: 'pointer' }}
                                  onClick={() => openClientDashboard(v.id, v.contact_id)}
                                  title="Click to view full vendor profile"
                                >
                                  {contact.full_name || 'Vendor Profile'}
                                </div>
                                <span className="code-chip" style={{ fontSize: 10 }}>
                                  {v.client_code}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {contact.primary_phone && (
                                <a
                                  href={`tel:${contact.primary_phone}`}
                                  style={{ fontSize: 12, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  <Phone size={11} color="var(--muted)" /> {contact.primary_phone}
                                </a>
                              )}
                              {contact.email && (
                                <a
                                  href={`mailto:${contact.email}`}
                                  style={{ fontSize: 11.5, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  <Mail size={11} color="var(--muted)" /> {contact.email}
                                </a>
                              )}
                            </div>
                          </td>

                          <td>
                            <Badge tone={v.client_segment === 'vip' ? 'green' : 'amber'}>
                              {v.client_segment || 'standard'}
                            </Badge>
                          </td>

                          <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                            {dateFmt(v.onboarded_at || v.created_at)}
                          </td>

                          <td>
                            <StatusBadge status={v.status === 'active' ? 'approved' : 'pending'}>
                              {v.status}
                            </StatusBadge>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                              {isSignedVendor(v) ? (
                                <span
                                  className="pm-chip good"
                                  style={{
                                    fontSize: 11.5,
                                    padding: '4px 9px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                  }}
                                  title="Vendor Sale Agreement signed and active"
                                >
                                  <CheckCircle2 size={12} /> Agreement Signed
                                </span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="pm-btn btn-sm"
                                    onClick={() => openEditParty('vendor', v)}
                                    style={{
                                      fontSize: 11.5,
                                      padding: '4px 8px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                    title="Edit Vendor Details"
                                  >
                                    <Pencil size={12} /> Edit
                                  </button>

                                  <button
                                    type="button"
                                    className="pm-btn primary btn-sm"
                                    onClick={() => goToAgreement(
                                      'seller',
                                      v.contact_id,
                                      contact.full_name,
                                      contact.primary_phone,
                                      contact.email,
                                      {
                                        nid: contact.national_id || contact.passport_no || '',
                                        address: contact.address_line1 || contact.area || '',
                                        client_id: v.id,
                                      }
                                    )}
                                    style={{
                                      fontSize: 11.5,
                                      background: 'var(--navy, #003768)',
                                      color: '#ffffff',
                                      padding: '4px 9px',
                                      borderRadius: 6,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                    title="Prepare / Sign Sale Agreement"
                                  >
                                    <FileSignature size={13} /> Sign Sale Agreement
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => openClientDashboard(v.id, v.contact_id)}
                                title="Open Client Profile"
                              >
                                <ExternalLink size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
         TAB 4: BUYERS (PROPERTY BUYERS)
         ══════════════════════════════════════════════════════════════════════ */}
      {!isRentalScope && !isInteriorScope && !isOpsServiceScope && activeTab === 'buyers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Qualified residential buyers ready to execute <strong>Purchase Agreements</strong> and review listings.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Showing {filteredBuyers.length} buyers
              </div>
              <button type="button" className="pm-btn primary" onClick={() => setNewPartyDrawer('buyer')} style={{ background: '#4f46e5', color: '#fff' }}>
                <Plus size={14} /> New Buyer
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>
          ) : filteredBuyers.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', borderRadius: 12 }}>
              <Briefcase size={32} style={{ color: 'var(--muted)', margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>No buyers registered yet</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                Convert website buyer enquiries or register buyer client profiles.
              </div>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden', borderRadius: 12 }}>
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 260 }}>Buyer Name</th>
                      <th>Communication</th>
                      <th>Client Segment</th>
                      <th>Onboarded</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right', width: 240 }}>Agreements &amp; Dossier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBuyers.map((b) => {
                      const contact = b.Contact || {};
                      return (
                        <tr key={b.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 8,
                                  background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                                  color: '#4338ca',
                                  fontWeight: 800,
                                  fontSize: 12,
                                  display: 'grid',
                                  placeItems: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {getInitials(contact.full_name)}
                              </div>
                              <div>
                                <div
                                  style={{ fontWeight: 750, color: 'var(--ink)', cursor: 'pointer' }}
                                  onClick={() => openClientDashboard(b.id, b.contact_id)}
                                  title="Click to view full buyer profile"
                                >
                                  {contact.full_name || 'Buyer Profile'}
                                </div>
                                <span className="code-chip" style={{ fontSize: 10 }}>
                                  {b.client_code}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {contact.primary_phone && (
                                <a
                                  href={`tel:${contact.primary_phone}`}
                                  style={{ fontSize: 12, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  <Phone size={11} color="var(--muted)" /> {contact.primary_phone}
                                </a>
                              )}
                              {contact.email && (
                                <a
                                  href={`mailto:${contact.email}`}
                                  style={{ fontSize: 11.5, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  <Mail size={11} color="var(--muted)" /> {contact.email}
                                </a>
                              )}
                            </div>
                          </td>

                          <td>
                            <Badge tone={b.client_segment === 'vip' ? 'green' : 'sky'}>
                              {b.client_segment || 'standard'}
                            </Badge>
                          </td>

                          <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                            {dateFmt(b.onboarded_at || b.created_at)}
                          </td>

                          <td>
                            <StatusBadge status={b.status === 'active' ? 'approved' : 'pending'}>
                              {b.status}
                            </StatusBadge>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                              {isSignedBuyer(b) ? (
                                <span
                                  className="pm-chip good"
                                  style={{
                                    fontSize: 11.5,
                                    padding: '4px 9px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                  }}
                                  title="Buyer Purchase Agreement signed and active"
                                >
                                  <CheckCircle2 size={12} /> Agreement Signed
                                </span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="pm-btn btn-sm"
                                    onClick={() => openEditParty('buyer', b)}
                                    style={{
                                      fontSize: 11.5,
                                      padding: '4px 8px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                    title="Edit Buyer Details"
                                  >
                                    <Pencil size={12} /> Edit
                                  </button>

                                  <button
                                    type="button"
                                    className="pm-btn primary btn-sm"
                                    onClick={() => goToAgreement(
                                      'buyer',
                                      b.contact_id,
                                      contact.full_name,
                                      contact.primary_phone,
                                      contact.email,
                                      {
                                        nid: contact.national_id || contact.passport_no || '',
                                        budget: b.budget || '',
                                        client_id: b.id,
                                      }
                                    )}
                                    style={{
                                      fontSize: 11.5,
                                      background: '#4f46e5',
                                      color: '#ffffff',
                                      padding: '4px 9px',
                                      borderRadius: 6,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                    title="Prepare / Sign Purchase Agreement"
                                  >
                                    <FileSignature size={13} /> Sign Purchase Agreement
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => openClientDashboard(b.id, b.contact_id)}
                                title="Open Client Profile"
                              >
                                <ExternalLink size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
         TAB 5: AUTOMATIONS (ROUTING RULES & SEQUENCES)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'automations' && (
        <AutomationsSection staff={staff} />
      )}

      {/* ── Convert Lead Modal ────────────────────────────────────────────── */}
      {convertModal && (
        <Drawer
          open={Boolean(convertModal)}
          onClose={() => setConvertModal(null)}
          title={`Convert Lead · ${convertModal.name}`}
          width={520}
        >
          {!convertSuccess ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Promote this lead into a permanent client profile. Converted contacts can immediately execute sales or purchase service agreements.
              </div>

              {/* Lead Summary card */}
              <div
                style={{
                  padding: '12px 14px',
                  background: 'var(--surface-2, #f8fafc)',
                  borderRadius: 10,
                  border: '1px solid var(--line, #e2e8f0)',
                  fontSize: 12.5,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div><strong>Name:</strong> {convertModal.name}</div>
                {convertModal.phone && <div><strong>Phone:</strong> {convertModal.phone}</div>}
                {convertModal.email && <div><strong>Email:</strong> {convertModal.email}</div>}
                {convertModal.property_title && <div><strong>Target Property:</strong> {convertModal.property_title}</div>}
                {convertModal.estimated_value && <div><strong>Value / Budget:</strong> {money(convertModal.estimated_value)}</div>}
              </div>

              {/* Step 1: Target Role Selector */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--ink)' }}>
                  Select Client Target Role:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div
                    onClick={() => setConvertRole('seller')}
                    style={{
                      border: convertRole === 'seller' ? '2px solid #d97706' : '1px solid var(--line, #e2e8f0)',
                      background: convertRole === 'seller' ? '#fffbeb' : '#ffffff',
                      borderRadius: 10,
                      padding: 14,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Building2 size={18} color="#b45309" />
                      <strong style={{ fontSize: 13.5, color: '#b45309' }}>Vendor (Seller)</strong>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                      Onboards this client as a property seller. Ready to sign a <strong>Sale Agreement</strong>.
                    </div>
                  </div>

                  <div
                    onClick={() => setConvertRole('buyer')}
                    style={{
                      border: convertRole === 'buyer' ? '2px solid #0284c7' : '1px solid var(--line, #e2e8f0)',
                      background: convertRole === 'buyer' ? '#f0f9ff' : '#ffffff',
                      borderRadius: 10,
                      padding: 14,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Briefcase size={18} color="#0369a1" />
                      <strong style={{ fontSize: 13.5, color: '#0369a1' }}>Buyer Client</strong>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                      Onboards this client as an active buyer. Ready to sign a <strong>Purchase Agreement</strong>.
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <Button variant="ghost" onClick={() => setConvertModal(null)}>
                  Cancel
                </Button>
                <Button
                  className="btn-primary"
                  onClick={executeConversion}
                  disabled={converting}
                  style={{ background: convertRole === 'seller' ? '#d97706' : '#0284c7', color: '#ffffff' }}
                >
                  {converting ? 'Converting…' : `Convert to ${convertRole === 'seller' ? 'Vendor' : 'Buyer'}`}
                </Button>
              </div>
            </div>
          ) : (
            /* Conversion Success Cockpit */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '16px 8px' }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  background: '#dcfce7',
                  color: '#16a34a',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto',
                }}
              >
                <CheckCircle2 size={28} />
              </div>

              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: 18, color: 'var(--ink)' }}>
                  Conversion Complete!
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
                  <strong>{convertSuccess.name}</strong> is now registered as a residential{' '}
                  <strong>{convertSuccess.role === 'seller' ? 'Vendor' : 'Buyer'}</strong> with code{' '}
                  <span className="code-chip">{convertSuccess.clientCode || 'SSPC-CL'}</span>.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                <Button
                  className="btn-primary"
                  onClick={() => {
                    const role = convertSuccess.role;
                    const cId = convertSuccess.contactId;
                    const name = convertSuccess.name;
                    const phone = convertSuccess.phone;
                    const email = convertSuccess.email;
                    const extra = {
                      client_id: convertSuccess.clientId,
                      budget: convertSuccess.budget,
                      property_id: convertSuccess.property_id,
                    };
                    setConvertModal(null);
                    goToAgreement(role, cId, name, phone, email, extra);
                  }}
                  style={{
                    padding: '10px 16px',
                    fontSize: 13,
                    background: convertSuccess.role === 'seller' ? '#003768' : '#4f46e5',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <FileSignature size={16} /> Sign {convertSuccess.role === 'seller' ? 'Sale Agreement' : 'Purchase Agreement'} Now
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => {
                    setConvertModal(null);
                    openClientDashboard(convertSuccess.clientId, convertSuccess.contactId);
                  }}
                  style={{ fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <ExternalLink size={14} /> View Client Profile &amp; Dossier
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => setConvertModal(null)}
                  style={{ color: 'var(--muted)', fontSize: 12 }}
                >
                  Done, stay on Contacts
                </Button>
              </div>
            </div>
          )}
        </Drawer>
      )}

      {/* ── + New Lead Drawer ─────────────────────────────────────────────── */}
      {newLeadDrawer && (
        <Drawer
          open={newLeadDrawer}
          onClose={() => setNewLeadDrawer(false)}
          title="Create New Sales Lead"
          width={480}
        >
          <form onSubmit={submitNewLead} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Lead Type / Classification *">
              <Select
                value={leadForm.lead_type}
                onChange={(e) => setLeadForm({ ...leadForm, lead_type: e.target.value })}
              >
                <option value="buyer">Buyer Lead (Looking to purchase property)</option>
                <option value="vendor">Vendor / Seller Lead (Looking to sell property)</option>
              </Select>
            </Field>

            <Field label="Lead Name *" hint="Contact full name or company">
              <Input
                value={leadForm.name}
                onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                placeholder="e.g. Tanvir Hasan"
                required
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Phone">
                <Input
                  value={leadForm.phone}
                  onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                  placeholder="017xxxxxxxx"
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={leadForm.email}
                  onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                  placeholder="name@domain.com"
                />
              </Field>
            </div>

            <Field label="Target / Interested Property (Optional)">
              <Select
                value={leadForm.property_id}
                onChange={(e) => setLeadForm({ ...leadForm, property_id: e.target.value })}
              >
                <option value="">No property linked</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.property_code ? `${p.property_code} · ` : ''}{p.title}
                  </option>
                ))}
              </Select>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Budget / Expected Price">
                <Input
                  type="number"
                  value={leadForm.estimated_value}
                  onChange={(e) => setLeadForm({ ...leadForm, estimated_value: e.target.value })}
                  placeholder="e.g. 15000000"
                />
              </Field>

              <Field label="Source">
                <Select
                  value={leadForm.source}
                  onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}
                >
                  <option value="Website Enquiry">Website Enquiry</option>
                  <option value="Step Form">Step Form</option>
                  <option value="Phone Call">Phone Call</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Referral">Referral</option>
                </Select>
              </Field>
            </div>

            <Field label="Assign To Officer">
              <Select
                value={leadForm.assigned_to}
                onChange={(e) => setLeadForm({ ...leadForm, assigned_to: e.target.value })}
              >
                <option value="">Assign to Me</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Requirement &amp; Action Notes">
              <Textarea
                rows={3}
                value={leadForm.notes}
                onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                placeholder="Specific property dimensions, preferred location, seller timeline, notes..."
              />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <Button type="button" variant="ghost" onClick={() => setNewLeadDrawer(false)}>
                Cancel
              </Button>
              <Button type="submit" className="btn-primary">
                Create Lead
              </Button>
            </div>
          </form>
        </Drawer>
      )}

      {/* ── New Buyer / New Seller (full KYC) Drawer ──────────────────────── */}
      {newPartyDrawer && (
        <NewPartyKycDrawer
          role={newPartyDrawer}
          properties={properties}
          onClose={() => setNewPartyDrawer(null)}
          onCreated={loadAll}
          onGoToAgreement={goToAgreement}
        />
      )}

      {/* ── + New Contact Drawer ──────────────────────────────────────────── */}
      {newContactDrawer && (
        <Drawer
          open={newContactDrawer}
          onClose={() => setNewContactDrawer(false)}
          title="Create New Contact"
          width={480}
        >
          <form onSubmit={submitNewContact} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Contact Type">
              <Select
                value={contactForm.contact_type}
                onChange={(e) => setContactForm({ ...contactForm, contact_type: e.target.value })}
              >
                <option value="individual">Individual</option>
                <option value="company">Company / Enterprise</option>
              </Select>
            </Field>

            <Field label="Full Name *" hint="Person name or contact person">
              <Input
                value={contactForm.full_name}
                onChange={(e) => setContactForm({ ...contactForm, full_name: e.target.value })}
                placeholder="e.g. Asif Mahmud"
                required
              />
            </Field>

            {contactForm.contact_type === 'company' && (
              <Field label="Company Name">
                <Input
                  value={contactForm.company_name}
                  onChange={(e) => setContactForm({ ...contactForm, company_name: e.target.value })}
                  placeholder="e.g. Apex Holdings Ltd"
                />
              </Field>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Contact List Group *" hint="Primary CRM List">
                <Input
                  value={contactForm.contact_list}
                  onChange={(e) => setContactForm({ ...contactForm, contact_list: e.target.value })}
                  placeholder={isRentalScope ? 'e.g. Rental Leads' : isInteriorScope ? 'e.g. Interior Design Leads' : isOpsServiceScope ? 'e.g. Service Leads' : 'e.g. VIP Buyers, General Leads'}
                  required
                />
              </Field>
              <Field label="Property Intent">
                <Select
                  value={contactForm.looking_for || (isRentalScope ? 'rent' : isInteriorScope ? 'interior' : isOpsServiceScope ? 'service' : 'buy')}
                  onChange={(e) => setContactForm({ ...contactForm, looking_for: e.target.value })}
                >
                  {isRentalScope ? (
                    <>
                      <option value="rent">Rent (Tenant Lead)</option>
                      <option value="sell">Rent Out / Lease (Landlord / Owner)</option>
                    </>
                  ) : isInteriorScope ? (
                    <>
                      <option value="interior">Interior Design & Planning</option>
                      <option value="renovation">Full Home Renovation</option>
                      <option value="fitout">Commercial & Office Fit-Out</option>
                      <option value="design">Luxury Villa & Styling</option>
                    </>
                  ) : isOpsServiceScope ? (
                    <>
                      <option value="service">Service Request</option>
                      <option value="amc">AMC & Maintenance</option>
                    </>
                  ) : (
                    <>
                      <option value="buy">Buy (Buyer Lead)</option>
                      <option value="sell">Sell (Property Seller / Vendor)</option>
                      <option value="invest">Invest (Investor)</option>
                    </>
                  )}
                </Select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Phone">
                <Input
                  value={contactForm.primary_phone}
                  onChange={(e) => setContactForm({ ...contactForm, primary_phone: e.target.value })}
                  placeholder="017xxxxxxxx"
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  placeholder="name@domain.com"
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Area">
                <Input
                  value={contactForm.area}
                  onChange={(e) => setContactForm({ ...contactForm, area: e.target.value })}
                  placeholder="e.g. Gulshan-2"
                />
              </Field>
              <Field label="City">
                <Input
                  value={contactForm.city}
                  onChange={(e) => setContactForm({ ...contactForm, city: e.target.value })}
                  placeholder="Dhaka"
                />
              </Field>
            </div>

            <Field label="Notes">
              <Textarea
                rows={3}
                value={contactForm.notes}
                onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                placeholder="Additional notes, relationship context, background..."
              />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <Button type="button" variant="ghost" onClick={() => setNewContactDrawer(false)}>
                Cancel
              </Button>
              <Button type="submit" className="btn-primary">
                Save Contact
              </Button>
            </div>
          </form>
        </Drawer>
      )}

      {/* ── Edit Contact Drawer (Full CRM & Real Estate Details) ────────── */}
      {editContactOpen && editingContact && (
        <Drawer
          open={editContactOpen}
          onClose={() => {
            setEditContactOpen(false);
            setEditingContact(null);
          }}
          title={`Edit Contact: ${editContactForm.full_name || 'Contact Details'}`}
          width={600}
        >
          <form onSubmit={saveContactEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="code-chip">{editingContact.contact_code || 'SSPC-CT'}</span>
                <span style={{ fontWeight: 650, color: '#334155' }}>
                  {editingContact.contact_type === 'company' ? 'Company Account' : 'Individual Profile'}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                Added: {dateFmt(editingContact.createdAt || editingContact.created_at)}
              </div>
            </div>

            {/* General Information */}
            <div style={{ fontWeight: 750, fontSize: 13, color: 'var(--navy, #003768)', borderBottom: '1px solid #e2e8f0', paddingBottom: 4, marginTop: 4 }}>
              1. General &amp; Organization Information
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Contact Type">
                <Select
                  value={editContactForm.contact_type}
                  onChange={(e) => setEditContactForm({ ...editContactForm, contact_type: e.target.value })}
                >
                  <option value="individual">Individual</option>
                  <option value="company">Company / Corporate</option>
                </Select>
              </Field>

              <Field label="Contact List Group *" hint="Primary CRM List">
                <Input
                  value={editContactForm.contact_list}
                  onChange={(e) => setEditContactForm({ ...editContactForm, contact_list: e.target.value })}
                  placeholder="e.g. VIP Buyers, High-Net-Worth Investors"
                  required
                />
              </Field>
            </div>

            <Field label="Full Name *" hint="Display name in CRM">
              <Input
                value={editContactForm.full_name}
                onChange={(e) => setEditContactForm({ ...editContactForm, full_name: e.target.value })}
                placeholder="e.g. Farhan Chowdhury"
                required
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="First Name">
                <Input
                  value={editContactForm.first_name}
                  onChange={(e) => setEditContactForm({ ...editContactForm, first_name: e.target.value })}
                  placeholder="First name"
                />
              </Field>
              <Field label="Last Name">
                <Input
                  value={editContactForm.last_name}
                  onChange={(e) => setEditContactForm({ ...editContactForm, last_name: e.target.value })}
                  placeholder="Last name"
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Company Name">
                <Input
                  value={editContactForm.company_name}
                  onChange={(e) => setEditContactForm({ ...editContactForm, company_name: e.target.value })}
                  placeholder="e.g. Apex Ventures Ltd"
                />
              </Field>
              <Field label="Designation">
                <Input
                  value={editContactForm.designation}
                  onChange={(e) => setEditContactForm({ ...editContactForm, designation: e.target.value })}
                  placeholder="e.g. Managing Director"
                />
              </Field>
            </div>

            {/* Communication Channels */}
            <div style={{ fontWeight: 750, fontSize: 13, color: 'var(--navy, #003768)', borderBottom: '1px solid #e2e8f0', paddingBottom: 4, marginTop: 8 }}>
              2. Communication &amp; Address
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Primary Phone">
                <Input
                  value={editContactForm.primary_phone}
                  onChange={(e) => setEditContactForm({ ...editContactForm, primary_phone: e.target.value })}
                  placeholder="+88017xxxxxxxx"
                />
              </Field>
              <Field label="WhatsApp Number">
                <Input
                  value={editContactForm.whatsapp}
                  onChange={(e) => setEditContactForm({ ...editContactForm, whatsapp: e.target.value })}
                  placeholder="+88017xxxxxxxx"
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Primary Email">
                <Input
                  type="email"
                  value={editContactForm.email}
                  onChange={(e) => setEditContactForm({ ...editContactForm, email: e.target.value })}
                  placeholder="client@example.com"
                />
              </Field>
              <Field label="Alternative Phone / Mobile">
                <Input
                  value={editContactForm.alt_phone}
                  onChange={(e) => setEditContactForm({ ...editContactForm, alt_phone: e.target.value })}
                  placeholder="Alternative phone"
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
              <Field label="Address / Road">
                <Input
                  value={editContactForm.address_line1}
                  onChange={(e) => setEditContactForm({ ...editContactForm, address_line1: e.target.value })}
                  placeholder="e.g. Road 79, House 14"
                />
              </Field>
              <Field label="Area">
                <Input
                  value={editContactForm.area}
                  onChange={(e) => setEditContactForm({ ...editContactForm, area: e.target.value })}
                  placeholder="e.g. Gulshan 2"
                />
              </Field>
            </div>

            {/* Real Estate Lead Specifications */}
            <div style={{ fontWeight: 750, fontSize: 13, color: 'var(--navy, #003768)', borderBottom: '1px solid #e2e8f0', paddingBottom: 4, marginTop: 8 }}>
              3. Real Estate Lead Requirements &amp; Qualification
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Looking For">
                <Select
                  value={editContactForm.looking_for}
                  onChange={(e) => setEditContactForm({ ...editContactForm, looking_for: e.target.value })}
                >
                  {isRentalScope ? (
                    <>
                      <option value="rent">Looking to Rent (Tenant Lead)</option>
                      <option value="sell">Looking to Rent Out / Lease (Landlord / Owner)</option>
                    </>
                  ) : isInteriorScope ? (
                    <>
                      <option value="interior">Interior Design & Planning</option>
                      <option value="renovation">Full Home Renovation</option>
                      <option value="fitout">Commercial & Office Fit-Out</option>
                      <option value="design">Luxury Villa & Styling</option>
                    </>
                  ) : isOpsServiceScope ? (
                    <>
                      <option value="service">Service Request</option>
                      <option value="amc">AMC & Maintenance</option>
                    </>
                  ) : (
                    <>
                      <option value="buy">Looking to Buy</option>
                      <option value="sell">Looking to Sell (Vendor)</option>
                      <option value="invest">Looking to Invest</option>
                      <option value="commercial">Commercial Requirement</option>
                    </>
                  )}
                </Select>
              </Field>

              <Field label="Lead Stage">
                <Select
                  value={editContactForm.lead_status}
                  onChange={(e) => setEditContactForm({ ...editContactForm, lead_status: e.target.value })}
                >
                  <option value="new">New Lead</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="viewing_scheduled">Viewing Scheduled</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="under_contract">Under Contract</option>
                  <option value="closed_won">Closed Won</option>
                  <option value="closed_lost">Closed Lost</option>
                  <option value="cold">Cold</option>
                </Select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Budget Min (BDT ৳)">
                <Input
                  type="number"
                  value={editContactForm.budget_min}
                  onChange={(e) => setEditContactForm({ ...editContactForm, budget_min: e.target.value })}
                  placeholder="e.g. 25000000"
                />
              </Field>
              <Field label="Budget Max (BDT ৳)">
                <Input
                  type="number"
                  value={editContactForm.budget_max}
                  onChange={(e) => setEditContactForm({ ...editContactForm, budget_max: e.target.value })}
                  placeholder="e.g. 50000000"
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Preferred Areas" hint="Comma-separated">
                <Input
                  value={editContactForm.preferred_areas}
                  onChange={(e) => setEditContactForm({ ...editContactForm, preferred_areas: e.target.value })}
                  placeholder="e.g. Gulshan 2, Banani, Baridhara"
                />
              </Field>
              <Field label="Property Types" hint="Comma-separated">
                <Input
                  value={editContactForm.property_types}
                  onChange={(e) => setEditContactForm({ ...editContactForm, property_types: e.target.value })}
                  placeholder="e.g. Apartment, Penthouse, Duplex"
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <Field label="Min Beds">
                <Input
                  type="number"
                  value={editContactForm.bedrooms_min}
                  onChange={(e) => setEditContactForm({ ...editContactForm, bedrooms_min: e.target.value })}
                  placeholder="e.g. 3"
                />
              </Field>
              <Field label="Min Baths">
                <Input
                  type="number"
                  value={editContactForm.bathrooms_min}
                  onChange={(e) => setEditContactForm({ ...editContactForm, bathrooms_min: e.target.value })}
                  placeholder="e.g. 3"
                />
              </Field>
              <Field label="Min Size (Sft)">
                <Input
                  type="number"
                  value={editContactForm.size_min_sft}
                  onChange={(e) => setEditContactForm({ ...editContactForm, size_min_sft: e.target.value })}
                  placeholder="e.g. 2400"
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Financing Status">
                <Select
                  value={editContactForm.financing_status}
                  onChange={(e) => setEditContactForm({ ...editContactForm, financing_status: e.target.value })}
                >
                  <option value="cash_buyer">Cash Buyer (Self-Funded)</option>
                  <option value="pre_approved">Pre-Approved Bank Loan</option>
                  <option value="needs_mortgage">Needs Mortgage Assessment</option>
                  <option value="selling_existing_property">Selling Existing Property First</option>
                </Select>
              </Field>

              <Field label="Urgency / Timeline">
                <Select
                  value={editContactForm.urgency}
                  onChange={(e) => setEditContactForm({ ...editContactForm, urgency: e.target.value })}
                >
                  <option value="immediate">Immediate (&lt; 30 Days)</option>
                  <option value="1_3_months">1 to 3 Months</option>
                  <option value="3_6_months">3 to 6 Months</option>
                  <option value="exploring">Just Exploring Market</option>
                </Select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Lead Source">
                <Input
                  value={editContactForm.lead_source}
                  onChange={(e) => setEditContactForm({ ...editContactForm, lead_source: e.target.value })}
                  placeholder="e.g. Website, Facebook Ad, Referral"
                />
              </Field>
              <Field label="Last Contacted Date">
                <Input
                  type="date"
                  value={editContactForm.last_contacted_at}
                  onChange={(e) => setEditContactForm({ ...editContactForm, last_contacted_at: e.target.value })}
                />
              </Field>
            </div>

            <Field label="Lead Requirements &amp; Private Notes">
              <Textarea
                rows={3}
                value={editContactForm.lead_notes}
                onChange={(e) => setEditContactForm({ ...editContactForm, lead_notes: e.target.value })}
                placeholder="Specific buyer preferences, floor preferences, lake view requirements, parking bays, family situation..."
              />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <Button type="button" variant="ghost" onClick={() => setEditContactOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="btn-primary" disabled={editContactSaving}>
                {editContactSaving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Drawer>
      )}

      {/* ── Real Estate Lead Profile Drawer ───────────────────────────────── */}
      {leadProfileOpen && leadProfileContact && (
        <Drawer
          open={leadProfileOpen}
          onClose={() => {
            setLeadProfileOpen(false);
            setLeadProfileContact(null);
          }}
          title={`Lead Profile: ${leadProfileContact.full_name}`}
          width={560}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Contact Hero Banner */}
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #002b49 0%, #004374 100%)',
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(0, 43, 73, 0.2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800 }}>{leadProfileContact.full_name}</div>
                  <div style={{ fontSize: 12, color: '#93c5fd', marginTop: 2 }}>
                    {leadProfileContact.company_name ? `${leadProfileContact.company_name} · ` : ''}
                    {leadProfileContact.contact_code || 'SSPC-CT'}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: '#fef3c7',
                    color: '#92400e',
                  }}
                >
                  {leadProfileContact.contact_list || 'General Leads'}
                </span>
              </div>

              {/* Direct Touch Channels */}
              <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                {leadProfileContact.primary_phone && (
                  <a
                    href={`tel:${leadProfileContact.primary_phone}`}
                    style={{
                      fontSize: 12,
                      color: '#ffffff',
                      background: 'rgba(255,255,255,0.15)',
                      padding: '4px 10px',
                      borderRadius: 6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      textDecoration: 'none',
                    }}
                  >
                    <Phone size={12} /> {leadProfileContact.primary_phone}
                  </a>
                )}
                {leadProfileContact.whatsapp && (
                  <a
                    href={`https://wa.me/${leadProfileContact.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 12,
                      color: '#4ade80',
                      background: 'rgba(22, 163, 74, 0.25)',
                      padding: '4px 10px',
                      borderRadius: 6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      textDecoration: 'none',
                      fontWeight: 700,
                    }}
                  >
                    <Phone size={12} /> WhatsApp Chat
                  </a>
                )}
                {leadProfileContact.email && (
                  <a
                    href={`mailto:${leadProfileContact.email}`}
                    style={{
                      fontSize: 12,
                      color: '#cbd5e1',
                      background: 'rgba(255,255,255,0.15)',
                      padding: '4px 10px',
                      borderRadius: 6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      textDecoration: 'none',
                    }}
                  >
                    <Mail size={12} /> Email
                  </a>
                )}
              </div>
            </div>

            {/* Pipeline Stage Quick Progress */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 750, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                Lead Pipeline Stage (Click to update)
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { key: 'new', label: 'New Lead' },
                  { key: 'contacted', label: 'Contacted' },
                  { key: 'qualified', label: 'Qualified' },
                  { key: 'viewing_scheduled', label: 'Viewing' },
                  { key: 'negotiation', label: 'Negotiation' },
                  { key: 'closed_won', label: 'Closed Won' },
                ].map((st) => {
                  const active = (leadProfileContact.lead_status || 'new') === st.key;
                  return (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => updateLeadStatusQuick(st.key)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 6,
                        border: active ? '2px solid #003768' : '1px solid #cbd5e1',
                        background: active ? '#003768' : '#ffffff',
                        color: active ? '#ffffff' : '#334155',
                        fontWeight: active ? 750 : 550,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Property Requirements Card */}
            <div className="card" style={{ padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--navy, #003768)', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🎯 Real Estate Requirements</span>
                <button
                  type="button"
                  onClick={() => {
                    setLeadProfileOpen(false);
                    openEditContact(leadProfileContact);
                  }}
                  style={{ background: 'none', border: 'none', fontSize: 11.5, color: '#0284c7', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                >
                  <Pencil size={11} /> Edit Requirements
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12.5 }}>
                <div>
                  <span style={{ color: 'var(--muted)' }}>Intent:</span>
                  <div style={{ fontWeight: 700, color: 'var(--ink)', textTransform: 'capitalize' }}>
                    {leadProfileContact.looking_for ? `Looking to ${leadProfileContact.looking_for}` : 'Not specified'}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--muted)' }}>Budget Range:</span>
                  <div style={{ fontWeight: 750, color: '#047857' }}>
                    {leadProfileContact.budget_max
                      ? `${money(leadProfileContact.budget_min || 0)} – ${money(leadProfileContact.budget_max)}`
                      : 'Open Budget'}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--muted)' }}>Preferred Areas:</span>
                  <div style={{ fontWeight: 650, color: 'var(--ink)' }}>
                    {safeJsonParse(leadProfileContact.preferred_areas, []).join(', ') || 'Any prime area'}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--muted)' }}>Property Types:</span>
                  <div style={{ fontWeight: 650, color: 'var(--ink)' }}>
                    {safeJsonParse(leadProfileContact.property_types, []).join(', ') || 'Residential'}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--muted)' }}>Bedrooms &amp; Bathrooms:</span>
                  <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                    {leadProfileContact.bedrooms_min ? `${leadProfileContact.bedrooms_min}+ Beds` : 'Any'}
                    {leadProfileContact.bathrooms_min ? ` · ${leadProfileContact.bathrooms_min}+ Baths` : ''}
                    {leadProfileContact.size_min_sft ? ` · ${leadProfileContact.size_min_sft}+ Sft` : ''}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--muted)' }}>Financing &amp; Urgency:</span>
                  <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                    {leadProfileContact.financing_status ? leadProfileContact.financing_status.replace('_', ' ') : 'Standard'}
                    {leadProfileContact.urgency ? ` (${leadProfileContact.urgency.replace('_', ' ')})` : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Interaction & Outreach History */}
            <div className="card" style={{ padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 13, fontWeight: 750, color: 'var(--navy, #003768)', marginBottom: 10 }}>
                📅 Interaction &amp; CRM Activity
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
                <div>
                  <span style={{ color: 'var(--muted)' }}>Contact Added Date:</span>
                  <div style={{ fontWeight: 650, color: 'var(--ink)' }}>
                    {dateTimeFmt(leadProfileContact.createdAt || leadProfileContact.created_at)}
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--muted)' }}>Last Record Update:</span>
                  <div style={{ fontWeight: 650, color: 'var(--ink)' }}>
                    {dateTimeFmt(leadProfileContact.updatedAt || leadProfileContact.updated_at)}
                  </div>
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, background: '#f8fafc', padding: '8px 12px', borderRadius: 8 }}>
                  <div>
                    <span style={{ color: 'var(--muted)', fontSize: 11 }}>Last Contacted:</span>
                    <div style={{ fontWeight: 750, color: '#0f172a' }}>
                      {leadProfileContact.last_contacted_at ? dateTimeFmt(leadProfileContact.last_contacted_at) : 'No outreach logged'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => logTouchContact(leadProfileContact.id)}
                    style={{
                      background: '#003768',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Clock size={12} /> Log Call Today
                  </button>
                </div>
              </div>
            </div>

            {/* Notes & Requirements */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>
                Lead Requirements &amp; Working Notes
              </div>
              <Textarea
                rows={3}
                value={quickLeadNotes}
                onChange={(e) => setQuickLeadNotes(e.target.value)}
                placeholder="Add private broker notes, client feedback, inspection dates..."
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button
                  type="button"
                  className="btn-primary"
                  onClick={saveLeadProfileNotes}
                  disabled={leadProfileSaving}
                  style={{ fontSize: 12, padding: '5px 12px' }}
                >
                  {leadProfileSaving ? 'Saving…' : 'Save Notes'}
                </Button>
              </div>
            </div>
          </div>
        </Drawer>
      )}

      {/* ── Bulk Lead Import via Excel / CSV Modal ────────────────────────── */}
      {bulkImportOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1100,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !importLoading) {
              setBulkImportOpen(false);
            }
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 580,
              borderRadius: 14,
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              padding: 24,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#e0f2fe', color: '#0369a1', display: 'grid', placeItems: 'center' }}>
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>
                    Bulk Lead Import via Excel
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Batch upload contacts, buyer preferences &amp; list tagging
                  </div>
                </div>
              </div>
              {!importLoading && (
                <button
                  type="button"
                  onClick={() => setBulkImportOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Template Download Box */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b' }}>
                  Need the Excel format?
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>
                  Download our pre-formatted spreadsheet template with sample rows.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => downloadSampleTemplate('xlsx')}
                  disabled={downloadingTemplate}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#0f172a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Download size={13} /> .xlsx Template
                </button>
                <button
                  type="button"
                  onClick={() => downloadSampleTemplate('csv')}
                  disabled={downloadingTemplate}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: '6px 10px',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#0f172a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Download size={13} /> .csv
                </button>
              </div>
            </div>

            <form onSubmit={handleBulkImport} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* File input dropzone */}
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', marginBottom: 6, display: 'block' }}>
                  Select Spreadsheet File (.xlsx, .xls, .csv) *
                </label>
                <div
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: 10,
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: importFile ? '#f0fdf4' : '#fafafa',
                    borderColor: importFile ? '#86efac' : '#cbd5e1',
                    cursor: 'pointer',
                  }}
                  onClick={() => document.getElementById('excel-bulk-file-input')?.click()}
                >
                  <Upload size={28} style={{ color: importFile ? '#16a34a' : '#94a3b8', margin: '0 auto 8px' }} />
                  {importFile ? (
                    <div>
                      <div style={{ fontWeight: 750, color: '#166534', fontSize: 13 }}>
                        {importFile.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#15803d', marginTop: 2 }}>
                        {(importFile.size / 1024).toFixed(1)} KB · Ready to import
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: 650, color: '#334155', fontSize: 13 }}>
                        Click to browse or drop file here
                      </div>
                      <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 3 }}>
                        Supports Microsoft Excel (.xlsx, .xls) and CSV
                      </div>
                    </div>
                  )}
                  <input
                    id="excel-bulk-file-input"
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImportFile(e.target.files[0]);
                        setImportResult(null);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Default List Assignment */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Assign to Contact List" hint="Default group tag">
                  <Input
                    value={importDefaultList}
                    onChange={(e) => setImportDefaultList(e.target.value)}
                    placeholder={isRentalScope ? 'e.g. Rental Leads' : isInteriorScope ? 'e.g. Interior Design Leads' : isOpsServiceScope ? 'e.g. Service Leads' : 'e.g. VIP Buyers, General Leads'}
                    required
                  />
                </Field>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={importUpdateDuplicates}
                      onChange={(e) => setImportUpdateDuplicates(e.target.checked)}
                    />
                    <span>Update existing contacts if phone/email matches</span>
                  </label>
                </div>
              </div>

              {/* Import Results Box */}
              {importResult && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 8,
                    padding: 14,
                  }}
                >
                  <div style={{ fontWeight: 800, color: '#166534', fontSize: 13, marginBottom: 6 }}>
                    ✓ Import Finished Successfully
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                    <div>Total Processed: <strong>{importResult.total}</strong></div>
                    <div style={{ color: '#15803d' }}>Created: <strong>{importResult.created}</strong></div>
                    <div style={{ color: '#0369a1' }}>Updated: <strong>{importResult.updated}</strong></div>
                    <div style={{ color: '#64748b' }}>Skipped: <strong>{importResult.skipped}</strong></div>
                  </div>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 11.5, color: '#b91c1c' }}>
                      <strong>{importResult.errors.length} notice(s):</strong>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                        {importResult.errors.slice(0, 3).map((err, idx) => (
                          <li key={idx}>Row {err.row}: {err.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setBulkImportOpen(false)}
                  disabled={importLoading}
                >
                  {importResult ? 'Close' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  className="btn-primary"
                  disabled={!importFile || importLoading}
                >
                  {importLoading ? 'Processing Spreadsheet…' : 'Start Import'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Lead Drawer ──────────────────────────────────────────────── */}
      {editLeadOpen && editingLead && (
        <Drawer
          open={editLeadOpen}
          onClose={() => {
            setEditLeadOpen(false);
            setEditingLead(null);
          }}
          title={`Edit Lead: ${editingLead.name || 'Lead Details'}`}
          width={520}
        >
          <form onSubmit={saveLeadEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--subtle, #f8fafc)', borderRadius: 8, fontSize: 12 }}>
              <span className="code-chip">{editingLead.code || (editingLead.isEnquiry ? 'ENQ' : 'LEAD')}</span>
              <span style={{ color: 'var(--muted)' }}>
                {editingLead.isEnquiry ? 'Website Property Enquiry' : 'Direct Residential Lead'}
              </span>
            </div>

            <Field label="Lead Name *" hint="Contact full name or company">
              <Input
                value={editLeadForm.name}
                onChange={(e) => setEditLeadForm({ ...editLeadForm, name: e.target.value })}
                placeholder="e.g. Tanvir Hasan"
                required
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Phone">
                <Input
                  value={editLeadForm.phone}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, phone: e.target.value })}
                  placeholder="017xxxxxxxx"
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={editLeadForm.email}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, email: e.target.value })}
                  placeholder="name@domain.com"
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Lead Pipeline Stage">
                <Select
                  value={editLeadForm.stage}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, stage: e.target.value })}
                >
                  <option value="new">New Lead</option>
                  <option value="contacted">Contacted / In Discussion</option>
                  <option value="viewing_scheduled">Viewing Scheduled</option>
                  <option value="viewing_completed">Viewing Completed</option>
                  <option value="offer_made">Offer Made</option>
                  <option value="under_negotiation">Under Negotiation</option>
                  <option value="converted">Converted</option>
                  <option value="lost">Lost</option>
                  <option value="rejected">Rejected / Closed</option>
                </Select>
              </Field>

              <Field label="Priority">
                <Select
                  value={editLeadForm.priority}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Budget / Valuation (৳)">
                <Input
                  type="number"
                  value={editLeadForm.budget}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, budget: e.target.value })}
                  placeholder="e.g. 15000000"
                />
              </Field>

              <Field label="Source">
                <Select
                  value={editLeadForm.source}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, source: e.target.value })}
                >
                  <option value="Website Enquiry">Website Enquiry</option>
                  <option value="Step Form">Step Form</option>
                  <option value="Phone Call">Phone Call</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Social Media">Social Media</option>
                  <option value="Referral">Referral</option>
                  <option value="Direct">Direct</option>
                </Select>
              </Field>
            </div>

            <Field label="Linked / Target Property">
              <Select
                value={editLeadForm.property_id}
                onChange={(e) => setEditLeadForm({ ...editLeadForm, property_id: e.target.value })}
              >
                <option value="">No linked property</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.property_code ? `${p.property_code} · ` : ''}{p.title}
                  </option>
                ))}
              </Select>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Preferred Area / Location">
                <Input
                  value={editLeadForm.preferred_area}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, preferred_area: e.target.value })}
                  placeholder="e.g. Gulshan, Banani, Dhanmondi"
                />
              </Field>

              <Field label="Assigned Officer">
                <Select
                  value={editLeadForm.assigned_to}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, assigned_to: e.target.value })}
                >
                  <option value="">Unassigned / Pool</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Requirement Details">
              <Textarea
                rows={2}
                value={editLeadForm.requirement}
                onChange={(e) => setEditLeadForm({ ...editLeadForm, requirement: e.target.value })}
                placeholder="Specific property dimensions, bedrooms, amenities..."
              />
            </Field>

            <Field label="Internal Staff Notes">
              <Textarea
                rows={3}
                value={editLeadForm.notes}
                onChange={(e) => setEditLeadForm({ ...editLeadForm, notes: e.target.value })}
                placeholder="Follow-up history, client preferences, seller motivation..."
              />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditLeadOpen(false);
                  setEditingLead(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="btn-primary" disabled={editLeadSaving}>
                {editLeadSaving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Drawer>
      )}

      {/* ── Edit Party (Buyer / Vendor) Drawer ────────────────────────────── */}
      {editPartyOpen && editingParty && (
        <Drawer
          open={editPartyOpen}
          onClose={() => {
            setEditPartyOpen(false);
            setEditingParty(null);
          }}
          title={`Edit ${editPartyRole === 'vendor' ? 'Vendor' : 'Buyer'} Details: ${editPartyForm.full_name || 'Client'}`}
          width={520}
        >
          <form onSubmit={savePartyEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--subtle, #f8fafc)', borderRadius: 8, fontSize: 12 }}>
              <div>
                Client Code: <span className="code-chip">{editingParty.client_code || 'SSPC-CL'}</span>
              </div>
              <Badge tone={editPartyRole === 'vendor' ? 'amber' : 'purple'}>
                {editPartyRole === 'vendor' ? 'Vendor (Property Seller)' : 'Buyer (Property Purchaser)'}
              </Badge>
            </div>

            <Field label="Full Name *" hint="Contact individual name">
              <Input
                value={editPartyForm.full_name}
                onChange={(e) => setEditPartyForm({ ...editPartyForm, full_name: e.target.value })}
                placeholder="e.g. Asif Mahmud"
                required
              />
            </Field>

            <Field label="Company / Organization Name (Optional)">
              <Input
                value={editPartyForm.company_name}
                onChange={(e) => setEditPartyForm({ ...editPartyForm, company_name: e.target.value })}
                placeholder="e.g. Acme Properties Ltd"
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Primary Phone">
                <Input
                  value={editPartyForm.primary_phone}
                  onChange={(e) => setEditPartyForm({ ...editPartyForm, primary_phone: e.target.value })}
                  placeholder="017xxxxxxxx"
                />
              </Field>
              <Field label="WhatsApp / Alt Phone">
                <Input
                  value={editPartyForm.whatsapp}
                  onChange={(e) => setEditPartyForm({ ...editPartyForm, whatsapp: e.target.value })}
                  placeholder="018xxxxxxxx"
                />
              </Field>
            </div>

            <Field label="Email Address">
              <Input
                type="email"
                value={editPartyForm.email}
                onChange={(e) => setEditPartyForm({ ...editPartyForm, email: e.target.value })}
                placeholder="name@domain.com"
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="National ID (NID)" hint="Used for agreements">
                <Input
                  value={editPartyForm.national_id}
                  onChange={(e) => setEditPartyForm({ ...editPartyForm, national_id: e.target.value })}
                  placeholder="e.g. 1990123456789"
                />
              </Field>
              <Field label="Passport No">
                <Input
                  value={editPartyForm.passport_no}
                  onChange={(e) => setEditPartyForm({ ...editPartyForm, passport_no: e.target.value })}
                  placeholder="e.g. A12345678"
                />
              </Field>
            </div>

            <Field label="Street / Property Address">
              <Input
                value={editPartyForm.address_line1}
                onChange={(e) => setEditPartyForm({ ...editPartyForm, address_line1: e.target.value })}
                placeholder="e.g. House 12, Road 4, Sector 3"
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <Field label="Area">
                <Input
                  value={editPartyForm.area}
                  onChange={(e) => setEditPartyForm({ ...editPartyForm, area: e.target.value })}
                  placeholder="Uttara"
                />
              </Field>
              <Field label="City">
                <Input
                  value={editPartyForm.city}
                  onChange={(e) => setEditPartyForm({ ...editPartyForm, city: e.target.value })}
                  placeholder="Dhaka"
                />
              </Field>
              <Field label="District">
                <Input
                  value={editPartyForm.district}
                  onChange={(e) => setEditPartyForm({ ...editPartyForm, district: e.target.value })}
                  placeholder="Dhaka"
                />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Client Segment">
                <Select
                  value={editPartyForm.client_segment}
                  onChange={(e) => setEditPartyForm({ ...editPartyForm, client_segment: e.target.value })}
                >
                  <option value="standard">Standard</option>
                  <option value="vip">VIP / High Net Worth</option>
                  <option value="investor">Real Estate Investor</option>
                  <option value="corporate">Corporate Entity</option>
                </Select>
              </Field>

              <Field label="Account Status">
                <Select
                  value={editPartyForm.status}
                  onChange={(e) => setEditPartyForm({ ...editPartyForm, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="blacklisted">Blacklisted</option>
                </Select>
              </Field>
            </div>

            <Field label="Internal Relationship Notes">
              <Textarea
                rows={3}
                value={editPartyForm.notes}
                onChange={(e) => setEditPartyForm({ ...editPartyForm, notes: e.target.value })}
                placeholder="Client preferences, payment terms, contact instructions..."
              />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditPartyOpen(false);
                  setEditingParty(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="btn-primary" disabled={editPartySaving}>
                {editPartySaving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Drawer>
      )}
    </div>
  );
}

// ── Subcomponent: Automations Section (Rules & Sequences) ────────────────────
function AutomationsSection({ staff }) {
  const toast = useToast();
  const [subTab, setSubTab] = useState('rules');
  const [rules, setRules] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAutomations = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, sRes] = await Promise.all([
        api.get('/sales/lead-rules').catch(() => ({ data: { data: [] } })),
        api.get('/sales/lead-sequences').catch(() => ({ data: { data: [] } })),
      ]);
      setRules(rRes.data?.data || []);
      setSequences(sRes.data?.data || []);
    } catch {
      toast.error('Failed to load lead automation configurations');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAutomations();
  }, [loadAutomations]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--line, #e2e8f0)', paddingBottom: 8 }}>
        <button
          type="button"
          onClick={() => setSubTab('rules')}
          style={{
            background: subTab === 'rules' ? 'var(--navy, #003768)' : 'none',
            color: subTab === 'rules' ? '#ffffff' : 'var(--ink)',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Routing Rules ({rules.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('sequences')}
          style={{
            background: subTab === 'sequences' ? 'var(--navy, #003768)' : 'none',
            color: subTab === 'sequences' ? '#ffffff' : 'var(--ink)',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Follow-up Sequences ({sequences.length})
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>
      ) : subTab === 'rules' ? (
        <div className="card" style={{ padding: 20, borderRadius: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 750, color: 'var(--ink)' }}>
                Lead Assignment Rules
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                Automates officer assignment based on property category, location, and enquiry source.
              </p>
            </div>
          </div>

          {rules.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No rules configured. Inbound leads are assigned to the primary sales manager.
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Rule Name</th>
                  <th>Criteria</th>
                  <th>Assigned Officer</th>
                  <th>Default Sequence</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.name}</strong></td>
                    <td style={{ fontSize: 12 }}>
                      {[
                        r.match_category && `Category: ${r.match_category}`,
                        r.match_area && `Area: ${r.match_area}`,
                        r.match_source && `Source: ${r.match_source}`,
                      ].filter(Boolean).join(' · ') || 'Catch-all'}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {staff.find((s) => s.id === r.assign_to)?.name || 'Round-robin pool'}
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {sequences.find((s) => s.id === r.default_sequence_id)?.name || 'None'}
                    </td>
                    <td>
                      <StatusBadge status={r.active ? 'approved' : 'pending'}>
                        {r.active ? 'Active' : 'Disabled'}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 20, borderRadius: 12 }}>
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 750, color: 'var(--ink)' }}>
              Automated Follow-up Sequences
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
              Multi-step email cadences automatically sent to enquiries on a business-day schedule.
            </p>
          </div>

          {sequences.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No sequences configured.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sequences.map((seq) => (
                <div
                  key={seq.id}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1px solid var(--line, #e2e8f0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 13, color: 'var(--ink)' }}>{seq.name}</strong>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                      {Array.isArray(seq.steps) ? `${seq.steps.length} touchpoint steps` : 'Active cadence'}
                    </div>
                  </div>
                  <Badge tone={seq.active ? 'green' : 'grey'}>
                    {seq.active ? 'Active' : 'Paused'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
