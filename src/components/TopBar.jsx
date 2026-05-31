import Icon from './Icon'
import ClientSwitcher from './ClientSwitcher'

const AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCNFExjzuHE3meAeN16DL0CEdvJCMJCBhacGY1mfphag047zDbEb43XaSsucWxXGySQ199TSk4pjdKmxit_KXe1nuSJCLLULuIMDZaqLtLdxOhK9IbSC-ZeGs5ABhsJ9G8MshwG_UOsIN0NAh78Lf8aBRpGDuXX_cY4a1Q4vQr-mIbD3BccHf0iXrjS7gJfPwQKk-7G0ECLnMc60bAq6Jk8N3wpWwQNPi4fn3akAbPAkcEKGFuKFUKX9B1kGBwK4ikRakIirNsxILqp'

// Shared sticky top bar. `title` differs per page (matches each Stitch export header).
export default function TopBar({ title, searchPlaceholder = 'Global Search…', onMenu }) {
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
        <div className="relative hidden lg:block">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm"
          />
          <input
            className="bg-surface-container border border-outline rounded-xl pl-10 pr-4 py-1.5 text-sm focus:outline-none focus:border-primary w-56 xl:w-64 transition-all"
            placeholder={searchPlaceholder}
            type="text"
          />
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <Icon
            name="notifications"
            className="text-on-surface-variant cursor-pointer hover:text-primary transition-colors"
          />
          <Icon
            name="settings"
            className="text-on-surface-variant cursor-pointer hover:text-primary transition-colors hidden sm:inline"
          />
          <ClientSwitcher />
          <div className="w-8 h-8 rounded-full overflow-hidden border border-primary cursor-pointer active:opacity-80 shrink-0">
            <img alt="User profile" className="w-full h-full object-cover" src={AVATAR} />
          </div>
        </div>
      </div>
    </header>
  )
}
