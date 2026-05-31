import { createContext, useContext, useMemo, useState } from 'react'
import { CLIENTS } from '../data/clients'

const ClientContext = createContext(null)

export function ClientProvider({ children }) {
  const [activeId, setActiveId] = useState(CLIENTS[0].id)
  const value = useMemo(() => {
    const activeClient = CLIENTS.find((c) => c.id === activeId) ?? CLIENTS[0]
    return { clients: CLIENTS, activeClient, setActiveClient: setActiveId }
  }, [activeId])
  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
}

export function useClient() {
  const ctx = useContext(ClientContext)
  if (!ctx) throw new Error('useClient must be used within a ClientProvider')
  return ctx
}
