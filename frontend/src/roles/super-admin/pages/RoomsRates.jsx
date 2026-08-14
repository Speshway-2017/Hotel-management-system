import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/utils";
import { Eye, X, Building, ChevronDown, Edit2, Sliders } from "lucide-react";

// Mock Rooms & Rates Dataset
const initialRoomsData = [
  {
    id: "RM-STD-01",
    propertyId: "HS-JAI",
    propertyName: "Rambagh Residency",
    roomType: "Standard",
    totalRooms: 20,
    available: 12,
    occupied: 6,
    blocked: 2,
    baseRate: 6500,
    currentRate: 7200,
    ratePlan: "Standard",
    status: "Available"
  },
  {
    id: "RM-DLX-02",
    propertyId: "HS-JAI",
    propertyName: "Rambagh Residency",
    roomType: "Deluxe",
    totalRooms: 15,
    available: 8,
    occupied: 7,
    blocked: 0,
    baseRate: 8500,
    currentRate: 9200,
    ratePlan: "Standard",
    status: "Available"
  },
  {
    id: "RM-SUT-03",
    propertyId: "HS-JAI",
    propertyName: "Rambagh Residency",
    roomType: "Suite",
    totalRooms: 5,
    available: 1,
    occupied: 3,
    blocked: 1,
    baseRate: 15000,
    currentRate: 16500,
    ratePlan: "Corporate",
    status: "Occupied"
  },
  {
    id: "LP-DLX-01",
    propertyId: "HS-UDA",
    propertyName: "Lake Palace View",
    roomType: "Deluxe",
    totalRooms: 20,
    available: 10,
    occupied: 8,
    blocked: 2,
    baseRate: 9500,
    currentRate: 8800,
    ratePlan: "Promotional",
    status: "Available"
  },
  {
    id: "LP-SUT-02",
    propertyId: "HS-UDA",
    propertyName: "Lake Palace View",
    roomType: "Suite",
    totalRooms: 10,
    available: 3,
    occupied: 5,
    blocked: 2,
    baseRate: 22000,
    currentRate: 22000,
    ratePlan: "Standard",
    status: "Blocked"
  },
  {
    id: "CB-STD-01",
    propertyId: "HS-GOA",
    propertyName: "Candolim Beach Resort",
    roomType: "Standard",
    totalRooms: 40,
    available: 25,
    occupied: 12,
    blocked: 3,
    baseRate: 5500,
    currentRate: 4950,
    ratePlan: "Non-refundable",
    status: "Available"
  },
  {
    id: "CB-DLX-02",
    propertyId: "HS-GOA",
    propertyName: "Candolim Beach Resort",
    roomType: "Deluxe",
    totalRooms: 30,
    available: 18,
    occupied: 10,
    blocked: 2,
    baseRate: 7500,
    currentRate: 7500,
    ratePlan: "Standard",
    status: "Available"
  },
  {
    id: "CB-SUT-03",
    propertyId: "HS-GOA",
    propertyName: "Candolim Beach Resort",
    roomType: "Suite",
    totalRooms: 10,
    available: 4,
    occupied: 5,
    blocked: 1,
    baseRate: 14000,
    currentRate: 15400,
    ratePlan: "Standard",
    status: "Out of Order"
  },
  {
    id: "BR-STD-01",
    propertyId: "HS-KER",
    propertyName: "Backwater Retreat",
    roomType: "Standard",
    totalRooms: 8,
    available: 5,
    occupied: 3,
    blocked: 0,
    baseRate: 8000,
    currentRate: 8000,
    ratePlan: "Standard",
    status: "Available"
  },
  {
    id: "BR-SUT-02",
    propertyId: "HS-KER",
    propertyName: "Backwater Retreat",
    roomType: "Suite",
    totalRooms: 7,
    available: 2,
    occupied: 4,
    blocked: 1,
    baseRate: 18000,
    currentRate: 16200,
    ratePlan: "Promotional",
    status: "Occupied"
  }
];

