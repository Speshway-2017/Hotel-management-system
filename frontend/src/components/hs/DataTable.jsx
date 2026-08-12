
import { cn } from "@/utils/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";
import { EmptyState, LoadingRows } from "./kit";









export function DataTable({
  columns,
  rows,
  loading,
  emptyTitle = "Nothing here yet",
  emptyBody = "Records will appear here as soon as there is activity."






}) {
  if (loading) return <LoadingRows rows={5} />;
  if (!rows.length) return <EmptyState title={emptyTitle} body={emptyBody} />;

  const hide = (h) =>
  h === "sm" ? "hidden sm:table-cell" : h === "md" ? "hidden md:table-cell" : h === "lg" ? "hidden lg:table-cell" : "";

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60 hover:bg-muted/60">
            {columns.map((c) =>
            <TableHead
              key={c.key}
              className={cn(
                "h-11 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
                hide(c.hideOn),
                c.className
              )}>
              
                {c.header}
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) =>
          <TableRow key={i} className="transition-colors hover:bg-accent/10">
              {columns.map((c) =>
            <TableCell
              key={c.key}
              className={cn("py-3 text-sm", hide(c.hideOn), c.className)}>
              
                  {c.cell ? c.cell(row) : String(row[c.key] ?? "—")}
                </TableCell>
            )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>);

}