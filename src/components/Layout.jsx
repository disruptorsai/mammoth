import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

// App shell: fixed sidebar + scrollable main. Pages render their own TopBar so each
// can set its title/search placeholder (faithful to the per-screen Stitch headers).
export default function Layout() {
  const [navOpen, setNavOpen] = useState(false)
  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <main className="md:ml-64 min-h-screen flex flex-col">
        <Outlet context={{ openNav: () => setNavOpen(true) }} />
      </main>
    </div>
  )
}
