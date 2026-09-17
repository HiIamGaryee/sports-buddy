export const ROUTES = {
  root: '/',
  auth: '/auth',
  login: '/auth/login',
  register: '/auth/register',
  privacy: '/privacy',
  onboarding: '/onboarding',
  completeProfile: '/complete-profile',
  home: '/home',
  map: '/map',
  discover: '/discover',
  postActivity: '/discover/post-activity',
  editActivityPost: '/discover/post-activity/:postId',
  inviteActivity: '/discover/post-activity/invite/:userId',
  activityPost: '/discover/activity/:postId',
  /** The public share link. Works signed out; see `shared-activity-page`. */
  sharedActivity: '/activity/:postId',
  sharedGroupActivity: '/group-activity/:activityId',
  buddyProfile: '/discover/:userId',
  createGroupActivity: '/discover/group-activities/new',
  editGroupActivity: '/discover/group-activities/:activityId/edit',
  groupActivityDetail: '/discover/group-activities/:activityId',
  activities: '/activities',
  activityDetail: '/activities/:activityId',
  messages: '/messages',
  conversation: '/messages/:conversationId',
  plan: '/messages/:conversationId/plan',
  profile: '/profile',
  profileEdit: '/profile/edit',
  settings: '/settings',
  discoverySettings: '/settings/discovery',
  paywall: '/buddy-plus',
  recap: '/recap',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

export const buddyProfilePath = (userId: string) => `/discover/${userId}`

export const groupActivityDetailPath = (activityId: string) =>
  `/discover/group-activities/${activityId}`

export const editGroupActivityPath = (activityId: string) =>
  `/discover/group-activities/${activityId}/edit`

/** The same form as posting, prefilled; only the author can save it. */
export const editActivityPostPath = (postId: string) =>
  `/discover/post-activity/${postId}`

/** A private 1v1 invite for one connected buddy, usually opened from chat. */
export const inviteActivityPath = (userId: string) =>
  `/discover/post-activity/invite/${userId}`

/** One activity post, inside the signed-in app. */
export const activityPostPath = (postId: string) => `/discover/activity/${postId}`

/** The conversation id IS the connection id — see docs/chat.md. */
export const conversationPath = (conversationId: string) =>
  `/messages/${conversationId}`

/** A confirmed activity lives at its source plan's id — see docs/activities.md. */
export const activityPath = (activityId: string) => `/activities/${activityId}`

/** The plan shares the conversation's (and connection's) id — see docs/planning.md. */
export const planPath = (conversationId: string) =>
  `/messages/${conversationId}/plan`
