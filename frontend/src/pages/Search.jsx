import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  MapPin, Star, Check, ShieldCheck, FileText, Calendar, 
  User, CheckCircle2, CreditCard, ChevronRight, X, ArrowLeft,
  Smartphone, Award, Percent, Users, Clock, Coffee, AlertCircle,
  HelpCircle, ChevronLeft, ChevronRight as ChevronRightIcon, Heart
} from "lucide-react";
import { SiteLayout } from "@/layouts/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inr } from "@/data/hs-data";

// Import Resort Images for Gallery
import jaipurImg from "@/assets/resort_jaipur.png";
import goaImg from "@/assets/beach_goa.png";
import palaceImg from "@/assets/palace_udaipur.png";
import keralaImg from "@/assets/retreat_kerala.png";

// Mock hotels data with room choices and details
const mockHotels = [
  {
    id: "HS-JAI",
    name: "Hour Stay Rambagh Residency",
    city: "Jaipur, Rajasthan",
    rating: 4.8,
    reviews: 1284,
    tags: ["Heritage haveli", "Courtyard pool", "Free breakfast"],
    image: jaipurImg,
    images: [jaipurImg, palaceImg, keralaImg],
    propertyType: "Heritage",
    description: "A calm, premium property management suite built for Indian hospitality in the heart of Jaipur.",
    rooms: [
      { id: "JAI-DLX", name: "Deluxe Courtyard Room", price: 8900, size: "34 sqm", beds: "1 King Bed", amenities: ["Courtyard view", "Rain shower", "Complimentary breakfast"], cancellation: "Free cancellation before 24 hrs", breakfast: true },
      { id: "JAI-PRE", name: "Premier Haveli Room", price: 12400, size: "42 sqm", beds: "1 King / 2 Twin Beds", amenities: ["Jharokha balcony", "Butler service", "Lounge access"], cancellation: "Free cancellation before 24 hrs", breakfast: true },
      { id: "JAI-SUI", name: "Maharaja Suite", price: 24500, size: "68 sqm", beds: "1 King + Living Room", amenities: ["Private terrace", "Jacuzzi", "Airport transfer"], cancellation: "Non-refundable", breakfast: true }
    ]
  },
  {
    id: "HS-UDA",
    name: "Hour Stay Lake Palace View",
    city: "Udaipur, Rajasthan",
    rating: 4.9,
    reviews: 962,
    tags: ["Lake view", "Rooftop dining", "Spa"],
    image: palaceImg,
    images: [palaceImg, jaipurImg, goaImg],
    propertyType: "Resort",
    description: "A stunning lakeside retreat featuring majestic views of Lake Pichola and traditional Mewari design.",
    rooms: [
      { id: "UDA-DLX", name: "Deluxe Lakeview Room", price: 14200, size: "36 sqm", beds: "1 King Bed", amenities: ["Lake view", "Walk-in wardrobe", "Free high-speed WiFi"], cancellation: "Free cancellation before 48 hrs", breakfast: true },
      { id: "UDA-PRE", name: "Premier Palace Room", price: 18900, size: "44 sqm", beds: "1 King Bed", amenities: ["Balcony", "Plunge pool access", "Heritage tour included"], cancellation: "Free cancellation before 48 hrs", breakfast: true }
    ]
  },
  {
    id: "HS-GOA",
    name: "Hour Stay Candolim Beach Resort",
    city: "Goa",
    rating: 4.6,
    reviews: 2140,
    tags: ["Beachfront", "Kids club", "Sunset bar"],
    image: goaImg,
    images: [goaImg, keralaImg, palaceImg],
    propertyType: "Beachfront",
    description: "A premium tropical paradise steps from Candolim Beach, offering world-class dining and a beach bar.",
    rooms: [
      { id: "GOA-DLX", name: "Deluxe Garden View Room", price: 11400, size: "38 sqm", beds: "1 King Bed", amenities: ["Garden view", "Balcony", "Free breakfast"], cancellation: "Free cancellation before 24 hrs", breakfast: true },
      { id: "GOA-VIL", name: "Garden Pool Villa", price: 38900, size: "96 sqm", beds: "1 King Bed", amenities: ["Private pool", "Ayurvedic spa credit", "Personal chef"], cancellation: "Free cancellation before 7 days", breakfast: true }
    ]
  },
  {
    id: "HS-KER",
    name: "Hour Stay Backwater Retreat",
    city: "Alleppey, Kerala",
    rating: 4.7,
    reviews: 738,
    tags: ["Backwaters", "Ayurveda", "Houseboat tour"],
    image: keralaImg,
    images: [keralaImg, goaImg, jaipurImg],
    propertyType: "Resort",
    description: "An eco-friendly sanctuary tucked along the serene backwaters of Alleppey, offering authentic Ayurvedic therapy.",
    rooms: [
      { id: "KER-DLX", name: "Deluxe Backwater Cottage", price: 7600, size: "40 sqm", beds: "1 King / 2 Twin Beds", amenities: ["Backwater view", "Open-air shower", "Heritage setup"], cancellation: "Free cancellation before 24 hrs", breakfast: false },
      { id: "KER-PRE", name: "Premier Canal Suite", price: 10800, size: "48 sqm", beds: "1 King Bed", amenities: ["Private deck", "Ayurvedic massage package", "High-speed WiFi"], cancellation: "Free cancellation before 24 hrs", breakfast: true }
    ]
  }
];

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Book a Stay — Hour Stay Premium Booking Experience" },
      { name: "description", content: "Book luxury and hourly rooms at Hour Stay properties across Jaipur, Udaipur, Goa, and Kerala." },
      { property: "og:title", content: "Book a Stay — Hour Stay" },
      { property: "og:description", content: "Instant premium room booking across Hour Stay resorts in India." }
    ]
  }),
  component: SearchPage
});

