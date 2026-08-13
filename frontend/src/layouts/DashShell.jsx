import { useEffect, useState } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Bell, Menu, Moon, Search, Sun, X, LogOut, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
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
  "Platform": [
    { label: "Properties Portfolio", to: "/super-admin/properties" },
    { label: "Users & Staff Directory", to: "/super-admin/users" },
    { label: "Roles & Permissions", to: "/super-admin/admins" }
  ],
  "Operations": [
    { label: "Reservations Ledger", to: "/super-admin/reservations" }
  ],
  "Distribution": [
    { label: "Channel Manager", to: "/super-admin/channel-manager" }
  ],
  "Finance": [
    { label: "Payments & Invoices", to: "/super-admin/reports" }
  ],
  "Analytics": [
    { label: "Occupancy Trends", to: "/super-admin/occupancy" }
  ],
  "System": [
    { label: "Alerts & Notifications", to: "/super-admin/notifications" },
    { label: "Audit Trails", to: "/super-admin/audit-logs" },
    { label: "CMS & Landing Branding", to: "/super-admin/branding" }
  ]
};

export function DashShell({ role, children }) {
  const groups = navByRole[role];
  const meta = roleMeta[role];
  const supportsDark = role === "admin" || role === "manager";
  const { dark, setDark } = useDarkMode(supportsDark);
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({
    "Platform": true,
    "System": true
  });

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
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "flex min-h-10 items-center gap-3 rounded-lg px-3 text-xs font-semibold transition-all duration-200 cursor-pointer",
                          active && !hasChildren
                            ? "bg-purple text-white shadow-soft"
                            : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon className="size-4.5 shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="truncate">{item.label}</span>
                            {hasChildren && (
                              <span className="ml-auto transition-transform duration-200">
                                {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                              </span>
                            )}
                          </>
                        )}
                      </Link>

                      {/* Expandable submodules */}
                      {!collapsed && hasChildren && isExpanded && (
                        <ul className="space-y-0.5 mt-1 border-l border-sidebar-border/30 ml-5 pl-2 animate-fade-down">
                          {subModules[item.label].map((child) => {
                            const childActive = pathname === child.to;
                            return (
                              <li key={child.to}>
                                <Link
                                  to={child.to}
                                  className={cn(
                                    "flex min-h-8 items-center gap-2 rounded-md px-3 text-[11px] font-medium transition-all duration-200 cursor-pointer",
                                    childActive
                                      ? "bg-purple/15 text-purple font-bold"
                                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
                                  )}
                                >
                                  <span>{child.label}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
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
            title={collapsed ? "Sign Out" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground cursor-pointer",
              collapsed ? "justify-center" : "w-full"
            )}
          >
            <LogOut className="size-4 shrink-0" />
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
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur">
          <button
            onClick={() => setOpen(true)}
            className="grid size-11 shrink-0 place-items-center rounded-md hover:bg-muted lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <span className="mr-1 hidden rounded-full border border-accent/50 bg-accent/15 px-3 py-1 text-[11px] font-medium text-navy sm:inline dark:text-accent">
              {meta.name}
            </span>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="grid size-11 place-items-center rounded-md hover:bg-muted" aria-label="Account menu">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-navy text-[11px] font-semibold text-cream">
                      {meta.initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm">{meta.person}</p>
                  <p className="text-xs font-normal text-muted-foreground">{meta.caption}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/">Switch workspace</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  authService.logout();
                  window.location.href = '/login';
                }}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-[1400px] space-y-6 animate-fade-up">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}