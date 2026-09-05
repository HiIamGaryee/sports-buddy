import type { GeoPoint } from '@/types/venue'
import type { SportId } from '@/types/sports-profile'

/**
 * Development venues for `VITE_VENUE_SOURCE=mock`. Real Klang Valley places
 * at approximate public coordinates, tagged with the sports they actually
 * suit, so a search only ever returns something plausible.
 *
 * No photos and no prices: Places does not reliably return court pricing, and
 * inventing it would be worse than omitting it.
 */
export interface MockVenue {
  id: string
  name: string
  address: string
  location: GeoPoint
  rating: number | null
  ratingCount: number | null
  primaryType: string
  sports: readonly SportId[]
}

export const MOCK_VENUES = [
  {
    id: 'mock_sj_badminton',
    name: 'Subang Jaya Badminton Centre',
    address: 'Jalan SS 15/4, SS 15, Subang Jaya, Selangor',
    location: { lat: 3.0722, lng: 101.5865 },
    rating: 4.4,
    ratingCount: 312,
    primaryType: 'sports_complex',
    sports: ['badminton'],
  },
  {
    id: 'mock_usj_sports_arena',
    name: 'USJ Sports Arena',
    address: 'Jalan USJ 21/10, UEP Subang Jaya, Selangor',
    location: { lat: 3.0421, lng: 101.5836 },
    rating: 4.2,
    ratingCount: 188,
    primaryType: 'sports_complex',
    sports: ['badminton', 'futsal', 'basketball', 'pickleball'],
  },
  {
    id: 'mock_pj_racquet_club',
    name: 'Petaling Jaya Racquet Club',
    address: 'Jalan 13/6, Seksyen 13, Petaling Jaya, Selangor',
    location: { lat: 3.1096, lng: 101.6371 },
    rating: 4.5,
    ratingCount: 421,
    primaryType: 'sports_club',
    sports: ['badminton', 'tennis', 'pickleball'],
  },
  {
    id: 'mock_pj_climb_lab',
    name: 'Climb Lab PJ',
    address: 'Jalan 51A/227, Seksyen 51A, Petaling Jaya, Selangor',
    location: { lat: 3.0994, lng: 101.6432 },
    rating: 4.7,
    ratingCount: 596,
    primaryType: 'climbing_gym',
    sports: ['climbing'],
  },
  {
    id: 'mock_sa_boulder_house',
    name: 'Boulder House Shah Alam',
    address: 'Seksyen 13, Shah Alam, Selangor',
    location: { lat: 3.0705, lng: 101.5271 },
    rating: 4.6,
    ratingCount: 274,
    primaryType: 'climbing_gym',
    sports: ['climbing', 'gym'],
  },
  {
    id: 'mock_kelana_jaya_park',
    name: 'Kelana Jaya Lake Park',
    address: 'Jalan SS 7/1, Kelana Jaya, Petaling Jaya, Selangor',
    location: { lat: 3.1017, lng: 101.5967 },
    rating: 4.5,
    ratingCount: 1_842,
    primaryType: 'park',
    sports: ['running'],
  },
  {
    id: 'mock_sa_stadium_track',
    name: 'Shah Alam Stadium Running Track',
    address: 'Persiaran Sukan, Seksyen 13, Shah Alam, Selangor',
    location: { lat: 3.0708, lng: 101.5163 },
    rating: 4.3,
    ratingCount: 903,
    primaryType: 'stadium',
    sports: ['running'],
  },
  {
    id: 'mock_pj_futsal_park',
    name: 'PJ Futsal Park',
    address: 'Jalan 19/1, Seksyen 19, Petaling Jaya, Selangor',
    location: { lat: 3.1121, lng: 101.6294 },
    rating: 4.1,
    ratingCount: 233,
    primaryType: 'sports_complex',
    sports: ['futsal', 'basketball'],
  },
  {
    id: 'mock_puchong_sports_hub',
    name: 'Puchong Community Sports Hub',
    address: 'Jalan Puchong, Bandar Puteri, Puchong, Selangor',
    location: { lat: 3.0261, lng: 101.6193 },
    rating: 4.0,
    ratingCount: 141,
    primaryType: 'sports_complex',
    sports: ['badminton', 'basketball', 'futsal'],
  },
  {
    id: 'mock_kl_tennis_centre',
    name: 'KL Tennis Centre',
    address: 'Jalan Damansara, Bukit Damansara, Kuala Lumpur',
    location: { lat: 3.1443, lng: 101.6631 },
    rating: 4.4,
    ratingCount: 358,
    primaryType: 'sports_complex',
    sports: ['tennis', 'pickleball'],
  },
  {
    id: 'mock_ss2_fitness',
    name: 'SS2 Fitness Studio',
    address: 'Jalan SS 2/64, SS 2, Petaling Jaya, Selangor',
    location: { lat: 3.1174, lng: 101.6238 },
    rating: 4.2,
    ratingCount: 197,
    primaryType: 'gym',
    sports: ['gym'],
  },
  {
    id: 'mock_cheras_sports_complex',
    name: 'Cheras Sports Complex',
    address: 'Jalan Manis, Taman Segar, Cheras, Kuala Lumpur',
    location: { lat: 3.0902, lng: 101.7387 },
    rating: 3.9,
    ratingCount: 512,
    primaryType: 'sports_complex',
    sports: ['badminton', 'basketball', 'futsal', 'gym'],
  },
] as const satisfies readonly MockVenue[]
