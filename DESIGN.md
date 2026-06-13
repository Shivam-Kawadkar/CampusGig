# CampusGig — UI/UX & Architecture Design Plan (DESIGN.md)

> Design, frontend architecture, database, and roadmap plan to be **approved before any code is written**.

**Document version:** 1.0
**Last updated:** 2026-06-13
**Companion documents:** `PLAN.md`, `SPEC.md`, `README.md`
**Status:** Awaiting approval

---

## 0. Locked Design Decisions

| Area | Decision |
|---|---|
| Brand colors | Primary **Indigo `#4F46E5`**, Accent **Emerald `#10B981`**, Slate text, white / subtle-slate surfaces |
| Personality | Trustworthy, fintech-meets-campus, energetic but credible |
| UI style | **Rich & Detailed** — gradients, illustrations, colorful badges/pills, imagery-rich cards |
| Motion | **Rich / expressive** — parallax, scroll reveals, confetti on milestones, animated gradients, animated counters |
| Navigation | **Sidebar + top bar** on desktop → **bottom tab bar** on mobile |
| Listing layout | **Hybrid** — cards for browse/discovery, tables for data-heavy views |
| Landing page | **Full marketing landing** |
| Code structure | **Feature-based modular**, Server Actions + Zod, service → repository → Supabase |
| Build approach | **MVP-first**, then layer features in phases |
| Dark mode | **Light-first, dark-ready** (theme tokens from day 1; dark toggle later) |
| Stack | Next.js + TS, Tailwind, Shadcn UI, Supabase (PG/Auth/Storage/Realtime), Razorpay, Vercel |

---

## 1. UI/UX Design Plan

### 1.1 Design Language

- **Style:** Rich, friendly, trustworthy. Soft gradient accents (indigo→violet, emerald glows), rounded cards (`radius-xl`), layered soft shadows, colorful category/skill pills, illustration spots and empty states.
- **Density:** Comfortable, not cramped — generous padding, clear hierarchy, imagery on discovery surfaces.
- **Tone:** Encouraging and human ("Earn while you learn", "You're #4 this week 🔥").

### 1.2 Design Tokens

**Color (HSL-friendly, mapped to Shadcn CSS variables):**

| Token | Light value | Use |
|---|---|---|
| `--primary` | Indigo `#4F46E5` | CTAs, links, active nav |
| `--primary-foreground` | White | text on primary |
| `--accent` | Emerald `#10B981` | success, earnings, positive trust |
| `--secondary` | Violet `#7C3AED` | gradient pair, highlights |
| `--background` | White / `#FAFAFB` | app surface |
| `--card` | White | cards |
| `--muted` | Slate-100 `#F1F5F9` | subtle fills |
| `--foreground` | Slate-900 `#0F172A` | primary text |
| `--muted-foreground` | Slate-500 | secondary text |
| `--border` | Slate-200 | dividers |
| `--destructive` | Rose `#E11D48` | errors, disputes |
| `--warning` | Amber `#F59E0B` | deadlines, pending |
| Gradients | indigo→violet, emerald→teal | hero, badges, rank-1 |

**Typography:** `Inter` (or `Geist`) — Display 36/30/24, Heading 20/18, Body 16/14, Caption 12. Tabular numbers for money & ranks.

**Spacing & radius:** 4px base scale; radii `sm 6 / md 10 / lg 14 / xl 20`. Shadows: `sm` (cards), `md` (hover lift), `lg` (modals/popovers).

**Iconography:** `lucide-react`. Category icons color-coded.

### 1.3 Motion System (Framer Motion)

| Pattern | Where |
|---|---|
| Card hover lift + shadow grow | Task/worker/leaderboard cards |
| Fade + slide-up on mount, staggered | Lists, dashboard sections |
| Scroll-triggered reveals & parallax | Landing page sections/illustrations |
| Animated number counters | Wallet balance, earnings, rank, score |
| Confetti burst | Payment received, badge earned, rank-up |
| Animated gradient blobs | Landing hero, empty states |
| Skeleton shimmer | All async loading states |
| Toast slide-in + spring | Notifications |

**Performance guardrails:** GPU-friendly transforms only (`opacity`/`transform`), `prefers-reduced-motion` fully respected (animations downgrade to instant), lazy-load heavy landing animations, no layout-thrash. Motion never blocks interaction.

### 1.4 Accessibility & Responsiveness

