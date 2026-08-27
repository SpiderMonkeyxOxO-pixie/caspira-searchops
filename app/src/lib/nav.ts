import {
  LayoutDashboard, ScanSearch, Swords, KeyRound, FileText, Settings2, Link2,
  TrendingUp, MapPin, PlugZap, Newspaper,
  BrainCircuit, Flame, Network, FileEdit, Crosshair,
  Layers, ShieldCheck, Code2, GitGraph,
  CalendarClock, BookMarked,
  Activity, RefreshCw, FolderUp, GitMerge, Users2,
  PenLine, GraduationCap, Repeat2, Compass, MonitorSmartphone, Radar, HelpCircle,
  Shuffle, ScrollText, Globe, Bot, Map, FileCode2,
  CalendarDays, Share2, Palette, GitBranch, ScanLine,
  SunMoon, Keyboard, ExternalLink, ListChecks, Webhook, Rss, Building2, Target,
  SearchCode, Hash, BookOpen, Zap, Sparkles, Eye, ClipboardList, Signal,
} from 'lucide-react'
import type { NavSection } from '@/types'

export interface NavItem {
  id: NavSection
  label: string
  icon: React.ElementType
  badge?: string
  badgeColor?: string
  disabled?: boolean
}

export const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'CORE',
    items: [
      { id: 'dashboard',    label: 'Command Center',    icon: LayoutDashboard },
      { id: 'analyzer',     label: 'Site Audit',        icon: ScanSearch, badge: '9', badgeColor: 'bg-danger' },
      { id: 'competitors',  label: 'Competitors',        icon: Swords },
      { id: 'siteexplorer', label: 'Site Explorer',     icon: SearchCode, badge: 'NEW', badgeColor: 'bg-accent3' },
      { id: 'keywords',     label: 'Keyword Strategy',  icon: KeyRound },
      { id: 'kwexplorer',   label: 'Keyword Explorer',  icon: Hash, badge: 'NEW', badgeColor: 'bg-accent3' },
      { id: 'backlinks',    label: 'Backlinks',         icon: Link2 },
    ],
  },
  {
    label: 'TRACKING',
    items: [
      { id: 'tracker',    label: 'Rank Tracker',     icon: TrendingUp },
      { id: 'serpupdate', label: 'Update SERP',      icon: Zap, badge: 'NEW', badgeColor: 'bg-accent3' },
      { id: 'roadmap',    label: '12-Month Roadmap', icon: MapPin },
      { id: 'seonews',    label: 'SEO News',         icon: Newspaper, badge: 'LIVE', badgeColor: 'bg-danger' },
      { id: 'gsc',        label: 'Search Console',   icon: PlugZap },
      { id: 'ga4',        label: 'GA4 Connector',    icon: Activity, badge: 'NEW', badgeColor: 'bg-accent3' },
      { id: 'crossview',  label: 'GSC × GA4 View',   icon: GitMerge },
      { id: 'bingwebmaster', label: 'Bing Webmaster', icon: Signal, badge: 'NEW', badgeColor: 'bg-accent3' },
    ],
  },
  {
    label: 'AI VISIBILITY',
    items: [
      { id: 'aivisibility', label: 'AI Visibility', icon: Eye, badge: 'NEW', badgeColor: 'bg-accent2' },
    ],
  },
  {
    label: 'AI TOOLS',
    items: [
      { id: 'jarvis',          label: 'Caspira AI',       icon: BrainCircuit, badge: 'AI', badgeColor: 'bg-accent2' },
      { id: 'roaster',         label: 'Site Roaster',     icon: Flame },
      { id: 'clustering',      label: 'KW Clustering',    icon: Network },
      { id: 'bulkmeta',        label: 'Bulk Meta Writer', icon: FileEdit },
      { id: 'gapcontent',      label: 'Content Gap',      icon: Crosshair },
      { id: 'contentspy',      label: 'Content Spy',      icon: Radar },
      { id: 'autorefresh',     label: 'Auto-Refresh',     icon: Repeat2 },
      { id: 'intentanalyzer',  label: 'Intent Analyzer',  icon: Sparkles, badge: 'NEW', badgeColor: 'bg-accent3' },
    ],
  },
  {
    label: 'AI DEPTH',
    items: [
      { id: 'articlewriter', label: 'Article Writer',    icon: PenLine, badge: 'AI', badgeColor: 'bg-accent2' },
      { id: 'contentgrader', label: 'Content Grader',    icon: GraduationCap },
      { id: 'articleaudit',  label: 'Article SEO Audit', icon: ClipboardList, badge: 'NEW', badgeColor: 'bg-accent3' },
      { id: 'answerpublic',  label: 'Answer the Public', icon: BookOpen, badge: 'NEW', badgeColor: 'bg-accent3' },
      { id: 'topicalmap',    label: 'Topical Map',       icon: Compass },
      { id: 'serpsim',       label: 'SERP Simulator',    icon: MonitorSmartphone },
      { id: 'faqgen',        label: 'FAQ Generator',     icon: HelpCircle },
    ],
  },
  {
    label: 'CONTENT',
    items: [
      { id: 'content',       label: 'Content Plan',     icon: FileText, badge: '3', badgeColor: 'bg-accent2' },
      { id: 'contentcal',    label: 'Content Calendar', icon: CalendarDays, badge: 'NEW', badgeColor: 'bg-accent3' },
      { id: 'socialsnip',    label: 'Social Snippets',  icon: Share2 },
      { id: 'imagebuilder',  label: 'Image Builder',    icon: Palette },
      { id: 'pipeline',      label: 'Content Pipeline', icon: GitBranch },
      { id: 'linksuggester', label: 'Link Suggester',   icon: ScanLine },
    ],
  },
  {
    label: 'STRATEGY',
    items: [
      { id: 'outrank',      label: 'Outrank Blueprint', icon: Target, badge: 'NEW', badgeColor: 'bg-danger' },
      { id: 'serpfeatures', label: 'SERP Features',     icon: Layers },
      { id: 'eeat',         label: 'E-E-A-T Audit',    icon: ShieldCheck },
      { id: 'schema',       label: 'Schema Builder',   icon: Code2 },
      { id: 'linkmap',      label: 'Link Map',         icon: GitGraph },
    ],
  },
  {
    label: 'REPORTING',
    items: [
      { id: 'scheduler', label: 'Report Scheduler', icon: CalendarClock },
      { id: 'casestudy', label: 'Case Study',       icon: BookMarked },
    ],
  },
  {
    label: 'TECH SEO',
    items: [
      { id: 'technical',   label: 'Technical SEO',    icon: Settings2 },
      { id: 'redirectmgr', label: 'Redirect Manager', icon: Shuffle },
      { id: 'loganalyzer', label: 'Log Analyzer',     icon: ScrollText },
      { id: 'hreflang',    label: 'Hreflang Builder', icon: Globe },
      { id: 'robotstxt',   label: 'Robots.txt Editor',icon: Bot },
      { id: 'sitemapgen',  label: 'Sitemap Generator',icon: Map },
      { id: 'jsseo',       label: 'JS SEO Checker',   icon: FileCode2 },
      { id: 'indexnow',    label: 'IndexNow Submitter', icon: Zap, badge: 'NEW', badgeColor: 'bg-accent3' },
    ],
  },
  {
    label: 'INTEGRATIONS',
    items: [
      { id: 'apisync',     label: 'Ahrefs / Semrush',   icon: RefreshCw },
      { id: 'crawlimport', label: 'Crawl Import',       icon: FolderUp },
      { id: 'wordpress',   label: 'WordPress Publisher', icon: Rss, badge: 'NEW', badgeColor: 'bg-accent3' },
    ],
  },
  {
    label: 'PLATFORM',
    items: [
      { id: 'activitylogs',  label: 'Activity Logs',      icon: ClipboardList },
      { id: 'team',          label: 'Team Management',    icon: Users2, badge: 'NEW', badgeColor: 'bg-accent3' },
      { id: 'onboarding',    label: 'Onboarding',         icon: ListChecks, badge: 'START', badgeColor: 'bg-accent4' },
      { id: 'themesettings', label: 'Theme & Display',    icon: SunMoon },
      { id: 'shortcuts',     label: 'Keyboard Shortcuts', icon: Keyboard },
      { id: 'sharelinks',    label: 'Shareable Links',    icon: ExternalLink },
      { id: 'apiaccess',     label: 'API Access',         icon: Webhook },
    ],
  },
  {
    label: 'COMING SOON',
    items: [
      { id: 'agency',       label: 'Agency View',  icon: Building2, disabled: true },
      { id: 'sitesmanager', label: 'Site Manager', icon: Globe,     disabled: true },
    ],
  },
]

export const ALL_SECTIONS = NAV.flatMap(g => g.items.map(i => i.id))
