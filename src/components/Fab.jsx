import Icon from './Icon'

// Sticky contextual action button, present on the dashboard-style screens.
export default function Fab({ icon = 'bolt', title = 'Quick Action' }) {
  return (
    <button
      title={title}
      className="fixed bottom-8 right-8 w-14 h-14 md:w-16 md:h-16 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all duration-300 z-40"
    >
      <Icon name={icon} className="text-3xl" />
    </button>
  )
}
