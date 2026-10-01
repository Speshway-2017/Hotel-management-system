import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Panel, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utils";
import { 
  Bell, CheckCheck, Calendar, CreditCard, FileText, 
  Sparkles, RefreshCw, AlertCircle, CheckCircle2, MessageSquare, Hotel,
  LogOut, Clock, Key, ArrowRight
} from "lucide-react";

export const Route = createFileRoute("/guest/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Hour Stay" },
      { name: "description", content: "Stay updates, check-out reminders, booking confirmations, and stay alerts." }
    ]
  }),
  component: GuestNotificationsPage
});

function getToneForCategory(cat, title = "") {
  const c = (cat || "").toLowerCase();
  const t = (title || "").toLowerCase();

  if (c.includes("check-out") || c.includes("checkout") || t.includes("check-out") || t.includes("checked out")) {
    return "warning";
  }
  if (c.includes("check-in") || c.includes("checkin") || t.includes("check-in") || t.includes("checked in")) {
    return "success";
  }
  if (c.includes("payment") || c.includes("folio") || c.includes("bill") || c.includes("invoice")) {
    return "success";
  }
  if (c.includes("booking") || c.includes("reserv") || c.includes("stay")) {
    return "brand";
  }
  if (c.includes("feedback") || c.includes("review")) {
    return "info";
  }
  return "brand";
}

function getCategoryIcon(cat, title = "") {
  const c = (cat || "").toLowerCase();
  const t = (title || "").toLowerCase();

  if (c.includes("check-out") || c.includes("checkout") || t.includes("check-out") || t.includes("checked out")) {
    return LogOut;
  }
  if (c.includes("check-in") || c.includes("checkin") || t.includes("check-in") || t.includes("checked in") || t.includes("room assigned")) {
    return Key;
  }
  if (c.includes("payment") || c.includes("folio") || c.includes("bill") || c.includes("invoice")) {
    return CreditCard;
  }
  if (c.includes("feedback") || c.includes("review")) {
    return MessageSquare;
  }
  if (c.includes("booking") || c.includes("reserv") || c.includes("stay")) {
    return Calendar;
  }
  return Bell;
}

import { notificationsService } from "@/services/notifications";
import { subscribeRealtimeSync } from "@/services/socket";

function GuestNotificationsPage() {
  const navigate = useNavigate();
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
    window.addEventListener("focus", handleFocus);

    const unsubscribe = subscribeRealtimeSync(() => {
      fetchNotifications(true);
    });

    return () => {
      window.removeEventListener("focus", handleFocus);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleMarkAsRead = async (id) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    window.dispatchEvent(new Event('refresh-unread-notifications-count'));
    try {
      await notificationsService.markNotificationRead(id);
    } catch (err) {
      console.error("Failed to mark as read:", err);
      fetchNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAll(true);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    window.dispatchEvent(new Event('refresh-unread-notifications-count'));
    try {
      await notificationsService.markAllNotificationsRead();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === "Unread") return !n.read;
    const cat = (n.category || "").toLowerCase();
    const title = (n.title || "").toLowerCase();
    const msg = (n.message || "").toLowerCase();

    if (filterType === "Bookings") {
      return (
        cat.includes("book") ||
        cat.includes("reserv") ||
        cat.includes("stay") ||
        cat.includes("check") ||
        title.includes("check-out") ||
        title.includes("check-in") ||
        title.includes("booking") ||
        msg.includes("check-out") ||
        msg.includes("checked out") ||
        msg.includes("check-in") ||
        msg.includes("checked in")
      );
    }
    if (filterType === "Payments") {
      return (
        cat.includes("pay") ||
        cat.includes("invoice") ||
        cat.includes("folio") ||
        cat.includes("bill") ||
        title.includes("payment") ||
        msg.includes("payment") ||
        msg.includes("folio")
      );
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;h;

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
            {filteredNotifications.map((n) => {
              const IconComp = getCategoryIcon(n.category, n.title);
              const isCheckout = (n.title || "").toLowerCase().includes("check-out") || (n.category || "").toLowerCase().includes("check-out") || (n.message || "").toLowerCase().includes("check-out");

              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && handleMarkAsRead(n.id)}
                  className={cn(
                    "bg-white rounded-xl border border-navy/10 p-4 shadow-soft hover:shadow-lift transition-all duration-300 flex flex-col md:flex-row md:items-start justify-between gap-4 relative cursor-pointer text-left block border-l-4",
                    !n.read 
                      ? isCheckout 
                        ? "border-l-amber-500 bg-amber-500/[0.02] shadow-[0_2px_12px_rgba(217,119,6,0.06)]"
                        : "border-l-purple bg-purple/[0.01] shadow-[0_2px_12px_rgba(124,58,237,0.04)]" 
                      : "border-l-transparent opacity-90"
                  )}
                >
                  {/* Left Side: Icon + Unread purple dot + Title/Message */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0 text-left">
                    <div className={cn(
                      "size-9 rounded-xl flex items-center justify-center shrink-0 border transition-all",
                      isCheckout 
                        ? "bg-amber-50 border-amber-200 text-amber-600"
                        : (n.category || "").toLowerCase().includes("check-in")
                        ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                        : (n.category || "").toLowerCase().includes("pay")
                        ? "bg-teal-50 border-teal-200 text-teal-600"
                        : "bg-purple/10 border-purple/20 text-purple"
                    )}>
                      <IconComp className="size-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1.5 text-left">
                      <div className="flex flex-wrap items-center gap-2 text-left">
                        <h4 className={cn(
                          "text-xs font-bold text-navy truncate text-left", 
                          !n.read && (isCheckout ? "text-amber-700 font-extrabold" : "text-purple font-extrabold")
                        )}>
                          {n.title}
                        </h4>
                        <Tag tone={getToneForCategory(n.category, n.title)}>{n.category}</Tag>
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
                        className={cn(
                          "text-[10px] font-bold px-2.5 py-1 rounded-md border-none cursor-pointer hover:underline",
                          isCheckout ? "text-amber-700 bg-amber-100/80" : "text-purple bg-purple/10"
                        )}
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

    </div>
  );
}