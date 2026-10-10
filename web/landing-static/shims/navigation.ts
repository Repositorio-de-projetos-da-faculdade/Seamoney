/**
 * Stand-in for next/navigation in the static build. The only use on the landing is the language switch, which sets
 * a cookie and refreshes: here a reload reads the cookie again (see main.tsx).
 */
export function useRouter() {
  return {
    refresh: () => window.location.reload(),
    push: (href: string) => window.location.assign(href),
  }
}
