async function run() {
  try {
    console.log('Logging in as Super Admin...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@hourstay.com',
        password: 'password123'
      })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }
    
    const loginData = await loginRes.json();
    const token = loginData.data?.token || loginData.token;
    if (!token) {
      console.log('Token missing. Login response:', loginData);
      return;
    }
    console.log('Token obtained successfully.');

    const uniqueName = "Test Property " + Math.random().toString(36).substring(2, 7).toUpperCase();
    console.log(`Creating property: ${uniqueName}...`);
    const createRes = await fetch('http://localhost:5000/api/super-admin/properties', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: uniqueName,
        city: "Hyderabad",
        rooms: 35,
        status: "Onboarding",
        adminMode: "create",
        adminName: "Property Admin",
        adminEmail: "propadmin_" + Math.random().toString(36).substring(2, 7) + "@hourstay.com",
        adminPassword: "password123"
      })
    });

    const createData = await createRes.json();
    console.log('Creation response status:', createRes.status);
    console.log('Creation response:', JSON.stringify(createData, null, 2));

    console.log('Fetching properties list...');
    const listRes = await fetch('http://localhost:5000/api/super-admin/properties', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const listData = await listRes.json();
    console.log('Properties count in response:', listData.data?.length || listData.length || 0);
    const found = (listData.data || listData).find(p => p.name === uniqueName);
    console.log('New property found in list?', found ? 'YES' : 'NO');
    if (found) {
      console.log('Found property details:', JSON.stringify(found, null, 2));
    }

  } catch (err) {
    console.error('Test Error:', err);
  }
}

run();
