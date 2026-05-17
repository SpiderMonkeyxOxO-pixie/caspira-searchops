<div align="center">

<img src="app/public/jarvis-icon.png" width="80" height="80" alt="Jarvis" />

# Jarvis — iGaming SEO Platform

**Open-source, self-hosted SEO command centre for iGaming, casino affiliate, and sports betting marketers.**

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

Jarvis is a full-featured SEO platform purpose-built for the iGaming vertical — casino affiliates, sportsbook operators, and performance marketers competing in regulated markets across South and Southeast Asia.

It aggregates Google Search Console, GA4, DataForSEO, Serper, and AI models into a single self-hosted dashboard. You own the data. You own the infrastructure. Your API keys never leave your browser.

**Who it's for:**
- iGaming SEO agencies managing multiple casino / sportsbook domains
- In-house SEO teams at tier-1 and tier-2 affiliates
- Freelancers who want a professional platform without SaaS subscription fees

---

## Features

### Core Analytics
| Section | Description |
|---|---|
| **Agency View** | Portfolio-level dashboard — all domains, health scores, traffic, issues at a glance |
| **Command Center** | Per-site overview: traffic trend, keyword count, issue alerts, quick-action shortcuts |
| **Site Audit** | Technical crawl — title tags, meta, H1s, canonicals, noindex, broken images, duplicate content |
| **Search Console** | OAuth-connected GSC — clicks, impressions, CTR, position charts, keyword table, 7d/28d/3m filters |
| **GA4 Analytics** | OAuth-connected GA4 — sessions, pageviews, bounce rate, top pages, 7d/28d/90d/6m date ranges |
| **GSC × GA4 Cross-View** | Merge both data sources — identify high-impression / low-traffic pages instantly |

### Competitive Intelligence
| Section | Description |
|---|---|
| **Site Explorer** | Full domain analysis via DataForSEO — organic traffic, keyword universe, backlink profile |
| **Keyword Explorer** | Search volume, KD, CPC, SERP breakdown, intent classification |
| **Competitors** | Side-by-side domain comparison — DR, organic traffic, top keywords, backlink count |
| **Answer the Public** | Question-based keyword discovery — who/what/where/when/why clusters |
| **Intent Analyzer** | Bulk URL intent classification — informational, commercial, transactional, navigational |

### Rank Tracking
| Section | Description |
|---|---|
| **Rank Tracker** | Track keyword positions over time with visual trend charts |
| **Update SERP** | Spot-check live SERP positions for any keyword |
| **12-Month Roadmap** | Timeline view of SEO milestones, deadlines, and deliverables |
| **SEO News** | Live feed from Google Search Central, Search Engine Land, SE Journal, Moz, Ahrefs, SEMrush — with browser notifications |

### AI-Powered Tools
| Section | Description |
|---|---|
| **Jarvis AI** | Full-screen AI assistant with iGaming SEO context, image analysis, floating widget available everywhere, White-hat / Gray-hat / Black-hat modes |
| **Outrank Blueprint** | AI-generated competitor gap analysis — content gaps, link gaps, on-page fixes, 12-week sprint plan |
| **Content Gap** | Surface missing content opportunities vs top competitors |
| **Content Spy** | Analyse competitor content — structure, word count, keyword density |
| **KW Clustering** | Semantic keyword grouping into topic clusters |
| **Bulk Meta Writer** | AI-generated title tags and meta descriptions at scale |
| **Site Roaster** | Brutally honest AI critique of your site's SEO |
| **Auto-Refresh** | AI-powered content refresher for declining pages |

### AI Depth Tools
| Section | Description |
|---|---|
| **Article Writer** | Long-form SEO article generator with outline control |
| **Content Grader** | Score existing content against SEO best practices |
| **Topical Map** | Build a complete topical authority map for any niche |
| **SERP Simulator** | Preview how your title and meta appear in Google results |
| **FAQ Generator** | Generate FAQ schema-ready Q&A blocks from any URL or keyword |

### Content Management
| Section | Description |
|---|---|
| **Content Plan** | Kanban-style content pipeline — ideas, writing, review, published |
| **Content Calendar** | Month-view editorial calendar with deadline tracking |
| **Content Pipeline** | Multi-stage workflow with team assignments |
| **Social Snippets** | Auto-generate social posts from published URLs |
| **Image Builder** | SEO-optimised image metadata generator |
| **Link Suggester** | Internal linking recommendations based on topical relevance |

