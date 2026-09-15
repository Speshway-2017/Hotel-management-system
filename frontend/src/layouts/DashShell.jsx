import React, { useEffect, useState } from "react";
import { Link, Outlet, useRouterState, useNavigate, useLocation } from "@tanstack/react-router";
import { Bell, Menu, Moon, Search, Sun, X, LogOut, ChevronLeft, ChevronRight, ChevronDown, User, ArrowLeft } from "lucide-react";
import { Logo } from "./Logo";
import { navByRole, roleMeta } from "./nav";
import { cn } from "@/utils/utils";
import { Button } from "@/components/ui/button";
import { authService } from "../services/auth";
import { superAdminService } from "@/services/superAdmin";
import { adminService } from "@/services/admin";
import { managerService } from "@/services/manager";
import { receptionistService } from "@/services/receptionist";
import { subscribeRealtimeSync } from "@/services/socket";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";

function useDarkMode(enabled) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.toggle("dark", dark);
    return () => document.documentElement.classList.remove("dark");
  }, [dark, enabled]);
  return { dark, setDark };
}

const subModules = {
  "super-admin": {
    "Operations": [
      { label: "Properties", to: "/super-admin/properties" },
      { label: "Channel Manager", to: "/super-admin/channel-manager" },
      { label: "Contact Requests", to: "/super-admin/contacts" }
    ],
    "Access & Security": [
      { label: "Guests Portfolio", to: "/super-admin/users" },
      { label: "Administrators", to: "/super-admin/admins" }
    ],
    "System": [
      { label: "Branding", to: "/super-admin/branding" },
      { label: "Global Settings", to: "/super-admin/global-settings" }
    ],
    "Subscription": [
      { label: "Plans & Billing", to: "/super-admin/subscription" },
      { label: "Coupons", to: "/super-admin/coupons" }
    ]
  },
  "admin": {
    "Operations": [
      { label: "Reservations", to: "/admin/reservations" },
      { label: "Rooms & Rates", to: "/admin/rooms" },
      { label: "Guests", to: "/admin/guests" }
    ],
    "Finance": [
      { label: "Billing", to: "/admin/billing" },
      { label: "Payments", to: "/admin/payments" },
      { label: "Subscription", to: "/admin/subscription" }
    ],
    "Management": [
      { label: "Staff", to: "/admin/staff" },
      { label: "Approvals", to: "/admin/approvals" },
      { label: "Channel Manager", to: "/admin/channels" },
      { label: "Feedback", to: "/admin/feedback" },
      { label: "Coupons", to: "/admin/coupons" }
    ],
    "Settings": [
      { label: "Hotel Profile", to: "/admin/settings?tab=hotel-info" },
      { label: "Policies & Timings", to: "/admin/settings?tab=policies" },
      { label: "Payments & Bookings", to: "/admin/settings?tab=payments" }
    ]
  },
  "manager": {
    "Operations": [
      { label: "Today's Operations", to: "/manager/operations" },
      { label: "Reservations", to: "/manager/reservations" },
      { label: "Rooms", to: "/manager/rooms" },
      { label: "Guests", to: "/manager/guests" }
    ],
    "Management": [
      { label: "Approvals", to: "/manager/approvals" },
      { label: "Staff & Shifts", to: "/manager/shifts" },
      { label: "Attendance", to: "/manager/attendance" },
      { label: "Guest Feedback", to: "/manager/feedback" }
    ]
  },
  "reception": {
    "Front Desk": [
      { label: "Arrivals", to: "/reception/check-in" },
      { label: "Departures", to: "/reception/check-out" },
      { label: "In-House Guests", to: "/reception/guest-search" },
      { label: "Room Status", to: "/reception/room-assignment" },
      { label: "Guest Feedback", to: "/reception/feedback" }
    ]
  }
};

