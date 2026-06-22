import { useState } from 'react'
import Icon from './Icon'
import { useAuth } from '../context/AuthContext'
import NewClientModal from './NewClientModal'

// Shown when there are no clients yet. Admins must create one before using the
// app (so nothing renders against a blank workspace); client users see a notice.
export default function EmptyRosterGate() {
  const { isAdmin, signOut } = useAuth()
  const [showNew, setShowNew] = useState(false)

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 text-center">
      <div className="max-w-sm flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center">
          <Icon name={isAdmin ? 'group_add' : 'lock'} filled className="text-on-primary text-3xl" />
        </div>

        {isAdmin ? (
          <>
            <h1 className="font-headline-lg text-xl text-on-surface">Create your first client</h1>
            <p className="text-on-surface-variant text-sm">
              There are no client workspaces yet. Add one to start using the task board, content
              calendar, and the rest of Mission Control.
            </p>
            <button
              onClick={() => setShowNew(true)}
              className="gold-gradient text-on-primary font-bold px-6 py-3 rounded-full flex items-center gap-2 hover:opacity-90 transition-opacity glow-gold"
            >
              <Icon name="add" /> New Client
            </button>
          </>
        ) : (
          <>
            <h1 className="font-headline-lg text-xl text-on-surface">No workspace yet</h1>
            <p className="text-on-surface-variant text-sm">
              Your account isn’t linked to a client workspace yet. Ask your Disruptors strategist to
              finish setting it up.
            </p>
            <button
              onClick={signOut}
              className="text-sm font-bold text-primary hover:underline uppercase tracking-widest"
            >
              Sign out
            </button>
          </>
        )}
      </div>

      {showNew && <NewClientModal onClose={() => setShowNew(false)} />}
    </div>
  )
}
