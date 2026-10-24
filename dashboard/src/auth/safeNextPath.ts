// Only same-app paths, so /login?next=//other.site can't send the admin elsewhere.
export function safeNextPath(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/notes'
}
