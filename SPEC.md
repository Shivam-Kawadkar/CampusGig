# CampusGig — Technical Specification (SPEC.md)

> Production-level technical specification for the CampusGig student skill-based marketplace.
> This document translates `PLAN.md` into concrete, implementable engineering specifications.

**Document version:** 1.0
**Last updated:** 2026-06-12
**Companion document:** `PLAN.md`
**Status:** Engineering specification — pre-implementation

---

## Table of Contents

1. [System Architecture Specification](#1-system-architecture-specification)
2. [Complete Feature Specifications](#2-complete-feature-specifications)
3. [User Roles and Permissions](#3-user-roles-and-permissions)
4. [Database Design](#4-database-design)
5. [API Specification](#5-api-specification)
6. [Frontend Specification](#6-frontend-specification)
7. [Backend Specification](#7-backend-specification)
8. [Authentication Flow](#8-authentication-flow)
9. [Payment Flow](#9-payment-flow)
10. [Chat and Notification Flow](#10-chat-and-notification-flow)
11. [Validation Rules](#11-validation-rules)
12. [Error Handling](#12-error-handling)
13. [Security Implementation](#13-security-implementation)
14. [Folder Structure](#14-folder-structure)
15. [Deployment Structure](#15-deployment-structure)
16. [Testing Strategy](#16-testing-strategy)
17. [Future Enhancement Plan](#17-future-enhancement-plan)

---

## 1. System Architecture Specification

### 1.1 Architectural Style
- **Pattern:** Serverless, Backend-for-Frontend (BFF) using Next.js full-stack.
- **Rendering:** Hybrid — SSR for public/SEO pages, CSR for authenticated app shell, ISR for static marketing content.
- **Data access:** Layered — UI → API routes/server actions → service layer → data-access layer → Supabase (Postgres with RLS).
- **Communication:** HTTPS request/response for standard ops; WebSocket (Supabase Realtime) for chat, notifications, and live task status.

### 1.2 Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                            CLIENT TIER                                │
│  Next.js (React) + Tailwind CSS                                       │
│  • App shell, pages, components                                       │
│  • Supabase JS client (auth session, realtime subscriptions)         │
│  • Razorpay Checkout (browser SDK)                                    │
└───────────────┬─────────────────────────────────┬───────────────────┘
                │ HTTPS (REST)                      │ WSS (Realtime)
                ▼                                   ▼
┌─────────────────────────────────────┐  ┌──────────────────────────────┐
│        APPLICATION TIER              │  │     Supabase Realtime         │
│  Next.js API Routes / Server Actions │  │  channels: chat, notif, task  │
│  ┌─────────────────────────────────┐│  └──────────────────────────────┘
│  │ Controllers (route handlers)     ││
│  │ Services (business logic)        ││           ▲
│  │ Guards (auth + role + ownership) ││           │ publishes changes
│  │ Validators (schema validation)   ││           │
│  │ Webhook handlers (Razorpay)      ││           │
│  └─────────────────────────────────┘│           │
└──────────┬──────────────────┬────────┘           │
           │                  │                     │
           ▼                  ▼                     │
┌────────────────┐  ┌───────────────────────────────────────────────┐
│  Razorpay API  │  │                 DATA TIER                       │
│  orders/payment│  │  Supabase: PostgreSQL (+ RLS) | Auth | Storage  │
│  payouts/refund│  │  • Relational data + ledger                     │
│  webhooks ─────┼──┼─► /api/webhooks/razorpay                        │
└────────────────┘  └───────────────────────────────────────────────┘
```

### 1.3 Key Architectural Rules
- **Security at the data layer:** Every table protected by Row Level Security (RLS). The API enforces the same rules in code (defense in depth).
- **Money is authoritative server-side:** Client never confirms payments; Razorpay webhooks are the source of truth.
- **Idempotency:** All payment-critical and webhook operations are idempotent.
- **Stateless app tier:** No server session state; auth via Supabase JWT.
- **State machines:** Task status and escrow status follow explicit, validated transitions.
- **Money stored as integer paise** (never floats).

### 1.4 Environments
| Environment | Purpose | Supabase | Razorpay |
|---|---|---|---|
| Local | Development | Dev project / branch | Test keys |
| Preview | Per-PR (Vercel) | Dev/staging project | Test keys |
| Production | Live | Prod project | Live keys |

---

## 2. Complete Feature Specifications

> Each feature lists: purpose, actors, preconditions, main flow, business rules, and data touched.

### 2.1 Authentication
- **Purpose:** Verified student-only access.
- **Actors:** Guest → Student.
- **Flow:** Google OAuth (Supabase Auth) → create auth user → phone OTP verification → onboarding (profile completion) → active account.
- **Rules:**
  - Login only via Google OAuth (MVP).
  - Phone OTP required before any transactional action.
  - Optional college-ID verification grants "Verified Student" badge.
  - Sessions via Supabase JWT; refresh handled by client SDK.
- **Data:** `users`, `profiles`.

### 2.2 User Profile
- **Purpose:** Identity, reputation, and skill representation.
- **Flow:** After signup, user completes college, course, year, skills, bio, avatar. Profile shows rating, completed gigs, badges.
- **Rules:**
  - College, course, year required to participate.
  - Skills selected from `skills` taxonomy (with free-add request to admin).
  - Public profile hides email/phone.
- **Data:** `profiles`, `skills`, `user_skills`, `reviews`, `user_badges`.

### 2.3 Task Management
- **Purpose:** Posters create and manage tasks.
- **Flow:** Create (title, description, category, budget, deadline, attachments) → publish → receive proposals → select worker → in progress → submitted → completed/cancelled.
- **Rules:**
  - Only owner can edit/delete (and only while `open`).
  - Status transitions follow the task state machine (§9.5 / below).
  - Budget > 0; deadline must be future.
- **Task status state machine:**
  ```
  draft → open → in_progress → submitted → completed
                     ↘ cancelled
        submitted ↘ disputed → (resolved) → completed / cancelled
  ```
- **Data:** `tasks`, `task_attachments`, `categories`.

### 2.4 Search and Filters
- **Purpose:** Workers discover relevant tasks.
- **Flow:** List open tasks → keyword search (title/description) → filter (category, budget range, deadline, skill, college, status) → sort (newest, budget, deadline) → paginate.
- **Rules:**
  - Default scope: open tasks, optionally campus-scoped.
  - Cursor-based pagination.
  - Indexed query paths for performance.
- **Data:** `tasks`, `categories`, `skills`.

### 2.5 Proposal / Bidding
- **Purpose:** Workers offer to do a task.
- **Flow:** Worker opens task → submits proposal (bid amount, message, estimated delivery) → poster sees all proposals.
- **Rules:**
  - One active proposal per worker per task.
  - Cannot bid on own task.
  - Cannot bid on non-open tasks.
  - Worker can withdraw a pending proposal.
- **Data:** `applications` (proposals).

### 2.6 Worker Selection
- **Purpose:** Poster picks a worker.
- **Flow:** Poster reviews proposals (with worker reputation) → accepts one → escrow funding initiated → task locked to that worker → other proposals auto-rejected.
- **Rules:**
  - Exactly one accepted proposal per task (DB-enforced).
  - Acceptance requires successful escrow funding (or pre-funding).
  - Concurrency-safe (transactional).
- **Data:** `applications`, `tasks`, `transactions`, `wallets`.

### 2.7 Chat System
- **Purpose:** Coordination between poster and selected worker.
- **Flow:** On acceptance, a chat is created → realtime messages → read receipts.
- **Rules:**
  - Chat enabled only after acceptance.
  - Only the two parties (+ admin for disputes) can access.
  - Messages persisted; delivered live via Realtime.
- **Data:** `chats`, `messages`.

### 2.8 Contact Sharing
- **Purpose:** Privacy-preserving contact reveal.
- **Flow:** Phone/contact hidden until proposal accepted → revealed to both parties post-acceptance.
- **Rules:**
  - Pre-acceptance: contact info never exposed (enforced by RLS + API).
  - Post-acceptance: visible only within that task's context.
- **Data:** `profiles` (gated fields).

### 2.9 Meeting Scheduling
- **Purpose:** Arrange in-person/online coordination.
- **Flow:** Either party proposes datetime + mode/location → other accepts/declines/reschedules.
- **Rules:**
  - Only within accepted tasks.
  - Future datetime only.
- **Data:** `meetings`.

### 2.10 File Upload
- **Purpose:** Attach references and deliverables.
- **Flow:** Client requests signed upload URL → uploads to Supabase Storage → stores file metadata.
- **Rules:**
  - Allowed types: pdf, doc/docx, ppt/pptx, images, zip (configurable).
  - Max size (e.g., 10 MB/file MVP).
  - Access via signed URLs; bound to task participants.
- **Data:** `files`, `task_attachments`.

### 2.11 Work Submission
- **Purpose:** Worker delivers completed work.
- **Flow:** Worker submits deliverables (files/links/notes) → poster reviews → approve or request revision.
- **Rules:**
  - Only assigned worker can submit.
  - Approval triggers payment release.
  - Revision returns task to in_progress with feedback.
- **Data:** `submissions`, `files`, `tasks`.

### 2.12 Payment System
- **Purpose:** Escrow-protected transactions.
- **Flow:** Poster funds task via Razorpay → funds HELD → on approval RELEASED to worker → commission deducted. Refund/partial on cancel/dispute.
- **Rules:**
  - Razorpay signature verified server-side.
  - Webhook = source of truth.
  - Idempotent, transactional ledger entries.
- **Escrow state machine:** `PENDING → HELD → RELEASED | REFUNDED | PARTIAL`.
- **Data:** `payments`, `wallets`, `transactions`.

### 2.13 Wallet
- **Purpose:** Track balances and earnings.
- **Flow:** Earnings credited on release → balance + locked_balance tracked → withdraw to bank/UPI.
- **Rules:**
  - `balance` = withdrawable; `locked_balance` = held in escrow.
  - Withdrawals create payout transactions.
- **Data:** `wallets`, `transactions`.

### 2.14 Transaction History
- **Purpose:** Immutable financial audit trail.
- **Flow:** Every money movement (deposit, hold, release, refund, withdrawal, commission) writes a ledger row → user views history.
- **Rules:**
  - Append-only ledger; no edits/deletes.
  - Linked to task and Razorpay reference.
- **Data:** `transactions`.

### 2.15 Notifications
- **Purpose:** Keep users informed in real time.
- **Flow:** Event in backend → persist notification → push via Realtime → in-app badge/center.
- **Rules:**
  - Persisted + mark-as-read.
  - Idempotent creation.
- **Data:** `notifications`.

### 2.16 Ratings & Reviews
- **Purpose:** Reputation.
- **Flow:** After completion, both parties rate (1–5) + comment → aggregated on profile.
- **Rules:**
  - One review per (task, reviewer, reviewee).
  - Only after `completed`.
  - Immutable after submission (MVP).
- **Data:** `reviews`.

### 2.17 Skill Verification
- **Purpose:** Trust signal for skills.
- **Flow:** Admin grants skill/verification badges (test-based later) → shown on profile.
- **Rules:**
  - Admin-only granting (MVP).
  - Badge criteria stored for transparency.
- **Data:** `badges`, `user_badges`, `user_skills.is_verified`.

### 2.18 Dispute System
- **Purpose:** Fair resolution when work/payment disagreement occurs.
- **Flow:** Either party raises dispute → task frozen (funds stay HELD) → both submit evidence → admin resolves (release/refund/partial).
- **Rules:**
  - Only on `in_progress`/`submitted` tasks.
  - Resolution updates escrow + reputation.
  - Full audit trail.
- **Data:** `reports` (disputes), `transactions`, `tasks`.

### 2.19 Admin Panel
- **Purpose:** Governance and operations.
- **Flow:** Admin manages users (verify/suspend/ban), moderates tasks, resolves disputes, oversees payouts, grants badges, views analytics.
- **Rules:**
  - Admin role required (separate, audited).
  - All admin actions logged.
- **Data:** all tables (read), `users`, `reports`, `badges`, audit logs.

### 2.20 Leaderboard & Ranking System
- **Purpose:** Rank worker students by performance, skills, and reputation to motivate quality work and surface trusted profiles. Drives engagement (competition + recognition) and trust (objective, completion-backed signal).
- **Actors:** Student (Worker) — ranked; Student (Poster) — browses to choose workers; System — computes scores/ranks; Admin — monitors integrity.
- **Preconditions:** Worker has at least one verified, completed-and-rated task to enter the leaderboard.
- **Main flow:**
  1. Worker completes a task; poster approves and submits a rating + review.
  2. System recomputes the worker's **performance score** from weighted criteria.
  3. Worker's **rank** is recalculated for overall, category, and each time window.
  4. Worker appears/moves on the relevant leaderboards.
  5. Eligible **achievement badges** are auto-granted when thresholds are met.
  6. Updated rank, score, and badges render on the public profile + performance dashboard.
- **Ranking criteria & weighting (configurable):**

  | Signal | Source | Default weight |
  |---|---|---|
  | Average rating | `reviews.rating` aggregate | 30% |
  | Completed tasks (volume) | count of completed tasks | 15% |
  | Positive reviews (≥ 4★) ratio | `reviews` | 15% |
  | On-time completion rate | submission vs deadline | 15% |
  | Task success rate | completed ÷ accepted (no cancel/dispute-loss) | 15% |
  | Skill verification badges | `user_skills.is_verified` / `user_badges` | 5% |
  | Reliability score | response time, low dispute/cancel rate | 5% |

  - Score is **normalized to 0–100**; volume signals use diminishing returns (e.g., log scale) so new high-quality workers can still rank.
- **Leaderboard types:**
  - **Weekly** — rolling 7-day window (resets/recomputes per period).
  - **Monthly** — calendar-month window.
  - **All-time** — lifetime cumulative.
  - **Category-based** — scoped to a skill/category (e.g., "Top Java Developer", "Top Designer", "Top Content Creator").
- **Gamification — achievement badges:**

  | Badge | Example criterion |
  |---|---|
  | **Rising Star** | First N (e.g., 5) tasks completed with ≥ 4.5★ average |
  | **Top Performer** | Reaches top 10 (or top 1%) of a leaderboard |
  | **Fast Delivery** | ≥ 90% on-time across ≥ N tasks |
  | **Trusted Worker** | High reliability + zero lost disputes over ≥ N tasks |

- **Rules:**
  - **Only verified, completed tasks with genuine ratings** affect the score (no draft/cancelled/disputed-loss contributions).
  - Score/rank updates are **idempotent** (recompute is deterministic from source data).
  - Ranks computed per `(period, category)`; ties broken by score → completed_tasks → earliest achiever.
  - Fraud/collusion-flagged reviews are excluded from aggregation.
  - Leaderboard reads are public (worker-facing stats only — no contact/financial data).
- **Recalculation triggers:** on task completion/approval and review submission (event-driven), plus a **scheduled refresh** for time-window leaderboards (weekly/monthly recompute and rank ordering).
- **Data:** `leaderboard`, `achievements`, `reviews`, `tasks`, `submissions`, `user_badges`, `profiles`.

---

## 3. User Roles and Permissions

Roles are **contextual** for students (a user can post and work) and **exclusive** for admin.

### 3.1 Student as Task Provider (Poster)
**Can:** create/edit/delete own tasks (while open), fund tasks, view proposals on own tasks, accept a proposal, chat with selected worker, review submissions, approve/request revision, raise disputes, rate worker, manage own wallet.
**Cannot:** bid on own tasks, access others' proposals/chats, release another user's funds, perform admin actions.

### 3.2 Student as Worker
**Can:** browse/search tasks, submit/withdraw proposals, chat after acceptance, submit work, raise disputes, withdraw earnings, rate poster.
**Cannot:** accept proposals, edit poster's task, see other workers' bids' private messages, perform admin actions.

### 3.3 Admin
**Can:** verify/suspend/ban users, moderate tasks/content, resolve disputes (release/refund/partial), oversee payouts, grant badges, view analytics, read all data for governance.
**Cannot:** silently alter ledger history (only append corrective transactions); bypass audit logging.

### 3.4 Permission Matrix (summary)

| Action | Poster | Worker | Admin |
|---|---|---|---|
| Post task | ✅ | ✅ | ✅ |
| Bid | ✅(others') | ✅ | ❌ |
| Accept proposal | ✅(own) | ❌ | ❌ |
| Chat | ✅(own task) | ✅(assigned) | view(dispute) |
| Submit work | ❌ | ✅ | ❌ |
| Approve/release | ✅(own) | ❌ | ✅(override) |
| Raise dispute | ✅ | ✅ | ❌ |
| Resolve dispute | ❌ | ❌ | ✅ |
| Withdraw | ✅ | ✅ | ✅ |
| Verify/ban users | ❌ | ❌ | ✅ |

**Enforcement:** Supabase RLS (data) + server-side guards (API) + conditional UI (presentation).

---

## 4. Database Design

> PostgreSQL (Supabase). Conventions: `id` UUID PK (default `gen_random_uuid()`), `created_at`/`updated_at` timestamptz, money as `BIGINT` (paise). FKs cascade or restrict as noted. RLS enabled on all tables.

### 4.1 users
Links to Supabase `auth.users`. Core identity + status.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, = auth.users.id |
| email | TEXT | UNIQUE, NOT NULL |
| phone | TEXT | NULLABLE, UNIQUE |
| phone_verified | BOOLEAN | DEFAULT false |
| role | TEXT (enum: student, admin) | DEFAULT 'student' |
| status | TEXT (enum: active, suspended, banned) | DEFAULT 'active' |
| created_at | TIMESTAMPTZ | DEFAULT now() |

### 4.2 profiles
Public-facing student details. 1:1 with users.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, UNIQUE, NOT NULL |
| full_name | TEXT | NOT NULL |
| avatar_url | TEXT | NULLABLE |
| bio | TEXT | NULLABLE |
| college | TEXT | NOT NULL |
| course | TEXT | NOT NULL |
| year_of_study | SMALLINT | NOT NULL |
| is_verified_student | BOOLEAN | DEFAULT false |
| rating_avg | NUMERIC(3,2) | DEFAULT 0 |
| rating_count | INTEGER | DEFAULT 0 |
| completed_gigs | INTEGER | DEFAULT 0 |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

### 4.3 skills
Skill taxonomy.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | TEXT | UNIQUE, NOT NULL |
| category | TEXT | NULLABLE |
| created_at | TIMESTAMPTZ | DEFAULT now() |

### 4.4 user_skills
M:N between users and skills.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, NOT NULL |
| skill_id | UUID | FK → skills.id, NOT NULL |
| level | TEXT (enum: beginner, intermediate, expert) | NULLABLE |
| is_verified | BOOLEAN | DEFAULT false |
| | | UNIQUE(user_id, skill_id) |

### 4.5 categories
Task categories.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | TEXT | UNIQUE, NOT NULL |
| slug | TEXT | UNIQUE, NOT NULL |
| description | TEXT | NULLABLE |
| icon | TEXT | NULLABLE |

### 4.6 tasks
Core task entity.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| poster_id | UUID | FK → users.id, NOT NULL |
| title | TEXT | NOT NULL |
| description | TEXT | NOT NULL |
| category_id | UUID | FK → categories.id, NOT NULL |
| budget | BIGINT (paise) | NOT NULL, CHECK > 0 |
| deadline | TIMESTAMPTZ | NOT NULL |
| task_type | TEXT (enum: fixed, open_bid) | DEFAULT 'open_bid' |
| status | TEXT (enum: draft, open, in_progress, submitted, completed, disputed, cancelled) | DEFAULT 'open' |
| selected_application_id | UUID | FK → applications.id, NULLABLE |
| escrow_amount | BIGINT | DEFAULT 0 |
| college_scope | TEXT | NULLABLE |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

Indexes: `(status)`, `(category_id)`, `(college_scope)`, `(poster_id)`, `(deadline)`.

### 4.7 task_attachments
Reference files on a task.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| task_id | UUID | FK → tasks.id, NOT NULL |
| file_id | UUID | FK → files.id, NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

### 4.8 applications (Proposals/Bids)
Worker proposals on tasks.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| task_id | UUID | FK → tasks.id, NOT NULL |
| worker_id | UUID | FK → users.id, NOT NULL |
| bid_amount | BIGINT (paise) | NOT NULL, CHECK > 0 |
| message | TEXT | NULLABLE |
| estimated_delivery | TIMESTAMPTZ | NULLABLE |
| status | TEXT (enum: pending, accepted, rejected, withdrawn) | DEFAULT 'pending' |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| | | UNIQUE(task_id, worker_id) |

Partial unique index: at most one `accepted` application per `task_id`.

### 4.9 submissions
Work deliverables.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| task_id | UUID | FK → tasks.id, NOT NULL |
| worker_id | UUID | FK → users.id, NOT NULL |
| content | TEXT | NULLABLE |
| status | TEXT (enum: submitted, approved, revision_requested) | DEFAULT 'submitted' |
| feedback | TEXT | NULLABLE |
| created_at | TIMESTAMPTZ | DEFAULT now() |

### 4.10 chats
One chat per task (poster ↔ worker).

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| task_id | UUID | FK → tasks.id, UNIQUE, NOT NULL |
| poster_id | UUID | FK → users.id, NOT NULL |
| worker_id | UUID | FK → users.id, NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

### 4.11 messages
Chat messages.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| chat_id | UUID | FK → chats.id, NOT NULL |
| sender_id | UUID | FK → users.id, NOT NULL |
| content | TEXT | NULLABLE |
| file_id | UUID | FK → files.id, NULLABLE |
| read_at | TIMESTAMPTZ | NULLABLE |
| created_at | TIMESTAMPTZ | DEFAULT now() |

Index: `(chat_id, created_at)`.

### 4.12 meetings
Coordination scheduling.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| task_id | UUID | FK → tasks.id, NOT NULL |
| proposed_by | UUID | FK → users.id, NOT NULL |
| scheduled_at | TIMESTAMPTZ | NOT NULL |
| mode | TEXT (enum: online, in_person) | NOT NULL |
| location | TEXT | NULLABLE |
| status | TEXT (enum: proposed, accepted, declined, rescheduled) | DEFAULT 'proposed' |
| created_at | TIMESTAMPTZ | DEFAULT now() |

### 4.13 files
Generic file metadata (Supabase Storage).

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| owner_id | UUID | FK → users.id, NOT NULL |
| storage_path | TEXT | NOT NULL |
| file_name | TEXT | NOT NULL |
| file_type | TEXT | NOT NULL |
| size_bytes | BIGINT | NOT NULL |
| context | TEXT (enum: task_attachment, submission, message, avatar) | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

### 4.14 wallets
One wallet per user.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, UNIQUE, NOT NULL |
| balance | BIGINT (paise) | DEFAULT 0, CHECK >= 0 |
| locked_balance | BIGINT (paise) | DEFAULT 0, CHECK >= 0 |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

### 4.15 payments
Razorpay order/payment records (escrow funding).

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| task_id | UUID | FK → tasks.id, NOT NULL |
| payer_id | UUID | FK → users.id, NOT NULL |
| razorpay_order_id | TEXT | UNIQUE, NOT NULL |
| razorpay_payment_id | TEXT | UNIQUE, NULLABLE |
| amount | BIGINT (paise) | NOT NULL |
| commission | BIGINT (paise) | DEFAULT 0 |
| status | TEXT (enum: created, captured, failed, refunded) | DEFAULT 'created' |
| escrow_status | TEXT (enum: pending, held, released, refunded, partial) | DEFAULT 'pending' |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |

### 4.16 transactions (Ledger)
Append-only financial ledger.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, NOT NULL |
| task_id | UUID | FK → tasks.id, NULLABLE |
| payment_id | UUID | FK → payments.id, NULLABLE |
| type | TEXT (enum: deposit, hold, release, refund, withdrawal, commission) | NOT NULL |
| amount | BIGINT (paise) | NOT NULL |
| direction | TEXT (enum: credit, debit) | NOT NULL |
| status | TEXT (enum: pending, success, failed) | DEFAULT 'success' |
| razorpay_ref | TEXT | NULLABLE |
| idempotency_key | TEXT | UNIQUE, NULLABLE |
| created_at | TIMESTAMPTZ | DEFAULT now() |

Index: `(user_id, created_at)`.

### 4.17 notifications

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, NOT NULL |
| type | TEXT (enum) | NOT NULL |
| title | TEXT | NOT NULL |
| body | TEXT | NULLABLE |
| payload | JSONB | NULLABLE |
| is_read | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMPTZ | DEFAULT now() |

Index: `(user_id, is_read, created_at)`.

### 4.18 reviews

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| task_id | UUID | FK → tasks.id, NOT NULL |
| reviewer_id | UUID | FK → users.id, NOT NULL |
| reviewee_id | UUID | FK → users.id, NOT NULL |
| rating | SMALLINT | NOT NULL, CHECK 1–5 |
| comment | TEXT | NULLABLE |
| role_context | TEXT (enum: poster_to_worker, worker_to_poster) | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| | | UNIQUE(task_id, reviewer_id, reviewee_id) |

### 4.19 reports (Disputes & Moderation Reports)

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| type | TEXT (enum: dispute, user_report, task_report) | NOT NULL |
| task_id | UUID | FK → tasks.id, NULLABLE |
| raised_by | UUID | FK → users.id, NOT NULL |
| against_user | UUID | FK → users.id, NULLABLE |
| reason | TEXT | NOT NULL |
| evidence | JSONB (file refs, notes) | NULLABLE |
| status | TEXT (enum: open, under_review, resolved, dismissed) | DEFAULT 'open' |
| resolution | TEXT (enum: released, refunded, partial, none) | NULLABLE |
| resolved_by | UUID | FK → users.id, NULLABLE |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| resolved_at | TIMESTAMPTZ | NULLABLE |

### 4.20 badges & user_badges

**badges**
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | TEXT | UNIQUE, NOT NULL |
| type | TEXT (enum: skill, verification, achievement) | NOT NULL |
| criteria | TEXT | NULLABLE |
| icon | TEXT | NULLABLE |

**user_badges**
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, NOT NULL |
| badge_id | UUID | FK → badges.id, NOT NULL |
| granted_by | UUID | FK → users.id, NULLABLE |
| granted_at | TIMESTAMPTZ | DEFAULT now() |
| | | UNIQUE(user_id, badge_id) |

### 4.21 leaderboard
Per-worker ranking snapshot, maintained by the ranking engine. One row per `(user, period, category)` — `category = NULL` denotes the overall board.

| Column | Type | Constraints |
|---|---|---|
| id (leaderboard_id) | UUID | PK |
| user_id | UUID | FK → users.id, NOT NULL |
| total_tasks | INTEGER | DEFAULT 0 |
| completed_tasks | INTEGER | DEFAULT 0 |
| average_rating | NUMERIC(3,2) | DEFAULT 0 |
| total_reviews | INTEGER | DEFAULT 0 |
| positive_reviews | INTEGER | DEFAULT 0 |
| on_time_rate | NUMERIC(5,2) | DEFAULT 0 (percent) |
| success_rate | NUMERIC(5,2) | DEFAULT 0 (percent) |
| reliability_score | NUMERIC(5,2) | DEFAULT 0 |
| performance_score | NUMERIC(5,2) | NOT NULL, DEFAULT 0 (0–100) |
| rank | INTEGER | NULLABLE |
| category | TEXT | NULLABLE (skill/category slug; NULL = overall) |
| period | TEXT (enum: weekly, monthly, all_time) | NOT NULL, DEFAULT 'all_time' |
| updated_at | TIMESTAMPTZ | DEFAULT now() |
| | | UNIQUE(user_id, period, category) |

Indexes: `(period, category, rank)`, `(period, category, performance_score DESC)`, `(user_id)`.

### 4.22 achievements
Gamification badges earned by workers (distinct from admin-granted `user_badges`).

| Column | Type | Constraints |
|---|---|---|
| id (achievement_id) | UUID | PK |
| user_id | UUID | FK → users.id, NOT NULL |
| badge_name | TEXT (enum: rising_star, top_performer, fast_delivery, trusted_worker) | NOT NULL |
| earned_date | TIMESTAMPTZ | DEFAULT now() |
| | | UNIQUE(user_id, badge_name) |

Index: `(user_id)`.

### 4.23 Relationships Summary
- `users` 1—1 `profiles`, 1—1 `wallets`.
- `users` 1—M `tasks` (poster), `applications` (worker), `transactions`, `notifications`, `reviews`.
- `tasks` 1—M `applications`, `submissions`, `task_attachments`; 1—1 `chats`.
- `tasks` 1—1 selected `applications` (via `selected_application_id`).
- `chats` 1—M `messages`.
- `users` M—N `skills` (via `user_skills`), M—N `badges` (via `user_badges`).
- `users` 1—M `leaderboard` (one row per period/category), 1—M `achievements`.
- `payments` 1—M `transactions`.
- `tasks` 1—M `reports` (disputes).

### 4.24 ER Overview (textual)
```
users ──1:1── profiles
users ──1:1── wallets
users ──1:N── tasks(poster)
users ──1:N── applications(worker)
tasks ──1:N── applications ──(selected)──► tasks.selected_application_id
tasks ──1:1── chats ──1:N── messages
tasks ──1:N── submissions
tasks ──1:N── task_attachments ──► files
tasks ──1:N── reports(disputes)
payments ──1:N── transactions
users ──M:N── skills (user_skills)
users ──M:N── badges (user_badges)
users ──1:N── leaderboard (per period/category)
users ──1:N── achievements
```

---

## 5. API Specification

> Base path: `/api`. All endpoints require auth (Bearer JWT via Supabase) unless marked **Public**. Standard response envelope:
> `{ "success": boolean, "data": object|null, "error": { "code": string, "message": string } | null }`
> List endpoints support `?cursor=&limit=&sort=`.

### 5.1 Authentication & Profile

| Method | Endpoint | Purpose | Request | Response |
|---|---|---|---|---|
| POST | `/api/auth/otp/send` | Send phone OTP | `{ phone }` | `{ success, requestId }` |
| POST | `/api/auth/otp/verify` | Verify OTP | `{ phone, code }` | `{ success, phone_verified }` |
| GET | `/api/profile/me` | Get own profile | — | `{ profile, skills, badges, wallet }` |
| PUT | `/api/profile/me` | Update profile | `{ full_name, bio, college, course, year_of_study, avatar_url }` | `{ profile }` |
| GET | `/api/profile/:userId` | Public profile | — | `{ profile, rating, reviews, badges }` |
| POST | `/api/profile/skills` | Add/update skills | `{ skills:[{skill_id, level}] }` | `{ skills }` |
| POST | `/api/profile/verify-student` | Request student verification | `{ file_id }` | `{ status:'pending' }` |

### 5.2 Tasks

| Method | Endpoint | Purpose | Request | Response |
|---|---|---|---|---|
| POST | `/api/tasks` | Create task | `{ title, description, category_id, budget, deadline, attachment_ids[] }` | `{ task }` |
| GET | `/api/tasks` | List/search tasks | query: `q, category, min_budget, max_budget, skill, college, status, sort, cursor, limit` | `{ tasks[], nextCursor }` |
| GET | `/api/tasks/:id` | Task detail | — | `{ task, attachments, proposalCount, poster }` |
| PUT | `/api/tasks/:id` | Update own task (open only) | `{ ...fields }` | `{ task }` |
| DELETE | `/api/tasks/:id` | Delete own task (open only) | — | `{ success }` |
| PATCH | `/api/tasks/:id/status` | Update status (guarded transitions) | `{ status }` | `{ task }` |

### 5.3 Proposals (Applications)

| Method | Endpoint | Purpose | Request | Response |
|---|---|---|---|---|
| POST | `/api/tasks/:id/proposals` | Submit proposal | `{ bid_amount, message, estimated_delivery }` | `{ proposal }` |
| GET | `/api/tasks/:id/proposals` | List proposals (poster only) | — | `{ proposals[] }` |
| DELETE | `/api/proposals/:id` | Withdraw own proposal | — | `{ success }` |
| POST | `/api/proposals/:id/accept` | Accept proposal → init escrow | `{ }` | `{ task, payment:{ razorpay_order } }` |

### 5.4 Submissions

| Method | Endpoint | Purpose | Request | Response |
|---|---|---|---|---|
| POST | `/api/tasks/:id/submissions` | Submit work (worker) | `{ content, file_ids[] }` | `{ submission }` |
| GET | `/api/tasks/:id/submissions` | List submissions | — | `{ submissions[] }` |
| POST | `/api/submissions/:id/approve` | Approve → release payment | `{ }` | `{ submission, task, transaction }` |
| POST | `/api/submissions/:id/request-revision` | Request revision | `{ feedback }` | `{ submission }` |

### 5.5 Chat & Meetings

| Method | Endpoint | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/api/chats` | List my chats | — | `{ chats[] }` |
| GET | `/api/chats/:taskId/messages` | Fetch messages | query: `cursor, limit` | `{ messages[], nextCursor }` |
| POST | `/api/chats/:taskId/messages` | Send message | `{ content, file_id? }` | `{ message }` |
| POST | `/api/tasks/:id/meetings` | Propose meeting | `{ scheduled_at, mode, location }` | `{ meeting }` |
| PATCH | `/api/meetings/:id` | Accept/decline/reschedule | `{ status, scheduled_at? }` | `{ meeting }` |

### 5.6 Files

| Method | Endpoint | Purpose | Request | Response |
|---|---|---|---|---|
| POST | `/api/files/sign-upload` | Get signed upload URL | `{ file_name, file_type, size_bytes, context }` | `{ uploadUrl, file_id, storage_path }` |
| POST | `/api/files/confirm` | Confirm upload complete | `{ file_id }` | `{ file }` |
| GET | `/api/files/:id/url` | Get signed download URL | — | `{ url, expiresAt }` |

### 5.7 Payments & Wallet

| Method | Endpoint | Purpose | Request | Response |
|---|---|---|---|---|
| POST | `/api/payments/order` | Create Razorpay order (fund task) | `{ task_id, proposal_id }` | `{ razorpay_order_id, amount, key }` |
| POST | `/api/payments/verify` | Verify payment signature | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` | `{ success, escrow_status }` |
| POST | `/api/webhooks/razorpay` | **Public** webhook receiver (signature-verified) | Razorpay event payload | `200 OK` |
| GET | `/api/wallet` | Get wallet | — | `{ balance, locked_balance }` |
| POST | `/api/wallet/withdraw` | Request payout | `{ amount, account_ref }` | `{ transaction }` |
| GET | `/api/transactions` | Transaction history | query: `type, cursor, limit` | `{ transactions[], nextCursor }` |

### 5.8 Reviews & Reputation

| Method | Endpoint | Purpose | Request | Response |
|---|---|---|---|---|
| POST | `/api/tasks/:id/reviews` | Submit review | `{ reviewee_id, rating, comment }` | `{ review }` |
| GET | `/api/profile/:userId/reviews` | List user reviews | query: `cursor, limit` | `{ reviews[], nextCursor }` |

### 5.9 Leaderboard & Ranking

| Method | Endpoint | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/api/leaderboard` | Fetch top-ranked workers | query: `period=weekly\|monthly\|all_time, cursor, limit` | `{ entries:[{ rank, user, performance_score, average_rating, completed_tasks, badges[] }], nextCursor }` |
| GET | `/api/leaderboard/category/:skill` | Fetch category-wise ranking | query: `period, cursor, limit` | `{ category, entries[], nextCursor }` |
| GET | `/api/leaderboard/me` | Own rank, score & stats | query: `period?, category?` | `{ rank, performance_score, stats, percentile }` |
| GET | `/api/profile/:userId/achievements` | List a user's achievement badges | — | `{ achievements:[{ badge_name, earned_date }] }` |
| POST | `/api/admin/leaderboard/recalculate` | **Admin/internal** trigger full recompute + re-rank | `{ period?, category? }` | `{ updated, durationMs }` |

> Scores/ranks are maintained by the ranking engine (event-driven on completion/review + scheduled refresh); these endpoints are **read-mostly**. The recalculate endpoint is admin/cron-only.

### 5.10 Disputes & Reports

| Method | Endpoint | Purpose | Request | Response |
|---|---|---|---|---|
| POST | `/api/disputes` | Raise dispute | `{ task_id, reason, evidence }` | `{ dispute }` |
| GET | `/api/disputes/:id` | Dispute detail | — | `{ dispute }` |
| POST | `/api/disputes/:id/evidence` | Add evidence | `{ file_ids[], note }` | `{ dispute }` |
| POST | `/api/reports` | Report user/task | `{ type, against_user?, task_id?, reason }` | `{ report }` |

### 5.11 Notifications

| Method | Endpoint | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/api/notifications` | List notifications | query: `unread, cursor, limit` | `{ notifications[], nextCursor }` |
| POST | `/api/notifications/read` | Mark as read | `{ ids[] }` or `{ all:true }` | `{ success }` |

### 5.12 Admin

| Method | Endpoint | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/api/admin/users` | List/search users | query | `{ users[] }` |
| PATCH | `/api/admin/users/:id` | Verify/suspend/ban | `{ action, reason? }` | `{ user }` |
| GET | `/api/admin/disputes` | List disputes | query | `{ disputes[] }` |
| POST | `/api/admin/disputes/:id/resolve` | Resolve dispute | `{ resolution, note }` | `{ dispute, transactions[] }` |
| GET | `/api/admin/payouts` | Oversee payouts | query | `{ payouts[] }` |
| POST | `/api/admin/badges/grant` | Grant badge | `{ user_id, badge_id }` | `{ user_badge }` |
| GET | `/api/admin/analytics` | Platform metrics | query: `range` | `{ gmv, users, completionRate, disputeRate }` |

---

## 6. Frontend Specification

### 6.1 Pages (Next.js App Router)
| Route | Render | Access | Responsibility |
|---|---|---|---|
| `/` | SSR/ISR | Public | Marketing/landing |
| `/login` | CSR | Public | Google OAuth entry |
| `/onboarding` | CSR | Auth | OTP + profile completion |
| `/dashboard` | CSR | Auth | Overview, quick actions, stats |
| `/tasks` | SSR+CSR | Auth | Browse/search/filter |
| `/tasks/new` | CSR | Auth | Create task form |
| `/tasks/[id]` | SSR+CSR | Auth | Detail, proposals, chat entry, status |
| `/tasks/[id]/edit` | CSR | Owner | Edit task |
| `/my-tasks` | CSR | Auth | Posted tasks management |
| `/my-work` | CSR | Auth | Proposals + assigned work |
| `/chat` / `/chat/[taskId]` | CSR | Participants | Conversations |
| `/wallet` | CSR | Auth | Balance, add money, withdraw, history |
| `/profile` / `/profile/[id]` | CSR/SSR | Auth/Public-ish | Own/public profile |
| `/leaderboard` | SSR+CSR | Auth | Weekly/Monthly/All-time leaderboards |
| `/leaderboard/[category]` | SSR+CSR | Auth | Category-based ranking |
| `/dashboard/performance` | CSR | Auth | Personal performance & ranking dashboard |
| `/notifications` | CSR | Auth | Notification center |
| `/disputes` / `/disputes/[id]` | CSR | Participants | Dispute management |
| `/admin/*` | CSR | Admin | Governance dashboards |
| `/settings` | CSR | Auth | Account settings |

### 6.2 Core Components
- **Layout:** `AppShell`, `Navbar`, `Sidebar`, `MobileNav`, `Footer`.
- **Auth:** `GoogleLoginButton`, `OtpInput`, `ProtectedRoute`.
- **Task:** `TaskCard`, `TaskForm`, `TaskDetail`, `TaskStatusBadge`, `CategoryPicker`, `BudgetInput`, `DeadlinePicker`.
- **Discovery:** `SearchBar`, `FilterPanel`, `SortDropdown`, `Pagination`.
- **Proposal:** `ProposalForm`, `ProposalCard`, `ProposalList`, `AcceptProposalModal`.
- **Chat:** `ChatWindow`, `MessageBubble`, `MessageInput`, `ChatList`.
- **Files:** `FileUploader`, `FilePreview`, `AttachmentList`.
- **Submission:** `SubmissionForm`, `SubmissionReview`, `RevisionModal`.
- **Payment/Wallet:** `RazorpayCheckout`, `WalletCard`, `TransactionTable`, `WithdrawModal`.
- **Reputation:** `RatingStars`, `ReviewForm`, `ReviewList`, `BadgeChip`.
- **Leaderboard:** `LeaderboardTable`, `WorkerRankingCard`, `LeaderboardTabs` (weekly/monthly/all-time), `CategoryLeaderboard`, `AchievementBadge`, `PerformanceDashboard`, `RankProgress`.
- **Notifications:** `NotificationBell`, `NotificationList`, `Toast`.
- **Dispute:** `DisputeForm`, `EvidenceUploader`, `DisputeTimeline`.
- **Admin:** `UserTable`, `DisputePanel`, `AnalyticsCards`, `PayoutTable`.
- **Common:** `Modal`, `Button`, `Input`, `Skeleton`, `EmptyState`, `Avatar`, `ConfirmDialog`.

### 6.3 Layout Structure
```
<RootLayout>
  <AuthProvider> (Supabase session)
   <RealtimeProvider> (subscriptions: notifications, active chat)
     <AppShell>
       <Navbar /> (logo, search, notifications, wallet, avatar)
       <Sidebar /> (Dashboard, Tasks, My Work, Chat, Wallet, Profile)
       <main>{page content}</main>
       <ToastContainer />
     </AppShell>
   </RealtimeProvider>
  </AuthProvider>
</RootLayout>
```
- Mobile: sidebar collapses to bottom `MobileNav`.

### 6.4 UI Responsibilities
- **Presentation only** — no business rules duplicated as the sole gate.
- Optimistic updates for chat/notifications.
- Skeleton loaders + empty states for every async view.
- Client-side validation mirrors server validation (UX), never replaces it.
- Accessibility: semantic HTML, keyboard nav, ARIA on interactive components.
- Responsive, mobile-first (Tailwind breakpoints).

---

## 7. Backend Specification

### 7.1 Layered Structure
```
Controller (route handler)  → parse/auth/validate/respond
  → Service (business logic) → orchestrate rules, state machines
    → Repository (data access) → Supabase queries (RLS-aware)
      → Database (Postgres)
External adapters: RazorpayClient, StorageClient, RealtimePublisher
```

### 7.2 Modules & Services
| Module | Service responsibilities | Key DB operations |
|---|---|---|
| **auth** | OTP send/verify, session guards, role resolution | read `users`, update `phone_verified` |
| **profiles** | profile CRUD, skills, verification requests | CRUD `profiles`, `user_skills` |
| **tasks** | task CRUD, status state machine, search/filter | CRUD `tasks`, `task_attachments` |
| **proposals** | bid create/withdraw, accept (lock task, init escrow) | CRUD `applications`, transactional accept |
| **submissions** | submit work, approve (release), revision | CRUD `submissions`, update `tasks` |
| **chat** | message persistence, realtime publish, read receipts | CRUD `chats`, `messages` |
| **meetings** | propose/accept/reschedule | CRUD `meetings` |
| **files** | signed upload/download, metadata, validation | CRUD `files`, Storage |
| **payments** | order creation, signature verify, webhook, escrow SM, payouts | CRUD `payments`, `transactions` |
| **wallet** | balance, holds, releases, withdrawals | update `wallets`, append `transactions` |
| **reviews** | review create, rating aggregation | CRUD `reviews`, update `profiles` |
| **leaderboard** | performance-score calculation, rank ordering (period + category), achievement-badge granting, scheduled refresh | upsert `leaderboard`, insert `achievements`, read `reviews`/`tasks`/`submissions` |
| **badges** | grant/list badges | CRUD `badges`, `user_badges` |
| **disputes** | raise, evidence, admin resolution | CRUD `reports`, escrow adjustments |
| **notifications** | create + realtime dispatch + read | CRUD `notifications` |
| **admin** | moderation, user mgmt, analytics | cross-table reads, guarded writes |

### 7.3 Cross-Cutting Concerns
- **Guards:** `requireAuth`, `requireRole('admin')`, `requireOwnership(resource)`.
- **Validators:** schema validation (e.g., zod) per endpoint.
- **Transactions:** payment/escrow operations wrapped in DB transactions; idempotency keys.
- **Error handler:** central mapping to standard error envelope.
- **Logger/Audit:** structured logs; audit entries for money + admin actions.
- **Realtime publisher:** emits to Supabase channels on relevant mutations.

### 7.4 Critical Transactional Operations (must be atomic + idempotent)
1. **Accept proposal:** reject others, set selected, create payment order, set escrow pending.
2. **Payment captured (webhook):** mark payment captured → escrow HELD → lock wallet balance.
3. **Approve submission:** escrow HELD → RELEASED → credit worker wallet, record commission, complete task.
4. **Dispute resolution:** escrow → RELEASED/REFUNDED/PARTIAL with corresponding ledger entries.
5. **Withdrawal:** debit wallet, create payout, reconcile on webhook.

### 7.5 Ranking Engine (Leaderboard)
The leaderboard module is a **read-mostly projection** of trusted source data; writes happen only through the engine.

**Score calculation logic**
- For a worker, aggregate over **verified, completed-and-rated tasks** within the relevant window (weekly / monthly / all-time) and category scope:
  - `average_rating`, `total_reviews`, `positive_reviews` (≥ 4★), `completed_tasks`, `on_time_rate`, `success_rate`, `reliability_score`, verified-skill/badge count.
- Normalize each signal to 0–1, apply configured weights (see §2.20), apply diminishing returns to volume signals, and scale to a **0–100 `performance_score`**.
- Exclude reviews/tasks flagged as fraudulent or under open dispute.

**Score update system**
- **Event-driven:** on submission approval and review submission, enqueue a recompute for the affected worker (overall + their categories + all periods).
- **Scheduled refresh:** a cron job recomputes time-window boards (weekly/monthly) and re-ranks all boards (handles window rollover and decay).
- Recompute is **deterministic and idempotent** — re-running yields the same row; uses `UNIQUE(user_id, period, category)` upsert.

**Sorting, ranking & filtering**
- Rank assigned by `ORDER BY performance_score DESC, completed_tasks DESC, earliest_achiever`.
- Filter by `period`, `category`; paginate (cursor on `(performance_score, id)`).
- Leaderboard reads expose **worker-facing stats only** (never contact/financial fields).

**Achievement granting**
- After each recompute, evaluate badge thresholds (Rising Star, Top Performer, Fast Delivery, Trusted Worker) and insert into `achievements` (idempotent via `UNIQUE(user_id, badge_name)`); emit a "badge earned" notification.

---

## 8. Authentication Flow

```
1. User clicks "Continue with Google" → Supabase OAuth → Google consent.
2. On success, Supabase creates auth user + session (JWT).
3. App ensures a `users` row + empty `profiles` row exist (first login).
4. Redirect to /onboarding if profile incomplete or phone unverified.
5. Phone OTP:
   a. POST /api/auth/otp/send → provider sends SMS code.
   b. POST /api/auth/otp/verify → on success set users.phone_verified = true.
6. Profile completion (college, course, year, skills).
7. Account becomes fully active → /dashboard.
Session handling:
- Supabase JS client manages access/refresh tokens.
- Protected routes/middleware check session + role + completion.
- Server APIs verify JWT and resolve role/ownership before mutating.
```

**Guards & gating:**
- Transactional actions require `phone_verified = true`.
- Admin routes require `role = admin`.
- RLS ensures users only read/write their own rows.

---

## 9. Payment Flow

### 9.1 Funding (Escrow Hold)
```
1. Poster accepts a proposal → POST /api/payments/order
   → backend creates Razorpay order (bid_amount + commission), payment row (status=created, escrow=pending).
2. Client opens Razorpay Checkout with order_id.
3. User pays → Razorpay returns payment_id + signature to client.
4. POST /api/payments/verify → backend verifies signature server-side.
5. Razorpay sends webhook `payment.captured` → POST /api/webhooks/razorpay
   → verify webhook signature → idempotent update:
     payment.status=captured, escrow_status=held
     ledger: deposit(credit, payer) + hold
     wallet: lock funds; task.status=in_progress.
```

### 9.2 Release (on Approval)
```
6. Poster approves submission → POST /api/submissions/:id/approve
   → transactional:
     escrow held → released
     credit worker wallet (bid amount)
     record commission (platform)
     ledger: release(credit worker) + commission(debit)
     task.status=completed
   → notify both, prompt reviews.
```

### 9.3 Withdrawal (Payout)
```
7. Worker → POST /api/wallet/withdraw
   → debit wallet (validate balance), create payout via Razorpay Payouts
   → ledger: withdrawal(debit, pending)
   → webhook payout.processed → mark success (or failed → reverse).
```

### 9.4 Refund / Dispute
```
- Cancel before work or dispute-for-poster:
  escrow held → refunded; Razorpay refund; ledger refund(credit payer).
- Partial resolution: split → partial release + partial refund ledger entries.
```

### 9.5 State Machines
```
Task:   draft → open → in_progress → submitted → completed
                              ↘ cancelled
              submitted → disputed → resolved → completed | cancelled
Escrow: pending → held → released
                       ↘ refunded
                       ↘ partial
```

**Guarantees:** signature verification (payment + webhook), idempotency keys, DB transactions, append-only ledger, reconciliation job (Razorpay vs ledger).

---

## 10. Chat and Notification Flow

### 10.1 Chat Flow
```
1. Proposal accepted → backend creates `chats` row for the task.
2. Both clients subscribe to Realtime channel `chat:{chatId}`.
3. Sender → POST /api/chats/:taskId/messages
   → validate participant → persist message → Realtime publishes insert.
4. Recipient receives live; UI renders bubble; read receipt → update read_at.
Access control: only poster + worker (and admin for disputes) via RLS.
```

### 10.2 Notification Flow
```
1. Business event occurs in a service (e.g., proposal accepted).
2. NotificationService.create({ user_id, type, title, body, payload }) (idempotent).
3. Realtime publishes to channel `notif:{userId}`.
4. Client updates bell badge + notification center live; toast if active.
5. GET /api/notifications / POST /api/notifications/read manage history.
```

**Notification triggers (subset):** new proposal, accepted/rejected, new message, work submitted/approved, revision requested, payment confirmed, payout processed, review received, dispute raised/resolved, badge granted.

**Realtime channels:** `chat:{chatId}`, `notif:{userId}`, optional `task:{taskId}` for status.

---

## 11. Validation Rules

### 11.1 General
- All inputs validated server-side (schema) before processing.
- Reject unknown fields; coerce/normalize types; trim strings.
- Money values: positive integers (paise), within min/max bounds.

### 11.2 Field-Level
| Entity | Rules |
|---|---|
| Profile | full_name 2–60 chars; year 1–6; college/course required non-empty; bio ≤ 500. |
| Phone/OTP | E.164 phone; OTP 6 digits; expiry ≤ 5 min; max 5 attempts. |
| Task | title 5–120; description 20–5000; budget ≥ ₹10 and ≤ ₹50,000 (configurable); deadline strictly future; valid category. |
| Proposal | bid_amount > 0 and ≤ budget×N (cap); message ≤ 1000; not own task; task must be open. |
| Submission | at least content or one file; only assigned worker. |
| Message | content ≤ 2000 or a valid file; participant only. |
| File | allowed mime types; size ≤ 10 MB; valid context. |
| Review | rating 1–5 integer; comment ≤ 1000; only after completion; one per pair. |
| Withdraw | amount ≤ balance; amount ≥ min payout. |
| Meeting | scheduled_at future; valid mode. |

### 11.3 Business-Rule Validation
- One accepted proposal per task (DB + service).
- Status transitions must be allowed by the state machine.
- Escrow operations validated against current escrow_status.
- No self-dealing (poster ≠ worker on same task).

### 11.4 Leaderboard Integrity Rules
- Only **verified, completed tasks with genuine ratings** contribute to scores.
- Reviews flagged as fake/collusive or tasks under open dispute are **excluded** from aggregation.
- A poster–worker pair's repeated transactions are weighted/capped to limit rating-ring inflation.
- Score recomputation is deterministic and idempotent; rank ties broken deterministically.
- Leaderboard responses must not expose private fields (email, phone, wallet, transactions).

---

## 12. Error Handling

### 12.1 Error Envelope
```
{ "success": false, "error": { "code": "TASK_NOT_OPEN", "message": "Human readable", "details": {} } }
```

### 12.2 HTTP Status Mapping
| Status | Use |
|---|---|
| 400 | Validation error |
| 401 | Unauthenticated |
| 403 | Authenticated but not permitted (role/ownership) |
| 404 | Resource not found / not visible |
| 409 | Conflict (e.g., already accepted, duplicate bid) |
| 422 | Business-rule violation |
| 429 | Rate limit exceeded |
| 500 | Unexpected server error |
| 502/503 | Upstream (Razorpay/Supabase) failure |

### 12.3 Error Categories & Codes (examples)
- Auth: `UNAUTHENTICATED`, `PHONE_NOT_VERIFIED`, `FORBIDDEN`.
- Task: `TASK_NOT_OPEN`, `INVALID_STATUS_TRANSITION`, `NOT_TASK_OWNER`.
- Proposal: `DUPLICATE_PROPOSAL`, `CANNOT_BID_OWN_TASK`, `ALREADY_ACCEPTED`.
- Payment: `SIGNATURE_INVALID`, `WEBHOOK_INVALID`, `INSUFFICIENT_BALANCE`, `ESCROW_STATE_INVALID`.
- Files: `FILE_TOO_LARGE`, `UNSUPPORTED_TYPE`.

### 12.4 Principles
- Never leak internal details/stack traces to clients.
- Log full context server-side (with correlation id).
- Payment/webhook errors: return safe responses, retry-safe, alert on repeated failures.
- Graceful UI: friendly messages + retry where applicable.

---

## 13. Security Implementation

### 13.1 AuthN/AuthZ
- Supabase Auth (Google OAuth) + phone OTP second factor.
- **RLS on every table** as primary data guard.
- Server-side `requireAuth` / `requireRole` / `requireOwnership` on all mutations.
- Separate keys: anon key (client), service role key (server-only, never shipped to browser).

### 13.2 Payment Security
- Verify Razorpay signatures (checkout + webhook) server-side.
- Idempotent webhook processing (dedupe by event/payment id).
- Atomic ledger transactions; append-only; reconciliation.
- Money as integer paise.

### 13.3 Data Protection
- Contact info hidden until acceptance (RLS + API gating).
- Signed URLs for storage; access scoped to participants.
- Input validation + output encoding (XSS prevention).
- Parameterized queries via Supabase client (no string-built SQL).

### 13.4 Abuse Prevention
- Rate limiting: auth/OTP, task posting, proposals, messages.
- OTP throttling + expiry.
- Reporting + moderation + suspend/ban.
- Audit logs for admin + financial actions.
- **Leaderboard manipulation prevention:** only verified completed tasks + genuine ratings count; exclude flagged/collusive reviews; cap repeated same-pair transactions; detect rating rings and self-dealing; recompute server-side only (clients can never write scores/ranks).

### 13.5 Operational
- Secrets in env vars (Vercel/Supabase), not in repo.
- HTTPS enforced.
- Principle of least privilege for keys/roles.
- Dependency scanning; security headers (CSP, HSTS).

---

## 14. Folder Structure

```
campusgig/
├── app/                          # Next.js App Router
│   ├── (marketing)/page.tsx      # landing
│   ├── (auth)/login/
│   ├── onboarding/
│   ├── dashboard/
│   ├── tasks/[id]/, tasks/new/
│   ├── my-tasks/, my-work/
│   ├── chat/[taskId]/
│   ├── wallet/
│   ├── profile/[id]/
│   ├── leaderboard/[category]/
│   ├── notifications/
│   ├── disputes/[id]/
│   ├── admin/(users|disputes|payouts|analytics)/
│   └── api/                      # route handlers (controllers)
│       ├── auth/otp/(send|verify)/
│       ├── tasks/, proposals/, submissions/
│       ├── chats/, meetings/, files/
│       ├── payments/, wallet/, transactions/
│       ├── reviews/, disputes/, reports/, notifications/
│       ├── leaderboard/
│       ├── admin/
│       └── webhooks/razorpay/
├── components/                   # UI components (see §6.2)
│   ├── ui/                       # primitives
│   ├── task/, proposal/, chat/, payment/, profile/, admin/
├── lib/                          # backend + shared
│   ├── server/
│   │   ├── auth/                 # guards, OTP
│   │   ├── tasks/ proposals/ submissions/
│   │   ├── chat/ meetings/ files/
│   │   ├── payments/ wallet/ transactions/
│   │   ├── reviews/ badges/ disputes/ notifications/ admin/
│   │   ├── leaderboard/        # score engine, ranking, achievements
│   │   ├── db/                   # supabase clients, repositories
│   │   └── shared/               # validators, errors, constants, utils
│   ├── realtime/                 # channel helpers
│   ├── razorpay/                 # client adapter
│   └── types/                    # shared TS types
├── hooks/                        # React hooks (useAuth, useRealtime, useWallet)
├── middleware.ts                 # route protection
├── public/
├── styles/                       # tailwind globals
├── tests/                        # unit/integration/e2e
├── supabase/                     # migrations, RLS policies, seed
│   ├── migrations/
│   └── policies/
├── .env.example
├── PLAN.md
├── SPEC.md
└── README.md
```

---

## 15. Deployment Structure

### 15.1 Hosting
- **Frontend + API:** Vercel (Next.js). Auto CI/CD on git push; preview deployments per PR.
- **Database/Auth/Storage/Realtime:** Supabase (managed).
- **Payments:** Razorpay (test in non-prod, live in prod).

### 15.2 Environments & Config
| Variable (examples) | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client | public, RLS-protected |
| `SUPABASE_SERVICE_ROLE_KEY` | server | secret, never client |
| `RAZORPAY_KEY_ID` | client/server | checkout |
| `RAZORPAY_KEY_SECRET` | server | secret |
| `RAZORPAY_WEBHOOK_SECRET` | server | webhook verify |
| `OTP_PROVIDER_KEY` | server | SMS provider |

### 15.3 Pipeline
```
git push → Vercel build (lint, typecheck, test) → preview deploy
merge to main → production deploy
Supabase migrations applied via CI (supabase db push) before app deploy.
Webhook endpoints registered in Razorpay dashboard per environment.
```

### 15.4 Operational Concerns
- DB migrations versioned in `supabase/migrations`.
- Rollback via Vercel deployments + migration down scripts.
- Monitoring: Vercel analytics/logs; Supabase logs; error tracking (e.g., Sentry).
- Backups: Supabase automated DB backups.

---

## 16. Testing Strategy

### 16.1 Test Levels
| Level | Scope | Tools (indicative) |
|---|---|---|
| **Unit** | services, validators, state machines, money math | Vitest/Jest |
| **Integration** | API routes + DB (against test Supabase), RLS policies | Jest + Supabase test project |
| **E2E** | critical user journeys in browser | Playwright/Cypress |
| **Contract** | Razorpay webhook handling (mock events) | Jest + fixtures |
| **Security** | RLS enforcement, authz guards | targeted integration tests |

### 16.2 Critical Test Cases (must-have)
- Auth: OAuth login, OTP verify, gating of unverified users.
- Tasks: create/edit/delete permissions, status transitions (valid + invalid).
- Proposals: duplicate bid blocked, can't bid own task, single acceptance under concurrency.
- Payments: order creation, signature verify, **idempotent webhook**, escrow hold→release→refund, ledger correctness, balance never negative.
- Submissions: only assigned worker submits; approval releases funds exactly once.
- Disputes: freeze funds, partial/refund/release ledger correctness.
- RLS: user A cannot read/modify user B's tasks, wallet, chats.
- Wallet: withdrawal blocked above balance; locked vs available balance.
- Leaderboard: score computation deterministic & idempotent; only verified completed+rated tasks counted; flagged/collusive reviews excluded; rank tie-breaking; clients cannot write scores/ranks; achievement thresholds grant exactly once.

### 16.3 Practices
- Money and escrow logic = highest coverage priority.
- Idempotency tests (replay webhooks).
- Seed/fixtures for deterministic tests.
- CI gate: lint + typecheck + unit + integration must pass before deploy.
- Manual QA checklist before each release (mobile + desktop).

---

## 17. Future Enhancement Plan

| Area | Enhancement |
|---|---|
| **Intelligence** | AI task↔worker recommendations, smart budget suggestions, auto-categorization, fraud detection. |
| **Reach** | Multi-campus + inter-campus scoping; localization & multi-currency. |
| **Mobile** | PWA / React Native app with push notifications and offline support. |
| **Reputation** | Skill assessments/tests, response-time & completion-rate scoring, portable reputation. |
| **Leaderboard** | AI-based ranking (fraud-resistant, momentum/consistency weighting), seasonal competitions, rewards system (cashback, fee discounts, featured placement). |
| **Payments** | Fully automated payouts, subscription tiers, featured listings monetization, multiple gateways. |
| **Collaboration** | Team/group gigs, milestone-based payments. |
| **Disputes** | AI-assisted evidence summaries and triage. |
| **Notifications** | Email + web push + SMS channels with user preferences. |
| **Analytics** | User-facing earnings/demand dashboards; admin BI. |
| **Integrations** | College SSO, calendar apps, e-signature for deliverables. |

---

## Appendix — Engineering Principles

1. **Security at the data layer first** (RLS), API guards second, UI gating last.
2. **Money is sacred** — atomic, idempotent, append-only ledger, webhook-authoritative.
3. **State machines over ad-hoc flags** for task and escrow lifecycles.
4. **Validate everything server-side**; client validation is UX, not security.
5. **Ship MVP narrow and deep**, instrument from day one, iterate on evidence.

---

*End of SPEC.md*
