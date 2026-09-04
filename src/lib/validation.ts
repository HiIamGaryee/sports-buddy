const MIN_NAME_LENGTH = 2
const MAX_NAME_LENGTH = 40

export function validateDisplayName(name: string): string | undefined {
  const value = name.trim()
  if (!value) return 'Display name is required.'
  if (value.length < MIN_NAME_LENGTH) return 'That name is a little short.'
  if (value.length > MAX_NAME_LENGTH) return 'That name is too long.'
  return undefined
}
