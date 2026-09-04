import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Notice, LoadingRows, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/hs/FormFields";
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
  XCircle,
  Sparkles,
  CheckCircle2,
  Smile,
  Meh,
  Frown,
  X
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

function PremiumStatCard({ label, value, hint, accentColor = "#0d1b2a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[120px] h-full text-left"
    >
      <div>
        <div className="h-8 flex items-start">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
        </div>
        <h3 className="mt-1.5 font-display text-lg font-black text-navy leading-none">{value}</h3>
      </div>
      <div className="mt-auto pt-2 text-[10px] text-muted-foreground truncate">
        {hint}
      </div>
    </div>
  );
}

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5 text-warning">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-3.5 ${i < rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function SentimentBadge({ sentiment }) {
  if (sentiment === "Positive") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Smile className="size-3 text-emerald-600" /> Positive
      </span>
    );
  }
  if (sentiment === "Negative") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <Frown className="size-3 text-rose-600" /> Negative
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
      <Meh className="size-3 text-amber-600" /> Neutral
    </span>
  );
}

function ManagerFeedbackPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected feedback modal & response state
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [responseText, setResponseText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadData(isSilent = false) {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const user = authService.getCurrentUser();
      setCurrentUser(user);

      const feedbackRes = await managerService.getFeedback().catch(() => ({}));

      if (feedbackRes.success && feedbackRes.data) {
        const compiled = feedbackRes.data.map((f) => {
          const fid = f._id || f.id;
          const cleanliness = f.ratings?.cleanliness || 5;
          const service = f.ratings?.service || 5;
          const room = f.ratings?.room || 5;
          const food = f.ratings?.food || 5;
          const overall = f.rating || Math.round((cleanliness + service + room + food) / 4);

          let sentiment = f.sentiment;
          if (!sentiment) {
            sentiment = overall >= 4 ? "Positive" : overall === 3 ? "Neutral" : "Negative";
          }

          return {
            id: fid,
            bookingId: f.bookingId || "BK-10101",
            guest: f.guestName || "Guest",
            guestEmail: f.guestEmail || "",
            guestPhone: f.guestPhone || "",
            room: f.room || "101 · Standard Room",
            roomType: f.roomType || "Standard Room",
            category: f.category || "General",
            sentiment,
            stayDates: f.stayDates || "Recent Stay",
            overall,
            cleanliness,
            service,
            roomRating: room,
            foodRating: food,
            comments: f.comment || f.comments || "Great experience.",
            submittedDate: f.createdAt ? new Date(f.createdAt).toISOString().split('T')[0] : "2026-09-02",
            status: f.response ? "Responded" : "Pending Response",
            response: f.response || null,
            respondedAt: f.respondedAt ? new Date(f.respondedAt).toISOString().split('T')[0] : null
          };
        });
        setFeedbackList(compiled);
      }
    } catch (err) {
      setError(err.message || "Failed to load guest feedback records");
    } finally {
      setLoading(false);
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
      await managerService.respondFeedback(selectedFeedback.id, responseText, "Resolved");
      toast.success("Response sent to guest successfully!");
      setFeedbackList(prev => prev.map(f => {
        if (f.id === selectedFeedback.id) {
          return {
            ...f,
            status: "Responded",
            response: responseText,
            respondedAt: new Date().toISOString().split('T')[0]
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

  // Stats computations
  const totalCount = feedbackList.length;
  const averageRating = totalCount > 0
    ? (feedbackList.reduce((acc, curr) => acc + curr.overall, 0) / totalCount).toFixed(1)
    : "0.0";
  const fiveStarCount = feedbackList.filter(f => f.overall === 5).length;
  const lowStarCount = feedbackList.filter(f => f.overall <= 2).length;
  const pendingCount = feedbackList.filter(f => !f.response).length;

  // Filters Computations
  const filteredFeedback = feedbackList.filter(f => {
    const s = searchQuery.toLowerCase();
    const matchesSearch =
      f.guest.toLowerCase().includes(s) ||
      f.comments.toLowerCase().includes(s) ||
      f.category.toLowerCase().includes(s);

    const matchesRoom =
      roomSearch === "" ||
      f.room.toLowerCase().includes(roomSearch.toLowerCase()) ||
      f.bookingId.toLowerCase().includes(roomSearch.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "Pending Response" ? !f.response : f.status === statusFilter || (statusFilter === "Responded" && !!f.response));

    const matchesDate = dateFilter === "" || f.submittedDate.includes(dateFilter);

    let matchesRating = true;
    if (ratingFilter === "5") matchesRating = f.overall === 5;
    else if (ratingFilter === "4") matchesRating = f.overall === 4;
    else if (ratingFilter === "3") matchesRating = f.overall === 3;
    else if (ratingFilter === "1-2") matchesRating = f.overall <= 2;

    return matchesSearch && matchesRoom && matchesStatus && matchesRating && matchesDate;
  });

  const totalPages = Math.ceil(filteredFeedback.length / itemsPerPage) || 1;
  const paginatedFeedback = filteredFeedback.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const quickTemplates = [
    "Thank you for your generous review! It was our pleasure hosting you at Hour Stay.",
    "We are delighted to know you had a pleasant stay and enjoyed our service.",
    "Thank you for sharing your feedback. We appreciate your insights and look forward to welcoming you back soon.",
    "We apologize for the inconvenience and will ensure our team addresses this immediately."
  ];

  if (loading && feedbackList.length === 0) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Guest Feedback" subtitle="Loading guest feedback ledger..." />
        <LoadingRows rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in font-ui">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <PremiumStatCard label="Total Feedback" value={totalCount.toString()} hint="Guest feedback submissions" accentColor="#0d1b2a" />
        <PremiumStatCard label="Average Rating" value={`${averageRating} / 5.0`} hint="Cleanliness & service index" accentColor="#10b981" />
        <PremiumStatCard label="5-Star Feedback" value={fiveStarCount.toString()} hint="Top rated stays" accentColor="#3b82f6" />
        <PremiumStatCard label="Critical (1-2★)" value={lowStarCount.toString()} hint="Negative feedback tickets" accentColor="#ef4444" />
        <PremiumStatCard label="Pending Action" value={pendingCount.toString()} hint="Awaiting feedback response" accentColor="#f59e0b" />
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-muted rounded-xl p-4 shadow-soft">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by guest name or comments..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9 text-xs font-semibold bg-cream/10 border-muted w-full"
            />
          </div>

          <div className="w-full md:w-44">
            <Input
              placeholder="Room / Booking ID..."
              value={roomSearch}
              onChange={(e) => {
                setRoomSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 text-xs font-semibold bg-cream/10 border-muted w-full"
            />
          </div>

          <div className="w-full md:w-44">
            <Select
              value={ratingFilter}
              onChange={(e) => {
                setRatingFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 text-xs font-semibold bg-cream/10 border-muted w-full"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="1-2">1-2 Stars</option>
            </Select>
          </div>

          <div className="w-full md:w-44">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 text-xs font-semibold bg-cream/10 border-muted w-full"
            >
              <option value="all">All Statuses</option>
              <option value="Pending Response">Pending Response</option>
              <option value="Responded">Responded</option>
            </Select>
          </div>

          <div className="w-full md:w-44">
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 text-xs font-semibold bg-cream/10 border-muted w-full"
            />
          </div>
        </div>
      </div>

      {/* Feedback Table Ledger */}
      <Panel className="overflow-hidden border border-muted shadow-soft rounded-xl p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-muted bg-cream/30 text-navy font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">Guest & Booking</th>
                <th className="py-3.5 px-4">Room</th>
                <th className="py-3.5 px-4">Rating & Sentiment</th>
                <th className="py-3.5 px-4">Feedback & Highlights</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/40">
              {paginatedFeedback.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <MessageSquare className="size-8 mx-auto mb-2 opacity-30 text-navy" />
                    <p className="font-semibold text-sm">No guest feedback entries matching filters</p>
                    <p className="text-xs text-muted-foreground/80 mt-1">Try resetting search string or rating selections.</p>
                  </td>
                </tr>
              ) : (
                paginatedFeedback.map((f) => (
                  <tr key={f.id} className="hover:bg-cream/10 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-navy">
                      <div className="font-bold text-xs">{f.guest}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{f.bookingId}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-navy">{f.room}</div>
                      <div className="text-[10px] text-muted-foreground">{f.roomType}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        <StarRating rating={f.overall} />
                        <div>
                          <SentimentBadge sentiment={f.sentiment} />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="line-clamp-2 text-xs text-navy font-medium leading-relaxed">
                        "{f.comments}"
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded">
                          {f.category}
                        </span>
                        {f.response && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-medium px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <CheckCircle2 className="size-2.5 text-emerald-600" /> Replied
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-muted-foreground font-mono text-[11px]">
                      {f.submittedDate}
                    </td>

                    <td className="py-3.5 px-4">
                      {f.response ? (
                        <Tag variant="success" className="text-[10px] font-bold">Responded</Tag>
                      ) : (
                        <Tag variant="warning" className="text-[10px] font-bold">Pending Response</Tag>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedFeedback(f);
                          setResponseText(f.response || "");
                        }}
                        className="h-7 px-2.5 text-xs font-bold gap-1 border-muted hover:border-navy text-navy"
                      >
                        <Eye className="size-3" />
                        {f.response ? "View Details" : "Respond"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-muted bg-white">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-semibold text-navy">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
              <span className="font-semibold text-navy">{Math.min(currentPage * itemsPerPage, filteredFeedback.length)}</span> of{" "}
              <span className="font-semibold text-navy">{filteredFeedback.length}</span> reviews
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 px-2 border-muted"
              >
                <ChevronLeft className="size-3" />
              </Button>
              <span className="text-xs px-2 font-bold text-navy">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-7 px-2 border-muted"
              >
                <ChevronRight className="size-3" />
              </Button>
            </div>
          </div>
        )}
      </Panel>

      {/* Review Details & Response Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-muted max-w-xl w-full p-6 shadow-xl relative animate-scale-in text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-muted">
              <div>
                <h3 className="font-display font-black text-lg text-navy">Guest Review Details</h3>
                <p className="text-xs text-muted-foreground">Booking {selectedFeedback.bookingId} · {selectedFeedback.room}</p>
              </div>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="size-8 flex items-center justify-center rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-navy transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Guest & Rating Card */}
              <div className="bg-cream/20 border border-muted/60 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="font-bold text-navy text-sm">{selectedFeedback.guest}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                    <span>{selectedFeedback.room}</span>
                    <span>•</span>
                    <span>{selectedFeedback.submittedDate}</span>
                  </div>
                </div>
                <div className="text-right">
                  <StarRating rating={selectedFeedback.overall} />
                  <div className="mt-1">
                    <SentimentBadge sentiment={selectedFeedback.sentiment} />
                  </div>
                </div>
              </div>

              {/* Rating Sub-metrics */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Cleanliness</div>
                  <div className="font-bold text-navy mt-0.5">{selectedFeedback.cleanliness} ★</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Service</div>
                  <div className="font-bold text-navy mt-0.5">{selectedFeedback.service} ★</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Room Quality</div>
                  <div className="font-bold text-navy mt-0.5">{selectedFeedback.roomRating} ★</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Food & Dining</div>
                  <div className="font-bold text-navy mt-0.5">{selectedFeedback.foodRating || 5} ★</div>
                </div>
              </div>

              {/* Guest Comment */}
              <div>
                <label className="text-xs font-bold text-navy uppercase tracking-wider block mb-1.5">Guest Feedback</label>
                <div className="bg-white border border-muted rounded-xl p-3.5 text-xs text-navy leading-relaxed italic">
                  "{selectedFeedback.comments}"
                </div>
              </div>

              {/* Existing Response or Response Form */}
              {selectedFeedback.response && !responseText && (
                <div>
                  <label className="text-xs font-bold text-navy uppercase tracking-wider block mb-1.5">Official Response</label>
                  <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3.5 text-xs text-navy leading-relaxed">
                    <div className="flex items-center justify-between text-[10px] text-emerald-800 font-bold mb-1">
                      <span>MANAGER REPLY</span>
                      <span>{selectedFeedback.respondedAt || "Recently"}</span>
                    </div>
                    {selectedFeedback.response}
                  </div>
                </div>
              )}

              {/* Response Form */}
              <form onSubmit={handleSendResponse} className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-navy uppercase tracking-wider">
                    {selectedFeedback.response ? "Update Response" : "Write Response"}
                  </label>
                  <span className="text-[10px] text-muted-foreground">Will be visible in guest folio & portal</span>
                </div>

                {/* Quick reply buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {quickTemplates.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setResponseText(tpl)}
                      className="text-[10px] font-medium bg-cream/40 hover:bg-cream border border-muted/80 px-2 py-1 rounded-md text-navy text-left transition-colors"
                    >
                      {tpl.slice(0, 36)}...
                    </button>
                  ))}
                </div>

                <Textarea
                  rows={3}
                  placeholder="Type your response to the guest..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  className="w-full text-xs"
                />

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedFeedback(null)}
                    className="text-xs border-muted"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !responseText.trim()}
                    className="bg-navy hover:bg-navy/90 text-white text-xs font-bold gap-1.5"
                  >
                    <Send className="size-3.5" />
                    {isSubmitting ? "Publishing..." : "Send Response"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagerFeedbackPage;