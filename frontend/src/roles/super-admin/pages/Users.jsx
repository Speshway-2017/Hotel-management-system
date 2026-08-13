import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, statusTone, Notice, LoadingRows, HorizontalRouteTabs } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit2, Shield, X, Trash2, ShieldCheck, Key, Lock, UserPlus, Building2, UserCog } from "lucide-react";

const platformTabs = [
  { label: "Properties Portfolio", to: "/super-admin/properties", icon: Building2 },
  { label: "Users & Staff Directory", to: "/super-admin/users", icon: ShieldCheck },
  { label: "Property Admins", to: "/super-admin/admins", icon: UserCog }
];

function SuperAdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("add"); // 'add' | 'edit' | 'delete'
  const [selectedUser, setSelectedUser] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "manager",
    mobile: "",
    status: "Active"
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await superAdminService.getUsers();
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load users list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openAddModal = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "manager",
      mobile: "",
      status: "Active"
    });
    setModalType("add");
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "", // hide password field or leave blank
      role: user.role,
      mobile: user.mobile || "",
      status: user.status || "Active"
    });
    setModalType("edit");
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
          loadUsers();
        }
      } else if (modalType === "edit") {
        const { name, role, mobile, status } = formData;
        const res = await superAdminService.updateUser(selectedUser.id || selectedUser._id, { name, role, mobile, status });
        if (res.success) {
          setModalOpen(false);
          loadUsers();
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
        loadUsers();
      }
    } catch (err) {
      setError(err.message || "Failed to delete user");
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.mobile && u.mobile.includes(searchQuery));
    
    const matchesRole = roleFilter === "All" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // RBAC Permission Grid Details
  const rbacRoles = [
    { name: "super-admin", desc: "Full operational access across all hotel properties, global settings, portfolio management, CMS control, and system audits.", permissions: ["View", "Create", "Edit", "Delete", "Approve"] },
    { name: "admin", desc: "Full administrative access restricted to their assigned property only. Oversees staff management and financial reporting.", permissions: ["View", "Create", "Edit", "Delete", "Approve"] },
    { name: "manager", desc: "Daily operation manager for front desk, housekeeping status, customer requests, and generating invoices.", permissions: ["View", "Create", "Edit", "Approve"] },
    { name: "receptionist", desc: "Front desk reception duties. Perform check-ins, room assignments, view availability, and collect payments.", permissions: ["View", "Create"] },
    { name: "guest", desc: "Read-only access. View room bookings, request services, and download digital invoices.", permissions: ["View"] }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Governance & Roles"
        subtitle="Manage user credentials, assign functional roles, and audit RBAC permissions across the group."
        actions={
          <Button onClick={openAddModal} className="bg-navy hover:bg-navy/90 text-white rounded-full px-5">
            <UserPlus className="size-4 mr-2" /> Add Staff Member
          </Button>
        }
      />

      <HorizontalRouteTabs tabs={platformTabs} />

      {error && <Notice tone="error" title="Governance Error" className="text-left">{error}</Notice>}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Users list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border rounded-xl p-4 shadow-soft">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-full border-muted text-xs"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
              {["All", "super-admin", "admin", "manager", "receptionist", "guest"].map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all ${
                    roleFilter === role
                      ? "bg-purple text-white shadow-soft"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {role === "All" ? "All Roles" : role}
                </button>
              ))}
            </div>
          </div>

          <Panel title="User Directory" description={`${filteredUsers.length} staff and guests found`}>
            {loading ? (
              <LoadingRows rows={5} />
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No users found matching filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                      <th className="p-4">Staff Member</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Contact Phone</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredUsers.map((u) => (
                      <tr key={u.id || u._id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4">
                          <div>
                            <p className="font-semibold text-navy text-sm">{u.name}</p>
                            <p className="text-muted-foreground text-xs">{u.email}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <Tag tone={u.role === "super-admin" ? "brand" : "neutral"}>{u.role}</Tag>
                        </td>
                        <td className="p-4 font-mono text-xs">{u.mobile || "—"}</td>
                        <td className="p-4">
                          <Tag tone={statusTone(u.status || "Active")}>{u.status || "Active"}</Tag>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => openEditModal(u)}
                              className="p-1.5 rounded-full hover:bg-muted text-navy-deep"
                              title="Edit User"
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                            {u.role !== "super-admin" && (
                              <button
                                onClick={() => openDeleteModal(u)}
                                className="p-1.5 rounded-full hover:bg-error/15 text-error"
                                title="Delete User"
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

        {/* Right Column - Roles RBAC Detail */}
        <div className="space-y-4">
          <Panel title="RBAC Policy Reference" description="Standard system-wide permissions by role.">
            <div className="p-4 space-y-4">
              {rbacRoles.map((r) => (
                <div key={r.name} className="border-b last:border-0 pb-3 last:pb-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs uppercase tracking-wider text-navy font-bold">{r.name}</strong>
                    <div className="flex gap-1">
                      {["View", "Create", "Edit", "Delete", "Approve"].map((p) => {
                        const hasPerm = r.permissions.includes(p);
                        return (
                          <span
                            key={p}
                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                              hasPerm ? "bg-success/15 text-success font-semibold" : "bg-muted text-muted-foreground/30 line-through"
                            }`}
                          >
                            {p.substring(0, 3)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{r.desc}</p>
                </div>
              ))}
            </div>
          </Panel>

          <div className="rounded-xl border border-gold/25 bg-[#FFFDF7] p-5 space-y-3">
            <div className="flex gap-3 items-start">
              <ShieldCheck className="size-5 text-gold shrink-0 mt-0.5" />
              <div>
                <h4 className="font-display font-semibold text-sm text-navy">Security Policy Compliance</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                  Hour Stay implements strict role-based access. Staff actions are permanently logged in the secure global audit trail under the Governance dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-deep/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-[0_20px_50px_rgba(13,27,42,0.35)] relative border border-navy/5">
            <div className="flex items-center justify-between pb-4 border-b border-muted">
              <h3 className="font-display font-bold text-lg text-navy">
                {modalType === "add" && "Create New Staff Account"}
                {modalType === "edit" && "Modify User Credentials"}
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
                      placeholder="e.g.Sneha Deshpande"
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
                      placeholder="e.g. 98290 12345"
                      className="mt-1 h-10 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="user-role" className="text-xs text-navy font-semibold">System Role</Label>
                      <select
                        id="user-role"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple"
                      >
                        <option value="admin">Admin / Owner</option>
                        <option value="manager">Manager</option>
                        <option value="receptionist">Receptionist</option>
                        <option value="guest">Regular Guest</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="user-status" className="text-xs text-navy font-semibold">Account Status</Label>
                      <select
                        id="user-status"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple"
                      >
                        <option value="Active">Active</option>
                        <option value="Suspended">Suspended</option>
                      </select>
                    </div>
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