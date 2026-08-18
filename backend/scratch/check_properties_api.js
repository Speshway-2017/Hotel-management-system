// Native fetch used

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
    console.log('Login successful. Token obtained:', token ? 'YES' : 'NO');
    
    if (!token) {
      console.log('Full login response:', JSON.stringify(loginData, null, 2));
      return;
    }

    console.log('Fetching properties list from API...');
    const propRes = await fetch('http://localhost:5000/api/super-admin/properties', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!propRes.ok) {
      throw new Error(`Get properties failed with status ${propRes.status}`);
    }

    const propData = await propRes.json();
    console.log('Properties count in response:', propData.data?.length || propData.length || 0);
    console.log('Properties data:');
    console.log(JSON.stringify(propData, null, 2));

  } catch (err) {
    console.error('API Check Error:', err);
  }
}

run();
