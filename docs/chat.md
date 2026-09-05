# Chat

Realtime text messaging between two mutually connected Sports Buddy members.

## 1. Scope

In: text messages, sender, timestamps, realtime delivery for the open
conversation, a conversation list with last-message previews, paginated
history, and empty / loading / error states.

Deliberately out: images, video, voice notes, files, GIFs, stickers, replies,
forwarding, reactions, typing indicators, presence, read receipts, seen
status, delivery ticks, editing, deletion, disappearing messages, group chat
and calls. This is reliable text communication, not a messaging platform.

There is also **no unread count and no bottom-nav badge**, because unread
semantics are not implemented and a fake badge is worse than none.

## 2. Authorization

**Only `connection.status === 'connected'` may access a conversation.**

| Connection state | Chat |
| --- | --- |
| `none` | no |
| `pending-outgoing` | no |
| `pending-incoming` | no |
| `connected` | yes |

Enforced in three places, and the third is the one that counts:

1. **UI** — a `Message` action appears only in the `connected` state, and
   `/messages/:conversationId` renders "This conversation is unavailable."
   for anything else.
2. **Service** — `chatService` guards `openConversation` and `sendMessage`
   with `canChat()`. Every guarded call takes a `Connection`, never a bare
   user id, so there is deliberately no
   `createConversation('some-random-user')`.
3. **Firestore rules** — every read and write reads
   `connections/{conversationId}` and requires `status == 'connected'` plus
   `request.auth.uid in participants`. Hidden buttons are not security.

`canChat()` (`src/lib/chat.ts`) does not re-derive relationship logic: it
calls STEP 8's `getConnectionState()` and accepts one answer. That is the
only thing crossing the chat/connection line — `chatService` never performs a
connection transition, and `connectionService` never touches a message.

## 3. Conversation schema

`conversations/{connectionId}`:

```jsonc
{
  "id": "aina__gary",                // equals the document id
  "connectionId": "aina__gary",      // and the connection
  "participants": ["aina", "gary"],  // exactly the connection's, immutable
  "lastMessageText": "Saturday evening works.",
  "lastMessageSenderId": "aina",
  "lastMessageAt": "<serverTimestamp>",
  "createdAt": "<serverTimestamp>",
  "updatedAt": "<serverTimestamp>"
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `id` / `connectionId` | `string` | both equal the document id; frozen after create |
| `participants` | `[string, string]` | exactly the connection's participants, sorted; immutable |
| `lastMessageText` | `string \| null` | denormalized preview for the list; `null` until the first message |
| `lastMessageSenderId` | `string \| null` | must equal the writer's uid |
| `lastMessageAt` | timestamp \| `null` | drives conversation ordering |
| `createdAt` / `updatedAt` | timestamp | server timestamps |

**No profile data is copied in** — no display name, email, photo url, sports
or bio. Those live in `publicProfiles/{uid}`; a copy here would be a second,
stale one outside the privacy boundary. Participant ids only.

## 4. Message schema

`conversations/{connectionId}/messages/{messageId}`:

```jsonc
{
  "id": "hT3k...",            // equals the document id
  "conversationId": "aina__gary",
  "senderId": "gary",
  "content": "Badminton Saturday?",
  "createdAt": "<serverTimestamp>"
}
```

Ids come from Firestore (`doc(collection(...))` pre-generates one) — never an
array index and never a timestamp string. Messages are **immutable**: create
only, no update, no delete. That keeps security, moderation history and the
MVP simple.

`createdAt` is a server timestamp, so a device clock can never dictate
ordering. For the instant between the local write and the server resolving
it, the domain object carries `createdAt: null`; every consumer tolerates it
(the bubble shows "Sending…", and the sort treats it as the newest message,
which is what it is).

## 5. `conversationId === connectionId`

The conversation lives at the STEP 8 pair id
(`createConnectionId(a, b)` — see `docs/connections.md` §4). No second
pair-id system exists.

That single decision buys:

- **authorization in one lookup** — the rules read
  `connections/{conversationId}` directly
- **navigation with no lookup** — a `Message` button links to
  `conversationPath(connection.id)`
- **no way to address a conversation you are not in**, because the id is
  derived from the pair

## 6. Lazy conversation creation

A conversation document is **not** created when two people connect. It is
created the first time a connected pair actually opens the chat:

```
connected → user opens /messages/:conversationId → ensureConversation()
```

`ensureConversation()` is idempotent (a Firestore transaction in Firebase
mode), so opening the same chat from two devices creates one document, and
opening it a hundred times changes nothing. Connected buddies who never chat
cost zero documents.

## 7. Realtime strategy

Two scoped subscriptions, and nothing else:

| Subscription | Scope | Why |
| --- | --- | --- |
| conversations | `participants array-contains currentUserId`, limit 100 | the list reorders and previews update live |
| recent messages | the open conversation, newest 20 | the other person's message appears without a refresh |

There is **no whole-history listener**, **no global messages listener**, and
no listener on any conversation the user is not in. The message listener
exists only while a conversation screen is mounted.

Combined with STEP 8's connections subscription, a signed-in session holds at
most three listeners, all scoped to that user.

## 8. Pagination

The realtime query is `orderBy('createdAt', 'desc') limit(20)`, so Firestore
returns newest-first and the repository reverses it — the UI always receives
**oldest → newest**. That flip happens in exactly one function
(`toMessagePage`), so realtime updates cannot accidentally reverse the list.

"Load earlier messages" is a button at the top of the thread, not infinite
scroll: simpler, and it never fires a query the user did not ask for.

Older pages use cursor pagination:

```
orderBy('createdAt', 'desc')  startAfter(<cursor doc>)  limit(20)
```

The cursor never leaves the repository. The service and UI pass a **message
id** (`loadOlderMessages(conversationId, beforeMessageId)`); the Firebase
repository resolves it to a snapshot internally. No `DocumentSnapshot` or
`Timestamp` reaches a component.

`MessagePage` is `{ messages, hasMore }`. `hasMore` comes from the first
realtime page and thereafter only from pagination — a later realtime
emission must not undo history the user has already loaded.

### Merging

The recent page and every older page land in one list, merged by `id` in
`mergeMessages()` — never by array position. The incoming copy wins a
collision, which is how a pending write resolves its server timestamp in
place. Sorting is chronological with a stable id tie-break, so the order
never wobbles between renders.

## 9. Page size

`MESSAGE_PAGE_SIZE = 20` and `MAX_MESSAGE_LENGTH = 1000`, both in
`src/constants/chat.ts`. Nothing inlines either number.

The rules duplicate `1000` (rules cannot import TypeScript); the two places
carry a comment pointing at each other.

## 10. Conversation list

The Messages list is built from the **connection list**, not from
conversation documents, so a connected buddy you have never messaged still
gets a row that says "Start a conversation". Pending connections are absent
by construction.

```
connected relationships (already in ConnectionProvider — no read)
        ↓ other participant ids
