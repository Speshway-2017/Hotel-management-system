import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Panel, Tag, Notice } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { useParams, useNavigate } from "react-router-dom";
import {
  Building,
  ArrowLeft,
  Calendar,
  CheckCircle2
} from "lucide-react";
import { authService } from "@/services/auth";

export const Route = createFileRoute("/manager/notifications/$id")({
  head: () => ({
    meta: [
      { title: "Alert Details — Hour Stay" },
      { name: "description", content: "Platform alerts, check-in requests, OTA sync notifications." }
    ]
  }),
  component: ManagerNotificationDetailsPage
});

function getToneForType(type) {
  switch (type) {
    case "New Reservation":
    case "Payment Alert":
      return "success";
    case "Pending Approval":
    case "Maintenance Alert":
    case "Service Request":
      return "warning";
    case "Guest Complaint":
    case "Overbooking Alert":
      return "error";
    default:
      return "brand";
  }
}

function ManagerNotificationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ntf, setNtf] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) return;
    const cacheKey = `hms_manager_notifications_${user.propertyId}`;

    const saved = localStorage.getItem(cacheKey);
    let list = [];
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse manager notifications cache");
      }
    }

    const item = list.find((n) => n.id === id);
    if (item) {
      if (!item.read) {
        item.read = true;
        localStorage.setItem(cacheKey, JSON.stringify(list));
      }
      setNtf(item);
    } else {
      setError(`Notification with ID ${id} not found.`);
    }
  }, [id]);

  if (error) {
    return (
      <div className="space-y-6 text-left animate-fade-in">
        <Notice tone="error" title="Record Not Found">
          {error}
        </Notice>
      </div>
    );
  }

  if (!ntf) {
    return (
      <div className="text-center py-24 text-muted-foreground font-semibold animate-pulse">
        Loading event diagnostic details...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="max-w-3xl">
        <Panel title="Diagnostic Report Overview" description={`Incident ID: ${ntf.id}`}>
          <div className="p-6 space-y-6 text-xs text-navy leading-relaxed">
            {/* Header Block inside Panel */}
            <div className="bg-muted/20 p-5 rounded-2xl border border-muted/50 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Severity Type</span>
                  <Tag tone={getToneForType(ntf.type)}>{ntf.type}</Tag>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Status</span>
                  <div className="flex items-center gap-1.5 font-semibold text-success">
                    <CheckCircle2 className="size-4" />
                    <span>Acknowledged & Read</span>
                  </div>
                </div>
              </div>

              <h3 className="text-base font-bold text-navy-deep pt-1">{ntf.title}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[11px] text-muted-foreground font-medium border-t border-muted/30">
                <div className="flex items-center gap-2">
                  <Building className="size-4 text-purple" />
                  <span>Property Scope: <strong className="text-navy">{ntf.propertyName}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-purple" />
                  <span>Reported Time: <strong className="text-navy">{ntf.timestamp}</strong></span>
                </div>
              </div>
            </div>

            {/* Diagnostic Summary */}
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Diagnostic Summary</h4>
              <p className="font-ui text-navy text-xs leading-relaxed bg-cream/15 p-4 rounded-xl border border-navy/5">
                {ntf.message}
              </p>
            </div>

            {/* Complete Trace details */}
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Detailed Logs & Recommended Actions</h4>
              <div className="bg-navy-deep/[0.02] border border-muted p-4 rounded-xl space-y-3">
                <p className="font-ui text-navy-deep text-xs leading-relaxed">
                  {ntf.body}
                </p>
              </div>
            </div>

          </div>
        </Panel>
      </div>
    </div>
  );
}
