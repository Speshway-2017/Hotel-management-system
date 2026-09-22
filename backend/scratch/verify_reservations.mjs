async function testReceptionistReservations() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'receptionist@hourstay.com',
        password: 'password123'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.token || loginData.token;

    const res = await fetch('http://localhost:5000/api/receptionist/reservations', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const json = await res.json();
    console.log(`Total Reservations from API: ${json.data?.length}`);
    json.data.slice(0, 10).forEach(b => {
      console.log(`- ${b.id} | ${b.name} | Room: ${b.room} | In: ${b.checkIn} | Out: ${b.checkOut} | Status: ${b.status}`);
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

testReceptionistReservations();
