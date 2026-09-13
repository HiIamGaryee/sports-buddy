import { CalendarDays, Compass, House, MessageCircle, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { ROUTES } from '@/routes/routes'
import type { AppRoute } from '@/routes/routes'

export interface NavigationItem {
  label: string
  path: AppRoute
  icon: LucideIcon
}

/**
 * Live counts shown as a dot on a destination, keyed by its path. Only routes
 * with something genuinely unread appear; the navigation shells just render
 * what they are handed and never compute it.
 */
export type NavigationBadges = Partial<Record<AppRoute, number>>

/** Single source of truth for the main app tabs. */
export const mainNavigation: readonly NavigationItem[] = [
  { label: 'Home', path: ROUTES.home, icon: House },
  { label: 'Discover', path: ROUTES.discover, icon: Compass },
  { label: 'Activities', path: ROUTES.activities, icon: CalendarDays },
  { label: 'Messages', path: ROUTES.messages, icon: MessageCircle },
  { label: 'Profile', path: ROUTES.profile, icon: User },
]
