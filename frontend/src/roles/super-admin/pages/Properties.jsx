import { FormField, Input, Select, Textarea, Checkbox, Switch } from "@/components/hs/FormFields";
import { Label } from "@/components/ui/label";
import { createFileRoute, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, statusTone, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
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

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [propsRes, usersRes, reservationsRes] = await Promise.all([
        superAdminService.getProperties(),
        superAdminService.getUsers(),
        superAdminService.getReservations()
      ]);
      if (propsRes.success) setProperties(propsRes.data);
      if (usersRes.success) setUsers(usersRes.data);
      if (reservationsRes.success) setReservations(reservationsRes.data);
    } catch (err) {
      setError(err.message || "Failed to load platform data.");
    } finally {
      setLoading(false);
    }
  };

  const location = useLocation();
 
  useEffect(() => {
    loadData();
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
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                    <th className="p-4">Property Name</th>
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
                        <td className="p-4 font-semibold text-navy text-sm">{p.name}</td>
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
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => navigate({ to: `/super-admin/properties/view/${p._id || p.id}` })} className="p-1.5 rounded-full hover:bg-muted text-navy-deep" title="View details">
                              <Eye className="size-3.5" />
                            </button>

                            {p.status === "Active" ? (
                              <button onClick={() => handleUpdateStatus(p, "Suspended")} className="p-1.5 rounded-full hover:bg-warning/10 text-warning" title="Deactivate">
                                <X className="size-4" />
                              </button>
                            ) : (
                              <button onClick={() => handleUpdateStatus(p, "Active")} className="p-1.5 rounded-full hover:bg-success/10 text-success" title="Activate">
                                <Check className="size-4" />
                              </button>
                            )}
                            <button onClick={() => navigate({ to: `/super-admin/properties/edit/${p._id || p.id}` })} className="p-1.5 rounded-full hover:bg-muted text-navy-deep" title="Edit">
                              <Edit2 className="size-3.5" />
                            </button>
                          </div>
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