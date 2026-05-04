const axios = require('axios');

async function testFrontendFlow() {
  try {
    console.log('Logging in...');
    const loginRes = await axios.post('http://127.0.0.1:5000/api/auth/login', {
      email: process.env.TEST_ADMIN_EMAIL,
      password: process.env.TEST_ADMIN_PASSWORD
    });
    const token = loginRes.data.token;
    console.log('Login successful. Token acquired.');

    console.log('Fetching dashboard stats...');
    const statsRes = await axios.get('http://127.0.0.1:5000/api/dashboard/stats?branchId=all', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Dashboard Stats:', statsRes.data);
  } catch(e) {
    if (e.response) {
      console.error('API ERROR:', e.response.status, e.response.data);
    } else {
      console.error('NETWORK ERROR:', e.message);
    }
  }
}

testFrontendFlow();
