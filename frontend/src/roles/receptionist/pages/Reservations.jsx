import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { receptionistService } from "@/services/receptionist";
import { toast } from "sonner";
import { 
  Plus, LogIn, LogOut, Calendar, Users, Home, IndianRupee, 
  Clock, AlertTriangle, ClipboardCheck, Search, ChevronRight, X, 
  ShieldAlert, Sparkles, FileText, CheckCircle2, AlertOctagon, HelpCircle,
  CalendarCheck, Trash2, Eye, XCircle, Edit2
} from "lucide-react";

import { subscribeRealtimeSync } from "@/services/socket";

export const Route = createFileRoute("/reception/reservations")({
  head: () => ({
    meta: [
      { title: "Reservations Ledger — Hour Stay" },
      { name: "description", content: "Property guest reservation accounts and booking ledger." }
    ]
  }),
  component: ReservationsPage
});

function ReservationsPage() {
  const navigate = useNavigate();
  const todayStr = "25 Aug 2026";
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRoomType, setFilterRoomType] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState([]);

  const loadReservations = () => {
    setLoading(true);
    receptionistService.getReservations()
      .then(res => {
        if (res.success && res.data) {
          const list = res.data.map(r => {
            const rmNum = r.roomNumber || (r.room ? r.room.split(' ')[0] : 'Unassigned');
            const rmType = r.roomType || (r.room && r.room.includes('·') ? r.room.split('·')[1]?.trim() : 'Standard Room');
            return {
              ...r,
              room: rmNum,
              roomNumber: rmNum,
              roomType: rmType
            };
          });
          setReservations(list);
        }
      })
      .catch(err => console.error("Failed to load reservations ledger:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReservations();
    const interval = setInterval(loadReservations, 10000);
    const handleFocus = () => loadReservations();
    window.addEventListener('focus', handleFocus);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadReservations();
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Selected Reservation details Drawer State
  const [selectedRes, setSelectedRes] = useState(null);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-semibold text-muted-foreground">
        Loading reservations ledger...
      </div>
    );
  }

  // Status config
  const statusMeta = {
    Confirmed: { tone: "success", label: "Confirmed" },
    Pending: { tone: "warning", label: "Pending" },
    "Checked In": { tone: "brand", label: "Checked In" },
    "Checked-in": { tone: "brand", label: "Checked In" },
    "Checked Out": { tone: "success", label: "Checked Out" },
    "Checked-out": { tone: "success", label: "Checked Out" },
    Cancelled: { tone: "neutral", label: "Cancelled" },
    "No Show": { tone: "error", label: "No Show" },
    "No-show": { tone: "error", label: "No Show" }
  };

  // Filter calculations
  const filteredReservations = reservations.filter(r => {
    const nameStr = (r.name || r.guest || "").toLowerCase();
    const idStr = (r.id || r._id || r.bookingId || "").toLowerCase();
    const roomStr = (r.room || r.roomNumber || "").toLowerCase();
    const phoneStr = r.phone || "";
    const query = searchQuery.toLowerCase();

    const matchesSearch = nameStr.includes(query) || idStr.includes(query) || roomStr.includes(query) || phoneStr.includes(query);
    const matchesStatus = filterStatus === "all" || r.status === filterStatus;
    const matchesRoomType = filterRoomType === "all" || r.roomType === filterRoomType;
    const matchesSource = filterSource === "all" || r.source === filterSource;

    return matchesSearch && matchesStatus && matchesRoomType && matchesSource;
  });

  // Action methods
  const handleCheckIn = async (id) => {
    try {
      await receptionistService.updateReservationStatus(id, "Checked-in");
      setReservations(prev => prev.map(r => 
        (r.id === id || r._id === id || r.bookingId === id)
          ? { ...r, status: "Checked-in" } 
          : r
      ));
      if (selectedRes && (selectedRes.id === id || selectedRes._id === id)) {
        setSelectedRes(prev => ({ ...prev, status: "Checked-in" }));
      }
      toast.success("Guest checked in successfully!");
      import('@/services/socket').then(({ socket }) => {
        socket.emit('booking_updated', { id, status: 'Checked-in' });
      });
    } catch (err) {
      console.error("Failed to check in:", err);
      toast.error(err.message || "Failed to check in guest.");
    }
  };

  const handleCheckOut = async (id) => {
    try {
      await receptionistService.updateReservationStatus(id, "Checked-out");
      setReservations(prev => prev.map(r => 
        (r.id === id || r._id === id || r.bookingId === id)
          ? { ...r, status: "Checked-out" } 
          : r
      ));
      if (selectedRes && (selectedRes.id === id || selectedRes._id === id)) {
        setSelectedRes(prev => ({ ...prev, status: "Checked-out" }));
      }
      toast.success("Guest checked out successfully!");
      import('@/services/socket').then(({ socket }) => {
        socket.emit('booking_updated', { id, status: 'Checked-out' });
      });
    } catch (err) {
      console.error("Failed to check out:", err);
      toast.error(err.message || "Failed to check out guest.");
    }
  };

  const handleCancelBooking = async (id) => {
    try {
      await receptionistService.updateReservationStatus(id, "Cancelled");
      setReservations(prev => prev.map(r => 
        (r.id === id || r._id === id || r.bookingId === id)
          ? { 
              ...r, 
              status: "Cancelled", 
              paymentStatus: r.paymentStatus === "Paid" ? "Refunded" : "Cancelled"
            } 
          : r
      ));
      if (selectedRes && (selectedRes.id === id || selectedRes._id === id)) {
        setSelectedRes(prev => ({
          ...prev,
          status: "Cancelled",
          paymentStatus: prev.paymentStatus === "Paid" ? "Refunded" : "Cancelled"
        }));
      }
      toast.success("Booking cancelled successfully!");
    } catch (err) {
      console.error("Failed to cancel booking:", err);
      toast.error(err.message || "Failed to cancel booking.");
    }
  };

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy">
      
      {/* Page header with New Reservation button */}
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild className="bg-navy hover:bg-navy-deep text-white h-9 px-5 text-xs rounded-full font-bold cursor-pointer">
              <Link to="/reception/new-booking">New Reservation</Link>
            </Button>
          </div>
        }
      />

      {/* Controls: Search and Filters */}
      <div className="bg-white border border-muted rounded-2xl p-4 shadow-soft space-y-4">
        
        {/* Row 1: Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search guest name, room #, phone, booking ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>
        </div>

        {/* Row 2: Select Filters */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-muted/50">
          
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider select-none">Booking Status</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer w-full"
            >
              <option value="all">All Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Pending">Pending</option>
              <option value="Checked In">Checked In</option>
              <option value="Checked Out">Checked Out</option>
              <option value="Cancelled">Cancelled</option>
              <option value="No Show">No Show</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider select-none">Room Type</span>
            <select
              value={filterRoomType}
              onChange={(e) => setFilterRoomType(e.target.value)}
              className="px-3 py-1.5 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer w-full"
            >
              <option value="all">All Types</option>
              <option value="Standard Room">Standard Room</option>
              <option value="Deluxe Room">Deluxe Room</option>
              <option value="Deluxe King">Deluxe King</option>
              <option value="Executive Room">Executive Room</option>
              <option value="Villa Suite">Villa Suite</option>
              <option value="Premium Deluxe">Premium Deluxe</option>
              <option value="Enterprise Suite">Enterprise Suite</option>
              <option value="Classic Double">Classic Double</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider select-none">Booking Channel</span>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="px-3 py-1.5 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer w-full"
            >
              <option value="all">All Sources</option>
              <option value="Direct Web">Direct Web</option>
              <option value="Booking.com">Booking.com</option>
              <option value="MakeMyTrip">MakeMyTrip</option>
              <option value="Expedia">Expedia</option>
              <option value="Agoda">Agoda</option>
              <option value="Goibibo">Goibibo</option>
            </select>
          </div>

        </div>
      </div>

      {/* Table Ledger Panel */}
      <Panel title="Reservations Registry ledger" description="Comprehensive guest reservations ledger and booking histories database.">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[950px]">
            <thead>
              <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                <th className="py-3.5 px-4">Booking ID</th>
                <th className="py-3.5 px-4">Guest Details</th>
                <th className="py-3.5 px-4">Allotted Room</th>
                <th className="py-3.5 px-4">Check-in Date</th>
                <th className="py-3.5 px-4">Check-out Date</th>
                <th className="py-3.5 px-4">Pax Capacity</th>
                <th className="py-3.5 px-4">Channel</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/30 whitespace-nowrap">
              {filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-10 text-center font-bold text-muted-foreground select-none">
                    No matching reservations found in ledger database.
                  </td>
                </tr>
              ) : (
                filteredReservations.map((res) => {
                  const meta = statusMeta[res.status] || statusMeta.Pending;
                  return (
                    <tr key={res.id} className="hover:bg-muted/5">
                      <td className="py-3.5 px-4 font-mono font-bold text-navy-deep">{res.id}</td>
                      <td className="py-3.5 px-4 font-bold text-navy">
                        <div>
                          <p>{res.name}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold">{res.phone}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold">{res.roomType}</span>
                        <span className="text-[10px] text-muted-foreground block font-bold">Room #{res.room}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-navy">{res.checkIn}</td>
                      <td className="py-3.5 px-4 font-semibold text-navy">{res.checkOut}</td>
                      <td className="py-3.5 px-4 text-navy">
                        <p className="font-bold">{res.nights}</p>
                        <p className="text-[10px] text-muted-foreground font-bold">{res.pax}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <Tag tone="brand">{res.source}</Tag>
                      </td>
                      <td className="py-3.5 px-4 font-semibold">
                        <Tag tone={res.paymentStatus === "Paid" ? "success" : res.paymentStatus === "Pending" ? "error" : "neutral"}>
                          {res.paymentStatus}
                        </Tag>
                      </td>
                      <td className="py-3.5 px-4">
                        <Tag tone={meta.tone}>{meta.label}</Tag>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 whitespace-nowrap select-none">
                          {/* Check-In Button -> inline status update without navigating away */}
                          {(res.status === "Pending" || res.status === "Confirmed") && (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleCheckIn(res.id || res._id)}
                              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 h-7 px-2.5 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
                            >
                              Check-In
                            </Button>
                          )}

                          {/* Check-Out Button -> enabled as soon as status is Checked-in */}
                          {(res.status === "Checked In" || res.status === "Checked-in") && (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleCheckOut(res.id || res._id)}
                              className="text-navy border-navy/30 hover:bg-navy/5 h-7 px-2.5 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
                            >
                              Check-Out
                            </Button>
                          )}

                          {/* Completed indicator for Checked-out stays */}
                          {(res.status === "Checked Out" || res.status === "Checked-out") && (
                            <span className="text-[11px] font-bold text-slate-400 px-1.5 py-0.5">
                              Completed
                            </span>
                          )}

                          {/* View Details Icon Button */}
                          <Button
                            asChild
                            size="icon"
                            variant="ghost"
                            className="size-7 text-navy/70 hover:text-brand hover:bg-brand/10 rounded-lg cursor-pointer transition-colors"
                            title="View Reservation Details"
                          >
                            <Link to={`/reception/reservations/${res.id || res._id}`}>
                              <Eye className="size-3.5" />
                            </Link>
                          </Button>

                          {/* Cancel Icon Button */}
                          {res.status !== "Checked Out" && res.status !== "Checked-out" && res.status !== "Cancelled" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleCancelBooking(res.id || res._id)}
                              className="size-7 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                              title="Cancel Booking"
                            >
                              <XCircle className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}