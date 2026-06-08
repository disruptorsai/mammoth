import { useOutletContext } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Fab from '../components/Fab'
import Icon from '../components/Icon'
import { useToast } from '../components/Toast'

const INTEGRATIONS = [
  {
    icon: 'sync_alt',
    watermarkIcon: 'hub',
    name: 'GoHighLevel',
    description: 'Omnichannel lead routing and automated workflows.',
    lastSync: 'Last Sync: 2m ago',
    badgeClass: 'bg-green-500/10 text-green-500 border border-green-500/20',
    badgeLabel: 'Active',
    configLabel: 'Config',
    hasWatermark: true,
  },
  {
    icon: 'database',
    watermarkIcon: null,
    name: 'HubSpot',
    description: 'CRM Database & Inbound Marketing analytics sync.',
    lastSync: 'Last Sync: 15m ago',
    badgeClass: 'bg-green-500/10 text-green-500 border border-green-500/20',
    badgeLabel: 'Active',
    configLabel: 'Config',
    hasWatermark: false,
  },
  {
    icon: 'construction',
    watermarkIcon: null,
    name: 'Jobber',
    description: 'Field operations and service quote synchronization.',
    lastSync: 'Last Sync: 1h ago',
    badgeClass: 'bg-primary/10 text-primary border border-primary/20',
    badgeLabel: 'Standby',
    configLabel: 'Configure',
    hasWatermark: false,
  },
]

const PIPELINE_COLUMNS = [
  {
    dotOpacity: 'bg-primary',
    label: 'New Inquiry (14)',
    cards: [
      {
        sourceBadgeClass: 'bg-primary/10 text-primary border border-primary/20',
        source: 'GoHighLevel',
        amount: '$2,400',
        name: 'Alex Rivera',
        avatar: { initials: 'AR', bg: 'bg-slate-500' },
        meta: null,
      },
      {
        sourceBadgeClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
        source: 'HubSpot',
        amount: '$5,800',
        name: 'Precision Solar',
        avatar: null,
        meta: { icon: 'schedule', text: '1h ago' },
      },
    ],
  },
  {
    dotOpacity: 'bg-primary/60',
    label: 'Qualified (8)',
    cards: [
      {
        sourceBadgeClass: 'bg-primary/10 text-primary border border-primary/20',
        source: 'GoHighLevel',
        amount: '$12,000',
        name: 'Marcus Thorne',
        avatar: null,
        meta: { icon: 'bolt', text: 'High Priority', textClass: 'text-primary' },
      },
    ],
  },
  {
    dotOpacity: 'bg-primary/30',
    label: 'Proposal (4)',
    cards: [
      {
        sourceBadgeClass: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
        source: 'Jobber',
        amount: '$3,150',
        name: 'Sarah Jennings',
        avatar: null,
        meta: null,
        opacity: 'opacity-80',
      },
    ],
  },
  {
    dotOpacity: 'bg-primary/10',
    label: 'Contract (2)',
    cards: [],
    dropZone: true,
  },
]

const INTERACTIONS = [
  {
    iconName: 'mail',
    filled: true,
    iconBg: 'bg-primary/20',
    iconColor: 'text-primary',
    hasConnector: true,
    title: 'Incoming Email',
    titleSuffix: 'from Sarah Jennings',
    body: '"Following up on the proposal sent yesterday. We have a few questions regarding..."',
    bodyType: 'italic',
    time: '12m ago',
  },
  {
    iconName: 'call',
    filled: true,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    hasConnector: true,
    title: 'Call Completed',
    titleSuffix: 'with Alex Rivera',
    body: 'Transcript generated via GHL AI',
    bodyType: 'badge',
    time: '48m ago',
  },
  {
    iconName: 'assignment_turned_in',
    filled: true,
    iconBg: 'bg-green-500/20',
    iconColor: 'text-green-400',
    hasConnector: false,
    title: 'Quote Approved',
    titleSuffix: 'in Jobber Sync',
    body: null,
    bodyType: null,
    time: '2h ago',
  },
]

