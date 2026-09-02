import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Panel, Notice, LoadingRows } from "@/components/hs/kit";
import { managerService } from "@/services/manager";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { toast } from "sonner";

function ManagerEditStaff() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dept, setDept] = useState("Front Office");
  const [shift, setShift] = useState("Morning Shift");

  useEffect(() => {
    const loadStaffMember = async () => {
      setLoading(true);
      setError(null);
      try {
        const decodedId = atob(id);
        const res = await managerService.getStaff();
        if (res.success) {
          const match = res.data.find(u => u._id === decodedId || u.id === decodedId);
          if (match) {
            setName(match.name || "");
            setEmail(match.email || "");
            setPhone(match.mobile === "—" ? "" : (match.mobile || ""));
            setDept(match.dept || "Front Office");
            setShift(match.shift || "Morning Shift");
          } else {
            setError("Employee not found.");
          }
        } else {
          setError(res.message || "Failed to load staff roster.");
        }
      } catch (err) {
        setError(err.message || "Failed to load employee profile.");
      } finally {
        setLoading(false);
      }
    };
    if (id) loadStaffMember();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const decodedId = atob(id);
      const payload = {
        name,
        mobile: phone,
        dept,
        shift
      };
      const res = await managerService.updateStaff(decodedId, payload);
      if (res.success) {
        toast.success("Staff profile updated successfully.");
        navigate({ to: "/manager/shifts" });
      } else {
        toast.error(res.message || "Failed to update staff profile.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update staff profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in">

      {error && <Notice tone="error" title="Synchronization Error">{error}</Notice>}

      <div className="max-w-xl">
        <Panel title="Edit Profile Details" description="Update profile configuration.">
          {loading ? (
            <div className="p-6 bg-white rounded-b-xl">
              <LoadingRows rows={4} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white rounded-b-xl">
              <FormField label="Full Name" required id="name">
                <Input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                  className="text-xs font-semibold text-navy bg-cream/5 border-muted h-9"
                />
              </FormField>

              <FormField label="Email Address (Read-only)" id="email">
                <Input
                  id="email"
                  type="email"
                  disabled
                  value={email}
                  className="text-xs font-semibold text-navy bg-muted/40 border-muted h-9 cursor-not-allowed select-none"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Contact Number" id="phone">
                  <Input
                    id="phone"
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 99999 88888"
                    className="text-xs font-semibold text-navy bg-cream/5 border-muted h-9"
                  />
                </FormField>
                <FormField label="Department" id="dept">
                  <Select
                    id="dept"
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                    className="text-xs font-semibold text-navy bg-[#FDFCFA]/20 border-muted h-9"
                  >
                    <option value="Front Office">Front Office</option>
                    <option value="Front Desk">Front Desk</option>
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Security">Security</option>
                  </Select>
                </FormField>
              </div>

              <FormField label="Preferred Shift Assignment" id="shift">
                <Select
                  id="shift"
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                  className="text-xs font-semibold text-navy bg-[#FDFCFA]/20 border-muted h-9"
                >
                  <option value="Morning Shift">Morning Shift (06:00 AM - 02:00 PM)</option>
                  <option value="Afternoon Shift">Afternoon Shift (02:00 PM - 10:00 PM)</option>
                  <option value="Night Shift">Night Shift (10:00 PM - 06:00 AM)</option>
                  <option value="General Shift">General Shift (09:00 AM - 05:00 PM)</option>
                </Select>
              </FormField>

              <div className="pt-4 flex justify-end gap-2 border-t border-muted/30">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate({ to: "/manager/shifts" })}
                  className="h-9 px-4 text-xs font-bold rounded-md"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-navy hover:bg-navy-deep text-white font-bold h-9 px-5 rounded-md cursor-pointer"
                >
                  {saving ? "Saving Changes..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </Panel>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/manager/staff/edit/$id")({
  component: ManagerEditStaff
});
