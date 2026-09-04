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

function SuperAdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = (isSilent = false) => {
    if (!isSilent) setLoading(true);
    superAdminService.getProperties()
      .then(propRes => {
        const propertiesList = propRes.success && propRes.data ? propRes.data : [];
        notificationsService.getNotifications()
          .then(res => {
            if (res.success && res.data) {
              const compiled = res.data.map(n => {
                const matched = propertiesList.find(p => p._id === n.propertyId || p.id === n.propertyId);
                return {
                  id: n._id || n.id,
                  title: n.title,
                  message: n.message,
                  type: n.category || 'General',
                  propertyName: matched ? matched.name : (n.propertyId === 'All' || !n.propertyId ? 'Global System' : 'Assigned Hotel'),
                  timestamp: n.createdAt ? new Date(n.createdAt).toLocaleDateString() : "Today",
                  read: n.isRead,
                  body: n.message
                };
              });
              setNotifications(compiled);
            }
          })
          .catch(err => console.error("Failed to load super admin alerts:", err))
          .finally(() => { if (!isSilent) setLoading(false); });
      })
      .catch(() => {
        notificationsService.getNotifications()
          .then(res => {
            if (res.success && res.data) {
              const compiled = res.data.map(n => ({
                id: n._id || n.id,
                title: n.title,
                message: n.message,
                type: n.category || 'General',
                propertyName: n.propertyId === 'All' || !n.propertyId ? 'Global System' : 'Assigned Hotel',
                timestamp: n.createdAt ? new Date(n.createdAt).toLocaleDateString() : "Today",
                read: n.isRead,
                body: n.message
              }));
              setNotifications(compiled);
            }
          })
          .catch(err => console.error(err))
          .finally(() => { if (!isSilent) setLoading(false); });
      });
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

  const handleMarkAllAsRead = () => {
    notificationsService.markAllNotificationsRead()
      .then(() => {
        fetchAlerts();
        window.dispatchEvent(new Event('refresh-unread-notifications-count'));
      })
      .catch(err => console.error(err));
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