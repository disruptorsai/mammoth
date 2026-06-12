# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Disruptors Media "Mission Control" ("Mammoth") — an all-in-one agency command center. It is a
React port of Stitch designs originally exported to `../stitch_disruptors_media_platform`. Every
page is a faithful port of a specific Stitch screen (see the route table in `README.md`). **Most
pages are still front-end-only with mock data** (Paid Advertising, SEO/GEO, Subscription, CRM) —
those integrations (Stripe, GHL/HubSpot, WordPress, auth) are not wired yet. Two pages are live:
**Task Management** (backed by Supabase) and **Social Media** (backed by Vista Social) — see below.

## Commands

```bash
npm install
npm run dev      # Vite dev server → http://localhost:5173
npm run build    # production build → dist/
npm run preview  # serve the production build
```

There is no test runner, linter, or TypeScript — the toolchain is just Vite + React + Tailwind.

## Supabase

The task board persists to Supabase via `@supabase/supabase-js`.

- Client: `src/lib/supabase.js` reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` from `.env`
  (see `.env.example`). It exports `isSupabaseConfigured` so the UI degrades gracefully (shows a
  hint, drag still works in-memory) when env vars are missing — don't assume `supabase` is non-null.
- Schema: `supabase/migrations/0001_tasks.sql` — run it in the Supabase SQL Editor. One `tasks`
  table keyed by `client_id` (matches the ids in `src/data/clients.js`), with `column_key`
  (`todo`/`in_progress`/`review`) and a fractional `position` for ordering.
- **No auth yet**: anon key only, RLS on with permissive policies. Replace those policies with
  auth-scoped ones when login lands.
- Data access lives in `src/lib/tasks.js` (CRUD + `positionBetween` for drag ordering); pages
  import from there rather than calling `supabase` directly. The same lib-module pattern backs
  leads (`leads.js`), ad campaigns (`adCampaigns.js`), SEO keywords (`seoKeywords.js`), and the
  shared activity feed (`activity.js`).

## AI generation (Claude API)

Ad copy (Paid Advertising) and captions (Social Media → Generators) generate via the Anthropic
Messages API through a same-origin `/claude-api` proxy — dev: `vite.config.js` proxy injecting
`ANTHROPIC_API_KEY` headers; prod: `api/claude.js` (model allowlist + max_tokens cap). The client
is `src/lib/ai.js` (`generateAdCopy`, `generateCaption`, `fetchMonthUsage`); each generation logs
a row to `usage_events` (migration 0011), which the Subscription usage card sums for the month.
Model: `claude-opus-4-8`; no sampling params (removed on 4.7+).

## Vista Social

The Social Media tab pulls live channels and scheduled/published posts from Vista Social.

- **Dev-proxy only**: `vite.config.js` defines a `/vista-mcp` dev-server proxy that forwards to
  Vista's MCP (JSON-RPC) endpoint and injects `VISTA_SOCIAL_API_KEY` server-side (loaded via
  `loadEnv` *without* the `VITE_` prefix, so the key never reaches the browser bundle). This means
  the dev integration works under `npm run dev`. For production, `api/vista-mcp.js` is a Vercel
  serverless function that does the same injection (the `/vista-mcp` path is routed to it via
  `vercel.json`), so the deployed site needs `VISTA_SOCIAL_API_KEY` set in the Vercel project env.
- Client: `src/lib/vistaSocial.js` — MCP client + helpers (`getGroupedProfiles`, `listPosts`,
  `networkStyle`, `statusStyle`). It calls the same-origin `/vista-mcp` path, never Vista directly.
- UI: `src/components/ContentCalendar.jsx` (month/week/day calendar, tri-state client multi-select,
  status filters) and the rewritten `src/pages/SocialMedia.jsx` (live channel status).
- Without `VISTA_SOCIAL_API_KEY` set, the page degrades gracefully (channels show "Offline",
  calendar shows an error state) — it does not crash.

## Architecture

- **Stack**: Vite + React 18 + React Router 6 (`BrowserRouter` in `src/main.jsx`), Tailwind CSS v3. JSX only, no TypeScript.
- **Routing** (`src/App.jsx`): a single `<Layout>` route wraps seven page routes plus a `*` NotFound. Pages live in `src/pages/`, one per route.
- **App shell** (`src/components/Layout.jsx`): fixed `Sidebar` + a scrollable `<main>` rendering `<Outlet>`. Layout owns the mobile nav open/close state and passes `{ openNav }` down through the **outlet context**.
- **Per-page header**: Layout deliberately does **not** render the `TopBar`. Each page renders its own `<TopBar>` so it can set its own `title`/`searchPlaceholder`, then wires the hamburger via `const { openNav } = useOutletContext()` → `<TopBar onMenu={openNav} />`. Follow this pattern when adding a page.
- **Client switcher** (`src/context/ClientContext.jsx` + `components/ClientSwitcher.jsx`): a global `ClientProvider` (mounted in `App.jsx`) holds the active client. Consume it with the `useClient()` hook → `{ clients, activeClient, setActiveClient }`. Clients come from `src/data/clients.js` and each carries `features` flags (`internal` always on; `seo`/`social`/`ads`/`crm` optional) intended to gate feature/tab access per the onboarding model — the flags exist but gating is not yet enforced.
- **Navigation** is data-driven from `src/data/nav.js` (`NAV_ITEMS`); the `Sidebar` maps over it.

## Conventions

- **Icons**: use the `Icon` component (`src/components/Icon.jsx`), a wrapper over Google Material Symbols (loaded via `index.html`). Pass `name="<symbol>"` and `filled` for the FILL=1 variant. Active nav/state icons are filled; inactive are outlined.
- **Design tokens**: all colors/spacing/typography are Material-Design tokens ported verbatim from the Stitch exports into `tailwind.config.js`. The brand is **black + gold** — `background` `#0E0E0E`, `primary` (gold) `#eec065`, `surface-container` `#1A1A1A`. Prefer these semantic token classes (`bg-surface-container`, `text-primary`, `text-on-surface-variant`, `border-outline`, etc.) over raw hex/Tailwind palette colors so ports stay consistent.
- **Shared CSS utilities** (`src/index.css`): `gold-gradient`, `gold-gradient-text`, `glow-gold`, `bento-card`, `custom-scrollbar`, `animate-fade-in-up`. Reuse these rather than re-deriving the gradient/glow inline.
- **Fonts**: Hanken Grotesk (sans/headlines), JetBrains Mono (`font-label-mono`/`font-mono` for data and labels). Custom font sizes like `text-headline-lg`, `text-body-md`, `text-label-mono` are defined in the Tailwind config.
- Page data (metrics, mock activity, etc.) is hard-coded as module-level constants at the top of each page file — match that style for the still-mock pages. **Task Management is the exception**: it loads/writes real data via `src/lib/tasks.js`, scoped to `useClient().activeClient.id`, and uses `@dnd-kit` (core/sortable) for drag-and-drop. The board reloads when the active client changes.
- **External tools**: SEO/GEO has its own separate web app at `https://content-agent.disruptorsmedia.com/`. The in-app SEO/GEO page keeps the mock overview UI plus an "Open Content Agent" button that opens that app in a new tab. Other modules may follow this same "overview-here, deep-tool-elsewhere" pattern.
