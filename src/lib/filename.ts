/**
 * A filename is its own escaping context, with rules neither HTML nor a URL
 * shares. This is the one function that guarantees a path separator, a `..`,
 * a control character or a leading dot can never reach a `download`
 * attribute — an explicit blocklist would miss cases this allowlist covers.
 */
export function toFilenameSlug(label: string, maxLength = 40): string {
  return label
    .toLowerCase()
    // Anything outside a-z, 0-9 becomes a separator. That covers `/`, `\`,
    // `..`, control characters, spaces and every Unicode script at once.
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '')
}

/**
 * `sports-buddy-january-2027-recap.png`. Prefix and extension are developer
 * literals, so the result is always a recognisable `.png` even when the label
 * slugs away to nothing.
 */
export function buildRecapFilename(monthLabel: string): string {
  const slug = toFilenameSlug(monthLabel)
  return `sports-buddy${slug ? `-${slug}` : ''}-recap.png`
}
