import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Panel, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { receptionistService } from "@/services/receptionist";
import { toast } from "sonner";
import { subscribeRealtimeSync } from "@/services/socket";
import { 
  Plus, LogIn, LogOut, Calendar, Users, Home, IndianRupee, 
  Clock, AlertTriangle, ClipboardCheck, Search, ChevronRight, X, 
  ShieldAlert, Sparkles, FileText, CheckCircle2, AlertOctagon, HelpCircle,
  Wrench, ShieldClose, Info
} from "lucide-react";

export const Route = createFileRoute("/reception/room-assignment")({
  head: () => ({
    meta: [
      { title: "Room Status Grid — Hour Stay" },
      { name: "description", content: "Property room status, clean/dirty indicator, and occupancy racks." }
    ]
  }),
  component: RoomStatusPage
});

function RoomStatusPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [floorFilter, setFloorFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [housekeepingFilter, setHousekeepingFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);

  const loadRooms = (isSilent = false) => {
    if (!isSilent) setLoading(true);
    receptionistService.getRooms()
      .then(res => {
        if (res.success && res.data) {
          setRooms(res.data);
        }
      })
      .catch(err => console.error("Failed to load property rooms status:", err))
      .finally(() => {
        if (!isSilent) setLoading(false);
      });
  };

  useEffect(() => {
    loadRooms(false);

    const interval = setInterval(() => {
      loadRooms(true);
    }, 10000);
    const handleFocus = () => loadRooms(true);
    window.addEventListener('focus', handleFocus);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadRooms(true);
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Selected Room Details Modal
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Status mapping UI config
  const statusMeta = {
    Available: { tone: "success", label: "Available", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    Occupied: { tone: "brand", label: "Occupied", color: "text-indigo bg-indigo-light/20 border-indigo/20" },
    Reserved: { tone: "info", label: "Reserved", color: "text-sky-700 bg-sky-50 border-sky-200" },
    "Out of Order": { tone: "error", label: "Out of Order", color: "text-red-700 bg-red-50 border-red-200" },
    "Out of Service": { tone: "neutral", label: "Out of Service", color: "text-slate-700 bg-slate-50 border-slate-200" }
  };

  const housekeepingMeta = {
    Clean: { tone: "success", label: "Clean", color: "text-emerald-600 bg-emerald-50/50" },
    Dirty: { tone: "error", label: "Dirty", color: "text-rose-600 bg-rose-50/50" },
    Inspected: { tone: "info", label: "Inspected", color: "text-blue-600 bg-blue-50/50" }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-semibold text-muted-foreground">
        Loading property room status grid...
      </div>
    );
  }

  // Filter computations
  const filteredRooms = rooms.filter(rm => {
    const roomStr = String(rm.room || rm.roomNumber || "").toLowerCase();
    const typeStr = String(rm.roomType || rm.category || "").toLowerCase();
    const guestStr = String(rm.guest || "").toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = roomStr.includes(query) || typeStr.includes(query) || guestStr.includes(query);
    const matchesFloor = floorFilter === "all" || rm.floor === floorFilter;
    const matchesType = typeFilter === "all" || rm.roomType === typeFilter || rm.category === typeFilter;
    const matchesStatus = statusFilter === "all" || rm.status === statusFilter;
    const matchesHousekeeping = housekeepingFilter === "all" || rm.housekeeping === housekeepingFilter;

    return matchesSearch && matchesFloor && matchesType && matchesStatus && matchesHousekeeping;
  });

  // Action methods
  const handleMarkClean = (roomNum) => {
    receptionistService.updateRoomStatus(roomNum, undefined, 'Clean')
      .then(res => {
        if (res.success) {
          toast.success(`Room #${roomNum} marked as Clean!`);
          loadRooms();
        }
      })
      .catch(err => {
        console.error("Failed to mark room clean:", err);
        toast.error(err.message || "Failed to mark room clean.");
      });
  };

  const handleMarkInspected = (roomNum) => {
    receptionistService.updateRoomStatus(roomNum, undefined, 'Inspected')
      .then(res => {
        if (res.success) {
          toast.success(`Room #${roomNum} marked as Inspected / Available!`);
          loadRooms();
        }
      })
      .catch(err => {
        console.error("Failed to mark room inspected:", err);
        toast.error(err.message || "Failed to mark room inspected.");
      });
  };

  const handleMarkOutOfOrder = (roomNum) => {
    receptionistService.updateRoomStatus(roomNum, 'Out of Order', 'Dirty')
      .then(res => {
        if (res.success) {
          toast.success(`Room #${roomNum} marked as Out of Order.`);
          loadRooms();
        }
      })
      .catch(err => {
        console.error("Failed to set OOO status:", err);
        toast.error(err.message || "Failed to update room status.");
      });
  };

  const handleChangeRoomStatus = (roomNum, newStatus) => {
    receptionistService.updateRoomStatus(roomNum, newStatus, undefined)
      .then(res => {
        if (res.success) {
          toast.success(`Room #${roomNum} status changed to ${newStatus}`);
          loadRooms();
        }
      })
      .catch(err => {
        console.error("Failed to update status:", err);
        toast.error(err.message || "Failed to update status.");
      });
  };

  const handleChangeHousekeepingStatus = (roomNum, newStatus) => {
    receptionistService.updateRoomStatus(roomNum, undefined, newStatus)
      .then(res => {
        if (res.success) {
          toast.success(`Room #${roomNum} housekeeping set to ${newStatus}`);
          loadRooms();
        }
      })
      .catch(err => {
        console.error("Failed to update housekeeping status:", err);
        toast.error(err.message || "Failed to update housekeeping status.");
      });
  };

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy">
      

      {/* Controls: Search and Filters */}
      <div className="bg-white border border-muted rounded-2xl p-4 shadow-soft space-y-4">
        
        {/* Row 1: Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by room number or current guest name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>
        </div>

        {/* Row 2: Select Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-muted/50">
          
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider select-none">Floor</span>
            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="px-3 py-1.5 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer w-full"
            >
              <option value="all">All Floors</option>
              <option value="Floor 1">Floor 1</option>
              <option value="Floor 2">Floor 2</option>
              <option value="Floor 3">Floor 3</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider select-none">Room Type</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer w-full"
            >
              <option value="all">All Room Types</option>
              <option value="Standard Room">Standard Room</option>
              <option value="Deluxe Room">Deluxe Room</option>
              <option value="Deluxe King">Deluxe King</option>
              <option value="Executive Room">Executive Room</option>
              <option value="Villa Suite">Villa Suite</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider select-none">Room Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer w-full"
            >
              <option value="all">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
              <option value="Reserved">Reserved</option>
              <option value="Out of Order">Out of Order</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider select-none">Housekeeping</span>
            <select
              value={housekeepingFilter}
              onChange={(e) => setHousekeepingFilter(e.target.value)}
              className="px-3 py-1.5 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer w-full"
            >
              <option value="all">All Housekeeping</option>
              <option value="Clean">Clean</option>
              <option value="Dirty">Dirty</option>
              <option value="Inspected">Inspected</option>
            </select>
          </div>

        </div>
      </div>

      {/* Racks Grid of Room Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filteredRooms.length === 0 ? (
          <div className="col-span-full bg-white border border-muted rounded-2xl p-16 text-center text-muted-foreground font-bold select-none">
            No rooms matches current rack filter parameters.
          </div>
        ) : (
          filteredRooms.map((rm) => {
            const meta = statusMeta[rm.status] || statusMeta.Available;
            const hkMeta = housekeepingMeta[rm.housekeeping] || housekeepingMeta.Clean;
            return (
              <div 
                key={rm.room}
                className="bg-white border border-muted hover:border-muted-foreground/30 hover:shadow-soft rounded-2xl p-4 flex flex-col justify-between min-h-[190px] transition-all relative overflow-hidden text-left"
              >
                
                {/* Room title row */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-display font-black text-navy text-base leading-none">Room {rm.room}</h3>
                    <span className="text-[9px] text-muted-foreground font-bold mt-1 block uppercase tracking-wider">{rm.floor} · {rm.roomType}</span>
                  </div>
                  <Tag tone={meta.tone} className="text-[9px] font-black uppercase select-none px-1.5 py-0.5 rounded">
                    {meta.label}
                  </Tag>
                </div>

                {/* Occupancy details */}
                <div className="my-3.5 border-t border-b border-muted/30 py-2.5 space-y-1.5 text-xs text-navy">
                  {rm.status === "Occupied" ? (
                    <div>
                      <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">In-House Guest</p>
                      <p className="font-bold truncate mt-0.5">{rm.guest}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">Out: {rm.checkOut.split(",")[0]}</p>
                    </div>
                  ) : rm.status === "Reserved" ? (
                    <div>
                      <p className="text-[9px] uppercase text-sky-600 font-bold tracking-wider">Expected Arrival</p>
                      <p className="font-bold truncate mt-0.5">{rm.guest}</p>
                      <p className="text-[9px] text-sky-600 mt-0.5">{rm.checkOut}</p>
                    </div>
                  ) : rm.status === "Out of Order" ? (
                    <div className="flex gap-1.5 text-rose-700 bg-rose-50/20 p-1.5 rounded-lg border border-rose-100/50">
                      <Wrench className="size-3.5 shrink-0 mt-0.5" />
                      <p className="text-[10px] font-semibold leading-snug truncate">{rm.notes}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">Status</p>
                      <p className="font-black text-emerald-600 mt-0.5">Vacant / Available</p>
                    </div>
                  )}
                </div>

                {/* Bottom indicators and actions row */}
                <div className="flex justify-between items-center gap-1">
                  
                  {/* Housekeeping tag */}
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full select-none ${hkMeta.color}`}>
                    {hkMeta.label}
                  </span>

                  {/* Actions list */}
                  <div className="flex items-center gap-1 whitespace-nowrap select-none">
                    
                    {rm.housekeeping === "Dirty" && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleMarkClean(rm.room)}
                        className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 h-6 px-2 text-[9px] font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
                        title="Mark Clean"
                      >
                        Clean
                      </Button>
                    )}

                    {rm.housekeeping === "Clean" && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleMarkInspected(rm.room)}
                        className="text-sky-700 border-sky-300 hover:bg-sky-50 h-6 px-2 text-[9px] font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
                        title="Approve Inspection"
                      >
                        Inspect
                      </Button>
                    )}

                    {rm.status !== "Out of Order" && rm.status !== "Occupied" && (
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => handleMarkOutOfOrder(rm.room)}
                        className="text-rose-600 hover:bg-rose-50 border border-rose-200 h-6 px-2 text-[9px] font-bold rounded-lg cursor-pointer transition-colors"
                        title="Mark Out of Order"
                      >
                        OOO
                      </Button>
                    )}

                    <Button
                      asChild
                      size="xs"
                      variant="outline"
                      className="text-navy border-navy/30 hover:bg-navy/5 h-6 px-2 text-[9px] font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
                    >
                      <Link to={`/reception/room-assignment/${rm.room}`}>Details</Link>
                    </Button>

                  </div>

                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}