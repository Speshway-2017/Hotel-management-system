import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Panel, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utils";
import { 
  Bell, CheckCheck, Calendar, CreditCard, FileText, 
  Sparkles, RefreshCw, AlertCircle, CheckCircle2, MessageSquare, Hotel 
} from "lucide-react";

export const Route = createFileRoute("/guest/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Hour Stay" },
      { name: "description", content: "Stay updates, booking confirmations, payment receipts, and stay alerts." }
    ]
  }),
  component: GuestNotificationsPage
});

function getToneForCategory(cat) {
  switch (cat) {
    case "Booking Confirmation":
    case "Payment Update":
      return "success";
    case "Check-in Reminder":
    case "Service & Folio":
      return "warning";
    case "Invoice Notification":
      return "brand";
    case "Feedback Reminder":
      return "info";
    default:
      return "brand";
  }
}

import { notificationsService } from "@/services/notifications";
import { subscribeRealtimeSync } from "@/services/socket";

function GuestNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [filterType, setFilterType] = useState("All"); // 'All' | 'Unread' | 'Bookings' | 'Payments'
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError("");
    try {
      const result = await notificationsService.getNotifications();

      if (result && result.success && Array.isArray(result.data)) {
        const compiled = result.data.map((n) => ({
          id: n._id || n.id,
          title: n.title,
          message: n.message,
          category: n.category || "General",
          timestamp: n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
          }) : "Today",
          read: Boolean(n.isRead)
        }));
        setNotifications(compiled);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
      if (!isSilent) setError("Unable to connect to backend server.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(false);

    const handleFocus = () => fetchNotifications(true);
    window.addEventListener('focus', handleFocus);

    const unsubscribe = subscribeRealtimeSync(() => {
      fetchNotifications(true);
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsService.markNotificationRead(id);
      window.dispatchEvent(new Event('refresh-unread-notifications-count'));

      // Update local state
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await notificationsService.markAllNotificationsRead();
      window.dispatchEvent(new Event('refresh-unread-notifications-count'));

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === "Unread") return !n.read;
    if (filterType === "Bookings") return n.category === "Booking Confirmation" || n.category === "Check-in Reminder";
    if (filterType === "Payments") return n.category === "Payment Update" || n.category === "Invoice Notification" || n.category === "Service & Folio";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 text-left font-ui animate-fade-in">

      {/* Filter & Action Toolbar matching Admin/Manager style */}
      <div className="flex flex-col gap-3 bg-white border border-navy/10 p-4 rounded-2xl shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex gap-1 bg-cream/30 p-1 rounded-full border border-navy/10 select-none flex-wrap">
            {[
              { label: "All Alerts", key: "All" },
              { label: `Unread (${unreadCount})`, key: "Unread" },
              { label: "Bookings & Stays", key: "Bookings" },
              { label: "Payments & Folios", key: "Payments" }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterType(tab.key)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer border-none whitespace-nowrap ${
                  filterType === tab.key
                    ? "bg-navy text-cream shadow-sm"
                    : "text-navy/70 hover:text-navy hover:bg-cream/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || markingAll}
            className="bg-navy hover:bg-navy/90 disabled:opacity-50 text-cream rounded-xl px-4 py-2 gap-2 cursor-pointer text-xs font-bold border-none"
          >
            <CheckCheck className="size-3.5" />
            {markingAll ? "Marking..." : "Mark All as Read"}
          </Button>

        </div>
      </div>

      {/* Main Notifications Log Panel */}
      <Panel title="Guest Notifications Log" description={`Displaying ${filteredNotifications.length} notifications scoped to your guest account`}>
        {loading ? (
          <div className="text-center py-16 text-xs font-semibold text-navy/60 p-6 space-y-3">
            <div className="mx-auto size-8 rounded-full border-4 border-purple border-t-transparent animate-spin" />
            <p>Synchronizing live alert feed from MongoDB...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 p-6 space-y-3">
            <AlertCircle className="size-8 text-rose-500 mx-auto" />
            <p className="text-xs font-bold text-rose-700">{error}</p>
            <button
              onClick={fetchNotifications}
              className="px-4 py-2 bg-navy text-cream rounded-xl text-xs font-bold hover:bg-navy/90 border-none cursor-pointer inline-flex items-center gap-2"
            >
              <RefreshCw className="size-3.5" /> Retry Sync
            </button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-16 p-6 border border-dashed border-navy/10 rounded-2xl bg-cream/10 space-y-3 m-4">
            <Bell className="size-10 text-navy/20 mx-auto" />
            <p className="text-xs font-bold text-navy">No notifications found matching active filters.</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.read && handleMarkAsRead(n.id)}
                className={cn(
                  "bg-white rounded-xl border border-navy/10 p-4 shadow-soft hover:shadow-lift transition-all duration-300 flex flex-col md:flex-row md:items-start justify-between gap-4 relative cursor-pointer text-left block border-l-4",
                  !n.read ? "border-l-purple bg-purple/[0.01] shadow-[0_2px_12px_rgba(124,58,237,0.04)]" : "border-l-transparent opacity-90"
                )}
              >
                {/* Left Side: Unread purple dot + Title/Message */}
                <div className="flex items-start gap-3 flex-1 min-w-0 text-left">
                  <span className={cn("size-2.5 rounded-full mt-1.5 shrink-0", n.read ? "bg-transparent" : "bg-purple animate-pulse")} />
                  
                  <div className="flex-1 min-w-0 space-y-1.5 text-left">
                    <div className="flex flex-wrap items-center gap-2 text-left">
                      <h4 className={cn("text-xs font-bold text-navy truncate text-left", !n.read && "text-purple font-extrabold")}>
                        {n.title}
                      </h4>
                      <Tag tone={getToneForCategory(n.category)}>{n.category}</Tag>
                    </div>
                    <p className="text-xs text-navy/75 leading-relaxed text-left font-medium">{n.message}</p>
                  </div>
                </div>

                {/* Right Side: Timestamp & Mark Read CTA */}
                <div className="flex flex-row md:flex-col items-center md:items-end gap-3 md:gap-1.5 shrink-0 self-start md:self-auto justify-between md:justify-end w-full md:w-auto text-left md:text-right border-t md:border-t-0 pt-2 md:pt-0 border-navy/5">
                  <span className="text-[11px] text-navy/50 font-semibold whitespace-nowrap">{n.timestamp}</span>
                  {!n.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(n.id);
                      }}
                      className="text-[10px] font-bold text-purple hover:underline bg-purple/10 px-2.5 py-1 rounded-md border-none cursor-pointer"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

    </div>
  );
}