export const ROUTES = {
  root: '/',
  auth: '/auth',
  login: '/auth/login',
  register: '/auth/register',
  privacy: '/privacy',
  onboarding: '/onboarding',
  home: '/home',
  map: '/map',
  discover: '/discover',
  postActivity: '/discover/post-activity',
  buddyProfile: '/discover/:userId',
  activities: '/activities',
  activityDetail: '/activities/:activityId',
  messages: '/messages',
  conversation: '/messages/:conversationId',
  plan: '/messages/:conversationId/plan',
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

/** A confirmed activity lives at its source plan's id — see docs/activities.md. */
export const activityPath = (activityId: string) => `/activities/${activityId}`

/** The plan shares the conversation's (and connection's) id — see docs/planning.md. */
export const planPath = (conversationId: string) =>
  `/messages/${conversationId}/plan`
