import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Icon from '../components/Icon'
import Fab from '../components/Fab'

const SUB_TABS = ['Workspace', 'Analytics', 'Teams']

const COLUMNS = [
  {
    title: 'To-Do',
    count: '3',
    countClass: 'bg-surface-container text-on-surface-variant',
    cards: [
      {
        tag: 'Production',
        tagClass: 'font-label-mono text-[10px] text-primary-container px-2 py-0.5 border border-primary-container rounded-[4px] uppercase tracking-tighter',
        title: 'Q4 Media Spend Strategy',
        description: 'Outline the disrupted media buying strategy for luxury clients for the upcoming fiscal quarter.',
        assignees: [
          {
            src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAw0PKvpR0aJzqe3iCyx4yPbywQCO_JfxRZ6bH1NXXc426ayTb6mfROkhcwe2H1XOrJ3vNFn8msUwoUjXz4JmcmdrP5vDKZltbRaUFxvs7Qgu2mNH32Vhv0MDi6eU2KcA5dXKdGJS3mMBncZSzL_0Wu4ERUD7Eb2l4zzgg_r2SVqwiQypXtieL_BMrlcryX8JyCoOh2yu70bTz3_h0Z_IkhI0J3CwI-t00cAoK5KjodrqkfxE2FyWlu9vAtSzlfuqvX6qMQ_IArYtMt',
            alt: 'Team member',
          },
          {
            src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCoROhF-Soc_N4Z9HAGOddU_upGv4hkN4Hj8z7F8lLYIaHIQRtaJ6mnN6IFjYaSeeUyxHZCyTpEjypWJwW4Y2u_UU0zi4iei2r88nEGGWiSBDzaMDXKAhqC7-kPvg4c4k_2AyulrP0ep2so3kZMKCWlgVpYxO1R1DF6c8bAuWxbcyDajGDMgfPgLxsw6c6oU8IgVhoKEVVomH8R_Uy3fk4tGBm0EJ7VZpMNkRapVk8--A4tmcFulRjpskC2sAMvLbF1tB0TLxAmHu0C',
            alt: 'Team member',
          },
        ],
        meta: { icon: 'event', label: 'Oct 24', metaClass: 'flex items-center gap-1 text-on-surface-variant text-[11px] font-label-mono' },
      },
      {
        tag: 'Content',
        tagClass: 'font-label-mono text-[10px] text-secondary px-2 py-0.5 border border-secondary rounded-[4px] uppercase tracking-tighter',
        title: 'Brand Disruptors Video Hook',
        description: "Draft three high-impact opening hooks for the new 'Agency Secrets' video series.",
        assignees: [
          { label: '+3' },
        ],
        meta: { icon: 'priority_high', label: 'Urgent', metaClass: 'flex items-center gap-1 text-error text-[11px] font-label-mono' },
      },
    ],
  },
  {
    title: 'In Progress',
    count: '2',
    countClass: 'bg-primary text-on-primary',
    cards: [
      {
        tag: 'Campaign',
        tagClass: 'font-label-mono text-[10px] text-primary px-2 py-0.5 bg-primary/10 rounded-[4px] uppercase tracking-tighter',
        title: 'Vanguard Social Launch',
        description: 'Finalizing the deployment phase for the Vanguard influencer campaign. All assets are currently being synced with Meta Business Suite.',
        active: true,
        progress: 65,
        assignees: [
          {
            src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC9Z_f7YOPhaPMIwjUm2dST9zUD24ZFJggAejeHfpdq1f6kj6ZlgluxnFfqtLlSX3F4_ADr9i4z8Eork7dl3naA42UaoMCEJoY7yhtirRoGf7QmimbY2Mslux1IEE0T23ecg0YI6gVbe5fZ4kIOlsqCsx2wWKZQ5vjB2tr4fBKEsxILb3xmY7daYG0TtX7D8a8RFd-NdA9lNY8wv6r7fytApggQlxVCE2Gj4uaeuY7WFXBOUEgegvpL4GGVEMVMeykXhHDx-ZMHZeHT',
            alt: 'Team member',
          },
        ],
        meta: { icon: 'schedule', label: '2h left', metaClass: 'flex items-center gap-1 text-on-surface-variant text-[11px] font-label-mono' },
      },
      {
        tag: 'Development',
        tagClass: 'font-label-mono text-[10px] text-tertiary px-2 py-0.5 border border-tertiary rounded-[4px] uppercase tracking-tighter',
        title: 'API Integration: Stripe Connect',
        description: 'Connecting the subscription backend to the new payment gateway API. Reviewing webhooks.',
        assignees: [],
        meta: { icon: 'attachment', label: '4 Files', metaClass: 'flex items-center gap-1 text-on-surface-variant text-[11px] font-label-mono' },
      },
    ],
  },
  {
    title: 'Review',
    count: '1',
    countClass: 'bg-surface-container text-on-surface-variant',
    cards: [
      {
        tag: 'Awaiting Approval',
        tagClass: 'font-label-mono text-[10px] text-on-primary-container bg-primary-container px-2 py-0.5 rounded-[4px] uppercase tracking-tighter',
        title: 'Strategic Intel Dashboard UI',
        description: 'Main interface mockup for the customer-facing intelligence portal.',
        previewImage: {
          src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJZ_wqL4_ufppP658ei8Z6xqjQ-Yd9aDK3k3XV0926Q1XqG7Ymme_tNqxDYvbKgqMGbi9SnIiC7cB4y7hbA3aNKrvtjAm0jK6AVcOgO8iaQMStFv5YTrDwDMesAn0N6HK10FjSwDmDSAQOFIVHtREgPtDfI1vmASVmGu71MUHnBPS4XsYwOH3iMAE2CsncltERZ2dAj4aXkRhuK2vdlM2YCdSM4vBlBiA-cN1AiVuZamh3-E52NkpiS5hYPPYdjAmni7OxzxsM6KPa',
          alt: 'Dashboard preview',
        },
        assignees: [
          {
            src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAZvdKf-lFHNU7RRK4dhbaHuvo6H32fv5aCCYdN7I80lXLu48e76B6joPRUrJuzRb6u-F6e_jxKdThe7AgREu8VRHHkDA9bqzQ_oYtpwNdRJBkjy75yhktn6DQKpltPO1Wkf7dpzVo4EUZ3LNseHJTsaYFjbJaJkck90GA5XS5w0lPMsISrBBnM3akAgC4oK3XtT0UhR3A37vNrwbGPXYeeKFvW85NEluPC4NT0b7FPJRRlFNx_QRZTsAwBz7FbI-mKC9BD6JkOHfBR',
            alt: 'Team member',
          },
        ],
        requestedBy: 'Requested by Marcus',
        approveButton: true,
      },
    ],
  },
]

