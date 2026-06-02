import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { fetchClients, createClient } from '../lib/clients'
import { useAuth } from './AuthContext'
import Icon from '../components/Icon'

const ClientContext = createContext(null)

// Safe placeholder so pages never crash on a missing active client.
const FALLBACK = { id: '', name: '—', initials: '—', health: 0, features: { internal: true } }

export function ClientProvider({ children }) {
  const { isAdmin, profile } = useAuth()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let rows = await fetchClients()
      // RLS already scopes client users to their own row; filter defensively too.
      if (!isAdmin && profile?.client_id) rows = rows.filter((c) => c.id === profile.client_id)
      setClients(rows)
      setActiveId((prev) => (rows.some((c) => c.id === prev) ? prev : rows[0]?.id ?? null))
    } catch {
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [isAdmin, profile?.client_id])

  useEffect(() => {
    load()
  }, [load])

  const addClient = useCallback(
    async (fields) => {
      const created = await createClient(fields)
      await load()
      setActiveId(created.id)
      return created
    },
    [load],
  )

  const value = useMemo(() => {
    const activeClient = clients.find((c) => c.id === activeId) ?? clients[0] ?? FALLBACK
    return {
      clients,
      activeClient,
      setActiveClient: setActiveId,
      canSwitch: isAdmin,
      addClient,
      reload: load,
    }
  }, [clients, activeId, isAdmin, addClient, load])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Icon name="progress_activity" className="animate-spin text-primary text-4xl" />
      </div>
    )
  }

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
}

export function useClient() {
  const ctx = useContext(ClientContext)
  if (!ctx) throw new Error('useClient must be used within a ClientProvider')
  return ctx
}
