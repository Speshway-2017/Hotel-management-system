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

export const Route = createFileRoute("/admin/notifications/$id")({
  head: () => ({
    meta: [
      { title: "Alert Diagnostic Details — Speshway Luxury Hotel" },
      { name: "description", content: "Platform alerts, check-in requests, OTA sync notifications." }
    ]
  }),
  component: AdminNotificationDetailsPage
});

// Mock Initial Notifications Dataset Scoped to Speshway Luxury Hotel (Property ID: HS-JAI)
const initialNotifications = [
  {
    id: "NTF-101",
    title: "OTA Parity Sync Warning",
    message: "Booking.com connection returned timeout error during room availability sync for Suite rooms.",
    type: "OTA Sync",
    propertyId: "HS-JAI",
    propertyName: "Speshway Luxury Hotel",
    timestamp: "10 mins ago",
    read: false,
    body: "The OTA connection channel manager reported a parity discrepancy for Speshway Luxury Hotel Standard Room pricing between Agoda and Booking.com. Automated sync was retried 3 times and timed out. Action required to verify rate parity settings manually."
  },
  {
    id: "NTF-102",
    title: "Security Alert: Unauthorized Console login",
    message: "Multiple failed login attempts detected on admin dashboard from IP 192.168.1.105.",
    type: "Security Warning",
    propertyId: "HS-JAI",
    propertyName: "Speshway Luxury Hotel",
    timestamp: "2 hours ago",
    read: false,
    body: "Security systems logged 5 consecutive failed authorization requests for GM account on Speshway Luxury Hotel dashboard panel. Device fingerprint: Chrome on Linux. Recommended actions: Trigger password reset or IP access check."
  },
  {
    id: "NTF-103",
    title: "Overbooking Check-in Alert",
    message: "Overbooking conflict detected for Maharaja Suite Room 302 on August 18.",
    type: "Property Audit",
    propertyId: "HS-JAI",
    propertyName: "Speshway Luxury Hotel",
    timestamp: "4 hours ago",
    read: true,
    body: "The reservation engine flagged overlapping Confirmed bookings for Room 302 (Karan Malhotra & Vikram Gokhale) check-ins. Please reassign the waitlist guest to prevent double occupancy disputes."
  },
  {
    id: "NTF-104",
    title: "Razorpay Webhook Latency",
    message: "UPI transaction captured successfully but ledger webhook response delayed by 7 seconds.",
    type: "Payment Alert",
    propertyId: "HS-JAI",
    propertyName: "Speshway Luxury Hotel",
    timestamp: "1 day ago",
    read: true,
    body: "Transaction capture hook FOL-9022 returned 502 Bad Gateway response. Payment confirmed on Razorpay Dashboard. Folio outstanding balance manually cleared to 0."
  }
];

function getToneForType(type) {
  switch (type) {
    case "OTA Sync":
    case "Payment Alert":
      return "warning";
    case "Property Audit":
      return "success";
    case "Security Warning":
      return "error";
    default:
      return "brand";
  }
}

function AdminNotificationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ntf, setNtf] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("hms_admin_notifications");
    let list = initialNotifications;
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch (e) {
        // Fallback to initial
      }
    } else {
      localStorage.setItem("hms_admin_notifications", JSON.stringify(initialNotifications));
    }

    const item = list.find((n) => n.id === id);
    if (item) {
      if (!item.read) {
        item.read = true;
        localStorage.setItem("hms_admin_notifications", JSON.stringify(list));
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
