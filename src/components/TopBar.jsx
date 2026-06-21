import Icon from './Icon'
import GlobalSearch from './GlobalSearch'
import NotificationsMenu from './NotificationsMenu'
import SettingsMenu from './SettingsMenu'
import { useAuth } from '../context/AuthContext'

// Shared sticky top bar. `title` differs per page (matches each Stitch export header).
export default function TopBar({ title, searchPlaceholder = 'Global Search…', onMenu }) {
  const { user } = useAuth()
  const initial = (user?.email?.[0] || '?').toUpperCase()
  return (
    <header className="flex justify-between items-center px-margin-mobile md:px-margin-desktop w-full h-16 sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-outline">
      <div className="flex items-center gap-4 min-w-0">
        <button
          className="md:hidden p-2 text-primary"
          onClick={onMenu}
          aria-label="Open navigation"
        >
          <Icon name="menu" />
        </button>
        <h1 className="font-headline-lg text-headline-lg font-bold text-primary truncate">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-4 sm:gap-6">
        <GlobalSearch placeholder={searchPlaceholder} />
        <div className="flex items-center gap-3 sm:gap-4">
          <NotificationsMenu />
          <SettingsMenu />
          <div
            title={user?.email || 'Signed in'}
            className="w-8 h-8 rounded-full border border-primary shrink-0 bg-primary/15 text-primary text-xs font-bold flex items-center justify-center"
          >
            {initial}
          </div>
        </div>
      </div>
    </header>
  )
}
