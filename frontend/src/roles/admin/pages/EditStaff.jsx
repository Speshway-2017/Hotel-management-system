import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { toast } from "sonner";

import { managerService } from "@/services/manager";

function EditStaff() {
  const params = useParams() || {};
  const id = params.id || (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : "");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("receptionist");
  const [status, setStatus] = useState("Active");
  const [dept, setDept] = useState("Front Desk");
  const [shift, setShift] = useState("Morning (06:00 - 14:00)");

  useEffect(() => {
    const loadStaffMember = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const [superRes, mgrRes] = await Promise.all([
          superAdminService.getUsers().catch(() => ({ success: false })),
          managerService.getStaff().catch(() => ({ success: false }))
        ]);

        let allStaff = [];
        if (superRes.success && Array.isArray(superRes.data)) allStaff.push(...superRes.data);
        if (mgrRes.success && Array.isArray(mgrRes.data)) allStaff.push(...mgrRes.data);

        const match = allStaff.find(u => 
          String(u._id) === String(id) || 
          String(u.id) === String(id) || 
          String(u.email).toLowerCase() === String(id).toLowerCase()
        );

        if (match) {
          setName(match.name || "");
          setEmail(match.email || "");
          setPhone(match.mobile === "—" ? "" : (match.mobile || match.phone || ""));
          setRole(match.role || "receptionist");
          setStatus(match.status || "Active");
          setDept(match.dept || match.department || "Front Desk");
          setShift(match.shift || "Morning (06:00 - 14:00)");
        } else {
          setError("Employee not found.");
        }
      } catch (err) {
        setError(err.message || "Failed to load employee profile.");
      } finally {
        setLoading(false);
      }
    };
    loadStaffMember();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        role,
        mobile: phone,
        status,
        dept,
        shift
      };
      const res = await superAdminService.updateUser(id, payload);
      if (res.success) {
        toast.success("Staff profile updated successfully.");
        navigate({ to: "/admin/staff" });
      }
    } catch (err) {
      toast.error(err.message || "Failed to update staff profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title={name ? `Modify Staff: ${name}` : "Modify Staff Details"}
        subtitle="Update employee designations, permission roles, and account statuses."
      />

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
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Email Address (Read-only)" id="email">
                  <Input
                    id="email"
                    type="email"
                    disabled
                    value={email}
                  />
                </FormField>
                <FormField label="Phone Number" required id="phone">
                  <Input
                    id="phone"
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Role Permission" id="role">
                  <Select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="receptionist">Receptionist</option>
                    <option value="manager">Manager</option>
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                  </Select>
                </FormField>
                <FormField label="Status" id="status">
                  <Select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </Select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Department" id="dept">
                  <Select
                    id="dept"
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                  >
                    <option value="Front Desk">Front Desk</option>
                    <option value="Management">Management</option>
                    <option value="Operations">Operations</option>
                  </Select>
                </FormField>
                <FormField label="Shift Assignment" id="shift">
                  <Select
                    id="shift"
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                  >
                    <option value="Morning (06:00 - 14:00)">Morning (06:00 - 14:00)</option>
                    <option value="Evening (14:00 - 22:00)">Evening (14:00 - 22:00)</option>
                    <option value="Night (22:00 - 06:00)">Night (22:00 - 06:00)</option>
                    <option value="General (09:00 - 17:00)">General (09:00 - 17:00)</option>
                  </Select>
                </FormField>
              </div>

              <div className="pt-4 border-t border-muted flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate({ to: "/admin/staff" })}
                  className="h-10 px-4"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="bg-navy hover:bg-navy/90 text-white h-10 px-6 font-bold shadow-soft rounded-full">
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          )}
        </Panel>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin/staff/edit/$id")({
  component: EditStaff
});
