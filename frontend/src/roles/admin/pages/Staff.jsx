import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { superAdminService } from "@/services/superAdmin";
import { toast } from "sonner";
import {
  UserCog, Search, Plus, Eye, Edit2, Trash2, Shield, Calendar,
  Building, CheckCircle, XCircle, Briefcase, Activity, Clock
} from "lucide-react";

export const Route = createFileRoute("/admin/staff")({
  head: () => ({
    meta: [
      { title: "Staff & Operations Directory — Speshway Luxury Hotel" },
      { name: "description", content: "Manage hotel operators, receptionists, housekeeping staff, shifts, and credentials." }
    ]
  }),
  component: AdminStaffPage
});

function PremiumStatCard({ label, value, hint, icon: Icon, accentColor = "#0d1b2a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[110px] h-full text-left"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
          <h3 className="mt-2.5 font-display text-base font-black text-navy leading-none">{value}</h3>
        </div>
        {Icon && (
          <span className="grid size-7 place-items-center rounded-lg bg-muted/65 text-navy-deep shrink-0 ml-2">
            <Icon className="size-3.5" />
          </span>
        )}
      </div>
      <div className="mt-auto pt-2 text-[9.5px] text-muted-foreground truncate">
        {hint}
      </div>
    </div>
  );
}

import { subscribeRealtimeSync } from "@/services/socket";

