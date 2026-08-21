import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";

function ViewAdmin() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    const loadAdminDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const [usersRes, propertiesRes] = await Promise.all([
          superAdminService.getUsers(),
          superAdminService.getProperties()
        ]);

        if (propertiesRes.success) {
          setProperties(propertiesRes.data);
        }

        if (usersRes.success) {
          const matched = usersRes.data.find(u => u.id === id || u._id === id);
          if (matched) {
            setAdmin(matched);
          } else {
            setError("Administrator not found.");
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load administrator details.");
      } finally {
        setLoading(false);
      }
    };
    if (id) loadAdminDetails();
  }, [id]);

  const getPropertyName = (pId) => {
    if (!pId) return "Unassigned Property";
    const prop = properties.find(p => p.id === pId || p._id === pId);
    return prop ? prop.name : "Unassigned Property";
  };

  const getPropertyLocation = (pId) => {
    if (!pId) return "—";
    const prop = properties.find(p => p.id === pId || p._id === pId);
    return prop ? prop.city : "—";
  };

  const statusTone = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "active") return "success";
    if (s === "suspended" || s === "inactive") return "error";
    return "neutral";
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title={admin ? `Admin: ${admin.name}` : "Admin Profile Overview"}
        subtitle="Operational parameters, user logs, status indexes, and hotel permissions."
      />

      {error && <Notice tone="error" title="Synchronization Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={3} />
      ) : admin ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
          <Panel title="Administrator Identity Details" description="Verified profile credentials.">
            <div className="p-5 bg-white rounded-b-xl space-y-4 text-xs text-navy">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Administrator Name</span>
                <p className="font-bold text-sm mt-0.5">{admin.name}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Email Address</span>
                <p className="font-semibold mt-0.5 text-muted-foreground">{admin.email}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Contact Mobile</span>
                <p className="font-semibold font-mono mt-0.5">{admin.mobile || "—"}</p>
              </div>
            </div>
          </Panel>

          <Panel title="Access Bounds & Scope" description="System configurations and metrics.">
            <div className="p-5 bg-white rounded-b-xl space-y-4 text-xs text-navy">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Assigned Hotel Property</span>
                <p className="font-bold mt-0.5 text-purple">{getPropertyName(admin.propertyId)}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase font-semibold">Hotel Location</span>
                <p className="font-semibold mt-0.5">{getPropertyLocation(admin.propertyId)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Last Active Login</span>
                  <p className="font-semibold font-mono mt-0.5">{admin.lastLogin || "14 Aug 2026, 11:20 AM"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Account Status</span>
                  <div className="mt-1">
                    <Tag tone={statusTone(admin.status || "Active")}>{admin.status || "Active"}</Tag>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/super-admin/admins/view/$id")({
  component: ViewAdmin
});
