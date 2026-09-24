import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { adminService } from "@/services/admin";
import { authService } from "@/services/auth";
import { toast } from "sonner";
import { subscribeRealtimeSync } from "@/services/socket";
import { ActionGroup, ViewActionButton } from "@/components/hs/ActionButtons";
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
  Trash2,
  Sparkles,
  CheckCircle2,
  Smile,
  Meh,
  Frown,
  X,
  Hotel,
  Bed,
  Mail,
  Phone,
  Filter,
  Check,
  Clock,
  Archive,
  RefreshCw,
  AlertCircle
} from "lucide-react";

export const Route = createFileRoute("/admin/feedback")({
  head: () => ({
    meta: [
      { title: "Guest Feedback — Admin Console" },
      { name: "description", content: "Review guest stay feedback, ratings, and reply with administrative responses." }
    ]
  }),
  component: AdminFeedbackPage
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

function AdminFeedbackPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  async function loadData(isSilent = false) {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const user = authService.getCurrentUser();
      setCurrentUser(user);

      const params = {};
      if (propertyFilter !== "all") params.propertyId = propertyFilter;
      const res = await adminService.getFeedback(params).catch(() => ({}));

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
  }, [propertyFilter]);


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
    const prop = (f.propertyId || '').toLowerCase();

    const matchesSearch = !s || guest.includes(s) || comments.includes(s) || booking.includes(s) || room.includes(s);
    const matchesProperty = propertyFilter === "all" || prop === propertyFilter.toLowerCase();
    
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

    return matchesSearch && matchesProperty && matchesStatus && matchesRating;
  });

  const totalPages = Math.ceil(filteredFeedback.length / itemsPerPage) || 1;
  const paginatedFeedback = filteredFeedback.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 text-left animate-fade-in font-ui">

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <PremiumStatCard label="Total Feedback" value={totalCount.toString()} hint="Real database entries" accentColor="#0d1b2a" icon={MessageSquare} />
        <PremiumStatCard label="Average Rating" value={`${averageRating} / 5.0`} hint="Across all properties" accentColor="#10b981" icon={Star} />
        <PremiumStatCard label="5-Star Reviews" value={`${fiveStarCount} (${satisfactionRate}%)`} hint="Top tier satisfaction" accentColor="#3b82f6" icon={Sparkles} />
        <PremiumStatCard label="Pending Action" value={pendingCount.toString()} hint="Awaiting review/reply" accentColor="#f59e0b" icon={Clock} />
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
          <div className="relative sm:col-span-6">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-navy/40" />
            <input
              placeholder="Search by guest name, room, booking ref, or review text..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 h-10 rounded-xl bg-cream/20 border border-navy/10 text-xs font-semibold text-navy focus:outline-none focus:border-purple placeholder:text-navy/40"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={propertyFilter}
              onChange={(e) => { setPropertyFilter(e.target.value); setCurrentPage(1); }}
              className="w-full h-10 px-3 rounded-xl bg-cream/20 border border-navy/10 text-xs font-semibold text-navy focus:outline-none focus:border-purple cursor-pointer"
            >
              <option value="all">All Properties</option>
              <option value="HS-JAI">Rambagh Residency (Jaipur)</option>
              <option value="HS-UDA">Lake Palace (Udaipur)</option>
              <option value="HS-GOA">Palolem Beach Resort (Goa)</option>
              <option value="HS-9HQ8P">Hour Stay Elite Suites</option>
            </select>
          </div>

          <div className="sm:col-span-3">
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
              No reviews match the selected filters or search parameters.
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
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 text-left min-w-[100px] whitespace-nowrap">Actions</th>
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
                      onClick={() => navigate(`/admin/feedback/view/${fid}`)}
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
                      <td className="py-3.5 px-4 text-left align-middle whitespace-nowrap">
                        <StatusBadge status={f.status || (f.response ? "Resolved" : "Published")} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-left align-middle min-w-[100px] whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <ActionGroup align="left">
                          <ViewActionButton
                            onClick={() => navigate(`/admin/feedback/view/${fid}`)}
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

    </div>
  );
}
