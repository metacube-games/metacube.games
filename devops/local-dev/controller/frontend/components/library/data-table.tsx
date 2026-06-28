import * as React from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: keyof T & string;
  header: string;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  render?: (row: T) => React.ReactNode;
};

export function DataTable<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  selectedKey,
  emptyState,
}: {
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedKey?: string;
  emptyState?: React.ReactNode;
}) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [dir, setDir] = React.useState<"asc" | "desc">("asc");

  const sorted = React.useMemo(() => {
    if (!sortKey) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      if (av === bv) return 0;
      const cmp = (av as number | string) > (bv as number | string) ? 1 : -1;
      return dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [data, sortKey, dir]);

  const onSort = (key: string) => {
    if (sortKey === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setDir("asc");
    }
  };

  if (data.length === 0 && emptyState) return <>{emptyState}</>;

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="max-h-[480px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
            <tr className="border-b">
              {columns.map((c) => {
                const align =
                  c.align === "right"
                    ? "text-right"
                    : c.align === "center"
                      ? "text-center"
                      : "text-left";
                return (
                  <th
                    key={c.key}
                    className={cn(
                      "px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                      align,
                      c.sortable && "cursor-pointer select-none",
                      c.className,
                    )}
                    onClick={c.sortable ? () => onSort(c.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {c.header}
                      {c.sortable &&
                        (sortKey !== c.key ? (
                          <ChevronsUpDown className="h-3 w-3 opacity-60" />
                        ) : dir === "asc" ? (
                          <ChevronUp className="h-3 w-3 text-primary" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-primary" />
                        ))}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const k = rowKey(row);
              const selected = k === selectedKey;
              return (
                <tr
                  key={k}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-border/60 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-accent/30",
                    selected && "bg-primary/10",
                  )}
                >
                  {columns.map((c) => {
                    const align =
                      c.align === "right"
                        ? "text-right"
                        : c.align === "center"
                          ? "text-center"
                          : "text-left";
                    return (
                      <td
                        key={c.key}
                        className={cn("px-3 py-2 align-middle", align)}
                      >
                        {c.render
                          ? c.render(row)
                          : String(
                              (row as Record<string, unknown>)[c.key] ?? "",
                            )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
