# Rise Daily

A daily planner + accountability app for coaching clients — check in every morning, get daily motivation, plan your day, train, and report to an accountability partner.

## What's in v0.1

| Tab | What it does |
|---|---|
| **Today** | Daily motivation quote + identity reminder + reflection prompt · mood / energy / sleep check-in · **purpose for the day** · **top 3 goals** · **5 things that make me happy** · **1 discipline challenge** (with suggestions) · **fuel plan** (breakfast, lunch, dinner, snacks + water) · today's **training** session · "Lock in my day" · evening review (wins, lesson, 1–10 rating) · browse previous days |
| **Goals** | Long-term goals by life area (Health, Career, Relationships, Mind, Finance, Purpose) with a *why*, target date and milestone progress |
| **Train** | Weekly training plan (editable per day), 3 templates (beginner, fat loss, 10k running), last-7-days completion |
| **Partner** | Accountability partner: today's status, post your check-in, quick nudges, share via WhatsApp/iMessage (Web Share / clipboard) |
| **Me** | **Who am I?** (identity) · **What can I become?** · purpose · core values · streak, check-ins, discipline wins, avg rating, 14-day mood/energy chart |

Onboarding walks a new client through name → identity → who they are becoming + purpose → core values → partner.

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
3. **Reminders** — push notifications for morning check-in, evening review and partner nudges.
4. **Weekly review** — every Sunday: score the week, pick next week's focus, auto-summary for the coach.
5. **AI coach** — personalised daily motivation from the client's identity and goals; meal-plan and workout suggestions.
6. **Habit tracker** — custom daily habits (meditation, reading, steps) with streaks.
7. **Meal photo log + macros**, wearable / Apple Health sync for sleep & steps.
8. **Challenges & community** — 30/75-day challenges, leaderboards, partner matching.
9. **Payments** — subscriptions for clients (Stripe).
