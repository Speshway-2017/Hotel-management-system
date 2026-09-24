import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, CheckCircle2, AlertCircle, Ticket, Tag, Sparkles, X, Check } from "lucide-react";
import { SiteLayout } from "@/layouts/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inr } from "@/data/hs-data";
import { calculateStayNights } from "@/utils/dateUtils";
import { publicService } from "@/services/public";
import { authService } from "@/services/auth";
import { toast } from "sonner";
import { validateWithZod, publicBookingSchema } from "@/schemas";

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
  const [guestName, setGuestName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [gstin, setGstin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");

  // Coupon / Promo Code state
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponFeedback, setCouponFeedback] = useState(null); // { type: 'success' | 'error', text: '' }
  const [fieldErrors, setFieldErrors] = useState({});

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
        setGuestName(currentUser.name);
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

    // Fetch active available promo coupons for website and merge with admin-created coupons
    const loadCoupons = async (targetEmail, targetPhone) => {
      let serverCoupons = [];
      const cu = authService.getCurrentUser();
      const activeEmail = targetEmail !== undefined ? targetEmail : (currentUser?.email || email);
      const activePhone = targetPhone !== undefined ? targetPhone : (currentUser?.mobile || phone);
      const guestId = cu?._id || cu?.id;

      try {
        const res = await publicService.getCoupons({
          propertyId: activeId,
          email: activeEmail,
          phone: activePhone,
          guestId
        });
        if (res && res.success && Array.isArray(res.data)) {
          serverCoupons = res.data;
        }
      } catch (e) {}

      // Merge with locally created admin coupons if any
      let localCoupons = [];
      try {
        const raw = localStorage.getItem('hms_admin_coupons_cache');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const todayStr = new Date().toISOString().split('T')[0];
            localCoupons = parsed.filter(c => {
              if (c.status && c.status !== 'Active') return false;
              if (c.validFrom && todayStr < c.validFrom) return false;
              if (c.validUntil && todayStr > c.validUntil) return false;
              return true;
            }).map(c => ({
              id: c._id || c.id,
              _id: c._id || c.id,
              code: String(c.code).toUpperCase(),
              title: c.title || c.code,
              description: c.description || '',
              discountType: c.discountType === 'flat' ? 'fixed' : (c.discountType || 'percentage'),
              discountValue: Number(c.discountValue) || 0,
              maxDiscount: Number(c.maxDiscount) || 0,
              minBookingAmount: Number(c.minBookingAmount) || 0,
              validFrom: c.validFrom,
              validUntil: c.validUntil,
              firstBookingOnly: String(c.code || '').toUpperCase().includes('WELCOME')
            }));
          }
        }
      } catch (e) {}

      const merged = [...serverCoupons];
      for (const lc of localCoupons) {
        if (!merged.some(m => m.code?.toUpperCase() === lc.code?.toUpperCase())) {
          merged.unshift(lc);
        }
      }

      setAvailableCoupons(merged);
    };

    loadCoupons();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (email || phone) {
        const activeId = localStorage.getItem('selected_property_id') || 'HS-9HQ8P';
        const cu = authService.getCurrentUser();
        publicService.getCoupons({
          propertyId: activeId,
          email: email || cu?.email,
          phone: phone || cu?.mobile,
          guestId: cu?._id || cu?.id
        }).then(res => {
          if (res && res.success && Array.isArray(res.data)) {
            setAvailableCoupons(res.data);
            // If applied coupon was a welcome coupon and user already has previous bookings, remove it
            if (appliedCoupon && (appliedCoupon.firstBookingOnly || String(appliedCoupon.code || '').toUpperCase().includes('WELCOME'))) {
              const stillValid = res.data.some(c => c.code?.toUpperCase() === appliedCoupon.code?.toUpperCase());
              if (!stillValid) {
                setAppliedCoupon(null);
                setDiscountAmount(0);
                setCouponCodeInput("");
                setCouponFeedback({
                  type: 'error',
                  text: `Promo code "${appliedCoupon.code}" is exclusively valid for 1st-time bookings only.`
                });
              }
            }
          }
        }).catch(() => {});
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [email, phone]);

  const checkInDate = localStorage.getItem('booking_check_in') || new Date().toISOString().split('T')[0];
  const checkOutDate = localStorage.getItem('booking_check_out') || new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const nights = calculateStayNights(checkInDate, checkOutDate);

  // Calculate pricing & tariff
  const roomRate = Number(selectedRoom?.currentRate || selectedRoom?.baseRate || selectedRoom?.dailyRate || 3000);
  const roomBaseTotal = roomRate * nights;
  const roomGst = Math.round(roomBaseTotal * 0.18);
  const grossTotal = Number(roomBaseTotal + roomGst);
  const payableTotal = Math.max(0, grossTotal - discountAmount);

  const hotelName = property?.settings?.hotelName || property?.name || "Speshway Luxury Hotel";
  const propId = property?._id || property?.id || 'HS-9HQ8P';
  const roomCategory = selectedRoom?.category || 'Standard Room';
  const ratePlanDisplay = (selectedRoom?.ratePlan && selectedRoom.ratePlan !== 'Standard Plan' && selectedRoom.ratePlan !== 'Standard Rate Plan')
    ? selectedRoom.ratePlan
    : (roomCategory.toLowerCase().includes('deluxe') ? 'Deluxe Rate Plan' : roomCategory.toLowerCase().includes('suite') ? 'Executive Suite Plan' : roomCategory.toLowerCase().includes('villa') ? 'Villa Suite Plan' : `${roomCategory} Rate Plan`);

  // Handle applying a coupon
  const handleApplyCoupon = async (codeToApply) => {
    const targetCode = String(codeToApply || couponCodeInput).trim().toUpperCase();
    if (!targetCode) {
      setCouponFeedback({ type: 'error', text: 'Please enter a coupon code.' });
      return;
    }

    setValidatingCoupon(true);
    setCouponFeedback(null);

    const cu = authService.getCurrentUser();
    const guestEmail = email || cu?.email;
    const guestPhone = phone || cu?.mobile;
    const guestId = cu?._id || cu?.id;

    try {
      const res = await publicService.validateCoupon({
        code: targetCode,
        bookingAmount: grossTotal,
        propertyId: propId,
        email: guestEmail,
        phone: guestPhone,
        guestId
      });

      if (res && res.success && res.data && res.data.valid) {
        setAppliedCoupon(res.data.coupon);
        setDiscountAmount(res.data.discountAmount);
        setCouponCodeInput(res.data.coupon.code);
        setCouponFeedback({
          type: 'success',
          text: `Coupon "${res.data.coupon.code}" applied! You saved ${inr(res.data.discountAmount)}.`
        });
        toast.success(`Coupon ${res.data.coupon.code} applied successfully!`);
        return;
      } else {
        throw new Error(res?.message || 'Coupon could not be validated on server');
      }
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.message;

      // If server returned an explicit rejection (e.g., first-booking restriction), show server message directly
      if (err.response?.data?.message) {
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setCouponFeedback({
          type: 'error',
          text: err.response.data.message
        });
        return;
      }

      // Fallback: check availableCoupons / local cache for valid coupon
      const localMatch = availableCoupons.find(c => c.code?.toUpperCase() === targetCode);
      if (localMatch) {
        const amountNum = grossTotal;
        if (localMatch.minBookingAmount > 0 && amountNum < localMatch.minBookingAmount) {
          setAppliedCoupon(null);
          setDiscountAmount(0);
          setCouponFeedback({
            type: 'error',
            text: `Coupon "${localMatch.code}" requires a minimum booking amount of ₹${localMatch.minBookingAmount.toLocaleString('en-IN')}. (Current: ₹${amountNum.toLocaleString('en-IN')})`
          });
          return;
        }

        let calcDisc = 0;
        if (localMatch.discountType === 'percentage') {
          calcDisc = Math.round((amountNum * localMatch.discountValue) / 100);
          if (localMatch.maxDiscount > 0 && calcDisc > localMatch.maxDiscount) {
            calcDisc = localMatch.maxDiscount;
          }
        } else {
          calcDisc = Math.min(localMatch.discountValue, amountNum);
        }

        setAppliedCoupon(localMatch);
        setDiscountAmount(calcDisc);
        setCouponCodeInput(localMatch.code);
        setCouponFeedback({
          type: 'success',
          text: `Coupon "${localMatch.code}" applied! You saved ${inr(calcDisc)}.`
        });
        toast.success(`Coupon ${localMatch.code} applied successfully!`);
        return;
      }

      setAppliedCoupon(null);
      setDiscountAmount(0);
      setCouponFeedback({
        type: 'error',
        text: serverMsg || `Invalid coupon code '${targetCode}'.`
      });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCodeInput("");
    setCouponFeedback(null);
    toast.info("Coupon removed.");
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setBookingError("");

    if (!authService.isAuthenticated()) {
      localStorage.setItem('redirect_after_login', '/booking');
      window.location.href = '/login?redirect=/booking';
      return;
    }

    const val = validateWithZod(publicBookingSchema, {
      guestName,
      email,
      phone,
      city: city || property?.settings?.city || property?.city || "Hyderabad",
      checkIn: checkInDate,
      checkOut: checkOutDate,
      pax: pax || "2 Adults",
      roomType: roomCategory
    });

    if (!val.isValid) {
      setFieldErrors(val.errors);
      setBookingError(val.firstError);
      return;
    }
    setFieldErrors({});

    if (!payableTotal || isNaN(payableTotal) || payableTotal <= 0) {
      setBookingError("Booking amount validation failed: amount must be a positive number.");
      return;
    }

    setSubmitting(true);
    try {
      const propId = property?._id || property?.id || localStorage.getItem('selected_property_id') || 'HS-9HQ8P';
      const guestFullName = guestName.trim() || 'Guest';

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
        nights: nights,
        roomType: roomCategory,
        roomNumber: selectedRoom?.roomNumber ? String(selectedRoom.roomNumber) : (selectedRoom?.num ? String(selectedRoom.num) : null),
        roomId: selectedRoom?._id || selectedRoom?.id || null,
        room: selectedRoom?.roomNumber ? `${selectedRoom.roomNumber} · ${roomCategory}` : roomCategory,
        ratePlan: ratePlanDisplay,
        city: property?.settings?.city || property?.city || city || 'Hyderabad',
        hotelCity: property?.settings?.city || property?.city || city || 'Hyderabad',
        roomBaseTotal: roomBaseTotal,
        gstAmount: roomGst,
        originalAmount: grossTotal,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        coupon: appliedCoupon ? appliedCoupon.code : null,
        discountAmount: discountAmount,
        totalAmount: payableTotal,
        amount: payableTotal,
        specialRequests: gstin ? `GSTIN: ${gstin}` : ''
      };

      const res = await publicService.createBooking(bookingPayload);
      if (res && res.success && res.data) {
        const created = res.data.booking || res.data;
        const bId = created.bookingId || created._id || created.id;

        if (res.data.token) {
          localStorage.setItem('hms_token', res.data.token);
        }
        if (res.data.user) {
          localStorage.setItem('hms_user', JSON.stringify(res.data.user));
          window.dispatchEvent(new Event('user-profile-updated'));
        }

        // Clear transient booking selection
        localStorage.removeItem('selected_room_data');
        localStorage.removeItem('booking_check_in');
        localStorage.removeItem('booking_check_out');
        localStorage.removeItem('latest_booking');
        localStorage.removeItem('latest_booking_id');

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

          {/* 2. Header */}
          <div className="mb-6">
            <h1 className="font-display text-3xl font-bold text-navy">Complete your booking</h1>
            <p className="text-xs text-navy/60 mt-1 font-medium">Verify your details, stay schedule, and instant tariff breakdown</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
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
                  <div className="sm:col-span-2">
                    <Label htmlFor="guestName" className="text-xs font-bold text-navy">Full Name</Label>
                    <Input id="guestName" nameOnly className="mt-1.5 h-11 text-xs font-medium" value={guestName} onChange={e => { setGuestName(e.target.value); if (fieldErrors.guestName) setFieldErrors(p => ({ ...p, guestName: null })); }} placeholder="e.g. Surya Sharma" required />
                    {fieldErrors.guestName && <p className="text-[11px] font-bold text-rose-600 mt-1">{fieldErrors.guestName}</p>}
                  </div>
                  <div>
                    <Label htmlFor="em" className="text-xs font-bold text-navy">Email Address</Label>
                    <Input id="em" type="email" className="mt-1.5 h-11 text-xs font-medium" value={email} onChange={e => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: null })); }} required />
                    {fieldErrors.email && <p className="text-[11px] font-bold text-rose-600 mt-1">{fieldErrors.email}</p>}
                  </div>
                  <div>
                    <Label htmlFor="mb" className="text-xs font-bold text-navy">Mobile Number</Label>
                    <Input id="mb" type="tel" className="mt-1.5 h-11 text-xs font-medium" value={phone} onChange={e => { setPhone(e.target.value); if (fieldErrors.phone) setFieldErrors(p => ({ ...p, phone: null })); }} required />
                    {fieldErrors.phone && <p className="text-[11px] font-bold text-rose-600 mt-1">{fieldErrors.phone}</p>}
                  </div>
                  <div>
                    <Label htmlFor="ct" className="text-xs font-bold text-navy">City</Label>
                    <Input id="ct" textOnly className="mt-1.5 h-11 text-xs font-medium" value={city || (property?.settings?.city || property?.city || "Hyderabad")} onChange={e => { setCity(e.target.value); if (fieldErrors.city) setFieldErrors(p => ({ ...p, city: null })); }} placeholder="e.g. Hyderabad" />
                    {fieldErrors.city && <p className="text-[11px] font-bold text-rose-600 mt-1">{fieldErrors.city}</p>}
                  </div>
                  <div>
                    <Label htmlFor="gst" className="text-xs font-bold text-navy">GSTIN (Optional)</Label>
                    <Input id="gst" className="mt-1.5 h-11 text-xs font-medium" value={gstin} onChange={e => setGstin(e.target.value)} placeholder="e.g. 07AAAAA0000A1Z5" />
                  </div>
                </div>
              </div>

              {/* Promo Offers Banner (if available) */}
              {availableCoupons.length > 0 && (
                <div className="bg-purple/5 rounded-2xl border border-purple/15 p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="size-4 text-purple" />
                    <h3 className="font-display text-sm font-bold text-navy">Available Website Offers & Coupons</h3>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {availableCoupons.map((ac) => {
                      const isApplied = appliedCoupon?.code === ac.code;
                      const discountTag = ac.discountType === 'percentage'
                        ? `${ac.discountValue}% OFF`
                        : `₹${ac.discountValue} OFF`;

                      return (
                        <div
                          key={ac.id || ac.code}
                          className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between ${
                            isApplied
                              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/20'
                              : 'bg-white border-navy/10 hover:border-purple/40 hover:shadow-xs'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="font-mono font-bold text-xs bg-purple/10 text-purple px-2 py-0.5 rounded border border-purple/20">
                                {ac.code}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                                {discountTag}
                              </span>
                            </div>
                            <p className="text-[11px] text-navy/70 mt-1 font-medium line-clamp-2">
                              {ac.description || ac.title}
                            </p>
                            {ac.minBookingAmount > 0 && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Min spend: ₹{ac.minBookingAmount.toLocaleString('en-IN')}
                              </p>
                            )}
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-navy/5 flex justify-end">
                            {isApplied ? (
                              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                <Check className="size-3" /> Applied
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleApplyCoupon(ac.code)}
                                disabled={validatingCoupon}
                                className="text-[11px] font-bold text-purple hover:text-purple/80 cursor-pointer disabled:opacity-50"
                              >
                                Apply Code →
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-navy/5">
                <Button 
                  type="submit" 
                  disabled={submitting} 
                  variant="hero" 
                  size="touch" 
                  className="w-full sm:w-auto h-11 px-8 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Processing Reservation..." : `Confirm Booking (${inr(payableTotal)})`}
                </Button>
              </div>

            </form>

            {/* Sidebar Column */}
            <aside className="space-y-4">
              <div className="bg-white rounded-2xl border border-navy/10 p-6 shadow-soft text-left space-y-4">
                <h3 className="font-display text-lg font-bold text-navy border-b border-navy/5 pb-2">Stay Summary</h3>

                <div>
                  <p className="font-display text-base font-bold text-navy">{roomCategory}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {selectedRoom?.roomNumber && (
                      <span className="text-[10px] bg-purple/10 text-purple font-mono font-bold px-2 py-0.5 rounded inline-block">
                        Room {selectedRoom.roomNumber} ({selectedRoom.floor || 'Floor 1'})
                      </span>
                    )}
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-2 py-0.5 rounded inline-block">
                      {ratePlanDisplay}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-navy/60 font-medium">
                    {hotelName}, {property?.city || "Hyderabad"}
                  </p>
                </div>

                <div className="text-xs text-navy/70 space-y-1 bg-cream/40 p-3 rounded-xl border border-navy/5 font-medium">
                  <div className="flex justify-between"><span>Check-In:</span><strong className="text-navy font-bold">{checkInDate}</strong></div>
                  <div className="flex justify-between"><span>Check-Out:</span><strong className="text-navy font-bold">{checkOutDate}</strong></div>
                </div>

                {/* Promo Code Input Box */}
                <div className="pt-3 border-t border-navy/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="couponIn" className="text-xs font-bold text-navy flex items-center gap-1.5">
                      <Ticket className="size-3.5 text-purple" /> Promo / Coupon Code
                    </Label>
                    {appliedCoupon && (
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-[10px] text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      id="couponIn"
                      placeholder="ENTER COUPON"
                      value={couponCodeInput}
                      onChange={e => setCouponCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                      disabled={!!appliedCoupon || validatingCoupon}
                      className="h-10 text-xs font-mono font-bold uppercase"
                    />
                    {appliedCoupon ? (
                      <Button
                        type="button"
                        onClick={handleRemoveCoupon}
                        variant="outline"
                        size="sm"
                        className="h-10 px-3 text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50 cursor-pointer"
                      >
                        <X className="size-3.5" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => handleApplyCoupon(couponCodeInput)}
                        disabled={!couponCodeInput.trim() || validatingCoupon}
                        variant="hero"
                        size="sm"
                        className="h-10 px-4 text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        {validatingCoupon ? "..." : "Apply"}
                      </Button>
                    )}
                  </div>

                  {couponFeedback && (
                    <div className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                      couponFeedback.type === 'success'
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border border-rose-200 text-rose-700'
                    }`}>
                      {couponFeedback.type === 'success' ? (
                        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle className="size-3.5 shrink-0 text-rose-600" />
                      )}
                      <span>{couponFeedback.text}</span>
                    </div>
                  )}
                </div>

                {/* Tariff Breakdown */}
                <dl className="space-y-2 border-t border-navy/5 pt-4 text-xs font-medium">
                  <div className="flex justify-between">
                    <dt className="text-navy/60">Room Tariff ({nights} {nights === 1 ? 'night' : 'nights'})</dt>
                    <dd className="tabular-nums font-bold text-navy">{inr(roomBaseTotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-navy/60">GST (18%)</dt>
                    <dd className="tabular-nums font-bold text-navy">{inr(roomGst)}</dd>
                  </div>

                  {appliedCoupon && discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50/80 p-2 rounded-lg border border-emerald-200/60">
                      <dt className="flex items-center gap-1">
                        <Tag className="size-3" /> Coupon ({appliedCoupon.code})
                      </dt>
                      <dd className="tabular-nums">- {inr(discountAmount)}</dd>
                    </div>
                  )}

                  <div className="flex justify-between border-t border-navy/5 pt-3 text-sm font-bold text-navy">
                    <dt>Total Payable</dt>
                    <dd className="tabular-nums font-bold text-purple">{inr(payableTotal)}</dd>
                  </div>
                </dl>
              </div>
            </aside>
          </div>

        </div>
      </div>
    </SiteLayout>
  );
}