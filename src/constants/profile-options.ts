import { Flame, Leaf, Gauge, Sparkles, Timer, Trophy, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type {
  ActivityIntensity,
  BudgetPreference,
  DayPeriod,
  SkillLevel,
  SportsIntent,
  WeekDay,
} from '@/types/sports-profile'

export const SKILL_LEVELS = [
  { id: 'beginner', label: 'Beginner', hint: 'Just starting out' },
  { id: 'casual', label: 'Casual', hint: 'Play for fun' },
  { id: 'intermediate', label: 'Intermediate', hint: 'Comfortable and steady' },
  { id: 'advanced', label: 'Advanced', hint: 'Strong and experienced' },
] as const satisfies readonly { id: SkillLevel; label: string; hint: string }[]

export const SPORTS_INTENTS = [
  {
    id: 'casual',
    label: 'Casual Sports Buddy',
    description: 'Play without making it a second job.',
    icon: Sparkles,
  },
  {
    id: 'training',
    label: 'Training Partner',
    description: 'Stay consistent and improve together.',
    icon: Timer,
  },
  {
    id: 'competitive',
    label: 'Competitive Partner',
    description: 'Train hard and challenge each other.',
    icon: Trophy,
  },
  {
    id: 'social',
    label: 'New Sports Friends',
    description: 'Meet people through shared activities.',
    icon: Users,
  },
] as const satisfies readonly {
  id: SportsIntent
  label: string
  description: string
  icon: LucideIcon
}[]

export const ACTIVITY_INTENSITIES = [
  { id: 'relaxed', label: 'Relaxed', hint: 'Easy pace, good company', icon: Leaf },
  { id: 'moderate', label: 'Moderate', hint: 'A proper workout', icon: Gauge },
  { id: 'high', label: 'High Energy', hint: 'Go hard every session', icon: Flame },
] as const satisfies readonly {
  id: ActivityIntensity
  label: string
  hint: string
  icon: LucideIcon
}[]

export const WEEK_DAYS = [
  { id: 'monday', label: 'Monday', short: 'Mon' },
  { id: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { id: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { id: 'thursday', label: 'Thursday', short: 'Thu' },
  { id: 'friday', label: 'Friday', short: 'Fri' },
  { id: 'saturday', label: 'Saturday', short: 'Sat' },
  { id: 'sunday', label: 'Sunday', short: 'Sun' },
] as const satisfies readonly { id: WeekDay; label: string; short: string }[]

export const DAY_PERIODS = [
  { id: 'morning', label: 'Morning', short: 'AM' },
  { id: 'afternoon', label: 'Afternoon', short: 'PM' },
  { id: 'evening', label: 'Evening', short: 'Eve' },
] as const satisfies readonly { id: DayPeriod; label: string; short: string }[]

export const RADIUS_OPTIONS = [5, 10, 15, 20, 30] as const
export const DEFAULT_RADIUS_KM = 10

export const BUDGET_OPTIONS = [
  { id: 'rm0-10', label: 'RM0–10', budget: { min: 0, max: 10 } },
  { id: 'rm10-20', label: 'RM10–20', budget: { min: 10, max: 20 } },
  { id: 'rm20-40', label: 'RM20–40', budget: { min: 20, max: 40 } },
  { id: 'rm40-60', label: 'RM40–60', budget: { min: 40, max: 60 } },
  { id: 'rm60-plus', label: 'RM60+', budget: { min: 60, max: null } },
  { id: 'flexible', label: 'Flexible', budget: { min: 0, max: null } },
] as const satisfies readonly {
  id: string
  label: string
  budget: BudgetPreference
}[]

export const MAX_BIO_LENGTH = 160

/** Profile photo upload limits, shared by the picker and the service. */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024
export const AVATAR_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
/** Cloudinary delivery transform: a face-centred square, auto format/quality. */
export const AVATAR_TRANSFORMATION = 'c_fill,g_face,w_320,h_320,f_auto,q_auto'
