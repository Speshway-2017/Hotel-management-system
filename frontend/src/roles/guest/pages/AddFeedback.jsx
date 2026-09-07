import React, { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useNavigate, useLocation } from "react-router-dom";
import { PageHeader, Panel, Tag, Crumbs } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/hs/FormFields";
import { apiClient, invalidateApiCache } from "@/services/apiClient";
import { authService } from "@/services/auth";
import { toast } from "sonner";
import { emitRealtimeEvent } from "@/services/socket";
import {
  Star,
  MessageSquare,
  Sparkles,
  Hotel,
  Bed,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Send,
  ThumbsUp,
  MapPin,
  Clock,
  User,
  HeartHandshake
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
    food: 5
  });

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    const loadBookingsAndFeedback = async () => {
      setLoading(true);
      try {
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
            const firstId = bookData.data[0].bookingId || bookData.data[0].id || bookData.data[0]._id;
            setSelectedBookingId(firstId);
            if (fbMap[String(firstId)]) {
              setExistingFeedback(fbMap[String(firstId)]);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load bookings or feedback:", err);
      } finally {
        setLoading(false);
      }
    };

    loadBookingsAndFeedback();
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
          ...categories,
          overall: overallRating
        },
        comments,
        comment: comments,
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
    if (rating === 5) return { text: "Excellent Experience", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
    if (rating === 4) return { text: "Very Good Stay", color: "text-blue-600 bg-blue-50 border-blue-200" };
    if (rating === 3) return { text: "Satisfactory / Average", color: "text-amber-600 bg-amber-50 border-amber-200" };
    if (rating === 2) return { text: "Below Expectations", color: "text-orange-600 bg-orange-50 border-orange-200" };
    return { text: "Needs Improvement", color: "text-rose-600 bg-rose-50 border-rose-200" };
  };

  const sentiment = getRatingSentiment(overallRating);

  return (
    <div className="space-y-6 text-left font-ui animate-fade-in max-w-4xl mx-auto pb-12">
      <Crumbs
        items={[
          { label: "Guest Feedback", to: "/guest/feedback" },
          { label: "Share Feedback" }
        ]}
      />

      <PageHeader
        title="Share Your Stay Feedback"
        subtitle="Your honest review helps hotel staff continuously elevate hospitality standards."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select Stay & Booking Summary Card */}
        <Panel
          title="1. Select Stay Reservation"
          description="Choose the completed stay you wish to provide feedback for."
        >
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-navy block mb-1.5">
                Stay Booking Reference <span className="text-rose-500">*</span>
              </label>
              {bookings.length > 0 ? (
                <select
                  value={selectedBookingId}
                  onChange={(e) => setSelectedBookingId(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-cream/20 border border-navy/15 text-xs font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-purple/20 focus:border-purple cursor-pointer transition-all"
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
                    return (
                      <option key={bKey} value={bKey}>
                        {b.hotel || "Hour Stay Resort"} · {b.room || "Room"} · Stay: {b.dates || `${b.checkIn} → ${b.checkOut}`} (Ref: #{bKey})
                      </option>
                    );
                  })}
                </select>
              ) : (
                <input
                  placeholder="Booking Reference (e.g. BK-10301)"
                  value={selectedBookingId}
                  onChange={(e) => setSelectedBookingId(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-cream/20 border border-navy/15 text-xs font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-purple/20 focus:border-purple"
                />
              )}
            </div>

            {/* Already Submitted Warning Banner */}
            {isAlreadySubmitted && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between gap-3 text-xs font-semibold animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold block text-emerald-950">Feedback Already Submitted</span>
                    <span className="text-emerald-700 text-[11px]">
                      You have already submitted a review for this reservation (Booking Ref: #{selectedBookingId}).
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/guest/feedback")}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 border-none"
                >
                  View Reviews
                </button>
              </div>
            )}

            {/* Selected Booking Stay Highlight Details */}
            {selectedBookingObj && (
              <div className="mt-4 p-4 rounded-xl bg-purple/5 border border-purple/15 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <Hotel className="size-4 text-purple shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Property</span>
                    <strong className="text-navy">{selectedBookingObj.hotel || "Speshway Luxury Hotel"}</strong>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Bed className="size-4 text-purple shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Room Type</span>
                    <strong className="text-navy">{selectedBookingObj.room || "Standard Suite"}</strong>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Calendar className="size-4 text-purple shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Schedule</span>
                    <strong className="text-navy">{selectedBookingObj.dates || `${selectedBookingObj.checkIn} → ${selectedBookingObj.checkOut}`}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Panel>

        {/* Step 2: Star Ratings & Categories */}
        <Panel
          title="2. Rate Your Experience"
          description="Score your overall stay and specific amenity categories."
        >
          <div className="p-6 space-y-6">
            {/* Overall Rating Big Star Box */}
            <div className="bg-cream/25 border border-navy/10 rounded-2xl p-6 text-center space-y-3">
              <span className="text-xs font-bold text-navy uppercase tracking-wider block">
                Overall Stay Experience Score
              </span>
              <div className="flex items-center justify-center gap-2 py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setOverallRating(star)}
                    className="p-1.5 cursor-pointer transition-transform hover:scale-125 border-none bg-transparent"
                    title={`Rate ${star} Star${star > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={`size-9 ${
                        star <= (hoverRating || overallRating)
                          ? "fill-amber-400 text-amber-500"
                          : "text-navy/15"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <div>
                <span className={`inline-block px-3.5 py-1 rounded-full text-xs font-bold border ${sentiment.color}`}>
                  ⭐ {overallRating} / 5 — {sentiment.text}
                </span>
              </div>
            </div>

            {/* Category Ratings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {[
                { key: "cleanliness", label: "Cleanliness & Hygiene", desc: "Room sanitation, fresh linens, bathroom hygiene" },
                { key: "service", label: "Staff Service & Hospitality", desc: "Front desk courtesy, attentiveness, prompt service" },
                { key: "room", label: "Room Comfort & Amenities", desc: "Bed quality, AC, Wi-Fi speed, ambient lighting" },
                { key: "food", label: "Dining & Food Quality", desc: "Breakfast spread, room dining freshness, flavor" }
              ].map((cat) => (
                <div key={cat.key} className="p-4 rounded-xl border border-navy/10 bg-white shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-xs font-bold text-navy block">{cat.label}</strong>
                      <p className="text-[10px] text-muted-foreground">{cat.desc}</p>
                    </div>
                    <span className="text-xs font-bold text-amber-600 font-mono ml-2 shrink-0">
                      {categories[cat.key]} ★
                    </span>
                  </div>
                  <div className="flex items-center gap-1 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleCategoryRating(cat.key, star)}
                        className="p-1 cursor-pointer hover:scale-115 transition-transform border-none bg-transparent"
                      >
                        <Star
                          className={`size-4.5 ${
                            star <= categories[cat.key]
                              ? "fill-amber-400 text-amber-500"
                              : "text-navy/15"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* Step 3: Detailed Feedback & Comments */}
        <Panel
          title="3. Tell Us More About Your Experience"
          description="Share specific highlights, compliments for staff, or suggestions for improvements."
        >
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-navy block mb-1.5">
                Review Headline <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Wonderful stay! Exceptional front desk hospitality."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-cream/20 border border-navy/15 text-xs font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-purple/20 focus:border-purple transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-navy block mb-1.5">
                Detailed Feedback <span className="text-rose-500">*</span>
              </label>
              <Textarea
                rows={5}
                required
                placeholder="Write your stay experience here... What did you enjoy the most? Anything we can improve for your next visit?"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-cream/20 border border-navy/15 text-xs font-medium text-navy focus:outline-none focus:ring-2 focus:ring-purple/20 focus:border-purple"
              />
            </div>

            {/* Recommendation Checkbox */}
            <div className="pt-2">
              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-navy/10 bg-cream/15 cursor-pointer hover:bg-cream/30 transition-colors">
                <input
                  type="checkbox"
                  checked={recommend}
                  onChange={(e) => setRecommend(e.target.checked)}
                  className="size-4 rounded text-purple border-navy/20 focus:ring-purple cursor-pointer"
                />
                <div>
                  <strong className="text-xs font-bold text-navy block flex items-center gap-1.5">
                    <ThumbsUp className="size-3.5 text-purple" /> Recommend this property to friends & family
                  </strong>
                  <p className="text-[10px] text-muted-foreground">
                    Your recommendation badge will be displayed on the public stay review board.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </Panel>

        {/* Submit Action Bar */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            className="h-11 px-6 text-xs font-bold border-navy/15 text-navy hover:bg-navy/5 rounded-xl cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={submitting || isAlreadySubmitted}
            className={`h-11 px-8 text-xs font-bold rounded-xl shadow-soft inline-flex items-center gap-2 ${
              isAlreadySubmitted
                ? "bg-navy/30 text-white/70 cursor-not-allowed"
                : "bg-navy hover:bg-navy-deep text-white cursor-pointer"
            }`}
          >
            {submitting ? (
              <>
                <div className="size-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Submitting Feedback...
              </>
            ) : isAlreadySubmitted ? (
              <>
                <CheckCircle2 className="size-3.5 text-emerald-400" /> Feedback Already Submitted
              </>
            ) : (
              <>
                <Send className="size-3.5" /> Submit Feedback
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
