import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ActionGroup, ViewActionButton } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { receptionistService } from "@/services/receptionist";
import { authService } from "@/services/auth";
import { toast } from "sonner";
import { subscribeRealtimeSync } from "@/services/socket";
import {
  MessageSquare,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Star,
  MessageSquareText,
  Calendar,
  Send,
  Sparkles,
  CheckCircle2,
  Plus,
  Smile,
  Meh,
  Frown,
  User,
  Bed,
  Phone,
  Mail,
  X,
  Clock,
  Archive,
  RefreshCw
} from "lucide-react";

export const Route = createFileRoute("/reception/feedback")({
  head: () => ({
    meta: [
      { title: "Guest Feedback — Front Desk" },
      { name: "description", content: "Review guest stay feedback, ratings, and respond to front desk feedback." }
    ]
  }),
  component: ReceptionistFeedbackPage
});

function PremiumStatCard({ label, value, hint, accentColor = "#0d1b2a", icon: Icon }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[120px] h-full text-left"
    >
      <div>
        <div className="h-8 flex items-start justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
          {Icon && <Icon className="size-4 text-muted-foreground/60" />}
        </div>
        <h3 className="mt-1.5 font-sans tracking-tight tabular-nums text-xl font-bold text-slate-800 leading-none">{value}</h3>
      </div>
      <div className="mt-auto pt-2 text-[10px] font-semibold text-muted-foreground truncate">
        {hint}
      </div>
    </div>
  );
}

function StarRating({ rating = 5 }) {
  const r = Math.round(Number(rating) || 5);
  return (
    <div className="flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${i < r ? "fill-amber-400 text-amber-500" : "text-muted-foreground/25"}`}
        />
      ))}
    </div>
  );
}

function SentimentBadge({ sentiment, rating = 5 }) {
  const norm = sentiment || (rating >= 4 ? "Positive" : rating === 3 ? "Neutral" : "Negative");
  if (norm === "Positive") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Smile className="size-3 text-emerald-600" /> Positive
      </span>
    );
  }
  if (norm === "Negative") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <Frown className="size-3 text-rose-600" /> Negative
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
      <Meh className="size-3 text-amber-600" /> Neutral
    </span>
  );
}

function StatusBadge({ status = "Published" }) {
  const s = status.toLowerCase();
  if (s === "published" || s === "responded" || s === "resolved") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="size-3 text-emerald-600" /> {status}
      </span>
    );
  }
  if (s === "pending" || s === "pending response") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="size-3 text-amber-600" /> Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
      <Archive className="size-3 text-slate-500" /> {status}
    </span>
  );
}

