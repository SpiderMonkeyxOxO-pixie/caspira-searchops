<div align="center">

<img src="app/public/jarvis-icon.png" width="80" height="80" alt="Jarvis" />

# Jarvis — iGaming SEO Platform

**A self-hosted SEO command centre purpose-built for casino affiliates, sportsbook operators, and iGaming marketers.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ecf8e?logo=supabase)](https://supabase.com)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite)](https://vitejs.dev)

[Features](#features) · [Quick Start](#quick-start) · [Setup Guide](SETUP.md) · [API Keys](#api-keys) · [Architecture](#architecture)

</div>

---

## What is Jarvis?

Jarvis is an open-source SEO platform that brings all your tools into one place — keyword research, rank tracking, competitor analysis, technical audits, AI content generation, and Google Search Console / GA4 analytics — with a specific focus on the iGaming vertical (casino affiliates, sportsbook sites, and regulated markets across South and Southeast Asia).

Instead of paying for five different SaaS tools, you self-host Jarvis once and connect your own API keys. **Your data stays in your own database. Your credentials never leave your browser.**

**Who it's for:**
- iGaming SEO agencies managing multiple casino or sportsbook domains
- In-house SEO teams at affiliate publishers and tier-1 operators
- Freelancers who want a professional-grade platform without monthly SaaS fees

---

## Features

### Analytics & Data

| Section | What it does |
|---|---|
| **Dashboard** | Per-site overview — traffic trend, keyword count, open issues, and quick action shortcuts |
| **Agency View** | Portfolio dashboard — all your domains in one table with health scores and issue counts |
| **Google Search Console** | OAuth-connected GSC data — clicks, impressions, CTR, average position, keyword table, date range filters (7d / 28d / 3m) |
| **GA4 Analytics** | OAuth-connected GA4 — sessions, pageviews, bounce rate, top pages, 7d / 28d / 90d / 6m ranges |
| **GSC × GA4 Cross-View** | Combines both sources — surfaces pages with high impressions but low traffic so you can prioritise fixes |
| **Keywords** | Your tracked keyword positions from Google Search Console |

### Keyword & Competitor Research

| Section | What it does |
|---|---|
| **Keyword Explorer** | Enter a seed keyword — pulls related queries via Serper, then enriches each result with search volume, keyword difficulty, and CPC from DataForSEO |
| **Answer the Public** | Generates question-based keyword clusters (who / what / where / when / why) around any topic — powered by DataForSEO or AI |
| **Intent Analyzer** | Paste a list of URLs or keywords and classify each as Informational, Commercial, Transactional, or Navigational |
| **Clustering** | Groups a keyword list into semantic topic clusters — useful for silo planning |
| **Content Gap** | Compares your site against up to three competitors and surfaces keywords they rank for that you don't |
| **Content Spy** | Analyses a competitor's top-ranking pages — keyword density, structure, and estimated traffic |
| **Site Explorer** | Full domain analysis via DataForSEO — organic traffic estimate, top keywords, backlink count, and traffic history chart |
| **Competitors** | Side-by-side comparison of up to 5 domains — Domain Rating, organic traffic, keyword count, backlinks |
| **Backlinks** | Backlink profile for any domain — total count, referring domains, anchor text breakdown (via DataForSEO) |
| **Outrank Blueprint** | AI-generated gap analysis vs a target competitor — content gaps, link gaps, on-page fixes, and a 12-week action plan |
| **Topical Map** | Builds a complete topical authority map for a niche — pillar topics, sub-topics, supporting pages |

### Rank Tracking & SERP

| Section | What it does |
|---|---|
| **Rank Tracker** | Tracks keyword positions over time with trend charts and location support |
| **Update SERP** | Spot-checks live Google positions for a list of keywords against your domain |
| **SERP Features** | Detects which SERP features your pages trigger (featured snippets, PAA, image packs, local packs) |
| **SERP Simulator** | Previews exactly how your title tag and meta description appear in Google search results |

### AI-Powered Content Tools

| Section | What it does |
|---|---|
| **Jarvis AI** | Full-screen AI assistant with iGaming SEO context — supports Claude and OpenRouter models. Floating widget available from every section. Includes White-hat / Gray-hat / Black-hat strategy modes |
| **Article Writer** | Generates long-form SEO articles with outline control — section headings, word count target, keyword density |
| **Bulk Meta Writer** | Generates optimised title tags and meta descriptions for a list of URLs at once |
| **Content Grader** | Scores existing content against SEO best practices and provides specific improvement suggestions |
| **Content Plan** | AI-powered content brief generator — target audience, search intent, outline, internal links, CTA |
| **Auto-Refresh** | Detects content on declining pages that is outdated and rewrites stale sections with current data |
| **FAQ Generator** | Produces FAQ schema-ready Q&A blocks from a URL or keyword |
| **Site Roaster** | Gives a brutally honest AI critique of your site's SEO — covers content, technical, UX, and trust signals |

### Technical SEO

| Section | What it does |
|---|---|
| **Technical SEO** | Core Web Vitals scores, PageSpeed Insights audit, and a crawlability checklist via the PSI API |
| **Site Audit** | Crawls your site and checks title tags, meta descriptions, H1s, canonicals, noindex tags, broken images, and duplicate content |
| **JS SEO Checker** | Identifies JavaScript rendering issues that prevent Google from indexing your content |
| **Log Analyzer** | Parses server access logs to show Googlebot crawl frequency and where your crawl budget is being wasted |
| **Hreflang Builder** | Generates and validates hreflang tags for multilingual sites — exports as HTML snippet or XML sitemap |
| **Redirect Manager** | Manages 301 / 302 / 410 redirect rules, detects redirect chains, and exports .htaccess or Nginx config |
| **Robots.txt Editor** | Live editor with syntax validation for your robots.txt file |
| **Sitemap Generator** | Builds XML sitemaps with configurable priority and change frequency |

### Content & Strategy

| Section | What it does |
|---|---|
| **Content Calendar** | Month-view editorial calendar — plan publish dates, assign writers, track deadlines |
| **Content Pipeline** | Multi-stage publishing workflow with status tracking (idea → draft → review → published) |
| **Social Snippets** | Auto-generates social media posts from a published URL — Twitter/X, LinkedIn, Facebook |
| **Image Builder** | Generates SEO-optimised image metadata (filenames, alt text, titles) and social share image previews |
| **Link Suggester** | Recommends internal linking opportunities based on topical relevance between your pages |
| **Link Map** | Visualises your internal link structure — identifies pillar pages, cluster pages, and orphan pages |
| **Schema Builder** | JSON-LD generator for structured data — Article, FAQ, BreadcrumbList, Organization, LocalBusiness |
| **E-E-A-T Audit** | Reviews your pages for Experience, Expertise, Authoritativeness, and Trust signals — critical for YMYL/iGaming |
| **SERP Features** | Shows which SERP features each page is triggering and what you'd need to win more |

### Reporting & Roadmap

| Section | What it does |
|---|---|
| **12-Month Roadmap** | Timeline view of SEO milestones, sprint goals, and deliverables |
| **Report Scheduler** | Schedules automated PDF / email reports on a daily / weekly / monthly cadence |
| **Case Study Builder** | Structured templates for client-facing case studies — before/after metrics, timeline, results |
| **AI Visibility** | Tracks how your brand appears in AI-generated search answers (ChatGPT, Gemini, Perplexity) |
| **SEO News** | Live feed from Google Search Central, Search Engine Land, Search Engine Journal, Moz, Ahrefs, SEMrush — with browser push notifications |
| **ROI Calculator** | Calculates estimated traffic value, lead value, and conversion projections from rank improvements |

### Platform & Integrations

| Section | What it does |
|---|---|
| **Team Management** | Multi-user workspace — invite members by email, assign roles, configure per-role section access |
| **WordPress Sites** | Publish content drafts directly to WordPress via Application Passwords |
| **Crawl Import** | Import CSV exports from Screaming Frog or Sitebulb for offline analysis |
| **API Sync** | Import keyword and backlink data from Ahrefs or SEMrush CSV exports |
| **Index Now** | Submit URLs to Bing / IndexNow instantly after publishing |
| **Shareable Links** | Generate read-only dashboard links to share with clients without giving them an account |
| **Onboarding** | Step-by-step setup wizard for entering API keys and configuring your workspace |

---

## Quick Start

Full step-by-step instructions are in [SETUP.md](SETUP.md). The short version:

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/jarvis.git
cd jarvis

# 2. Install dependencies
cd app && npm install

# 3. Start the dev server
npm run dev
```

Open `http://localhost:5173`, complete the onboarding, and enter your API keys via **Settings**.

> **First time?** You'll need to create a free Supabase project, run 11 SQL migrations in the Supabase SQL Editor, and deploy 9 Edge Functions. [SETUP.md](SETUP.md) walks through every step — it takes about 15–20 minutes.

**Minimum to get started:** Just the Supabase URL and Anon Key. All other API keys are optional — features gracefully degrade or fall back to AI estimates when a key isn't present.

---

## API Keys

All keys are entered in the **Settings modal** inside the app and stored only in your browser's `localStorage`. Nothing is sent to any shared server.

| Key | What it unlocks | Free tier? | Where to get it |
|---|---|---|---|
| Supabase URL + Anon Key | Auth, database, all API proxies | Yes (generous) | [supabase.com](https://supabase.com) |
| Google Client ID | GSC + GA4 OAuth sign-in | Yes | [Google Cloud Console](https://console.cloud.google.com) |
| OpenRouter API Key | All AI features (recommended — many free models) | Yes | [openrouter.ai/keys](https://openrouter.ai/keys) |
| Anthropic API Key | Claude-specific AI features | No | [console.anthropic.com](https://console.anthropic.com) |
| DataForSEO Credentials | Site Explorer, Backlinks, Competitors, Keyword Explorer enrichment | ~$0.001/call | [dataforseo.com](https://dataforseo.com) |
| Serper API Key | Rank Tracker, Keyword Explorer (search results) | 2,500 free/month | [serper.dev](https://serper.dev) |
| Open PageRank Key | Domain Rating (DR) scores | Yes | [domcop.com/openpagerank](https://www.domcop.com/openpagerank) |
| PageSpeed Insights Key | Site Audit speed scores | Yes | [Google Cloud Console](https://console.cloud.google.com) |

---

## Architecture

```
Your Browser (React + Zustand)
       │
       │  Direct calls (auth, database reads/writes)
       ▼
Your Supabase Project
       ├── PostgreSQL Database
       │     └── Sites, tasks, schedules, GSC tokens, GA4 tokens, crawl results
       ├── Auth
       │     └── Email/password sign-up, session management, team invites
       └── Edge Functions  (small CORS proxy scripts — run in your project, not ours)
             ├── dataforseo-proxy  → DataForSEO API
             ├── opr-proxy         → Open PageRank API
             ├── gsc-auth          → Google OAuth (Search Console)
             ├── gsc-proxy         → Google Search Console Data API
             ├── ga4-auth          → Google OAuth (Analytics)
             ├── ga4-proxy         → Google Analytics Data API
             ├── site-crawl        → Site Audit crawler
             ├── news-proxy        → SEO news RSS feeds
             └── send-invite       → Team invite emails
```

### Why is there a Supabase backend?

Browsers can't call most external APIs directly due to CORS restrictions. Instead of building a traditional server that stores your API credentials, Jarvis routes those calls through **Edge Functions that live inside your own Supabase project**. Your DataForSEO password, Serper key, and Google tokens are passed from your browser directly to your own function — they never touch any shared Jarvis server and are never logged or persisted.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [React 19](https://react.dev) + [Vite 8](https://vitejs.dev) |
| Language | [TypeScript 6](https://www.typescriptlang.org) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| State | [Zustand 5](https://zustand-demo.pmnd.rs) — persisted to `localStorage` |
| Data fetching | [TanStack Query v5](https://tanstack.com/query) |
| Backend / DB | [Supabase](https://supabase.com) — Postgres + Edge Functions (Deno) |
| Charts | [Recharts 3](https://recharts.org) |
| Icons | [Lucide React](https://lucide.dev) |
| AI | Anthropic Claude, OpenRouter (any model) |
| PDF export | [jsPDF](https://github.com/parallax/jsPDF) + [html-to-image](https://github.com/bubkoo/html-to-image) |

---

## Project Structure

```
jarvis/
├── app/                          # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/           # Sidebar, TopBar, SettingsModal, JarvisWidget
│   │   │   ├── sections/         # One file per tool/section (~65 sections)
│   │   │   ├── auth/             # Login page, org creation wizard
│   │   │   └── ui/               # Reusable components (Card, Button, Badge, etc.)
│   │   ├── lib/                  # supabase.ts, ai.ts, dataforseo.ts, csv.ts, utils.ts
│   │   ├── store/                # Zustand store (API keys, settings, active section)
│   │   └── types/                # TypeScript types
│   ├── public/                   # Static assets
│   └── .env.example
│
├── supabase/
│   ├── functions/                # 9 Deno Edge Functions (CORS proxies)
│   │   ├── dataforseo-proxy/
│   │   ├── opr-proxy/
│   │   ├── gsc-auth/
│   │   ├── gsc-proxy/
│   │   ├── ga4-auth/
│   │   ├── ga4-proxy/
│   │   ├── site-crawl/
│   │   ├── news-proxy/
│   │   └── send-invite/
│   ├── 001_jarvis_schema.sql     # Core tables + RLS policies
│   ├── 002_fix_rls_recursion.sql
│   ├── 003_confirm_user.sql
│   ├── 004_create_org_rpc.sql
│   ├── 005_data_tables.sql
│   ├── 005b_fix_policies.sql
│   ├── 006_gsc_tables.sql
│   ├── 006b_fix_gsc_policies.sql
│   ├── 007_get_my_org_rpc.sql
│   ├── 008_ga4_tables.sql
│   └── 009_crawl_tables.sql
│
├── README.md
├── SETUP.md
└── .gitignore
```

---

## Self-Hosting Philosophy

- **No telemetry** — no phone-home, no analytics, no usage tracking of any kind
- **No shared backend** — every deployment uses its own Supabase project
- **No credential storage on any server** — all API keys live in `localStorage` only
- **No subscription fees** — runs forever on Supabase's free tier (upgrade only if you need more DB storage or Edge Function invocations)
- **CORS proxies, not credential stores** — Edge Functions forward your requests to external APIs and return the response; they don't log, cache, or store anything

---

## Roles & Permissions

Jarvis supports multi-user workspaces with role-based access control (RBAC).

| Role | Access level |
|---|---|
| **Owner** | Full access to everything — settings, billing, team management |
| **Admin** | Full access by default, configurable by Owner |
| **SEO Specialist** | Keyword research, AI tools, content, rank tracking, GSC |
| **Technical** | Technical SEO, integrations, site audits, crawl tools |
| **Content Writer** | Article writer, content calendar, social snippets |
| **Viewer** | Dashboard, roadmap, news feed — read only |

Owners configure which sections each role can access via **Team Management → Permissions** — a checkbox matrix grouped by category. Changes apply instantly. The sidebar automatically shows only the sections each logged-in user has access to.

Team invites are sent by email. A copyable invite link is always shown as a fallback after sending.

---

## Contributing

Contributions are welcome. To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run `npm run build` inside `app/` to confirm TypeScript compiles clean
5. Open a pull request with a clear description of what changed and why

For bugs, please open an issue with the browser console output and the steps to reproduce.

---

## License

[MIT](LICENSE) — use it, fork it, build on it, sell services with it. No attribution required.
