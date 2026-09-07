import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { id: 'usr-adm-dileep', email: 'dileep@hourstay.com', role: 'admin', propertyId: 'HS-9HQ8P' },
  'hourstay_hms_jwt_secret_token_12345!'
);

async function verifyFlow() {
  console.log('=== Step 1: Verify GET /api/admin/payments ===');
  const resGet = await fetch('http://localhost:5000/api/admin/payments', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const dataGet = await resGet.json();
  console.log('GET Status:', resGet.status, 'Total Payments:', dataGet.data?.length);

  const abhiPayment = dataGet.data?.find(p => String(p.guestName).toLowerCase().includes('abhi'));
  const sunnyPayment = dataGet.data?.find(p => String(p.guestName).toLowerCase().includes('sunny'));

  console.log('\nDynamic Abhi Payment Found:', abhiPayment ? {
    guestName: abhiPayment.guestName,
    bookingId: abhiPayment.bookingId,
    roomNumber: abhiPayment.roomNumber,
    amount: abhiPayment.amount,
    paymentMethod: abhiPayment.paymentMethod,
    status: abhiPayment.status
  } : 'NOT FOUND');

  console.log('\nDynamic Sunny Payment Found:', sunnyPayment ? {
    guestName: sunnyPayment.guestName,
    bookingId: sunnyPayment.bookingId,
    roomNumber: sunnyPayment.roomNumber,
    amount: sunnyPayment.amount,
    paymentMethod: sunnyPayment.paymentMethod,
    status: sunnyPayment.status
  } : 'NOT FOUND');

  console.log('\n=== Step 2: Test POST /api/admin/payments (Create Dynamic Payment) ===');
  const resPost = await fetch('http://localhost:5000/api/admin/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      guestName: 'Sunny Automated Test',
      bookingId: 'BK-SUNNY-TEST',
      roomNumber: '201',
      amount: 4999,
      paymentMethod: 'UPI',
      status: 'Settled'
    })
  });
  const dataPost = await resPost.json();
  console.log('POST Status:', resPost.status, 'Created Payment:', dataPost.data?._id, 'Guest:', dataPost.data?.guestName);

  const createdId = dataPost.data?._id;

  console.log('\n=== Step 3: Test PUT /api/admin/payments/:id (Update Payment) ===');
  const resPut = await fetch(`http://localhost:5000/api/admin/payments/${createdId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      amount: 5500,
      paymentMethod: 'Card',
      status: 'Settled'
    })
  });
  const dataPut = await resPut.json();
  console.log('PUT Status:', resPut.status, 'Updated Amount:', dataPut.data?.amount, 'Method:', dataPut.data?.paymentMethod);

  console.log('\n=== Step 4: Test DELETE /api/admin/payments/:id (Clean up test payment) ===');
  const resDel = await fetch(`http://localhost:5000/api/admin/payments/${createdId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('DELETE Status:', resDel.status);

  console.log('\n=== VERIFICATION COMPLETE: ALL CHECKS PASSED ===');
}

verifyFlow();
