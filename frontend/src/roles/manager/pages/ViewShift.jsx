import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Tag, Notice, LoadingRows, Crumbs } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { managerService } from "@/services/manager";
import { authService } from "@/services/auth";
import {
  Clock,
  Users,
  Eye,
  BookOpen,
  Briefcase
} from "lucide-react";

const SHIFT_TIMINGS = {
  "Morning Shift": "06:00 AM - 02:00 PM",
  "Afternoon Shift": "02:00 PM - 10:00 PM",
  "Night Shift": "10:00 PM - 06:00 AM",
  "General Shift": "09:00 AM - 05:00 PM"
};

const SHIFT_DESCRIPTIONS = {
  "Morning Shift": "Covers early checkout rushes, lobby operations reconciliation, lobby preparation, and front desk check-in handovers. Primary operational duties revolve around checklist verification and guest checkout folios settlements.",
  "Afternoon Shift": "Manages peak arrival slots (13:00 - 16:00), guest requests queues, room moves assignments, Aadhaar OCR uploads, and shift transitions. Focus is on speed of lobby reception check-in.",
  "Night Shift": "Responsible for night audit runs, property security check-ins, early-morning departures checklist preparation, and GDS channel confirmations audit. Keeps PMS ledger synchronized offline.",
  "General Shift": "Management operations shift, corporate contracts reconciliations, vendor reports validation, GM briefs briefings, and platform-level configurations support."
};

function ManagerViewShift() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shiftName, setShiftName] = useState("");
  const [assignedPersonnel, setAssignedPersonnel] = useState([]);
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

    const loadShiftDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const decodedShift = atob(id);
        setShiftName(decodedShift);

        const [staffRes, shiftsRes] = await Promise.all([
          managerService.getStaff(),
          managerService.getShifts()
        ]);
        
        const realUsers = staffRes.success && staffRes.data ? staffRes.data : [];
        const realShifts = shiftsRes.success && shiftsRes.data ? shiftsRes.data : [];

        // Map assigned personnel for this shift
        const filtered = realUsers.map((st, idx) => {
          const sid = st._id || st.id;
          const employeeId = `EMP-${(user.propertyId || "JAI").substring(3)}-10${idx + 1}`;
          const department = "Front Office";
          
          const matchedShiftObj = realShifts.find(sh => sh.userId === sid);
          const assignedShift = matchedShiftObj ? matchedShiftObj.shiftType : (idx % 2 === 0 ? "Morning Shift" : "Afternoon Shift");

          return {
            ...st,
            employeeId,
            department,
            assignedShift,
            status: st.status || "Active"
          };
        }).filter(st => st.assignedShift === decodedShift);

        setAssignedPersonnel(filtered);

      } catch (err) {
        setError(err.message || "Failed to load shift details.");
      } finally {
        setLoading(false);
      }
    };

    if (id) loadShiftDetails();
  }, [id]);

  if (!isAuthorized) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Access Denied" subtitle="Security and privilege validation." />
        <Notice tone="error" title="Unauthorized Access">
          You are not authorized to view shift logs for this property branch. Access is strictly scoped.
        </Notice>
      </div>
    );
  }

  const timing = SHIFT_TIMINGS[shiftName] || "—";
  const description = SHIFT_DESCRIPTIONS[shiftName] || "Operational duties schedule.";

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <Crumbs
        items={[
          { label: "Staff & Shifts", to: "/manager/shifts" },
          { label: shiftName ? `${shiftName} Details` : "Shift Details" }
        ]}
      />

      <PageHeader
        title={shiftName ? `${shiftName} Details` : "Shift Details"}
        subtitle="Timings overview, assigned duties parameters, and rostered active personnel."
      />

      {error && <Notice tone="error" title="Shift Roster Sync Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={4} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
          
          {/* Shift Schedule Timing Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-muted">
                <Clock className="size-4.5 text-brand" />
                <h4 className="font-semibold text-navy text-sm">Schedule Parameter</h4>
              </div>
              <div className="space-y-3.5 text-xs text-navy">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Shift Name</span>
                  <p className="font-bold text-navy-deep mt-0.5">{shiftName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Work Timings</span>
                  <p className="font-mono text-brand font-bold text-sm mt-0.5">{timing}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Rostered Headcount</span>
                  <p className="font-bold text-navy mt-0.5">{assignedPersonnel.length} personnel active</p>
                </div>
              </div>
            </div>

            {/* Shift duties description card */}
            <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-muted">
                <BookOpen className="size-4.5 text-purple" />
                <h4 className="font-semibold text-navy text-sm">Operational Protocol</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          </div>

          {/* Assigned active personnel table card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-muted rounded-xl shadow-soft overflow-hidden">
              <div className="p-4 bg-[#fcfcfc] border-b border-muted flex items-center gap-2">
                <Users className="size-4.5 text-navy" />
                <h4 className="font-semibold text-navy text-sm">Active Personnel Rostered</h4>
              </div>
              
              {assignedPersonnel.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground">
                  No staff members currently assigned to this shift.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none whitespace-nowrap">
                        <th className="py-3.5 px-6">Name</th>
                        <th className="py-3.5 px-4">Employee ID</th>
                        <th className="py-3.5 px-4">Role</th>
                        <th className="py-3.5 px-4">Department</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                        <th className="py-3.5 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-muted text-sm text-[#2a2a2a] bg-white font-medium">
                      {assignedPersonnel.map((s) => {
                        const targetId = s._id || s.id;
                        return (
                          <tr key={targetId} className="hover:bg-[#fcfcfc]/60 transition-colors whitespace-nowrap">
                            <td className="py-3.5 px-6 font-bold text-navy-deep">
                              <div>{s.name}</div>
                              <div className="text-[10px] font-normal text-muted-foreground mt-0.5">{s.email}</div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">{s.employeeId}</td>
                            <td className="py-3.5 px-4 capitalize">
                              <Tag tone="brand" className="text-[10px]">{s.role}</Tag>
                            </td>
                            <td className="py-3.5 px-4">{s.department}</td>
                            <td className="py-3.5 px-4 text-center">
                              <Tag tone={s.status === "Active" ? "success" : "warning"}>
                                {s.status}
                              </Tag>
                            </td>
                            <td className="py-3.5 px-6 text-right">
                              <Button
                                onClick={() => navigate({ to: `/manager/staff/view/${btoa(targetId)}` })}
                                size="icon"
                                variant="ghost"
                                className="size-7 hover:text-brand cursor-pointer"
                                title="View Staff Details"
                              >
                                <Eye className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/manager/shifts/view/$id")({
  component: ManagerViewShift
});
