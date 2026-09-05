import type { GeoPoint } from '@/types/venue'
import type { AreaId } from '@/types/sports-profile'

/**
 * APPROXIMATE regional grouping — a coarse "same side of the Klang Valley"
 * bucket, NOT travel distance. It exists so compatibility can say "same
 * general region" instead of pretending to know kilometres.
 */
export type AreaRegion = 'kl-city' | 'west-klang-valley' | 'south-klang-valley'

export interface AreaDefinition {
  id: AreaId
  name: string
  region: AreaRegion
  /**
   * The PUBLIC approximate centre of the area — a town centroid, the same
   * thing a map label points at. It describes a place on a map, never a
   * person: it is not anyone's home, and it does not move.
   *
   * Its only job is to seed a fair venue search between two areas. Nothing
   * derived from it may ever be presented as a user's location.
   */
  center: GeoPoint
}

/** Approximate areas only — Sports Buddy never stores precise locations. */
export const AREAS = [
  {
    id: 'kuala-lumpur',
    name: 'Kuala Lumpur',
    region: 'kl-city',
    center: { lat: 3.139, lng: 101.6869 },
  },
  {
    id: 'petaling-jaya',
    name: 'Petaling Jaya',
    region: 'west-klang-valley',
    center: { lat: 3.1073, lng: 101.6067 },
  },
  {
    id: 'subang-jaya',
    name: 'Subang Jaya',
    region: 'west-klang-valley',
    center: { lat: 3.0568, lng: 101.5851 },
  },
  {
    id: 'shah-alam',
    name: 'Shah Alam',
    region: 'west-klang-valley',
    center: { lat: 3.0733, lng: 101.5185 },
  },
  {
    id: 'puchong',
    name: 'Puchong',
    region: 'south-klang-valley',
    center: { lat: 3.0298, lng: 101.6178 },
  },
  {
    id: 'cheras',
    name: 'Cheras',
    region: 'kl-city',
    center: { lat: 3.0833, lng: 101.75 },
  },
  {
    id: 'ampang',
    name: 'Ampang',
    region: 'kl-city',
    center: { lat: 3.15, lng: 101.76 },
  },
  {
    id: 'kepong',
    name: 'Kepong',
    region: 'kl-city',
    center: { lat: 3.2167, lng: 101.6333 },
  },
  {
    id: 'setapak',
    name: 'Setapak',
    region: 'kl-city',
    center: { lat: 3.1957, lng: 101.7157 },
  },
] as const satisfies readonly AreaDefinition[]

export const getAreaRegion = (area: AreaId | null): AreaRegion | null =>
  AREAS.find((option) => option.id === area)?.region ?? null

/** The area's public centroid — see `AreaDefinition.center`. */
export const getAreaCenter = (area: AreaId | null): GeoPoint | null =>
  AREAS.find((option) => option.id === area)?.center ?? null
