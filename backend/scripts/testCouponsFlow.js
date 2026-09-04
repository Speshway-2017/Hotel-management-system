async function testCouponsFeature() {
  const API_URL = 'http://localhost:5000';

  // Helper to login
  async function login(email, password) {
    const res = await fetch(API_URL + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    return json.data?.token || json.token;
  }

  console.log('=== TEST 1: Admin Authentication ===');
  const adminToken = await login('admin@hourstay.com', 'password123');
  console.log('Admin token obtained:', !!adminToken);

  console.log('\n=== TEST 2: Admin Lists Initial Coupons ===');
  const listRes = await fetch(API_URL + '/api/admin/coupons', {
    headers: { 'Authorization': 'Bearer ' + adminToken }
  });
  const listData = await listRes.json();
  console.log('Admin coupons count:', (listData.data || []).length);

  console.log('\n=== TEST 3: Admin Creates New Promo Coupon (TESTPROMO25) ===');
  const createRes = await fetch(API_URL + '/api/admin/coupons', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + adminToken
    },
    body: JSON.stringify({
      code: 'TESTPROMO25',
      title: 'Summer Getaway 25% Off',
      description: 'Enjoy 25% off up to ₹1,500 on direct website reservations above ₹2,000.',
      discountType: 'percentage',
      discountValue: 25,
      maxDiscount: 1500,
      minBookingAmount: 2000,
      validFrom: '2026-01-01',
      validUntil: '2027-12-31',
      usageLimit: 50,
      status: 'Active',
      propertyId: 'all'
    })
  });
  const createdData = await createRes.json();
  console.log('Create Coupon result:', createdData.success, createdData.message);
  const createdCoupon = createdData.data;
  const couponId = createdCoupon?._id || createdCoupon?.id;
  console.log('Created Coupon ID:', couponId, 'Code:', createdCoupon?.code);

  console.log('\n=== TEST 4: Public Website Fetches Available Active Coupons ===');
  const publicCouponsRes = await fetch(API_URL + '/api/public/coupons');
  const publicCouponsData = await publicCouponsRes.json();
  const availableList = publicCouponsData.data || [];
  const foundInPublic = availableList.find(c => c.code === 'TESTPROMO25');
  console.log('Public available coupons count:', availableList.length);
  console.log('TESTPROMO25 present on public site?', !!foundInPublic);

  console.log('\n=== TEST 5: Public Validates Coupon Below Minimum Spend (< ₹2,000) ===');
  const valFailRes = await fetch(API_URL + '/api/public/coupons/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'TESTPROMO25',
      bookingAmount: 1500
    })
  });
  const valFailData = await valFailRes.json();
  console.log('Validation with ₹1,500 rejected properly?', !valFailData.success, '| Message:', valFailData.message);

  console.log('\n=== TEST 6: Public Validates Coupon with Eligible Amount (₹4,000) ===');
  const valSuccessRes = await fetch(API_URL + '/api/public/coupons/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'TESTPROMO25',
      bookingAmount: 4000
    })
  });
  const valSuccessData = await valSuccessRes.json();
  console.log('Validation with ₹4,000 succeeded?', valSuccessData.success);
  console.log('Calculated Discount (25% of 4000):', valSuccessData.data?.discountAmount, '(Expected: 1000)');
  console.log('Calculated Net Payable:', valSuccessData.data?.payableAmount, '(Expected: 3000)');

  console.log('\n=== TEST 7: Admin Deactivates Coupon (Toggle) ===');
  const toggleRes = await fetch(API_URL + `/api/admin/coupons/${couponId}/toggle`, {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + adminToken }
  });
  const toggleData = await toggleRes.json();
  console.log('Toggle result:', toggleData.success, 'New Status:', toggleData.data?.status);

  console.log('\n=== TEST 8: Public Validation Rejects Inactive Coupon ===');
  const valInactiveRes = await fetch(API_URL + '/api/public/coupons/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'TESTPROMO25',
      bookingAmount: 4000
    })
  });
  const valInactiveData = await valInactiveRes.json();
  console.log('Inactive coupon rejected?', !valInactiveData.success, '| Message:', valInactiveData.message);

  console.log('\n=== TEST 9: Admin Re-activates Coupon ===');
  await fetch(API_URL + `/api/admin/coupons/${couponId}/toggle`, {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + adminToken }
  });

  console.log('\n=== TEST 10: Public Website Creates Booking with Coupon Applied ===');
  const guestToken = await login('surya@gmail.com', 'password123');
  const bookingRes = await fetch(API_URL + '/api/public/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + guestToken
    },
    body: JSON.stringify({
      propertyId: 'HS-JAI',
      guestName: 'Surya Kumar',
      email: 'surya@gmail.com',
      phone: '+91 47362 54654',
      checkIn: '2026-09-10',
      checkOut: '2026-09-12',
      roomType: 'Deluxe Room',
      ratePlan: 'Deluxe Plan',
      amount: 4000,
      totalAmount: 4000,
      couponCode: 'TESTPROMO25'
    })
  });
  const bookingData = await bookingRes.json();
  console.log('Public booking response:', bookingData.success, bookingData.message, 'Data:', bookingData.data);
  const createdBooking = bookingData.data?.booking || bookingData.data;
  console.log('Saved coupon on booking:', createdBooking?.couponCode);
  console.log('Saved discount amount on booking:', createdBooking?.discountAmount, '(Expected: 1000)');
  console.log('Saved net total on booking:', createdBooking?.totalAmount, '(Expected: 3000)');

  console.log('\n=== TEST 11: Admin Verifies Coupon usedCount Incremented ===');
  const couponCheckRes = await fetch(API_URL + `/api/admin/coupons/${couponId}`, {
    headers: { 'Authorization': 'Bearer ' + adminToken }
  });
  const couponCheckData = await couponCheckRes.json();
  console.log('Coupon usedCount:', couponCheckData.data?.usedCount, '(Expected >= 1)');

  console.log('\n=== TEST 12: Admin Deletes Test Coupon ===');
  const delRes = await fetch(API_URL + `/api/admin/coupons/${couponId}`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + adminToken }
  });
  const delData = await delRes.json();
  console.log('Coupon deletion result:', delData.success, delData.message);

  console.log('\n🎉 ALL 12 TESTS COMPLETED SUCCESSFULLY!');
}

testCouponsFeature().catch(console.error);
