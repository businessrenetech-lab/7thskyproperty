import { MOCK_PROPERTIES } from '../data/mockProperties';
import { SERVICE_CATEGORIES, TEMPORARILY_HIDDEN_SERVICES } from '../data/mockServices';
import { MOCK_TESTIMONIALS, MOCK_FAQS, COMPANY_INFO } from '../data/mockData';

// Simulated delay helper
const delay = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApi = {
  // Properties Endpoints
  async getProperties(filters = {}) {
    await delay();
    let result = [...MOCK_PROPERTIES];

    if (filters.purpose && filters.purpose !== 'all') {
      result = result.filter(p => p.purpose.toLowerCase().includes(filters.purpose.toLowerCase()));
    }
    if (filters.category && filters.category !== 'all') {
      result = result.filter(p => p.category.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.query) {
      const q = filters.query.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.suburb.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q)
      );
    }
    if (filters.featured) {
      result = result.filter(p => p.featured);
    }

    return {
      success: true,
      count: result.length,
      data: result
    };
  },

  async getPropertyById(id) {
    await delay();
    const prop = MOCK_PROPERTIES.find(p => p.id === id || p.code.toLowerCase() === id.toLowerCase());
    if (!prop) {
      return { success: false, error: 'Property not found' };
    }
    return { success: true, data: prop };
  },

  // Services Endpoints
  async getServices() {
    await delay();
    return {
      success: true,
      categories: SERVICE_CATEGORIES,
      hiddenServices: TEMPORARILY_HIDDEN_SERVICES
    };
  },

  async getServiceByCategory(categoryId) {
    await delay();
    const cat = SERVICE_CATEGORIES.find(c => c.id === categoryId);
    if (!cat) return { success: false, error: 'Category not found' };
    return { success: true, data: cat };
  },

  // Interactive Form Submissions (Mock Endpoints)
  async submitEnquiry(payload) {
    await delay(300);
    console.log('[MOCK API] Received property enquiry:', payload);
    return {
      success: true,
      referenceCode: `ENQ-${Math.floor(100000 + Math.random() * 900000)}`,
      message: 'Thank you. Your property enquiry has been routed to our senior advisor.'
    };
  },

  async bookInspection(payload) {
    await delay(300);
    console.log('[MOCK API] Received inspection booking:', payload);
    return {
      success: true,
      bookingRef: `INSP-${Math.floor(100000 + Math.random() * 900000)}`,
      message: `Your inspection for ${payload.propertyCode || 'property'} has been confirmed.`
    };
  },

  async bookAppraisal(payload) {
    await delay(300);
    console.log('[MOCK API] Received appraisal booking:', payload);
    return {
      success: true,
      appraisalRef: `APP-${Math.floor(100000 + Math.random() * 900000)}`,
      message: 'Your property appraisal request is registered. A market specialist will reach out shortly.'
    };
  },

  async submitContact(payload) {
    await delay(300);
    console.log('[MOCK API] Received contact form submission:', payload);
    return {
      success: true,
      message: 'Thank you for getting in touch. Our concierge team will respond within 2 business hours.'
    };
  },

  async clientLogin(credentials) {
    await delay(350);
    if (!credentials.email || !credentials.password) {
      return { success: false, error: 'Email and password are required' };
    }
    return {
      success: true,
      token: 'mock-jwt-client-token-7thsky',
      user: {
        name: 'Kazi Mahfuzur Rahman',
        email: credentials.email,
        role: 'landlord_client',
        portfolioCount: 2
      }
    };
  },

  async providerLogin(credentials) {
    await delay(350);
    if (!credentials.email || !credentials.password) {
      return { success: false, error: 'Email and password are required' };
    }
    return {
      success: true,
      token: 'mock-jwt-provider-token-7thsky',
      user: {
        name: 'Apex Facilities & Engineering',
        email: credentials.email,
        role: 'service_provider',
        activeWorkOrders: 4
      }
    };
  },

  async getTestimonials() {
    await delay();
    return { success: true, data: MOCK_TESTIMONIALS };
  },

  async getFaqs() {
    await delay();
    return { success: true, data: MOCK_FAQS };
  },

  async getCompanyInfo() {
    await delay();
    return { success: true, data: COMPANY_INFO };
  }
};