publicProfiles, ONE batched query          (never users/{uid})
        ↓
conversation metadata (one scoped subscription)
        ↓
ConversationListItem
```

Reads per open: one conversation subscription plus one
`getProfilesByIds()` call, which chunks ids into `in` queries of 30. **Never
a read per row.**

Ordering is deterministic: threads with messages first, newest
`lastMessageAt` at the top; then buddies with nothing said yet,
alphabetically. It never reshuffles on refresh.

## 11. Send flow

```
type → Send → trim → validate (content + relationship)
     → chatService → chatRepository
     → message + conversation preview written atomically
     → confirmed → composer clears
```

The message and the preview move together — a Firestore `writeBatch` in
Firebase mode — so the conversation list can never show a preview for a
message that does not exist.

Nothing optimistic is inserted. The composer clears **only** after a
confirmed write, which means **a failed send keeps the user's text**. The
realtime subscription delivers the message once it exists.

Validation, all before anything is written: content is trimmed, must be
non-empty after trimming, must be within `MAX_MESSAGE_LENGTH`, and the sender
must be a connected participant.

## 12. Security rules

`match /conversations/{conversationId}` in `firestore.rules`:

```
function connectedParticipant() {
  return request.auth != null
    && exists(connectionPath())
    && connection().status == 'connected'
    && request.auth.uid in connection().participants;
}
```

| Operation | Rule |
| --- | --- |
| read conversation | `connectedParticipant()` |
| create conversation | plus: id and `connectionId` equal the document id, `participants` **equal the connection's**, previews null, timestamps `== request.time`, exact key allowlist |
| update conversation | plus: `id` / `connectionId` / `participants` / `createdAt` unchanged, `lastMessageSenderId == request.auth.uid`, text non-empty and ≤ 1000, timestamps `== request.time` |
| delete conversation | denied |
| read messages | `connectedParticipant()` |
| create message | plus: `id == messageId`, `conversationId` matches, `senderId == request.auth.uid`, content is a string, `content.trim().size() > 0`, `size() <= 1000`, `createdAt == request.time`, exact key allowlist |
| update / delete message | denied |

`request.auth.uid in participants` alone would be far too weak: it would let
somebody fabricate a conversation document with a person they are not
connected to. Reading the connection is the whole point, and it costs one
document read per rule evaluation — the price of not trusting the client.

`content.trim().size() > 0` means a whitespace-only message is rejected
server-side too, not just by the composer.

### Rule tests

`npm run test:rules` starts the Firestore emulator and runs
`tests/firestore-rules.test.ts` (43 tests, 23 of them chat) against the real
rules file. Chat coverage:

- unauthenticated cannot read a conversation or its messages
- an unrelated user who knows the id cannot read either
- both connected participants can read
- create is allowed for a connected participant; denied while the connection
  is only pending, when no connection exists, for an outsider, and when the
  participants differ from the connection's
- participants cannot be changed after creation; the conversation cannot be
  deleted
- a participant can update the preview for their own message, but cannot
  attribute it to the other person
- a connected participant can create a message; blank, whitespace-only,
  over-length, mismatched-id and auto-id messages are rejected
- nobody can post as another user
- messages cannot be sent while the connection is pending
- messages cannot be edited or deleted by either participant

Requires JDK 21+ (a firebase-tools requirement). See `docs/firebase.md` §9a.

### Indexes

None were added, and `firestore.indexes.json` stays empty.

The conversation query is `array-contains` + `limit` with **no `orderBy`** —
ordering happens client-side because the list is merged with connected
buddies who have no conversation yet, so a composite index would buy nothing.
The message query orders on a single field inside a subcollection, which
Firestore indexes automatically.

## 13. Mock implementation

`mockChatRepository` mirrors the Firebase semantics exactly — same
idempotency, same atomic preview update, same subscription behaviour —
through `localStorage` behind the repository. No page or component touches
storage.

Seeded per mock account on first read, against the connected buddies from
`mock-connection-repository.ts`:

| Buddy | Seeded thread |
| --- | --- |
| Mei | 28 messages, spanning two days — exercises the 20-message page plus "Load earlier messages" and the date separators |
| Jason | 2 messages — makes conversation ordering visible |
| Chloe | connected, no conversation — the "Start a conversation" row |
| Aina, Ryan | pending, so no conversation and no chat access at all |

Scripts live in `src/repositories/chat/mock-conversations.ts`, not in UI code.
Realtime is a listener set that re-emits on every write — no dependency was
added for it.

STEP 8's connection seeds gained Jason and Chloe as connected buddies for
exactly this reason; the pending states are unchanged.

## 14. Firestore cost controls

Chat is the easiest place to accidentally build a read-heavy app. The
deliberate limits:

- initial load is **20 messages**, never a whole history
- older messages only on an explicit tap, 20 at a time
- realtime is scoped to the **recent** messages of the **open** conversation
- **no** whole-history listener, **no** global message listener
- the conversation list resolves profiles in **one batched query**, not one
  read per row
- connected buddies who never chat create **no documents**
- no Cloud Functions — client Firestore plus rules is enough

The one deliberate cost is the rules' `get()` on the connection document per
conversation/message access. That is the price of server-side authorization.

## 15. Current limitations

- **No push notifications.** A user with the app closed is not notified of a
  message. FCM/OneSignal is STEP 14.
- **No unread state**, so no badge anywhere.
- **No presence, typing or read receipts.**
- **No media, replies, reactions, editing or deletion.**
- **No disconnect**, so a conversation cannot become inaccessible through the
  UI yet — but the service and the route already handle a missing or
  no-longer-connected relationship by showing "This conversation is
  unavailable." and refusing sends.
- **Direct URL access does not leak.** `/messages/<anything>` the user cannot
  access shows the same generic unavailable state whether or not the
  conversation exists, and no message request is made until access resolves.
- **No retention or deletion policy.** Messages persist normally.
- **No virtualization.** With 20-message pages it is unnecessary.
- **Live two-user Firebase verification is outstanding** — no project
  credentials exist in this environment. Rules are verified against the
  emulator; the client transaction, batch and subscription paths are
  implemented and typed but have not run against a real project.

### Capacitor / mobile keyboard

The chat screen uses `h-dvh` (never `100vh`) with a `min-h-0 flex-1` scroll
region, so a keyboard resizing the visual viewport shrinks the message area
instead of pushing the composer off-screen. The composer sits in
`pb-safe-bottom`, and the route is outside `AppShell` so the bottom
navigation is not there to fight it. The composer input inherits the shared
`Textarea`'s 16px base size, which stops iOS auto-zooming on focus.

No keyboard plugin was added. Final keyboard behaviour inside a real
Capacitor WebView still needs native QA.

## 16. Future: notifications

STEP 14 delivers messages the user has not seen. The data needed is already
there — `lastMessageAt`, `lastMessageSenderId` and `participants` — and
unread semantics (a per-participant read marker) should be designed with the
notification step rather than faked now.

## 17. Future: Plan Together

STEP 10 turns a conversation into a structured activity: sport, shared
availability, budget, later a venue, then a confirmed activity. The chat
screen is where a **"Plan a session"** action will live.

Nothing in this step needs to change to add it: the conversation is already
keyed by the connection, both participants are known, and structured planning
will be its own collection rather than a special message type.
