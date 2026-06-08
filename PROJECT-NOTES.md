# Mission Control — Project Notes

> Working doc for ongoing build decisions, status, and the backlog.
> Continue adding below. (README.md = how to run it; ABOUT.md = plain-language guide; this = where the work stands.)

Repo: https://github.com/disruptorsai/mammoth · Branch: `v2` · Deploy: Vercel (mammoth-rho2.vercel.app)
Last updated: 2026-06-09

---

## Current status

No longer a pure mock — the app now has **real auth + a Supabase backend**. Builds clean
(`npm run build`); the whole app sits behind email/password login.

| Route | View | State |
|-------|------|-------|
| `/` | Overview dashboard | ✅ nav wired; metrics still mock; chart/filter toggles work |
| `/paid-advertising` | Paid Advertising | ✅ gated per `features.ads`; controls interactive (mock data) |
| `/social-media` | Social Media — Content Architect | ✅ **live Vista** channels+calendar; **Content board** (Supabase) |
| `/task-management` | Task Management — Kanban | ✅ **live** (Supabase, per-client, drag-drop, assignee, due dates) |
| `/seo-geo` | SEO/GEO | ✅ mock overview + live preview/link to Content Agent app |
| `/subscription` | Subscription | ✅ interactive; Stripe not connected (buttons toast) |
| `/crm` | CRM | ✅ interactive; GHL/HubSpot/Jobber not connected (buttons toast) |

**Live & persisting:** login, clients (add in-app), Task board, Content board, Vista channels/calendar.
**Interactive but not wired to a service yet (buttons show a "coming soon" toast):** Stripe billing, CRM connectors, ad-platform hookups.

## Auth & data model (Supabase)

- **Auth:** email/password, accounts are **admin-created** (no public sign-up).
- **Roles** (`profiles.role`): `admin` sees all clients + the switcher; `client` is locked to their own `client_id`.
- **Per-client RLS** on `tasks`, `content_posts`, `clients` — `is_admin() OR client_id = my_client_id()`.
- **Clients live in the DB** (`clients` table), not in code. Roster starts **empty**; admins add via
  **"+ New Client"** in the sidebar client switcher (creates the workspace; the login is still added in
  Supabase and mapped to the new `client_id`).
- Migrations (run in order in the SQL Editor): `0001_tasks` · `0002_tasks_assignee` · `0003_content_board` ·
  `0004_auth` · `0005_clients`.

## Stack

- Vite + React 18 + React Router 6, Tailwind v3 (tokens from the Stitch exports — `tailwind.config.js`)
- **Supabase** (`@supabase/supabase-js`) — auth + Postgres; **@dnd-kit** — board drag-and-drop
- **Vista Social** — live social data (dev: Vite `/vista-mcp` proxy; prod: `api/vista-mcp.js` Vercel function)
- Material Symbols + Hanken Grotesk / JetBrains Mono; plain JSX (no TypeScript)

## Where things live

```
src/
  App.jsx                    AuthProvider → AuthGate → ClientProvider → routes
  context/AuthContext        session + profile (role, client_id)
  context/ClientContext      loads clients from Supabase; admin=all, client=own; addClient()
  components/                Layout, Sidebar (holds ClientSwitcher), TopBar, Login, AuthGate,
                             NewClientModal, ContentBoard, ContentCalendar, Toast, Icon, Fab
  lib/                       supabase, tasks, contentBoard, clients, vistaSocial
  pages/                     the 7 views + NotFound
api/vista-mcp.js             Vercel serverless proxy for Vista (injects the key server-side)
supabase/migrations/         0001–0005
```

## Setup checklist (per environment)

- `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VISTA_SOCIAL_API_KEY`.
- Run migrations 0001–0005; create an admin (`update profiles set role='admin' where email=…`).
- Vercel env: set `VISTA_SOCIAL_API_KEY` (Production + Preview) for live social on the deployed site.

---

## Backlog

- [x] Auth + per-client roles/RLS
- [x] Admin-managed clients (add in-app)
- [x] Task board (Supabase) + assignee
- [x] Content board (Supabase) + Vista live channels/calendar
- [x] Paid-ads gating CTA (per `features.ads`)
- [x] Deploy on Vercel (SPA rewrite + serverless Vista proxy)
- [ ] Top-bar **search / notifications / settings** (still decorative)
- [ ] Stripe billing — real top-ups + plan changes + metering (+ confirm tier prices)
- [ ] CRM APIs — GoHighLevel / HubSpot / Jobber sync
- [ ] Ads — Meta/Google/LinkedIn connectors + live dashboards
- [ ] WordPress auto-publish from SEO/GEO · Client health score · Notetaker→tasks · Slack links
- [ ] Real charts (replace CSS-bar mockups) · Overview hero reword (pending copy)

## Decisions / log

- 2026-06-01 — Repo scoped to the app; pushed to root of `disruptorsai/mammoth`.
- 2026-06-02 — Supabase task board; Overview nav; SEO/GEO Content Agent preview; renamed demo clients; Vista Social cherry-picked; Vercel SPA 404 fix.
- 2026-06-02 — Paid-ads gating; task assignee; Content Architect Kanban; **auth (admin + per-client)**.
- 2026-06-02 — Clients moved to a DB table + in-app "New Client"; Vista production serverless proxy.
- 2026-06-04 — Made remaining pages interactive (shared `Toast` for unwired actions); added ABOUT.md.
- 2026-06-09 — **Roster starts empty** (removed seed); **client switcher moved into the sidebar** (between brand and nav).

## Open questions

- Subscription tier prices (Bryan's numbers) and the Overview hero wording — still pending.
