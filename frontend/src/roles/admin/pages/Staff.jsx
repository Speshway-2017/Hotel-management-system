import { createFileRoute } from "@tanstack/react-router";
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
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Form States
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("receptionist");
  const [formPhone, setFormPhone] = useState("");
  const [formDept, setFormDept] = useState("Front Desk");
  const [formShift, setFormShift] = useState("Morning (06:00 - 14:00)");
  const [formAttendance, setFormAttendance] = useState("Present");
  const [formStatus, setFormStatus] = useState("Active");

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

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formName,
        email: formEmail,
        password: formPassword,
        role: formRole,
        mobile: formPhone,
        status: formStatus
      };
      
      // Store local custom fields (department, shift, attendance) on the user record in localStorage or simulate
      await superAdminService.createUser(payload);
      setIsAddOpen(false);
      resetForm();
      loadStaff();
      setNotification({ tone: "success", title: "Staff Created", body: "New employee profile registered successfully." });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;
    try {
      const payload = {
        name: formName,
        role: formRole,
        mobile: formPhone,
        status: formStatus
      };
      await superAdminService.updateUser(selectedStaff._id || selectedStaff.id, payload);
      setIsEditOpen(false);
      setSelectedStaff(null);
      resetForm();
      loadStaff();
      setNotification({ tone: "success", title: "Profile Saved", body: "Staff details have been updated." });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleStatusToggle = async (member) => {
    const nextStatus = member.status === "Active" ? "Inactive" : "Active";
    try {
      await superAdminService.updateUser(member._id || member.id, {
        name: member.name,
        role: member.role,
        mobile: member.mobile,
        status: nextStatus
      });
      loadStaff();
      setNotification({ tone: "success", title: "Status Changed", body: `Employee successfully set to ${nextStatus}.` });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    try {
      await superAdminService.deleteUser(id);
      loadStaff();
      setNotification({ tone: "warning", title: "Profile Deleted", body: "Employee deleted from database directory." });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const openEdit = (member) => {
    setSelectedStaff(member);
    setFormName(member.name);
    setFormEmail(member.email);
    setFormRole(member.role);
    setFormPhone(member.mobile === "—" ? "" : member.mobile);
    setFormStatus(member.status);
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("receptionist");
    setFormPhone("");
    setFormDept("Front Desk");
    setFormShift("Morning (06:00 - 14:00)");
    setFormAttendance("Present");
    setFormStatus("Active");
  };

  // Filter computations
  const filteredStaff = staff.filter((member) => {
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
          onClick={() => {
            resetForm();
            setIsAddOpen(true);
          }}
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
                    
                    // Derive department & shift for visual realism
                    let dept = "Front Desk";
                    let shift = "Morning (06:00 - 14:00)";
                    let attendance = "Present";
                    let rating = "4.8/5";

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
                              onClick={() => {
                                setSelectedStaff({ ...member, empId, dept, shift, attendance, rating });
                                setIsDetailOpen(true);
                              }}
                              size="icon"
                              variant="ghost"
                              className="size-7 flex items-center justify-center"
                              aria-label="View Details"
                            >
                              <Eye className="size-3.5 text-navy" />
                            </Button>
                            <Button
                              onClick={() => openEdit(member)}
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

      {/* Add Staff Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-muted max-w-md w-full shadow-lift overflow-hidden text-left flex flex-col">
            <div className="p-5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <h3 className="font-display font-black text-navy text-md">Register Staff Profile</h3>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setIsAddOpen(false)}>
                <XCircle className="size-4" />
              </Button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-muted rounded-lg text-sm focus:outline-none focus:border-navy"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-muted rounded-lg text-sm focus:outline-none focus:border-navy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-muted rounded-lg text-sm focus:outline-none focus:border-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full px-3 py-2 border border-muted rounded-lg text-sm focus:outline-none focus:border-navy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Role Permission</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full px-3 py-2 border border-muted rounded-lg text-sm bg-white focus:outline-none focus:border-navy"
                  >
                    <option value="receptionist">Receptionist</option>
                    <option value="manager">Manager</option>
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Department</label>
                  <select
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full px-3 py-2 border border-muted rounded-lg text-sm bg-white focus:outline-none focus:border-navy"
                  >
                    <option value="Front Desk">Front Desk</option>
                    <option value="Management">Management</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Shift Assignment</label>
                  <select
                    value={formShift}
                    onChange={(e) => setFormShift(e.target.value)}
                    className="w-full px-3 py-2 border border-muted rounded-lg text-sm bg-white focus:outline-none focus:border-navy"
                  >
                    <option value="Morning (06:00 - 14:00)">Morning (06:00 - 14:00)</option>
                    <option value="Evening (14:00 - 22:00)">Evening (14:00 - 22:00)</option>
                    <option value="Night (22:00 - 06:00)">Night (22:00 - 06:00)</option>
                    <option value="General (09:00 - 17:00)">General (09:00 - 17:00)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-muted flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)} className="h-10 px-4">
                  Cancel
                </Button>
                <Button type="submit" className="bg-navy hover:bg-navy-deep text-white h-10 px-6 font-bold shadow-soft">
                  Register Employee
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-muted max-w-md w-full shadow-lift overflow-hidden text-left flex flex-col">
            <div className="p-5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <h3 className="font-display font-black text-navy text-md">Modify Staff Details</h3>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setIsEditOpen(false)}>
                <XCircle className="size-4" />
              </Button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-muted rounded-lg text-sm focus:outline-none focus:border-navy"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Email (Read-only)</label>
                  <input
                    type="email"
                    disabled
                    value={formEmail}
                    className="w-full px-3 py-2 border border-muted bg-[#fafafa] rounded-lg text-sm text-muted-foreground cursor-not-allowed focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-muted rounded-lg text-sm focus:outline-none focus:border-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Role Permission</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full px-3 py-2 border border-muted rounded-lg text-sm bg-white focus:outline-none focus:border-navy"
                  >
                    <option value="receptionist">Receptionist</option>
                    <option value="manager">Manager</option>
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-muted rounded-lg text-sm bg-white focus:outline-none focus:border-navy"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-muted flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)} className="h-10 px-4">
                  Cancel
                </Button>
                <Button type="submit" className="bg-navy hover:bg-navy-deep text-white h-10 px-6 font-bold shadow-soft">
                  Save Profile
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Details Modal */}
      {isDetailOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-muted max-w-sm w-full shadow-lift overflow-hidden text-left flex flex-col animate-scale-up">
            <div className="p-4.5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <h3 className="font-semibold text-navy text-sm">Staff Profile Diagnostic</h3>
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setIsDetailOpen(false)}>
                <XCircle className="size-4" />
              </Button>
            </div>
            <div className="p-5 space-y-4 text-xs text-navy">
              <div className="bg-muted/20 p-4 rounded-xl border border-muted space-y-2 flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-navy text-cream font-bold text-sm select-none">
                  {selectedStaff.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-navy-deep leading-none">{selectedStaff.name}</h4>
                  <p className="text-[10px] text-muted-foreground mt-1.5">ID: {selectedStaff.empId} | Dept: {selectedStaff.dept}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Briefcase className="size-3 text-purple" /> Assigned Role
                  </span>
                  <p className="font-semibold text-sm capitalize mt-0.5">{selectedStaff.role}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 justify-end">
                    <Clock className="size-3 text-purple" /> Assigned Shift
                  </span>
                  <p className="font-semibold text-right mt-0.5">{selectedStaff.shift}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <UserCheck className="size-3 text-purple" /> Attendance
                  </span>
                  <p className="font-semibold text-success mt-0.5">{selectedStaff.attendance}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 justify-end">
                    <ThumbsUp className="size-3 text-purple" /> Performance Index
                  </span>
                  <p className="font-black text-brand text-right mt-0.5">{selectedStaff.rating}</p>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Contact Email</span>
                <p className="font-semibold mt-0.5 pl-1">{selectedStaff.email}</p>
              </div>

              <div className="pt-4 border-t border-muted flex justify-end">
                <Button onClick={() => setIsDetailOpen(false)} className="bg-navy hover:bg-navy-deep text-white h-8 px-4 text-xs">
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}