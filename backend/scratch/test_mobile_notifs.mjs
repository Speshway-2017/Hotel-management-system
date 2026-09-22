import dotenv from 'dotenv';
dotenv.config();

async function testMobileNotificationAPIs() {
  try {
    // 1. Manager Login
    const mgrRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'meghana@hourstay.com',
        password: 'password123'
      })
    });
    const mgrData = await mgrRes.json();
    const mgrToken = mgrData.token || mgrData.data?.token;
    console.log('Manager Login:', mgrData.success, 'Token:', mgrToken?.slice(0, 15));

    if (mgrToken) {
      const res1 = await fetch('http://localhost:5000/api/manager/notifications', {
        headers: { Authorization: `Bearer ${mgrToken}` }
      });
      const data1 = await res1.json();
      console.log('GET /api/manager/notifications ->', data1.success, 'isList:', Array.isArray(data1.data), 'length:', data1.data?.length);
      console.log('Sample manager notif:', data1.data?.[0]);

      const resGlobal = await fetch('http://localhost:5000/api/notifications', {
        headers: { Authorization: `Bearer ${mgrToken}` }
      });
      const dataGlobal = await resGlobal.json();
      console.log('GET /api/notifications (as manager) ->', dataGlobal.success, 'isList:', Array.isArray(dataGlobal.data), 'length:', dataGlobal.data?.length);
    }

    // 2. Guest Login (Sunny)
    const guestRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'sunny@gmail.com',
        password: 'password123'
      })
    });
    const guestData = await guestRes.json();
    const guestToken = guestData.token || guestData.data?.token;
    console.log('\nGuest (Sunny) Login:', guestData.success, 'Token:', guestToken?.slice(0, 15));

    if (guestToken) {
      const res2 = await fetch('http://localhost:5000/api/guest/notifications', {
        headers: { Authorization: `Bearer ${guestToken}` }
      });
      const data2 = await res2.json();
      console.log('GET /api/guest/notifications status:', res2.status, 'body:', data2);
      console.log('GET /api/guest/notifications ->', data2.success, 'isList:', Array.isArray(data2.data), 'length:', data2.data?.length);
      console.log('Sample guest notif:', data2.data?.[0]);

      const resGlobalG = await fetch('http://localhost:5000/api/notifications', {
        headers: { Authorization: `Bearer ${guestToken}` }
      });
      const dataGlobalG = await resGlobalG.json();
      console.log('GET /api/notifications (as guest) ->', dataGlobalG.success, 'isList:', Array.isArray(dataGlobalG.data), 'length:', dataGlobalG.data?.length);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testMobileNotificationAPIs();
