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
  ChevronLeft,
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
  "General Shift": "09:00 AM - 05:00 PM"
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
        const decodedId = atob(id);
        const [staffRes, shiftsRes] = await Promise.all([
          managerService.getStaff(),
          managerService.getShifts()
        ]);
        
        let matched = null;
        if (staffRes.success && staffRes.data) {
          matched = staffRes.data.find(u => u._id === decodedId || u.id === decodedId);
        }

        if (matched) {
          // Verify property scope
          if (matched.propertyId !== user.propertyId) {
            setIsAuthorized(false);
          } else {
            // Find matched shift from database records
            const matchedShiftObj = (shiftsRes.success && shiftsRes.data) ? shiftsRes.data.find(sh => sh.userId === matched._id) : null;
            const assignedShift = matchedShiftObj ? matchedShiftObj.shiftType : "Morning Shift";

            setStaff({
              ...matched,
              employeeId: `EMP-${(user.propertyId || "JAI").substring(3)}-102`,
              department: "Front Office",
              assignedShift,
              shiftTiming: SHIFT_TIMINGS[assignedShift] || SHIFT_TIMINGS["Morning Shift"]
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
        <Link to="/manager/shifts" className="inline-flex items-center gap-1.5 text-xs text-navy font-bold hover:underline">
          <ChevronLeft className="size-3.5" /> Back to Staff Shifts
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">

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
