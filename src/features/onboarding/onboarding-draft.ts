import { ONBOARDING_DRAFT_KEY } from '@/constants/app'
import type { ProfileDraft } from '@/lib/profile-draft'
import { clearStore, readStore, writeStore } from '@/lib/storage'

interface StoredDraft {
  userId: string
  draft: ProfileDraft
}

/** Draft persistence lives here only — no component touches storage. */
export const onboardingDraftStore = {
  read(userId: string): ProfileDraft | null {
    const stored = readStore<StoredDraft | null>(ONBOARDING_DRAFT_KEY, null)
    return stored?.userId === userId ? stored.draft : null
  },
  write(userId: string, draft: ProfileDraft) {
    writeStore(ONBOARDING_DRAFT_KEY, { userId, draft } satisfies StoredDraft)
  },
  clear() {
    clearStore(ONBOARDING_DRAFT_KEY)
  },
}
