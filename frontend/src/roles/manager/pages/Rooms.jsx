import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Notice, LoadingRows, Tag, ActionGroup, ViewActionButton, EditActionButton, AssignActionButton } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/hs/FormFields";
import { managerService } from "@/services/manager";
import { authService } from "@/services/auth";
import { toast } from "sonner";
import { subscribeRealtimeSync } from "@/services/socket";
import { extractRoomNumber, calculateRoomKPIs, normalizeRoomList } from "@/utils/roomUtils";
import {
  Bed,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Sparkles,
  Lock,
  Search,
  Eye,
  Edit2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Layers,
  Wrench,
  Ban
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

function ManagerRoomsPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [property, setProperty] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [floorFilter, setFloorFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  async function loadData(isSilent = false) {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const user = authService.getCurrentUser();
      setCurrentUser(user);

      if (!user || user.role !== "manager") {
        setIsAuthorized(false);
        if (!isSilent) setLoading(false);
        return;
      }

      const [propRes, resRes, roomsRes] = await Promise.all([
        managerService.getProperty(),
        managerService.getReservations(),
        managerService.getRooms()
      ]);

      if (propRes.success && propRes.data) {
        setProperty(propRes.data);
      }

      if (resRes.success && resRes.data) {
        setBookings(resRes.data);
      }

      let dbRooms = (roomsRes.success && roomsRes.data) ? roomsRes.data : [];

      if (dbRooms.length === 0) {
        // Fallback merge room types assigned room numbers from MongoDB property settings & localStorage
        const settingsTypes = propRes?.data?.settings?.roomTypes || [];
        let savedTypes = [];
        try {
          const saved = localStorage.getItem("hms_room_types_list_v2");
          if (saved) savedTypes = JSON.parse(saved);
        } catch (e) {}

        const allTypes = [...settingsTypes, ...savedTypes];
        const existingRoomNums = new Set(dbRooms.map(r => String(r.roomNumber || r.room)));

        allTypes.forEach(t => {
          const assigned = Array.isArray(t.rooms) ? t.rooms : [];
          assigned.forEach(num => {
            if (num && !existingRoomNums.has(String(num))) {
              existingRoomNums.add(String(num));
              dbRooms.push({
                _id: `R-${num}`,
                roomNumber: String(num),
                room: String(num),
                category: t.category,
                roomType: t.category,
                floor: `Floor ${String(num)[0] || '1'}`,
                status: "Available",
                baseRate: t.baseRate || 3500
              });
            }
          });
        });
      }

      setRooms(dbRooms);
    } catch (err) {
      if (!isSilent) setError(err.message || "Failed to load rooms dataset");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }

  useEffect(() => {
    loadData(false);

    const interval = setInterval(() => {
      loadData(true);
    }, 10000); // 10s poll fallback

    const handleFocus = () => loadData(true);
    window.addEventListener("focus", handleFocus);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadData(true);
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Set manual operational status override via backend API
  const handleOverrideStatus = async (roomNumber, newStatus) => {
    try {
      const res = await managerService.updateRoomStatus(roomNumber, newStatus);
      if (res.success) {
        toast.success(`Room ${roomNumber} operational status changed to ${newStatus}`);
        loadData();
      }
    } catch (err) {
      toast.error(err.message || "Failed to update room status");
    }
  };

  // Compile full Rooms array with dynamic MongoDB status and booking data
  const roomBookingMap = new Map();

  for (const b of bookings) {
    if (b.status === "Cancelled" || b.status === "Checked-out" || b.status === "No-show") continue;
    const bRoomNum = extractRoomNumber(b);
    let matchedRm = null;

    if (b.roomId) {
      matchedRm = rooms.find(r => String(r._id || r.id) === String(b.roomId) || String(r.roomNumber || r.room).trim() === String(b.roomId).trim());
    }
    if (!matchedRm && bRoomNum) {
      matchedRm = rooms.find(r => extractRoomNumber(r) === bRoomNum || String(r.roomNumber || r.room).trim() === bRoomNum);
    }
    if (!matchedRm && b.room) {
      matchedRm = rooms.find(r => String(b.room).includes(String(r.roomNumber || r.room)));
    }

    if (matchedRm) {
      const k1 = String(matchedRm._id || matchedRm.id || '');
      const k2 = String(matchedRm.roomNumber || matchedRm.room || '');
      const k3 = extractRoomNumber(matchedRm);
      if (k1) roomBookingMap.set(k1, b);
      if (k2) roomBookingMap.set(k2, b);
      if (k3) roomBookingMap.set(k3, b);
    }
  }

  const normalizedRooms = normalizeRoomList(rooms, bookings);

  const compiledRooms = normalizedRooms.map(r => {
    const k1 = String(r._id || r.id || '');
    const k2 = String(r.roomNumber || r.room || '');
    const k3 = extractRoomNumber(r);
    const activeBooking = roomBookingMap.get(k1) || roomBookingMap.get(k2) || roomBookingMap.get(k3);

    let currentStatus = r.status || "Available";
    if (activeBooking && (activeBooking.status === "Checked-in" || activeBooking.status === "Checked In" || activeBooking.status === "Staying")) {
      currentStatus = "Occupied";
    } else if (activeBooking && (activeBooking.status === "Confirmed" || activeBooking.status === "Paid" || activeBooking.status === "Pending" || activeBooking.status === "Pre-checked")) {
      currentStatus = "Reserved";
    }

    return {
      _id: r._id || r.id,
      room: extractRoomNumber(r) || r.roomNumber || r.room,
      roomType: r.category || r.roomType || "Standard Room",
      floor: r.floor || `Floor ${String(r.roomNumber || r.room || '1')[0]}`,
      activeBooking: activeBooking ? {
        id: activeBooking.bookingId || activeBooking._id || activeBooking.id,
        _id: activeBooking._id || activeBooking.id || activeBooking.bookingId,
        guest: activeBooking.guest || activeBooking.guestName || "Guest",
        checkIn: activeBooking.checkIn || activeBooking.checkInDate || "—",
        checkOut: activeBooking.checkOut || activeBooking.checkOutDate || "—",
        status: activeBooking.status || "Confirmed"
      } : null,
      status: currentStatus
    };
  });

  // Statistics Computations
  const roomKPIs = calculateRoomKPIs(compiledRooms, bookings);
  const totalCount = roomKPIs.totalRooms;
  const availableCount = roomKPIs.availableRooms;
  const occupiedCount = roomKPIs.occupiedRooms;
  const dirtyCount = roomKPIs.dirtyRooms;
  const cleaningCount = roomKPIs.cleaningRooms;
  const oooCount = roomKPIs.outOfOrderRooms;
  const blockedCount = compiledRooms.filter(r => r.status === "Blocked").length;

  // Filter Computations
  const filteredRooms = compiledRooms.filter(rm => {
    const matchesSearch =
      rm.room.includes(searchQuery) ||
      rm.roomType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rm.activeBooking?.guest || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFloor = floorFilter === "all" || rm.floor === floorFilter;
    const matchesType = typeFilter === "all" || rm.roomType === typeFilter;
    const matchesStatus = statusFilter === "all" || rm.status === statusFilter;

    return matchesSearch && matchesFloor && matchesType && matchesStatus;
  });

  // Pagination computations
  const totalPages = Math.ceil(filteredRooms.length / itemsPerPage) || 1;
  const paginatedRooms = filteredRooms.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Status mapping constants
  const statusMeta = {
    Available: { tone: "success", icon: CheckCircle, label: "Available", color: "#10b981" },
    Reserved: { tone: "info", icon: Sparkles, label: "Reserved", color: "#0284c7" },
    Occupied: { tone: "brand", icon: Bed, label: "Occupied", color: "#0d1b2a" },
    Dirty: { tone: "warning", icon: AlertTriangle, label: "Dirty", color: "#f59e0b" },
    Cleaning: { tone: "purple", icon: Sparkles, label: "Cleaning", color: "#8b5cf6" },
    "Out of Order": { tone: "error", icon: XCircle, label: "Out of Order", color: "#ef4444" },
    Blocked: { tone: "neutral", icon: Lock, label: "Blocked", color: "#6b7280" }
  };

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
        <PageHeader title="Rooms Console" subtitle="Loading scoped property room configurations..." />
        <LoadingRows rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Summary Stat Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PremiumStatCard label="Total Rooms" value={totalCount.toString()} hint="Assigned property capacity" accentColor="#0d1b2a" />
        <PremiumStatCard label="Available" value={availableCount.toString()} hint="Clean & vacant" accentColor="#10b981" />
        <PremiumStatCard label="Occupied" value={occupiedCount.toString()} hint="In-house guests stays" accentColor="#0d1b2a" />
        <PremiumStatCard label="Reserved" value={compiledRooms.filter(r => r.status === "Reserved" || r.status === "Blocked").length.toString()} hint="Upcoming & blocked allocations" accentColor="#3b82f6" />
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-muted rounded-xl p-4 shadow-soft space-y-3.5">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by Room #, Room Type, or Guest Name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9 text-xs font-semibold bg-cream/10 border-muted w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3.5 border-t border-muted/50">
          <div className="flex flex-col gap-1.5 text-left">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">Floor Designation</span>
            <Select
              value={floorFilter}
              onChange={(e) => { setFloorFilter(e.target.value); setCurrentPage(1); }}
              className="text-xs h-9 font-semibold bg-[#FDFCFA]/20 border-muted"
            >
              <option value="all">All Floors</option>
              <option value="Floor 1">Floor 1</option>
              <option value="Floor 2">Floor 2</option>
              <option value="Floor 3">Floor 3</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">Room Category</span>
            <Select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="text-xs h-9 font-semibold bg-[#FDFCFA]/20 border-muted"
            >
              <option value="all">All Room Types</option>
              <option value="Standard Room">Standard Room</option>
              <option value="Deluxe Room">Deluxe Room</option>
              <option value="Executive Room">Executive Room</option>
              <option value="Villa Suite">Villa Suite</option>
              <option value="Presidential Suite">Presidential Suite</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5 text-left">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">Room Status</span>
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="text-xs h-9 font-semibold bg-[#FDFCFA]/20 border-muted"
            >
              <option value="all">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
              <option value="Dirty">Dirty</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Out of Order">Out of Order</option>
              <option value="Blocked">Blocked</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Rooms Table */}
      <div className="bg-white border border-muted rounded-xl shadow-soft overflow-hidden">
        {paginatedRooms.length === 0 ? (
          <div className="p-16 text-center">
            <Bed className="size-12 text-muted-foreground/45 mx-auto mb-3" />
            <h3 className="font-semibold text-navy">No rooms matching search filters</h3>
            <p className="text-xs text-muted-foreground mt-1">Try updating filter configurations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[1050px]">
              <thead>
                <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none whitespace-nowrap">
                  <th className="py-4.5 px-6 text-left">Room Number</th>
                  <th className="py-4.5 px-4 text-left">Room Type</th>
                  <th className="py-4.5 px-4 text-left">Floor</th>
                  <th className="py-4.5 px-4 text-left">Current Status</th>
                  <th className="py-4.5 px-4 text-left">Guest Name</th>
                  <th className="py-4.5 px-4 text-left">Check-In</th>
                  <th className="py-4.5 px-4 text-left">Check-Out</th>
                  <th className="py-4.5 px-4 text-left">Current Booking</th>
                  <th className="py-4.5 px-4 text-left min-w-[170px] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted text-sm text-[#2a2a2a] bg-white font-medium whitespace-nowrap">
                {paginatedRooms.map((rm) => {
                  const meta = statusMeta[rm.status] || statusMeta.Available;
                  const StatusIcon = meta.icon;
                  const active = rm.activeBooking;

                  return (
                    <tr key={rm.room} className="hover:bg-[#fcfcfc]/60 transition-colors group">
                      <td className="py-4 px-6 text-left font-bold text-navy-deep text-sm">
                        Room {rm.room}
                      </td>
                      <td className="py-4 px-4 text-left font-bold text-brand">
                        {rm.roomType}
                      </td>
                      <td className="py-4 px-4 text-left text-muted-foreground">
                        {rm.floor}
                      </td>
                      <td className="py-4 px-4 text-left">
                        <Tag tone={meta.tone} className="flex items-center gap-1 w-fit select-none">
                          <StatusIcon className="size-3" />
                          <span>{meta.label}</span>
                        </Tag>
                      </td>
                      <td className="py-4 px-4 text-left font-semibold text-navy">
                        {active ? active.guest : <span className="text-muted-foreground/45">—</span>}
                      </td>
                      <td className="py-4 px-4 text-left text-muted-foreground">
                        {active ? active.checkIn : <span className="text-muted-foreground/45">—</span>}
                      </td>
                      <td className="py-4 px-4 text-left text-muted-foreground">
                        {active ? active.checkOut : <span className="text-muted-foreground/45">—</span>}
                      </td>
                      <td className="py-4 px-4 text-left font-mono text-[11px] text-muted-foreground">
                        {active ? (
                          <Link
                            to={`/manager/reservations/view/${active._id || active.id}`}
                            className="text-brand hover:underline font-bold"
                          >
                            #{active._id || active.id}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground/45">—</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-left align-middle whitespace-nowrap min-w-[170px]">
                        <ActionGroup align="left">
                          {active && (
                            <>
                              <ViewActionButton
                                onClick={() => navigate({ to: `/manager/reservations/view/${active._id || active.id}` })}
                                title="View Stay Details"
                              />
                              <EditActionButton
                                onClick={() => navigate({ to: `/manager/reservations/edit/${active._id || active.id}` })}
                                title="Reassign Room / Modify Booking"
                              />
                            </>
                          )}
                          {!active && (
                            <AssignActionButton
                              disabled={rm.status === "Occupied"}
                              onClick={() => navigate({ to: `/manager/reservations` })}
                              label="Assign Guest"
                            />
                          )}
                        </ActionGroup>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Panel */}
            <div className="p-4 border-t border-muted flex items-center justify-between gap-3 text-muted-foreground text-[10px] font-bold select-none">
              <span>Page {currentPage} of {totalPages} (Total: {filteredRooms.length})</span>
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

export const Route = createFileRoute("/manager/rooms")({
  component: ManagerRoomsPage
});
