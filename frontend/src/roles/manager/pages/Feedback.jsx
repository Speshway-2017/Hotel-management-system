import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Notice, LoadingRows, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/hs/FormFields";
import { managerService } from "@/services/manager";
import { authService } from "@/services/auth";
import {
  MessageSquare,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Star,
  MessageSquareText,
  Calendar
} from "lucide-react";

// Premium stat card component
function PremiumStatCard({ label, value, hint, accentColor = "#0d1b2a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[120px] h-full"
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

// Renders overall rating as colored star icons
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

const generateFeedbackFromBookings = (bookings, propertyId) => {
  const cacheKey = `hms_feedback_${propertyId}`;
  const stored = localStorage.getItem(cacheKey);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
  }

  // Generate realistic reviews mapped to real booking entries
  const list = [];
  const commentOptions = [
    "Absolutely gorgeous stay! The front office receptionist was extremely polite and check-in was completed in 2 minutes.",
    "Clean room and beautiful courtyard. The room housekeeping was delayed during morning hours, but overall the experience was great.",
    "Decent stay, but the bathroom shower temperature regulator was tricky. Service was highly responsive.",
    "Exceptional hospitality! The manager Vikram helped upgrade our room complimentary due to a minor delay."
  ];

  if (bookings.length > 0) {
    bookings.forEach((b, idx) => {
      const bid = b._id || b.id || `MOCK-${idx}`;
      const bidStr = typeof bid === "string" ? bid : String(bid);
      const prefix = bidStr.substring(0, 4).toUpperCase();
      const overall = idx % 3 === 0 ? 5 : idx % 3 === 1 ? 4 : 3;
      const clean = idx % 2 === 0 ? 5 : 4;
      const service = overall;
      const room = clean;

      // Submit date is checkout date
      const submitDate = b.checkOut;

      list.push({
        id: `FDB-${prefix}-${idx + 1}`,
        bookingId: bidStr,
        guest: b.guest,
        room: b.room || `10${idx + 1}`,
        stayDates: `${b.checkIn} → ${b.checkOut}`,
        overall,
        cleanliness: clean,
        service,
        roomRating: room,
        comments: commentOptions[idx % commentOptions.length],
        submittedDate: submitDate,
        status: idx % 2 === 0 ? "Pending Response" : "Responded",
        response: idx % 2 === 0 ? null : "Thank you for sharing your feedback. We look forward to welcoming you back!"
      });
    });
  }

  // Fallbacks if data is low
  if (list.length < 4) {
    list.push({
      id: "FDB-MOCK-01",
      bookingId: "HS-MOCK-99",
      guest: "Rajesh Kumar",
      room: "302",
      stayDates: "2026-08-20 → 2026-08-21",
      overall: 5,
      cleanliness: 5,
      service: 5,
      roomRating: 5,
      comments: "Fabulous service, clean rooms and friendly receptionist. Will visit again.",
      submittedDate: "2026-08-22",
      status: "Pending Response",
      response: null
    });
    list.push({
      id: "FDB-MOCK-02",
      bookingId: "HS-MOCK-98",
      guest: "Sneha Reddy",
      room: "104",
      stayDates: "2026-08-19 → 2026-08-20",
      overall: 2,
      cleanliness: 3,
      service: 2,
      roomRating: 3,
      comments: "AC cooling was slow initially, and checkout service was delayed significantly during checkout hours.",
      submittedDate: "2026-08-21",
      status: "Responded",
      response: "Dear Guest, we apologize for the service delay. We are auditing our front office operations today."
    });
  }

  localStorage.setItem(cacheKey, JSON.stringify(list));
  return list;
};

function ManagerFeedbackPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [property, setProperty] = useState(null);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const user = authService.getCurrentUser();
      setCurrentUser(user);

      if (!user || user.role !== "manager") {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      const [propRes, feedbackRes] = await Promise.all([
        managerService.getProperty(),
        managerService.getFeedback()
      ]);

      if (propRes.success && propRes.data) {
        setProperty(propRes.data);
      }

      if (feedbackRes.success && feedbackRes.data) {
        const compiled = feedbackRes.data.map((f, idx) => {
          const fid = f._id || f.id;
          const overall = Math.round((f.ratings.cleanliness + f.ratings.service + f.ratings.room) / 3);
          return {
            id: fid,
            bookingId: f.bookingId,
            guest: f.guestName,
            room: f.room || "101",
            stayDates: "stay dates",
            overall,
            cleanliness: f.ratings.cleanliness,
            service: f.ratings.service,
            roomRating: f.ratings.room,
            comments: f.comment,
            submittedDate: new Date(f.createdAt).toISOString().split('T')[0],
            status: f.response ? "Responded" : "Pending Response",
            response: f.response || null
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

    let socketInst = null;
    import('@/services/socket').then(({ socket }) => {
      socketInst = socket;
      const handleRealtime = () => loadData();
      socket.on('booking_updated', handleRealtime);
      socket.on('feedback_updated', handleRealtime);
    });

    return () => {
      if (socketInst) {
        socketInst.off('booking_updated');
        socketInst.off('feedback_updated');
      }
    };
  }, []);

  // Stats computations
  const totalCount = feedbackList.length;
  const averageRating = totalCount > 0
    ? (feedbackList.reduce((acc, curr) => acc + curr.overall, 0) / totalCount).toFixed(1)
    : "0.0";
  const fiveStarCount = feedbackList.filter(f => f.overall === 5).length;
  const lowStarCount = feedbackList.filter(f => f.overall <= 2).length;
  const pendingCount = feedbackList.filter(f => f.status === "Pending Response").length;

  // Filters Computations
  const filteredFeedback = feedbackList.filter(f => {
    const s = searchQuery.toLowerCase();
    const matchesSearch =
      f.guest.toLowerCase().includes(s) ||
      f.comments.toLowerCase().includes(s);

    const matchesRoom =
      roomSearch === "" ||
      f.room.toLowerCase().includes(roomSearch.toLowerCase()) ||
      f.bookingId.toLowerCase().includes(roomSearch.toLowerCase());

    const matchesStatus = statusFilter === "all" || f.status === statusFilter;
    const matchesDate = dateFilter === "" || f.submittedDate.includes(dateFilter);

    // Rating mapping
    let matchesRating = true;
    if (ratingFilter === "5") matchesRating = f.overall === 5;
    else if (ratingFilter === "4") matchesRating = f.overall === 4;
    else if (ratingFilter === "3") matchesRating = f.overall === 3;
    else if (ratingFilter === "1-2") matchesRating = f.overall <= 2;

    return matchesSearch && matchesRoom && matchesStatus && matchesRating && matchesDate;
  });

  // Pagination computations
  const totalPages = Math.ceil(filteredFeedback.length / itemsPerPage) || 1;
  const paginatedFeedback = filteredFeedback.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (!isAuthorized) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Access Denied" subtitle="Security and privilege validation." />
        <Notice tone="error" title="Unauthorized Access">
          You are not authorized to view the Manager Console. Access is restricted to property managers.
        </Notice>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Guest Feedback" subtitle="Loading recent guest reviews..." />
        <LoadingRows rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <PremiumStatCard label="Total Reviews" value={totalCount.toString()} hint="All-time submissions logs" accentColor="#0d1b2a" />
        <PremiumStatCard label="Average Rating" value={`${averageRating} / 5.0`} hint="Cleanliness & service index" accentColor="#10b981" />
        <PremiumStatCard label="5-Star Reviews" value={fiveStarCount.toString()} hint="Excellent rated stays" accentColor="#3b82f6" />
        <PremiumStatCard label="Tardy Reviews (1-2★)" value={lowStarCount.toString()} hint="Negative feedback reviews" accentColor="#ef4444" />
        <PremiumStatCard label="Pending Response" value={pendingCount.toString()} hint="Awaiting manager responses" accentColor="#f59e0b" />
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
              onChange={(e) => { setRatingFilter(e.target.value); setCurrentPage(1); }}
              className="text-xs h-9 font-semibold bg-[#FDFCFA]/20 border-muted"
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
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="text-xs h-9 font-semibold bg-[#FDFCFA]/20 border-muted"
            >
              <option value="all">All Statuses</option>
              <option value="Pending Response">Pending Response</option>
              <option value="Responded">Responded</option>
            </Select>
          </div>

          <div className="w-full md:w-44">
            <Input
              type="text"
              placeholder="Filter Date (e.g. 2026)..."
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
              className="h-9 text-xs font-semibold bg-cream/10 border-muted w-full"
            />
          </div>
        </div>
      </div>

      {/* Feedback Table Ledger */}
      <div className="bg-white border border-muted rounded-xl shadow-soft overflow-hidden">
        {paginatedFeedback.length === 0 ? (
          <div className="p-16 text-center">
            <MessageSquareText className="size-12 text-muted-foreground/45 mx-auto mb-3" />
            <h3 className="font-semibold text-navy">No guest feedback entries matching filters</h3>
            <p className="text-xs text-muted-foreground mt-1">Try resetting search string or rating selections.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none whitespace-nowrap">
                  <th className="py-4.5 px-6">Guest Name</th>
                  <th className="py-4.5 px-4">Booking ID</th>
                  <th className="py-4.5 px-4">Room</th>
                  <th className="py-4.5 px-4">Stay Dates</th>
                  <th className="py-4.5 px-4 text-center">Overall</th>
                  <th className="py-4.5 px-4 text-center">Cleanliness</th>
                  <th className="py-4.5 px-4 text-center">Service</th>
                  <th className="py-4.5 px-4 text-center">Room</th>
                  <th className="py-4.5 px-4">Submitted Date</th>
                  <th className="py-4.5 px-4 text-center">Status</th>
                  <th className="py-4.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted text-sm text-[#2a2a2a] bg-white font-medium">
                {paginatedFeedback.map((f) => {
                  return (
                    <tr key={f.id} className="hover:bg-[#fcfcfc]/60 transition-colors group whitespace-nowrap">
                      <td className="py-4 px-6 font-bold text-navy-deep">
                        {f.guest}
                      </td>
                      <td className="py-4 px-4 font-mono text-[11px] text-muted-foreground">
                        #{f.bookingId}
                      </td>
                      <td className="py-4 px-4 font-bold text-brand">
                        Room {f.room}
                      </td>
                      <td className="py-4 px-4 text-muted-foreground">
                        {f.stayDates}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex justify-center"><StarRating rating={f.overall} /></div>
                      </td>
                      <td className="py-4 px-4 text-center font-bold text-navy-deep">{f.cleanliness}/5</td>
                      <td className="py-4 px-4 text-center font-bold text-navy-deep">{f.service}/5</td>
                      <td className="py-4 px-4 text-center font-bold text-navy-deep">{f.roomRating}/5</td>
                      <td className="py-4 px-4 text-muted-foreground">{f.submittedDate}</td>
                      <td className="py-4 px-4 text-center">
                        <Tag tone={f.status === "Responded" ? "success" : "brand"}>
                          {f.status}
                        </Tag>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Button
                          onClick={() => navigate({ to: `/manager/feedback/view/${btoa(f.id)}` })}
                          size="icon"
                          variant="ghost"
                          className="size-7 hover:text-brand cursor-pointer"
                          title="View Feedback details"
                        >
                          <Eye className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Panel */}
            <div className="p-4 border-t border-muted flex items-center justify-between gap-3 text-muted-foreground text-[10px] font-bold select-none">
              <span>Page {currentPage} of {totalPages} (Total: {filteredFeedback.length})</span>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="h-7 w-7 p-0 flex items-center justify-center border-muted cursor-pointer"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="h-7 w-7 p-0 flex items-center justify-center border-muted cursor-pointer"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/manager/feedback")({
  component: ManagerFeedbackPage
});