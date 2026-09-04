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
  profile: '/profile',
  profileEdit: '/profile/edit',
  settings: '/settings',
  discoverySettings: '/settings/discovery',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

export const buddyProfilePath = (userId: string) => `/discover/${userId}`
