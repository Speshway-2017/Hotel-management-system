import { useEffect, useState } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Bell, Menu, Moon, Search, Sun, X, LogOut, ChevronLeft, ChevronRight, ChevronDown, User } from "lucide-react";
import { Logo } from "./Logo";
import { navByRole, roleMeta } from "./nav";
import { cn } from "@/utils/utils";
import { Button } from "@/components/ui/button";
import { authService } from "../services/auth";
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
  "Property Management": [
    { label: "Properties", to: "/super-admin/properties" },
    { label: "Admins", to: "/super-admin/admins" }
  ],
  "Operations": [
    { label: "Reservations", to: "/super-admin/reservations" },
    { label: "Rooms & Rates", to: "/super-admin/rooms" }
  ],
  "Analytics & Reports": [
    { label: "Revenue Reports", to: "/super-admin/reports" }
  ],
  "Access & Security": [
    { label: "Users", to: "/super-admin/users" },
    { label: "Roles & Permissions", to: "/super-admin/properties" },
    { label: "Audit Logs", to: "/super-admin/audit-logs" }
  ],
  "Integrations": [
    { label: "Channel Manager", to: "/super-admin/channel-manager" },
    { label: "Payment Gateway", to: "/super-admin/reports" },
    { label: "Notifications", to: "/super-admin/notifications" }
  ],
  "System": [
    { label: "Branding", to: "/super-admin/branding" },
    { label: "Global Settings", to: "/super-admin/subscription" }
  ]
};

export function DashShell({ role, children }) {
  const groups = navByRole[role];
  const meta = roleMeta[role];
  const supportsDark = role === "admin" || role === "manager";
  const { dark, setDark } = useDarkMode(supportsDark);
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
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
  }, [pathname]);

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
                  const active = isActive(item.to);
                  const hasChildren = role === "super-admin" && subModules[item.label];
                  const isExpanded = expandedGroups[item.label];

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
                          role === "super-admin"
                            ? (active && !hasChildren
                                ? "text-gold"
                                : "text-sidebar-foreground/75 hover:text-sidebar-foreground")
                            : (active && !hasChildren
                                ? "bg-purple text-white shadow-soft"
                                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")
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
                            {subModules[item.label].map((child) => {
                              const childActive = pathname === child.to;
                              return (
                                <li key={child.label}>
                                  <Link
                                    to={child.to}
                                    className={cn(
                                      "flex min-h-8 items-center gap-2 rounded-md px-3 text-[11px] font-medium transition-all duration-200 cursor-pointer",
                                      role === "super-admin"
                                        ? (childActive
                                            ? "text-gold font-bold"
                                            : "text-sidebar-foreground/60 hover:text-sidebar-foreground")
                                        : (childActive
                                            ? "bg-purple/15 text-purple font-bold"
                                            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40")
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
    <div className="flex min-h-screen w-full bg-background">
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

          {role === "super-admin" && (() => {
            const getHeaderContent = (path) => {
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
              if (
                path.startsWith("/super-admin/users") ||
                path.startsWith("/super-admin/admins")
              ) {
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
              if (path.startsWith("/super-admin/audit-logs")) {
                return {
                  title: "Audit Trail Console",
                  subtitle: "Audit logs of all critical actions, changes, and refunds."
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
              return {
                title: "Property Management",
                subtitle: "Manage, onboard, assign, and audit configurations across hotel properties."
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
            {role !== "super-admin" && (
              <span className="mr-1 hidden rounded-full border border-accent/50 bg-accent/15 px-3 py-1 text-[11px] font-medium text-navy sm:inline dark:text-accent">
                {meta.name}
              </span>
            )}
            {supportsDark && (
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                onClick={() => setDark(!dark)}
                aria-label="Toggle dark mode"
              >
                {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
              </Button>
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
              to={role === "super-admin" ? "/super-admin/profile" : "/guest/profile"}
              className="grid size-11 place-items-center rounded-md hover:bg-muted"
              aria-label="Account menu"
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-navy text-[11px] font-semibold text-cream">
                  {meta.initials}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-[1400px] space-y-6 animate-fade-up">
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