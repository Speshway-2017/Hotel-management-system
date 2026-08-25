import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { receptionistService } from "@/services/receptionist";
import { 
  Plus, LogIn, LogOut, Calendar, Users, Home, IndianRupee, 
  Clock, AlertTriangle, ClipboardCheck, Search, ChevronRight, X, 
  ShieldAlert, Sparkles, FileText, CheckCircle2, AlertOctagon, HelpCircle,
  CalendarCheck, Trash2
} from "lucide-react";

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
          setReservations(res.data);
        }
      })
      .catch(err => console.error("Failed to load reservations ledger:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReservations();
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
    "Checked Out": { tone: "success", label: "Checked Out" },
    Cancelled: { tone: "neutral", label: "Cancelled" },
    "No Show": { tone: "error", label: "No Show" }
  };

  // Filter calculations
  const filteredReservations = reservations.filter(r => {
    const matchesSearch = 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.room.includes(searchQuery) ||
      r.phone.includes(searchQuery);

    const matchesStatus = filterStatus === "all" || r.status === filterStatus;
    const matchesRoomType = filterRoomType === "all" || r.roomType === filterRoomType;
    const matchesSource = filterSource === "all" || r.source === filterSource;

    return matchesSearch && matchesStatus && matchesRoomType && matchesSource;
  });

  // Action methods
  const handleCancelBooking = (id) => {
    setReservations(prev => prev.map(r => 
      r.id === id 
        ? { 
            ...r, 
            status: "Cancelled", 
            paymentStatus: r.paymentStatus === "Paid" ? "Refunded" : "Cancelled",
            timeline: [
              ...r.timeline,
              { time: "25 Aug, 14:58", action: "Reservation manually cancelled by Front Desk staff." }
            ] 
          } 
        : r
    ));
    if (selectedRes && selectedRes.id === id) {
      setSelectedRes(prev => ({
        ...prev,
        status: "Cancelled",
        paymentStatus: prev.paymentStatus === "Paid" ? "Refunded" : "Cancelled",
        timeline: [
          ...prev.timeline,
          { time: "25 Aug, 14:58", action: "Reservation manually cancelled by Front Desk staff." }
        ]
      }));
    }
    alert("Booking cancelled successfully!");
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
                        <div className="flex items-center gap-1.5">
                          
                          <Button
                            asChild
                            className="bg-emerald-600 hover:bg-emerald-700 !text-white h-7 px-3.5 text-[10px] rounded-lg font-bold cursor-pointer transition-all shadow-sm"
                          >
                            <Link to={`/reception/reservations/${res.id}`}>Details</Link>
                          </Button>

                          {res.status === "Pending" || res.status === "Confirmed" ? (
                            <>
                              <Button
                                asChild
                                className="bg-navy hover:bg-navy-deep text-white h-7 px-3 text-[10px] rounded-lg font-bold cursor-pointer"
                              >
                                <Link to={`/reception/check-in/${res.id}`}>Check In</Link>
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => handleCancelBooking(res.id)}
                                className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 h-7 px-2 text-[10px] font-bold rounded-lg cursor-pointer"
                              >
                                Cancel
                              </Button>
                            </>
                          ) : res.status === "Checked In" ? (
                            <Button
                              asChild
                              className="bg-amber-600 hover:bg-amber-700 !text-white h-7 px-3 text-[10px] rounded-lg font-bold cursor-pointer"
                            >
                              <Link to={`/reception/check-out/${res.id}`}>Check Out</Link>
                            </Button>
                          ) : null}

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