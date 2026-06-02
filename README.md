# Disruptors Mission Control

The all-in-one agency command center ("Mammoth") for Disruptors Media — a React port of the
Stitch designs in `../stitch_disruptors_media_platform`. Black + gold brand, web-first.

## Stack

- **Vite** + **React 18** + **React Router 6**
- **Tailwind CSS v3** — design tokens ported verbatim from the Stitch exports (`tailwind.config.js`)
- **Supabase** (`@supabase/supabase-js`) — backs the task board
- **@dnd-kit** — drag-and-drop for the Kanban board
- **Vista Social** — live channels + content calendar on the Social Media tab (via a dev-server proxy)
- **Google Material Symbols** + Hanken Grotesk / JetBrains Mono (loaded in `index.html`)

## Run it

```bash
npm install
cp .env.example .env   # then fill in your Supabase URL + anon key, and the Vista Social API key
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the build
```

Run `supabase/migrations/0001_tasks.sql` in your Supabase project's SQL Editor to create the
`tasks` table. The app still runs without Supabase configured — the board just shows a hint and
won't persist.

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

Most views are front-end only with mock data (matching the Stitch mockups). Several are now live:

- **Task Management** — a fully interactive Kanban board (smooth `@dnd-kit` drag with precise
  drop positioning, add/edit/delete via a modal), persisted per-client in Supabase.
- **Social Media** — live channel status + a content calendar (month/week/day) backed by Vista
  Social. Live data works under `npm run dev` (uses a server-side proxy that injects the API key);
  set `VISTA_SOCIAL_API_KEY` in `.env`. A production deploy needs an equivalent server-side proxy.
- **SEO/GEO** — keeps the mock overview UI, with an **Open Content Agent** button that launches
  the separate web app at `https://content-agent.disruptorsmedia.com/` in a new tab.

Still mock / not yet built (from the planning calls): Stripe billing, GHL/HubSpot CRM APIs, Vista
Social analytics, WordPress auto-posting, real auth/onboarding (the board is anon-key only for
now), client health scoring, and notetaker imports.
