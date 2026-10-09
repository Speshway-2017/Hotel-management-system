import { useState, useMemo, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  MapPin, Star, Calendar, Users, Coffee, Bed, 
  ArrowRight, ShieldCheck, Wifi, Sparkles, CheckCircle2, RotateCcw, Search as SearchIcon, Filter, Hotel, X
} from "lucide-react";
import { SiteLayout } from "@/layouts/SiteLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { inr } from "@/data/hs-data";
import { publicService } from "@/services/public";
import { getHotelImage } from "@/utils/hotelImages";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Book a Stay — Hour Stay" },
      { name: "description", content: "Explore and book active luxury hotels, heritage havelis, and resorts across India." }
    ]
  }),
  component: SearchPage
});

export function SearchPage() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const urlParams = new URLSearchParams(window.location.search);
  const locationParam = urlParams.get('location') || "";
  const checkInParam = urlParams.get('checkIn') || "";
  const checkOutParam = urlParams.get('checkOut') || "";

  // Search & Filter States (Never prefilled with dummy dates)
  const [searchTerm, setSearchTerm] = useState(locationParam);
  const [checkInDate, setCheckInDate] = useState(checkInParam);
  const [checkOutDate, setCheckOutDate] = useState(checkOutParam);
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedClassification, setSelectedClassification] = useState("all");
  const [maxPrice, setMaxPrice] = useState(30000);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    if (checkInDate) {
      localStorage.setItem('booking_check_in', checkInDate);
    } else {
      localStorage.removeItem('booking_check_in');
    }
    if (checkOutDate) {
      localStorage.setItem('booking_check_out', checkOutDate);
    } else {
      localStorage.removeItem('booking_check_out');
    }
    if (searchTerm) {
      localStorage.setItem('search_location', searchTerm);
    }
  }, [checkInDate, checkOutDate, searchTerm]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const queryParams = {};
    if (checkInDate) queryParams.checkIn = checkInDate;
    if (checkOutDate) queryParams.checkOut = checkOutDate;

    publicService.getProperties(queryParams)
      .then(res => {
        if (!isMounted) return;
        if (res.success && res.data) {
          // Only show active properties
          const activeOnly = res.data.filter(p => p.status === 'Active' || !p.status);
          setProperties(activeOnly.length > 0 ? activeOnly : res.data);
        }
      })
      .catch(err => {
        if (isMounted) setError(err.message || "Failed to load hotel listings.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [checkInDate, checkOutDate]);

  // Unique cities list for filter dropdown
  const cities = useMemo(() => {
    const set = new Set();
    properties.forEach(p => {
      const city = p.city || p.settings?.city;
      if (city) set.add(city.split(",")[0].trim());
    });
    return Array.from(set);
  }, [properties]);

  // Dynamic Filtering Logic
  const filteredHotels = useMemo(() => {
    return properties.filter(p => {
      const s = p.settings || {};
      const hotelName = (s.hotelName || s.name || p.name || "").toLowerCase();
      const city = (s.city || p.city || "").toLowerCase();
      const address = (s.address || "").toLowerCase();
      const desc = (s.description || "").toLowerCase();
      const classification = (s.classification || "").toLowerCase();

      // 1. Search term check (matches Name or Location or Address)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = hotelName.includes(query);
        const matchesCity = city.includes(query);
        const matchesAddress = address.includes(query);
        const matchesDesc = desc.includes(query);
        if (!matchesName && !matchesCity && !matchesAddress && !matchesDesc) {
          return false;
        }
      }

      // 2. City filter
      if (selectedCity !== "all") {
        if (!city.includes(selectedCity.toLowerCase())) return false;
      }

      // 3. Classification filter
      if (selectedClassification !== "all") {
        if (!classification.includes(selectedClassification.toLowerCase())) return false;
      }

      // 4. Starting price check
      const baseRate = s.baseRate || 3500;
      if (baseRate > maxPrice) return false;

      // 5. Rating filter
      const rating = parseFloat(s.rating || 4.9);
      if (minRating > 0 && rating < minRating) return false;

      // 6. Only available filter
      if (onlyAvailable && p.roomStats) {
        if (!p.roomStats.isAvailable) return false;
      }

      // 7. Amenities check
      if (selectedAmenities.length > 0) {
        const propAmenities = Array.isArray(s.amenities)
          ? s.amenities.map(a => a.toLowerCase())
          : (typeof s.amenities === 'string' ? s.amenities.toLowerCase().split(',') : []);
        
        const hasAll = selectedAmenities.every(a => 
          propAmenities.some(pa => pa.includes(a.toLowerCase()))
        );
        if (!hasAll) return false;
      }

      return true;
    });
  }, [properties, searchTerm, selectedCity, selectedClassification, maxPrice, selectedAmenities, minRating, onlyAvailable]);

  const handleAmenityToggle = (amenity) => {
    if (selectedAmenities.includes(amenity)) {
      setSelectedAmenities(selectedAmenities.filter(a => a !== amenity));
    } else {
      setSelectedAmenities([...selectedAmenities, amenity]);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setCheckInDate("");
    setCheckOutDate("");
    localStorage.removeItem('search_location');
    localStorage.removeItem('booking_check_in');
    localStorage.removeItem('booking_check_out');
    setSelectedCity("all");
    setSelectedClassification("all");
    setMaxPrice(30000);
    setSelectedAmenities([]);
    setOnlyAvailable(false);
    setMinRating(0);
  };

  return (
    <SiteLayout>
      <section className="bg-cream min-h-screen py-10 font-ui text-left">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">

          {/* 1. Header & Prominent Search Banner */}
          <div className="bg-white rounded-3xl border-[5px] border-white p-6 sm:p-10 shadow-[rgba(13,27,42,0.06)_0px_20px_25px_-5px] mb-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[6px] bg-gradient-to-r from-purple via-coral to-gold" />
            
            <div className="max-w-3xl mb-6">              <span className="text-xs font-bold text-purple uppercase tracking-wider block mb-1">
                Luxury Stays & Heritage Havelis
              </span>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-navy">
                Book a Stay Across Active Properties
              </h1>
              <p className="text-xs sm:text-base text-gray-600 mt-1 font-ui">
                Explore real-time property availability, ratings, and luxury room suites from MongoDB.
              </p>
            </div>

            {/* Prominent Search Bar with Dates */}
            <div className="grid gap-3 sm:grid-cols-[1fr_190px_190px] max-w-4xl">
              <div className="relative">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Destination</span>
                <div className="relative">
                  <SearchIcon className="absolute left-4 top-3.5 size-5 text-navy/40 pointer-events-none" />
                  <Input 
                    type="text"
                    placeholder="Destination (e.g. Hyderabad, Jaipur, Goa)..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      localStorage.setItem('search_location', e.target.value);
                    }}
                    className="w-full h-12 bg-cream/35 border-navy/10 pl-12 pr-4 rounded-xl text-xs sm:text-sm font-semibold text-navy placeholder:text-gray-400 focus-visible:ring-purple/50 shadow-inner"
                  />
                </div>
              </div>

              {/* Check-in Date Input */}
              <div className="relative">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Check-in</span>
                <div className="relative flex items-center">
                  <Calendar className="absolute left-3.5 size-4.5 text-purple pointer-events-none z-10" />
                  <Input 
                    type={checkInDate ? "date" : "text"}
                    placeholder="dd-mm-yyyy"
                    aria-label="Check-in Date"
                    value={checkInDate}
                    min={new Date().toISOString().split('T')[0]}
                    onFocus={(e) => {
                      e.target.type = "date";
                      try { e.target.showPicker(); } catch (_) {}
                    }}
                    onBlur={(e) => {
                      if (!e.target.value) {
                        e.target.type = "text";
                      }
                    }}
                    onChange={(e) => {
                      setCheckInDate(e.target.value);
                      if (e.target.value) {
                        localStorage.setItem('booking_check_in', e.target.value);
                      } else {
                        localStorage.removeItem('booking_check_in');
                      }
                      if (checkOutDate && e.target.value && e.target.value >= checkOutDate) {
                        const nextDay = new Date(e.target.value);
                        nextDay.setDate(nextDay.getDate() + 1);
                        const nextDayStr = nextDay.toISOString().split('T')[0];
                        setCheckOutDate(nextDayStr);
                        localStorage.setItem('booking_check_out', nextDayStr);
                      }
                    }}
                    className="w-full h-12 bg-cream/35 border-navy/10 pl-10 pr-8 rounded-xl text-xs sm:text-sm font-semibold text-navy placeholder:text-gray-400 focus-visible:ring-purple/50 shadow-inner cursor-pointer"
                  />
                  {checkInDate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCheckInDate("");
                        localStorage.removeItem('booking_check_in');
                      }}
                      className="absolute right-2.5 p-1 rounded-full text-gray-400 hover:text-navy hover:bg-navy/5 cursor-pointer"
                      title="Clear check-in date"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Check-out Date Input */}
              <div className="relative">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Check-out</span>
                <div className="relative flex items-center">
                  <Calendar className="absolute left-3.5 size-4.5 text-purple pointer-events-none z-10" />
                  <Input 
                    type={checkOutDate ? "date" : "text"}
                    placeholder="dd-mm-yyyy"
                    aria-label="Check-out Date"
                    value={checkOutDate}
                    min={checkInDate ? checkInDate : new Date().toISOString().split('T')[0]}
                    onFocus={(e) => {
                      e.target.type = "date";
                      try { e.target.showPicker(); } catch (_) {}
                    }}
                    onBlur={(e) => {
                      if (!e.target.value) {
                        e.target.type = "text";
                      }
                    }}
                    onChange={(e) => {
                      setCheckOutDate(e.target.value);
                      if (e.target.value) {
                        localStorage.setItem('booking_check_out', e.target.value);
                      } else {
                        localStorage.removeItem('booking_check_out');
                      }
                    }}
                    className="w-full h-12 bg-cream/35 border-navy/10 pl-10 pr-8 rounded-xl text-xs sm:text-sm font-semibold text-navy placeholder:text-gray-400 focus-visible:ring-purple/50 shadow-inner cursor-pointer"
                  />
                  {checkOutDate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCheckOutDate("");
                        localStorage.removeItem('booking_check_out');
                      }}
                      className="absolute right-2.5 p-1 rounded-full text-gray-400 hover:text-navy hover:bg-navy/5 cursor-pointer"
                      title="Clear check-out date"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Main Content Grid */}
          <div className="grid gap-8 lg:grid-cols-[270px_1fr] items-start">
            
            {/* Filters Sidebar */}
            <aside className="space-y-6">
              <div className="bg-white rounded-2xl p-5 border border-navy/5 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b border-navy/5 pb-3">
                  <h3 className="font-display text-base font-bold text-navy flex items-center gap-2">
                    <Filter className="size-4 text-purple" /> Filters
                  </h3>
                  <button 
                    onClick={resetFilters}
                    className="text-[10px] font-bold text-purple hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="size-3" /> Reset
                  </button>
                </div>

                {/* Location Filter */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">City / Location</label>
                  <select 
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full h-10 bg-cream/40 border border-navy/10 rounded-xl text-xs font-semibold text-navy px-3 focus:outline-none focus:border-purple cursor-pointer"
                  >
                    <option value="all">All Cities</option>
                    {cities.map((c, i) => (
                      <option key={i} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Hotel Classification */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Classification</label>
                  <select 
                    value={selectedClassification}
                    onChange={(e) => setSelectedClassification(e.target.value)}
                    className="w-full h-10 bg-cream/40 border border-navy/10 rounded-xl text-xs font-semibold text-navy px-3 focus:outline-none focus:border-purple cursor-pointer"
                  >
                    <option value="all">All Classifications</option>
                    <option value="5-Star">5-Star Luxury</option>
                    <option value="4-Star">4-Star Deluxe</option>
                    <option value="Heritage">Heritage Haveli</option>
                    <option value="Boutique">Boutique Resort</option>
                    <option value="3-Star">3-Star Comfort</option>
                  </select>
                </div>

                {/* Price Range Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Max Price / Night</label>
                    <span className="text-xs font-bold text-purple font-price">{inr(maxPrice)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="1500" 
                    max="30000" 
                    step="500"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                    className="w-full accent-purple h-1 bg-cream rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 font-semibold font-price">
                    <span>₹1,500</span>
                    <span>₹30,000</span>
                  </div>
                </div>

                {/* Minimum Rating */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Min Guest Rating</label>
                  <div className="flex gap-2">
                    {[0, 4.0, 4.5, 4.8].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setMinRating(r)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                          minRating === r 
                            ? "bg-purple text-cream border-purple" 
                            : "border-navy/10 text-gray-600 hover:bg-navy/5"
                        }`}
                      >
                        {r === 0 ? "Any" : `${r}+ ★`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Availability Filter */}
                <div className="space-y-2 pt-2 border-t border-navy/5">
                  <label className="flex items-center gap-2.5 text-xs font-semibold text-navy cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={onlyAvailable}
                      onChange={(e) => setOnlyAvailable(e.target.checked)}
                      className="size-4 rounded accent-purple border-navy/10"
                    />
                    <span>Only show available hotels</span>
                  </label>
                </div>

                {/* Key Amenities Checkboxes */}
                <div className="space-y-2 pt-2 border-t border-navy/5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Popular Amenities</label>
                  <div className="flex flex-col gap-2">
                    {["WiFi", "Swimming Pool", "Spa", "Room Service", "Gym", "Restaurant"].map((a) => (
                      <label key={a} className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer">
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

              </div>
            </aside>

            {/* Hotel Cards Results Grid */}
            <main>
              {loading ? (
                <div className="bg-white rounded-2xl p-16 border border-navy/5 text-center space-y-4">
                  <div className="mx-auto size-10 rounded-full border-4 border-purple border-t-transparent animate-spin" />
                  <p className="text-sm font-semibold text-gray-500">Fetching active properties and room availability from MongoDB...</p>
                </div>
              ) : error ? (
                <div className="bg-white rounded-2xl p-12 border border-rose-200 text-center space-y-3">
                  <p className="text-sm font-bold text-rose-600">{error}</p>
                  <button onClick={resetFilters} className="px-4 py-2 bg-navy text-cream rounded-full text-xs font-bold">Try Again</button>
                </div>
              ) : filteredHotels.length === 0 ? (
                <div className="bg-white rounded-2xl p-16 border border-navy/5 text-center space-y-4 shadow-soft">
                  <Hotel className="size-12 text-navy/20 mx-auto" />
                  <h3 className="font-display text-xl font-bold text-navy">No hotels available in this location</h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    {searchTerm 
                      ? `We currently do not have active hotels listed in "${searchTerm}". Try searching another location like Hyderabad, Jaipur, or Goa.`
                      : "No active properties match your search criteria. Try modifying your search term or clearing active filters."}
                  </p>
                  <button 
                    onClick={resetFilters}
                    className="px-5 py-2.5 bg-purple text-cream rounded-full text-xs font-bold hover:bg-purple/90 transition-colors shadow-soft cursor-pointer border-none"
                  >
                    Clear Search & View All Hotels
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-between items-center text-xs font-semibold text-gray-500 px-1">
                    <span>Showing <strong>{filteredHotels.length}</strong> active hotel properties</span>
                    <span>Sorted by: <strong>Featured Stays</strong></span>
                  </div>

                  <div className="space-y-6">
                    {filteredHotels.map((property) => {
                      const propId = property._id || property.id;
                      const s = property.settings || {};
                      const hotelName = s.hotelName || s.name || property.name || "Speshway Luxury Hotel";
                      const city = s.city || property.city || "Hyderabad";
                      const address = s.address ? `${s.address}, ${city}` : city;
                      const description = s.description || "Experience refined hospitality, luxurious suites, and premium guest amenities.";
                      const classification = s.classification || "5-Star Luxury";
                      const rating = s.rating || "4.9";
                      const startingPrice = s.baseRate || 3500;
                      const isDatesSelected = Boolean(checkInDate && checkOutDate);
                      const stats = property.roomStats || {};
                      const isAvail = stats.isAvailable !== false;
                      
                      const amenitiesList = Array.isArray(s.amenities)
                        ? s.amenities.slice(0, 4)
                        : (typeof s.amenities === 'string' ? s.amenities.split(',').map(a => a.trim()).slice(0, 4) : ["WiFi", "Pool", "Room Service", "Spa"]);

                      return (
                        <article 
                          key={propId}
                          onClick={() => {
                            if (propId) localStorage.setItem('selected_property_id', propId);
                            if (property) localStorage.setItem('selected_property_data', JSON.stringify(property));
                            const queryStr = (checkInDate && checkOutDate) ? `?checkIn=${encodeURIComponent(checkInDate)}&checkOut=${encodeURIComponent(checkOutDate)}` : '';
                            navigate(`/hotels/${propId}${queryStr}`);
                          }}
                          className="grid sm:grid-cols-[280px_1fr] bg-white rounded-2xl border border-navy/5 shadow-soft hover:shadow-lg hover:border-purple/30 overflow-hidden transition-all duration-300 cursor-pointer group"
                        >
                          {/* Image Thumbnail */}
                          <div className="relative h-56 sm:h-full min-h-[220px] bg-navy overflow-hidden">
                            <img 
                              src={getHotelImage(property)} 
                              alt={hotelName} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                              <div className="bg-navy/85 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-gold uppercase tracking-wider border border-gold/20">
                                {classification}
                              </div>
                            </div>

                            {/* Room Availability Badge on Thumbnail */}
                            <div className="absolute bottom-3 left-3">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider backdrop-blur-md shadow-sm ${
                                !isDatesSelected 
                                  ? "bg-emerald-600/90 text-white" 
                                  : (isAvail 
                                      ? "bg-emerald-600/90 text-white" 
                                      : (stats.occupiedRooms > 0 
                                          ? "bg-rose-600/90 text-white" 
                                          : (stats.reservedRooms > 0 ? "bg-amber-600/90 text-white" : "bg-gray-700/90 text-white")))
                              }`}>
                                {!isDatesSelected 
                                  ? (stats.totalRooms > 0 ? `${stats.totalRooms} Rooms Available` : "All Rooms Available") 
                                  : (isAvail 
                                      ? `${stats.availableRooms || 1} Available for Dates` 
                                      : (stats.occupiedRooms > 0 
                                          ? "Occupied for Dates" 
                                          : (stats.reservedRooms > 0 ? "Reserved for Dates" : "No Rooms Available")))}
                              </span>
                            </div>
                          </div>

                          {/* Content Details */}
                          <div className="p-6 flex flex-col justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex justify-between items-start gap-4">
                                <div>
                                  <h2 className="font-display text-xl sm:text-2xl font-bold text-navy group-hover:text-purple transition-colors">{hotelName}</h2>
                                  <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                                    <MapPin className="size-3.5 text-purple shrink-0" />
                                    <span>{address}</span>
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5 bg-purple/10 px-2.5 py-1 rounded-lg text-purple font-bold text-xs shrink-0">
                                  <Star className="size-3.5 fill-purple text-purple" />
                                  <span>{rating}</span>
                                </div>
                              </div>

                              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-2 pt-1 font-ui">
                                {description}
                              </p>

                              {/* Amenities badges */}
                              <div className="flex flex-wrap gap-1.5 pt-2">
                                {amenitiesList.map((a, i) => (
                                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-cream text-navy/75 font-semibold text-[10px] border border-navy/5">
                                    <CheckCircle2 className="size-3 text-purple" />
                                    <span>{a}</span>
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Footer & Actions */}
                            <div className="flex justify-between items-end pt-4 border-t border-navy/5">
                              <div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Starting From</span>
                                <div className="flex items-baseline gap-1">
                                  <span className="font-price text-xl font-bold text-navy tracking-tight">{inr(startingPrice)}</span>
                                  <span className="text-[10px] text-gray-500 font-medium">/ night + GST</span>
                                </div>
                              </div>

                              <Button 
                                variant="hero" 
                                size="touch" 
                                className="h-10 px-5 text-xs font-bold cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (propId) localStorage.setItem('selected_property_id', propId);
                                  if (property) localStorage.setItem('selected_property_data', JSON.stringify(property));
                                  const queryStr = (checkInDate && checkOutDate) ? `?checkIn=${encodeURIComponent(checkInDate)}&checkOut=${encodeURIComponent(checkOutDate)}` : '';
                                  navigate(`/hotels/${propId}${queryStr}`);
                                }}
                              >
                                <span>{!isDatesSelected || isAvail ? "View Details" : "View Hotel (Occupied)"}</span>
                                <ArrowRight className="size-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                              </Button>
                            </div>
                          </div>

                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </main>

          </div>

        </div>
      </section>
    </SiteLayout>
  );
}

export default SearchPage;