export function ReceptionistFeedbackPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New feedback form state (at check-out / front desk)
  const [newFeedbackForm, setNewFeedbackForm] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    bookingId: "",
    room: "101",
    roomType: "Standard Room",
    rating: 5,
    ratings: { cleanliness: 5, service: 5, room: 5, food: 5 },
    category: "Front Desk Checkout",
    comment: ""
  });

  async function loadData(isSilent = false) {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const user = authService.getCurrentUser();
      setCurrentUser(user);

      const res = await receptionistService.getFeedback().catch(() => ({}));

      if (res && res.success && Array.isArray(res.data)) {
        setFeedbackList(res.data);
      } else {
        setFeedbackList([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load front desk feedback records");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    const unsubscribe = subscribeRealtimeSync(() => {
      loadData(true);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Submit Front Desk Feedback handler
  const handleCreateFeedback = async (e) => {
    e.preventDefault();
    if (!newFeedbackForm.guestName.trim() || !newFeedbackForm.comment.trim()) {
      toast.error("Please enter guest name and feedback remarks.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await receptionistService.createFeedback({
        ...newFeedbackForm,
        rating: Number(newFeedbackForm.rating) || 5,
        propertyId: currentUser?.propertyId || "HS-JAI"
      });

      if (res && (res.success || res.data)) {
        toast.success("Guest feedback recorded and synchronized successfully!");
        setShowAddModal(false);
        setNewFeedbackForm({
          guestName: "",
          guestEmail: "",
          guestPhone: "",
          bookingId: "",
          room: "101",
          roomType: "Standard Room",
          rating: 5,
          ratings: { cleanliness: 5, service: 5, room: 5, food: 5 },
          category: "Front Desk Checkout",
          comment: ""
        });
        loadData(true);
      }
    } catch (err) {
      toast.error(err.message || "Failed to record feedback");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats computations
  const totalCount = feedbackList.length;
  const averageRating = totalCount > 0
    ? (feedbackList.reduce((acc, curr) => acc + (Number(curr.rating) || 5), 0) / totalCount).toFixed(1)
    : "5.0";
  const fiveStarCount = feedbackList.filter(f => Number(f.rating) === 5).length;
  const satisfactionRate = totalCount > 0 ? Math.round((fiveStarCount / totalCount) * 100) : 100;
  const pendingCount = feedbackList.filter(f => (f.status || '').toLowerCase() === "pending" || !f.response).length;
  const respondedCount = feedbackList.filter(f => f.response && f.response.trim().length > 0).length;

  // Filter Computation
  const filteredFeedback = feedbackList.filter(f => {
    const s = searchQuery.toLowerCase().trim();
    const guest = (f.guestName || f.guest || '').toLowerCase();
    const comments = (f.comment || f.comments || '').toLowerCase();
    const booking = (f.bookingId || '').toLowerCase();
    const room = (f.room || f.roomType || '').toLowerCase();

    const matchesSearch = !s || guest.includes(s) || comments.includes(s) || booking.includes(s) || room.includes(s);
    
    let matchesStatus = true;
    if (statusFilter === "Pending") matchesStatus = (f.status || '').toLowerCase() === 'pending' || !f.response;
    else if (statusFilter === "Published") matchesStatus = (f.status || '').toLowerCase() === 'published';
    else if (statusFilter === "Resolved") matchesStatus = (f.status || '').toLowerCase() === 'resolved' || (f.status || '').toLowerCase() === 'responded';
    else if (statusFilter === "Archived") matchesStatus = (f.status || '').toLowerCase() === 'archived';

    let matchesRating = true;
    const r = Math.round(Number(f.rating) || 5);
    if (ratingFilter === "5") matchesRating = r === 5;
    else if (ratingFilter === "4") matchesRating = r === 4;
    else if (ratingFilter === "3") matchesRating = r === 3;
    else if (ratingFilter === "1-2") matchesRating = r <= 2;

    return matchesSearch && matchesStatus && matchesRating;
  });

  const totalPages = Math.ceil(filteredFeedback.length / itemsPerPage) || 1;
  const paginatedFeedback = filteredFeedback.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 text-left animate-fade-in font-ui">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-navy/5 pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Front Desk Guest Feedback</h1>
          <p className="text-xs text-navy/60 mt-0.5">
            Collect checkout guest ratings, acknowledge comments, and track front desk guest satisfaction.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowAddModal(true)}
            variant="hero"
            size="sm"
            className="px-4 text-xs font-bold gap-1.5 shadow-soft cursor-pointer"
          >
            <Plus className="size-4" /> Record Guest Feedback
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PremiumStatCard label="Total Reviews" value={totalCount.toString()} hint="Front desk & guest records" accentColor="#0d1b2a" icon={MessageSquare} />
        <PremiumStatCard label="Guest Rating" value={`${averageRating} / 5.0`} hint="Property service rating" accentColor="#10b981" icon={Star} />
        <PremiumStatCard label="5-Star Reviews" value={`${fiveStarCount} (${satisfactionRate}%)`} hint="Delighted hotel guests" accentColor="#3b82f6" icon={Sparkles} />
        <PremiumStatCard label="Pending Action" value={pendingCount.toString()} hint="Needs acknowledgment" accentColor="#f59e0b" icon={Clock} />
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-navy/10 rounded-2xl p-5 shadow-soft space-y-4">
        
        {/* Status Tab Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/5 pb-3">
          <div className="flex rounded-xl border border-navy/10 bg-cream/30 p-1 gap-1 flex-wrap">
            {[
              { id: "all", label: "All Reviews" },
              { id: "Pending", label: "Pending" },
              { id: "Published", label: "Published" },
              { id: "Resolved", label: "Resolved" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setStatusFilter(tab.id); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${
                  statusFilter === tab.id
                    ? "bg-navy text-cream shadow-sm"
                    : "text-navy/70 hover:text-navy hover:bg-cream/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-bold text-navy/60">
            Showing <strong className="text-purple">{filteredFeedback.length}</strong> records
          </span>
        </div>

        {/* Search & Rating Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="relative sm:col-span-8">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-navy/40" />
            <input
              placeholder="Search guest name, room, booking ref, or remarks..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 h-10 rounded-xl bg-cream/20 border border-navy/10 text-xs font-semibold text-navy focus:outline-none focus:border-purple placeholder:text-navy/40"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={ratingFilter}
              onChange={(e) => { setRatingFilter(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 px-3 rounded-xl bg-cream/20 border border-navy/10 text-xs font-semibold text-navy focus:outline-none focus:border-purple cursor-pointer"
            >
              <option value="all">All Star Ratings</option>
              <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
              <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
              <option value="3">⭐⭐⭐ (3 Stars)</option>
              <option value="1-2">⭐⭐ / ⭐ (Critical 1-2)</option>
            </select>
          </div>
        </div>

      </div>

      {/* Main Feedback Data Table */}
      {loading && feedbackList.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 border border-navy/5 text-center space-y-4 shadow-soft">
          <div className="mx-auto size-10 rounded-full border-4 border-purple border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-navy/60">Fetching live guest feedback from MongoDB...</p>
        </div>
      ) : filteredFeedback.length === 0 ? (
        <div className="bg-white rounded-2xl border border-navy/10 p-16 text-center space-y-4 shadow-soft">
          <MessageSquare className="size-12 text-navy/20 mx-auto" />
          <div>
            <h3 className="font-sans tracking-tight tabular-nums text-base font-bold text-slate-800">No Feedback Records Found</h3>
            <p className="text-xs text-navy/60 max-w-sm mx-auto mt-1">
              Click "Record Guest Feedback" to enter checkout reviews directly at front desk.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-navy/10 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-navy/10 bg-cream/30 text-[10px] uppercase font-bold text-navy/60 tracking-wider">
                  <th className="py-3.5 px-4 whitespace-nowrap">Guest Name</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Booking & Room</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Rating</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Sentiment</th>
                  <th className="py-3.5 px-4">Guest Comments</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap min-w-[90px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy/5 text-navy font-medium">
                {paginatedFeedback.map((f) => {
                  const fid = f._id || f.id;
                  const commentText = f.comment || f.comments || "";
                  const guestName = f.guestName || f.guest || "Guest";
                  const rating = Number(f.rating) || 5;

                  return (
                    <tr
                      key={fid}
                      onClick={() => navigate(`/reception/feedback/view/${fid}`)}
                      className="hover:bg-purple/5 transition-colors cursor-pointer group"
                    >
                      {/* Guest Info */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-full bg-purple/10 text-purple font-bold flex items-center justify-center text-xs shrink-0">
                            {guestName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-navy block group-hover:text-purple transition-colors">
                              {guestName}
                            </span>
                            <span className="text-[11px] text-navy/50 block font-normal">
                              {f.guestPhone || f.guestEmail || "Front Desk Entry"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Booking & Room */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-purple text-[11px] block">
                            #{f.bookingId || "BK-N/A"}
                          </span>
                          <span className="text-xs text-navy/70 block">
                            Room {f.room || "101"} · {f.roomType || "Standard"}
                          </span>
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <StarRating rating={rating} />
                            <span className="font-bold text-navy text-xs">{rating}.0</span>
                          </div>
                          <span className="text-[10px] text-navy/50 block">
                            {f.category || "Front Desk"}
                          </span>
                        </div>
                      </td>

                      {/* Sentiment */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <SentimentBadge sentiment={f.sentiment} rating={rating} />
                      </td>

                      {/* Comment */}
                      <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                        <p className="line-clamp-2 text-xs text-navy/80 italic">
                          "{commentText}"
                        </p>
                        {f.response && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-purple font-bold">
                            <MessageSquareText className="size-3" /> Responded: "{f.response.slice(0, 35)}..."
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={f.status || (f.response ? "Resolved" : "Published")} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-left align-middle whitespace-nowrap min-w-[90px]" onClick={(e) => e.stopPropagation()}>
                        <ActionGroup align="left">
                          <ViewActionButton
                            onClick={() => navigate(`/reception/feedback/view/${fid}`)}
                            title="View Feedback Details"
                          />
                        </ActionGroup>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-navy/5 text-xs text-navy/60">
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="size-8 rounded-lg border border-navy/10 flex items-center justify-center disabled:opacity-40 cursor-pointer hover:bg-cream/30"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="size-8 rounded-lg border border-navy/10 flex items-center justify-center disabled:opacity-40 cursor-pointer hover:bg-cream/30"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record New Feedback Modal (Front Desk Checkout Collection) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-navy/10 shadow-2xl p-6 sm:p-8 space-y-5 text-left animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-navy/5 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-purple tracking-widest block">Front Desk Entry</span>
                <h3 className="font-sans tracking-tight tabular-nums font-bold text-xl text-slate-800">Record Guest Feedback</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="size-8 rounded-full bg-navy/5 hover:bg-navy/10 text-navy flex items-center justify-center cursor-pointer border-none"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFeedback} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy">Guest Name *</label>
                  <input
                    required
                    placeholder="Full Guest Name"
                    value={newFeedbackForm.guestName}
                    onChange={(e) => setNewFeedbackForm(prev => ({ ...prev, guestName: e.target.value }))}
                    className="w-full h-9 px-3 text-xs rounded-xl bg-cream/10 border border-navy/10 text-navy focus:outline-none focus:border-purple"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy">Booking Ref / ID</label>
                  <input
                    placeholder="e.g. BK-10204"
                    value={newFeedbackForm.bookingId}
                    onChange={(e) => setNewFeedbackForm(prev => ({ ...prev, bookingId: e.target.value }))}
                    className="w-full h-9 px-3 text-xs rounded-xl bg-cream/10 border border-navy/10 text-navy focus:outline-none focus:border-purple"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy">Room Number</label>
                  <input
                    placeholder="101"
                    value={newFeedbackForm.room}
                    onChange={(e) => setNewFeedbackForm(prev => ({ ...prev, room: e.target.value }))}
                    className="w-full h-9 px-3 text-xs rounded-xl bg-cream/10 border border-navy/10 text-navy focus:outline-none focus:border-purple"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy">Room Category</label>
                  <input
                    placeholder="Standard Room"
                    value={newFeedbackForm.roomType}
                    onChange={(e) => setNewFeedbackForm(prev => ({ ...prev, roomType: e.target.value }))}
                    className="w-full h-9 px-3 text-xs rounded-xl bg-cream/10 border border-navy/10 text-navy focus:outline-none focus:border-purple"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-navy">Overall Rating (1-5)</label>
                  <select
                    value={newFeedbackForm.rating}
                    onChange={(e) => setNewFeedbackForm(prev => ({ ...prev, rating: Number(e.target.value) }))}
                    className="w-full h-9 px-3 text-xs rounded-xl bg-cream/10 border border-navy/10 text-navy focus:outline-none focus:border-purple cursor-pointer"
                  >
                    <option value={5}>5 - Excellent</option>
                    <option value={4}>4 - Good</option>
                    <option value={3}>3 - Average</option>
                    <option value={2}>2 - Poor</option>
                    <option value={1}>1 - Terrible</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-navy">Guest Remarks / Comments *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Record what the guest said regarding their stay, room quality, cleanliness, or desk service..."
                  value={newFeedbackForm.comment}
                  onChange={(e) => setNewFeedbackForm(prev => ({ ...prev, comment: e.target.value }))}
                  className="w-full p-3 text-xs rounded-xl bg-cream/10 border border-navy/10 text-navy focus:outline-none focus:border-purple font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-navy/5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  className="h-9 px-4 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="hero"
                  size="sm"
                  disabled={isSubmitting}
                  className="h-9 px-5 text-xs font-bold gap-1.5 cursor-pointer shadow-soft"
                >
                  <Send className="size-3.5" />
                  {isSubmitting ? "Saving..." : "Save Guest Feedback"}
                </Button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default ReceptionistFeedbackPage;