function AdminStaffPage() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  async function loadStaff(isSilent = false) {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const [usersRes, propertiesRes] = await Promise.all([
        superAdminService.getUsers(),
        superAdminService.getProperties()
      ]);

      const properties = propertiesRes.data || [];
      const staffList = (usersRes.data || []).map(member => {
        const matchedProp = properties.find(p => p._id === member.propertyId || p.id === member.propertyId);
        const propName = matchedProp ? matchedProp.name : "Speshway Luxury Hotel";

        return {
          ...member,
          department: member.role === "manager" ? "Front Office" : member.role === "receptionist" ? "Reception Desk" : "Housekeeping",
          property: propName,
          lastActive: member.status === "Active" ? "Today, 11:20 AM" : "3 days ago"
        };
      });
      setStaff(staffList);
    } catch (err) {
      if (!isSilent) setError(err.message || "Failed to load staff list");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }

  useEffect(() => {
    loadStaff(false);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadStaff(true);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleStatusToggle = async (member) => {
    try {
      const nextStatus = member.status === "Active" ? "Inactive" : "Active";
      await superAdminService.updateUser(member._id || member.id, {
        status: nextStatus
      });
      toast.success(`Staff status updated to ${nextStatus}`);
      notifySocketEvents('toggle_status');
      loadStaff();
    } catch (err) {
      toast.error(`Status change error: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this staff profile?")) return;
    try {
      await superAdminService.deleteUser(id);
      toast.warning("Staff profile removed successfully");
      notifySocketEvents('delete');
      loadStaff();
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  // Filter application
  const filteredStaff = staff.filter(member => {
    // Exclude admin/super-admin roles
    const isTargetRole = member.role === "manager" || member.role === "receptionist";
    if (!isTargetRole) return false;

    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    const matchesStatus = statusFilter === "all" || member.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // KPIs
  const targetStaff = staff.filter(s => s.role === "manager" || s.role === "receptionist");
  const totalStaffCount = targetStaff.length;
  const activeStaffCount = targetStaff.filter(s => s.status === "Active").length;
  const departmentCount = new Set(targetStaff.map(s => s.department)).size;

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui">
      
      {error && <Notice tone="error" title="Directory Sync Failed">{error}</Notice>}

      {/* KPI Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PremiumStatCard
          label="Total Staff Members"
          value={totalStaffCount.toString()}
          hint="Registered database records"
          icon={UserCog}
          accentColor="#6366f1"
        />
        <PremiumStatCard
          label="On-Duty Active"
          value={activeStaffCount.toString()}
          hint="Currently online operators"
          icon={Activity}
          accentColor="#10b981"
        />
        <PremiumStatCard
          label="Departments Tracked"
          value={departmentCount.toString()}
          hint="Department teams categories"
          icon={Briefcase}
          accentColor="#3b82f6"
        />
        <PremiumStatCard
          label="Pending Invites"
          value="1"
          hint="Awaiting operator confirmation"
          icon={Clock}
          accentColor="#f59e0b"
        />
      </div>

      {/* Search & Filter Toolbar */}
      <Panel title="Staff Directory Filters">
        <div className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <FormField label="Search Operator" id="search">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="search"
                type="text"
                className="pl-9 h-10 text-xs font-bold"
                placeholder="Name, email address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </FormField>

          <FormField label="Role Tier" id="role">
            <Select
              id="role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 text-xs font-bold"
            >
              <option value="all">All Roles</option>
              <option value="manager">Manager</option>
              <option value="receptionist">Receptionist</option>
            </Select>
          </FormField>

          <FormField label="Duty Status" id="status">
            <Select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 text-xs font-bold"
            >
              <option value="all">All statuses</option>
              <option value="Active">Active / On Duty</option>
              <option value="Inactive">Inactive / Suspended</option>
            </Select>
          </FormField>

          <Button
            onClick={() => navigate({ to: "/admin/staff/add" })}
            className="bg-navy hover:bg-navy-deep text-white font-bold h-10 rounded-full flex items-center justify-center gap-1.5 text-xs shadow-soft"
          >
            <Plus className="size-4" /> Add Staff Member
          </Button>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Staff Table */}
        <div className="lg:col-span-2 space-y-4">
          <Panel title="Directory Catalog Listings">
            {loading ? (
              <LoadingRows rows={5} />
            ) : filteredStaff.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground select-none">No staff members found matching query parameters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead>
                    <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                      <th className="py-3 px-4 text-left">Employee</th>
                      <th className="py-3 px-4 text-left">Role Profile</th>
                      <th className="py-3 px-4 text-left">Department</th>
                      <th className="py-3 px-4 text-left">Property Assignment</th>
                      <th className="py-3 px-4 text-left">Account Status</th>
                      <th className="py-3 px-4 text-left">Last Active</th>
                      <th className="py-3 px-4 text-center font-bold" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted/30 whitespace-nowrap">
                    {filteredStaff.map((member) => (
                      <tr key={member._id || member.id} className="hover:bg-muted/5">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-bold text-navy">{member.name}</p>
                            <p className="text-[10px] text-muted-foreground font-semibold">{member.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-navy">
                          <span className="flex items-center gap-1">
                            <Shield className="size-3 text-brand" />
                            <span className="capitalize">{member.role}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-navy">{member.department}</td>
                        <td className="py-3 px-4 font-medium text-navy">{member.property}</td>
                        <td className="py-3 px-4">
                          <span
                            onClick={() => handleStatusToggle(member)}
                            className={`cursor-pointer px-2 py-0.5 rounded text-[9.5px] font-bold inline-flex items-center gap-1 select-none ${
                              member.status === "Active" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                            }`}
                            title="Click to toggle status"
                          >
                            {member.status === "Active" ? <CheckCircle className="size-2.5" /> : <XCircle className="size-2.5" />}
                            {member.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{member.lastActive}</td>
                        <td className="py-3 px-4 text-center" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                          <div className="flex justify-center gap-1.5 select-none">
                            <Button
                              onClick={() => navigate({ to: `/admin/staff/view/${member._id || member.id}` })}
                              variant="ghost"
                              className="h-7 w-7 p-0 hover:text-brand hover:bg-brand/10 rounded-full flex items-center justify-center"
                              title="View details"
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              onClick={() => navigate({ to: `/admin/staff/edit/${member._id || member.id}` })}
                              variant="ghost"
                              className="h-7 w-7 p-0 hover:text-brand hover:bg-brand/10 rounded-full flex items-center justify-center"
                              title="Edit profile"
                            >
                              <Edit2 className="size-4" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(member._id || member.id)}
                              variant="ghost"
                              className="h-7 w-7 p-0 hover:text-destructive hover:bg-destructive/10 rounded-full flex items-center justify-center"
                              title="Delete record"
                            >
                              <Trash2 className="size-4" />
                            </Button>
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

        {/* Audit Activity Log */}
        <div className="lg:col-span-1">
          <Panel title="System Operations Activity Log" description="Recent administrative logs.">
            <div className="p-4 space-y-4">
              {mockActivityLog.map((log, idx) => (
                <div key={idx} className="p-3 bg-[#fafafa]/50 border border-muted rounded-xl space-y-1.5 text-xs text-left">
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" /> {log.time}
                    </span>
                    <span className="bg-muted px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[8px]">{log.module}</span>
                  </div>
                  <p className="font-bold text-navy mt-1">{log.user}</p>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">{log.action}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

      </div>

    </div>
  );
}