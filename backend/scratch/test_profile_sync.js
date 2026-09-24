import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testProfileSync() {
  const secret = process.env.JWT_SECRET || 'secret123';
  const token = jwt.sign({ id: 'nhb9td45vas', email: 'sunny@gmail.com' }, secret, { expiresIn: '1h' });

  console.log('--- 1. Testing PUT /api/auth/profile ---');
  const updateRes = await fetch('http://localhost:5000/api/auth/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Sunny Kumar Verma',
      mobile: '+91 98765 43210',
      city: 'Mumbai',
      address: 'Bandra West, Mumbai, Maharashtra'
    })
  });
  const updateData = await updateRes.json();
  console.log('PUT /profile Response:', updateData);

  console.log('\n--- 2. Testing GET /api/auth/profile ---');
  const getRes = await fetch('http://localhost:5000/api/auth/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const getData = await getRes.json();
  console.log('GET /profile Response:', getData);

  console.log('\n--- 3. Testing Manager GET /api/manager/guests ---');
  const mgrToken = jwt.sign({ id: 'mgr-id', email: 'manager@hourstay.com', role: 'manager', propertyId: 'HS-JAI' }, secret, { expiresIn: '1h' });
  const mgrRes = await fetch('http://localhost:5000/api/manager/guests', {
    headers: { 'Authorization': `Bearer ${mgrToken}` }
  });
  const mgrData = await mgrRes.json();
  const mgrSunny = (Array.isArray(mgrData?.data) ? mgrData.data : Object.values(mgrData?.data || {})).find(g => (g.email === 'sunny@gmail.com' || (g.name && g.name.includes('Sunny'))));
  console.log('Manager CRM Sunny entry:', mgrSunny);

  console.log('\n--- 4. Testing Super Admin GET /api/super-admin/users ---');
  const adminToken = jwt.sign({ id: 'admin-id', email: 'superadmin@hourstay.com', role: 'super-admin' }, secret, { expiresIn: '1h' });
  const adminRes = await fetch('http://localhost:5000/api/super-admin/users', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const adminData = await adminRes.json();
  const adminSunny = (adminData?.data || []).find(u => u.email === 'sunny@gmail.com');
  console.log('Super Admin users Sunny entry:', adminSunny);
}

testProfileSync().catch(console.error);
