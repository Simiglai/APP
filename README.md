# Patrick Simiglai — coaching app

A daily planner + accountability app for Patrick Simiglai's coaching clients — check in every morning, answer challenge questions, plan training, food and socials, act like the person they're becoming, and report to their coach.

## Features

| Tab | What it does |
|---|---|
| **Today** | Daily motivation quote + identity reminder + reflection prompt · mood / energy / sleep check-in · **2 daily challenge questions** (Mirror + Challenge) · **Be the person who inspires you** (what would my future self do today + 3 identity actions) · **purpose for the day** · **top 3 goals** · **5 things that make me happy** · **1 discipline challenge** (with suggestions) · **fuel plan** (breakfast, lunch, dinner, snacks + water) · today's **training** session · **socials** (who I'll connect with, social media limit + rule) · "Lock in my day" · evening review (wins, lesson, actual social media time vs limit, 1–10 rating) · Sunday weekly-review prompt · browse previous days |
| **Goals** (under Me) | Long-term goals by life area (Health, Career, Relationships, Mind, Finance, Purpose) with a *why*, target date and milestone progress |
| **Mind** | Mental worksheets (shareable with the coach) and events — Elite |
| **Train** | Weekly training plan (editable per day), 3 templates (beginner, fat loss, 10k running), last-7-days completion |
| **Coach** | Accountability with the coach: today's status, post your check-in, quick nudges, share via WhatsApp/iMessage (Web Share / clipboard) |
| **Weekly review** | Week stats + score, biggest win, where I fell short, when I acted like who I'm becoming, what I'll do differently, next week's focus — sent to the coach |
| **Me** | **Who am I?** (identity) · **What can I become?** · purpose · core values · streak, check-ins, discipline wins, avg rating, 14-day mood/energy chart |

Onboarding walks a new client through name → identity → who they are becoming + purpose → core values → partner.

## Membership tiers

Defined in `src/lib/plans.ts` (prices/features) — each higher tier includes everything below it.

| Plan | Price | Unlocks |
|---|---|---|
| **Accountable** | $50 / 349 kr. per month | Daily check-in & planner, challenge questions, identity work, coach chat, weekly review, goals |
| **Perform** | $300 / 1.999 kr. per month | + personal training programs, TrainingPeaks connection |
| **Elite** | $500 / 3.499 kr. per month | + mental worksheets, events |
| **Private Personal Advisory** | Free 30-min call | Opens the Calendly link in `BOOKING_URL` (`src/config.ts`) |

**Perform and Elite start with a call**: the client taps “Book a call to apply” (opens Calendly prefilled with their name + email, and tells the coach in chat); the coach approves the plan in the client's page of the dashboard; only then can the client pay. Enforced in the database (`approved_tiers`, `coach_set_approval`) and in `create-checkout`. Clients already subscribed switch plans in the app (prorated); the Stripe portal only handles card, receipts and cancelling.

Locked features show an upgrade card. Plan switching is instant in preview mode until Stripe payments are connected.

- Mental worksheets: `src/content/worksheets.ts` (fear setting, limiting beliefs, future-self letter, wheel of life, pressure plan, values & non-negotiables) — add new ones there.
- Events: `src/content/events.ts`.
- TrainingPeaks: the API requires an approved partner application (api.trainingpeaks.com/request-access). Until approved, the Train tab links to TrainingPeaks and clients tick sessions off in the app.

Prices exist in USD and DKK; Danish-language phones default to DKK and clients can switch on the membership page.

## Database (Supabase)

`supabase/migrations/` holds the schema: profiles (role, plan, billing), daily check-ins, goals, weekly reviews, training programs, worksheets, coach chat, events + RSVPs and a `coach_client_overview` view for the coach dashboard. Row-level security: clients only see their own data, the coach sees everyone, clients can't change their own plan/role, and Perform/Elite features are enforced in the database.

Test locally on plain Postgres:

```bash
cd supabase/tests
psql -d <empty db> -v ON_ERROR_STOP=1 -f local_stub.sql -f ../migrations/20261116000000_init.sql -f rls_test.sql
```

## Accounts, coach & payments

