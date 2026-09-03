import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { id: 'usr-adm-dileep', email: 'dileep@hourstay.com', role: 'admin', propertyId: 'HS-9HQ8P' },
  'hourstay_hms_jwt_secret_token_12345!'
);

async function testPayments() {
  try {
    console.log('Testing GET http://localhost:5000/api/admin/payments ...');
    const resAdmin = await fetch('http://localhost:5000/api/admin/payments', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Admin Payments HTTP Status:', resAdmin.status);
    const dataAdmin = await resAdmin.json();
    console.log('Admin Payments Response:', JSON.stringify(dataAdmin, null, 2));

    console.log('\nTesting GET http://localhost:5000/api/manager/payments ...');
    const resMgr = await fetch('http://localhost:5000/api/manager/payments', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Manager Payments HTTP Status:', resMgr.status);
    const dataMgr = await resMgr.json();
    console.log('Manager Payments count:', dataMgr.data?.length);

  } catch (err) {
    console.error('API Test Error:', err);
  }
}

testPayments();
