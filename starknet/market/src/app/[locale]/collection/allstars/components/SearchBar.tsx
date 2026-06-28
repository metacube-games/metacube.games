"use client";

import React, { useRef } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

export function SearchBar({
  value,
  onChange,
  onClear,
  isLoading,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  isLoading: boolean;
}) {
  const t = useTranslations("allstars");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder={t("searchPlaceholder")}
        value={value}
        onChange={(e) => {
          const cleaned = e.target.value.replace(/\D/g, "");
          if (cleaned !== e.target.value) e.target.value = cleaned;
          onChange(e);
        }}
        className="pl-10 pr-10"
        disabled={isLoading && !value}
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground"
          onClick={() => {
            onClear();
            setTimeout(() => {
              inputRef.current?.focus();
            }, 0);
          }}
          disabled={isLoading}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
