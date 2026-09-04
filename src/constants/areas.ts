import type { AreaId } from '@/types/sports-profile'

/**
 * APPROXIMATE regional grouping — a coarse "same side of the Klang Valley"
 * bucket, NOT travel distance. It exists so compatibility can say "same
 * general region" instead of pretending to know kilometres. When real
 * coordinates arrive this is replaced by a distance provider.
 */
export type AreaRegion = 'kl-city' | 'west-klang-valley' | 'south-klang-valley'

export interface AreaDefinition {
  id: AreaId
  name: string
  region: AreaRegion
}

/** Approximate areas only — Sports Buddy never stores precise locations. */
export const AREAS = [
  { id: 'kuala-lumpur', name: 'Kuala Lumpur', region: 'kl-city' },
  { id: 'petaling-jaya', name: 'Petaling Jaya', region: 'west-klang-valley' },
  { id: 'subang-jaya', name: 'Subang Jaya', region: 'west-klang-valley' },
  { id: 'shah-alam', name: 'Shah Alam', region: 'west-klang-valley' },
  { id: 'puchong', name: 'Puchong', region: 'south-klang-valley' },
  { id: 'cheras', name: 'Cheras', region: 'kl-city' },
  { id: 'ampang', name: 'Ampang', region: 'kl-city' },
  { id: 'kepong', name: 'Kepong', region: 'kl-city' },
  { id: 'setapak', name: 'Setapak', region: 'kl-city' },
] as const satisfies readonly AreaDefinition[]

export const getAreaRegion = (area: AreaId | null): AreaRegion | null =>
  AREAS.find((option) => option.id === area)?.region ?? null
