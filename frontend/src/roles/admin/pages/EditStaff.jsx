import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { PageHeader, Panel, Notice, LoadingRows } from "@/components/hs/kit";
import { adminService } from "@/services/admin";
import { managerService } from "@/services/manager";
import { apiClient } from "@/services/apiClient";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { toast } from "sonner";
import { emitRealtimeEvent } from "@/services/socket";

function EditStaff() {
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

  // Form States (pre-filled from stateMember if available)
  const [name, setName] = useState(stateMember?.name || stateMember?.fullName || stateMember?.username || "");
  const [email, setEmail] = useState(stateMember?.email || stateMember?.userEmail || "");
  const [phone, setPhone] = useState(
    (stateMember?.mobile === "—" || stateMember?.mobile === "-" || !stateMember?.mobile)
      ? (stateMember?.phone || stateMember?.phoneNumber || "")
      : stateMember?.mobile
  );
  const [role, setRole] = useState(
    stateMember?.role ? String(stateMember.role).toLowerCase() : "receptionist"
  );
  const [status, setStatus] = useState(
    stateMember?.status || (stateMember?.isActive === false ? "Inactive" : "Active")
  );
  const [dept, setDept] = useState(
    stateMember?.dept || stateMember?.department || "Front Desk"
  );
  const [shift, setShift] = useState(
    stateMember?.shift || stateMember?.shiftTiming || "Morning (06:00 - 14:00)"
  );

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

    // Normalize role to lowercase for Select element
    let memberRole = String(match.role || match.roleName || match.userRole || "receptionist").trim().toLowerCase();
    if (memberRole.includes("rec") || memberRole.includes("desk") || memberRole.includes("front") || memberRole.includes("staff")) {
      memberRole = "receptionist";
    } else if (memberRole.includes("man")) {
      memberRole = "manager";
    } else if (memberRole.includes("adm")) {
      memberRole = "admin";
    } else if (memberRole.includes("op")) {
      memberRole = "operator";
    }

    // Normalize status
    const rawStatus = String(match.status || (match.isActive === false ? "Inactive" : "Active")).trim().toLowerCase();
    const memberStatus = (rawStatus.startsWith("inact") || rawStatus === "false" || rawStatus === "disabled") ? "Inactive" : "Active";

    // Normalize Department
    let memberDept = match.dept || match.department || match.division || "Front Desk";
    
    // Normalize Shift
    let memberShift = match.shift || match.shiftTiming || match.preferredShift || "Morning (06:00 - 14:00)";

    setName(memberName);
    setEmail(memberEmail);
    setPhone(memberPhone);
    setRole(memberRole);
    setStatus(memberStatus);
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

        // 1. Direct fetch via adminService.getStaffMember
        try {
          const singleRes = await adminService.getStaffMember(searchKey);
          const candidate = singleRes?.data?.data || singleRes?.data || singleRes?.user || singleRes;
          if (candidate && (candidate.name || candidate.email || candidate._id || candidate.id)) {
            match = candidate;
          }
        } catch (e) {
          // Attempt using initialId if different from resolvedId
          if (initialId && initialId !== searchKey) {
            try {
              const altRes = await adminService.getStaffMember(initialId);
              const candidate = altRes?.data?.data || altRes?.data || altRes?.user || altRes;
              if (candidate && (candidate.name || candidate.email || candidate._id || candidate.id)) {
                match = candidate;
              }
            } catch {}
          }
        }

        // 2. Direct directory list lookup via adminService.getStaff
        if (!match) {
          try {
            const listRes = await adminService.getStaff();
            const list = Array.isArray(listRes) 
              ? listRes 
              : (Array.isArray(listRes?.data) 
                  ? listRes.data 
                  : (Array.isArray(listRes?.data?.data) ? listRes.data.data : []));
            
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

        // 3. Fallback to manager staff service
        if (!match) {
          try {
            const mgrRes = await managerService.getStaffMember(searchKey);
            const candidate = mgrRes?.data?.data || mgrRes?.data || mgrRes?.user || mgrRes;
            if (candidate && (candidate.name || candidate.email || candidate._id || candidate.id)) {
              match = candidate;
            }
          } catch {}
        }

        // 4. Fallback to manager directory list
        if (!match) {
          try {
            const mgrListRes = await managerService.getStaff();
            const list = Array.isArray(mgrListRes) ? mgrListRes : (mgrListRes?.data || []);
            const cleanResolved = String(searchKey).toLowerCase().trim();
            match = list.find(u => 
              String(u._id || '').toLowerCase() === cleanResolved || 
              String(u.id || '').toLowerCase() === cleanResolved || 
              String(u.email || '').toLowerCase() === cleanResolved
            );
          } catch {}
        }

        // 5. Direct Users API lookup fallback
        if (!match) {
          try {
            const userRes = await apiClient.get(`/admin/users/${searchKey}`);
            const candidate = userRes?.data?.data || userRes?.data || userRes?.user || userRes;
            if (candidate && (candidate.name || candidate.email || candidate._id || candidate.id)) {
              match = candidate;
            }
          } catch {}
        }

        if (match && isMounted) {
          populateFromObject(match);
        } else if (stateMember && isMounted) {
          populateFromObject(stateMember);
        } else if (isMounted) {
          setError("Staff member not found.");
        }
      } catch (err) {
        if (stateMember && isMounted) {
          populateFromObject(stateMember);
        } else if (isMounted) {
          setError(err.message || "Failed to load staff profile.");
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
      toast.error("Staff identifier not found.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        _id: effectiveId,
        id: effectiveId,
        email: email ? email.trim() : undefined,
        name: name.trim(),
        role,
        mobile: phone.trim(),
        status,
        dept,
        shift
      };
      
      const res = await adminService.updateStaff(effectiveId, payload);

      if (res && (res.success || res.status === 200 || res.data)) {
        toast.success("Staff profile updated successfully.");
        emitRealtimeEvent('dashboard_sync', { action: 'staff_updated', id: effectiveId });
        navigate({ to: "/admin/staff" });
      } else {
        toast.error(res?.message || "Failed to update staff profile.");
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err.message || "Failed to update staff profile.";
      if (err?.response?.status === 404 || errMsg.toLowerCase().includes("not found")) {
        toast.error("Staff not found");
        setError("Staff not found");
      } else {
        toast.error(errMsg);
      }
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
                  placeholder="Enter employee full name"
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
                    placeholder="+91 98765 43210"
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
                    {role && !["receptionist", "manager", "operator", "admin"].includes(role) && (
                      <option value={role}>{role}</option>
                    )}
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
                    {dept && !["Front Desk", "Management", "Operations", "Front Office", "Reception Desk", "Housekeeping", "Food & Beverage", "Security"].includes(dept) && (
                      <option value={dept}>{dept}</option>
                    )}
                    <option value="Front Desk">Front Desk</option>
                    <option value="Management">Management</option>
                    <option value="Operations">Operations</option>
                    <option value="Front Office">Front Office</option>
                    <option value="Reception Desk">Reception Desk</option>
                    <option value="Housekeeping">Housekeeping</option>
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Security">Security</option>
                  </Select>
                </FormField>
                <FormField label="Shift Assignment" id="shift">
                  <Select
                    id="shift"
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                  >
                    {shift && !["Morning (06:00 - 14:00)", "Evening (14:00 - 22:00)", "Night (22:00 - 06:00)", "General (09:00 - 17:00)", "Morning Shift", "Afternoon Shift", "Night Shift", "General Shift"].includes(shift) && (
                      <option value={shift}>{shift}</option>
                    )}
                    <option value="Morning (06:00 - 14:00)">Morning (06:00 - 14:00)</option>
                    <option value="Evening (14:00 - 22:00)">Evening (14:00 - 22:00)</option>
                    <option value="Night (22:00 - 06:00)">Night (22:00 - 06:00)</option>
                    <option value="General (09:00 - 17:00)">General (09:00 - 17:00)</option>
                    <option value="Morning Shift">Morning Shift</option>
                    <option value="Afternoon Shift">Afternoon Shift</option>
                    <option value="Night Shift">Night Shift</option>
                    <option value="General Shift">General Shift</option>
                  </Select>
                </FormField>
              </div>

              <div className="pt-4 border-t border-muted flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate({ to: "/admin/staff" })}
                  className="h-10 px-4 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="bg-navy hover:bg-navy/90 text-white h-10 px-6 font-bold shadow-soft rounded-full cursor-pointer">
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
