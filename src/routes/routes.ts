export const ROUTES = {
  root: '/',
  auth: '/auth',
  login: '/auth/login',
  register: '/auth/register',
  onboarding: '/onboarding',
  home: '/home',
  discover: '/discover',
  buddyProfile: '/discover/:userId',
  activities: '/activities',
  messages: '/messages',
  conversation: '/messages/:conversationId',
  profile: '/profile',
  profileEdit: '/profile/edit',
  settings: '/settings',
  discoverySettings: '/settings/discovery',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

export const buddyProfilePath = (userId: string) => `/discover/${userId}`

/** The conversation id IS the connection id — see docs/chat.md. */
export const conversationPath = (conversationId: string) =>
  `/messages/${conversationId}`
