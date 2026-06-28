import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Active-row marker (a rotated, filled Play glyph) shared by the dropdown rows in
 * `locale-switcher` and `navigation-bar`. Rendered on every row (invisible when
 * inactive) so the row width stays stable regardless of which row is active.
 */
export function ActiveMarker({ active }: { active: boolean }) {
  return (
    <Play
      aria-hidden
      className={cn(
        "ml-auto size-3.5 rotate-180 fill-current",
        active ? "text-primary" : "invisible",
      )}
    />
  );
}