- WCAG AA contrast on all text/controls; visible focus rings; full keyboard nav.
- Semantic HTML + ARIA on interactive Shadcn components.
- Mobile-first breakpoints (`sm 640 / md 768 / lg 1024 / xl 1280`).
- Touch targets ≥ 44px; bottom nav thumb-reachable.
- Every async view has loading (skeleton), empty, and error states.

### 1.5 Per-Page Design Specs

#### Landing (`/`) — Full Marketing
- **Hero:** gradient background w/ animated blobs, headline ("Your campus. Your skills. Your income."), sub-text, primary CTA "Continue with Google" + secondary "Browse tasks", floating illustration/mock cards (parallax).
- **How it works:** 3 animated steps (Post → Bid → Get it done & paid).
- **Popular categories:** colorful icon grid.
- **Top earners teaser:** mini leaderboard preview (animated counters).
- **Why CampusGig / trust:** escrow, verified students, ratings — icon feature blocks.
- **Testimonials** + **stats band** (₹ paid out, tasks done, active students).
- **Footer:** links, socials, legal.

#### Dashboard (`/dashboard`)
- Greeting + quick stats cards (active tasks, earnings this month, wallet, current rank) with animated counters.
- Dual mode (toggle **Hire** / **Work**): contextual feed — recommended tasks (worker) or your open tasks + new proposals (poster).
- Quick actions: Post a Task, Browse Tasks, Withdraw.
- Recent activity timeline + notifications preview.

#### Task Marketplace (`/tasks`) — **Cards**
- Sticky filter bar: search, category chips, budget range, deadline, skill, sort.
- Responsive **card grid**: category icon, title, budget pill, deadline countdown, poster mini-profile + rating, skill tags, proposal count, "Bid" CTA.
- Infinite scroll / cursor pagination; skeleton grid while loading.

#### Task Detail (`/tasks/[id]`)
- Two-column (desktop): left = full task (description, attachments, budget, deadline, category, poster card); right = sticky action panel (Bid form for workers / Proposals list for poster).
- Status tracker (stepper): Open → Assigned → In Progress → Submitted → Completed.
- Proposals as cards with worker reputation; **Accept** opens escrow funding modal.

#### Post Task (`/tasks/new`)
- **Guided multi-step form** (Shadcn + react-hook-form + Zod): ① Category → ② Details (title, description, template-driven fields) → ③ Budget & deadline → ④ Attachments → ⑤ Review & publish. Progress indicator, autosave draft.

#### Chat (`/chat`, `/chat/[taskId]`) — **Realtime**
- Two-pane (desktop): conversation list + thread; mobile = stacked.
- Message bubbles, file attachments, read receipts, typing indicator, presence dot.
- Header shows task context + "Schedule meeting" + "Share contact" (gated until acceptance).
- PII-scrub guard on outgoing messages pre-acceptance (numbers/emails masked).

#### Leaderboard (`/leaderboard`, `/leaderboard/[category]`) — **Rank cards**
- Tabs: **Weekly / Monthly / All-time**; secondary category selector (Top Developer, Designer, etc.).
- **Podium** for top 3 (gradient cards, avatars, animated score counters, confetti on first load).
- Ranked list below: rank, avatar, name+college, performance score, key stats, achievement badges.
- "Your rank" sticky highlight row + link to performance dashboard.

#### Performance Dashboard (`/dashboard/performance`)
- Score breakdown (radial/bar by criterion), rank trend over time, earned + locked achievement badges, on-time %, success rate, tips to rank up.

#### Profile (`/profile`, `/profile/[id]`)
- Cover gradient + avatar, name, college/course/year, verified-student badge.
- Reputation block (avg rating, completed gigs, rank, badges).
- Skills (verified chips), portfolio, reviews list. Own profile = edit mode.

#### Wallet (`/wallet`) — **Table**
- Balance card (available vs locked) with animated figures + Add money / Withdraw.
- **Transactions table**: type pill, amount (+/−), status, task link, date; filters + pagination.

#### Admin (`/admin/*`) — **Tables**
- Sidebar sub-nav: Users, Tasks, Disputes, Payouts, Leaderboard, Analytics.
- Data tables (sort/filter/search/bulk actions), analytics cards (GMV, users, completion %, dispute %), dispute resolution panel, badge granting.

### 1.6 Component System (Shadcn-based)

