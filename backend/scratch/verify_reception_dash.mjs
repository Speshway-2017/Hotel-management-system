async function testReceptionistDashboard() {
  try {
    // 1. Login as receptionist
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'receptionist@hourstay.com',
        password: 'password123'
      })
    });
    const loginData = await loginRes.json();
    console.log('Login response:', loginData);
    const token = loginData.token || loginData.data?.token;
    console.log('Receptionist login successful. Token acquired:', token?.slice(0, 20));

    // 2. Fetch dashboard
    const dashRes = await fetch('http://localhost:5000/api/receptionist/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dashData = await dashRes.json();
    console.log('Full dashData keys:', Object.keys(dashData), dashData);
    console.log('Today Stats:', dashData.todayStats || dashData.data?.todayStats);
    
    const arrivals = dashData.arrivals || dashData.data?.arrivals || [];
    const departures = dashData.departures || dashData.data?.departures || [];

    console.log(`\n--- Today's Arrivals (${arrivals.length}) ---`);
    arrivals.forEach((a, i) => {
      console.log(`${i+1}. [${a.status}] ${a.guestName || a.guest?.name || a.guest} - Room ${a.roomNumber || a.room?.roomNumber || a.room} - CheckIn: ${a.checkInDate || a.checkIn} - ID: ${a.bookingId || a.bookingNumber || a._id}`);
    });

    console.log(`\n--- Today's Departures (${departures.length}) ---`);
    departures.forEach((d, i) => {
      console.log(`${i+1}. [${d.status}] ${d.guestName || d.guest?.name || d.guest} - Room ${d.roomNumber || d.room?.roomNumber || d.room} - CheckOut: ${d.checkOutDate || d.checkOut} - ID: ${d.bookingId || d.bookingNumber || d._id}`);
    });

  } catch (err) {
    console.error('Error testing dashboard:', err.response?.data || err.message);
  }
}

testReceptionistDashboard();
