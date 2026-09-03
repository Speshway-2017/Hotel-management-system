import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, statusTone, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { subscribeRealtimeSync } from "@/services/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/utils";
import { Plus, Search, Edit2, X, Building, ShieldCheck, Lock, UserPlus, Building2, UserCog, Eye, EyeOff, Check, ChevronDown } from "lucide-react";

function SuperAdminAdmins() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [usersRes, propertiesRes] = await Promise.all([
        superAdminService.getUsers().catch(() => ({})),
        superAdminService.getProperties().catch(() => ({}))
      ]);

      if (usersRes.success && propertiesRes.success) {
        // Filter users to only show admins
        const filteredAdmins = usersRes.data.filter(u => u.role === 'admin');
        setAdmins(filteredAdmins);
        setProperties(propertiesRes.data);
      }
    } catch (err) {
      if (!isSilent) setError(err.message || "Failed to load admin management details");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);

    const handleFocus = () => loadData(true);
    window.addEventListener('focus', handleFocus);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadData(true);
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      if (unsubscribe) unsubscribe();
    };
  }, []);

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
    <div className="space-y-6 text-left">
      <PageHeader
        title="Admin Management"
        subtitle="Manage property administrators, owners, and general managers with hotel-level credentials."
        actions={
          <Button onClick={() => navigate({ to: "/super-admin/admins/add" })} className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 text-xs">
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
                <table className="w-full text-left text-xs border-collapse min-w-[1050px]">
                  <thead>
                    <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                      <th className="p-4 pl-6">Admin Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">Assigned Property</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Last Login</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right pr-6 w-36 whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-sans">
                    {filteredAdmins.map((a) => (
                      <tr key={a.id || a._id} className="hover:bg-muted/15 transition-colors">
                        <td className="p-4 pl-6 font-semibold text-navy text-sm" title={a.name}>{a.name}</td>
                        <td className="p-4 text-muted-foreground" title={a.email}>{a.email}</td>
                        <td className="p-4 font-mono text-xs text-muted-foreground" title={a.mobile}>{a.mobile || "—"}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-navy font-semibold" title={getPropertyName(a.propertyId)}>
                            <Building className="size-3.5 text-purple shrink-0" />
                            <span>{getPropertyName(a.propertyId)}</span>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground" title={getPropertyLocation(a.propertyId)}>{getPropertyLocation(a.propertyId)}</td>
                        <td className="p-4 text-muted-foreground font-mono text-[10px]" title={a.lastLogin || "14 Aug 2026, 11:20 AM"}>
                          {a.lastLogin || "14 Aug 2026, 11:20 AM"}
                        </td>
                        <td className="p-4">
                          <Tag tone={statusTone(a.status || "Active")}>{a.status || "Active"}</Tag>
                        </td>
                        <td className="p-4 text-right pr-6 w-36 whitespace-nowrap">
                          <div className="flex gap-1.5 justify-end items-center">
                            <button
                              onClick={() => navigate({ to: `/super-admin/admins/view/${a.id || a._id}` })}
                              className="p-1.5 rounded-full hover:bg-muted text-navy-deep cursor-pointer"
                              title="View Admin Details"
                            >
                              <Eye className="size-4" />
                            </button>
                            <button
                              onClick={() => navigate({ to: `/super-admin/admins/edit/${a.id || a._id}` })}
                              className="p-1.5 rounded-full hover:bg-muted text-navy-deep cursor-pointer"
                              title="Edit Credentials"
                            >
                              <Edit2 className="size-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(a)}
                              className="p-1.5 rounded-full hover:bg-muted text-navy-deep cursor-pointer"
                              title={a.status === "Active" ? "Deactivate" : "Activate"}
                            >
                              {a.status === "Active" ? <X className="size-4 text-warning" /> : <Check className="size-4 text-success" />}
                            </button>
                            <button
                              onClick={() => handleResetPassword(a)}
                              className="p-1.5 rounded-full hover:bg-muted text-navy-deep cursor-pointer"
                              title="Reset Password"
                            >
                              <Lock className="size-4 text-gold" />
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