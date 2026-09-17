import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { managerService } from "@/services/manager";
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
  Smile,
  Meh,
  Frown,
  X,
  Hotel,
  Bed,
  Clock,
  Archive,
  RefreshCw,
  Trash2
} from "lucide-react";

export const Route = createFileRoute("/manager/feedback")({
  head: () => ({
    meta: [
      { title: "Guest Feedback — Manager Console" },
      { name: "description", content: "Review guest stay feedback, ratings, and reply with management responses." }
    ]
  }),
  component: ManagerFeedbackPage
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

function ManagerFeedbackPage() {
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

  // Selected feedback modal & response state
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [responseStatus, setResponseStatus] = useState("Resolved");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadData(isSilent = false) {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const user = authService.getCurrentUser();
      setCurrentUser(user);

      const res = await managerService.getFeedback().catch(() => ({}));

      if (res && res.success && Array.isArray(res.data)) {
        setFeedbackList(res.data);
      } else {
        setFeedbackList([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load guest feedback records");
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

  // Submit response handler
  const handleSendResponse = async (e) => {
    e.preventDefault();
    if (!responseText.trim() || !selectedFeedback) {
      toast.error("Please enter a response message.");
      return;
    }

    setIsSubmitting(true);
    try {
      const fid = selectedFeedback._id || selectedFeedback.id;
      await managerService.respondFeedback(fid, responseText, responseStatus);
      toast.success("Management response published successfully!");
      
      setFeedbackList(prev => prev.map(f => {
        if ((f._id || f.id) === fid) {
          return {
            ...f,
            response: responseText,
            respondedBy: currentUser?.name || "Hotel Manager",
            respondedAt: new Date().toISOString(),
            status: responseStatus
          };
        }
        return f;
      }));

      setSelectedFeedback(null);
      setResponseText("");
    } catch (err) {
      toast.error(err.message || "Failed to post response");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Status Switcher
  const handleStatusChange = async (f, newStatus) => {
    try {
      const fid = f._id || f.id;
      await managerService.updateFeedbackStatus(fid, newStatus);
      toast.success(`Feedback status updated to ${newStatus}`);
      setFeedbackList(prev => prev.map(item => ((item._id || item.id) === fid ? { ...item, status: newStatus } : item)));
      if (selectedFeedback && (selectedFeedback._id || selectedFeedback.id) === fid) {
        setSelectedFeedback(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    }
  };

  // Quick Template Injector
  const handleApplyTemplate = (type) => {
    if (type === "thank_you") {
      setResponseText("Thank you for your generous feedback! We are thrilled to hear that you had an exceptional stay. Our team looks forward to serving you again.");
      setResponseStatus("Published");
    } else if (type === "apology") {
      setResponseText("Thank you for your valuable feedback. We sincerely apologize for not meeting your expectations. We are taking corrective steps with our hotel staff to ensure this is not repeated.");
      setResponseStatus("Resolved");
    } else if (type === "resolved") {
      setResponseText("Thank you for highlighting this to our attention. The matter has been resolved by our on-duty supervisors. We look forward to welcoming you back.");
      setResponseStatus("Resolved");
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
  const responseRate = totalCount > 0 ? Math.round((respondedCount / totalCount) * 100) : 0;

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
          <h1 className="font-display text-2xl font-bold text-navy">Property Guest Feedback & Reviews</h1>
          <p className="text-xs text-navy/60 mt-0.5">
            Monitor real-time guest reviews, reply to ratings, and maintain hotel reputation in MongoDB.
          </p>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <PremiumStatCard label="Total Reviews" value={totalCount.toString()} hint="Property guest submissions" accentColor="#0d1b2a" icon={MessageSquare} />
        <PremiumStatCard label="Property Rating" value={`${averageRating} / 5.0`} hint="Cleanliness & service index" accentColor="#10b981" icon={Star} />
        <PremiumStatCard label="5-Star Reviews" value={`${fiveStarCount} (${satisfactionRate}%)`} hint="Top-rated experiences" accentColor="#3b82f6" icon={Sparkles} />
        <PremiumStatCard label="Pending Action" value={pendingCount.toString()} hint="Awaiting management response" accentColor="#f59e0b" icon={Clock} />
        <PremiumStatCard label="Response Rate" value={`${responseRate}%`} hint={`${respondedCount} Responded`} accentColor="#5b21b6" icon={CheckCircle2} />
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
              { id: "Resolved", label: "Resolved" },
              { id: "Archived", label: "Archived" }
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
            Showing <strong className="text-purple">{filteredFeedback.length}</strong> of {totalCount} records
          </span>
        </div>

        {/* Search & Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="relative sm:col-span-8">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-navy/40" />
            <input
              placeholder="Search by guest name, room, booking ref, or review comments..."
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
              No guest reviews match the selected filters or search parameters.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-navy/10 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-navy/10 bg-cream/30 text-[10px] uppercase font-bold text-navy/60 tracking-wider">
                  <th className="py-3.5 px-4 whitespace-nowrap">Guest & Contact</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Booking & Room</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Rating</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Sentiment</th>
                  <th className="py-3.5 px-4">Review Comment</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
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
                      onClick={() => {
                        setSelectedFeedback(f);
                        setResponseText(f.response || "");
                        setResponseStatus(f.status || "Resolved");
                      }}
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
                              {f.guestEmail || f.guestPhone || "Verified Guest"}
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
                            {f.room || f.roomType || "Standard Room"}
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
                            {f.category || "Stay Review"}
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
                            <MessageSquareText className="size-3" /> Management Responded
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={f.status || (f.response ? "Resolved" : "Published")} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedFeedback(f);
                              setResponseText(f.response || "");
                              setResponseStatus(f.status || "Resolved");
                            }}
                            className="size-8 rounded-lg bg-navy/5 hover:bg-purple hover:text-white text-navy flex items-center justify-center transition-colors cursor-pointer border-none"
                            title="View Details & Reply"
                          >
                            <Eye className="size-4" />
                          </button>
                        </div>
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

      {/* Review Details & Response Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-navy/10 shadow-2xl p-6 sm:p-8 space-y-6 text-left animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-navy/5 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-purple tracking-widest block">Review Dossier</span>
                <h3 className="font-sans tracking-tight tabular-nums font-bold text-xl text-slate-800">
                  Feedback from {selectedFeedback.guestName || selectedFeedback.guest}
                </h3>
              </div>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="size-8 rounded-full bg-navy/5 hover:bg-navy/10 text-navy flex items-center justify-center cursor-pointer border-none"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Guest & Stay Context Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-cream/20 p-4 rounded-xl border border-navy/5 text-xs">
              <div>
                <span className="text-[10px] text-navy/50 font-bold uppercase block">Booking ID</span>
                <strong className="font-mono text-purple font-bold">#{selectedFeedback.bookingId}</strong>
              </div>
              <div>
                <span className="text-[10px] text-navy/50 font-bold uppercase block">Room</span>
                <strong className="text-navy font-bold">{selectedFeedback.room || "101 Standard"}</strong>
              </div>
              <div>
                <span className="text-[10px] text-navy/50 font-bold uppercase block">Stay Dates</span>
                <strong className="text-navy font-bold">{selectedFeedback.stayDates || "Recent Stay"}</strong>
              </div>
              <div>
                <span className="text-[10px] text-navy/50 font-bold uppercase block">Overall Rating</span>
                <div className="flex items-center gap-1 font-bold text-amber-500">
                  <Star className="size-3.5 fill-amber-400" /> {selectedFeedback.rating || 5}.0 / 5
                </div>
              </div>
            </div>

            {/* Sub-Ratings Matrix */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Rating Breakdown</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Cleanliness", val: selectedFeedback.ratings?.cleanliness || selectedFeedback.rating || 5 },
                  { label: "Staff Service", val: selectedFeedback.ratings?.service || selectedFeedback.rating || 5 },
                  { label: "Room Comfort", val: selectedFeedback.ratings?.room || selectedFeedback.rating || 5 },
                  { label: "Food & Dining", val: selectedFeedback.ratings?.food || selectedFeedback.rating || 5 }
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-white border border-navy/10 rounded-xl space-y-1">
                    <span className="text-[10px] text-navy/60 font-semibold block">{item.label}</span>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-navy">{item.val}/5</span>
                      <StarRating rating={item.val} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Guest Comment */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Guest Remarks</h4>
              <div className="p-4 rounded-xl bg-purple/5 border border-purple/15 text-xs text-navy leading-relaxed italic">
                "{selectedFeedback.comment || selectedFeedback.comments}"
              </div>
            </div>

            {/* Status Selector */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Publication Status</h4>
              <div className="flex flex-wrap gap-2">
                {["Published", "Pending", "Resolved", "Archived"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(selectedFeedback, st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      selectedFeedback.status === st
                        ? "bg-purple text-white border-purple shadow-sm"
                        : "bg-white text-navy/70 border-navy/10 hover:bg-cream/40"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Official Management Response Form */}
            <form onSubmit={handleSendResponse} className="space-y-3 pt-2 border-t border-navy/5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-navy flex items-center gap-1.5">
                  <MessageSquareText className="size-3.5 text-purple" /> Management Response
                </label>
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-navy/50">Templates:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate("thank_you")}
                    className="text-purple hover:underline font-bold bg-transparent border-none cursor-pointer"
                  >
                    Thank You
                  </button>
                  <span className="text-navy/30">·</span>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate("apology")}
                    className="text-purple hover:underline font-bold bg-transparent border-none cursor-pointer"
                  >
                    Apology
                  </button>
                  <span className="text-navy/30">·</span>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate("resolved")}
                    className="text-purple hover:underline font-bold bg-transparent border-none cursor-pointer"
                  >
                    Resolved
                  </button>
                </div>
              </div>

              <textarea
                rows={3}
                placeholder="Type your official response to the guest..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                className="w-full p-3 text-xs rounded-xl bg-cream/10 border border-navy/10 text-navy focus:outline-none focus:border-purple font-medium"
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-navy/50">
                  {selectedFeedback.respondedAt && (
                    <>Last response on: {new Date(selectedFeedback.respondedAt).toLocaleDateString()}</>
                  )}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFeedback(null)}
                    className="h-9 px-4 text-xs font-bold cursor-pointer"
                  >
                    Close
                  </Button>
                  <Button
                    type="submit"
                    variant="hero"
                    size="sm"
                    disabled={isSubmitting}
                    className="h-9 px-5 text-xs font-bold gap-1.5 cursor-pointer shadow-soft"
                  >
                    <Send className="size-3.5" />
                    {isSubmitting ? "Saving..." : "Save & Publish Response"}
                  </Button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}