import * as React from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Inline error notice for failed user-initiated actions. */
export function ErrorMessage({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 border-t p-4 lg:p-6 text-sm text-destructive [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:mt-0.5",
        className,
      )}
      {...props}
    >
      <CircleAlert />
      <span>{children}</span>
    </div>
  );
}
