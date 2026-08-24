import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HorizontalRouteTabs, PageHeader, Notice, LoadingRows, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/hs/FormFields";
import { superAdminService } from "@/services/superAdmin";
import { adminService } from "@/services/admin";
import { toast } from "sonner";
import {
  Bed,
  Users,
  Search,
  Eye,
  Edit2,
  XCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sliders,
  DollarSign,
  Grid,
  TrendingUp,
  Layers,
  Sparkles,
  X,
  Plus,
  Calendar,
  ShieldCheck,
  Activity,
  Trash2,
  ArrowRight,
  ShieldAlert,
  Check
} from "lucide-react";

const operationsTabs = [
  { label: "Reservations", to: "/admin/reservations", icon: CalendarCheck },
  { label: "Rooms & Rates", to: "/admin/rooms", icon: Bed },
  { label: "Guests", to: "/admin/guests", icon: Users },
  { label: "Front Desk", to: "/admin/front-desk", icon: ConciergeBell }
];

import { CalendarCheck, ConciergeBell } from "lucide-react";

export const Route = createFileRoute("/admin/rooms")({
  head: () => ({
    meta: [
      { title: "Rooms & Rates Console — Speshway Luxury Hotel" },
      { name: "description", content: "Configure inventory status, rate plans, promotional prices and bulk tariff updates." }
    ]
  }),
  component: RoomsRatesPage
});

// Premium stat card component
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