function SuperAdminRoomsRates() {
  const [roomsData, setRoomsData] = useState(initialRoomsData);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [propertyFilter, setPropertyFilter] = useState("All");
  const [roomTypeFilter, setRoomTypeFilter] = useState("All");
  const [ratePlanFilter, setRatePlanFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("view"); // 'view' | 'edit' | 'rates'
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Form Fields for Edit / Manage Rates
  const [totalRooms, setTotalRooms] = useState(0);
  const [available, setAvailable] = useState(0);
  const [occupied, setOccupied] = useState(0);
  const [blocked, setBlocked] = useState(0);
  const [baseRate, setBaseRate] = useState(0);
  const [currentRate, setCurrentRate] = useState(0);
  const [ratePlan, setRatePlan] = useState("Standard");
  const [status, setStatus] = useState("Available");

  const loadProperties = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminService.getProperties();
      if (res.success) {
        setProperties(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load hotel properties");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const handleOpenModal = (type, room) => {
    setSelectedRoom(room);
    setModalType(type);
    setTotalRooms(room.totalRooms);
    setAvailable(room.available);
    setOccupied(room.occupied);
    setBlocked(room.blocked);
    setBaseRate(room.baseRate);
    setCurrentRate(room.currentRate);
    setRatePlan(room.ratePlan);
    setStatus(room.status);
    setModalOpen(true);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    setRoomsData(prev =>
      prev.map(r => r.id === selectedRoom.id ? {
        ...r,
        totalRooms: Number(totalRooms),
        available: Number(available),
        occupied: Number(occupied),
        blocked: Number(blocked),
        status: status
      } : r)
    );
    setModalOpen(false);
  };

  const handleSaveRates = (e) => {
    e.preventDefault();
    setRoomsData(prev =>
      prev.map(r => r.id === selectedRoom.id ? {
        ...r,
        baseRate: Number(baseRate),
        currentRate: Number(currentRate),
        ratePlan: ratePlan
      } : r)
    );
    setModalOpen(false);
  };

  const getStatusTone = (s) => {
    if (s === "Available") return "success";
    if (s === "Occupied") return "brand";
    if (s === "Blocked") return "warning";
    return "error"; // Out of Order
  };

  const filteredRooms = roomsData.filter((r) => {
    const matchesProperty = propertyFilter === "All" || r.propertyId === propertyFilter;
    const matchesRoomType = roomTypeFilter === "All" || r.roomType === roomTypeFilter;
    const matchesRatePlan = ratePlanFilter === "All" || r.ratePlan === ratePlanFilter;
    const matchesStatus = statusFilter === "All" || r.status === statusFilter;

    return matchesProperty && matchesRoomType && matchesRatePlan && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rooms & Rates Ledger"
        subtitle="Control room category inventory mappings, active tariffs, dynamic rates, and booking limits across properties."
      />

      {error && <Notice tone="error" title="Data Load Failure" className="text-left">{error}</Notice>}

      {/* Advanced Filter Toolbar */}
      <div className="flex flex-col gap-3 bg-white border border-muted p-4 rounded-2xl shadow-soft">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Property Filter */}
          <div className="relative">
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="bg-white border border-muted pl-4 pr-9 h-10 rounded-full text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-purple min-w-[160px] cursor-pointer appearance-none"
            >
              <option value="All">All Properties</option>
              {properties.map((p) => (
                <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* Room Type Filter */}
          <div className="relative">
            <select
              value={roomTypeFilter}
              onChange={(e) => setRoomTypeFilter(e.target.value)}
              className="bg-white border border-muted pl-4 pr-9 h-10 rounded-full text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-purple min-w-[140px] cursor-pointer appearance-none"
            >
              <option value="All">All Room Types</option>
              <option value="Standard">Standard</option>
              <option value="Deluxe">Deluxe</option>
              <option value="Suite">Suite</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* Rate Plan Filter */}
          <div className="relative">
            <select
              value={ratePlanFilter}
              onChange={(e) => setRatePlanFilter(e.target.value)}
              className="bg-white border border-muted pl-4 pr-9 h-10 rounded-full text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-purple min-w-[140px] cursor-pointer appearance-none"
            >
              <option value="All">All Rate Plans</option>
              <option value="Standard">Standard</option>
              <option value="Non-refundable">Non-refundable</option>
              <option value="Corporate">Corporate</option>
              <option value="Promotional">Promotional</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-muted pl-4 pr-9 h-10 rounded-full text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-purple min-w-[140px] cursor-pointer appearance-none"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
              <option value="Blocked">Blocked</option>
              <option value="Out of Order">Out of Order</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>

      <Panel title="Inventory Ledger Grid" description={`Displaying ${filteredRooms.length} active room categories`}>
        {loading ? (
          <LoadingRows rows={5} />
        ) : filteredRooms.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No room categories found matching filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1050px] table-fixed">
              <thead>
                <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                  <th className="p-4 w-[16%] text-left">Property</th>
                  <th className="p-4 w-[10%] text-left">Room Type</th>
                  <th className="p-4 w-[9%] text-left">Total Rooms</th>
                  <th className="p-4 w-[8%] text-left">Available</th>
                  <th className="p-4 w-[8%] text-left">Occupied</th>
                  <th className="p-4 w-[8%] text-left">Blocked</th>
                  <th className="p-4 w-[9%] text-left">Base Rate</th>
                  <th className="p-4 w-[9%] text-left">Current Rate</th>
                  <th className="p-4 w-[11%] text-left">Rate Plan</th>
                  <th className="p-4 w-[10%] text-left">Status</th>
                  <th className="p-4 w-[12%] text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y font-sans">
                {filteredRooms.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/15 transition-colors">
                    <td className="p-4 w-[16%] text-left">
                      <div className="flex items-center gap-1.5 font-semibold text-navy truncate" title={r.propertyName}>
                        <Building className="size-3.5 text-purple shrink-0" />
                        <span className="truncate">{r.propertyName}</span>
                      </div>
                    </td>
                    <td className="p-4 w-[10%] text-left font-semibold text-navy">{r.roomType}</td>
                    <td className="p-4 w-[9%] text-left text-muted-foreground">{r.totalRooms} Keys</td>
                    <td className="p-4 w-[8%] text-left text-success font-semibold">{r.available}</td>
                    <td className="p-4 w-[8%] text-left text-brand font-semibold">{r.occupied}</td>
                    <td className="p-4 w-[8%] text-left text-warning font-semibold">{r.blocked}</td>
                    <td className="p-4 w-[9%] text-left font-bold text-navy font-mono">₹{r.baseRate.toLocaleString("en-IN")}</td>
                    <td className="p-4 w-[9%] text-left font-bold text-purple font-mono">₹{r.currentRate.toLocaleString("en-IN")}</td>
                    <td className="p-4 w-[11%] text-left">
                      <Tag tone="brand">{r.ratePlan}</Tag>
                    </td>
                    <td className="p-4 w-[10%] text-left">
                      <Tag tone={getStatusTone(r.status)}>{r.status}</Tag>
                    </td>
                    <td className="p-4 w-[12%] text-left">
                      <div className="flex gap-1.5 justify-start items-center">
                        <button
                          onClick={() => handleOpenModal("view", r)}
                          className="p-1.5 rounded-full hover:bg-muted text-navy-deep cursor-pointer flex items-center justify-center h-7 w-7"
                          title="View Category details"
                        >
                          <Eye className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenModal("edit", r)}
                          className="p-1.5 rounded-full hover:bg-muted text-purple cursor-pointer flex items-center justify-center h-7 w-7"
                          title="Edit Inventory"
                        >
                          <Edit2 className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenModal("rates", r)}
                          className="p-1.5 rounded-full hover:bg-muted text-warning cursor-pointer flex items-center justify-center h-7 w-7"
                          title="Manage Rates"
                        >
                          <Sliders className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Modals */}
      {modalOpen && selectedRoom && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-black/5 backdrop-blur-sm flex justify-center items-start py-8 sm:py-16 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-[0_20px_50px_rgba(13,27,42,0.15)] relative border border-muted my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-muted">
              <h3 className="font-display font-bold text-lg text-navy">
                {modalType === "view" && "Room Category Overview"}
                {modalType === "edit" && "Edit Room Inventory Capacity"}
                {modalType === "rates" && "Manage Base & Current Rates"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-navy cursor-pointer size-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* VIEW OVERVIEW MODAL */}
            {modalType === "view" && (
              <div className="py-4 space-y-4 text-left text-xs leading-relaxed">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong className="text-navy font-semibold">Property Hotel:</strong>
                    <p className="mt-0.5 text-muted-foreground text-sm font-semibold">{selectedRoom.propertyName}</p>
                  </div>
                  <div>
                    <strong className="text-navy font-semibold">Room Category Type:</strong>
                    <p className="mt-0.5 text-muted-foreground">{selectedRoom.roomType}</p>
                  </div>
                  <div>
                    <strong className="text-navy font-semibold">Base Rate Tariff:</strong>
                    <p className="mt-0.5 text-navy font-bold font-mono">₹{selectedRoom.baseRate.toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <strong className="text-navy font-semibold">Current Active Rate:</strong>
                    <p className="mt-0.5 text-purple font-bold font-mono">₹{selectedRoom.currentRate.toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <strong className="text-navy font-semibold">Total Capacity:</strong>
                    <p className="mt-0.5 text-muted-foreground">{selectedRoom.totalRooms} Keys</p>
                  </div>
                  <div>
                    <strong className="text-navy font-semibold">Status:</strong>
                    <p className="mt-0.5"><Tag tone={getStatusTone(selectedRoom.status)}>{selectedRoom.status}</Tag></p>
                  </div>
                </div>

                <div className="border-t border-muted my-3" />

                <div className="bg-muted/10 p-3 rounded-xl border border-muted/50">
                  <strong className="text-navy font-semibold block mb-2 text-center uppercase tracking-wider text-[10px]">Realtime Inventory Allocation</strong>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="bg-success/5 p-2 rounded-lg border border-success/15">
                      <span className="text-success font-semibold block">Available</span>
                      <strong className="text-navy text-sm font-bold block mt-1">{selectedRoom.available}</strong>
                    </div>
                    <div className="bg-brand/5 p-2 rounded-lg border border-brand/15">
                      <span className="text-brand font-semibold block">Occupied</span>
                      <strong className="text-navy text-sm font-bold block mt-1">{selectedRoom.occupied}</strong>
                    </div>
                    <div className="bg-warning/5 p-2 rounded-lg border border-warning/15">
                      <span className="text-warning font-semibold block">Blocked</span>
                      <strong className="text-navy text-sm font-bold block mt-1">{selectedRoom.blocked}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* EDIT CAPACITY FORM */}
            {modalType === "edit" && (
              <form onSubmit={handleSaveEdit} className="py-4 space-y-4 text-left text-xs">
                <div className="space-y-1.5">
                  <Label htmlFor="total-rooms" className="text-navy font-semibold">Total Inventory Capacity (Keys):</Label>
                  <Input
                    id="total-rooms"
                    type="number"
                    value={totalRooms}
                    onChange={(e) => setTotalRooms(e.target.value)}
                    className="h-10 rounded-xl border-muted bg-muted/10 focus:ring-1 focus:ring-purple focus:outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="avail" className="text-navy font-semibold">Available:</Label>
                    <Input
                      id="avail"
                      type="number"
                      value={available}
                      onChange={(e) => setAvailable(e.target.value)}
                      className="h-10 rounded-xl border-muted bg-muted/10"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="occu" className="text-navy font-semibold">Occupied:</Label>
                    <Input
                      id="occu"
                      type="number"
                      value={occupied}
                      onChange={(e) => setOccupied(e.target.value)}
                      className="h-10 rounded-xl border-muted bg-muted/10"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="block" className="text-navy font-semibold">Blocked:</Label>
                    <Input
                      id="block"
                      type="number"
                      value={blocked}
                      onChange={(e) => setBlocked(e.target.value)}
                      className="h-10 rounded-xl border-muted bg-muted/10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status-select" className="text-navy font-semibold">Inventory Status:</Label>
                  <div className="relative">
                    <select
                      id="status-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full bg-white border border-muted pl-4 pr-9 h-10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple cursor-pointer appearance-none"
                    >
                      <option value="Available">Available</option>
                      <option value="Occupied">Occupied</option>
                      <option value="Blocked">Blocked</option>
                      <option value="Out of Order">Out of Order</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-muted gap-2">
                  <Button type="button" onClick={() => setModalOpen(false)} variant="outline" className="rounded-full px-5 text-xs border-muted hover:bg-muted text-navy-deep">Cancel</Button>
                  <Button type="submit" className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 text-xs">Save Capacity</Button>
                </div>
              </form>
            )}

            {/* MANAGE RATES FORM */}
            {modalType === "rates" && (
              <form onSubmit={handleSaveRates} className="py-4 space-y-4 text-left text-xs">
                <div className="space-y-1.5">
                  <Label htmlFor="base-rate" className="text-navy font-semibold">Base Rate Tariff (₹):</Label>
                  <Input
                    id="base-rate"
                    type="number"
                    value={baseRate}
                    onChange={(e) => setBaseRate(e.target.value)}
                    className="h-10 rounded-xl border-muted bg-muted/10"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="current-rate" className="text-navy font-semibold">Current Active Dynamic Rate (₹):</Label>
                  <Input
                    id="current-rate"
                    type="number"
                    value={currentRate}
                    onChange={(e) => setCurrentRate(e.target.value)}
                    className="h-10 rounded-xl border-muted bg-muted/10"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rate-plan-select" className="text-navy font-semibold">Active Rate Plan Mapping:</Label>
                  <div className="relative">
                    <select
                      id="rate-plan-select"
                      value={ratePlan}
                      onChange={(e) => setRatePlan(e.target.value)}
                      className="w-full bg-white border border-muted pl-4 pr-9 h-10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple cursor-pointer appearance-none"
                    >
                      <option value="Standard">Standard</option>
                      <option value="Non-refundable">Non-refundable</option>
                      <option value="Corporate">Corporate</option>
                      <option value="Promotional">Promotional</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-muted gap-2">
                  <Button type="button" onClick={() => setModalOpen(false)} variant="outline" className="rounded-full px-5 text-xs border-muted hover:bg-muted text-navy-deep">Cancel</Button>
                  <Button type="submit" className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 text-xs">Update Rates</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/super-admin/rooms")({
  head: () => ({
    meta: [
      { title: "Rooms & Rates Ledger — Hour Stay" },
      { name: "description", content: "Supervise room configurations, inventories, capacities, and active dynamic tariffs." }
    ]
  }),
  component: SuperAdminRoomsRates
});
