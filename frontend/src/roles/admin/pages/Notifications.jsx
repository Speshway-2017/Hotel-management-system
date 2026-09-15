import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Panel, Tag, Notice } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utils";
import {
  CheckCheck,
  Building
} from "lucide-react";
import { notificationsService } from "@/services/notifications";
import { subscribeRealtimeSync } from "@/services/socket";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [
      { title: "Property Alerts & Notifications — Speshway Luxury Hotel" },
      { name: "description", content: "Property-level alerts, check-in requests, OTA sync notifications." }
    ]
  }),
  component: AdminNotificationsPage
});

function getToneForType(type) {
  const t = (type || "").toLowerCase();
  if (t.includes("reserv") || t.includes("book") || t.includes("audit")) return "success";
  if (t.includes("sync") || t.includes("payment") || t.includes("approval") || t.includes("check")) return "warning";
  if (t.includes("security") || t.includes("error") || t.includes("alert") || t.includes("warning")) return "error";
  return "brand";
}

function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [filterType, setFilterType] = useState("All");
  const [loading, setLoading] = useState(true);

  const loadNotifications = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await notificationsService.getNotifications();
      if (res.success && res.data) {
        const mapped = res.data.map(n => ({
          id: n._id || n.id,
          _id: n._id || n.id,
          title: n.title,
          message: n.message,
          type: n.category || "General",
          date: n.createdAt?.split("T")[0] || new Date().toISOString().split("T")[0],
          timestamp: n.createdAt ? new Date(n.createdAt).toLocaleTimeString() : new Date().toLocaleTimeString(),
          read: n.isRead || false,
          propertyName: "Speshway Luxury Hotel"
        }));
        setNotifications(mapped);
      }
    } catch (err) {
      if (!isSilent) toast.error("Failed to load alerts feed.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(false);

    const handleFocus = () => loadNotifications(true);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadNotifications(true);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllNotificationsRead();
      toast.success("All announcements marked as read.");
      loadNotifications();
      window.dispatchEvent(new Event('refresh-unread-notifications-count'));
    } catch (err) {
      toast.error("Failed to mark all as read.");
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    let matchesType = true;
    if (filterType === "Unread") {
      matchesType = !n.read;
    } else if (filterType === "Reservations") {
      const t = (n.type || "").toLowerCase();
      const title = (n.title || "").toLowerCase();
      const msg = (n.message || "").toLowerCase();
      matchesType = t.includes("reserv") || t.includes("book") || title.includes("reserv") || title.includes("booking") || msg.includes("booking");
    } else if (filterType === "Sync") {
      const t = (n.type || "").toLowerCase();
      matchesType = t.includes("sync") || t.includes("payment");
    } else if (filterType === "Audit") {
      const t = (n.type || "").toLowerCase();
      matchesType = t.includes("audit") || t.includes("property");
    }
    return matchesType;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Advanced Filter Toolbar */}
      <div className="flex flex-col gap-3 bg-white border border-muted p-4 rounded-2xl shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Type Filter Pills */}
          <div className="flex gap-1 bg-muted/30 p-1 rounded-full border border-muted/50 select-none">
            {[
              { label: "All Alerts", key: "All" },
              { label: `Unread (${unreadCount})`, key: "Unread" },
              { label: "Reservations", key: "Reservations" },
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