import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utils";
import {
  Building,
  CheckCheck
} from "lucide-react";

import { notificationsService } from "@/services/notifications";
import { superAdminService } from "@/services/superAdmin";
import { subscribeRealtimeSync } from "@/services/socket";

function getToneForType(type) {
  const t = (type || "").toLowerCase();
  if (t.includes("setup") || t.includes("onboard") || t.includes("property update") || t.includes("audit")) return "success";
  if (t.includes("staff") || t.includes("roster")) return "brand";
  if (t.includes("config") || t.includes("setting") || t.includes("subscription")) return "purple";
  if (t.includes("sync") || t.includes("ota") || t.includes("warning")) return "warning";
  if (t.includes("security") || t.includes("error") || t.includes("alert") || t.includes("issue") || t.includes("maintenance")) return "error";
  return "brand";
}

const isDisallowedForSuperAdminClient = (n) => {
  const t = (n.title || '').toLowerCase();
  const m = (n.message || '').toLowerCase();
  const c = (n.type || n.category || '').toLowerCase();
  const isAllowedCategory = c.includes('property') || c.includes('staff') || c.includes('config') || c.includes('system') || c.includes('ota') || c.includes('security') || c.includes('maintenance') || c.includes('issue');

  const isOtaOrSystem = c.includes('ota') || c.includes('channel') || c.includes('security') || t.includes('ota') || t.includes('parity');
  if (isOtaOrSystem) return false;
  if (c.includes('reserv') || c.includes('book') || t.includes('reservation') || t.includes('online reservation') || t.includes('new booking') || m.includes('booked ') || (m.includes('reservation') && !isAllowedCategory) || m.includes('[ref: #')) return true;
  if (t.includes('guest check-in') || t.includes('guest check-out') || t.includes('check-in confirmed') || t.includes('check-out completed') || m.includes('checked into') || m.includes('checked out from') || (m.includes('check-in') && !isAllowedCategory) || (m.includes('check-out') && !isAllowedCategory)) return true;
  if (c.includes('guest') || c.includes('feedback') || c.includes('review') || t.includes('feedback') || t.includes('review') || m.includes('star review') || m.includes('submitted a review') || (m.includes('guest ') && !isAllowedCategory)) return true;
  if (c.includes('payment') || c.includes('refund') || c.includes('finance') || c.includes('billing') || t.includes('payment') || t.includes('refund')) return true;
  if (c.includes('service') || c.includes('housekeeping') || c.includes('room service') || t.includes('room service') || t.includes('guest service')) return true;
  return false;
};

function SuperAdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [propRes, res] = await Promise.all([
        superAdminService.getProperties().catch(() => ({})),
        notificationsService.getNotifications().catch(() => ({}))
      ]);

      const propertiesList = propRes?.success && propRes?.data ? propRes.data : [];
      if (res?.success && Array.isArray(res.data)) {
        const compiled = res.data
          .filter(n => !isDisallowedForSuperAdminClient(n))
          .map(n => {
            const matched = propertiesList.find(p => p._id === n.propertyId || p.id === n.propertyId);
            return {
              id: n._id || n.id,
              title: n.title,
              message: n.message,
              type: n.category || 'General',
              propertyId: n.propertyId,
              propertyName: matched ? matched.name : (n.propertyId === 'All' || !n.propertyId ? 'Global System' : 'Assigned Hotel'),
              timestamp: n.createdAt ? new Date(n.createdAt).toLocaleDateString() : "Today",
              read: n.isRead,
              body: n.message
            };
          });
        setNotifications(compiled);
      }
    } catch (err) {
      console.error("Failed to load super admin alerts:", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts(false);

    const handleFocus = () => fetchAlerts(true);

    const unsubscribe = subscribeRealtimeSync(() => {
      fetchAlerts(true);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const [filterType, setFilterType] = useState("All");

  const handleMarkAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      window.dispatchEvent(new Event('refresh-unread-notifications-count'));
      await notificationsService.markAllNotificationsRead();
      fetchAlerts(true);
    } catch (err) {
      console.error(err);
      fetchAlerts(true);
    }
  };

  const handleMarkAsReadSingle = async (id, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      window.dispatchEvent(new Event('refresh-unread-notifications-count'));
      await notificationsService.markNotificationRead(id);
    } catch (err) {
      console.error(err);
      fetchAlerts(true);
    }
  };

  // Filtered dataset for Super Admin
  const filteredNotifications = notifications.filter((n) => {
    if (filterType === "Unread") {
      return !n.read;
    }
    const t = (n.type || "").toLowerCase();
    const title = (n.title || "").toLowerCase();
    const msg = (n.message || "").toLowerCase();
    const combined = `${t} ${title} ${msg}`;

    if (filterType === "Property") {
      return t.includes("property") || combined.includes("onboard") || combined.includes("property update") || combined.includes("admin assign");
    } else if (filterType === "Staff") {
      return t.includes("staff") || combined.includes("staff member") || combined.includes("roster") || combined.includes("employee");
    } else if (filterType === "Configuration") {
      return t.includes("config") || t.includes("setting") || t.includes("subscription") || combined.includes("configuration") || combined.includes("settings");
    } else if (filterType === "System") {
      return t.includes("system") || t.includes("security") || t.includes("ota") || t.includes("sync") || combined.includes("unauthorized") || combined.includes("parity");
    } else if (filterType === "Issues") {
      return t.includes("issue") || t.includes("maintenance") || combined.includes("out of order") || combined.includes("facility");
    }
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Property Alerts Console"
        subtitle="Monitor property setup/updates, staff changes, configuration adjustments, system health, and property-level issues across Admin-managed properties."
      />

      {/* Advanced Filter Toolbar */}
      <div className="flex flex-col gap-3 bg-white border border-muted p-4 rounded-2xl shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Type Filter Pills */}
          <div className="flex gap-1 bg-muted/30 p-1 rounded-full border border-muted/50 overflow-x-auto max-w-full">
            {[
              { label: "All Alerts", key: "All" },
              { label: `Unread (${unreadCount})`, key: "Unread" },
              { label: "Property Setup & Updates", key: "Property" },
              { label: "Staff", key: "Staff" },
              { label: "Configuration", key: "Configuration" },
              { label: "System & Security", key: "System" },
              { label: "Property Issues", key: "Issues" }
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

                {/* Right Side: Property, Time, Action */}
                <div className="flex flex-row md:flex-col items-center md:items-end gap-3 md:gap-1.5 shrink-0 md:pt-0.5 self-start md:self-auto justify-start md:justify-end w-full md:w-auto text-left md:text-right">
                  <div className="flex items-center gap-1.5 text-navy font-semibold text-[10px] bg-muted/40 px-2.5 py-1 rounded-full shrink-0">
                    <Building className="size-3 text-purple shrink-0" />
                    <span>{n.propertyName}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{n.timestamp}</span>
                  {!n.read && (
                    <button
                      onClick={(e) => handleMarkAsReadSingle(n.id, e)}
                      className="text-[10px] font-bold text-purple hover:text-purple/80 bg-purple/10 hover:bg-purple/20 px-2.5 py-1 rounded-md border-none cursor-pointer transition-colors mt-1"
                    >
                      Mark as Read
                    </button>
                  )}
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