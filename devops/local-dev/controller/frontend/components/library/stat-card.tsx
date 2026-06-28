import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  accent = "primary",
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: "primary" | "amber" | "blue" | "red" | "muted";
  icon?: React.ReactNode;
  className?: string;
}) {
  const valueColor = {
    primary: "text-primary",
    amber: "text-amber-400",
    blue: "text-blue-400",
    red: "text-red-400",
    muted: "text-foreground",
  }[accent];

  return (
    <Card size="compact" className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <span className={cn("text-xl font-bold tabular-nums", valueColor)}>
        {value}
      </span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </Card>
  );
}
