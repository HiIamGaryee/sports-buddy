import { Link } from 'react-router-dom'

import logo from '@/assets/logo.png'
import { ROUTES } from '@/routes/routes'

const POLICY_SECTIONS = [
  {
    title: 'What we collect',
    content:
      'We collect your email address to create and secure your account. We also collect the approximate area you choose to share so Sports Buddy can help you find relevant people and activities nearby. Messages and other chat content are stored so conversations work as expected.',
  },
  {
    title: 'Location information',
    content:
      'Sports Buddy does not collect GPS or any other precise location data. We do not request location permissions. Your approximate area is the only location information used, and your precise location is never shown to other users.',
  },
  {
    title: 'How we use information',
    content:
      'We use this information to provide the service, help people connect around sports, and support conversations. We do not sell your personal information.',
  },
] as const

export function PrivacyPolicyPage() {
  return (
    <main className="min-h-dvh bg-background px-gutter py-8 text-foreground sm:py-12">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            to={ROUTES.login}
            className="flex items-center gap-2.5 text-label text-foreground"
          >
            <img src={logo} alt="Sports Buddy" className="size-9 object-contain" />
            Sports Buddy
          </Link>
          <Link to={ROUTES.login} className="text-label text-primary">
            Sign in
          </Link>
        </header>

        <article className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
          <div className="flex flex-col gap-3">
            <p className="text-caption text-muted-foreground uppercase">
              Sports Buddy
            </p>
            <h1 className="text-heading-1">Privacy Policy</h1>
            <p className="text-body text-muted-foreground">
              This policy explains the information Sports Buddy collects and how
              we use it.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-7">
            {POLICY_SECTIONS.map((section) => (
              <section key={section.title} className="flex flex-col gap-2">
                <h2 className="text-title">{section.title}</h2>
                <p className="text-body text-muted-foreground">
                  {section.content}
                </p>
              </section>
            ))}
          </div>
        </article>

        <p className="text-center text-body-small text-muted-foreground">
          <Link to={ROUTES.register} className="text-label text-primary">
            Create an account
          </Link>{' '}
          or sign in to get started.
        </p>
      </div>
    </main>
  )
}