### Technical SEO
| Section | Description |
|---|---|
| **Technical SEO** | Core Web Vitals, PSI scores, crawlability checklist |
| **Redirect Manager** | 301/302/410 rules, redirect chain detection, .htaccess / Nginx export |
| **Log Analyzer** | Parse server logs — Googlebot crawl frequency, crawl budget waste |
| **Hreflang Builder** | Generate and validate hreflang tags, export HTML or XML |
| **Robots.txt Editor** | Live editor with syntax validation |
| **Sitemap Generator** | XML sitemap builder with priority and change frequency controls |
| **JS SEO Checker** | Identify JavaScript rendering issues that block indexation |

### Strategy & Reporting
| Section | Description |
|---|---|
| **E-E-A-T Audit** | Evaluate Experience, Expertise, Authoritativeness, Trust signals |
| **Schema Builder** | JSON-LD generator — Article, FAQ, BreadcrumbList, Organization, LocalBusiness |
| **SERP Features** | Target featured snippets, People Also Ask, image packs, local packs |
| **Link Map** | Internal link topology — visualise pillar → cluster → orphan structure |
| **Report Scheduler** | Automated PDF/email reports on a daily/weekly/monthly schedule |
| **Case Study Builder** | Structured case study templates with before/after metric capture |
| **AI Visibility** | Track how your brand appears in AI-generated answers (ChatGPT, Gemini, Perplexity) |

### Integrations & Platform
| Section | Description |
|---|---|
| **GA4 Connector** | OAuth setup wizard for Google Analytics 4 |
| **Ahrefs / Semrush Sync** | Import keyword and backlink data from Ahrefs or SEMrush exports |
| **Crawl Import** | Import Screaming Frog or Sitebulb crawl CSV exports |
| **WordPress Publisher** | Publish drafts directly to WordPress via Application Passwords |
| **Team Management** | Multi-user workspace — invite by email, RBAC permissions matrix, owner/admin/specialist/viewer roles |
| **API Access** | Programmatic access to your Jarvis data |
| **Shareable Links** | Generate read-only dashboard links for clients |

---

## Quick Start

Full step-by-step instructions are in [SETUP.md](SETUP.md). The short version:

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/jarvis.git
cd jarvis

# 2. Install dependencies
cd app && npm install

# 3. Configure environment (optional — can also be done via Settings UI)
cp .env.example .env
# Edit .env with your Supabase URL and anon key

# 4. Start the dev server
npm run dev
```

Then open `http://localhost:5173`, complete the onboarding, and enter your API keys via **Settings**.

> **First time?** You need to create a Supabase project, run 11 SQL migrations, and deploy 8 Edge Functions. [SETUP.md](SETUP.md) walks through all of it — takes about 15–20 minutes.

---

## API Keys

All keys are entered in the **Settings modal** inside the app and stored only in your browser's `localStorage`. Nothing is stored on any server.

