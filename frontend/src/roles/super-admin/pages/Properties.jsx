import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, statusTone, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  useEffect(() => {
    loadData();
  }, []);

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
          <Button onClick={openAddProperty} className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 text-xs">
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

        <Panel title="Properties Directory" description={`Showing ${filteredProperties.length} hotel records`}>
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
                            <button onClick={() => openViewDetails(p)} className="p-1.5 rounded-full hover:bg-muted text-navy-deep" title="View details">
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
                            <button onClick={() => openEditProperty(p)} className="p-1.5 rounded-full hover:bg-muted text-navy-deep" title="Edit">
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

      {/* Modals */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-black/5 backdrop-blur-sm flex justify-center items-start py-8 sm:py-16 animate-fade-in">
          <div className={cn(
            "bg-white rounded-2xl p-6 shadow-[0_20px_50px_rgba(13,27,42,0.15)] relative border border-muted w-full my-auto",
            modalType === "view_details" ? "max-w-2xl" : "max-w-md"
          )}>
            <div className="flex items-center justify-between pb-4 border-b border-muted">
              <h3 className="font-display font-bold text-lg text-navy">
                {modalType === "add_property" && "Register Hotel Property"}
                {modalType === "edit_property" && "Edit Property Details"}
                {modalType === "view_details" && "Property Overview Control"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-navy cursor-pointer size-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
                <X className="size-4" />
              </button>
            </div>

            {/* View Property Details Modal */}
            {modalType === "view_details" && selectedItem && (
              <div className="py-4 space-y-4 text-left">
                {/* Modal Tabs Header */}
                <div className="flex gap-1 border-b pb-1 overflow-x-auto scrollbar-none">
                  {[
                    { label: "Overview Details", key: "details", icon: Building2 },
                    { label: "Room Inventory", key: "inventory", icon: Bed },
                    { label: "Yield Performance", key: "performance", icon: TrendingUp },
                    { label: "Assigned Operators", key: "users", icon: Users }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setModalDetailTab(tab.key)}
                      className={cn(
                        "pb-2 px-3.5 font-bold text-[11px] uppercase tracking-wider transition-all relative cursor-pointer",
                        modalDetailTab === tab.key ? "text-purple border-b-2 border-purple" : "text-muted-foreground"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab content: Overview Details */}
                {modalDetailTab === "details" && (
                  <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                    <div>
                      <strong className="text-navy font-semibold">Hotel Name:</strong>
                      <p className="mt-0.5 text-muted-foreground text-sm font-semibold">{selectedItem.name}</p>
                    </div>
                    <div>
                      <strong className="text-navy font-semibold">Property Type:</strong>
                      <p className="mt-0.5 text-muted-foreground">{selectedItem.propertyType || "Boutique Resort"}</p>
                    </div>
                    <div>
                      <strong className="text-navy font-semibold">Location City:</strong>
                      <p className="mt-0.5 text-muted-foreground">{selectedItem.city}</p>
                    </div>
                    <div>
                      <strong className="text-navy font-semibold">Assigned Admin:</strong>
                      <p className="mt-0.5 text-muted-foreground">{selectedItem.assignedAdmin?.name || selectedItem.gm || "Unassigned"}</p>
                    </div>
                    <div>
                      <strong className="text-navy font-semibold">Registered Date:</strong>
                      <p className="mt-0.5 text-muted-foreground">{selectedItem.createdAt ? new Date(selectedItem.createdAt).toLocaleDateString("en-IN") : "05 Aug 2026"}</p>
                    </div>
                    <div>
                      <strong className="text-navy font-semibold">Licensing Plan:</strong>
                      <p className="mt-0.5"><Tag tone="brand">{selectedItem.subscriptionTier || "Basic SaaS"}</Tag></p>
                    </div>
                  </div>
                )}

                {/* Tab content: Room Inventory */}
                {modalDetailTab === "inventory" && (
                  <div className="pt-2 text-xs space-y-3">
                    <Notice tone="info" title="Room Inventory Keys Summary">
                      Current mapped capacities across the PMS allocation grid.
                    </Notice>
                    <div className="border rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <th className="p-3">Room Category</th>
                            <th className="p-3">Keys Allotted</th>
                            <th className="p-3 text-right">Base Tariff</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y font-sans">
                          <tr className="hover:bg-muted/5">
                            <td className="p-3 font-semibold text-navy">Deluxe Courtyard Room</td>
                            <td className="p-3">42 Keys</td>
                            <td className="p-3 text-right font-semibold text-navy">₹8,900</td>
                          </tr>
                          <tr className="hover:bg-muted/5">
                            <td className="p-3 font-semibold text-navy">Premier Haveli Room</td>
                            <td className="p-3">36 Keys</td>
                            <td className="p-3 text-right font-semibold text-navy">₹12,400</td>
                          </tr>
                          <tr className="hover:bg-muted/5">
                            <td className="p-3 font-semibold text-navy">Maharaja Suite</td>
                            <td className="p-3">14 Keys</td>
                            <td className="p-3 text-right font-semibold text-navy">₹24,500</td>
                          </tr>
                          <tr className="hover:bg-muted/5">
                            <td className="p-3 font-semibold text-navy">Garden Pool Villa</td>
                            <td className="p-3">8 Keys</td>
                            <td className="p-3 text-right font-semibold text-navy">₹38,900</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab content: Yield Performance */}
                {modalDetailTab === "performance" && (
                  <div className="pt-2 text-xs grid grid-cols-2 gap-4">
                    <div className="border border-muted rounded-xl p-3.5 bg-muted/10">
                      <strong className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Occupancy Rate</strong>
                      <p className="text-xl font-bold text-navy mt-1">{selectedItem.occupancy}%</p>
                    </div>
                    <div className="border border-muted rounded-xl p-3.5 bg-muted/10">
                      <strong className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Average ADR</strong>
                      <p className="text-xl font-bold text-navy mt-1">₹{(selectedItem.adr || 0).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="border border-muted rounded-xl p-3.5 bg-muted/10">
                      <strong className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Yield RevPAR</strong>
                      <p className="text-xl font-bold text-navy mt-1">₹{(selectedItem.revpar || 0).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="border border-muted rounded-xl p-3.5 bg-muted/10">
                      <strong className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Keys</strong>
                      <p className="text-xl font-bold text-navy mt-1">{selectedItem.rooms} Keys</p>
                    </div>
                  </div>
                )}

                {/* Tab content: Assigned Operators */}
                {modalDetailTab === "users" && (
                  <div className="pt-2 text-xs space-y-3">
                    <Notice tone="info" title="Operators Directory Mapping">
                      Hotel operators online and permissions.
                    </Notice>
                    {assignedUsers.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">No staff operators mapped to this node.</div>
                    ) : (
                      <div className="border rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              <th className="p-3">Operator Name</th>
                              <th className="p-3">Role Type</th>
                              <th className="p-3 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y font-sans">
                            {assignedUsers.map((u) => (
                              <tr key={u.id || u._id} className="hover:bg-muted/5">
                                <td className="p-3 font-semibold text-navy">{u.name}</td>
                                <td className="p-3"><Tag tone="info">{u.role}</Tag></td>
                                <td className="p-3 text-right"><Tag tone={u.status === "Active" ? "success" : "warning"}>{u.status}</Tag></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-muted mt-5">
                  <Button onClick={() => setModalOpen(false)} className="bg-navy hover:bg-navy/90 text-white rounded-full px-5">Close Panel</Button>
                </div>
              </div>
            )}

            {/* Add / Edit Property Modal */}
            {(modalType === "add_property" || modalType === "edit_property") && (
              <form onSubmit={handlePropertySubmit} className="py-4 space-y-4 text-left">
                <div>
                  <Label htmlFor="prop-name" className="text-xs text-navy font-semibold">Hotel Property Name</Label>
                  <Input
                    id="prop-name"
                    required
                    value={propertyForm.name}
                    onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                    placeholder="e.g. Hour Stay Rambagh Residency"
                    className="mt-1 h-10 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="prop-city" className="text-xs text-navy font-semibold">Location City</Label>
                    <Input
                      id="prop-city"
                      required
                      value={propertyForm.city}
                      onChange={(e) => setPropertyForm({ ...propertyForm, city: e.target.value })}
                      placeholder="e.g. Jaipur"
                      className="mt-1 h-10 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prop-type" className="text-xs text-navy font-semibold">Property Category</Label>
                    <Input
                      id="prop-type"
                      required
                      value={propertyForm.propertyType}
                      onChange={(e) => setPropertyForm({ ...propertyForm, propertyType: e.target.value })}
                      placeholder="e.g. Heritage Haveli"
                      className="mt-1 h-10 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="prop-rooms" className="text-xs text-navy font-semibold">Total Room Keys</Label>
                    <Input
                      id="prop-rooms"
                      type="number"
                      required
                      value={propertyForm.rooms}
                      onChange={(e) => setPropertyForm({ ...propertyForm, rooms: Number(e.target.value) })}
                      className="mt-1 h-10 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="prop-occupancy" className="text-xs text-navy font-semibold">Occupancy Rate (%)</Label>
                    <Input
                      id="prop-occupancy"
                      type="number"
                      required
                      value={propertyForm.occupancy}
                      onChange={(e) => setPropertyForm({ ...propertyForm, occupancy: Number(e.target.value) })}
                      className="mt-1 h-10 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="prop-adr" className="text-xs text-navy font-semibold">Average ADR (₹)</Label>
                  <Input
                    id="prop-adr"
                    type="number"
                    required
                    value={propertyForm.adr}
                    onChange={(e) => setPropertyForm({ ...propertyForm, adr: Number(e.target.value) })}
                    className="mt-1 h-10 text-xs"
                  />
                </div>
                 <div>
                  <Label htmlFor="prop-admin" className="text-xs text-navy font-semibold">Assign Property Admin / Owner</Label>
                  <select
                    id="prop-admin"
                    value={propertyForm.assignedAdmin || ""}
                    onChange={(e) => {
                      const selectedAdminId = e.target.value;
                      const selectedUserObj = users.find(u => u.id === selectedAdminId || u._id === selectedAdminId);
                      setPropertyForm({ 
                        ...propertyForm, 
                        assignedAdmin: selectedAdminId || null,
                        gm: selectedUserObj ? selectedUserObj.name : "—"
                      });
                    }}
                    className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1 cursor-pointer"
                  >
                    <option value="">Select Property Admin / Owner</option>
                    {users.filter(u => u.role === "admin" || u.role === "manager").map(u => (
                      <option key={u.id || u._id} value={u.id || u._id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-muted mt-5">
                  <Button variant="ghost" type="button" onClick={() => setModalOpen(false)} className="rounded-full">Cancel</Button>
                  <Button type="submit" className="bg-navy hover:bg-navy/90 text-white rounded-full px-5">Save Property</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
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