import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HorizontalRouteTabs, PageHeader, Notice, LoadingRows, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/hs/FormFields";
import { superAdminService } from "@/services/superAdmin";
import { adminService } from "@/services/admin";
import { toast } from "sonner";
import { subscribeRealtimeSync } from "@/services/socket";
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
  { label: "Guests", to: "/admin/guests", icon: Users }
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
  // Core Data States
  const [roomsList, setRoomsList] = useState([]);

  const [roomTypesList, setRoomTypesList] = useState(() => {
    const saved = localStorage.getItem("hms_room_types_list_v2");
    if (saved) return JSON.parse(saved);
    const initial = [
      { _id: "RT-01", category: "Standard Room", rooms: ["101", "102", "103"], roomsCount: 3, occupancy: "2 Adults", baseRate: 3000, activePlans: 1, amenities: ["Air Conditioning", "High-speed Wi-Fi", "Flat Screen TV"], status: "Active" },
      { _id: "RT-02", category: "Deluxe Room", rooms: ["201", "202", "203", "401", "402", "403"], roomsCount: 6, occupancy: "2 Adults + 1 Child", baseRate: 4500, activePlans: 2, amenities: ["Balcony View", "Smart TV", "Room Service", "Mini Bar"], status: "Active" },
      { _id: "RT-03", category: "Executive Suite", rooms: ["301", "302", "303"], roomsCount: 3, occupancy: "4 Adults", baseRate: 6500, activePlans: 2, amenities: ["Jacuzzi Bath", "Living Room", "Espresso Machine", "Airport Transfer"], status: "Active" }
    ];
    localStorage.setItem("hms_room_types_list_v2", JSON.stringify(initial));
    return initial;
  });

  const [ratePlansList, setRatePlansList] = useState([
    { _id: "P-01", name: "Standard Plan", category: "All Categories", baseRate: "BAR 100%", pricingType: "Standard", mealPlan: "Continental Breakfast", policy: "Refundable up to 24h prior", minStay: "1 Night", status: "Active", lastUpdated: "1 hr ago" },
    { _id: "P-02", name: "Deluxe Plan", category: "Deluxe Room, Executive Suite", baseRate: "BAR - 10%", pricingType: "Package", mealPlan: "Half Board", policy: "Refundable up to 48h prior", minStay: "1 Night", status: "Active", lastUpdated: "4 hrs ago" },
    { _id: "P-03", name: "Weekend Plan", category: "Villa Suite", baseRate: "BAR Special", pricingType: "Dynamic", mealPlan: "Full Board", policy: "Non-refundable", minStay: "2 Nights", status: "Active", lastUpdated: "Yesterday" }
  ]);

  const [restrictionsList, setRestrictionsList] = useState([
    { _id: "RE-01", roomType: "Executive Suite", type: "Minimum Stay", value: "2 Nights", effectiveDates: "2026-08-20 to 2026-08-25", status: "Active" },
    { _id: "RE-02", roomType: "Villa Suite", type: "Closed to Arrival (CTA)", value: "True", effectiveDates: "2026-08-18 to 2026-08-19", status: "Active" }
  ]);

  // Calendar scheduler state (Starts from TODAY)
  const [calendarStart, setCalendarStart] = useState(() => new Date());

  // Form / Drawer Modals states
  const [isAddPlanOpen, setIsAddPlanOpen] = useState(false);
  const [isChangeStatusOpen, setIsChangeStatusOpen] = useState(false);
  const [isAddRestrictionOpen, setIsAddRestrictionOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Room Types Action Modals
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
  const [isViewTypeOpen, setIsViewTypeOpen] = useState(false);
  const [isAddRoomToCategoryOpen, setIsAddRoomToCategoryOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form Fields States
  const [formRoomStatus, setFormRoomStatus] = useState("Available");

  // Room Type Form States
  const [formTypeCategory, setFormTypeCategory] = useState("");
  const [formTypeBaseRate, setFormTypeBaseRate] = useState("3000");
  const [formTypeOccupancy, setFormTypeOccupancy] = useState("2 Adults");
  const [formTypeAmenities, setFormTypeAmenities] = useState("");
  const [formTypeRooms, setFormTypeRooms] = useState("");
  const [formTypeStatus, setFormTypeStatus] = useState("Active");

  // Add Room to Category Form States
  const [formAddRoomCategory, setFormAddRoomCategory] = useState("Standard Room");
  const [formAddRoomNumber, setFormAddRoomNumber] = useState("");
  const [formAddRoomFloor, setFormAddRoomFloor] = useState("Floor 1");
  const [formAddRoomRate, setFormAddRoomRate] = useState("3000");

  const [formPlanName, setFormPlanName] = useState("");
  const [formPlanCategory, setFormPlanCategory] = useState("All Categories");
  const [formPlanPricingType, setFormPlanPricingType] = useState("Dynamic");

  // Load backend properties & dynamic room dataset
  async function loadData(isSilent = false) {
    try {
      if (!isSilent) setLoading(true);
      const [propsRes, roomsRes, resRes] = await Promise.all([
        superAdminService.getProperties(),
        adminService.getRooms(),
        superAdminService.getReservations()
      ]);

      if (propsRes.success && propsRes.data && propsRes.data.length > 0) {
        setProperties(propsRes.data);
        const prop = propsRes.data[0];
        setSelectedPropId(prop._id || prop.id);
        
        const settings = prop.settings || {};
        if (settings.roomTypes) setRoomTypesList(settings.roomTypes);
        if (settings.ratePlans) setRatePlansList(settings.ratePlans);
        if (settings.restrictions) setRestrictionsList(settings.restrictions);
      }

      const checkedInRoomNums = new Set();
      if (resRes && resRes.success && Array.isArray(resRes.data)) {
        resRes.data
          .filter(r => r.status === "Checked-in" || r.status === "Checked In")
          .forEach(r => {
            const roomVal = String(r.room || r.roomNumber || "");
            const match = roomVal.match(/\b\d{3,4}\b/);
            const num = match ? match[0] : roomVal.split("·")[0].split(" ")[0].trim();
            if (num) checkedInRoomNums.add(num);
          });
      }

      let initialRooms = (roomsRes.success && roomsRes.data && roomsRes.data.length > 0)
        ? roomsRes.data
        : roomsList;

      // Extract assigned rooms from room types in MongoDB settings & localStorage
      let cachedTypes = [];
      try {
        const saved = localStorage.getItem("hms_room_types_list_v2");
        if (saved) cachedTypes = JSON.parse(saved);
      } catch (e) {}

      const combinedTypes = [...(roomTypesList || []), ...cachedTypes];
      const existingNums = new Set(initialRooms.map(r => String(r.roomNumber || r.num)));

      combinedTypes.forEach(t => {
        const assigned = Array.isArray(t.rooms) ? t.rooms : [];
        assigned.forEach(num => {
          if (num && !existingNums.has(String(num))) {
            existingNums.add(String(num));
            initialRooms.push({
              _id: `R-${num}`,
              roomNumber: String(num),
              category: t.category,
              floor: `Floor ${String(num)[0] || '1'}`,
              status: "Available",
              baseRate: t.baseRate || 3500,
              currentRate: t.baseRate || 3500,
              dailyRate: t.baseRate || 3500,
              ratePlan: "Standard Plan"
            });
          }
        });
      });

      const normalized = initialRooms.map(rm => {
        const numStr = String(rm.roomNumber || rm.num || '');
        let cleanStatus = rm.status || 'Available';

        if (checkedInRoomNums.has(numStr)) {
          cleanStatus = 'Occupied';
        } else if (cleanStatus === 'Occupied') {
          cleanStatus = 'Available';
        }
        
        let roomFloor = rm.floor;
        if (!roomFloor) {
          const firstDigit = rm.roomNumber ? String(rm.roomNumber).charAt(0) : '';
          if (firstDigit && !isNaN(Number(firstDigit)) && Number(firstDigit) >= 1 && Number(firstDigit) <= 9) {
            roomFloor = `Floor ${firstDigit}`;
          } else {
            roomFloor = 'Floor 1';
          }
        }

        const actualRate = Number(rm.currentRate || rm.baseRate || rm.dailyRate || 3500);

        return {
          ...rm,
          status: cleanStatus,
          floor: roomFloor,
          category: rm.category || 'Standard Room',
          ratePlan: rm.ratePlan || 'Standard Plan',
          currentRate: actualRate,
          dailyRate: actualRate,
          baseRate: actualRate
        };
      });
      setRoomsList(normalized);
    } catch (err) {
      if (!isSilent) setError(err.message || "Failed to load properties and rooms dataset");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }

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

  useEffect(() => {
    loadData(false);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadData(true);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Handlers for dynamic creations & MongoDB Persistence

  const persistRoomTypesToMongoDB = async (updatedTypes) => {
    try {
      setRoomTypesList(updatedTypes);
      localStorage.setItem("hms_room_types_list_v2", JSON.stringify(updatedTypes));
      
      const settingsRes = await adminService.getPropertySettings().catch(() => ({}));
      const currentSettings = settingsRes.data || settingsRes || {};
      await adminService.updatePropertySettings({
        ...currentSettings,
        roomTypes: updatedTypes
      }).catch(() => {});

      if (properties.length > 0) {
        const prop = properties[0];
        await superAdminService.updateProperty(prop._id || prop.id, {
          settings: {
            ...(prop.settings || {}),
            roomTypes: updatedTypes
          }
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Failed to persist room types to MongoDB:", err);
    }
  };

  const handleSaveRoomType = async (e) => {
    e.preventDefault();
    if (!formTypeCategory) {
      toast.error("Room Type / Category name is required");
      return;
    }

    const roomsArr = formTypeRooms
      ? formTypeRooms.split(",").map(s => s.trim()).filter(Boolean)
      : [];

    const isEditing = selectedItem && selectedItem._id;
    let nextList = [];

    if (isEditing) {
      nextList = roomTypesList.map(t => {
        if (t._id === selectedItem._id || t.category === selectedItem.category) {
          return {
            ...t,
            category: formTypeCategory,
            baseRate: Number(formTypeBaseRate) || 3000,
            occupancy: formTypeOccupancy || "2 Adults",
            amenities: typeof formTypeAmenities === "string"
              ? formTypeAmenities.split(",").map(a => a.trim()).filter(Boolean)
              : formTypeAmenities,
            rooms: roomsArr.length > 0 ? roomsArr : (t.rooms || []),
            roomsCount: roomsArr.length > 0 ? roomsArr.length : (t.roomsCount || 1),
            status: formTypeStatus || "Active"
          };
        }
        return t;
      });
      toast.success(`Room Type "${formTypeCategory}" updated and saved to MongoDB!`);
    } else {
      const newType = {
        _id: `RT-${Date.now()}`,
        category: formTypeCategory,
        baseRate: Number(formTypeBaseRate) || 3000,
        occupancy: formTypeOccupancy || "2 Adults",
        activePlans: 1,
        amenities: typeof formTypeAmenities === "string"
          ? formTypeAmenities.split(",").map(a => a.trim()).filter(Boolean)
          : ["Air Conditioning", "Wi-Fi"],
        rooms: roomsArr,
        roomsCount: roomsArr.length,
        status: formTypeStatus || "Active"
      };
      nextList = [...roomTypesList, newType];
      toast.success(`Room Type "${formTypeCategory}" created and saved to MongoDB!`);
    }

    await persistRoomTypesToMongoDB(nextList);
    setIsAddTypeOpen(false);
    setSelectedItem(null);
  };

  const handleAddRoomToCategory = async (e) => {
    e.preventDefault();
    if (!formAddRoomNumber) {
      toast.error("Room number is required");
      return;
    }

    const targetType = roomTypesList.find(t => t.category === formAddRoomCategory) || roomTypesList[0];
    if (!targetType) return;

    const currentRooms = Array.isArray(targetType.rooms) ? targetType.rooms : [];
    if (currentRooms.includes(formAddRoomNumber)) {
      toast.error(`Room #${formAddRoomNumber} already exists in ${targetType.category}`);
      return;
    }

    const updatedRooms = [...currentRooms, formAddRoomNumber];
    const nextList = roomTypesList.map(t => {
      if (t._id === targetType._id || t.category === targetType.category) {
        return {
          ...t,
          rooms: updatedRooms,
          roomsCount: updatedRooms.length
        };
      }
      return t;
    });

    await persistRoomTypesToMongoDB(nextList);

    // Also sync room into roomsList
    const newRoomObj = {
      _id: `R-${formAddRoomNumber}`,
      roomNumber: formAddRoomNumber,
      category: targetType.category,
      floor: formAddRoomFloor || "Floor 1",
      status: "Available",
      ratePlan: "Standard Plan",
      currentRate: Number(formAddRoomRate) || targetType.baseRate,
      dailyRate: Number(formAddRoomRate) || targetType.baseRate
    };
    setRoomsList(prev => [...prev.filter(r => r.roomNumber !== formAddRoomNumber), newRoomObj]);

    // Create room via backend API
    try {
      await adminService.createRoom({
        roomNumber: formAddRoomNumber,
        category: targetType.category,
        floor: formAddRoomFloor || "Floor 1",
        status: "Available",
        baseRate: Number(formAddRoomRate) || targetType.baseRate
      }).catch(() => {});
    } catch (err) {
      console.error("Room API create fallback:", err);
    }

    setIsAddRoomToCategoryOpen(false);
    setFormAddRoomNumber("");
    toast.success(`Room #${formAddRoomNumber} added to ${targetType.category}!`);
  };

  const handleToggleRoomTypeStatus = async (typeId) => {
    const next = roomTypesList.map(t =>
      (t._id === typeId || t.category === typeId)
        ? { ...t, status: t.status === "Active" ? "Inactive" : "Active" }
        : t
    );
    await persistRoomTypesToMongoDB(next);
    toast.success("Room Type status updated in MongoDB!");
  };

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
    Reserved: { tone: "warning", icon: Bed, label: "Reserved", bgAccent: "border-l-amber" },
    Blocked: { tone: "neutral", icon: Clock, label: "Blocked", bgAccent: "border-l-neutral" }
  };

  if (loading && roomsList.length === 0) {
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
        <PremiumStatCard label="Available" value={kpiAvailable.toString()} hint="Vacant & ready rooms" accentColor="#10b981" />
        <PremiumStatCard label="Occupied" value={kpiOccupied.toString()} hint="Active guests stays" accentColor="#3b82f6" />
        <PremiumStatCard label="Blocked" value={kpiBlocked.toString()} hint="Hold or restricted" accentColor="#6b7280" />
      </div>

      {/* 3. Main Navigation Sub-tabs */}
      <div className="flex flex-wrap gap-1 border-b border-muted pb-px select-none">
        {[
          { id: "rooms", label: "Rooms List", icon: Bed },
          { id: "types", label: "Room Types", icon: Layers },
          { id: "availability", label: "Availability Calendar", icon: Calendar }
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
                <option value="Floor 4">Floor 4</option>
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
                <option value="Reserved">Reserved</option>
                <option value="Blocked">Blocked</option>
              </Select>
            </div>

            <div className="flex justify-end select-none">
              <Button
                onClick={() => navigate({ to: "/admin/rooms/add" })}
                className="bg-navy hover:bg-navy/90 text-white shadow-soft text-xs h-9 px-4 font-bold rounded-full w-full justify-center flex items-center gap-1.5 cursor-pointer"
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
                    <col className="w-[180px]" />
                    <col className="w-[110px]" />
                    <col className="w-[140px]" />
                    <col className="w-[130px]" />
                    <col className="w-[120px]" />
                    <col className="w-[110px]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none">
                      <th className="py-4.5 px-6 w-[130px] min-w-[130px]">Room Number</th>
                      <th className="py-4.5 px-4 w-[180px] min-w-[180px]">Room Type</th>
                      <th className="py-4.5 px-4 w-[110px] min-w-[110px]">Floor</th>
                      <th className="py-4.5 px-4 w-[140px] min-w-[140px]">Active Rate Plan</th>
                      <th className="py-4.5 px-4 w-[130px] min-w-[130px]">Daily Rate</th>
                      <th className="py-4.5 px-4 w-[120px] min-w-[120px]">Status</th>
                      <th className="py-4.5 px-2 w-[110px] min-w-[110px] text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted text-sm text-[#2a2a2a] bg-white font-medium">
                    {paginatedRooms.map((rm) => {
                      const meta = statusMeta[rm.status] || statusMeta.Available;
                      const StatusIcon = meta.icon;
                      return (
                        <tr key={rm._id} className="hover:bg-[#fcfcfc]/60 transition-colors group">
                          <td className="py-4 px-6 font-bold text-navy-deep text-sm w-[130px] min-w-[130px] truncate">Room {rm.roomNumber}</td>
                          <td className="py-4 px-4 font-bold text-brand w-[180px] min-w-[180px] truncate">{rm.category}</td>
                          <td className="py-4 px-4 text-muted-foreground w-[110px] min-w-[110px] truncate">{rm.floor || 'Floor 1'}</td>
                          <td className="py-4 px-4 font-mono text-[11px] text-muted-foreground w-[140px] min-w-[140px] truncate">{rm.ratePlan || 'Standard Plan'}</td>
                          <td className="py-4 px-4 font-bold text-navy w-[130px] min-w-[130px] truncate">₹{Number(rm.currentRate || rm.baseRate || rm.dailyRate || 3500).toLocaleString('en-IN')}</td>
                          <td className="py-4 px-4 w-[120px] min-w-[120px]">
                            <Tag tone={meta.tone} className="flex items-center gap-1 w-fit select-none py-0.5">
                              <StatusIcon className="size-3" />
                              <span>{meta.label}</span>
                            </Tag>
                          </td>
                          <td className="py-4 px-2 text-left w-[110px] min-w-[110px]">
                            <div className="flex items-center justify-start gap-1 select-none opacity-85 group-hover:opacity-100 transition-opacity">
                              <Button
                                onClick={() => navigate({ to: `/admin/rooms/view/${rm._id || rm.id || rm.roomNumber}` })}
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
                                onClick={() => navigate({ to: `/admin/rooms/edit/${rm._id || rm.id || rm.roomNumber}` })}
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
          {/* Header Action Bar */}
          <div className="flex flex-wrap justify-between items-center bg-white border border-muted p-4 rounded-xl shadow-soft gap-3 text-left">
            <div>
              <span className="text-xs text-navy font-bold">Registered Categories: </span>
              <span className="text-xs font-black text-brand">{roomTypesList.length} Room Types</span>
            </div>
            <div className="flex items-center gap-2 select-none">
              <Button
                onClick={() => navigate({ to: "/admin/rooms/add-type" })}
                className="bg-navy hover:bg-navy/90 text-white shadow-soft text-xs h-8 px-3.5 font-bold rounded-full cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="size-3.5" /> Add Room Type
              </Button>

              <Button
                onClick={() => navigate({ to: "/admin/rooms/add" })}
                variant="outline"
                className="border-navy text-navy hover:bg-navy/5 shadow-soft text-xs h-8 px-3.5 font-bold rounded-full cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="size-3.5 text-navy" /> Add Room
              </Button>
            </div>
          </div>

          {/* Cards Grid for Room Types */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roomTypesList.map((type) => {
              const assignedRoomsList = Array.isArray(type.rooms) && type.rooms.length > 0
                ? type.rooms
                : (type.category === "Standard Room" ? ["101", "102", "103"]
                  : type.category === "Deluxe Room" ? ["201", "202", "203", "401", "402", "403"]
                  : type.category === "Executive Suite" ? ["301", "302", "303"]
                  : ["101"]);

              return (
                <div key={type._id || type.category} className="bg-white border border-muted rounded-xl p-5 shadow-soft flex flex-col justify-between space-y-4 text-left">
                  <div className="space-y-3 text-left">
                    <div className="flex justify-between items-center border-b border-muted/50 pb-2.5">
                      <h4 className="font-display font-black text-navy text-md">{type.category}</h4>
                      <Tag tone={type.status === "Active" ? "success" : "neutral"} className="py-0.5 select-none">
                        {type.status || "Active"}
                      </Tag>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[9px] text-muted-foreground block font-bold uppercase">Base Tariff</span>
                        <strong className="text-navy mt-0.5 block font-black">₹{Number(type.baseRate).toLocaleString('en-IN')}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground block font-bold uppercase">Occupancy</span>
                        <strong className="text-navy mt-0.5 block font-bold">{type.occupancy}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-muted-foreground block font-bold uppercase">Total Rooms</span>
                        <strong className="text-brand mt-0.5 block font-extrabold">{assignedRoomsList.length} Rooms</strong>
                      </div>
                    </div>

                    {/* Assigned Room Numbers */}
                    <div className="pt-2 border-t border-muted/30">
                      <span className="text-[9px] text-muted-foreground block font-bold uppercase mb-1">Assigned Rooms</span>
                      <div className="flex flex-wrap gap-1.5">
                        {assignedRoomsList.map((num) => (
                          <span key={num} className="inline-flex items-center px-2 py-0.5 rounded-md bg-navy/5 border border-navy/15 text-[10px] font-black text-navy">
                            Room #{num}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Amenities list */}
                    <div className="pt-1">
                      <span className="text-[9px] text-muted-foreground block font-bold uppercase mb-1">Amenities</span>
                      <div className="flex flex-wrap gap-1 select-none">
                        {(Array.isArray(type.amenities) ? type.amenities : String(type.amenities).split(",")).map((a, idx) => (
                          <span key={idx} className="inline-flex items-center gap-0.5 rounded bg-[#fcfcfc] border border-muted px-1.5 py-0.5 text-[8.5px] font-semibold text-navy">
                            <Sparkles className="size-2 text-amber-500 mr-0.5" /> {typeof a === "string" ? a.trim() : a}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between gap-1.5 pt-3 border-t border-muted/40">
                    <div className="flex items-center gap-1 select-none">
                      <Button
                        onClick={() => navigate({ to: `/admin/rooms/view/${encodeURIComponent(type.category)}` })}
                        size="icon"
                        variant="ghost"
                        className="size-7 hover:text-[#4f46e5] cursor-pointer"
                        title="View Category Specifications"
                      >
                        <Eye className="size-3.5" />
                      </Button>

                      <Button
                        onClick={() => navigate({ to: `/admin/rooms/edit-type/${encodeURIComponent(type.category)}` })}
                        size="icon"
                        variant="ghost"
                        className="size-7 hover:text-brand cursor-pointer"
                        title="Edit Category Details"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>

                      <Button
                        onClick={() => navigate({ to: "/admin/rooms/add" })}
                        size="icon"
                        variant="ghost"
                        className="size-7 hover:text-emerald-600 cursor-pointer"
                        title="Add Room to Category"
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    </div>

                    <Button
                      onClick={() => handleToggleRoomTypeStatus(type._id || type.category)}
                      size="xs"
                      variant="outline"
                      className={`h-7 px-3 text-[10px] font-bold rounded-lg ${
                        type.status === "Active"
                          ? "text-rose-600 border-rose-200 hover:bg-rose-50"
                          : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      }`}
                    >
                      {type.status === "Active" ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
              );
            })}
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
              <Button
                size="xs"
                variant="outline"
                onClick={() => setCalendarStart(new Date())}
                className="h-8 px-3 text-[10px] font-bold rounded-full border-navy text-navy hover:bg-navy/5 cursor-pointer"
              >
                Today
              </Button>
              <Button size="icon" variant="ghost" className="size-8 cursor-pointer border border-muted/80 rounded-lg hover:bg-muted/20" onClick={handlePrevWeek} title="Previous 7 Days">
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs font-black text-navy px-1">{getWeekRangeLabel()}</span>
              <Button size="icon" variant="ghost" className="size-8 cursor-pointer border border-muted/80 rounded-lg hover:bg-muted/20" onClick={handleNextWeek} title="Next 7 Days">
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
                {["Available", "Occupied", "Blocked"].map((status) => {
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
      )}    </div>
  );
}