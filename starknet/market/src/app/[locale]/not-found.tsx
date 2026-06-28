"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Home, Frown } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  const tCommon = useTranslations("common");
  const tNotFound = useTranslations("notFound");

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-black px-4">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-9xl font-bold tracking-widest text-foreground md:text-[12rem]">
            404
          </h1>
          <Frown
            aria-hidden
            className="mx-auto size-10 text-muted-foreground"
            strokeWidth={1.5}
          />
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            {tNotFound("title")}
          </h2>
          <p className="mx-auto max-w-md text-lg text-muted-foreground">
            {tNotFound("description")}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
          <Button asChild variant="outline">
            <Link href="/">
              <Home aria-hidden />
              {tCommon("buttons.goHome")}
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft aria-hidden />
            {tCommon("buttons.goBack")}
          </Button>
        </div>
      </div>
    </div>
  );
}
