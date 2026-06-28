import { cn } from "@/lib/utils";

export type Status =
  | "idle"
  | "running"
  | "error"
  | "processing"
  | "building"
  | "success";

const COLORS: Record<Status, string> = {
  idle: "bg-muted-foreground",
  running: "bg-primary shadow-[0_0_8px_rgba(34,197,94,0.6)]",
  error: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]",
  processing: "bg-amber-500 animate-pulse",
  building: "bg-purple-500 animate-pulse",
  success: "bg-primary",
};

const SIZES = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2.5 w-2.5",
} as const;

export function StatusDot({
  status,
  size = "md",
  className,
}: {
  status: Status;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-full",
        SIZES[size],
        COLORS[status],
        className,
      )}
      aria-label={status}
    />
  );
}

export function StatusIndicator({
  status,
  label,
  className,
}: {
  status: Status;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-2 text-sm",
        className,
      )}
    >
      <StatusDot status={status} />
      <span className="capitalize text-muted-foreground">
        {label ?? status}
      </span>
    </span>
  );
}
