import {
  LayoutDashboard, KeyRound, Swords, TrendingUp, BrainCircuit,
  CalendarDays, Settings2, Target, BookMarked,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface FeatureCategory {
  icon: LucideIcon
  title: string
  description: string
  tools: string[]
}

/**
 * Tool names here MUST match the labels in src/lib/nav.ts — this is the public
 * promise of what ships in the product. Never list anything that isn't
 * reachable from the app's navigation.
 */
export const featureCategories: FeatureCategory[] = [
  {
    icon: LayoutDashboard,
    title: 'Analytics & Data',
    description: 'GSC and GA4 in one view, cross-referenced automatically.',
    tools: ['Command Center', 'Agency View', 'Site Manager', 'Search Console', 'GA4 Connector', 'GSC × GA4 View'],
  },
  {
    icon: KeyRound,
    title: 'Keyword Research',
    description: 'From a seed keyword to a full topical map.',
    tools: ['Keyword Explorer', 'Keyword Strategy', 'Answer the Public', 'KW Clustering', 'Intent Analyzer', 'Topical Map'],
  },
  {
    icon: Swords,
    title: 'Competitor Intelligence',
    description: 'See what they rank for, and where the gap is.',
    tools: ['Competitors', 'Site Explorer', 'Content Gap', 'Content Spy', 'Backlinks', 'Outrank Blueprint'],
  },
  {
    icon: TrendingUp,
    title: 'Rank Tracking & SERP',
    description: 'Know where you stand, and what\'s triggering above you.',
    tools: ['Rank Tracker', 'Update SERP', 'SERP Features', 'SERP Simulator', 'Bing Webmaster', 'SEO News'],
  },
  {
    icon: BrainCircuit,
    title: 'AI Content',
    description: 'Draft, grade and refresh — Claude or OpenRouter, your key.',
    tools: ['Caspira AI', 'Article Writer', 'Content Grader', 'Article SEO Audit', 'Bulk Meta Writer', 'Auto-Refresh', 'FAQ Generator', 'Site Roaster'],
  },
  {
    icon: CalendarDays,
    title: 'Content Workflow',
    description: 'Plan it, assign it, ship it — without leaving the platform.',
    tools: ['Content Plan', 'Content Calendar', 'Content Pipeline', 'Social Snippets', 'Image Builder', 'Link Suggester'],
  },
  {
    icon: Settings2,
    title: 'Technical SEO',
    description: 'Crawl, audit and fix what quietly caps your rankings.',
    tools: ['Site Audit', 'Technical SEO', 'JS SEO Checker', 'Log Analyzer', 'Redirect Manager', 'Hreflang Builder', 'Robots.txt Editor', 'Sitemap Generator', 'IndexNow Submitter'],
  },
  {
    icon: Target,
    title: 'Strategy & Structure',
    description: 'Authority signals, schema and internal link architecture.',
    tools: ['E-E-A-T Audit', 'Schema Builder', 'Link Map', '12-Month Roadmap', 'AI Visibility'],
  },
  {
    icon: BookMarked,
    title: 'Reporting & Team',
    description: 'Client-ready output, roles and read-only share links.',
    tools: ['Report Scheduler', 'Case Study', 'Shareable Links', 'Team Management', 'WordPress Publisher', 'Ahrefs / Semrush', 'Crawl Import', 'API Access'],
  },
]
