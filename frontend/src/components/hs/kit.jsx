
import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/utils/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { roomStatusMeta } from "@/data/hs-data";
import {
  AlertTriangle,
  CheckCircle2,
  Inbox,
  Info,
  TrendingDown,
  TrendingUp,
  XCircle } from
"lucide-react";

export function PageHeader({
  title,
  subtitle,
  actions
}) {
  const isSuperAdmin = window.location.pathname.startsWith("/super-admin");

  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
      {!isSuperAdmin && (
        <div className="min-w-0">
          <h1 className="truncate font-sans text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}
      {isSuperAdmin && <div className="min-w-0 flex-1" />}
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );

}

export function StatCard({
  label,
  value,
  delta,
  hint,
  icon: Icon
}) {
  const up = (delta ?? 0) >= 0;
  
  let borderClasses = "border-l-4 border-l-purple";
  const lbl = label.toLowerCase();
  if (lbl.includes("rev") || lbl.includes("spend") || lbl.includes("amount") || lbl.includes("total")) {
    borderClasses = "border-l-4 border-l-gold";
  } else if (lbl.includes("adr") || lbl.includes("rate") || lbl.includes("occupancy")) {
    borderClasses = "border-l-4 border-l-blush";
  } else if (lbl.includes("active") || lbl.includes("properties") || lbl.includes("staff") || lbl.includes("keys") || lbl.includes("rooms")) {
    borderClasses = "border-l-4 border-l-navy";
  }

  return (
    <div className={cn("bg-white rounded-xl border border-muted p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden", borderClasses)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-sans text-2xl font-black text-navy leading-none">{value}</p>
        </div>
        {Icon && (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted/65 text-navy-deep">
            <Icon className="size-4.5" />
          </span>
        )}
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-xs">
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-bold",
              up ? "text-success" : "text-error"
            )}>
            {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
            {up ? "+" : ""}{delta}%
          </span>
        )}
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  guest
}) {
  return (
    <section
      className={cn(
        "border border-muted bg-white text-card-foreground shadow-soft rounded-xl overflow-hidden",
        className
      )}>
      
      {(title || actions) &&
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-muted px-5 py-4 bg-muted/10">
          <div className="min-w-0">
            {title &&
              <h2 className="truncate font-sans text-sm font-bold text-navy">
                {title}
              </h2>
            }
            {description &&
              <p className="mt-1 truncate text-xs text-muted-foreground">{description}</p>
            }
          </div>
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </div>
      }
      <div className="p-0">
        {children}
      </div>
    </section>
  );
}

export function StatusPill({
  status,
  className
}) {
  const m = roomStatusMeta[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        m.chip,
        className
      )}>
      <span aria-hidden>{m.icon}</span>
      {m.label}
    </span>
  );
}

const toneMap = {
  success: "bg-success/12 text-success border-success/30",
  warning: "bg-warning/12 text-warning border-warning/30",
  error: "bg-error/12 text-error border-error/30",
  info: "bg-info/12 text-info border-info/30",
  neutral: "bg-muted text-muted-foreground border-border",
  brand: "bg-navy/10 text-navy border-navy/25 dark:bg-cream/10 dark:text-foreground"
};



export function Tag({
  children,
  tone = "neutral",
  className




}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        toneMap[tone],
        className
      )}>
      
      {children}
    </span>);

}

export function statusTone(status) {
  const s = status.toLowerCase();
  if (["confirmed", "paid", "success", "connected", "active", "completed", "on duty", "clean"].includes(s))
  return "success";
  if (["pending", "partial", "syncing", "in progress", "onboarding", "scheduled"].includes(s)) return "warning";
  if (["cancelled", "unpaid", "disconnected", "failed", "on leave"].includes(s)) return "error";
  if (["checked-in", "upcoming", "refunded"].includes(s)) return "info";
  return "neutral";
}

export function EmptyState({
  title,
  body,
  action




}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="size-5" />
      </span>
      <p className="font-sans text-sm font-semibold">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>);

}

export function LoadingRows({ rows = 4 }) {
  return (
    <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) =>
      <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 w-24 sm:block" />
          <Skeleton className="h-4 w-16" />
        </div>
      )}
    </div>);

}

const noticeIcon = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info
};

export function Notice({
  tone = "info",
  title,
  children,
  className
}) {
  const Icon = noticeIcon[tone];
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-xs font-medium",
        toneMap[tone],
        className
      )}
      role="status">
      
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="font-bold text-navy">{title}</p>
        {children && <div className="mt-1 text-xs opacity-90 leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}

export function Crumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      {items.map((it, i) =>
      <span key={it.label} className="flex items-center gap-1.5">
          {it.to ?
        <Link to={it.to} className="transition-colors hover:text-foreground">
              {it.label}
            </Link> :

        <span className="text-foreground">{it.label}</span>
        }
          {i < items.length - 1 && <span aria-hidden>/</span>}
        </span>
      )}
    </nav>);

}

export function HorizontalRouteTabs({ tabs }) {
  const location = useLocation();
  return (
    <div className="flex justify-start mb-6">
      <div className="bg-white p-1 rounded-full border border-muted shadow-soft inline-flex items-center gap-1 overflow-x-auto max-w-full scrollbar-none">
        {tabs.map((tab) => {
          const active = location.pathname === tab.to;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap",
                active
                  ? "bg-purple/10 text-purple border border-purple/15 shadow-sm font-bold"
                  : "text-muted-foreground hover:text-navy hover:bg-muted/40 border border-transparent"
              )}
            >
              {tab.icon && <tab.icon className={cn("size-3.5", active ? "text-purple" : "text-muted-foreground")} />}
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}