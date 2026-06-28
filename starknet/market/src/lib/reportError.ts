// Single error-reporting sink. Prefer using this over silent `catch {}` so
// that reviewers can tell errors are handled deliberately and swapping in
// a real reporting backend (Sentry, etc.) is a one-line change.
export function reportError(scope: string, err: unknown): void {
  // eslint-disable-next-line no-console
  console.error(`[${scope}]`, err);
}
