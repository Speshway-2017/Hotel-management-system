import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Star, MapPin, Bed, Users, Sparkles, Clock, FileText, ChevronRight, ShieldCheck, Info, Calendar } from "lucide-react";
import { SiteLayout } from "@/layouts/SiteLayout";
import { Button } from "@/components/ui/button";
import { inr } from "@/data/hs-data";
import { calculateStayNights } from "@/utils/dateUtils";
import { publicService } from "@/services/public";
import { authService } from "@/services/auth";

import jaipurImg from "@/assets/resort_jaipur.png";
import goaImg from "@/assets/beach_goa.png";
import palaceImg from "@/assets/palace_udaipur.png";
import keralaImg from "@/assets/retreat_kerala.png";

export const Route = {
  head: () => ({
    meta: [
      { title: "Room Details & Rates — Hour Stay" },
      { name: "description", content: "View room overview, amenities, pricing, availability, and instant booking options." }
    ]
  }),
  component: RoomDetailsPage
};

export function RoomDetailsPage() {
  const params = useParams() || {};
  let routeRoomId = params.roomId;
  if (!routeRoomId && typeof window !== 'undefined') {
    const match = window.location.pathname.match(/\/rooms\/([^/]+)/);
    if (match && match[1]) routeRoomId = match[1];
  }

  const decodedParam = routeRoomId ? decodeURIComponent(routeRoomId) : "Standard Room";
  const targetPropId = localStorage.getItem('selected_property_id') || 'HS-9HQ8P';

  const [property, setProperty] = useState(null);
  const [allPropertyRooms, setAllPropertyRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reservation Date Selectors
  const [checkInDate, setCheckInDate] = useState(() => localStorage.getItem('booking_check_in') || new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState(() => localStorage.getItem('booking_check_out') || new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      publicService.getProperty(targetPropId).catch(() => null),
      publicService.getPropertyRooms(targetPropId).catch(() => null)
    ]).then(([propRes, roomsRes]) => {
      if (!isMounted) return;

      if (propRes && propRes.success && propRes.data) {
        setProperty(propRes.data);
      }

      let fetchedRooms = (roomsRes && roomsRes.success && Array.isArray(roomsRes.data)) ? roomsRes.data : [];
      setAllPropertyRooms(fetchedRooms);

      // Match target room by category or ID
      let matchedRooms = fetchedRooms.filter(r => {
        const catName = decodedParam.toLowerCase();
        const rCat = (r.category || "").toLowerCase();
        const rId = String(r.id || r._id || "").toLowerCase();
        return rCat.includes(catName) || rId === catName || catName.includes(rCat);
      });

      if (matchedRooms.length > 0) {
        // Pick first available room or first room in category
        const avail = matchedRooms.find(r => r.status === 'Available' || r.isAvailable === true);
        setSelectedRoom(avail || matchedRooms[0]);
      } else if (fetchedRooms.length > 0) {
        setSelectedRoom(fetchedRooms[0]);
      }
    }).finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, [targetPropId, decodedParam]);

  const handleBookNow = () => {
    if (!selectedRoom) return;

    if (property) {
      localStorage.setItem('selected_property_id', property._id || property.id || targetPropId);
      localStorage.setItem('selected_property_data', JSON.stringify(property));
    }
    localStorage.setItem('selected_room_data', JSON.stringify(selectedRoom));
    localStorage.setItem('booking_check_in', checkInDate);
    localStorage.setItem('booking_check_out', checkOutDate);

    const isAuthenticated = authService.isAuthenticated();
    if (!isAuthenticated) {
      localStorage.setItem('redirect_after_login', '/booking');
      window.location.href = '/login?redirect=/booking';
      return;
    }

    window.location.href = '/booking';
  };

  if (loading) {
    return (
      <SiteLayout>
        <div className="min-h-screen bg-cream py-20 text-center font-ui">
          <div className="mx-auto size-12 rounded-full border-4 border-purple border-t-transparent animate-spin mb-4" />
          <p className="text-navy/70 text-sm font-semibold">Fetching live room details from MongoDB...</p>
        </div>
      </SiteLayout>
    );
  }

  const s = property?.settings || {};
  
  // Format Hotel Name safely (never show raw MongoDB ObjectId string as name)
  let hotelName = s.hotelName || s.name || property?.name || "Speshway Luxury Hotel";
  if (/^[0-9a-fA-F]{24}$/.test(hotelName) || /^HS-[A-Z0-9]+$/.test(hotelName)) {
    hotelName = "Speshway Luxury Hotel";
  }

  const city = s.city || property?.city || "Hyderabad";
  const location = [s.address, s.city, s.state, s.country].filter(Boolean).join(", ") || `${city}, India`;
  const rating = s.rating || "4.9";
  const classification = s.classification || "5-Star Luxury";

  // Format Room Category / Type
  const roomType = selectedRoom?.category || decodedParam || "Standard Room";
  const roomNumber = selectedRoom?.roomNumber ? `Room ${selectedRoom.roomNumber}` : "";
  const bedType = selectedRoom?.beds || selectedRoom?.bedType || "King Bed";
  const capacity = selectedRoom?.capacity || `Max ${selectedRoom?.occupancy || 2} Guests`;
  const roomFloor = selectedRoom?.floor || "Floor 1";
  const ratePlan = (selectedRoom?.ratePlan && selectedRoom.ratePlan !== "Standard Rate Plan" && selectedRoom.ratePlan !== "Standard Plan")
    ? selectedRoom.ratePlan
    : (roomType.toLowerCase().includes('deluxe') ? 'Deluxe Rate Plan' : roomType.toLowerCase().includes('suite') ? 'Executive Suite Plan' : roomType.toLowerCase().includes('villa') ? 'Villa Suite Plan' : `${roomType} Rate Plan`);
  const roomDescription = selectedRoom?.description || `Experience superior comfort in our ${roomType}, featuring premium furnishings and state-of-the-art amenities.`;

  // Calculate pricing & taxes
  const nightlyTariff = Number(selectedRoom?.currentRate || selectedRoom?.baseRate || selectedRoom?.dailyRate || 3000);
  const nightsCount = calculateStayNights(checkInDate, checkOutDate);
  const baseTariffTotal = nightlyTariff * nightsCount;
  const gstTax = Math.round(baseTariffTotal * 0.18);
  const totalPayable = baseTariffTotal + gstTax;

  const isAvailable = selectedRoom?.status === 'Available' || selectedRoom?.isAvailable === true;

  // Resolve room images uploaded from Admin or property gallery
  let roomImages = [];
  if (Array.isArray(selectedRoom?.images) && selectedRoom.images.length > 0) {
    roomImages = selectedRoom.images.filter(Boolean);
  }
  if (roomImages.length === 0 && Array.isArray(s.gallery) && s.gallery.length > 0) {
    roomImages = s.gallery.filter(Boolean);
  }
  if (roomImages.length === 0 && Array.isArray(s.photos) && s.photos.length > 0) {
    roomImages = s.photos.filter(Boolean);
  }
  if (roomImages.length === 0) {
    roomImages = [jaipurImg, palaceImg, goaImg, keralaImg];
  }

  const mainImg = roomImages[0] || jaipurImg;
  const sideImg1 = roomImages[1] || roomImages[0] || palaceImg;
  const sideImg2 = roomImages[2] || roomImages[0] || goaImg;

  // Resolve room amenities robustly (room amenities -> hotel amenities -> default room amenities)
  let roomAmenities = [];
  if (Array.isArray(selectedRoom?.amenities) && selectedRoom.amenities.length > 0) {
    roomAmenities = selectedRoom.amenities.filter(Boolean);
  } else if (typeof selectedRoom?.amenities === 'string' && selectedRoom.amenities.trim()) {
    roomAmenities = selectedRoom.amenities.split(',').map(a => a.trim()).filter(Boolean);
  }

  if (roomAmenities.length === 0 && Array.isArray(s.amenities) && s.amenities.length > 0) {
    roomAmenities = s.amenities.filter(Boolean);
  } else if (roomAmenities.length === 0 && typeof s.amenities === 'string' && s.amenities.trim()) {
    roomAmenities = s.amenities.split(',').map(a => a.trim()).filter(Boolean);
  }

  if (roomAmenities.length === 0) {
    roomAmenities = [
      "Free High-Speed WiFi",
      "Air Conditioning",
      "Flat Screen Smart TV",
      "24/7 Room Service",
      "Ensuite Marble Bathroom",
      "Safety Deposit Box"
    ];
  }

  // Category rooms list for room selector
  const roomsInSameCategory = allPropertyRooms.filter(r => {
    const s1 = (r.status || "").toLowerCase();
    if (['dirty', 'cleaning', 'maintenance', 'out of order'].includes(s1)) return false;
    const cat = (r.category || "").toLowerCase();
    return cat === roomType.toLowerCase();
  });

  return (
    <SiteLayout>
      <div className="bg-cream min-h-screen py-8 font-ui text-left">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">

          {/* 1. Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-navy/60 mb-4 font-medium">
            <Link to="/search" className="hover:text-purple">Stays</Link>
            <ChevronRight className="size-3" />
            <Link to={`/hotels/${property?._id || property?.id || targetPropId}`} className="hover:text-purple">{hotelName}</Link>
            <ChevronRight className="size-3" />
            <span className="text-navy font-bold">{roomType}</span>
          </nav>

          {/* 2. Hotel Name & Room Type Header */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-navy/5 shadow-soft mb-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="bg-purple/10 text-purple text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-purple/20">
                    {classification}
                  </span>
                  <div className="flex items-center gap-1 text-gold text-xs font-bold">
                    <Star className="size-4 fill-gold text-gold" />
                    <span>{rating} Rating</span>
                  </div>
                </div>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-navy">{hotelName}</h1>
                <p className="text-xs sm:text-sm text-[#4A4F58] flex items-center gap-1.5 mt-2 font-medium font-ui">
                  <MapPin className="size-4 text-purple shrink-0" />
                  <span>{roomType} {roomNumber ? `(${roomNumber})` : ""} — {location}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${
                  isAvailable ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-700 border border-gray-200"
                }`}>
                  {selectedRoom?.status || (isAvailable ? "Available" : "Occupied")}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Image Gallery */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10">
            <div className="lg:col-span-2 h-[340px] sm:h-[420px] rounded-2xl overflow-hidden bg-navy relative border border-navy/5 shadow-soft">
              <img src={mainImg} alt={roomType} className="w-full h-full object-cover" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              <div className="h-[160px] sm:h-[202px] rounded-2xl overflow-hidden bg-navy relative border border-navy/5 shadow-soft">
                <img src={sideImg1} alt={`${roomType} view 1`} className="w-full h-full object-cover" />
              </div>
              <div className="h-[160px] sm:h-[202px] rounded-2xl overflow-hidden bg-navy relative border border-navy/5 shadow-soft">
                <img src={sideImg2} alt={`${roomType} view 2`} className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left 2 Columns: Room Details & Specs */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* 4. Room Overview */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-navy/5 shadow-soft space-y-5">
                <h2 className="font-display text-xl sm:text-2xl font-bold text-navy border-b border-navy/5 pb-3">Room Overview</h2>
                <p className="text-xs sm:text-sm text-[#4A4F58] leading-relaxed font-ui">{roomDescription}</p>

                {/* Key Spec Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-cream/50 border border-navy/5">
                    <span className="text-[10px] text-[#4A4F58] font-bold uppercase block mb-0.5">Bed Type</span>
                    <strong className="text-xs font-bold text-navy flex items-center gap-1.5">
                      <Bed className="size-3.5 text-purple shrink-0" />
                      <span>{bedType}</span>
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-cream/50 border border-navy/5">
                    <span className="text-[10px] text-[#4A4F58] font-bold uppercase block mb-0.5">Capacity</span>
                    <strong className="text-xs font-bold text-navy flex items-center gap-1.5">
                      <Users className="size-3.5 text-purple shrink-0" />
                      <span>{capacity}</span>
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-cream/50 border border-navy/5">
                    <span className="text-[10px] text-[#4A4F58] font-bold uppercase block mb-0.5">Floor</span>
                    <strong className="text-xs font-bold text-navy flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-purple shrink-0" />
                      <span>{roomFloor}</span>
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-cream/50 border border-navy/5">
                    <span className="text-[10px] text-[#4A4F58] font-bold uppercase block mb-0.5">Rate Plan</span>
                    <strong className="text-xs font-bold text-purple truncate block">
                      {ratePlan}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 5. Room Amenities */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-navy/5 shadow-soft space-y-4">
                <h2 className="font-display text-xl sm:text-2xl font-bold text-navy border-b border-navy/5 pb-3">Room Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {roomAmenities.map((a, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-cream/40 border border-navy/5 text-xs text-navy font-semibold">
                      <Check className="size-4 text-purple shrink-0" />
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Pricing & Taxes Breakdown */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-navy/5 shadow-soft space-y-4">
                <h2 className="font-display text-xl sm:text-2xl font-bold text-navy border-b border-navy/5 pb-3">Pricing & Tariff Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-purple/5 border border-purple/15 space-y-1">
                    <span className="text-[10px] text-purple font-bold uppercase tracking-wider block">Base Nightly Tariff</span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-2xl font-bold text-navy">{inr(nightlyTariff)}</span>
                      <span className="text-navy/50 text-[10px] font-bold">/ night</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-cream/50 border border-navy/5 space-y-1">
                    <span className="text-[10px] text-navy/50 font-bold uppercase tracking-wider block">Applicable Taxes</span>
                    <span className="font-bold text-navy text-sm block">18% GST (CGST 9% + SGST 9%)</span>
                    <span className="text-[10px] text-navy/60 block">Included at booking confirmation</span>
                  </div>
                </div>
              </div>

              {/* 7. Available Room Selection in Category */}
              {roomsInSameCategory.length > 0 && (
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-navy/5 shadow-soft space-y-4">
                  <div className="flex justify-between items-center border-b border-navy/5 pb-3">
                    <div>
                      <h2 className="font-display text-xl font-bold text-navy">Select Room Configuration</h2>
                      <p className="text-xs text-navy/60">Choose your specific room number for this stay</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {roomsInSameCategory.map((rm) => {
                      const roomAvail = rm.status === 'Available' || rm.isAvailable === true;
                      const isSelected = selectedRoom?.roomNumber === rm.roomNumber;

                      return (
                        <div
                          key={rm.roomNumber}
                          onClick={() => roomAvail && setSelectedRoom(rm)}
                          className={`p-4 rounded-xl border text-xs transition-all flex justify-between items-center ${
                            !roomAvail
                              ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed opacity-60"
                              : isSelected
                                ? "bg-purple text-white border-purple shadow-soft cursor-pointer font-bold"
                                : "bg-white border-navy/15 text-navy hover:border-purple/50 cursor-pointer font-medium"
                          }`}
                        >
                          <div>
                            <span className="font-mono text-sm block font-bold">Room {rm.roomNumber}</span>
                            <span className="text-[10px] opacity-80 block">{rm.floor || 'Floor 1'} · {rm.capacity || '2 Adults'}</span>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                            !roomAvail 
                              ? "bg-gray-200 text-gray-600" 
                              : isSelected 
                                ? "bg-white/20 text-white" 
                                : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {roomAvail ? (isSelected ? "✓ Selected" : "Available") : "Occupied"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Right Column: Sticky Reservation Summary & Date Selector */}
            <div className="space-y-6">
              
              <div className="bg-white rounded-2xl p-6 border border-navy/10 shadow-soft space-y-5 lg:sticky lg:top-24 text-left font-ui">
                <h3 className="font-display text-lg font-bold text-navy border-b border-navy/5 pb-3">Reservation Summary</h3>

                {/* Hotel & Room Selection Card */}
                <div className="p-3.5 bg-cream/40 rounded-xl border border-navy/5 space-y-1 text-xs">
                  <strong className="font-bold text-navy block text-sm">{hotelName}</strong>
                  <span className="text-navy/70 block">{roomType} {roomNumber ? `(${roomNumber})` : ""}</span>
                  <span className="text-purple font-mono font-bold block mt-1">{inr(nightlyTariff)} / night</span>
                </div>

                {/* Date Selectors */}
                <div className="space-y-3 pt-1">
                  <div>
                    <label htmlFor="checkin" className="text-xs font-bold text-navy uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-purple" />
                      <span>Check-In Date</span>
                    </label>
                    <input
                      id="checkin"
                      type="date"
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-navy/15 text-xs font-bold text-navy bg-white focus:outline-none focus:border-purple"
                    />
                  </div>

                  <div>
                    <label htmlFor="checkout" className="text-xs font-bold text-navy uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-purple" />
                      <span>Check-Out Date</span>
                    </label>
                    <input
                      id="checkout"
                      type="date"
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-navy/15 text-xs font-bold text-navy bg-white focus:outline-none focus:border-purple"
                    />
                  </div>
                </div>

                {/* Price Breakdown */}
                <dl className="space-y-2 border-t border-navy/5 pt-4 text-xs font-medium">
                  <div className="flex justify-between">
                    <dt className="text-navy/60">Room Tariff ({nightsCount} {nightsCount === 1 ? 'night' : 'nights'})</dt>
                    <dd className="tabular-nums font-bold text-navy">{inr(baseTariffTotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-navy/60">GST 18%</dt>
                    <dd className="tabular-nums font-bold text-navy">{inr(gstTax)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-navy/5 pt-3 text-sm font-bold text-navy">
                    <dt>Total Amount</dt>
                    <dd className="tabular-nums font-bold text-purple">{inr(totalPayable)}</dd>
                  </div>
                </dl>

                {/* Book Now Button */}
                <Button
                  onClick={handleBookNow}
                  disabled={!isAvailable}
                  variant="hero"
                  size="touch"
                  className="w-full h-11 text-xs font-bold cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isAvailable ? "Book Now — Instant Confirmation" : "Room Unavailable"}
                </Button>

                <div className="p-3 bg-purple/5 rounded-xl border border-purple/10 text-[10px] text-navy/70 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-purple">
                    <ShieldCheck className="size-3.5 shrink-0" />
                    <span>Best Price Guarantee</span>
                  </div>
                  <p className="leading-snug">{s.cancellationPolicy || "Free cancellation up to 24 hours prior to check-in."}</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </SiteLayout>
  );
}