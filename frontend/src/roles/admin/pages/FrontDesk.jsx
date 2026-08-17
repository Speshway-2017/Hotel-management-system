import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HorizontalRouteTabs, PageHeader, Notice, LoadingRows } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { superAdminService } from "@/services/superAdmin";
import {
  CalendarCheck,
  Bed,
  Users,
  ConciergeBell,
  Search,
  Check,
  LogOut,
  Sparkles,
  ClipboardList,
  DollarSign,
  UserCheck,
  XCircle,
  FileText
} from "lucide-react";

const operationsTabs = [
  { label: "Reservations", to: "/admin/reservations", icon: CalendarCheck },
  { label: "Rooms & Rates", to: "/admin/rooms", icon: Bed },
  { label: "Guests", to: "/admin/guests", icon: Users },
  { label: "Front Desk", to: "/admin/front-desk", icon: ConciergeBell }
];

export const Route = createFileRoute("/admin/front-desk")({
  head: () => ({
    meta: [
      { title: "Front Desk Operations — Speshway Luxury Hotel" },
      { name: "description", content: "Visual room status grid, check-in, check-out, and billing folio management." }
    ]
  }),
  component: FrontDeskPage
});

// Hardcoded hotel rooms layout
const hotelRooms = [
  // First Floor
  { num: "101", type: "Villa Suite", floor: "Floor 1" },
  { num: "102", type: "Villa Suite", floor: "Floor 1" },
  { num: "103", type: "Heritage Luxury", floor: "Floor 1" },
  { num: "104", type: "Heritage Luxury", floor: "Floor 1" },
  { num: "105", type: "Heritage Luxury", floor: "Floor 1" },
  { num: "106", type: "Superior Deluxe", floor: "Floor 1" },
  { num: "107", type: "Superior Deluxe", floor: "Floor 1" },
  { num: "108", type: "Superior Deluxe", floor: "Floor 1" },
  // Second Floor
  { num: "201", type: "Maharaja Suite", floor: "Floor 2" },
  { num: "202", type: "Maharaja Suite", floor: "Floor 2" },
  { num: "203", type: "Garden Pool Villa", floor: "Floor 2" },
  { num: "204", type: "Heritage Luxury", floor: "Floor 2" },
  { num: "205", type: "Heritage Luxury", floor: "Floor 2" },
  { num: "206", type: "Superior Deluxe", floor: "Floor 2" },
  { num: "207", type: "Superior Deluxe", floor: "Floor 2" },
  { num: "208", type: "Superior Deluxe", floor: "Floor 2" },
  // Third Floor
  { num: "301", type: "Maharaja Suite", floor: "Floor 3" },
  { num: "302", type: "Maharaja Suite", floor: "Floor 3" },
  { num: "303", type: "Garden Pool Villa", floor: "Floor 3" },
  { num: "304", type: "Heritage Luxury", floor: "Floor 3" },
  { num: "305", type: "Heritage Luxury", floor: "Floor 3" },
  { num: "306", type: "Superior Deluxe", floor: "Floor 3" },
  { num: "307", type: "Superior Deluxe", floor: "Floor 3" },
  { num: "308", type: "Superior Deluxe", floor: "Floor 3" }
];

