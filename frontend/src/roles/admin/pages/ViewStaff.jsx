import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Notice, LoadingRows, Crumbs } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { Briefcase, Clock, UserCheck, ThumbsUp } from "lucide-react";

function ViewStaff() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);

  useEffect(() => {
    const loadStaffMember = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await superAdminService.getUsers();
        if (res.success) {
          const match = res.data.find(u => u._id === id || u.id === id);
          if (match) {
            // Re-map or mock the custom UI properties if they aren't explicitly on schema
            setSelectedStaff({
              ...match,
              empId: match.id || match._id,
              dept: match.dept || "Front Desk",
              shift: match.shift || "Morning (06:00 - 14:00)",
              attendance: match.attendance || "96.5% Present",
              rating: match.rating || "4.8 / 5.0"
            });
          } else {
            setError("Employee profile not found.");
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load employee details.");
      } finally {
        setLoading(false);
      }
    };
    if (id) loadStaffMember();
  }, [id]);

  return (
    <div className="space-y-6 text-left">

      <PageHeader
        title={selectedStaff ? `Staff Profile: ${selectedStaff.name}` : "Staff Profile Diagnostic"}
        subtitle="Detailed shift logging, department assignment, and attendance diagnostics."
        actions={
          <Button
            onClick={() => navigate({ to: "/admin/staff" })}
            className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 h-9 font-bold text-xs cursor-pointer"
          >
            Back to Team List
          </Button>
        }
      />

      {error && <Notice tone="error" title="Synchronization Error">{error}</Notice>}

      <div className="max-w-md">
        <Panel title="Profile Assessment Summary" description="Internal employee directory records.">
          {loading ? (
            <div className="p-6 bg-white rounded-b-xl">
              <LoadingRows rows={4} />
            </div>
          ) : selectedStaff ? (
            <div className="p-5 bg-white rounded-b-xl space-y-5 text-xs text-navy font-sans">
              <div className="bg-muted/20 p-4 rounded-xl border border-muted space-y-2 flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-navy text-white font-bold text-sm select-none">
                  {selectedStaff.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-navy-deep leading-none">{selectedStaff.name}</h4>
                  <p className="text-[10px] text-muted-foreground mt-2 font-semibold">ID: {selectedStaff.empId} | Dept: {selectedStaff.dept}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Briefcase className="size-3 text-purple" /> Assigned Role
                  </span>
                  <p className="font-bold text-navy text-sm capitalize mt-1">{selectedStaff.role}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 justify-end">
                    <Clock className="size-3 text-purple" /> Assigned Shift
                  </span>
                  <p className="font-semibold text-navy text-right mt-1">{selectedStaff.shift}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <UserCheck className="size-3 text-purple" /> Attendance
                  </span>
                  <p className="font-bold text-success mt-1">{selectedStaff.attendance}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 justify-end">
                    <ThumbsUp className="size-3 text-purple" /> Performance Index
                  </span>
                  <p className="font-black text-purple text-right mt-1">{selectedStaff.rating}</p>
                </div>
              </div>

              <div className="pt-2 border-t">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Contact Email</span>
                <p className="font-semibold text-navy mt-1 pl-1">{selectedStaff.email}</p>
              </div>

              <div className="pt-4 border-t flex justify-end">
                <Button onClick={() => navigate({ to: "/admin/staff" })} className="bg-navy hover:bg-navy-deep text-white h-8 px-4 text-xs font-bold">
                  Done
                </Button>
              </div>
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin/staff/view/$id")({
  component: ViewStaff
});
