import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { 
  Star, MessageSquare, Plus, AlertCircle, 
  CheckCircle2, Hotel, Calendar, User, ThumbsUp, Send, X,
  Sparkles, MessageSquareText, ShieldCheck, MapPin, Bed, 
  Clock, Search
} from "lucide-react";
import { apiClient, invalidateApiCache } from "@/services/apiClient";
import { authService } from "@/services/auth";
import { subscribeRealtimeSync } from "@/services/socket";
import { Button } from "@/components/ui/button";
import { validateWithZod, feedbackSchema } from "@/schemas";

export const Route = createFileRoute("/guest/feedback")({
  head: () => ({
    meta: [
      { title: "Guest Feedback — Hour Stay" },
      { name: "description", content: "View your submitted feedback records and hotel management replies." }
    ]
  }),
  component: GuestReviewsPage
});

function StarRating({ rating = 5, size = "size-3.5", showNumber = true }) {
  const num = Number(rating) || 5;
  const rounded = Math.round(num);
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="flex items-center gap-0.5 text-amber-500">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`${size} ${i < rounded ? "fill-amber-400 text-amber-400" : "text-navy/15"}`}
          />
        ))}
      </div>
      {showNumber && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80 font-mono">
          {num.toFixed(1)}
        </span>
      )}
    </div>
  );
}

