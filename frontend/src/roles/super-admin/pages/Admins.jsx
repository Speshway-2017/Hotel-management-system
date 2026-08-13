import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, statusTone, Notice, LoadingRows, HorizontalRouteTabs } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit2, ShieldAlert, X, Trash2, Building, ShieldCheck, Mail, Phone, Lock, UserPlus, Building2, UserCog } from "lucide-react";

const platformTabs = [
  { label: "Properties Portfolio", to: "/super-admin/properties", icon: Building2 },
  { label: "Users & Staff Directory", to: "/super-admin/users", icon: ShieldCheck },
  { label: "Property Admins", to: "/super-admin/admins", icon: UserCog }
];

function SuperAdminAdmins() {
  const [admins, setAdmins] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("add"); // 'add' | 'edit' | 'delete'
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    mobile: "",
    propertyId: "",
    status: "Active"
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, propertiesRes] = await Promise.all([
        superAdminService.getUsers(),
        superAdminService.getProperties()
      ]);

      if (usersRes.success && propertiesRes.success) {
        // Filter users to only show admins
        const filteredAdmins = usersRes.data.filter(u => u.role === 'admin');
        setAdmins(filteredAdmins);
        setProperties(propertiesRes.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load admin management details");
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
      mobile: "",
      propertyId: properties[0]?.id || properties[0]?._id || "",
      status: "Active"
    });
    setModalType("add");
    setModalOpen(true);
  };

  const openEditModal = (admin) => {
    setSelectedAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      password: "",
      mobile: admin.mobile || "",
      propertyId: admin.propertyId || properties[0]?.id || properties[0]?._id || "",
      status: admin.status || "Active"
    });
    setModalType("edit");
    setModalOpen(true);
  };

  const openDeleteModal = (admin) => {
    setSelectedAdmin(admin);
    setModalType("delete");
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === "add") {
        const res = await superAdminService.createUser({
          ...formData,
          role: "admin"
        });
        if (res.success) {
          setModalOpen(false);
          loadData();
        }
      } else if (modalType === "edit") {
        const { name, mobile, propertyId, status } = formData;
        const res = await superAdminService.updateUser(selectedAdmin.id || selectedAdmin._id, {
          name,
          mobile,
          propertyId,
          status,
          role: "admin"
        });
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
      const res = await superAdminService.deleteUser(selectedAdmin.id || selectedAdmin._id);
      if (res.success) {
        setModalOpen(false);
        loadData();
      }
    } catch (err) {
      setError(err.message || "Failed to remove admin account");
    }
  };

  const getPropertyName = (pId) => {
    if (!pId) return "Unassigned Property";
    const prop = properties.find(p => p.id === pId || p._id === pId);
    return prop ? prop.name : "Unassigned Property";
  };

  const filteredAdmins = admins.filter((a) => {
    const pName = getPropertyName(a.propertyId).toLowerCase();
    return (
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.mobile && a.mobile.includes(searchQuery)) ||
      pName.includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Management"
        subtitle="Manage property administrators, owners, and general managers with hotel-level credentials."
        actions={
          <Button onClick={openAddModal} className="bg-navy hover:bg-navy/90 text-white rounded-full px-5">
            <UserPlus className="size-4 mr-2" /> Add Property Admin
          </Button>
        }
      />

      <HorizontalRouteTabs tabs={platformTabs} />

      {error && <Notice tone="error" title="Governance Error" className="text-left">{error}</Notice>}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Column - List of Admins */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-4 bg-card border rounded-xl p-4 shadow-soft">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search administrators by name, email, or managed property..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 rounded-full border-muted text-xs"
              />
            </div>
          </div>

          <Panel title="Property Administrators Directory" description={`Showing ${filteredAdmins.length} active admins`}>
            {loading ? (
              <LoadingRows rows={4} />
            ) : filteredAdmins.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No property administrators registered.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                      <th className="p-4">Administrator / Owner</th>
                      <th className="p-4">Assigned Hotel Property</th>
                      <th className="p-4">Contact Phone</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAdmins.map((a) => (
                      <tr key={a.id || a._id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4">
                          <div>
                            <p className="font-semibold text-navy text-sm">{a.name}</p>
                            <p className="text-muted-foreground text-xs">{a.email}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-navy font-semibold text-xs">
                            <Building className="size-3.5 text-purple shrink-0" />
                            <span>{getPropertyName(a.propertyId)}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-xs">{a.mobile || "—"}</td>
                        <td className="p-4">
                          <Tag tone={statusTone(a.status || "Active")}>{a.status || "Active"}</Tag>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => openEditModal(a)}
                              className="p-1.5 rounded-full hover:bg-muted text-navy-deep"
                              title="Edit Admin Settings"
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(a)}
                              className="p-1.5 rounded-full hover:bg-error/15 text-error"
                              title="Remove Admin Account"
                            >
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

        {/* Right Column - Help & Reference */}
        <div className="space-y-4">
          <Panel title="Property Mapping Guide" description="How hotel admins operate.">
            <div className="p-4 space-y-4 text-xs leading-relaxed text-muted-foreground">
              <div className="flex gap-3">
                <ShieldCheck className="size-5 text-gold shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-xs text-navy mb-1">Administrative Privileges</h5>
                  <p>Admins hold full control over property inventory, rates, billing profiles, staff allocation, and OTA channels for their specific assigned property.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Building className="size-5 text-purple shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-xs text-navy mb-1">Centralized Multi-Property</h5>
                  <p>Super Admin can map a single admin account to any registered property. If an admin manages multiple properties, they can switch between workspaces upon signing in.</p>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Modals */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-deep/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-[0_20px_50px_rgba(13,27,42,0.35)] relative border border-navy/5">
            <div className="flex items-center justify-between pb-4 border-b border-muted">
              <h3 className="font-display font-bold text-lg text-navy">
                {modalType === "add" && "Register Property Administrator"}
                {modalType === "edit" && "Edit Admin Credentials"}
                {modalType === "delete" && "Remove Admin Account"}
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
                <ShieldAlert className="size-12 text-error mx-auto animate-bounce" />
                <h4 className="font-semibold text-navy text-base">Confirm Account Revocation</h4>
                <p className="text-muted-foreground text-xs max-w-xs mx-auto">
                  Are you sure you want to revoke the administrative account for <strong className="text-navy">{selectedAdmin?.name}</strong>? They will instantly lose access to their mapped property dashboard.
                </p>
                <div className="flex gap-3 justify-center pt-4">
                  <Button variant="ghost" onClick={() => setModalOpen(false)} className="rounded-full">
                    Cancel
                  </Button>
                  <Button onClick={handleDeleteSubmit} className="bg-error hover:bg-error/90 text-white rounded-full px-5">
                    Revoke & Delete
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="py-4 space-y-4 text-left">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="admin-name" className="text-xs text-navy font-semibold">Full Name</Label>
                    <Input
                      id="admin-name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Vikram Rathore"
                      className="mt-1 h-10 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin-email" className="text-xs text-navy font-semibold">Email Address</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      required
                      disabled={modalType === "edit"}
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. vikram.rathore@hourstay.com"
                      className="mt-1 h-10 text-xs disabled:bg-muted"
                    />
                  </div>
                  {modalType === "add" && (
                    <div>
                      <Label htmlFor="admin-pass" className="text-xs text-navy font-semibold">Temporary Password</Label>
                      <Input
                        id="admin-pass"
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
                    <Label htmlFor="admin-mobile" className="text-xs text-navy font-semibold">Mobile Number</Label>
                    <Input
                      id="admin-mobile"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      placeholder="e.g. 98290 11223"
                      className="mt-1 h-10 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="admin-prop" className="text-xs text-navy font-semibold">Assigned Property</Label>
                      <select
                        id="admin-prop"
                        value={formData.propertyId}
                        onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                        className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1"
                      >
                        <option value="">Unassigned</option>
                        {properties.map(p => (
                          <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="admin-status" className="text-xs text-navy font-semibold">Account Status</Label>
                      <select
                        id="admin-status"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1"
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
                    {modalType === "add" ? "Register Administrator" : "Save Credentials"}
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

export const Route = createFileRoute("/super-admin/admins")({
  head: () => ({
    meta: [
      { title: "Admin Management — Hour Stay" },
      { name: "description", content: "Property owners and admins with workspace access." },
      { property: "og:title", content: "Admin Management — Hour Stay" },
      { property: "og:description", content: "Property owners and admins with workspace access." }
    ]
  }),
  component: SuperAdminAdmins
});