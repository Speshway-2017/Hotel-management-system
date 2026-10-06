import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function testGetBookings() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Im5oYjl0ZDQ1dmFzIiwiaWF0IjoxNzkxMjg2NDM2LCJleHAiOjE3OTM4Nzg0MzZ9.8A8P6LhRCNkYcP9hWz42LBJT2ZSw6pzIxuQlXZUSW5I';
  const res = await fetch('http://localhost:5000/api/v1/guest/bookings', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  console.log('GET /guest/bookings status:', res.status);
  console.log('Bookings for Sunny:');
  if (data.data) {
    data.data.forEach(b => console.log({
      bookingId: b.bookingId,
      guest: b.guest,
      room: b.room,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      dates: b.dates,
      status: b.status,
      createdAt: b.createdAt
    }));
  } else {
    console.log(data);
  }
}
testGetBookings();
