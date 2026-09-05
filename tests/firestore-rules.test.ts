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
