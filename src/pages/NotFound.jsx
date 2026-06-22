import { Link, useOutletContext } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Icon from '../components/Icon'

export default function NotFound() {
  const { openNav } = useOutletContext()
  return (
    <>
      <TopBar title="Lost in space" onMenu={openNav} />
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-6">
        <Icon name="rocket_launch" className="text-7xl text-primary opacity-40" />
        <div>
          <h2 className="font-headline-xl text-headline-xl-mobile text-primary">404</h2>
          <p className="text-on-surface-variant mt-2">This module isn't wired up yet.</p>
        </div>
        <Link
          to="/"
          className="px-6 py-3 gold-gradient text-on-primary font-bold rounded-full hover:opacity-90 transition-opacity"
        >
          Back to Mission Control
        </Link>
      </div>
    </>
  )
}
