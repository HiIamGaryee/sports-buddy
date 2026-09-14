import { readFileSync } from 'node:fs'

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createConnectionId, sortConnectionPair } from '@/lib/connection'

/**
 * Security rules for `connections/{pairId}`, run against the Firestore
 * emulator (`npm run test:rules`). These are the invariants the client is not
 * trusted to keep: nobody outside the pair can read a relationship, and
 * neither participant can forge the other's intent.
 */
const GARY = 'gary'
const AINA = 'aina'
const STRANGER = 'stranger'
const PAIR = createConnectionId(GARY, AINA)

let testEnv: RulesTestEnvironment

const connectionPath = (id: string) => `connections/${id}`

/**
 * `@firebase/rules-unit-testing` declares `firestore()` as the *compat*
 * client while returning an instance the modular API is built for (its own
 * docs use `doc(context.firestore(), …)`). One documented cast here keeps the
 * rest of the file using the same modular calls the app does.
 */
const modular = (context: { firestore: () => unknown }) =>
  context.firestore() as unknown as Firestore

const pendingFrom = (requester: string, other: string) => ({
  id: createConnectionId(requester, other),
  participants: sortConnectionPair(requester, other),
  requestedBy: [requester],
  status: 'pending',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  connectedAt: null,
})

/** Writes a document straight past the rules, to set up a scenario. */
async function seed(id: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(modular(context), connectionPath(id)), data)
  })
}

/**
 * Contexts are cached per user: each one opens its own gRPC channel to the
 * emulator, and creating a fresh one per assertion left enough half-closed
 * sockets to make the emulator's shutdown flaky.
 */
const contexts = new Map<string, Firestore>()

const asUser = (uid: string) => {
  const existing = contexts.get(uid)
  if (existing) return existing
  const client = modular(testEnv.authenticatedContext(uid))
  contexts.set(uid, client)
  return client
}

const asGuest = () => {
  const existing = contexts.get('__guest__')
  if (existing) return existing
  const client = modular(testEnv.unauthenticatedContext())
  contexts.set('__guest__', client)
  return client
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-sports-buddy',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      // Overridable so the suite can still run when something else already
      // holds 8080 on the machine.
      port: Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8080),
    },
  })
})

afterEach(() => testEnv.clearFirestore())
afterAll(async () => {
  contexts.clear()
  await testEnv.cleanup()
})

