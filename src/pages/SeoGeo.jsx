import { useOutletContext } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Icon from '../components/Icon'

const TRENDING_SIGNALS = [
  {
    keyword: '"DISRUPTIVE MEDIA"',
    difficulty: 'Difficulty: 78/100',
    position: '#1',
    positionClass: '',
    badge: 'STABLE',
    badgeClass: 'text-[10px] text-primary',
    opacity: '',
    keywordClass: 'text-sm font-label-mono text-primary',
  },
  {
    keyword: '"SEO AUTOMATION"',
    difficulty: 'Difficulty: 64/100',
    position: '#4',
    positionClass: 'text-primary',
    badge: '↑ 12 POS',
    badgeClass: 'text-[10px] text-green-400',
    opacity: '',
    keywordClass: 'text-sm font-label-mono text-primary',
  },
  {
    keyword: '"GEO RANKING TOOLS"',
    difficulty: 'Difficulty: 42/100',
    position: '#2',
    positionClass: '',
    badge: '↑ 3 POS',
    badgeClass: 'text-[10px] text-green-400',
    opacity: '',
    keywordClass: 'text-sm font-label-mono text-primary',
  },
  {
    keyword: '"META ADVERTISING"',
    difficulty: 'Difficulty: 91/100',
    position: '#14',
    positionClass: '',
    badge: '↓ 2 POS',
    badgeClass: 'text-[10px] text-error',
    opacity: 'opacity-50',
    keywordClass: 'text-sm font-label-mono text-on-surface-variant',
  },
]

const SERP_ROWS = [
  {
    url: '/blog/seo-geo-disruption',
    keyword: 'seo strategy',
    position: '#2',
    positionClass: 'text-primary font-bold',
    arrow: '▲',
    arrowClass: 'text-xs font-normal text-green-400 ml-1',
    features: [
      { name: 'featured_video', filled: true, className: 'text-primary text-lg', title: 'Featured Snippet' },
      { name: 'image', filled: false, className: 'text-on-surface-variant text-lg', title: 'Image Pack' },
    ],
    visIndex: '84.2',
  },
  {
    url: '/services/geo-intelligence',
    keyword: 'geo analytics',
    position: '#5',
    positionClass: 'font-bold',
    arrow: '●',
    arrowClass: 'text-xs font-normal text-on-surface-variant ml-1',
    features: [
      { name: 'location_on', filled: true, className: 'text-primary text-lg', title: 'Local Pack' },
    ],
    visIndex: '76.8',
  },
  {
    url: '/about-us',
    keyword: 'media agency',
    position: '#1',
    positionClass: 'font-bold',
    arrow: '▲',
    arrowClass: 'text-xs font-normal text-green-400 ml-1',
    features: [
      { name: 'link', filled: false, className: 'text-on-surface-variant text-lg', title: 'Sitelinks' },
    ],
    visIndex: '92.1',
  },
  {
    url: '/case-studies/client-x',
    keyword: 'seo results',
    position: '#12',
    positionClass: 'font-bold',
    arrow: '▼',
    arrowClass: 'text-xs font-normal text-error ml-1',
    features: [
      { name: 'movie', filled: false, className: 'text-on-surface-variant text-lg opacity-30', title: undefined },
    ],
    visIndex: '45.5',
  },
]

