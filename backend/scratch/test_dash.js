import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

async function test() {
  // Login as receptionist
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'receptionist@hourstay.com', password: 'password123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.token;
  if (!token) {
    console.error('Failed to log in:', loginData);
    process.exit(1);
  }

  const resRes = await fetch('http://localhost:5000/api/receptionist/reservations', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const resData = await resRes.json();
  console.log('Receptionist Reservations Response:');
  console.log('- Total Reservations:', resData.data?.length);
  console.log('- Reservations Details:', resData.data?.map(r => `${r.name} (${r.checkIn} to ${r.checkOut} - ${r.status})`));
  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