- **Primitives (Shadcn):** Button, Input, Select, Dialog, Sheet, DropdownMenu, Tabs, Card, Badge, Avatar, Tooltip, Toast/Sonner, Table, Skeleton, Form, Popover, Progress.
- **Navbar (top bar):** logo, global search, mode toggle, notifications bell (realtime badge), wallet chip, avatar menu.
- **Sidebar:** collapsible, icon+label nav, active gradient indicator, role-aware items; → mobile **bottom nav** (Home, Tasks, Post, Chat, Profile).
- **Cards:** `TaskCard`, `WorkerCard`, `RankCard`, `StatCard`, `ProposalCard`, `AchievementBadge` — consistent shadow/hover/gradient language.
- **Modals/Sheets:** escrow funding, accept proposal, withdraw, dispute, confirm dialogs; mobile uses bottom **Sheet**.
- **Forms:** react-hook-form + Zod, inline validation, helper text, disabled/loading states, optimistic feedback.

---

## 2. Frontend Architecture

### 2.1 Principles
- Next.js **App Router**, React **Server Components** by default; client components only where interactivity/realtime is needed.
- **Server Actions** for mutations; thin route handlers for webhooks & signed-URL/3rd-party flows.
- **Feature-based modular** organization mirroring `SPEC.md` §7/§14.
- Validation with **Zod** (shared client/server schemas). Data access via a **service → repository** layer (RLS-aware Supabase clients).
- Type-safe end to end (generated Supabase types + shared domain types).

### 2.2 Folder Structure

```
campusgig/
├── app/                              # App Router (routes + layouts)
│   ├── (marketing)/page.tsx          # landing
│   ├── (auth)/login/
│   ├── onboarding/
│   ├── (app)/                        # authenticated shell (sidebar+topbar)
│   │   ├── dashboard/ (+ performance/)
│   │   ├── tasks/ [id]/ new/ [id]/edit/
│   │   ├── my-tasks/ my-work/
│   │   ├── chat/ [taskId]/
│   │   ├── wallet/
│   │   ├── leaderboard/ [category]/
│   │   ├── profile/ [id]/
│   │   └── notifications/
│   ├── admin/(users|tasks|disputes|payouts|leaderboard|analytics)/
│   └── api/                          # route handlers (webhooks, signed URLs)
│       └── webhooks/razorpay/
├── features/                         # feature-based modules
│   ├── auth/ profiles/ tasks/ proposals/ submissions/
│   ├── chat/ meetings/ files/ payments/ wallet/
│   ├── reviews/ leaderboard/ disputes/ notifications/ admin/
│   │   └── (each: components/  actions.ts  service.ts  repository.ts  schema.ts  types.ts)
├── components/
│   ├── ui/                           # Shadcn primitives
│   ├── layout/                       # AppShell, Sidebar, Navbar, BottomNav
│   ├── shared/                       # StatCard, EmptyState, ConfirmDialog, Money, RatingStars
│   └── motion/                       # animation wrappers (FadeIn, Counter, Confetti)
├── lib/
│   ├── supabase/                     # server/client/admin clients, generated types
│   ├── razorpay/                     # adapter
│   ├── realtime/                     # channel helpers/hooks
│   ├── auth/                         # guards: requireAuth/requireRole/requireOwnership
│   └── utils/                        # money (paise), formatting, cn()
├── hooks/                            # useUser, useRealtime, useWallet, useToast
├── styles/                           # globals.css, theme tokens
├── middleware.ts                     # route protection
├── supabase/                         # migrations, RLS policies, seed
├── tests/                            # unit / integration / e2e
└── PLAN.md SPEC.md README.md DESIGN.md
```

### 2.3 State & Data
- **Server state:** React Server Components + Server Actions; cache + `revalidatePath`/tags.
- **Client state:** local component state + minimal context (auth/session, realtime); **TanStack Query** only where client-side fetching/caching is needed (chat, notifications, infinite lists).
- **Realtime:** Supabase channels via custom hooks (`useRealtimeChannel`) for chat, notifications, task status.
- **Forms:** react-hook-form + Zod resolver.

### 2.4 Auth & Route Protection
- Supabase Auth (Google OAuth) + phone OTP gate before transactional actions.
- `middleware.ts` guards `(app)` and `admin` segments (session + role + onboarding completeness).
- Server Actions re-verify **auth + role + ownership** (never trust the client).

### 2.5 Rendering Strategy
- Landing: **SSR/ISR** (SEO). Auth/app shell: mostly **CSR/RSC mix**. Public profiles: SSR. Realtime views: client components.

---

## 3. Database Plan

