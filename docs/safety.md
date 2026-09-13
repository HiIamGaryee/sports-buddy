# Safety (STEP 14B)

Sports Buddy treats Block and Report as distinct actions. A block is a directional safety relationship at `blocks/{blockerId}__{blockedUserId}`; it is idempotent, does not delete connections, messages or activities, and denies all new interaction when either directional record exists. Firebase clients only read their own outgoing blocks, avoiding disclosure of who blocked them; Firestore rules enforce the pair check for connections, conversations, messages, plans and activity confirmation.

Discover and Messages exclude locally blocked people before rendering. Direct chat routes resolve to the generic unavailable state. Existing activity history remains participant-readable. Mock blocks and reports persist in local storage.

Reports are private, write-only records at `reports/{reportId}` with `reporterId`, `reportedUserId`, typed reason (`harassment`, `spam`, `inappropriate-content`, `fake-profile`, `safety-concern`, `other`), optional 500-character plain-text note, profile/conversation context, `submitted` status and timestamp. Normal clients cannot read, update or delete reports; no moderator dashboard or automatic action exists. Account deletion is intentionally deferred to STEP 15B.
