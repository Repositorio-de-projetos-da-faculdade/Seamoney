/** Only same-site paths are accepted as a destination after signing in, so the form cannot redirect elsewhere. */
export function safeNext(next: unknown, fallback = '/dashboard'): string {
  if (typeof next !== 'string' || !next.startsWith('/')) return fallback
  // "//host" and "/\host" are read by browsers as another site
  if (next.startsWith('//') || next.startsWith('/\\')) return fallback
  return next
}
