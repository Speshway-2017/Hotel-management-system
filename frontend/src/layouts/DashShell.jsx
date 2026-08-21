import React, { useEffect, useState } from "react";
import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { Bell, Menu, Moon, Search, Sun, X, LogOut, ChevronLeft, ChevronRight, ChevronDown, User, ArrowLeft } from "lucide-react";
import { Logo } from "./Logo";
import { navByRole, roleMeta } from "./nav";
import { cn } from "@/utils/utils";
import { Button } from "@/components/ui/button";
import { authService } from "../services/auth";
import { superAdminService } from "@/services/superAdmin";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
      { label: "Reservations", to: "/super-admin/reservations" },
      { label: "Channel Manager", to: "/super-admin/channel-manager" }
    ],
    "Analytics & Reports": [
      { label: "Revenue Reports", to: "/super-admin/reports" }
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
      { label: "Front Desk", to: "/admin/front-desk" },
      { label: "Guests", to: "/admin/guests" }
    ],
    "Finance": [
      { label: "Billing", to: "/admin/billing" },
      { label: "Payments", to: "/admin/payments" },
      { label: "Discounts & Refunds", to: "/admin/approvals" },
      { label: "Taxes & GST", to: "/admin/taxes" }
    ],
    "Analytics": [
      { label: "Reports", to: "/admin/reports" }
    ],
    "Management": [
      { label: "Staff", to: "/admin/staff" },
      { label: "Channel Manager", to: "/admin/channels" },
      { label: "CRM / Loyalty", to: "/admin/crm" }
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
      { label: "Attendance", to: "/manager/attendance" }
    ],
    "Guest Experience": [
      { label: "Feedback", to: "/manager/feedback" }
    ],
    "Finance": [
      { label: "Billing Overview", to: "/manager/billing" }
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
  const user = authService.getCurrentUser();
  const initials = user?.name 
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) 
    : meta.initials;

  const [userProperty, setUserProperty] = useState(null);

  useEffect(() => {
    if (role === "admin" || role === "manager") {
      authService.getProfile()
        .then(profileRes => {
          const freshUser = profileRes.data;
          return superAdminService.getProperties()
            .then(res => {
              if (res.success && res.data) {
                if (role === "manager") {
                  const found = res.data.find(p => p._id === freshUser.propertyId || p.id === freshUser.propertyId);
                  setUserProperty(found || null);
                } else if (res.data.length > 0) {
                  setUserProperty(res.data[0]);
                }
              }
            });
        })
        .catch(() => {
          // Fallback if profile API fails
          superAdminService.getProperties()
            .then(res => {
              if (res.success && res.data) {
                if (role === "manager") {
                  const found = res.data.find(p => p._id === user?.propertyId || p.id === user?.propertyId);
                  setUserProperty(found || null);
                } else if (res.data.length > 0) {
                  setUserProperty(res.data[0]);
                }
              }
            })
            .catch(() => {});
        });
    }
  }, [role, user?.propertyId]);

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
        subModules[role][groupLabel].some(sub => 
          sub.to === `/${role}` ? pathname === sub.to : pathname.startsWith(sub.to)
        )
      );
      if (activeGroup) {
        setExpandedGroups(prev => ({ ...prev, [activeGroup]: true }));
      }
    }
  }, [pathname, role]);

  const isActive = (to) =>
    to === `/${role}` ? pathname === to : pathname.startsWith(to);

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
              {!collapsed && (
                <p className="px-3 pb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-sidebar-foreground/40">
                  {g.group}
                </p>
              )}
              <ul className="space-y-1">
                {g.items.map((item) => {
                  const hasChildren = (role === "super-admin" || role === "admin" || role === "manager") && subModules[role]?.[item.label];
                  const isExpanded = expandedGroups[item.label];
                  const childActive = hasChildren && subModules[role][item.label].some(sub => pathname === sub.to || pathname.startsWith(sub.to + "/"));
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

          {(role === "super-admin" || role === "admin" || role === "manager") && (() => {
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
                    subtitle: "Manage secure profiles, loyalty status level tiers, feedback, complaints, and preferences."
                  };
                }
                if (path.startsWith("/admin/front-desk")) {
                  return {
                    title: "Front Desk Control Console",
                    subtitle: "Manage live room layout mapping grid, instant check-in/out triggers, and invoice folios."
                  };
                }
                if (
                  path.startsWith("/admin/billing") ||
                  path.startsWith("/admin/payments") ||
                  path.startsWith("/admin/approvals") ||
                  path.startsWith("/admin/taxes")
                ) {
                  return {
                    title: "Finance Center",
                    subtitle: "Track invoices, payments, tax configurations, discounts, and refunds."
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
                if (path.startsWith("/admin/crm")) {
                  return {
                    title: "CRM & Loyalty Console",
                    subtitle: "Audit guest profile checkouts, calculate lifetime values, track accumulated loyalty points, and distribute tier rewards."
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
                    title: `${userProperty?.name || "Rambagh Residency"} Operations`,
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
                if (path.startsWith("/manager/billing")) {
                  return {
                    title: "Billing Overview Ledger",
                    subtitle: "Audit invoicing logs, GST rate slabs compliance, split bills, and pending payments."
                  };
                }
                if (path.startsWith("/manager/reports")) {
                  return {
                    title: "Operational Analytics Reports",
                    subtitle: "Generate and export property occupancies, ADR trends, RevPAR metrics, and channel mixes."
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
            {role !== "super-admin" && role !== "admin" && role !== "manager" && (
              <span className="mr-1 hidden rounded-full border border-accent/50 bg-accent/15 px-3 py-1 text-[11px] font-medium text-navy sm:inline dark:text-accent">
                {meta.name}
              </span>
            )}
            <Link
              to={`/${role}/notifications`}
              className="relative grid size-11 place-items-center rounded-md hover:bg-muted"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
              <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-blush" />
            </Link>
            <Link
              to={role === "super-admin" ? "/super-admin/profile" : (role === "admin" ? "/admin/profile" : (role === "manager" ? "/manager/profile" : "/guest/profile"))}
              className="grid size-11 place-items-center rounded-md hover:bg-muted"
              aria-label="Account menu"
            >
              <Avatar className="size-8">
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
              if (pathname === "/admin" || pathname === "/super-admin" || pathname === "/manager" || pathname === "/admin/" || pathname === "/super-admin/" || pathname === "/manager/") {
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
                  { label: "Operations", to: "/admin/reservations" },
                  { label: "Reservations" }
                ],
                "/admin/reservations/add": [
                  { label: "Operations", to: "/admin/reservations" },
                  { label: "Reservations", to: "/admin/reservations" },
                  { label: "Create Booking" }
                ],
                "/admin/reservations/edit": [
                  { label: "Operations", to: "/admin/reservations" },
                  { label: "Reservations", to: "/admin/reservations" },
                  { label: "Edit Booking" }
                ],
                "/admin/reservations/view": [
                  { label: "Operations", to: "/admin/reservations" },
                  { label: "Reservations", to: "/admin/reservations" },
                  { label: "Reservation Details" }
                ],
                "/admin/rooms": [
                  { label: "Operations", to: "/admin/reservations" },
                  { label: "Rooms & Rates" }
                ],
                "/admin/guests": [
                  { label: "Operations", to: "/admin/reservations" },
                  { label: "Guests" }
                ],
                "/admin/front-desk": [
                  { label: "Operations", to: "/admin/reservations" },
                  { label: "Front Desk" }
                ],
                "/admin/billing": [
                  { label: "Finance", to: "/admin/billing" },
                  { label: "Billing & Invoices" }
                ],
                "/admin/payments": [
                  { label: "Finance", to: "/admin/billing" },
                  { label: "Payments" }
                ],
                "/admin/approvals": [
                  { label: "Finance", to: "/admin/billing" },
                  { label: "Discounts & Refunds" }
                ],
                "/admin/taxes": [
                  { label: "Finance", to: "/admin/billing" },
                  { label: "Taxes & GST" }
                ],
                "/admin/reports": [
                  { label: "Analytics", to: "/admin/reports" },
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
                "/admin/crm": [
                  { label: "Management", to: "/admin/staff" },
                  { label: "CRM & Loyalty" }
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
                "/super-admin/reports": [{ label: "Reports" }],
                "/super-admin/channel-manager": [{ label: "Channel Manager" }],
                "/super-admin/branding": [{ label: "Branding" }],
                "/super-admin/coupons": [{ label: "Promo Coupons" }],
                "/super-admin/coupons/add": [{ label: "Promo Coupons", to: "/super-admin/coupons" }, { label: "Add Coupon" }],
                "/super-admin/coupons/edit": [{ label: "Promo Coupons", to: "/super-admin/coupons" }, { label: "Edit Coupon" }],
                "/super-admin/coupons/view": [{ label: "Promo Coupons", to: "/super-admin/coupons" }, { label: "Coupon Details" }],
                "/super-admin/subscription": [{ label: "Plans & Billing" }],
                "/super-admin/subscription/add": [{ label: "Plans & Billing", to: "/super-admin/subscription" }, { label: "Add Plan" }],
                "/super-admin/subscription/edit": [{ label: "Plans & Billing", to: "/super-admin/subscription" }, { label: "Edit Plan" }],
                "/super-admin/subscription/view": [{ label: "Plans & Billing", to: "/super-admin/subscription" }, { label: "Plan Details" }],
                "/super-admin/global-settings": [{ label: "Global Settings" }],
                "/super-admin/notifications": [{ label: "Notifications" }],
                "/super-admin/profile": [{ label: "Profile" }],
                "/manager/operations": [{ label: "Operations" }, { label: "Today's Operations" }],
                "/manager/reservations": [{ label: "Operations" }, { label: "Reservations" }],
                "/manager/rooms": [{ label: "Operations" }, { label: "Rooms" }],
                "/manager/guests": [{ label: "Operations" }, { label: "Guests" }],
                "/manager/housekeeping": [{ label: "Operations" }, { label: "Housekeeping" }],
                "/manager/maintenance": [{ label: "Operations" }, { label: "Maintenance" }],
                "/manager/approvals": [{ label: "Management" }, { label: "Approvals" }],
                "/manager/shifts": [{ label: "Management" }, { label: "Staff & Shifts" }],
                "/manager/staff": [{ label: "Management" }, { label: "Staff & Shifts" }],
                "/manager/attendance": [{ label: "Management" }, { label: "Attendance" }],
                "/manager/feedback": [{ label: "Guest Experience" }, { label: "Feedback" }],
                "/manager/billing": [{ label: "Finance" }, { label: "Billing Overview" }],
                "/manager/reports": [{ label: "Reports" }]
              };
              const cleanPathname = pathname.replace(/\/view\/[^\/]+$/, "/view")
                                            .replace(/\/edit\/[^\/]+$/, "/edit");
              const segments = mappings[cleanPathname];
              if (segments) {
                return (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold select-none flex-wrap">
                    <Link to={role === "super-admin" ? "/super-admin" : (role === "manager" ? "/manager" : "/admin")} className="hover:text-navy transition-colors">
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
                            <Link to={to} className="hover:text-navy transition-colors">
                              {label}
                            </Link>
                          ) : (
                            <span className={isLast ? "text-navy font-bold" : ""}>
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