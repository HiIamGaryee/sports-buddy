/** "Gary Tan" → "GT", "Gary" → "G", "" → "?" (never throws). */
export function getInitials(name: string | null | undefined, email = ''): string {
  const source = name?.trim() || email.trim()
  if (!source) return '?'

  const parts = source.split(/\s+/).filter(Boolean)
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')

  return (initials || source[0] || '?').toUpperCase()
}
