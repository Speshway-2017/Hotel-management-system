import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Panel, Notice, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Users,
  Building,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  FileText,
  UserCheck,
  CheckCircle
} from "lucide-react";
import { authService } from "@/services/auth";
import { superAdminService } from "@/services/superAdmin";

// Premium stat card component
function PremiumStatCard({ label, value, delta = 4, hint, icon: Icon, accentColor = "#0d1b2a" }) {
  const isPositive = delta >= 0;
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[120px] h-full"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="h-8 flex items-start">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
          </div>
          <h3 className="mt-1.5 font-display text-lg font-black text-navy leading-none whitespace-nowrap">{value}</h3>
        </div>
        {Icon && (
          <span className="grid size-8 place-items-center rounded-lg bg-muted/65 text-navy-deep shrink-0 ml-3">
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <div className="mt-auto pt-2 flex items-center gap-1.5 text-[10px] h-4">
        <span className={`inline-flex items-center gap-0.5 font-bold shrink-0 ${isPositive ? "text-success" : "text-destructive"}`}>
          {isPositive ? "+" : ""}{delta}%
        </span>
        {hint && <span className="text-[10px] text-muted-foreground truncate">{hint}</span>}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/manager/operations")({
  head: () => ({
    meta: [
      { title: "Today's Operations — Hour Stay" },
      { name: "description", content: "Property check-ins, check-outs, room readiness, and operational exceptions." }
    ]
  }),
  component: ManagerOperationsPage
});

function ManagerOperationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [property, setProperty] = useState(null);
  const [reservations, setReservations] = useState([]);
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("arrivals"); // 'arrivals' | 'departures' | 'stays' | 'pending-in' | 'pending-out'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Selected reservation for Actions Modal
  const [selectedRes, setSelectedRes] = useState(null);
  const [assignRoomNum, setAssignRoomNum] = useState("");
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);

  // Load backend data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);

      const [propRes, resRes] = await Promise.all([
        superAdminService.getProperties(),
        superAdminService.getReservations()
      ]);

      if (propRes.success && propRes.data) {
        const found = propRes.data.find(p => p._id === currentUser.propertyId || p.id === currentUser.propertyId);
        setProperty(found || propRes.data[0]);
      }

      if (resRes.success && resRes.data) {
        // Filter reservations scoped to the manager's assigned property
        const scoped = resRes.data.filter(r => r.propertyId === currentUser.propertyId || r.property === currentUser.propertyId);
        setReservations(scoped);
      }
    } catch (err) {
      setError(err.message || "Failed to load operational datasets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Action Handlers
  const handleAssignRoom = async (resId) => {
    if (!assignRoomNum.trim()) {
      alert("Please specify a valid room number");
      return;
    }
    try {
      await superAdminService.updateReservation(resId, { room: assignRoomNum });
      setIsActionModalOpen(false);
      loadData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleStatusUpdate = async (resId, newStatus) => {
    try {
      await superAdminService.updateReservation(resId, { status: newStatus });
      setIsActionModalOpen(false);
      loadData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleException = async (resId, exceptionType) => {
    const notes = exceptionType === "No-Show" ? "Marked as no-show by GM" : "Late checkout request processed";
    try {
      await superAdminService.updateReservation(resId, { status: exceptionType === "No-Show" ? "Cancelled" : "Checked-in", notes });
      setIsActionModalOpen(false);
      loadData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Calculations for Today's Stats (Scoped to property)
  const todayStr = "2026-08-21"; // Standardized operational date corresponding to the current state

  const arrivalsToday = reservations.filter(r => r.checkIn === todayStr);
  const departuresToday = reservations.filter(r => r.checkOut === todayStr);
  const currentStays = reservations.filter(r => r.status === "Checked-in");
  const pendingCheckins = arrivalsToday.filter(r => r.status === "Confirmed" || r.status === "Pending");
  const pendingCheckouts = departuresToday.filter(r => r.status === "Checked-in");
  const totalRoomsCount = property?.rooms || 45;
  const availableRoomsCount = Math.max(0, totalRoomsCount - currentStays.length);

  // Tab Filtering logic
  const getTabFilteredData = () => {
    switch (activeTab) {
      case "arrivals":
        return arrivalsToday;
      case "departures":
        return departuresToday;
      case "stays":
        return currentStays;
      case "pending-in":
        return pendingCheckins;
      case "pending-out":
        return pendingCheckouts;
      default:
        return reservations;
    }
  };

  // Search & Secondary Filtering
  const getSearchedAndFilteredData = () => {
    return getTabFilteredData().filter(r => {
      const guestName = r.guest || "";
      const bookingId = r._id || r.id || "";
      const roomNum = r.room || "";
      const matchesSearch = 
        guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bookingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        roomNum.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesSource = sourceFilter === "all" || r.source === sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;
    });
  };

  const processedData = getSearchedAndFilteredData();

  // Pagination calculations
  const totalPages = Math.ceil(processedData.length / itemsPerPage) || 1;
  const paginatedData = processedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 text-left animate-fade-in relative">
      {/* Page Notification banner */}
      {error && (
        <Notice tone="error" title="Operational Sync Failure">
          {error}
        </Notice>
      )}

      {/* High-Level KPI Summary Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-6">
        <div>
          <PremiumStatCard label="Today's Arrivals" value={arrivalsToday.length.toString()} hint="Today's bookings" icon={Calendar} accentColor="#FF7A59" />
        </div>
        <div>
          <PremiumStatCard label="Today's Departures" value={departuresToday.length.toString()} hint="Today's check-outs" icon={Calendar} accentColor="#5B21B6" />
        </div>
        <div>
          <PremiumStatCard label="Current Stays" value={currentStays.length.toString()} hint="Active check-ins" icon={Users} accentColor="#2E7D32" />
        </div>
        <div>
          <PremiumStatCard label="Pending Check-ins" value={pendingCheckins.length.toString()} hint="Awaiting check-in" icon={Clock} accentColor="#F5C06A" />
        </div>
        <div>
          <PremiumStatCard label="Pending Check-outs" value={pendingCheckouts.length.toString()} hint="Awaiting check-out" icon={Clock} accentColor="#FF6B8B" />
        </div>
        <div>
          <PremiumStatCard label="Available Rooms" value={availableRoomsCount.toString()} hint={`Total: ${totalRoomsCount} rooms`} icon={Building} accentColor="#0d1b2a" />
        </div>
      </div>

      {/* Advanced Full Width Search & Filter Toolbar */}
      <div className="flex flex-col gap-4 bg-white border border-muted p-4 rounded-2xl shadow-soft">
        <div className="flex flex-col md:flex-row items-center justify-start gap-3">
          {/* Tabs */}
          <div className="flex gap-1 bg-muted/30 p-1 rounded-full border border-muted/50 select-none overflow-x-auto scrollbar-none w-full md:w-auto">
            {[
              { label: "Arrivals", key: "arrivals", count: arrivalsToday.length },
              { label: "Departures", key: "departures", count: departuresToday.length },
              { label: "In-House", key: "stays", count: currentStays.length },
              { label: "Pending In", key: "pending-in", count: pendingCheckins.length },
              { label: "Pending Out", key: "pending-out", count: pendingCheckouts.length }
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setActiveTab(t.key);
                  setCurrentPage(1);
                }}
                className={`px-4 py-1.5 rounded-full text-[10px] font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap flex-1 md:flex-none ${
                  activeTab === t.key
                    ? "bg-navy text-white shadow-sm"
                    : "text-muted-foreground hover:text-navy hover:bg-white/50"
                }`}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>
        </div>

        {/* Sub filters */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-muted/50 text-[10px] font-semibold text-muted-foreground">
          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search guest name, room number, or booking reference..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-8 text-[10px] font-semibold bg-cream/10 border-muted w-full"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span>Payment Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="bg-muted/40 border border-muted/50 rounded-md py-1 px-2.5 text-[10px] text-navy font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">All statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Checked-in">Checked-in</option>
              <option value="Checked-out">Checked-out</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Booking Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setCurrentPage(1); }}
              className="bg-muted/40 border border-muted/50 rounded-md py-1 px-2.5 text-[10px] text-navy font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">All Sources</option>
              <option value="Direct">Direct</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Booking.com">Booking.com</option>
              <option value="MakeMyTrip">MakeMyTrip</option>
              <option value="Agoda">Agoda</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Split Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Live Movement Feed Table */}
        <div className="lg:col-span-2 space-y-6">

          {/* Operational Ledger Table */}
          <Panel title="Operations Movement Log" description={`Displaying movement matching tab ${activeTab.toUpperCase()}`}>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground p-6">
                Synchronizing operational datasets...
              </div>
            ) : paginatedData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground p-6">
                No active bookings matching query filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/20 border-b border-muted text-[10px] uppercase font-bold text-muted-foreground select-none">
                      <th className="p-3">Guest / ID</th>
                      <th className="p-3">Room / Category</th>
                      <th className="p-3">Schedule</th>
                      <th className="p-3 text-center">Pax</th>
                      <th className="p-3">Source</th>
                      <th className="p-3">Payment</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted/45 font-medium text-navy bg-white">
                    {paginatedData.map((r) => (
                      <tr key={r._id || r.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-3 min-w-[120px]">
                          <div className="font-bold text-navy-deep">{r.guest}</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5">#{r._id || r.id}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-brand">{r.room ? `Room ${r.room}` : "Not Assigned"}</div>
                          <div className="text-[9px] text-muted-foreground mt-0.5">{r.roomType || "Standard Suite"}</div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <span>{r.checkIn}</span>
                            <ArrowRight className="size-3 text-muted-foreground" />
                            <span>{r.checkOut}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center font-bold text-muted-foreground">
                          {r.guests || 2}
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] bg-muted/40 font-bold px-2 py-0.5 rounded-full text-navy-deep">{r.source || "Direct"}</span>
                        </td>
                        <td className="p-3">
                          <Tag tone={r.paymentStatus === "Paid" ? "success" : r.paymentStatus === "Partial" ? "warning" : "error"}>
                            {r.paymentStatus || "Pending"}
                          </Tag>
                        </td>
                        <td className="p-3">
                          <Tag tone={r.status === "Checked-in" || r.status === "Checked-out" ? "success" : r.status === "Cancelled" ? "error" : "brand"}>
                            {r.status || "Confirmed"}
                          </Tag>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            onClick={() => {
                              setSelectedRes(r);
                              setAssignRoomNum(r.room || "");
                              setIsActionModalOpen(true);
                            }}
                            className="bg-navy hover:bg-navy-deep text-white text-[10px] font-bold h-7 rounded-md cursor-pointer px-3"
                          >
                            Manage
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                <div className="p-4 border-t border-muted flex items-center justify-between gap-3 text-muted-foreground text-[10px] font-bold">
                  <span>Page {currentPage} of {totalPages}</span>
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
          </Panel>

        </div>

        {/* Right Column: Operational Exceptions */}
        <div className="lg:col-span-1">
          
          {/* Exceptions & Alerts */}
          <Panel title="Operational Exceptions" description="Exceptions requiring GM override">
            <div className="p-4 space-y-3.5">
              
              {reservations.filter(r => !r.room).length > 0 && (
                <div className="bg-warning/5 border border-warning/15 p-3.5 rounded-xl flex items-start gap-3">
                  <AlertCircle className="size-4 text-warning shrink-0 mt-0.5" />
                  <div className="text-xs text-navy leading-relaxed">
                    <p className="font-bold text-navy-deep">Unassigned Rooms</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {reservations.filter(r => !r.room).length} upcoming arrivals do not have rooms allotted.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-indigo/5 border border-indigo/15 p-3.5 rounded-xl flex items-start gap-3">
                <Clock className="size-4 text-indigo shrink-0 mt-0.5" />
                <div className="text-xs text-navy leading-relaxed">
                  <p className="font-bold text-navy-deep">Early Check-in Requests</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Karan Malhotra requested check-in at 10:00 AM (Maharaja Suite 302). Room clean: Ready.
                  </p>
                </div>
              </div>

              <div className="bg-pink/5 border border-pink/15 p-3.5 rounded-xl flex items-start gap-3">
                <AlertCircle className="size-4 text-pink shrink-0 mt-0.5" />
                <div className="text-xs text-navy leading-relaxed">
                  <p className="font-bold text-navy-deep">Overdue Check-outs</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    No active overstays flagged for the current checkout shift.
                  </p>
                </div>
              </div>

            </div>
          </Panel>

        </div>

      </div>

      {/* Actions Dialog Modal Overlay */}
      {isActionModalOpen && selectedRes && (
        <div className="fixed inset-0 bg-[#071420]/75 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-muted shadow-lift w-full max-w-md overflow-hidden animate-scale-up text-left">
            
            {/* Modal Header */}
            <div className="bg-navy p-5 text-white flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold">Manage Operational Check</h3>
                <p className="text-[10px] text-[#A5F3FC] font-semibold mt-1">Guest: {selectedRes.guest} · Booking #{selectedRes._id || selectedRes.id}</p>
              </div>
              <button
                onClick={() => setIsActionModalOpen(false)}
                className="text-white/60 hover:text-white cursor-pointer text-xs"
              >
                ✕ Close
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 text-xs text-navy">
              
              {/* Room Assignment section */}
              <div className="space-y-2">
                <Label htmlFor="modal-room-assign" className="text-navy font-bold">Assign / Reassign Room</Label>
                <div className="flex gap-2">
                  <Input
                    id="modal-room-assign"
                    placeholder="E.g. 302"
                    value={assignRoomNum}
                    onChange={(e) => setAssignRoomNum(e.target.value)}
                    className="h-9 text-xs font-semibold text-navy bg-cream/10 border-muted"
                  />
                  <Button
                    onClick={() => handleAssignRoom(selectedRes._id || selectedRes.id)}
                    className="bg-brand hover:bg-brand/90 text-white font-bold h-9 px-4 rounded-md cursor-pointer shrink-0"
                  >
                    Assign
                  </Button>
                </div>
              </div>

              {/* Status Update section */}
              <div className="space-y-2 pt-2 border-t border-muted/50">
                <span className="font-bold text-navy block">Approve Check-in / Out Status</span>
                <div className="flex flex-wrap gap-2">
                  {selectedRes.status === "Confirmed" && (
                    <Button
                      onClick={() => handleStatusUpdate(selectedRes._id || selectedRes.id, "Checked-in")}
                      className="bg-success hover:bg-success/90 text-white font-bold h-9 px-4 rounded-md cursor-pointer flex items-center gap-1.5"
                    >
                      <UserCheck className="size-4" /> Check In
                    </Button>
                  )}
                  {selectedRes.status === "Checked-in" && (
                    <Button
                      onClick={() => handleStatusUpdate(selectedRes._id || selectedRes.id, "Checked-out")}
                      className="bg-indigo hover:bg-indigo/90 text-white font-bold h-9 px-4 rounded-md cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle className="size-4" /> Check Out
                    </Button>
                  )}
                  <Button
                    onClick={() => handleStatusUpdate(selectedRes._id || selectedRes.id, "Cancelled")}
                    variant="destructive"
                    className="font-bold h-9 px-4 rounded-md cursor-pointer"
                  >
                    Void Stay
                  </Button>
                </div>
              </div>

              {/* Exception overrides section */}
              <div className="space-y-2 pt-2 border-t border-muted/50">
                <span className="font-bold text-navy block font-ui">Handle Exception Override</span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => handleException(selectedRes._id || selectedRes.id, "No-Show")}
                    variant="outline"
                    className="border-muted text-destructive hover:bg-destructive/5 font-bold h-9 px-4 rounded-md cursor-pointer"
                  >
                    No-Show Void
                  </Button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}