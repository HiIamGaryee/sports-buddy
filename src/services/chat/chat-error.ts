import { MAX_MESSAGE_LENGTH } from '@/constants/chat'

/** Chat failure with a message that is safe to show a user. */
export class ChatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ChatError'
  }
}

export const CHAT_ERROR_CODES = {
  notConnected: 'chat/not-connected',
  empty: 'chat/empty',
  tooLong: 'chat/too-long',
} as const

const MESSAGES: Record<string, string> = {
  [CHAT_ERROR_CODES.notConnected]:
    "You can only message sports buddies you're connected with.",
  [CHAT_ERROR_CODES.empty]: 'Type a message first.',
  [CHAT_ERROR_CODES.tooLong]: `Messages can be up to ${MAX_MESSAGE_LENGTH} characters.`,
}

/** Fallbacks per operation — a provider error string is never shown. */
export const CHAT_FALLBACK_MESSAGES = {
  open: "We couldn't load this conversation.",
  load: "We couldn't load these messages.",
  send: "Message wasn't sent. Try again.",
} as const

export const chatError = (code: string) =>
  Object.assign(new Error(code), { code })

const getCode = (error: unknown): string =>
  typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : ''

export function toChatError(error: unknown, fallback: string): ChatError {
  const message = MESSAGES[getCode(error)]
  return new ChatError(message ?? fallback)
}
