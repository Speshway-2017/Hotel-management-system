import http from 'http';

async function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function run() {
  console.log('--- Testing Guest Authentication & Notification Endpoints ---');
  // 1. Guest Login
  const guestLoginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'sunny@gmail.com', password: 'password123' });

  const guestToken = guestLoginRes.body?.data?.token;
  console.log('Guest Login Success:', guestLoginRes.body?.success, 'User ID:', guestLoginRes.body?.data?.user?.id || guestLoginRes.body?.data?.user?._id);

  if (guestToken) {
    // 2. Guest GET notifications
    const getNotifRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/guest/notifications',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${guestToken}` }
    });
    console.log('GET /api/guest/notifications:', getNotifRes.status, 'Items count:', getNotifRes.body?.data?.length);

    // 3. Guest unread-count
    const unreadRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/guest/notifications/unread-count',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${guestToken}` }
    });
    console.log('GET /api/guest/notifications/unread-count:', unreadRes.status, unreadRes.body);

    const firstNotif = getNotifRes.body?.data?.[0];
    if (firstNotif) {
      const notifId = firstNotif._id || firstNotif.id;
      // 4. Mark unread
      const unreadToggle = await request({
        hostname: 'localhost',
        port: 5000,
        path: `/api/guest/notifications/${notifId}/unread`,
        method: 'POST',
        headers: { 'Authorization': `Bearer ${guestToken}`, 'Content-Type': 'application/json' }
      }, { title: firstNotif.title, message: firstNotif.message });
      console.log(`POST /api/guest/notifications/${notifId}/unread:`, unreadToggle.status, unreadToggle.body?.success);

      // 5. Mark read
      const readToggle = await request({
        hostname: 'localhost',
        port: 5000,
        path: `/api/guest/notifications/${notifId}/read`,
        method: 'POST',
        headers: { 'Authorization': `Bearer ${guestToken}`, 'Content-Type': 'application/json' }
      }, { title: firstNotif.title, message: firstNotif.message });
      console.log(`POST /api/guest/notifications/${notifId}/read:`, readToggle.status, readToggle.body?.success);
    }

    // 6. Mark All Read
    const readAllRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/guest/notifications/read-all',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${guestToken}` }
    });
    console.log('POST /api/guest/notifications/read-all:', readAllRes.status, readAllRes.body?.success);
  }

  console.log('\n--- Testing Manager Authentication & Notification Endpoints ---');
  // Manager Login
  const mgrLoginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'meghana@hourstay.com', password: 'password123' });

  const mgrToken = mgrLoginRes.body?.data?.token;
  console.log('Manager Login Success:', mgrLoginRes.body?.success);

  if (mgrToken) {
    const mgrNotifRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/manager/notifications',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${mgrToken}` }
    });
    console.log('GET /api/manager/notifications:', mgrNotifRes.status, 'Items count:', mgrNotifRes.body?.data?.length);

    const firstMgrNotif = mgrNotifRes.body?.data?.[0];
    if (firstMgrNotif) {
      const mgrNotifId = firstMgrNotif._id || firstMgrNotif.id;
      const readRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: `/api/manager/notifications/${mgrNotifId}/read`,
        method: 'POST',
        headers: { 'Authorization': `Bearer ${mgrToken}`, 'Content-Type': 'application/json' }
      }, { title: firstMgrNotif.title, message: firstMgrNotif.message });
      console.log(`POST /api/manager/notifications/${mgrNotifId}/read:`, readRes.status, readRes.body?.success);
    }

    const mgrReadAll = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/manager/notifications/read-all',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${mgrToken}` }
    });
    console.log('POST /api/manager/notifications/read-all:', mgrReadAll.status, mgrReadAll.body?.success);
  }
}

run();