function RoomsRatesPage() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [selectedPropId, setSelectedPropId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tab navigation: 'rooms' | 'types' | 'plans' | 'availability' | 'restrictions'
  const [activeTab, setActiveTab] = useState("rooms");

  // Core Data States (Initialized with local storage bindings or rich seeded data sets)
  const [roomsList, setRoomsList] = useState(() => {
    const saved = localStorage.getItem("hms_rooms_list");
    if (saved) return JSON.parse(saved);
    const initial = [
      { _id: "R-101", roomNumber: "101", category: "Villa Suite", floor: "Floor 1", status: "Available", ratePlan: "Standard BAR", currentRate: 38900, lastUpdated: "2 mins ago" },
      { _id: "R-102", roomNumber: "102", category: "Villa Suite", floor: "Floor 1", status: "Occupied", ratePlan: "Standard BAR", currentRate: 38900, lastUpdated: "10 mins ago" },
      { _id: "R-103", roomNumber: "103", category: "Heritage Luxury", floor: "Floor 1", status: "Available", ratePlan: "Standard BAR", currentRate: 11400, lastUpdated: "1 hr ago" },
      { _id: "R-104", roomNumber: "104", category: "Heritage Luxury", floor: "Floor 1", status: "Dirty", ratePlan: "Standard BAR", currentRate: 11400, lastUpdated: "Just now" },
      { _id: "R-105", roomNumber: "105", category: "Superior Deluxe", floor: "Floor 1", status: "Blocked", ratePlan: "Promo Non-Ref", currentRate: 8500, lastUpdated: "Yesterday" },
      { _id: "R-106", roomNumber: "106", category: "Superior Deluxe", floor: "Floor 1", status: "Out of Order", ratePlan: "Standard BAR", currentRate: 8500, lastUpdated: "3 days ago" },
      { _id: "R-201", roomNumber: "201", category: "Maharaja Suite", floor: "Floor 2", status: "Occupied", ratePlan: "Standard BAR", currentRate: 24500, lastUpdated: "4 hrs ago" },
      { _id: "R-202", roomNumber: "202", category: "Maharaja Suite", floor: "Floor 2", status: "Available", ratePlan: "Standard BAR", currentRate: 24500, lastUpdated: "5 mins ago" },
      { _id: "R-203", roomNumber: "203", category: "Villa Suite", floor: "Floor 2", status: "Available", ratePlan: "LOS Special Plan", currentRate: 38900, lastUpdated: "20 mins ago" },
      { _id: "R-205", roomNumber: "205", category: "Heritage Luxury", floor: "Floor 2", status: "Available", ratePlan: "Standard BAR", currentRate: 11400, lastUpdated: "12 hrs ago" },
      { _id: "R-301", roomNumber: "301", category: "Maharaja Suite", floor: "Floor 3", status: "Available", ratePlan: "Standard BAR", currentRate: 24500, lastUpdated: "Just now" },
      { _id: "R-302", roomNumber: "302", category: "Maharaja Suite", floor: "Floor 3", status: "Occupied", ratePlan: "Standard BAR", currentRate: 24500, lastUpdated: "2 hrs ago" },
      { _id: "R-303", roomNumber: "303", category: "Villa Suite", floor: "Floor 3", status: "Out of Order", ratePlan: "Standard BAR", currentRate: 38900, lastUpdated: "1 week ago" }
    ];
    localStorage.setItem("hms_rooms_list", JSON.stringify(initial));
    return initial;
  });

  const [roomTypesList, setRoomTypesList] = useState(() => {
    const saved = localStorage.getItem("hms_room_types_list");
    if (saved) return JSON.parse(saved);
    const initial = [
      { _id: "T-01", category: "Maharaja Suite", roomsCount: 4, occupancy: "2 Adults + 1 Child", baseRate: 24500, activePlans: 3, amenities: ["Private Jacuzzi", "Royal balcony view", "Butler service"], status: "Active" },
      { _id: "T-02", category: "Villa Suite", roomsCount: 4, occupancy: "4 Adults", baseRate: 38900, activePlans: 3, amenities: ["Private infinity pool", "Plunge deck", "Open-air shower"], status: "Active" },
      { _id: "T-03", category: "Heritage Luxury", roomsCount: 7, occupancy: "2 Adults", baseRate: 11400, activePlans: 2, amenities: ["Heritage furnishings", "Garden facing", "Coffee station"], status: "Active" },
      { _id: "T-04", category: "Superior Deluxe", roomsCount: 9, occupancy: "2 Adults", baseRate: 8500, activePlans: 2, amenities: ["Courtyard facing", "Smart TV", "Mini espresso station"], status: "Active" }
    ];
    localStorage.setItem("hms_room_types_list", JSON.stringify(initial));
    return initial;
  });

  const [ratePlansList, setRatePlansList] = useState([
    { _id: "P-01", name: "Standard Best Available Rate (BAR)", category: "All Categories", baseRate: "BAR 100%", pricingType: "Dynamic", mealPlan: "Continental Breakfast", policy: "Refundable up to 24h prior", minStay: "1 Night", status: "Active", lastUpdated: "1 hr ago" },
    { _id: "P-02", name: "Non-Refundable Promo Plan", category: "All Categories", baseRate: "BAR - 12%", pricingType: "Discount Percentage", mealPlan: "Room Only", policy: "Non-cancellable, prepaid", minStay: "1 Night", status: "Active", lastUpdated: "4 hrs ago" },
    { _id: "P-03", name: "Length of Stay Special (LOS)", category: "Villa Suite, Maharaja Suite", baseRate: "BAR - 15%", pricingType: "Length-based", mealPlan: "Half Board", policy: "Refundable up to 48h prior", minStay: "3 Nights", status: "Active", lastUpdated: "Yesterday" }
  ]);

  const [restrictionsList, setRestrictionsList] = useState([
    { _id: "RE-01", roomType: "Maharaja Suite", type: "Minimum Stay", value: "3 Nights", effectiveDates: "2026-08-20 to 2026-08-25", status: "Active" },
    { _id: "RE-02", roomType: "Villa Suite", type: "Closed to Arrival (CTA)", value: "True", effectiveDates: "2026-08-18 to 2026-08-19", status: "Active" },
    { _id: "RE-03", roomType: "Superior Deluxe", type: "Stop Sell", value: "True", effectiveDates: "2026-08-24 to 2026-08-26", status: "Active" }
  ]);

  // Calendar scheduler state
  const [calendarStart, setCalendarStart] = useState(new Date("2026-08-17"));

  // Form / Drawer Modals states
  const [isAddPlanOpen, setIsAddPlanOpen] = useState(false);
  const [isChangeStatusOpen, setIsChangeStatusOpen] = useState(false);
  const [isAddRestrictionOpen, setIsAddRestrictionOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form Fields States
  const [formRoomStatus, setFormRoomStatus] = useState("Available");

  const [formPlanName, setFormPlanName] = useState("");
  const [formPlanCategory, setFormPlanCategory] = useState("All Categories");
  const [formPlanPricingType, setFormPlanPricingType] = useState("Dynamic");
  const [formPlanMealPlan, setFormPlanMealPlan] = useState("Continental Breakfast");
  const [formPlanPolicy, setFormPlanPolicy] = useState("Refundable");
  const [formPlanMinStay, setFormPlanMinStay] = useState("1 Night");

  const [formRestType, setFormRestType] = useState("Minimum Stay");
  const [formRestRoomType, setFormRestRoomType] = useState("Maharaja Suite");
  const [formRestValue, setFormRestValue] = useState("");
  const [formRestDates, setFormRestDates] = useState("2026-08-20 to 2026-08-25");

  // Filters & Searches states
  const [searchQuery, setSearchQuery] = useState("");
  const [floorFilter, setFloorFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [propsRes, roomsRes] = await Promise.all([
        superAdminService.getProperties(),
        adminService.getRooms().catch(() => ({ success: true, data: [] }))
      ]);

      if (propsRes.success && propsRes.data) {
        setProperties(propsRes.data);
        if (propsRes.data.length > 0) {
          const prop = propsRes.data[0];
          setSelectedPropId(prop._id || prop.id);
          
          const settings = prop.settings || {};
          if (settings.roomTypes) setRoomTypesList(settings.roomTypes);
          if (settings.ratePlans) setRatePlansList(settings.ratePlans);
          if (settings.restrictions) setRestrictionsList(settings.restrictions);
        }
      }

      if (roomsRes.success && roomsRes.data) {
        setRoomsList(roomsRes.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load properties and rooms dataset");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Handlers for dynamic creations

  const handleCreateRatePlan = async (e) => {
    e.preventDefault();
    if (!formPlanName) {
      toast.error("Rate plan name is required");
      return;
    }
    const newPlan = {
      _id: `P-${Date.now()}`,
      name: formPlanName,
      category: formPlanCategory,
      baseRate: "BAR Custom",
      pricingType: formPlanPricingType,
      mealPlan: formPlanMealPlan,
      policy: formPlanPolicy,
      minStay: formPlanMinStay,
      status: "Active",
      lastUpdated: "Just now"
    };

    try {
      const nextPlans = [...ratePlansList, newPlan];
      if (properties.length > 0) {
        const prop = properties[0];
        const nextSettings = {
          ...(prop.settings || {}),
          ratePlans: nextPlans
        };
        await superAdminService.updateProperty(prop._id || prop.id, { settings: nextSettings });
      }
      setRatePlansList(nextPlans);
      setIsAddPlanOpen(false);
      setFormPlanName("");
      toast.success(`Rate Plan ${formPlanName} published successfully!`);
    } catch (err) {
      toast.error(err.message || "Failed to publish rate plan.");
    }
  };

  const handleCreateRestriction = async (e) => {
    e.preventDefault();
    if (!formRestValue) {
      toast.error("Restriction limit value is required");
      return;
    }
    const newRest = {
      _id: `RE-${Date.now()}`,
      roomType: formRestRoomType,
      type: formRestType,
      value: formRestValue,
      effectiveDates: formRestDates,
      status: "Active"
    };

    try {
      const nextRest = [...restrictionsList, newRest];
      if (properties.length > 0) {
        const prop = properties[0];
        const nextSettings = {
          ...(prop.settings || {}),
          restrictions: nextRest
        };
        await superAdminService.updateProperty(prop._id || prop.id, { settings: nextSettings });
      }
      setRestrictionsList(nextRest);
      setIsAddRestrictionOpen(false);
      setFormRestValue("");
      toast.success(`Stay restriction configured successfully!`);
    } catch (err) {
      toast.error(err.message || "Failed to configure restriction.");
    }
  };

  // Change room status manually
  const handleChangeRoomStatus = async (roomNumberOrId, newStatus) => {
    try {
      const target = roomsList.find(r => r.roomNumber === roomNumberOrId || (r._id || r.id) === roomNumberOrId);
      const targetId = target?._id || target?.id || roomNumberOrId;
      await adminService.updateRoom(targetId, { status: newStatus });
      toast.success("Room status override updated.");
      loadData();
      setIsChangeStatusOpen(false);
    } catch (err) {
      toast.error(err.message || "Failed to update room status.");
    }
  };

  // Toggle status activations
  const toggleItemStatus = (id, type) => {
    if (type === "type") {
      setRoomTypesList(prev => {
        const next = prev.map(t => t._id === id ? { ...t, status: t.status === "Active" ? "Inactive" : "Active" } : t);
        localStorage.setItem("hms_room_types_list", JSON.stringify(next));
        return next;
      });
      toast.success("Room category status toggled successfully!");
    } else if (type === "plan") {
      setRatePlansList(prev => prev.map(p => p._id === id ? { ...p, status: p.status === "Active" ? "Inactive" : "Active" } : p));
      toast.success("Rate plan status toggled successfully!");
    } else if (type === "restriction") {
      setRestrictionsList(prev => prev.map(r => r._id === id ? { ...r, status: r.status === "Active" ? "Inactive" : "Active" } : r));
      toast.success("Restriction status toggled successfully!");
    }
  };

  // Date generators
  const getCalendarDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(calendarStart);
      d.setDate(calendarStart.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const dayName = d.toLocaleDateString("en-IN", { weekday: "short" });
      dates.push({ dateStr, label, dayName });
    }
    return dates;
  };
  const activeCalendarDates = getCalendarDates();

  const handlePrevWeek = () => {
    setCalendarStart(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setCalendarStart(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
  };

  const getWeekRangeLabel = () => {
    if (activeCalendarDates.length === 0) return "";
    const start = activeCalendarDates[0];
    const end = activeCalendarDates[6];
    return `${start.label} - ${end.label}, ${calendarStart.getFullYear()}`;
  };

  // KPI Computations
  const kpiTotal = roomsList.length;
  const kpiAvailable = roomsList.filter(r => r.status === "Available").length;
  const kpiOccupied = roomsList.filter(r => r.status === "Occupied").length;
  const kpiReserved = 4; // Mock reservations
  const kpiBlocked = roomsList.filter(r => r.status === "Blocked").length;
  const kpiMaintenance = roomsList.filter(r => r.status === "Out of Order" || r.status === "Dirty").length;
  const kpiRatePlans = ratePlansList.filter(r => r.status === "Active").length;

  // Filter Computations for Rooms inventory table
  const filteredRooms = roomsList.filter(rm => {
    const matchesSearch =
      rm.roomNumber.includes(searchQuery) ||
      rm.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFloor = floorFilter === "all" || rm.floor === floorFilter;
    const matchesType = typeFilter === "all" || rm.category === typeFilter;
    const matchesStatus = statusFilter === "all" || rm.status === statusFilter;

    return matchesSearch && matchesFloor && matchesType && matchesStatus;
  });

  const totalPages = Math.ceil(filteredRooms.length / itemsPerPage) || 1;
  const paginatedRooms = filteredRooms.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Status mapping colors & icons
  const statusMeta = {
    Available: { tone: "success", icon: CheckCircle, label: "Available", bgAccent: "border-l-success" },
    Occupied: { tone: "brand", icon: Bed, label: "Occupied", bgAccent: "border-l-indigo" },
    Dirty: { tone: "warning", icon: AlertTriangle, label: "Dirty", bgAccent: "border-l-warning" },
    Cleaning: { tone: "purple", icon: Sparkles, label: "Cleaning", bgAccent: "border-l-purple" },
    "Out of Order": { tone: "error", icon: XCircle, label: "Maintenance", bgAccent: "border-l-destructive" },
    Blocked: { tone: "neutral", icon: Clock, label: "Blocked", bgAccent: "border-l-neutral" }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Rooms & Rates" subtitle="Synchronizing room configurations..." />
        <LoadingRows rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in font-ui">
      


      {/* 2. Standardized Metric KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PremiumStatCard label="Total Rooms" value={kpiTotal.toString()} hint="Assigned property capacity" accentColor="#0d1b2a" />
        <PremiumStatCard label="Available" value={kpiAvailable.toString()} hint="Vacant & clean rooms" accentColor="#10b981" />
        <PremiumStatCard label="Occupied" value={kpiOccupied.toString()} hint="Active guests stays" accentColor="#3b82f6" />
        <PremiumStatCard label="Maintenance" value={kpiMaintenance.toString()} hint="Dirty/maintenance turnaround" accentColor="#ef4444" />
      </div>

      {/* 3. Main Navigation Sub-tabs */}
      <div className="flex flex-wrap gap-1 border-b border-muted pb-px select-none">
        {[
          { id: "rooms", label: "Rooms List", icon: Bed },
          { id: "types", label: "Room Types", icon: Layers },
          { id: "plans", label: "Rate Plans", icon: TrendingUp },
          { id: "availability", label: "Availability Calendar", icon: Calendar },
          { id: "restrictions", label: "Stay Restrictions", icon: Sliders }
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all relative border-b-2 ${
                isActive 
                  ? "border-brand text-brand bg-brand/5 rounded-t-lg" 
                  : "border-transparent text-muted-foreground hover:text-navy hover:bg-muted/10 rounded-t-lg"
              }`}
            >
              <TabIcon className="size-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 4. Tab Contents View */}

      {/* Tab A: Rooms Inventory List */}
      {activeTab === "rooms" && (
        <div className="space-y-4 font-ui">
          {/* Filters Bar */}
          <div className="bg-white border border-muted rounded-xl p-4 shadow-soft grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
            <div className="relative col-span-1 sm:col-span-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-1 text-left">Search Rooms</span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search Room Number or category..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-9 h-9 text-xs font-semibold bg-[#FDFCFA]/10 border-muted w-full"
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-1 text-left">
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Floor</span>
              <Select
                value={floorFilter}
                onChange={(e) => { setFloorFilter(e.target.value); setCurrentPage(1); }}
                className="text-xs h-8.5 font-bold bg-[#FDFCFA]/20 border-muted"
              >
                <option value="all">All Floors</option>
                <option value="Floor 1">Floor 1</option>
                <option value="Floor 2">Floor 2</option>
                <option value="Floor 3">Floor 3</option>
              </Select>
            </div>

            <div className="flex flex-col gap-1 text-left">
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Status</span>
              <Select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="text-xs h-8.5 font-bold bg-[#FDFCFA]/20 border-muted"
              >
                <option value="all">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Dirty">Dirty</option>
                <option value="Blocked">Blocked</option>
                <option value="Out of Order">Out of Order</option>
              </Select>
            </div>

            <div className="flex justify-end select-none">
              <Button
                onClick={() => navigate({ to: "/admin/rooms/add" })}
                className="bg-navy hover:bg-navy/90 text-white shadow-soft text-xs h-9 px-4 font-bold rounded-full w-full justify-center flex items-center gap-1.5"
              >
                <Plus className="size-4" /> Add Room
              </Button>
            </div>
          </div>

          {/* Rooms Table */}
          <div className="bg-white border border-muted rounded-xl shadow-soft overflow-hidden">
            {paginatedRooms.length === 0 ? (
              <div className="p-16 text-center">
                <Bed className="size-12 text-muted-foreground/45 mx-auto mb-3" />
                <h3 className="font-semibold text-navy">No rooms matching filters found</h3>
                <p className="text-xs text-muted-foreground mt-1">Adjust search parameters or configure new rooms.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs table-fixed">
                  <colgroup>
                    <col className="w-[130px]" />
                    <col className="w-[170px]" />
                    <col className="w-[100px]" />
                    <col className="w-[130px]" />
                    <col className="w-[120px]" />
                    <col className="w-[120px]" />
                    <col className="w-[110px]" />
                    <col className="w-[110px]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none">
                      <th className="py-4.5 px-6 w-[130px] min-w-[130px]">Room Number</th>
                      <th className="py-4.5 px-4 w-[170px] min-w-[170px]">Room Type</th>
                      <th className="py-4.5 px-4 w-[100px] min-w-[100px]">Floor Map</th>
                      <th className="py-4.5 px-4 w-[130px] min-w-[130px]">Active Plan</th>
                      <th className="py-4.5 px-4 w-[120px] min-w-[120px]">Daily Rate</th>
                      <th className="py-4.5 px-4 w-[120px] min-w-[120px]">Status</th>
                      <th className="py-4.5 px-4 w-[110px] min-w-[110px]">Last Sync</th>
                      <th className="py-4.5 px-6 w-[110px] min-w-[110px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted text-sm text-[#2a2a2a] bg-white font-medium">
                    {paginatedRooms.map((rm) => {
                      const meta = statusMeta[rm.status] || statusMeta.Available;
                      const StatusIcon = meta.icon;
                      return (
                        <tr key={rm._id} className="hover:bg-[#fcfcfc]/60 transition-colors group">
                          <td className="py-4 px-6 font-bold text-navy-deep text-sm w-[130px] min-w-[130px] truncate">Room {rm.roomNumber}</td>
                          <td className="py-4 px-4 font-bold text-brand w-[170px] min-w-[170px] truncate">{rm.category}</td>
                          <td className="py-4 px-4 text-muted-foreground w-[100px] min-w-[100px] truncate">{rm.floor}</td>
                          <td className="py-4 px-4 font-mono text-[11px] text-muted-foreground w-[130px] min-w-[130px] truncate">{rm.ratePlan}</td>
                          <td className="py-4 px-4 font-bold text-navy w-[120px] min-w-[120px] truncate">₹{rm.currentRate?.toLocaleString()}</td>
                          <td className="py-4 px-4 w-[120px] min-w-[120px]">
                            <Tag tone={meta.tone} className="flex items-center gap-1 w-fit select-none py-0.5">
                              <StatusIcon className="size-3" />
                              <span>{meta.label}</span>
                            </Tag>
                          </td>
                          <td className="py-4 px-4 text-muted-foreground text-[11px] w-[110px] min-w-[110px] truncate">{rm.lastUpdated}</td>
                          <td className="py-4 px-6 text-right w-[110px] min-w-[110px]">
                            <div className="flex items-center justify-end gap-1.5 select-none opacity-85 group-hover:opacity-100 transition-opacity">
                              <Button
                                onClick={() => navigate({ to: `/admin/rooms/view/${rm._id}` })}
                                size="icon"
                                variant="ghost"
                                className="size-7 hover:text-[#4f46e5] cursor-pointer"
                                title="View Specifications"
                              >
                                <Eye className="size-3.5" />
                              </Button>
                              <Button
                                onClick={() => {
                                  setSelectedItem(rm);
                                  setFormRoomStatus(rm.status);
                                  setIsChangeStatusOpen(true);
                                }}
                                size="icon"
                                variant="ghost"
                                className="size-7 hover:text-success cursor-pointer"
                                title="Override Status"
                              >
                                <Sliders className="size-3.5" />
                              </Button>
                              <Button
                                onClick={() => navigate({ to: `/admin/rooms/edit/${rm._id}` })}
                                size="icon"
                                variant="ghost"
                                className="size-7 hover:text-brand cursor-pointer"
                                title="Edit Configuration"
                              >
                                <Edit2 className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
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
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab B: Room Types Specifications */}
      {activeTab === "types" && (
        <div className="space-y-4 font-ui">
          <div className="flex justify-between items-center bg-white border border-muted p-4 rounded-xl shadow-soft">
            <span className="text-xs text-muted-foreground font-semibold">Registered Categories: **{roomTypesList.length} Types**</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roomTypesList.map((type) => (
              <div key={type._id} className="bg-white border border-muted rounded-xl p-5 shadow-soft flex flex-col justify-between space-y-4">
                <div className="space-y-2 text-left">
                  <div className="flex justify-between items-center">
                    <h4 className="font-display font-black text-navy text-md">{type.category}</h4>
                    <Tag tone={type.status === "Active" ? "success" : "neutral"} className="py-0.5">
                      {type.status}
                    </Tag>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-muted/30 text-xs">
                    <div>
                      <span className="text-[9px] text-muted-foreground block font-bold uppercase">Base Rate</span>
                      <strong className="text-navy mt-0.5 block">₹{type.baseRate?.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground block font-bold uppercase">Occupancy</span>
                      <strong className="text-navy mt-0.5 block">{type.occupancy}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground block font-bold uppercase">Active Plans</span>
                      <strong className="text-navy mt-0.5 block">{type.activePlans} Plans</strong>
                    </div>
                  </div>
                  <div className="pt-2">
                    <span className="text-[9px] text-muted-foreground block font-bold uppercase mb-1">Amenities</span>
                    <div className="flex flex-wrap gap-1.5 select-none">
                      {type.amenities.map((a, idx) => (
                        <span key={idx} className="inline-flex items-center gap-0.5 rounded bg-[#fcfcfc] border border-muted px-1.5 py-0.5 text-[8.5px] font-semibold text-navy">
                          <Sparkles className="size-2 text-gold mr-0.5" /> {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-muted/30">
                  <Button
                    onClick={() => toggleItemStatus(type._id, "type")}
                    size="xs"
                    variant="outline"
                    className={`h-7 px-3.5 font-bold ${type.status === "Active" ? "text-destructive border-destructive/30 hover:bg-destructive/5" : "text-success border-success/30 hover:bg-success/5"}`}
                  >
                    {type.status === "Active" ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedItem(type);
                      setFormTypeCategory(type.category);
                      setFormTypeOccupancy(type.occupancy);
                      setFormTypeBaseRate(type.baseRate.toString());
                      setFormTypeAmenities(type.amenities.join(", "));
                      setIsAddTypeOpen(true);
                    }}
                    size="xs"
                    className="bg-navy hover:bg-navy-deep text-white h-7 px-3.5 font-bold"
                  >
                    Edit Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab C: Rate Configuration Plans */}
      {activeTab === "plans" && (
        <div className="space-y-4 font-ui">
          <div className="flex justify-between items-center bg-white border border-muted p-4 rounded-xl shadow-soft">
            <span className="text-xs text-muted-foreground font-semibold">Active pricing schemes</span>
            <Button
              onClick={() => setIsAddPlanOpen(true)}
              className="bg-navy hover:bg-navy/90 text-white shadow-soft text-xs h-8 px-3 font-bold rounded-full"
            >
              <Plus className="size-3.5 mr-1" /> Create Rate Plan
            </Button>
          </div>

          <div className="bg-white border border-muted rounded-xl shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none">
                    <th className="py-4.5 px-6">Plan Details</th>
                    <th className="py-4.5 px-4">Room Category</th>
                    <th className="py-4.5 px-4">Meal Plan</th>
                    <th className="py-4.5 px-4 text-center">Cancellation Rule</th>
                    <th className="py-4.5 px-4 text-center">Min Stay</th>
                    <th className="py-4.5 px-4 text-center">Status</th>
                    <th className="py-4.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted text-sm text-[#2a2a2a] bg-white font-medium">
                  {ratePlansList.map((plan) => (
                    <tr key={plan._id} className="hover:bg-[#fcfcfc]/60 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="font-bold text-navy-deep text-sm">{plan.name}</div>
                        <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">Pricing Type: **{plan.pricingType}** · Base: **{plan.baseRate}**</div>
                      </td>
                      <td className="py-4 px-4 font-bold text-brand">{plan.category}</td>
                      <td className="py-4 px-4 text-muted-foreground">{plan.mealPlan}</td>
                      <td className="py-4 px-4 text-center text-muted-foreground">{plan.policy}</td>
                      <td className="py-4 px-4 text-center font-mono font-bold text-navy">{plan.minStay}</td>
                      <td className="py-4 px-4 text-center">
                        <span className="flex justify-center">
                          <Tag tone={plan.status === "Active" ? "success" : "neutral"} className="py-0.5">
                            {plan.status}
                          </Tag>
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5 select-none">
                          <Button
                            onClick={() => toggleItemStatus(plan._id, "plan")}
                            size="xs"
                            variant="outline"
                            className={`h-7 text-[10px] font-bold ${plan.status === "Active" ? "text-destructive border-destructive/20 hover:bg-destructive/5" : "text-success border-success/20 hover:bg-success/5"}`}
                          >
                            {plan.status === "Active" ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedItem(plan);
                              setFormPlanName(plan.name);
                              setFormPlanCategory(plan.category);
                              setFormPlanPricingType(plan.pricingType);
                              setFormPlanMealPlan(plan.mealPlan);
                              setFormPlanPolicy(plan.policy);
                              setFormPlanMinStay(plan.minStay);
                              setIsAddPlanOpen(true);
                            }}
                            size="icon"
                            variant="ghost"
                            className="size-7 hover:text-brand cursor-pointer text-muted-foreground"
                            title="Edit plan configuration"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab D: Live Availability Timeline Calendar Grid */}
      {activeTab === "availability" && (
        <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4 font-ui">
          <div className="flex items-center justify-between pb-3 border-b border-muted">
            <div>
              <h3 className="font-display font-black text-navy text-md">Live Room Availability Timeline</h3>
              <p className="text-[9px] text-muted-foreground mt-0.5">Active daily status logs of scoped rooms and categories.</p>
            </div>
            <div className="flex items-center gap-2 select-none">
              <Button size="icon" variant="ghost" className="size-8 cursor-pointer" onClick={handlePrevWeek} title="Previous Week">
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs font-bold text-navy">{getWeekRangeLabel()}</span>
              <Button size="icon" variant="ghost" className="size-8 cursor-pointer" onClick={handleNextWeek} title="Next Week">
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px] table-fixed">
              <colgroup>
                <col className="w-[140px]" />
                <col className="w-[96px]" />
                <col className="w-[96px]" />
                <col className="w-[96px]" />
                <col className="w-[96px]" />
                <col className="w-[96px]" />
                <col className="w-[96px]" />
                <col className="w-[96px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none">
                  <th className="py-3.5 px-4 w-[140px] min-w-[140px]">Room Number</th>
                  {activeCalendarDates.map((d, idx) => (
                    <th key={idx} className="py-3.5 px-2 text-center w-[96px] min-w-[96px]">
                      <div>{d.dayName}</div>
                      <div className="text-[9px] text-muted-foreground font-normal lowercase">{d.label}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-muted text-sm text-[#2a2a2a]">
                {roomsList.map((room) => (
                  <tr key={room._id} className="hover:bg-[#fcfcfc]/60">
                    <td className="py-3.5 px-4 font-semibold text-navy text-left align-middle w-[140px] min-w-[140px]">
                      <div>Room {room.roomNumber}</div>
                      <div className="text-[9px] text-muted-foreground font-normal">{room.category}</div>
                    </td>
                    
                    {activeCalendarDates.map((dateObj, dIdx) => {
                      const isOccupied = room.status === "Occupied" && dIdx % 3 === 0;
                      const isBlocked = room.status === "Blocked" && dIdx % 4 === 1;
                      const isMaintenance = (room.status === "Out of Order" || room.status === "Dirty") && dIdx % 5 === 2;
                      const isAvailable = !isOccupied && !isBlocked && !isMaintenance;

                      let cellTone = "bg-success/15 text-success border border-success/30";
                      let cellLabel = "Available";

                      if (isOccupied) {
                        cellTone = "bg-brand/15 text-brand border border-brand/30";
                        cellLabel = "Occupied";
                      } else if (isBlocked) {
                        cellTone = "bg-neutral/15 text-neutral-dark border border-neutral/30";
                        cellLabel = "Blocked";
                      } else if (isMaintenance) {
                        cellTone = "bg-destructive/15 text-destructive border border-destructive/30";
                        cellLabel = "Maintenance";
                      }

                      return (
                        <td key={dIdx} className="py-3.5 px-2 text-center select-none cursor-pointer align-middle w-[96px] min-w-[96px]" onClick={() => {
                          setSelectedItem(room);
                          setIsDetailOpen(true);
                        }}>
                          <div className="flex items-center justify-center">
                            <div className={`py-1 px-1.5 rounded-lg text-[9px] font-black truncate text-center w-full max-w-[84px] cursor-pointer ${cellTone}`}>
                              {cellLabel}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab E: Restrictions Management Panel */}
      {activeTab === "restrictions" && (
        <div className="space-y-4 font-ui">
          <div className="flex justify-between items-center bg-white border border-muted p-4 rounded-xl shadow-soft">
            <div>
              <h3 className="font-display font-black text-navy text-sm">GDS Parity Stay Restrictions</h3>
              <p className="text-[9px] text-muted-foreground mt-0.5">Enforce Length-of-Stay rules, stop-sells, or closed check-ins.</p>
            </div>
            <Button
              onClick={() => setIsAddRestrictionOpen(true)}
              className="bg-navy hover:bg-navy/90 text-white shadow-soft text-xs h-8 px-3.5 font-bold rounded-full"
            >
              <Plus className="size-3.5 mr-1" /> Add Restriction
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {restrictionsList.map((rest) => (
              <div key={rest._id} className="bg-white border border-muted rounded-xl p-4.5 shadow-soft flex flex-col justify-between space-y-3.5 text-xs text-left">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">{rest.type}</span>
                    <Tag tone={rest.status === "Active" ? "error" : "neutral"} className="py-0.5 select-none scale-90">
                      {rest.status === "Active" ? "Enforced" : "Disabled"}
                    </Tag>
                  </div>
                  <h4 className="font-bold text-navy-deep text-sm">{rest.roomType}</h4>
                  <div className="pt-2 border-t border-muted/30 space-y-1">
                    <div className="flex justify-between"><span>Restriction Limit:</span> <strong className="text-navy">{rest.value}</strong></div>
                    <div className="flex justify-between"><span>Effective Dates:</span> <strong className="text-navy">{rest.effectiveDates}</strong></div>
                  </div>
                </div>
                <div className="pt-3 border-t border-muted/30 flex justify-end gap-2">
                  <Button
                    onClick={() => toggleItemStatus(rest._id, "restriction")}
                    size="xs"
                    variant="outline"
                    className={`h-7 px-3.5 font-bold ${rest.status === "Active" ? "text-destructive border-destructive/20 hover:bg-destructive/5" : "text-success border-success/20 hover:bg-success/5"}`}
                  >
                    {rest.status === "Active" ? "Disable" : "Re-enable"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* 6. Form Modals / Drawers */}



      {/* Drawer C: Add/Edit Rate Plan */}
      {isAddPlanOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end font-sans">
          <div className="absolute inset-0 bg-navy-deep/40 backdrop-blur-sm transition-opacity" onClick={() => setIsAddPlanOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between text-left animate-slide-in">
            <div className="p-5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-navy-deep">Create Rate Configuration Plan</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Publish pricing rules, meal plans and cancellation policies.</p>
              </div>
              <Button size="icon" variant="ghost" className="size-8 rounded-full" onClick={() => setIsAddPlanOpen(false)}>
                <X className="size-4.5" />
              </Button>
            </div>
            
            <form onSubmit={handleCreateRatePlan} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Rate Plan Name</label>
                <Input
                  required
                  placeholder="e.g. Monsoon Promo Plan"
                  value={formPlanName}
                  onChange={(e) => setFormPlanName(e.target.value)}
                  className="h-9.5 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Target Room Category</label>
                <Select
                  value={formPlanCategory}
                  onChange={(e) => setFormPlanCategory(e.target.value)}
                  className="text-xs h-9.5 font-bold"
                >
                  <option value="All Categories">All Categories</option>
                  <option value="Villa Suite">Villa Suite</option>
                  <option value="Maharaja Suite">Maharaja Suite</option>
                  <option value="Heritage Luxury">Heritage Luxury</option>
                  <option value="Superior Deluxe">Superior Deluxe</option>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Pricing Type</label>
                  <Select
                    value={formPlanPricingType}
                    onChange={(e) => setFormPlanPricingType(e.target.value)}
                    className="text-xs h-9.5 font-bold"
                  >
                    <option value="Dynamic">Dynamic Pricing</option>
                    <option value="Flat">Flat Price</option>
                    <option value="Length-based">Length-of-Stay</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Meal Plan</label>
                  <Select
                    value={formPlanMealPlan}
                    onChange={(e) => setFormPlanMealPlan(e.target.value)}
                    className="text-xs h-9.5 font-bold"
                  >
                    <option value="Continental Breakfast">Continental Breakfast</option>
                    <option value="Room Only">Room Only</option>
                    <option value="Half Board (MAP)">Half Board (MAP)</option>
                    <option value="All Inclusive">All Inclusive</option>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Cancellation Policy</label>
                <Input
                  placeholder="e.g. Refundable up to 24h prior"
                  value={formPlanPolicy}
                  onChange={(e) => setFormPlanPolicy(e.target.value)}
                  className="h-9.5 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Minimum Stay Limit</label>
                <Select
                  value={formPlanMinStay}
                  onChange={(e) => setFormPlanMinStay(e.target.value)}
                  className="text-xs h-9.5 font-bold"
                >
                  <option value="1 Night">1 Night</option>
                  <option value="2 Nights">2 Nights</option>
                  <option value="3 Nights">3 Nights</option>
                  <option value="5 Nights">5 Nights</option>
                </Select>
              </div>

              <div className="pt-4 border-t border-muted/30 flex justify-end gap-2">
                <Button type="button" variant="ghost" className="h-9 text-xs" onClick={() => setIsAddPlanOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-navy hover:bg-navy-deep text-white text-xs h-9 px-5 font-bold rounded-full">Publish Rate Plan</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer D: Configure Restrictions */}
      {isAddRestrictionOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end font-sans">
          <div className="absolute inset-0 bg-navy-deep/40 backdrop-blur-sm transition-opacity" onClick={() => setIsAddRestrictionOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between text-left animate-slide-in">
            <div className="p-5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-navy-deep">Add Stay Restriction</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Enforce checks on arrivals, departures, checkouts, or stop-sells.</p>
              </div>
              <Button size="icon" variant="ghost" className="size-8 rounded-full" onClick={() => setIsAddRestrictionOpen(false)}>
                <X className="size-4.5" />
              </Button>
            </div>
            
            <form onSubmit={handleCreateRestriction} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Restriction Policy Type</label>
                <Select
                  value={formRestType}
                  onChange={(e) => setFormRestType(e.target.value)}
                  className="text-xs h-9.5 font-bold"
                >
                  <option value="Minimum Stay">Minimum Stay Nights</option>
                  <option value="Maximum Stay">Maximum Stay Nights</option>
                  <option value="Closed to Arrival (CTA)">Closed to Arrival (CTA)</option>
                  <option value="Closed to Departure (CTD)">Closed to Departure (CTD)</option>
                  <option value="Stop Sell">Stop Sell (Global Sync Lock)</option>
                </Select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Target Room Category</label>
                <Select
                  value={formRestRoomType}
                  onChange={(e) => setFormRestRoomType(e.target.value)}
                  className="text-xs h-9.5 font-bold"
                >
                  <option value="Maharaja Suite">Maharaja Suite</option>
                  <option value="Villa Suite">Villa Suite</option>
                  <option value="Heritage Luxury">Heritage Luxury</option>
                  <option value="Superior Deluxe">Superior Deluxe</option>
                </Select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Limit Value / Flag</label>
                <Input
                  required
                  placeholder="e.g. 3 Nights or True"
                  value={formRestValue}
                  onChange={(e) => setFormRestValue(e.target.value)}
                  className="h-9.5 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Effective Dates Span</label>
                <Input
                  required
                  placeholder="e.g. 2026-08-20 to 2026-08-25"
                  value={formRestDates}
                  onChange={(e) => setFormRestDates(e.target.value)}
                  className="h-9.5 text-xs font-semibold"
                />
              </div>

              <div className="pt-4 border-t border-muted/30 flex justify-end gap-2">
                <Button type="button" variant="ghost" className="h-9 text-xs" onClick={() => setIsAddRestrictionOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-navy hover:bg-navy-deep text-white text-xs h-9 px-5 font-bold rounded-full">Apply Restriction</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal E: Change Room Status Override */}
      {isChangeStatusOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-xl border border-muted max-w-sm w-full shadow-lift overflow-hidden text-left flex flex-col">
            <div className="p-5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <h3 className="font-display font-black text-navy text-sm">Room {selectedItem.roomNumber} Status Override</h3>
              <Button size="icon" variant="ghost" className="size-8" onClick={() => setIsChangeStatusOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            
            <div className="p-5 space-y-4">
              <p className="text-xs text-muted-foreground">Force status overrides to trigger cleanups or lock room inventory.</p>
              
              <div className="space-y-2">
                {["Available", "Dirty", "Blocked", "Out of Order"].map((status) => {
                  const meta = statusMeta[status] || statusMeta.Available;
                  const Icon = meta.icon;
                  return (
                    <button
                      key={status}
                      onClick={() => handleChangeRoomStatus(selectedItem.roomNumber, status)}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl border border-muted hover:bg-muted/20 text-xs font-bold text-navy transition-all"
                    >
                      <span className="flex items-center gap-2"><Icon className="size-4 text-brand" /> {meta.label}</span>
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}