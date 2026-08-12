import { useState } from "react";
import { rooms, roomStatusMeta, inr } from "@/data/hs-data";
import { cn } from "@/utils/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle } from
"@/components/ui/dialog";
import { StatusPill } from "./kit";
import { toast } from "sonner";

const order = ["clean", "occupied", "dirty", "cleaning", "ooo", "blocked"];

const tileStyle = {
  clean: "border-success/40 bg-success/10 text-success hover:bg-success/18",
  occupied: "border-navy/35 bg-navy/10 text-navy hover:bg-navy/16 dark:text-foreground dark:bg-cream/10",
  dirty: "border-warning/40 bg-warning/12 text-warning hover:bg-warning/20",
  cleaning: "border-info/40 bg-info/12 text-info hover:bg-info/20",
  ooo: "border-error/40 bg-error/12 text-error hover:bg-error/20",
  blocked: "border-border bg-muted text-muted-foreground hover:bg-muted/80"
};

export function RoomLegend() {
  return (
    <div className="flex flex-wrap gap-2">
      {order.map((s) =>
      <StatusPill key={s} status={s} />
      )}
    </div>);

}

export function RoomGrid({ compact = false }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const list = filter === "all" ? rooms : rooms.filter((r) => r.status === filter);
  const floors = [...new Set(list.map((r) => r.floor))];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "min-h-11 rounded-full border px-4 text-xs font-medium transition-colors",
            filter === "all" ? "border-navy bg-navy text-cream" : "border-border bg-card hover:bg-muted"
          )}>
          
          All rooms · {rooms.length}
        </button>
        {order.map((s) => {
          const count = rooms.filter((r) => r.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-xs font-medium transition-colors",
                filter === s ? "border-navy bg-navy text-cream" : tileStyle[s]
              )}>
              
              <span aria-hidden>{roomStatusMeta[s].icon}</span>
              {roomStatusMeta[s].label} · {count}
            </button>);

        })}
      </div>

      {floors.map((f) =>
      <div key={f}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Floor {f}
          </p>
          <div
          className={cn(
            "grid gap-2",
            compact ?
            "grid-cols-3 sm:grid-cols-6 lg:grid-cols-8" :
            "grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8"
          )}>
          
            {list.
          filter((r) => r.floor === f).
          map((r) =>
          <button
            key={r.number}
            onClick={() => setSelected(r)}
            className={cn(
              "min-h-24 rounded-lg border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft",
              tileStyle[r.status]
            )}>
            
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-sans text-base font-semibold">{r.number}</span>
                    <span aria-hidden className="text-sm">{roomStatusMeta[r.status].icon}</span>
                  </div>
                  <p className="mt-1 truncate text-[11px] font-medium">{roomStatusMeta[r.status].label}</p>
                  <p className="mt-0.5 truncate text-[11px] opacity-80">
                    {r.type} · {r.guest}
                  </p>
                </button>
          )}
          </div>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-sans">Room {selected?.number}</DialogTitle>
            <DialogDescription>
              {selected?.type} · Floor {selected?.floor} · {selected ? inr(selected.rate) : ""} / night
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {selected && <StatusPill status={selected.status} />}
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs text-muted-foreground">Guest</dt>
                <dd className="font-medium">{selected?.guest}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Nights</dt>
                <dd className="font-medium">{selected?.nights || "—"}</dd>
              </div>
            </dl>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" size="touch" onClick={() => setSelected(null)}>
              Close
            </Button>
            <Button
              size="touch"
              variant="hero"
              onClick={() => {
                toast.success(`Room ${selected?.number} marked clean & inspected`);
                setSelected(null);
              }}>
              
              Mark inspected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}