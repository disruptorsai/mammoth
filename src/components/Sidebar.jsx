import { NavLink } from 'react-router-dom'
import Icon from './Icon'
import { NAV_ITEMS } from '../data/nav'
import { useAuth } from '../context/AuthContext'

export default function Sidebar({ open, onClose }) {
  const { signOut } = useAuth()
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-surface-container border-r border-outline flex flex-col h-screen z-50 transition-transform duration-300 md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand anchor */}
        <div className="p-6 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center shrink-0">
              <Icon name="rocket_launch" filled className="text-black" />
            </div>
            <div>
              <h2 className="font-headline-lg text-headline-lg font-bold text-primary leading-none">
                Mission Control
              </h2>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant opacity-60 font-label-mono">
                Strategic Intelligence
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-surface-variant text-primary font-bold'
                    : 'text-on-surface-variant font-medium hover:bg-surface-variant hover:text-primary'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} filled={isActive} />
                  <span className="font-body-md text-body-md">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="p-4 mt-auto space-y-2">
          <button className="w-full gold-gradient text-black font-bold py-3 rounded-full flex items-center justify-center gap-2 hover:opacity-90 transition-opacity glow-gold">
            <Icon name="add" />
            <span>New Campaign</span>
          </button>
          <div className="pt-4 border-t border-outline flex flex-col gap-1">
            <a
              className="flex items-center gap-3 px-4 py-2 text-on-surface-variant text-sm hover:text-primary transition-colors"
              href="#"
            >
              <Icon name="help" className="text-lg" />
              <span>Help Center</span>
            </a>
            <button
              onClick={signOut}
              className="flex items-center gap-3 px-4 py-2 text-on-surface-variant text-sm hover:text-error transition-colors text-left"
            >
              <Icon name="logout" className="text-lg" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