function CategoryRatingsBadges({ ratings, categories, defaultRating = 5 }) {
  const catData = ratings || categories || {};
  const items = [];

  if (catData.cleanliness !== undefined) items.push({ label: "Clean", val: catData.cleanliness });
  if (catData.service !== undefined) items.push({ label: "Service", val: catData.service });
  if (catData.room !== undefined) items.push({ label: "Room", val: catData.room });
  if (catData.staff !== undefined) items.push({ label: "Staff", val: catData.staff });
  if (catData.food !== undefined) items.push({ label: "Food", val: catData.food });

  if (items.length === 0) {
    return (
      <div className="flex flex-wrap gap-1 items-center text-[10px]">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cream/40 text-navy/70 border border-navy/10 font-semibold">
          Overall: <strong className="text-navy">{defaultRating}★</strong>
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {items.map((item, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-cream/30 text-navy/80 border border-navy/10 hover:bg-cream/60 transition-colors whitespace-nowrap"
        >
          <span className="text-navy/60 font-medium">{item.label}</span>
          <span className="font-bold text-navy flex items-center text-[9.5px]">
            {item.val}<Star className="size-2.5 fill-amber-400 text-amber-400 ml-0.5 inline" />
          </span>
        </span>
      ))}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "Recent Stay";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Recent Stay";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return "Recent Stay";
  }
}

function GuestReviewsPage() {
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const paramBookingId = urlParams.get('bookingId') || urlParams.get('id') || "";
  const paramNew = urlParams.get('new') === 'true' || urlParams.get('add') === 'true' || !!paramBookingId;

  const [reviews, setReviews] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(paramNew);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");

  // Feedback Form State
  const [selectedBooking, setSelectedBooking] = useState(paramBookingId);
  const [overallRating, setOverallRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [categories, setCategories] = useState({
    cleanliness: 5,
    service: 5,
    room: 5
  });
  const [comments, setComments] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError("");
    try {
      const user = authService.getCurrentUser();
      setCurrentUser(user);

      // 1. Fetch Guest Feedback from Backend/MongoDB
      let revData;
      try {
        revData = await apiClient.get('/v1/guest/feedback', { bypassCache: true });
      } catch (e) {
        revData = await apiClient.get('/guest/feedback', { bypassCache: true }).catch(() => ({}));
      }

      if (revData && revData.success && Array.isArray(revData.data)) {
        setReviews(revData.data);
      } else {
        setReviews([]);
      }

      // 2. Fetch Guest Bookings for the form dropdown
      let bookData;
      try {
        bookData = await apiClient.get('/v1/guest/bookings', { bypassCache: true });
      } catch (e) {
        bookData = await apiClient.get('/guest/bookings', { bypassCache: true }).catch(() => ({}));
      }

      if (bookData && bookData.success && Array.isArray(bookData.data)) {
        setBookings(bookData.data);
        const searchParams = new URLSearchParams(window.location.search);
        const qBookingId = searchParams.get('bookingId') || searchParams.get('id');
        if (qBookingId) {
          setSelectedBooking(qBookingId);
        } else if (bookData.data.length > 0 && !selectedBooking) {
          setSelectedBooking(bookData.data[0].bookingId || bookData.data[0].id || bookData.data[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to load feedback:", err);
      setError("Failed to connect to backend server.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const searchParams = new URLSearchParams(window.location.search);
    const qBookingId = searchParams.get('bookingId') || searchParams.get('id');
    const qNew = searchParams.get('new') === 'true' || searchParams.get('add') === 'true' || !!qBookingId;
    if (qNew) setShowForm(true);
    if (qBookingId) setSelectedBooking(qBookingId);

    const unsubscribe = subscribeRealtimeSync(() => {
      fetchData(true);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleCategoryRating = (cat, val) => {
    setCategories(prev => ({ ...prev, [cat]: val }));
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    const validation = validateWithZod(feedbackSchema, {
      rating: overallRating,
      comments,
      bookingId: selectedBooking,
      categories
    });

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      setFormError(firstError || "Please write a few words about your stay experience.");
      return;
    }
    setFieldErrors({});
    setFormError("");
    setSubmitting(true);
    setSuccessMsg("");

    try {
      const user = authService.getCurrentUser();
      const matchedBooking = bookings.find(b => (b.bookingId === selectedBooking || b.id === selectedBooking || b._id === selectedBooking));
      const hotelName = matchedBooking ? (matchedBooking.hotel || matchedBooking.hotelName) : "Hour Stay Luxury Hotel";

      const payload = {
        bookingId: selectedBooking || matchedBooking?.bookingId || `BK-${Date.now().toString().slice(-5)}`,
        hotelName,
        guestName: user?.name || matchedBooking?.guest || "Valued Guest",
        guestEmail: user?.email || matchedBooking?.email || "",
        guestPhone: user?.mobile || matchedBooking?.phone || "",
        propertyId: matchedBooking?.propertyId || user?.propertyId || "HS-9HQ8P",
        room: matchedBooking?.room || "101 · Standard Room",
        roomType: matchedBooking?.roomType || "Standard Room",
        rating: overallRating,
        categories: {
          ...categories,
          overall: overallRating
        },
        comments,
        comment: comments
      };

      let result;
      try {
        result = await apiClient.post('/v1/guest/feedback', payload);
      } catch (e) {
        result = await apiClient.post('/guest/feedback', payload);
      }

      if (result && (result.success || result.data)) {
        setSuccessMsg("Thank you! Your feedback has been recorded and submitted to hotel management.");
        setComments("");
        setShowForm(false);
        invalidateApiCache();
        await fetchData(true);
      } else {
        setFormError(result?.message || "Failed to submit feedback.");
      }
    } catch (err) {
      setFormError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      const q = searchQuery.toLowerCase().trim();
      const hotel = (r.hotelName || r.propertyName || r.hotel || "").toLowerCase();
      const room = (r.room || r.roomType || "").toLowerCase();
      const bookingId = (r.bookingId || r.id || "").toLowerCase();
      const comment = (r.comment || r.comments || r.title || "").toLowerCase();
      const reply = (r.response || r.managementReply || r.reply || "").toLowerCase();

      const matchesSearch = !q || hotel.includes(q) || room.includes(q) || bookingId.includes(q) || comment.includes(q) || reply.includes(q);

      let matchesRating = true;
      const rateVal = Math.round(Number(r.rating) || 5);
      if (ratingFilter === "5") matchesRating = rateVal === 5;
      else if (ratingFilter === "4") matchesRating = rateVal === 4;
      else if (ratingFilter === "3") matchesRating = rateVal === 3;
      else if (ratingFilter === "1-2") matchesRating = rateVal <= 2;

      return matchesSearch && matchesRating;
    });
  }, [reviews, searchQuery, ratingFilter]);

  return (
    <div className="space-y-4 text-left font-ui">
      {/* Top Action & Filter Toolbar (No page header/title section) */}
      <div className="bg-white border border-navy/10 rounded-2xl p-4 shadow-soft space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Status & Counter Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple/10 text-purple border border-purple/20">
              <MessageSquare className="size-3.5" />
              {reviews.length} {reviews.length === 1 ? "Feedback Record" : "Feedback Records"}
            </span>

            {reviews.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="size-3 text-emerald-600" />
                Verified Stays
              </span>
            )}
          </div>

          {/* Action Buttons */}
            <Button
              onClick={() => window.location.href = '/guest/feedback/add'}
              variant="hero"
              size="sm"
              className="h-9 px-4 text-xs font-bold gap-1.5 shadow-sm rounded-xl cursor-pointer hover:shadow-md transition-all"
            >
              <Plus className="size-3.5" /> Share Feedback
            </Button>
        </div>

        {/* Search & Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2 border-t border-navy/5">
          <div className="relative sm:col-span-8">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-navy/40" />
            <input
              placeholder="Search by hotel, room, booking ID, comment, or reply..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 h-9 rounded-xl bg-cream/20 border border-navy/10 text-xs font-semibold text-navy focus:outline-none focus:border-purple placeholder:text-navy/40"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="w-full h-9 px-3 rounded-xl bg-cream/20 border border-navy/10 text-xs font-semibold text-navy focus:outline-none focus:border-purple cursor-pointer"
            >
              <option value="all">All Ratings</option>
              <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
              <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
              <option value="3">⭐⭐⭐ (3 Stars)</option>
              <option value="1-2">⭐⭐ / ⭐ (1-2 Stars)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Success Alert Banner */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-600 hover:text-emerald-900 border-none bg-transparent cursor-pointer font-bold p-1">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Inline Feedback Submission Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto border border-navy/10 shadow-2xl p-6 sm:p-8 space-y-5 text-left animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-navy/5 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-purple tracking-wider block">Stay Experience</span>
                <h3 className="font-display font-bold text-lg text-navy">Share Your Feedback</h3>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="size-8 rounded-full bg-navy/5 hover:bg-navy/10 text-navy flex items-center justify-center cursor-pointer border-none transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-xl border border-rose-200 font-semibold flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              
              {/* Select Stay Booking */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy">Select Stay Reservation</label>
                {bookings.length > 0 ? (
                  <select
                    value={selectedBooking}
                    onChange={(e) => setSelectedBooking(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-cream/20 border border-navy/10 text-xs font-semibold text-navy focus:outline-none focus:border-purple cursor-pointer"
                  >
                    {selectedBooking && !bookings.some(b => (b.bookingId === selectedBooking || b.id === selectedBooking || b._id === selectedBooking)) && (
                      <option value={selectedBooking}>
                        Stay Reservation (Ref: #{selectedBooking})
                      </option>
                    )}
                    {bookings.map((b) => (
                      <option key={b.bookingId || b.id || b._id} value={b.bookingId || b.id || b._id}>
                        {b.hotel || "Hour Stay Resort"} · {b.room || "Room"} (Ref: #{b.bookingId || b.id || b._id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    placeholder="Booking Reference (e.g. BK-10301)"
                    value={selectedBooking}
                    onChange={(e) => setSelectedBooking(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-cream/20 border border-navy/10 text-xs font-semibold text-navy focus:outline-none focus:border-purple"
                  />
                )}
              </div>

              {/* Overall Star Rating */}
              <div className="bg-cream/20 p-4 rounded-2xl border border-navy/5 text-center space-y-1.5">
                <span className="text-xs font-bold text-navy block">Overall Stay Rating</span>
                <div className="flex items-center justify-center gap-1.5 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setOverallRating(star)}
                      className="p-1 cursor-pointer transition-transform hover:scale-125 border-none bg-transparent"
                    >
                      <Star
                        className={`size-6 ${
                          star <= (hoverRating || overallRating)
                            ? "fill-amber-400 text-amber-500"
                            : "text-navy/20"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-xs font-bold text-purple block">
                  {overallRating === 5 && "⭐ Excellent Experience"}
                  {overallRating === 4 && "⭐ Very Good"}
                  {overallRating === 3 && "⭐ Average"}
                  {overallRating === 2 && "⭐ Below Expectations"}
                  {overallRating === 1 && "⭐ Unsatisfactory"}
                </span>
              </div>

              {/* Sub-Category Rating Matrix */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-navy block">Rate Amenities & Services</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: "cleanliness", label: "Cleanliness" },
                    { id: "service", label: "Hospitality" },
                    { id: "room", label: "Comfort" }
                  ].map((cat) => (
                    <div key={cat.id} className="p-3 bg-white border border-navy/10 rounded-xl space-y-1.5">
                      <span className="text-[11px] font-bold text-navy block">{cat.label}</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleCategoryRating(cat.id, val)}
                            className={`size-6 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                              categories[cat.id] >= val
                                ? "bg-amber-400 text-navy border-amber-500 shadow-xs"
                                : "bg-cream/30 text-navy/40 border-navy/10 hover:bg-cream"
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy block">Your Stay Experience</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Share highlights of your stay, room comfort, cleanliness, and staff service..."
                  value={comments}
                  onChange={(e) => {
                    setComments(e.target.value);
                    if (fieldErrors.comments) setFieldErrors({ ...fieldErrors, comments: undefined });
                  }}
                  className={`w-full p-3 text-xs rounded-xl bg-cream/10 border ${fieldErrors.comments ? "border-rose-500" : "border-navy/10"} text-navy focus:outline-none focus:border-purple font-medium`}
                />
                {fieldErrors.comments && (
                  <p className="text-[11px] font-bold text-rose-600 mt-1">{fieldErrors.comments}</p>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-navy/5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowForm(false)}
                  className="h-9 px-4 text-xs font-bold cursor-pointer rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="hero"
                  size="sm"
                  disabled={submitting}
                  className="h-9 px-5 text-xs font-bold gap-1.5 cursor-pointer shadow-sm rounded-xl"
                >
                  <Send className="size-3.5" />
                  {submitting ? "Submitting..." : "Submit Feedback"}
                </Button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Main Horizontal Feedback Cards List (1 Feedback per Row) */}
      <div className="space-y-3">
        {loading && reviews.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-navy/10 text-center space-y-3 shadow-soft">
            <div className="mx-auto size-8 rounded-full border-3 border-purple border-t-transparent animate-spin" />
            <p className="text-xs font-semibold text-navy/60">Fetching your feedback records...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-navy/15 p-12 text-center space-y-4 shadow-soft">
            <div className="size-12 rounded-2xl bg-cream/40 flex items-center justify-center mx-auto text-navy/40">
              <Hotel className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-sm font-bold text-navy">
                {reviews.length === 0 ? "No Feedback Records Found" : "No Matching Records"}
              </h3>
              <p className="text-xs text-navy/60 max-w-sm mx-auto">
                {reviews.length === 0
                  ? "Completed a stay with Hour Stay? Click below to share your experience with hotel management!"
                  : "No feedback records match your current search or filter criteria."}
              </p>
            </div>
            {reviews.length === 0 ? (
              <Button
                onClick={() => window.location.href = '/guest/feedback/add'}
                variant="hero"
                size="sm"
                className="px-5 h-9 text-xs font-bold cursor-pointer shadow-sm rounded-xl"
              >
                <Plus className="size-3.5 mr-1" /> Share Stay Feedback
              </Button>
            ) : (
              <Button
                onClick={() => { setSearchQuery(""); setRatingFilter("all"); }}
                variant="outline"
                size="sm"
                className="px-4 h-8 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReviews.map((r) => {
              const rid = r._id || r.id || `fb-${Math.random()}`;
              const rating = Number(r.rating) || 5;
              const commentText = r.comment || r.comments || "";
              const hotelName = r.hotelName || r.propertyName || r.hotel || "Hour Stay Property";
              const roomName = r.room || r.roomType || "Standard Suite";
              const bookingCode = r.bookingId || r.id || "BK-N/A";
              const dateFormatted = formatDate(r.createdAt);
              const replyText = r.response || r.managementReply || r.reply;
              const respondedBy = r.respondedBy || "Management";
              const respondedAt = r.respondedAt;

              return (
                <div
                  key={rid}
                  className="bg-white rounded-2xl border border-navy/10 p-4 sm:p-5 shadow-soft hover:shadow-md hover:border-purple/25 transition-all duration-200"
                >
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 lg:gap-5 justify-between">
                    
                    {/* Section 1: Hotel + Room + Booking ID */}
                    <div className="flex items-start gap-3 min-w-0 lg:w-[26%] shrink-0">
                      <div className="size-9 sm:size-10 rounded-xl bg-purple/10 text-purple flex items-center justify-center shrink-0 mt-0.5">
                        <Hotel className="size-4 sm:size-5" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-display font-bold text-sm text-navy truncate" title={hotelName}>
                            {hotelName}
                          </h4>
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                            <ShieldCheck className="size-2.5 text-emerald-600" /> Verified
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-navy/70 flex-wrap">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Bed className="size-3 text-navy/40 shrink-0" />
                            {roomName}
                          </span>
                          <span className="text-navy/20">•</span>
                          <span className="font-mono text-[11px] font-bold text-purple bg-purple/5 px-1.5 py-0.2 rounded border border-purple/15">
                            #{bookingCode}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Rating + Date */}
                    <div className="lg:w-[15%] shrink-0 space-y-1 lg:border-l lg:border-navy/10 lg:pl-4">
                      <div className="flex items-center gap-1.5">
                        <StarRating rating={rating} />
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-navy/60 font-medium">
                        <Calendar className="size-3 text-navy/40 shrink-0" />
                        <span>{dateFormatted}</span>
                      </div>
                    </div>

                    {/* Section 3: Category Ratings */}
                    <div className="lg:w-[18%] shrink-0 space-y-1 lg:border-l lg:border-navy/10 lg:pl-4">
                      <span className="text-[10px] uppercase font-bold text-navy/40 tracking-wider block">
                        Category Ratings
                      </span>
                      <CategoryRatingsBadges
                        ratings={r.ratings}
                        categories={r.categories}
                        defaultRating={rating}
                      />
                    </div>

                    {/* Section 4: Comment */}
                    <div className="lg:w-[22%] flex-1 space-y-1 lg:border-l lg:border-navy/10 lg:pl-4 min-w-0">
                      <span className="text-[10px] uppercase font-bold text-navy/40 tracking-wider block">
                        Comment
                      </span>
                      {r.title && (
                        <h5 className="text-xs font-bold text-navy line-clamp-1">
                          {r.title}
                        </h5>
                      )}
                      {commentText ? (
                        <p className="text-xs text-navy/80 leading-relaxed font-normal italic line-clamp-2" title={commentText}>
                          "{commentText}"
                        </p>
                      ) : (
                        <span className="text-xs text-navy/40 italic">No written comment</span>
                      )}
                    </div>

                    {/* Section 5: Management Reply */}
                    <div className="lg:w-[19%] shrink-0 lg:border-l lg:border-navy/10 lg:pl-4">
                      <span className="text-[10px] uppercase font-bold text-navy/40 tracking-wider block mb-1">
                        Management Reply
                      </span>
                      {replyText ? (
                        <div className="p-2.5 rounded-xl bg-purple/[0.04] border border-purple/15 text-left space-y-1 max-w-[240px]">
                          <div className="flex items-center justify-between gap-1 text-[10px]">
                            <span className="font-bold text-purple flex items-center gap-1">
                              <MessageSquareText className="size-3 shrink-0" />
                              {respondedBy}
                            </span>
                            {respondedAt && (
                              <span className="text-navy/40 text-[9px] font-mono whitespace-nowrap">
                                {formatDate(respondedAt)}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-navy/90 font-medium leading-snug line-clamp-2" title={replyText}>
                            "{replyText}"
                          </p>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/70">
                          <Clock className="size-3 text-amber-500 shrink-0" />
                          <span>Awaiting Reply</span>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

export default GuestReviewsPage;