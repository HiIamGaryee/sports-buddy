/** Venue failure with a message that is safe to show a user. */
export class VenueError extends Error {
  readonly isConfiguration: boolean

  constructor(message: string, isConfiguration = false) {
    super(message)
    this.name = 'VenueError'
    this.isConfiguration = isConfiguration
  }
}

export const VENUE_FALLBACK_MESSAGES = {
  search: "We couldn't load venues.",
  invalid: "That venue's details look wrong, so it wasn't saved.",
  noArea: 'Add your area to your profile to search for venues.',
} as const

/** Kept for callers that distinguish provider setup errors from network errors. */
export const VENUE_NOT_CONFIGURED_MESSAGE =
  'Venue search is not configured. Set VITE_VENUE_SOURCE=openstreetmap, configure Google Maps, or use mock mode.'

const getCode = (error: unknown): string =>
  typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : ''

export function toVenueError(error: unknown, fallback: string): VenueError {
  if (error instanceof VenueError) return error
  if (getCode(error) === 'venue/not-configured') {
    return new VenueError(
      import.meta.env.DEV ? VENUE_NOT_CONFIGURED_MESSAGE : fallback,
      true,
    )
  }
  // A provider status code never reaches the user.
  return new VenueError(fallback)
}
