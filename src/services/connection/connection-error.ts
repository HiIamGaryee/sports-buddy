/** Connection failure with a message that is safe to show a user. */
export class ConnectionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConnectionError'
  }
}

/** Domain codes raised by the repositories. Never a raw Firebase code. */
export const CONNECTION_ERROR_CODES = {
  self: 'connection/self',
  notYourRequest: 'connection/not-your-request',
  alreadyConnected: 'connection/already-connected',
} as const

const MESSAGES: Record<string, string> = {
  [CONNECTION_ERROR_CODES.self]: "You can't connect with yourself.",
  [CONNECTION_ERROR_CODES.notYourRequest]:
    'Only the person who sent a request can cancel it.',
  [CONNECTION_ERROR_CODES.alreadyConnected]:
    "You're already connected, so there's no request to cancel.",
}

/** Fallbacks per operation — a provider error string is never shown. */
export const CONNECTION_FALLBACK_MESSAGES = {
  connect: "We couldn't send your connection request. Please try again.",
  cancel: "We couldn't cancel your request. Please try again.",
  load: "We couldn't load your connections.",
} as const

export const connectionError = (code: string) =>
  Object.assign(new Error(code), { code })

const getCode = (error: unknown): string =>
  typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : ''

export function toConnectionError(
  error: unknown,
  fallback: string,
): ConnectionError {
  const message = MESSAGES[getCode(error)]
  return new ConnectionError(message ?? fallback)
}
