import dotenv from 'dotenv';
dotenv.config();

async function testFeedbackEndpoints() {
  const login = async (email, password) => {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    return json.data?.token || json.token;
  };

  const adminToken = await login('admin@hourstay.com', 'password123');
  const managerToken = await login('manager@hourstay.com', 'password123');
  const receptionistToken = await login('receptionist@hourstay.com', 'password123');

  console.log('Admin logged in:', !!adminToken);
  console.log('Manager logged in:', !!managerToken);
  console.log('Receptionist logged in:', !!receptionistToken);

  const fetchFeedback = async (url, token, roleName) => {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    const data = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
    console.log(`[${roleName}] status:`, res.status, `count:`, data.length);
    const hasFB = data.some(i => i.guestName?.includes('Surya Test Feedback'));
    const hasRev = data.some(i => i.guestName?.includes('Surya Test Review'));
    console.log(`[${roleName}] Contains Feedback model item:`, hasFB, `| Contains Review model item:`, hasRev);
    return hasFB && hasRev;
  };

  const adminOk = await fetchFeedback('http://localhost:5000/api/admin/feedback', adminToken, 'ADMIN');
  const managerOk = await fetchFeedback('http://localhost:5000/api/manager/feedback', managerToken, 'MANAGER');
  const receptionOk = await fetchFeedback('http://localhost:5000/api/receptionist/feedback', receptionistToken, 'RECEPTIONIST');

  if (adminOk && managerOk && receptionOk) {
    console.log('\n ALL 3 ROLES (Admin, Manager, Receptionist) successfully fetch both Feedback and Review models!');
  } else {
    console.error('\n❌ Verification failed for one or more roles.');
  }

  process.exit(0);
}

testFeedbackEndpoints().catch(err => {
  console.error('Error testing endpoints:', err);
  process.exit(1);
});
