# Turning Authentication ON — Step by Step

Follow these in order. Takes ~15 minutes. Until you finish, the app runs fine
with auth disabled (public pages work, login shows a "not configured" toast).

---

## Step 1 — Create a Supabase project

1. Go to **https://supabase.com** → sign in → **New project**.
2. Pick a name (e.g. `campusgig`), set a strong **database password** (save it), choose a region close to you.
3. Wait ~2 minutes for it to provision.

---

## Step 2 — Get your API keys

1. In your project: **Settings (gear) → API**.
2. Copy these two values:
   - **Project URL** → `https://xxxxxxxx.supabase.co`
   - **anon / public key** (under "Project API keys")
3. Also copy the **service_role key** (secret — you'll need it later for payments/admin).

---

## Step 3 — Run the database migration

1. In your project: **SQL Editor → New query**.
2. Open the file `supabase/migrations/0001_core_schema.sql` from this repo.
3. Copy its **entire contents**, paste into the SQL editor, click **Run**.
4. You should see "Success". This creates `users`, `profiles`, `wallets`, all
   RLS policies, and the signup trigger that auto-creates a profile + wallet for
   each new user.

> ✅ Verify: **Table Editor** should now list `users`, `profiles`, `wallets`.

---

## Step 4 — Create Google OAuth credentials

1. Go to **https://console.cloud.google.com** → create/select a project.
2. **APIs & Services → OAuth consent screen**:
   - User type: **External** → Create.
   - Fill app name (CampusGig), support email, developer email → Save.
   - (You can stay in "Testing" mode and add your own email as a test user.)
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - **Authorized JavaScript origins**: add
     - `http://localhost:3000`
   - **Authorized redirect URIs**: add your **Supabase** callback (NOT the app's):
     - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
     - (Find this exact URL in Supabase → Authentication → Providers → Google.)
   - Click **Create** → copy the **Client ID** and **Client secret**.

---

## Step 5 — Enable Google in Supabase

1. In Supabase: **Authentication → Providers → Google**.
2. Toggle **Enable**, paste the **Client ID** and **Client secret** from Step 4 → **Save**.
3. Go to **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs** (add): `http://localhost:3000/auth/callback`
   - (Later, add your production URLs too, e.g. `https://yourdomain.com/auth/callback`.)

---

## Step 6 — Add the keys to your app

1. In the project root, create `.env.local` (copy from `.env.example`):
   ```bash
   cp .env.example .env.local
   ```
2. Fill in at least these three:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```
3. Save. **Never commit `.env.local`** (it's already gitignored).

---

## Step 7 — Restart and test

1. Stop the dev server (Ctrl+C) and restart so it picks up the new env:
   ```bash
   npm run dev
   ```
2. Go to **http://localhost:3000/login** → click **Continue with Google**.
3. Sign in with your Google account (must be a test user if consent screen is in Testing mode).
4. You should land on **/onboarding** the first time → fill the form → **/dashboard**.

> ✅ Verify in Supabase: **Table Editor → profiles** should show your row with
> `onboarding_completed = true`, and **wallets** should have a row for you.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Authentication isn't configured" toast | `.env.local` missing keys, or server not restarted. |
| `redirect_uri_mismatch` (Google) | The Supabase callback URL in Step 4 must match **exactly** (Authentication → Providers → Google shows it). |
| Redirected back to `/login` | Add `http://localhost:3000/auth/callback` to Supabase **Redirect URLs** (Step 5). |
| Lands on `/onboarding` every login | The `profiles` row isn't getting `onboarding_completed=true` — confirm the migration ran and RLS update policy exists. |
| "Access blocked" by Google | Add your email under OAuth consent screen → **Test users**. |

---

## What to add for production later

- In Google + Supabase, add your real domain's origin and `/auth/callback` URL.
- Set `NEXT_PUBLIC_APP_URL` to your production URL on Vercel.
- Add all env vars to **Vercel → Project → Settings → Environment Variables**.
