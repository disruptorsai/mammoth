import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { CLIENTS } from '../data/clients'
import { useAuth } from './AuthContext'

const ClientContext = createContext(null)

export function ClientProvider({ children }) {
  const { isAdmin, profile } = useAuth()

  // Admins see every client; client users are locked to their own.
  const clients = useMemo(() => {
    if (isAdmin) return CLIENTS
    const own = CLIENTS.filter((c) => c.id === profile?.client_id)
    if (own.length) return own
    // Profile points at a client_id not in the local roster — synthesize a stub
    // so the app still scopes data to it.
    if (profile?.client_id) {
      return [
        {
          id: profile.client_id,
          name: profile.client_id,
          initials: profile.client_id.slice(0, 2).toUpperCase(),
          health: 0,
          features: { internal: true },
        },
      ]
    }
    return CLIENTS.slice(0, 1)
  }, [isAdmin, profile?.client_id])

  const [activeId, setActiveId] = useState(clients[0]?.id)

  // Keep the active client valid as the visible set changes.
  useEffect(() => {
    if (!clients.some((c) => c.id === activeId)) setActiveId(clients[0]?.id)
  }, [clients, activeId])

  const value = useMemo(() => {
    const activeClient = clients.find((c) => c.id === activeId) ?? clients[0]
    return {
      clients,
      activeClient,
      setActiveClient: setActiveId,
      canSwitch: isAdmin && clients.length > 1,
    }
  }, [clients, activeId, isAdmin])

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
}

export function useClient() {
  const ctx = useContext(ClientContext)
  if (!ctx) throw new Error('useClient must be used within a ClientProvider')
  return ctx
}
