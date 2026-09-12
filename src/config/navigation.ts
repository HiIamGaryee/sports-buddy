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

/** Single source of truth for the main app tabs. */
export const mainNavigation: readonly NavigationItem[] = [
  { label: 'Home', path: ROUTES.home, icon: buildingIcon },
  { label: 'Discover', path: ROUTES.discover, icon: compassIcon },
  { label: 'Activities', path: ROUTES.activities, icon: clipboardIcon },
  { label: 'Messages', path: ROUTES.messages, icon: newsIcon },
  { label: 'Profile', path: ROUTES.profile, icon: shirtIcon },
]