describe('reading a connection', () => {
  it('is denied to an unauthenticated caller', async () => {
    await seed(PAIR, {
      ...pendingFrom(GARY, AINA),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await assertFails(getDoc(doc(asGuest(), connectionPath(PAIR))))
  })

  it('is denied to a user outside the pair', async () => {
    await seed(PAIR, {
      ...pendingFrom(GARY, AINA),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await assertFails(getDoc(doc(asUser(STRANGER), connectionPath(PAIR))))
  })

  it('is allowed to either participant', async () => {
    await seed(PAIR, {
      ...pendingFrom(GARY, AINA),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await assertSucceeds(getDoc(doc(asUser(GARY), connectionPath(PAIR))))
    await assertSucceeds(getDoc(doc(asUser(AINA), connectionPath(PAIR))))
  })
})

// Regression coverage for a second real live-project bug: `ConnectionProvider`
// never calls `getDoc` — its only read is the realtime subscription's own
// QUERY (`participants array-contains uid` + `limit`), which is a `list`
// operation, not `get`. Every test above and below uses `getDoc`, so none of
// them would have caught a `list`-specific regression. This is exactly what
// happened when `get, list` were first combined with an `exists()` branch:
// Firestore could evaluate a single-document `get` fine, but the realtime
// `list` query came back permission-denied for BOTH participants, which
// looked like "the connection resets to none on every refresh" in the app
// even though `getDoc` against the same document kept succeeding.
describe('listing connections via the realtime subscription query', () => {
  const subscriptionQuery = (db: Firestore, uid: string) =>
    query(
      collection(db, 'connections'),
      where('participants', 'array-contains', uid),
      limit(30),
    )

  it('returns a connected pair to both participants', async () => {
    await seed(PAIR, {
      ...pendingFrom(GARY, AINA),
      requestedBy: sortConnectionPair(GARY, AINA),
      status: 'connected',
      createdAt: new Date(),
      updatedAt: new Date(),
      connectedAt: new Date(),
    })
    const garySnapshot = await getDocs(subscriptionQuery(asUser(GARY), GARY))
    expect(garySnapshot.docs.map((entry) => entry.id)).toEqual([PAIR])
    const ainaSnapshot = await getDocs(subscriptionQuery(asUser(AINA), AINA))
    expect(ainaSnapshot.docs.map((entry) => entry.id)).toEqual([PAIR])
  })

  it('returns a pending pair to both participants', async () => {
    await seed(PAIR, {
      ...pendingFrom(GARY, AINA),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const garySnapshot = await getDocs(subscriptionQuery(asUser(GARY), GARY))
    expect(garySnapshot.docs.map((entry) => entry.id)).toEqual([PAIR])
    const ainaSnapshot = await getDocs(subscriptionQuery(asUser(AINA), AINA))
    expect(ainaSnapshot.docs.map((entry) => entry.id)).toEqual([PAIR])
  })

  // Rules are not filters: a stranger querying for GARY's rows cannot be
  // proved to satisfy `uid in resource.data.participants`, so Firestore
  // refuses the whole query rather than returning an empty page.
  it('is denied when a stranger queries for someone else\'s connections', async () => {
    await seed(PAIR, {
      ...pendingFrom(GARY, AINA),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await assertFails(getDocs(subscriptionQuery(asUser(STRANGER), GARY)))
  })

  it('returns an empty page to a stranger querying their own connections', async () => {
    await seed(PAIR, {
      ...pendingFrom(GARY, AINA),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const snapshot = await getDocs(subscriptionQuery(asUser(STRANGER), STRANGER))
    expect(snapshot.docs).toEqual([])
  })
})

// Regression coverage for a real live-project bug: `connect()` transactions
// always read the pair's document FIRST to decide whether to create or
// update it. Every test above seeds the document before reading it, so none
// of them caught that a `get` on a connection that does not exist yet was
// being denied outright (`resource` is null, so `resource.data.participants`
// threw). That silently broke every first-ever Connect between two users.
describe('reading a connection that does not exist yet', () => {
  it('is allowed to either potential participant, so their transaction can check first', async () => {
    await assertSucceeds(getDoc(doc(asUser(GARY), connectionPath(PAIR))))
    await assertSucceeds(getDoc(doc(asUser(AINA), connectionPath(PAIR))))
  })

  it('is denied to someone the id is not about', async () => {
    await assertFails(getDoc(doc(asUser(STRANGER), connectionPath(PAIR))))
  })

  it('is denied to an unauthenticated caller', async () => {
    await assertFails(getDoc(doc(asGuest(), connectionPath(PAIR))))
  })
})

describe('creating a request', () => {
  it('is allowed when the caller is the only requester', async () => {
    await assertSucceeds(
      setDoc(doc(asUser(GARY), connectionPath(PAIR)), pendingFrom(GARY, AINA)),
    )
  })

  it('is denied when the caller claims someone else asked', async () => {
    await assertFails(
      setDoc(doc(asUser(GARY), connectionPath(PAIR)), pendingFrom(AINA, GARY)),
    )
  })

  it('is denied for a self-connection', async () => {
    const selfId = createConnectionId(GARY, GARY)
    await assertFails(
      setDoc(doc(asUser(GARY), connectionPath(selfId)), {
        id: selfId,
        participants: [GARY, GARY],
        requestedBy: [GARY],
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        connectedAt: null,
      }),
    )
  })

  it('is denied when the document id does not match the pair', async () => {
    await assertFails(
      setDoc(doc(asUser(GARY), connectionPath('made-up-id')), {
        ...pendingFrom(GARY, AINA),
        id: 'made-up-id',
      }),
    )
  })

  it('is denied when the caller is not a participant', async () => {
    await assertFails(
      setDoc(
        doc(asUser(STRANGER), connectionPath(PAIR)),
        pendingFrom(GARY, AINA),
      ),
    )
  })

  it('is denied when it arrives already connected', async () => {
    await assertFails(
      setDoc(doc(asUser(GARY), connectionPath(PAIR)), {
        ...pendingFrom(GARY, AINA),
        requestedBy: [GARY, AINA],
        status: 'connected',
        connectedAt: serverTimestamp(),
      }),
    )
  })
})

describe('connecting back', () => {
  const seedPending = () =>
    seed(PAIR, {
      ...pendingFrom(GARY, AINA),
      createdAt: new Date(),
      updatedAt: new Date(),
    })

  it('lets the second participant complete the connection', async () => {
    await seedPending()
    await assertSucceeds(
      updateDoc(doc(asUser(AINA), connectionPath(PAIR)), {
        requestedBy: [GARY, AINA],
        status: 'connected',
        connectedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('stops the first requester forging the other person’s connect', async () => {
    await seedPending()
    await assertFails(
      updateDoc(doc(asUser(GARY), connectionPath(PAIR)), {
        requestedBy: [GARY, AINA],
        status: 'connected',
        connectedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('stops a participant removing the other request', async () => {
    await seedPending()
    await assertFails(
      updateDoc(doc(asUser(AINA), connectionPath(PAIR)), {
        requestedBy: [AINA],
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('stops participants being changed', async () => {
    await seedPending()
    await assertFails(
      updateDoc(doc(asUser(AINA), connectionPath(PAIR)), {
        participants: [AINA, STRANGER],
        requestedBy: [GARY, AINA],
        status: 'connected',
        connectedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('stops connected being set without both requests', async () => {
    await seedPending()
    await assertFails(
      updateDoc(doc(asUser(AINA), connectionPath(PAIR)), {
        status: 'connected',
        connectedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('stops an unrelated user joining the relationship', async () => {
    await seedPending()
    await assertFails(
      updateDoc(doc(asUser(STRANGER), connectionPath(PAIR)), {
        requestedBy: [GARY, STRANGER],
        updatedAt: serverTimestamp(),
      }),
    )
  })
})

describe('cancelling', () => {
  it('lets the sole requester delete their pending request', async () => {
    await seed(PAIR, {
      ...pendingFrom(GARY, AINA),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await assertSucceeds(deleteDoc(doc(asUser(GARY), connectionPath(PAIR))))
  })

  it('stops the recipient deleting the sender’s request', async () => {
    await seed(PAIR, {
      ...pendingFrom(GARY, AINA),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await assertFails(deleteDoc(doc(asUser(AINA), connectionPath(PAIR))))
  })

  const seedConnectedPair = () =>
    seed(PAIR, {
      id: PAIR,
      participants: sortConnectionPair(GARY, AINA),
      requestedBy: sortConnectionPair(GARY, AINA),
      status: 'connected',
      createdAt: new Date(),
      updatedAt: new Date(),
      connectedAt: new Date(),
    })

  // "Unconnect": either participant may end a connected relationship.
  it('lets either participant unconnect a connected relationship', async () => {
    await seedConnectedPair()
    await assertSucceeds(deleteDoc(doc(asUser(GARY), connectionPath(PAIR))))
    await seedConnectedPair()
    await assertSucceeds(deleteDoc(doc(asUser(AINA), connectionPath(PAIR))))
  })

  it("never lets an outsider unconnect somebody else's relationship", async () => {
    await seedConnectedPair()
    await assertFails(deleteDoc(doc(asUser(STRANGER), connectionPath(PAIR))))
    await assertFails(deleteDoc(doc(asGuest(), connectionPath(PAIR))))
  })

  it('cuts off the conversation once unconnected', async () => {
    await seedConnectedPair()
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(modular(context), `conversations/${PAIR}`), {
        id: PAIR,
        connectionId: PAIR,
        participants: sortConnectionPair(GARY, AINA),
        lastMessageText: null,
        lastMessageSenderId: null,
        lastMessageAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    })
    await assertSucceeds(getDoc(doc(asUser(AINA), `conversations/${PAIR}`)))
    await deleteDoc(doc(asUser(GARY), connectionPath(PAIR)))
    await assertFails(getDoc(doc(asUser(AINA), `conversations/${PAIR}`)))
  })

  it('stops a connected relationship being edited', async () => {
    await seed(PAIR, {
      id: PAIR,
      participants: sortConnectionPair(GARY, AINA),
      requestedBy: sortConnectionPair(GARY, AINA),
      status: 'connected',
      createdAt: new Date(),
      updatedAt: new Date(),
      connectedAt: new Date(),
    })
    await assertFails(
      updateDoc(doc(asUser(GARY), connectionPath(PAIR)), {
        status: 'pending',
        updatedAt: serverTimestamp(),
      }),
    )
  })
})

describe('conversations', () => {
  const PENDING_PAIR = createConnectionId(GARY, STRANGER)

  const connected = () => ({
    id: PAIR,
    participants: sortConnectionPair(GARY, AINA),
    requestedBy: sortConnectionPair(GARY, AINA),
    status: 'connected',
    createdAt: new Date(),
    updatedAt: new Date(),
    connectedAt: new Date(),
  })

  const conversationDoc = (id = PAIR) => ({
    id,
    connectionId: id,
    participants: sortConnectionPair(GARY, AINA),
    lastMessageText: null,
    lastMessageSenderId: null,
    lastMessageAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  const conversationPath = (id = PAIR) => `conversations/${id}`

  async function seedConnected() {
    await seed(PAIR, connected())
  }

  async function seedConversation() {
    await seedConnected()
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(modular(context), conversationPath()), {
        ...conversationDoc(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    })
  }

  it('cannot be read by an unauthenticated caller', async () => {
    await seedConversation()
    await assertFails(getDoc(doc(asGuest(), conversationPath())))
  })

  it('cannot be read by an unrelated user who knows the id', async () => {
    await seedConversation()
    await assertFails(getDoc(doc(asUser(STRANGER), conversationPath())))
  })

  it('can be read by either connected participant', async () => {
    await seedConversation()
    await assertSucceeds(getDoc(doc(asUser(GARY), conversationPath())))
    await assertSucceeds(getDoc(doc(asUser(AINA), conversationPath())))
  })

  // Regression coverage for a real live-project bug: the Messages LIST is
  // built from `subscribeToConversations`, a `list` QUERY
  // (`participants array-contains uid` + `limit`), never a `getDoc`. Every
  // test above uses `getDoc`, so none of them would have caught that the
  // original rule — sharing `connectedParticipant()` (an external `get()`
  // into `connections`) between `get` and `list` — came back
  // permission-denied for the WHOLE query in live Firestore, even for a
  // genuinely connected pair. This is what surfaced as "We couldn't load
  // these messages" during a real two-user chat test.
  describe('listing conversations via the realtime subscription query', () => {
    const subscriptionQuery = (db: Firestore, uid: string) =>
      query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', uid),
        limit(100),
      )

    it('returns a connected pair\'s conversation to both participants', async () => {
      await seedConversation()
      const garySnapshot = await getDocs(subscriptionQuery(asUser(GARY), GARY))
      expect(garySnapshot.docs.map((entry) => entry.id)).toEqual([PAIR])
      const ainaSnapshot = await getDocs(subscriptionQuery(asUser(AINA), AINA))
      expect(ainaSnapshot.docs.map((entry) => entry.id)).toEqual([PAIR])
    })

    // Rules are not filters — see the connections suite above.
    it('is denied when a stranger queries for someone else\'s conversations', async () => {
      await seedConversation()
      await assertFails(getDocs(subscriptionQuery(asUser(STRANGER), GARY)))
    })

    it('returns an empty page to a stranger querying their own conversations', async () => {
      await seedConversation()
      const snapshot = await getDocs(
        subscriptionQuery(asUser(STRANGER), STRANGER),
      )
      expect(snapshot.docs).toEqual([])
    })
  })

  it('can be created by a connected participant', async () => {
    await seedConnected()
    await assertSucceeds(
      setDoc(doc(asUser(GARY), conversationPath()), conversationDoc()),
    )
  })

  it('cannot be created while the connection is only pending', async () => {
    await seed(PENDING_PAIR, {
      id: PENDING_PAIR,
      participants: sortConnectionPair(GARY, STRANGER),
      requestedBy: [GARY],
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      connectedAt: null,
    })
    await assertFails(
      setDoc(doc(asUser(GARY), conversationPath(PENDING_PAIR)), {
        ...conversationDoc(PENDING_PAIR),
        participants: sortConnectionPair(GARY, STRANGER),
      }),
    )
  })

  it('cannot be created when no connection exists at all', async () => {
    await assertFails(
      setDoc(doc(asUser(GARY), conversationPath()), conversationDoc()),
    )
  })

  it('cannot be created by someone outside the connection', async () => {
    await seedConnected()
    await assertFails(
      setDoc(doc(asUser(STRANGER), conversationPath()), conversationDoc()),
    )
  })

  it('cannot invent participants that differ from the connection', async () => {
    await seedConnected()
    await assertFails(
      setDoc(doc(asUser(GARY), conversationPath()), {
        ...conversationDoc(),
        participants: sortConnectionPair(GARY, STRANGER),
      }),
    )
  })

  it('cannot have its participants changed after creation', async () => {
    await seedConversation()
    await assertFails(
      updateDoc(doc(asUser(GARY), conversationPath()), {
        participants: sortConnectionPair(GARY, STRANGER),
        lastMessageText: 'hello',
        lastMessageSenderId: GARY,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('lets a participant update the preview for their own message', async () => {
    await seedConversation()
    await assertSucceeds(
      updateDoc(doc(asUser(GARY), conversationPath()), {
        lastMessageText: 'Badminton Saturday?',
        lastMessageSenderId: GARY,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('stops a participant attributing the preview to the other person', async () => {
    await seedConversation()
    await assertFails(
      updateDoc(doc(asUser(GARY), conversationPath()), {
        lastMessageText: 'Badminton Saturday?',
        lastMessageSenderId: AINA,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('cannot be deleted', async () => {
    await seedConversation()
    await assertFails(deleteDoc(doc(asUser(GARY), conversationPath())))
  })
})

describe('messages', () => {
  const conversationPath = `conversations/${PAIR}`
  const messagesPath = `${conversationPath}/messages`

  const message = (overrides: Record<string, unknown> = {}) => ({
    id: 'msg_1',
    conversationId: PAIR,
    senderId: GARY,
    content: 'Badminton Saturday?',
    createdAt: serverTimestamp(),
    ...overrides,
  })

  async function seedConnectedConversation() {
    await seed(PAIR, {
      id: PAIR,
      participants: sortConnectionPair(GARY, AINA),
      requestedBy: sortConnectionPair(GARY, AINA),
      status: 'connected',
      createdAt: new Date(),
      updatedAt: new Date(),
      connectedAt: new Date(),
    })
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(modular(context), conversationPath), {
        id: PAIR,
        connectionId: PAIR,
        participants: sortConnectionPair(GARY, AINA),
        lastMessageText: null,
        lastMessageSenderId: null,
        lastMessageAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    })
  }

  async function seedMessage() {
    await seedConnectedConversation()
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(modular(context), `${messagesPath}/msg_1`), {
        ...message(),
        createdAt: new Date(),
      })
    })
  }

  it('can be created by a connected participant', async () => {
    await seedConnectedConversation()
    await assertSucceeds(
      setDoc(doc(asUser(GARY), `${messagesPath}/msg_1`), message()),
    )
  })

  it('can be read by both connected participants', async () => {
    await seedMessage()
    await assertSucceeds(getDocs(collection(asUser(GARY), messagesPath)))
    await assertSucceeds(getDocs(collection(asUser(AINA), messagesPath)))
  })

  it('cannot be read by an unrelated user', async () => {
    await seedMessage()
    await assertFails(getDocs(collection(asUser(STRANGER), messagesPath)))
  })

  it('cannot be read by an unauthenticated caller', async () => {
    await seedMessage()
    await assertFails(getDocs(collection(asGuest(), messagesPath)))
  })

  it('cannot be sent as another user', async () => {
    await seedConnectedConversation()
    await assertFails(
      setDoc(
        doc(asUser(GARY), `${messagesPath}/msg_1`),
        message({ senderId: AINA }),
      ),
    )
  })

  it('rejects blank and whitespace-only content', async () => {
    await seedConnectedConversation()
    await assertFails(
      setDoc(doc(asUser(GARY), `${messagesPath}/a`), message({ id: 'a', content: '' })),
    )
    await assertFails(
      setDoc(
        doc(asUser(GARY), `${messagesPath}/b`),
        message({ id: 'b', content: '   \n  ' }),
      ),
    )
  })

  it('rejects content over the length limit', async () => {
    await seedConnectedConversation()
    await assertFails(
      setDoc(
        doc(asUser(GARY), `${messagesPath}/c`),
        message({ id: 'c', content: 'x'.repeat(1001) }),
      ),
    )
  })

  it('rejects a message id that does not match the document', async () => {
    await seedConnectedConversation()
    await assertFails(
      setDoc(doc(asUser(GARY), `${messagesPath}/real`), message({ id: 'faked' })),
    )
  })

  it('rejects an auto-id message, because the id field must match', async () => {
    await seedConnectedConversation()
    await assertFails(
      addDoc(collection(asUser(GARY), messagesPath), message()),
    )
  })

  // Regression coverage for a real live-project bug. SECURITY RULES ARE NOT
  // FILTERS: the message subscription queries this subcollection with
  // `orderBy('createdAt','desc') + limit()` and NO `where` clause, so any
  // `list` rule that reads `resource.data` makes Firestore reject the WHOLE
  // query (it cannot prove every possible result passes) rather than drop
  // individual documents. The rule must be query-independent — path and
  // `request.auth` only. Every test around this one uses `getDoc`/`setDoc`,
  // which is why this went undetected until a real two-user chat test.
  describe('listing messages via the realtime subscription query', () => {
    it('returns messages to both connected participants', async () => {
      await seedMessage()
      const garySnapshot = await getDocs(
        query(collection(asUser(GARY), messagesPath), orderBy('createdAt', 'desc'), limit(20)),
      )
      expect(garySnapshot.docs.map((entry) => entry.id)).toEqual(['msg_1'])
      const ainaSnapshot = await getDocs(
        query(collection(asUser(AINA), messagesPath), orderBy('createdAt', 'desc'), limit(20)),
      )
      expect(ainaSnapshot.docs.map((entry) => entry.id)).toEqual(['msg_1'])
    })

    // The rule authorizes from the conversation id, which encodes both
    // participants — so an outsider is refused outright rather than handed
    // an empty page. That is the correct shape for an unfiltered query:
    // there is no `where` clause that could narrow them to "their own" rows.
    it('is denied to someone the conversation id is not about', async () => {
      await seedMessage()
      await assertFails(
        getDocs(
          query(
            collection(asUser(STRANGER), messagesPath),
            orderBy('createdAt', 'desc'),
            limit(20),
          ),
        ),
      )
    })

    it('is denied to an unauthenticated caller', async () => {
      await seedMessage()
      await assertFails(
        getDocs(
          query(
            collection(asGuest(), messagesPath),
            orderBy('createdAt', 'desc'),
            limit(20),
          ),
        ),
      )
    })
  })

  it('cannot be sent while the connection is only pending', async () => {
    await seed(PAIR, {
      id: PAIR,
      participants: sortConnectionPair(GARY, AINA),
      requestedBy: [GARY],
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      connectedAt: null,
    })
    await assertFails(
      setDoc(doc(asUser(GARY), `${messagesPath}/msg_1`), message()),
    )
  })

  it('is immutable — no edits and no deletes', async () => {
    await seedMessage()
    await assertFails(
      updateDoc(doc(asUser(GARY), `${messagesPath}/msg_1`), {
        content: 'edited',
      }),
    )
    await assertFails(deleteDoc(doc(asUser(GARY), `${messagesPath}/msg_1`)))
    await assertFails(deleteDoc(doc(asUser(AINA), `${messagesPath}/msg_1`)))
  })
})

describe('activity plans', () => {
  const PLAN_ID = `${PAIR}__active`
  const planPath = (id = PLAN_ID) => `activityPlans/${id}`

  const emptyProposal = () => ({
    value: null,
    proposedBy: '',
    acceptedBy: [],
    version: 0,
    updatedAt: null,
  })

  const newPlan = (overrides: Record<string, unknown> = {}) => ({
    id: PLAN_ID,
    connectionId: PAIR,
    participants: sortConnectionPair(GARY, AINA),
    status: 'draft',
    sportProposal: emptyProposal(),
    timeProposal: emptyProposal(),
    budgetProposal: emptyProposal(),
    createdBy: GARY,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  })

  async function seedConnected() {
    await seed(PAIR, {
      id: PAIR,
      participants: sortConnectionPair(GARY, AINA),
      requestedBy: sortConnectionPair(GARY, AINA),
      status: 'connected',
      createdAt: new Date(),
      updatedAt: new Date(),
      connectedAt: new Date(),
    })
  }

  /** Seeds a plan straight past the rules, with plain dates. */
  async function seedPlan(overrides: Record<string, unknown> = {}) {
    await seedConnected()
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(modular(context), planPath()), {
        ...newPlan(overrides),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    })
  }

  const sportProposedByGary = () => ({
    value: 'badminton',
    proposedBy: GARY,
    acceptedBy: [GARY],
    version: 1,
    updatedAt: new Date(),
  })

  it('cannot be read by an unauthenticated caller', async () => {
    await seedPlan()
    await assertFails(getDoc(doc(asGuest(), planPath())))
  })

  it('cannot be read by an unrelated user who knows the id', async () => {
    await seedPlan()
    await assertFails(getDoc(doc(asUser(STRANGER), planPath())))
  })

  it('can be read by both connected participants', async () => {
    await seedPlan()
    await assertSucceeds(getDoc(doc(asUser(GARY), planPath())))
    await assertSucceeds(getDoc(doc(asUser(AINA), planPath())))
  })

  // Regression coverage: `ensureActivePlan()` reads the plan document FIRST,
  // inside a transaction, to decide whether to create it. That read must
  // succeed for a connected participant even before the plan exists.
  describe('reading a plan that does not exist yet', () => {
    it('is allowed to either connected participant', async () => {
      await seedConnected()
      await assertSucceeds(getDoc(doc(asUser(GARY), planPath())))
      await assertSucceeds(getDoc(doc(asUser(AINA), planPath())))
    })

    it('is denied to someone the id is not about', async () => {
      await seedConnected()
      await assertFails(getDoc(doc(asUser(STRANGER), planPath())))
    })

    it('is denied to an unauthenticated caller', async () => {
      await seedConnected()
      await assertFails(getDoc(doc(asGuest(), planPath())))
    })
  })

  it('can be created by a connected participant', async () => {
    await seedConnected()
    await assertSucceeds(setDoc(doc(asUser(GARY), planPath()), newPlan()))
  })

  it('cannot be created while the connection is only pending', async () => {
    await seed(PAIR, {
      id: PAIR,
      participants: sortConnectionPair(GARY, AINA),
      requestedBy: [GARY],
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      connectedAt: null,
    })
    await assertFails(setDoc(doc(asUser(GARY), planPath()), newPlan()))
  })

  it('cannot be created when no connection exists', async () => {
    await assertFails(setDoc(doc(asUser(GARY), planPath()), newPlan()))
  })

  it('cannot be created by an outsider', async () => {
    await seedConnected()
    await assertFails(
      setDoc(doc(asUser(STRANGER), planPath()), newPlan({ createdBy: STRANGER })),
    )
  })

  it('cannot invent participants that differ from the connection', async () => {
    await seedConnected()
    await assertFails(
      setDoc(
        doc(asUser(GARY), planPath()),
        newPlan({ participants: sortConnectionPair(GARY, STRANGER) }),
      ),
    )
  })

  it('cannot be created at an id that does not match its connection', async () => {
    await seedConnected()
    await assertFails(
      setDoc(
        doc(asUser(GARY), planPath('made-up-plan')),
        newPlan({ id: 'made-up-plan' }),
      ),
    )
  })

  it('cannot arrive already agreed', async () => {
    await seedConnected()
    await assertFails(
      setDoc(
        doc(asUser(GARY), planPath()),
        newPlan({
          sportProposal: {
            value: 'badminton',
            proposedBy: GARY,
            acceptedBy: sortConnectionPair(GARY, AINA),
            version: 1,
            updatedAt: serverTimestamp(),
          },
        }),
      ),
    )
  })

  it('lets a participant propose a value, accepting it implicitly', async () => {
    await seedPlan()
    await assertSucceeds(
      updateDoc(doc(asUser(GARY), planPath()), {
        sportProposal: {
          value: 'badminton',
          proposedBy: GARY,
          acceptedBy: [GARY],
          version: 1,
          // The real client writes a server timestamp inside the map.
          updatedAt: serverTimestamp(),
        },
        status: 'draft',
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('lets the other participant agree', async () => {
    await seedPlan({ sportProposal: sportProposedByGary() })
    await assertSucceeds(
      updateDoc(doc(asUser(AINA), planPath()), {
        sportProposal: {
          value: 'badminton',
          proposedBy: GARY,
          acceptedBy: [GARY, AINA],
          version: 1,
          updatedAt: serverTimestamp(),
        },
        status: 'draft',
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('stops a participant agreeing on the other person’s behalf', async () => {
    await seedPlan({ sportProposal: sportProposedByGary() })
    // Gary proposed; only Aina may add Aina.
    await assertFails(
      updateDoc(doc(asUser(GARY), planPath()), {
        sportProposal: {
          value: 'badminton',
          proposedBy: GARY,
          acceptedBy: [GARY, AINA],
          version: 1,
          updatedAt: serverTimestamp(),
        },
        status: 'draft',
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('stops a participant removing the other person’s agreement', async () => {
    await seedPlan({
      sportProposal: {
        ...sportProposedByGary(),
        acceptedBy: sortConnectionPair(GARY, AINA),
      },
    })
    await assertFails(
      updateDoc(doc(asUser(GARY), planPath()), {
        sportProposal: {
          value: 'badminton',
          proposedBy: GARY,
          acceptedBy: [GARY],
          version: 1,
          updatedAt: serverTimestamp(),
        },
        status: 'draft',
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('stops participants, connectionId and creator being changed', async () => {
    await seedPlan()
    const patch = {
      status: 'draft',
      updatedAt: serverTimestamp(),
    }
    await assertFails(
      updateDoc(doc(asUser(GARY), planPath()), {
        ...patch,
        participants: sortConnectionPair(GARY, STRANGER),
      }),
    )
    await assertFails(
      updateDoc(doc(asUser(GARY), planPath()), {
        ...patch,
        connectionId: 'somebody__else',
      }),
    )
    await assertFails(
      updateDoc(doc(asUser(GARY), planPath()), {
        ...patch,
        createdBy: AINA,
      }),
    )
  })

  it('stops ready being claimed without agreement', async () => {
    await seedPlan({ sportProposal: sportProposedByGary() })
    await assertFails(
      updateDoc(doc(asUser(AINA), planPath()), {
        status: 'ready',
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('allows ready once all three are agreed by both', async () => {
    const both = sortConnectionPair(GARY, AINA)
    await seedPlan({
      sportProposal: { ...sportProposedByGary(), acceptedBy: both },
      timeProposal: {
        value: {
          date: '2030-01-05',
          startTime: '17:00',
          endTime: '19:00',
          timeZone: 'Asia/Kuala_Lumpur',
        },
        proposedBy: GARY,
        acceptedBy: [GARY],
        version: 1,
        updatedAt: new Date(),
      },
      budgetProposal: {
        value: { min: 20, max: 40 },
        proposedBy: GARY,
        acceptedBy: both,
        version: 1,
        updatedAt: new Date(),
      },
    })

    // Aina agreeing to the time is the write that makes the plan ready.
    await assertSucceeds(
      updateDoc(doc(asUser(AINA), planPath()), {
        timeProposal: {
          value: {
            date: '2030-01-05',
            startTime: '17:00',
            endTime: '19:00',
            timeZone: 'Asia/Kuala_Lumpur',
          },
          proposedBy: GARY,
          acceptedBy: [GARY, AINA],
          version: 1,
          updatedAt: serverTimestamp(),
        },
        status: 'ready',
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('cannot be updated by an unrelated user', async () => {
    await seedPlan()
    await assertFails(
      updateDoc(doc(asUser(STRANGER), planPath()), {
        status: 'draft',
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('cannot be deleted', async () => {
    await seedPlan()
    await assertFails(deleteDoc(doc(asUser(GARY), planPath())))
    await assertFails(deleteDoc(doc(asUser(AINA), planPath())))
  })

  describe('venue (STEP 11)', () => {
    const both = sortConnectionPair(GARY, AINA)
    const VENUE = {
      placeId: 'mock_pj_racquet_club',
      name: 'Petaling Jaya Racquet Club',
      address: 'Jalan 13/6, Seksyen 13, Petaling Jaya',
      location: { lat: 3.1096, lng: 101.6371 },
      googleMapsUri: 'https://maps.google.com/?cid=1',
    }

    const agreedProposal = (value: unknown) => ({
      value,
      proposedBy: GARY,
      acceptedBy: both,
      version: 1,
      updatedAt: new Date(),
    })

    /** A plan whose sport, time and budget are all agreed by both. */
    const readyPlan = () => ({
      sportProposal: agreedProposal('badminton'),
      timeProposal: agreedProposal({
        date: '2030-01-05',
        startTime: '17:00',
        endTime: '19:00',
        timeZone: 'Asia/Kuala_Lumpur',
      }),
      budgetProposal: agreedProposal({ min: 20, max: 40 }),
      status: 'ready',
    })

    const venueProposedByGary = () => ({
      value: VENUE,
      proposedBy: GARY,
      acceptedBy: [GARY],
      version: 1,
      updatedAt: new Date(),
    })

    it('can be proposed by a participant once the plan is ready', async () => {
      await seedPlan(readyPlan())
      await assertSucceeds(
        updateDoc(doc(asUser(GARY), planPath()), {
          venueProposal: {
            value: VENUE,
            proposedBy: GARY,
            acceptedBy: [GARY],
            version: 1,
            updatedAt: serverTimestamp(),
          },
          status: 'ready',
          updatedAt: serverTimestamp(),
        }),
      )
    })

    it('cannot be proposed while sport/time/budget are unagreed', async () => {
      await seedPlan()
      await assertFails(
        updateDoc(doc(asUser(GARY), planPath()), {
          venueProposal: {
            value: VENUE,
            proposedBy: GARY,
            acceptedBy: [GARY],
            version: 1,
            updatedAt: serverTimestamp(),
          },
          status: 'draft',
          updatedAt: serverTimestamp(),
        }),
      )
    })

    it('cannot be proposed by an unrelated user', async () => {
      await seedPlan(readyPlan())
      await assertFails(
        updateDoc(doc(asUser(STRANGER), planPath()), {
          venueProposal: {
            value: VENUE,
            proposedBy: STRANGER,
            acceptedBy: [STRANGER],
            version: 1,
            updatedAt: serverTimestamp(),
          },
          status: 'ready',
          updatedAt: serverTimestamp(),
        }),
      )
    })

    it('lets the other participant agree, reaching venue-agreed', async () => {
      await seedPlan({ ...readyPlan(), venueProposal: venueProposedByGary() })
      await assertSucceeds(
        updateDoc(doc(asUser(AINA), planPath()), {
          venueProposal: {
            value: VENUE,
            proposedBy: GARY,
            acceptedBy: [GARY, AINA],
            version: 1,
            updatedAt: serverTimestamp(),
          },
          status: 'venue-agreed',
          updatedAt: serverTimestamp(),
        }),
      )
    })

    it('stops one participant agreeing for the other', async () => {
      await seedPlan({ ...readyPlan(), venueProposal: venueProposedByGary() })
      await assertFails(
        updateDoc(doc(asUser(GARY), planPath()), {
          venueProposal: {
            value: VENUE,
            proposedBy: GARY,
            acceptedBy: [GARY, AINA],
            version: 1,
            updatedAt: serverTimestamp(),
          },
          status: 'venue-agreed',
          updatedAt: serverTimestamp(),
        }),
      )
    })

    it('stops venue-agreed being claimed with only one acceptance', async () => {
      await seedPlan({ ...readyPlan(), venueProposal: venueProposedByGary() })
      await assertFails(
        updateDoc(doc(asUser(AINA), planPath()), {
          status: 'venue-agreed',
          updatedAt: serverTimestamp(),
        }),
      )
    })

    it('drops back to ready when the venue is replaced', async () => {
      await seedPlan({
        ...readyPlan(),
        venueProposal: { ...venueProposedByGary(), acceptedBy: both },
        status: 'venue-agreed',
      })
      await assertSucceeds(
        updateDoc(doc(asUser(AINA), planPath()), {
          venueProposal: {
            value: { ...VENUE, placeId: 'mock_usj_sports_arena', name: 'USJ Sports Arena' },
            proposedBy: AINA,
            acceptedBy: [AINA],
            version: 2,
            updatedAt: serverTimestamp(),
          },
          status: 'ready',
          updatedAt: serverTimestamp(),
        }),
      )
    })

    it('still accepts a plan written before the venue field existed', async () => {
      // A pre-STEP-11 document: no `venueProposal` key at all.
      await seedConnected()
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(modular(context), planPath()), {
          id: PLAN_ID,
          connectionId: PAIR,
          participants: both,
          status: 'draft',
          sportProposal: emptyProposal(),
          timeProposal: emptyProposal(),
          budgetProposal: emptyProposal(),
          createdBy: GARY,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      })

      await assertSucceeds(
        updateDoc(doc(asUser(GARY), planPath()), {
          sportProposal: {
            value: 'badminton',
            proposedBy: GARY,
            acceptedBy: [GARY],
            version: 1,
            updatedAt: serverTimestamp(),
          },
          status: 'draft',
          updatedAt: serverTimestamp(),
        }),
      )
    })
  })
})

describe('confirmed activities', () => {
  const PLAN_ID = `${PAIR}__active`
  const both = sortConnectionPair(GARY, AINA)
  const activityPath = (id = PLAN_ID) => `activities/${id}`
  const planPath = (id = PLAN_ID) => `activityPlans/${id}`

  const VENUE = {
    placeId: 'mock_pj_racquet_club',
    name: 'Petaling Jaya Racquet Club',
    address: 'Jalan 13/6, Seksyen 13, Petaling Jaya',
    location: { lat: 3.1096, lng: 101.6371 },
    googleMapsUri: 'https://maps.google.com/?cid=1',
  }
  const BUDGET = { min: 20, max: 40 }
  const START = new Date('2030-01-05T09:00:00.000Z')
  const END = new Date('2030-01-05T11:00:00.000Z')

  const agreedProposal = (value: unknown) => ({
    value,
    proposedBy: GARY,
    acceptedBy: both,
    version: 1,
    updatedAt: new Date(),
  })

  const emptyProposal = () => ({
    value: null,
    proposedBy: '',
    acceptedBy: [],
    version: 0,
    updatedAt: null,
  })

  /** A plan with everything agreed, ready to convert. */
  async function seedVenueAgreedPlan(overrides: Record<string, unknown> = {}) {
    await seed(PAIR, {
      id: PAIR,
      participants: both,
      requestedBy: both,
      status: 'connected',
      createdAt: new Date(),
      updatedAt: new Date(),
      connectedAt: new Date(),
    })
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(modular(context), planPath()), {
        id: PLAN_ID,
        connectionId: PAIR,
        participants: both,
        status: 'venue-agreed',
        sportProposal: agreedProposal('badminton'),
        timeProposal: agreedProposal({
          date: '2030-01-05',
          startTime: '17:00',
          endTime: '19:00',
          timeZone: 'Asia/Kuala_Lumpur',
        }),
        budgetProposal: agreedProposal(BUDGET),
        venueProposal: agreedProposal(VENUE),
        createdBy: GARY,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      })
    })
  }

  const newActivity = (overrides: Record<string, unknown> = {}) => ({
    id: PLAN_ID,
    sourcePlanId: PLAN_ID,
    connectionId: PAIR,
    participants: both,
    sportId: 'badminton',
    startAt: START,
    endAt: END,
    budget: { ...BUDGET, currency: 'MYR', unit: 'per-person' },
    venue: VENUE,
    status: 'confirmed',
    createdBy: GARY,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  })

  async function seedActivity() {
    await seedVenueAgreedPlan()
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(modular(context), activityPath()), {
        ...newActivity(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    })
  }

  it('cannot be read by an unauthenticated caller', async () => {
    await seedActivity()
    await assertFails(getDoc(doc(asGuest(), activityPath())))
  })

  it('cannot be read by an unrelated user who knows the id', async () => {
    await seedActivity()
    await assertFails(getDoc(doc(asUser(STRANGER), activityPath())))
  })

  it('can be read by both participants', async () => {
    await seedActivity()
    await assertSucceeds(getDoc(doc(asUser(GARY), activityPath())))
    await assertSucceeds(getDoc(doc(asUser(AINA), activityPath())))
  })

  // Regression coverage: `createFromPlan()` reads the activity document
  // FIRST, inside a transaction, to make confirming idempotent. That read
  // must succeed for a plan participant even before the activity exists.
  describe('reading an activity that does not exist yet', () => {
    it('is allowed to either plan participant', async () => {
      await seedVenueAgreedPlan()
      await assertSucceeds(getDoc(doc(asUser(GARY), activityPath())))
      await assertSucceeds(getDoc(doc(asUser(AINA), activityPath())))
    })

    it('is denied to someone the id is not about', async () => {
      await seedVenueAgreedPlan()
      await assertFails(getDoc(doc(asUser(STRANGER), activityPath())))
    })

    it('is denied to an unauthenticated caller', async () => {
      await seedVenueAgreedPlan()
      await assertFails(getDoc(doc(asGuest(), activityPath())))
    })
  })

  it('can be created by a participant from a fully agreed plan', async () => {
    await seedVenueAgreedPlan()
    await assertSucceeds(
      setDoc(doc(asUser(GARY), activityPath()), newActivity()),
    )
  })

  /**
   * STEP 13. Upcoming/past is DERIVED from `endAt` at read time. Nothing may
   * write a temporal state, which is what makes a background migration job
   * unnecessary — and what stops a client backdating its own history.
   */
  it('refuses a client-written temporal status', async () => {
    await seedVenueAgreedPlan()

    for (const status of ['upcoming', 'past', 'completed', 'cancelled']) {
      await assertFails(
        setDoc(doc(asUser(GARY), activityPath()), newActivity({ status })),
      )
    }
  })

  it('cannot be updated to a fake past state after creation', async () => {
    await seedActivity()

    await assertFails(
      updateDoc(doc(asUser(GARY), activityPath()), { status: 'past' }),
    )
    // Nor by moving the timestamps the classification reads.
    await assertFails(
      updateDoc(doc(asUser(AINA), activityPath()), {
        endAt: new Date('2020-01-01T00:00:00Z'),
      }),
    )
  })

  it('can equally be created by the other participant', async () => {
    await seedVenueAgreedPlan()
    await assertSucceeds(
      setDoc(
        doc(asUser(AINA), activityPath()),
        newActivity({ createdBy: AINA }),
      ),
    )
  })

  it('cannot be created from a plan that is not fully agreed', async () => {
    await seedVenueAgreedPlan({
      venueProposal: emptyProposal(),
      status: 'ready',
    })
    await assertFails(
      setDoc(doc(asUser(GARY), activityPath()), newActivity()),
    )
  })

  it('cannot be created when the venue is only proposed by one person', async () => {
    await seedVenueAgreedPlan({
      venueProposal: { ...agreedProposal(VENUE), acceptedBy: [GARY] },
      status: 'ready',
    })
    await assertFails(
      setDoc(doc(asUser(GARY), activityPath()), newActivity()),
    )
  })

  it('cannot be created by an unrelated user', async () => {
    await seedVenueAgreedPlan()
    await assertFails(
      setDoc(
        doc(asUser(STRANGER), activityPath()),
        newActivity({ createdBy: STRANGER }),
      ),
    )
  })

  it('cannot be created with participants that differ from the plan', async () => {
    await seedVenueAgreedPlan()
    await assertFails(
      setDoc(
        doc(asUser(GARY), activityPath()),
        newActivity({ participants: sortConnectionPair(GARY, STRANGER) }),
      ),
    )
  })

  it('cannot invent a sport, venue or budget the plan never agreed', async () => {
    await seedVenueAgreedPlan()
    await assertFails(
      setDoc(doc(asUser(GARY), activityPath()), newActivity({ sportId: 'tennis' })),
    )
    await assertFails(
      setDoc(
        doc(asUser(GARY), activityPath()),
        newActivity({ venue: { ...VENUE, name: 'Somewhere else' } }),
      ),
    )
    await assertFails(
      setDoc(
        doc(asUser(GARY), activityPath()),
        newActivity({
          budget: { min: 0, max: 5, currency: 'MYR', unit: 'per-person' },
        }),
      ),
    )
  })

  it('cannot be created when no plan exists', async () => {
    await assertFails(
      setDoc(doc(asUser(GARY), activityPath()), newActivity()),
    )
  })

  it('cannot be created at an id that is not its source plan', async () => {
    await seedVenueAgreedPlan()
    await assertFails(
      setDoc(
        doc(asUser(GARY), activityPath('made-up-activity')),
        newActivity({ id: 'made-up-activity', sourcePlanId: 'made-up-activity' }),
      ),
    )
  })

  it('is immutable — no updates and no deletes', async () => {
    await seedActivity()
    await assertFails(
      updateDoc(doc(asUser(GARY), activityPath()), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(deleteDoc(doc(asUser(GARY), activityPath())))
    await assertFails(deleteDoc(doc(asUser(AINA), activityPath())))
  })

  describe('the source plan', () => {
    it('may be marked confirmed by a participant', async () => {
      await seedVenueAgreedPlan()
      await assertSucceeds(
        updateDoc(doc(asUser(GARY), planPath()), {
          status: 'confirmed',
          updatedAt: serverTimestamp(),
        }),
      )
    })

    it('cannot be marked confirmed before everything is agreed', async () => {
      await seedVenueAgreedPlan({
        venueProposal: emptyProposal(),
        status: 'ready',
      })
      await assertFails(
        updateDoc(doc(asUser(GARY), planPath()), {
          status: 'confirmed',
          updatedAt: serverTimestamp(),
        }),
      )
    })

    it('cannot be edited once confirmed', async () => {
      await seedVenueAgreedPlan({ status: 'confirmed' })
      // A confirmed plan is read-only history: no proposal may move.
      await assertFails(
        updateDoc(doc(asUser(AINA), planPath()), {
          sportProposal: {
            value: 'tennis',
            proposedBy: AINA,
            acceptedBy: [AINA],
            version: 2,
            updatedAt: serverTimestamp(),
          },
          status: 'draft',
          updatedAt: serverTimestamp(),
        }),
      )
      await assertFails(
        updateDoc(doc(asUser(GARY), planPath()), {
          status: 'venue-agreed',
          updatedAt: serverTimestamp(),
        }),
      )
    })
  })
})

/**
 * STEP 12.6. The profile documents gained key allowlists and field size caps.
 * These are the checks the client is not trusted to make: an attacker calling
 * the SDK directly skips every form and service in the app.
 */
describe('the private profile document', () => {
  const userPath = (uid: string) => `users/${uid}`

  const validProfile = (uid: string) => ({
    id: uid,
    email: `${uid}@example.com`,
    displayName: 'Gary',
    photoUrl: null,
    bio: 'Weeknight badminton.',
    sports: [{ sportId: 'badminton', skillLevel: 'intermediate' }],
    intents: ['casual'],
    preferredIntensity: 'moderate',
    availability: [{ day: 'tuesday', periods: ['evening'] }],
    area: 'subang-jaya',
    radiusKm: 15,
    budget: { min: 20, max: 40 },
    preferences: {},
    onboardingCompleted: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  it('accepts a well-formed profile from its owner', async () => {
    await assertSucceeds(
      setDoc(doc(asUser(GARY), userPath(GARY)), validProfile(GARY)),
    )
  })

  it('rejects a privileged field the schema does not define', async () => {
    await assertFails(
      setDoc(doc(asUser(GARY), userPath(GARY)), {
        ...validProfile(GARY),
        role: 'admin',
      }),
    )
    await assertFails(
      setDoc(doc(asUser(GARY), userPath(GARY)), {
        ...validProfile(GARY),
        isAdmin: true,
      }),
    )
  })

  it('rejects an oversized display name or bio', async () => {
    await assertFails(
      setDoc(doc(asUser(GARY), userPath(GARY)), {
        ...validProfile(GARY),
        displayName: 'a'.repeat(41),
      }),
    )
    await assertFails(
      setDoc(doc(asUser(GARY), userPath(GARY)), {
        ...validProfile(GARY),
        bio: 'a'.repeat(161),
      }),
    )
  })

  it('rejects more sports than the domain allows', async () => {
    await assertFails(
      setDoc(doc(asUser(GARY), userPath(GARY)), {
        ...validProfile(GARY),
        sports: Array.from({ length: 6 }, () => ({
          sportId: 'badminton',
          skillLevel: 'casual',
        })),
      }),
    )
  })

  it('still refuses another user entirely', async () => {
    await assertFails(
      setDoc(doc(asUser(AINA), userPath(GARY)), validProfile(GARY)),
    )
    await assertFails(getDoc(doc(asUser(AINA), userPath(GARY))))
  })
})

describe('the public profile projection', () => {
  const publicPath = (uid: string) => `publicProfiles/${uid}`

  const validProjection = (uid: string) => ({
    userId: uid,
    displayName: 'Gary',
    photoUrl: null,
    bio: 'Weeknight badminton.',
    sports: [{ sportId: 'badminton', skillLevel: 'intermediate' }],
    intents: ['casual'],
    preferredIntensity: 'moderate',
    availability: [{ day: 'tuesday', periods: ['evening'] }],
    area: 'subang-jaya',
    budget: { min: 20, max: 40 },
    profileCompleteness: 100,
    discoverable: true,
    updatedAt: serverTimestamp(),
  })

  it('accepts the discovery allowlist from its owner', async () => {
    await assertSucceeds(
      setDoc(doc(asUser(GARY), publicPath(GARY)), validProjection(GARY)),
    )
  })

  it('refuses private fields that would leak through the projection', async () => {
    // Every signed-in member can read this document, so an email or a saved
    // filter radius here is a privacy leak rather than an untidy field.
    await assertFails(
      setDoc(doc(asUser(GARY), publicPath(GARY)), {
        ...validProjection(GARY),
        email: 'gary@example.com',
      }),
    )
    await assertFails(
      setDoc(doc(asUser(GARY), publicPath(GARY)), {
        ...validProjection(GARY),
        radiusKm: 15,
      }),
    )
    await assertFails(
      setDoc(doc(asUser(GARY), publicPath(GARY)), {
        ...validProjection(GARY),
        preferences: { privacy: { discoverable: true } },
      }),
    )
  })

  it('refuses an oversized projection', async () => {
    await assertFails(
      setDoc(doc(asUser(GARY), publicPath(GARY)), {
        ...validProjection(GARY),
        bio: 'a'.repeat(161),
      }),
    )
  })

  it('refuses a projection written for somebody else', async () => {
    await assertFails(
      setDoc(doc(asUser(AINA), publicPath(GARY)), validProjection(GARY)),
    )
    await assertFails(
      setDoc(doc(asUser(GARY), publicPath(GARY)), validProjection(AINA)),
    )
  })
})

describe('the pair id', () => {
  it('agrees with the rules, whichever way round it is built', () => {
    expect(createConnectionId(AINA, GARY)).toBe(PAIR)
    expect(PAIR).toBe(`${AINA}__${GARY}`)
  })
})

describe('blocks', () => {
  const blockPath = (blocker: string, blocked: string) =>
    `blocks/${blocker}__${blocked}`
  const conversationPath = `conversations/${PAIR}`
  const messagesPath = `${conversationPath}/messages`

  const newBlock = (blocker: string, blocked: string) => ({
    blockerId: blocker,
    blockedUserId: blocked,
    reason: 'spam',
    createdAt: serverTimestamp(),
  })

  async function seedConnectedConversationWithMessage() {
    await seed(PAIR, {
      id: PAIR,
      participants: sortConnectionPair(GARY, AINA),
      requestedBy: sortConnectionPair(GARY, AINA),
      status: 'connected',
      createdAt: new Date(),
      updatedAt: new Date(),
      connectedAt: new Date(),
    })
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = modular(context)
      await setDoc(doc(db, conversationPath), {
        id: PAIR,
        connectionId: PAIR,
        participants: sortConnectionPair(GARY, AINA),
        lastMessageText: null,
        lastMessageSenderId: null,
        lastMessageAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await setDoc(doc(db, `${messagesPath}/msg_1`), {
        id: 'msg_1',
        conversationId: PAIR,
        senderId: GARY,
        content: 'Badminton Saturday?',
        createdAt: new Date(),
      })
    })
  }

  async function seedBlock(blocker: string, blocked: string) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(modular(context), blockPath(blocker, blocked)), {
        ...newBlock(blocker, blocked),
        createdAt: new Date(),
      })
    })
  }

  const recentMessages = (db: Firestore) =>
    query(collection(db, messagesPath), orderBy('createdAt', 'desc'), limit(20))

  // Regression coverage: `blockUser()` reads the block document BEFORE
  // creating it. With a rule reading `resource.data.blockerId`, that read
  // failed on a document that does not exist yet — so the very first block
  // could never be made.
  it('lets the blocker check a block that does not exist yet', async () => {
    await assertSucceeds(getDoc(doc(asUser(GARY), blockPath(GARY, AINA))))
  })

  it('does not let anyone else check it', async () => {
    await assertFails(getDoc(doc(asUser(AINA), blockPath(GARY, AINA))))
    await assertFails(getDoc(doc(asUser(STRANGER), blockPath(GARY, AINA))))
  })

  it('can be created by the blocker at the matching id', async () => {
    await assertSucceeds(
      setDoc(doc(asUser(GARY), blockPath(GARY, AINA)), newBlock(GARY, AINA)),
    )
  })

  it('cannot be created on somebody else\'s behalf', async () => {
    await assertFails(
      setDoc(doc(asUser(AINA), blockPath(GARY, AINA)), newBlock(GARY, AINA)),
    )
  })

  it('lists only the blocker\'s own blocks via the app query', async () => {
    await seedBlock(GARY, AINA)
    const snapshot = await getDocs(
      query(collection(asUser(GARY), 'blocks'), where('blockerId', '==', GARY)),
    )
    expect(snapshot.docs.map((entry) => entry.id)).toEqual([`${GARY}__${AINA}`])
  })

  it('cuts off reading message history in either direction', async () => {
    await seedConnectedConversationWithMessage()
    await assertSucceeds(getDocs(recentMessages(asUser(AINA))))

    await seedBlock(GARY, AINA)
    await assertFails(getDocs(recentMessages(asUser(GARY))))
    await assertFails(getDocs(recentMessages(asUser(AINA))))
  })

  it('cuts off opening the conversation and sending', async () => {
    await seedConnectedConversationWithMessage()
    await seedBlock(AINA, GARY)
    await assertFails(getDoc(doc(asUser(GARY), conversationPath)))
    await assertFails(
      setDoc(doc(asUser(GARY), `${messagesPath}/msg_2`), {
        id: 'msg_2',
        conversationId: PAIR,
        senderId: GARY,
        content: 'Hello?',
        createdAt: serverTimestamp(),
      }),
    )
  })
})

describe('reports', () => {
  it('can be submitted about someone else, and never read back', async () => {
    await assertSucceeds(
      addDoc(collection(asUser(GARY), 'reports'), {
        reporterId: GARY,
        reportedUserId: AINA,
        reason: 'spam',
        note: null,
        context: { type: 'profile' },
        status: 'submitted',
        createdAt: serverTimestamp(),
      }),
    )
    await assertFails(getDocs(collection(asUser(GARY), 'reports')))
  })
})

describe('unblocking', () => {
  const blockId = `${GARY}__${AINA}`

  async function seedGaryBlocksAina() {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(modular(context), `blocks/${blockId}`), {
        blockerId: GARY,
        blockedUserId: AINA,
        reason: null,
        createdAt: new Date(),
      })
    })
  }

  it('lets the blocker remove their own block', async () => {
    await seedGaryBlocksAina()
    await assertSucceeds(deleteDoc(doc(asUser(GARY), `blocks/${blockId}`)))
  })

  it('never lets the blocked person remove it', async () => {
    await seedGaryBlocksAina()
    await assertFails(deleteDoc(doc(asUser(AINA), `blocks/${blockId}`)))
    await assertFails(deleteDoc(doc(asUser(STRANGER), `blocks/${blockId}`)))
  })

  it('treats unblocking twice as harmless', async () => {
    await assertSucceeds(deleteDoc(doc(asUser(GARY), `blocks/${blockId}`)))
  })

  it('restores reading the conversation once the block is gone', async () => {
    await seed(PAIR, {
      id: PAIR,
      participants: sortConnectionPair(GARY, AINA),
      requestedBy: sortConnectionPair(GARY, AINA),
      status: 'connected',
      createdAt: new Date(),
      updatedAt: new Date(),
      connectedAt: new Date(),
    })
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(modular(context), `conversations/${PAIR}`), {
        id: PAIR,
        connectionId: PAIR,
        participants: sortConnectionPair(GARY, AINA),
        lastMessageText: null,
        lastMessageSenderId: null,
        lastMessageAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    })
    await seedGaryBlocksAina()
    await assertFails(getDoc(doc(asUser(AINA), `conversations/${PAIR}`)))

    await deleteDoc(doc(asUser(GARY), `blocks/${blockId}`))
    await assertSucceeds(getDoc(doc(asUser(AINA), `conversations/${PAIR}`)))
  })
})

describe('report shape', () => {
  const report = (context: unknown) => ({
    reporterId: GARY,
    reportedUserId: AINA,
    reason: 'harassment',
    note: 'Kept messaging after I said no.',
    context,
    status: 'submitted',
    createdAt: serverTimestamp(),
  })

  it('accepts the contexts the app sends', async () => {
    await assertSucceeds(
      addDoc(collection(asUser(GARY), 'reports'), report({ type: 'profile' })),
    )
    await assertSucceeds(
      addDoc(
        collection(asUser(GARY), 'reports'),
        report({ type: 'conversation', conversationId: PAIR }),
      ),
    )
  })

  it('rejects an unknown context shape', async () => {
    await assertFails(
      addDoc(
        collection(asUser(GARY), 'reports'),
        report({ type: 'admin', escalate: true }),
      ),
    )
    await assertFails(
      addDoc(collection(asUser(GARY), 'reports'), report('profile')),
    )
  })

  it('rejects reporting yourself or forging the reporter', async () => {
    await assertFails(
      addDoc(collection(asUser(GARY), 'reports'), {
        ...report({ type: 'profile' }),
        reportedUserId: GARY,
      }),
    )
    await assertFails(
      addDoc(collection(asUser(AINA), 'reports'), report({ type: 'profile' })),
    )
  })
})

describe('activity posts', () => {
  const postPath = (id = 'post_1') => `activityPosts/${id}`
  const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  const newPost = (overrides: Record<string, unknown> = {}) => ({
    id: 'post_1',
    authorId: GARY,
    sportId: 'badminton',
    startAt: inDays(2),
    timeZone: 'Asia/Kuala_Lumpur',
    areaId: 'subang-jaya',
    venueName: 'KL Sports City',
    budget: { min: 10, max: 20 },
    joinPolicy: 'open',
    visibility: 'public',
    invitedId: null,
    capacity: 1,
    joinedIds: [],
    pendingIds: [],
    createdAt: serverTimestamp(),
    ...overrides,
  })

  async function seedPost(overrides: Record<string, unknown> = {}) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(modular(context), postPath()), {
        ...newPost(overrides),
        createdAt: new Date(),
      })
    })
  }

  it('can be created by its author', async () => {
    await assertSucceeds(setDoc(doc(asUser(GARY), postPath()), newPost()))
  })

  it('accepts an open-ended budget', async () => {
    await assertSucceeds(
      setDoc(doc(asUser(GARY), postPath()), newPost({ budget: { min: 60, max: null } })),
    )
  })

  it('cannot be posted on somebody else\'s behalf', async () => {
    await assertFails(setDoc(doc(asUser(AINA), postPath()), newPost()))
    await assertFails(setDoc(doc(asGuest(), postPath()), newPost()))
  })

  it('rejects a session in the past or too far ahead', async () => {
    await assertFails(setDoc(doc(asUser(GARY), postPath()), newPost({ startAt: inDays(-1) })))
    await assertFails(setDoc(doc(asUser(GARY), postPath()), newPost({ startAt: inDays(120) })))
  })

  it('rejects malformed fields and extra keys', async () => {
    await assertFails(
      setDoc(doc(asUser(GARY), postPath()), newPost({ budget: { min: 40, max: 20 } })),
    )
    await assertFails(
      setDoc(doc(asUser(GARY), postPath()), newPost({ venueName: 'a'.repeat(81) })),
    )
    await assertFails(setDoc(doc(asUser(GARY), postPath()), newPost({ venueName: '' })))
    await assertFails(
      setDoc(doc(asUser(GARY), postPath()), newPost({ featured: true })),
    )
    await assertFails(
      setDoc(doc(asUser(GARY), postPath('other')), newPost({ id: 'post_1' })),
    )
  })

  it('can be browsed by any signed-in member with the Discover query', async () => {
    await seedPost()
    const snapshot = await getDocs(
      query(
        collection(asUser(STRANGER), 'activityPosts'),
        where('visibility', '==', 'public'),
        where('startAt', '>', new Date()),
        orderBy('startAt', 'asc'),
        limit(30),
      ),
    )
    expect(snapshot.docs.map((entry) => entry.id)).toEqual(['post_1'])
    await assertFails(getDocs(collection(asGuest(), 'activityPosts')))
  })

  // The author can change time, place, sport or budget — the same fields
  // the edit form sends — with a server `updatedAt`.
  const edit = (overrides: Record<string, unknown> = {}) => ({
    sportId: 'badminton',
    startAt: inDays(3),
    timeZone: 'Asia/Kuala_Lumpur',
    areaId: 'petaling-jaya',
    venueName: 'Somewhere else',
    budget: { min: 20, max: 40 },
    updatedAt: serverTimestamp(),
    ...overrides,
  })

  it('can be edited by its author', async () => {
    await seedPost()
    await assertSucceeds(updateDoc(doc(asUser(GARY), postPath()), edit()))
  })

  it('cannot be edited by anyone else', async () => {
    await seedPost()
    await assertFails(updateDoc(doc(asUser(AINA), postPath()), edit()))
    await assertFails(updateDoc(doc(asUser(STRANGER), postPath()), edit()))
  })

  it('never lets an edit move identity or break the rules for posting', async () => {
    await seedPost()
    await assertFails(
      updateDoc(doc(asUser(GARY), postPath()), edit({ authorId: AINA })),
    )
    await assertFails(
      updateDoc(doc(asUser(GARY), postPath()), edit({ createdAt: new Date(0) })),
    )
    await assertFails(
      updateDoc(doc(asUser(GARY), postPath()), edit({ startAt: inDays(-1) })),
    )
    await assertFails(
      updateDoc(doc(asUser(GARY), postPath()), edit({ venueName: '' })),
    )
    await assertFails(
      updateDoc(doc(asUser(GARY), postPath()), edit({ updatedAt: new Date(0) })),
    )
    await assertFails(
      updateDoc(doc(asUser(GARY), postPath()), edit({ featured: true })),
    )
  })

  it('can be removed only by its author', async () => {
    await seedPost()
    await assertFails(deleteDoc(doc(asUser(AINA), postPath())))
    await assertSucceeds(deleteDoc(doc(asUser(GARY), postPath())))
  })
})

describe('joining activity posts', () => {
  const postPath = 'activityPosts/post_1'
  const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  async function seedPost(overrides: Record<string, unknown> = {}) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(modular(context), postPath), {
        id: 'post_1',
        authorId: GARY,
        sportId: 'badminton',
        startAt: inDays(2),
        timeZone: 'Asia/Kuala_Lumpur',
        areaId: 'subang-jaya',
        venueName: 'KL Sports City',
        budget: { min: 10, max: 20 },
        joinPolicy: 'open',
        visibility: 'public',
        invitedId: null,
        capacity: 1,
        joinedIds: [],
        pendingIds: [],
        createdAt: new Date(),
        ...overrides,
      })
    })
  }

  const lists = (joinedIds: string[], pendingIds: string[] = []) => ({
    joinedIds,
    pendingIds,
  })

  describe('an open post', () => {
    it('gives the spot to the first member who joins', async () => {
      await seedPost()
      await assertSucceeds(updateDoc(doc(asUser(AINA), postPath), lists([AINA])))
    })

    it('is full once the one spot is taken', async () => {
      await seedPost({ joinedIds: [AINA] })
      await assertFails(
        updateDoc(doc(asUser(STRANGER), postPath), lists([AINA, STRANGER])),
      )
    })

    it('never lets a member put someone else in, or join their own post', async () => {
      await seedPost()
      await assertFails(updateDoc(doc(asUser(AINA), postPath), lists([STRANGER])))
      await assertFails(updateDoc(doc(asUser(GARY), postPath), lists([GARY])))
    })

    it('cannot be joined once it has started', async () => {
      await seedPost({ startAt: inDays(-1) })
      await assertFails(updateDoc(doc(asUser(AINA), postPath), lists([AINA])))
    })

    it('lets the joiner give up the spot', async () => {
      await seedPost({ joinedIds: [AINA] })
      await assertSucceeds(updateDoc(doc(asUser(AINA), postPath), lists([])))
    })

    it('never lets anyone but that person remove them, except the author', async () => {
      await seedPost({ joinedIds: [AINA] })
      await assertFails(updateDoc(doc(asUser(STRANGER), postPath), lists([])))
      await assertSucceeds(updateDoc(doc(asUser(GARY), postPath), lists([])))
    })
  })

  describe('an approval post', () => {
    it('turns Join into a waiting request, not a spot', async () => {
      await seedPost({ joinPolicy: 'approval' })
      await assertFails(updateDoc(doc(asUser(AINA), postPath), lists([AINA])))
      await assertSucceeds(updateDoc(doc(asUser(AINA), postPath), lists([], [AINA])))
    })

    it('never lets a member approve themselves', async () => {
      await seedPost({ joinPolicy: 'approval', pendingIds: [AINA] })
      await assertFails(updateDoc(doc(asUser(AINA), postPath), lists([AINA], [])))
    })

    it('lets the author approve one waiting request into the spot', async () => {
      await seedPost({ joinPolicy: 'approval', pendingIds: [AINA, STRANGER] })
      await assertSucceeds(
        updateDoc(doc(asUser(GARY), postPath), lists([AINA], [STRANGER])),
      )
    })

    it('never lets the author approve past the one spot', async () => {
      await seedPost({ joinPolicy: 'approval', joinedIds: [AINA], pendingIds: [STRANGER] })
      await assertFails(
        updateDoc(doc(asUser(GARY), postPath), lists([AINA, STRANGER], [])),
      )
    })

    it('never lets the author put in someone who did not ask', async () => {
      await seedPost({ joinPolicy: 'approval', pendingIds: [AINA] })
      await assertFails(
        updateDoc(doc(asUser(GARY), postPath), lists([STRANGER], [AINA])),
      )
    })

    it('lets the author decline, and the requester withdraw', async () => {
      await seedPost({ joinPolicy: 'approval', pendingIds: [AINA, STRANGER] })
      await assertSucceeds(updateDoc(doc(asUser(GARY), postPath), lists([], [STRANGER])))
      await assertSucceeds(updateDoc(doc(asUser(STRANGER), postPath), lists([], [])))
    })

    it('refuses new requests once the spot is taken', async () => {
      await seedPost({ joinPolicy: 'approval', joinedIds: [AINA] })
      await assertFails(
        updateDoc(doc(asUser(STRANGER), postPath), lists([AINA], [STRANGER])),
      )
    })
  })

  it('never lets an author edit smuggle in a joiner', async () => {
    await seedPost()
    await assertFails(
      updateDoc(doc(asUser(GARY), postPath), {
        venueName: 'Somewhere else',
        joinedIds: [AINA],
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it('never lets a join change anything but the join lists', async () => {
    await seedPost()
    await assertFails(
      updateDoc(doc(asUser(AINA), postPath), {
        joinedIds: [AINA],
        venueName: 'My place now',
      }),
    )
  })

  it('lets a member list the posts they joined', async () => {
    await seedPost({ joinedIds: [AINA] })
    const snapshot = await getDocs(
      query(
        collection(asUser(AINA), 'activityPosts'),
        where('joinedIds', 'array-contains', AINA),
        limit(100),
      ),
    )
    expect(snapshot.docs.map((entry) => entry.id)).toEqual(['post_1'])
  })

  it('still lets a post from before joins existed be joined', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(modular(context), postPath), {
        id: 'post_1',
        authorId: GARY,
        sportId: 'badminton',
        startAt: inDays(2),
        timeZone: 'Asia/Kuala_Lumpur',
        areaId: 'subang-jaya',
        venueName: 'KL Sports City',
        budget: { min: 10, max: 20 },
        createdAt: new Date(),
      })
    })
    await assertSucceeds(updateDoc(doc(asUser(AINA), postPath), { joinedIds: [AINA] }))
  })
})

describe('who can see an activity post', () => {
  const postPath = 'activityPosts/post_1'
  const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  const post = (overrides: Record<string, unknown> = {}) => ({
    id: 'post_1',
    authorId: GARY,
    sportId: 'badminton',
    startAt: inDays(2),
    timeZone: 'Asia/Kuala_Lumpur',
    areaId: 'subang-jaya',
    venueName: 'KL Sports City',
    budget: { min: 10, max: 20 },
    joinPolicy: 'open',
    visibility: 'public',
    invitedId: null,
    capacity: 1,
    joinedIds: [],
    pendingIds: [],
    createdAt: serverTimestamp(),
    ...overrides,
  })

  async function seedPost(overrides: Record<string, unknown> = {}) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(modular(context), postPath), {
        ...post(overrides),
        createdAt: new Date(),
      })
    })
  }

  async function seedConnected() {
    await seed(PAIR, {
      id: PAIR,
      participants: sortConnectionPair(GARY, AINA),
      requestedBy: sortConnectionPair(GARY, AINA),
      status: 'connected',
      createdAt: new Date(),
      updatedAt: new Date(),
      connectedAt: new Date(),
    })
  }

  const discoverQuery = (db: Firestore) =>
    query(
      collection(db, 'activityPosts'),
      where('visibility', '==', 'public'),
      where('startAt', '>', new Date()),
      orderBy('startAt', 'asc'),
      limit(30),
    )

  describe('link-only', () => {
    it('opens by its link (id) for any signed-in member', async () => {
      await seedPost({ visibility: 'link' })
      await assertSucceeds(getDoc(doc(asUser(STRANGER), postPath)))
      await assertFails(getDoc(doc(asGuest(), postPath)))
    })

    it('never appears on Discover', async () => {
      await seedPost({ visibility: 'link' })
      const snapshot = await getDocs(discoverQuery(asUser(STRANGER)))
      expect(snapshot.docs).toEqual([])
    })

    it('cannot be scraped by listing the collection without a filter', async () => {
      await seedPost({ visibility: 'link' })
      await assertFails(
        getDocs(query(collection(asUser(STRANGER), 'activityPosts'), limit(30))),
      )
    })

    it('can be joined by someone who has the link', async () => {
      await seedPost({ visibility: 'link' })
      await assertSucceeds(
        updateDoc(doc(asUser(STRANGER), postPath), { joinedIds: [STRANGER] }),
      )
    })
  })

  describe('a private invite from chat', () => {
    it('can be created for a connected buddy', async () => {
      await seedConnected()
      await assertSucceeds(
        setDoc(doc(asUser(GARY), postPath), post({ visibility: 'invite', invitedId: AINA })),
      )
    })

    it('cannot be created for someone you are not connected with', async () => {
      await assertFails(
        setDoc(doc(asUser(GARY), postPath), post({ visibility: 'invite', invitedId: STRANGER })),
      )
      await assertFails(
        setDoc(doc(asUser(GARY), postPath), post({ visibility: 'invite', invitedId: GARY })),
      )
    })

    it('rejects an invitee on a post that is not an invite', async () => {
      await assertFails(
        setDoc(doc(asUser(GARY), postPath), post({ visibility: 'public', invitedId: AINA })),
      )
    })

    it('is visible only to the two people it is between', async () => {
      await seedPost({ visibility: 'invite', invitedId: AINA })
      await assertSucceeds(getDoc(doc(asUser(GARY), postPath)))
      await assertSucceeds(getDoc(doc(asUser(AINA), postPath)))
      await assertFails(getDoc(doc(asUser(STRANGER), postPath)))
      const snapshot = await getDocs(discoverQuery(asUser(STRANGER)))
      expect(snapshot.docs).toEqual([])
    })

    it("shows up in the invitee's own invites query", async () => {
      await seedPost({ visibility: 'invite', invitedId: AINA })
      const snapshot = await getDocs(
        query(
          collection(asUser(AINA), 'activityPosts'),
          where('invitedId', '==', AINA),
          limit(100),
        ),
      )
      expect(snapshot.docs.map((entry) => entry.id)).toEqual(['post_1'])
      await assertFails(
        getDocs(
          query(
            collection(asUser(STRANGER), 'activityPosts'),
            where('invitedId', '==', AINA),
            limit(100),
          ),
        ),
      )
    })

    it('can be accepted only by the invited buddy', async () => {
      await seedPost({ visibility: 'invite', invitedId: AINA })
      await assertFails(
        updateDoc(doc(asUser(STRANGER), postPath), { joinedIds: [STRANGER] }),
      )
      await assertSucceeds(updateDoc(doc(asUser(AINA), postPath), { joinedIds: [AINA] }))
    })

    it('never lets the author re-target or publish it', async () => {
      await seedPost({ visibility: 'invite', invitedId: AINA })
      const edit = {
        venueName: 'Elsewhere',
        startAt: inDays(3),
        updatedAt: serverTimestamp(),
      }
      await assertSucceeds(updateDoc(doc(asUser(GARY), postPath), edit))
      await assertFails(
        updateDoc(doc(asUser(GARY), postPath), { ...edit, invitedId: STRANGER }),
      )
      await assertFails(
        updateDoc(doc(asUser(GARY), postPath), { ...edit, visibility: 'public' }),
      )
    })
  })
})

describe('group activities', () => {
  const activityPath = (id = 'activity_1') => `groupActivities/${id}`
  const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  const newActivity = (overrides: Record<string, unknown> = {}) => ({
    id: 'activity_1',
    organizerId: GARY,
    sportId: 'badminton',
    title: 'Saturday Badminton Meetup',
    description: 'Casual doubles, all welcome.',
    startAt: inDays(2),
    endAt: null,
    timeZone: 'Asia/Kuala_Lumpur',
    areaId: 'subang-jaya',
    venueName: 'KL Sports City',
    budget: { min: 10, max: 20 },
    preferredSkillLevel: 'any',
    maxParticipants: 8,
    participantIds: [],
    createdAt: serverTimestamp(),
    ...overrides,
  })

  async function seedActivity(overrides: Record<string, unknown> = {}) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(modular(context), activityPath()), {
        ...newActivity(overrides),
        createdAt: new Date(),
      })
    })
  }

  it('can be created by its organizer', async () => {
    await assertSucceeds(setDoc(doc(asUser(GARY), activityPath()), newActivity()))
  })

  it('accepts an open-ended budget and no end time', async () => {
    await assertSucceeds(
      setDoc(doc(asUser(GARY), activityPath()), newActivity({ budget: { min: 60, max: null } })),
    )
  })

  it("cannot be created on somebody else's behalf", async () => {
    await assertFails(setDoc(doc(asUser(AINA), activityPath()), newActivity()))
    await assertFails(setDoc(doc(asGuest(), activityPath()), newActivity()))
  })

  it('rejects a session in the past or too far ahead', async () => {
    await assertFails(
      setDoc(doc(asUser(GARY), activityPath()), newActivity({ startAt: inDays(-1) })),
    )
    await assertFails(
      setDoc(doc(asUser(GARY), activityPath()), newActivity({ startAt: inDays(120) })),
    )
  })

  it('rejects an end time before the start', async () => {
    await assertFails(
      setDoc(
        doc(asUser(GARY), activityPath()),
        newActivity({ startAt: inDays(2), endAt: inDays(1) }),
      ),
    )
  })

  it('rejects a participant cap outside 2..30', async () => {
    await assertFails(
      setDoc(doc(asUser(GARY), activityPath()), newActivity({ maxParticipants: 1 })),
    )
    await assertFails(
      setDoc(doc(asUser(GARY), activityPath()), newActivity({ maxParticipants: 31 })),
    )
  })

  it('rejects malformed fields and extra keys', async () => {
    await assertFails(
      setDoc(doc(asUser(GARY), activityPath()), newActivity({ title: '' })),
    )
    await assertFails(
      setDoc(doc(asUser(GARY), activityPath()), newActivity({ venueName: '' })),
    )
    await assertFails(
      setDoc(doc(asUser(GARY), activityPath()), newActivity({ featured: true })),
    )
    await assertFails(
      setDoc(doc(asUser(GARY), activityPath('other')), newActivity({ id: 'activity_1' })),
    )
  })

  it('can be browsed by any signed-in member, never a guest', async () => {
    await seedActivity()
    const snapshot = await getDocs(
      query(
        collection(asUser(STRANGER), 'groupActivities'),
        where('startAt', '>', new Date()),
        orderBy('startAt', 'asc'),
        limit(30),
      ),
    )
    expect(snapshot.docs.map((entry) => entry.id)).toEqual(['activity_1'])
    await assertFails(getDocs(collection(asGuest(), 'groupActivities')))
  })

  const edit = (overrides: Record<string, unknown> = {}) => ({
    sportId: 'badminton',
    title: 'Saturday Badminton Meetup (moved)',
    description: 'Casual doubles, all welcome.',
    startAt: inDays(3),
    endAt: null,
    timeZone: 'Asia/Kuala_Lumpur',
    areaId: 'petaling-jaya',
    venueName: 'Somewhere else',
    budget: { min: 20, max: 40 },
    preferredSkillLevel: 'any',
    maxParticipants: 8,
    updatedAt: serverTimestamp(),
    ...overrides,
  })

  it('can be edited by its organizer', async () => {
    await seedActivity()
    await assertSucceeds(updateDoc(doc(asUser(GARY), activityPath()), edit()))
  })

  it('cannot be edited by anyone else', async () => {
    await seedActivity()
    await assertFails(updateDoc(doc(asUser(AINA), activityPath()), edit()))
    await assertFails(updateDoc(doc(asUser(STRANGER), activityPath()), edit()))
  })

  it('never lets an edit move identity, participants or break the create rules', async () => {
    await seedActivity()
    await assertFails(
      updateDoc(doc(asUser(GARY), activityPath()), edit({ organizerId: AINA })),
    )
    await assertFails(
      updateDoc(doc(asUser(GARY), activityPath()), edit({ createdAt: new Date(0) })),
    )
    await assertFails(
      updateDoc(doc(asUser(GARY), activityPath()), edit({ startAt: inDays(-1) })),
    )
    await assertFails(
      updateDoc(doc(asUser(GARY), activityPath()), edit({ participantIds: [AINA] })),
    )
    await assertFails(
      updateDoc(doc(asUser(GARY), activityPath()), edit({ updatedAt: new Date(0) })),
    )
  })

  it('can be removed only by its organizer', async () => {
    await seedActivity()
    await assertFails(deleteDoc(doc(asUser(AINA), activityPath())))
    await assertSucceeds(deleteDoc(doc(asUser(GARY), activityPath())))
  })
})

describe('joining group activities', () => {
  const activityPath = 'groupActivities/activity_1'
  const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  async function seedActivity(overrides: Record<string, unknown> = {}) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(modular(context), activityPath), {
        id: 'activity_1',
        organizerId: GARY,
        sportId: 'badminton',
        title: 'Saturday Badminton Meetup',
        description: 'Casual doubles, all welcome.',
        startAt: inDays(2),
        endAt: null,
        timeZone: 'Asia/Kuala_Lumpur',
        areaId: 'subang-jaya',
        venueName: 'KL Sports City',
        budget: { min: 10, max: 20 },
        preferredSkillLevel: 'any',
        maxParticipants: 2,
        participantIds: [],
        createdAt: new Date(),
        ...overrides,
      })
    })
  }

  it('lets a member take a free spot', async () => {
    await seedActivity()
    await assertSucceeds(
      updateDoc(doc(asUser(AINA), activityPath), { participantIds: [AINA] }),
    )
  })

  it('is full once every spot is taken', async () => {
    await seedActivity({ participantIds: [AINA], maxParticipants: 1 })
    await assertFails(
      updateDoc(doc(asUser(STRANGER), activityPath), { participantIds: [AINA, STRANGER] }),
    )
  })

  it('never lets a member add someone else, or join their own activity', async () => {
    await seedActivity()
    await assertFails(
      updateDoc(doc(asUser(AINA), activityPath), { participantIds: [STRANGER] }),
    )
    await assertFails(
      updateDoc(doc(asUser(GARY), activityPath), { participantIds: [GARY] }),
    )
  })

  it('cannot be joined once it has started', async () => {
    await seedActivity({ startAt: inDays(-1) })
    await assertFails(
      updateDoc(doc(asUser(AINA), activityPath), { participantIds: [AINA] }),
    )
  })

  it('lets a participant give up their own spot, even once started', async () => {
    await seedActivity({ participantIds: [AINA], startAt: inDays(-1) })
    await assertSucceeds(
      updateDoc(doc(asUser(AINA), activityPath), { participantIds: [] }),
    )
  })

  it('never lets anyone but that person remove them, except the organizer', async () => {
    await seedActivity({ participantIds: [AINA] })
    await assertFails(
      updateDoc(doc(asUser(STRANGER), activityPath), { participantIds: [] }),
    )
    await assertSucceeds(
      updateDoc(doc(asUser(GARY), activityPath), { participantIds: [] }),
    )
  })

  it('can be found by organizer or participant queries', async () => {
    await seedActivity({ participantIds: [AINA] })
    const organizerSnapshot = await getDocs(
      query(collection(asUser(GARY), 'groupActivities'), where('organizerId', '==', GARY)),
    )
    expect(organizerSnapshot.docs.map((entry) => entry.id)).toEqual(['activity_1'])

    const participantSnapshot = await getDocs(
      query(
        collection(asUser(AINA), 'groupActivities'),
        where('participantIds', 'array-contains', AINA),
      ),
    )
    expect(participantSnapshot.docs.map((entry) => entry.id)).toEqual(['activity_1'])
  })
})

describe('QR check-in codes', () => {
  const activityPath = 'groupActivities/activity_1'
  const codePath = `${activityPath}/checkIn/current`
  const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  async function seedActivity(overrides: Record<string, unknown> = {}) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(modular(context), activityPath), {
        id: 'activity_1',
        organizerId: GARY,
        sportId: 'badminton',
        title: 'Saturday Badminton Meetup',
        description: '',
        startAt: inDays(-1),
        endAt: null,
        timeZone: 'Asia/Kuala_Lumpur',
        areaId: 'subang-jaya',
        venueName: 'KL Sports City',
        budget: { min: 10, max: 20 },
        preferredSkillLevel: 'any',
        maxParticipants: 8,
        participantIds: [AINA],
        createdAt: new Date(),
        ...overrides,
      })
    })
  }

  const code = (overrides: Record<string, unknown> = {}) => ({
    organizerId: GARY,
    code: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
    updatedAt: serverTimestamp(),
    ...overrides,
  })

  it('can be created and read only by the organizer', async () => {
    await seedActivity()
    await assertSucceeds(setDoc(doc(asUser(GARY), codePath), code()))
    await assertSucceeds(getDoc(doc(asUser(GARY), codePath)))
    await assertFails(getDoc(doc(asUser(AINA), codePath)))
    await assertFails(getDoc(doc(asUser(STRANGER), codePath)))
  })

  it('cannot be created by anyone but the organizer', async () => {
    await seedActivity()
    await assertFails(setDoc(doc(asUser(AINA), codePath), code({ organizerId: AINA })))
  })

  it('can be regenerated by the organizer, invalidating the old code', async () => {
    await seedActivity()
    await assertSucceeds(setDoc(doc(asUser(GARY), codePath), code()))
    await assertSucceeds(
      updateDoc(doc(asUser(GARY), codePath), code({ code: 'DIFFERENTCODE12345678' })),
    )
  })

  it('rejects malformed fields and extra keys', async () => {
    await seedActivity()
    await assertFails(setDoc(doc(asUser(GARY), codePath), code({ code: '' })))
    await assertFails(setDoc(doc(asUser(GARY), codePath), code({ extra: true })))
  })

  it('can never be listed', async () => {
    await seedActivity()
    await assertFails(getDocs(collection(asUser(GARY), `${activityPath}/checkIn`)))
  })
})

describe('attendance records', () => {
  const activityPath = 'groupActivities/activity_1'
  const codePath = `${activityPath}/checkIn/current`
  const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  const CODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const recordPath = (userId: string) => `attendanceRecords/activity_1__${userId}`

  async function seedActivity(overrides: Record<string, unknown> = {}) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(modular(context), activityPath), {
        id: 'activity_1',
        organizerId: GARY,
        sportId: 'badminton',
        title: 'Saturday Badminton Meetup',
        description: '',
        startAt: inDays(-1),
        endAt: null,
        timeZone: 'Asia/Kuala_Lumpur',
        areaId: 'subang-jaya',
        venueName: 'KL Sports City',
        budget: { min: 10, max: 20 },
        preferredSkillLevel: 'any',
        maxParticipants: 8,
        participantIds: [AINA],
        createdAt: new Date(),
        ...overrides,
      })
      await setDoc(doc(modular(context), codePath), {
        organizerId: GARY,
        code: CODE,
        updatedAt: new Date(),
      })
    })
  }

  const record = (userId: string, overrides: Record<string, unknown> = {}) => ({
    id: `activity_1__${userId}`,
    activityId: 'activity_1',
    userId,
    code: CODE,
    checkedInAt: serverTimestamp(),
    ...overrides,
  })

  it('lets a participant check in with the current code', async () => {
    await seedActivity()
    await assertSucceeds(setDoc(doc(asUser(AINA), recordPath(AINA)), record(AINA)))
  })

  it('lets the organizer check themselves in too', async () => {
    await seedActivity()
    await assertSucceeds(setDoc(doc(asUser(GARY), recordPath(GARY)), record(GARY)))
  })

  it('refuses a stranger who was never joined', async () => {
    await seedActivity()
    await assertFails(setDoc(doc(asUser(STRANGER), recordPath(STRANGER)), record(STRANGER)))
  })

  it('refuses the wrong code', async () => {
    await seedActivity()
    await assertFails(
      setDoc(doc(asUser(AINA), recordPath(AINA)), record(AINA, { code: 'WRONGCODE' })),
    )
  })

  it('refuses checking in before the activity has started', async () => {
    await seedActivity({ startAt: inDays(1) })
    await assertFails(setDoc(doc(asUser(AINA), recordPath(AINA)), record(AINA)))
  })

  it('never lets a member record someone else\'s check-in', async () => {
    await seedActivity()
    await assertFails(setDoc(doc(asUser(AINA), recordPath(GARY)), record(GARY, { userId: AINA })))
  })

  it('is immutable once created', async () => {
    await seedActivity()
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(modular(context), recordPath(AINA)), record(AINA))
    })
    await assertFails(
      updateDoc(doc(asUser(AINA), recordPath(AINA)), { checkedInAt: serverTimestamp() }),
    )
    await assertFails(deleteDoc(doc(asUser(AINA), recordPath(AINA))))
    await assertFails(deleteDoc(doc(asUser(GARY), recordPath(AINA))))
  })

  it('can be read by the attendee or the organizer, never a stranger', async () => {
    await seedActivity()
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(modular(context), recordPath(AINA)), record(AINA))
    })
    await assertSucceeds(getDoc(doc(asUser(AINA), recordPath(AINA))))
    await assertSucceeds(getDoc(doc(asUser(GARY), recordPath(AINA))))
    await assertFails(getDoc(doc(asUser(STRANGER), recordPath(AINA))))
  })

  it('can be queried by the owner for their Reliability Profile', async () => {
    await seedActivity()
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(modular(context), recordPath(AINA)), record(AINA))
    })
    const snapshot = await getDocs(
      query(collection(asUser(AINA), 'attendanceRecords'), where('userId', '==', AINA)),
    )
    expect(snapshot.docs.map((entry) => entry.id)).toEqual(['activity_1__aina'])
    await assertFails(
      getDocs(query(collection(asUser(STRANGER), 'attendanceRecords'), where('userId', '==', AINA))),
    )
  })

  it('can be queried by the organizer for the activity attendee list', async () => {
    await seedActivity()
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(modular(context), recordPath(AINA)), record(AINA))
    })
    const snapshot = await getDocs(
      query(collection(asUser(GARY), 'attendanceRecords'), where('activityId', '==', 'activity_1')),
    )
    expect(snapshot.docs.map((entry) => entry.id)).toEqual(['activity_1__aina'])
  })
})
