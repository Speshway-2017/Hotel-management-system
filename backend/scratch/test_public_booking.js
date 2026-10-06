import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function testBooking() {
  const payload = {
    propertyId: 'HS-9HQ8P',
    roomId: '6a9e761493090ab5f48b4d10',
    roomNumber: '203',
    room: 'Deluxe Room',
    roomType: 'Deluxe Room',
    guest: 'Sunny',
    guestName: 'Sunny',
    email: 'sunny@gmail.com',
    phone: '+91 98480 22338',
    checkIn: '2026-10-07',
    checkInDate: '2026-10-07',
    checkOut: '2026-10-08',
    checkOutDate: '2026-10-08',
    stayType: 'overnight',
    nights: 1,
    adults: 2,
    children: 0,
    roomsCount: 1,
    amount: 3540,
    totalAmount: 3540,
    specialRequests: ''
  };

  try {
    const res = await fetch('http://localhost:5000/api/v1/public/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('Response status:', res.status);
    console.log('Response body:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}
testBooking();
