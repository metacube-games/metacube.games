"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const tCommon = useTranslations("common");
  const tError = useTranslations("error");

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("Error boundary caught:", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-black px-4">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="flex justify-center">
          <div
            className="rounded-md border bg-[rgba(20,20,20,0.85)] p-5 backdrop-blur-sm"
            style={{ borderColor: "rgba(230,48,48,0.5)" }}
          >
            <AlertTriangle
              aria-hidden
              className="size-12 text-destructive"
              strokeWidth={1.75}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-foreground md:text-5xl">
            {tError("title")}
          </h1>
          <p className="text-lg text-muted-foreground">
            {tError("description")}
          </p>
        </div>

        {process.env.NODE_ENV === "development" && (
          <div className="rounded-md border border-border bg-[rgba(20,20,20,0.85)] p-4 text-left backdrop-blur-sm">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-destructive">
              Error Details (Development Only)
            </h3>
            <p className="break-all font-mono text-xs text-muted-foreground">
              {error.message}
            </p>
            {error.digest && (
              <p className="mt-2 text-xs text-muted-foreground/70">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
          <Button variant="outline" onClick={reset}>
            <RefreshCw aria-hidden />
            {tCommon("buttons.tryAgain")}
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <Home aria-hidden />
              {tCommon("buttons.goHome")}
            </Link>
          </Button>
        </div>

        <div className="border-t border-border pt-6">
          <p className="text-sm text-muted-foreground">
            {tError("supportText")}{" "}
            <a
              href="mailto:contact@metacube.com"
              className="text-foreground underline transition-colors hover:text-muted-foreground"
            >
              {tError("contactSupport")}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
