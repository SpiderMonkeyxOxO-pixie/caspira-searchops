# Caspira SearchOps — Setup Guide

Follow these steps to get your own instance of Caspira SearchOps running. The whole process takes about 15–20 minutes.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A free [Supabase](https://supabase.com) account
- A web browser

---

## Step 1 — Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/jarvis.git
cd jarvis
```

---

## Step 2 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose a name (e.g. `jarvis-seo`), set a strong database password, pick the region closest to you
4. Wait ~2 minutes for the project to provision
5. Go to **Project Settings → API** and copy:
   - **Project URL** (looks like `https://xxxxxxxxxxxx.supabase.co`)
   - **anon / public** key (the long JWT string)

Keep these — you will paste them into the app in Step 6.

---

## Step 3 — Run the Database Migrations

All SQL files are in the `supabase/` folder. Run them **in order** using the Supabase SQL Editor:

1. In your Supabase dashboard, go to **SQL Editor → New Query**
2. Copy the contents of each file below, paste into the editor, and click **Run**

Run in this exact order:

| File | What it creates |
|---|---|
| `supabase/001_jarvis_schema.sql` | Core tables: profiles, organizations, members, invites + RLS policies |
| `supabase/002_fix_rls_recursion.sql` | Fixes a RLS policy recursion edge case |
| `supabase/003_confirm_user.sql` | Helper function to auto-confirm email on signup |
| `supabase/004_create_org_rpc.sql` | RPC function for creating organizations |
| `supabase/005_data_tables.sql` | Sites, tasks, schedules tables + RLS |
| `supabase/005b_fix_policies.sql` | Policy fix for the above |
| `supabase/006_gsc_tables.sql` | Google Search Console OAuth connection table |
| `supabase/006b_fix_gsc_policies.sql` | GSC policy fix |
| `supabase/007_get_my_org_rpc.sql` | RPC to fetch the current user's organization |
| `supabase/008_ga4_tables.sql` | Google Analytics 4 OAuth connection table |
| `supabase/009_crawl_tables.sql` | Site crawl jobs and per-page results tables |

After running the files above, run this one final statement to enable the RBAC permissions feature:

```sql
ALTER TABLE jarvis_organizations ADD COLUMN IF NOT EXISTS role_permissions JSONB DEFAULT '{}';
```

> **Tip:** If a migration fails because a table already exists, that's fine — just skip it and continue with the next one.

---

## Step 4 — Deploy the Edge Functions

Edge Functions are small server-side scripts that act as CORS proxies between your browser and external APIs (DataForSEO, Google, OpenPageRank, RSS feeds). You need to deploy them to your Supabase project.

### Option A — Supabase Dashboard (no CLI needed, recommended)

For each function in `supabase/functions/`:

1. Go to your Supabase dashboard → **Edge Functions → Deploy a new function**
2. Enter the function name (see table below)
3. Paste the contents of the corresponding `index.ts` file
4. Click **Deploy**

Repeat for all 9 functions:

| Function name | File | Purpose |
|---|---|---|
| `dataforseo-proxy` | `supabase/functions/dataforseo-proxy/index.ts` | DataForSEO API proxy (Site Explorer, Backlinks, Competitors) |
| `opr-proxy` | `supabase/functions/opr-proxy/index.ts` | Open PageRank Domain Rating proxy |
| `gsc-proxy` | `supabase/functions/gsc-proxy/index.ts` | Google Search Console data proxy |
| `gsc-auth` | `supabase/functions/gsc-auth/index.ts` | GSC OAuth token exchange |
| `ga4-proxy` | `supabase/functions/ga4-proxy/index.ts` | Google Analytics 4 data proxy |
| `ga4-auth` | `supabase/functions/ga4-auth/index.ts` | GA4 OAuth token exchange |
| `site-crawl` | `supabase/functions/site-crawl/index.ts` | Site Audit crawler |
| `news-proxy` | `supabase/functions/news-proxy/index.ts` | SEO News RSS feed aggregator (Google, SEL, SEJ, Moz, Ahrefs, SEMrush) |
| `send-invite` | `supabase/functions/send-invite/index.ts` | Team invite emails — uses Supabase Auth admin API, no extra keys needed |

> **Important:** After deploying each function, go to the function's settings and **turn off JWT verification** (toggle labelled "Verify JWT"). This is required because the browser calls these functions directly without a Supabase session token.
>
> **Exception:** `send-invite` should keep JWT verification **on** — it is called with the user's session token to verify the caller is authenticated.

### Option B — Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy dataforseo-proxy --no-verify-jwt
supabase functions deploy opr-proxy --no-verify-jwt
supabase functions deploy gsc-proxy --no-verify-jwt
supabase functions deploy gsc-auth --no-verify-jwt
supabase functions deploy ga4-proxy --no-verify-jwt
supabase functions deploy ga4-auth --no-verify-jwt
supabase functions deploy site-crawl --no-verify-jwt
supabase functions deploy news-proxy --no-verify-jwt
supabase functions deploy send-invite   # no --no-verify-jwt (needs auth)
```

Your project ref is the ID in your Supabase project URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

---

## Step 5 — Configure Supabase Authentication

### Redirect URLs (required for team invites)

1. Go to your Supabase dashboard → **Authentication → URL Configuration**
2. Under **Redirect URLs**, click **Add URL** and add:
   - `http://localhost:5173/**` (for local development)
   - Your production URL if deploying publicly (e.g. `https://yourdomain.com/**`)
3. Click **Save**

Without this, invite email links will be blocked by Supabase after the user clicks them.

### Email Delivery — Custom SMTP (recommended)

By default Supabase uses a shared email service that frequently lands in spam and has strict rate limits (2 emails/hour). For reliable delivery of confirmation and invite emails, configure a custom SMTP provider.

**Using Resend (free tier — 3,000 emails/month):**

1. Sign up at [resend.com](https://resend.com) → go to **API Keys** → create a key → copy it
2. In Supabase → **Authentication → Email → Enable Custom SMTP**, fill in:

| Field | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | *(your Resend API key)* |
| Sender email | `onboarding@resend.dev` *(or your verified domain)* |
| Sender name | `Caspira SearchOps` |

3. Click **Save changes**

**Using Gmail (free, no extra account needed):**

1. On your Google account → **Security → 2-Step Verification** → enable it
2. Search for **App passwords** → create one → copy the 16-character password
3. In Supabase → **Authentication → Email → Enable Custom SMTP**, fill in:

| Field | Value |
|---|---|
| Host | `smtp.gmail.com` |
| Port | `465` |
| Username | `your@gmail.com` |
| Password | *(your 16-character App Password)* |
| Sender email | `your@gmail.com` |
| Sender name | `Caspira SearchOps` |

**Troubleshooting "Error sending confirmation email" (500 on signup):**

- **Username for Resend must be the literal string `resend`** — not your email address or account name. Easy to mix up if you copy the Gmail row's pattern by habit.
- **Toggle "Enable custom SMTP" on**, not just filling in the fields below it — the fields save either way, but nothing sends unless the toggle is on.
- **Check the failure end-to-end**, not just Supabase's error message — Supabase's API response is deliberately generic (`"Error sending confirmation email"`), so the real reason (auth rejected, bad recipient, etc.) only shows in your SMTP provider's own logs (Resend: **Logs** in the left sidebar).
- **Don't test with `@example.com`, `@example.org`, or similar** — these are IANA-reserved documentation domains, and Resend permanently refuses to send to them regardless of your account or domain status. Test with a real address instead — a Gmail `+alias` (e.g. `you+test@gmail.com`) works well since it's a real, unique, deliverable address that still lands in your own inbox.
- **The shared `onboarding@resend.dev` sender only delivers to your own Resend account email** until you verify a domain you own (Resend → Domains → Add Domain, then add the DNS records it gives you). Verify a domain before expecting arbitrary users to be able to sign up.

---

## Step 6 — Install and Run the App

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Step 7 — Configure the App

On first launch you will see the **Onboarding** screen. Fill in your details here, or go to **Settings** (gear icon, top right) at any time.

### Backend (required)

In Settings → Backend:

| Field | Value |
|---|---|
| Backend URL | Your Supabase Project URL (from Step 2) |
| Backend Anon Key | Your Supabase anon/public key (from Step 2) |

Click **Save**, then **refresh the page** so the new Supabase connection takes effect.

### Google OAuth — GSC + GA4 (optional)

To connect Google Search Console and Google Analytics 4:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable **Google Search Console API** and **Google Analytics Data API**
3. Go to **APIs & Services → OAuth consent screen** → configure (External, add your email as test user)
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add your app URL to **Authorised JavaScript origins** (e.g. `http://localhost:5173`)
7. Add your app URL to **Authorised redirect URIs** (same URL)
8. Copy the **Client ID** and paste it into Settings → Google Client ID

### AI Features (optional but recommended)

At least one AI key is needed for all AI-powered features (Outrank Blueprint, Content Planner, Caspira AI, etc.):

| Provider | Where to get it | Setting field |
|---|---|---|
| OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys) | OpenRouter API Key |
| Anthropic Claude | [console.anthropic.com](https://console.anthropic.com) | Anthropic API Key |

OpenRouter is recommended — it gives access to many models including free tiers (DeepSeek, Llama).

### DataForSEO (optional — Site Explorer, Backlinks, Competitors)

1. Sign up at [dataforseo.com](https://dataforseo.com)
2. Get your login email and API password from the dashboard
3. In Settings → DataForSEO Credentials, enter: `your@email.com:your_api_password`

DataForSEO charges per query (~$0.001 per call). A typical session costs a few cents.

### Serper (optional — Rank Tracker, Keyword Explorer)

1. Sign up at [serper.dev](https://serper.dev)
2. Copy your API key
3. Paste into Settings → Serper API Key

### Open PageRank (optional — Domain Rating)

1. Sign up at [domcop.com/openpagerank](https://www.domcop.com/openpagerank/what-is-openpagerank)
2. Free API key available
3. Paste into Settings → Open PageRank Key

### PageSpeed Insights (optional — Site Audit)

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create an API Key → restrict it to **PageSpeed Insights API**
3. Paste into Settings → PageSpeed Insights Key

---

## Step 8 — Create Your Organisation

1. Sign up / log in with your email
2. Create an organisation (your company or brand name)
3. Add your primary domain in **Settings → Default Domain**
4. Invite team members from **Team Management** — they'll receive an invite email
5. Configure which sections each role can access via **Team Management → Permissions** (owner only)

---

## Troubleshooting

**Blank white screen on load**
- Open browser DevTools (F12) → Console. If you see a Supabase error, check your Backend URL and Anon Key in Settings.

**Edge function returns 401 / unauthorized**
- Make sure JWT verification is turned **off** for each deployed function.

**GSC / GA4 OAuth not working**
- Confirm your Google Cloud app's Authorised JavaScript origins includes your exact app URL (no trailing slash).
- Ensure both APIs are enabled in Google Cloud Console.

**DataForSEO returns no data**
- Check your credentials format is `email:password` (no spaces).
- Verify your DataForSEO account has a positive balance.

**Team invite email not received**
- Check the spam / Promotions folder first.
- If using Supabase's default email, set up custom SMTP (see Step 5) — the default service is unreliable.
- The invite link shown in the UI after sending always works as a fallback — copy it and share directly.

**Invite link "invalid or expired" error**
- Make sure your app URL is added to **Authentication → URL Configuration → Redirect URLs** in Supabase (see Step 5).
- Invites expire after 7 days. Revoke and re-send from Team Management → Pending Invites.

**Supabase migration fails**
- Run migrations one at a time. If a statement errors because the table already exists, skip that file.
- Some files (002, 005b, 006b) are fix-up patches — if the original created cleanly, these may show harmless errors.

---

## Updating

```bash
git pull
cd app && npm install
npm run dev
```

Check the `supabase/` folder for any new migration files and run them in the SQL Editor.
