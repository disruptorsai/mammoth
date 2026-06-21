# Mission Control — Session Handoff / Full Context

> Pick-up notes for continuing in a new session. Technical. (Client-facing summary = PROGRESS.md;
> plain guide = ABOUT.md; running build log = PROJECT-NOTES.md; repo rules = CLAUDE.md.)

Last updated: 2026-06-09 · Repo: github.com/disruptorsai/mammoth · **Branch: `v2`** · Deploy: Vercel (mammoth-rho2.vercel.app)

---

## 1. What this is

Disruptors Media "Mission Control" (Mammoth) — an all-in-one agency command center, React port of
the Stitch designs. You sign in, pick a client, and every page is scoped to that client. Started as
front-end-only mock; now has real auth + a Supabase backend for the core data.

## 2. Stack

Vite + React 18 + React Router 6, Tailwind v3 (tokens from Stitch in `tailwind.config.js`), plain JSX
(no TS). Supabase (`@supabase/supabase-js`) for auth + Postgres. `@dnd-kit` for boards. Vista Social
for live social. Deployed on Vercel. No test runner/linter.

Commands: `npm install`, `npm run dev` (→ :5173), `npm run build`, `npm run preview`.

## 3. Architecture

- **Provider tree** (`src/App.jsx`): `AuthProvider → AuthGate → ClientProvider → Routes(Layout)`.
  - `AuthContext` — Supabase session + `profiles` row (`role`, `client_id`); exposes `isAdmin`, `signIn`, `signOut`.
  - `AuthGate` — shows Login if no session; "account pending" if signed in but no profile; else the app.
  - `ClientContext` — loads the client roster **from Supabase** (`lib/clients.js`). Admins get all
    clients + can switch; client users are locked to their own. Exposes `activeClient`, `setActiveClient`,
    `canSwitch`, `addClient`. **If roster is empty → renders `EmptyRosterGate`** (admins: "Create your
    first client" form; clients: "no workspace yet").
- **Per-page header**: Layout does NOT render TopBar; each page renders its own `<TopBar>` and wires
  the mobile hamburger via `useOutletContext().openNav`.
- **TopBar** (now functional): `GlobalSearch` (jump to page / switch client), `NotificationsMenu`
  (recent task/content updates for active client), `SettingsMenu` (account + sign out). The **client
  switcher now lives in the Sidebar**, between the brand and the nav.
- **Data libs** (`src/lib/`): `supabase.js` (client + `isSupabaseConfigured`), `tasks.js`,
  `contentBoard.js`, `clients.js`, `vistaSocial.js`. Pages import these, not `supabase` directly.
- **Toast**: `components/Toast.jsx` `useToast()` — used by pages for "coming soon" feedback on unwired actions.

## 4. Database (Supabase) — migrations in `supabase/migrations/`

Run **in order** in the SQL Editor on a fresh project:
1. `0001_tasks.sql` — `tasks` table (per `client_id`, `column_key`, fractional `position`).
2. `0002_tasks_assignee.sql` — adds `tasks.assignee`.
3. `0003_content_board.sql` — `content_posts` (Idea/Drafting/Scheduled/Published).
4. `0004_auth.sql` — `profiles` (role + client_id), `is_admin()` / `my_client_id()` SECURITY DEFINER
   helpers, signup trigger (**first user → admin**, rest → client), per-client RLS on tasks/content.
5. `0005_clients.sql` — `clients` table (id/slug, name, initials, health, features jsonb), admin-write
   RLS. **Starts EMPTY** (no seed) — clients are added in-app.
6. `0006_first_user_admin.sql` — first-account-admin trigger + promotes the existing earliest user.

**RLS model:** `is_admin() OR client_id = my_client_id()` on `tasks`, `content_posts`, `clients`.
Accounts are admin-created in Supabase (Auth → Users → Add user, Auto Confirm), no public sign-up.

## 5. Env vars

- `.env` (gitignored, local): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (set), `VISTA_SOCIAL_API_KEY` (**empty — set for live social**).
- **Vercel** project env: set `VISTA_SOCIAL_API_KEY` (Production + Preview) — otherwise `/vista-mcp` returns 500 on the deployed site.

## 6. Vista Social

Client calls same-origin `/vista-mcp` (never Vista directly; key stays server-side).
- **Dev:** Vite proxy in `vite.config.js` injects the key.
- **Prod:** `api/vista-mcp.js` (Vercel serverless function); `/vista-mcp` routed to it in `vercel.json`.
Degrades gracefully (channels "Offline") with no key.

## 7. Current state

- **Live (real data, per client):** auth/login, clients (add in-app via "+ New Client" in the sidebar
  switcher or the empty-roster screen), **Task board**, **Content board**, Vista channels/calendar.
- **Interactive but not wired to a service** (buttons show a "coming soon" toast): Subscription (Stripe),
  CRM (GHL/HubSpot/Jobber), Paid Ads platform connectors. Overview/analytics numbers are placeholders.
- **Paid Advertising** is gated per `features.ads` (shows "Schedule the call" CTA when off).
- **SEO/GEO** = mock overview + live-preview link to the separate Content Agent app
  (https://content-agent.disruptorsmedia.com/).

## 8. Known issues / gotchas

- **Git push auth**: the shell can't push (Windows GCM needs an interactive login; no token in env).
  The USER must run `git push origin v2` in their terminal and complete the GitHub popup once; after
  that it caches. (As of this handoff, everything is pushed — local == origin/v2 at `37d9978`.)
- **First-run admin**: a brand-new account is auto-admin (via the 0006 trigger). On a DB created before
  0006, run `0006_first_user_admin.sql` (or `update public.profiles set role='admin' where id=(select id from public.profiles order by created_at asc limit 1);`) so you're not stuck on "No workspace yet".
- **`BOOKING_URL`** in `PaidAdvertising.jsx` is a Calendly placeholder — set the real booking link.
- LF→CRLF git warnings on Windows are harmless.

## 9. To wipe data (start clean)

```sql
delete from public.tasks;
delete from public.content_posts;
delete from public.clients;
-- profiles/auth users are untouched; you stay logged in.
```

## 10. Next steps / backlog

- Decisions pending from the user: **Overview hero copy** (options A/B/C proposed) and **Subscription
  tier prices** ("Bryan's numbers").
- Integrations: Stripe billing, CRM APIs (GHL/HubSpot/Jobber), ad-platform dashboards, WordPress
  auto-publish from SEO/GEO.
- Nice-to-haves: client health score, notetaker→tasks, Slack links, real charts (replace CSS bars),
  per-client Vista filtering.
- **Decide: merge `v2` → `main`** (Vercel production branch?) or keep deploying the `v2` preview.

## 11. Recent commits (newest first)

```
37d9978 Add PROGRESS.md — simple client-facing progress update
2fd37aa First account becomes admin automatically
fba2cd9 Make top-bar search, notifications, and settings functional
0bc34ff Update PROJECT-NOTES: in-app client creation, empty-roster gate, data sources
b893c8b Require a client first: gate the app on an empty roster
d26ebb1 Start with empty roster + move client switcher into the sidebar
3113d73 Align client ids to names, data-safe
d581ae6 Make remaining pages interactive + add ABOUT.md
4037d88 Vista Social production serverless proxy
352994e Admin-managed clients + "New Client" form
cdc361a Authentication: email/password, admin + per-client roles
2265beb Content Architect Kanban (Supabase)
9a369d0 Paid Ads gating + task Assignee
```

## 12. First things to do in a new session

1. `npm install` → `npm run dev`. Make sure `.env` has Supabase keys (+ Vista key for social).
2. Confirm migrations 0001–0006 are applied to the Supabase project; sign in; you should be admin.
3. `git status` / `git log` to confirm you're on `v2` and synced.
4. Pick up from the backlog (§10) — likely the hero/pricing decisions or an integration.