function SearchPage() {
  // Step State (1: Select Room, 2: Guest Details, 3: Payment, 4: Confirmation)
  const [step, setStep] = useState(1);

  // Search input state
  const [destination, setDestination] = useState("Jaipur");
  const [checkIn, setCheckIn] = useState("2026-08-12");
  const [checkOut, setCheckOut] = useState("2026-08-15");
  const [guestsCount, setGuestsCount] = useState(2);
  const [roomsCount, setRoomsCount] = useState(1);

  // Filters State
  const [maxPrice, setMaxPrice] = useState(40000);
  const [selectedPropTypes, setSelectedPropTypes] = useState([]);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState([]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [breakfastOnly, setBreakfastOnly] = useState(false);
  const [freeCancelOnly, setFreeCancelOnly] = useState(false);
  const [minRating, setMinRating] = useState(0);

  // Selected Booking Target
  const [selectedHotel, setSelectedHotel] = useState(mockHotels[0]);
  const [selectedRoom, setSelectedRoom] = useState(mockHotels[0].rooms[0]);

  // Modal Preview state
  const [previewHotel, setPreviewHotel] = useState(null);
  const [previewActiveImgIdx, setPreviewActiveImgIdx] = useState(0);

  // Guest Form State
  const [guestForm, setGuestForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    city: "",
    gstin: "",
    preferences: []
  });
  const [errors, setErrors] = useState({});

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState("upi"); // upi, card, wallet
  const [payAdvance, setPayAdvance] = useState(false); // false = Full, true = 1 Night Advance
  const [upiId, setUpiId] = useState("");
  const [cardDetails, setCardDetails] = useState({ name: "", number: "", expiry: "", cvv: "" });
  const [walletProvider, setWalletProvider] = useState("");

  // Calculate Dates & Rates
  const calculatedNights = useMemo(() => {
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    const diff = d2.getTime() - d1.getTime();
    const nights = Math.ceil(diff / (1000 * 3600 * 24));
    return isNaN(nights) || nights <= 0 ? 1 : nights;
  }, [checkIn, checkOut]);

  const baseTotal = selectedRoom.price * calculatedNights;
  const gstAmount = Math.round(baseTotal * 0.18);
  const totalAmount = baseTotal + gstAmount;

  // Advance Payment calculation
  const advanceBaseTotal = selectedRoom.price;
  const advanceGstAmount = Math.round(advanceBaseTotal * 0.18);
  const advanceTotalAmount = advanceBaseTotal + advanceGstAmount;

  // Filter Logic
  const filteredHotels = useMemo(() => {
    return mockHotels.filter((hotel) => {
      // 1. Destination check
      if (destination && !hotel.city.toLowerCase().includes(destination.toLowerCase()) && !hotel.name.toLowerCase().includes(destination.toLowerCase())) {
        return false;
      }
      // 2. Rating check
      if (minRating > 0 && hotel.rating < minRating) {
        return false;
      }
      // 3. Property Type check
      if (selectedPropTypes.length > 0 && !selectedPropTypes.includes(hotel.propertyType)) {
        return false;
      }
      
      // 4. Room filtering inside hotel
      const hasMatchingRoom = hotel.rooms.some((room) => {
        // Price limit
        if (room.price > maxPrice) return false;
        // Room type filter check
        if (selectedRoomTypes.length > 0) {
          const nameLower = room.name.toLowerCase();
          const matchesType = selectedRoomTypes.some(type => nameLower.includes(type.toLowerCase()));
          if (!matchesType) return false;
        }
        // Breakfast filter check
        if (breakfastOnly && !room.breakfast) return false;
        // Cancellation filter check
        if (freeCancelOnly && room.cancellation.toLowerCase().includes("non-refundable")) return false;
        // Amenities check
        if (selectedAmenities.length > 0) {
          const hasAllAm = selectedAmenities.every(am => room.amenities.includes(am));
          if (!hasAllAm) return false;
        }
        return true;
      });

      return hasMatchingRoom;
    });
  }, [destination, minRating, selectedPropTypes, selectedRoomTypes, maxPrice, breakfastOnly, freeCancelOnly, selectedAmenities]);

  // Handle Select & Book
  const handleSelectRoom = (hotel, room) => {
    setSelectedHotel(hotel);
    setSelectedRoom(room);
    setPreviewHotel(null);
    setStep(2);
  };

  // Validate Guest Details Form
  const handleProceedToPayment = (e) => {
    e.preventDefault();
    const tempErrors = {};
    if (!guestForm.firstName.trim()) tempErrors.firstName = "First name is required";
    if (!guestForm.lastName.trim()) tempErrors.lastName = "Last name is required";
    if (!guestForm.email.trim()) {
      tempErrors.email = "Email address is required";
    } else if (!/\S+@\S+\.\S+/.test(guestForm.email)) {
      tempErrors.email = "Invalid email formatting";
    }
    if (!guestForm.mobile.trim()) {
      tempErrors.mobile = "Mobile number is required";
    } else if (guestForm.mobile.trim().length < 10) {
      tempErrors.mobile = "Enter a valid 10-digit number";
    }

    if (Object.keys(tempErrors).length > 0) {
      setErrors(tempErrors);
      // Scroll to top of form
      window.scrollTo({ top: 300, behavior: "smooth" });
    } else {
      setErrors({});
      setStep(3);
    }
  };

  return (
    <SiteLayout>
      {/* Search Header Banner */}
      <section className="relative overflow-hidden bg-navy py-16 text-cream">
        {/* Glow Effects */}
        <div className="absolute top-0 right-1/4 h-80 w-80 rounded-full bg-purple/10 blur-[100px]" />
        <div className="absolute -bottom-10 left-1/4 h-72 w-72 rounded-full bg-gold/5 blur-[80px]" />

        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 relative z-10">
          {step < 4 && (
            <>
              <h1 className="font-serif text-3xl font-bold tracking-tight text-gold md:text-5xl">
                Find your perfect stay
              </h1>
              <p className="mt-2 text-sm text-cream/70 font-sans max-w-lg mx-auto">
                Discover hourly stays and boutique retreats with direct booking rates, GST-compliant invoicing, and flexible cancellations.
              </p>
            </>
          )}

          {/* Stepper Progress Indicator */}
          {step < 4 && (
            <div className="mx-auto mt-8 flex max-w-md items-center justify-between text-xs font-semibold uppercase tracking-wider text-cream/50">
              <button 
                onClick={() => step > 1 && setStep(1)} 
                className={`flex items-center gap-1.5 transition-colors ${step >= 1 ? "text-gold" : ""}`}
                disabled={step === 1}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${step > 1 ? "bg-gold text-navy" : "border border-gold text-gold"}`}>1</span>
                Rooms
              </button>
              <ChevronRight className="size-3.5" />
              <button 
                onClick={() => step > 2 && setStep(2)} 
                className={`flex items-center gap-1.5 transition-colors ${step >= 2 ? "text-gold" : ""}`}
                disabled={step <= 2}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${step > 2 ? "bg-gold text-navy" : step === 2 ? "border border-gold text-gold" : "border border-cream/30"}`}>2</span>
                Details
              </button>
              <ChevronRight className="size-3.5" />
              <div className={`flex items-center gap-1.5 ${step === 3 ? "text-gold" : ""}`}>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] border ${step === 3 ? "border-gold text-gold" : "border-cream/30"}`}>3</span>
                Payment
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col items-center">
              <CheckCircle2 className="size-16 text-gold animate-bounce" />
              <h1 className="mt-4 font-serif text-3xl font-bold text-gold md:text-5xl">Booking Confirmed!</h1>
              <p className="mt-2 text-sm text-cream/70 max-w-sm">Your premium stay is locked in. A copy of the receipt has been dispatched to {guestForm.email || "your email"}.</p>
            </div>
          )}
        </div>
      </section>

      {/* Main Core Area */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        
        {/* ================= STEP 1: SELECT ROOM ================= */}
        {step === 1 && (
          <div className="space-y-8">
            
            {/* Hero Search Area */}
            <div className="card-guest border border-navy/10 bg-white p-5 shadow-[0_10px_10px_-5px_#E7E9EE] -mt-20 relative z-20 rounded-3xl">
              <div className="grid gap-4 md:grid-cols-5">
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-navy/60">Destination / Property</Label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-3.5 top-3.5 size-4 text-navy/40" />
                    <Input 
                      value={destination} 
                      onChange={(e) => setDestination(e.target.value)} 
                      placeholder="e.g. Jaipur, Goa..." 
                      className="h-11 pl-10 bg-cream/10 border-navy/10 rounded-full text-xs text-navy focus-visible:ring-gold"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-navy/60">Check-In</Label>
                  <div className="relative mt-1">
                    <Calendar className="absolute left-3.5 top-3.5 size-4 text-navy/40" />
                    <Input 
                      type="date" 
                      value={checkIn} 
                      onChange={(e) => setCheckIn(e.target.value)} 
                      className="h-11 pl-10 bg-cream/10 border-navy/10 rounded-full text-xs text-navy focus-visible:ring-gold"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-navy/60">Check-Out</Label>
                  <div className="relative mt-1">
                    <Calendar className="absolute left-3.5 top-3.5 size-4 text-navy/40" />
                    <Input 
                      type="date" 
                      value={checkOut} 
                      onChange={(e) => setCheckOut(e.target.value)} 
                      className="h-11 pl-10 bg-cream/10 border-navy/10 rounded-full text-xs text-navy focus-visible:ring-gold"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-navy/60">Guests & Rooms</Label>
                  <div className="relative mt-1">
                    <Users className="absolute left-3.5 top-3.5 size-4 text-navy/40" />
                    <select 
                      value={guestsCount} 
                      onChange={(e) => setGuestsCount(Number(e.target.value))}
                      className="flex h-11 w-full pl-10 bg-cream/10 border border-navy/10 rounded-full text-xs text-navy focus:outline-none focus:ring-1 focus:ring-gold focus:border-gold px-3 appearance-none cursor-pointer"
                    >
                      <option value={1}>1 Guest, 1 Room</option>
                      <option value={2}>2 Guests, 1 Room</option>
                      <option value={3}>3 Guests, 1 Room</option>
                      <option value={4}>4 Guests, 2 Rooms</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={() => {}} 
                    variant="hero" 
                    className="w-full h-11 bg-navy text-cream hover:bg-[#081420] rounded-full font-semibold transition-all shadow-[rgba(13,27,42,0.15)_0px_10px_10px_-5px]"
                  >
                    Search Rooms
                  </Button>
                </div>
              </div>
            </div>

            {/* Content Split: Filters + Results */}
            <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
              
              {/* Filter Sidebar */}
              <aside className="card-guest border border-navy/10 bg-white p-6 shadow-[0_10px_10px_-5px_#E7E9EE] rounded-3xl h-fit">
                <div className="flex items-center justify-between border-b pb-4">
                  <h3 className="font-serif text-lg font-bold text-navy">Filters</h3>
                  <button 
                    onClick={() => {
                      setMaxPrice(40000);
                      setSelectedPropTypes([]);
                      setSelectedRoomTypes([]);
                      setSelectedAmenities([]);
                      setBreakfastOnly(false);
                      setFreeCancelOnly(false);
                      setMinRating(0);
                    }}
                    className="text-[10px] font-bold uppercase tracking-wider text-purple hover:text-purple/80 cursor-pointer border-none bg-transparent"
                  >
                    Clear All
                  </button>
                </div>

                {/* Price Limit Slider */}
                <div className="mt-5 space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-navy/70">Max Price / Night</Label>
                  <div className="flex items-center justify-between text-xs text-navy font-semibold">
                    <span>₹4,000</span>
                    <span className="text-purple bg-purple/10 px-2 py-0.5 rounded-full">{inr(maxPrice)}</span>
                  </div>
                  <input 
                    type="range" 
                    min={4000} 
                    max={40000} 
                    step={1000}
                    value={maxPrice} 
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-navy cursor-pointer mt-1" 
                  />
                </div>

                {/* Property Type */}
                <div className="mt-6 border-t pt-5 space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-navy/70">Property Type</Label>
                  <div className="space-y-2 mt-2">
                    {["Resort", "Heritage", "Beachfront"].map((type) => (
                      <label key={type} className="flex items-center gap-2.5 text-xs text-navy font-medium cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={selectedPropTypes.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPropTypes([...selectedPropTypes, type]);
                            } else {
                              setSelectedPropTypes(selectedPropTypes.filter(t => t !== type));
                            }
                          }}
                          className="size-4 accent-navy rounded border-navy/20 cursor-pointer" 
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Room Type */}
                <div className="mt-6 border-t pt-5 space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-navy/70">Room Type</Label>
                  <div className="space-y-2 mt-2">
                    {["Deluxe", "Premier", "Suite", "Villa"].map((type) => (
                      <label key={type} className="flex items-center gap-2.5 text-xs text-navy font-medium cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={selectedRoomTypes.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRoomTypes([...selectedRoomTypes, type]);
                            } else {
                              setSelectedRoomTypes(selectedRoomTypes.filter(t => t !== type));
                            }
                          }}
                          className="size-4 accent-navy rounded border-navy/20 cursor-pointer" 
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Amenities */}
                <div className="mt-6 border-t pt-5 space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-navy/70">Amenities</Label>
                  <div className="space-y-2 mt-2">
                    {["Complimentary breakfast", "Private pool", "Butler service", "Jacuzzi", "Airport transfer"].map((am) => (
                      <label key={am} className="flex items-center gap-2.5 text-xs text-navy font-medium cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={selectedAmenities.includes(am)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAmenities([...selectedAmenities, am]);
                            } else {
                              setSelectedAmenities(selectedAmenities.filter(a => a !== am));
                            }
                          }}
                          className="size-4 accent-navy rounded border-navy/20 cursor-pointer" 
                        />
                        {am}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Quick Toggles */}
                <div className="mt-6 border-t pt-5 space-y-4">
                  <label className="flex items-center justify-between text-xs text-navy font-medium cursor-pointer">
                    <span>Free Breakfast</span>
                    <input 
                      type="checkbox" 
                      checked={breakfastOnly} 
                      onChange={(e) => setBreakfastOnly(e.target.checked)}
                      className="size-4 accent-navy rounded border-navy/20 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs text-navy font-medium cursor-pointer">
                    <span>Free Cancellation</span>
                    <input 
                      type="checkbox" 
                      checked={freeCancelOnly} 
                      onChange={(e) => setFreeCancelOnly(e.target.checked)}
                      className="size-4 accent-navy rounded border-navy/20 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Minimum Star Rating */}
                <div className="mt-6 border-t pt-5 space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-navy/70">Guest Rating</Label>
                  <div className="flex gap-1.5 mt-2">
                    {[0, 4.6, 4.7, 4.8, 4.9].map((rating) => (
                      <button 
                        key={rating}
                        onClick={() => setMinRating(rating)}
                        className={`flex-1 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${minRating === rating ? "bg-navy text-cream border-navy" : "border-navy/10 text-navy/70 hover:bg-cream/10"}`}
                      >
                        {rating === 0 ? "Any" : `${rating}★`}
                      </button>
                    ))}
                  </div>
                </div>

              </aside>

              {/* Property Results List */}
              <div className="space-y-6">
                
                {/* Result header count */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-navy/60 font-semibold uppercase tracking-wider">
                    Showing {filteredHotels.length} available resorts in India
                  </p>
                </div>

                {filteredHotels.length === 0 ? (
                  <div className="text-center py-16 bg-white border border-navy/10 rounded-3xl p-6 shadow-soft">
                    <AlertCircle className="size-12 text-navy/30 mx-auto" />
                    <h3 className="mt-4 font-serif text-xl font-semibold text-navy">No stays match your criteria</h3>
                    <p className="mt-1 text-xs text-navy/60">Try clearing filters or adjusting your destination query.</p>
                  </div>
                ) : (
                  filteredHotels.map((hotel) => {
                    // Show price bounds
                    const minPriceRoom = hotel.rooms.reduce((min, r) => r.price < min.price ? r : min, hotel.rooms[0]);
                    const calculatedGst = Math.round(minPriceRoom.price * 0.18);
                    const totalCost = minPriceRoom.price + calculatedGst;

                    return (
                      <article 
                        key={hotel.id} 
                        className="grid md:grid-cols-[280px_1fr] bg-white border border-navy/10 rounded-3xl overflow-hidden shadow-soft transition-all duration-300 hover:shadow-lift group"
                      >
                        {/* Image Container */}
                        <div className="h-48 md:h-full relative overflow-hidden">
                          <img 
                            src={hotel.image} 
                            alt={hotel.name} 
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-102" 
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />
                          <span className="absolute top-4 left-4 bg-navy text-cream text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                            {hotel.propertyType}
                          </span>
                          
                          {/* Tags Overlay */}
                          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1">
                            {hotel.tags.slice(0, 2).map(t => (
                              <span key={t} className="bg-cream/90 backdrop-blur-xs text-navy text-[9px] font-bold px-2 py-0.5 rounded">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Details Area */}
                        <div className="flex flex-col justify-between p-6">
                          
                          {/* Top part */}
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1 text-[11px] text-navy/60 font-semibold">
                                <MapPin className="size-3.5 text-navy/40" /> {hotel.city}
                              </span>
                              <span className="flex items-center gap-1 bg-gold/10 px-2 py-0.5 rounded text-xs font-bold text-navy">
                                <Star className="size-3 fill-gold text-gold" /> {hotel.rating}
                                <span className="text-[10px] text-navy/55 font-normal">({hotel.reviews})</span>
                              </span>
                            </div>

                            <h3 className="mt-2.5 font-serif text-xl font-bold text-navy leading-snug group-hover:text-purple transition-colors">
                              {hotel.name}
                            </h3>
                            <p className="mt-1.5 text-xs text-navy/60 leading-relaxed max-w-xl">
                              {hotel.description}
                            </p>

                            {/* Rooms List Preview snippet */}
                            <div className="mt-4 flex flex-wrap gap-1.5">
                              {hotel.rooms.map((r) => (
                                <span key={r.id} className="border border-navy/10 bg-cream/5 px-2 py-1 rounded-lg text-[10px] text-navy/80 font-medium">
                                  {r.name}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Action row */}
                          <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t pt-4 border-navy/5">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-navy/40">From</span>
                              <div className="flex items-baseline gap-1">
                                <span className="font-serif text-2xl font-bold text-navy">{inr(minPriceRoom.price)}</span>
                                <span className="text-xs text-navy/50">/ night</span>
                              </div>
                              <p className="text-[10px] text-navy/60 font-medium">
                                + {inr(calculatedGst)} GST (Total: {inr(totalCost)})
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  setPreviewHotel(hotel);
                                  setPreviewActiveImgIdx(0);
                                }}
                                className="px-4 py-2 text-xs font-bold text-navy border border-navy/20 rounded-full hover:bg-cream/10 transition-all cursor-pointer"
                              >
                                View Details
                              </button>
                              <button 
                                onClick={() => handleSelectRoom(hotel, minPriceRoom)}
                                className="px-5 py-2 text-xs font-bold bg-navy text-cream rounded-full hover:bg-[#081420] transition-all shadow-[rgba(13,27,42,0.15)_0px_8px_8px_-4px] cursor-pointer border-none"
                              >
                                Book Now
                              </button>
                            </div>
                          </div>

                        </div>
                      </article>
                    );
                  })
                )}

              </div>

            </div>

          </div>
        )}

        {/* ================= STEP 2: GUEST DETAILS ================= */}
        {step === 2 && (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] -mt-10 relative z-20">
            
            {/* Form Column */}
            <form onSubmit={handleProceedToPayment} className="card-guest border border-navy/10 bg-white p-6 md:p-8 shadow-soft rounded-3xl space-y-6">
              
              <div className="flex items-center gap-3 border-b pb-4 border-navy/10">
                <button 
                  type="button" 
                  onClick={() => setStep(1)}
                  className="p-2 rounded-full hover:bg-cream/10 text-navy cursor-pointer transition-all border-none bg-transparent"
                >
                  <ArrowLeft className="size-5" />
                </button>
                <div>
                  <h2 className="font-serif text-xl font-bold text-navy">Enter Guest Details</h2>
                  <p className="text-xs text-navy/60">Fill in details for your instant booking confirmation.</p>
                </div>
              </div>

              {/* Form Inputs Grid */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="firstName" className="text-xs font-bold text-navy ml-2">First Name *</Label>
                  <Input 
                    id="firstName" 
                    placeholder="e.g. Aarav" 
                    value={guestForm.firstName}
                    onChange={(e) => setGuestForm({ ...guestForm, firstName: e.target.value })}
                    className="mt-1.5 w-full bg-[#FFF7E6] border-none px-5 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy h-12 transition-all"
                    autoComplete="off"
                  />
                  {errors.firstName && <p className="mt-1 text-[10px] text-error ml-2">{errors.firstName}</p>}
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-xs font-bold text-navy ml-2">Last Name *</Label>
                  <Input 
                    id="lastName" 
                    placeholder="e.g. Mehta" 
                    value={guestForm.lastName}
                    onChange={(e) => setGuestForm({ ...guestForm, lastName: e.target.value })}
                    className="mt-1.5 w-full bg-[#FFF7E6] border-none px-5 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy h-12 transition-all"
                    autoComplete="off"
                  />
                  {errors.lastName && <p className="mt-1 text-[10px] text-error ml-2">{errors.lastName}</p>}
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="email" className="text-xs font-bold text-navy ml-2">Email Address *</Label>
                  <Input 
                    id="email" 
                    type="email"
                    placeholder="e.g. aarav@example.in" 
                    value={guestForm.email}
                    onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
                    className="mt-1.5 w-full bg-[#FFF7E6] border-none px-5 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy h-12 transition-all"
                    autoComplete="off"
                  />
                  {errors.email && <p className="mt-1 text-[10px] text-error ml-2">{errors.email}</p>}
                </div>
                <div>
                  <Label htmlFor="mobile" className="text-xs font-bold text-navy ml-2">Mobile Number *</Label>
                  <Input 
                    id="mobile" 
                    placeholder="e.g. 98204 33121" 
                    value={guestForm.mobile}
                    onChange={(e) => setGuestForm({ ...guestForm, mobile: e.target.value })}
                    className="mt-1.5 w-full bg-[#FFF7E6] border-none px-5 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy h-12 transition-all"
                    autoComplete="off"
                  />
                  {errors.mobile && <p className="mt-1 text-[10px] text-error ml-2">{errors.mobile}</p>}
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="city" className="text-xs font-bold text-navy ml-2">Home City</Label>
                  <Input 
                    id="city" 
                    placeholder="e.g. Mumbai" 
                    value={guestForm.city}
                    onChange={(e) => setGuestForm({ ...guestForm, city: e.target.value })}
                    className="mt-1.5 w-full bg-[#FFF7E6] border-none px-5 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy h-12 transition-all"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <Label htmlFor="gstin" className="text-xs font-bold text-navy ml-2">GSTIN (Optional)</Label>
                  <Input 
                    id="gstin" 
                    placeholder="e.g. 27AABCU9603R1ZM" 
                    value={guestForm.gstin}
                    onChange={(e) => setGuestForm({ ...guestForm, gstin: e.target.value })}
                    className="mt-1.5 w-full bg-[#FFF7E6] border-none px-5 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy h-12 transition-all"
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Preferences Checklist */}
              <div className="mt-6 border-t pt-5">
                <Label className="text-xs font-bold text-navy ml-2">Special Stay Preferences</Label>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[
                    "Early check-in (subject to availability)",
                    "High floor / quiet room",
                    "Jain meal preference",
                    "Airport transfer request"
                  ].map((p) => (
                    <label key={p} className="flex items-center gap-2.5 text-xs text-navy/80 font-medium cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={guestForm.preferences.includes(p)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setGuestForm({ ...guestForm, preferences: [...guestForm.preferences, p] });
                          } else {
                            setGuestForm({ ...guestForm, preferences: guestForm.preferences.filter(pref => pref !== p) });
                          }
                        }}
                        className="size-4 accent-navy rounded border-navy/20 cursor-pointer"
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-6 border-t border-navy/10 flex gap-4">
                <button 
                  type="submit"
                  className="w-full font-bold bg-navy hover:bg-[#081420] text-cream py-3 rounded-full shadow-[rgba(13,27,42,0.25)_0px_20px_10px_-15px] cursor-pointer border-none transition-all duration-200 ease-in-out hover:scale-[1.01] hover:shadow-[rgba(13,27,42,0.25)_0px_23px_10px_-20px] active:scale-[0.98] text-xs uppercase tracking-wide h-12"
                >
                  Proceed to Payment
                </button>
              </div>

            </form>

            {/* Sidebar Column */}
            <aside className="space-y-6">
              
              {/* Summary Card */}
              <div className="card-guest border border-navy/10 bg-white p-6 shadow-soft rounded-3xl">
                <h3 className="font-serif text-lg font-bold text-navy border-b pb-3 mb-4">Stay Summary</h3>
                
                <div className="flex gap-4">
                  <img 
                    src={selectedHotel.image} 
                    alt={selectedHotel.name} 
                    className="w-20 h-20 object-cover rounded-2xl" 
                  />
                  <div>
                    <h4 className="font-serif text-sm font-bold text-navy leading-tight">{selectedHotel.name}</h4>
                    <p className="mt-1 text-[11px] text-navy/60 font-medium">{selectedHotel.city}</p>
                    <p className="mt-1 bg-gold/10 px-2 py-0.5 rounded text-[10px] font-bold text-navy w-fit">
                      {selectedRoom.name}
                    </p>
                  </div>
                </div>

                <dl className="mt-6 space-y-3.5 border-t pt-4 text-xs font-semibold text-navy">
                  <div className="flex justify-between items-center">
                    <dt className="text-navy/55 flex items-center gap-1.5 font-normal"><Calendar className="size-3.5" /> Check-in</dt>
                    <dd>{checkIn}</dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-navy/55 flex items-center gap-1.5 font-normal"><Calendar className="size-3.5" /> Check-out</dt>
                    <dd>{checkOut}</dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-navy/55 flex items-center gap-1.5 font-normal"><User className="size-3.5" /> Guests</dt>
                    <dd>{guestsCount} Guests · {roomsCount} Room</dd>
                  </div>
                  <div className="flex justify-between items-center">
                    <dt className="text-navy/55 flex items-center gap-1.5 font-normal"><Clock className="size-3.5" /> Duration</dt>
                    <dd>{calculatedNights} Nights</dd>
                  </div>
                </dl>

                {/* Price Summary */}
                <dl className="mt-6 border-t pt-4 space-y-2 text-xs font-bold text-navy">
                  <div className="flex justify-between font-medium">
                    <dt className="text-navy/60">Nightly Rate ({calculatedNights} nights)</dt>
                    <dd className="tabular-nums">{inr(baseTotal)}</dd>
                  </div>
                  <div className="flex justify-between font-medium">
                    <dt className="text-navy/60">GST (18%)</dt>
                    <dd className="tabular-nums">{inr(gstAmount)}</dd>
                  </div>
                  <div className="flex justify-between border-t pt-3 text-base text-purple font-bold">
                    <dt>Total Amount</dt>
                    <dd className="tabular-nums">{inr(totalAmount)}</dd>
                  </div>
                </dl>
              </div>

              {/* Secure Booking Card */}
              <div className="bg-cream border border-navy/15 rounded-3xl p-5 flex gap-3 text-xs text-navy/75 leading-relaxed font-semibold">
                <ShieldCheck className="size-7 text-purple shrink-0" />
                <div>
                  <p className="font-bold text-navy">Instant Trust Guarantee</p>
                  <p className="mt-1 text-[11px] font-normal text-navy/60">Your stay details are transmitted using 256-bit secure encryption directly to the resort's front desk console.</p>
                </div>
              </div>

            </aside>

          </div>
        )}

        {/* ================= STEP 3: PAYMENT ================= */}
        {step === 3 && (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] -mt-10 relative z-20">
            
            {/* Payment Column */}
            <div className="card-guest border border-navy/10 bg-white p-6 md:p-8 shadow-soft rounded-3xl space-y-6">
              
              <div className="flex items-center gap-3 border-b pb-4 border-navy/10">
                <button 
                  type="button" 
                  onClick={() => setStep(2)}
                  className="p-2 rounded-full hover:bg-cream/10 text-navy cursor-pointer transition-all border-none bg-transparent"
                >
                  <ArrowLeft className="size-5" />
                </button>
                <div>
                  <h2 className="font-serif text-xl font-bold text-navy">Complete Payment</h2>
                  <p className="text-xs text-navy/60">Choose a method and secure options to finalize booking.</p>
                </div>
              </div>

              {/* Toggles for Payment Options (Advance vs Full) */}
              <div className="space-y-3">
                <Label className="text-xs font-bold text-navy ml-2">Choose Payment Option</Label>
                <div className="grid gap-4 sm:grid-cols-2">
                  
                  {/* Pay Full */}
                  <button 
                    type="button"
                    onClick={() => setPayAdvance(false)}
                    className={`flex flex-col p-4 rounded-2xl border text-left transition-all cursor-pointer ${!payAdvance ? "bg-cream border-purple shadow-[0_4px_12px_rgba(91,33,182,0.08)]" : "border-navy/10 hover:bg-cream/5"}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-navy">Pay Full Amount</span>
                      <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${!payAdvance ? "border-purple" : "border-navy/20"}`}>
                        {!payAdvance && <span className="h-2 w-2 rounded-full bg-purple" />}
                      </span>
                    </div>
                    <span className="mt-3 font-serif text-lg font-bold text-navy">{inr(totalAmount)}</span>
                    <span className="mt-1 text-[10px] text-navy/55">Pay full stay value now (GST included).</span>
                  </button>

                  {/* Pay 1 Night Advance */}
                  <button 
                    type="button"
                    onClick={() => setPayAdvance(true)}
                    className={`flex flex-col p-4 rounded-2xl border text-left transition-all cursor-pointer ${payAdvance ? "bg-cream border-purple shadow-[0_4px_12px_rgba(91,33,182,0.08)]" : "border-navy/10 hover:bg-cream/5"}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-navy">1 Night Advance Tariffs</span>
                      <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${payAdvance ? "border-purple" : "border-navy/20"}`}>
                        {payAdvance && <span className="h-2 w-2 rounded-full bg-purple" />}
                      </span>
                    </div>
                    <span className="mt-3 font-serif text-lg font-bold text-navy">{inr(advanceTotalAmount)}</span>
                    <span className="mt-1 text-[10px] text-navy/55">Pay 1 night now; settle rest at checkout.</span>
                  </button>

                </div>
              </div>

              {/* Payment Methods selector tabs */}
              <div className="space-y-3 mt-6 border-t pt-5 border-navy/10">
                <Label className="text-xs font-bold text-navy ml-2">Select Payment Method</Label>
                
                <div className="flex gap-2 bg-[#FFF7E6] p-1.5 rounded-full">
                  {[
                    { id: "upi", label: "UPI", desc: "Pay with any UPI App" },
                    { id: "card", label: "Credit/Debit Card", desc: "Visa, Mastercard, RuPay" },
                    { id: "wallet", label: "Wallets", desc: "Paytm, Mobikwik" }
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex-1 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer border-none ${paymentMethod === method.id ? "bg-navy text-cream shadow-md" : "text-navy/60 hover:text-navy"}`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>

                {/* Tab Contents */}
                <div className="mt-4 p-5 border border-navy/10 rounded-2xl bg-cream/10">
                  
                  {/* UPI Tab */}
                  {paymentMethod === "upi" && (
                    <div className="space-y-4">
                      <p className="text-xs text-navy/60">Choose a default UPI application or enter your personal UPI ID.</p>
                      
                      <div className="grid gap-3 grid-cols-3">
                        {["Google Pay", "PhonePe", "Paytm"].map((app) => (
                          <button
                            key={app}
                            type="button"
                            onClick={() => setUpiId(`${app.toLowerCase().replace(" ", "")}@ybl`)}
                            className="py-3.5 border border-navy/10 rounded-xl bg-white hover:bg-cream/15 text-xs text-navy font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer shadow-[0_5px_5px_-3px_#E7E9EE]"
                          >
                            <Smartphone className="size-5 text-purple" />
                            {app}
                          </button>
                        ))}
                      </div>

                      <div className="relative mt-2">
                        <Input 
                          placeholder="e.g. username@okhdfcbank" 
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          className="w-full bg-[#FFF7E6] border-none px-5 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy h-12 transition-all"
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  )}

                  {/* Card Tab */}
                  {paymentMethod === "card" && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-navy/60 ml-2">Cardholder Name</Label>
                        <Input 
                          placeholder="Aarav Mehta"
                          value={cardDetails.name}
                          onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                          className="mt-1 w-full bg-[#FFF7E6] border-none px-5 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy h-12 transition-all"
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-navy/60 ml-2">Card Number</Label>
                        <div className="relative mt-1">
                          <CreditCard className="absolute left-4 top-3.5 size-4 text-navy/40" />
                          <Input 
                            placeholder="4111 2222 3333 4444"
                            value={cardDetails.number}
                            onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                            className="pl-11 w-full bg-[#FFF7E6] border-none px-5 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy h-12 transition-all"
                            autoComplete="off"
                          />
                        </div>
                      </div>
                      <div className="grid gap-4 grid-cols-2">
                        <div>
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-navy/60 ml-2">Expiry Date</Label>
                          <Input 
                            placeholder="MM/YY"
                            value={cardDetails.expiry}
                            onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                            className="mt-1 w-full bg-[#FFF7E6] border-none px-5 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy h-12 transition-all"
                            autoComplete="off"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-navy/60 ml-2">CVV</Label>
                          <Input 
                            type="password"
                            maxLength={3}
                            placeholder="•••"
                            value={cardDetails.cvv}
                            onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                            className="mt-1 w-full bg-[#FFF7E6] border-none px-5 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy h-12 transition-all"
                            autoComplete="off"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Wallet Tab */}
                  {paymentMethod === "wallet" && (
                    <div className="space-y-4">
                      <p className="text-xs text-navy/60 font-semibold">Choose a mobile wallet operator:</p>
                      <div className="grid gap-3 grid-cols-2">
                        {["Paytm Wallet", "PhonePe Wallet", "Amazon Pay", "MobiKwik"].map(wallet => (
                          <button
                            key={wallet}
                            type="button"
                            onClick={() => setWalletProvider(wallet)}
                            className={`py-3.5 border rounded-2xl text-xs font-bold transition-all cursor-pointer ${walletProvider === wallet ? "bg-cream border-purple" : "bg-white border-navy/10 hover:bg-cream/10"}`}
                          >
                            {wallet}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-navy/10 flex gap-4">
                <button 
                  onClick={() => setStep(4)}
                  className="w-full font-bold bg-navy hover:bg-[#081420] text-cream py-3 rounded-full shadow-[rgba(13,27,42,0.25)_0px_20px_10px_-15px] cursor-pointer border-none transition-all duration-200 ease-in-out hover:scale-[1.01] hover:shadow-[rgba(13,27,42,0.25)_0px_23px_10px_-20px] active:scale-[0.98] text-xs uppercase tracking-wide h-12"
                >
                  Pay & Confirm Booking
                </button>
              </div>

              {/* Trust Section Grid */}
              <div className="mt-8 border-t pt-6">
                <h3 className="font-serif text-sm font-bold text-navy mb-4 text-center">Why Book Directly with Hour Stay?</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex gap-2">
                    <ShieldCheck className="size-5 text-purple shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-navy">Secure payments</p>
                      <p className="text-[10px] text-navy/55 leading-tight mt-0.5">128-bit SSL encrypted gateway.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <FileText className="size-5 text-purple shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-navy">GST-Compliant</p>
                      <p className="text-[10px] text-navy/55 leading-tight mt-0.5">Instant business tax invoice receipts.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Check className="size-5 text-purple shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-navy">Instant Booking</p>
                      <p className="text-[10px] text-navy/55 leading-tight mt-0.5">Direct sync with property manager.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Smartphone className="size-5 text-purple shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-navy">24/7 Guest Support</p>
                      <p className="text-[10px] text-navy/55 leading-tight mt-0.5">Support assistance whenever needed.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Sidebar Column */}
            <aside className="space-y-6">
              
              {/* Summary Card */}
              <div className="card-guest border border-navy/10 bg-white p-6 shadow-soft rounded-3xl">
                <h3 className="font-serif text-lg font-bold text-navy border-b pb-3 mb-4 font-serif">Checkout Details</h3>
                
                <div className="flex gap-3 mb-4">
                  <div className="flex flex-col text-xs text-navy font-semibold">
                    <span className="text-navy">{selectedHotel.name}</span>
                    <span className="text-purple mt-0.5">{selectedRoom.name}</span>
                    <span className="text-navy/50 font-normal mt-1">{calculatedNights} nights · {guestsCount} guests</span>
                  </div>
                </div>

                <dl className="mt-4 border-t pt-4 space-y-2 text-xs font-semibold text-navy">
                  <div className="flex justify-between font-medium">
                    <dt className="text-navy/60">Nights Rate ({calculatedNights} nights)</dt>
                    <dd className="tabular-nums">{inr(baseTotal)}</dd>
                  </div>
                  <div className="flex justify-between font-medium">
                    <dt className="text-navy/60">GST Tax (18%)</dt>
                    <dd className="tabular-nums">{inr(gstAmount)}</dd>
                  </div>

                  {payAdvance ? (
                    <>
                      <div className="flex justify-between font-medium text-error border-t pt-2">
                        <dt>Total stay value</dt>
                        <dd className="tabular-nums">{inr(totalAmount)}</dd>
                      </div>
                      <div className="flex justify-between font-medium text-success">
                        <dt>Paid at checkout (at resort)</dt>
                        <dd className="tabular-nums">{inr(totalAmount - advanceTotalAmount)}</dd>
                      </div>
                      <div className="flex justify-between border-t pt-3 text-base text-purple font-bold">
                        <dt>Advance to Pay Now</dt>
                        <dd className="tabular-nums">{inr(advanceTotalAmount)}</dd>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between border-t pt-3 text-base text-purple font-bold">
                      <dt>Total to Pay Now</dt>
                      <dd className="tabular-nums">{inr(totalAmount)}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Security info */}
              <div className="bg-cream border border-navy/15 rounded-3xl p-5 flex gap-3 text-xs text-navy/75 leading-relaxed font-semibold">
                <ShieldCheck className="size-7 text-purple shrink-0" />
                <div>
                  <p className="font-bold text-navy">100% Secure Checkout</p>
                  <p className="mt-1 text-[11px] font-normal text-navy/60">We utilize standard tokens to ensure card details are never stored.</p>
                </div>
              </div>

            </aside>

          </div>
        )}

        {/* ================= STEP 4: CONFIRMATION ================= */}
        {step === 4 && (
          <div className="mx-auto max-w-2xl bg-white border border-navy/10 rounded-3xl shadow-soft p-6 md:p-10 space-y-8 -mt-10 relative z-20">
            
            {/* Order info */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#FFF7E6] p-5 rounded-2xl font-semibold text-navy text-xs border border-navy/5">
              <div>
                <span className="text-navy/40 font-bold uppercase tracking-wider block text-[10px]">Booking Reference</span>
                <span className="text-sm font-bold text-navy">HS-2026-98124</span>
              </div>
              <div>
                <span className="text-navy/40 font-bold uppercase tracking-wider block text-[10px]">Guest Name</span>
                <span className="text-sm font-bold text-navy">{guestForm.firstName} {guestForm.lastName}</span>
              </div>
              <div>
                <span className="text-navy/40 font-bold uppercase tracking-wider block text-[10px]">Status</span>
                <span className="bg-success/15 text-success text-[10px] font-bold px-2.5 py-0.5 rounded-full block w-fit mt-1">Confirmed</span>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-navy border-b pb-3 mb-2">Reservation Details</h3>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3 text-xs text-navy font-semibold">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-navy/50 font-normal">Resort Name</span>
                    <span>{selectedHotel.name}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-navy/50 font-normal">Room Type</span>
                    <span>{selectedRoom.name}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-navy/50 font-normal">Duration</span>
                    <span>{calculatedNights} Nights</span>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-navy font-semibold">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-navy/50 font-normal">Check-in</span>
                    <span>{checkIn} (14:00)</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-navy/50 font-normal">Check-out</span>
                    <span>{checkOut} (11:00)</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-navy/50 font-normal">Amount Paid</span>
                    <span className="text-purple">{payAdvance ? inr(advanceTotalAmount) : inr(totalAmount)}</span>
                  </div>
                </div>
              </div>

              {payAdvance && (
                <div className="bg-purple/10 border border-purple/20 p-4 rounded-xl text-xs text-purple font-medium">
                  <strong>Note:</strong> You have settled an advance payment of {inr(advanceTotalAmount)}. The balance of {inr(totalAmount - advanceTotalAmount)} is payable at the resort during checkout.
                </div>
              )}
            </div>

            {/* Checkin guidelines */}
            <div className="bg-cream border border-navy/15 p-5 rounded-2xl flex gap-3 text-xs text-navy/70 leading-relaxed font-semibold">
              <AlertCircle className="size-6 text-purple shrink-0" />
              <div>
                <p className="font-bold text-navy">Important Check-in Instructions</p>
                <p className="mt-1 text-[11px] font-normal text-navy/60">
                  Please present a government-approved photo identity card (Aadhaar Card, Driving License, Voter ID, or Passport) at the front desk. Digital GST tax invoices will be dispatched to your email address at checkout.
                </p>
              </div>
            </div>

            {/* Finish actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <button 
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-3 text-xs font-bold text-navy border border-navy/20 rounded-full hover:bg-cream/10 transition-all cursor-pointer"
              >
                Print Receipt
              </button>
              <Link 
                to="/" 
                className="flex-1 py-3 text-xs font-bold bg-navy text-cream rounded-full hover:bg-[#081420] transition-all text-center flex items-center justify-center cursor-pointer border-none shadow-[rgba(13,27,42,0.15)_0px_8px_8px_-4px]"
              >
                Return to Home
              </Link>
            </div>

          </div>
        )}

      </section>

      {/* ================= MODAL DETAILED PREVIEW OVERLAY ================= */}
      {previewHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-[#FFF7E6] rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 max-h-[92vh] overflow-y-auto">
            
            {/* Close modal */}
            <button 
              onClick={() => setPreviewHotel(null)}
              className="absolute top-4 right-4 text-navy hover:text-navy/70 transition-all cursor-pointer p-1.5 rounded-full bg-white/90 border-none z-10 shadow-md"
            >
              <X className="size-5" />
            </button>

            {/* Left Column: Image Gallery Carousel */}
            <div className="flex-1 space-y-4">
              <div className="h-64 sm:h-72 rounded-2xl overflow-hidden shadow-md">
                <img 
                  src={previewHotel.images[previewActiveImgIdx]} 
                  alt={previewHotel.name} 
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.02]" 
                />
              </div>
              
              {/* Gallery Thumbnails */}
              <div className="flex gap-2.5">
                {previewHotel.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPreviewActiveImgIdx(idx)}
                    className={`w-20 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${previewActiveImgIdx === idx ? "border-purple scale-102" : "border-transparent opacity-80"}`}
                  >
                    <img src={img} alt="Thumbnail view" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>

              <div>
                <h3 className="font-serif text-xl font-bold text-navy">{previewHotel.name}</h3>
                <p className="mt-1.5 text-xs text-navy/60 leading-relaxed font-semibold">{previewHotel.description}</p>
                <div className="mt-3 flex items-center gap-1.5 bg-gold/10 px-2 py-0.5 rounded text-xs font-bold text-navy w-fit">
                  <Star className="size-3.5 fill-gold text-gold" /> {previewHotel.rating} · {previewHotel.reviews} reviews
                </div>
              </div>
            </div>

            {/* Right Column: Room Options inside Hotel */}
            <div className="flex-1 flex flex-col justify-between max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-4">
                <h4 className="font-serif text-lg font-bold text-navy border-b pb-2 mb-3">Choose Room Class</h4>
                
                {previewHotel.rooms.map((room) => {
                  const roomGst = Math.round(room.price * 0.18);
                  const roomTotal = room.price + roomGst;

                  return (
                    <div 
                      key={room.id}
                      className="border border-navy/10 bg-white p-4.5 rounded-2xl shadow-[0_5px_10px_-3px_#E7E9EE] space-y-3.5 flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-serif text-sm font-bold text-navy">{room.name}</h5>
                          <span className="text-[10px] text-navy/55 font-semibold font-sans mt-0.5 block">{room.size} · {room.beds}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-serif text-base font-bold text-navy">{inr(room.price)}</span>
                          <span className="text-[10px] text-navy/50 block">/ night</span>
                        </div>
                      </div>

                      <ul className="grid grid-cols-2 gap-1.5 text-[10px] text-navy/60 font-semibold">
                        {room.amenities.map(a => (
                          <li key={a} className="flex items-center gap-1"><Check className="size-3 text-success shrink-0" /> {a}</li>
                        ))}
                      </ul>

                      <div className="flex items-center justify-between border-t pt-3 border-navy/5">
                        <div className="text-[10px] text-navy/55 font-semibold">
                          <span className="block text-[9px] uppercase tracking-wider text-navy/35 font-bold">Cancellation policy</span>
                          {room.cancellation}
                        </div>
                        <button
                          onClick={() => handleSelectRoom(previewHotel, room)}
                          className="px-4 py-1.5 text-[11px] font-bold bg-navy text-cream rounded-full hover:bg-[#081420] transition-all cursor-pointer border-none shadow-[rgba(13,27,42,0.15)_0px_5px_5px_-2px]"
                        >
                          Select Room
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

    </SiteLayout>
  );
}