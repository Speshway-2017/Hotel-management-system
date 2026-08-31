import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  Star, MessageSquare, Plus, RefreshCw, AlertCircle, 
  CheckCircle2, Hotel, Calendar, User, ThumbsUp, Send, X 
} from "lucide-react";

export const Route = createFileRoute("/guest/reviews")({
  head: () => ({
    meta: [
      { title: "Feedback — Hour Stay" },
      { name: "description", content: "Share how your stays went and view your submitted feedback." }
    ]
  }),
  component: GuestReviewsPage
});

function GuestReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Feedback Form State
  const [selectedBooking, setSelectedBooking] = useState("");
  const [overallRating, setOverallRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [categories, setCategories] = useState({
    cleanliness: 5,
    service: 5,
    room: 5,
    food: 5,
    overall: 5
  });
  const [comments, setComments] = useState("");
  const [formError, setFormError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem('hms_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 1. Fetch Guest Feedback from Backend/MongoDB
      const revRes = await fetch('http://localhost:5000/api/v1/guest/feedback', { headers });
      const revData = await revRes.json();

      if (revData && revData.success && Array.isArray(revData.data)) {
        setReviews(revData.data);
      } else {
        setReviews([]);
      }

      // 2. Fetch Guest Bookings for the form dropdown
      const bookRes = await fetch('http://localhost:5000/api/v1/guest/bookings', { headers });
      const bookData = await bookRes.json();
      if (bookData && bookData.success && Array.isArray(bookData.data)) {
        setBookings(bookData.data);
        if (bookData.data.length > 0) {
          setSelectedBooking(bookData.data[0].bookingId || bookData.data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load feedback:", err);
      setError("Failed to connect to backend server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCategoryRating = (cat, val) => {
    setCategories(prev => ({ ...prev, [cat]: val }));
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!comments.trim()) {
      setFormError("Please write a few words about your stay experience.");
      return;
    }
    setFormError("");
    setSubmitting(true);
    setSuccessMsg("");

    try {
      const token = localStorage.getItem('hms_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const matchedBooking = bookings.find(b => (b.bookingId === selectedBooking || b.id === selectedBooking));
      const hotelName = matchedBooking ? (matchedBooking.hotel || matchedBooking.hotelName) : "Speshway Hotel & Suites";

      const payload = {
        bookingId: selectedBooking || "HS-1001",
        hotelName,
        rating: overallRating,
        categories,
        comments
      };

      const res = await fetch('http://localhost:5000/api/v1/guest/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (result && result.success) {
        setSuccessMsg("Thank you! Your feedback has been recorded successfully.");
        setShowForm(false);
        setComments("");
        fetchData();
      } else {
        setFormError(result.message || "Failed to submit feedback.");
      }
    } catch (err) {
      console.error("Feedback submit error:", err);
      setFormError("Network error. Unable to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-16 border border-navy/5 text-center space-y-4 shadow-soft font-ui">
        <div className="mx-auto size-10 rounded-full border-4 border-purple border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-navy/60">Fetching your feedback history from MongoDB...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left font-ui">
      
      {/* Top Header Bar with Single Give Feedback Button */}
      <div className="bg-white rounded-2xl border border-navy/10 p-4 sm:p-6 shadow-soft flex items-center justify-between gap-4">
        <span className="text-xs font-semibold text-navy/60">Share your stay experience & reviews</span>

        <button
          onClick={() => {
            setShowForm(!showForm);
            setSuccessMsg("");
          }}
          className="px-4 py-2 bg-purple text-cream rounded-xl text-xs font-bold hover:bg-purple/90 transition-colors shadow-soft inline-flex items-center gap-2 cursor-pointer border-none"
        >
          {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
          {showForm ? "Cancel Feedback" : "Give Feedback"}
        </button>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-emerald-800 text-xs font-semibold shadow-soft">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600" /> {successMsg}
          </span>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-600 hover:text-emerald-900 border-none bg-transparent cursor-pointer">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Give Feedback Expandable Form Card */}
      {showForm && (
        <form onSubmit={handleSubmitFeedback} className="bg-white rounded-2xl border border-purple/20 p-6 sm:p-8 shadow-soft space-y-6 animate-fade-in">
          <div className="border-b border-navy/5 pb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-navy">Share Your Experience</h3>
              <p className="text-xs text-navy/60">Rate your stay parameters and help us improve service quality</p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-navy/40 hover:text-navy cursor-pointer border-none bg-transparent"
            >
              <X className="size-5" />
            </button>
          </div>

          {formError && (
            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
              <AlertCircle className="size-4 text-rose-500" /> {formError}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Booking / Hotel Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-navy block">Select Reservation / Stay</label>
              <select
                value={selectedBooking}
                onChange={(e) => setSelectedBooking(e.target.value)}
                className="w-full rounded-xl border border-navy/15 bg-cream/20 px-3.5 py-2.5 text-xs font-semibold text-navy focus:border-purple focus:outline-none"
              >
                {bookings.length > 0 ? (
                  bookings.map((b) => (
                    <option key={b.id || b.bookingId} value={b.bookingId || b.id}>
                      {b.hotel || "Speshway Hotel"} ({b.bookingId || b.id}) — {b.checkIn}
                    </option>
                  ))
                ) : (
                  <option value="HS-1001">Speshway Hotel & Suites (HS-1001)</option>
                )}
              </select>
            </div>

            {/* Overall Star Rating */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-navy block">Overall Rating</label>
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setOverallRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 cursor-pointer border-none bg-transparent focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`size-6 ${
                        (hoverRating || overallRating) >= star
                          ? "fill-amber-400 text-amber-400"
                          : "text-navy/20"
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-navy ml-2">{overallRating} / 5 Stars</span>
              </div>
            </div>

          </div>

          {/* Detailed Categories Breakdown (Cleanliness, Service, Room, Food, Overall) */}
          <div className="bg-cream/20 p-5 rounded-xl border border-navy/5 space-y-4">
            <span className="text-[10px] font-bold text-navy/55 uppercase tracking-wider block">Category Ratings Breakdown</span>
            
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 text-xs">
              {[
                { key: 'cleanliness', label: 'Cleanliness & Hygiene' },
                { key: 'service', label: 'Staff & Front Desk Service' },
                { key: 'room', label: 'Room Comfort & Amenities' },
                { key: 'food', label: 'Food & Dining Options' },
                { key: 'overall', label: 'Overall Experience' }
              ].map((cat) => (
                <div key={cat.key} className="space-y-1 bg-white p-3 rounded-lg border border-navy/5">
                  <span className="font-semibold text-navy block">{cat.label}</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleCategoryRating(cat.key, s)}
                        className="p-0.5 cursor-pointer border-none bg-transparent"
                      >
                        <Star
                          className={`size-4 ${
                            categories[cat.key] >= s ? "fill-amber-400 text-amber-400" : "text-navy/20"
                          }`}
                        />
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
              rows={4}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Tell us what you loved about your stay, room comfort, food, or areas we can improve..."
              className="w-full rounded-xl border border-navy/15 bg-cream/10 p-3.5 text-xs font-medium text-navy focus:border-purple focus:outline-none"
            />
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-bold text-navy/70 hover:text-navy bg-transparent cursor-pointer border-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-navy text-cream rounded-xl text-xs font-bold hover:bg-navy/90 transition-colors shadow-soft cursor-pointer inline-flex items-center gap-2 border-none disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="size-3.5 border-2 border-cream border-t-transparent animate-spin rounded-full" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="size-3.5" /> Submit Feedback
                </>
              )}
            </button>
          </div>

        </form>
      )}

      {/* Main Reviews Table / Cards Grid */}
      <div className="bg-white rounded-2xl border border-navy/10 p-6 shadow-soft space-y-4">
        <div className="flex items-center justify-between border-b border-navy/5 pb-4">
          <h3 className="font-display text-base font-bold text-navy">Submitted Reviews History</h3>
          <span className="text-xs font-semibold text-navy/60">{reviews.length} Total Feedback Records</span>
        </div>

        {reviews.length === 0 ? (
          <div className="py-16 text-center space-y-3 border border-dashed border-navy/10 rounded-2xl bg-cream/10">
            <MessageSquare className="size-12 text-navy/20 mx-auto" />
            <div>
              <h3 className="font-display text-base font-bold text-navy">No Feedback Submitted Yet</h3>
              <p className="text-xs text-navy/60 max-w-sm mx-auto mt-1">
                You haven't submitted feedback for any stays yet. Click "Give Feedback" above to share your experience!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((rev) => (
              <div
                key={rev._id || rev.id}
                className="bg-cream/10 border border-navy/10 p-5 rounded-2xl space-y-3 hover:border-purple/30 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-navy/5 pb-3 gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-sm font-bold text-navy">{rev.hotelName || "Speshway Hotel & Suites"}</span>
                      <span className="text-xs font-mono font-bold text-purple bg-purple/10 px-2 py-0.5 rounded">
                        Ref: {rev.bookingId || "HS-1001"}
                      </span>
                    </div>
                    <p className="text-[11px] text-navy/55 mt-0.5 font-medium">
                      Submitted on {new Date(rev.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`size-4 ${
                            (rev.rating || 5) >= s ? "fill-amber-400 text-amber-400" : "text-navy/20"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-navy">{rev.rating || 5}.0</span>
                  </div>
                </div>

                {/* Category Ratings Chips */}
                {rev.categories && (
                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-navy/70">
                    <span className="bg-white border border-navy/5 px-2.5 py-1 rounded-md">Cleanliness: {rev.categories.cleanliness || 5}★</span>
                    <span className="bg-white border border-navy/5 px-2.5 py-1 rounded-md">Service: {rev.categories.service || 5}★</span>
                    <span className="bg-white border border-navy/5 px-2.5 py-1 rounded-md">Room: {rev.categories.room || 5}★</span>
                    <span className="bg-white border border-navy/5 px-2.5 py-1 rounded-md">Food: {rev.categories.food || 5}★</span>
                  </div>
                )}

                {/* Comments text */}
                <p className="text-xs text-navy/80 font-medium bg-white p-3 rounded-xl border border-navy/5 leading-relaxed">
                  "{rev.comments}"
                </p>

                <div className="flex items-center justify-between text-[11px] text-navy/50 pt-1 font-semibold">
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="size-3.5" /> Verified Guest Feedback
                  </span>
                  <span className="uppercase text-[10px] tracking-wider font-bold text-purple">{rev.status || 'Published'}</span>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}