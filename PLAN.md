# CampusGig — Project Plan (PLAN.md)

> A student skill-based marketplace where students post tasks and other students earn money by completing them.

**Document version:** 1.0
**Last updated:** 2026-06-12
**Status:** Planning / Pre-development

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Goals and Objectives](#3-goals-and-objectives)
4. [Target Users](#4-target-users)
5. [Complete Feature Breakdown](#5-complete-feature-breakdown)
6. [User Roles and Permissions](#6-user-roles-and-permissions)
7. [User Flow](#7-user-flow)
8. [System Architecture](#8-system-architecture)
9. [Technology Decisions and Reasons](#9-technology-decisions-and-reasons)
10. [Database Planning Overview](#10-database-planning-overview)
11. [API Planning Overview](#11-api-planning-overview)
12. [Frontend Page Structure](#12-frontend-page-structure)
13. [Backend Module Structure](#13-backend-module-structure)
14. [Development Phases](#14-development-phases)
15. [MVP Features](#15-mvp-features)
16. [Advanced Features](#16-advanced-features)
17. [Security Considerations](#17-security-considerations)
18. [Payment Flow](#18-payment-flow)
19. [Notification Flow](#19-notification-flow)
20. [Future Improvements](#20-future-improvements)
21. [Development Timeline](#21-development-timeline)

---

## 1. Project Overview

**CampusGig** is a full-stack web platform that creates a trusted, hyper-local micro-economy inside colleges and universities. It connects two groups of students:

- **Task Posters** — students who need help (assignments help, design work, coding, tutoring, event support, deliveries, content writing, etc.) and are willing to pay for it.
- **Task Workers** — students who have skills and free time and want to earn money on a flexible schedule.

The platform handles the entire lifecycle of a gig: discovery, posting, bidding, selection, communication, work submission, payment, and reviews — with a strong emphasis on **trust** (student-only verification), **safety** (escrow-style payments and dispute resolution), and **reputation** (ratings and skill badges).

CampusGig is designed to be **college-scoped first** (operate within a campus or cluster of campuses) and **scalable to multi-campus** later. The product philosophy is: *keep money, identity, and accountability inside a verified student network.*

### What success looks like
- A student can post a task in under 2 minutes and receive multiple proposals within hours.
- A worker can browse, bid, win, deliver, and get paid without leaving the platform.
- Both sides trust the system enough to transact money through it instead of going off-platform.

---

## 2. Problem Statement

Students constantly need small tasks done and simultaneously want flexible ways to earn — yet no trusted, structured channel exists to match them.

**Current pain points:**

| Stakeholder | Problem |
|---|---|
| Students needing help | Rely on scattered WhatsApp groups, notice boards, and word-of-mouth. No way to compare options, verify reliability, or guarantee delivery. |
| Students wanting to earn | No visibility into who needs help. No reputation to build. No payment guarantee — risk of doing work and not getting paid. |
| Both | Off-platform deals mean **no accountability, no dispute resolution, no payment protection, no quality signal.** |
| Generic gig platforms (Fiverr/Urban Company) | Not student-focused, charge high fees, lack campus trust, and mix students with anonymous external freelancers. |

**Core problem:** There is no **student-verified, trust-first, payment-protected marketplace** built specifically for campus micro-tasks.

CampusGig solves this with verified student identity, structured task workflows, escrow-protected payments, reputation systems, and dispute handling.

---

## 3. Goals and Objectives

### Business Goals
- Build a defensible, trust-based marketplace with strong network effects within campuses.
- Establish a sustainable revenue model via a small platform commission on completed transactions.
- Reach liquidity (enough supply + demand) on at least one campus before expanding.

### Product Objectives
- **Trust:** Ensure only verified students participate (email + phone verification, optional college ID verification).
- **Speed:** Make posting and bidding fast and frictionless.
- **Safety:** Protect both parties via escrow-style payment holding and dispute management.
- **Reputation:** Build durable identity through ratings, reviews, and skill badges.
- **Retention:** Keep users on-platform through chat, notifications, wallet, and transaction history.

### Measurable Success Metrics (KPIs)
- Time-to-first-proposal (target: < 6 hours).
- Task completion rate (target: > 80% of accepted tasks completed).
- Dispute rate (target: < 5% of completed tasks).
- Repeat usage rate (posters and workers returning within 30 days).
- GMV (Gross Merchandise Value) processed through the platform.
- Off-platform leakage rate (kept low via in-app value: chat, escrow, reviews).

---

## 4. Target Users

### Primary Users
- **Undergraduate and postgraduate students** (typically 18–25) on a college campus.

### User Personas

**Persona A — "The Poster" (Aarav, 2nd year, busy with exams)**
- Needs an assignment formatted, a presentation designed, or notes typed.
- Wants reliable help quickly, willing to pay ₹100–₹2000.
- Values: speed, reliability, fair price, proof of quality.

**Persona B — "The Worker" (Sneha, 3rd year, good at design & writing)**
- Has free time and marketable skills.
- Wants to earn ₹3000–₹10000/month flexibly.
- Values: steady task flow, guaranteed payment, building a reputation.

**Persona C — "The Hybrid" (Rahul)**
- Sometimes posts, sometimes works — uses both sides depending on need.

**Persona D — "The Admin / Moderator"**
- Platform operator ensuring trust, resolving disputes, verifying users, monitoring fraud.

### User Constraints
- Limited disposable income → low fees matter.
- Mobile-first behavior → responsive, fast UI is mandatory.
- Trust-sensitive → verification and reviews are critical adoption levers.

---

## 5. Complete Feature Breakdown

### 5.1 Authentication & Identity
- Google / Gmail OAuth login (via Supabase Auth).
- Phone OTP verification (second factor for trust).
- Optional college email / student ID verification for "Verified Student" badge.
- Session management and secure sign-out.

### 5.2 Student Profile
- Profile creation: name, photo, bio.
- Academic info: college, course, year of study.
- Skills list (tags) and skill levels.
- Portfolio / past work links (optional).
- Reputation summary: average rating, completed gigs, badges.
- Wallet balance and earnings overview.

### 5.3 Task Posting (Demand Side)
- Create task: title, description, category, budget, deadline.
- Attach files / reference materials (Supabase Storage).
- Set task type (one-time, fixed budget, or open-to-bids).
- Edit / delete / repost tasks.
- Task status lifecycle management.

### 5.4 Task Discovery
- Browse all open tasks (campus-scoped).
- Categories (e.g., Assignments, Design, Coding, Tutoring, Writing, Data Entry, Events, Errands).
- Search by keyword.
- Filters: category, budget range, deadline, skill, college, status.
- Sorting: newest, budget high→low, deadline soonest.

### 5.5 Proposal / Bidding System (Supply Side)
- Workers submit a proposal: bid amount, message, estimated delivery time.
- Posters view all proposals on their task.
- Compare workers by rating, badges, completed gigs, price.
- Accept one proposal → worker selected → task locked.

### 5.6 Communication & Coordination
- Real-time chat between poster and selected worker.
- Contact details (phone) revealed only after acceptance (privacy-protected before that).
- Meeting scheduling (propose date/time/location or online).

### 5.7 Work Delivery
- Worker submits completed work (files / links / notes).
- Poster reviews submission → approve or request revision.
- Approval triggers payment release.

### 5.8 Payments & Wallet
- Razorpay integration for funding tasks.
- Escrow-style holding: poster pays upfront, funds held until completion.
- Wallet: balance, add money, withdraw earnings.
- Transaction history (credits, debits, holds, releases, refunds).
- Platform commission deduction.

### 5.9 Trust & Reputation
- Ratings (1–5 stars) for both poster and worker after completion.
- Written reviews.
- Skill verification badges (admin-granted or test-based).
- Verified Student badge.

### 5.10 Disputes
- Either party can raise a dispute on an active/submitted task.
- Evidence submission (chat logs, files).
- Admin review and resolution (release, refund, partial).

### 5.11 Notifications
- In-app notifications (new proposal, accepted, message, payment, review, dispute).
- Real-time updates via Supabase Realtime.
- (Future) Email / push notifications.

### 5.12 Admin Panel
- User management (verify, suspend, ban).
- Task / content moderation.
- Dispute resolution dashboard.
- Payment and payout oversight.
- Platform analytics (GMV, active users, completion rates).
- Skill badge granting.

### 5.13 AI Recommendations (Future Scope)
- Recommend tasks to workers based on skills and history.
- Recommend workers to posters.
- Smart budget suggestions and category auto-tagging.

### 5.14 Leaderboard & Ranking System
- Performance-based ranking of worker students (score derived from ratings, completed tasks, on-time delivery, success rate, reliability, and verified skills).
- Multiple leaderboards: **weekly**, **monthly**, **all-time**, and **category-based** (e.g., "Top Java Developer", "Top Designer", "Top Content Creator").
- Automatic ranking updates after every completed-and-rated task.
- Public worker ranking cards (rank, score, key stats, badges) and a personal **performance dashboard**.
- **Achievement badges** (gamification): Rising Star, Top Performer, Fast Delivery, Trusted Worker.
- Only **verified completed tasks with genuine ratings** influence the score (anti-manipulation by design).

---

## 6. User Roles and Permissions

CampusGig uses **role + ownership-based access control**. A single user account can act as both poster and worker; roles are contextual, not exclusive (except Admin).

| Capability | Guest | Student (Poster context) | Student (Worker context) | Admin |
|---|---|---|---|---|
| Browse public landing | ✅ | ✅ | ✅ | ✅ |
| Sign up / log in | ✅ | — | — | — |
| View task listings | ❌ | ✅ | ✅ | ✅ |
| Post a task | ❌ | ✅ | ✅ | ✅ |
| Submit a proposal | ❌ | ✅ (on others' tasks) | ✅ | ❌ |
| Accept a proposal | ❌ | ✅ (own tasks only) | — | ❌ |
| Chat | ❌ | ✅ (own tasks) | ✅ (accepted tasks) | view-only (disputes) |
| Submit work | ❌ | — | ✅ (assigned tasks) | ❌ |
| Approve / release payment | ❌ | ✅ (own tasks) | ❌ | ✅ (override) |
| Raise dispute | ❌ | ✅ | ✅ | — |
| Resolve dispute | ❌ | ❌ | ❌ | ✅ |
| Manage wallet / withdraw | ❌ | ✅ | ✅ | ✅ |
| Verify users / grant badges | ❌ | ❌ | ❌ | ✅ |
| Suspend / ban users | ❌ | ❌ | ❌ | ✅ |
| View platform analytics | ❌ | ❌ | ❌ | ✅ |

**Enforcement strategy:**
- **Database layer:** Supabase Row Level Security (RLS) policies enforce ownership (a user can only edit their own tasks, read their own wallet, etc.).
- **API layer:** Server-side checks for role + ownership before any mutating action.
- **UI layer:** Conditional rendering (defense-in-depth only — never the sole gate).

---

## 7. User Flow

### 7.1 Onboarding Flow
```
Landing Page → Sign up with Google → Phone OTP verification
→ Complete profile (college, course, year, skills)
→ (Optional) Student ID verification → Dashboard
```

### 7.2 Poster Flow (Demand Side)
```
Dashboard → "Post a Task" → Fill details (title, category, budget, deadline, files)
→ Fund task via Razorpay (held in escrow) → Task goes live
→ Receive proposals → Compare workers → Accept one
→ Contact + chat unlocked → Coordinate / schedule meeting
→ Worker submits work → Review → Approve
→ Payment released to worker → Leave rating & review
```

### 7.3 Worker Flow (Supply Side)
```
Dashboard → Browse / search / filter tasks → Open a task
→ Submit proposal (bid, message, timeline)
→ Wait for acceptance → (If accepted) chat unlocked
→ Coordinate → Complete work → Submit deliverables
→ Poster approves → Earnings credited to wallet
→ Withdraw to bank → Leave rating & review for poster
```

### 7.4 Dispute Flow
```
Either party raises dispute → Task frozen (funds stay in escrow)
→ Both submit evidence → Admin reviews
→ Resolution: full release / full refund / partial split
→ Funds settled → Case closed → Optional reputation impact
```

### 7.5 Admin Flow
```
Admin login → Dashboard → Choose area:
  • Verify pending student IDs
  • Moderate reported tasks/users
  • Resolve open disputes
  • Monitor payouts & flagged transactions
  • Grant skill badges
  • View analytics
```

### 7.6 Leaderboard & Ranking Flow
```
Worker completes a task → Poster approves & leaves rating + review
→ System recomputes worker's performance score
   (avg rating, completed tasks, positive reviews, on-time %,
    success rate, skill badges, reliability)
→ Worker's rank updates automatically (overall + category + time-window)
→ Worker appears/moves on Weekly / Monthly / All-time / Category leaderboards
→ Achievement badges auto-granted when thresholds are met
   (Rising Star, Top Performer, Fast Delivery, Trusted Worker)
→ Updated rank, score, and badges shown on profile + performance dashboard
```

---

## 8. System Architecture

### 8.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                       │
│   Next.js App (React) + Tailwind CSS — SSR/CSR, mobile-first   │
└───────────────┬───────────────────────────────┬───────────────┘
                │ HTTPS                           │ WSS (Realtime)
                ▼                                 ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│   Next.js API Routes /         │   │   Supabase Realtime           │
│   Server Actions (Backend)     │   │   (chat, notifications,       │
│   - Business logic             │   │    task status updates)       │
│   - Auth checks / role guards  │   └──────────────────────────────┘
│   - Payment orchestration      │
│   - Webhook handlers           │
└───────┬───────────────┬────────┘
        │               │
        ▼               ▼
┌────────────────┐  ┌──────────────────────────────────────────┐
│  Razorpay API  │  │            Supabase Platform               │
│  (payments,    │  │  ┌────────────┐ ┌──────────┐ ┌─────────┐ │
│   payouts,     │  │  │ PostgreSQL │ │  Auth     │ │ Storage │ │
│   webhooks)    │  │  │ (+ RLS)    │ │ (OAuth)   │ │ (files) │ │
└────────────────┘  │  └────────────┘ └──────────┘ └─────────┘ │
                    └──────────────────────────────────────────┘
        ▲
        │ Webhooks (payment.captured, payout.processed)
        └───────────────────────► Next.js API webhook endpoint
```

### 8.2 Architectural Principles
- **Serverless-first:** Deploy on Vercel; Next.js API routes scale automatically.
- **BaaS-leveraged:** Supabase provides DB, auth, storage, and realtime — minimizing backend boilerplate.
- **Trust at the data layer:** RLS ensures security even if API logic has gaps.
- **Stateless API, stateful data:** All persistent state in Postgres; sessions via Supabase Auth JWTs.
- **Event-driven payments:** Razorpay webhooks are the source of truth for payment state — never trust client confirmation alone.
- **Realtime where it matters:** Chat, notifications, and task status use Supabase Realtime; everything else uses standard request/response.

### 8.3 Key Architectural Concerns
- **Escrow integrity:** Money state machine must be transactional and idempotent.
- **Concurrency:** Two workers can't be accepted for one task — enforce with DB constraints / transactions.
- **Webhook reliability:** Idempotent webhook handling (Razorpay may retry).
- **Scalability:** Campus-scoping naturally shards demand; indexes on hot query paths.

---

## 9. Technology Decisions and Reasons

| Layer | Choice | Why |
|---|---|---|
| **Frontend framework** | Next.js | Hybrid SSR/CSR for fast first paint + SEO on public pages, file-based routing, API routes co-located with frontend, excellent Vercel integration. |
| **Styling** | Tailwind CSS | Rapid, consistent, mobile-first UI development; small bundle via purging; no context-switching to CSS files. |
| **Backend** | Next.js API Routes / Server Actions | Single codebase, no separate server to maintain, serverless auto-scaling, shared types with frontend. |
| **Database** | Supabase PostgreSQL | Relational integrity for transactions/payments, powerful querying, RLS for security, managed and scalable. |
| **Auth** | Supabase Auth + Google OAuth | Built-in OAuth, JWT sessions, integrates natively with RLS, less custom security code to get wrong. |
| **Storage** | Supabase Storage | Unified with DB/Auth, signed URLs, access policies, simple file handling for task attachments and submissions. |
| **Realtime** | Supabase Realtime | Postgres-change-based realtime for chat/notifications without standing up a separate WebSocket server. |
| **Payments** | Razorpay | India-first (UPI, cards, netbanking, wallets), supports payouts to workers, robust webhooks, strong for student/INR market. |
| **Deployment** | Vercel | First-class Next.js hosting, preview deployments, global CDN, zero-config CI/CD, serverless functions. |

**Why this stack overall:** It minimizes infrastructure ownership (BaaS + serverless), keeps the team in one language/codebase (TypeScript/JS end-to-end), and provides production-grade security primitives (RLS, managed auth) out of the box — ideal for a small team building a trust-sensitive marketplace fast.

**Trade-offs acknowledged:**
- Vendor lock-in to Supabase/Vercel/Razorpay — acceptable for speed-to-market; abstractable later.
- Serverless cold starts — mitigated by Vercel's infrastructure; non-issue at MVP scale.
- Realtime via Postgres changes — fine at campus scale; revisit if chat volume explodes.

---

## 10. Database Planning Overview

> Conceptual schema only (no DDL). Names indicative.

### Core Entities

**users / profiles**
- id, auth_id, full_name, email, phone, phone_verified, avatar_url, bio
- college, course, year_of_study
- is_verified_student, role (student/admin), status (active/suspended/banned)
- created_at

**skills** & **user_skills** (many-to-many)
- skills: id, name, category
- user_skills: user_id, skill_id, level, is_verified

**categories**
- id, name, slug, description, icon

**tasks**
- id, poster_id, title, description, category_id
- budget, deadline, task_type
- status (draft, open, in_progress, submitted, completed, disputed, cancelled)
- escrow_amount, selected_proposal_id
- created_at, updated_at

**task_attachments**
- id, task_id, file_url, file_type, uploaded_by

**proposals**
- id, task_id, worker_id, bid_amount, message, estimated_delivery
- status (pending, accepted, rejected, withdrawn)
- created_at

**submissions**
- id, task_id, worker_id, content, file_urls
- status (submitted, approved, revision_requested)
- created_at

**chats / messages**
- chats: id, task_id, poster_id, worker_id
- messages: id, chat_id, sender_id, content, attachment_url, read_at, created_at

**meetings**
- id, task_id, proposed_by, datetime, location/mode, status

**wallets**
- id, user_id, balance, locked_balance

**transactions**
- id, user_id, task_id, type (deposit, hold, release, refund, withdrawal, commission)
- amount, status, razorpay_ref, created_at

**reviews**
- id, task_id, reviewer_id, reviewee_id, rating, comment, role_context, created_at

**badges** & **user_badges**
- badges: id, name, type, criteria
- user_badges: user_id, badge_id, granted_by, granted_at

**disputes**
- id, task_id, raised_by, reason, evidence_urls
- status (open, under_review, resolved)
- resolution, resolved_by, created_at

**notifications**
- id, user_id, type, payload, is_read, created_at

**leaderboard** (worker ranking snapshot)
- id, user_id, total_tasks, completed_tasks, average_rating, total_reviews
- positive_reviews, on_time_rate, success_rate, reliability_score
- performance_score, rank, category (nullable for overall), period (weekly/monthly/all_time)
- updated_at

**achievements** (gamification badges)
- id, user_id, badge_name, earned_date

### Data Design Notes
- **Indexes** on: tasks(status, category_id, college), proposals(task_id), messages(chat_id, created_at), transactions(user_id), leaderboard(period, category, rank).
- **Constraints:** one accepted proposal per task; unique review per (task, reviewer, reviewee); unique leaderboard row per (user, period, category); unique achievement per (user, badge_name).
- **RLS policies** per table: users access only their own rows except public task listings.
- **Money is integer paise** (avoid floating-point errors), not float.
- **Soft deletes** where audit/history matters (tasks, transactions).

---

## 11. API Planning Overview

> RESTful resource grouping via Next.js API routes / server actions. Auth required unless noted.

### Auth & Profile
- Sign up / login (handled largely by Supabase Auth client SDK)
- Send / verify phone OTP
- Get / update own profile
- Manage skills
- Request student verification

### Tasks
- Create task
- List tasks (with filters, search, pagination)
- Get task detail
- Update / delete own task
- Update task status
- Upload task attachment (signed URL flow)

### Proposals
- Submit proposal on a task
- List proposals for a task (poster only)
- Withdraw own proposal
- Accept a proposal (poster only) → triggers escrow lock + worker assignment

### Submissions
- Submit work (worker)
- List submissions for a task
- Approve / request revision (poster) → approval triggers payment release

### Chat & Meetings
- Create / fetch chat for a task
- Send / fetch messages (realtime channel)
- Propose / accept meeting

### Payments & Wallet
- Create Razorpay order (fund a task)
- Verify payment (server-side signature check)
- Webhook receiver (payment.captured, refund, payout events) — **public but signature-verified**
- Get wallet balance
- Request withdrawal / payout
- List transactions

### Reviews & Reputation
- Submit review
- List reviews for a user

### Leaderboard & Ranking
- Get leaderboard (top-ranked workers; filter by period: weekly/monthly/all-time)
- Get category-based leaderboard (e.g., by skill)
- Get a user's rank, performance score, and stats
- List a user's achievement badges
- (Internal) Recalculate score + rank on task completion / scheduled refresh

### Disputes
- Raise dispute
- Submit evidence
- (Admin) Resolve dispute

### Notifications
- List notifications
- Mark as read

### Admin
- List / verify / suspend / ban users
- Moderate tasks
- Manage disputes
- Grant badges
- Analytics endpoints

**API conventions:**
- All mutating endpoints validate **auth + role + ownership** server-side.
- Consistent response envelope (data / error / status).
- Idempotency keys on payment-critical operations.
- Pagination (cursor-based) on list endpoints.
- Input validation on every endpoint (e.g., zod).

---

## 12. Frontend Page Structure

```
/                         → Landing / marketing page (public)
/login                    → Auth (Google OAuth)
/onboarding               → Phone OTP + profile completion

/dashboard                → User home (overview, quick actions, stats)

/tasks                    → Browse tasks (search, filters, sort)
/tasks/new                → Create task
/tasks/[id]               → Task detail (proposals, chat, status)
/tasks/[id]/edit          → Edit task

/my-tasks                 → Tasks I posted (with statuses)
/my-work                  → Tasks I'm working on / proposals I sent

/chat                     → Chat list
/chat/[taskId]            → Conversation thread

/wallet                   → Balance, add money, withdraw, transactions
/profile                  → Own profile (edit)
/profile/[id]             → Public profile (reputation, reviews, badges)

/leaderboard              → Leaderboard (weekly / monthly / all-time tabs)
/leaderboard/[category]   → Category-based ranking (e.g., top developers)
/dashboard/performance    → Personal performance & ranking dashboard

/notifications            → Notification center

/disputes                 → My disputes
/disputes/[id]            → Dispute detail / evidence

/admin                    → Admin dashboard (protected)
/admin/users
/admin/tasks
/admin/disputes
/admin/payouts
/admin/analytics

/settings                 → Account settings
```

**Frontend principles:**
- Mobile-first responsive design.
- Reusable component library (cards, modals, badges, status pills).
- Optimistic UI for chat and notifications.
- Skeleton loaders for perceived performance.
- Protected routes via middleware (auth + role gates).

---

## 13. Backend Module Structure

> Logical modules (not necessarily separate services — organized within the Next.js backend).

```
/lib or /server
├── auth/            → session helpers, role guards, OTP logic
├── profiles/        → profile + skills + verification logic
├── tasks/           → task CRUD, status state machine, search/filter
├── proposals/       → bidding logic, acceptance + locking
├── submissions/     → work submission + approval flow
├── chat/            → message persistence, realtime channel setup
├── meetings/        → scheduling logic
├── payments/        → Razorpay order creation, signature verify,
│                      escrow state machine, payouts, webhooks
├── wallet/          → balance, holds, releases, transaction ledger
├── reviews/         → rating + review logic, reputation aggregation
├── leaderboard/     → score calculation, ranking engine, period/category
│                      leaderboards, achievement-badge granting
├── badges/          → badge criteria + granting
├── disputes/        → dispute lifecycle, evidence, resolution
├── notifications/   → create + dispatch notifications
├── admin/           → moderation, user management, analytics
├── db/              → Supabase client, query helpers, types
└── shared/          → validation schemas, constants, error handling, utils
```

**Backend principles:**
- **Single responsibility per module.**
- **Payment & wallet logic is the most safety-critical** — transactional, idempotent, heavily tested, isolated.
- **State machines** for task status and escrow status with explicit allowed transitions.
- **Shared validation** layer (zod schemas) reused across endpoints.
- **Centralized error handling** and logging.

---

## 14. Development Phases

### Phase 0 — Foundation (Setup)
- Repo, Next.js + Tailwind scaffold, Supabase project, environment config.
- Auth (Google OAuth) + phone OTP + onboarding.
- Base layout, design system, protected routing.

### Phase 1 — Core Marketplace (MVP)
- Profiles (college, course, year, skills).
- Task posting + categories + file upload.
- Task browse, search, filters.
- Proposal/bidding + worker selection.
- Task status lifecycle.

### Phase 2 — Transactions & Trust
- Razorpay integration + escrow hold/release.
- Wallet + transaction history.
- Work submission + approval → payment release.
- Ratings & reviews.

### Phase 3 — Communication & Coordination
- Real-time chat.
- Contact sharing after acceptance.
- Meeting scheduling.
- Notifications (in-app, realtime).

### Phase 4 — Governance
- Dispute management.
- Admin panel (users, tasks, disputes, payouts, analytics).
- Skill verification badges.

### Phase 5 — Polish & Scale
- Performance, accessibility, mobile refinement.
- Email/push notifications.
- Analytics & monitoring.

### Phase 6 — Intelligence (Future)
- AI recommendations and smart matching.

---

## 15. MVP Features

**Goal:** Prove that students will post tasks, bid on them, transact money, and trust the platform — on a single campus.

**MVP scope (must-have):**
1. Google OAuth login + phone OTP verification.
2. Student profile (college, course, year, skills).
3. Post a task (title, description, category, budget, deadline, file upload).
4. Browse / search / filter tasks.
5. Proposal/bidding system + worker selection.
6. Task status management (open → in progress → submitted → completed).
7. Real-time chat after acceptance + contact sharing.
8. Razorpay payment with escrow hold → release on approval.
9. Wallet + basic transaction history.
10. Ratings and reviews.
11. Basic notifications (in-app).

**Explicitly deferred from MVP:** disputes (manual handling at first), full admin panel (minimal admin tooling only), skill badges, meeting scheduler, AI recommendations, withdrawals automation (can be semi-manual initially).

---

## 16. Advanced Features

To build **post-MVP**, once core liquidity and trust are proven:

- **Dispute management system** with evidence and admin resolution.
- **Full admin panel** with analytics, moderation, payout oversight.
- **Skill verification badges** (test-based or admin-granted).
- **Meeting scheduling** with calendar/reminders.
- **Automated withdrawals/payouts** via Razorpay Payouts.
- **Advanced reputation** (response time, completion rate, repeat-client score).
- **Leaderboard & ranking system** (weekly/monthly/all-time/category leaderboards, performance scoring, achievement badges, gamified engagement).
- **Email & push notifications**.
- **Saved searches & alerts** for workers.
- **Featured / boosted task listings** (potential monetization).
- **Multi-campus support** with campus-scoped feeds.
- **AI-based recommendations** (task↔worker matching, budget suggestions, auto-categorization).
- **Mobile app** (React Native / PWA enhancement).

---

## 17. Security Considerations

### Identity & Access
- **Verified-student-only** participation (email + phone; optional ID verification).
- **Supabase RLS** as the primary data-access guard — users can only touch their own data.
- **Server-side role + ownership checks** on every mutating endpoint (never trust the client).
- **Admin routes** strictly gated and audited.

### Payments
- **Never trust client-side payment confirmation** — verify Razorpay signatures server-side.
- **Webhooks are signature-verified and idempotent** (handle retries safely).
- **Escrow state machine** with atomic, transactional money movements (integer paise).
- **Reconciliation** between Razorpay and internal ledger.

### Data Protection
- **Contact info hidden** until a proposal is accepted (privacy by default).
- **Signed URLs** for file access; storage access policies enforced.
- **Input validation & sanitization** on all inputs (prevent injection/XSS).
- **HTTPS everywhere**; secrets in environment variables, never in client bundles.

### Abuse & Fraud Prevention
- **Rate limiting** on auth, OTP, posting, and proposals.
- **OTP attempt throttling** and expiry.
- **Reporting & moderation** for tasks and users.
- **Suspend/ban** mechanisms.
- **Audit logs** for admin actions and money movements.
- **Anti-collusion / fake-review** monitoring (later phase).

### Operational Security
- Principle of least privilege for service keys.
- Separate Supabase anon key (client) vs service role key (server-only).
- Regular dependency and vulnerability checks.

---

## 18. Payment Flow

CampusGig uses an **escrow-style model**: the poster funds the task upfront, money is held, and released to the worker only upon approval — protecting both sides.

### 18.1 Funding & Escrow Hold
```
1. Poster accepts a proposal (or pre-funds at posting).
2. Backend creates a Razorpay order for (bid amount + platform fee).
3. Poster completes payment (UPI/card/etc.) on Razorpay checkout.
4. Razorpay sends payment.captured webhook → backend verifies signature.
5. Backend marks funds as HELD (escrow) in the ledger; task → in_progress.
```

### 18.2 Work & Release
```
6. Worker submits completed work.
7. Poster reviews → Approves.
8. Backend transitions escrow: HELD → RELEASED.
   - Worker wallet credited (bid amount).
   - Platform commission recorded.
9. Task → completed. Both prompted to leave reviews.
```

### 18.3 Withdrawal / Payout
```
10. Worker requests withdrawal from wallet balance.
11. Backend initiates Razorpay payout to worker's bank/UPI
    (semi-manual in MVP, automated later).
12. payout.processed webhook updates transaction status.
```

### 18.4 Refund / Dispute Path
```
- If task cancelled before work / dispute resolved for poster:
  HELD → REFUNDED back to poster (via Razorpay refund).
- Partial resolution: split between worker payout and poster refund.
```

### Payment State Machine (escrow)
```
PENDING → HELD → RELEASED        (happy path)
              ↘ REFUNDED         (cancel / dispute-for-poster)
              ↘ PARTIAL          (dispute split)
```

**Critical rules:**
- All transitions are **server-side, transactional, idempotent**.
- Webhooks are the **source of truth** for external payment state.
- Every money movement writes an immutable **ledger entry**.

---

## 19. Notification Flow

### Notification Triggers
| Event | Notify | Recipient |
|---|---|---|
| New proposal on your task | "You received a proposal" | Poster |
| Proposal accepted | "Your proposal was accepted" | Worker |
| Proposal rejected / task closed | "Task no longer available" | Worker |
| New chat message | "New message" | Other party |
| Work submitted | "Work submitted for review" | Poster |
| Work approved | "Your work was approved & paid" | Worker |
| Revision requested | "Revision requested" | Worker |
| Payment received / escrow funded | "Payment confirmed" | Both |
| Payout processed | "Withdrawal completed" | Worker |
| New review received | "You received a review" | Reviewee |
| Dispute raised / resolved | "Dispute update" | Both |
| Badge granted / verification done | "You earned a badge" | User |

### Delivery Pipeline
```
Event occurs (in backend logic)
   → Write notification row (DB)
   → Push via Supabase Realtime channel (instant in-app)
   → UI badge/count updates live
   → (Future) Fan-out to email / push if user offline
```

### Principles
- **In-app + realtime first** (MVP); email/push later.
- Notifications are **persisted** (notification center, mark-as-read).
- **Idempotent** creation (avoid duplicates on retries).
- User-configurable preferences (future).

---

## 20. Future Improvements

- **AI Recommendation Engine:** match workers to tasks by skill/history; suggest budgets; auto-categorize tasks; detect fraud patterns.
- **Multi-campus & inter-campus** marketplace with geo/college scoping.
- **Native mobile app / PWA** for push notifications and offline support.
- **Reputation portability** and verified skill assessments.
- **Team gigs / group tasks** (multiple workers on one task).
- **Subscription / membership tiers** and featured listings (monetization).
- **Automated dispute triage** with AI-assisted evidence summaries.
- **Analytics dashboards** for users (earnings trends, demand insights).
- **Localization & multi-currency** for expansion beyond initial market.
- **Integrations:** college SSO, calendar apps, e-signature for deliverables.
- **Trust scoring model** combining ratings, completion rate, response time, and dispute history.
- **AI-based ranking** for the leaderboard (weighted, fraud-resistant scoring; momentum/consistency signals), **seasonal competitions**, and a **rewards system** (cashback, fee discounts, featured placement for top-ranked workers).

---

## 21. Development Timeline

> Indicative timeline for a small team (2–4 developers). Adjust to actual capacity. Durations are in weeks.

| Phase | Focus | Est. Duration | Cumulative |
|---|---|---|---|
| **Phase 0** | Setup, auth, onboarding, design system | 2 weeks | Week 2 |
| **Phase 1** | Profiles, task posting, browse/search, bidding | 3 weeks | Week 5 |
| **Phase 2** | Razorpay escrow, wallet, submission/approval, reviews | 3 weeks | Week 8 |
| **Phase 3** | Realtime chat, contact sharing, scheduling, notifications | 2 weeks | Week 10 |
| **MVP Launch (single campus)** | QA, polish, closed beta | 1 week | **Week 11** |
| **Phase 4** | Disputes, admin panel, skill badges | 3 weeks | Week 14 |
| **Phase 5** | Performance, accessibility, email/push, monitoring | 2 weeks | Week 16 |
| **Phase 6** | AI recommendations & smart matching | 3+ weeks | Week 19+ |

### Milestones
- **M1 (Week 5):** Core marketplace usable end-to-end without payments.
- **M2 (Week 8):** Full transaction loop with escrow working.
- **M3 (Week 11):** **MVP live** on first campus (closed beta).
- **M4 (Week 14):** Governance & admin tooling complete.
- **M5 (Week 16):** Production-hardened, ready for broader rollout.
- **M6 (Week 19+):** Intelligence layer & multi-campus expansion.

### Timeline Risks & Mitigations
- **Payment integration complexity** → start Razorpay spike early (parallel to Phase 1).
- **Trust/liquidity cold-start** → seed first campus with ambassadors and initial tasks.
- **Scope creep** → strictly protect MVP boundary; defer everything non-essential.
- **Realtime scaling** → fine at campus scale; monitor and revisit before multi-campus.

---

## Appendix — Guiding Principles

1. **Trust is the product.** Every feature decision should increase trust between students.
2. **Protect the money.** Payment and escrow logic is the highest-stakes code — treat it accordingly.
3. **Ship the MVP narrow and deep.** One campus, working end-to-end, beats ten features half-built.
4. **Security by default.** RLS + server-side checks + verified identity, always.
5. **Keep value on-platform.** Chat, escrow, reputation, and disputes are what stop off-platform leakage.

---

*End of PLAN.md*
