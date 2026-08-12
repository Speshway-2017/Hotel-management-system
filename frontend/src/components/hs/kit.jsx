
import { Link } from "@tanstack/react-router";
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
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate font-sans text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h1>
        {subtitle &&
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        }
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>);

}

export function StatCard({
  label,
  value,
  delta,
  hint,
  icon: Icon






}) {
  const up = (delta ?? 0) >= 0;
  return (
    <Card className="gap-0 py-4 shadow-soft transition-shadow duration-300 hover:shadow-lift">
      <CardContent className="px-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {Icon &&
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-accent/25 text-navy dark:text-accent">
              <Icon className="size-4" />
            </span>
          }
        </div>
        <p className="mt-2 font-sans text-2xl font-semibold tracking-tight">{value}</p>
        <div className="mt-1 flex items-center gap-2 text-xs">
          {delta !== undefined &&
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium",
              up ? "text-success" : "text-error"
            )}>
            
              {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {up ? "+" : ""}
              {delta}%
            </span>
          }
          {hint && <span className="truncate text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>);

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
        "border bg-card text-card-foreground shadow-soft",
        guest ? "card-guest" : "rounded-lg",
        className
      )}>
      
      {(title || actions) &&
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            {title &&
          <h2 className={cn("truncate text-sm font-semibold", guest ? "font-display text-base" : "font-sans")}>
                {title}
              </h2>
          }
            {description &&
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
          }
          </div>
          {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
        </div>
      }
      {children}
    </section>);

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
    </span>);

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
        "flex items-start gap-3 rounded-lg border p-3 text-sm",
        toneMap[tone],
        className
      )}
      role="status">
      
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        {children && <div className="mt-0.5 text-xs opacity-90">{children}</div>}
      </div>
    </div>);

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