import { useState } from 'react'
import Icon from './Icon'
import { useAuth } from '../context/AuthContext'

// Email + password sign-in. No public sign-up — accounts are admin-created.
export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) setError(error.message || 'Sign-in failed.')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-lg gold-gradient flex items-center justify-center">
            <Icon name="rocket_launch" filled className="text-black" />
          </div>
          <div className="text-center">
            <h1 className="font-headline-lg text-2xl font-bold text-primary leading-none">Mission Control</h1>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant opacity-60 font-label-mono mt-1">
              Strategic Intelligence
            </p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="bg-surface-container border border-outline rounded-xl p-6 space-y-4"
        >
          <h2 className="font-headline-lg text-lg text-white">Sign in</h2>

          <label className="block">
            <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Email</span>
            <input
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </label>

          <label className="block">
            <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full bg-surface-container-low border border-outline rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </label>

          {error && (
            <p className="text-error text-sm flex items-center gap-1.5">
              <Icon name="error" className="text-base" /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !email || !password}
            className="w-full gold-gradient text-black font-bold py-3 rounded-full flex items-center justify-center gap-2 hover:opacity-90 transition-opacity glow-gold disabled:opacity-50"
          >
            {busy ? <Icon name="progress_activity" className="animate-spin" /> : <Icon name="login" />}
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-[11px] text-on-surface-variant text-center pt-1">
            Accounts are provisioned by your Disruptors strategist.
          </p>
        </form>
      </div>
    </div>
  )
}
