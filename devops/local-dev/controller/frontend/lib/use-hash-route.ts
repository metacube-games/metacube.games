import { useEffect, useState } from "react";

/**
 * Tiny hash-based router. Returns the current `window.location.hash` (e.g.
 * "#services") and keeps it in sync via the `hashchange` event. Used by the
 * controller to swap views when the user clicks a nav item, mirroring the
 * way the market's Next.js routes swap pages.
 */
export function useHashRoute(defaultHash: string): string {
  const [hash, setHash] = useState<string>(() => {
    if (typeof window === "undefined") return defaultHash;
    return window.location.hash || defaultHash;
  });

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, "", defaultHash);
    }
    const onChange = () =>
      setHash(window.location.hash || defaultHash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, [defaultHash]);

  return hash;
}