export default function TaskManagement() {
  const { openNav } = useOutletContext()
  const [activeTab, setActiveTab] = useState('Workspace')

  return (
    <>
      <TopBar title="Task Board" searchPlaceholder="Search tasks…" onMenu={openNav} />

      {/* Sub-nav */}
      <div className="flex items-center gap-6 px-margin-mobile md:px-margin-desktop border-b border-outline">
        {SUB_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 pt-3 font-body-md text-body-md cursor-pointer active:opacity-80 transition-colors duration-200 ${
              activeTab === tab
                ? 'text-primary font-bold border-b-2 border-primary'
                : 'text-on-surface-variant font-medium hover:text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Kanban board */}
      <div className="p-margin-mobile md:p-margin-desktop overflow-x-auto overflow-y-hidden flex-1">
        <div className="flex h-full gap-gutter min-w-[1000px]">
          {COLUMNS.map((col) => (
            <div key={col.title} className="flex-1 flex flex-col min-w-[300px] gap-4">
              {/* Column header */}
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-headline-lg text-[18px] text-on-surface font-bold">{col.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full font-label-mono text-[10px] ${col.countClass}`}>
                    {col.count}
                  </span>
                </div>
                <button className="p-1 hover:text-primary transition-colors">
                  <Icon name="add" />
                </button>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {col.cards.map((card) => (
                  <div
                    key={card.title}
                    className={`bg-surface-container rounded-[6px] p-5 cursor-grab active:cursor-grabbing group transition-colors ${
                      card.active
                        ? 'border border-primary shadow-[0_0_20px_rgba(238,192,101,0.05)]'
                        : 'border border-outline hover:border-primary'
                    }`}
                  >
                    {/* Tag row */}
                    <div className="flex items-start justify-between mb-3">
                      <span className={card.tagClass}>{card.tag}</span>
                      {card.active ? (
                        <Icon name="sync" className="text-primary text-sm animate-pulse" />
                      ) : (
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Icon name="more_vert" className="text-sm" />
                        </button>
                      )}
                    </div>

                    {/* Preview image (Review column) */}
                    {card.previewImage && (
                      <div className="w-full h-32 rounded-[4px] bg-surface-variant mb-3 overflow-hidden">
                        <img
                          alt={card.previewImage.alt}
                          className="w-full h-full object-cover grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
                          src={card.previewImage.src}
                        />
                      </div>
                    )}

                    {/* Title & description */}
                    <h4 className="font-body-md text-on-surface font-semibold mb-2 leading-tight">{card.title}</h4>
                    <p className="text-on-surface-variant text-[13px] mb-4 line-clamp-2">{card.description}</p>

                    {/* Progress bar (active card) */}
                    {card.active && typeof card.progress === 'number' && (
                      <div className="w-full bg-surface-variant h-1 rounded-full mb-4 overflow-hidden">
                        <div className="bg-primary h-full" style={{ width: `${card.progress}%` }} />
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-auto">
                      {/* Assignees / left side */}
                      <div className="flex items-center gap-3">
                        {card.assignees && card.assignees.length > 0 && (
                          <div className="flex -space-x-2">
                            {card.assignees.map((a, i) =>
                              a.label ? (
                                <div
                                  key={i}
                                  className="w-7 h-7 rounded-full border-2 border-surface-container overflow-hidden bg-surface-variant flex items-center justify-center text-[10px] text-on-surface-variant font-bold"
                                >
                                  {a.label}
                                </div>
                              ) : (
                                <div key={i} className="w-7 h-7 rounded-full border-2 border-surface-container overflow-hidden">
                                  <img alt={a.alt} className="w-full h-full object-cover" src={a.src} />
                                </div>
                              )
                            )}
                          </div>
                        )}
                        {card.requestedBy && (
                          <span className="text-[11px] text-on-surface-variant font-medium">{card.requestedBy}</span>
                        )}
                      </div>

                      {/* Right side: meta or approve button */}
                      {card.approveButton ? (
                        <button className="bg-primary text-on-primary px-3 py-1 rounded-[4px] text-[11px] font-bold hover:brightness-110 active:scale-95 transition-all">
                          Approve
                        </button>
                      ) : (
                        card.meta && (
                          <div className={card.meta.metaClass}>
                            <Icon name={card.meta.icon} className="text-sm" />
                            <span>{card.meta.label}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Fab icon="add" />
    </>
  )
}
