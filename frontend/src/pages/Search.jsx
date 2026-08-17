import { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  MapPin, Star, Calendar, Users, Coffee, Bed, 
  ArrowRight, ShieldCheck, Wifi, Sparkles, CheckCircle2, RotateCcw
} from "lucide-react";
import { SiteLayout } from "@/layouts/SiteLayout";
import { Input } from "@/components/ui/input";
import { inr, roomTypes } from "@/data/hs-data";
import { publicService } from "@/services/public";

// Import Resort/Room Images
import jaipurImg from "@/assets/resort_jaipur.png";
import palaceImg from "@/assets/palace_udaipur.png";
import goaImg from "@/assets/beach_goa.png";
import keralaImg from "@/assets/retreat_kerala.png";

// Map Room Types to Images
const roomImages = {
  "RT-DLX": jaipurImg,
  "RT-PRE": palaceImg,
  "RT-SUI": keralaImg,
  "RT-VIL": goaImg
};

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Book a Stay — Hour Stay" },
      { name: "description", content: "Premium hourly and daily hotel room bookings in India." }
    ]
  }),
  component: SearchPage
});

function SearchPage() {
  // Booking Selection States - start at Step 1 (Search) and selectedRoomId as null
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [activeStep, setActiveStep] = useState(1);
  
  const [destination, setDestination] = useState("Jaipur, Rajasthan");
  const [checkInDate, setCheckInDate] = useState("2026-08-12");
  const [checkOutDate, setCheckOutDate] = useState("2026-08-15");
  const [guestsCount, setGuestsCount] = useState(2);
  const [searchRoomType, setSearchRoomType] = useState("all");

  const [mediaMap, setMediaMap] = useState({});

  useEffect(() => {
    publicService.getMedia()
      .then(res => {
        if (res.success && res.data) {
          setMediaMap(res.data);
        }
      })
      .catch(err => {});
  }, []);

  const getRoomImage = (id) => {
    let key = '';
    if (id === 'RT-DLX') key = 'jaipur';
    else if (id === 'RT-PRE') key = 'palace';
    else if (id === 'RT-SUI') key = 'kerala';
    else if (id === 'RT-VIL') key = 'goa';
    return mediaMap[key] || roomImages[id] || jaipurImg;
  };

  // Filtering States
  const [priceRange, setPriceRange] = useState(40000);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Calculate nights dynamically
  const nightsCount = useMemo(() => {
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return isNaN(diffDays) ? 1 : diffDays;
  }, [checkInDate, checkOutDate]);

  // Selected Room Object
  const selectedRoom = useMemo(() => {
    return roomTypes.find(r => r.id === selectedRoomId) || null;
  }, [selectedRoomId]);

  // Pricing calculations
  const baseCost = selectedRoom ? selectedRoom.baseRate * nightsCount : 0;
  const gstCost = baseCost * 0.18; // 18% standard GST for luxury hotel rooms in India
  const totalCost = baseCost + gstCost;

  // Filtered Room List
  const filteredRooms = useMemo(() => {
    return roomTypes.filter(room => {
      // 1. Price check
      if (room.baseRate > priceRange) return false;
      
      // 2. Room Type filter
      if (searchRoomType !== "all" && room.id !== searchRoomType) return false;
      
      // 3. Amenities check
      if (selectedAmenities.length > 0) {
        const hasAll = selectedAmenities.every(amenity => 
          room.amenities.some(a => a.toLowerCase().includes(amenity.toLowerCase()))
        );
        if (!hasAll) return false;
      }

      // 4. Availability check (simulate some villa inventory constraints)
      if (onlyAvailable && room.inventory < 10) return false;

      return true;
    });
  }, [priceRange, searchRoomType, selectedAmenities, onlyAvailable]);

  // Toggle Amenity helper
  const handleAmenityToggle = (amenity) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter(a => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  // Reset Filters
  const resetFilters = () => {
    setPriceRange(40000);
    setSelectedAmenities([]);
    setOnlyAvailable(false);
    setSearchRoomType("all");
  };

  return (
    <SiteLayout>
      <section className="bg-cream min-h-screen py-10 font-ui">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">

          {/* 1. Step Progress Indicator */}
          <div className="flex justify-between items-center max-w-3xl mx-auto mb-10 text-[10px] sm:text-xs font-bold uppercase tracking-wider border-b border-navy/5 pb-6">
            {/* Step 1: Search */}
            <div className={`flex items-center gap-2 ${activeStep === 1 ? "text-purple font-bold" : "text-navy/40"}`}>
              <span className={`flex items-center justify-center size-5 rounded-full text-[9px] font-bold ${
                activeStep === 1 
                  ? "bg-purple text-cream shadow-[rgba(91,33,182,0.2)_0px_4px_10px]" 
                  : "bg-navy/5 text-navy/40"
              }`}>1</span>
              <span>Search</span>
            </div>
            <div className="h-[2px] flex-1 max-w-[40px] sm:max-w-[60px] bg-navy/10 mx-2" />

            {/* Step 2: Select Room */}
            <div className={`flex items-center gap-2 ${activeStep === 2 ? "text-purple font-bold" : "text-navy/40"}`}>
              <span className={`flex items-center justify-center size-5 rounded-full text-[9px] font-bold ${
                activeStep === 2 
                  ? "bg-purple text-cream shadow-[rgba(91,33,182,0.2)_0px_4px_10px]" 
                  : "bg-navy/5 text-navy/40"
              }`}>2</span>
              <span>Select Room</span>
            </div>
            <div className="h-[2px] flex-1 max-w-[40px] sm:max-w-[60px] bg-navy/10 mx-2" />

            {/* Step 3: Guest Details */}
            <div className={`flex items-center gap-2 ${activeStep === 3 ? "text-purple font-bold" : "text-navy/40"}`}>
              <span className={`flex items-center justify-center size-5 rounded-full text-[9px] font-bold ${
                activeStep === 3 
                  ? "bg-purple text-cream shadow-[rgba(91,33,182,0.2)_0px_4px_10px]" 
                  : "bg-navy/5 text-navy/40"
              }`}>3</span>
              <span>Guest Details</span>
            </div>
            <div className="h-[2px] flex-1 max-w-[40px] sm:max-w-[60px] bg-navy/10 mx-2" />

            {/* Step 4: Payment */}
            <div className={`flex items-center gap-2 ${activeStep === 4 ? "text-purple font-bold" : "text-navy/40"}`}>
              <span className={`flex items-center justify-center size-5 rounded-full text-[9px] font-bold ${
                activeStep === 4 
                  ? "bg-purple text-cream shadow-[rgba(91,33,182,0.2)_0px_4px_10px]" 
                  : "bg-navy/5 text-navy/40"
              }`}>4</span>
              <span>Payment</span>
            </div>
            <div className="h-[2px] flex-1 max-w-[40px] sm:max-w-[60px] bg-navy/10 mx-2" />

            {/* Step 5: Confirmation */}
            <div className={`flex items-center gap-2 ${activeStep === 5 ? "text-purple font-bold" : "text-navy/40"}`}>
              <span className={`flex items-center justify-center size-5 rounded-full text-[9px] font-bold ${
                activeStep === 5 
                  ? "bg-purple text-cream shadow-[rgba(91,33,182,0.2)_0px_4px_10px]" 
                  : "bg-navy/5 text-navy/40"
              }`}>5</span>
              <span>Confirmation</span>
            </div>
          </div>

          {/* 2. Top Large Booking Panel */}
          <div className="bg-white rounded-[32px] border-[5px] border-white p-6 sm:p-8 shadow-[rgba(13,27,42,0.06)_0px_20px_25px_-5px] mb-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[6px] bg-gradient-to-r from-purple via-coral to-gold" />
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="size-4 text-gold animate-pulse" />
              <span className="text-xs font-bold text-purple uppercase tracking-wider">Book Direct For Premium Member Rates</span>
            </div>

            <div className="grid gap-5 md:grid-cols-5 items-end">
              {/* Destination */}
              <div>
                <label className="text-[10px] font-bold text-navy uppercase tracking-wider block mb-2 ml-1">Destination / Property</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-3.5 size-4 text-navy/40" />
                  <select 
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full h-11 bg-cream/35 border border-navy/5 pl-10 pr-4 rounded-full text-xs font-semibold text-navy focus:outline-none focus:border-purple/50 appearance-none cursor-pointer"
                  >
                    <option value="Jaipur, Rajasthan">Jaipur (Rambagh Residency)</option>
                    <option value="Udaipur, Rajasthan">Udaipur (Lake Palace View)</option>
                    <option value="Candolim, Goa">Goa (Candolim Beach Resort)</option>
                    <option value="Alleppey, Kerala">Alleppey (Backwater Retreat)</option>
                    <option value="New Delhi">New Delhi (Aerocity)</option>
                    <option value="Mumbai, Maharashtra">Mumbai (Marine Drive)</option>
                  </select>
                </div>
              </div>

              {/* Check-In */}
              <div>
                <label className="text-[10px] font-bold text-navy uppercase tracking-wider block mb-2 ml-1">Check-in</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-3.5 size-4 text-navy/40" />
                  <Input 
                    type="date" 
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full h-11 bg-cream/35 border-navy/5 pl-10 pr-4 rounded-full text-xs font-semibold text-navy focus-visible:ring-purple/50" 
                  />
                </div>
              </div>

              {/* Check-Out */}
              <div>
                <label className="text-[10px] font-bold text-navy uppercase tracking-wider block mb-2 ml-1">Check-out</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-3.5 size-4 text-navy/40" />
                  <Input 
                    type="date" 
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full h-11 bg-cream/35 border-navy/5 pl-10 pr-4 rounded-full text-xs font-semibold text-navy focus-visible:ring-purple/50" 
                  />
                </div>
              </div>

              {/* Guests */}
              <div>
                <label className="text-[10px] font-bold text-navy uppercase tracking-wider block mb-2 ml-1">Guests</label>
                <div className="relative">
                  <Users className="absolute left-4 top-3.5 size-4 text-navy/40" />
                  <select 
                    value={guestsCount}
                    onChange={(e) => setGuestsCount(parseInt(e.target.value))}
                    className="w-full h-11 bg-cream/35 border border-navy/5 pl-10 pr-4 rounded-full text-xs font-semibold text-navy focus:outline-none focus:border-purple/50 appearance-none cursor-pointer"
                  >
                    <option value="1">1 Guest</option>
                    <option value="2">2 Guests</option>
                    <option value="3">3 Guests</option>
                    <option value="4">4 Guests</option>
                  </select>
                </div>
              </div>

              {/* Search Rooms Button */}
              <div>
                <button 
                  type="button"
                  onClick={() => {
                    setActiveStep(2); // Go to Select Room step
                  }}
                  className="w-full h-11 font-bold bg-gold text-navy hover:bg-gold/90 rounded-full shadow-[rgba(245,192,106,0.25)_0px_8px_16px_-4px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-xs uppercase tracking-wider border-none cursor-pointer"
                >
                  Search Rooms
                </button>
              </div>
            </div>
          </div>

          {/* 3. Main Body Grid (Filters, Room List, Sticky Summary) */}
          <div className="grid gap-8 lg:grid-cols-[260px_1fr_320px] items-start">
            
            {/* Column A: Filters Sidebar */}
            <aside className="space-y-6 text-left">
              <div className="bg-white rounded-2xl p-5 border border-navy/5 shadow-sm">
                <div className="flex justify-between items-center border-b border-navy/5 pb-3 mb-4">
                  <h3 className="font-display text-base font-bold text-navy">Filters</h3>
                  <button 
                    onClick={resetFilters}
                    className="text-[10px] font-bold text-purple hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="size-3" /> Reset
                  </button>
                </div>

                {/* Room type filter */}
                <div className="space-y-3 mb-6">
                  <h4 className="text-[10px] font-bold text-navy/55 uppercase tracking-wider">Room Type</h4>
                  <div className="flex flex-col gap-2">
                    {[
                      { label: "All Rooms", value: "all" },
                      { label: "Deluxe", value: "RT-DLX" },
                      { label: "Premier", value: "RT-PRE" },
                      { label: "Maharaja Suite", value: "RT-SUI" },
                      { label: "Pool Villa", value: "RT-VIL" }
                    ].map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2.5 text-xs text-navy/80 cursor-pointer">
                        <input 
                          type="radio" 
                          name="roomFilter" 
                          checked={searchRoomType === opt.value}
                          onChange={() => setSearchRoomType(opt.value)}
                          className="size-4 rounded-full accent-purple border-navy/10"
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price range filter */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-bold text-navy/55 uppercase tracking-wider">Max Price / Night</h4>
                    <span className="text-xs font-bold text-purple">{inr(priceRange)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="5000" 
                    max="40000" 
                    step="1000"
                    value={priceRange}
                    onChange={(e) => setPriceRange(parseInt(e.target.value))}
                    className="w-full accent-purple h-1 bg-cream rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-navy/40 font-bold">
                    <span>₹5,000</span>
                    <span>₹40,000</span>
                  </div>
                </div>

                {/* Amenities checklist */}
                <div className="space-y-3 mb-6">
                  <h4 className="text-[10px] font-bold text-navy/55 uppercase tracking-wider">Amenities</h4>
                  <div className="flex flex-col gap-2">
                    {["Breakfast", "Balcony", "Pool", "Spa", "Butler"].map((a) => (
                      <label key={a} className="flex items-center gap-2.5 text-xs text-navy/80 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={selectedAmenities.includes(a)}
                          onChange={() => handleAmenityToggle(a)}
                          className="size-4 rounded accent-purple border-navy/10"
                        />
                        <span>{a}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Instant confirmation toggle */}
                <div className="pt-4 border-t border-navy/5">
                  <label className="flex items-center justify-between text-xs text-navy/85 cursor-pointer">
                    <span className="font-bold">Instant Book Only</span>
                    <input 
                      type="checkbox" 
                      checked={onlyAvailable}
                      onChange={(e) => setOnlyAvailable(e.target.checked)}
                      className="size-4 rounded accent-purple border-navy/10"
                    />
                  </label>
                </div>
              </div>
            </aside>

            {/* Column B: Visually Rich Room Options List */}
            <main className="space-y-6 text-left">
              {filteredRooms.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-navy/5 text-center space-y-4">
                  <p className="text-sm text-navy/40 font-semibold">No rooms match your active filters.</p>
                  <button 
                    onClick={resetFilters}
                    className="px-4 py-2 bg-navy text-cream rounded-full text-xs font-bold hover:bg-navy/90 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                filteredRooms.map((room) => {
                  const isSelected = selectedRoomId === room.id;
                  return (
                    <article 
                      key={room.id}
                      className={`grid sm:grid-cols-[240px_1fr] bg-white rounded-2xl border overflow-hidden transition-all duration-300 ${
                        isSelected 
                          ? "border-purple shadow-[rgba(91,33,182,0.06)_0px_20px_25px_-5px]" 
                          : "border-navy/5 shadow-sm hover:shadow-md hover:border-navy/10"
                      }`}
                    >
                      {/* Image container */}
                      <div className="relative h-48 sm:h-full min-h-[180px] overflow-hidden bg-navy">
                        <img 
                          src={getRoomImage(room.id)} 
                          alt={room.name} 
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                        <div className="absolute top-3 left-3 bg-navy/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-bold text-gold uppercase tracking-wider">
                          {room.size}
                        </div>
                      </div>

                      {/* Detail container */}
                      <div className="p-5 flex flex-col justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-4">
                            <h3 className="font-display text-lg sm:text-xl font-bold text-navy">{room.name}</h3>
                            <div className="flex items-center gap-1 shrink-0">
                              <Star className="size-3.5 fill-gold text-gold" />
                              <span className="text-xs font-bold text-navy">4.9</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-navy/50 font-medium">
                            <span className="flex items-center gap-1"><Bed className="size-3.5 text-gold" /> {room.beds}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Users className="size-3.5 text-gold" /> Max {room.occupancy} guests</span>
                          </div>

                          <p className="text-xs text-navy/70 leading-relaxed font-normal pt-1">
                            Enjoy premium amenities and access to the heritage lounge. Perfect for business travelers and luxury seekers.
                          </p>

                          {/* Amenities badges */}
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {room.amenities.map((a, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-cream text-navy/70 font-semibold text-[10px] border border-navy/5">
                                {a.toLowerCase().includes("wifi") && <Wifi className="size-3" />}
                                {a.toLowerCase().includes("breakfast") && <Coffee className="size-3" />}
                                <span>{a}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Action section */}
                        <div className="flex justify-between items-center pt-3 border-t border-navy/5">
                          <div>
                            <span className="font-display text-xl sm:text-2xl font-bold text-navy">{inr(room.baseRate)}</span>
                            <span className="text-[10px] text-navy/40 font-bold block">per night + GST</span>
                          </div>

                          <button 
                            type="button"
                            onClick={() => {
                              setSelectedRoomId(room.id);
                              setActiveStep(2); // Advance to Select Room when room is selected
                            }}
                            className={`h-10 px-5 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? "bg-purple text-cream shadow-[rgba(91,33,182,0.2)_0px_8px_15px] scale-[1.02] border-none"
                                : "border border-navy/15 text-navy hover:bg-navy/5"
                            }`}
                          >
                            {isSelected ? "Selected" : "Select Room"}
                          </button>
                        </div>
                      </div>

                    </article>
                  );
                })
              )}
            </main>

            {/* Column C: Sticky Right-Side Booking Summary Card */}
            <aside className="lg:sticky lg:top-24 space-y-4 text-left">
              {bookingSuccess && selectedRoom ? (
                <div className="bg-white rounded-2xl border-2 border-purple p-6 text-center shadow-lg animate-fade-in space-y-4">
                  <div className="flex justify-center">
                    <CheckCircle2 className="size-12 text-purple animate-bounce" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-navy">Simulated Booking Initiated</h3>
                  <p className="text-xs text-navy/70 leading-relaxed font-ui">
                    Your request for the <strong>{selectedRoom.name}</strong> is queued. We would now forward you to the Guest details step.
                  </p>
                  <button
                    onClick={() => {
                      setBookingSuccess(false);
                      setSelectedRoomId(null);
                      setActiveStep(1); // Reset to Search
                    }}
                    className="w-full h-10 bg-navy text-cream font-bold text-xs uppercase rounded-full hover:bg-navy/95 transition-colors cursor-pointer border-none"
                  >
                    Modify Selection
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-navy/5 p-6 shadow-sm space-y-5">
                  <h3 className="font-display text-base font-bold text-navy border-b border-navy/5 pb-3">
                    Booking Summary
                  </h3>

                  {/* Stay Details */}
                  <div className="space-y-3.5 text-xs">
                    <div>
                      <p className="text-[9px] font-bold text-navy/40 uppercase tracking-wider">Property & Location</p>
                      <p className="font-bold text-navy mt-0.5">{destination.split(" (")[0]}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-navy/40 uppercase tracking-wider">Check-in</p>
                        <p className="font-bold text-navy mt-0.5">{checkInDate}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-navy/40 uppercase tracking-wider">Check-out</p>
                        <p className="font-bold text-navy mt-0.5">{checkOutDate}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-navy/40 uppercase tracking-wider">Duration</p>
                        <p className="font-bold text-navy mt-0.5">{nightsCount} {nightsCount === 1 ? "Night" : "Nights"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-navy/40 uppercase tracking-wider">Guests</p>
                        <p className="font-bold text-navy mt-0.5">{guestsCount} {guestsCount === 1 ? "Guest" : "Guests"}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-navy/5">
                      <p className="text-[9px] font-bold text-navy/40 uppercase tracking-wider">Selected Room</p>
                      {selectedRoom ? (
                        <>
                          <p className="font-bold text-purple mt-0.5">{selectedRoom.name}</p>
                          <p className="text-[10px] text-navy/50 mt-0.5">{selectedRoom.size} · {selectedRoom.beds}</p>
                        </>
                      ) : (
                        <p className="font-bold text-navy/40 mt-0.5">None selected</p>
                      )}
                    </div>
                  </div>

                  {/* Price Calculation details */}
                  <div className="bg-cream/45 p-3.5 rounded-xl space-y-2 text-xs border border-navy/5">
                    {selectedRoom ? (
                      <>
                        <div className="flex justify-between text-navy/70">
                          <span>Room Tariff ({nightsCount} x {inr(selectedRoom.baseRate)})</span>
                          <span>{inr(baseCost)}</span>
                        </div>
                        <div className="flex justify-between text-navy/70">
                          <span>GST Tax slab (18% GST)</span>
                          <span>{inr(gstCost)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-navy pt-2 border-t border-navy/5 text-sm">
                          <span>Total Amount</span>
                          <span>{inr(totalCost)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4 text-navy/40 italic">
                        Select a room to calculate tariff
                      </div>
                    )}
                  </div>

                  {/* Trust badge */}
                  <div className="flex gap-2.5 items-start text-[10px] text-navy/60 leading-normal bg-purple/5 p-3 rounded-lg border border-purple/10">
                    <ShieldCheck className="size-4.5 text-purple shrink-0 mt-0.5" />
                    <span>Best Price Guaranteed. Pay at hotel options available. Free cancellation included.</span>
                  </div>

                  {/* Proceed CTA */}
                  <button
                    type="button"
                    disabled={!selectedRoom}
                    onClick={() => {
                      setBookingSuccess(true);
                      setActiveStep(3); // Go to Guest Details step!
                    }}
                    className={`w-full h-11 font-bold text-xs uppercase tracking-wider rounded-full flex items-center justify-center gap-1.5 transition-all duration-300 border-none ${
                      selectedRoom 
                        ? "bg-purple text-cream hover:bg-purple/95 hover:scale-[1.02] shadow-[rgba(91,33,182,0.2)_0px_8px_16px] cursor-pointer"
                        : "bg-navy/10 text-navy/35 cursor-not-allowed"
                    }`}
                  >
                    <span>{selectedRoom ? "Proceed to Details" : "Select a Room First"}</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              )}
            </aside>

          </div>

        </div>
      </section>
    </SiteLayout>
  );
}