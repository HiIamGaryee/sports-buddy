import { readFileSync } from 'node:fs'

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  deleteDoc,
  doc,
  getDoc,
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

const asUser = (uid: string) => modular(testEnv.authenticatedContext(uid))

const asGuest = () => modular(testEnv.unauthenticatedContext())

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
afterAll(() => testEnv.cleanup())

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

describe('the pair id', () => {
  it('agrees with the rules, whichever way round it is built', () => {
    expect(createConnectionId(AINA, GARY)).toBe(PAIR)
    expect(PAIR).toBe(`${AINA}__${GARY}`)
  })
})
