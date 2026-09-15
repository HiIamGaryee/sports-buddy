import lastMonthExercise from '@/data/last-month-exercise.json'
import { toExerciseActivities } from '@/repositories/exercise/exercise-document'
import type { ExerciseHistoryRepository } from '@/repositories/exercise/exercise-history-repository'

/**
 * The ONE place `last-month-exercise.json` is imported. Pages, the recap
 * dialog and the share card all go through the service above this, so the file
 * is never read from three different components.
 *
 * Promise-based even though the import is synchronous, so swapping in a
 * Firestore-backed repository later changes no call site.
 */
export const jsonExerciseHistoryRepository: ExerciseHistoryRepository = {
  getActivities: async () => toExerciseActivities(lastMonthExercise),
}
