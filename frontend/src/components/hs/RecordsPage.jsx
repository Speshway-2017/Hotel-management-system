import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { PageHeader, Panel, StatCard } from "./kit";
import { DataTable } from "./DataTable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";



export function RecordsPage({
  title,
  subtitle,
  actions,
  stats,
  columns,
  rows,
  searchKeys,
  tableTitle,
  tableDescription,
  emptyTitle,
  emptyBody,
  children,
  above














}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const keys = searchKeys ?? Object.keys(rows[0] ?? {});
    return rows.filter((r) =>
    keys.some((k) => String(r[k] ?? "").toLowerCase().includes(q.toLowerCase()))
    );
  }, [q, rows, searchKeys]);

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      {stats &&
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) =>
        <StatCard key={s.label} {...s} />
        )}
        </div>
      }
      {above}
      <Panel
        title={tableTitle ?? title}
        description={tableDescription}
        actions={
        <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter…"
              className="h-9 w-44 pl-8"
              aria-label={`Filter ${title}`} />
            
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <SlidersHorizontal className="size-3.5" /> Filters
            </Button>
          </div>
        }>
        
        <DataTable
          columns={columns}
          rows={filtered}
          emptyTitle={emptyTitle ?? `No results for “${q}”`}
          emptyBody={emptyBody ?? "Try a different search term or clear the filters."} />
        
      </Panel>
      {children}
    </>);

}