export default function Crm() {
  const { openNav } = useOutletContext()
  const { show, node: toast } = useToast()

  return (
    <>
      <TopBar title="External Integrations" searchPlaceholder="Global Search…" onMenu={openNav} />

      <section className="p-margin-mobile md:p-margin-desktop">
        <div className="max-w-container-max mx-auto space-y-8">

          {/* Integration Hub (Bento Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {INTEGRATIONS.map((integration) => (
              <div
                key={integration.name}
                className="bg-surface-container border border-outline rounded-xl p-6 relative overflow-hidden group hover:border-primary/50 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Icon name={integration.icon} className="text-3xl" />
                  </div>
                  <span
                    className={`${integration.badgeClass} text-[10px] font-label-mono px-2 py-1 rounded uppercase`}
                  >
                    {integration.badgeLabel}
                  </span>
                </div>
                <h3 className="font-headline-lg text-on-surface mb-1">{integration.name}</h3>
                <p className="text-sm text-on-surface-variant mb-6">{integration.description}</p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-xs text-on-surface-variant font-label-mono">
                    {integration.lastSync}
                  </span>
                  <button
                    onClick={() => show(`Configure ${integration.name} — integration coming soon.`, 'settings')}
                    className="text-primary hover:underline text-sm font-bold transition-all"
                  >
                    {integration.configLabel}
                  </button>
                </div>
                {integration.hasWatermark && (
                  <div className="absolute bottom-0 right-0 w-24 h-24 opacity-5 pointer-events-none translate-x-4 translate-y-4">
                    <Icon name={integration.watermarkIcon} className="text-[80px]" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pipeline & Interaction (Asymmetric Split) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">

            {/* Consolidated Pipeline (8 Cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-headline-lg text-primary">Consolidated Pipeline</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => show('Pipeline filters coming soon.', 'filter_list')}
                    className="p-2 border border-outline rounded hover:bg-surface-variant transition-colors"
                  >
                    <Icon name="filter_list" className="text-sm" />
                  </button>
                  <button
                    onClick={() => show('Pipeline export coming soon.', 'download')}
                    className="p-2 border border-outline rounded hover:bg-surface-variant transition-colors"
                  >
                    <Icon name="download" className="text-sm" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {PIPELINE_COLUMNS.map((col) => (
                  <div key={col.label} className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <div className={`w-1 h-4 ${col.dotOpacity} rounded-full`} />
                      <span className="text-xs font-label-mono uppercase tracking-tighter opacity-60">
                        {col.label}
                      </span>
                    </div>

                    {col.dropZone && (
                      <div className="border-2 border-dashed border-outline rounded-xl h-32 flex items-center justify-center text-on-surface-variant text-xs font-label-mono">
                        Drop here to close
                      </div>
                    )}

                    {col.cards.map((card) => (
                      <div
                        key={card.name}
                        onClick={() => show(`${card.name} · ${card.source} · ${card.amount}`, 'person')}
                        className={`bg-surface-container-low border border-outline p-4 rounded-xl space-y-3 hover:scale-[1.02] transition-transform cursor-pointer group${card.opacity ? ` ${card.opacity}` : ''}`}
                      >
                        <div className="flex justify-between">
                          <span
                            className={`text-[10px] ${card.sourceBadgeClass} px-2 py-0.5 rounded`}
                          >
                            {card.source}
                          </span>
                          <span className="text-[10px] text-on-surface-variant font-label-mono">
                            {card.amount}
                          </span>
                        </div>
                        <p className="font-bold text-on-surface">{card.name}</p>
                        {card.avatar && (
                          <div className="flex -space-x-2">
                            <div
                              className={`w-5 h-5 rounded-full border border-background ${card.avatar.bg} text-[8px] flex items-center justify-center`}
                            >
                              {card.avatar.initials}
                            </div>
                          </div>
                        )}
                        {card.meta && (
                          <div
                            className={`flex items-center gap-2 text-[10px] ${card.meta.textClass || 'text-on-surface-variant'}`}
                          >
                            <Icon name={card.meta.icon} className="text-xs" />
                            {card.meta.text}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Interaction Stream (4 Cols) */}
            <div className="lg:col-span-4 bg-surface-container-low border border-outline rounded-xl flex flex-col h-[500px]">
              <div className="p-6 border-b border-outline flex justify-between items-center">
                <h4 className="font-bold text-on-surface">Interaction Stream</h4>
                <span className="text-xs font-label-mono text-primary animate-pulse">Live Feed</span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {INTERACTIONS.map((item, i) => (
                  <div key={i} className="flex gap-4 relative">
                    {item.hasConnector && (
                      <div className="absolute left-4 top-10 bottom-0 w-px bg-outline" />
                    )}
                    <div
                      className={`w-8 h-8 rounded-full ${item.iconBg} flex items-center justify-center ${item.iconColor} shrink-0 z-10`}
                    >
                      <Icon name={item.iconName} filled={item.filled} className="text-sm" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-on-surface">
                        {item.title}{' '}
                        <span className="font-normal text-on-surface-variant">{item.titleSuffix}</span>
                      </p>
                      {item.bodyType === 'italic' && (
                        <p className="text-xs text-on-surface-variant line-clamp-2 italic">
                          {item.body}
                        </p>
                      )}
                      {item.bodyType === 'badge' && (
                        <div className="bg-surface-container px-3 py-2 rounded-lg text-xs text-on-surface-variant border border-outline mt-2">
                          {item.body}
                        </div>
                      )}
                      <span className="text-[10px] text-on-surface-variant font-label-mono uppercase">
                        {item.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-outline">
                <button
                  onClick={() => show('Full interaction history coming soon.', 'history')}
                  className="w-full py-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center gap-1"
                >
                  View Full History <Icon name="arrow_forward" className="text-sm" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      <Fab icon="add" title="New lead" onClick={() => show('Add a lead — coming soon.', 'add')} />
      {toast}
    </>
  )
}
