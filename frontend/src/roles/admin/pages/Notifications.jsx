import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { HorizontalRouteTabs, Panel, Tag, Notice } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utils";
import {
  UserCog,
  Activity,
  Gift,
  Bell,
  CheckCheck,
  Building
} from "lucide-react";

const managementTabs = [
  { label: "Staff Management", to: "/admin/staff", icon: UserCog },
  { label: "OTA / Channels", to: "/admin/channels", icon: Activity },
  { label: "CRM / Loyalty", to: "/admin/crm", icon: Gift },
  { label: "Notifications", to: "/admin/notifications", icon: Bell }
];

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [
      { title: "Property Alerts & Notifications — Speshway Luxury Hotel" },
      { name: "description", content: "Property-level alerts, check-in requests, OTA sync notifications." }
    ]
  }),
  component: AdminNotificationsPage
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

// Load notifications from localStorage or use defaults
const getSavedNotifications = () => {
  const saved = localStorage.getItem("hms_admin_notifications");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return initialNotifications;
    }
  }
  localStorage.setItem("hms_admin_notifications", JSON.stringify(initialNotifications));
  return initialNotifications;
};

function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState(() => getSavedNotifications());
  const [filterType, setFilterType] = useState("All"); // 'All' | 'Unread' | 'Sync' | 'Audit'

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      localStorage.setItem("hms_admin_notifications", JSON.stringify(updated));
      return updated;
    });
  };

  // Filtered dataset
  const filteredNotifications = notifications.filter((n) => {
    let matchesType = true;
    if (filterType === "Unread") {
      matchesType = !n.read;
    } else if (filterType === "Sync") {
      matchesType = n.type === "OTA Sync" || n.type === "Payment Alert";
    } else if (filterType === "Audit") {
      matchesType = n.type === "Property Audit";
    }
    return matchesType;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <HorizontalRouteTabs tabs={managementTabs} />

      {/* Advanced Filter Toolbar */}
      <div className="flex flex-col gap-3 bg-white border border-muted p-4 rounded-2xl shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Type Filter Pills */}
          <div className="flex gap-1 bg-muted/30 p-1 rounded-full border border-muted/50 select-none">
            {[
              { label: "All Alerts", key: "All" },
              { label: `Unread (${unreadCount})`, key: "Unread" },
              { label: "Channel Syncs", key: "Sync" },
              { label: "Property Audits", key: "Audit" }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterType(tab.key)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  filterType === tab.key
                    ? "bg-navy text-white shadow-sm"
                    : "text-muted-foreground hover:text-navy hover:bg-white/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllAsRead}
              className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 gap-2 cursor-pointer text-[10px] font-semibold h-8"
            >
              <CheckCheck className="size-3.5" /> Mark All as Read
            </Button>
          )}
        </div>
      </div>

      {/* Main Alerts Panel */}
      <Panel title="Property Alerts Log" description={`Displaying ${filteredNotifications.length} notifications scoped to Speshway Luxury Hotel`}>
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground p-6">
            No alerts found matching active filters.
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredNotifications.map((n) => (
              <Link
                key={n.id}
                to="/admin/notifications/$id"
                params={{ id: n.id }}
                className={cn(
                  "bg-white rounded-xl border border-muted p-4 shadow-soft hover:shadow-lift transition-all duration-300 flex flex-col md:flex-row md:items-start justify-between gap-4 relative cursor-pointer text-left block hover:no-underline",
                  !n.read && "border-purple/35 bg-purple/[0.005] shadow-[0_2px_12px_rgba(168,85,247,0.02)]"
                )}
              >
                {/* Left Side: Unread dot + Title/Msg */}
                <div className="flex items-start gap-3 flex-1 min-w-0 text-left">
                  {/* Unread indicator dot */}
                  <span className={cn("size-2 rounded-full mt-1.5 shrink-0", n.read ? "bg-transparent" : "bg-purple animate-pulse")} />
                  
                  <div className="flex-1 min-w-0 space-y-1 text-left">
                    <div className="flex flex-wrap items-center gap-2 text-left">
                      <h4 className={cn("text-xs font-semibold text-navy truncate text-left", !n.read && "font-bold text-navy-deep")}>
                        {n.title}
                      </h4>
                      <Tag tone={getToneForType(n.type)}>{n.type}</Tag>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed text-left">{n.message}</p>
                  </div>
                </div>

                {/* Right Side: Property, Time */}
                <div className="flex flex-row md:flex-col items-center md:items-end gap-3 md:gap-1.5 shrink-0 md:pt-0.5 self-start md:self-auto justify-start md:justify-end w-full md:w-auto text-left md:text-right">
                  <div className="flex items-center gap-1.5 text-navy font-semibold text-[10px] bg-muted/40 px-2.5 py-1 rounded-full shrink-0">
                    <Building className="size-3 text-purple shrink-0" />
                    <span>{n.propertyName}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{n.timestamp}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}