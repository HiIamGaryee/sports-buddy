import buildingIcon from '@/assets/svg/building-svgrepo-com.svg'
import clipboardIcon from '@/assets/svg/clipboard-svgrepo-com.svg'
import compassIcon from '@/assets/svg/compas-svgrepo-com.svg'
import newsIcon from '@/assets/svg/news-svgrepo-com.svg'
import shirtIcon from '@/assets/svg/shirt-svgrepo-com.svg'
import { ROUTES } from '@/routes/routes'
import type { AppRoute } from '@/routes/routes'

export interface NavigationItem {
  label: string
  path: AppRoute
  /** An imported SVG asset from `src/assets/svg`. */
  icon: string
}

/**
 * Live counts shown as a dot on a destination, keyed by its path. Only routes
 * with something genuinely unread appear; the navigation shells just render
 * what they are handed and never compute it.
 */
export type NavigationBadges = Partial<Record<AppRoute, number>>

/** Single source of truth for the main app tabs. */
export const mainNavigation: readonly NavigationItem[] = [
  { label: 'Home', path: ROUTES.home, icon: buildingIcon },
  { label: 'Discover', path: ROUTES.discover, icon: compassIcon },
  { label: 'Activities', path: ROUTES.activities, icon: clipboardIcon },
  { label: 'Messages', path: ROUTES.messages, icon: newsIcon },
  { label: 'Profile', path: ROUTES.profile, icon: shirtIcon },
]

/**
 * The phone bar shows every destination: there are five, which is exactly
 * what fits within thumb reach. (The Map destination was removed from the
 * navigation entirely — the map view is not finished, and a tab that opens
 * something broken is worse than no tab.)
 */
export const mobileBottomNavigation = mainNavigation
