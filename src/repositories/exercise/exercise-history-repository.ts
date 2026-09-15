import type { ExerciseActivity } from '@/types/exercise'

/**
 * Where exercise history comes from. Today it is a bundled JSON file; later it
 * can read confirmed `activities/{id}` documents instead. Nothing above this
 * line knows or cares which — the recap calculation, the Profile banner and
 * the share card all consume `ExerciseActivity[]`.
 */
export interface ExerciseHistoryRepository {
  getActivities(): Promise<ExerciseActivity[]>
}
