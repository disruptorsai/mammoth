import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Icon from '../components/Icon'
import { useToast } from '../components/Toast'
import { useClient } from '../context/ClientContext'
import { useAuth } from '../context/AuthContext'
import { updateClient } from '../lib/clients'
import { fetchMonthUsage } from '../lib/ai'

const PLAN_TOKENS = { growth: 2_000_000, scale: 6_000_000, mammoth: 20_000_000 }

function fmtTokens(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

// Plan offerings (display; live billing wires up with Stripe — final prices
// pending). `key` matches the clients.plan check constraint.
const PLANS = [
  {
    key: 'growth',
    name: 'Growth',
    price: '$1,500',
    cadence: '/mo',
    tokens: '2M tokens',
    features: ['Internal task board', 'SEO/GEO suite', '2 connected channels', 'Email support'],
  },
  {
    key: 'scale',
    name: 'Scale',
    price: '$3,500',
    cadence: '/mo',
    tokens: '6M tokens',
    features: ['Everything in Growth', 'Paid ads + AI copy', 'Social auto-posting', 'Priority GPU queue'],
  },
  {
    key: 'mammoth',
    name: 'Mammoth',
    price: '$7,500',
    cadence: '/mo',
    tokens: '20M tokens',
    features: ['Everything in Scale', 'CRM integrations', 'Dedicated strategist', 'Custom AI agents'],
  },
]

const BILLING_ENABLED = import.meta.env.VITE_BILLING_ENABLED === 'true'

export default function Subscription() {
  const { openNav } = useOutletContext()
  const { activeClient, reload } = useClient()
  const { isAdmin } = useAuth()
  const { show, node: toast } = useToast()

  const [billingEmail, setBillingEmail] = useState(activeClient.billingEmail || '')
  const [phone, setPhone] = useState(activeClient.phone || '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [usage, setUsage] = useState(null) // { total, events } | null while loading

  useEffect(() => {
    setBillingEmail(activeClient.billingEmail || '')
    setPhone(activeClient.phone || '')
  }, [activeClient.id, activeClient.billingEmail, activeClient.phone])

  useEffect(() => {
    setUsage(null)
    fetchMonthUsage(activeClient.id)
      .then(setUsage)
      .catch(() => setUsage({ total: 0, events: 0 }))
  }, [activeClient.id])

  const currentPlan = PLANS.find((p) => p.key === activeClient.plan) ?? null
  const profileDirty =
    billingEmail !== (activeClient.billingEmail || '') || phone !== (activeClient.phone || '')

  async function saveProfile(e) {
    e.preventDefault()
    setSavingProfile(true)
    try {
      await updateClient(activeClient.id, { billing_email: billingEmail.trim(), phone: phone.trim() })
      await reload()
      show('Profile saved.', 'check_circle')
    } catch (err) {
      show(err.message ?? String(err), 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  async function setPlan(planKey) {
    if (!isAdmin) {
      show('Plan changes are handled by your strategist.', 'support_agent')
      return
    }
    try {
      await updateClient(activeClient.id, { plan: planKey })
      await reload()
      show(`Plan set to ${planKey}. Billing connects via Stripe soon.`, 'workspace_premium')
    } catch (err) {
      show(err.message ?? String(err), 'error')
    }
  }

  return (
    <>
      <TopBar title="Subscription" searchPlaceholder="Search billing…" onMenu={openNav} />
      <div className="p-margin-mobile md:p-margin-desktop max-w-container-max mx-auto w-full space-y-gutter">
        {/* Plan + usage + profile */}
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
                <span className={`w-2 h-2 rounded-full ${currentPlan ? 'bg-primary animate-pulse' : 'bg-outline'}`} />
                <span className="font-label-mono text-label-mono text-primary uppercase">
                  {currentPlan ? `${currentPlan.name} plan` : 'No plan selected'}
                </span>
              </div>
            </div>
            <div>
              {(() => {
                const used = usage?.total ?? 0
                const allowance = currentPlan ? PLAN_TOKENS[currentPlan.key] : null
                const pct = allowance ? Math.min(100, Math.round((used / allowance) * 100)) : 0
                return (
                  <>
                    <div className="flex items-end justify-between mb-3">
                      <p className="text-4xl font-bold mono-data">
                        {usage === null ? '…' : fmtTokens(used)}{' '}
                        <span className="text-on-surface-variant text-lg font-normal">
                          / {allowance ? fmtTokens(allowance) : '—'}
                        </span>
                      </p>
                      <p className="text-sm text-on-surface-variant font-label-mono">
                        {usage === null
                          ? 'Loading…'
                          : usage.events === 0
                            ? 'No usage recorded yet'
                            : `${usage.events} generation${usage.events === 1 ? '' : 's'} this month${allowance ? ` · ${pct}%` : ''}`}
                      </p>
                    </div>
                    <div className="w-full h-3 bg-surface-variant rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full shadow-[0_0_12px_#eec065]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-on-surface-variant mt-3">
                      Tokens are consumed by AI generation (ad copy, captions). Resets on the 1st.
                    </p>
                  </>
                )
              })()}
            </div>
          </div>

          {/* Profile — real, editable client fields */}
          <form
            onSubmit={saveProfile}
            className="lg:col-span-4 bg-surface-container border border-outline rounded-xl p-8 flex flex-col"
          >
            <h3 className="font-headline-lg text-headline-lg font-bold mb-6">Profile</h3>
            <div className="space-y-4 text-sm flex-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-variant/50 flex items-center justify-center text-on-surface-variant shrink-0">
                  <Icon name="business" className="text-lg" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-label-mono">
                    Account
                  </p>
                  <p className="truncate font-medium">{activeClient.name}</p>
                </div>
              </div>

              <label className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-variant/50 flex items-center justify-center text-on-surface-variant shrink-0">
                  <Icon name="mail" className="text-lg" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-label-mono">
                    Billing email
                  </p>
                  <input
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    disabled={!isAdmin}
                    placeholder="billing@client.com"
                    className="w-full bg-transparent border-b border-outline focus:border-primary focus:outline-none text-sm py-0.5 disabled:opacity-70"
                  />
                </div>
              </label>

              <label className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-variant/50 flex items-center justify-center text-on-surface-variant shrink-0">
                  <Icon name="call" className="text-lg" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-label-mono">
                    Phone
                  </p>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={!isAdmin}
                    placeholder="+1 …"
                    className="w-full bg-transparent border-b border-outline focus:border-primary focus:outline-none text-sm py-0.5 disabled:opacity-70"
                  />
                </div>
              </label>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-variant/50 flex items-center justify-center text-on-surface-variant shrink-0">
                  <Icon name="credit_card" className="text-lg" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-label-mono">
                    Payment
                  </p>
                  <p className="text-on-surface-variant">
                    {BILLING_ENABLED ? 'Managed in Stripe' : 'Billing not connected yet'}
                  </p>
                </div>
              </div>
            </div>

            {isAdmin && (
              <button
                type="submit"
                disabled={!profileDirty || savingProfile}
                className="mt-6 w-full py-3 border border-primary text-primary font-bold rounded-xl hover:bg-primary hover:text-on-primary transition-all disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-primary"
              >
                {savingProfile ? 'Saving…' : 'Save Profile'}
              </button>
            )}
          </form>
        </section>

        {/* Plans */}
        <section>
          <h3 className="font-headline-lg text-headline-lg font-bold mb-2">Plans</h3>
          <p className="text-on-surface-variant text-sm opacity-60 mb-6">
            {BILLING_ENABLED
              ? 'Changes are billed via Stripe.'
              : 'Live billing connects via Stripe soon — plan selection records the agreement for now.'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {PLANS.map((plan) => {
              const active = activeClient.plan === plan.key
              return (
                <div
                  key={plan.key}
                  className={`rounded-xl border p-8 flex flex-col ${
                    active
                      ? 'border-primary bg-primary/5 shadow-[0_0_24px_rgba(238,192,101,0.08)]'
                      : 'border-outline bg-surface-container'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-headline-lg text-xl font-bold">{plan.name}</h4>
                    {active && (
                      <span className="text-[10px] bg-primary text-on-primary px-2 py-0.5 rounded-full font-bold uppercase">
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
                    onClick={active ? undefined : () => setPlan(plan.key)}
                    className={`w-full py-3 rounded-xl font-bold transition-all ${
                      active
                        ? 'bg-surface-variant text-on-surface-variant cursor-default'
                        : 'gold-gradient text-on-primary hover:opacity-90'
                    }`}
                  >
                    {active ? 'Active' : `Switch to ${plan.name}`}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      </div>
      {toast}
    </>
  )
}
