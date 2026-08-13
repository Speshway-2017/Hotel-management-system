
import { PageHeader, Panel, StatCard, Tag, statusTone, Notice } from "./kit";
import { DataTable } from "./DataTable";
import { RevenueChart, OccupancyChart, SourceMixChart } from "./Charts";
import {
  auditLogs, channels, feedback, guests, inr, invoices, notifications, payments,
  properties, reservations, roomTypes, staff, serviceRequests, myBookings } from "@/data/hs-data";






const col = (key, header, cell, hideOn) => (
{ key, header, cell: cell, hideOn });

/* eslint-disable @typescript-eslint/no-explicit-any */
const datasets = {
  reservations: {
    rows: reservations,
    columns: [
    col("id", "Booking", (r) => <span className="font-medium">{r.id}</span>),
    col("guest", "Guest", (r) =>
    <div className="min-w-0"><p className="truncate font-medium">{r.guest}</p>
        <p className="truncate text-xs text-muted-foreground">{r.phone}</p></div>
    ),
    col("room", "Room", undefined, "md"),
    col("stay", "Stay", (r) => `${r.checkIn} → ${r.checkOut}`, "lg"),
    col("source", "Source", (r) => <Tag tone="brand">{r.source}</Tag>, "md"),
    col("amount", "Amount", (r) => <span className="tabular-nums">{inr(r.amount)}</span>),
    col("status", "Status", (r) => <Tag tone={statusTone(r.status)}>{r.status}</Tag>)]

  },
  guests: {
    rows: guests,
    columns: [
    col("name", "Guest", (r) =>
    <div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.email}</p></div>
    ),
    col("city", "City", undefined, "sm"),
    col("tier", "Tier", (r) => <Tag tone="brand">{r.tier}</Tag>),
    col("stays", "Stays", undefined, "md"),
    col("spend", "Lifetime spend", (r) => <span className="tabular-nums">{inr(r.spend)}</span>),
    col("lastStay", "Last stay", undefined, "lg")]

  },
  invoices: {
    rows: invoices,
    columns: [
    col("id", "Invoice", (r) => <span className="font-medium">{r.id}</span>),
    col("guest", "Guest"),
    col("folio", "Folio", undefined, "md"),
    col("date", "Date", undefined, "sm"),
    col("gst", "GST", (r) => <span className="tabular-nums">{inr(r.gst)}</span>, "lg"),
    col("amount", "Total", (r) => <span className="tabular-nums">{inr(r.amount)}</span>),
    col("status", "Status", (r) => <Tag tone={statusTone(r.status)}>{r.status}</Tag>)]

  },
  payments: {
    rows: payments,
    columns: [
    col("id", "Payment", (r) => <span className="font-medium">{r.id}</span>),
    col("guest", "Guest"),
    col("mode", "Mode", undefined, "md"),
    col("time", "Captured", undefined, "lg"),
    col("amount", "Amount", (r) => <span className="tabular-nums">{inr(r.amount)}</span>),
    col("status", "Status", (r) => <Tag tone={statusTone(r.status)}>{r.status}</Tag>)]

  },
  staff: {
    rows: staff,
    columns: [
    col("name", "Team member", (r) =>
    <div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.id}</p></div>
    ),
    col("role", "Role"),
    col("shift", "Shift", undefined, "md"),
    col("phone", "Contact", undefined, "lg"),
    col("status", "Status", (r) => <Tag tone={statusTone(r.status)}>{r.status}</Tag>)]

  },
  channels: {
    rows: channels,
    columns: [
    col("name", "Channel", (r) => <span className="font-medium">{r.name}</span>),
    col("rooms", "Rooms mapped"),
    col("lastSync", "Last sync", undefined, "sm"),
    col("parity", "Rate parity", (r) =>
    <Tag tone={r.parity === "In parity" ? "success" : r.parity === "—" ? "neutral" : "warning"}>{r.parity}</Tag>,
    "md"),
    col("status", "Status", (r) => <Tag tone={statusTone(r.status)}>{r.status}</Tag>)]

  },
  audit: {
    rows: auditLogs,
    columns: [
    col("time", "When"),
    col("user", "User", (r) => <span className="font-medium">{r.user}</span>),
    col("action", "Action", undefined, "sm"),
    col("entity", "Entity", undefined, "md"),
    col("ip", "IP", undefined, "lg")]

  },
  properties: {
    rows: properties,
    columns: [
    col("name", "Property", (r) =>
    <div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.city}</p></div>
    ),
    col("rooms", "Keys", undefined, "sm"),
    col("occupancy", "Occupancy", (r) => `${r.occupancy}%`),
    col("adr", "ADR", (r) => <span className="tabular-nums">{inr(r.adr)}</span>, "md"),
    col("revpar", "RevPAR", (r) => <span className="tabular-nums">{inr(r.revpar)}</span>, "lg"),
    col("status", "Status", (r) => <Tag tone={statusTone(r.status)}>{r.status}</Tag>)]

  },
  roomTypes: {
    rows: roomTypes,
    columns: [
    col("name", "Room type", (r) =>
    <div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.size} · {r.beds}</p></div>
    ),
    col("inventory", "Keys"),
    col("occupancy", "Max pax", undefined, "sm"),
    col("amenities", "Amenities", (r) => r.amenities.join(" · "), "lg"),
    col("baseRate", "Base rate", (r) => <span className="tabular-nums">{inr(r.baseRate)}</span>)]

  },
  feedback: {
    rows: feedback,
    columns: [
    col("guest", "Guest", (r) => <span className="font-medium">{r.guest}</span>),
    col("rating", "Rating", (r) => <Tag tone={r.rating >= 4 ? "success" : "warning"}>{r.rating} / 5</Tag>),
    col("title", "Summary", (r) =>
    <div className="max-w-md"><p className="font-medium">{r.title}</p>
        <p className="truncate text-xs text-muted-foreground">{r.body}</p></div>
    ),
    col("source", "Source", undefined, "md"),
    col("date", "Date", undefined, "lg")]

  },
  notifications: {
    rows: notifications,
    columns: [
    col("title", "Alert", (r) =>
    <div><p className="font-medium">{r.title}</p><p className="text-xs text-muted-foreground">{r.body}</p></div>
    ),
    col("tone", "Type", (r) => <Tag tone={r.tone}>{r.tone}</Tag>, "sm"),
    col("time", "When", undefined, "md")]

  },
  services: {
    rows: serviceRequests,
    columns: [
    col("id", "Request", (r) => <span className="font-medium">{r.id}</span>),
    col("type", "Type"),
    col("detail", "Detail", undefined, "sm"),
    col("room", "Room", undefined, "md"),
    col("status", "Status", (r) => <Tag tone={statusTone(r.status)}>{r.status}</Tag>),
    col("time", "Raised", undefined, "lg")]

  },
  myBookings: {
    rows: myBookings,
    columns: [
    col("id", "Booking", (r) => <span className="font-medium">{r.id}</span>),
    col("hotel", "Property", (r) =>
    <div><p className="font-medium">{r.hotel}</p><p className="text-xs text-muted-foreground">{r.city} · {r.room}</p></div>
    ),
    col("dates", "Dates", undefined, "sm"),
    col("amount", "Amount", (r) => <span className="tabular-nums">{inr(r.amount)}</span>, "md"),
    col("status", "Status", (r) => <Tag tone={statusTone(r.status)}>{r.status}</Tag>)]

  }
};
/* eslint-enable @typescript-eslint/no-explicit-any */

