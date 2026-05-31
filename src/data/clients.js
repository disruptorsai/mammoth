// Mock client roster for the client switcher (Tyler: "you can change your client here").
// Each client carries the feature flags discussed in the call — internal is always on,
// the rest are optional toggles driven by the onboarding form / package.
export const CLIENTS = [
  {
    id: 'atom-fitness',
    name: 'Atom Fitness',
    initials: 'AF',
    health: 82,
    features: { internal: true, seo: true, social: true, ads: true, crm: true },
  },
  {
    id: 'precision-solar',
    name: 'Precision Solar',
    initials: 'PS',
    health: 64,
    features: { internal: true, seo: true, social: false, ads: true, crm: true },
  },
  {
    id: 'vanguard-media',
    name: 'Vanguard Media',
    initials: 'VM',
    health: 91,
    features: { internal: true, seo: true, social: true, ads: false, crm: false },
  },
  {
    id: 'elum-collective',
    name: 'Elum Collective',
    initials: 'EC',
    health: 47,
    features: { internal: true, seo: false, social: true, ads: true, crm: true },
  },
]
