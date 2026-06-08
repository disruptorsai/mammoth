import { useCallback, useRef, useState } from 'react'
import Icon from './Icon'

// Lightweight, self-contained toast. Each page calls useToast(), renders {node},
// and calls show('message') — handy for actions that need an integration we
// haven't wired yet, so buttons give feedback instead of doing nothing.
export function useToast() {
  const [msg, setMsg] = useState(null)
  const timer = useRef()

  const show = useCallback((message, icon = 'info') => {
    setMsg({ message, icon })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(null), 2800)
  }, [])

  const node = msg ? (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-2 bg-surface-container border border-primary/40 text-on-surface px-4 py-3 rounded-xl shadow-2xl animate-fade-in-up max-w-[90vw]">
      <Icon name={msg.icon} className="text-primary text-base shrink-0" />
      <span className="text-sm">{msg.message}</span>
    </div>
  ) : null

  return { show, node }
}
