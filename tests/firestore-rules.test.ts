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
  serverTimestamp,
  setDoc,
  updateDoc,
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
      port: 8080,
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

  it('stops a connected relationship being deleted', async () => {
    await seed(PAIR, {
      id: PAIR,
      participants: sortConnectionPair(GARY, AINA),
      requestedBy: sortConnectionPair(GARY, AINA),
      status: 'connected',
      createdAt: new Date(),
      updatedAt: new Date(),
      connectedAt: new Date(),
    })
    await assertFails(deleteDoc(doc(asUser(GARY), connectionPath(PAIR))))
    await assertFails(deleteDoc(doc(asUser(AINA), connectionPath(PAIR))))
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

describe('the pair id', () => {
  it('agrees with the rules, whichever way round it is built', () => {
    expect(createConnectionId(AINA, GARY)).toBe(PAIR)
    expect(PAIR).toBe(`${AINA}__${GARY}`)
  })
})
