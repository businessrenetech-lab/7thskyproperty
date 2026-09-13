'use strict';

const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:50001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_12345';

// Create a test staff token
const token = jwt.sign(
  {
    id: 1,
    email: 'admin@seventhskyproperty.com',
    role: 'super_admin',
    branch_id: 1,
  },
  JWT_SECRET,
  { expiresIn: '2h' }
);

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

async function runTests() {
  console.log('Testing Contact CRM Upgrades...');

  try {
    // 1. Test get contact lists
    console.log('1. Testing GET /api/contacts/lists ...');
    const listsRes = await client.get('/contacts/lists');
    console.log('Lists count:', listsRes.data.data.length);
    console.log('Sample lists:', listsRes.data.data.slice(0, 3));

    // 2. Test sample template download
    console.log('2. Testing GET /api/contacts/sample-template ...');
    const templateRes = await client.get('/contacts/sample-template', { responseType: 'arraybuffer' });
    console.log('Template downloaded, bytes:', templateRes.data.length);

    // 3. Test bulk import via JSON
    console.log('3. Testing POST /api/contacts/bulk-import (JSON payload) ...');
    const testContacts = [
      {
        'Full Name': 'Test Lead Alpha',
        'Company Name': 'Alpha Corp',
        'Phone': '+8801700' + Math.floor(100000 + Math.random() * 900000),
        'Email': `lead.alpha.${Date.now()}@example.com`,
        'Contact List': 'VIP Buyers',
        'Lead Status': 'qualified',
        'Looking For': 'buy',
        'Preferred Areas': 'Gulshan 2, Banani',
        'Property Types': 'Luxury Apartment, Penthouse',
        'Budget Min': 40000000,
        'Budget Max': 75000000,
        'Bedrooms Min': 4,
        'Financing Status': 'cash_buyer',
        'Urgency': 'immediate',
        'Lead Notes': 'Prefers lake-facing south orientation.',
      },
      {
        'Full Name': 'Test Lead Beta',
        'Phone': '+8801800' + Math.floor(100000 + Math.random() * 900000),
        'Email': `lead.beta.${Date.now()}@example.com`,
        'Contact List': 'High-Net-Worth Investors',
        'Lead Status': 'new',
        'Looking For': 'invest',
        'Preferred Areas': 'Bashundhara R/A',
        'Property Types': 'Apartment, Plot',
        'Budget Min': 12000000,
        'Budget Max': 20000000,
        'Urgency': '1_3_months',
        'Lead Notes': 'Interested in pre-construction projects.',
      }
    ];

    const importRes = await client.post('/contacts/bulk-import', {
      contacts: testContacts,
      default_contact_list: 'VIP Buyers',
    });
    console.log('Bulk import result:', importRes.data);

    // 4. Test list with contact_list and lead_status filters
    console.log('4. Testing GET /api/contacts?contact_list=VIP Buyers ...');
    const filteredRes = await client.get('/contacts?contact_list=VIP Buyers');
    console.log('Filtered contacts total:', filteredRes.data.pagination.total);
    if (filteredRes.data.data.length > 0) {
      const first = filteredRes.data.data[0];
      console.log('Sample contact:', {
        id: first.id,
        full_name: first.full_name,
        contact_list: first.contact_list,
        lead_status: first.lead_status,
        looking_for: first.looking_for,
        budget_max: first.budget_max,
        created_at: first.created_at,
        updated_at: first.updated_at,
        last_contacted_at: first.last_contacted_at,
      });

      // 5. Test Touch Last Contacted
      console.log('5. Testing POST /api/contacts/:id/touch ...');
      const touchRes = await client.post(`/contacts/${first.id}/touch`);
      console.log('Touch result:', touchRes.data.data.last_contacted_at);

      // 6. Test Edit / Update Contact
      console.log('6. Testing PUT /api/contacts/:id ...');
      const updateRes = await client.put(`/contacts/${first.id}`, {
        lead_status: 'viewing_scheduled',
        budget_max: 80000000,
        lead_notes: 'Updated note: Client confirmed inspection for next Saturday.',
      });
      console.log('Updated contact:', {
        lead_status: updateRes.data.data.lead_status,
        budget_max: updateRes.data.data.budget_max,
        lead_notes: updateRes.data.data.lead_notes,
        updated_at: updateRes.data.data.updated_at,
      });
    }

    console.log('\nAll Contact CRM API tests passed successfully!');
  } catch (err) {
    console.error('Test failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

runTests();
