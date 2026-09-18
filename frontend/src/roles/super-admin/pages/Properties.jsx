import { FormField, Input, Select, Textarea, Checkbox, Switch } from "@/components/hs/FormFields";
import { Label } from "@/components/ui/label";
import { createFileRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, statusTone, Notice, LoadingRows, ActionGroup, ViewActionButton, EditActionButton, ActionButton } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { subscribeRealtimeSync } from "@/services/socket";
import { Button } from "@/components/ui/button";


import { cn } from "@/utils/utils";
import { Plus, Search, Edit2, Check, X, Eye, Building2, UserCog, Bed, TrendingUp, Users } from "lucide-react";

function SuperAdminPlatform() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [users, setUsers] = useState([]);
  const [reservations, setReservations] = useState([]);
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
      const [propsRes, usersRes, reservationsRes] = await Promise.all([
        superAdminService.getProperties().catch(() => ({})),
        superAdminService.getUsers().catch(() => ({})),
        superAdminService.getReservations().catch(() => ({}))
      ]);
      if (propsRes.success) setProperties(propsRes.data);
      if (usersRes.success) setUsers(usersRes.data);
      if (reservationsRes.success) setReservations(reservationsRes.data);
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

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [location.pathname]);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties Portfolio"
        subtitle="Manage, onboard, assign, and audit configurations across hotel properties."
        actions={
          <Button onClick={() => navigate({ to: "/super-admin/properties/add" })} className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 text-xs">
            <Plus className="size-4 mr-2" /> Add Property
          </Button>
        }
      />

      {error && <Notice tone="error" title="Platform Synchronization Error" className="text-left">{error}</Notice>}

      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border rounded-xl p-4 shadow-soft">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search properties by Property Name, ID, or Location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11 rounded-full border-muted text-xs"
            />
          </div>

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
                    const pReservations = reservations.filter(r => r.propertyId === p.id || r.propertyId === p._id);
                    const revenueSum = pReservations.reduce((sum, r) => sum + (r.amount || 0), 0);

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