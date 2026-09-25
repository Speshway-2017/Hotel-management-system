import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useParams } from "react-router-dom";
import { 
  MapPin, Star, Calendar, Users, Coffee, Bed, 
  ShieldCheck, Wifi, Sparkles, CheckCircle2, Phone, Mail, Globe, Clock, FileText, ArrowRight, ChevronRight
} from "lucide-react";
import { SiteLayout } from "@/layouts/SiteLayout";
import { Button } from "@/components/ui/button";
import { inr } from "@/data/hs-data";
import { publicService } from "@/services/public";
import { authService } from "@/services/auth";

import jaipurImg from "@/assets/resort_jaipur.png";
import palaceImg from "@/assets/palace_udaipur.png";
import goaImg from "@/assets/beach_goa.png";
import keralaImg from "@/assets/retreat_kerala.png";

export const Route = {
  head: () => ({
    meta: [
      { title: "Hotel Details — Hour Stay" },
      { name: "description", content: "View full hotel amenities, rooms, pricing, policies and check-in details." }
    ]
  }),
  component: HotelDetailsPage
};

export function HotelDetailsPage() {
  const params = useParams() || {};
  let routePropId = params.propertyId || params.id;
  if (!routePropId && typeof window !== 'undefined') {
    const match = window.location.pathname.match(/\/hotels\/([^/]+)/);
    if (match && match[1]) routePropId = match[1];
  }
  const targetId = routePropId || localStorage.getItem('selected_property_id') || 'HS-9HQ8P';

  const [property, setProperty] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError("");

    Promise.all([
      publicService.getProperty(targetId).catch(err => ({ success: false, error: err })),
      publicService.getPropertyRooms(targetId).catch(err => ({ success: false, error: err }))
    ]).then(async ([propRes, roomsRes]) => {
      if (!isMounted) return;

      let foundProperty = null;
      if (propRes && propRes.success && propRes.data) {
        foundProperty = propRes.data;
      } else if (propRes && propRes.data) {
        foundProperty = propRes.data;
      }

      if (!foundProperty) {
        const allPropsRes = await publicService.getProperties().catch(() => null);
        if (allPropsRes && allPropsRes.success && Array.isArray(allPropsRes.data) && allPropsRes.data.length > 0) {
          foundProperty = allPropsRes.data.find(p => p._id === targetId || p.id === targetId) || allPropsRes.data[0];
        }
      }

      if (foundProperty) {
        setProperty(foundProperty);
        setError("");
        const s = foundProperty.settings || {};
        const gallery = s.gallery || s.photos || [];
        if (gallery.length > 0) {
          setSelectedImage(gallery[0]);
        }
      } else {
        setError("Hotel details not found.");
      }

      let fetchedRooms = (roomsRes && roomsRes.success && Array.isArray(roomsRes.data)) ? roomsRes.data : [];

      if (fetchedRooms.length === 0) {
        const fallbackAllRes = await publicService.getPropertyRooms('all').catch(() => null);
        if (fallbackAllRes && fallbackAllRes.success && Array.isArray(fallbackAllRes.data) && fallbackAllRes.data.length > 0) {
          fetchedRooms = fallbackAllRes.data;
        }
      }

      if (isMounted) {
        setRooms(fetchedRooms);
      }
    }).finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, [targetId]);

  const handleNavigateToRoom = (type) => {
    if (property) {
      localStorage.setItem('selected_property_id', property._id || property.id || targetId);
      localStorage.setItem('selected_property_data', JSON.stringify(property));
    }
    const targetRoom = type.roomsList.find(r => r.status === 'Available' || r.isAvailable === true) || type.roomsList[0];
    if (targetRoom) {
      localStorage.setItem('selected_room_data', JSON.stringify(targetRoom));
    }

    const roomParam = encodeURIComponent(type.id || type.category);
    window.location.href = `/rooms/${roomParam}`;
  };

  if (loading) {
    return (
      <SiteLayout>
        <div className="min-h-screen bg-cream py-20 text-center font-ui">
          <div className="mx-auto size-12 rounded-full border-4 border-purple border-t-transparent animate-spin mb-4" />
          <p className="text-navy/70 text-sm font-semibold">Loading hotel details from MongoDB...</p>
        </div>
      </SiteLayout>
    );
  }

  if (error || !property) {
    return (
      <SiteLayout>
        <div className="min-h-screen bg-cream py-20 text-center font-ui">
          <h2 className="text-2xl font-bold text-navy mb-2">Hotel Not Found</h2>
          <p className="text-navy/60 text-sm mb-6">The requested property details could not be retrieved from MongoDB.</p>
          <Button onClick={() => window.location.href = '/search'} variant="hero" size="touch" className="cursor-pointer">
            Back to All Hotels
          </Button>
        </div>
      </SiteLayout>
    );
  }

  const s = property.settings || {};
  let hotelName = s.hotelName || s.name || property.name || "Speshway Luxury Hotel";
  if (/^[0-9a-fA-F]{24}$/.test(hotelName) || /^HS-[A-Z0-9]+$/.test(hotelName)) {
    hotelName = "Speshway Luxury Hotel";
  }

  const city = s.city || property.city || "Hyderabad";
  const fullLocation = [s.address, s.city, s.state, s.country].filter(Boolean).join(", ") || `${city}, India`;
  const description = s.description || "Experience refined hospitality, luxurious rooms, and heritage charm.";
  const classification = s.classification || "5-Star Luxury";
  const rating = s.rating || "4.9";
  const checkIn = s.checkInTime || "12:00 PM";
  const checkOut = s.checkOutTime || "11:00 AM";
  const cancelPolicy = s.cancellationPolicy || s.cancelPolicy || "Free cancellation up to 24 hours prior to check-in.";
  const policies = s.policies || s.propertyPolicies || "Government-approved photo ID required at check-in. Couples welcome.";
  const phone = s.contactNumber || s.phone || "+91 98204 33121";
  const email = s.reservationEmail || s.email || "reservations@speshway.com";
  const amenitiesList = Array.isArray(s.amenities) 
    ? s.amenities 
    : (typeof s.amenities === 'string' ? s.amenities.split(',').map(a => a.trim()).filter(Boolean) : ["Free High-Speed WiFi", "Swimming Pool", "Spa & Wellness", "24/7 Room Service", "Fine Dining Restaurant"]);

  const gallery = (Array.isArray(s.gallery) && s.gallery.length > 0) ? s.gallery : 
                  (Array.isArray(s.photos) && s.photos.length > 0) ? s.photos : 
                  [jaipurImg, palaceImg, goaImg, keralaImg];

  const mainImage = selectedImage || gallery[0] || jaipurImg;

  // Group rooms by Room Type (category)
  const roomTypesMap = {};
  rooms.forEach(rm => {
    const statusVal = (rm.status || "").toLowerCase();
    if (['dirty', 'cleaning', 'maintenance', 'out of order'].includes(statusVal)) return;

    const cat = rm.category || 'Standard Room';
    const planName = (rm.ratePlan && rm.ratePlan !== 'Standard Plan' && rm.ratePlan !== 'Standard Rate Plan')
      ? rm.ratePlan
      : (cat.toLowerCase().includes('deluxe') ? 'Deluxe Plan' : cat.toLowerCase().includes('suite') ? 'Executive Suite Plan' : `${cat} Plan`);

    if (!roomTypesMap[cat]) {
      roomTypesMap[cat] = {
        id: rm.id || rm._id || cat,
        category: cat,
        name: cat,
        description: rm.description || `Luxury ${cat} configuration with modern amenities.`,
        price: Number(rm.currentRate || rm.baseRate || rm.dailyRate || 3000),
        ratePlan: planName,
        beds: rm.beds || rm.bedType || 'King Bed',
        capacity: rm.capacity || '2 Adults',
        floor: rm.floor || 'Floor 1',
        amenities: Array.isArray(rm.amenities)
          ? rm.amenities
          : (typeof rm.amenities === 'string' ? rm.amenities.split(',').map(a => a.trim()).filter(Boolean) : []),
        images: Array.isArray(rm.images) ? rm.images.filter(Boolean) : [],
        roomsList: [],
        availableCount: 0
      };
    }
    roomTypesMap[cat].roomsList.push(rm);
    const isAvail = rm.status === 'Available' || rm.isAvailable === true;
    if (isAvail) {
      roomTypesMap[cat].availableCount += 1;
    }
  });

  const roomTypeCards = Object.values(roomTypesMap);

  return (
    <SiteLayout>
      <div className="bg-cream min-h-screen py-8 font-ui text-left">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6">
            <Link to="/search" className="hover:text-purple font-medium">All Hotels</Link>
            <ChevronRight className="size-3" />
            <span className="text-navy font-bold">{hotelName}</span>
          </nav>

          {/* Header Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-navy/5 shadow-soft mb-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-purple/10 text-purple text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    {classification}
                  </span>
                  <div className="flex items-center gap-1 text-gold text-xs font-bold">
                    <Star className="size-4 fill-gold text-gold" />
                    <span>{rating} (Verified Guests)</span>
                  </div>
                </div>

                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-navy">{hotelName}</h1>
                <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1.5 mt-2">
                  <MapPin className="size-4 text-purple shrink-0" />
                  <span>{fullLocation}</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => {
                    if (roomTypeCards.length > 0) {
                      handleNavigateToRoom(roomTypeCards[0]);
                    } else {
                      window.location.href = `/rooms/Standard%20Room`;
                    }
                  }}
                  variant="hero" 
                  size="touch"
                  className="cursor-pointer"
                >
                  Book Your Stay
                </Button>
              </div>
            </div>
          </div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10">
            <div className="lg:col-span-2 h-[340px] sm:h-[440px] rounded-2xl overflow-hidden bg-navy relative border border-navy/5 shadow-soft">
              <img src={mainImage} alt={hotelName} className="w-full h-full object-cover" />
              {s.logo && (
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md p-2.5 rounded-xl border border-navy/10 max-w-[140px]">
                  <img src={s.logo} alt="Logo" className="h-8 object-contain" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              {gallery.slice(0, 3).map((img, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedImage(img)}
                  className={`h-[160px] sm:h-[135px] lg:h-[136px] rounded-xl overflow-hidden bg-navy cursor-pointer border-2 transition-all ${
                    mainImage === img ? "border-purple scale-[0.98]" : "border-white hover:border-purple/50"
                  }`}
                >
                  <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Main Details & Room Types Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              
              {/* About Hotel */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-navy/5 shadow-soft space-y-4">
                <h2 className="font-display text-xl sm:text-2xl font-bold text-navy border-b border-navy/5 pb-3">About Property</h2>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-ui">{description}</p>
              </div>

              {/* Property Amenities */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-navy/5 shadow-soft space-y-4">
                <h2 className="font-display text-xl sm:text-2xl font-bold text-navy border-b border-navy/5 pb-3">Hotel Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {amenitiesList.map((a, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-cream/40 border border-navy/5 text-xs text-navy font-semibold">
                      <CheckCircle2 className="size-4 text-purple shrink-0" />
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Available Rooms Section - 1 Card Per Configured Room Type */}
              <div className="space-y-6 font-ui text-left">
                <div className="flex justify-between items-center border-b border-navy/5 pb-3">
                  <div>
                    <h2 className="font-display text-2xl sm:text-3xl font-bold text-navy">Available Rooms</h2>
                    <p className="text-xs sm:text-sm text-gray-600 font-ui">Configured room types and live tariffs fetched from MongoDB</p>
                  </div>
                  {roomTypeCards.length > 0 && (
                    <span className="text-xs font-bold text-purple bg-purple/10 px-3.5 py-1 rounded-full border border-purple/20">
                      {roomTypeCards.length} Room Types
                    </span>
                  )}
                </div>

                {roomTypeCards.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-navy/5 shadow-soft">
                    <Bed className="size-10 text-navy/30 mx-auto mb-3" />
                    <h3 className="font-display text-lg font-bold text-navy">No Rooms Currently Available</h3>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 font-ui">There are no active room configurations available for this property at the moment.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {roomTypeCards.map((type) => {
                      const hasUploadedImages = type.images.length > 0;
                      const primaryRoomImage = hasUploadedImages ? type.images[0] : null;
                      const isAvailable = type.availableCount > 0;

                      return (
                        <div 
                          key={type.category} 
                          className="bg-white rounded-2xl border border-navy/10 shadow-soft hover:shadow-md hover:border-purple/20 overflow-hidden transition-all duration-300 flex flex-col justify-between font-ui"
                        >
                          {/* Image Thumbnail Container */}
                          <div className="h-48 relative bg-navy/5 border-b border-navy/5 overflow-hidden">
                            {primaryRoomImage ? (
                              <img 
                                src={primaryRoomImage} 
                                alt={type.category} 
                                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-navy/5 to-purple/5 text-navy/40">
                                <Bed className="size-10 mb-2 text-purple/40" />
                                <span className="text-xs font-bold uppercase tracking-wider text-navy/60">{type.category}</span>
                              </div>
                            )}

                            {/* Badges Overlay */}
                            <div className="absolute top-3 left-3 flex gap-2">
                              <span className="bg-navy/85 text-gold text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider backdrop-blur-md border border-gold/20">
                                {type.category}
                              </span>
                            </div>

                            <span className={`absolute bottom-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider backdrop-blur-md ${
                              isAvailable ? "bg-emerald-600/90 text-white" : "bg-gray-600/90 text-white"
                            }`}>
                              {isAvailable ? `${type.availableCount} Available` : "Sold Out"}
                            </span>
                          </div>

                          {/* Room Type Details Body */}
                          <div className="p-5 space-y-3 text-left flex-1 flex flex-col justify-between">
                            <div className="space-y-2">
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <h3 className="font-display text-lg font-bold text-navy leading-snug">
                                    {type.category}
                                  </h3>
                                  <div className="flex items-center gap-2.5 text-xs text-gray-600 mt-1 flex-wrap font-medium">
                                    <span className="flex items-center gap-1">
                                      <Bed className="size-3.5 text-purple shrink-0" />
                                      <span>{type.beds}</span>
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <Users className="size-3.5 text-purple shrink-0" />
                                      <span>{type.capacity}</span>
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="font-display text-xl font-bold text-navy block leading-none">
                                    {inr(type.price)}
                                  </span>
                                  <span className="text-[10px] text-gray-500 font-bold block mt-0.5">/ night + 18% GST</span>
                                </div>
                              </div>

                              <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 pt-1 font-ui">
                                {type.description}
                              </p>

                              {/* Amenities Badges */}
                              {type.amenities.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-2">
                                  {type.amenities.slice(0, 4).map((a, idx) => (
                                    <span key={idx} className="text-[10px] bg-cream/80 border border-navy/5 px-2.5 py-0.5 rounded-md text-navy/80 font-semibold flex items-center gap-1">
                                      <Sparkles className="size-2.5 text-purple shrink-0" />
                                      <span>{a}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Action Bar: Book Now Only */}
                            <div className="pt-4 border-t border-navy/5 flex items-center justify-end gap-3 mt-3">
                              <Button 
                                onClick={() => handleNavigateToRoom(type)}
                                variant="hero" 
                                size="touch" 
                                disabled={!isAvailable}
                                className="w-full text-xs h-9 px-5 cursor-pointer disabled:opacity-50 font-bold"
                              >
                                {isAvailable ? "Book Now" : "Sold Out"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Key Facts, Timings, Policies & Contact */}
            <div className="space-y-6">
              
              {/* Check-In / Check-Out Timings */}
              <div className="bg-white rounded-2xl p-6 border border-navy/5 shadow-soft space-y-4">
                <h3 className="font-display text-base font-bold text-navy border-b border-navy/5 pb-3 flex items-center gap-2">
                  <Clock className="size-4 text-purple" />
                  <span>Hotel Schedule</span>
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-cream/30 border border-navy/5">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Check-In</span>
                    <strong className="text-navy text-sm font-bold block">{checkIn}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-cream/30 border border-navy/5">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Check-Out</span>
                    <strong className="text-navy text-sm font-bold block">{checkOut}</strong>
                  </div>
                </div>
              </div>

              {/* Hotel Policies */}
              <div className="bg-white rounded-2xl p-6 border border-navy/5 shadow-soft space-y-4">
                <h3 className="font-display text-base font-bold text-navy border-b border-navy/5 pb-3 flex items-center gap-2">
                  <FileText className="size-4 text-purple" />
                  <span>Policies & Guidelines</span>
                </h3>
                <div className="space-y-3 text-xs text-gray-600 leading-relaxed font-ui">
                  <div>
                    <strong className="text-navy font-bold block mb-0.5">Cancellation Policy:</strong>
                    <span>{cancelPolicy}</span>
                  </div>
                  <div>
                    <strong className="text-navy font-bold block mb-0.5">Guest Policy:</strong>
                    <span>{policies}</span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-white rounded-2xl p-6 border border-navy/5 shadow-soft space-y-4">
                <h3 className="font-display text-base font-bold text-navy border-b border-navy/5 pb-3 flex items-center gap-2">
                  <Phone className="size-4 text-purple" />
                  <span>Front Desk & Support</span>
                </h3>
                <div className="space-y-3 text-xs text-navy/80 font-medium">
                  <div className="flex items-center gap-3">
                    <Phone className="size-4 text-purple shrink-0" />
                    <span>{phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="size-4 text-purple shrink-0" />
                    <span>{email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Globe className="size-4 text-purple shrink-0" />
                    <span>www.hourstay.in</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </SiteLayout>
  );
}
