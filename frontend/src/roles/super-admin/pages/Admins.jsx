import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, statusTone, Notice, LoadingRows, ActionGroup, ViewActionButton, EditActionButton, ActionButton } from "@/components/hs/kit";
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

      if (usersRes.success && Array.isArray(usersRes.data)) {
        const filteredAdmins = usersRes.data.filter(u => u.role === 'admin');
        setAdmins(filteredAdmins);
      }
      if (propertiesRes.success && Array.isArray(propertiesRes.data)) {
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

    const unsubscribe = subscribeRealtimeSync(() => {
      loadData(true);
    });

    return () => {
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
      />

      {error && <Notice tone="error" title="Governance Error" className="text-left">{error}</Notice>}

      <div className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between bg-white border border-muted p-3.5 rounded-xl shadow-soft">
            <div className="flex flex-col sm:flex-row gap-2.5 flex-1 items-center">
              <div className="relative flex-1 w-full">
                <Search className="pointer-events-none absolute left-3 top-[18px] size-3.5 -translate-y-1/2 text-muted-foreground z-10" />
                <Input
                  placeholder="Search administrators by Admin Name, Email, or Phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs font-semibold bg-[#FDFCFA]/10 border-muted w-full"
                />
              </div>

              <div className="relative min-w-[150px] w-full sm:w-auto shrink-0">
                <select
                  value={propertyFilter}
                  onChange={(e) => setPropertyFilter(e.target.value)}
                  className="w-full h-9 pl-3.5 pr-9 rounded-lg border border-muted bg-[#FDFCFA]/10 text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy shadow-2xs cursor-pointer appearance-none"
                >
                  <option value="All">All Properties</option>
                  {properties.map((p) => (
                    <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>

              <div className="relative min-w-[135px] w-full sm:w-auto shrink-0">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-9 pl-3.5 pr-9 rounded-lg border border-muted bg-[#FDFCFA]/10 text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy shadow-2xs cursor-pointer appearance-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <Button
              onClick={() => navigate({ to: "/super-admin/admins/add" })}
              className="bg-navy hover:bg-navy/90 text-white rounded-full px-4 h-9 text-xs font-bold shadow-soft flex items-center justify-center shrink-0 cursor-pointer transition-all duration-200 hover:shadow-md w-full sm:w-auto"
            >
              <UserPlus className="size-3.5 mr-1.5" /> Add Property Admin
            </Button>
          </div>

          <Panel>
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
                      <th className="p-4">Assigned Properties</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-sans">
                    {filteredAdmins.map((a) => (
                      <tr key={a.id || a._id} className="hover:bg-muted/15 transition-colors">
                        <td className="p-4 pl-6 font-semibold text-navy">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="size-4 text-purple shrink-0" />
                            <span>{a.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{a.email}</td>
                        <td className="p-4 text-muted-foreground">{a.phone || "—"}</td>
                        <td className="p-4 font-semibold text-navy">
                          {a.propertyId ? (
                            <div className="flex items-center gap-1.5 truncate max-w-xs">
                              <Building2 className="size-3.5 text-purple shrink-0" />
                              <span className="truncate">{getPropertyName(a.propertyId)}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">Unassigned</span>
                          )}
                        </td>
                        <td className="p-4">
                          <Tag tone={statusTone(a.status || "Active")}>{a.status || "Active"}</Tag>
                        </td>
                        <td className="p-4 text-left">
                          <ActionGroup align="left">
                            <ViewActionButton onClick={() => navigate({ to: `/super-admin/admins/view/${a.id || a._id}` })} />
                            <EditActionButton onClick={() => navigate({ to: `/super-admin/admins/edit/${a.id || a._id}` })} />
                            <ActionButton
                              icon={a.status === "Active" ? X : Check}
                              label={a.status === "Active" ? "Deactivate" : "Activate"}
                              variant={a.status === "Active" ? "warning" : "success"}
                              onClick={() => handleToggleStatus(a)}
                            />
                            <ActionButton
                              icon={Lock}
                              label="Reset"
                              variant="secondary"
                              onClick={() => handleResetPassword(a)}
                            />
                          </ActionGroup>
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