export function DashShell({ role, children }) {
  const navigate = useNavigate();
  const groups = navByRole[role];
  const meta = roleMeta[role];
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
  const user = currentUser;
  const initials = currentUser?.name 
    ? currentUser.name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) 
    : meta.initials;

  const [userProperty, setUserProperty] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem('hms_token');
        if (!token) return;
        
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiBase}/notifications/unread-count`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && isMounted) {
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {}
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // 60s gentle background fallback
    
    const handleForceRefresh = () => fetchUnreadCount();
    window.addEventListener('refresh-unread-notifications-count', handleForceRefresh);

    let lastEventSignature = '';
    let lastEventTimestamp = 0;

    const unsubscribe = subscribeRealtimeSync((data = {}, eventName = '') => {
      fetchUnreadCount();

      // Deduplicate rapid socket duplicate events (1.5s window)
      const signature = `${eventName}_${JSON.stringify(data || {})}`;
      const now = Date.now();
      if (signature === lastEventSignature && (now - lastEventTimestamp) < 1500) {
        return;
      }
      lastEventSignature = signature;
      lastEventTimestamp = now;

      // Realtime notification raise based on event
      if (eventName === 'notification_created' && data?.notification) {
        const notif = data.notification;
        const currentRole = role;
        const currentUserId = currentUser?._id || currentUser?.id;
        const isTargeted = !notif.role || notif.role === currentRole || 
                           (notif.userId && String(notif.userId) === String(currentUserId)) ||
                           currentRole === 'super-admin' || currentRole === 'admin';

        if (isTargeted) {
          toast(notif.title || 'System Alert', {
            description: notif.message,
            icon: '🔔',
            duration: 5000,
            action: {
              label: 'View Alerts',
              onClick: () => navigate({ to: `/${role}/notifications` })
            }
          });
        }
      } else if (eventName === 'booking_created') {
        const bId = data?.bookingId || data?.id;
        toast.success('New Booking Placed', {
          description: bId ? `Booking #${bId} created for ${data?.guestName || data?.guest || 'Guest'}.` : 'A new reservation has been placed.',
          icon: '📅',
          duration: 5000
        });
      } else if (eventName === 'checkin_completed' || eventName === 'booking_checked_in') {
        toast.info('Guest Checked In', {
          description: `${data?.guestName || data?.guest || 'Guest'} checked into ${data?.roomNumber || data?.room || 'Room'}.`,
          icon: '🏨',
          duration: 5000
        });
      } else if (eventName === 'checkout_completed' || eventName === 'booking_checked_out') {
        toast.info('Guest Checked Out', {
          description: `${data?.guestName || data?.guest || 'Guest'} checked out of ${data?.roomNumber || data?.room || 'Room'}.`,
          icon: '💳',
          duration: 5000
        });
      } else if (eventName === 'payment_logged' || eventName === 'payment_added') {
        const pay = data?.payment || data;
        toast.success('Payment Recorded', {
          description: `Payment of ${pay.amount ? '₹' + pay.amount : 'amount'} received via ${pay.paymentMethod || pay.method || 'Direct'}.`,
          icon: '💰',
          duration: 5000
        });
      } else if (eventName === 'feedback_received' || eventName === 'feedback_created') {
        toast.info('New Stay Feedback', {
          description: `${data?.rating || 5}★ Review submitted: "${(data?.title || data?.comment || data?.comments || '').slice(0, 45)}..."`,
          icon: '⭐',
          duration: 5000
        });
      } else if (eventName === 'feedback_updated') {
        toast.info('Feedback Updated', {
          description: `Feedback record #${data?.bookingId || data?.id || ''} has been updated.`,
          icon: '💬',
          duration: 4500
        });
      } else if (eventName === 'room_status_changed') {
        toast.info('Room Status Changed', {
          description: `Room ${data?.room || data?.roomNumber || ''} is now ${data?.status || 'Active'}.`,
          icon: '🛏️',
          duration: 4500
        });
      } else if (eventName === 'coupon_created') {
        toast.success('New Coupon Created', {
          description: `Coupon code '${data?.code || ''}' is now active.`,
          icon: '🎟️',
          duration: 4500
        });
      } else if (eventName === 'coupon_updated') {
        toast.info('Coupon Updated', {
          description: `Coupon code '${data?.code || ''}' details updated.`,
          icon: '🎟️',
          duration: 4500
        });
      }
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('refresh-unread-notifications-count', handleForceRefresh);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleProfileUpdate = () => {
      const fresh = authService.getCurrentUser();
      if (fresh) setCurrentUser(fresh);
    };
    window.addEventListener('user-profile-updated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);

    authService.getProfile().then((res) => {
      if (res && res.success && res.data) {
        setCurrentUser(res.data);
      }
    }).catch(() => {});

    return () => {
      window.removeEventListener('user-profile-updated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchPropertyDetails = async () => {
      try {
        let res;
        if (role === "admin") {
          res = await adminService.getProperty();
        } else if (role === "manager") {
          res = await managerService.getProperty();
        } else if (role === "reception") {
          res = await receptionistService.getProperty();
        }
        if (res && res.success && res.data && isMounted) {
          setUserProperty(res.data);
        }
      } catch (err) {}
    };
    
    if (role === "admin" || role === "manager" || role === "reception") {
      fetchPropertyDetails();
    }
    return () => { isMounted = false; };
  }, [role, currentUser?.propertyId]);

  const [tooltip, setTooltip] = useState({
    show: false,
    text: "",
    x: 0,
    y: 0
  });

  const showTooltip = (e, text) => {
    if (!isCollapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      show: true,
      text,
      x: rect.right + 10,
      y: rect.top + rect.height / 2
    });
  };

  const hideTooltip = () => {
    setTooltip(prev => ({ ...prev, show: false }));
  };

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setOpen(false);
    if (role && subModules[role]) {
      const activeGroup = Object.keys(subModules[role]).find(groupLabel => 
        subModules[role][groupLabel].some(sub => {
          const cleanTo = sub.to.split('?')[0];
          return cleanTo === `/${role}` ? pathname === cleanTo : pathname.startsWith(cleanTo);
        })
      );
      if (activeGroup) {
        setExpandedGroups(prev => ({ ...prev, [activeGroup]: true }));
      }
    }
  }, [pathname, role]);

  const location = useLocation();
  const searchStr = location.search || "";
  const isActive = (to) => {
    const [cleanTo, queryString] = to.split('?');
    if (queryString) {
      if (pathname !== cleanTo) return false;
      const targetTab = new URLSearchParams(queryString).get('tab');
      const currentTab = new URLSearchParams(searchStr).get('tab') || 'hotel-info';
      return targetTab === currentTab;
    }
    return cleanTo === `/${role}` ? pathname === cleanTo : pathname.startsWith(cleanTo);
  };

  const toggleGroup = (itemLabel) => {
    setExpandedGroups(prev => ({
      ...prev,
      [itemLabel]: !prev[itemLabel]
    }));
  };

  const renderSidebarContent = (mobile = false) => {
    const collapsed = !mobile && isCollapsed;
    return (
      <div className="flex h-full flex-col bg-[#0d1b2a] text-sidebar-foreground">
        {/* Header */}
        <div className={cn(
          "flex h-16 shrink-0 items-center border-b border-sidebar-border px-4",
          collapsed ? "justify-center px-2" : "justify-between"
        )}>
          <Logo to="/" tone="light" compact={collapsed} />
          {!mobile && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:grid size-8 place-items-center rounded-lg text-sidebar-foreground/75 hover:bg-sidebar-accent/50 cursor-pointer"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            </button>
          )}
          {mobile && (
            <button
              onClick={() => setOpen(false)}
              className="grid size-10 place-items-center rounded-md text-sidebar-foreground/70 lg:hidden"
              aria-label="Close navigation"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-4 overflow-y-auto scrollbar-none px-3 py-4">
          {groups.map((g) => (
            <div key={g.group} className="space-y-1">
              {!collapsed && g.group && (
                <p className="px-3 pb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/40">
                  {g.group}
                </p>
              )}
              <ul className="space-y-1">
                {g.items.map((item) => {
                  const hasChildren = Boolean(subModules[role]?.[item.label]);
                  const isExpanded = expandedGroups[item.label];
                  const childActive = hasChildren && subModules[role][item.label].some(sub => {
                    const cleanTo = sub.to.split('?')[0];
                    return pathname === cleanTo || pathname.startsWith(cleanTo + "/");
                  });
                  const active = isActive(item.to) || childActive;

                  return (
                    <li key={item.to} className="space-y-0.5">
                      <Link
                        to={hasChildren ? undefined : item.to}
                        onClick={(e) => {
                          if (hasChildren) {
                            e.preventDefault();
                            toggleGroup(item.label);
                          }
                        }}
                        onMouseEnter={(e) => showTooltip(e, item.label)}
                        onMouseLeave={hideTooltip}
                        className={cn(
                          "flex min-h-10 items-center gap-3 rounded-lg px-3 text-xs font-semibold transition-all duration-200 cursor-pointer",
                          collapsed && "justify-center px-0",
                          active
                            ? "text-gold"
                            : "text-sidebar-foreground/75 hover:text-sidebar-foreground"
                        )}
                      >
                        <item.icon className={cn("shrink-0 transition-all duration-200", collapsed ? "size-6" : "size-4.5")} />
                        {!collapsed && (
                          <>
                            <span className="truncate">{item.label}</span>
                            {hasChildren && (
                              <ChevronRight className={cn(
                                "size-3.5 ml-auto transition-transform duration-200",
                                isExpanded && "rotate-90"
                              )} />
                            )}
                          </>
                        )}
                      </Link>

                      {/* Expandable submodules */}
                      {!collapsed && hasChildren && (
                        <div
                          className={cn(
                            "grid transition-all duration-300 ease-in-out",
                            isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 overflow-hidden"
                          )}
                        >
                           <ul className="min-h-0 space-y-0.5 mt-1 border-l border-sidebar-border/30 ml-5 pl-2">
                            {subModules[role]?.[item.label]?.map((child) => {
                              const childActive = pathname === child.to;
                              return (
                                <li key={child.label}>
                                  <Link
                                    to={child.to}
                                    className={cn(
                                      "flex min-h-8 items-center gap-2 rounded-md px-3 text-[11px] font-medium transition-all duration-200 cursor-pointer",
                                      childActive
                                        ? "text-gold font-bold"
                                        : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
                                    )}
                                  >
                                    <span>{child.label}</span>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer sign out */}
        <div className="shrink-0 border-t border-sidebar-border p-3">
          <button
            onClick={() => {
              authService.logout();
              window.location.href = '/login';
            }}
            onMouseEnter={(e) => showTooltip(e, "Sign Out")}
            onMouseLeave={hideTooltip}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground cursor-pointer transition-all duration-200",
              collapsed ? "justify-center px-0 w-full" : "w-full"
            )}
          >
            <LogOut className={cn("shrink-0 transition-all duration-200", collapsed ? "size-6" : "size-4")} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-background dashboard-theme">
      {/* Sidebar Desktop wrapper */}
      <aside className={cn(
        "hidden shrink-0 lg:block transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <div className={cn(
          "fixed inset-y-0 left-0 border-r border-sidebar-border transition-all duration-300",
          isCollapsed ? "w-16" : "w-64"
        )}>
          {renderSidebarContent(false)}
        </div>
      </aside>

      {/* Sidebar Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-navy-deep/60 animate-fade-in"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 shadow-lift animate-fade-in">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* Main Viewport */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card px-4">
          <button
            onClick={() => setOpen(true)}
            className="grid size-11 shrink-0 place-items-center rounded-md hover:bg-muted lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>

          {(role === "super-admin" || role === "admin" || role === "manager" || role === "reception" || role === "guest") && (() => {
            const getHeaderContent = (path) => {
              if (role === "super-admin") {
                if (path === "/super-admin" || path === "/super-admin/") {
                  return {
                    title: "Dashboard",
                    subtitle: "Overview of your hotel properties and platform performance."
                  };
                }
                if (path.startsWith("/super-admin/properties")) {
                  return {
                    title: "Property Management",
                    subtitle: "Manage, onboard, assign, and audit configurations across hotel properties."
                  };
                }
                if (path.startsWith("/super-admin/users") || path.startsWith("/super-admin/admins")) {
                  return {
                    title: "Access & Security",
                    subtitle: "Manage platform operators, administrators, and system access."
                  };
                }
                if (path.startsWith("/super-admin/reservations")) {
                  return {
                    title: "Operations Ledger",
                    subtitle: "View, create, search, and manage room reservations and guest folios."
                  };
                }
                if (path.startsWith("/super-admin/channel-manager")) {
                  return {
                    title: "Distribution Manager",
                    subtitle: "Sync tariffs, maintain rate parity, and configure OTA channel connections."
                  };
                }
                if (path.startsWith("/super-admin/reports")) {
                  return {
                    title: "Finance & Tax Console",
                    subtitle: "Reconcile payment transactions and generate GST-compliant tax invoices."
                  };
                }

                if (path.startsWith("/super-admin/coupons")) {
                  return {
                    title: "Promo Coupons Console",
                    subtitle: "Create and manage promotional discount coupons for Hour Stay reservations."
                  };
                }
                if (path.startsWith("/super-admin/branding")) {
                  return {
                    title: "Branding Console",
                    subtitle: "Configure landing page details and branding assets."
                  };
                }
                if (path.startsWith("/super-admin/notifications")) {
                  return {
                    title: "System Alerts Console",
                    subtitle: "Monitor real-time system alerts and push notifications."
                  };
                }
                if (path.startsWith("/super-admin/profile")) {
                  return {
                    title: "Profile Settings",
                    subtitle: "Manage your personal profile, credentials, and security options."
                  };
                }
              } else if (role === "admin") {
                if (path === "/admin" || path === "/admin/") {
                  return {
                    title: userProperty?.name || "Speshway Luxury Hotel",
                    subtitle: `${userProperty?.city || "Madhapur,Hyderabad"} · Property Dashboard Control Panel`
                  };
                }
                if (path.startsWith("/admin/reservations")) {
                  return {
                    title: "Reservations Console",
                    subtitle: "Manage live bookings, scheduler timeline grids, overbookings, and direct channels."
                  };
                }
                if (path.startsWith("/admin/rooms")) {
                  return {
                    title: "Rooms & Rates Setup",
                    subtitle: "Manage room inventories, rate plan schedules, and bulk price configurations."
                  };
                }
                if (path.startsWith("/admin/guests")) {
                  return {
                    title: "Guests Database (CRM)",
                    subtitle: "Manage secure profiles, stay records, feedback, complaints, and preferences."
                  };
                }
                if (
                  path.startsWith("/admin/payments") ||
                  path.startsWith("/admin/billing") ||
                  path.startsWith("/admin/approvals") ||
                  path.startsWith("/admin/taxes") ||
                  path.startsWith("/admin/subscription")
                ) {
                  return {
                    title: "Payments & Financial Ledger",
                    subtitle: "Track real-time guest transaction records, payment methods, revenue settlements, and receipts."
                  };
                }
                if (path.startsWith("/admin/reports")) {
                  return {
                    title: "Analytics & Reports",
                    subtitle: "Reconcile audit logs, yield statistics and monthly performance reports."
                  };
                }
                if (path.match(/\/admin\/notifications\/[^\/]+/)) {
                  return {
                    title: "Alert Diagnostic Details",
                    subtitle: "System event logs and diagnostic details for this incident record."
                  };
                }
                if (path.startsWith("/admin/notifications")) {
                  return {
                    title: "Property Alerts Console",
                    subtitle: "Monitor property-level real-time alerts, check channel sync parities, and operational warnings."
                  };
                }
                if (path.startsWith("/admin/staff")) {
                  return {
                    title: "Staff Management Directory",
                    subtitle: "Assign user roles, edit personnel profiles, track active shifts, and monitor attendance records."
                  };
                }
                if (path.startsWith("/admin/channels")) {
                  return {
                    title: "Distribution Channel Manager",
                    subtitle: "Configure global OTA channel links, adjust commission splits, audit XML synchronization logs, and toggle rate parity blocks."
                  };
                }
                if (path.startsWith("/admin/feedback")) {
                  return {
                    title: "Guest Feedback",
                    subtitle: "Monitor guest stay feedback, ratings, and managerial responses."
                  };
                }
                if (path.startsWith("/admin/coupons")) {
                  return {
                    title: "Promotional Coupons & Direct Booking Offers",
                    subtitle: "Create, configure, and manage website discount coupons."
                  };
                }
                if (path.startsWith("/admin/crm")) {
                  return {
                    title: "Guest CRM Console",
                    subtitle: "Audit guest profiles, calculate lifetime stays and spend, track preferences, and manage guest communications."
                  };
                }
                if (path.startsWith("/admin/profile")) {
                  return {
                    title: "Admin Profile Settings",
                    subtitle: "Manage your contact information, security credentials, and active session logins."
                  };
                }
                if (path.startsWith("/admin/settings")) {
                  return {
                    title: "Property Configuration Settings",
                    subtitle: "Configure hotel profiles, taxation structures, timings, check-in/out policies, and payment configs."
                  };
                }
              } else if (role === "manager") {
                if (path === "/manager" || path === "/manager/") {
                  return {
                    title: `${userProperty?.name || "Assigned Hotel"} Operations`,
                    subtitle: `Live console for GM ${user?.name || "Rajesh Sharma"} · ${userProperty?.city || "Hyderabad"}`
                  };
                }
                if (path.startsWith("/manager/operations")) {
                  return {
                    title: "Today's Operations",
                    subtitle: "Track real-time room occupancies, check-in schedules, housekeeping, and maintenance logs."
                  };
                }
                if (path.startsWith("/manager/reservations")) {
                  return {
                    title: "Reservations Ledger",
                    subtitle: "Reconcile, filter, and audit active reservations and stay metrics."
                  };
                }
                if (path.startsWith("/manager/rooms")) {
                  return {
                    title: "Rooms Grid Layout",
                    subtitle: "Audit room categories, keys mapping allotments, and direct occupancy indicators."
                  };
                }
                if (path.startsWith("/manager/guests")) {
                  return {
                    title: "Guests Profiles Directory",
                    subtitle: "View repeat guest profiles, lifespaces spent totals, feedback notes, and blacklists."
                  };
                }
                if (path.startsWith("/manager/housekeeping")) {
                  return {
                    title: "Housekeeping Schedule App",
                    subtitle: "Manage room cleanup tasks, supervisor inspections, and staff rosters."
                  };
                }
                if (path.startsWith("/manager/maintenance")) {
                  return {
                    title: "Maintenance Tickets Engine",
                    subtitle: "Create, assign, resolve, and audit out-of-order room maintenance issues."
                  };
                }
                if (path.startsWith("/manager/approvals")) {
                  return {
                    title: "Approvals Desk",
                    subtitle: "Approve, adjust, or decline corporate discount rates and check-out fee waivers."
                  };
                }
                if (path.startsWith("/manager/shifts") || path.startsWith("/manager/staff")) {
                  return {
                    title: "Staff & Shifts Directory",
                    subtitle: "Manage manager staff details, active rosters, department slots, and contact cards."
                  };
                }
                if (path.startsWith("/manager/attendance")) {
                  return {
                    title: "Attendance Roster Logs",
                    subtitle: "Audit supervisor attendance signatures, shift check-ins, and geo-tagged clock logs."
                  };
                }
                if (path.startsWith("/manager/feedback")) {
                  return {
                    title: "Guest Feedback Console",
                    subtitle: "Track live guest survey responses, scores, and review responses logs."
                  };
                }
                if (path.startsWith("/manager/payments") || path.startsWith("/manager/billing")) {
                  return {
                    title: "Payments & Financial Ledger",
                    subtitle: "Reconcile real-time guest transaction records, payment channels, and settlement logs."
                  };
                }
              }
               if (role === "reception") {
                if (path === "/reception" || path === "/reception/") {
                  const displayName = user?.name || "Poojitha";
                  let displayProperty = userProperty?.name || "Assigned Hotel";
                  if (displayProperty.startsWith("Hour Stay ")) {
                    displayProperty = displayProperty.replace("Hour Stay ", "");
                  }
                  return {
                    title: `Good Morning, ${displayName}`,
                    subtitle: `Here's your front-desk overview for today • ${displayProperty}`
                  };
                }
                if (path.startsWith("/reception/check-in")) {
                  return {
                    title: "Check-in Desk",
                    subtitle: "Process arriving guests check-ins, room mapping key assignments."
                  };
                }
                if (path.startsWith("/reception/check-out")) {
                  return {
                    title: "Check-out Desk",
                    subtitle: "Process check-outs, balance settlements, and folio check-offs."
                  };
                }
                if (path.startsWith("/reception/new-booking")) {
                  return {
                    title: "Walk-in & Reservations Booking",
                    subtitle: "Create new instant bookings, guest allocations, and billing forms."
                  };
                }
                if (path.startsWith("/reception/reservations")) {
                  return {
                    title: "Reservations Ledger",
                    subtitle: "Browse, filter, and audit scheduled booking details."
                  };
                }
                if (path.startsWith("/reception/guest-search")) {
                  return {
                    title: "Guests Profiles Directory",
                    subtitle: "Look up guest logs, contact info, previous visits, and flags."
                  };
                }
                if (path.startsWith("/reception/payments") || path.startsWith("/reception/folio")) {
                  return {
                    title: "Payments Ledger",
                    subtitle: "Capture front-desk payments, audit transaction history, and process settlement check-offs."
                  };
                }
                if (path.startsWith("/reception/notifications")) {
                  return {
                    title: "Desk Notifications",
                    subtitle: "Track live property-level alarms, housekeeping alerts, and booking updates."
                  };
                }
                if (path.startsWith("/reception/profile")) {
                  return {
                    title: "Desk Agent Profile",
                    subtitle: "Manage your shift credentials, passcode configurations, and property info."
                  };
                }
              }
              if (role === "guest") {
                const displayName = currentUser?.name ? currentUser.name.split(' ')[0] : "Guest";
                if (path === "/guest" || path === "/guest/") {
                  return {
                    title: `Hii, ${displayName}`,
                    subtitle: "Your stays, requests and rewards with Hour Stay."
                  };
                }
                if (path.startsWith("/guest/bookings")) {
                  return {
                    title: "My Bookings",
                    subtitle: "Upcoming, completed and cancelled stays."
                  };
                }
                if (path.startsWith("/guest/folio")) {
                  return {
                    title: "Digital Folio",
                    subtitle: "View reservation invoices and receipt ledgers."
                  };
                }
                if (path.startsWith("/guest/refund")) {
                  return {
                    title: "Request Stay Refund",
                    subtitle: "Submit early checkout, cancellation, or stay adjustment refund requests directly to hotel staff."
                  };
                }
                if (path.startsWith("/guest/feedback") || path.startsWith("/guest/reviews")) {
                  return {
                    title: "Guest Feedback",
                    subtitle: "Rate your stay experience and share feedback."
                  };
                }
                if (path.startsWith("/guest/settings")) {
                  return {
                    title: "Settings",
                    subtitle: "Manage your guest account preferences, profile, notifications, and security."
                  };
                }
                if (path.startsWith("/guest/notifications")) {
                  return {
                    title: "Notifications",
                    subtitle: "View stay alerts, booking updates, and payment notifications."
                  };
                }
                if (path.startsWith("/guest/profile")) {
                  return {
                    title: "Profile",
                    subtitle: "Manage your personal details, contact info, and account settings."
                  };
                }
              }
              return {
                title: "Hour Stay Console",
                subtitle: "Hotel Property Management System."
              };
            };

            const content = getHeaderContent(pathname);
            return (
              <div className="hidden md:flex flex-col ml-3 text-left animate-fade-in">
                <h1 className="font-display text-sm font-bold text-navy tracking-tight leading-tight">
                  {content.title}
                </h1>
                <p className="text-[10px] text-muted-foreground font-ui leading-none mt-0.5">
                  {content.subtitle}
                </p>
              </div>
            );
          })()}

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {role !== "super-admin" && role !== "admin" && role !== "manager" && role !== "reception" && role !== "guest" && (
              <span className="mr-1 hidden rounded-full border border-accent/50 bg-accent/15 px-3 py-1 text-[11px] font-medium text-navy sm:inline dark:text-accent">
                {currentUser?.name || meta.name}
              </span>
            )}
            <Link
              to={`/${role}/notifications`}
              className="relative grid size-11 place-items-center rounded-md hover:bg-muted"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-blush px-0.5 text-[8px] font-black text-white leading-none">
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link
              to={role === "super-admin" ? "/super-admin/profile" : (role === "admin" ? "/admin/profile" : (role === "manager" ? "/manager/profile" : (role === "reception" ? "/reception/profile" : "/guest/profile")))}
              className="grid size-11 place-items-center rounded-md hover:bg-muted"
              aria-label="Account menu"
            >
              <Avatar className="size-8">
                <AvatarImage src={currentUser?.avatar || ""} alt={currentUser?.name} className="object-cover" />
                <AvatarFallback className="bg-navy text-[11px] font-semibold text-cream">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-[1400px] space-y-6 animate-fade-up">
            {(() => {
              if (pathname === "/admin" || pathname === "/super-admin" || pathname === "/manager" || pathname === "/guest" || pathname === "/reception" || pathname === "/admin/" || pathname === "/super-admin/" || pathname === "/manager/" || pathname === "/guest/" || pathname === "/reception/") {
                return (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold select-none flex-wrap">
                    <span className="text-navy font-bold">Dashboard</span>
                  </div>
                );
              }
              const isNotificationDetails = pathname.match(/^\/(admin|super-admin|manager)\/notifications\/([^\/]+)$/);
              if (isNotificationDetails) {
                const prefix = isNotificationDetails[1];
                const parentUrl = `/${prefix}/notifications`;
                return (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold select-none flex-wrap">
                    <Link to={parentUrl} className="hover:text-navy transition-colors">
                      Notifications
                    </Link>
                    <span className="text-muted-foreground/50">/</span>
                    <span className="text-navy font-bold">Notification Details</span>
                  </div>
                );
              }
              const mappings = {
                "/admin/reservations": [
                  { label: "Reservations" }
                ],
                "/admin/reservations/add": [
                  { label: "Reservations", to: "/admin/reservations" },
                  { label: "Create Booking" }
                ],
                "/admin/reservations/edit": [
                  { label: "Reservations", to: "/admin/reservations" },
                  { label: "Edit Booking" }
                ],
                "/admin/reservations/view": [
                  { label: "Reservations", to: "/admin/reservations" },
                  { label: "Reservation Details" }
                ],
                "/admin/reservations/extend": [
                  { label: "Reservations", to: "/admin/reservations" },
                  { label: "Extend Stay" }
                ],
                "/admin/rooms": [
                  { label: "Operations", to: "/admin/reservations" },
                  { label: "Rooms & Rates" }
                ],
                "/admin/guests": [
                  { label: "Operations", to: "/admin/reservations" },
                  { label: "Guests" }
                ],
                "/admin/billing": [
                  { label: "Finance", to: "/admin/billing" },
                  { label: "Billing & Invoices" }
                ],
                "/admin/payments": [{ label: "Payments" }],
                "/admin/payments/:id": [{ label: "Payments", to: "/admin/payments" }, { label: "Payment Details" }],
                "/admin/approvals": [
                  { label: "Management", to: "/admin/staff" },
                  { label: "Approvals" }
                ],
                "/admin/approvals/view/:id": [
                  { label: "Management", to: "/admin/staff" },
                  { label: "Approvals", to: "/admin/approvals" },
                  { label: "Approval Request Details" }
                ],
                "/admin/taxes": [
                  { label: "Finance", to: "/admin/payments" },
                  { label: "Taxes & GST" }
                ],
                "/admin/reports": [
                  { label: "Finance", to: "/admin/payments" },
                  { label: "Reports" }
                ],
                "/admin/staff": [
                  { label: "Management", to: "/admin/staff" },
                  { label: "Staff" }
                ],
                "/admin/staff/add": [
                  { label: "Management", to: "/admin/staff" },
                  { label: "Staff", to: "/admin/staff" },
                  { label: "Register Staff Profile" }
                ],
                "/admin/staff/edit": [
                  { label: "Management", to: "/admin/staff" },
                  { label: "Staff", to: "/admin/staff" },
                  { label: "Modify Staff Details" }
                ],
                "/admin/staff/view": [
                  { label: "Management", to: "/admin/staff" },
                  { label: "Staff", to: "/admin/staff" },
                  { label: "Staff Profile Diagnostic" }
                ],
                "/admin/channels": [
                  { label: "Management", to: "/admin/staff" },
                  { label: "OTA Channels" }
                ],
                "/admin/feedback": [
                  { label: "Management", to: "/admin/staff" },
                  { label: "Guest Feedback" }
                ],
                "/admin/coupons": [
                  { label: "Management", to: "/admin/staff" },
                  { label: "Coupons" }
                ],
                "/admin/coupons/add": [
                  { label: "Management", to: "/admin/staff" },
                  { label: "Coupons", to: "/admin/coupons" },
                  { label: "Create Coupon" }
                ],
                "/admin/coupons/edit": [
                  { label: "Management", to: "/admin/staff" },
                  { label: "Coupons", to: "/admin/coupons" },
                  { label: "Edit Coupon" }
                ],
                "/admin/coupons/view": [
                  { label: "Management", to: "/admin/staff" },
                  { label: "Coupons", to: "/admin/coupons" },
                  { label: "Coupon Details" }
                ],
                "/admin/crm": [
                  { label: "Management", to: "/admin/staff" },
                  { label: "Guest CRM" }
                ],
                "/admin/notifications": [
                  { label: "Management", to: "/admin/staff" },
                  { label: "Notifications" }
                ],
                "/admin/settings": [{ label: "Settings" }],
                "/admin/profile": [{ label: "Profile" }],
                "/super-admin/properties": [{ label: "Properties" }],
                "/super-admin/properties/add": [{ label: "Properties", to: "/super-admin/properties" }, { label: "Add Property" }],
                "/super-admin/properties/edit": [{ label: "Properties", to: "/super-admin/properties" }, { label: "Edit Property" }],
                "/super-admin/properties/view": [{ label: "Properties", to: "/super-admin/properties" }, { label: "View Property Details" }],
                "/super-admin/users": [{ label: "Users" }],
                "/super-admin/users/view": [{ label: "Users", to: "/super-admin/users" }, { label: "Guest Details" }],
                "/super-admin/admins": [{ label: "Admin Management" }],
                "/super-admin/admins/add": [{ label: "Admin Management", to: "/super-admin/admins" }, { label: "Add Admin" }],
                "/super-admin/admins/edit": [{ label: "Admin Management", to: "/super-admin/admins" }, { label: "Edit Admin" }],
                "/super-admin/admins/view": [{ label: "Admin Management", to: "/super-admin/admins" }, { label: "Admin Details" }],
                "/super-admin/occupancy": [{ label: "Occupancy" }],
                "/super-admin/reservations": [{ label: "Reservations" }],
                "/super-admin/reservations/view": [{ label: "Reservations", to: "/super-admin/reservations" }, { label: "Reservation Details" }],
                "/super-admin/reservations/extend": [{ label: "Reservations", to: "/super-admin/reservations" }, { label: "Extend Stay" }],
                "/super-admin/reports": [{ label: "Reports" }],
                "/super-admin/channel-manager": [{ label: "Channel Manager" }],
                "/super-admin/contacts": [{ label: "Operations", to: "/super-admin/properties" }, { label: "Contact Requests" }],
                "/super-admin/contacts/view": [{ label: "Operations", to: "/super-admin/properties" }, { label: "Contact Requests", to: "/super-admin/contacts" }, { label: "Inquiry Details" }],
                "/super-admin/branding": [{ label: "Branding" }],
                "/super-admin/coupons": [{ label: "Promo Coupons" }],
                "/super-admin/coupons/add": [{ label: "Promo Coupons", to: "/super-admin/coupons" }, { label: "Add Coupon" }],
                "/super-admin/coupons/edit": [{ label: "Promo Coupons", to: "/super-admin/coupons" }, { label: "Edit Coupon" }],
                "/super-admin/coupons/view": [{ label: "Promo Coupons", to: "/super-admin/coupons" }, { label: "Coupon Details" }],
                "/super-admin/subscription": [{ label: "Plans & Billing" }],
                "/super-admin/subscription/requests/view": [{ label: "Plans & Billing", to: "/super-admin/subscription" }, { label: "Request Details" }],
                "/super-admin/subscription/add": [{ label: "Plans & Billing", to: "/super-admin/subscription" }, { label: "Add Plan" }],
                "/super-admin/subscription/edit": [{ label: "Plans & Billing", to: "/super-admin/subscription" }, { label: "Edit Plan" }],
                "/super-admin/subscription/view": [{ label: "Plans & Billing", to: "/super-admin/subscription" }, { label: "Plan Details" }],
                "/super-admin/global-settings": [{ label: "Global Settings" }],
                "/super-admin/notifications": [{ label: "Notifications" }],
                "/super-admin/profile": [{ label: "Profile" }],
                "/manager/operations": [{ label: "Operations" }, { label: "Today's Operations" }],
                "/manager/reservations": [{ label: "Reservations" }],
                "/manager/reservations/extend": [{ label: "Reservations", to: "/manager/reservations" }, { label: "Extend Stay" }],
                "/manager/rooms": [{ label: "Operations" }, { label: "Rooms" }],
                "/manager/guests": [{ label: "Operations" }, { label: "Guests" }],
                "/manager/housekeeping": [{ label: "Operations" }, { label: "Housekeeping" }],
                "/manager/maintenance": [{ label: "Operations" }, { label: "Maintenance" }],
                "/manager/approvals": [{ label: "Management" }, { label: "Approvals" }],
                "/manager/shifts": [{ label: "Management" }, { label: "Staff & Shifts" }],
                "/manager/staff": [{ label: "Management" }, { label: "Staff & Shifts" }],
                "/manager/attendance": [{ label: "Management" }, { label: "Attendance" }],
                "/manager/feedback": [{ label: "Feedback" }],
                "/manager/payments": [{ label: "Payments" }],
                "/manager/payments/:id": [{ label: "Payments", to: "/manager/payments" }, { label: "Payment Details" }],
                "/manager/billing": [{ label: "Payments", to: "/manager/payments" }, { label: "Ledger" }],
                "/reception/check-in": [{ label: "Front Desk", to: "/reception/check-in" }, { label: "Arrivals" }],
                "/reception/check-out": [{ label: "Front Desk", to: "/reception/check-in" }, { label: "Departures" }],
                "/reception/guest-search": [{ label: "Front Desk", to: "/reception/check-in" }, { label: "In-House Guests" }],
                "/reception/room-assignment": [{ label: "Front Desk", to: "/reception/check-in" }, { label: "Room Status" }],
                "/reception/reservations": [{ label: "Reservations", to: "/reception/reservations" }, { label: "Reservations Ledger" }],
                "/reception/reservations/extend": [{ label: "Reservations", to: "/reception/reservations" }, { label: "Extend Stay" }],
                "/reception/payments": [{ label: "Payments" }],
                "/reception/payments/:id": [{ label: "Payments", to: "/reception/payments" }, { label: "Payment Details" }],
                "/reception/folio": [{ label: "Payments", to: "/reception/payments" }, { label: "Folio" }],
                "/reception/notifications": [{ label: "Notifications" }],
                "/reception/profile": [{ label: "Profile" }],
                "/reception/check-in/:id": [{ label: "Front Desk", to: "/reception/check-in" }, { label: "Arrivals", to: "/reception/check-in" }, { label: "Check-in Details" }],
                "/reception/check-out/:id": [{ label: "Front Desk", to: "/reception/check-in" }, { label: "Departures", to: "/reception/check-out" }, { label: "Checkout Details" }],
                "/reception/folio/:id": [{ label: "Payments", to: "/reception/payments" }, { label: "Folio Details" }],
                "/reception/reservations/:id": [{ label: "Reservations", to: "/reception/reservations" }, { label: "Reservations Ledger", to: "/reception/reservations" }, { label: "Booking Details" }],
                "/reception/room-assignment/:id": [{ label: "Front Desk", to: "/reception/check-in" }, { label: "Room Status", to: "/reception/room-assignment" }, { label: "Room Details" }],
                "/reception/guest-search/:id": [{ label: "Front Desk", to: "/reception/check-in" }, { label: "In-House Guests", to: "/reception/guest-search" }, { label: "Guest Details" }],
                "/guest/bookings": [{ label: "My Bookings" }],
                "/guest/current-stay": [{ label: "Current Stay" }],
                "/guest/services": [{ label: "Service Requests" }],
                "/guest/folio": [{ label: "Digital Folio" }],
                "/guest/folio/:id": [{ label: "Digital Folio", to: "/guest/folio" }, { label: "Folio Details" }],
                "/guest/refund": [{ label: "Digital Folio", to: "/guest/folio" }, { label: "Request Refund" }],
                "/guest/refund/:id": [{ label: "Digital Folio", to: "/guest/folio" }, { label: "Request Refund" }],
                "/guest/refund-request": [{ label: "Digital Folio", to: "/guest/folio" }, { label: "Request Refund" }],
                "/guest/refund-request/:id": [{ label: "Digital Folio", to: "/guest/folio" }, { label: "Request Refund" }],
                "/guest/feedback": [{ label: "Guest Feedback" }],
                "/guest/reviews": [{ label: "Guest Feedback" }],
                "/guest/invoices": [{ label: "Invoices" }],
                "/guest/settings": [{ label: "Settings" }],
                "/guest/profile": [{ label: "Profile" }],
                "/guest/notifications": [{ label: "Notifications" }]
              };
              const cleanPathname = pathname.replace(/\/view\/[^\/]+$/, "/view")
                                            .replace(/\/edit\/[^\/]+$/, "/edit")
                                            .replace(/\/extend\/[^\/]+$/, "/extend")
                                            .replace(/\/reception\/check-in\/[^\/]+$/, "/reception/check-in/:id")
                                            .replace(/\/reception\/check-out\/[^\/]+$/, "/reception/check-out/:id")
                                            .replace(/\/reception\/folio\/[^\/]+$/, "/reception/folio/:id")
                                            .replace(/\/reception\/reservations\/[^\/]+$/, "/reception/reservations/:id")
                                            .replace(/\/reception\/room-assignment\/[^\/]+$/, "/reception/room-assignment/:id")
                                            .replace(/\/reception\/guest-search\/[^\/]+$/, "/reception/guest-search/:id")
                                            .replace(/\/guest\/folio\/[^\/]+$/, "/guest/folio/:id")
                                            .replace(/\/guest\/refund\/[^\/]+$/, "/guest/refund/:id")
                                            .replace(/\/guest\/refund-request\/[^\/]+$/, "/guest/refund/:id")
                                            .replace(/\/guest\/bookings\/[^\/]+$/, "/guest/bookings/:id");
              let segments = mappings[cleanPathname];
              const queryParams = new URLSearchParams(searchStr);
              const hasDetailParam = queryParams.has('id') || queryParams.has('view');

              if (cleanPathname === "/guest/folio/:id" || (cleanPathname === "/guest/folio" && hasDetailParam)) {
                segments = [
                  { label: "Digital Folio", to: "/guest/folio" },
                  { label: "Folio Details" }
                ];
              } else if (cleanPathname === "/guest/bookings/:id" || (cleanPathname === "/guest/bookings" && hasDetailParam)) {
                segments = [
                  { label: "My Bookings", to: "/guest/bookings" },
                  { label: "Booking Details" }
                ];
              }

              if (segments) {
                return (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium select-none flex-wrap">
                    <Link 
                      to={role === "super-admin" ? "/super-admin" : (role === "manager" ? "/manager" : (role === "reception" ? "/reception" : (role === "guest" ? "/guest" : "/admin")))} 
                      style={{ color: '#2563eb' }}
                      className="hover:underline transition-colors font-medium cursor-pointer"
                    >
                      Dashboard
                    </Link>
                    {segments.map((seg, idx) => {
                      const isLast = idx === segments.length - 1;
                      const label = typeof seg === "object" ? seg.label : seg;
                      const to = typeof seg === "object" ? seg.to : null;
                      return (
                        <React.Fragment key={idx}>
                          <span className="text-muted-foreground/45">/</span>
                          {to && !isLast ? (
                            <Link 
                              to={to} 
                              style={{ color: '#2563eb' }}
                              className="hover:underline transition-colors font-medium cursor-pointer"
                            >
                              {label}
                            </Link>
                          ) : (
                            <span className={isLast ? "text-navy font-bold" : "text-muted-foreground font-normal"}>
                              {label}
                            </span>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                );
              }
              return null;
            })()}
            {children ?? <Outlet />}
          </div>
        </main>
      </div>

      {/* Premium Collapsed Sidebar Tooltip */}
      {tooltip.show && (
        <div
          style={{
            position: "fixed",
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: "translateY(-50%)",
            zIndex: 9999
          }}
          className="pointer-events-none rounded-lg bg-[#071420] border border-sidebar-border/30 px-3.5 py-2 text-xs font-bold text-[#FFF7E6] shadow-lift animate-tooltip whitespace-nowrap"
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}