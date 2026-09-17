/**
 * Seeds 5 demo members into the live Firebase project: an Auth account, a
 * private `users/{uid}` document and a discovery-safe `publicProfiles/{uid}`
 * listing for each.
 *
 * It signs in AS each member and writes only that member's own documents, so
 * it needs no admin credentials and passes `firestore.rules` unchanged. Run
 * it against a development project only.
 *
 *   node scripts/seed-firebase.mjs
 *
 * Idempotent: an account that already exists is signed into and its two
 * documents are rewritten.
 */
import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore'

const SEED_PASSWORD = 'SportsBuddy123!'

/** Shared by every seeded member; only `discovery` differs per person. */
const preferences = (preferredSports, preferredSkillLevels, preferredIntents) => ({
  discovery: {
    preferredSports,
    preferredSkillLevels,
    preferredIntents,
    maxDistanceKm: 15,
    requireAvailabilityOverlap: false,
  },
  privacy: { discoverable: true },
  notifications: {
    newConnection: true,
    messages: true,
    activityReminders: true,
    activityChanges: true,
  },
})

/**
 * Deliberately spread across sports, skills, areas, availability and budget so
 * the compatibility engine produces a real range of scores rather than five
 * near-identical matches.
 */
const MEMBERS = [
  {
    email: 'aina.demo@sportsbuddy.app',
    displayName: 'Aina Rahman',
    bio: 'Badminton three times a week. Happy to rally with anyone who shows up on time.',
    sports: [
      { sportId: 'badminton', skillLevel: 'intermediate' },
      { sportId: 'gym', skillLevel: 'casual' },
    ],
    intents: ['casual', 'social'],
    preferredIntensity: 'moderate',
    availability: [
      { day: 'tuesday', periods: ['evening'] },
      { day: 'thursday', periods: ['evening'] },
      { day: 'saturday', periods: ['morning', 'afternoon'] },
    ],
    area: 'subang-jaya',
    radiusKm: 10,
    budget: { min: 20, max: 40 },
    discovery: [['badminton'], ['casual', 'intermediate'], ['casual', 'social']],
  },
  {
    email: 'jason.demo@sportsbuddy.app',
    displayName: 'Jason Lim',
    bio: 'Climbing most weekends, gym on weeknights. Always up for a project route.',
    sports: [
      { sportId: 'climbing', skillLevel: 'advanced' },
      { sportId: 'gym', skillLevel: 'intermediate' },
    ],
    intents: ['training', 'competitive'],
    preferredIntensity: 'high',
    availability: [
      { day: 'wednesday', periods: ['evening'] },
      { day: 'saturday', periods: ['morning'] },
      { day: 'sunday', periods: ['morning', 'afternoon'] },
    ],
    area: 'petaling-jaya',
    radiusKm: 15,
    budget: { min: 40, max: 60 },
    discovery: [['climbing', 'gym'], ['intermediate', 'advanced'], ['training']],
  },
  {
    email: 'mei.demo@sportsbuddy.app',
    displayName: 'Mei Chan',
    bio: 'Easy morning runs, 5 to 8km. Coffee afterwards is non-negotiable.',
    sports: [
      { sportId: 'running', skillLevel: 'casual' },
      { sportId: 'badminton', skillLevel: 'beginner' },
    ],
    intents: ['social', 'casual'],
    preferredIntensity: 'relaxed',
    availability: [
      { day: 'monday', periods: ['morning'] },
      { day: 'wednesday', periods: ['morning'] },
      { day: 'sunday', periods: ['morning'] },
    ],
    area: 'puchong',
    radiusKm: 10,
    budget: { min: 0, max: 10 },
    discovery: [['running'], ['beginner', 'casual'], ['social']],
  },
  {
    email: 'daniel.demo@sportsbuddy.app',
    displayName: 'Daniel Foo',
    bio: 'Futsal on weeknights, basketball when the court is free. Competitive but friendly.',
    sports: [
      { sportId: 'futsal', skillLevel: 'intermediate' },
      { sportId: 'basketball', skillLevel: 'casual' },
    ],
    intents: ['competitive', 'casual'],
    preferredIntensity: 'high',
    availability: [
      { day: 'tuesday', periods: ['evening'] },
      { day: 'friday', periods: ['evening'] },
    ],
    area: 'cheras',
    radiusKm: 20,
    budget: { min: 10, max: 20 },
    discovery: [['futsal', 'basketball'], ['casual', 'intermediate'], ['competitive']],
  },
  {
    email: 'farah.demo@sportsbuddy.app',
    displayName: 'Farah Idris',
    bio: 'Tennis and pickleball. Learning to serve properly, patient partners very welcome.',
    sports: [
      { sportId: 'tennis', skillLevel: 'intermediate' },
      { sportId: 'pickleball', skillLevel: 'beginner' },
    ],
    intents: ['training', 'social'],
    preferredIntensity: 'moderate',
    availability: [
      { day: 'thursday', periods: ['evening'] },
      { day: 'saturday', periods: ['afternoon', 'evening'] },
      { day: 'sunday', periods: ['afternoon'] },
    ],
    area: 'kuala-lumpur',
    radiusKm: 15,
    budget: { min: 20, max: 40 },
    discovery: [['tennis', 'pickleball'], ['beginner', 'intermediate'], ['training', 'social']],
  },
]