export default function SeoGeo() {
  const { openNav } = useOutletContext()

  return (
    <>
      <TopBar title="SEO / GEO Strategy" searchPlaceholder="Analyze Domain…" onMenu={openNav} />

      <div className="p-margin-mobile md:p-margin-desktop max-w-container-max mx-auto w-full space-y-gutter">

        {/* Hero Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-gutter">

          {/* Keyword Index Velocity */}
          <div className="bento-card col-span-1 lg:col-span-2 p-6 rounded-xl flex flex-col justify-between h-48 relative overflow-hidden group">
            <div className="relative z-10">
              <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest">Keyword Index Velocity</p>
              <h3 className="font-headline-xl text-4xl lg:text-5xl mt-2 text-primary">
                +12.4% <span className="text-sm font-normal text-on-surface-variant">vs last month</span>
              </h3>
            </div>
            <div className="flex items-end gap-1 h-16 mt-4">
              <div className="flex-1 bg-primary/20 h-8 rounded-sm group-hover:bg-primary/40 transition-all"></div>
              <div className="flex-1 bg-primary/20 h-12 rounded-sm group-hover:bg-primary/40 transition-all"></div>
              <div className="flex-1 bg-primary/20 h-10 rounded-sm group-hover:bg-primary/40 transition-all"></div>
              <div className="flex-1 bg-primary/20 h-16 rounded-sm group-hover:bg-primary/40 transition-all"></div>
              <div className="flex-1 bg-primary/20 h-14 rounded-sm group-hover:bg-primary/40 transition-all"></div>
              <div className="flex-1 bg-primary h-20 rounded-sm"></div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Icon name="trending_up" className="text-[120px]" />
            </div>
          </div>

          {/* Site Health Core */}
          <div className="bento-card p-6 rounded-xl flex flex-col items-center justify-center text-center">
            <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest mb-4">Site Health Core</p>
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  className="text-surface-variant"
                  cx="56"
                  cy="56"
                  fill="transparent"
                  r="50"
                  stroke="currentColor"
                  strokeWidth="8"
                />
                <circle
                  className="text-primary"
                  cx="56"
                  cy="56"
                  fill="transparent"
                  r="50"
                  stroke="currentColor"
                  strokeDasharray="314"
                  strokeDashoffset="31.4"
                  strokeWidth="8"
                />
              </svg>
              <span className="absolute font-headline-lg text-3xl">90</span>
            </div>
            <p className="text-primary text-sm font-bold mt-4">Optimal Performance</p>
          </div>

          {/* Active GEO Nodes */}
          <div className="bento-card p-6 rounded-xl flex flex-col justify-between">
            <p className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-widest">Active GEO Nodes</p>
            <h3 className="font-headline-lg text-3xl mt-2">1,482</h3>
            <div className="mt-4 flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-black text-xs font-bold ring-2 ring-background">US</div>
              <div className="w-8 h-8 rounded-full bg-surface-variant border border-outline flex items-center justify-center text-xs ring-2 ring-background">UK</div>
              <div className="w-8 h-8 rounded-full bg-surface-variant border border-outline flex items-center justify-center text-xs ring-2 ring-background">DE</div>
              <div className="w-8 h-8 rounded-full bg-surface-variant border border-outline flex items-center justify-center text-xs ring-2 ring-background">+12</div>
            </div>
            <button className="text-primary text-sm font-bold mt-4 flex items-center gap-2 hover:gap-3 transition-all">
              View Clusters <Icon name="arrow_forward" className="text-xs" />
            </button>
          </div>
        </div>

        {/* Main Grid: Map & Trending Signals */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">

          {/* GEO Search Ranking Map */}
          <div className="bento-card col-span-1 lg:col-span-8 rounded-xl overflow-hidden flex flex-col h-[500px]">
            <div className="p-6 flex justify-between items-center border-b border-outline">
              <div>
                <h3 className="font-headline-lg text-xl text-primary">GEO Search Ranking</h3>
                <p className="text-sm text-on-surface-variant">Global performance heatmap across strategic regions</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-surface-variant rounded-lg text-xs font-medium border border-outline">World</button>
                <button className="px-3 py-1.5 bg-primary text-black rounded-lg text-xs font-bold">North America</button>
              </div>
            </div>
            <div className="flex-1 relative bg-[#0a0a0a]">
              <img
                alt="GEO Ranking Map"
                className="w-full h-full object-cover opacity-50 grayscale contrast-125"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAA6JdX2wBIlMw5VD1EEXB1i9iXjHb3ZSnOGrfwV8JdtbROWC-8zrvDgKMzXm3cX38PquB_YSt1f3PVOvpgeWWFobZ4XvEx_1Q7KYzzZf3knLDUQk8N8edqtHWfX-cXXe2IW_lUDu3P5gJZdhgcqcGyvT8mMFZnZLkF0x4aRStaPlTdO7L31YR0rk58krt0RMf87AbSKD_CMDsDrBg6NGraGC49-DTkDdatEtYP9r-fHg88MT7nqzbbgADB0HGAD3WExvzT3fpX2sYc"
              />
              {/* Overlay Dots for "Map" effect */}
              <div className="absolute top-1/3 left-1/4 w-4 h-4 bg-primary rounded-full animate-pulse shadow-[0_0_15px_#BF953F]"></div>
              <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-primary/60 rounded-full animate-pulse delay-75"></div>
              <div className="absolute top-1/4 right-1/3 w-5 h-5 bg-primary rounded-full animate-pulse delay-150 shadow-[0_0_20px_#BF953F]"></div>
              <div className="absolute bottom-6 left-6 p-4 bg-background/80 backdrop-blur-md border border-outline rounded-lg flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-primary"></span>
                  <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface">Top 3 Ranking</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-surface-variant border border-outline"></span>
                  <span className="text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Emerging Markets</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trending Signals Side Panel */}
          <div className="bento-card col-span-1 lg:col-span-4 p-6 rounded-xl flex flex-col h-[500px]">
            <h3 className="font-headline-lg text-xl mb-6">Trending Signals</h3>
            <div className="space-y-6 overflow-y-auto pr-2">
              {TRENDING_SIGNALS.map((signal) => (
                <div
                  key={signal.keyword}
                  className={`flex items-center justify-between p-4 bg-surface-container-low border border-outline rounded-xl hover:border-primary transition-all cursor-pointer ${signal.opacity}`}
                >
                  <div>
                    <p className={signal.keywordClass}>{signal.keyword}</p>
                    <p className="text-xs text-on-surface-variant mt-1">{signal.difficulty}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${signal.positionClass}`}>{signal.position}</p>
                    <span className={signal.badgeClass}>{signal.badge}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-auto w-full py-4 border border-primary text-primary font-bold rounded-xl hover:bg-primary hover:text-black transition-all">
              Export Keyword Dossier
            </button>
          </div>
        </div>

        {/* SERP Performance Tracking Table */}
        <section className="bento-card rounded-xl overflow-hidden mb-margin-desktop">
          <div className="p-6 border-b border-outline flex justify-between items-center">
            <div>
              <h3 className="font-headline-lg text-xl">SERP Performance Tracking</h3>
              <p className="text-sm text-on-surface-variant">Deep-dive into engine specific SERP features and positioning</p>
            </div>
            <div className="flex gap-4">
              <select
                className="bg-surface-container border border-outline text-xs rounded-lg px-3 py-1.5 focus:border-primary"
                defaultValue="Last 30 Days"
              >
                <option>Last 30 Days</option>
                <option>Last 90 Days</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-1.5 bg-surface-variant rounded-lg text-xs font-bold border border-outline hover:border-primary transition-all">
                <Icon name="filter_list" className="text-sm" /> Filter
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-high border-b border-outline">
                <tr>
                  <th className="p-6 text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Page URL</th>
                  <th className="p-6 text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Primary Keyword</th>
                  <th className="p-6 text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Position</th>
                  <th className="p-6 text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">SERP Features</th>
                  <th className="p-6 text-xs font-label-mono uppercase tracking-widest text-on-surface-variant">Vis. Index</th>
                  <th className="p-6 text-xs font-label-mono uppercase tracking-widest text-on-surface-variant"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline">
                {SERP_ROWS.map((row) => (
                  <tr key={row.url} className="hover:bg-surface-variant/30 transition-colors">
                    <td className="p-6 font-medium text-sm">{row.url}</td>
                    <td className="p-6">
                      <span className="px-2 py-1 bg-surface-container border border-outline rounded-md text-xs font-label-mono">
                        {row.keyword}
                      </span>
                    </td>
                    <td className={`p-6 ${row.positionClass}`}>
                      {row.position} <span className={row.arrowClass}>{row.arrow}</span>
                    </td>
                    <td className="p-6">
                      <div className="flex gap-2">
                        {row.features.map((feature) => (
                          <Icon
                            key={feature.name + (feature.title || '')}
                            name={feature.name}
                            filled={feature.filled}
                            className={feature.className}
                            title={feature.title}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="p-6">{row.visIndex}</td>
                    <td className="p-6 text-right">
                      <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">
                        more_vert
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </>
  )
}
