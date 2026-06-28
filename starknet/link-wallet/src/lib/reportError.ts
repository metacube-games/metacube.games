// Single error-reporting sink. Prefer over silent catch {} so errors are
// clearly intentional and swapping in Sentry (etc.) is a one-line change.
// `scope` should be a short, stable call-site identifier.
export function reportError(scope: string, err: unknown): void {
  // eslint-disable-next-line no-console
  console.error(`[${scope}]`, err);
}
