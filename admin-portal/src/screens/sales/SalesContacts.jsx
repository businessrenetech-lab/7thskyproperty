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
  AlertCircle, Clock, Eye, Send, Home, Briefcase, Pencil
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Button, Spinner, Badge, StatusBadge, Drawer, Field, Input, Select, Textarea
} from '../../ui/kit';

const money = (v) => '৳' + Number(v || 0).toLocaleString('en-BD');
const dateFmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const getInitials = (name) => {
  if (!name) return 'CT';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export default function SalesContacts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const toast = useToast();
  const isManager = ['super_admin', 'branch_admin', 'property_manager'].includes(user?.role);

  // Active primary tab: 'contacts' | 'leads' | 'vendors' | 'buyers' | 'automations'
  const [activeTab, setActiveTab] = useState('contacts');

  // Search & Global state
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Directory Data
  const [contacts, setContacts] = useState([]);
  const [contactsCount, setContactsCount] = useState(0);

  const [leads, setLeads] = useState([]);
  const [enquiries, setEnquiries] = useState([]);

  const [vendors, setVendors] = useState([]);
  const [buyers, setBuyers] = useState([]);

  // Auxiliary: properties & staff
  const [properties, setProperties] = useState([]);
  const [staff, setStaff] = useState([]);

  // Sub-filters
  const [leadTypeFilter, setLeadTypeFilter] = useState('all'); // 'all' | 'buyer' | 'vendor'
  const [leadStageFilter, setLeadStageFilter] = useState('all');
  const [contactTypeFilter, setContactTypeFilter] = useState('all'); // 'all' | 'individual' | 'company'

  // Modals & Drawers
  const [newLeadDrawer, setNewLeadDrawer] = useState(false);
  const [newContactDrawer, setNewContactDrawer] = useState(false);
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
      const [cRes, lRes, eqRes, vRes, bRes, agrRes] = await Promise.all([
        api.get('/contacts?limit=100').catch(() => ({ data: { data: [] } })),
        api.get('/leads?limit=100').catch(() => ({ data: { data: [] } })),
        api.get('/sales-enquiries?limit=100').catch(() => ({ data: { data: [] } })),
        api.get('/clients?role=seller&limit=100').catch(() => ({ data: { data: [] } })),
        api.get('/clients?role=buyer&limit=100').catch(() => ({ data: { data: [] } })),
        api.get('/sales-agreements/contracts').catch(() => ({ data: { buckets: {} } })),
      ]);

      setContacts(cRes.data?.data || []);
      setContactsCount(cRes.data?.pagination?.total || cRes.data?.data?.length || 0);

      setLeads(lRes.data?.data || []);
      setEnquiries(eqRes.data?.data || []);

      setVendors(vRes.data?.data || []);
      setBuyers(bRes.data?.data || []);

      const completed = agrRes.data?.buckets?.completed || [];
      setCompletedAgreements(completed);
    } catch (e) {
      toast.error('Failed to load contacts directory');
    } finally {
      setLoading(false);
    }
  }, [toast]);

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

  // Combined Leads List (Enquiries as Buyer Leads + General Leads as Vendor/Buyer)
  const unifiedLeads = useMemo(() => {
    const list = [];

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

    // 2. Direct Leads (from leads table)
    leads.forEach((ld) => {
      const isSeller = ld.vertical_key === 'seller' || ld.vertical_key === 'vendor' || ld.requirement?.toLowerCase().includes('sell');
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
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [enquiries, leads]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return unifiedLeads.filter((l) => {
      if (leadTypeFilter !== 'all' && l.lead_type !== leadTypeFilter) return false;
      if (leadStageFilter !== 'all' && l.stage !== leadStageFilter) return false;
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
  }, [unifiedLeads, leadTypeFilter, leadStageFilter, search]);

  // Filtered Contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (contactTypeFilter !== 'all' && c.contact_type !== contactTypeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = c.full_name?.toLowerCase().includes(q);
        const matchPhone = c.primary_phone?.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        const matchCode = c.contact_code?.toLowerCase().includes(q);
        const matchCompany = c.company_name?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchCode && !matchCompany) return false;
      }
      return true;
    });
  }, [contacts, contactTypeFilter, search]);

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

  // Counters
  const counters = useMemo(() => {
    const totalLeadsCount = unifiedLeads.length;
    const activeLeadsCount = unifiedLeads.filter((l) => l.stage !== 'converted' && l.stage !== 'rejected' && l.stage !== 'lost').length;
    const readyForAgreementCount = unifiedLeads.filter((l) => l.stage === 'offer_made' || l.stage === 'converted').length;

    return {
      contacts: contactsCount,
      leads: activeLeadsCount,
      totalLeads: totalLeadsCount,
      vendors: vendors.length,
      buyers: buyers.length,
      readyAgreements: readyForAgreementCount,
    };
  }, [contactsCount, unifiedLeads, vendors.length, buyers.length]);

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
  const openClientDashboard = (clientId, contactId) => {
    if (clientId) {
      navigate(`/residential/contacts/clients?client=${clientId}`);
    } else if (contactId) {
      navigate(`/residential/contacts/clients?contact=${contactId}`);
    } else {
      navigate('/residential/contacts/clients');
    }
  };

  return (
    <div className="pm-scope">
      {/* ── Top Header Cockpit ────────────────────────────────────────────── */}
      <div className="pm-head" style={{ marginBottom: 14 }}>
        <div>
          <div className="pm-eyebrow">Residential Sales · Directory &amp; Pipeline</div>
          <h1>Contacts &amp; Leads</h1>
          <div className="pm-meta">
            Integrated CRM directory for client profiles, seller leads, buyer enquiries, and agreement onboarding.
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
            onClick={() => setNewContactDrawer(true)}
          >
            <Plus size={14} /> New Contact
          </button>

          <button
            type="button"
            className="pm-btn primary"
            onClick={() => setNewLeadDrawer(true)}
            style={{ background: 'var(--navy, #003768)', color: '#ffffff' }}
          >
            <UserPlus size={14} /> + New Lead
          </button>
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
            Total Contacts
          </div>
          <div className="value" style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)' }}>
            {counters.contacts}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Master directory</div>
        </div>

        <div className="card stat" style={{ padding: '12px 16px', borderRadius: 12, borderLeft: '4px solid #0284c7' }}>
          <div className="label" style={{ fontSize: 11.5, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>
            Active Leads
          </div>
          <div className="value" style={{ fontSize: 24, fontWeight: 800, color: '#0284c7' }}>
            {counters.leads}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Enquiries &amp; Seller leads</div>
        </div>

        <div className="card stat" style={{ padding: '12px 16px', borderRadius: 12, borderLeft: '4px solid #d97706' }}>
          <div className="label" style={{ fontSize: 11.5, fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
            Vendors (Sellers)
          </div>
          <div className="value" style={{ fontSize: 24, fontWeight: 800, color: '#d97706' }}>
            {counters.vendors}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Ready for Sale Agreements</div>
        </div>

        <div className="card stat" style={{ padding: '12px 16px', borderRadius: 12, borderLeft: '4px solid #7c3aed' }}>
          <div className="label" style={{ fontSize: 11.5, fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase' }}>
            Buyers
          </div>
          <div className="value" style={{ fontSize: 24, fontWeight: 800, color: '#7c3aed' }}>
            {counters.buyers}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Purchase prospects</div>
        </div>

        <div className="card stat" style={{ padding: '12px 16px', borderRadius: 12, borderLeft: '4px solid #16a34a' }}>
          <div className="label" style={{ fontSize: 11.5, fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>
            Agreement Ready
          </div>
          <div className="value" style={{ fontSize: 24, fontWeight: 800, color: '#16a34a' }}>
            {counters.readyAgreements}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Converted pipeline</div>
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
          {[
            { key: 'contacts', label: 'All Contacts', count: counters.contacts, icon: Users },
            { key: 'leads', label: 'Leads', count: counters.leads, icon: Sparkles },
            { key: 'vendors', label: 'Vendors', count: counters.vendors, icon: Building2 },
            { key: 'buyers', label: 'Buyers', count: counters.buyers, icon: Briefcase },
            { key: 'automations', label: 'Automations', icon: Send },
          ].map((t) => {
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6 }}>
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
                    fontWeight: contactTypeFilter === f.key ? 700 : 550,
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
            </div>

            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Showing {filteredContacts.length} contacts
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
                Try adjusting your search criteria or register a new contact.
              </div>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden', borderRadius: 12 }}>
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 260 }}>Contact Name</th>
                      <th>Communication</th>
                      <th>Designation / Org</th>
                      <th>Location</th>
                      <th>Roles &amp; Tags</th>
                      <th>Created</th>
                      <th style={{ textAlign: 'right', width: 140 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map((c) => (
                      <tr key={c.id}>
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                                {c.contact_code && (
                                  <span className="code-chip" style={{ fontSize: 10 }}>
                                    {c.contact_code}
                                  </span>
                                )}
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
                        </td>

                        <td>
                          <div style={{ fontSize: 12, color: 'var(--ink)' }}>
                            {[c.area, c.city].filter(Boolean).join(', ') || 'Bangladesh'}
                          </div>
                          {c.is_nrb && <Badge tone="amber">NRB ({c.nrb_country || 'Abroad'})</Badge>}
                        </td>

                        <td>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {c.is_client && <Badge tone="green">Client</Badge>}
                            {Array.isArray(c.tags) && c.tags.slice(0, 2).map((t, idx) => (
                              <Badge key={idx} tone="grey">{t}</Badge>
                            ))}
                          </div>
                        </td>

                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {dateFmt(c.created_at || c.createdAt)}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => openClientDashboard(null, c.id)}
                            style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            title="Open Dossier / Profile"
                          >
                            <ExternalLink size={12} /> Dossier
                          </button>
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
         TAB 2: LEADS (WEBSITE ENQUIRIES + SELLER LEADS)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'leads' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Subfilter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: 'All Leads' },
                { key: 'buyer', label: 'Buyer Enquiries (Website)' },
                { key: 'vendor', label: 'Vendor / Seller Leads' },
              ].map((f) => (
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
                All website enquiries and seller requests will stream here.
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
                                color: isVendor ? '#b45309' : '#0369a1',
                                background: isVendor ? '#fef3c7' : '#e0f2fe',
                                border: `1px solid ${isVendor ? '#fde68a' : '#bae6fd'}`,
                                padding: '2px 7px',
                                borderRadius: 5,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              {isVendor ? <Building2 size={11} /> : <Briefcase size={11} />}
                              {isVendor ? 'Vendor / Seller Lead' : 'Buyer Lead'}
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
         TAB 3: VENDORS (PROPERTY SELLERS)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'vendors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Property sellers verified and ready to execute residential <strong>Sale Agreements</strong>.
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Showing {filteredVendors.length} vendors
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
      {activeTab === 'buyers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Qualified residential buyers ready to execute <strong>Purchase Agreements</strong> and review listings.
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Showing {filteredBuyers.length} buyers
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
