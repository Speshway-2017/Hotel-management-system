import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Notice, LoadingRows, Tag, ActionGroup, ViewActionButton, EditActionButton } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/hs/FormFields";
import { managerService } from "@/services/manager";
import { authService } from "@/services/auth";
import { toast } from "sonner";
import { subscribeRealtimeSync } from "@/services/socket";
import {
  Users,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  Briefcase,
  ShieldAlert,
  CalendarDays,
  UserCheck,
  Plus,
  Edit
} from "lucide-react";

// Premium stat card component
function PremiumStatCard({ label, value, hint, accentColor = "#0d1b2a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[120px] h-full"
    >
      <div>
        <div className="h-8 flex items-start">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
        </div>
        <h3 className="mt-1.5 font-sans tracking-tight tabular-nums text-lg font-bold text-slate-800 leading-none">{value}</h3>
      </div>
      <div className="mt-auto pt-2 text-[10px] text-muted-foreground truncate">
        {hint}
      </div>
    </div>
  );
}

// Fixed Shift Timing Configs & Resolvers
export const SHIFT_TIMINGS = {
  "Morning Shift": "06:00 AM - 02:00 PM",
  "Afternoon Shift": "02:00 PM - 10:00 PM",
  "Night Shift": "10:00 PM - 06:00 AM",
  "General Shift": "09:00 AM - 05:00 PM",
  "Morning": "06:00 AM - 02:00 PM",
  "Evening": "02:00 PM - 10:00 PM",
  "Afternoon": "02:00 PM - 10:00 PM",
  "Night": "10:00 PM - 06:00 AM",
  "General": "09:00 AM - 05:00 PM",
  "Morning (06:00 - 14:00)": "06:00 AM - 02:00 PM",
  "Evening (14:00 - 22:00)": "02:00 PM - 10:00 PM",
  "Night (22:00 - 06:00)": "10:00 PM - 06:00 AM",
  "General (09:00 - 17:00)": "09:00 AM - 05:00 PM"
};

export const getShiftTiming = (shiftStr) => {
  if (!shiftStr) return "06:00 AM - 02:00 PM";
  if (SHIFT_TIMINGS[shiftStr]) return SHIFT_TIMINGS[shiftStr];
  const timeMatch = shiftStr.match(/\((.*?)\)/);
  if (timeMatch && timeMatch[1]) return timeMatch[1];
  const lower = shiftStr.toLowerCase();
  if (lower.includes("morn")) return "06:00 AM - 02:00 PM";
  if (lower.includes("after") || lower.includes("even")) return "02:00 PM - 10:00 PM";
  if (lower.includes("night")) return "10:00 PM - 06:00 AM";
  if (lower.includes("gen")) return "09:00 AM - 05:00 PM";
  return shiftStr;
};

export const normalizeShiftName = (shiftStr) => {
  if (!shiftStr) return "Morning Shift";
  if (["Morning Shift", "Afternoon Shift", "Night Shift", "General Shift"].includes(shiftStr)) return shiftStr;
  const lower = shiftStr.toLowerCase();
  if (lower.includes("morn")) return "Morning Shift";
  if (lower.includes("after") || lower.includes("even")) return "Afternoon Shift";
  if (lower.includes("night")) return "Night Shift";
  if (lower.includes("gen")) return "General Shift";
  return shiftStr;
};

function ManagerShiftsPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [property, setProperty] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const user = authService.getCurrentUser();
      setCurrentUser(user);

      if (!user || user.role !== "manager") {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      const [propRes, staffRes, shiftsRes] = await Promise.all([
        managerService.getProperty(),
        managerService.getStaff(),
        managerService.getShifts()
      ]);

      if (propRes.success && propRes.data) {
        setProperty(propRes.data);
      }

      const realUsers = staffRes.success && staffRes.data ? staffRes.data : [];
      const realShifts = shiftsRes.success && shiftsRes.data ? shiftsRes.data : [];

      const compiled = realUsers.map((st, idx) => {
        const sid = String(st._id || st.id);
        const employeeId = st.employeeId || `EMP-${(user.propertyId || "JAI").substring(3)}-10${idx + 1}`;
        const department = st.dept || st.department || "Front Office";
        
        // Assigned shift details
        const matchedShiftObj = realShifts.find(sh => 
          String(sh.userId) === sid || 
          (sh.username && st.name && String(sh.username).toLowerCase() === String(st.name).toLowerCase())
        );
        const rawShift = st.shift || matchedShiftObj?.shiftType || (idx % 2 === 0 ? "Morning Shift" : "Afternoon Shift");
        const assignedShift = normalizeShiftName(rawShift);
        const shiftTiming = getShiftTiming(st.shift || matchedShiftObj?.shiftType || assignedShift);
        const status = st.status || "Active";

        return {
          ...st,
          employeeId,
          department,
          assignedShift,
          shift: rawShift,
          shiftTiming,
          status
        };
      });

      setStaffList(compiled);

    } catch (err) {
      setError(err.message || "Failed to load staff roster data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    const handleFocus = () => loadData();

    const unsubscribe = subscribeRealtimeSync(() => {
      loadData();
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleShiftChange = async (sid, newShift) => {
    try {
      const cleanSid = String(sid);
      const staffMember = staffList.find(s => String(s._id || s.id) === cleanSid);
      
      // Update UI optimistically
      const normalized = normalizeShiftName(newShift);
      const newTiming = getShiftTiming(newShift);
      setStaffList(prev => prev.map(s => {
        if (String(s._id || s.id) === cleanSid) {
          return {
            ...s,
            assignedShift: normalized,
            shift: newShift,
            shiftTiming: newTiming
          };
        }
        return s;
      }));

      // Dual-sync to both assignShift and updateStaff endpoints
      const [assignRes, updateRes] = await Promise.all([
        managerService.assignShift(cleanSid, staffMember?.name || "Roster Staff", newShift),
        managerService.updateStaff(cleanSid, {
          _id: cleanSid,
          id: cleanSid,
          name: staffMember?.name,
          shift: newShift
        }).catch(() => null)
      ]);

      if (assignRes?.success || updateRes?.success || updateRes?.data) {
        toast.success("Roster shift reassigned successfully.");
        loadData();
      }
    } catch (err) {
      toast.error(err.message || "Failed to assign shift");
      loadData();
    }
  };

  // Stats computations
  const totalCount = staffList.length;
  const activeCount = staffList.filter(s => s.status === "Active").length;
  const onLeaveCount = staffList.filter(s => s.status === "On Leave" || s.status === "Inactive").length;
  const morningCount = staffList.filter(s => s.assignedShift === "Morning Shift").length;

  // Filter Computations
  const filteredStaff = staffList.filter(st => {
    const s = searchQuery.toLowerCase();
    const matchesSearch =
      st.name.toLowerCase().includes(s) ||
      st.employeeId.toLowerCase().includes(s) ||
      st.email.toLowerCase().includes(s);

    const matchesRole = roleFilter === "all" || st.role === roleFilter;
    const matchesDept = deptFilter === "all" || st.department === deptFilter;
    const matchesShift = shiftFilter === "all" || st.assignedShift === shiftFilter;
    const matchesStatus = statusFilter === "all" || st.status === statusFilter;

    return matchesSearch && matchesRole && matchesDept && matchesShift && matchesStatus;
  });

  // Pagination computations
  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage) || 1;
  const paginatedStaff = filteredStaff.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (!isAuthorized) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Access Denied" subtitle="Security and privilege validation." />
        <Notice tone="error" title="Unauthorized Access">
          You are not authorized to view the Manager Console. Access is restricted to property managers.
        </Notice>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Staff & Shifts" subtitle="Loading roster shift ledger..." />
        <LoadingRows rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans">
      <div className="flex justify-end">
        <Button
          onClick={() => navigate({ to: "/manager/staff/add" })}
          className="bg-navy hover:bg-navy-deep text-white font-bold h-9 px-4 rounded-md cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="size-4" /> Add Staff Member
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PremiumStatCard label="Total Staff" value={totalCount.toString()} hint="Property headcount log" accentColor="#0d1b2a" />
        <PremiumStatCard label="Active Personnel" value={activeCount.toString()} hint="Currently duty active" accentColor="#10b981" />
        <PremiumStatCard label="Awaiting Shift Leads" value={morningCount.toString()} hint="Morning shift headcount" accentColor="#3b82f6" />
        <PremiumStatCard label="On Leave / Inactive" value={onLeaveCount.toString()} hint="Time-off duty logs" accentColor="#ef4444" />
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-muted rounded-xl p-4 shadow-soft">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by staff name, email, employee ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9 text-xs font-semibold bg-cream/10 border-muted w-full"
            />
          </div>

          <div className="w-full md:w-56">
            <Select
              value={shiftFilter}
              onChange={(e) => { setShiftFilter(e.target.value); setCurrentPage(1); }}
              className="text-xs h-9 font-semibold bg-[#FDFCFA]/20 border-muted"
            >
              <option value="all">All Shifts</option>
              <option value="Morning Shift">Morning Shift</option>
              <option value="Afternoon Shift">Afternoon Shift</option>
              <option value="Night Shift">Night Shift</option>
              <option value="General Shift">General Shift</option>
            </Select>
          </div>

          <div className="w-full md:w-56">
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="text-xs h-9 font-semibold bg-[#FDFCFA]/20 border-muted"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white border border-muted rounded-xl shadow-soft overflow-hidden">
        {paginatedStaff.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="size-12 text-muted-foreground/45 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-800">No staff matching filters</h3>
            <p className="text-xs text-muted-foreground mt-1">Try updating search query or category filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[1050px]">
              <thead>
                <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none whitespace-nowrap">
                  <th className="py-4.5 px-6">Staff Name</th>
                  <th className="py-4.5 px-4">Employee ID</th>
                  <th className="py-4.5 px-4">Role</th>
                  <th className="py-4.5 px-4">Department</th>
                  <th className="py-4.5 px-4">Assigned Shift</th>
                  <th className="py-4.5 px-4">Shift Timing</th>
                  <th className="py-4.5 px-4 text-center">Status</th>
                  <th className="py-4.5 px-4 text-left min-w-[240px] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted text-sm text-[#2a2a2a] bg-white font-medium">
                {paginatedStaff.map((s) => {
                  const targetId = s._id || s.id;
                  return (
                    <tr key={targetId} className="hover:bg-[#fcfcfc]/60 transition-colors group whitespace-nowrap">
                      <td className="py-4 px-6 font-bold text-navy-deep">
                        <div>{s.name}</div>
                        <div className="text-[10px] font-normal text-muted-foreground mt-0.5">{s.email}</div>
                      </td>
                      <td className="py-4 px-4 font-mono text-[11px] text-muted-foreground">
                        {s.employeeId}
                      </td>
                      <td className="py-4 px-4 font-semibold text-navy">
                        <Tag tone="brand" className="capitalize text-[10px]">{s.role}</Tag>
                      </td>
                      <td className="py-4 px-4 font-semibold text-navy">
                        {s.department}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <Link
                            to={`/manager/shifts/view/${btoa(s.assignedShift)}`}
                            className="text-brand font-bold hover:underline"
                          >
                            {s.assignedShift}
                          </Link>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-[11px] text-muted-foreground">
                        {s.shiftTiming}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Tag tone={s.status === "Active" ? "success" : "warning"}>
                          {s.status}
                        </Tag>
                      </td>
                      <td className="py-4 px-4 text-left align-middle whitespace-nowrap min-w-[240px]">
                        <ActionGroup align="left">
                          <ViewActionButton
                            onClick={() => navigate({ to: `/manager/staff/view/${targetId}`, state: { member: s } })}
                            title="View Staff Profile"
                          />

                          <EditActionButton
                            onClick={() => navigate({ to: `/manager/staff/edit/${targetId}`, state: { member: s } })}
                            title="Edit Staff Profile"
                          />
                          
                          {/* Reassign Shift dropdown */}
                          <Select
                            value={s.assignedShift}
                            onChange={(e) => handleShiftChange(targetId, e.target.value)}
                            className="w-32 text-[10px] h-7 py-0 font-bold ml-1 rounded-lg border border-muted shadow-2xs"
                          >
                            <option value="Morning Shift">Morning Shift</option>
                            <option value="Afternoon Shift">Afternoon Shift</option>
                            <option value="Night Shift">Night Shift</option>
                            <option value="General Shift">General Shift</option>
                          </Select>
                        </ActionGroup>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Panel */}
            <div className="p-4 border-t border-muted flex items-center justify-between gap-3 text-muted-foreground text-[10px] font-bold select-none">
              <span>Page {currentPage} of {totalPages} (Total: {filteredStaff.length})</span>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="h-7 w-7 p-0 flex items-center justify-center border-muted cursor-pointer"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="h-7 w-7 p-0 flex items-center justify-center border-muted cursor-pointer"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/manager/shifts")({
  component: ManagerShiftsPage
});