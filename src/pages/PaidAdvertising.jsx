import { useOutletContext } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Icon from '../components/Icon'
import Fab from '../components/Fab'

const CAMPAIGNS = [
  {
    iconBg: 'bg-primary/20 border-primary/40',
    iconName: 'rocket_launch',
    iconColor: 'text-primary',
    name: 'Q4 Growth Accelerator',
    meta: 'META • ID: 90210-44',
    statusClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    status: 'ACTIVE',
    spend: '$12,400.00',
    impressions: '1,240,501',
  },
  {
    iconBg: 'bg-white/5 border-outline',
    iconName: 'target',
    iconColor: 'text-white',
    name: 'Omni-Channel Retargeting',
    meta: 'GOOGLE • ID: 88421-12',
    statusClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    status: 'ACTIVE',
    spend: '$8,210.50',
    impressions: '842,000',
  },
  {
    iconBg: 'bg-primary/10 border-primary/20',
    iconName: 'bolt',
    iconColor: 'text-primary',
    name: 'Creative Alpha Test',
    meta: 'TIKTOK • ID: 77123-01',
    statusClass: 'bg-primary/10 text-primary border-primary/30',
    status: 'LEARNING',
    spend: '$2,100.00',
    impressions: '420,112',
  },
]

const CHART_HEIGHTS = ['30%', '45%', '60%', '55%', '80%', '95%', '75%', '65%', '85%', '100%', '90%']

