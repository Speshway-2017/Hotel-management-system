import { FormField, Input, Select, Textarea, Checkbox, Switch } from "@/components/hs/FormFields";
import { Label } from "@/components/ui/label";
import { createFileRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, statusTone, Notice, LoadingRows, ActionGroup, ViewActionButton, EditActionButton, ActionButton } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { subscribeRealtimeSync } from "@/services/socket";
import { Button } from "@/components/ui/button";


import { Plus, Search, Edit2, Check, X, Eye, Building2, UserCog, Bed, TrendingUp, Users, ChevronDown, DollarSign, Percent, Calendar } from "lucide-react";

function PremiumStatCard({ label, value, delta = 4, hint, icon: Icon, accentColor = "#0d1b2a" }) {
  const isPositive = delta >= 0;
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[120px] h-full text-left"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="min-h-5 sm:h-8 flex items-start">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
          </div>
          <h3 className="mt-1.5 font-sans text-lg font-bold text-slate-800 leading-none tracking-tight tabular-nums whitespace-nowrap">{value}</h3>
        </div>
        {Icon && (
          <span className="grid size-8 place-items-center rounded-lg bg-muted/65 text-navy-deep shrink-0 ml-3">
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <div className="mt-auto pt-2 flex items-center gap-1.5 text-[10px] h-4">
        {delta !== null && delta !== undefined && (
          <span className={`inline-flex items-center gap-0.5 font-bold shrink-0 ${isPositive ? "text-success" : "text-destructive"}`}>
            {isPositive ? "+" : ""}{delta}%
          </span>
        )}
        {hint && <span className="text-[10px] text-muted-foreground truncate">{hint}</span>}
      </div>
    </div>
  );
}

function SuperAdminPlatform() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [users, setUsers] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("add_property"); // 'add_property' | 'edit_property' | 'view_details'
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalDetailTab, setModalDetailTab] = useState("details");

  // Forms
  const [propertyForm, setPropertyForm] = useState({
    name: "",
    city: "",
    propertyType: "Boutique Resort",
    rooms: 50,
    occupancy: 70,
    adr: 5000,
    gm: "",
    assignedAdmin: "",
    status: "Onboarding"
  });

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const [propsRes, usersRes, reservationsRes, paymentsRes] = await Promise.all([
        superAdminService.getProperties().catch(() => ({})),
        superAdminService.getUsers().catch(() => ({})),
        superAdminService.getReservations().catch(() => ({})),
        superAdminService.getPayments().catch(() => ({}))
      ]);
      if (propsRes.success) setProperties(propsRes.data);
      if (usersRes.success) setUsers(usersRes.data);
      if (reservationsRes.success) setReservations(reservationsRes.data);
      if (paymentsRes.success) setPayments(paymentsRes.data);
    } catch (err) {
      if (!isSilent) setError(err.message || "Failed to load platform data.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const location = useLocation();
 
  useEffect(() => {
    loadData(false);

    const handleFocus = () => loadData(true);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadData(true);
    });

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      if (unsubscribe) unsubscribe();
    };
  }, [location.pathname]);

  const getPropertyRevenue = (p) => {
    if (!p) return 0;
    const candidates = [p.id, p._id, p.propertyId]
      .filter(Boolean)
      .map(x => String(x).toLowerCase().trim());

    // 1. Calculate from live loaded settled payments (matches Payments Ledger and Admin/Manager Dashboards)
    if (Array.isArray(payments) && payments.length > 0) {
      const propPayments = payments.filter(pay => {
        const payPropId = typeof pay.propertyId === 'object' ? (pay.propertyId?._id || pay.propertyId?.id) : pay.propertyId;
        const payHotelId = typeof pay.hotelId === 'object' ? (pay.hotelId?._id || pay.hotelId?.id) : pay.hotelId;
        const pCandidates = [payPropId, payHotelId].filter(Boolean).map(x => String(x).toLowerCase().trim());
        return pCandidates.some(c => candidates.includes(c));
      });

      const settledPayments = propPayments.filter(pay => {
        const s = String(pay.status || '').toLowerCase().trim();
        return s === 'settled' || s === 'paid' || s === 'success' || s === 'completed';
      });

      const settledSum = settledPayments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0);
      if (settledSum > 0) return settledSum;
    }

    // 2. Property revenue calculated dynamically by backend API (incorporates settled ledger revenue)
    const backendRev = Number(p.revenue ?? p.totalRevenue ?? 0);
    if (!isNaN(backendRev) && backendRev > 0) {
      return backendRev;
    }

    // 3. Fallback to live loaded reservations if available
    if (Array.isArray(reservations) && reservations.length > 0) {
      const pReservations = reservations.filter(r => {
        const rPropId = typeof r.propertyId === 'object' ? (r.propertyId?._id || r.propertyId?.id) : r.propertyId;
        const rHotelId = typeof r.hotelId === 'object' ? (r.hotelId?._id || r.hotelId?.id) : r.hotelId;
        const rCandidates = [rPropId, rHotelId].filter(Boolean).map(x => String(x).toLowerCase().trim());
        return rCandidates.some(c => candidates.includes(c));
      });

      const validReservations = pReservations.filter(r => {
        const s = String(r.status || '').toLowerCase().trim();
        return s !== 'cancelled' && s !== 'canceled' && s !== 'void' && s !== 'rejected';
      });

      if (validReservations.length > 0) {
        const calculated = validReservations.reduce((sum, r) => {
          const val = Number(r.amount ?? r.totalAmount ?? r.paidAmount ?? 0);
          return sum + (isNaN(val) ? 0 : val);
        }, 0);
        if (calculated > 0) return calculated;
      }
    }

    return 0;
  };

  const getPropertyName = (pId) => {
    const prop = properties.find(p => p.id === pId || p._id === pId);
    return prop ? prop.name : "Unassigned Property";
  };

  // Property Actions
  const handlePropertySubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === "add_property") {
        const res = await superAdminService.createProperty(propertyForm);
        if (res.success) {
          setModalOpen(false);
          loadData();
        }
      } else if (modalType === "edit_property") {
        const res = await superAdminService.updateProperty(selectedItem.id || selectedItem._id, propertyForm);
        if (res.success) {
          setModalOpen(false);
          loadData();
        }
      }
    } catch (err) {
      setError(err.message || "Failed to save property");
    }
  };

  const handleUpdateStatus = async (item, newStatus) => {
    try {
      const res = await superAdminService.updateProperty(item.id || item._id, { status: newStatus });
      if (res.success) loadData();
    } catch (err) {
      setError(err.message || "Failed to update property status");
    }
  };

  // Open Add Modals
  const openAddProperty = () => {
    setPropertyForm({ name: "", city: "", propertyType: "Boutique Resort", rooms: 50, occupancy: 70, adr: 5000, gm: "", assignedAdmin: "", status: "Onboarding" });
    setModalType("add_property");
    setModalOpen(true);
  };

  const openEditProperty = (item) => {
    setSelectedItem(item);
    setPropertyForm({
      name: item.name,
      city: item.city,
      propertyType: item.propertyType || "Heritage Hotel",
      rooms: item.rooms,
      occupancy: item.occupancy,
      adr: item.adr,
      gm: item.gm || "",
      assignedAdmin: item.assignedAdmin ? (item.assignedAdmin._id || item.assignedAdmin) : "",
      status: item.status
    });
    setModalType("edit_property");
    setModalOpen(true);
  };

  const openViewDetails = (item) => {
    setSelectedItem(item);
    setModalDetailTab("details");
    setModalType("view_details");
    setModalOpen(true);
  };

  // Filtering
  const filteredProperties = properties.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.id && p.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p._id && p._id.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "All" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter assigned users for View Details modal
  const assignedUsers = selectedItem
    ? users.filter(u => u.propertyId === (selectedItem.id || selectedItem._id))
    : [];

  const totalPortfolioRevenue = properties.reduce((sum, p) => sum + getPropertyRevenue(p), 0);
  const activePropertiesCount = properties.filter(p => p.status === "Active").length;
  const totalRoomsCount = properties.reduce((sum, p) => sum + (Number(p.rooms) || 0), 0);
  const avgOccupancy = properties.length > 0
    ? Math.round(properties.reduce((sum, p) => sum + (Number(p.occupancy) || 0), 0) / properties.length)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties Portfolio"
        subtitle="Manage, onboard, assign, and audit configurations across hotel properties."
      />

      {error && <Notice tone="error" title="Platform Synchronization Error" className="text-left">{error}</Notice>}

      {/* Portfolio Quick KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 font-ui dashboard-stats-grid">
        <PremiumStatCard
          label="Total Revenue"
          value={loading ? "—" : `₹${totalPortfolioRevenue.toLocaleString("en-IN")}`}
          delta={12}
          hint="Consolidated settled billing"
          icon={DollarSign}
          accentColor="#F5C06A"
        />
        <PremiumStatCard
          label="Active Hotels"
          value={loading ? "—" : `${activePropertiesCount} / ${properties.length}`}
          delta={8}
          hint="Operational properties"
          icon={Building2}
          accentColor="#0D1B2A"
        />
        <PremiumStatCard
          label="Total Rooms"
          value={loading ? "—" : `${totalRoomsCount} Keys`}
          delta={5}
          hint="Portfolio room capacity"
          icon={Bed}
          accentColor="#5B21B6"
        />
        <PremiumStatCard
          label="Occupancy Rate"
          value={loading ? "—" : `${avgOccupancy}%`}
          delta={4}
          hint="Live portfolio utilization"
          icon={Percent}
          accentColor="#10B981"
        />
        <PremiumStatCard
          label="Total Bookings"
          value={loading ? "—" : reservations.length.toString()}
          delta={10}
          hint="Lifetime reservations"
          icon={Calendar}
          accentColor="#FF6B8B"
        />
      </div>

      <div className="space-y-4">
        {/* Toolbar with Search, Status Dropdown Filter and Add Property Button */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-white border border-muted rounded-xl p-3.5 shadow-soft">
          <div className="flex flex-col sm:flex-row gap-2.5 flex-1 items-center">
            <div className="relative flex-1 w-full">
              <Search className="pointer-events-none absolute left-3 top-[18px] size-3.5 -translate-y-1/2 text-muted-foreground z-10" />
              <Input
                placeholder="Search properties by Property Name, ID, or Location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs font-semibold bg-[#FDFCFA]/10 border-muted w-full"
              />
            </div>

            {/* Status Dropdown Filter */}
            <div className="relative min-w-[145px] w-full sm:w-auto shrink-0">
              <select
                id="property-status-dropdown"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 pl-3.5 pr-9 rounded-lg border border-muted bg-[#FDFCFA]/10 text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy shadow-2xs cursor-pointer appearance-none transition-all"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Onboarding">Onboarding</option>
                <option value="Suspended">Suspended</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {/* Add Property Button right beside it */}
          <Button
            onClick={() => navigate({ to: "/super-admin/properties/add" })}
            className="bg-navy hover:bg-navy/90 text-white rounded-full px-4 h-9 text-xs font-bold shadow-soft flex items-center shrink-0 cursor-pointer transition-all duration-200 hover:shadow-md w-full sm:w-auto justify-center"
          >
            <Plus className="size-3.5 mr-1.5" /> Add Property
          </Button>
        </div>

        <Panel title="Properties Directory" description={`Showing ${filteredProperties.length} of ${properties.length} total hotel records`}>
          {loading ? (
            <LoadingRows rows={5} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                    <th className="p-4 pl-6">Property Name</th>
                    <th className="p-4">Property ID</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Total Rooms</th>
                    <th className="p-4">Occupancy</th>
                    <th className="p-4">Revenue</th>
                    <th className="p-4">Assigned Admin</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-sans">
                  {filteredProperties.map((p) => {
                    const revenueSum = getPropertyRevenue(p);

                    return (
                      <tr key={p.id || p._id} className="hover:bg-muted/15 transition-colors">
                        <td className="p-4 pl-6 font-semibold text-navy text-sm">{p.name}</td>
                        <td className="p-4 font-mono text-xs text-muted-foreground">{p.id || p._id}</td>
                        <td className="p-4 text-muted-foreground">{p.city}</td>
                        <td className="p-4 font-semibold text-navy">{p.rooms} Keys</td>
                        <td className="p-4 font-semibold text-navy">{p.occupancy}%</td>
                        <td className="p-4 font-bold text-purple">₹{revenueSum.toLocaleString("en-IN")}</td>
                        <td className="p-4 text-muted-foreground">{p.assignedAdmin?.name || p.gm || "Unassigned"}</td>
                        <td className="p-4">
                          <Tag tone={statusTone(p.status)}>{p.status}</Tag>
                        </td>
                        <td className="p-4 text-right">
                          <ActionGroup align="right">
                            <ViewActionButton onClick={() => navigate({ to: `/super-admin/properties/view/${p._id || p.id}` })} />
                            <EditActionButton onClick={() => navigate({ to: `/super-admin/properties/edit/${p._id || p.id}` })} />
                            {p.status === "Active" ? (
                              <ActionButton
                                icon={X}
                                label="Suspend"
                                variant="danger"
                                onClick={() => handleUpdateStatus(p, "Suspended")}
                              />
                            ) : (
                              <ActionButton
                                icon={Check}
                                label="Activate"
                                variant="success"
                                onClick={() => handleUpdateStatus(p, "Active")}
                              />
                            )}
                          </ActionGroup>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>


    </div>
  );
}

export const Route = createFileRoute("/super-admin/properties")({
  head: () => ({
    meta: [
      { title: "Property Management — Hour Stay" },
      { name: "description", content: "Manage hotel properties, operators, and role permissions." },
      { property: "og:title", content: "Property Management — Hour Stay" },
      { property: "og:description", content: "Manage hotel properties, operators, and role permissions." }
    ]
  }),
  component: SuperAdminPlatform
});