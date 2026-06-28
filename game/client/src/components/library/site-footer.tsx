import * as React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const TwitterXIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>
);

const DiscordIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.11-.08.22-.17.33-.25.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.05-.01.07.01.11.09.22.17.33.26.04.03.04.09-.01.11-.52.31-1.07.56-1.64.78-.04.01-.05.06-.04.09.32.61.68 1.19 1.07 1.74.03.02.06.03.09.02 1.72-.53 3.45-1.33 5.25-2.65.02-.01.03-.03.03-.05.44-4.53-.73-8.46-3.1-11.95-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z" />
  </svg>
);

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

export function SiteFooter({
  copyrightHolder,
  allRightsReserved,
  twitterHref = "https://x.com/metacubeGames",
  discordHref = "https://discord.gg/FGV6HkMbNj",
  githubHref = "https://github.com/metacube-games",
  termsHref = "https://metacube.games/terms",
  termsLabel,
  privacyHref = "https://metacube.games/privacy",
  privacyLabel,
  version,
  className,
}: {
  copyrightHolder?: string;
  allRightsReserved?: string;
  twitterHref?: string;
  discordHref?: string;
  githubHref?: string;
  termsHref?: string;
  termsLabel?: string;
  privacyHref?: string;
  privacyLabel?: string;
  /** Short app version label rendered next to the legal links. */
  version?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const holder = copyrightHolder ?? `© ${new Date().getFullYear()} Metacube`;

  return (
    <footer
      className={cn(
        "fixed bottom-0 z-40 flex h-15 w-full items-center justify-between bg-black/40 p-3 text-foreground backdrop-blur-sm",
        className,
      )}
    >
      <div className="text-xs text-muted-foreground sm:text-sm">
        <span>{holder}</span>
        <span className="hidden sm:inline"> — </span>
        <span className="block sm:inline">
          {allRightsReserved ?? t("footer.allRightsReserved")}
        </span>
      </div>

      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-3 text-muted-foreground sm:gap-4">
        <a
          href={twitterHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="X"
          className="transition-colors hover:text-foreground"
        >
          <TwitterXIcon className="h-5 w-5" />
        </a>
        <a
          href={discordHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Discord"
          className="transition-colors hover:text-foreground"
        >
          <DiscordIcon className="h-5 w-5" />
        </a>
        <a
          href={githubHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          className="transition-colors hover:text-foreground"
        >
          <GithubIcon className="h-5 w-5" />
        </a>
      </div>

      <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-4 sm:text-sm">
        {version && (
          <span className="order-last whitespace-nowrap sm:order-first">
            v{version}
          </span>
        )}
        {version && (
          <span aria-hidden className="hidden sm:inline">
            ·
          </span>
        )}
        <div className="flex items-center gap-3 sm:contents">
          <a
            href={termsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap transition-colors hover:text-foreground"
          >
            {termsLabel ?? t("footer.terms")}
          </a>
          <a
            href={privacyHref}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap transition-colors hover:text-foreground"
          >
            {privacyLabel ?? t("footer.privacy")}
          </a>
        </div>
      </div>
    </footer>
  );
}