export default function PaidAdvertising() {
  const { openNav } = useOutletContext()

  return (
    <>
      <TopBar title="Paid Advertising" searchPlaceholder="Search Analytics…" onMenu={openNav} />

      <div className="p-margin-mobile md:p-margin-desktop max-w-container-max mx-auto w-full space-y-gutter">

        {/* Hero Dashboard Stats / Bento Grid Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">

          {/* Ads Analytics Overview Card */}
          <div className="lg:col-span-8 bg-surface-container border border-outline rounded-xl p-8 card-glow transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="font-headline-lg text-headline-lg font-bold text-primary mb-1">Ads Analytics Overview</h2>
                  <p className="font-mono-supply text-label-mono uppercase tracking-widest text-on-surface-variant opacity-60">Real-time Performance Metrics</p>
                </div>
                <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="font-mono-supply text-label-mono text-primary">LIVE ENGINE</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                <div className="space-y-1">
                  <p className="text-on-surface-variant font-body-md opacity-60">Total Ad Spend</p>
                  <p className="text-3xl font-bold font-headline-lg gold-gradient-text">$42,890.12</p>
                  <p className="text-xs text-primary flex items-center gap-1 font-mono-supply">
                    <Icon name="trending_up" className="text-xs" /> +14.2%
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-on-surface-variant font-body-md opacity-60">Avg. ROAS</p>
                  <p className="text-3xl font-bold font-headline-lg text-on-surface">4.82x</p>
                  <p className="text-xs text-primary flex items-center gap-1 font-mono-supply">
                    <Icon name="trending_up" className="text-xs" /> +0.5x
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-on-surface-variant font-body-md opacity-60">CPA (Blended)</p>
                  <p className="text-3xl font-bold font-headline-lg text-on-surface">$12.45</p>
                  <p className="text-xs text-error flex items-center gap-1 font-mono-supply">
                    <Icon name="trending_down" className="text-xs" /> -2.1%
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-on-surface-variant font-body-md opacity-60">Conversions</p>
                  <p className="text-3xl font-bold font-headline-lg text-on-surface">3,412</p>
                  <p className="text-xs text-primary flex items-center gap-1 font-mono-supply">
                    <Icon name="trending_up" className="text-xs" /> +8.9%
                  </p>
                </div>
              </div>
            </div>

            {/* Mini Chart Visualizer */}
            <div className="h-32 w-full flex items-end gap-1 overflow-hidden opacity-40 hover:opacity-100 transition-opacity">
              {CHART_HEIGHTS.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-primary/20 hover:bg-primary transition-colors"
                  style={{ height: h }}
                />
              ))}
            </div>
          </div>

          {/* FBS Manager Status Section */}
          <div className="lg:col-span-4 space-y-gutter">
            <div className="bg-surface-container border border-outline rounded-xl p-6 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-headline-lg text-headline-lg font-bold text-on-surface">FBS Manager</h3>
                  <Icon name="hub" className="text-primary" />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-outline">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                      <span className="font-body-md text-on-surface">Ad Account Alpha</span>
                    </div>
                    <span className="text-xs font-mono-supply text-on-surface-variant">ACTIVE</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-outline">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                      <span className="font-body-md text-on-surface">Ad Account Beta</span>
                    </div>
                    <span className="text-xs font-mono-supply text-on-surface-variant">ACTIVE</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-outline border-primary/40 bg-primary/5">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_#BF953F]" />
                      <span className="font-body-md text-on-surface font-bold">Scaling Node 03</span>
                    </div>
                    <span className="text-xs font-mono-supply text-primary">SCALING</span>
                  </div>
                </div>
              </div>
              <button className="mt-6 w-full py-2 border border-primary text-primary font-bold rounded-lg hover:bg-primary hover:text-black transition-all duration-300 font-body-md">
                Re-Sync Nodes
              </button>
            </div>
          </div>
        </section>

        {/* AI Copy & Scaling Chart Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">

          {/* AI Copy Generator Panel */}
          <div className="lg:col-span-5 bg-surface-container border border-outline rounded-xl p-8 relative overflow-hidden group">
            {/* Decorative element */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 blur-3xl group-hover:bg-primary/10 transition-colors duration-700" />

            <div className="flex items-center gap-3 mb-6">
              <Icon name="auto_awesome" filled className="text-primary" />
              <h3 className="font-headline-lg text-headline-lg font-bold">AI Copy Generator</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="font-mono-supply text-label-mono text-on-surface-variant uppercase tracking-widest text-xs">Prompt Engine</label>
                <textarea
                  className="w-full bg-surface-container-low border border-outline focus:border-primary focus:ring-0 rounded-lg font-body-md text-on-surface"
                  placeholder="E.g. Generate a high-conversion hook for luxury real estate ads..."
                  rows="3"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <label className="font-mono-supply text-label-mono text-on-surface-variant uppercase tracking-widest text-xs">Tone</label>
                  <select className="w-full bg-surface-container-low border border-outline rounded-lg text-on-surface font-body-md">
                    <option>Disruptive</option>
                    <option>Premium</option>
                    <option>Urgent</option>
                  </select>
                </div>
                <div className="flex-1 space-y-2">
                  <label className="font-mono-supply text-label-mono text-on-surface-variant uppercase tracking-widest text-xs">Platform</label>
                  <select className="w-full bg-surface-container-low border border-outline rounded-lg text-on-surface font-body-md">
                    <option>Meta Ads</option>
                    <option>YouTube</option>
                    <option>LinkedIn</option>
                  </select>
                </div>
              </div>
              <button className="w-full py-4 bg-primary text-black font-bold rounded-lg shadow-[0_4px_20px_rgba(191,149,63,0.3)] hover:-translate-y-1 transition-all">
                Generate Copy Assets
              </button>
            </div>

            {/* Generated Content Placeholder */}
            <div className="mt-8 border-t border-outline pt-6">
              <div className="flex justify-between items-center mb-4">
                <p className="font-mono-supply text-label-mono text-primary text-xs">LATEST OUTPUT</p>
                <Icon name="content_copy" className="text-on-surface-variant cursor-pointer hover:text-white" />
              </div>
              <div className="p-4 bg-background border border-outline rounded-lg italic text-on-surface-variant font-body-md">
                "Stop playing safe in a market that's evolving every hour. Your strategy isn't just old—it's obsolete. Join the disruptors..."
              </div>
            </div>
          </div>

          {/* Cross-Channel Scaling Chart */}
          <div className="lg:col-span-7 bg-surface-container border border-outline rounded-xl p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-headline-lg text-headline-lg font-bold">Cross-Channel Scaling</h3>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-background border border-outline rounded-full text-xs font-mono-supply text-primary">7D View</span>
                <span className="px-3 py-1 bg-surface-variant border border-outline rounded-full text-xs font-mono-supply text-on-surface-variant">30D View</span>
              </div>
            </div>

            {/* Simplified Aesthetic Chart */}
            <div className="relative h-[300px] w-full flex items-end justify-between px-4">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none">
                <div className="border-b border-white w-full" />
                <div className="border-b border-white w-full" />
                <div className="border-b border-white w-full" />
                <div className="border-b border-white w-full" />
                <div className="border-b border-white w-full" />
              </div>

              {/* Scale Bars */}
              <div className="relative w-full h-full flex items-end gap-12 justify-center">
                {/* Meta */}
                <div className="group relative flex flex-col items-center justify-end h-full">
                  <div className="w-12 bg-primary/20 border-x border-t border-primary rounded-t-lg h-[65%] group-hover:h-[75%] transition-all duration-500" />
                  <p className="font-mono-supply text-label-mono mt-4 text-xs">META</p>
                </div>
                {/* Google */}
                <div className="group relative flex flex-col items-center justify-end h-full">
                  <div className="w-12 bg-white/5 border-x border-t border-white/20 rounded-t-lg h-[85%] group-hover:h-[90%] transition-all duration-500" />
                  <p className="font-mono-supply text-label-mono mt-4 text-xs">GOOGLE</p>
                </div>
                {/* TikTok */}
                <div className="group relative flex flex-col items-center justify-end h-full">
                  <div className="w-12 bg-primary/20 border-x border-t border-primary rounded-t-lg h-[45%] group-hover:h-[60%] transition-all duration-500" />
                  <p className="font-mono-supply text-label-mono mt-4 text-xs">TIKTOK</p>
                </div>
                {/* X / Twitter */}
                <div className="group relative flex flex-col items-center justify-end h-full">
                  <div className="w-12 bg-white/5 border-x border-t border-white/20 rounded-t-lg h-[30%] group-hover:h-[40%] transition-all duration-500" />
                  <p className="font-mono-supply text-label-mono mt-4 text-xs">TWITTER</p>
                </div>
              </div>
            </div>

            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-background border border-outline rounded-lg">
                <p className="text-xs font-mono-supply text-on-surface-variant mb-1">BEST PERFORMER</p>
                <p className="text-lg font-bold text-primary">Google Search</p>
              </div>
              <div className="p-4 bg-background border border-outline rounded-lg">
                <p className="text-xs font-mono-supply text-on-surface-variant mb-1">HIGHEST SCALE</p>
                <p className="text-lg font-bold text-on-surface">Meta Feed</p>
              </div>
              <div className="p-4 bg-background border border-outline rounded-lg">
                <p className="text-xs font-mono-supply text-on-surface-variant mb-1">RETENTION</p>
                <p className="text-lg font-bold text-on-surface">88.4%</p>
              </div>
              <div className="p-4 bg-background border border-outline rounded-lg">
                <p className="text-xs font-mono-supply text-on-surface-variant mb-1">VELOCITY</p>
                <p className="text-lg font-bold text-primary">+12.2%</p>
              </div>
            </div>
          </div>
        </section>

        {/* Active Campaigns Feed */}
        <section className="bg-surface-container border border-outline rounded-xl overflow-hidden">
          <div className="px-8 py-6 border-b border-outline flex justify-between items-center">
            <h3 className="font-headline-lg text-headline-lg font-bold">Active Campaigns</h3>
            <div className="flex gap-4">
              <button className="text-on-surface-variant">
                <Icon name="filter_list" />
              </button>
              <button className="text-on-surface-variant">
                <Icon name="download" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-md">
              <thead>
                <tr className="border-b border-outline bg-surface-container-high/50">
                  <th className="px-8 py-4 font-mono-supply text-xs text-on-surface-variant uppercase tracking-widest">Campaign Name</th>
                  <th className="px-8 py-4 font-mono-supply text-xs text-on-surface-variant uppercase tracking-widest">Status</th>
                  <th className="px-8 py-4 font-mono-supply text-xs text-on-surface-variant uppercase tracking-widest">Spend</th>
                  <th className="px-8 py-4 font-mono-supply text-xs text-on-surface-variant uppercase tracking-widest">Impressions</th>
                  <th className="px-8 py-4 font-mono-supply text-xs text-on-surface-variant uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline">
                {CAMPAIGNS.map((c) => (
                  <tr key={c.name} className="hover:bg-surface-variant/30 transition-colors cursor-pointer">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded flex items-center justify-center border ${c.iconBg}`}>
                          <Icon name={c.iconName} className={`${c.iconColor} text-sm`} />
                        </div>
                        <div>
                          <p className="font-bold">{c.name}</p>
                          <p className="text-xs text-on-surface-variant opacity-60">{c.meta}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-2 py-1 text-[10px] font-bold border rounded ${c.statusClass}`}>{c.status}</span>
                    </td>
                    <td className="px-8 py-6 font-bold">{c.spend}</td>
                    <td className="px-8 py-6 text-on-surface-variant">{c.impressions}</td>
                    <td className="px-8 py-6">
                      <Icon name="more_vert" className="text-on-surface-variant hover:text-primary" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>

      <Fab icon="add" />
    </>
  )
}
