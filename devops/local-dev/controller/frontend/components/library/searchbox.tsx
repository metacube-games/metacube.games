import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Searchbox = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
    value: string;
    onChange: (v: string) => void;
  }
>(({ value, onChange, className, placeholder = "Search…", ...props }, ref) => (
  <div
    className={cn(
      "relative flex h-9 items-center rounded-md border border-input bg-transparent",
      className,
    )}
  >
    <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
    <input
      ref={ref}
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-full w-full bg-transparent pl-9 pr-8 text-sm outline-none placeholder:text-muted-foreground"
      {...props}
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange("")}
        className="absolute right-2 text-muted-foreground hover:text-foreground"
        aria-label="Clear"
      >
        <X className="h-4 w-4" />
      </button>
    )}
  </div>
));
Searchbox.displayName = "Searchbox";