- **Login**: email + password (Supabase Auth). Each user's data is cached on the device and synced to Supabase (`src/lib/store.tsx`, `src/lib/sync.ts`); unsent changes survive restarts and are retried.
- **Coach**: an account with `role = 'coach'` gets the coach dashboard instead of the client app — clients with attention flags (no check-in for 2+ days, low mood/energy, failed payment, unread messages), 14-day check-in grid, weekly reviews, shared worksheets, live chat, plan override and an events manager. Make an account coach in the Supabase SQL editor:
  `update profiles set role = 'coach' where id = (select id from auth.users where email = 'you@example.com');`
- **Payments** (Supabase Edge Functions in `supabase/functions/`):
  - `create-checkout` — Stripe Checkout for the chosen plan in DKK or USD
  - `customer-portal` — switch plan, update card, cancel, receipts
  - `stripe-webhook` — keeps `profiles.plan` / `plan_status` in sync; events are verified by re-fetching them from Stripe
  - Needs the Supabase secret `STRIPE_SECRET_KEY`. Clients without an active plan see the plan picker.

## Hosting

Live at **https://app.patricksimiglai.com** (also https://ps-daily.netlify.app; Netlify site `ps-daily`, free plan; the "Powered by Netlify" badge is turned off because it covered the tab bar). Publish a new version with `scripts/deploy.sh`. `public/_headers` and `public/_redirects` configure caching, security headers and the manifest type. Supabase Auth site URL and the `SITE_URL` function secret point at app.patricksimiglai.com (DNS: CNAME `app` → `ps-daily.netlify.app` at Simply; HTTPS certificate by Netlify).

### Before launch
1. Add `STRIPE_SECRET_KEY` to Supabase Edge Function secrets (checkout is off until then).
2. Rotate the Stripe test key, then repeat setup with live keys (`scripts/stripe_setup.py`, webhook endpoint, billing portal).
3. Supabase sends auth emails via Resend SMTP (noreply@patricksimiglai.com). Remaining: Resend DNS records in Simply → domain verified → turn email confirmation on (`mailer_autoconfirm = false`).
4. ✓ Custom domain app.patricksimiglai.com live with HTTPS.
5. Create Patrick's own account and set `role = 'coach'`.

## Languages

Danish and English. Danish phones get Danish automatically; clients can switch under **Me → Language**. All UI text goes through `t()` (`src/i18n.tsx`) with the Danish dictionary in `src/i18n.da.ts` (keys are the English texts; missing keys fall back to English). Content has Danish versions too: quotes, daily questions, discipline ideas, social rules (`src/lib/motivation.ts`), worksheets (`src/content/worksheets.ts`), training templates and the default week. Language and currency (DKK for Danish) are stored on the profile at sign-up; Stripe Checkout and the billing portal open in Danish for Danish clients.

## Brand

Follows the Patrick Simiglai design manual (2022): Montserrat (bold headings, light body, medium UI), navy `#12264a`, dark grey `#313132`, light grey `#ececec`, black and white. The logo files in `public/brand/` are extracted directly from the manual — never redraw them. Light mode = navy on light grey; dark mode = white on navy.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build in dist/
```

Mobile-first and installable as a PWA ("Add to Home Screen").

## Architecture

- Vite + React 19 + TypeScript, no UI framework.
- `src/lib/store.tsx` — single local-first store persisted to `localStorage`. Its shape (`profile`, `days`, `goals`, `training`, `messages`) maps 1:1 to backend tables, so adding a synced backend is contained to this file.
- `src/screens/*` — one file per tab.

## Roadmap

1. **Accounts + sync** (e.g. Supabase: auth, Postgres, realtime) — real two-way partner chat, data on every device.
2. **Coach dashboard** — see all clients' check-ins, streaks and red flags (missed 2 days, low mood) at a glance; send group motivation.
3. **Coach-editable content** — Patrick writes/schedules the challenge questions, quotes and training plans per client or group.
4. **Reminders** — push notifications for morning check-in, evening review and partner nudges.
5. **AI coach** — personalised daily motivation from the client's identity and goals; meal-plan and workout suggestions.
6. **Habit tracker** — custom daily habits (meditation, reading, steps) with streaks.
7. **Meal photo log + macros**, wearable / Apple Health sync for sleep & steps.
8. **Challenges & community** — 30/75-day challenges, leaderboards, partner matching.
9. **Payments** — subscriptions for clients (Stripe).
