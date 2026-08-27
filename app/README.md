# Caspira SearchOps — Frontend

React 19 + TypeScript + Tailwind CSS v4 + Vite 8 frontend for the Caspira SearchOps AI Search Intelligence Platform.

## Development

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build
npm run lint      # ESLint check
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

All other API keys (Anthropic, OpenRouter, DataForSEO, Serper, etc.) are entered at runtime via the Settings / Onboarding UI and stored in `localStorage` only — never in `.env`.

## Stack

| | |
|---|---|
| Framework | React 19 + Vite 8 |
| Language | TypeScript 6 |
| Styling | Tailwind CSS v4 |
| State | Zustand 5 (persisted) + TanStack Query v5 |
| Backend | Supabase (Postgres + Auth + Edge Functions) |
| Charts | Recharts 3 |
| Icons | Lucide React |

## Docs

- Full project overview: [../README.md](../README.md)
- Setup guide: [../SETUP.md](../SETUP.md)
