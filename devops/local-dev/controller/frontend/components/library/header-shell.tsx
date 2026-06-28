import { cn } from "@/lib/utils";

/**
 * Fixed translucent header strip — always visible at the top of the
 * viewport. Provides the visual surface (height, padding, blur, tint)
 * for the per-app Header layout, which positions LocaleSwitcher,
 * NavigationBar and PlayButton on top of it.
 */
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
        // p-3 (12px) + h-9 item (36px) → h-15 (60px). Inset matches gap-3.
        "fixed top-0 z-50 flex h-15 w-full justify-center rounded-xl bg-black/40 p-3 backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
