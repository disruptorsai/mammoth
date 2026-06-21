import Icon from './Icon'
import Login from './Login'
import { useAuth } from '../context/AuthContext'

function Centered({ children }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 text-center">
      <div className="max-w-sm flex flex-col items-center gap-4">{children}</div>
    </div>
  )
}

// Gates the app on authentication: shows the login screen until there's a
// session + a profile row. Renders children only for authenticated users.
export default function AuthGate({ children }) {
  const { configured, loading, session, profile, signOut } = useAuth()

  if (!configured) {
    return (
      <Centered>
        <Icon name="warning" className="text-primary text-4xl" />
        <h1 className="font-headline-lg text-xl text-white">Supabase not configured</h1>
        <p className="text-on-surface-variant text-sm">
          Add <code className="font-label-mono text-primary">VITE_SUPABASE_URL</code> and{' '}
          <code className="font-label-mono text-primary">VITE_SUPABASE_ANON_KEY</code> to{' '}
          <code className="font-label-mono">.env</code>, then restart the dev server.
        </p>
      </Centered>
    )
  }

  if (loading) {
    return (
      <Centered>
        <Icon name="progress_activity" className="animate-spin text-primary text-4xl" />
        <p className="text-on-surface-variant text-sm font-label-mono uppercase tracking-widest">Loading…</p>
      </Centered>
    )
  }

  if (!session) return <Login />

  // Signed in but no profile row (or not yet assigned a role/client).
  if (!profile) {
    return (
      <Centered>
        <Icon name="hourglass_empty" className="text-primary text-4xl" />
        <h1 className="font-headline-lg text-xl text-white">Account pending setup</h1>
        <p className="text-on-surface-variant text-sm">
          Your login works, but it isn’t linked to a workspace yet. Ask your Disruptors strategist
          to finish provisioning your account.
        </p>
        <button
          onClick={signOut}
          className="mt-2 text-sm font-bold text-primary hover:underline uppercase tracking-widest"
        >
          Sign out
        </button>
      </Centered>
    )
  }

  return children
}
