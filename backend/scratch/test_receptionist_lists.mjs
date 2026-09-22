import http from 'http';

async function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function testReceptionistLists() {
  // 1. Login Receptionist
  const loginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'reception@hourstay.com', password: 'password123' });

  let token = loginRes.body?.data?.token || loginRes.body?.token;
  if (!token) {
    // Try manager/admin
    const mgrRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'meghana@hourstay.com', password: 'password123' });
    token = mgrRes.body?.data?.token || mgrRes.body?.token;
  }

  console.log('Login Token retrieved:', !!token);

  // 2. Test Arrivals
  const arrivalsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/receptionist/arrivals',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('\n--- GET /api/receptionist/arrivals ---');
  console.log('Status:', arrivalsRes.status, 'Total arrivals today:', arrivalsRes.body?.data?.length);
  arrivalsRes.body?.data?.forEach((a, i) => {
    console.log(`${i+1}. [${a.status}] ${a.name} - Room: ${a.room} (${a.type}) - CheckIn: ${a.checkIn} - CheckOut: ${a.checkOut}`);
  });

  // 3. Test Departures
  const departuresRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/receptionist/departures',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('\n--- GET /api/receptionist/departures ---');
  console.log('Status:', departuresRes.status, 'Total departures today:', departuresRes.body?.data?.length);
  departuresRes.body?.data?.forEach((d, i) => {
    console.log(`${i+1}. [${d.status}] ${d.name} - Room: ${d.room} (${d.type}) - CheckOut: ${d.checkOut}`);
  });

  // 4. Test In-House Guests
  const guestsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/receptionist/guests',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('\n--- GET /api/receptionist/guests ---');
  console.log('Status:', guestsRes.status, 'Total in-house guests:', guestsRes.body?.data?.length);
  guestsRes.body?.data?.forEach((g, i) => {
    console.log(`${i+1}. [${g.status}] ${g.name} - Room: ${g.room} (${g.roomType}) - CheckIn: ${g.checkIn} → ${g.checkOut}`);
  });
}

testReceptionistLists();
