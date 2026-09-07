import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from '../config/db.config.js';
import app from '../app.js';
import http from 'http';
import jwt from 'jsonwebtoken';

async function testExpressUpdate() {
  await connectDB();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5099, resolve));
  console.log('Test server running on port 5099');

  const tokenAdmin = jwt.sign(
    { id: '6a7d98a915abe6fb220216d0', email: 'admin@hourstay.com', role: 'admin', propertyId: 'HS-JAI' },
    'hourstay_hms_jwt_secret_token_12345!'
  );

  const cleanStaff = [
    { id: '83emngc4opx', name: 'Poojitha', role: 'receptionist' },
    { id: 'adm-jai-rathore', name: 'Vikram Rathore', role: 'admin' },
    { id: '6a7d98a915abe6fb220216d0', name: 'Hotel Admin', role: 'admin' },
    { id: 'nuvn636ba6c', name: 'Test Receptionist New', role: 'receptionist' },
    { id: 'lfir6yhyu3b', name: 'Meghana', role: 'manager' }
  ];

  for (const s of cleanStaff) {
    const putRes = await fetch(`http://localhost:5099/api/admin/staff/${s.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + tokenAdmin
      },
      body: JSON.stringify({
        name: s.name,
        role: s.role,
        mobile: '9888888888',
        status: 'Active',
        dept: 'Front Desk',
        shift: 'Morning (06:00 - 14:00)'
      })
    });
    const putData = await putRes.json();
    console.log(`Cleaned ${s.name} (${s.id}) =>`, putRes.status, putData.success);
  }

  server.close();
  process.exit(0);
}

testExpressUpdate();
