import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, Notice } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utils";
import {
  Activity,
  Bell,
  CheckCheck,
  Building,
  Calendar,
  Gift,
  AlertCircle,
  UserCog,
  Users
} from "lucide-react";
import { authService } from "@/services/auth";
import { notificationsService } from "@/services/notifications";
import { receptionistService } from "@/services/receptionist";

export const Route = createFileRoute("/reception/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications & Alerts — Hour Stay" },
      { name: "description", content: "Desk live alerts, booking updates, and shift notifications." }
    ]
  }),
  component: ReceptionNotificationsPage
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

function ReceptionNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [filterType, setFilterType] = useState("All"); // 'All' | 'Unread' | 'Operations' | 'Alerts'
  const [userProperty, setUserProperty] = useState(null);

  const loadNotificationsData = () => {
    setLoading(true);
    receptionistService.getProperty()
      .then(propRes => {
        const propName = propRes.success && propRes.data ? propRes.data.name : "Assigned Hotel";
        notificationsService.getNotifications()
          .then(res => {
            if (res.success && res.data) {
              const compiled = res.data.map(n => ({
                id: n._id || n.id,
                title: n.title,
                message: n.message,
                type: n.category || "General",
                propertyId: n.propertyId,
                propertyName: propName,
                timestamp: new Date(n.createdAt).toLocaleDateString(),
                read: n.isRead,
                body: n.message
              }));
              setNotifications(compiled);
            }
          })
          .catch(err => console.error("Failed to load notifications:", err))
          .finally(() => setLoading(false));
      })
      .catch(() => {
        notificationsService.getNotifications()
          .then(res => {
            if (res.success && res.data) {
              const compiled = res.data.map(n => ({
                id: n._id || n.id,
                title: n.title,
                message: n.message,
                type: n.category || "General",
                propertyId: n.propertyId,
                propertyName: "Assigned Hotel",
                timestamp: new Date(n.createdAt).toLocaleDateString(),
                read: n.isRead,
                body: n.message
              }));
              setNotifications(compiled);
            }
          })
          .catch(err => console.error(err))
          .finally(() => setLoading(false));
      });
  };

  useEffect(() => {
    loadNotificationsData();
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllNotificationsRead();
      loadNotificationsData();
      window.dispatchEvent(new Event('refresh-unread-notifications-count'));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAsReadSingle = async (id) => {
    try {
      await notificationsService.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      window.dispatchEvent(new Event('refresh-unread-notifications-count'));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === "Unread") return !n.read;
    if (filterType === "Operations") return n.type === "New Reservation" || n.type === "Pending Approval";
    if (filterType === "Alerts") return n.type === "Guest Complaint" || n.type === "Maintenance Alert" || n.type === "Overbooking Alert";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-semibold text-muted-foreground">
        Loading system alerts...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in text-navy font-sans">
      
      {/* Top Navbar Header */}
      <PageHeader />

      {/* Advanced Filter Toolbar */}
      <div className="flex flex-col gap-3 bg-white border border-muted p-4 rounded-2xl shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 bg-muted/30 p-1 rounded-full border border-muted/50 select-none">
            {[
              { label: "All Alerts", key: "All" },
              { label: `Unread (${unreadCount})`, key: "Unread" },
              { label: "Reservations & Approvals", key: "Operations" },
              { label: "Incidents & Complaints", key: "Alerts" }
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

          <Button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="bg-navy hover:bg-navy/90 disabled:opacity-50 text-white rounded-full px-5 gap-2 cursor-pointer text-[10px] font-semibold h-8"
          >
            <CheckCheck className="size-3.5" /> Mark All as Read
          </Button>
        </div>
      </div>

      {/* Main Alerts Panel */}
      <Panel title="Property Alerts Log" description={`Displaying ${filteredNotifications.length} notifications scoped to ${userProperty?.name || "assigned hotel"}`}>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground p-6">
            Synchronizing live alert feed...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground p-6">
            No alerts found matching active filters.
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredNotifications.map((n) => (
              <Link
                key={n.id}
                to="/reception/notifications/$id"
                params={{ id: n.id }}
                className={cn(
                  "bg-white rounded-xl border border-muted p-4 shadow-soft hover:shadow-lift transition-all duration-300 flex flex-col md:flex-row md:items-start justify-between gap-4 relative cursor-pointer text-left block hover:no-underline",
                  !n.read && "border-purple/35 bg-purple/[0.005] shadow-[0_2px_12px_rgba(168,85,247,0.02)]"
                )}
              >
                {/* Left Side: Unread dot + Title/Msg */}
                <div className="flex items-start gap-3 flex-1 min-w-0 text-left">
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