export function WorkspacePage({
  title,
  subtitle,
  stats,
  dataset = "none",
  charts,
  notice,
  tableTitle,
  actions,
  children,
  navTabs
}) {
  const ds = dataset === "none" ? null : datasets[dataset];
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      {navTabs && navTabs}
      {notice &&
      <Notice tone={notice.tone} title={notice.title}>
          {notice.body}
        </Notice>
      }
      {stats &&
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => <StatCard key={s.label} {...s} />)}
        </div>
      }
      {(charts === "revenue" || charts === "both") &&
      <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Revenue trend" description="Last 7 months (₹ lakh)" className="lg:col-span-2">
            <div className="p-4"><RevenueChart /></div>
          </Panel>
          <Panel title="Booking source mix">
            <div className="p-4"><SourceMixChart /></div>
          </Panel>
        </div>
      }
      {charts === "occupancy" &&
      <Panel title="Occupancy by month" description="Portfolio average">
          <div className="p-4"><OccupancyChart /></div>
        </Panel>
      }
      {charts === "both" &&
      <Panel title="Occupancy by month" description="Portfolio average">
          <div className="p-4"><OccupancyChart /></div>
        </Panel>
      }
      {charts === "mix" &&
      <Panel title="Booking source mix">
          <div className="p-4"><SourceMixChart /></div>
        </Panel>
      }
      {children}
      {ds &&
      <Panel title={tableTitle ?? title}>
          <DataTable columns={ds.columns} rows={ds.rows} />
        </Panel>
      }
    </>);

}