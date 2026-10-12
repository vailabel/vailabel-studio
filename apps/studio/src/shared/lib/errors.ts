/**
 * Human-readable text for anything that was thrown. IPC rejections arrive as
 * plain strings, so non-Error values are stringified unless a `fallback` is
 * given for cases where the raw value would mean nothing to the user.
 */
export const toErrorMessage = (error: unknown, fallback?: string): string =>
  error instanceof Error ? error.message : (fallback ?? String(error))
