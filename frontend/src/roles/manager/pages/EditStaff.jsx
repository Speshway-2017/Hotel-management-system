import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Panel, Notice, LoadingRows, Crumbs } from "@/components/hs/kit";
import { managerService } from "@/services/manager";
import { adminService } from "@/services/admin";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { toast } from "sonner";
import { emitRealtimeEvent } from "@/services/socket";

function ManagerEditStaff() {
  const params = useParams() || {};
  const location = useLocation();
  const navigate = useNavigate();

  // Multi-source ID extraction & Base64 decoding support
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const pathParts = pathname.split('/').filter(Boolean);
  const fallbackId = pathParts.length > 0 ? pathParts[pathParts.length - 1] : "";
  const rawId = params.id || params.staffId || searchParams.get('id') || searchParams.get('staffId') || fallbackId;
  const initialId = rawId ? decodeURIComponent(String(rawId)).trim() : "";

  let resolvedId = initialId;
  try {
    if (initialId && initialId.length % 4 === 0 && !initialId.includes('-') && !initialId.includes(' ') && /^[A-Za-z0-9+/=]+$/.test(initialId)) {
      const decoded = atob(initialId);
      if (decoded && (decoded.includes('-') || decoded.length === 24 || decoded.includes('@') || decoded.startsWith('USR') || decoded.startsWith('STAFF') || decoded.startsWith('HS-'))) {
        resolvedId = decoded;
      }
    }
  } catch (e) {
    resolvedId = initialId;
  }

  // Pre-seed from navigation state if available
  const stateMember = location?.state?.member || location?.state?.staff || null;

  const [targetId, setTargetId] = useState(stateMember?._id || stateMember?.id || resolvedId || initialId);
  const [loading, setLoading] = useState(!stateMember);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  // Form States
  const [name, setName] = useState(stateMember?.name || stateMember?.fullName || stateMember?.username || "");
  const [email, setEmail] = useState(stateMember?.email || stateMember?.userEmail || "");
  const [phone, setPhone] = useState(
    (stateMember?.mobile === "—" || stateMember?.mobile === "-" || !stateMember?.mobile)
      ? (stateMember?.phone || stateMember?.phoneNumber || "")
      : stateMember?.mobile
  );
  const [dept, setDept] = useState(stateMember?.dept || stateMember?.department || "Front Office");
  const [shift, setShift] = useState(stateMember?.shift || stateMember?.assignedShift || "Morning Shift");

  const populateFromObject = (match) => {
    if (!match) return false;
    const resolvedMemberId = match._id || match.id || targetId || resolvedId;
    setTargetId(resolvedMemberId);

    const memberName = match.name || match.fullName || match.username || match.displayName || "";
    const memberEmail = match.email || match.userEmail || "";
    let memberPhone = match.mobile || match.phone || match.phoneNumber || match.contact || "";
    if (memberPhone === "—" || memberPhone === "-" || memberPhone === "null" || memberPhone === "undefined") {
      memberPhone = "";
    }
    const memberDept = match.dept || match.department || "Front Office";
    const memberShift = match.shift || match.assignedShift || "Morning Shift";

    setName(memberName);
    setEmail(memberEmail);
    setPhone(memberPhone);
    setDept(memberDept);
    setShift(memberShift);
    setError(null);
    return true;
  };

  useEffect(() => {
    let isMounted = true;

    const loadStaffMember = async () => {
      const searchKey = resolvedId || initialId;
      if (!searchKey && !stateMember) {
        setError("Staff identifier not provided");
        setLoading(false);
        return;
      }

      if (!stateMember) {
        setLoading(true);
      }
      setError(null);

      try {
        let match = null;

        // 1. Direct manager staff lookup
        try {
          const directRes = await managerService.getStaffMember(searchKey);
          const candidate = directRes?.data?.data || directRes?.data || directRes?.user || directRes;
          if (candidate && (candidate.name || candidate.email || candidate._id || candidate.id)) {
            match = candidate;
          }
        } catch {}

        // 2. Direct admin staff lookup
        if (!match) {
          try {
            const adminSingleRes = await adminService.getStaffMember(searchKey);
            const candidate = adminSingleRes?.data?.data || adminSingleRes?.data || adminSingleRes?.user || adminSingleRes;
            if (candidate && (candidate.name || candidate.email || candidate._id || candidate.id)) {
              match = candidate;
            }
          } catch {}
        }

        // 3. Manager directory list lookup
        if (!match) {
          try {
            const res = await managerService.getStaff();
            const list = Array.isArray(res) ? res : (res?.data || []);
            const cleanResolved = String(searchKey).toLowerCase().trim();
            const cleanInitial = String(initialId).toLowerCase().trim();
            match = list.find(u => 
              String(u._id || '').toLowerCase() === cleanResolved || 
              String(u.id || '').toLowerCase() === cleanResolved || 
              String(u.email || '').toLowerCase() === cleanResolved ||
              String(u._id || '').toLowerCase() === cleanInitial || 
              String(u.id || '').toLowerCase() === cleanInitial || 
              String(u.email || '').toLowerCase() === cleanInitial
            );
          } catch {}
        }

        // 4. Admin directory list fallback
        if (!match) {
          try {
            const adminListRes = await adminService.getStaff();
            const list = Array.isArray(adminListRes) ? adminListRes : (adminListRes?.data || []);
            const cleanResolved = String(searchKey).toLowerCase().trim();
            match = list.find(u => 
              String(u._id || '').toLowerCase() === cleanResolved || 
              String(u.id || '').toLowerCase() === cleanResolved || 
              String(u.email || '').toLowerCase() === cleanResolved
            );
          } catch {}
        }

        if (match && isMounted) {
          if (!isDirty) {
            populateFromObject(match);
          } else {
            setTargetId(match._id || match.id || targetId);
          }
        } else if (stateMember && isMounted) {
          if (!isDirty) {
            populateFromObject(stateMember);
          }
        } else if (isMounted && !stateMember) {
          setError("Employee not found.");
        }
      } catch (err) {
        if (stateMember && isMounted) {
          if (!isDirty) populateFromObject(stateMember);
        } else if (isMounted) {
          setError(err.message || "Failed to load employee profile.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadStaffMember();

    return () => {
      isMounted = false;
    };
  }, [resolvedId, initialId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const effectiveId = targetId || resolvedId || initialId;
    if (!effectiveId) {
      toast.error("Employee not found");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        _id: effectiveId,
        id: effectiveId,
        email: email ? email.trim() : undefined,
        name: name.trim(),
        mobile: phone.trim(),
        dept,
        shift
      };
      const [res] = await Promise.all([
        managerService.updateStaff(effectiveId, payload),
        managerService.assignShift(effectiveId, name.trim(), shift).catch(() => null)
      ]);
      if (res && (res.success || res.status === 200 || res.data)) {
        toast.success("Staff profile updated successfully.");
        emitRealtimeEvent('dashboard_sync', { action: 'staff_updated', id: effectiveId });
        navigate({ to: "/manager/shifts" });
      } else {
        toast.error(res?.message || "Failed to update staff profile.");
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err.message || "Failed to update staff profile.";
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in">
      <Crumbs
        items={[
          { label: "Dashboard", to: "/manager" },
          { label: "Staff & Shifts", to: "/manager/shifts" },
          { label: name ? `Edit ${name}` : "Edit Staff" }
        ]}
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
                  onChange={(e) => {
                    setName(e.target.value);
                    setIsDirty(true);
                  }}
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
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="+91 99999 88888"
                    className="text-xs font-semibold text-navy bg-cream/5 border-muted h-9"
                  />
                </FormField>
                <FormField label="Department" id="dept">
                  <Select
                    id="dept"
                    value={dept}
                    onChange={(e) => {
                      setDept(e.target.value);
                      setIsDirty(true);
                    }}
                    className="text-xs font-semibold text-navy bg-[#FDFCFA]/20 border-muted h-9"
                  >
                    {dept && !["Front Office", "Front Desk", "Housekeeping", "Food & Beverage", "Security", "Management", "Operations"].includes(dept) && (
                      <option value={dept}>{dept}</option>
                    )}
                    <option value="Front Office">Front Office</option>
                    <option value="Front Desk">Front Desk</option>
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Security">Security</option>
                    <option value="Management">Management</option>
                    <option value="Operations">Operations</option>
                  </Select>
                </FormField>
              </div>

              <FormField label="Preferred Shift Assignment" id="shift">
                <Select
                  id="shift"
                  value={shift}
                  onChange={(e) => {
                    setShift(e.target.value);
                    setIsDirty(true);
                  }}
                  className="text-xs font-semibold text-navy bg-[#FDFCFA]/20 border-muted h-9"
                >
                  {shift && !["Morning Shift", "Afternoon Shift", "Night Shift", "General Shift", "Morning (06:00 - 14:00)", "Evening (14:00 - 22:00)", "Night (22:00 - 06:00)", "General (09:00 - 17:00)"].includes(shift) && (
                    <option value={shift}>{shift}</option>
                  )}
                  <option value="Morning Shift">Morning Shift (06:00 AM - 02:00 PM)</option>
                  <option value="Afternoon Shift">Afternoon Shift (02:00 PM - 10:00 PM)</option>
                  <option value="Night Shift">Night Shift (10:00 PM - 06:00 AM)</option>
                  <option value="General Shift">General Shift (09:00 AM - 05:00 PM)</option>
                  <option value="Morning (06:00 - 14:00)">Morning (06:00 - 14:00)</option>
                  <option value="Evening (14:00 - 22:00)">Evening (14:00 - 22:00)</option>
                  <option value="Night (22:00 - 06:00)">Night (22:00 - 06:00)</option>
                  <option value="General (09:00 - 17:00)">General (09:00 - 17:00)</option>
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
