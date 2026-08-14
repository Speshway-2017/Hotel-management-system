import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utils";
import {
  Building,
  CheckCheck
} from "lucide-react";

// Mock Notifications Dataset
const initialNotifications = [
  {
    id: "NTF-001",
    title: "OTA Parity Sync Issue",
    message: "Booking.com connection returned timeout error during room availability sync for Suite rooms.",
    type: "OTA Sync",
    propertyId: "HS-JAI",
    propertyName: "Rambagh Residency",
    timestamp: "10 mins ago",
    read: false,
    body: "The OTA connection channel manager reported a parity discrepancy for Rambagh Residency Standard Room pricing between Agoda and Booking.com. Automated sync was retried 3 times and timed out. Action required to verify rate parity settings manually."
  },
  {
    id: "NTF-002",
    title: "New Property Onboarded",
    message: "Onboarded 'Backwater Retreat' in Alleppey, Kerala. Default inventory mapping initialized.",
    type: "Property Audit",
    propertyId: "HS-KER",
    propertyName: "Backwater Retreat",
    timestamp: "2 hours ago",
    read: false,
    body: "Super Admin onboarded Backwater Retreat under category Luxury Resort. Generated property manager seed credentials and default room pricing sheets (Standard tariff: ₹4,500/night). Connection test to PMS completed successfully."
  },
  {
    id: "NTF-003",
    title: "Security Alert: Unauthorized Login",
    message: "Multiple failed login attempts detected on Rambagh Residency admin console from IP 192.168.1.105.",
    type: "Security Warning",
    propertyId: "HS-JAI",
    propertyName: "Rambagh Residency",
    timestamp: "4 hours ago",
    read: true,
    body: "Security systems logged 5 consecutive failed authorization requests for GM account on Rambagh Residency dashboard panel. Device fingerprint: Chrome on Linux. Recommended actions: Trigger password reset or IP access check."
  },
  {
    id: "NTF-004",
    title: "Admin Account Assigned",
    message: "Administrator user 'Vikram Mehta' assigned as GM to Lake Palace View, Udaipur.",
    type: "Access Control",
    propertyId: "HS-UDA",
    propertyName: "Lake Palace View",
    timestamp: "1 day ago",
    read: true,
    body: "Assigned Vikram Mehta (vikram@hourstay.com) to property Lake Palace View, Udaipur. Inherited administrative role permissions for room rates, check-ins, check-outs, and staff registrations."
  },
  {
    id: "NTF-005",
    title: "Payment Gateway Connection Issue",
    message: "Razorpay webhook returned response code 502 for transaction booking capture FOL-9021.",
    type: "Payment Alert",
    propertyId: "All",
    propertyName: "Global System",
    timestamp: "1 day ago",
    read: false,
    body: "Merchant account payment notification hook failed to respond on endpoint /api/payments/razorpay. The payment was captured by payment gateway but pending confirmation in local folio records. Resolved payment manually via super-admin control panel."
  },
  {
    id: "NTF-006",
    title: "Property Activated",
    message: "Hotel 'Candolim Beach Resort' status successfully set to Active after validation check.",
    type: "Property Audit",
    propertyId: "HS-GOA",
    propertyName: "Candolim Beach Resort",
    timestamp: "2 days ago",
    read: true,
    body: "Super Admin approved activation status for Candolim Beach Resort, Goa following successful KYC verify checks, GST details registration, and room inventory sync confirmations."
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
    case "Access Control":
    default:
      return "brand";
  }
}

// Load notifications from localStorage or use defaults
const getSavedNotifications = () => {
  const saved = localStorage.getItem("hms_super_admin_notifications");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return initialNotifications;
    }
  }
  localStorage.setItem("hms_super_admin_notifications", JSON.stringify(initialNotifications));
  return initialNotifications;
};

function SuperAdminNotifications() {
  const [notifications, setNotifications] = useState(() => getSavedNotifications());
  const [loading] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState("All"); // 'All' | 'Unread' | 'System' | 'Property'

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      localStorage.setItem("hms_super_admin_notifications", JSON.stringify(updated));
      return updated;
    });
  };

  // Filtered dataset
  const filteredNotifications = notifications.filter((n) => {
    let matchesType = true;
    if (filterType === "Unread") {
      matchesType = !n.read;
    } else if (filterType === "System") {
      matchesType = n.propertyId === "All" || n.type === "Security Warning" || n.type === "Payment Alert";
    } else if (filterType === "Property") {
      matchesType = n.type === "Property Audit";
    }
    return matchesType;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Alerts Console"
        subtitle="Monitor real-time system alerts, check channel sync parities, and audit property onboard events."
      />

      {/* Advanced Filter Toolbar */}
      <div className="flex flex-col gap-3 bg-white border border-muted p-4 rounded-2xl shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Type Filter Pills */}
          <div className="flex gap-1 bg-muted/30 p-1 rounded-full border border-muted/50">
            {[
              { label: "All Alerts", key: "All" },
              { label: `Unread (${unreadCount})`, key: "Unread" },
              { label: "System Alerts", key: "System" },
              { label: "Property Audits", key: "Property" }
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
      <Panel title="Real-Time Alerts Log" description={`Displaying ${filteredNotifications.length} system messages`}>
        {loading ? (
          <LoadingRows rows={5} />
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground p-6">
            No alerts found matching active filters.
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredNotifications.map((n) => (
              <Link
                key={n.id}
                to="/super-admin/notifications/$id"
                params={{ id: n.id }}
                className={cn(
                  "bg-white rounded-xl border border-muted p-4 shadow-soft hover:shadow-lift transition-all duration-300 flex flex-col md:flex-row md:items-start justify-between gap-4 relative cursor-pointer text-left block hover:no-underline",
                  !n.read && "border-purple/30 bg-purple/[0.005] shadow-[0_2px_12px_rgba(168,85,247,0.03)]"
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
                    <p className="text-[11px] text-muted-foreground leading-relaxed text-left" title={n.message}>{n.message}</p>
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

export const Route = createFileRoute("/super-admin/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Hour Stay" },
      { name: "description", content: "Group-level alerts and announcements." },
      { property: "og:title", content: "Notifications — Hour Stay" },
      { property: "og:description", content: "Group-level alerts and announcements." }
    ]
  }),
  component: SuperAdminNotifications
});