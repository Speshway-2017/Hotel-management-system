import React, { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { apiClient, invalidateApiCache } from "@/services/apiClient";
import { authService } from "@/services/auth";
import { toast } from "sonner";
import { emitRealtimeEvent } from "@/services/socket";
import {
  Star,
  Sparkles,
  Hotel,
  Bed,
  Calendar,
  CheckCircle2,
  Send,
  ThumbsUp,
  MapPin,
  Clock,
  User,
  HeartHandshake,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw
} from "lucide-react";

export const Route = createFileRoute("/guest/feedback/add")({
  head: () => ({
    meta: [
      { title: "Add Feedback — Hour Stay" },
      { name: "description", content: "Submit your stay review and ratings for hotel management." }
    ]
  }),
  component: AddFeedbackPage
});

export default function AddFeedbackPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Read URL query params
  const urlParams = new URLSearchParams(location.search || window.location.search);
  const paramBookingId = urlParams.get("bookingId") || urlParams.get("id") || "";

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [feedbackBookingIds, setFeedbackBookingIds] = useState(new Set());
  const [existingFeedback, setExistingFeedback] = useState(null);

  // Form State
  const [selectedBookingId, setSelectedBookingId] = useState(paramBookingId);
  const [overallRating, setOverallRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comments, setComments] = useState("");
  const [recommend, setRecommend] = useState(true);
  const [categories, setCategories] = useState({
    cleanliness: 5,
    service: 5,
    room: 5,
    staff: 5
  });

  // Hover states for category stars
  const [catHover, setCatHover] = useState({});

  const loadBookingsAndFeedback = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError("");
    try {
      const user = authService.getCurrentUser();
      setCurrentUser(user);

      const [bookData, fbData] = await Promise.all([
        apiClient.get("/v1/guest/bookings", { bypassCache: true }).catch(() => 
          apiClient.get("/guest/bookings", { bypassCache: true }).catch(() => ({}))
        ),
        apiClient.get("/v1/guest/feedback", { bypassCache: true }).catch(() =>
          apiClient.get("/guest/feedback", { bypassCache: true }).catch(() => ({}))
        )
      ]);

      const fbSet = new Set();
      let fbMap = {};
      if (fbData && fbData.success && Array.isArray(fbData.data)) {
        fbData.data.forEach(f => {
          if (f.bookingId) {
            fbSet.add(String(f.bookingId));
            fbMap[String(f.bookingId)] = f;
          }
        });
      }
      setFeedbackBookingIds(fbSet);

      if (bookData && bookData.success && Array.isArray(bookData.data)) {
        setBookings(bookData.data);
        if (paramBookingId) {
          setSelectedBookingId(paramBookingId);
          if (fbMap[String(paramBookingId)]) {
            setExistingFeedback(fbMap[String(paramBookingId)]);
          }
        } else if (bookData.data.length > 0) {
          // Prioritize first checked-out booking without feedback
          const pendingBooking = bookData.data.find(b => {
            const bKey = b.bookingId || b.id || b._id;
            const statusLower = (b.status || '').toLowerCase();
            const isCheckedOut = statusLower === 'checked-out' || statusLower === 'checked out' || statusLower === 'completed';
            return isCheckedOut && !fbSet.has(String(bKey));
          });

          const targetBooking = pendingBooking || bookData.data[0];
          const firstId = targetBooking.bookingId || targetBooking.id || targetBooking._id;
          setSelectedBookingId(firstId);
          if (fbMap[String(firstId)]) {
            setExistingFeedback(fbMap[String(firstId)]);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load bookings or feedback:", err);
      setError("Failed to load reservation data from backend.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadBookingsAndFeedback(false);
  }, [paramBookingId]);

  const selectedBookingObj = bookings.find(
    (b) =>
      b.bookingId === selectedBookingId ||
      b.id === selectedBookingId ||
      b._id === selectedBookingId
  );

  const isAlreadySubmitted = Boolean(
    selectedBookingObj?.hasFeedback ||
    feedbackBookingIds.has(String(selectedBookingId)) ||
    (selectedBookingObj && (
      feedbackBookingIds.has(String(selectedBookingObj.bookingId)) ||
      feedbackBookingIds.has(String(selectedBookingObj.id)) ||
      feedbackBookingIds.has(String(selectedBookingObj._id))
    ))
  );

  const handleCategoryRating = (cat, val) => {
    setCategories((prev) => ({ ...prev, [cat]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isAlreadySubmitted) {
      toast.error("Feedback has already been submitted for this stay reservation.");
      return;
    }

    if (!comments.trim()) {
      toast.error("Please write a few words about your stay experience.");
      return;
    }

    setSubmitting(true);
    try {
      const user = authService.getCurrentUser();
      const hotelName = selectedBookingObj
        ? selectedBookingObj.hotel || selectedBookingObj.hotelName
        : "Hour Stay Luxury Hotel";

      const payload = {
        bookingId:
          selectedBookingId ||
          selectedBookingObj?.bookingId ||
          `BK-${Date.now().toString().slice(-5)}`,
        hotelName,
        title: title.trim() || `${overallRating} Star Stay Experience`,
        guestName: user?.name || selectedBookingObj?.guest || "Valued Guest",
        guestEmail: user?.email || selectedBookingObj?.email || "",
        guestPhone: user?.mobile || selectedBookingObj?.phone || "",
        propertyId:
          selectedBookingObj?.propertyId || user?.propertyId || "HS-JAI",
        room: selectedBookingObj?.room || "101 · Standard Room",
        roomType: selectedBookingObj?.roomType || "Standard Room",
        rating: overallRating,
        categories: {
          cleanliness: categories.cleanliness,
          service: categories.service,
          room: categories.room,
          staff: categories.staff,
          overall: overallRating
        },
        comments: comments.trim(),
        comment: comments.trim(),
        recommend
      };

      let result;
      try {
        result = await apiClient.post("/v1/guest/feedback", payload);
      } catch (e) {
        result = await apiClient.post("/guest/feedback", payload);
      }

      if (result && (result.success || result.data)) {
        toast.success("Thank you! Your feedback has been submitted successfully.");
        invalidateApiCache();
        emitRealtimeEvent("guest_updated", { action: "feedback_submitted", bookingId: payload.bookingId });
        navigate("/guest/feedback");
      } else {
        toast.error(result?.message || "Failed to submit feedback.");
      }
    } catch (err) {
      console.error("Failed to submit feedback:", err);
      toast.error(err.message || "Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingSentiment = (rating) => {
    if (rating === 5) return { text: "Exceptional", desc: "5-Star Experience", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (rating === 4) return { text: "Very Good", desc: "Exceeded Expectations", color: "text-blue-700 bg-blue-50 border-blue-200" };
    if (rating === 3) return { text: "Satisfactory", desc: "Average Stay Quality", color: "text-amber-700 bg-amber-50 border-amber-200" };
    if (rating === 2) return { text: "Below Average", desc: "Room for Improvement", color: "text-orange-700 bg-orange-50 border-orange-200" };
    return { text: "Disappointing", desc: "Unsatisfactory Experience", color: "text-rose-700 bg-rose-50 border-rose-200" };
  };

  const activeOverall = hoverRating || overallRating;
  const sentiment = getRatingSentiment(activeOverall);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-16 border border-navy/5 text-center space-y-4 shadow-soft font-ui">
        <div className="mx-auto size-10 rounded-full border-4 border-purple border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-navy/60">Fetching reservation details from MongoDB...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-rose-200 text-center space-y-4 shadow-soft font-ui">
        <AlertCircle className="size-10 text-rose-500 mx-auto" />
        <h3 className="font-display text-lg font-bold text-navy">Unable to Load Stay Information</h3>
        <p className="text-xs text-rose-600 font-semibold max-w-md mx-auto">{error}</p>
        <button
          onClick={() => loadBookingsAndFeedback(false)}
          className="px-5 py-2 bg-navy text-cream rounded-xl text-xs font-bold hover:bg-navy/90 transition-colors shadow-soft cursor-pointer inline-flex items-center gap-2 border-none"
        >
          <RefreshCw className="size-3.5" /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left font-ui">
      
      {/* Main Container Card matching Digital Folio layout & margins */}
      <div className="bg-white rounded-2xl border border-navy/10 p-6 sm:p-8 shadow-soft space-y-6">
        
        {/* Header Title Section inside card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-navy/5 pb-5 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-navy">
                Rate Your Stay Experience
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="size-3 text-emerald-600" /> Verified Stay
              </span>
            </div>
            <p className="text-xs text-navy/60 font-medium">
              Your feedback directly assists hotel management in maintaining top-tier hospitality standards.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* 1. BOOKING DETAILS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-navy uppercase tracking-wider block">
                1. Booking Details <span className="text-rose-500">*</span>
              </label>
              {selectedBookingObj && (
                <span className="text-[10px] font-mono font-bold text-purple bg-purple/5 px-2 py-0.5 rounded border border-purple/15">
                  Ref #{selectedBookingObj.bookingId || selectedBookingObj.id || selectedBookingId}
                </span>
              )}
            </div>

            {/* Booking Selector Dropdown */}
            {bookings.length > 0 ? (
              <select
                value={selectedBookingId}
                onChange={(e) => setSelectedBookingId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#fafafa] border border-navy/15 text-xs font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-purple/20 focus:border-purple cursor-pointer transition-all hover:bg-white shadow-2xs"
              >
                {selectedBookingId &&
                  !bookings.some(
                    (b) =>
                      b.bookingId === selectedBookingId ||
                      b.id === selectedBookingId ||
                      b._id === selectedBookingId
                  ) && (
                    <option value={selectedBookingId}>
                      Stay Booking (Ref: #{selectedBookingId})
                    </option>
                  )}
                {bookings.map((b) => {
                  const bKey = b.bookingId || b.id || b._id;
                  const hasSubmitted = feedbackBookingIds.has(String(bKey));
                  return (
                    <option key={bKey} value={bKey}>
                      {b.hotel || "Hour Stay Hotel"} · {b.room || "Room"} · {b.dates || `${b.checkIn} → ${b.checkOut}`} ({b.status || 'Confirmed'}{hasSubmitted ? ' • Feedback Submitted' : ''})
                    </option>
                  );
                })}
              </select>
            ) : (
              <input
                placeholder="Enter Booking Reference (e.g. BK-10301)"
                value={selectedBookingId}
                onChange={(e) => setSelectedBookingId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#fafafa] border border-navy/15 text-xs font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-purple/20 focus:border-purple"
              />
            )}

            {/* Selected Booking Highlight Info Box */}
            {selectedBookingObj && (
              <div className="p-4 rounded-xl bg-[#faf8f5] border border-navy/5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <Hotel className="size-4 text-purple shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-navy/50 block">Property</span>
                    <strong className="text-navy block truncate">{selectedBookingObj.hotel || "Hour Stay Hotel"}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Bed className="size-4 text-purple shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-navy/50 block">Room Type</span>
                    <strong className="text-navy block truncate">{selectedBookingObj.room || "Standard Suite"}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Calendar className="size-4 text-purple shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-navy/50 block">Stay Dates</span>
                    <strong className="text-navy block truncate">{selectedBookingObj.dates || `${selectedBookingObj.checkIn} → ${selectedBookingObj.checkOut}`}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Duplicate Feedback Banner */}
            {isAlreadySubmitted && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between gap-3 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Feedback has already been submitted for this reservation.</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/guest/feedback")}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 border-none"
                >
                  View Reviews
                </button>
              </div>
            )}
          </div>

          {/* 2. OVERALL RATING */}
          <div className="space-y-3 pt-1">
            <div className="text-center space-y-1">
              <label className="text-xs font-bold text-navy uppercase tracking-wider block">
                2. Overall Rating <span className="text-rose-500">*</span>
              </label>
              <p className="text-xs text-navy/60">How was your overall experience with Hour Stay?</p>
            </div>

            {/* Big Interactive Stars */}
            <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-[#faf8f5] border border-navy/5 space-y-3">
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isLit = star <= activeOverall;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setOverallRating(star)}
                      className="p-1 cursor-pointer transition-transform hover:scale-125 active:scale-95 border-none bg-transparent"
                      title={`Rate ${star} Star${star > 1 ? "s" : ""}`}
                    >
                      <Star
                        className={`size-9 sm:size-11 transition-colors duration-150 ${
                          isLit
                            ? "fill-[#F5C06A] text-[#F5C06A] drop-shadow-[0_2px_8px_rgba(245,192,106,0.45)]"
                            : "text-navy/15 hover:text-navy/30"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Sentiment Score Pill */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold border transition-all ${sentiment.color}`}>
                  <span>{activeOverall}.0 / 5.0</span>
                  <span>·</span>
                  <span>{sentiment.text}</span>
                </span>
              </div>
            </div>
          </div>

          {/* 3. CATEGORY RATINGS (Cleanliness, Service, Room, Staff) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-navy uppercase tracking-wider block">
                3. Category Ratings
              </label>
              <span className="text-[11px] text-navy/50 font-medium">Rate specific stay aspects</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                { key: "cleanliness", label: "Cleanliness", subtitle: "Sanitation, linens & bathroom", icon: Sparkles },
                { key: "service", label: "Service", subtitle: "Hospitality & prompt assistance", icon: HeartHandshake },
                { key: "room", label: "Room", subtitle: "Bed comfort, AC & ambiance", icon: Bed },
                { key: "staff", label: "Staff", subtitle: "Front desk & team courtesy", icon: User }
              ].map((cat) => {
                const score = categories[cat.key] || 5;
                const activeCatStar = catHover[cat.key] || score;
                const CatIcon = cat.icon;

                return (
                  <div
                    key={cat.key}
                    className="p-3.5 rounded-xl bg-[#faf8f5] border border-navy/5 flex items-center justify-between gap-3 hover:border-navy/15 transition-all"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <CatIcon className="size-3.5 text-purple shrink-0" />
                        <span className="text-xs font-bold text-navy">{cat.label}</span>
                      </div>
                      <p className="text-[10px] text-navy/50 truncate">{cat.subtitle}</p>
                    </div>

                    {/* Star Rating buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setCatHover((prev) => ({ ...prev, [cat.key]: star }))}
                          onMouseLeave={() => setCatHover((prev) => ({ ...prev, [cat.key]: 0 }))}
                          onClick={() => handleCategoryRating(cat.key, star)}
                          className="p-0.5 cursor-pointer hover:scale-120 transition-transform border-none bg-transparent"
                          title={`${cat.label}: ${star} Star${star > 1 ? "s" : ""}`}
                        >
                          <Star
                            className={`size-4.5 transition-colors ${
                              star <= activeCatStar
                                ? "fill-[#F5C06A] text-[#F5C06A]"
                                : "text-navy/15"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. COMMENTS */}
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-bold text-navy uppercase tracking-wider block">
                4. Review Headline & Comments <span className="text-rose-500">*</span>
              </label>
            </div>

            {/* Optional Headline */}
            <div>
              <input
                type="text"
                placeholder="Review Headline (e.g. Exceptional stay! Courteous staff and spotless suite)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#fafafa] border border-navy/15 text-xs font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-purple/20 focus:border-purple transition-all hover:bg-white"
              />
            </div>

            {/* Comments Textarea */}
            <div>
              <textarea
                rows={4}
                required
                placeholder="Tell us more about your stay... What did you enjoy most, and how can our hotel team make your next visit even more memorable?"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-[#fafafa] border border-navy/15 text-xs font-medium text-navy focus:outline-none focus:ring-2 focus:ring-purple/20 focus:border-purple transition-all hover:bg-white leading-relaxed resize-none"
              />
              <div className="flex justify-between items-center text-[10px] text-navy/40 mt-1">
                <span>Please share detailed constructive feedback.</span>
                <span>{comments.length} characters</span>
              </div>
            </div>

            {/* Recommendation Checkbox */}
            <div className="pt-1">
              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-navy/5 bg-[#faf8f5] cursor-pointer hover:bg-cream/40 transition-colors">
                <input
                  type="checkbox"
                  checked={recommend}
                  onChange={(e) => setRecommend(e.target.checked)}
                  className="size-4 rounded text-purple border-navy/20 focus:ring-purple cursor-pointer accent-purple"
                />
                <div>
                  <strong className="text-xs font-bold text-navy flex items-center gap-1.5">
                    <ThumbsUp className="size-3.5 text-purple" /> I recommend this property to fellow travelers
                  </strong>
                  <p className="text-[10px] text-navy/50 mt-0.5">
                    Your recommendation badge will be displayed alongside your verified review.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-3 border-t border-navy/5">
            <button
              type="submit"
              disabled={submitting || isAlreadySubmitted}
              className={`w-full h-12 rounded-xl font-bold text-xs sm:text-sm tracking-wide shadow-soft inline-flex items-center justify-center gap-2 transition-all ${
                isAlreadySubmitted
                  ? "bg-navy/30 text-white/70 cursor-not-allowed border-none"
                  : "bg-navy hover:bg-navy-deep text-white cursor-pointer hover:scale-[1.01] active:scale-[0.99] border-none"
              }`}
            >
              {submitting ? (
                <>
                  <div className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Submitting Feedback...</span>
                </>
              ) : isAlreadySubmitted ? (
                <>
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  <span>Feedback Already Submitted</span>
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  <span>Submit Stay Feedback</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>

    </div>
  );
}
