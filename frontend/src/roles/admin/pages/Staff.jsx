import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HorizontalRouteTabs, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import {
  UserCog,
  Activity,
  Gift,
  Bell,
  Search,
  Plus,
  Edit2,
  XCircle,
  CheckCircle,
  Eye,
  Briefcase,
  Clock,
  ThumbsUp,
  UserCheck,
  UserX
} from "lucide-react";

const managementTabs = [
  { label: "Staff Management", to: "/admin/staff", icon: UserCog },
  { label: "OTA / Channels", to: "/admin/channels", icon: Activity },
  { label: "CRM / Loyalty", to: "/admin/crm", icon: Gift },
  { label: "Notifications", to: "/admin/notifications", icon: Bell }
];

export const Route = createFileRoute("/admin/staff")({
  head: () => ({
    meta: [
      { title: "Staff Directory — Speshway Luxury Hotel" },
      { name: "description", content: "Manage hotel operators, receptionists, operations staff and permissions." }
    ]
  }),
  component: AdminStaffPage
});

function AdminStaffPage() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notification, setNotification] = useState(null);

  async function loadStaff() {
    try {
      setLoading(true);
      setError(null);
      const res = await superAdminService.getUsers();
      setStaff(res.data || []);
    } catch (err) {
      setError(err.message || "Failed to load staff list");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStaff();
  }, []);

  const handleStatusToggle = async (member) => {
    try {
      const nextStatus = member.status === "Active" ? "Inactive" : "Active";
      await superAdminService.updateUser(member._id || member.id, {
        status: nextStatus
      });
      loadStaff();
      setNotification({ tone: "success", title: "Status Changed", body: "Staff activity status updated successfully." });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this staff profile?")) return;
    try {
      await superAdminService.deleteUser(id);
      loadStaff();
      setNotification({ tone: "warning", title: "Profile Deleted", body: "Employee deleted from database directory." });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  // Filter computations
  const filteredStaff = staff.filter((member) => {
    const isStaff = member.role !== "admin" && member.role !== "super-admin";
    if (!isStaff) return false;

    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || member.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <HorizontalRouteTabs tabs={managementTabs} />

      {notification && (
        <Notice tone={notification.tone} title={notification.title}>
          {notification.body}
        </Notice>
      )}

      {/* Search and Filters toolbar */}
      <div className="bg-white border border-muted rounded-xl p-4 shadow-soft flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search staff by name or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-muted rounded-lg text-sm bg-[#fafafa]/50 focus:outline-none focus:border-navy"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 border border-muted rounded-lg text-sm bg-white text-[#2a2a2a] focus:outline-none focus:border-navy"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <Button
          onClick={() => navigate({ to: "/admin/staff/add" })}
          className="bg-navy hover:bg-navy-deep text-white shadow-soft text-xs h-8.5 px-3.5 font-bold shrink-0 animate-fade-in"
        >
          <Plus className="size-3.5 mr-1" /> Add Staff Member
        </Button>
      </div>

      {loading ? (
        <LoadingRows rows={5} />
      ) : (
        /* Main Staff Directory list */
        <Panel title="Property Staff Directory" description={`Displaying ${filteredStaff.length} employees scoped to Speshway Luxury Hotel`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none">
                  <th className="py-4 px-4">Name / ID</th>
                  <th className="py-4 px-4">Role assignment</th>
                  <th className="py-4 px-4">Department</th>
                  <th className="py-4 px-4">Contact Phone</th>
                  <th className="py-4 px-4">Shift schedule</th>
                  <th className="py-4 px-4 text-center">Attendance</th>
                  <th className="py-4 px-4 text-center">Status</th>
                  <th className="py-4 px-6 text-right w-44">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted text-xs text-[#2a2a2a]">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-muted-foreground select-none">No staff profiles found.</td>
                  </tr>
                ) : (
                  filteredStaff.map((member) => {
                    const empId = `EMP-${(member._id || member.id).substring(19, 24).toUpperCase()}`;
                    
                    // Use database fields with fallback to visual realism default
                    let dept = member.dept || "Front Desk";
                    let shift = member.shift || "Morning (06:00 - 14:00)";
                    let attendance = member.attendance || "Present";
                    let rating = member.rating || "4.8/5";

                    if (!member.dept || !member.shift) {
                      if (member.role === "manager" || member.role === "admin") {
                        dept = "Management";
                        shift = "General (09:00 - 17:00)";
                        attendance = "Present";
                        rating = "4.9/5";
                      } else if (member.role === "operator") {
                        dept = "Operations";
                        shift = "Night (22:00 - 06:00)";
                        attendance = "Present";
                        rating = "4.6/5";
                      }
                    }

                    return (
                      <tr key={member._id || member.id} className="hover:bg-[#fcfcfc]/60">
                        <td className="py-4 px-4">
                          <div className="font-semibold text-navy text-xs">{member.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{empId}</div>
                        </td>
                        <td className="py-4 px-4 capitalize">
                          <Tag tone={member.role === "admin" ? "brand" : member.role === "manager" ? "brand" : "brand"}>
                            {member.role === "admin" ? "admin" : member.role}
                          </Tag>
                        </td>
                        <td className="py-4 px-4 font-medium text-navy">{dept}</td>
                        <td className="py-4 px-4">{member.mobile}</td>
                        <td className="py-4 px-4">{shift}</td>
                        <td className="py-4 px-4 text-center">
                          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                            {attendance}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-bold ${
                            member.status === "Active"
                              ? "bg-success/10 text-success border border-success/20"
                              : "bg-destructive/10 text-destructive border border-destructive/20"
                          }`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right select-none w-44">
                          <div className="flex items-center justify-end gap-2 opacity-85 hover:opacity-100 transition-opacity">
                            <Button
                              onClick={() => navigate({ to: `/admin/staff/view/${member._id || member.id}` })}
                              size="icon"
                              variant="ghost"
                              className="size-7 flex items-center justify-center"
                              aria-label="View Details"
                            >
                              <Eye className="size-3.5 text-navy" />
                            </Button>
                            <Button
                              onClick={() => navigate({ to: `/admin/staff/edit/${member._id || member.id}` })}
                              size="icon"
                              variant="ghost"
                              className="size-7 flex items-center justify-center"
                              aria-label="Edit Profile"
                            >
                              <Edit2 className="size-3.5 text-navy" />
                            </Button>
                            <Button
                              onClick={() => handleStatusToggle(member)}
                              size="icon"
                              variant="ghost"
                              className={`size-7 flex items-center justify-center ${
                                member.status === "Active" ? "text-destructive" : "text-success"
                              }`}
                              aria-label={member.status === "Active" ? "Deactivate" : "Activate"}
                            >
                              {member.status === "Active" ? <UserX className="size-3.5" /> : <UserCheck className="size-3.5" />}
                            </Button>
                            <Button
                              onClick={() => handleDelete(member._id || member.id)}
                              size="icon"
                              variant="ghost"
                              className="size-7 flex items-center justify-center text-destructive"
                              aria-label="Delete"
                            >
                              <XCircle className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}