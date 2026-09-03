import http from 'http';

async function testReceptionist() {
  // Login as receptionist (or admin)
  const loginData = JSON.stringify({ email: 'poojitha@hotel.com', password: 'password123' });

  const loginReq = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('Login status:', res.statusCode);
      const parsed = JSON.parse(body);
      const token = parsed.data?.token || parsed.token;
      console.log('Got token for user:', parsed.data?.user?.name, 'Role:', parsed.data?.user?.role, 'PropertyId:', parsed.data?.user?.propertyId);

      // Now query /api/receptionist/dashboard
      fetchEndpoint('/api/receptionist/dashboard', token, (dashData) => {
        console.log('\n--- DASHBOARD DATA ---');
        console.log('Arrivals count:', dashData.data?.arrivals?.length);
        console.log('Arrivals:', JSON.stringify(dashData.data?.arrivals, null, 2));
        console.log('Departures count:', dashData.data?.departures?.length);
        console.log('Departures:', JSON.stringify(dashData.data?.departures, null, 2));
      });

      // Now query /api/receptionist/reservations
      fetchEndpoint('/api/receptionist/reservations', token, (resData) => {
        console.log('\n--- RESERVATIONS DATA ---');
        console.log('Total reservations:', resData.data?.length);
        if (resData.data) {
          resData.data.forEach(r => console.log('Booking:', r.bookingId || r.id, '|', r.guest, '| Room:', r.room, '| Status:', r.status));
        }
      });

      // Now query /api/receptionist/guests
      fetchEndpoint('/api/receptionist/guests', token, (guestData) => {
        console.log('\n--- IN-HOUSE GUESTS DATA ---');
        console.log('Total in-house guests:', guestData.data?.length);
        if (guestData.data) {
          guestData.data.forEach(g => console.log('Guest:', g.name, '| Room:', g.room, '| Status:', g.status, '| Balance:', g.balance));
        }
      });
    });
  });

  loginReq.write(loginData);
  loginReq.end();
}

function fetchEndpoint(path, token, cb) {
  const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        cb(parsed);
      } catch (e) {
        console.error('Error parsing response for', path, e, body);
      }
    });
  });
  req.end();
}

testReceptionist();
