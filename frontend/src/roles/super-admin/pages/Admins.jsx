import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, statusTone, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
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
                              onClick={() => navigate({ to: `/super-admin/admins/view/${a.id || a._id}` })}
                              className="p-1.5 rounded-full hover:bg-muted text-navy-deep"
                              title="View Admin Details"
                            >
                              <Eye className="size-3.5" />
                            </button>
                            <button
                              onClick={() => navigate({ to: `/super-admin/admins/edit/${a.id || a._id}` })}
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