import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { SiteLayout } from "@/layouts/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inr } from "@/data/hs-data";
import { publicService } from "@/services/public";
import { authService } from "@/services/auth";

export const Route = {
  head: () => ({
    meta: [
      { title: "Complete your booking — Hour Stay" },
      { name: "description", content: "Review your room, guest details and GST-inclusive total before confirming your Hour Stay booking." }
    ]
  }),
  component: Booking
};

function Booking() {
  const [property, setProperty] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [gstin, setGstin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");

  useEffect(() => {
    // Check if user is authenticated before proceeding with booking
    const isAuthenticated = authService.isAuthenticated();
    if (!isAuthenticated) {
      localStorage.setItem('redirect_after_login', '/booking');
      window.location.href = '/login?redirect=/booking';
      return;
    }

    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      if (currentUser.name) {
        const parts = currentUser.name.split(' ');
        setFirstName(parts[0] || '');
        setLastName(parts.slice(1).join(' ') || '');
      }
      if (currentUser.email) setEmail(currentUser.email);
      if (currentUser.mobile) setPhone(currentUser.mobile);
    }

    const storedRoom = localStorage.getItem('selected_room_data');
    if (storedRoom) {
      try {
        const parsed = JSON.parse(storedRoom);
        setSelectedRoom(parsed);
      } catch (e) {}
    }

    const storedProperty = localStorage.getItem('selected_property_data');
    if (storedProperty) {
      try {
        const parsedProp = JSON.parse(storedProperty);
        setProperty(parsedProp);
        const pCity = parsedProp.settings?.city || parsedProp.city;
        if (pCity) setCity(pCity);
      } catch (e) {}
    }

    const activeId = localStorage.getItem('selected_property_id') || 'HS-9HQ8P';
    publicService.getProperty(activeId)
      .then(res => {
        if (res.success && res.data) {
          setProperty(res.data);
          const pCity = res.data.settings?.city || res.data.city;
          if (pCity) setCity(pCity);
        }
      })
      .catch(() => {});
  }, []);

  const checkInDate = localStorage.getItem('booking_check_in') || '2026-09-01';
  const checkOutDate = localStorage.getItem('booking_check_out') || '2026-09-03';

  // Calculate pricing & tariff
  const roomRate = Number(selectedRoom?.currentRate || selectedRoom?.baseRate || selectedRoom?.dailyRate || 3000);
  const roomBaseTotal = roomRate * 2; // Default 2 nights
  const roomGst = Math.round(roomBaseTotal * 0.18);
  const grandTotal = Number(roomBaseTotal + roomGst);

  const handleConfirm = async (e) => {
    e.preventDefault();
    setBookingError("");

    if (!authService.isAuthenticated()) {
      localStorage.setItem('redirect_after_login', '/booking');
      window.location.href = '/login?redirect=/booking';
      return;
    }

    if (!grandTotal || isNaN(grandTotal) || grandTotal <= 0) {
      setBookingError("Booking amount validation failed: amount must be a positive number.");
      return;
    }

    setSubmitting(true);
    try {
      const propId = property?._id || property?.id || localStorage.getItem('selected_property_id') || 'HS-9HQ8P';
      const guestFullName = `${firstName} ${lastName}`.trim() || 'Guest';

      const bookingPayload = {
        propertyId: propId,
        guestName: guestFullName,
        guest: guestFullName,
        email: email || 'guest@example.com',
        phone: phone || '+91 98204 33121',
        checkInDate: checkInDate,
        checkIn: checkInDate,
        checkOutDate: checkOutDate,
        checkOut: checkOutDate,
        roomType: selectedRoom?.category || selectedRoom?.name || 'Standard Room',
        room: selectedRoom?.roomNumber ? `${selectedRoom.category || 'Room'} (Room ${selectedRoom.roomNumber})` : (selectedRoom?.name || 'Standard Room'),
        city: property?.settings?.city || property?.city || city || 'Hyderabad',
        hotelCity: property?.settings?.city || property?.city || city || 'Hyderabad',
        totalAmount: grandTotal,
        amount: grandTotal,
        specialRequests: gstin ? `GSTIN: ${gstin}` : ''
      };

      const res = await publicService.createBooking(bookingPayload);
      if (res && res.success && res.data) {
        const created = res.data;
        const bId = created.bookingId || created._id || created.id;

        localStorage.setItem('latest_booking_id', bId);
        localStorage.setItem('latest_booking', JSON.stringify(created));

        // Clear transient booking selection
        localStorage.removeItem('selected_room_data');
        localStorage.removeItem('booking_check_in');
        localStorage.removeItem('booking_check_out');

        // Redirect to Guest Dashboard -> My Bookings
        window.location.href = `/guest/bookings?id=${bId}`;
        return;
      } else {
        setBookingError(res?.message || 'Booking payment could not be processed. Please verify your details and try again.');
      }
    } catch (err) {
      console.error("Booking error:", err);
      setBookingError(err.message || 'Booking validation failed: amount is required or server error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const hotelName = property?.settings?.hotelName || property?.name || "Speshway Luxury Hotel";
  const propId = property?._id || property?.id || 'HS-9HQ8P';
  const roomCategory = selectedRoom?.category || 'Standard Room';

  return (
    <SiteLayout>
      <div className="bg-cream min-h-screen py-8 font-ui text-left">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">

          {/* 1. Breadcrumb: Home → Hotel → Room Details → Booking */}
          <nav className="flex items-center gap-2 text-xs text-navy/60 mb-6 font-medium">
            <a href="/" className="hover:text-purple">Home</a>
            <ChevronRight className="size-3 text-navy/40" />
            <a href={`/hotels/${propId}`} className="hover:text-purple">{hotelName}</a>
            <ChevronRight className="size-3 text-navy/40" />
            <a href={`/rooms/${encodeURIComponent(roomCategory)}`} className="hover:text-purple">{roomCategory}</a>
            <ChevronRight className="size-3 text-navy/40" />
            <span className="text-navy font-bold">Booking</span>
          </nav>

          {/* 2. Header with Back Button */}
          <div className="flex justify-between items-center gap-4 mb-6 flex-wrap">
            <div>
              <h1 className="font-display text-3xl font-bold text-navy">Complete your booking</h1>
              <p className="text-xs text-navy/60 mt-1 font-medium">Verify your details, stay schedule, and instant tariff breakdown</p>
            </div>
            <Button
              type="button"
              onClick={() => window.history.back()}
              variant="outline"
              className="flex items-center gap-2 text-xs font-bold text-navy border-navy/20 hover:bg-navy/5 cursor-pointer h-9 px-4 rounded-xl"
            >
              <ArrowLeft className="size-3.5" /> Back
            </Button>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            {/* Form Column */}
            <form onSubmit={handleConfirm} className="bg-white rounded-2xl border border-navy/10 p-6 sm:p-8 shadow-soft text-left space-y-6">
              
              {bookingError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0 text-rose-600" />
                  <span>{bookingError}</span>
                </div>
              )}

              <div>
                <h2 className="font-display text-xl font-bold text-navy border-b border-navy/5 pb-3">Guest Details</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="fn" className="text-xs font-bold text-navy">First Name</Label>
                    <Input id="fn" className="mt-1.5 h-11 text-xs font-medium" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="ln" className="text-xs font-bold text-navy">Last Name</Label>
                    <Input id="ln" className="mt-1.5 h-11 text-xs font-medium" value={lastName} onChange={e => setLastName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="em" className="text-xs font-bold text-navy">Email Address</Label>
                    <Input id="em" type="email" className="mt-1.5 h-11 text-xs font-medium" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="mb" className="text-xs font-bold text-navy">Mobile Number</Label>
                    <Input id="mb" type="tel" className="mt-1.5 h-11 text-xs font-medium" value={phone} onChange={e => setPhone(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="ct" className="text-xs font-bold text-navy">City</Label>
                    <Input id="ct" className="mt-1.5 h-11 text-xs font-medium" value={city || (property?.settings?.city || property?.city || "Hyderabad")} onChange={e => setCity(e.target.value)} placeholder="e.g. Hyderabad" />
                  </div>
                  <div>
                    <Label htmlFor="gst" className="text-xs font-bold text-navy">GSTIN (Optional)</Label>
                    <Input id="gst" className="mt-1.5 h-11 text-xs font-medium" value={gstin} onChange={e => setGstin(e.target.value)} placeholder="e.g. 07AAAAA0000A1Z5" />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-navy/5">
                <Button 
                  type="submit" 
                  disabled={submitting} 
                  variant="hero" 
                  size="touch" 
                  className="w-full sm:w-auto h-11 px-8 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Processing Reservation..." : "Confirm Booking"}
                </Button>
              </div>

            </form>

            {/* Sidebar Column */}
            <aside className="bg-white rounded-2xl border border-navy/10 p-6 shadow-soft text-left h-fit space-y-4">
              <h3 className="font-display text-lg font-bold text-navy border-b border-navy/5 pb-2">Stay Summary</h3>

              <div>
                <p className="font-display text-base font-bold text-navy">{selectedRoom?.category || selectedRoom?.name || "Standard Room"}</p>
                {selectedRoom?.roomNumber && (
                  <span className="text-[10px] bg-purple/10 text-purple font-mono font-bold px-2 py-0.5 rounded mt-1 inline-block">
                    Room {selectedRoom.roomNumber} ({selectedRoom.floor || 'Floor 1'})
                  </span>
                )}
                <p className="mt-1 text-xs text-navy/60 font-medium">
                  {hotelName}, {property?.city || "Hyderabad"}
                </p>
              </div>

              <div className="text-xs text-navy/70 space-y-1 bg-cream/40 p-3 rounded-xl border border-navy/5 font-medium">
                <div className="flex justify-between"><span>Check-In:</span><strong className="text-navy font-bold">{checkInDate}</strong></div>
                <div className="flex justify-between"><span>Check-Out:</span><strong className="text-navy font-bold">{checkOutDate}</strong></div>
              </div>

              <dl className="space-y-2 border-t border-navy/5 pt-4 text-xs font-medium">
                <div className="flex justify-between">
                  <dt className="text-navy/60">Room Tariff</dt>
                  <dd className="tabular-nums font-bold text-navy">{inr(roomBaseTotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-navy/60">GST (18%)</dt>
                  <dd className="tabular-nums font-bold text-navy">{inr(roomGst)}</dd>
                </div>
                <div className="flex justify-between border-t border-navy/5 pt-3 text-sm font-bold text-navy">
                  <dt>Total Amount</dt>
                  <dd className="tabular-nums font-bold text-purple">{inr(grandTotal)}</dd>
                </div>
              </dl>
            </aside>
          </div>

        </div>
      </div>
    </SiteLayout>
  );
}