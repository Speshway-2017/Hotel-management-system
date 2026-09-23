import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  Star, MessageSquare, Plus, RefreshCw, AlertCircle, 
  CheckCircle2, Hotel, Calendar, User, ThumbsUp, Send, X,
  Sparkles, MessageSquareText, ShieldCheck, MapPin, Bed, ChevronRight
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
      { name: "description", content: "Share your stay experience and view your submitted feedback records." }
    ]
  }),
  component: GuestReviewsPage
});

function StarRating({ rating = 5, size = "size-3.5" }) {
  const r = Math.round(Number(rating) || 5);
  return (
    <div className="flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${size} ${i < r ? "fill-amber-400 text-amber-500" : "text-navy/15"}`}
        />
      ))}
    </div>
  );
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
      const matchedBooking = bookings.find(b => (b.bookingId === selectedBooking || b.id === selectedBooking));
      const hotelName = matchedBooking ? (matchedBooking.hotel || matchedBooking.hotelName) : "Rambagh Residency, Jaipur";

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

  return (
    <div className="space-y-6 text-left font-ui">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-navy/5 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Guest Stay Reviews & Feedback</h1>
          <p className="text-xs text-navy/60 mt-0.5">
            Share ratings for your hotel stays and view verified replies from management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => window.location.href = '/guest/feedback/add'}
            variant="hero"
            size="touch"
            className="px-5 text-xs font-bold gap-2 shadow-soft cursor-pointer"
          >
            <Plus className="size-4" /> Share Feedback
          </Button>
        </div>
      </div>

      {/* Success Alert Banner */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold shadow-soft animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-600 hover:text-emerald-900 border-none bg-transparent cursor-pointer font-bold">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Feedback Submission Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto border border-navy/10 shadow-2xl p-6 sm:p-8 space-y-6 text-left animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-navy/5 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-purple tracking-widest block">Stay Experience</span>
                <h3 className="font-display font-bold text-xl text-navy">Share Your Feedback</h3>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="size-8 rounded-full bg-navy/5 hover:bg-navy/10 text-navy flex items-center justify-center cursor-pointer border-none"
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

            <form onSubmit={handleSubmitFeedback} className="space-y-5">
              
              {/* Select Stay Booking */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy">Select Your Stay Reservation</label>
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
              <div className="bg-cream/20 p-4 rounded-2xl border border-navy/5 text-center space-y-2">
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
                        className={`size-7 ${
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

              {/* Sub-Category Pill Matrix */}
              <div className="space-y-3">
                 <label className="text-xs font-bold text-navy block">Rate Specific Amenities</label>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                   {[
                     { id: "cleanliness", label: "Cleanliness & Hygiene" },
                     { id: "service", label: "Staff & Hospitality" },
                     { id: "room", label: "Room & Comfort" }
                   ].map((cat) => (
                    <div key={cat.id} className="p-3 bg-white border border-navy/10 rounded-xl space-y-1.5">
                      <span className="text-[11px] font-bold text-navy block">{cat.label}</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleCategoryRating(cat.id, val)}
                            className={`size-6 rounded-md text-[10px] font-bold transition-colors cursor-pointer border ${
                              categories[cat.id] >= val
                                ? "bg-amber-400 text-navy border-amber-500"
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
                <label className="text-xs font-bold text-navy block">Your Review Comments</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Share details of your stay, amenities you enjoyed, and room experience..."
                  value={comments}
                  onChange={(e) => {
                    setComments(e.target.value);
                    if (fieldErrors.comments) setFieldErrors({ ...fieldErrors, comments: undefined });
                  }}
                  className={`w-full p-3.5 text-xs rounded-xl bg-cream/10 border ${fieldErrors.comments ? "border-rose-500" : "border-navy/10"} text-navy focus:outline-none focus:border-purple font-medium`}
                />
                {fieldErrors.comments && (
                  <p className="text-[11px] font-bold text-rose-600 mt-1">{fieldErrors.comments}</p>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-navy/5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowForm(false)}
                  className="h-10 px-4 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="hero"
                  size="sm"
                  disabled={submitting}
                  className="h-10 px-6 text-xs font-bold gap-2 cursor-pointer shadow-soft"
                >
                  <Send className="size-4" />
                  {submitting ? "Submitting..." : "Submit Stay Feedback"}
                </Button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Submitted Reviews List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-navy">Your Verified Feedback History</h3>
          <span className="text-xs font-semibold text-navy/60">Live synced with MongoDB</span>
        </div>

        {loading && reviews.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 border border-navy/5 text-center space-y-4 shadow-soft">
            <div className="mx-auto size-10 rounded-full border-4 border-purple border-t-transparent animate-spin" />
            <p className="text-xs font-semibold text-navy/60">Fetching your submitted reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-navy/15 p-16 text-center space-y-4 shadow-soft">
            <Hotel className="size-12 text-navy/20 mx-auto" />
            <div>
              <h3 className="font-display text-base font-bold text-navy">No Feedback Submitted Yet</h3>
              <p className="text-xs text-navy/60 max-w-sm mx-auto mt-1">
                Have you recently stayed with Hour Stay? Click "Share Feedback" above to leave a review!
              </p>
            </div>
            <Button
              onClick={() => window.location.href = '/guest/feedback/add'}
              variant="hero"
              size="touch"
              className="px-6 py-2.5 text-xs font-bold cursor-pointer shadow-soft"
            >
              <Plus className="size-4" /> Share Feedback Now
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {reviews.map((r) => {
              const rid = r._id || r.id;
              const rating = Number(r.rating) || 5;
              const commentText = r.comment || r.comments || "";
              const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : "Recent Stay";

              return (
                <div key={rid} className="bg-white rounded-2xl border border-navy/10 p-6 shadow-soft space-y-4 text-left flex flex-col justify-between">
                  
                  <div className="space-y-3">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3 border-b border-navy/5 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display font-bold text-base text-navy">
                            {r.hotelName || r.propertyName || "Hour Stay Resort"}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="size-3 text-emerald-600" /> Verified Stay
                          </span>
                        </div>
                        <span className="text-[11px] text-navy/50 font-medium block mt-0.5">
                          {r.room || r.roomType || "Standard Suite"} · Ref: #{r.bookingId}
                        </span>
                      </div>

                      <div className="text-right shrink-0">
                        <StarRating rating={rating} />
                        <span className="text-[10px] text-navy/50 block mt-0.5">{dateStr}</span>
                      </div>
                    </div>

                    {/* Subcategories Breakdown Chips */}
                    {r.ratings && (
                      <div className="flex flex-wrap gap-1.5 text-[10px]">
                        <span className="px-2 py-0.5 rounded-md bg-cream/40 border border-navy/5 text-navy/80">
                          Cleanliness: <strong>{r.ratings.cleanliness || rating}/5</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-cream/40 border border-navy/5 text-navy/80">
                          Service: <strong>{r.ratings.service || rating}/5</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-cream/40 border border-navy/5 text-navy/80">
                          Room: <strong>{r.ratings.room || rating}/5</strong>
                        </span>
                      </div>
                    )}

                    {/* Comment text */}
                    <p className="text-xs text-navy/80 leading-relaxed italic bg-cream/10 p-3.5 rounded-xl border border-navy/5">
                      "{commentText}"
                    </p>
                  </div>

                  {/* Official Management Response (If replied) */}
                  {r.response && (
                    <div className="bg-purple/5 border border-purple/15 p-4 rounded-xl space-y-1.5 mt-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-purple flex items-center gap-1.5">
                          <MessageSquareText className="size-3.5" />
                          Reply from {r.respondedBy || "Hotel Management"}
                        </span>
                        {r.respondedAt && (
                          <span className="text-navy/40 text-[10px]">
                            {new Date(r.respondedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-navy/90 font-medium">
                        "{r.response}"
                      </p>
                    </div>
                  )}

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