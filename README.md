<div align="center">

# 🎓 CampusGig

### A student skill-based marketplace where students post tasks and other students earn money completing them.

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![Razorpay](https://img.shields.io/badge/Razorpay-02042B?style=flat&logo=razorpay&logoColor=white)](https://razorpay.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)](https://vercel.com/)

</div>

---

## 📖 Overview

**CampusGig** is a full-stack web platform that creates a trusted, hyper-local micro-economy inside colleges. It connects two kinds of students:

- 🧑‍💻 **Task Posters** — students who need help (assignments, design, coding, tutoring, content, errands) and are willing to pay.
- 💰 **Task Workers** — students with skills and free time who want to earn flexibly.

The platform manages the **entire gig lifecycle** — discovery, posting, bidding, selection, chat, work submission, escrow-protected payment, and reviews — with a strong focus on **trust** (student-only verification), **safety** (escrow payments + dispute resolution), and **reputation** (ratings + skill badges).

> 📌 For the full product plan see [`PLAN.md`](./PLAN.md) and for the technical specification see [`SPEC.md`](./SPEC.md).

---

## ✨ Key Features

| Category | Features |
|---|---|
| **Auth & Identity** | Google OAuth login, phone OTP verification, verified-student badge |
| **Profiles** | College, course, year, skills, reputation, badges, wallet |
| **Tasks** | Posting, categories, budget & deadline, file attachments, status lifecycle |
| **Discovery** | Search, filters (category/budget/deadline/skill/college), sorting |
| **Bidding** | Proposal system, worker comparison & selection |
| **Coordination** | Real-time chat, contact sharing after acceptance, meeting scheduling |
| **Delivery** | Work submission, review, approve / request revision |
| **Payments** | Razorpay escrow (hold → release), wallet, withdrawals, transaction history |
| **Trust** | Ratings & reviews, skill verification badges, dispute management |
| **Engagement** | Leaderboard & ranking (weekly/monthly/all-time/category), achievement badges, performance dashboard |
| **Governance** | Admin panel (users, tasks, disputes, payouts, analytics) |
| **Notifications** | Real-time in-app notifications |

---

## 🧱 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js + Tailwind CSS | Hybrid SSR/CSR UI, mobile-first styling |
| **Backend** | Next.js API Routes / Node.js | Serverless business logic & APIs |
| **Database** | Supabase PostgreSQL | Relational data + Row Level Security |
| **Auth** | Supabase Auth + Google OAuth | Verified-student authentication |
| **Storage** | Supabase Storage | Task attachments & deliverables |
| **Realtime** | Supabase Realtime | Live chat, notifications, task status |
| **Payments** | Razorpay | Escrow funding, payouts, webhooks |
| **Deployment** | Vercel | CI/CD, preview deploys, global CDN |

---

## 🏗️ System Architecture

```
┌──────────────── CLIENT (Next.js + Tailwind) ────────────────┐
│  Pages • Components • Supabase JS • Razorpay Checkout         │
└──────────┬───────────────────────────────┬──────────────────┘
           │ HTTPS (REST)                    │ WSS (Realtime)
           ▼                                 ▼
┌──────────────────────────────┐   ┌──────────────────────────┐
│  Next.js API / Server Actions │   │   Supabase Realtime       │
│  Controllers→Services→Repos    │   │  chat • notif • status    │
│  Guards • Validators • Webhooks│   └──────────────────────────┘
└───────┬──────────────┬─────────┘
        ▼              ▼
┌──────────────┐  ┌─────────────────────────────────────────┐
│  Razorpay    │  │  Supabase: PostgreSQL(+RLS) • Auth •      │
│  pay/payout  │  │  Storage                                  │
└──────────────┘  └─────────────────────────────────────────┘
```

**Principles:** RLS-first security · webhook-authoritative payments · money as integer paise · idempotent transactions · state machines for task & escrow lifecycles.

---

## 👥 User Roles

| Role | Can do |
|---|---|
| **Student (Poster)** | Post & fund tasks, review proposals, select worker, chat, approve work, rate, raise disputes |
| **Student (Worker)** | Browse tasks, submit proposals, chat after acceptance, submit work, withdraw earnings, rate |
| **Admin** | Verify/suspend/ban users, moderate content, resolve disputes, oversee payouts, grant badges, view analytics |

> A single student account can act as both poster and worker. Admin is a separate, audited role.

---

## 🔄 Core User Flow

```
Sign up (Google) → Phone OTP → Complete profile
        │
   ┌────┴─────────────────────────────┐
   ▼                                   ▼
POSTER                              WORKER
Post task → fund (escrow)          Browse → submit proposal
Receive proposals → accept    ◄──► (if accepted) chat unlocked
Chat / schedule                    Complete & submit work
Review work → approve              Earnings credited → withdraw
Payment released → review          Review poster
```

---

## 📁 Project Structure

```
campusgig/
├── app/                  # Next.js App Router (pages + /api routes)
│   ├── (marketing)/      # landing
│   ├── dashboard/ tasks/ my-work/ chat/ wallet/ profile/
│   ├── admin/            # admin dashboards
│   └── api/              # controllers (tasks, payments, webhooks, ...)
├── components/           # UI components (task, chat, payment, admin, ui/)
├── lib/
│   ├── server/           # services + repositories (business logic)
│   │   ├── db/           # Supabase clients & repositories
│   │   └── shared/       # validators, errors, constants
│   ├── razorpay/         # payment adapter
│   └── realtime/         # channel helpers
├── hooks/                # useAuth, useRealtime, useWallet
├── supabase/             # migrations, RLS policies, seed
├── middleware.ts         # route protection
├── tests/                # unit / integration / e2e
├── PLAN.md  SPEC.md  README.md
```

> Full structure documented in [`SPEC.md` §14](./SPEC.md).

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 18
- A **Supabase** project (Postgres + Auth + Storage + Realtime)
- A **Razorpay** account (test keys for development)
- **Google OAuth** credentials configured in Supabase Auth
- An **SMS/OTP** provider for phone verification

### 1. Clone & install
```bash
git clone <your-repo-url> campusgig
cd campusgig
npm install
```

### 2. Configure environment
Copy the example file and fill in your keys:
```bash
cp .env.example .env.local
```

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client | Public anon key (RLS-protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | server | **Secret** — server only, never expose |
| `RAZORPAY_KEY_ID` | client/server | Razorpay key id |
| `RAZORPAY_KEY_SECRET` | server | **Secret** Razorpay key |
| `RAZORPAY_WEBHOOK_SECRET` | server | Webhook signature verification |
| `OTP_PROVIDER_KEY` | server | SMS provider API key |

> ⚠️ Never commit `.env.local`. Keep service-role and secret keys server-side only.

### 3. Set up the database
```bash
# apply schema + RLS policies + seed data
supabase db push
```
Configure **Google OAuth** under Supabase → Authentication, and register your **Razorpay webhook** URL (`/api/webhooks/razorpay`) in the Razorpay dashboard.

### 4. Run the dev server
```bash
npm run dev
```
App runs at **http://localhost:3000**.

---

## 📜 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run linter |
| `npm run typecheck` | TypeScript type checking |
| `npm run test` | Run unit & integration tests |
| `npm run test:e2e` | Run end-to-end tests |

> Script names are indicative; align with the final `package.json`.

---

## 💳 Payment (Escrow) Model

CampusGig protects both parties with an **escrow-style flow**:

```
Poster funds task → funds HELD → worker delivers
→ poster approves → funds RELEASED to worker (minus commission)
Cancel / dispute → REFUNDED or PARTIAL split
```

**Guarantees:** server-side signature verification, webhook as source of truth, idempotent processing, atomic & append-only ledger, money stored as integer paise.

---

## 🏆 Leaderboard & Ranking System

CampusGig ranks worker students by **performance, skills, and reputation** to reward quality work and surface trusted profiles — turning reputation into motivation.

**How it works**
```
Worker completes task → poster rates & reviews
→ system recomputes performance score (0–100)
→ rank updates automatically → worker appears on leaderboards
→ achievement badges auto-granted on milestones
```

**Ranking criteria (weighted):** average rating · completed tasks · positive-review ratio · on-time completion rate · task success rate · skill verification badges · reliability score.

**Leaderboard types:** 🗓️ Weekly · 📅 Monthly · 🏅 All-time · 🎯 Category-based (e.g., *Top Java Developer*, *Top Designer*, *Top Content Creator*).

**Achievement badges:** 🌟 Rising Star · 🚀 Top Performer · ⚡ Fast Delivery · 🛡️ Trusted Worker.

> 🛡️ **Integrity:** only **verified, completed tasks with genuine ratings** affect ranking. Flagged/collusive reviews are excluded, scores are computed server-side only, and clients can never write ranks. See [`SPEC.md` §2.20 & §7.5](./SPEC.md).

---

## 🔐 Security Highlights

- **Row Level Security (RLS)** on every table — primary data guard.
- Server-side **auth + role + ownership** checks on all mutations.
- **Contact info hidden** until a proposal is accepted.
- **Signed URLs** for file access, scoped to task participants.
- **Rate limiting** on auth, OTP, posting, proposals, and messaging.
- **Audit logs** for all financial and admin actions.

> Full details in [`SPEC.md` §13](./SPEC.md).

---

## 🗺️ Development Roadmap

| Phase | Focus |
|---|---|
| **0 — Foundation** | Setup, auth, onboarding, design system |
| **1 — Core Marketplace (MVP)** | Profiles, tasks, search, bidding, selection |
| **2 — Transactions & Trust** | Escrow payments, wallet, submission/approval, reviews |
| **3 — Communication** | Real-time chat, contact sharing, scheduling, notifications |
| **4 — Governance** | Disputes, admin panel, skill badges |
| **4b — Engagement** | Leaderboard & ranking system, achievement badges, performance dashboard |
| **5 — Polish & Scale** | Performance, accessibility, email/push, monitoring |
| **6 — Intelligence (Future)** | AI recommendations & smart matching |

> 🎯 **MVP target:** working end-to-end on a single campus. See [`PLAN.md` §14–21](./PLAN.md).

---

## 🔮 Future Enhancements

AI-based task↔worker recommendations · multi-campus expansion · PWA / mobile app · automated payouts · skill assessments · email & push notifications · team gigs · AI-based leaderboard ranking · seasonal competitions & rewards · monetization (featured listings, subscriptions).

---

## 📚 Documentation

| Document | Purpose |
|---|---|
| [`PLAN.md`](./PLAN.md) | Product plan: vision, features, architecture, phases, timeline |
| [`SPEC.md`](./SPEC.md) | Technical spec: schema, APIs, flows, validation, security |
| `README.md` | This file — overview & setup |

---

## 🤝 Contributing

1. Create a feature branch from `main`.
2. Follow the module/service/repository structure in [`SPEC.md` §7](./SPEC.md).
3. Validate all input server-side; never bypass RLS or auth guards.
4. Add tests (money/escrow logic requires the highest coverage).
5. Ensure `lint`, `typecheck`, and `test` pass before opening a PR.

---

## 📄 License

This project is developed as an academic / final-year full-stack project. Add a license (e.g., MIT) before any public or commercial use.

---

<div align="center">

**Built with trust, safety, and students in mind. 🎓**

</div>
