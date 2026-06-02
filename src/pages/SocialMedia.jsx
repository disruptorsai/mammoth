import { useState, useEffect, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Icon from '../components/Icon'
import ContentCalendar from '../components/ContentCalendar'
import { getProfiles, networkStyle } from '../lib/vistaSocial'

const SUB_TABS = ['Dashboard', 'Analytics', 'Library', 'Generators']

const CHART_BARS = [
  { height: '60%', hover: '65%' },
  { height: '45%', hover: '50%' },
  { height: '85%', hover: '90%' },
  { height: '55%', hover: '60%' },
  { height: '70%', hover: '75%', glow: true },
  { height: '40%', hover: '45%' },
  { height: '95%', hover: '100%', glowStrong: true },
]

export default function SocialMedia() {
  const { openNav } = useOutletContext()
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [mediaMode, setMediaMode] = useState('IMAGE')
  const [sliderValue, setSliderValue] = useState(4)

  // Vista Social connected channels (live)
  const [channels, setChannels] = useState([])
  const [channelsState, setChannelsState] = useState('loading') // loading | ready | error
  const [channelsError, setChannelsError] = useState('')

  const loadChannels = useCallback(async () => {
    setChannelsState('loading')
    setChannelsError('')
    try {
      const profiles = await getProfiles()
      setChannels(Array.isArray(profiles) ? profiles : [])
      setChannelsState('ready')
    } catch (err) {
      setChannelsError(err.message || 'Failed to load channels.')
      setChannelsState('error')
    }
  }, [])

  useEffect(() => {
    loadChannels()
  }, [loadChannels])

  const channelCount = channelsState === 'ready' ? channels.length : null

  return (
    <>
      <TopBar title="Content Architect" searchPlaceholder="Search strategy…" onMenu={openNav} />

      <div className="p-margin-mobile md:p-margin-desktop max-w-container-max mx-auto w-full space-y-gutter">

        {/* Secondary tab nav */}
        <nav className="flex items-center gap-6 border-b border-outline pb-3">
          {SUB_TABS.map((tab) => (
            <span
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`font-body-md cursor-pointer pb-1 transition-colors duration-200 ${
                activeTab === tab
                  ? 'text-primary font-bold border-b-2 border-primary'
                  : 'text-on-surface-variant font-medium hover:text-primary'
              }`}
            >
              {tab}
            </span>
          ))}
        </nav>

        {/* Hero stats section */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
          {/* Average Engagement */}
          <div className="bg-surface-container border border-outline p-6 rounded-xl space-y-2 group hover:border-primary transition-colors duration-300">
            <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">Average Engagement</span>
            <div className="flex items-end gap-2">
              <h3 className="text-3xl font-bold text-white">8.4%</h3>
              <span className="text-primary text-sm mb-1 font-bold">+1.2%</span>
            </div>
            <div className="w-full h-1 bg-surface-variant rounded-full overflow-hidden">
              <div className="bg-primary h-full w-[84%]" />
            </div>
          </div>

          {/* Total Reach */}
          <div className="bg-surface-container border border-outline p-6 rounded-xl space-y-2 group hover:border-primary transition-colors duration-300">
            <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">Total Reach</span>
            <div className="flex items-end gap-2">
              <h3 className="text-3xl font-bold text-white">1.2M</h3>
              <span className="text-primary text-sm mb-1 font-bold">+184k</span>
            </div>
            <div className="w-full h-1 bg-surface-variant rounded-full overflow-hidden">
              <div className="bg-primary h-full w-[72%]" />
            </div>
          </div>

          {/* Campaign Velocity */}
          <div className="bg-surface-container border border-outline p-6 rounded-xl space-y-2 group hover:border-primary transition-colors duration-300">
            <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">Campaign Velocity</span>
            <div className="flex items-end gap-2">
              <h3 className="text-3xl font-bold text-white">92/100</h3>
              <span className="text-primary text-sm mb-1 font-bold">Peak</span>
            </div>
            <div className="w-full h-1 bg-surface-variant rounded-full overflow-hidden">
              <div className="bg-primary h-full w-[92%]" style={{ boxShadow: '0 0 8px #eec065' }} />
            </div>
          </div>

          {/* Active Channels */}
          <div className="bg-surface-container border border-outline p-6 rounded-xl space-y-2 group hover:border-primary transition-colors duration-300">
            <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">Active Channels</span>
            <div className="flex items-end gap-2">
              <h3 className="text-3xl font-bold text-white">
                {channelCount === null ? '—' : channelCount}
              </h3>
              <span className="text-on-surface-variant text-sm mb-1 font-medium">
                {channelsState === 'ready' ? 'Connected' : channelsState === 'error' ? 'Offline' : 'Syncing'}
              </span>
            </div>
            <div className="flex gap-1">
              {[...Array(Math.max(channelCount || 0, 1))].map((_, i) => (
                <div
                  key={i}
                  className={`w-full h-1 rounded-full ${channelCount ? 'bg-primary' : 'bg-surface-variant'}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Bento Grid Layout */}
        <div className="bento-grid">

          {/* Engagement Velocity Chart */}
          <div className="col-span-12 lg:col-span-8 bg-surface-container border border-outline rounded-xl p-8 flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="font-headline-lg text-headline-lg text-white">Engagement Velocity</h3>
                <p className="text-on-surface-variant font-body-md">Real-time interaction acceleration across all platforms.</p>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-1 rounded-full border border-outline text-xs font-label-mono hover:border-primary">7D</button>
                <button className="px-4 py-1 rounded-full bg-primary-container text-on-primary-container text-xs font-bold font-label-mono">30D</button>
              </div>
            </div>

            <div className="flex-1 flex items-end gap-4 relative pt-10">
              {CHART_BARS.map((bar, i) => (
                <div key={i} className="flex-1 bg-surface-variant/30 relative h-full rounded-t-lg group">
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/40 to-primary rounded-t-lg transition-all duration-500"
                    style={{
                      height: bar.height,
                      boxShadow: bar.glowStrong
                        ? '0 0 20px rgba(191,149,63,0.4)'
                        : bar.glow
                        ? '0 0 15px rgba(191,149,63,0.3)'
                        : undefined,
                    }}
                  />
                </div>
              ))}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 border-l border-outline">
                <div className="border-t border-outline w-full" />
                <div className="border-t border-outline w-full" />
                <div className="border-t border-outline w-full" />
                <div className="border-t border-outline w-full" />
              </div>
            </div>

            <div className="flex justify-between mt-4 text-label-mono text-on-surface-variant text-[10px]">
              <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
            </div>
          </div>

          {/* Channel Status — live from Vista Social */}
          <div className="col-span-12 lg:col-span-4 bg-surface-container border border-outline rounded-xl p-8 flex flex-col h-[400px]">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-headline-lg text-headline-lg text-white">Channel Status</h3>
                <p className="text-on-surface-variant font-body-md">
                  {channelsState === 'ready'
                    ? 'Connected via Vista Social.'
                    : 'Live feed monitoring.'}
                </p>
              </div>
              <button
                onClick={loadChannels}
                disabled={channelsState === 'loading'}
                title="Refresh channels"
                className="shrink-0 p-1.5 rounded-lg border border-outline text-on-surface-variant hover:text-primary hover:border-primary transition-colors disabled:opacity-40"
              >
                <Icon
                  name="refresh"
                  className={`text-base ${channelsState === 'loading' ? 'animate-spin' : ''}`}
                />
              </button>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
              {channelsState === 'loading' && (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                      <div className="w-8 h-8 rounded bg-surface-variant/50" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-24 bg-surface-variant/50 rounded" />
                        <div className="h-2 w-16 bg-surface-variant/30 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {channelsState === 'error' && (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-2">
                  <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center text-red-400">
                    <Icon name="cloud_off" />
                  </div>
                  <p className="text-sm font-bold text-white">Channels unavailable</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{channelsError}</p>
                  <button
                    onClick={loadChannels}
                    className="mt-1 text-xs font-bold text-primary hover:underline uppercase tracking-widest"
                  >
                    Retry
                  </button>
                </div>
              )}

              {channelsState === 'ready' && channels.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-2">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary">
                    <Icon name="hub" />
                  </div>
                  <p className="text-sm font-bold text-white">No channels connected</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Connect social profiles in Vista Social and they'll appear here automatically.
                  </p>
                </div>
              )}

              {channelsState === 'ready' &&
                channels.map((ch, i) => {
                  const style = networkStyle(ch.network)
                  return (
                    <div
                      key={ch.id ?? i}
                      className="flex items-center justify-between p-3 border-b border-outline/50 last:border-b-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded ${style.bg} flex items-center justify-center font-bold shrink-0 text-white`}
                        >
                          {style.short ? (
                            <span className="text-sm">{style.short}</span>
                          ) : (
                            <Icon name={style.icon} className="text-sm" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm truncate">{ch.name || style.label}</div>
                          <div className="text-xs text-on-surface-variant truncate">{style.label}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-label-mono">SYNCED</span>
                      </div>
                    </div>
                  )
                })}
            </div>

            <a
              href="https://vistasocial.com/calendar"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 w-full py-2 border border-primary text-primary rounded-lg text-xs font-bold hover:bg-primary/10 transition-colors uppercase tracking-widest text-center"
            >
              Manage Channels
            </a>
          </div>

          {/* Content Calendar — live from Vista Social */}
          <ContentCalendar />

          {/* AI Content Generator */}
          <div className="col-span-12 lg:col-span-5 bg-surface-container border border-outline rounded-xl p-8 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline-lg text-headline-lg text-white">AI Content Generator</h3>
              <div className="flex p-1 bg-surface-container-low border border-outline rounded-lg">
                <button
                  onClick={() => setMediaMode('IMAGE')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${
                    mediaMode === 'IMAGE'
                      ? 'bg-primary-container text-on-primary-container'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  IMAGE
                </button>
                <button
                  onClick={() => setMediaMode('VIDEO')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${
                    mediaMode === 'VIDEO'
                      ? 'bg-primary-container text-on-primary-container'
                      : 'text-on-surface-variant hover:text-white'
                  }`}
                >
                  VIDEO
                </button>
              </div>
            </div>

            <div className="space-y-6 flex-1">
              <div className="space-y-2">
                <label className="font-label-mono text-[12px] uppercase text-on-surface-variant tracking-wider">Prompt</label>
                <textarea
                  className="w-full bg-surface-container-low border border-outline rounded-xl p-4 text-body-md focus:outline-none focus:border-primary placeholder-on-surface-variant/30 min-h-[120px] resize-none"
                  placeholder="Describe the visual scene in detail..."
                  defaultValue=""
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-label-mono text-[12px] uppercase text-on-surface-variant">Aspect Ratio</label>
                  <select className="w-full bg-surface-container-low border border-outline rounded-xl px-3 py-2 text-sm appearance-none focus:outline-none focus:border-primary">
                    <option>16:9 Cinematic</option>
                    <option>9:16 Vertical</option>
                    <option>1:1 Square</option>
                    <option>4:5 Social</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="font-label-mono text-[12px] uppercase text-on-surface-variant">Style</label>
                  <select className="w-full bg-surface-container-low border border-outline rounded-xl px-3 py-2 text-sm appearance-none focus:outline-none focus:border-primary">
                    <option>Photorealistic</option>
                    <option>Cyberpunk</option>
                    <option>Minimalist</option>
                    <option>Oil Painting</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-label-mono text-[12px] uppercase text-on-surface-variant">Duration / Samples</label>
                <div className="flex items-center gap-4">
                  <input
                    className="flex-1 accent-primary"
                    max="10"
                    min="1"
                    type="range"
                    value={sliderValue}
                    onChange={(e) => setSliderValue(Number(e.target.value))}
                  />
                  <span className="font-label-mono text-primary text-sm">{sliderValue}.0s</span>
                </div>
              </div>

              <button className="w-full bg-primary-container text-on-primary-container py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg glow-gold uppercase tracking-widest text-sm mt-auto">
                <Icon name="auto_awesome" />
                Generate Asset
              </button>
            </div>

            <div className="mt-6 p-4 bg-surface-variant/30 rounded-xl border border-outline flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <Icon name="speed" />
              </div>
              <div>
                <h4 className="text-xs font-bold">High-Priority GPU Queue</h4>
                <p className="text-[10px] text-on-surface-variant">Est. generation time: 24s</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
