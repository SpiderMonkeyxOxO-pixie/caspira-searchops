import type { NavSection } from '@/types'

export interface GuideLink {
  section: NavSection
  label: string
}

export interface SectionGuideData {
  title: string
  description: string
  steps: string[]
  connects: GuideLink[]
}

export const SECTION_GUIDES: Partial<Record<NavSection, SectionGuideData>> = {

  dashboard: {
    title: 'Dashboard',
    description: 'Your command center — real GSC performance KPIs, 28-day trend chart, and top queries pulled live from Google Search Console.',
    steps: [
      'Connect Google Search Console in the GSC section to populate live data',
      'Monitor Clicks, Impressions, CTR, and Avg. Position at a glance',
      'Use the top queries list to find keywords worth targeting or tracking',
    ],
    connects: [
      { section: 'gsc',     label: 'GSC — data source' },
      { section: 'ga4',     label: 'GA4 — traffic analytics' },
      { section: 'tracker', label: 'Rank Tracker — position history' },
      { section: 'crossview', label: 'Cross View — combine GSC + GA4' },
    ],
  },

  jarvis: {
    title: 'Jarvis AI',
    description: 'Your AI-powered iGaming SEO strategist — ask strategy questions, get content ideas, run research, and get actionable recommendations.',
    steps: [
      'Add an AI API key in Onboarding (Anthropic Claude or OpenRouter)',
      'Type a question or click a quick-ask prompt to get started',
      'Use AI responses as input for Article Writer, Content Plan, or Outrank Blueprint',
    ],
    connects: [
      { section: 'onboarding',   label: 'Onboarding — add AI key' },
      { section: 'articlewriter',label: 'Article Writer — write content' },
      { section: 'outrank',      label: 'Outrank Blueprint — competitor strategy' },
      { section: 'keywords',     label: 'Keywords — keyword research' },
    ],
  },

  tracker: {
    title: 'Rank Tracker',
    description: 'Track keyword rankings over time — see position changes, top movers, and visibility trends for your iGaming site.',
    steps: [
      'Add keywords to track manually or import from the Keywords section',
      'Connect a rank-checking API in Onboarding (DataForSEO or SerpAPI) for real data',
      'Review position changes daily — winners go to Content Plan, losers to Outrank Blueprint',
    ],
    connects: [
      { section: 'keywords',  label: 'Keywords — source keywords' },
      { section: 'content',   label: 'Content Plan — strengthen winners' },
      { section: 'outrank',   label: 'Outrank Blueprint — fix losers' },
      { section: 'dashboard', label: 'Dashboard — performance overview' },
      { section: 'serpupdate',label: 'SERP Updates — correlate drops to algo updates' },
    ],
  },

  analyzer: {
    title: 'Site Analyzer',
    description: 'Full on-page SEO audit of any URL — meta tags, headings, internal links, page speed signals, and actionable issue list.',
    steps: [
      'Enter a page URL and click Analyze',
      'Review the issue list sorted by impact level (critical → low)',
      'Send critical fixes to Roadmap and use Schema Builder for structured data gaps',
    ],
    connects: [
      { section: 'technical',    label: 'Technical — site-wide audit' },
      { section: 'roadmap',      label: 'Roadmap — track fixes' },
      { section: 'eeat',         label: 'E-E-A-T Audit — trust signals' },
      { section: 'schema',       label: 'Schema Builder — add structured data' },
    ],
  },

  keywords: {
    title: 'Keyword Research',
    description: 'AI keyword research for iGaming — generate keyword ideas with volume, KD, intent, CPC, and opportunity score.',
    steps: [
      'Enter a seed keyword or topic and click AI Research (requires AI key in Onboarding)',
      'Filter results by Difficulty, Intent, or Opportunity level',
      'Copy selected keywords to use in Article Writer, Intent Analyzer, or Content Plan',
    ],
    connects: [
      { section: 'intentanalyzer', label: 'Intent Analyzer — classify intent' },
      { section: 'content',        label: 'Content Plan — plan articles' },
      { section: 'articlewriter',  label: 'Article Writer — write content' },
      { section: 'tracker',        label: 'Rank Tracker — track rankings' },
      { section: 'clustering',     label: 'Clustering — group into topics' },
    ],
  },

  competitors: {
    title: 'Competitors',
    description: 'Monitor competitor sites — track their content output, rankings, backlinks, and strategic moves in your market.',
    steps: [
      'Add competitor domains to your watchlist',
      'Compare their metrics against your primary domain',
      'Use gaps identified here in Content Gap and Outrank Blueprint',
    ],
    connects: [
      { section: 'gapcontent', label: 'Content Gap — find topic gaps' },
      { section: 'outrank',    label: 'Outrank Blueprint — build strategy' },
      { section: 'backlinks',  label: 'Backlinks — compare link profiles' },
      { section: 'roaster',    label: 'Roaster — quick competitive audit' },
    ],
  },

  content: {
    title: 'Content Plan',
    description: 'Editorial pipeline tracker — plan, manage, and track your iGaming articles from Brief → In Progress → Published.',
    steps: [
      'Your content list is empty — add articles you plan to create for your site',
      'Set status for each item as it progresses through your workflow',
      'Click the Brief button on any planned item to generate an AI content brief',
    ],
    connects: [
      { section: 'keywords',     label: 'Keywords — source topics' },
      { section: 'articlewriter',label: 'Article Writer — write the content' },
      { section: 'pipeline',     label: 'Content Pipeline — step-by-step workflow' },
      { section: 'contentcal',   label: 'Content Calendar — schedule publishing' },
    ],
  },

  technical: {
    title: 'Technical SEO',
    description: 'Technical SEO checker — crawl issues, Core Web Vitals, structured data, page speed, and crawlability analysis.',
    steps: [
      'Enter your domain to run a full technical audit',
      'Prioritise issues by impact (critical issues first)',
      'Fix issues using Schema Builder, Robots.txt editor, and Sitemap Generator',
    ],
    connects: [
      { section: 'schema',       label: 'Schema Builder — add structured data' },
      { section: 'robotstxt',    label: 'Robots.txt — control crawling' },
      { section: 'sitemapgen',   label: 'Sitemap Generator — build sitemap' },
      { section: 'loganalyzer',  label: 'Log Analyzer — crawl budget analysis' },
      { section: 'redirectmgr',  label: 'Redirect Manager — fix redirect chains' },
    ],
  },

  backlinks: {
    title: 'Backlinks',
    description: 'Backlink profile analysis — view your link quality, anchor distribution, toxic links, and link-building opportunities.',
    steps: [
      'Connect a backlink API in Onboarding (OpenPageRank, DataForSEO) for real data',
      'Review link quality, DA distribution, and anchor diversity',
      'Find link gaps vs competitors and build a strategy in Outrank Blueprint',
    ],
    connects: [
      { section: 'linkmap',     label: 'Link Map — visualise link structure' },
      { section: 'outrank',     label: 'Outrank Blueprint — link acquisition strategy' },
      { section: 'onboarding',  label: 'Onboarding — add API key' },
      { section: 'competitors', label: 'Competitors — compare link profiles' },
    ],
  },

  roadmap: {
    title: 'SEO Roadmap',
    description: 'Strategic SEO roadmap — organise all your SEO tasks into phases (Now / Next / Later) and track progress.',
    steps: [
      'Add tasks from any audit section (Analyzer, Technical, Backlinks)',
      'Drag tasks across phases to prioritise your sprint',
      'Assign tasks to team members and set deadlines',
    ],
    connects: [
      { section: 'analyzer',   label: 'Site Analyzer — source issues' },
      { section: 'technical',  label: 'Technical — source technical fixes' },
      { section: 'team',       label: 'Team Management — assign tasks' },
      { section: 'scheduler',  label: 'Scheduler — report on progress' },
    ],
  },

  roaster: {
    title: 'Site Roaster',
    description: 'Quick competitive audit — rapid breakdown of any site\'s SEO strengths, weaknesses, and vulnerabilities in the iGaming space.',
    steps: [
      'Enter any competitor domain to roast',
      'Get a quick breakdown of SEO wins, gaps, and areas to exploit',
      'Feed findings into Outrank Blueprint for a full counter-strategy',
    ],
    connects: [
      { section: 'outrank',    label: 'Outrank Blueprint — full strategy' },
      { section: 'competitors',label: 'Competitors — watchlist' },
      { section: 'gapcontent', label: 'Content Gap — find missing topics' },
    ],
  },

  clustering: {
    title: 'Keyword Clustering',
    description: 'Group keyword lists by topic cluster to plan silo architecture and align content with topical authority.',
    steps: [
      'Paste a keyword list (one keyword per line)',
      'Run clustering to group semantically related keywords into topic clusters',
      'Use cluster groups to structure your Topical Map and Content Plan',
    ],
    connects: [
      { section: 'keywords',       label: 'Keywords — source keywords' },
      { section: 'topicalmap',     label: 'Topical Map — visualise coverage' },
      { section: 'content',        label: 'Content Plan — plan from clusters' },
      { section: 'intentanalyzer', label: 'Intent Analyzer — classify each cluster' },
    ],
  },

  bulkmeta: {
    title: 'Bulk Meta Generator',
    description: 'Generate optimised title tags and meta descriptions for multiple pages at once using AI.',
    steps: [
      'Paste a list of page URLs or target keywords (one per line)',
      'Click Generate to produce SEO-optimised meta tags for each',
      'Copy or export to CSV, then preview each snippet in SERP Simulator',
    ],
    connects: [
      { section: 'serpsim',   label: 'SERP Simulator — preview snippets' },
      { section: 'sitemapgen',label: 'Sitemap Generator — list of pages' },
      { section: 'schema',    label: 'Schema Builder — add structured data' },
    ],
  },

  gapcontent: {
    title: 'Content Gap Finder',
    description: 'Find topics your competitors rank for that you don\'t — ordered by search volume and opportunity score.',
    steps: [
      'Enter your domain, up to two competitor domains, and a niche/topic',
      'Click Find Content Gaps — AI identifies topics where competitors rank and you don\'t',
      'Take high-opportunity gaps directly into Article Writer or Content Plan',
    ],
    connects: [
      { section: 'competitors',  label: 'Competitors — find who to compare' },
      { section: 'outrank',      label: 'Outrank Blueprint — full strategy' },
      { section: 'articlewriter',label: 'Article Writer — create gap content' },
      { section: 'content',      label: 'Content Plan — add to pipeline' },
    ],
  },

  eeat: {
    title: 'E-E-A-T Audit',
    description: 'Audit your Experience, Expertise, Authoritativeness, and Trustworthiness signals — critical for iGaming YMYL rankings.',
    steps: [
      'Review each E-E-A-T signal item in the checklist',
      'Identify gaps and follow the specific fix recommendations',
      'Implement fixes via Schema Builder and Content Grader, then re-audit',
    ],
    connects: [
      { section: 'aivisibility',  label: 'AI Visibility — AI answer presence' },
      { section: 'schema',        label: 'Schema Builder — add trust signals' },
      { section: 'analyzer',      label: 'Site Analyzer — page-level audit' },
      { section: 'contentgrader', label: 'Content Grader — article trust score' },
    ],
  },

  schema: {
    title: 'Schema Builder',
    description: 'Generate JSON-LD structured data for Review, FAQPage, BreadcrumbList, and other schema types for iGaming pages.',
    steps: [
      'Select the schema type needed (Review, FAQ, Breadcrumb, etc.)',
      'Fill in all fields for your specific page',
      'Copy the JSON-LD output and add it to your page\'s <head> or CMS',
    ],
    connects: [
      { section: 'technical',     label: 'Technical — schema audit' },
      { section: 'faqgen',        label: 'FAQ Generator — create FAQ content' },
      { section: 'serpsim',       label: 'SERP Simulator — preview rich results' },
      { section: 'eeat',          label: 'E-E-A-T Audit — trust signals' },
      { section: 'aivisibility',  label: 'AI Visibility — structured data for AI' },
    ],
  },

  serpfeatures: {
    title: 'SERP Features',
    description: 'Track which SERP features (featured snippets, PAA boxes, rich results) your pages appear in vs competitors.',
    steps: [
      'Enter target keywords to check SERP feature eligibility',
      'See which features competitors currently own for each keyword',
      'Use Schema Builder and FAQ Generator to capture the snippets',
    ],
    connects: [
      { section: 'schema',   label: 'Schema Builder — win rich results' },
      { section: 'faqgen',   label: 'FAQ Generator — target PAA boxes' },
      { section: 'serpsim',  label: 'SERP Simulator — preview your snippet' },
      { section: 'keywords', label: 'Keywords — source target keywords' },
    ],
  },

  linkmap: {
    title: 'Link Map',
    description: 'Visualise your internal link structure — find orphaned pages, link equity flow, and internal linking opportunities.',
    steps: [
      'Import your sitemap or enter your domain to map internal links',
      'Identify orphaned pages (no inbound internal links)',
      'Use Link Suggester to add strategic links and pass authority to money pages',
    ],
    connects: [
      { section: 'linksuggester', label: 'Link Suggester — add internal links' },
      { section: 'sitemapgen',    label: 'Sitemap Generator — full page list' },
      { section: 'technical',     label: 'Technical — crawl data' },
    ],
  },

  scheduler: {
    title: 'Report Scheduler',
    description: 'Set up automated SEO report emails delivered on a daily, weekly, or monthly cadence.',
    steps: [
      'Click New Schedule and set frequency (daily/weekly/monthly), day, and time',
      'Add recipient email addresses for delivery',
      'Reports automatically pull live data from Dashboard, GSC, and GA4',
    ],
    connects: [
      { section: 'dashboard', label: 'Dashboard — report source' },
      { section: 'gsc',       label: 'GSC — organic data' },
      { section: 'ga4',       label: 'GA4 — analytics data' },
      { section: 'roadmap',   label: 'Roadmap — progress data' },
    ],
  },

  casestudy: {
    title: 'Case Study Builder',
    description: 'Document SEO wins and generate shareable case studies from ranking improvements and traffic growth.',
    steps: [
      'Select a site and date range that shows a positive ranking improvement',
      'Add context about which changes drove the win (content, links, technical)',
      'Export as PDF or generate a shareable link to demonstrate ROI to clients',
    ],
    connects: [
      { section: 'tracker',    label: 'Rank Tracker — ranking data' },
      { section: 'gsc',        label: 'GSC — traffic data' },
      { section: 'sharelinks', label: 'Shareable Links — share with clients' },
    ],
  },

  gsc: {
    title: 'Google Search Console',
    description: 'Connect your GSC property to pull real clicks, impressions, CTR, and ranking data into Jarvis.',
    steps: [
      'Click Connect Google Search Console to start the OAuth flow',
      'Select your GSC property from the dropdown list',
      'Data automatically flows to Dashboard, Rank Tracker, and Cross View',
    ],
    connects: [
      { section: 'dashboard', label: 'Dashboard — live KPIs' },
      { section: 'tracker',   label: 'Rank Tracker — ranking data' },
      { section: 'crossview', label: 'Cross View — combine with GA4' },
      { section: 'ga4',       label: 'GA4 — connect analytics too' },
    ],
  },

  ga4: {
    title: 'Google Analytics 4',
    description: 'Connect your GA4 property to see sessions, pageviews, engagement rate, and top pages inside Jarvis.',
    steps: [
      'Click Connect Google Analytics 4 to start the OAuth flow',
      'Select your GA4 property from the dropdown',
      'Data flows to Cross View to correlate with GSC organic signals',
    ],
    connects: [
      { section: 'gsc',       label: 'GSC — connect search data too' },
      { section: 'crossview', label: 'Cross View — correlate both sources' },
      { section: 'dashboard', label: 'Dashboard — combined overview' },
    ],
  },

  apisync: {
    title: 'API Sync',
    description: 'Pull external data (rankings, backlinks, traffic) from third-party APIs into Jarvis on a schedule.',
    steps: [
      'Configure API keys in Onboarding (DataForSEO, SerpAPI, Serper)',
      'Select data sources to sync and set the sync frequency',
      'Synced data enriches Rank Tracker, Backlinks, and Competitors sections',
    ],
    connects: [
      { section: 'onboarding', label: 'Onboarding — add API keys' },
      { section: 'tracker',    label: 'Rank Tracker — ranking data' },
      { section: 'backlinks',  label: 'Backlinks — link data' },
    ],
  },

  crawlimport: {
    title: 'Crawl Import',
    description: 'Import site crawl exports from Screaming Frog, Sitebulb, or similar tools to enrich Jarvis data.',
    steps: [
      'Export a crawl from your crawler tool as CSV or JSON',
      'Upload the file here to import all page-level data',
      'Imported data enriches Site Analyzer and Technical sections automatically',
    ],
    connects: [
      { section: 'analyzer',  label: 'Site Analyzer — page audit data' },
      { section: 'technical', label: 'Technical — crawl issue data' },
      { section: 'sitemapgen',label: 'Sitemap Generator — full URL list' },
    ],
  },

  crossview: {
    title: 'Cross View',
    description: 'Correlate GSC organic data with GA4 analytics data side by side to find anomalies and untapped opportunities.',
    steps: [
      'Connect both GSC and GA4 first (each has their own section)',
      'Select a date range and filter by page or keyword',
      'Identify pages with high impressions but low engagement — prime candidates for Content Grader',
    ],
    connects: [
      { section: 'gsc',          label: 'GSC — organic data source' },
      { section: 'ga4',          label: 'GA4 — analytics data source' },
      { section: 'dashboard',    label: 'Dashboard — performance overview' },
      { section: 'contentgrader',label: 'Content Grader — fix underperforming pages' },
    ],
  },

  articlewriter: {
    title: 'Article Writer',
    description: 'AI article writer — generate full iGaming articles (casino reviews, bonus guides, game guides) with proper SEO structure.',
    steps: [
      'Enter your topic, primary keyword, and secondary keywords',
      'Select word count, tone, and article category',
      'Click Generate Article — then publish directly to WordPress or copy the markdown',
    ],
    connects: [
      { section: 'keywords',     label: 'Keywords — source target keywords' },
      { section: 'content',      label: 'Content Plan — pull from pipeline' },
      { section: 'contentgrader',label: 'Content Grader — score before publishing' },
      { section: 'wordpress',    label: 'WordPress Sites — publish directly' },
      { section: 'pipeline',     label: 'Content Pipeline — step-by-step workflow' },
    ],
  },

  contentgrader: {
    title: 'Content Grader',
    description: 'Paste any article and get a 0-100 SEO score with specific, actionable recommendations for iGaming YMYL content.',
    steps: [
      'Paste your article text into the editor',
      'Enter the primary keyword this article targets',
      'Fix critical issues shown in the report, then re-grade to confirm improvements',
    ],
    connects: [
      { section: 'articlewriter', label: 'Article Writer — grade generated content' },
      { section: 'eeat',          label: 'E-E-A-T Audit — trust signal gaps' },
      { section: 'pipeline',      label: 'Content Pipeline — review step' },
      { section: 'faqgen',        label: 'FAQ Generator — add FAQ schema' },
    ],
  },

  autorefresh: {
    title: 'Auto Refresh',
    description: 'Keep bonus pages and time-sensitive casino content up-to-date automatically — freshness is a YMYL ranking signal.',
    steps: [
      'Select pages that need regular content refreshes (bonus pages, news)',
      'Set refresh frequency — daily for bonus amounts, weekly for evergreen guides',
      'Jarvis auto-updates timestamps and flags stale content for manual review',
    ],
    connects: [
      { section: 'content',    label: 'Content Plan — track refresh schedule' },
      { section: 'contentcal', label: 'Content Calendar — schedule updates' },
      { section: 'wordpress',  label: 'WordPress Sites — push updates' },
    ],
  },

  topicalmap: {
    title: 'Topical Authority Map',
    description: 'Visualise your niche\'s topic clusters and identify coverage gaps — showing what Google expects you to cover to rank.',
    steps: [
      'Enter your niche (e.g. "online casino india") and click Map Niche',
      'Click each cluster node on the web to inspect covered vs missing subtopics',
      'Use gap subtopics as content briefs in Article Writer or add to Content Plan',
    ],
    connects: [
      { section: 'clustering',   label: 'Clustering — group keywords by topic' },
      { section: 'keywords',     label: 'Keywords — source seed keywords' },
      { section: 'content',      label: 'Content Plan — fill identified gaps' },
      { section: 'gapcontent',   label: 'Content Gap — compare vs competitors' },
    ],
  },

  serpsim: {
    title: 'SERP Simulator',
    description: 'Preview how your page title and meta description appear in Google search results — desktop and mobile views.',
    steps: [
      'Enter your page title, URL slug, and meta description',
      'Toggle rich result options (star rating, breadcrumbs, date, sitelinks)',
      'Adjust text to stay within character limits — title ≤60, description ≤160',
    ],
    connects: [
      { section: 'bulkmeta',     label: 'Bulk Meta — generate meta at scale' },
      { section: 'schema',       label: 'Schema Builder — unlock rich results' },
      { section: 'serpfeatures', label: 'SERP Features — track what you own' },
    ],
  },

  contentspy: {
    title: 'Content Spy',
    description: 'Monitor competitors\' new content, updates, and publishing frequency to stay ahead in your niche.',
    steps: [
      'Add competitor domains to monitor for content changes',
      'Get alerts when they publish new articles or update existing pages',
      'Use findings to respond faster in Content Plan and Outrank Blueprint',
    ],
    connects: [
      { section: 'competitors', label: 'Competitors — manage watchlist' },
      { section: 'content',     label: 'Content Plan — respond with new content' },
      { section: 'outrank',     label: 'Outrank Blueprint — tactical response' },
    ],
  },

  faqgen: {
    title: 'FAQ Generator',
    description: 'Generate keyword-optimised FAQs with FAQPage JSON-LD schema markup ready to copy — targets PAA and featured snippets.',
    steps: [
      'Enter your target keyword and the page URL for context',
      'Choose the number of FAQs to generate (3–10)',
      'Click Generate — toggle to Schema view to copy the JSON-LD markup',
    ],
    connects: [
      { section: 'schema',       label: 'Schema Builder — add more schema types' },
      { section: 'serpfeatures', label: 'SERP Features — track PAA ownership' },
      { section: 'contentgrader',label: 'Content Grader — grade the article' },
      { section: 'articlewriter',label: 'Article Writer — add FAQs to your draft' },
    ],
  },

  redirectmgr: {
    title: 'Redirect Manager',
    description: 'Manage 301/302 redirects, detect redirect chains and loops, and export a clean redirect map for implementation.',
    steps: [
      'Upload your redirect list or add redirects manually',
      'Jarvis flags redirect chains (A→B→C) and loops (A→B→A) automatically',
      'Export the clean, deduplicated redirect map for .htaccess or nginx implementation',
    ],
    connects: [
      { section: 'technical',  label: 'Technical — crawl error source' },
      { section: 'loganalyzer',label: 'Log Analyzer — see what Googlebot hits' },
      { section: 'sitemapgen', label: 'Sitemap Generator — remove redirected URLs' },
    ],
  },

  loganalyzer: {
    title: 'Log Analyzer',
    description: 'Parse server access logs to see exactly how Googlebot crawls your site and identify crawl budget waste.',
    steps: [
      'Upload your server log file (Apache or nginx format)',
      'Filter by Googlebot user-agent to isolate crawler activity',
      'Find frequently crawled low-value pages and exclude them in Robots.txt',
    ],
    connects: [
      { section: 'robotstxt',  label: 'Robots.txt — block low-value URLs' },
      { section: 'technical',  label: 'Technical — correlate crawl issues' },
      { section: 'redirectmgr',label: 'Redirect Manager — fix Googlebot hitting redirects' },
    ],
  },

  hreflang: {
    title: 'Hreflang Builder',
    description: 'Generate correct hreflang tags for multi-language or multi-region casino sites targeting different countries.',
    steps: [
      'Enter page URLs for each language/region variant (e.g. en-IN, id-ID)',
      'Select the correct ISO language and region codes for each URL',
      'Copy the generated <link rel="alternate"> tags and add them to each page\'s <head>',
    ],
    connects: [
      { section: 'technical',  label: 'Technical — hreflang audit' },
      { section: 'sitemapgen', label: 'Sitemap Generator — hreflang in sitemap' },
      { section: 'schema',     label: 'Schema Builder — localised structured data' },
    ],
  },

  robotstxt: {
    title: 'Robots.txt Editor',
    description: 'Build and validate your robots.txt file with a live syntax checker and URL tester.',
    steps: [
      'Edit directives in the editor (Disallow, Allow, Crawl-delay, Sitemap)',
      'Use the validator to catch syntax errors before publishing',
      'Test specific URLs against your rules to confirm crawl permissions are correct',
    ],
    connects: [
      { section: 'technical',  label: 'Technical — crawl configuration' },
      { section: 'loganalyzer',label: 'Log Analyzer — identify URLs to block' },
      { section: 'sitemapgen', label: 'Sitemap Generator — reference your sitemap' },
    ],
  },

  sitemapgen: {
    title: 'Sitemap Generator',
    description: 'Build and maintain your XML sitemap with priority, changefreq, and lastmod settings — download and submit to GSC.',
    steps: [
      'Enter your domain and edit the URL list (add paths, toggle include/exclude)',
      'Set priority (1.0 for key pages) and changefreq (daily for bonus pages)',
      'Download sitemap.xml and submit it directly in Google Search Console',
    ],
    connects: [
      { section: 'technical',  label: 'Technical — sitemap validation' },
      { section: 'gsc',        label: 'GSC — submit your sitemap' },
      { section: 'robotstxt',  label: 'Robots.txt — reference sitemap location' },
      { section: 'redirectmgr',label: 'Redirect Manager — remove redirected pages' },
    ],
  },

  jsseo: {
    title: 'JavaScript SEO',
    description: 'Detect JavaScript rendering issues — compare raw HTML vs rendered DOM to ensure Googlebot can index your content.',
    steps: [
      'Enter a page URL to fetch raw HTML and rendered DOM',
      'Compare: content missing from raw HTML but present in DOM is invisible to crawlers',
      'Fix issues by pre-rendering (SSR/SSG) or using server-side rendering in your framework',
    ],
    connects: [
      { section: 'technical',  label: 'Technical — crawlability audit' },
      { section: 'analyzer',   label: 'Site Analyzer — page-level audit' },
      { section: 'loganalyzer',label: 'Log Analyzer — crawler behaviour' },
    ],
  },

  contentcal: {
    title: 'Content Calendar',
    description: 'Plan and visualise your publishing schedule across weeks and months — keep your editorial team aligned.',
    steps: [
      'Add content items from Content Plan or create new ones directly here',
      'Set target publish dates and drag to reschedule across the calendar',
      'Coordinate refresh cycles with Auto Refresh for time-sensitive casino content',
    ],
    connects: [
      { section: 'content',     label: 'Content Plan — source content items' },
      { section: 'pipeline',    label: 'Content Pipeline — production workflow' },
      { section: 'scheduler',   label: 'Scheduler — automate reports' },
      { section: 'autorefresh', label: 'Auto Refresh — schedule content updates' },
    ],
  },

  socialsnip: {
    title: 'Social Snippets',
    description: 'Generate and preview Open Graph and Twitter Card meta tags so your casino pages look great when shared on social.',
    steps: [
      'Enter your page title, description, and featured image URL',
      'Toggle between Facebook (OG) and Twitter Card preview modes',
      'Copy the meta tags and add them to your page <head> or CMS template',
    ],
    connects: [
      { section: 'bulkmeta',     label: 'Bulk Meta — scale meta generation' },
      { section: 'serpsim',      label: 'SERP Simulator — Google preview' },
      { section: 'imagebuilder', label: 'Image Builder — create the featured image' },
    ],
  },

  imagebuilder: {
    title: 'Image Builder',
    description: 'Create SEO-optimised featured images and social cards for iGaming content — no design tools needed.',
    steps: [
      'Choose a template and colour theme',
      'Customise the headline text and branding elements',
      'Export the image for use in Article Writer and Social Snippets',
    ],
    connects: [
      { section: 'articlewriter', label: 'Article Writer — featured image' },
      { section: 'socialsnip',    label: 'Social Snippets — OG/Twitter image' },
      { section: 'content',       label: 'Content Plan — visual assets' },
    ],
  },

  pipeline: {
    title: 'Content Pipeline',
    description: 'Step-by-step content production workflow — Brief → Outline → Draft → Review → Export — for casino articles.',
    steps: [
      'Fill in the Brief fields (keyword, audience, angle, competitors)',
      'Generate an AI outline, then expand each section into a full draft',
      'Run the Review checklist before exporting or publishing directly to WordPress',
    ],
    connects: [
      { section: 'content',       label: 'Content Plan — pull article briefs' },
      { section: 'articlewriter', label: 'Article Writer — alternative quick write' },
      { section: 'contentgrader', label: 'Content Grader — score before publish' },
      { section: 'wordpress',     label: 'WordPress Sites — publish output' },
    ],
  },

  linksuggester: {
    title: 'Link Suggester',
    description: 'Find internal linking opportunities across your content — surface pages that should link to your target page.',
    steps: [
      'Enter a target page URL or keyword to find link opportunities for',
      'Jarvis surfaces existing content that can contextually link to your target',
      'Implement the suggestions to improve internal link equity and topical depth',
    ],
    connects: [
      { section: 'linkmap',   label: 'Link Map — visualise link structure' },
      { section: 'technical', label: 'Technical — crawl for orphaned pages' },
      { section: 'content',   label: 'Content Plan — plan supporting content' },
    ],
  },

  themesettings: {
    title: 'Theme Settings',
    description: 'Switch between dark, light, and auto themes, and adjust UI density for your preferred working environment.',
    steps: [
      'Select Dark, Light, or Auto (follows your system preference)',
      'Choose Default or Compact density — Compact is useful on smaller screens',
      'Changes apply instantly across all sections — no page reload needed',
    ],
    connects: [
      { section: 'onboarding', label: 'Onboarding — other settings' },
      { section: 'shortcuts',  label: 'Keyboard Shortcuts — navigate faster' },
    ],
  },

  shortcuts: {
    title: 'Keyboard Shortcuts',
    description: 'View all keyboard shortcuts — navigate Jarvis without touching your mouse for a faster workflow.',
    steps: [
      'Press ? or Ctrl+K at any time to open this guide from anywhere',
      'Use G then D/J/T/K chord shortcuts to jump directly to key sections',
      'All shortcuts are disabled when you\'re typing in an input or textarea',
    ],
    connects: [
      { section: 'themesettings', label: 'Theme Settings — appearance' },
      { section: 'onboarding',    label: 'Onboarding — configure settings' },
    ],
  },

  sharelinks: {
    title: 'Shareable Links',
    description: 'Generate public read-only links to share reports, dashboards, and case studies with clients — no login required.',
    steps: [
      'Select the section or report to share',
      'Set an expiry date and access level (view-only)',
      'Send the generated link to clients — they can view without creating an account',
    ],
    connects: [
      { section: 'casestudy', label: 'Case Study — share winning results' },
      { section: 'dashboard', label: 'Dashboard — share performance overview' },
      { section: 'agency',    label: 'Agency Dashboard — multi-client sharing' },
    ],
  },

  onboarding: {
    title: 'Onboarding & Settings',
    description: 'Configure your domain, AI API keys, and third-party integrations — this is the first step to unlocking Jarvis\'s full power.',
    steps: [
      'Set your primary domain — it auto-fills into all tools and AI prompts',
      'Add an AI API key (Anthropic or OpenRouter) to unlock all AI-powered features',
      'Add optional data API keys (DataForSEO, SerpAPI, OpenPageRank) for real rank and backlink data',
    ],
    connects: [
      { section: 'dashboard', label: 'Dashboard — see your data' },
      { section: 'gsc',       label: 'GSC — connect search data' },
      { section: 'ga4',       label: 'GA4 — connect analytics' },
      { section: 'tracker',   label: 'Rank Tracker — needs rank API key' },
    ],
  },

  apiaccess: {
    title: 'API Access',
    description: 'Manage Jarvis API keys for programmatic access to your SEO data from external scripts or custom dashboards.',
    steps: [
      'Generate a new API key and copy it securely',
      'Review rate limits and available API endpoints in the documentation',
      'Use the API to pull Jarvis data into spreadsheets, BI tools, or custom apps',
    ],
    connects: [
      { section: 'apisync',   label: 'API Sync — import external data' },
      { section: 'onboarding',label: 'Onboarding — third-party API keys' },
    ],
  },

  wordpress: {
    title: 'WordPress Sites',
    description: 'Connect your WordPress sites via REST API to publish articles directly from Article Writer and Content Pipeline.',
    steps: [
      'Click Add Site and enter your WordPress URL, username, and application password',
      'Click Test Connection to verify the API credentials are working',
      'Article Writer and Content Pipeline can now publish posts directly to this site',
    ],
    connects: [
      { section: 'articlewriter', label: 'Article Writer — publish content' },
      { section: 'pipeline',      label: 'Content Pipeline — export drafts' },
      { section: 'autorefresh',   label: 'Auto Refresh — update live pages' },
    ],
  },

  agency: {
    title: 'Agency Dashboard',
    description: 'Manage multiple client sites at scale — unified KPI overview, per-client reporting, and team collaboration.',
    steps: [
      'Add client sites via the Sites Manager section',
      'View all client performance metrics in a single dashboard view',
      'Generate per-client reports and share via Shareable Links',
    ],
    connects: [
      { section: 'sitesmanager', label: 'Sites Manager — add client sites' },
      { section: 'sharelinks',   label: 'Shareable Links — deliver reports' },
      { section: 'team',         label: 'Team Management — assign clients to team members' },
      { section: 'scheduler',    label: 'Scheduler — automate client reports' },
    ],
  },

  outrank: {
    title: 'Outrank Blueprint',
    description: 'AI-generated strategy to outrank any competitor in any market — content gaps, link moves, on-page fixes, and a 12-week sprint.',
    steps: [
      'Select a target market (e.g. India, UK, Philippines) and pick a competitor domain',
      'Enter the primary keyword you want to outrank them for',
      'Click Generate Blueprint — the AI Blueprint tab delivers your full strategy',
    ],
    connects: [
      { section: 'competitors', label: 'Competitors — identify who to outrank' },
      { section: 'gapcontent',  label: 'Content Gap — specific gap analysis' },
      { section: 'keywords',    label: 'Keywords — keyword intelligence' },
      { section: 'content',     label: 'Content Plan — execute the strategy' },
    ],
  },

  sitesmanager: {
    title: 'Sites Manager',
    description: 'Add and manage all the websites you track in Jarvis — site health scores, traffic estimates, and client assignments.',
    steps: [
      'Click Add Site and fill in domain, site name, and optional client label',
      'Sites appear across Agency Dashboard, Cross View, and reporting sections',
      'Update health scores and issue counts regularly to keep your reporting accurate',
    ],
    connects: [
      { section: 'agency',    label: 'Agency Dashboard — client overview' },
      { section: 'crossview', label: 'Cross View — per-site data' },
      { section: 'tracker',   label: 'Rank Tracker — per-site rankings' },
    ],
  },

  siteexplorer: {
    title: 'Site Explorer',
    description: 'Deep-dive into any website\'s SEO profile — top pages, top keywords, estimated organic traffic, and link metrics.',
    steps: [
      'Enter any domain to explore (yours or a competitor\'s)',
      'Review their top-ranking pages and estimated monthly traffic',
      'Export top keywords to track in Rank Tracker or target in Content Plan',
    ],
    connects: [
      { section: 'tracker',    label: 'Rank Tracker — track found keywords' },
      { section: 'keywords',   label: 'Keywords — add to keyword research' },
      { section: 'competitors',label: 'Competitors — add to watchlist' },
      { section: 'gapcontent', label: 'Content Gap — compare vs your site' },
    ],
  },

  kwexplorer: {
    title: 'Keyword Explorer',
    description: 'Deep-dive into any keyword — search volume, CPC, difficulty, SERP analysis, and related keyword ideas.',
    steps: [
      'Enter a seed keyword to explore in detail',
      'Review the SERP analysis to understand competition and ranking difficulty',
      'Export related keywords into the Keywords section or directly to Content Plan',
    ],
    connects: [
      { section: 'keywords',       label: 'Keywords — bulk research' },
      { section: 'intentanalyzer', label: 'Intent Analyzer — classify intent' },
      { section: 'tracker',        label: 'Rank Tracker — start tracking it' },
      { section: 'content',        label: 'Content Plan — plan the article' },
    ],
  },

  answerpublic: {
    title: 'Answer The Public',
    description: 'Generate question-based keywords (who, what, where, why, how) for any seed topic — great for FAQ and long-tail content.',
    steps: [
      'Enter a seed keyword or topic to generate question clusters',
      'Browse questions grouped by preposition type (how, what, why, can, etc.)',
      'Export interesting questions to FAQ Generator or add to your Content Plan',
    ],
    connects: [
      { section: 'keywords',       label: 'Keywords — add to keyword research' },
      { section: 'faqgen',         label: 'FAQ Generator — create FAQ content' },
      { section: 'intentanalyzer', label: 'Intent Analyzer — classify question intent' },
      { section: 'content',        label: 'Content Plan — plan informational articles' },
    ],
  },

  serpupdate: {
    title: 'SERP Update Tracker',
    description: 'Track Google algorithm update history and correlate confirmed updates with your ranking changes.',
    steps: [
      'Review the timeline of confirmed Google core and spam updates',
      'Cross-reference update dates with ranking drops or spikes in Rank Tracker',
      'Identify which update affected your site and use E-E-A-T Audit to build a recovery plan',
    ],
    connects: [
      { section: 'tracker',   label: 'Rank Tracker — correlate ranking changes' },
      { section: 'eeat',      label: 'E-E-A-T Audit — recover from YMYL impact' },
      { section: 'dashboard', label: 'Dashboard — traffic trend overview' },
    ],
  },

  intentanalyzer: {
    title: 'Intent Analyzer',
    description: 'Classify any keyword list by search intent (Info, Commercial, Transactional, Navigational) and get content format recommendations.',
    steps: [
      'Paste your keyword list (one per line) or click Load Sample to see an example',
      'Click Analyze (Rules) for instant results, or Analyze with Claude for AI-powered classification',
      'Use intent data to decide content format and target word count before writing',
    ],
    connects: [
      { section: 'keywords',     label: 'Keywords — source the keyword list' },
      { section: 'clustering',   label: 'Clustering — group by topic first' },
      { section: 'articlewriter',label: 'Article Writer — write with the right format' },
      { section: 'content',      label: 'Content Plan — assign intent-matched formats' },
    ],
  },

  aivisibility: {
    title: 'AI Visibility',
    description: 'Audit how well your site appears in AI-generated answers (ChatGPT, Gemini, Perplexity) and what signals need improvement.',
    steps: [
      'Review each AI visibility checklist item for your iGaming site',
      'Prioritise high-impact fixes: structured data, E-E-A-T signals, FAQ content',
      'Implement fixes via Schema Builder and E-E-A-T Audit, then re-run the audit',
    ],
    connects: [
      { section: 'eeat',         label: 'E-E-A-T Audit — trust signals' },
      { section: 'schema',       label: 'Schema Builder — structured data' },
      { section: 'faqgen',       label: 'FAQ Generator — FAQ content for AI' },
      { section: 'contentgrader',label: 'Content Grader — content quality score' },
    ],
  },

  team: {
    title: 'Team Management',
    description: 'Invite team members, assign roles (Owner / Editor / Viewer), and control access to your Jarvis organisation.',
    steps: [
      'Click Invite Member and enter their email address',
      'Assign a role — Editors can create content, Viewers can only read data',
      'Team members log in with their own accounts and share the same org data',
    ],
    connects: [
      { section: 'agency',  label: 'Agency Dashboard — assign clients to members' },
      { section: 'roadmap', label: 'Roadmap — assign SEO tasks' },
      { section: 'content', label: 'Content Plan — assign article owners' },
    ],
  },

}
