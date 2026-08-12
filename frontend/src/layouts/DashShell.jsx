import { useEffect, useState } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Bell, Menu, Moon, Search, Sun, X } from "lucide-react";
import { Logo } from "./Logo";
import { navByRole, roleMeta } from "./nav";
import { cn } from "@/utils/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function DashShell({
  role,
  children



}) {
  const groups = navByRole[role];
  const meta = roleMeta[role];
  const supportsDark = role === "admin" || role === "manager";
  const { dark, setDark } = useDarkMode(supportsDark);
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (to) =>
  to === `/${role}` ? pathname === to : pathname.startsWith(to);

  const sidebar =
  <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-4">
        <Logo to="/" tone="light" />
        <button
        onClick={() => setOpen(false)}
        className="grid size-11 place-items-center rounded-md text-sidebar-foreground/70 lg:hidden"
        aria-label="Close navigation">
        
          <X className="size-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {groups.map((g) =>
      <div key={g.group}>
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
              {g.group}
            </p>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
            const active = isActive(item.to);
            return (
              <li key={item.to}>
                    <Link
                  to={item.to}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-all duration-200",
                    active ?
                    "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--color-sidebar-primary)]" :
                    "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  )}>
                  
                      <item.icon
                    className={cn("size-4 shrink-0", active && "text-sidebar-primary")} />
                  
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>);

          })}
            </ul>
          </div>
      )}
      </nav>
      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className="flex min-w-0 items-center gap-3 rounded-md px-2 py-2">
          <Avatar className="size-9 shrink-0">
            <AvatarFallback className="bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
              {meta.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{meta.person}</p>
            <p className="truncate text-[11px] text-sidebar-foreground/55">{meta.caption}</p>
          </div>
        </div>
      </div>
    </div>;


  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 left-0 w-64 border-r border-sidebar-border">{sidebar}</div>
      </aside>

      {open &&
      <div className="fixed inset-0 z-50 lg:hidden">
          <div
          className="absolute inset-0 bg-navy-deep/60 animate-fade-in"
          onClick={() => setOpen(false)} />
        
          <div className="absolute inset-y-0 left-0 w-72 shadow-lift animate-fade-in">{sidebar}</div>
        </div>
      }

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur">
          <button
            onClick={() => setOpen(true)}
            className="grid size-11 shrink-0 place-items-center rounded-md hover:bg-muted lg:hidden"
            aria-label="Open navigation">
            
            <Menu className="size-5" />
          </button>
          <div className="relative hidden min-w-0 flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search bookings, guests, rooms…"
              className="h-11 max-w-md pl-9"
              aria-label="Global search" />
            
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <span className="mr-1 hidden rounded-full border border-accent/50 bg-accent/15 px-3 py-1 text-[11px] font-medium text-navy sm:inline dark:text-accent">
              {meta.name}
            </span>
            {supportsDark &&
            <Button
              variant="ghost"
              size="icon"
              className="size-11"
              onClick={() => setDark(!dark)}
              aria-label="Toggle dark mode">
              
                {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
              </Button>
            }
            <Link
              to={`/${role}/notifications`}
              className="relative grid size-11 place-items-center rounded-md hover:bg-muted"
              aria-label="Notifications">
              
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
                <DropdownMenuItem asChild>
                  <Link to="/login">Sign out</Link>
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
    </div>);

}