> Full schema already specified in `SPEC.md` §4 (incl. Leaderboard & Achievements §4.21–4.22). Summary of entities to be implemented MVP-first.

### 3.1 Core Tables (MVP)
`users`, `profiles`, `skills`, `user_skills`, `categories`, `tasks`, `task_attachments`, `applications` (proposals), `submissions`, `files`, `wallets`, `payments`, `transactions` (append-only ledger), `reviews`, `chats`, `messages`, `notifications`.

### 3.2 Phase-later Tables
`meetings`, `badges`, `user_badges`, `reports` (disputes), `leaderboard`, `achievements`, audit logs.

### 3.3 Key Rules (from SPEC)
- Money as **BIGINT paise** (never float).
- **RLS on every table** = primary security; server guards = defense in depth.
- Constraints: one accepted proposal/task; unique review per (task, reviewer, reviewee); unique `leaderboard(user, period, category)`; unique `achievements(user, badge_name)`.
- **State machines:** task status & escrow status with validated transitions.
- **Append-only ledger**; idempotent payment/webhook handling.
- Indexes on hot paths (tasks status/category/college, messages(chat_id,created_at), transactions(user_id), leaderboard(period,category,rank)).

### 3.4 Implementation Order
1. Auth/profiles/skills/categories
2. Tasks/attachments/files
3. Proposals/submissions
4. Wallet/payments/transactions (escrow)
5. Reviews
6. Chat/messages + notifications
7. Leaderboard/achievements, disputes, badges, admin

---

## 4. Development Roadmap

> MVP-first. Each phase is shippable. Durations indicative for a small team.

### Phase 0 — Foundation (Week 1–2)
- Next.js + TS + Tailwind + Shadcn setup; theme tokens; design system primitives.
- Supabase project, schema + RLS for core tables, generated types.
- Auth (Google OAuth) + phone OTP + onboarding; AppShell (sidebar/topbar/bottom-nav); middleware guards.
- **Landing page** (marketing) build.

### Phase 1 — Core Marketplace MVP (Week 3–5)
- Profiles (college, course, year, skills) + public profile.
- Post task (guided form) + categories + file upload.
- Marketplace (card grid, search, filters, sort) + task detail.
- Proposals/bidding + worker selection (concurrency-safe).
- **Milestone M1:** end-to-end marketplace without payments.

### Phase 2 — Transactions & Trust (Week 6–8)
- Razorpay escrow (fund → hold → release/refund), wallet, transactions table.
- Work submission + approve/revision → payment release.
- Ratings & reviews + reputation aggregation.
- **Milestone M2:** full money loop with escrow working.

### Phase 3 — Communication (Week 9–10)
- Realtime chat + file sharing + PII-scrub gate.
- Contact sharing after acceptance; meeting scheduling.
- Realtime notifications (bell + center + toasts).
- **Milestone M3:** MVP live on one campus (closed beta).

### Phase 4 — Engagement & Governance (Week 11–14)
- **Leaderboard & ranking** (weekly/monthly/all-time/category) + ranking engine + achievement badges + performance dashboard.
- Skill verification badges.
- Dispute management; admin panel (users, tasks, disputes, payouts, leaderboard, analytics).

### Phase 5 — Polish & Scale (Week 15–16)
- Rich motion pass (parallax, confetti, animated counters) + performance tuning.
- Dark mode toggle; accessibility audit; email/push notifications; monitoring (Sentry) + analytics.

### Phase 6 — Intelligence (Week 17+)
- AI recommendations & matching; AI-assisted ranking; smart pricing/brief assistant; multi-campus.

### Milestones
- **M1 (Wk 5):** Marketplace usable end-to-end (no payments)
- **M2 (Wk 8):** Escrow money loop complete
- **M3 (Wk 11):** MVP live, single campus
- **M4 (Wk 14):** Leaderboard + governance complete
- **M5 (Wk 16):** Production-hardened

---

## 5. What I'll Build First (on approval)

To validate the design language fast, the first concrete deliverables will be:
1. **Theme + design tokens** (Tailwind config + Shadcn CSS variables) — light, dark-ready.
2. **AppShell** (sidebar + top bar + mobile bottom nav) with motion.
3. **Landing page** (full marketing, animated).
4. **Core reusable components** (TaskCard, StatCard, RankCard, buttons, form patterns).

These give a visible, clickable shell to confirm the look & feel before wiring backend logic.

---

*End of DESIGN.md — awaiting your approval to proceed to code.*
```
