import { useOutletContext } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Icon from '../components/Icon'
import { useClient } from '../context/ClientContext'

// Paywall / token billing. The call described this as a placeholder for now:
// token usage explainer + Stripe-backed top-ups + plan tiers + profile.
const PLANS = [
  {
    name: 'Growth',
    price: '$1,500',
    cadence: '/mo',
    tokens: '2M tokens',
    features: ['Internal task board', 'SEO/GEO suite', '2 connected channels', 'Email support'],
    active: false,
  },
  {
    name: 'Scale',
    price: '$3,500',
    cadence: '/mo',
    tokens: '6M tokens',
    features: ['Everything in Growth', 'Paid ads + AI copy', 'Social auto-posting', 'Priority GPU queue'],
    active: true,
  },
  {
    name: 'Mammoth',
    price: '$7,500',
    cadence: '/mo',
    tokens: '20M tokens',
    features: ['Everything in Scale', 'CRM integrations', 'Dedicated strategist', 'Custom AI agents'],
    active: false,
  },
]

const TOKEN_PACKS = [
  { tokens: '500K', price: '$49' },
  { tokens: '1M', price: '$89', best: true },
  { tokens: '5M', price: '$399' },
]

export default function Subscription() {
  const { openNav } = useOutletContext()
  const { activeClient } = useClient()
  const used = 4.2
  const total = 6
  const pct = Math.round((used / total) * 100)

  return (
    <>
      <TopBar title="Subscription" searchPlaceholder="Search billing…" onMenu={openNav} />
      <div className="p-margin-mobile md:p-margin-desktop max-w-container-max mx-auto w-full space-y-gutter">
        {/* Token usage + profile */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="lg:col-span-8 bg-surface-container border border-outline rounded-xl p-8 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="font-headline-lg text-headline-lg font-bold text-primary mb-1">
                  Token Usage
                </h2>
                <p className="font-label-mono text-label-mono uppercase tracking-widest text-on-surface-variant opacity-60">
                  Current billing cycle — {activeClient.name}
                </p>
              </div>
              <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-lg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-label-mono text-label-mono text-primary">SCALE PLAN</span>
              </div>
            </div>
            <div>
              <div className="flex items-end justify-between mb-3">
                <p className="text-4xl font-bold mono-data">
                  {used}M <span className="text-on-surface-variant text-lg font-normal">/ {total}M</span>
                </p>
                <p className="text-sm text-on-surface-variant font-label-mono">{pct}% used</p>
              </div>
              <div className="w-full h-3 bg-surface-variant rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full shadow-[0_0_12px_#eec065]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-on-surface-variant mt-3">
                Resets on the 1st. Tokens are consumed by content generation, image/video synthesis,
                and AI copy. Roughly 1 blog ≈ 8K tokens, 1 image ≈ 4K tokens.
              </p>
            </div>
          </div>

          {/* Profile */}
          <div className="lg:col-span-4 bg-surface-container border border-outline rounded-xl p-8 flex flex-col">
            <h3 className="font-headline-lg text-headline-lg font-bold mb-6">Profile</h3>
            <div className="space-y-4 text-sm">
              <Field icon="business" label="Account" value={activeClient.name} />
              <Field icon="mail" label="Email" value="billing@disruptorsmedia.com" />
              <Field icon="call" label="Phone" value="+1 (801) 555-0142" />
              <Field icon="credit_card" label="Payment" value="Visa •••• 4242" />
            </div>
            <button className="mt-auto w-full py-3 border border-primary text-primary font-bold rounded-xl hover:bg-primary hover:text-black transition-all">
              Manage in Stripe
            </button>
          </div>
        </section>

        {/* Buy more tokens */}
        <section className="bg-surface-container border border-outline rounded-xl p-8">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 mb-6">
            <div>
              <h3 className="font-headline-lg text-headline-lg font-bold">Need more tokens?</h3>
              <p className="text-on-surface-variant text-sm opacity-60">
                One-time top-ups, billed instantly via Stripe. No plan change required.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
            {TOKEN_PACKS.map((p) => (
              <div
                key={p.tokens}
                className={`relative p-6 rounded-xl border flex flex-col items-center text-center transition-all ${
                  p.best
                    ? 'border-primary bg-primary/5'
                    : 'border-outline bg-surface-container-low hover:border-primary'
                }`}
              >
                {p.best && (
                  <span className="absolute -top-3 px-3 py-0.5 bg-primary text-black text-[10px] font-bold rounded-full uppercase tracking-wider">
                    Best value
                  </span>
                )}
                <p className="text-3xl font-bold mono-data mt-2">{p.tokens}</p>
                <p className="text-on-surface-variant text-xs mb-4">tokens</p>
                <p className="text-2xl font-bold text-primary mb-4">{p.price}</p>
                <button className="w-full py-2.5 gold-gradient text-black font-bold rounded-lg hover:opacity-90 transition-opacity">
                  Purchase
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Plans */}
        <section>
          <h3 className="font-headline-lg text-headline-lg font-bold mb-6">Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-8 flex flex-col ${
                  plan.active
                    ? 'border-primary bg-primary/5 shadow-[0_0_24px_rgba(238,192,101,0.08)]'
                    : 'border-outline bg-surface-container'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-headline-lg text-xl font-bold">{plan.name}</h4>
                  {plan.active && (
                    <span className="text-[10px] bg-primary text-black px-2 py-0.5 rounded-full font-bold uppercase">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-on-surface-variant text-xs font-label-mono mb-4">{plan.tokens}</p>
                <p className="mb-6">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-on-surface-variant text-sm">{plan.cadence}</span>
                </p>
                <ul className="space-y-3 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Icon name="check_circle" filled className="text-primary text-base" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-3 rounded-xl font-bold transition-all ${
                    plan.active
                      ? 'bg-surface-variant text-on-surface-variant cursor-default'
                      : 'gold-gradient text-black hover:opacity-90'
                  }`}
                >
                  {plan.active ? 'Active' : `Switch to ${plan.name}`}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

function Field({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-surface-variant/50 flex items-center justify-center text-on-surface-variant shrink-0">
        <Icon name={icon} className="text-lg" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-label-mono">
          {label}
        </p>
        <p className="truncate font-medium">{value}</p>
      </div>
    </div>
  )
}
