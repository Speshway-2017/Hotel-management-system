// Node 24 native fetch


async function testFullFeedbackFlow() {
  const API_URL = 'http://localhost:5000';

  // Helper to login
  async function login(email, password) {
    const res = await fetch(API_URL + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    console.log('Login result for ' + email + ':', json.success, json.message, 'Token:', !!(json.data?.token || json.token));
    return json.data?.token || json.token;
  }


  // 1. Login as Surya (guest)
  console.log('1. Logging in as Surya...');
  const guestToken = await login('surya@gmail.com', 'password123');
  console.log('Guest token obtained:', !!guestToken);

  // 2. Submit feedback as Surya
  console.log('2. Submitting feedback as Surya...');
  const resFeedback = await fetch(API_URL + '/api/v1/guest/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + guestToken
    },
    body: JSON.stringify({
      guestName: 'Surya',
      guestEmail: 'surya@gmail.com',
      guestPhone: '+91 47362 54654',
      room: '103 · Standard Room',
      category: 'Service',
      rating: 5,
      ratings: { cleanliness: 5, staff: 5, amenities: 5, comfort: 5, value: 5 },
      comment: 'Surya: Fantastic hospitality, check-in was seamless and the room was sparkling clean!'
    })
  });
  const feedbackData = await resFeedback.json();
  console.log('Feedback submission result:', feedbackData.success, feedbackData.message);

  // 3. Login as Admin and fetch feedback
  console.log('3. Checking Admin Feedback...');
  const adminToken = await login('admin@hourstay.com', 'password123');
  const resAdmin = await fetch(API_URL + '/api/admin/feedback', {
    headers: { 'Authorization': 'Bearer ' + adminToken }
  });
  const adminData = await resAdmin.json();
  console.log('adminData raw:', JSON.stringify(adminData).substring(0, 200));
  const adminList = adminData.data || [];
  const suryaInAdmin = adminList.find(f => (f.guestName && f.guestName.includes('Surya')) || f.guestEmail === 'surya@gmail.com');
  console.log('Admin feedback count:', adminList.length, '| Found Surya?', !!suryaInAdmin, suryaInAdmin ? (suryaInAdmin.comment || suryaInAdmin.comments) : 'N/A');


  // 4. Login as Manager and fetch feedback
  console.log('4. Checking Manager Feedback...');
  const managerToken = await login('manager@hourstay.com', 'password123');
  const resManager = await fetch(API_URL + '/api/manager/feedback', {
    headers: { 'Authorization': 'Bearer ' + managerToken }
  });
  const managerData = await resManager.json();
  const managerList = managerData.data || [];
  const suryaInManager = managerList.find(f => (f.guestName && f.guestName.includes('Surya')) || f.guestEmail === 'surya@gmail.com');
  console.log('Manager feedback count:', managerList.length, '| Found Surya?', !!suryaInManager, suryaInManager ? (suryaInManager.comment || suryaInManager.comments) : 'N/A');

  // 5. Login as Receptionist and fetch feedback
  console.log('5. Checking Receptionist Feedback...');
  const receptionToken = await login('receptionist@hourstay.com', 'password123');
  const resReception = await fetch(API_URL + '/api/receptionist/feedback', {
    headers: { 'Authorization': 'Bearer ' + receptionToken }
  });
  const receptionData = await resReception.json();
  const receptionList = receptionData.data || [];
  const suryaInReception = receptionList.find(f => (f.guestName && f.guestName.includes('Surya')) || f.guestEmail === 'surya@gmail.com');
  console.log('Receptionist feedback count:', receptionList.length, '| Found Surya?', !!suryaInReception, suryaInReception ? (suryaInReception.comment || suryaInReception.comments) : 'N/A');
}

testFullFeedbackFlow().catch(console.error);
