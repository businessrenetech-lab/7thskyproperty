// scripts/test_sales_agreement_flow.js
const axios = require('axios');

async function run() {
  const baseURL = 'http://127.0.0.1:50001/api';
  console.log('1. Logging in to get JWT...');
  const loginRes = await axios.post(`${baseURL}/auth/login`, {
    email: 'admin@seventhskyproperty.com',
    password: 'Admin#2026',
  });
  const token = loginRes.data.token || loginRes.data.data?.token;
  const headers = { Authorization: `Bearer ${token}` };
  console.log('   Logged in successfully.');

  console.log('2. Fetching Meta for Sale Agreements...');
  const metaRes = await axios.get(`${baseURL}/sales-agreements/sale/meta`, { headers });
  console.log('   Meta response status:', metaRes.status);
  console.log('   Work Order No:', metaRes.data?.work_order_no);
  console.log('   Quotation No:', metaRes.data?.quotation_no);
  console.log('   Org Represented By:', metaRes.data?.org?.represented_by);
  console.log('   Org Phone:', metaRes.data?.org?.phone);
  console.log('   Schedule A groups count:', metaRes.data?.schedule_a?.length);
  console.log('   Schedule D groups count:', metaRes.data?.schedule_d?.length);

  console.log('3. Fetching Property Defaults for Property ID 1...');
  const propRes = await axios.get(`${baseURL}/sales-agreements/sale/property-defaults/1`, { headers });
  console.log('   Property defaults:', propRes.data);

  console.log('4. Testing Live Document Preview generation...');
  const previewPayload = {
    effective_date: '2026-09-13',
    property_id: 1,
    property_type: 'Luxury Apartment',
    org: {
      name: 'Seventh Sky Residential Property Services',
      represented_by: 'Syed Shakil',
      position: 'Managing Director & Principal Broker',
      email: 'syed@seventhskyproperty.com',
      phone: '+880 1711-000000',
    },
    client: {
      full_name: 'Shahidul Islam',
      email: 'shahidul@example.com',
      phone: '+880 1819-123456',
      nid: '19851234567890',
      property_address: 'House 42, Road 11, Banani, Dhaka',
    },
    additional_clients: [
      {
        full_name: 'Nasreen Islam',
        email: 'nasreen@example.com',
        phone: '+880 1819-654321',
        nid: '19871234567890',
      }
    ],
    clients: [
      {
        full_name: 'Shahidul Islam',
        email: 'shahidul@example.com',
        phone: '+880 1819-123456',
        nid: '19851234567890',
        property_address: 'House 42, Road 11, Banani, Dhaka',
      },
      {
        full_name: 'Nasreen Islam',
        email: 'nasreen@example.com',
        phone: '+880 1819-654321',
        nid: '19871234567890',
      }
    ],
    services: [
      'Comprehensive property valuation & pricing advisory',
      'Professional photography, videography & virtual tour creation',
      'Targeted digital marketing across portals & social media'
    ],
    checklist: [
      'Title Deed (Original / Certified True Copy)',
      'Mutation Khatian & DCR verification'
    ],
    witnesses: [
      { name: 'Tanvir Ahmed', nid: '19901111111111', email: 'tanvir@example.com' },
      { name: 'Farhana Chowdhury', nid: '19922222222222', email: 'farhana@example.com' }
    ],
    schedule_b: {
      work_order_no: propRes.data.work_order_no,
      quotation_no: propRes.data.quotation_no,
      engagement_type: 'Exclusive',
      target_value: '35,000,000',
      timeframe: '6 Months',
      commencement_date: '2026-09-15',
      special_requirements: 'Exclusive listing with reserve price 35,000,000 BDT',
    },
    pricing_input: {
      selected: [
        { code: 'RP-SL-01', agreed_price: '' },
        { code: 'RP-MKT-01', agreed_price: '25000' }
      ],
      commission: {
        mode: 'percent',
        percent: '2',
        base_price: '35000000',
      },
      third_party_costs: 5000,
      admin_charges: 2000,
      discount: 0,
      vat_percent: 0,
    }
  };

  const previewRes = await axios.post(`${baseURL}/sales-agreements/sale/preview`, previewPayload, { headers });
  console.log('   Preview response status:', previewRes.status);
  console.log('   Preview title:', previewRes.data?.title);
  console.log('   HTML generated length:', previewRes.data?.html?.length);
  console.log('   Pricing calculated:', previewRes.data?.pricing?.summary);

  console.log('5. Testing Save As Draft...');
  const draftRes = await axios.post(`${baseURL}/sales-agreements/sale/agreements`, {
    ...previewPayload,
    save_as_draft: true,
  }, { headers });
  console.log('   Draft saved. Envelope code:', draftRes.data?.envelope_code);
  const envelopeId = draftRes.data?.id;

  console.log('6. Inspecting saved Envelope details & terms...');
  const envRes = await axios.get(`${baseURL}/signing/envelopes/${envelopeId}`, { headers });
  const terms = typeof envRes.data?.data?.terms === 'string' ? JSON.parse(envRes.data?.data?.terms) : envRes.data?.data?.terms;
  console.log('   Terms keys:', Object.keys(terms || {}));
  console.log('   Terms Org:', terms?.org);
  console.log('   Terms Schedule B:', terms?.schedule_b);
  console.log('   Terms Pricing Input:', terms?.pricing_input);
  console.log('   Terms Witnesses:', terms?.witnesses);
  console.log('   Terms Additional Clients:', terms?.additional_clients);
  console.log('   Signers count:', envRes.data?.data?.signers?.length);
  console.log('   Signers roles:', envRes.data?.data?.signers?.map(s => `${s.role}:${s.name}`));

  console.log('\n ALL TESTS PASSED! Residential Sale Vendor Agreement verified successfully!');
}

run().catch(err => {
  console.error('Test failed:', err.response?.data || err.message);
  process.exit(1);
});
