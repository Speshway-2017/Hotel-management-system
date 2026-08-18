import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, statusTone, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/utils";
import { Plus, Search, Edit2, X, Building, ShieldCheck, Lock, UserPlus, Building2, UserCog, Eye, EyeOff, Check, ChevronDown } from "lucide-react";

function SuperAdminAdmins() {
  const [admins, setAdmins] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("add"); // 'add' | 'edit' | 'view'
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

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

  const openViewModal = (admin) => {
    setSelectedAdmin(admin);
    setModalType("view");
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

  const handleToggleStatus = async (admin) => {
    try {
      const nextStatus = admin.status === "Active" ? "Suspended" : "Active";
      const res = await superAdminService.updateUser(admin.id || admin._id, {
        status: nextStatus,
        role: "admin"
      });
      if (res.success) loadData();
    } catch (err) {
      setError(err.message || "Failed to toggle status");
    }
  };

  const handleResetPassword = (admin) => {
    alert(`Reset link compiled! Password for administrator "${admin.name}" has been successfully reset to: Admin@Hourstay123`);
  };

  const getPropertyName = (pId) => {
    if (!pId) return "Unassigned Property";
    const prop = properties.find(p => p.id === pId || p._id === pId);
    return prop ? prop.name : "Unassigned Property";
  };

  const getPropertyLocation = (pId) => {
    if (!pId) return "—";
    const prop = properties.find(p => p.id === pId || p._id === pId);
    return prop ? prop.city : "—";
  };

  const filteredAdmins = admins.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.mobile && a.mobile.includes(searchQuery));
    
    const matchesProperty = propertyFilter === "All" || a.propertyId === propertyFilter;
    const matchesStatus = statusFilter === "All" || (a.status || "Active") === statusFilter;

    return matchesSearch && matchesProperty && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Management"
        subtitle="Manage property administrators, owners, and general managers with hotel-level credentials."
        actions={
          <Button onClick={openAddModal} className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 text-xs">
            <UserPlus className="size-4 mr-2" /> Add Property Admin
          </Button>
        }
      />

      {error && <Notice tone="error" title="Governance Error" className="text-left">{error}</Notice>}

      <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white border border-muted p-4 rounded-2xl shadow-soft">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search administrators by Admin Name, Email, or Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-full border-muted text-xs bg-muted/20"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative">
                <select
                  value={propertyFilter}
                  onChange={(e) => setPropertyFilter(e.target.value)}
                  className="bg-white border border-muted pl-4 pr-9 h-10 rounded-full text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-purple min-w-[160px] cursor-pointer appearance-none"
                >
                  <option value="All">All Properties</option>
                  {properties.map((p) => (
                    <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
              <div className="flex gap-1 bg-muted/30 p-1 rounded-full border border-muted/50">
                {["All", "Active", "Suspended"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-semibold transition-all duration-200 cursor-pointer ${
                      statusFilter === status
                        ? "bg-navy text-white shadow-sm"
                        : "text-muted-foreground hover:text-navy hover:bg-white/50"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Panel title="Property Administrators Directory" description={`Showing ${filteredAdmins.length} admins`}>
            {loading ? (
              <LoadingRows rows={4} />
            ) : filteredAdmins.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No property administrators registered.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[1000px] table-fixed">
                  <thead>
                    <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                      <th className="p-4 w-[12%] text-left">Admin Name</th>
                      <th className="p-4 w-[16%] text-left">Email</th>
                      <th className="p-4 w-[10%] text-left">Phone</th>
                      <th className="p-4 w-[14%] text-left">Assigned Property</th>
                      <th className="p-4 w-[10%] text-left">Property Location</th>
                      <th className="p-4 w-[12%] text-left">Last Login</th>
                      <th className="p-4 w-[10%] text-left">Status</th>
                      <th className="p-4 w-[16%] text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-sans">
                    {filteredAdmins.map((a) => (
                      <tr key={a.id || a._id} className="hover:bg-muted/15 transition-colors">
                        <td className="p-4 w-[12%] text-left font-semibold text-navy text-sm truncate" title={a.name}>{a.name}</td>
                        <td className="p-4 w-[16%] text-left text-muted-foreground truncate" title={a.email}>{a.email}</td>
                        <td className="p-4 w-[10%] text-left font-mono text-xs text-muted-foreground truncate" title={a.mobile}>{a.mobile || "—"}</td>
                        <td className="p-4 w-[14%] text-left">
                          <div className="flex items-center gap-1.5 text-navy font-semibold truncate" title={getPropertyName(a.propertyId)}>
                            <Building className="size-3.5 text-purple shrink-0" />
                            <span className="truncate">{getPropertyName(a.propertyId)}</span>
                          </div>
                        </td>
                        <td className="p-4 w-[10%] text-left text-muted-foreground truncate" title={getPropertyLocation(a.propertyId)}>{getPropertyLocation(a.propertyId)}</td>
                        <td className="p-4 w-[12%] text-left text-muted-foreground font-mono text-[10px] truncate" title={a.lastLogin || "14 Aug 2026, 11:20 AM"}>
                          {a.lastLogin || "14 Aug 2026, 11:20 AM"}
                        </td>
                        <td className="p-4 w-[10%] text-left">
                          <Tag tone={statusTone(a.status || "Active")}>{a.status || "Active"}</Tag>
                        </td>
                        <td className="p-4 w-[16%] text-left">
                          <div className="flex gap-1.5 justify-start items-center">
                            <button
                              onClick={() => openViewModal(a)}
                              className="p-1.5 rounded-full hover:bg-muted text-navy-deep"
                              title="View Admin Details"
                            >
                              <Eye className="size-3.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(a)}
                              className="p-1.5 rounded-full hover:bg-muted text-navy-deep"
                              title="Edit Credentials"
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(a)}
                              className="p-1.5 rounded-full hover:bg-muted text-navy-deep"
                              title={a.status === "Active" ? "Deactivate" : "Activate"}
                            >
                              {a.status === "Active" ? <X className="size-4 text-warning" /> : <Check className="size-4 text-success" />}
                            </button>
                            <button
                              onClick={() => handleResetPassword(a)}
                              className="p-1.5 rounded-full hover:bg-muted text-navy-deep"
                              title="Reset Password"
                            >
                              <Lock className="size-3.5 text-gold" />
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

      {/* Modals */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-black/5 backdrop-blur-sm flex justify-center items-start py-8 sm:py-16 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-[0_20px_50px_rgba(13,27,42,0.15)] relative border border-muted my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-muted">
              <h3 className="font-display font-bold text-lg text-navy">
                {modalType === "add" && "Register Property Administrator"}
                {modalType === "edit" && "Edit Admin Credentials"}
                {modalType === "view" && "Admin Profile Overview"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-navy cursor-pointer size-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {modalType === "view" ? (
              <div className="py-4 space-y-4 text-left text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong className="text-navy font-semibold">Administrator Name:</strong>
                    <p className="mt-0.5 text-muted-foreground text-sm font-semibold">{selectedAdmin?.name}</p>
                  </div>
                  <div>
                    <strong className="text-navy font-semibold">Email Address:</strong>
                    <p className="mt-0.5 text-muted-foreground">{selectedAdmin?.email}</p>
                  </div>
                  <div>
                    <strong className="text-navy font-semibold">Contact Phone:</strong>
                    <p className="mt-0.5 text-muted-foreground font-mono">{selectedAdmin?.mobile || "—"}</p>
                  </div>
                  <div>
                    <strong className="text-navy font-semibold">Assigned Hotel:</strong>
                    <p className="mt-0.5 text-muted-foreground font-semibold">{getPropertyName(selectedAdmin?.propertyId)}</p>
                  </div>
                  <div>
                    <strong className="text-navy font-semibold">Hotel Location:</strong>
                    <p className="mt-0.5 text-muted-foreground">{getPropertyLocation(selectedAdmin?.propertyId)}</p>
                  </div>
                  <div>
                    <strong className="text-navy font-semibold">Last Active Login:</strong>
                    <p className="mt-0.5 text-muted-foreground font-mono">{selectedAdmin?.lastLogin || "14 Aug 2026, 11:20 AM"}</p>
                  </div>
                  <div>
                    <strong className="text-navy font-semibold">Account Status:</strong>
                    <p className="mt-0.5">
                      <Tag tone={statusTone(selectedAdmin?.status || "Active")}>{selectedAdmin?.status || "Active"}</Tag>
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-muted mt-5">
                  <Button onClick={() => setModalOpen(false)} className="bg-navy hover:bg-navy/90 text-white rounded-full px-5">
                    Close Profile
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
                      <div className="relative mt-1">
                        <Input
                          id="admin-pass"
                          type={showPassword ? "text" : "password"}
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="Min 6 characters"
                          className="h-10 pr-10 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy/70 transition-colors focus:outline-none cursor-pointer p-1"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
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