| Key | Required For | Free Tier | Get It |
|---|---|---|---|
| Supabase URL + Anon Key | Auth, database, all proxies | Yes (generous) | [supabase.com](https://supabase.com) |
| Google Client ID | GSC + GA4 OAuth | Yes | [Google Cloud Console](https://console.cloud.google.com) |
| OpenRouter API Key | All AI features | Yes (free models) | [openrouter.ai](https://openrouter.ai/keys) |
| Anthropic API Key | Claude AI features | No | [console.anthropic.com](https://console.anthropic.com) |
| DataForSEO Credentials | Site Explorer, Backlinks, Competitors | ~$0.001/call | [dataforseo.com](https://dataforseo.com) |
| Serper API Key | Rank Tracker, Keyword Explorer | 2,500 free/month | [serper.dev](https://serper.dev) |
| Open PageRank Key | Domain Rating (DR) | Yes | [domcop.com/openpagerank](https://www.domcop.com/openpagerank) |
| PageSpeed Insights Key | Site Audit speed scores | Yes | [Google Cloud Console](https://console.cloud.google.com) |

**Minimum to get started:** Supabase URL + Anon Key (everything else is optional — features gracefully degrade or use AI estimates).

---

## Architecture

```
Browser (React + Zustand)
    │
    │  Direct API calls (Supabase auth, data)
    ▼
Supabase Project (your own)
    ├── PostgreSQL Database  — sites, tasks, schedules, GSC tokens, GA4 tokens
    ├── Auth                 — email/password sign-up, session management
    └── Edge Functions       — CORS proxies for external APIs
            ├── dataforseo-proxy  → DataForSEO REST API
            ├── opr-proxy         → Open PageRank API
            ├── gsc-auth          → Google OAuth token exchange
            ├── gsc-proxy         → Google Search Console API
            ├── ga4-auth          → Google OAuth token exchange
            ├── ga4-proxy         → Google Analytics Data API
            ├── site-crawl        → Site Audit crawler
            ├── news-proxy        → RSS feeds (Google, SEL, SEJ, Moz, Ahrefs, SEMrush)
            └── send-invite       → Team invite emails via Supabase Auth
```

**Why Edge Functions as proxies?**

External APIs don't allow direct browser calls (CORS). Rather than building a traditional backend that stores your API credentials server-side, Jarvis routes calls through Supabase Edge Functions that run in **your own Supabase project**. Your DataForSEO password, Serper key, and other credentials are read from your browser's `localStorage` and sent directly to your own Edge Function — they never touch any shared server.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [React 19](https://react.dev) + [Vite 8](https://vitejs.dev) |
| Language | [TypeScript 6](https://www.typescriptlang.org) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| State management | [Zustand 5](https://zustand-demo.pmnd.rs) (persisted to `localStorage`) |
| Data fetching | [TanStack Query v5](https://tanstack.com/query) |
| Backend / DB | [Supabase](https://supabase.com) (Postgres + Edge Functions) |
| Charts | [Recharts 3](https://recharts.org) |
| Icons | [Lucide React](https://lucide.dev) |
| AI providers | Anthropic Claude, OpenRouter |
| PDF export | [jsPDF](https://github.com/parallax/jsPDF) + [html-to-image](https://github.com/bubkoo/html-to-image) |

---

## Project Structure

```
jarvis/
├── app/                        # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/         # Sidebar, TopBar, JarvisWidget, SettingsModal
│   │   │   ├── sections/       # One file per dashboard section (63 sections)
│   │   │   ├── auth/           # AuthPage, OrgCreateWizard
│   │   │   └── ui/             # Shared primitives (Card, Button, Badge, etc.)
│   │   ├── lib/                # supabase.ts, ai.ts, csv.ts, exportPDF.ts, utils.ts
│   │   ├── store/              # Zustand store (index.ts, authStore.ts)
│   │   └── types/              # TypeScript types (index.ts, supabase.ts)
│   ├── public/                 # Static assets (jarvis-icon.png, fonts)
│   └── .env.example            # Template for environment variables
│
├── supabase/
│   ├── functions/              # 9 Deno Edge Functions
│   │   ├── dataforseo-proxy/
│   │   ├── opr-proxy/
│   │   ├── gsc-auth/
│   │   ├── gsc-proxy/
│   │   ├── ga4-auth/
│   │   ├── ga4-proxy/
│   │   ├── site-crawl/
│   │   ├── news-proxy/
│   │   └── send-invite/
│   ├── 001_jarvis_schema.sql
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

Jarvis is designed to be completely self-hostable with no lock-in:

- **No telemetry** — no phone-home, no analytics, no usage tracking
- **No shared backend** — every deployment uses its own Supabase project
- **No credential storage** — all API keys live in `localStorage` only, never on any server
- **No subscription** — use it forever for free on Supabase's free tier (or upgrade for more resources)
- **CORS proxies, not credential stores** — Edge Functions forward your credentials to external APIs on your behalf and return the result; they don't log or persist anything

---

## Roles & Permissions (RBAC)

| Role | Default Access |
|---|---|
| **Owner** | Full access to everything — cannot be restricted |
| **Admin** | Full access by default, configurable by owner |
| **SEO Specialist** | Keyword research, AI tools, content, rank tracking, GSC |
| **Technical** | Tech SEO, integrations, crawl tools, GSC/GA4 |
| **Content Writer** | Article writer, content calendar, social snippets |
| **Viewer** | Dashboard, roadmap, news — read only |

Owners configure per-role section access via **Team Management → Permissions** — a checkbox matrix grouped by sidebar category. Changes are instant and persisted per organisation. The sidebar filters automatically for each logged-in member.

Team invites are sent by email (Supabase auth + optional custom SMTP). A copy-able invite link is always shown as a fallback. Clicking an invite link automatically adds the user to the org on sign-in.

---

## Contributing

Contributions are welcome. Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run `npm run build` to confirm TypeScript compiles clean
5. Open a pull request with a clear description of what you changed and why

For bugs, please open an issue with the browser console output and steps to reproduce.

---

## License

[MIT](LICENSE) — use it, fork it, build on it, sell it. No attribution required.
