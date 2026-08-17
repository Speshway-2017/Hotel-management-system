import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, statusTone, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit2, Shield, X, Trash2, ShieldCheck, Key, Lock, UserPlus, Building2, UserCog, Eye, UserCheck, UserX } from "lucide-react";

function SuperAdminUsers() {
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [propertyFilter, setPropertyFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("add"); // 'add' | 'edit' | 'view' | 'delete'
  const [selectedUser, setSelectedUser] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "manager",
    mobile: "",
    status: "Active",
    propertyId: ""
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, propertiesRes] = await Promise.all([
        superAdminService.getUsers(),
        superAdminService.getProperties()
      ]);
      if (usersRes.success) {
        setUsers(usersRes.data);
      }
      if (propertiesRes.success) {
        setProperties(propertiesRes.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load directory data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "manager",
      mobile: "",
      status: "Active",
      propertyId: ""
    });
    setModalType("add");
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      mobile: user.mobile || "",
      status: user.status || "Active",
      propertyId: user.propertyId || ""
    });
    setModalType("edit");
    setModalOpen(true);
  };

  const openViewModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      mobile: user.mobile || "",
      status: user.status || "Active",
      propertyId: user.propertyId || ""
    });
    setModalType("view");
    setModalOpen(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setModalType("delete");
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === "add") {
        const res = await superAdminService.createUser(formData);
        if (res.success) {
          setModalOpen(false);
          loadData();
        }
      } else if (modalType === "edit") {
        const { name, role, mobile, status, propertyId } = formData;
        const res = await superAdminService.updateUser(selectedUser.id || selectedUser._id, { name, role, mobile, status, propertyId });
        if (res.success) {
          setModalOpen(false);
          loadData();
        }
      }
    } catch (err) {
      setError(err.message || "Action failed");
    }
  };

  const handleDeleteSubmit = async () => {
    try {
      const res = await superAdminService.deleteUser(selectedUser.id || selectedUser._id);
      if (res.success) {
        setModalOpen(false);
        loadData();
      }
    } catch (err) {
      setError(err.message || "Failed to delete user");
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === "Active" ? "Inactive" : "Active";
    try {
      const res = await superAdminService.updateUser(user.id || user._id, {
        name: user.name,
        role: user.role,
        mobile: user.mobile,
        status: newStatus,
        propertyId: user.propertyId
      });
      if (res.success) {
        loadData();
      }
    } catch (err) {
      setError(err.message || "Failed to update user status");
    }
  };

  const handleRoleChange = (e) => {
    const role = e.target.value;
    setFormData(prev => ({
      ...prev,
      role,
      propertyId: role === "super-admin" ? "" : prev.propertyId
    }));
  };

  // Helper to map property ID to Property Name
  const getPropertyName = (propertyId) => {
    if (!propertyId || propertyId === "Global" || propertyId === "All") return "Global / All Properties";
    const prop = properties.find(p => p.id === propertyId || p._id === propertyId);
    return prop ? prop.name : "Global / All Properties";
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.mobile && u.mobile.includes(searchQuery));
    
    const matchesRole = roleFilter === "All" || u.role === roleFilter;

    const matchesProperty =
      propertyFilter === "All" ||
      (propertyFilter === "Global" && (!u.propertyId || u.propertyId === "Global" || u.propertyId === "")) ||
      u.propertyId === propertyFilter;

    const matchesStatus = statusFilter === "All" || (u.status || "Active") === statusFilter;

    return matchesSearch && matchesRole && matchesProperty && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Governance & Roles"
        subtitle="Manage user credentials, assign functional roles, and audit RBAC permissions across the group."
        actions={
          <Button onClick={openAddModal} className="bg-navy hover:bg-navy/90 text-white rounded-full px-5">
            <UserPlus className="size-4 mr-2" /> Add User Account
          </Button>
        }
      />

      {error && <Notice tone="error" title="Governance Error" className="text-left">{error}</Notice>}

      <div className="space-y-4">
        {/* Toolbar Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-card border rounded-xl p-4 shadow-soft">
          {/* Search User */}
          <div className="relative w-full col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-full border-muted text-xs bg-white"
            />
          </div>
          
          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-white border border-muted px-3.5 h-10 rounded-full text-xs focus:outline-none focus:ring-1 focus:ring-purple cursor-pointer shadow-soft text-muted-foreground"
            >
              <option value="All">All Roles</option>
              <option value="super-admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="receptionist">Receptionist</option>
              <option value="guest">Guest</option>
            </select>
          </div>

          {/* Property Filter */}
          <div>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="w-full bg-white border border-muted px-3.5 h-10 rounded-full text-xs focus:outline-none focus:ring-1 focus:ring-purple cursor-pointer shadow-soft text-muted-foreground"
            >
              <option value="All">All Properties</option>
              <option value="Global">Global / All Properties</option>
              {properties.map((p) => (
                <option key={p.id || p._id} value={p.id || p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white border border-muted px-3.5 h-10 rounded-full text-xs focus:outline-none focus:ring-1 focus:ring-purple cursor-pointer shadow-soft text-muted-foreground"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <Panel title="User Directory" description={`${filteredUsers.length} users and guests found`}>
          {loading ? (
            <LoadingRows rows={5} />
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No users found matching filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                    <th className="p-4">User Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Assigned Property</th>
                    <th className="p-4">Last Login</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.map((u) => (
                    <tr key={u.id || u._id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-4 font-semibold text-navy text-sm">{u.name}</td>
                      <td className="p-4 text-muted-foreground text-xs">{u.email}</td>
                      <td className="p-4 font-mono text-xs">{u.mobile || "—"}</td>
                      <td className="p-4">
                        <Tag tone={u.role === "super-admin" ? "brand" : u.role === "admin" ? "success" : "neutral"}>{u.role}</Tag>
                      </td>
                      <td className="p-4 text-xs font-semibold text-navy">{getPropertyName(u.propertyId)}</td>
                      <td className="p-4 text-xs text-muted-foreground">{u.lastLogin || "—"}</td>
                      <td className="p-4">
                        <Tag tone={statusTone(u.status || "Active")}>{u.status || "Active"}</Tag>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={() => openViewModal(u)}
                            className="p-1.5 rounded-full hover:bg-muted text-navy-deep cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="size-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-full hover:bg-muted text-navy-deep cursor-pointer"
                            title="Edit User"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          {u.role !== "super-admin" ? (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`p-1.5 rounded-full cursor-pointer ${
                                (u.status || "Active") === "Active" ? "hover:bg-error/15 text-error" : "hover:bg-success/15 text-success"
                              }`}
                              title={(u.status || "Active") === "Active" ? "Deactivate Account" : "Activate Account"}
                            >
                              {(u.status || "Active") === "Active" ? (
                                <UserX className="size-3.5" />
                              ) : (
                                <UserCheck className="size-3.5" />
                              )}
                            </button>
                          ) : (
                            <button
                              disabled
                              className="p-1.5 rounded-full text-muted-foreground/20 cursor-not-allowed"
                              title="Super Admin status cannot be changed"
                            >
                              <UserX className="size-3.5" />
                            </button>
                          )}
                          {u.role !== "super-admin" ? (
                            <button
                              onClick={() => openDeleteModal(u)}
                              className="p-1.5 rounded-full hover:bg-error/15 text-error cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          ) : (
                            <button
                              disabled
                              className="p-1.5 rounded-full text-muted-foreground/20 cursor-not-allowed"
                              title="Super Admin cannot be deleted"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
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

      {/* Modals */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-deep/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-[0_20px_50px_rgba(13,27,42,0.35)] relative border border-navy/5">
            <div className="flex items-center justify-between pb-4 border-b border-muted">
              <h3 className="font-display font-bold text-lg text-navy">
                {modalType === "add" && "Create New User Account"}
                {modalType === "edit" && "Modify User Credentials"}
                {modalType === "view" && "User Account Details"}
                {modalType === "delete" && "Remove User Confirmation"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-navy cursor-pointer size-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {modalType === "delete" ? (
              <div className="py-6 space-y-4 text-center">
                <Shield className="size-12 text-error mx-auto animate-bounce" />
                <h4 className="font-semibold text-navy text-base">Confirm Account Deletion</h4>
                <p className="text-muted-foreground text-xs max-w-xs mx-auto">
                  Are you sure you want to delete <strong className="text-navy">{selectedUser?.name}</strong>? This user will immediately lose access to their Hour Stay workspace.
                </p>
                <div className="flex gap-3 justify-center pt-4">
                  <Button variant="ghost" onClick={() => setModalOpen(false)} className="rounded-full">
                    Cancel
                  </Button>
                  <Button onClick={handleDeleteSubmit} className="bg-error hover:bg-error/90 text-white rounded-full px-5">
                    Confirm & Delete
                  </Button>
                </div>
              </div>
            ) : modalType === "view" ? (
              <div className="py-4 space-y-4 text-left">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-navy font-semibold">Full Name</Label>
                    <p className="text-xs text-navy-deep font-medium bg-muted/30 p-2.5 rounded border border-muted mt-1">{formData.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-navy font-semibold">Email Address</Label>
                    <p className="text-xs text-navy-deep font-medium bg-muted/30 p-2.5 rounded border border-muted mt-1">{formData.email}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-navy font-semibold">Mobile Number</Label>
                    <p className="text-xs text-navy-deep font-medium bg-muted/30 p-2.5 rounded border border-muted mt-1">{formData.mobile || "—"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-navy font-semibold">System Role</Label>
                      <p className="text-xs text-navy-deep font-medium bg-muted/30 p-2.5 rounded border border-muted mt-1 uppercase tracking-wider font-mono">{formData.role}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-navy font-semibold">Account Status</Label>
                      <div className="mt-1">
                        <Tag tone={statusTone(formData.status)}>{formData.status}</Tag>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-navy font-semibold">Assigned Property</Label>
                    <p className="text-xs text-navy-deep font-medium bg-muted/30 p-2.5 rounded border border-muted mt-1">{getPropertyName(formData.propertyId)}</p>
                  </div>
                  {selectedUser?.lastLogin && (
                    <div>
                      <Label className="text-xs text-navy font-semibold">Last Login Time</Label>
                      <p className="text-xs text-navy-deep font-medium bg-muted/30 p-2.5 rounded border border-muted mt-1 font-mono">{selectedUser.lastLogin}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-muted mt-5">
                  <Button variant="ghost" onClick={() => setModalOpen(false)} className="rounded-full w-24">
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="py-4 space-y-4 text-left">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="user-name" className="text-xs text-navy font-semibold">Full Name</Label>
                    <Input
                      id="user-name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Sneha Deshpande"
                      className="mt-1 h-10 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-email" className="text-xs text-navy font-semibold">Email Address</Label>
                    <Input
                      id="user-email"
                      type="email"
                      required
                      disabled={modalType === "edit"}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. sneha.d@hourstay.com"
                      className="mt-1 h-10 text-xs disabled:bg-muted"
                    />
                  </div>
                  {modalType === "add" && (
                    <div>
                      <Label htmlFor="user-pass" className="text-xs text-navy font-semibold">Temporary Password</Label>
                      <Input
                        id="user-pass"
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Min 6 characters"
                        className="mt-1 h-10 text-xs"
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="user-mobile" className="text-xs text-navy font-semibold">Mobile Number</Label>
                    <Input
                      id="user-mobile"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      placeholder="e.g. +91 98290 12345"
                      className="mt-1 h-10 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="user-role" className="text-xs text-navy font-semibold">System Role</Label>
                      <select
                        id="user-role"
                        value={formData.role}
                        onChange={handleRoleChange}
                        className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple cursor-pointer"
                      >
                        <option value="super-admin">Super Admin</option>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="receptionist">Receptionist</option>
                        <option value="guest">Guest</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="user-status" className="text-xs text-navy font-semibold">Account Status</Label>
                      <select
                        id="user-status"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple cursor-pointer"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="user-property" className="text-xs text-navy font-semibold">Assigned Property</Label>
                    <select
                      id="user-property"
                      value={formData.propertyId}
                      disabled={formData.role === "super-admin"}
                      onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                      className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple cursor-pointer mt-1 disabled:bg-muted"
                    >
                      <option value="">Global / All Properties</option>
                      {properties.map((p) => (
                        <option key={p.id || p._id} value={p.id || p._id}>
                          {p.name} ({p.city})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-muted mt-5">
                  <Button variant="ghost" type="button" onClick={() => setModalOpen(false)} className="rounded-full">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-navy hover:bg-navy/90 text-white rounded-full px-5">
                    {modalType === "add" ? "Create Account" : "Save Settings"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/super-admin/users")({
  head: () => ({
    meta: [
      { title: "Users & Roles — Hour Stay" },
      { name: "description", content: "Role assignments across all properties." },
      { property: "og:title", content: "Users & Roles — Hour Stay" },
      { property: "og:description", content: "Role assignments across all properties." }
    ]
  }),
  component: SuperAdminUsers
});