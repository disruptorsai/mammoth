# Mission Control — Project Notes

> Working doc for ongoing build decisions, status, and the backlog.
> Continue adding below. (README.md = how to run it; this = where the work stands.)

Repo: https://github.com/disruptorsai/mammoth
Last updated: 2026-06-01

---

## Current status

Front-end SPA, all mock data. Builds clean (`npm run build`), all 7 routes render with no console errors.

| Route | View | State |
|-------|------|-------|
| `/` | Overview (Mission Control dashboard) | ✅ done |
| `/paid-advertising` | Paid Advertising — ads analytics, FBS manager, AI copy, campaigns | ✅ done |
| `/social-media` | Social Media — Content Architect, calendar, AI image/video generator | ✅ done |
| `/task-management` | Task Management — Kanban board | ✅ done |
| `/seo-geo` | SEO/GEO — keyword velocity, site health, GEO map, SERP table | ✅ done |
| `/subscription` | Subscription — token usage, Stripe top-ups, plans | ✅ done (net-new) |
| `/crm` | CRM — GHL/HubSpot/Jobber, pipeline, interaction stream | ✅ done |

## Stack

- Vite + React 18 + React Router 6, Tailwind v3 (tokens ported from the Stitch exports — see `tailwind.config.js`)
- Material Symbols + Hanken Grotesk / JetBrains Mono (loaded in `index.html`)
- Plain JSX (no TypeScript) for easy editing

## Where things live

```
src/
  App.jsx                  routes
  context/ClientContext    active client + setter (client switcher state)
  components/              Layout, Sidebar, TopBar, ClientSwitcher, Icon, Fab
  data/nav.js              sidebar items
  data/clients.js          mock clients + feature flags (internal/seo/social/ads/crm)
  pages/                   the 7 views + NotFound
```

## Conventions

- Each page: `const { openNav } = useOutletContext()` → renders its own `<TopBar title=… onMenu={openNav} />` then content, optional `<Fab />`.
- Icons: `<Icon name="…" filled? />` (wrapper over Material Symbols).
- Use the Tailwind design tokens (`primary`, `surface-container`, `outline`, etc.) — don't hardcode hex.
- Cards use `rounded-xl` (kept tight/clean — the pill/`rounded-full` experiment was reverted).

## Intentional deviations from the Stitch mockups

- Client switcher in the top bar + "Active client: …" status line (replaces the static date).
- "Opus 4.8 Turbo Engine" instead of "GPT-5 Turbo Engine".
- Subscription page is net-new (no Stitch source existed).

---

## Backlog (from the planning calls — not built yet)

- [ ] Auth + onboarding (GHL onboarding form → auto-provision client account)
- [ ] Per-client feature gating (flags exist in `data/clients.js`; wire them to hide/show tabs)
- [ ] Stripe billing — real token top-ups + plan changes + usage metering
- [ ] CRM APIs — GoHighLevel / HubSpot deep link + data sync
- [ ] Vista Social — social analytics + auto-posting
- [ ] WordPress — blog auto-publish from SEO/GEO
- [ ] Ads — Meta/Google/LinkedIn connectors + live dashboards
- [ ] Client health score (churn signal; <50 = at-risk)
- [ ] Notetaker imports (Fireflies/Fathom) → auto-create tasks
- [ ] Slack per-client channel links
- [ ] Deploy (Vercel/Netlify) + custom domain
- [ ] Real charts (replace the CSS-bar mockups, e.g. Recharts)

---

## Decisions / log

- 2026-06-01 — Reverted dashboard cards from pill/`rounded-3xl` back to `rounded-xl` (looked off).
- 2026-06-01 — Repo scope set to the app only (was `mammoth/` wrapper); force-pushed to root of `disruptorsai/mammoth`.

## Open questions

-

## Notes (continue here)

-
