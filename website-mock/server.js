import express from 'express';
import cors from 'cors';
import { MOCK_PROPERTIES } from './src/data/mockProperties.js';
import { SERVICE_CATEGORIES, TEMPORARILY_HIDDEN_SERVICES } from './src/data/mockServices.js';
import { MOCK_TESTIMONIALS, MOCK_FAQS, COMPANY_INFO } from './src/data/mockData.js';

const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[7thSky Mock Server] ${req.method} ${req.url}`);
  next();
});

// Root check
app.get('/', (req, res) => {
  res.json({
    name: 'Seventh Sky Property Management — Mock API Server',
    version: '1.0.0',
    status: 'online',
    endpointsCatalog: '/api/docs'
  });
});

// 1. Properties
app.get('/api/properties', (req, res) => {
  const { purpose, category, query, featured } = req.query;
  let list = [...MOCK_PROPERTIES];

  if (purpose && purpose !== 'all') {
    list = list.filter(p => p.purpose.toLowerCase().includes(purpose.toLowerCase()));
  }
  if (category && category !== 'all') {
    list = list.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }
  if (query) {
    const q = query.toLowerCase();
    list = list.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q) ||
      p.suburb.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q)
    );
  }
  if (featured === 'true') {
    list = list.filter(p => p.featured);
  }

  res.json({ success: true, count: list.length, data: list });
});

app.get('/api/properties/:id', (req, res) => {
  const { id } = req.params;
  const prop = MOCK_PROPERTIES.find(p => p.id === id || p.code.toLowerCase() === id.toLowerCase());
  if (!prop) {
    return res.status(404).json({ success: false, error: 'Property listing not found' });
  }
  res.json({ success: true, data: prop });
});

// 2. Services (with 10-15 word hover descriptions)
app.get('/api/services', (req, res) => {
  res.json({
    success: true,
    categories: SERVICE_CATEGORIES,
    hiddenServices: TEMPORARILY_HIDDEN_SERVICES
  });
});

app.get('/api/services/:categoryId', (req, res) => {
  const cat = SERVICE_CATEGORIES.find(c => c.id === req.params.categoryId);
  if (!cat) {
    return res.status(404).json({ success: false, error: 'Service category not found' });
  }
  res.json({ success: true, data: cat });
});

// 3. Enquiries & Form Submissions
app.post('/api/enquiries', (req, res) => {
  const { propertyId, propertyCode, name, email, phone, message } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ success: false, error: 'Name and phone are required.' });
  }
  const ref = `ENQ-${Math.floor(100000 + Math.random() * 900000)}`;
  res.status(201).json({
    success: true,
    referenceCode: ref,
    message: 'Enquiry received. A property specialist will contact you shortly.',
    data: { propertyId, propertyCode, name, email, phone, message, timestamp: new Date() }
  });
});

app.post('/api/inspections/book', (req, res) => {
  const { propertyId, propertyCode, name, phone, email, preferredDate, timeSlot } = req.body;
  if (!propertyCode || !name || !phone || !timeSlot) {
    return res.status(400).json({ success: false, error: 'Property code, name, phone, and timeSlot are required.' });
  }
  const ref = `INSP-${Math.floor(100000 + Math.random() * 900000)}`;
  res.status(201).json({
    success: true,
    bookingRef: ref,
    message: `Inspection confirmed for ${propertyCode} at ${timeSlot}. Confirmation SMS and WhatsApp sent.`,
    data: { propertyId, propertyCode, name, phone, email, preferredDate, timeSlot, timestamp: new Date() }
  });
});

app.post('/api/appraisals/book', (req, res) => {
  const { propertyAddress, propertyType, purpose, ownerName, phone, email } = req.body;
  if (!propertyAddress || !ownerName || !phone) {
    return res.status(400).json({ success: false, error: 'Address, owner name, and phone are required.' });
  }
  const ref = `APP-${Math.floor(100000 + Math.random() * 900000)}`;
  res.status(201).json({
    success: true,
    appraisalRef: ref,
    message: 'Appraisal request submitted. Our senior valuer will contact you within 24 hours.',
    data: { propertyAddress, propertyType, purpose, ownerName, phone, email, timestamp: new Date() }
  });
});

app.post('/api/contact', (req, res) => {
  const { name, email, phone, serviceInterested, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'Name, email, and message are required.' });
  }
  res.status(201).json({
    success: true,
    message: 'Thank you for reaching out to Seventh Sky Property Care. We will reply promptly.',
    data: { name, email, phone, serviceInterested, timestamp: new Date() }
  });
});

// 4. Portal Logins
app.post('/api/auth/client-login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required.' });
  }
  res.json({
    success: true,
    token: 'mock-jwt-client-token-7thsky',
    user: {
      id: 'usr-client-01',
      name: 'Kazi Mahfuzur Rahman',
      email,
      role: 'landlord_client',
      portfolioCount: 2
    }
  });
});

app.post('/api/auth/provider-login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required.' });
  }
  res.json({
    success: true,
    token: 'mock-jwt-provider-token-7thsky',
    user: {
      id: 'usr-prov-01',
      name: 'Apex Facilities & Engineering',
      email,
      role: 'service_provider',
      activeWorkOrders: 4
    }
  });
});

// 5. Testimonials, FAQs, Company Info
app.get('/api/testimonials', (req, res) => res.json({ success: true, data: MOCK_TESTIMONIALS }));
app.get('/api/faqs', (req, res) => res.json({ success: true, data: MOCK_FAQS }));
app.get('/api/company-info', (req, res) => res.json({ success: true, data: COMPANY_INFO }));

// 6. Docs
app.get('/api/docs', (req, res) => {
  res.json({
    routes: [
      { method: 'GET', path: '/api/properties', queryParams: ['purpose', 'category', 'query', 'featured'] },
      { method: 'GET', path: '/api/properties/:id', description: 'Upstate-style detail with gallery, video, floorplan' },
      { method: 'GET', path: '/api/services', description: 'Categorized services with 10-15 word hover texts' },
      { method: 'GET', path: '/api/services/:categoryId' },
      { method: 'POST', path: '/api/enquiries', body: ['propertyId', 'propertyCode', 'name', 'email', 'phone', 'message'] },
      { method: 'POST', path: '/api/inspections/book', body: ['propertyCode', 'name', 'phone', 'timeSlot'] },
      { method: 'POST', path: '/api/appraisals/book', body: ['propertyAddress', 'propertyType', 'purpose', 'ownerName', 'phone'] },
      { method: 'POST', path: '/api/contact', body: ['name', 'email', 'phone', 'message'] },
      { method: 'POST', path: '/api/auth/client-login', body: ['email', 'password'] },
      { method: 'POST', path: '/api/auth/provider-login', body: ['email', 'password'] },
      { method: 'GET', path: '/api/testimonials' },
      { method: 'GET', path: '/api/faqs' },
      { method: 'GET', path: '/api/company-info' }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`[7thSky Mock Server] Running at http://localhost:${PORT}`);
  console.log(`[7thSky Mock Server] Endpoints Catalog: http://localhost:${PORT}/api/docs`);
});
