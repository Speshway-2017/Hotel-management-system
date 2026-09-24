import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testProfileSync() {
  const secret = process.env.JWT_SECRET || 'secret123';
  const recToken = jwt.sign({ id: 'rec-id', email: 'receptionist@hourstay.com', role: 'receptionist', propertyId: 'HS-JAI' }, secret, { expiresIn: '1h' });

  console.log('\n--- Testing Receptionist GET /api/receptionist/guests ---');
  const recRes = await fetch('http://localhost:5000/api/receptionist/guests', {
    headers: { 'Authorization': `Bearer ${recToken}` }
  });
  const recData = await recRes.json();
  console.log('Receptionist guests count:', recData?.data?.length);
  const recSunny = (recData?.data || []).find(g => (g.email === 'sunny@gmail.com' || (g.name && g.name.includes('Sunny'))));
  console.log('Receptionist Sunny in-house:', recSunny || 'Not currently staying (as expected)');
}

testProfileSync().catch(console.error);
