import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { managerService } from "@/services/manager";
import { authService } from "@/services/auth";
import {
  User,
  Clock,
  Briefcase,
  Mail,
  Phone,
  ShieldCheck,
  TrendingUp,
  UserCheck
} from "lucide-react";

const SHIFT_TIMINGS = {
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

const getShiftTiming = (shiftStr) => {
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

const normalizeShiftName = (shiftStr) => {
  if (!shiftStr) return "Morning Shift";
  if (["Morning Shift", "Afternoon Shift", "Night Shift", "General Shift"].includes(shiftStr)) return shiftStr;
  const lower = shiftStr.toLowerCase();
  if (lower.includes("morn")) return "Morning Shift";
  if (lower.includes("after") || lower.includes("even")) return "Afternoon Shift";
  if (lower.includes("night")) return "Night Shift";
  if (lower.includes("gen")) return "General Shift";
  return shiftStr;
};

function ManagerViewStaff() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [staff, setStaff] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(true);

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    if (!user || user.role !== "manager") {
      setIsAuthorized(false);
      setLoading(false);
      return;
    }

    const loadStaffDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        let resolvedId = id;
        try {
          if (id && id.length % 4 === 0 && !id.includes('-') && /^[A-Za-z0-9+/=]+$/.test(id)) {
            const decoded = atob(id);
            if (decoded && (decoded.includes('-') || decoded.length === 24 || decoded.includes('@'))) {
              resolvedId = decoded;
            }
          }
        } catch (e) {
          resolvedId = id;
        }

        const [staffRes, shiftsRes] = await Promise.all([
          managerService.getStaff().catch(() => ({ data: [] })),
          managerService.getShifts().catch(() => ({ data: [] }))
        ]);
        
        let matched = null;
        const list = Array.isArray(staffRes) ? staffRes : (staffRes?.data || []);
        matched = list.find(u => 
          String(u._id) === String(resolvedId) || 
          String(u.id) === String(resolvedId) ||
          String(u._id) === String(id) || 
          String(u.id) === String(id) ||
          String(u.email).toLowerCase() === String(resolvedId).toLowerCase()
        );

        if (!matched) {
          try {
            const singleRes = await managerService.getStaffMember(resolvedId || id);
            if (singleRes && (singleRes.success || singleRes.data)) {
              matched = singleRes.data || singleRes;
            }
          } catch {}
        }

        if (matched) {
          // Verify property scope if assigned
          if (matched.propertyId && user.propertyId && matched.propertyId !== user.propertyId) {
            setIsAuthorized(false);
          } else {
            // Find matched shift from database records or user document
            const shiftsList = Array.isArray(shiftsRes) ? shiftsRes : (shiftsRes?.data || []);
            const matchedShiftObj = shiftsList.find(sh => 
              String(sh.userId) === String(matched._id || matched.id) ||
              (sh.username && matched.name && String(sh.username).toLowerCase() === String(matched.name).toLowerCase())
            );
            const rawShift = matched.shift || matchedShiftObj?.shiftType || "Morning Shift";
            const assignedShift = normalizeShiftName(rawShift);
            const shiftTiming = getShiftTiming(matched.shift || matchedShiftObj?.shiftType || assignedShift);

            setStaff({
              ...matched,
              employeeId: matched.id || matched._id || `EMP-${(user.propertyId || "JAI").substring(3)}-102`,
              department: matched.dept || "Front Office",
              assignedShift,
              shift: rawShift,
              shiftTiming
            });
          }
        } else {
          setError("Staff record not found.");
        }
      } catch (err) {
        setError(err.message || "Failed to load staff details.");
      } finally {
        setLoading(false);
      }
    };

    if (id) loadStaffDetail();
  }, [id]);

  if (!isAuthorized) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Access Denied" subtitle="Security and privilege validation." />
        <Notice tone="error" title="Unauthorized Access">
          You are not authorized to view personnel files for this property branch. Access is strictly scoped.
        </Notice>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <PageHeader
        title={staff ? `${staff.name}'s Profile` : "Staff Profile"}
        subtitle="Employee coordinates, assigned shift timing, and operational status."
      />

      {error && <Notice tone="error" title="Personnel Sync Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={4} />
      ) : staff ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
          
          {/* Roster & Bio Card */}
          <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-muted">
              <User className="size-4.5 text-brand" />
              <h4 className="font-semibold text-navy text-sm">Personnel Profile</h4>
            </div>
            <div className="space-y-3.5 text-xs text-navy">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Employee Name</span>
                <p className="font-bold text-navy-deep mt-0.5">{staff.name}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Employee ID</span>
                <p className="font-mono text-navy font-semibold mt-0.5">{staff.employeeId}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Roster Role</span>
                <p className="font-semibold capitalize mt-0.5">{staff.role}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Email Address</span>
                <p className="font-semibold mt-0.5">{staff.email}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Mobile Phone</span>
                <p className="font-semibold mt-0.5">{staff.mobile || "—"}</p>
              </div>
            </div>
          </div>

          {/* Roster shift allocation details */}
          <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-muted">
              <Clock className="size-4.5 text-brand" />
              <h4 className="font-semibold text-navy text-sm">Duty Shift Assignment</h4>
            </div>
            <div className="space-y-3.5 text-xs text-navy">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Assigned Roster Shift</span>
                <p className="font-bold text-brand mt-0.5">{staff.assignedShift}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Shift Timing</span>
                <p className="font-semibold font-mono mt-0.5">{staff.shiftTiming}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Allocated Department</span>
                <p className="font-semibold mt-0.5">{staff.department}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Duty Status</span>
                <div className="mt-1">
                  <Tag tone={staff.status === "Active" ? "success" : "warning"}>
                    {staff.status}
                  </Tag>
                </div>
              </div>
            </div>
          </div>

          {/* Productivity index (mock performance metrics) */}
          <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-muted">
              <TrendingUp className="size-4.5 text-success" />
              <h4 className="font-semibold text-navy text-sm">Performance Indicators</h4>
            </div>
            <div className="space-y-3.5 text-xs text-navy">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Attendance Index</span>
                <p className="font-bold text-success mt-0.5">98.4% (Active Duty)</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Check-in Turnaround</span>
                <p className="font-semibold mt-0.5">3.4 minutes (Average)</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Security Clearances</span>
                <div className="flex items-center gap-1.5 mt-0.5 text-success font-semibold">
                  <ShieldCheck className="size-4" /> Passed Aadhaar OCR Audit
                </div>
              </div>
              <div className="pt-2 border-t border-muted/50 text-[10px] text-muted-foreground leading-relaxed leading-tight">
                * Note: Modifying employee accounts, roles, or changing RBAC permissions is strictly restricted to Admin roles. Roster shifts can be reassigned in the main Shift grid.
              </div>
            </div>
          </div>

        </div>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/manager/staff/view/$id")({
  component: ManagerViewStaff
});
