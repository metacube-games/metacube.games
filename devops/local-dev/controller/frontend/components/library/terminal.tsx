import * as React from "react";
import Ansi from "ansi-to-react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Terminal({
  lines,
  onClear,
  maxLines = 1000,
  droppedCount,
  className,
}: {
  lines: string[];
  onClear?: () => void;
  maxLines?: number;
  /** Override dropped-line count when the caller already trims `lines` itself. */
  droppedCount?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const dropped =
    droppedCount ?? Math.max(0, lines.length - maxLines);
  const visible = lines.slice(-maxLines);

  React.useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines.length]);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border bg-black/90",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/50 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {dropped > 0 ? `terminal · ${dropped} lines dropped` : "terminal"}
        </span>
        {onClear && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
            className="h-6 gap-1 px-2 text-xs"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>
      <div
        ref={ref}
        className="h-48 overflow-auto px-3 py-2 font-mono text-xs leading-relaxed text-zinc-200"
      >
        {visible.length === 0 ? (
          <span className="text-zinc-500">— no output —</span>
        ) : (
          visible.map((l, i) => (
            <pre key={i} className="whitespace-pre-wrap break-all">
              <Ansi>{l}</Ansi>
            </pre>
          ))
        )}
      </div>
    </div>
  );
}
