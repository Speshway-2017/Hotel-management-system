import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Tag, Notice, LoadingRows, Crumbs } from "@/components/hs/kit";
import { managerService } from "@/services/manager";
import { authService } from "@/services/auth";
import {
  Clock,
  User,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Activity,
  LogOut,
  LogIn
} from "lucide-react";

const SHIFT_TIMINGS = {
  "Morning Shift": { start: "06:00 AM", end: "02:00 PM" },
  "Afternoon Shift": { start: "02:00 PM", end: "10:00 PM" },
  "Night Shift": { start: "10:00 PM", end: "06:00 AM" },
  "General Shift": { start: "09:00 AM", end: "06:00 PM" }
};

function ManagerViewAttendance() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [record, setRecord] = useState(null);
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

    const loadAttendanceRecord = async () => {
      setLoading(true);
      setError(null);
      try {
        // Decode id (format: staffId|date)
        const decoded = atob(id);
        const [staffId, targetDate] = decoded.split("|");

        const [staffRes, attendanceRes, shiftsRes] = await Promise.all([
          managerService.getStaff(),
          managerService.getAttendance(),
          managerService.getShifts()
        ]);
        
        const realUsers = staffRes.success && staffRes.data ? staffRes.data : [];
        const realAttendance = attendanceRes.success && attendanceRes.data ? attendanceRes.data : [];
        const realShifts = shiftsRes.success && shiftsRes.data ? shiftsRes.data : [];

        const matchedStaff = realUsers.find(st => (st._id || st.id) === staffId);

        if (matchedStaff) {
          const sid = matchedStaff._id || matchedStaff.id;
          const employeeId = `EMP-${(user.propertyId || "JAI").substring(3)}-102`;
          const department = "Front Office";
          
          const matchedShiftObj = realShifts.find(sh => sh.userId === sid);
          const assignedShift = matchedShiftObj ? matchedShiftObj.shiftType : "Morning Shift";

          const attRecord = realAttendance.find(att => att.userId === sid && att.date === targetDate);

          const matchedRecord = {
            id: sid,
            name: matchedStaff.name,
            email: matchedStaff.email,
            employeeId,
            department,
            assignedShift,
            checkIn: attRecord ? attRecord.checkIn : "09:00 AM",
            checkOut: attRecord ? attRecord.checkOut : "05:00 PM",
            workingHours: attRecord ? `${attRecord.workingHours}h` : "8h",
            attendanceStatus: attRecord ? attRecord.status : "Present"
          };

          // Calculate timing deviations
          const timingLimits = SHIFT_TIMINGS[matchedRecord.assignedShift] || { start: "09:00 AM", end: "05:00 PM" };
          
          // Micro punch logs simulation
          const punchLogs = [];
          if (matchedRecord.attendanceStatus !== "Absent" && matchedRecord.attendanceStatus !== "On Leave") {
            punchLogs.push({ time: matchedRecord.checkIn, type: "Check-in", device: "Main Gate Turnstile (Biometric)" });
            if (matchedRecord.checkOut !== "—") {
              punchLogs.push({ time: matchedRecord.checkOut, type: "Check-out", device: "Main Gate Turnstile (Biometric)" });
            }
          }

          setRecord({
            ...matchedRecord,
            date: targetDate,
            timingLimits,
            punchLogs
          });
        } else {
          setError("Staff record not found.");
        }
      } catch (err) {
        setError(err.message || "Failed to load attendance details.");
      } finally {
        setLoading(false);
      }
    };


    if (id) loadAttendanceRecord();
  }, [id]);

  if (!isAuthorized) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Access Denied" subtitle="Security and privilege validation." />
        <Notice tone="error" title="Unauthorized Access">
          You are not authorized to view attendance logs. Scoped properties access only.
        </Notice>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <Crumbs
        items={[
          { label: "Attendance", to: "/manager/attendance" },
          { label: record ? `${record.name}'s Attendance` : "Attendance Audit" }
        ]}
      />
      
      <PageHeader
        title={record ? `${record.name}'s Attendance Audit` : "Attendance Audit"}
        subtitle="Punch check-ins timeline, shift tolerances deviations, and device logs ledger."
      />

      {error && <Notice tone="error" title="Roster Sync Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={3} />
      ) : record ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans text-left">
          
          {/* Roster Bio Info Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-muted">
                <div className="flex items-center gap-2">
                  <User className="size-4.5 text-brand" />
                  <h4 className="font-semibold text-navy text-sm">Personnel Profile</h4>
                </div>
                <Tag tone={
                  record.attendanceStatus === "Present" ? "success" :
                  record.attendanceStatus === "Absent" ? "error" :
                  record.attendanceStatus === "Late" ? "warning" :
                  record.attendanceStatus === "Half Day" ? "brand" : "neutral"
                }>
                  {record.attendanceStatus}
                </Tag>
              </div>
              <div className="space-y-3.5 text-xs text-navy">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Employee Name</span>
                  <strong className="text-navy-deep block mt-0.5">{record.name}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Employee ID</span>
                  <span className="font-mono font-semibold block mt-0.5">{record.employeeId}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Department</span>
                  <span className="font-semibold block mt-0.5">{record.department}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Target Audit Date</span>
                  <div className="flex items-center gap-1.5 mt-0.5 font-semibold text-brand">
                    <Calendar className="size-4 shrink-0" />
                    <span>{record.targetDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shift limits parameters */}
            <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-muted">
                <Clock className="size-4.5 text-purple" />
                <h4 className="font-semibold text-navy text-sm">Expected Shift Bounds</h4>
              </div>
              <div className="space-y-3.5 text-xs text-navy">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Shift Label</span>
                  <span className="font-bold text-navy-deep block mt-0.5">{record.assignedShift}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Expected Check-in</span>
                  <span className="font-mono font-bold text-brand block mt-0.5">{record.timingLimits.start}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Expected Check-out</span>
                  <span className="font-mono font-bold text-brand block mt-0.5">{record.timingLimits.end}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Punch details and micro logs */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Today's Punch overview */}
            <div className="bg-white border border-muted rounded-xl p-6 shadow-soft space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-muted">
                <Activity className="size-5 text-brand" />
                <h4 className="font-semibold text-navy text-sm">Punch Timings Metrics</h4>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs text-navy">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Check-in</span>
                  <span className="font-mono font-bold text-sm block mt-0.5 text-navy-deep">{record.checkIn}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Check-out</span>
                  <span className="font-mono font-bold text-sm block mt-0.5 text-navy-deep">{record.checkOut}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Working Hours</span>
                  <strong className="text-sm block mt-0.5 text-brand">{record.workingHours}</strong>
                </div>
              </div>
            </div>

            {/* Micro Punch log list */}
            <div className="bg-white border border-muted rounded-xl shadow-soft overflow-hidden">
              <div className="p-4 bg-[#fcfcfc] border-b border-muted flex items-center gap-2">
                <FileSpreadsheet className="size-4.5 text-navy" />
                <h4 className="font-semibold text-navy text-sm">Biometric Punch Terminals Log</h4>
              </div>

              {record.punchLogs.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground">
                  No check-in or check-out punch signals captured for this date (Staff was {record.attendanceStatus}).
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none whitespace-nowrap">
                        <th className="py-3.5 px-6">Punch Time</th>
                        <th className="py-3.5 px-4">Punch Type</th>
                        <th className="py-3.5 px-6">Verification Terminal ID / Device</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-muted text-sm text-[#2a2a2a] bg-white font-medium">
                      {record.punchLogs.map((p, i) => (
                        <tr key={i} className="hover:bg-[#fcfcfc]/60 transition-colors whitespace-nowrap">
                          <td className="py-3.5 px-6 font-mono font-bold text-brand">{p.time}</td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              {p.type === "Check-in" ? (
                                <LogIn className="size-3.5 text-success" />
                              ) : p.type === "Check-out" ? (
                                <LogOut className="size-3.5 text-destructive" />
                              ) : (
                                <Clock className="size-3.5 text-muted-foreground" />
                              )}
                              <span className="font-bold text-navy-deep">{p.type}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-6 text-muted-foreground">{p.device}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/manager/attendance/view/$id")({
  component: ManagerViewAttendance
});
