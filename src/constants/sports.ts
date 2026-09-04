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

import type { SportId } from '@/types/sports-profile'

export interface SportDefinition {
  id: SportId
  name: string
  icon: LucideIcon
}

/** Deliberately focused MVP catalogue. */
export const SPORTS = [
  { id: 'badminton', name: 'Badminton', icon: Zap },
  { id: 'running', name: 'Running', icon: Footprints },
  { id: 'pickleball', name: 'Pickleball', icon: Target },
  { id: 'climbing', name: 'Climbing', icon: Mountain },
  { id: 'gym', name: 'Gym', icon: Dumbbell },
  { id: 'tennis', name: 'Tennis', icon: CircleDot },
  { id: 'futsal', name: 'Futsal', icon: Goal },
  { id: 'basketball', name: 'Basketball', icon: Volleyball },
] as const satisfies readonly SportDefinition[]

export const MAX_SPORTS = 5
