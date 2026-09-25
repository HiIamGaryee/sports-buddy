import { useEffect, useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { attendanceService } from '@/services/attendance/attendance-service'

/**
 * Which activities the signed-in member has ALREADY checked into.
 *
 * Every card that can offer a check-in asks this, and a list can hold many
 * cards, so the read is shared: one in-flight promise per user, cached here.
 * Without that, opening Discover with ten activities would fire ten identical
 * queries (the N+1 rule that Discover's profile batching already avoids).
 *
 * A check-in is immutable, so a cached answer cannot go stale in the wrong
 * direction — and `markCheckedIn()` adds the one that just happened, so the
 * card updates immediately without re-reading.
 */
let cache: { userId: string; ids: Promise<Set<string>> } | null = null

function load(userId: string): Promise<Set<string>> {
  if (cache?.userId === userId) return cache.ids
  const ids = attendanceService
    .listMine(userId)
    .then((records) => new Set(records.map((record) => record.activityId)))
    .catch(() => new Set<string>())
  cache = { userId, ids }
  return ids
}

/** Drops the cache, so the next reader sees a freshly recorded check-in. */
export function markCheckedIn(userId: string, activityId: string) {
  const current = cache
  if (current?.userId !== userId) return
  cache = {
    userId,
    ids: current.ids.then((ids) => new Set(ids).add(activityId)),
  }
}

export function useMyCheckIns(): { checkedInIds: ReadonlySet<string> } {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [checkedInIds, setCheckedInIds] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    if (!userId) {
      setCheckedInIds(new Set())
      return
    }
    let active = true
    void load(userId).then((ids) => {
      if (active) setCheckedInIds(ids)
    })
    return () => {
      active = false
    }
  }, [userId])

  return { checkedInIds }
}
