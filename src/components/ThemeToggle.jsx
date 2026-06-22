import { useEffect, useState } from 'react'
import Icon from './Icon'

// Light/dark toggle. Default is dark (set in index.html before paint); the
// choice persists in localStorage and flips the [data-theme] on <html>, which
// drives the CSS theme variables in index.css.
export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('mc.theme', theme)
    } catch {
      /* private mode — won't persist */
    }
  }, [theme])

  return (
    <button
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      className="text-on-surface-variant hover:text-primary transition-colors"
    >
      <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} />
    </button>
  )
}
