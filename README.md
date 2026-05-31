# Disruptors Mission Control

The all-in-one agency command center ("Mammoth") for Disruptors Media — a React port of the
Stitch designs in `../stitch_disruptors_media_platform`. Black + gold brand, web-first.

## Stack

- **Vite** + **React 18** + **React Router 6**
- **Tailwind CSS v3** — design tokens ported verbatim from the Stitch exports (`tailwind.config.js`)
- **Google Material Symbols** + Hanken Grotesk / JetBrains Mono (loaded in `index.html`)

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the build
```

## What's here

A shared app shell (sidebar + sticky top bar + **client switcher**) wraps seven routed views,
each a faithful port of its Stitch screen:

| Route | View | Source screen |
|-------|------|---------------|
| `/` | **Overview** — Mission Control dashboard | `mission_control_dashboard_disruptors` |
| `/paid-advertising` | **Paid Advertising** — ads analytics, FBS manager, AI copy, campaigns | `paid_advertising_disruptors` |
| `/social-media` | **Social Media** — Content Architect, calendar, AI image/video generator | `social_media_hub_with_ai_generators` |
| `/task-management` | **Task Management** — Kanban board | `task_board_disruptors` |
| `/seo-geo` | **SEO/GEO** — keyword velocity, site health, GEO map, SERP table | `seo_geo_analytics_disruptors` |
| `/subscription` | **Subscription** — token usage, Stripe top-ups, plans (new) | (paywall placeholder per spec) |
| `/crm` | **CRM** — GHL / HubSpot / Jobber integrations, pipeline | `crm_integrations_disruptors` |

The **client switcher** (top bar) swaps the active client; each client carries feature flags
(`internal` always on; `seo` / `social` / `ads` / `crm` optional) ready to gate tab access, per
the onboarding-driven model discussed in the planning calls.

## Project layout

```
src/
  main.jsx              # entry + BrowserRouter
  App.jsx               # routes
  index.css             # Tailwind + shared design utilities
  context/ClientContext.jsx
  components/           # Layout, Sidebar, TopBar, ClientSwitcher, Icon, Fab
  data/                 # nav items, mock clients
  pages/                # the seven views + NotFound
```

## Current state & next steps

All views are front-end only with mock data (matching the Stitch mockups). Wiring discussed in
the planning calls, not yet built: Stripe billing, GHL/HubSpot CRM APIs, Vista Social analytics,
WordPress auto-posting, real auth/onboarding, client health scoring, and notetaker imports.
