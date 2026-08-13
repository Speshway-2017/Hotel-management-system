import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, statusTone, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/utils";
import { Plus, Search, Edit2, Check, X, ShieldAlert, Trash2, Eye, Building2, ShieldCheck, UserCog, Users, Lock, Key, Calendar, Activity, DollarSign, Percent, RefreshCw, Landmark, Shield } from "lucide-react";

function SuperAdminPlatform() {
  const [activeTab, setActiveTab] = useState("roles"); // default to roles tab as requested
  const [properties, setProperties] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("add_user"); // 'add_property' | 'edit_property' | 'view_details' | 'add_user' | 'edit_user' | 'view_user' | 'assign_property' | 'create_role' | 'edit_role' | 'view_permissions' | 'assign_permissions'
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
    status: "Onboarding"
  });

  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "password123",
    role: "manager",
    propertyId: "",
    status: "Active"
  });

  const [roleForm, setRoleForm] = useState({
    name: "",
    desc: "",
    scope: "Property-Level", // 'Global' | 'Property-Level' | 'Personal'
    status: "Active",
    modules: {
      properties: ["View"],
      reservations: ["View"],
      rooms: ["View"],
      guests: ["View"],
      billing: ["View"],
      reports: ["View"],
      staff: ["View"],
      settings: ["View"]
    }
  });

  const [rolesList, setRolesList] = useState([
    {
      name: "super-admin",
      desc: "Full operational access across all hotel properties, global settings, portfolio management, CMS control, and system audits.",
      scope: "Global",
      status: "Active",
      modules: {
        properties: ["View", "Create", "Edit", "Delete", "Approve"],
        reservations: ["View", "Create", "Edit", "Delete", "Approve"],
        rooms: ["View", "Create", "Edit", "Delete", "Approve"],
        guests: ["View", "Create", "Edit", "Delete", "Approve"],
        billing: ["View", "Create", "Edit", "Delete", "Approve"],
        reports: ["View", "Create", "Edit", "Delete", "Approve"],
        staff: ["View", "Create", "Edit", "Delete", "Approve"],
        settings: ["View", "Create", "Edit", "Delete", "Approve"]
      }
    },
    {
      name: "admin",
      desc: "Full administrative access restricted to their assigned property only. Oversees staff management and financial reporting.",
      scope: "Property-Level",
      status: "Active",
      modules: {
        properties: ["View", "Edit"],
        reservations: ["View", "Create", "Edit", "Delete", "Approve"],
        rooms: ["View", "Create", "Edit", "Delete"],
        guests: ["View", "Create", "Edit"],
        billing: ["View", "Create", "Edit", "Approve"],
        reports: ["View", "Create", "Edit"],
        staff: ["View", "Create", "Edit", "Delete"],
        settings: ["View", "Edit"]
      }
    },
    {
      name: "manager",
      desc: "Daily operation manager for front desk, housekeeping status, customer requests, and generating invoices.",
      scope: "Property-Level",
      status: "Active",
      modules: {
        properties: ["View"],
        reservations: ["View", "Create", "Edit", "Approve"],
        rooms: ["View", "Edit"],
        guests: ["View", "Create", "Edit"],
        billing: ["View", "Create", "Edit"],
        reports: ["View"],
        staff: ["View", "Create"],
        settings: ["View"]
      }
    },
    {
      name: "receptionist",
      desc: "Front desk reception duties. Perform check-ins, room assignments, view availability, and collect payments.",
      scope: "Property-Level",
      status: "Active",
      modules: {
        properties: ["View"],
        reservations: ["View", "Create", "Edit"],
        rooms: ["View"],
        guests: ["View", "Create"],
        billing: ["View", "Create"],
        reports: [],
        staff: [],
        settings: []
      }
    },
    {
      name: "guest",
      desc: "Regular booking guest. Browse hotels, book rooms, view billing status and invoice logs for own stays.",
      scope: "Personal",
      status: "Active",
      modules: {
        properties: ["View"],
        reservations: ["View", "Create"],
        rooms: ["View"],
        guests: [],
        billing: ["View"],
        reports: [],
        staff: [],
        settings: []
      }
    }
  ]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [propsRes, usersRes] = await Promise.all([
        superAdminService.getProperties(),
        superAdminService.getUsers()
      ]);
      if (propsRes.success) setProperties(propsRes.data);
      if (usersRes.success) setUsers(usersRes.data);
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

  const handleDeleteProperty = async (item) => {
    if (!confirm(`Are you sure you want to delete ${item.name}?`)) return;
    try {
      const res = await superAdminService.deleteProperty(item.id || item._id);
      if (res.success) loadData();
    } catch (err) {
      setError(err.message || "Failed to delete property");
    }
  };

  // User Actions
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === "add_user") {
        const res = await superAdminService.createUser(userForm);
        if (res.success) {
          setModalOpen(false);
          loadData();
        }
      } else if (modalType === "edit_user") {
        const res = await superAdminService.updateUser(selectedItem.id || selectedItem._id, userForm);
        if (res.success) {
          setModalOpen(false);
          loadData();
        }
      } else if (modalType === "assign_property") {
        const res = await superAdminService.updateUser(selectedItem.id || selectedItem._id, { propertyId: userForm.propertyId });
        if (res.success) {
          setModalOpen(false);
          loadData();
        }
      }
    } catch (err) {
      setError(err.message || "Failed to save user");
    }
  };

  const handleToggleUserStatus = async (item) => {
    try {
      const targetStatus = item.status === "Active" ? "Suspended" : "Active";
      const res = await superAdminService.updateUser(item.id || item._id, { status: targetStatus });
      if (res.success) loadData();
    } catch (err) {
      setError(err.message || "Failed to toggle user status");
    }
  };

  const handleResetPassword = (item) => {
    alert(`Reset link compiled! Password for user "${item.name}" has been reset to temporary credentials: password123`);
  };

  const handleDeleteUser = async (item) => {
    if (!confirm(`Are you sure you want to delete user ${item.name}?`)) return;
    try {
      const res = await superAdminService.deleteUser(item.id || item._id);
      if (res.success) loadData();
    } catch (err) {
      setError(err.message || "Failed to delete user");
    }
  };

  // Role Actions
  const handleRoleSubmit = (e) => {
    e.preventDefault();
    if (modalType === "create_role") {
      setRolesList([...rolesList, { ...roleForm }]);
    } else if (modalType === "edit_role") {
      setRolesList(rolesList.map(r => r.name === selectedItem.name ? { ...r, desc: roleForm.desc, scope: roleForm.scope } : r));
    } else if (modalType === "assign_permissions") {
      setRolesList(rolesList.map(r => r.name === selectedItem.name ? { ...r, modules: roleForm.modules } : r));
    }
    setModalOpen(false);
  };

  const handleToggleRoleStatus = (role) => {
    const nextStatus = role.status === "Active" ? "Inactive" : "Active";
    setRolesList(rolesList.map(r => r.name === role.name ? { ...r, status: nextStatus } : r));
  };

  // Open Add Modals
  const openAddProperty = () => {
    setPropertyForm({ name: "", city: "", propertyType: "Boutique Resort", rooms: 50, occupancy: 70, adr: 5000, gm: "", status: "Onboarding" });
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

  const openAddUser = () => {
    setUserForm({ name: "", email: "", mobile: "", password: "password123", role: "manager", propertyId: properties[0]?.id || properties[0]?._id || "", status: "Active" });
    setModalType("add_user");
    setModalOpen(true);
  };

  const openEditUser = (item) => {
    setSelectedItem(item);
    setUserForm({
      name: item.name,
      email: item.email,
      mobile: item.mobile || "",
      password: "password123",
      role: item.role,
      propertyId: item.propertyId || "",
      status: item.status || "Active"
    });
    setModalType("edit_user");
    setModalOpen(true);
  };

  const openViewUser = (item) => {
    setSelectedItem(item);
    setModalType("view_user");
    setModalOpen(true);
  };

  const openAssignProperty = (item) => {
    setSelectedItem(item);
    setUserForm({
      ...userForm,
      propertyId: item.propertyId || ""
    });
    setModalType("assign_property");
    setModalOpen(true);
  };

  const openCreateRole = () => {
    setRoleForm({
      name: "",
      desc: "",
      scope: "Property-Level",
      status: "Active",
      modules: {
        properties: ["View"],
        reservations: ["View"],
        rooms: ["View"],
        guests: ["View"],
        billing: ["View"],
        reports: ["View"],
        staff: ["View"],
        settings: ["View"]
      }
    });
    setModalType("create_role");
    setModalOpen(true);
  };

  const openEditRole = (item) => {
    setSelectedItem(item);
    setRoleForm({
      name: item.name,
      desc: item.desc,
      scope: item.scope,
      status: item.status,
      modules: item.modules
    });
    setModalType("edit_role");
    setModalOpen(true);
  };

  const openViewPermissions = (item) => {
    setSelectedItem(item);
    setModalType("view_permissions");
    setModalOpen(true);
  };

  const openAssignPermissions = (item) => {
    setSelectedItem(item);
    setRoleForm({
      ...roleForm,
      modules: item.modules
    });
    setModalType("assign_permissions");
    setModalOpen(true);
  };

  // Filtering
  const filteredProperties = properties.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.mobile && u.mobile.includes(searchQuery));
    
    const matchesRole = roleFilter === "All" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Filter assigned users for View Details modal
  const assignedUsers = selectedItem
    ? users.filter(u => u.propertyId === (selectedItem.id || selectedItem._id))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Console"
        subtitle="Manage, onboard, assign, and audit configurations across hotel properties and staff directories."
        actions={
          activeTab === "properties" ? (
            <Button onClick={openAddProperty} className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 text-xs">
              <Plus className="size-4 mr-2" /> Add Property
            </Button>
          ) : activeTab === "users" ? (
            <Button onClick={openAddUser} className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 text-xs">
              <Plus className="size-4 mr-2" /> Add Staff User
            </Button>
          ) : (
            <Button onClick={openCreateRole} className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 text-xs">
              <Plus className="size-4 mr-2" /> Create Custom Role
            </Button>
          )
        }
      />

      {error && <Notice tone="error" title="Platform Synchronization Error" className="text-left">{error}</Notice>}

      {/* Compact pill-shaped segmented tab bar */}
      <div className="flex justify-start mb-6">
        <div className="bg-white p-1 rounded-full border border-muted shadow-soft inline-flex items-center gap-1 overflow-x-auto max-w-full scrollbar-none">
          {[
            { label: "Roles & Permissions", key: "roles", icon: UserCog },
            { label: "Users & Staff Directory", key: "users", icon: ShieldCheck },
            { label: "Properties Portfolio", key: "properties", icon: Building2 }
          ].map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSearchQuery("");
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap",
                  active
                    ? "bg-purple/10 text-purple border border-purple/15 shadow-sm font-bold"
                    : "text-muted-foreground hover:text-navy hover:bg-muted/40 border border-transparent"
                )}
              >
                {tab.icon && <tab.icon className={cn("size-3.5", active ? "text-purple" : "text-muted-foreground")} />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "properties" ? (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border rounded-xl p-4 shadow-soft">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search properties by name or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 rounded-full border-muted text-xs"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
              {["All", "Active", "Suspended", "Onboarding", "Pending"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all ${
                    statusFilter === status
                      ? "bg-navy text-white shadow-soft"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {status}
                </button>
              ))}
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
                      <th className="p-4">Location</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Rooms</th>
                      <th className="p-4">Assigned Admin</th>
                      <th className="p-4">Created Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-sans">
                    {filteredProperties.map((p) => (
                      <tr key={p.id || p._id} className="hover:bg-muted/15 transition-colors">
                        <td className="p-4 font-semibold text-navy text-sm">{p.name}</td>
                        <td className="p-4 text-muted-foreground">{p.city}</td>
                        <td className="p-4 text-muted-foreground font-semibold text-purple">{p.propertyType || "Boutique Resort"}</td>
                        <td className="p-4 font-semibold text-navy">{p.rooms} Keys</td>
                        <td className="p-4 text-muted-foreground">{p.gm || "Unassigned"}</td>
                        <td className="p-4 font-mono text-[10px] text-muted-foreground">
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "05 Aug 2026"}
                        </td>
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
                            <button onClick={() => handleDeleteProperty(p)} className="p-1.5 rounded-full hover:bg-error/10 text-error" title="Delete">
                              <Trash2 className="size-3.5" />
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
        </div>
      ) : activeTab === "users" ? (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border rounded-xl p-4 shadow-soft">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search staff directory by name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 rounded-full border-muted text-xs"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
              {["All", "super-admin", "admin", "manager", "receptionist"].map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all ${
                    roleFilter === role
                      ? "bg-navy text-white shadow-soft"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <Panel title="Users & Staff Directory" description={`Showing ${filteredUsers.length} active operators`}>
            {loading ? (
              <LoadingRows rows={5} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">Role System</th>
                      <th className="p-4">Assigned Property</th>
                      <th className="p-4">Last Activity</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-sans">
                    {filteredUsers.map((u) => (
                      <tr key={u.id || u._id} className="hover:bg-muted/15 transition-colors">
                        <td className="p-4 font-semibold text-navy text-sm">{u.name}</td>
                        <td className="p-4 text-muted-foreground">{u.email}</td>
                        <td className="p-4 text-muted-foreground font-mono">{u.mobile || "—"}</td>
                        <td className="p-4">
                          <Tag tone={u.role === "super-admin" ? "brand" : u.role === "admin" ? "warning" : "info"}>{u.role}</Tag>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {u.role === "super-admin" ? "Global Access" : getPropertyName(u.propertyId)}
                        </td>
                        <td className="p-4 text-muted-foreground text-[10px]">
                          {u.role === "super-admin" ? "Active 2 hours ago" : "Active 1 day ago"}
                        </td>
                        <td className="p-4">
                          <Tag tone={u.status === "Active" ? "success" : "warning"}>{u.status || "Active"}</Tag>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-1.5 justify-end">
                            <button onClick={() => openViewUser(u)} className="p-1.5 rounded-full hover:bg-muted text-navy-deep" title="View Details">
                              <Eye className="size-3.5" />
                            </button>
                            <button onClick={() => handleToggleUserStatus(u)} className="p-1.5 rounded-full hover:bg-muted text-navy-deep" title="Activate/Deactivate">
                              {u.status === "Active" ? <X className="size-4 text-warning" /> : <Check className="size-4 text-success" />}
                            </button>
                            <button onClick={() => openAssignProperty(u)} className="p-1.5 rounded-full hover:bg-muted text-navy-deep" title="Assign Property">
                              <Building2 className="size-3.5 text-purple" />
                            </button>
                            <button onClick={() => handleResetPassword(u)} className="p-1.5 rounded-full hover:bg-muted text-navy-deep" title="Reset Password">
                              <Lock className="size-3.5 text-gold" />
                            </button>
                            <button onClick={() => openEditUser(u)} className="p-1.5 rounded-full hover:bg-muted text-navy-deep" title="Edit">
                              <Edit2 className="size-3.5" />
                            </button>
                            <button onClick={() => handleDeleteUser(u)} className="p-1.5 rounded-full hover:bg-error/10 text-error" title="Delete">
                              <Trash2 className="size-3.5" />
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
        </div>
      ) : (
        <div className="space-y-4">
          <Panel title="Role Permission Configurations Matrix" description="Manage access privileges and PMS module boundaries.">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                    <th className="p-4">Role System</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Access Scope Scope</th>
                    <th className="p-4">Properties</th>
                    <th className="p-4">Reservations</th>
                    <th className="p-4">Rooms/Rates</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-sans">
                  {rolesList.map((role) => (
                    <tr key={role.name} className="hover:bg-muted/15 transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-navy uppercase text-xs">{role.name}</span>
                      </td>
                      <td className="p-4 text-muted-foreground max-w-xs truncate">{role.desc}</td>
                      <td className="p-4 font-semibold text-purple">{role.scope}</td>
                      <td className="p-4">
                        <div className="flex gap-0.5">
                          {role.modules.properties.map(p => (
                            <span key={p} className="text-[9px] font-bold px-1 bg-muted rounded border text-muted-foreground uppercase">{p[0]}</span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-0.5">
                          {role.modules.reservations.map(p => (
                            <span key={p} className="text-[9px] font-bold px-1 bg-muted rounded border text-muted-foreground uppercase">{p[0]}</span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-0.5">
                          {role.modules.rooms.map(p => (
                            <span key={p} className="text-[9px] font-bold px-1 bg-muted rounded border text-muted-foreground uppercase">{p[0]}</span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <Tag tone={role.status === "Active" ? "success" : "warning"}>{role.status}</Tag>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex gap-1.5 justify-end">
                          <button onClick={() => openViewPermissions(role)} className="p-1.5 rounded-full hover:bg-muted text-navy-deep" title="View Permissions">
                            <Eye className="size-3.5" />
                          </button>
                          <button onClick={() => openAssignPermissions(role)} className="p-1.5 rounded-full hover:bg-muted text-navy-deep" title="Assign Permissions">
                            <Shield className="size-3.5 text-purple" />
                          </button>
                          <button onClick={() => handleToggleRoleStatus(role)} className="p-1.5 rounded-full hover:bg-muted text-navy-deep" title="Toggle Status">
                            {role.status === "Active" ? <X className="size-4 text-warning" /> : <Check className="size-4 text-success" />}
                          </button>
                          <button onClick={() => openEditRole(role)} className="p-1.5 rounded-full hover:bg-muted text-navy-deep" title="Edit Role">
                            <Edit2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {/* Modals */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-deep/60 backdrop-blur-sm animate-fade-in">
          <div className={cn(
            "bg-white rounded-2xl p-6 shadow-[0_20px_50px_rgba(13,27,42,0.35)] relative border border-navy/5 w-full",
            modalType === "view_details" || modalType === "view_permissions" || modalType === "assign_permissions" ? "max-w-2xl" : "max-w-md"
          )}>
            <div className="flex items-center justify-between pb-4 border-b border-muted">
              <h3 className="font-display font-bold text-lg text-navy">
                {modalType === "add_property" && "Register Hotel Property"}
                {modalType === "edit_property" && "Edit Property Details"}
                {modalType === "view_details" && "Property Overview Control"}
                {modalType === "add_user" && "Add Staff Account"}
                {modalType === "edit_user" && "Edit Staff Account"}
                {modalType === "view_user" && "User Overview Panel"}
                {modalType === "assign_property" && "Reassign Property Mapping"}
                {modalType === "create_role" && "Create Custom System Role"}
                {modalType === "edit_role" && "Edit Role Configuration"}
                {modalType === "view_permissions" && "RBAC Permission Ledger"}
                {modalType === "assign_permissions" && "Assign Role Access Rights"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-navy cursor-pointer size-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
                <X className="size-4" />
              </button>
            </div>

            {/* View Permissions Matrix Modal */}
            {modalType === "view_permissions" && selectedItem && (
              <div className="py-4 space-y-4 text-left text-xs">
                <Notice tone="info" title={`Access Permissions for ${selectedItem.name.toUpperCase()}`}>
                  Active mapping of roles to PMS software panels and actions.
                </Notice>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="p-3">PMS Module</th>
                        <th className="p-3">View</th>
                        <th className="p-3">Create</th>
                        <th className="p-3">Edit</th>
                        <th className="p-3">Delete</th>
                        <th className="p-3 text-right">Approve</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-sans">
                      {["properties", "reservations", "rooms", "guests", "billing", "reports", "staff", "settings"].map((mod) => {
                        const perms = selectedItem.modules[mod] || [];
                        return (
                          <tr key={mod} className="hover:bg-muted/5">
                            <td className="p-3 font-semibold text-navy uppercase text-[10px]">{mod}</td>
                            {["View", "Create", "Edit", "Delete", "Approve"].map((act) => (
                              <td key={act} className="p-3">
                                {perms.includes(act) ? (
                                  <Check className="size-4 text-success" />
                                ) : (
                                  <span className="text-muted-foreground/30">—</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end pt-4 border-t border-muted mt-5">
                  <Button onClick={() => setModalOpen(false)} className="bg-navy hover:bg-navy/90 text-white rounded-full px-5">Close Panel</Button>
                </div>
              </div>
            )}

            {/* Assign Permissions Modal */}
            {modalType === "assign_permissions" && selectedItem && (
              <form onSubmit={handleRoleSubmit} className="py-4 space-y-4 text-left text-xs">
                <div className="border rounded-xl overflow-hidden max-h-[350px] overflow-y-auto scrollbar-none">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="p-3">PMS Module</th>
                        <th className="p-3">View</th>
                        <th className="p-3">Create</th>
                        <th className="p-3">Edit</th>
                        <th className="p-3">Delete</th>
                        <th className="p-3 text-right">Approve</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-sans">
                      {["properties", "reservations", "rooms", "guests", "billing", "reports", "staff", "settings"].map((mod) => (
                        <tr key={mod} className="hover:bg-muted/5">
                          <td className="p-3 font-semibold text-navy uppercase text-[10px]">{mod}</td>
                          {["View", "Create", "Edit", "Delete", "Approve"].map((act) => {
                            const checked = roleForm.modules[mod]?.includes(act);
                            return (
                              <td key={act} className="p-3">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    const modPerms = roleForm.modules[mod] || [];
                                    const nextPerms = checked
                                      ? modPerms.filter(p => p !== act)
                                      : [...modPerms, act];
                                    setRoleForm({
                                      ...roleForm,
                                      modules: {
                                        ...roleForm.modules,
                                        [mod]: nextPerms
                                      }
                                    });
                                  }}
                                  className="rounded text-purple focus:ring-purple size-4 cursor-pointer"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-muted mt-5">
                  <Button variant="ghost" type="button" onClick={() => setModalOpen(false)} className="rounded-full">Cancel</Button>
                  <Button type="submit" className="bg-navy hover:bg-navy/90 text-white rounded-full px-5">Save Permissions</Button>
                </div>
              </form>
            )}

            {/* Create Role Form */}
            {(modalType === "create_role" || modalType === "edit_role") && (
              <form onSubmit={handleRoleSubmit} className="py-4 space-y-4 text-left">
                <div>
                  <Label htmlFor="r-name" className="text-xs text-navy font-semibold">Role Code Name</Label>
                  <Input
                    id="r-name"
                    required
                    disabled={modalType === "edit_role"}
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    placeholder="e.g. general-manager"
                    className="mt-1 h-10 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="r-desc" className="text-xs text-navy font-semibold">Description</Label>
                  <Input
                    id="r-desc"
                    required
                    value={roleForm.desc}
                    onChange={(e) => setRoleForm({ ...roleForm, desc: e.target.value })}
                    placeholder="Brief description..."
                    className="mt-1 h-10 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="r-scope" className="text-xs text-navy font-semibold">Access Scope Scope</Label>
                  <select
                    id="r-scope"
                    value={roleForm.scope}
                    onChange={(e) => setRoleForm({ ...roleForm, scope: e.target.value })}
                    className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1"
                  >
                    <option value="Global">Global Access (SaaS Admin)</option>
                    <option value="Property-Level">Property-Level (Assigned Hotel only)</option>
                    <option value="Personal">Personal Scope (Self bookings only)</option>
                  </select>
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-muted mt-5">
                  <Button variant="ghost" type="button" onClick={() => setModalOpen(false)} className="rounded-full">Cancel</Button>
                  <Button type="submit" className="bg-navy hover:bg-navy/90 text-white rounded-full px-5">Save Role</Button>
                </div>
              </form>
            )}

            {/* View User Details Modal */}
            {modalType === "view_user" && selectedItem && (
              <div className="py-4 space-y-4 text-left text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong className="text-navy font-semibold">Staff Name:</strong>
                    <p className="mt-0.5 text-muted-foreground text-sm font-semibold">{selectedItem.name}</p>
                  </div>
                  <div>
                    <strong className="text-navy font-semibold">Email:</strong>
                    <p className="mt-0.5 text-muted-foreground">{selectedItem.email}</p>
                  </div>
                  <div>
                    <strong className="text-navy font-semibold">Phone:</strong>
                    <p className="mt-0.5 text-muted-foreground font-mono">{selectedItem.mobile || "—"}</p>
                  </div>
                  <div>
                    <strong className="text-navy font-semibold">Assigned Role:</strong>
                    <p className="mt-0.5"><Tag tone="brand">{selectedItem.role}</Tag></p>
                  </div>
                  <div>
                    <strong className="text-navy font-semibold">Property Assignment:</strong>
                    <p className="mt-0.5 text-muted-foreground font-semibold">
                      {selectedItem.role === "super-admin" ? "Global System Access" : getPropertyName(selectedItem.propertyId)}
                    </p>
                  </div>
                  <div>
                    <strong className="text-navy font-semibold">Account Status:</strong>
                    <p className="mt-0.5"><Tag tone={selectedItem.status === "Active" ? "success" : "warning"}>{selectedItem.status || "Active"}</Tag></p>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-muted mt-5">
                  <Button onClick={() => setModalOpen(false)} className="bg-navy hover:bg-navy/90 text-white rounded-full px-5">Close Panel</Button>
                </div>
              </div>
            )}

            {/* Reassign Property Modal */}
            {modalType === "assign_property" && selectedItem && (
              <form onSubmit={handleUserSubmit} className="py-4 space-y-4 text-left">
                <Notice tone="info" title="Reassign Staff Mapping">
                  Updating assigned PMS properties locks operator credentials to that node.
                </Notice>
                <div>
                  <Label htmlFor="assign-prop" className="text-xs text-navy font-semibold">Choose Assigned Property</Label>
                  <select
                    id="assign-prop"
                    value={userForm.propertyId}
                    onChange={(e) => setUserForm({ ...userForm, propertyId: e.target.value })}
                    className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1"
                  >
                    <option value="">Unassigned</option>
                    {properties.map(p => (
                      <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-muted mt-5">
                  <Button variant="ghost" type="button" onClick={() => setModalOpen(false)} className="rounded-full">Cancel</Button>
                  <Button type="submit" className="bg-navy hover:bg-navy/90 text-white rounded-full px-5">Update Assignment</Button>
                </div>
              </form>
            )}

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
                      <strong className="text-navy font-semibold">General Manager GM:</strong>
                      <p className="mt-0.5 text-muted-foreground">{selectedItem.gm || "Unassigned"}</p>
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
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <th className="p-3">Room Category</th>
                            <th className="p-3">Keys Allotted</th>
                            <th className="p-3 text-right">Base Tariff</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y font-sans">
                          <tr className="hover:bg-muted/5">
                            <td className="p-3 font-semibold text-navy">Deluxe Suite Room</td>
                            <td className="p-3 text-muted-foreground">{Math.round(selectedItem.rooms * 0.4)} keys</td>
                            <td className="p-3 text-right font-semibold text-navy">₹{(selectedItem.adr * 1.1).toLocaleString("en-IN")}</td>
                          </tr>
                          <tr className="hover:bg-muted/5">
                            <td className="p-3 font-semibold text-navy">Executive Club Room</td>
                            <td className="p-3 text-muted-foreground">{Math.round(selectedItem.rooms * 0.4)} keys</td>
                            <td className="p-3 text-right font-semibold text-navy">₹{selectedItem.adr.toLocaleString("en-IN")}</td>
                          </tr>
                          <tr className="hover:bg-muted/5">
                            <td className="p-3 font-semibold text-navy">Standard Courtyard Room</td>
                            <td className="p-3 text-muted-foreground">{Math.round(selectedItem.rooms * 0.2)} keys</td>
                            <td className="p-3 text-right font-semibold text-navy">₹{(selectedItem.adr * 0.8).toLocaleString("en-IN")}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Tab content: Yield Performance */}
                {modalDetailTab === "performance" && (
                  <div className="pt-2 grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                      <strong className="text-navy font-semibold flex items-center gap-1.5"><Percent className="size-3.5 text-purple" /> Occupancy Rate</strong>
                      <p className="text-lg font-black text-navy font-mono">{selectedItem.occupancy}%</p>
                    </div>
                    <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                      <strong className="text-navy font-semibold flex items-center gap-1.5"><DollarSign className="size-3.5 text-gold" /> Average ADR</strong>
                      <p className="text-lg font-black text-navy font-mono">₹{selectedItem.adr.toLocaleString("en-IN")}</p>
                    </div>
                    <div className="p-3 bg-muted/20 border rounded-xl space-y-1">
                      <strong className="text-navy font-semibold flex items-center gap-1.5"><Activity className="size-3.5 text-[#FF6B8B]" /> Average RevPAR</strong>
                      <p className="text-lg font-black text-navy font-mono">₹{selectedItem.revpar.toLocaleString("en-IN")}</p>
                    </div>
                    <div className="p-3 bg-[#FFFDF7] border border-gold/25 rounded-xl space-y-1">
                      <strong className="text-navy font-semibold flex items-center gap-1.5"><Calendar className="size-3.5 text-gold" /> Monthly Yield (Est.)</strong>
                      <p className="text-lg font-black text-navy font-mono">
                        ₹{Math.round((selectedItem.rooms * (selectedItem.occupancy / 100) * selectedItem.adr * 30)).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Tab content: Assigned Users */}
                {modalDetailTab === "users" && (
                  <div className="pt-2 text-xs space-y-3">
                    {assignedUsers.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">No staff operators assigned to this property.</div>
                    ) : (
                      <div className="border rounded-xl overflow-hidden">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              <th className="p-3">Operator Name</th>
                              <th className="p-3">Email Address</th>
                              <th className="p-3 text-right">Role</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y font-sans">
                            {assignedUsers.map(user => (
                              <tr key={user.id || user._id} className="hover:bg-muted/5">
                                <td className="p-3 font-semibold text-navy">{user.name}</td>
                                <td className="p-3 text-muted-foreground">{user.email}</td>
                                <td className="p-3 text-right"><Tag tone="neutral">{user.role}</Tag></td>
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

            {/* Property Form (Add / Edit) */}
            {modalType.includes("property") && (
              <form onSubmit={handlePropertySubmit} className="py-4 space-y-4 text-left">
                <div>
                  <Label htmlFor="prop-name" className="text-xs text-navy font-semibold">Hotel Property Name</Label>
                  <Input
                    id="prop-name"
                    required
                    value={propertyForm.name}
                    onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                    placeholder="e.g. Taj Rambagh Residency"
                    className="mt-1 h-10 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="prop-city" className="text-xs text-navy font-semibold">City Location</Label>
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
                    <Label htmlFor="prop-type" className="text-xs text-navy font-semibold">Property Type</Label>
                    <select
                      id="prop-type"
                      value={propertyForm.propertyType}
                      onChange={(e) => setPropertyForm({ ...propertyForm, propertyType: e.target.value })}
                      className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1"
                    >
                      <option value="Heritage Hotel">Heritage Hotel</option>
                      <option value="Boutique Resort">Boutique Resort</option>
                      <option value="Business Hotel">Business Hotel</option>
                      <option value="Luxury Villa">Luxury Villa</option>
                    </select>
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
                  <Label htmlFor="prop-gm" className="text-xs text-navy font-semibold">General Manager Name</Label>
                  <Input
                    id="prop-gm"
                    value={propertyForm.gm}
                    onChange={(e) => setPropertyForm({ ...propertyForm, gm: e.target.value })}
                    placeholder="e.g. Vikramaditya Singh"
                    className="mt-1 h-10 text-xs"
                  />
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-muted mt-5">
                  <Button variant="ghost" type="button" onClick={() => setModalOpen(false)} className="rounded-full">Cancel</Button>
                  <Button type="submit" className="bg-navy hover:bg-navy/90 text-white rounded-full px-5">Save Property</Button>
                </div>
              </form>
            )}

            {/* User Form */}
            {modalType.includes("user") && (
              <form onSubmit={handleUserSubmit} className="py-4 space-y-4 text-left">
                <div>
                  <Label htmlFor="u-name" className="text-xs text-navy font-semibold">Staff Full Name</Label>
                  <Input
                    id="u-name"
                    required
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    placeholder="e.g. Rajesh Kumar"
                    className="mt-1 h-10 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="u-email" className="text-xs text-navy font-semibold">Email Address (Login ID)</Label>
                  <Input
                    id="u-email"
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="rajesh@hourstay.com"
                    className="mt-1 h-10 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="u-mobile" className="text-xs text-navy font-semibold">Mobile Contact</Label>
                    <Input
                      id="u-mobile"
                      value={userForm.mobile}
                      onChange={(e) => setUserForm({ ...userForm, mobile: e.target.value })}
                      placeholder="+91 99000 12345"
                      className="mt-1 h-10 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="u-role" className="text-xs text-navy font-semibold">System Role</Label>
                    <select
                      id="u-role"
                      value={userForm.role}
                      onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                      className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1"
                    >
                      <option value="super-admin">super-admin</option>
                      <option value="admin">admin</option>
                      <option value="manager">manager</option>
                      <option value="receptionist">receptionist</option>
                    </select>
                  </div>
                </div>
                {userForm.role !== "super-admin" && (
                  <div>
                    <Label htmlFor="u-property" className="text-xs text-navy font-semibold">Assign Hotel Property</Label>
                    <select
                      id="u-property"
                      value={userForm.propertyId}
                      onChange={(e) => setUserForm({ ...userForm, propertyId: e.target.value })}
                      className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1"
                    >
                      <option value="">Choose hotel property...</option>
                      {properties.map(p => (
                        <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {modalType === "add_user" && (
                  <div>
                    <Label htmlFor="u-pass" className="text-xs text-navy font-semibold">Security Password</Label>
                    <Input
                      id="u-pass"
                      type="password"
                      required
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      className="mt-1 h-10 text-xs"
                    />
                  </div>
                )}
                <div className="flex gap-3 justify-end pt-4 border-t border-muted mt-5">
                  <Button variant="ghost" type="button" onClick={() => setModalOpen(false)} className="rounded-full">Cancel</Button>
                  <Button type="submit" className="bg-navy hover:bg-navy/90 text-white rounded-full px-5">Save Operator</Button>
                </div>
              </form>
            )}

            {/* Role Form */}
            {modalType === "create_role" && (
              <form onSubmit={handleRoleSubmit} className="py-4 space-y-4 text-left">
                <div>
                  <Label htmlFor="role-name" className="text-xs text-navy font-semibold">Custom Role Name</Label>
                  <Input
                    id="role-name"
                    required
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    placeholder="e.g. auditor"
                    className="mt-1 h-10 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="role-desc" className="text-xs text-navy font-semibold">Role Description</Label>
                  <Input
                    id="role-desc"
                    required
                    value={roleForm.desc}
                    onChange={(e) => setRoleForm({ ...roleForm, desc: e.target.value })}
                    placeholder="Access scopes..."
                    className="mt-1 h-10 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-navy font-semibold">Map Access Permissions</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {["View", "Create", "Edit", "Delete", "Approve"].map((perm) => {
                      const checked = roleForm.permissions.includes(perm);
                      return (
                        <label key={perm} className="flex items-center gap-1.5 text-xs text-navy font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const newPerms = checked
                                ? roleForm.permissions.filter(p => p !== perm)
                                : [...roleForm.permissions, perm];
                              setRoleForm({ ...roleForm, permissions: newPerms });
                            }}
                            className="rounded text-purple focus:ring-purple size-4 cursor-pointer"
                          />
                          {perm}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-muted mt-5">
                  <Button variant="ghost" type="button" onClick={() => setModalOpen(false)} className="rounded-full">Cancel</Button>
                  <Button type="submit" className="bg-navy hover:bg-navy/90 text-white rounded-full px-5">Create Role</Button>
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
      { title: "Platform Console — Hour Stay" },
      { name: "description", content: "Manage hotel properties, operators, and role permissions." },
      { property: "og:title", content: "Platform Console — Hour Stay" },
      { property: "og:description", content: "Manage hotel properties, operators, and role permissions." }
    ]
  }),
  component: SuperAdminPlatform
});