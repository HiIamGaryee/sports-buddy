import type { AreaId } from '@/types/sports-profile'

export interface AreaDefinition {
  id: AreaId
  name: string
}

/** Approximate areas only — Sports Buddy never stores precise locations. */
export const AREAS = [
  { id: 'kuala-lumpur', name: 'Kuala Lumpur' },
  { id: 'petaling-jaya', name: 'Petaling Jaya' },
  { id: 'subang-jaya', name: 'Subang Jaya' },
  { id: 'shah-alam', name: 'Shah Alam' },
  { id: 'puchong', name: 'Puchong' },
  { id: 'cheras', name: 'Cheras' },
  { id: 'ampang', name: 'Ampang' },
  { id: 'kepong', name: 'Kepong' },
  { id: 'setapak', name: 'Setapak' },
] as const satisfies readonly AreaDefinition[]