function FrontDeskPage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Folio state
  const [selectedFolio, setSelectedFolio] = useState(null);
  const [isFolioOpen, setIsFolioOpen] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const res = await superAdminService.getReservations();
      setReservations(res.data || []);
    } catch (err) {
      setError(err.message || "Failed to load database bookings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleStatusChange(bookingId, newStatus) {
    try {
      await superAdminService.updateReservation(bookingId, { status: newStatus });
      loadData();
    } catch (err) {
      alert("Error updating status: " + err.message);
    }
  }

  // Parse reservations to map them to specific room numbers
  const roomReservations = {};
  reservations.forEach((r) => {
    if (r.room && r.status !== "Checked-out" && r.status !== "Cancelled") {
      // Match room number dynamically, e.g. "Room 302" -> "302"
      const match = r.room.match(/\d+/);
      const roomNum = match ? match[0] : r.room;
      roomReservations[roomNum] = r;
    }
  });

  // Filters by floor and category
  const floors = ["Floor 3", "Floor 2", "Floor 1"];

  return (
    <div className="space-y-6 text-left">
      <HorizontalRouteTabs tabs={operationsTabs} />

      {error && <Notice tone="error" title="Sync Failure">{error}</Notice>}

      {/* Grid Legend Panel */}
      <div className="bg-white border border-muted rounded-xl p-4 shadow-soft flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-[#2ecc71]">
            <span className="size-3.5 rounded bg-[#2ecc71]/15 border border-[#2ecc71]/35" /> Available
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-brand">
            <span className="size-3.5 rounded bg-brand/15 border border-brand/35" /> Occupied
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-warning">
            <span className="size-3.5 rounded bg-warning/15 border border-warning/35" /> Expected Arrival
          </div>
          <div className="flex items-center gap-1.5 font-semibold text-destructive">
            <span className="size-3.5 rounded bg-destructive/15 border border-destructive/35" /> Dirty / Cleaning
          </div>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search active guest..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-muted rounded-lg text-xs bg-[#fafafa]/50 focus:outline-none focus:border-navy"
          />
        </div>
      </div>

      {loading ? (
        <LoadingRows rows={4} />
      ) : (
        <div className="space-y-6">
          {floors.map((floor) => {
            const roomsOnFloor = hotelRooms.filter((r) => r.floor === floor);
            
            return (
              <div key={floor} className="space-y-3">
                <h3 className="font-display font-black text-navy text-sm border-b border-muted pb-1">{floor}</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {roomsOnFloor.map((room) => {
                    const activeRes = roomReservations[room.num];
                    
                    // Determine state
                    let stateLabel = "Available";
                    let stateColor = "border-l-4 border-l-[#2ecc71] bg-white text-[#2a2a2a]";
                    let badgeColor = "bg-[#2ecc71]/10 text-[#2ecc71] border-[#2ecc71]/20";

                    if (activeRes) {
                      if (activeRes.status === "Checked-in") {
                        stateLabel = "Occupied";
                        stateColor = "border-l-4 border-l-brand bg-white text-[#2a2a2a]";
                        badgeColor = "bg-brand/10 text-brand border border-brand/20";
                      } else {
                        stateLabel = "Expected Arrival";
                        stateColor = "border-l-4 border-l-warning bg-white text-[#2a2a2a]";
                        badgeColor = "bg-warning/10 text-warning border border-warning/20";
                      }
                    }

                    // Check search filter query
                    if (
                      searchQuery &&
                      (!activeRes || !activeRes.guest.toLowerCase().includes(searchQuery.toLowerCase()))
                    ) {
                      return null;
                    }

                    return (
                      <div
                        key={room.num}
                        className={`rounded-xl border border-muted p-4 shadow-soft flex flex-col justify-between min-h-[145px] transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden ${stateColor}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-base font-bold text-navy select-none">#{room.num}</span>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{room.type}</p>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider border ${badgeColor}`}>
                            {stateLabel}
                          </span>
                        </div>

                        {activeRes ? (
                          <div className="my-3 space-y-1">
                            <h4 className="font-semibold text-navy text-sm leading-tight truncate">{activeRes.guest}</h4>
                            <p className="text-[10px] text-muted-foreground">{activeRes.checkIn} → {activeRes.checkOut}</p>
                          </div>
                        ) : (
                          <div className="my-3">
                            <span className="text-xs text-muted-foreground italic select-none">No active guest</span>
                          </div>
                        )}

                        <div className="pt-2.5 border-t border-muted flex items-center justify-between gap-2">
                          {activeRes ? (
                            <>
                              <Button
                                onClick={() => {
                                  setSelectedFolio(activeRes);
                                  setIsFolioOpen(true);
                                }}
                                size="xs"
                                variant="ghost"
                                className="h-7 text-xs text-navy hover:text-brand px-2"
                              >
                                <FileText className="size-3.5 mr-1" /> Folio
                              </Button>
                              <div className="flex gap-1">
                                {activeRes.status === "Pending" && (
                                  <Button
                                    onClick={() => handleStatusChange(activeRes._id, "Checked-in")}
                                    size="xs"
                                    className="bg-[#2ecc71] hover:bg-[#27ae60] text-white h-7 px-2.5 text-xs font-semibold"
                                  >
                                    Check-In
                                  </Button>
                                )}
                                {activeRes.status === "Checked-in" && (
                                  <Button
                                    onClick={() => handleStatusChange(activeRes._id, "Checked-out")}
                                    size="xs"
                                    className="bg-navy hover:bg-navy-deep text-white h-7 px-2.5 text-xs font-semibold"
                                  >
                                    Check-Out
                                  </Button>
                                )}
                              </div>
                            </>
                          ) : (
                            <span className="text-[10px] text-muted-foreground leading-none self-center">₹11,400 / Night</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invoice Folio Modal Overlay */}
      {isFolioOpen && selectedFolio && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-muted max-w-md w-full shadow-lift overflow-hidden text-left flex flex-col">
            <div className="p-5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <div>
                <h3 className="font-display font-black text-navy text-md">Guest Folio Invoice</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Booking Reference: #{selectedFolio._id?.substring(0, 8).toUpperCase()}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => {
                  setIsFolioOpen(false);
                  setSelectedFolio(null);
                }}
              >
                <XCircle className="size-4" />
              </Button>
            </div>
            
            {/* Folio Billing Body */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-muted">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Guest Profile</span>
                  <p className="font-semibold text-navy text-sm mt-0.5">{selectedFolio.guest}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Room Number</span>
                  <p className="font-semibold text-navy text-sm mt-0.5">{selectedFolio.room}</p>
                </div>
              </div>

              {/* Transactions list */}
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Folio Ledgers</span>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between items-center text-xs p-2 rounded bg-muted/20 border border-muted">
                    <span>Room Tariff ({selectedFolio.nights || 1} night)</span>
                    <span className="font-semibold text-navy">₹{selectedFolio.amount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs p-2 rounded bg-muted/20 border border-muted">
                    <span>CGST @ 9%</span>
                    <span className="font-semibold text-navy">₹{Math.round(selectedFolio.amount * 0.09).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs p-2 rounded bg-muted/20 border border-muted">
                    <span>SGST @ 9%</span>
                    <span className="font-semibold text-navy">₹{Math.round(selectedFolio.amount * 0.09).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Balance & Clearance details */}
              <div className="pt-4 border-t border-muted flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Invoice Total</span>
                  <p className="text-lg font-black text-navy mt-0.5">
                    ₹{Math.round(selectedFolio.amount * 1.18).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Outstanding Balance</span>
                  <p className={`text-md font-black mt-0.5 ${selectedFolio.balance === 0 ? "text-success" : "text-destructive"}`}>
                    {selectedFolio.balance === 0 ? "Fully Settled" : `₹${selectedFolio.balance?.toLocaleString()}`}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-muted flex justify-end gap-2">
                <Button
                  onClick={() => {
                    setIsFolioOpen(false);
                    setSelectedFolio(null);
                  }}
                  className="bg-navy hover:bg-navy-deep text-white h-10 px-6 text-xs"
                >
                  Print Folio
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}