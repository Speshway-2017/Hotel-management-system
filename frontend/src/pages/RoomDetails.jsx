import { useState, useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Star, MapPin, Bed, Users, Sparkles, Clock, FileText, ChevronRight, ShieldCheck, Info, Calendar, Snowflake, Wind, CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/layouts/SiteLayout";
import { Button } from "@/components/ui/button";
import { inr } from "@/data/hs-data";
import { calculateStayNights } from "@/utils/dateUtils";
import { publicService } from "@/services/public";
import { authService } from "@/services/auth";
import { getRoomImages, getHotelImage } from "@/utils/hotelImages";
import { subscribeRealtimeSync } from "@/services/socket";

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
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const targetPropId = searchParams.get('propertyId') || localStorage.getItem('selected_property_id') || localStorage.getItem('guest_target_property_id') || 'HS-9HQ8P';

  const [property, setProperty] = useState(null);
  const [allPropertyRooms, setAllPropertyRooms] = useState([]);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState("");
  const [selectedVariant, setSelectedVariant] = useState(() => {
    const raw = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';
    if (raw.includes('non-ac') || raw.includes('non%20ac') || raw.includes('nonac')) return 'Non-AC';
    try {
      const stored = localStorage.getItem('selected_room_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.type === 'Non-AC' || parsed.category?.toLowerCase().includes('non-ac')) return 'Non-AC';
      }
    } catch (_) {}
    return 'AC';
  });
  const [loading, setLoading] = useState(true);

  // Reservation Date Selectors
  const [checkInDate, setCheckInDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('checkIn')) return sp.get('checkIn');
      const stored = localStorage.getItem('booking_check_in');
      if (stored) return stored;
    }
    return new Date().toISOString().split('T')[0];
  });
  const [checkOutDate, setCheckOutDate] = useState(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('checkOut')) return sp.get('checkOut');
      const stored = localStorage.getItem('booking_check_out');
      if (stored) return stored;
    }
    return new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  });

  const loadRoomDetailsData = (isSilent = false) => {
    if (!isSilent) setLoading(true);

    Promise.all([
      publicService.getProperty(targetPropId).catch(() => null),
      publicService.getPropertyRooms(targetPropId, { checkIn: checkInDate, checkOut: checkOutDate }).catch(() => null)
    ]).then(([propRes, roomsRes]) => {
      if (propRes && propRes.success && propRes.data) {
        setProperty(propRes.data);
      }

      const fetchedRooms = (roomsRes && roomsRes.success && Array.isArray(roomsRes.data)) ? roomsRes.data : [];
      setAllPropertyRooms(fetchedRooms);
    }).finally(() => {
      if (!isSilent) setLoading(false);
    });
  };

  useEffect(() => {
    loadRoomDetailsData(false);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadRoomDetailsData(true);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [targetPropId, checkInDate, checkOutDate]);

  // Match rooms belonging to this category or room number
  const matchedCategoryRooms = useMemo(() => {
    const cleanParam = decodedParam.toLowerCase().trim();
    const cleanNoVariant = cleanParam.replace(/\s*\(?(non-?ac|ac)\)?/gi, '').trim();

    // Find if cleanParam references a specific room by id or roomNumber
    const refRoom = allPropertyRooms.find(r => 
      String(r.id || r._id || '').toLowerCase() === cleanParam ||
      String(r.roomNumber || '').toLowerCase() === cleanParam
    );

    const targetCategory = refRoom?.category 
      ? refRoom.category.replace(/\s*\(?(non-?ac|ac)\)?/gi, '').trim().toLowerCase()
      : cleanNoVariant;

    const filtered = allPropertyRooms.filter(r => {
      const s1 = (r.status || "").toLowerCase();
      if (['dirty', 'cleaning', 'maintenance', 'out of order'].includes(s1)) return false;
      const rCat = (r.category || "").toLowerCase().trim();
      const rCatClean = rCat.replace(/\s*\(?(non-?ac|ac)\)?/gi, '').trim();
      const rNum = String(r.roomNumber || "").toLowerCase().trim();
      const rId = String(r.id || r._id || "").toLowerCase().trim();

      return (
        rCatClean === targetCategory ||
        rCatClean.includes(targetCategory) ||
        targetCategory.includes(rCatClean) ||
        rNum === cleanParam ||
        rId === cleanParam
      );
    });

    return filtered.length > 0 ? filtered : allPropertyRooms;
  }, [allPropertyRooms, decodedParam]);

  // Group rooms by physical room number (e.g. 101, 102, 201)
  const roomsByNumber = useMemo(() => {
    const map = {};
    matchedCategoryRooms.forEach(r => {
      const s1 = (r.status || "").toLowerCase();
      if (['dirty', 'cleaning', 'maintenance', 'out of order'].includes(s1)) return false;
      const num = String(r.roomNumber || '101').trim();
      if (!map[num]) map[num] = [];
      map[num].push(r);
    });
    return map;
  }, [matchedCategoryRooms]);

  const distinctRoomNumbers = useMemo(() => Object.keys(roomsByNumber), [roomsByNumber]);

  // Active selected room number
  const activeRoomNum = useMemo(() => {
    if (selectedRoomNumber && roomsByNumber[selectedRoomNumber]) {
      return selectedRoomNumber;
    }
    const cleanParam = decodedParam.toLowerCase().trim();
    const matchedExactNum = distinctRoomNumbers.find(num => num.toLowerCase() === cleanParam);
    if (matchedExactNum) return matchedExactNum;

    const roomById = allPropertyRooms.find(r => String(r.id || r._id || '').toLowerCase() === cleanParam);
    if (roomById && roomsByNumber[String(roomById.roomNumber)]) {
      return String(roomById.roomNumber);
    }

    return distinctRoomNumbers[0] || "101";
  }, [selectedRoomNumber, roomsByNumber, distinctRoomNumbers, decodedParam, allPropertyRooms]);

  // For the active room number, retrieve all variants
  const activeVariants = useMemo(() => {
    return roomsByNumber[activeRoomNum] || [];
  }, [roomsByNumber, activeRoomNum]);

  // Determine AC and Non-AC configurations for this specific room number
  const { acVariant, nonAcVariant } = useMemo(() => {
    const isNonAc = (r) => {
      const amenitiesText = Array.isArray(r.amenities) ? r.amenities.join(' ') : String(r.amenities || '');
      return r.type === 'Non-AC' ||
        r.category?.toLowerCase().includes('non-ac') ||
        r.category?.toLowerCase().includes('non ac') ||
        (amenitiesText.toLowerCase().includes('fan') && !amenitiesText.toLowerCase().includes('air condition')) ||
        (!amenitiesText.toLowerCase().includes('air condition') && Number(r.baseRate || r.currentRate) < 2800);
    };

    const acFound = activeVariants.find(r => !isNonAc(r));
    const nonAcFound = activeVariants.find(r => isNonAc(r));

    const refRoom = acFound || nonAcFound || activeVariants[0] || {};
    const refRate = Number(refRoom.currentRate || refRoom.baseRate || refRoom.dailyRate || 3000);

    const acRate = Number(acFound?.currentRate || acFound?.baseRate || refRate || 3000);
    const nonAcRate = Number(nonAcFound?.currentRate || nonAcFound?.baseRate || (acFound ? Math.round(refRate * 0.74) : 2200));

    const resolvedAc = acFound || {
      ...refRoom,
      _id: `${refRoom._id || refRoom.id || 'RM'}-ac`,
      id: `${refRoom._id || refRoom.id || 'RM'}-ac`,
      roomNumber: activeRoomNum,
      type: 'AC',
      category: refRoom.category ? refRoom.category.replace(/\s*\(?non-?ac\)?/i, '').trim() : 'Standard Room',
      baseRate: acRate,
      currentRate: acRate,
      dailyRate: acRate,
      status: refRoom.status === 'Occupied' ? 'Occupied' : (refRoom.status || 'Available'),
      isAvailable: refRoom.status === 'Occupied' ? false : (refRoom.isAvailable !== false),
      amenities: Array.isArray(refRoom.amenities)
        ? [...refRoom.amenities.filter(a => !a.toLowerCase().includes('fan')), 'Air Conditioning']
        : ['Air Conditioning', 'High-Speed Wi-Fi', 'Smart TV', 'Room Service']
    };

    const resolvedNonAc = nonAcFound || {
      ...refRoom,
      _id: `${refRoom._id || refRoom.id || 'RM'}-nonac`,
      id: `${refRoom._id || refRoom.id || 'RM'}-nonac`,
      roomNumber: activeRoomNum,
      type: 'Non-AC',
      category: refRoom.category ? (refRoom.category.toLowerCase().includes('non-ac') ? refRoom.category : `${refRoom.category} (Non-AC)`) : 'Standard Room (Non-AC)',
      baseRate: nonAcRate,
      currentRate: nonAcRate,
      dailyRate: nonAcRate,
      status: refRoom.status === 'Occupied' ? 'Occupied' : (refRoom.status || 'Available'),
      isAvailable: refRoom.status === 'Occupied' ? false : (refRoom.isAvailable !== false),
      amenities: Array.isArray(refRoom.amenities)
        ? [...refRoom.amenities.filter(a => !a.toLowerCase().includes('air condition') && !a.toLowerCase().includes('ac')), 'Ceiling Fan']
        : ['Ceiling Fan', 'High-Speed Wi-Fi', 'Flat Screen TV', 'Room Service']
    };

    return { acVariant: resolvedAc, nonAcVariant: resolvedNonAc };
  }, [activeVariants, activeRoomNum]);

  // Variant availability flags
  const acIsAvail = Boolean(
    acVariant &&
    (acVariant.status === 'Available' || acVariant.isAvailable === true) &&
    acVariant.status !== 'Occupied' &&
    acVariant.isAvailable !== false
  );
  const nonAcIsAvail = Boolean(
    nonAcVariant &&
    (nonAcVariant.status === 'Available' || nonAcVariant.isAvailable === true) &&
    nonAcVariant.status !== 'Occupied' &&
    nonAcVariant.isAvailable !== false
  );

  // The active selected room variant object
  const activeSelectedRoom = selectedVariant === 'Non-AC' ? nonAcVariant : acVariant;
  const isAvailable = selectedVariant === 'Non-AC' ? nonAcIsAvail : acIsAvail;

  const s = property?.settings || {};
  let hotelName = s.hotelName || s.name || property?.name || "Speshway Luxury Hotel";
  if (/^[0-9a-fA-F]{24}$/.test(hotelName) || /^HS-[A-Z0-9]+$/.test(hotelName)) {
    hotelName = "Speshway Luxury Hotel";
  }

  const city = s.city || property?.city || "Hyderabad";
  const location = [s.address, s.city, s.state, s.country].filter(Boolean).join(", ") || `${city}, India`;
  const rating = s.rating || "4.9";
  const classification = s.classification || "5-Star Luxury";

  const roomCategoryBase = activeSelectedRoom?.category?.replace(/\s*\(?(non-?ac|ac)\)?/gi, '').trim() || "Standard Room";
  const roomDisplayTitle = `${roomCategoryBase} (${selectedVariant})`;
  const bedType = activeSelectedRoom?.beds || activeSelectedRoom?.bedType || "King Bed";
  const capacity = activeSelectedRoom?.capacity || `Max ${activeSelectedRoom?.occupancy || 2} Guests`;
  const roomFloor = activeSelectedRoom?.floor || `Floor ${String(activeRoomNum)[0] || '1'}`;
  const ratePlan = (activeSelectedRoom?.ratePlan && activeSelectedRoom.ratePlan !== "Standard Rate Plan" && activeSelectedRoom.ratePlan !== "Standard Plan")
    ? activeSelectedRoom.ratePlan
    : `${roomCategoryBase} Standard Plan`;

  const roomDescription = activeSelectedRoom?.description || (
    selectedVariant === 'Non-AC'
      ? `Naturally ventilated ${roomCategoryBase} (Room ${activeRoomNum}) equipped with high-speed ceiling fan, large windows, and hospitality comforts.`
      : `Climate-controlled ${roomCategoryBase} (Room ${activeRoomNum}) featuring split air conditioning, premium linen, and modern hospitality amenities.`
  );

  // Live pricing & taxes
  const nightlyTariff = Number(activeSelectedRoom?.currentRate || activeSelectedRoom?.baseRate || activeSelectedRoom?.dailyRate || (selectedVariant === 'Non-AC' ? 2200 : 3000));
  const nightsCount = calculateStayNights(checkInDate, checkOutDate);
  const baseTariffTotal = nightlyTariff * nightsCount;
  const gstTax = Math.round(baseTariffTotal * 0.18);
  const totalPayable = baseTariffTotal + gstTax;

  // Resolve room images
  const roomImages = getRoomImages(activeSelectedRoom, property);
  const mainImg = roomImages[0];
  const sideImg1 = roomImages[1] || roomImages[0];
  const sideImg2 = roomImages[2] || roomImages[0];

  // Resolve amenities matching selected variant
  const roomAmenities = useMemo(() => {
    let list = [];
    if (Array.isArray(activeSelectedRoom?.amenities) && activeSelectedRoom.amenities.length > 0) {
      list = activeSelectedRoom.amenities.filter(Boolean);
    } else if (typeof activeSelectedRoom?.amenities === 'string' && activeSelectedRoom.amenities.trim()) {
      list = activeSelectedRoom.amenities.split(',').map(a => a.trim()).filter(Boolean);
    }

    if (selectedVariant === 'Non-AC') {
      list = list.filter(a => !a.toLowerCase().includes('air condition') && !a.toLowerCase().includes(' ac'));
      if (!list.some(a => a.toLowerCase().includes('fan'))) {
        list.unshift('Ceiling Fan');
      }
    } else {
      list = list.filter(a => !a.toLowerCase().includes('fan') || a.toLowerCase().includes('exhaust'));
      if (!list.some(a => a.toLowerCase().includes('air condition'))) {
        list.unshift('Air Conditioning');
      }
    }

    if (list.length === 0) {
      list = selectedVariant === 'Non-AC'
        ? ["Ceiling Fan", "Free High-Speed WiFi", "Flat Screen Smart TV", "24/7 Room Service", "Ensuite Marble Bathroom"]
        : ["Air Conditioning", "Free High-Speed WiFi", "Flat Screen Smart TV", "24/7 Room Service", "Ensuite Marble Bathroom"];
    }
    return list;
  }, [activeSelectedRoom, selectedVariant]);

  const handleBookNow = () => {
    if (!activeSelectedRoom) return;

    if (property) {
      localStorage.setItem('selected_property_id', property._id || property.id || targetPropId);
      localStorage.setItem('selected_property_data', JSON.stringify(property));
    }
    const bookingPayload = {
      ...activeSelectedRoom,
      type: selectedVariant,
      roomNumber: activeRoomNum,
      room: `Room ${activeRoomNum}`,
      currentRate: nightlyTariff,
      baseRate: nightlyTariff,
      dailyRate: nightlyTariff,
      category: `${roomCategoryBase} (${selectedVariant})`
    };

    localStorage.setItem('selected_room_data', JSON.stringify(bookingPayload));
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

  if (!property || (allPropertyRooms.length === 0 && !activeSelectedRoom)) {
    return (
      <SiteLayout>
        <div className="min-h-screen bg-cream py-20 text-center font-ui max-w-lg mx-auto px-4">
          <div className="bg-white rounded-3xl p-8 border border-navy/5 shadow-soft">
            <h2 className="text-2xl font-bold text-navy mb-2">No Rooms Configured</h2>
            <p className="text-navy/60 text-sm mb-6">
              There are currently no active room configurations available for {property?.name || property?.settings?.hotelName || "this hotel"}.
            </p>
            <Button onClick={() => window.location.href = '/search'} variant="hero" size="touch" className="cursor-pointer">
              Explore Available Hotels
            </Button>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="bg-cream min-h-screen py-8 font-ui text-left">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">

          {/* 1. Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-gray-500 mb-4 font-medium flex-wrap">
            <Link to="/search" className="hover:text-purple">Stays</Link>
            <ChevronRight className="size-3" />
            <Link to={`/hotels/${property?._id || property?.id || targetPropId}`} className="hover:text-purple">{hotelName}</Link>
            <ChevronRight className="size-3" />
            <span className="text-navy font-bold">{roomDisplayTitle}</span>
            <ChevronRight className="size-3" />
            <span className="text-purple font-mono font-bold">Room #{activeRoomNum}</span>
          </nav>

          {/* 2. Hotel Name & Room Type Header */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-navy/5 shadow-soft mb-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                  <span className="bg-purple/10 text-purple text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-purple/20">
                    {classification}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    selectedVariant === "Non-AC"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-purple/10 text-purple border-purple/20"
                  }`}>
                    {selectedVariant} Variant
                  </span>
                  <div className="flex items-center gap-1 text-gold text-xs font-bold">
                    <Star className="size-4 fill-gold text-gold" />
                    <span>{rating} Rating</span>
                  </div>
                </div>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-navy">{hotelName}</h1>
                <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1.5 mt-2 font-medium font-ui">
                  <MapPin className="size-4 text-purple shrink-0" />
                  <span>{roomDisplayTitle} (Room {activeRoomNum}) — {location}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${
                  isAvailable ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-red-100 text-red-700 border border-red-200"
                }`}>
                  {isAvailable ? "Available" : (activeSelectedRoom?.status || "Occupied")}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Image Gallery */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10">
            <div className="lg:col-span-2 h-[340px] sm:h-[420px] rounded-2xl overflow-hidden bg-navy relative border border-navy/5 shadow-soft">
              <img src={mainImg} alt={roomDisplayTitle} className="w-full h-full object-cover" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              <div className="h-[160px] sm:h-[202px] rounded-2xl overflow-hidden bg-navy relative border border-navy/5 shadow-soft">
                <img src={sideImg1} alt={`${roomDisplayTitle} view 1`} className="w-full h-full object-cover" />
              </div>
              <div className="h-[160px] sm:h-[202px] rounded-2xl overflow-hidden bg-navy relative border border-navy/5 shadow-soft">
                <img src={sideImg2} alt={`${roomDisplayTitle} view 2`} className="w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left 2 Columns: Room Details & Specs */}
            <div className="lg:col-span-2 space-y-8">

              {/* 4. Room Number Selector */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-navy/5 shadow-soft space-y-4">
                <div className="flex justify-between items-center border-b border-navy/5 pb-3">
                  <div>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-navy">
                      1. Select Room Number
                    </h2>
                    <p className="text-xs text-gray-500">
                      Choose a physical room number in {roomCategoryBase}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-navy/5 text-navy border border-navy/10">
                    {distinctRoomNumbers.length} Rooms
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {distinctRoomNumbers.map((num, idx) => {
                    const isSelectedNum = String(activeRoomNum).trim() === String(num).trim();
                    const variants = roomsByNumber[num] || [];
                    const isNumAvail = variants.some(r => (r.status === 'Available' || r.isAvailable === true) && r.status !== 'Occupied' && r.isAvailable !== false);

                    return (
                      <button
                        key={`${num}-${idx}`}
                        type="button"
                        onClick={() => setSelectedRoomNumber(num)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                          isSelectedNum
                            ? "bg-navy text-white border-navy shadow-md ring-2 ring-purple/40"
                            : "bg-white border-navy/15 text-navy hover:border-purple/50 hover:bg-purple/[0.02]"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-base font-bold">Room {num}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            isSelectedNum
                              ? (isNumAvail ? "bg-white/20 text-white" : "bg-red-500/80 text-white")
                              : isNumAvail
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                : "bg-red-100 text-red-700 border border-red-200"
                          }`}>
                            {isNumAvail ? "Available" : "Occupied"}
                          </span>
                        </div>
                        <span className={`text-[10px] ${isSelectedNum ? "text-white/70" : "text-gray-400"}`}>
                          {variants[0]?.floor || 'Floor 1'} · {variants[0]?.capacity || '2 Adults'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Two Categories: AC & Non-AC for Selected Room Number */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-navy/5 shadow-soft space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-navy/5 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-xl sm:text-2xl font-bold text-navy">
                        2. Choose Climate Category for Room #{activeRoomNum}
                      </h2>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Room {activeRoomNum} is available in two climate configurations. Select your preferred category:
                    </p>
                  </div>
                  {acIsAvail && nonAcIsAvail ? (
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
                      AC & Non-AC Available
                    </span>
                  ) : acIsAvail && !nonAcIsAvail ? (
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 w-fit">
                      AC Available · Non-AC Occupied
                    </span>
                  ) : !acIsAvail && nonAcIsAvail ? (
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 w-fit">
                      Non-AC Available · AC Occupied
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 w-fit">
                      Room #{activeRoomNum} Occupied for Selected Dates
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category 1: Air Conditioned (AC) */}
                  <div
                    onClick={() => setSelectedVariant("AC")}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between gap-4 ${
                      selectedVariant === "AC"
                        ? "bg-purple/[0.04] border-purple shadow-md ring-2 ring-purple/20"
                        : "bg-white border-navy/15 hover:border-purple/40 shadow-soft"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2.5 rounded-xl ${selectedVariant === "AC" ? "bg-purple text-white shadow-sm" : "bg-purple/10 text-purple"}`}>
                            <Snowflake className="size-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-display text-base sm:text-lg font-bold text-navy">Air Conditioned</h3>
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-purple/10 text-purple border border-purple/20">
                                AC
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500">Premium climate-controlled stay</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-price text-xl font-bold text-navy block leading-none">
                            {inr(acVariant.currentRate || acVariant.baseRate || 3000)}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium block mt-0.5">/ night</span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 leading-relaxed font-ui">
                        Full individual temperature control with split air conditioning, King Bed bedding, high-speed Wi-Fi & Smart TV.
                      </p>

                      {/* Feature Badges */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple/10 text-purple">
                          <CheckCircle2 className="size-3" /> Air Conditioning
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-cream text-navy/70 border border-navy/5">
                          <CheckCircle2 className="size-3 text-purple" /> High-Speed Wi-Fi
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-cream text-navy/70 border border-navy/5">
                          <CheckCircle2 className="size-3 text-purple" /> Smart TV
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-navy/10 flex justify-between items-center">
                      <span className={`text-[11px] font-bold flex items-center gap-1 ${
                        acIsAvail ? "text-emerald-600" : "text-red-500"
                      }`}>
                        <span className={`size-2 rounded-full inline-block ${
                          acIsAvail ? "bg-emerald-500" : "bg-red-500"
                        }`} /> {acIsAvail ? "Available" : (acVariant.status || "Occupied")}
                      </span>

                      <span className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${
                        selectedVariant === "AC"
                          ? (acIsAvail ? "bg-purple text-white shadow-sm" : "bg-red-600 text-white shadow-sm")
                          : "bg-navy/5 text-navy hover:bg-navy/10"
                      }`}>
                        {selectedVariant === "AC" ? (acIsAvail ? "✓ Selected (AC)" : "Selected (AC - Occupied)") : "Select AC"}
                      </span>
                    </div>
                  </div>

                  {/* Category 2: Non-Air Conditioned (Non-AC) */}
                  <div
                    onClick={() => setSelectedVariant("Non-AC")}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between gap-4 ${
                      selectedVariant === "Non-AC"
                        ? "bg-emerald-50/60 border-emerald-600 shadow-md ring-2 ring-emerald-500/20"
                        : "bg-white border-navy/15 hover:border-emerald-400 shadow-soft"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2.5 rounded-xl ${selectedVariant === "Non-AC" ? "bg-emerald-600 text-white shadow-sm" : "bg-emerald-50 text-emerald-700"}`}>
                            <Wind className="size-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-display text-base sm:text-lg font-bold text-navy">Non-Air Conditioned</h3>
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Non-AC
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500">Naturally aerated economical stay</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-price text-xl font-bold text-navy block leading-none">
                            {inr(nonAcVariant.currentRate || nonAcVariant.baseRate || 2200)}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium block mt-0.5">/ night</span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 leading-relaxed font-ui">
                        Naturally ventilated room with powerful high-speed ceiling fan, fresh airflow, large windows, Wi-Fi & TV.
                      </p>

                      {/* Feature Badges */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="size-3" /> Ceiling Fan
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-cream text-navy/70 border border-navy/5">
                          <CheckCircle2 className="size-3 text-emerald-600" /> High-Speed Wi-Fi
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-cream text-navy/70 border border-navy/5">
                          <CheckCircle2 className="size-3 text-emerald-600" /> Flat Screen TV
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-navy/10 flex justify-between items-center">
                      <span className={`text-[11px] font-bold flex items-center gap-1 ${
                        nonAcIsAvail ? "text-emerald-600" : "text-red-500"
                      }`}>
                        <span className={`size-2 rounded-full inline-block ${
                          nonAcIsAvail ? "bg-emerald-500" : "bg-red-500"
                        }`} /> {nonAcIsAvail ? "Available" : (nonAcVariant.status || "Occupied")}
                      </span>

                      <span className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${
                        selectedVariant === "Non-AC"
                          ? (nonAcIsAvail ? "bg-emerald-600 text-white shadow-sm" : "bg-red-600 text-white shadow-sm")
                          : "bg-navy/5 text-navy hover:bg-navy/10"
                      }`}>
                        {selectedVariant === "Non-AC" ? (nonAcIsAvail ? "✓ Selected (Non-AC)" : "Selected (Non-AC - Occupied)") : "Select Non-AC"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. Room Overview */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-navy/5 shadow-soft space-y-5">
                <h2 className="font-display text-xl sm:text-2xl font-bold text-navy border-b border-navy/5 pb-3">Room Overview</h2>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-ui">{roomDescription}</p>

                {/* Key Spec Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-xl bg-cream/50 border border-navy/5">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-0.5">Bed Type</span>
                    <strong className="text-xs font-bold text-navy flex items-center gap-1.5">
                      <Bed className="size-3.5 text-purple shrink-0" />
                      <span>{bedType}</span>
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-cream/50 border border-navy/5">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-0.5">Capacity</span>
                    <strong className="text-xs font-bold text-navy flex items-center gap-1.5">
                      <Users className="size-3.5 text-purple shrink-0" />
                      <span>{capacity}</span>
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-cream/50 border border-navy/5">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-0.5">Floor</span>
                    <strong className="text-xs font-bold text-navy flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-purple shrink-0" />
                      <span>{roomFloor}</span>
                    </strong>
                  </div>

                  <div className="p-3 rounded-xl bg-cream/50 border border-navy/5">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-0.5">Rate Plan</span>
                    <strong className="text-xs font-bold text-purple truncate block">
                      {ratePlan}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 7. Room Amenities */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-navy/5 shadow-soft space-y-4">
                <div className="flex justify-between items-center border-b border-navy/5 pb-3">
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-navy">Room Amenities</h2>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    selectedVariant === 'Non-AC'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-purple/10 text-purple border border-purple/20'
                  }`}>
                    {selectedVariant} Package
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {roomAmenities.map((a, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-cream/40 border border-navy/5 text-xs text-navy font-semibold">
                      <Check className="size-4 text-purple shrink-0" />
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 8. Pricing & Taxes Breakdown */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-navy/5 shadow-soft space-y-4">
                <h2 className="font-display text-xl sm:text-2xl font-bold text-navy border-b border-navy/5 pb-3">Pricing & Tariff Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-purple/5 border border-purple/15 space-y-1">
                    <span className="text-[10px] text-purple font-bold uppercase tracking-wider block">
                      {selectedVariant} Nightly Tariff
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-price text-xl font-bold text-navy tracking-tight">{inr(nightlyTariff)}</span>
                      <span className="text-gray-500 text-[10px] font-medium">/ night</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-cream/50 border border-navy/5 space-y-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Applicable Taxes</span>
                    <span className="font-bold text-navy text-sm block">18% GST (CGST 9% + SGST 9%)</span>
                    <span className="text-[10px] text-gray-500 block">Included at booking confirmation</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Sticky Reservation Summary & Date Selector */}
            <div className="space-y-6">
              
              <div className="bg-white rounded-2xl p-6 border border-navy/10 shadow-soft space-y-5 lg:sticky lg:top-24 text-left font-ui">
                <h3 className="font-display text-lg font-bold text-navy border-b border-navy/5 pb-3">Reservation Summary</h3>

                {/* Hotel & Room Selection Card */}
                <div className="p-3.5 bg-cream/40 rounded-xl border border-navy/5 space-y-1.5 text-xs">
                  <strong className="font-bold text-navy block text-sm">{hotelName}</strong>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-700 font-semibold">{roomCategoryBase}</span>
                    <span className={`text-[9.5px] font-black uppercase px-1.5 py-0.2 rounded ${
                      selectedVariant === 'Non-AC'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-purple/10 text-purple border border-purple/20'
                    }`}>
                      {selectedVariant}
                    </span>
                  </div>
                  <span className="text-gray-500 block">Room #{activeRoomNum} · {roomFloor}</span>
                  <span className="text-purple font-price font-bold block mt-1">{inr(nightlyTariff)} / night</span>
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
                      onChange={(e) => {
                        setCheckInDate(e.target.value);
                        localStorage.setItem('booking_check_in', e.target.value);
                      }}
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
                      onChange={(e) => {
                        setCheckOutDate(e.target.value);
                        localStorage.setItem('booking_check_out', e.target.value);
                      }}
                      className="w-full h-10 px-3 rounded-xl border border-navy/15 text-xs font-bold text-navy bg-white focus:outline-none focus:border-purple"
                    />
                  </div>
                </div>

                {/* Price Breakdown */}
                <dl className="space-y-2 border-t border-navy/5 pt-4 text-xs font-medium">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Room Tariff ({nightsCount} {nightsCount === 1 ? 'night' : 'nights'})</dt>
                    <dd className="font-price font-semibold text-navy">{inr(baseTariffTotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">GST 18%</dt>
                    <dd className="font-price font-semibold text-navy">{inr(gstTax)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-navy/5 pt-3 text-sm font-bold text-navy items-baseline">
                    <dt>Total Amount</dt>
                    <dd className="font-price text-sm font-bold text-purple">{inr(totalPayable)}</dd>
                  </div>
                </dl>

                {/* Book Now Button */}
                <Button
                  onClick={handleBookNow}
                  disabled={!isAvailable}
                  variant="hero"
                  size="touch"
                  className="w-full h-11 text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {isAvailable
                    ? `Book ${selectedVariant} — Instant Confirmation`
                    : activeSelectedRoom?.status === "Reserved"
                      ? `Room ${activeRoomNum} (${selectedVariant}) Reserved`
                      : `Room ${activeRoomNum} (${selectedVariant}) Occupied`}
                </Button>

                <div className="p-3 bg-purple/5 rounded-xl border border-purple/10 text-[10px] text-gray-500 space-y-1">
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