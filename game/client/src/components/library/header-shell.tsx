import { cn } from "@/lib/utils";

export function HeaderShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed top-0 z-50 flex h-15 w-full justify-center bg-black/40 p-3 backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