function readFirebaseConfig() {
  const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  const env = Object.fromEntries(
    raw
      .split('\n')
      .filter((line) => /^VITE_/.test(line))
      .map((line) => {
        const index = line.indexOf('=')
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()]
      }),
  )

  const config = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  }

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key)
  if (missing.length > 0) {
    throw new Error(`.env.local is missing: ${missing.join(', ')}`)
  }
  return config
}

async function signInOrCreate(auth, { email, displayName }) {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, SEED_PASSWORD)
    await updateProfile(user, { displayName })
    return { user, created: true }
  } catch (error) {
    if (error?.code !== 'auth/email-already-in-use') throw error
    const { user } = await signInWithEmailAndPassword(auth, email, SEED_PASSWORD)
    return { user, created: false }
  }
}

/**
 * Both writes list their fields explicitly, matching the `keys().hasOnly(...)`
 * allowlists in `firestore.rules` — never a spread of the member object.
 */
async function writeDocuments(db, uid, member) {
  const {
    email,
    displayName,
    bio,
    sports,
    intents,
    preferredIntensity,
    availability,
    area,
    radiusKm,
    budget,
    discovery,
  } = member

  await setDoc(doc(db, 'users', uid), {
    id: uid,
    email,
    displayName,
    photoUrl: null,
    bio,
    sports,
    intents,
    preferredIntensity,
    availability,
    area,
    radiusKm,
    budget,
    preferences: preferences(...discovery),
    onboardingCompleted: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await setDoc(doc(db, 'publicProfiles', uid), {
    userId: uid,
    displayName,
    photoUrl: null,
    bio,
    sports,
    intents,
    preferredIntensity,
    availability,
    area,
    budget,
    // Every seeded profile fills every required field plus a bio, which is
    // exactly what getProfileCompleteness() scores as 100.
    profileCompleteness: 100,
    discoverable: true,
    updatedAt: serverTimestamp(),
  })
}

async function main() {
  const config = readFirebaseConfig()
  const app = initializeApp(config)
  const auth = getAuth(app)
  const db = getFirestore(app)

  console.log(`Seeding ${MEMBERS.length} members into ${config.projectId}\n`)

  const results = []
  for (const member of MEMBERS) {
    try {
      const { user, created } = await signInOrCreate(auth, member)
      await writeDocuments(db, user.uid, member)
      await signOut(auth)
      results.push({ member, uid: user.uid, created })
      console.log(
        `  ${created ? 'created' : 'updated'}  ${member.displayName.padEnd(14)} ${member.email}`,
      )
    } catch (error) {
      results.push({ member, error })
      console.log(`  FAILED   ${member.displayName.padEnd(14)} ${error?.code ?? error?.message}`)
    }
  }

  const ok = results.filter((result) => !result.error)
  console.log(`\n${ok.length}/${MEMBERS.length} seeded.`)
  if (ok.length > 0) {
    console.log(`Sign in as any of them with the password: ${SEED_PASSWORD}`)
  }
  const failed = results.filter((result) => result.error)
  if (failed.length > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error?.message ?? error)
  process.exitCode = 1
})
