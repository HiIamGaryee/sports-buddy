import {
  CircleDot,
  Dumbbell,
  Footprints,
  Goal,
  Mountain,
  Target,
  Volleyball,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import general from '@/data/general.json'
import sportList from '@/data/sport-list.json'
import type { SportId } from '@/types/sports-profile'

export interface SportDefinition {
  id: SportId
  name: string
  icon: LucideIcon
  is_show: boolean
}

const SPORT_ICONS = {
  zap: Zap,
  footprints: Footprints,
  target: Target,
  mountain: Mountain,
  dumbbell: Dumbbell,
  'circle-dot': CircleDot,
  goal: Goal,
  volleyball: Volleyball,
} satisfies Record<string, LucideIcon>

/** Complete catalogue, including sports hidden from future selection screens. */
export const ALL_SPORTS: readonly SportDefinition[] = sportList.map((sport) => ({
  id: sport.id as SportId,
  name: sport.name,
  icon: SPORT_ICONS[sport.icon as keyof typeof SPORT_ICONS],
  is_show: sport.is_show,
}))

/** Shared display list. Set `is_show` to false in sport-list.json to hide a sport. */
export const SPORTS = ALL_SPORTS.filter(({ is_show }) => is_show)

export const MAX_SPORTS = general.profile.sports.freeLimit
export const MAX_BUDDY_PLUS_SPORTS = general.profile.sports.buddyPlusLimit
