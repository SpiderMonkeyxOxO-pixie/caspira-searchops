import { useState, useRef, useEffect } from 'react'
import { Settings, Bell, FileDown, Loader2, Sun, Moon, Monitor, ChevronDown, Globe, Plus, Check } from 'lucide-react'
import { useStore } from '@/store'
import { Button } from '@/components/ui/Button'
import { SettingsModal } from './SettingsModal'
import { exportToPDF } from '@/lib/exportPDF'

const STATUS_COLOR = { good: '#10b981', warning: '#f59e0b', danger: '#ef4444' }

const SECTION_TITLES: Record<string, string> = {
  // CORE
  agency:       'Agency View',
  sitesmanager: 'Site Manager',
  dashboard:    'Command Center',
  analyzer:     'Site Audit',
  competitors:  'Competitors',
  keywords:     'Keyword Strategy',
  backlinks:    'Backlink Strategy',

  // TRACKING
  tracker:      'Rank Tracker',
  roadmap:      '12-Month Roadmap',
  gsc:          'Search Console',
  crossview:    'GSC × GA4 Cross-View',

  // AI TOOLS
  jarvis:       'Jarvis AI',
  roaster:      'Site Roaster',
  clustering:   'KW Clustering',
  bulkmeta:     'Bulk Meta Writer',
  gapcontent:   'Content Gap',
  contentspy:   'Content Spy',
  autorefresh:  'Auto-Refresh',

  // AI DEPTH
  articlewriter: 'Article Writer',
  contentgrader: 'Content Grader',
  topicalmap:    'Topical Map',
  serpsim:       'SERP Simulator',
  faqgen:        'FAQ Generator',

  // CONTENT
  content:       'Content Plan',
  contentcal:    'Content Calendar',
  socialsnip:    'Social Snippets',
  imagebuilder:  'Image Builder',
  pipeline:      'Content Pipeline',
  linksuggester: 'Link Suggester',

  // STRATEGY
  outrank:      'Outrank Blueprint',
  serpfeatures: 'SERP Features',
  eeat:         'E-E-A-T Audit',
  schema:       'Schema Builder',
  linkmap:      'Link Map',

  // REPORTING
  scheduler:    'Report Scheduler',
  casestudy:    'Case Study Builder',

  // TECH SEO
  technical:    'Technical SEO',
  redirectmgr:  'Redirect Manager',
  loganalyzer:  'Log Analyzer',
  hreflang:     'Hreflang Builder',
  robotstxt:    'Robots.txt Editor',
  sitemapgen:   'Sitemap Generator',
  jsseo:        'JS SEO Checker',

  // INTEGRATIONS
  ga4:          'GA4 Connector',
  apisync:      'Ahrefs / Semrush Sync',
  crawlimport:  'Crawl Import',
  wordpress:    'WordPress Publisher',

  aivisibility:   'AI Visibility',
  team:           'Team Management',
  seonews:        'SEO News & Updates',

  // NEW TOOLS
  siteexplorer:   'Site Explorer',
  kwexplorer:     'Keyword Explorer',
  answerpublic:   'Answer the Public',
  serpupdate:     'Update SERP',
  intentanalyzer: 'Intent Analyzer',

  // PLATFORM
  onboarding:    'Onboarding',
  themesettings: 'Theme & Display',
  shortcuts:     'Keyboard Shortcuts',
  sharelinks:    'Shareable Links',
  apiaccess:     'API Access',
}

export function TopBar() {
  const { activeSection, domain, setDomain, setSection, sites, anthropicKey, theme, setTheme, newsUnreadCount } = useStore()
  const [settingsOpen,  setSettingsOpen]  = useState(false)
  const [exporting,     setExporting]     = useState(false)
  const [switcherOpen,  setSwitcherOpen]  = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)
  const aiReady = !!anthropicKey

  // Close dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false)
      }
    }
    if (switcherOpen) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [switcherOpen])

  function switchSite(d: string) {
    setDomain(d)
    setSwitcherOpen(false)
  }

  const THEME_CYCLE: Array<'dark' | 'light' | 'auto'> = ['dark', 'light', 'auto']
  const THEME_ICON = { dark: Moon, light: Sun, auto: Monitor }
  const THEME_LABEL = { dark: 'Dark', light: 'Light', auto: 'System' }
  const ThemeIcon = THEME_ICON[theme]

  function cycleTheme() {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % 3]
    setTheme(next)
  }

  async function handleExport() {
    if (exporting) return
    setExporting(true)
    try {
      const title = SECTION_TITLES[activeSection] ?? activeSection
      await exportToPDF('section-content', title)
    } catch (err) {
      console.error('[Export PDF]', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-xl border-b border-border px-6 h-15 flex items-center justify-between gap-3">
        <h1 className="font-display font-bold text-base truncate shrink min-w-0">
          {SECTION_TITLES[activeSection] ?? activeSection}
        </h1>

        <div className="flex items-center gap-2 shrink-0">
          {/* Site switcher */}
          <div ref={switcherRef} className="relative">
            <button
              onClick={() => setSwitcherOpen(v => !v)}
              className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-1.5 text-xs font-mono-jarvis text-tx hover:border-accent transition-colors w-44 min-w-0"
            >
              <Globe size={12} className="text-muted shrink-0" />
              <span className="flex-1 truncate text-left">{domain || 'Select site…'}</span>
              <ChevronDown size={11} className={`text-muted shrink-0 transition-transform ${switcherOpen ? 'rotate-180' : ''}`} />
            </button>

            {switcherOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-64 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                {sites.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto py-1">
                    {sites.map(s => (
                      <button
                        key={s.id}
                        onClick={() => switchSite(s.domain)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface transition-colors text-left cursor-pointer"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: STATUS_COLOR[s.status] }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-tx truncate">{s.name}</div>
                          <div className="text-[10px] text-muted font-mono-jarvis truncate">{s.domain}</div>
                        </div>
                        {domain === s.domain && (
                          <Check size={12} className="text-accent shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-xs text-muted">No sites added yet.</div>
                )}
                <div className="border-t border-border">
                  <button
                    onClick={() => { setSection('sitesmanager'); setSwitcherOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-accent hover:bg-surface transition-colors cursor-pointer font-semibold"
                  >
                    <Plus size={12} /> Add New Site
                  </button>
                </div>
              </div>
            )}
          </div>

<Button variant="ghost" className="text-[#a78bfa] border-[#7c3aed40]" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
            {exporting ? 'Exporting…' : 'Export'}
          </Button>

          <button
            onClick={() => setSection('seonews')}
            title="SEO News & Updates"
            className="relative p-2 rounded-lg border border-border text-muted hover:border-accent hover:text-accent transition-all cursor-pointer"
          >
            <Bell size={15} />
            {newsUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 rounded-full bg-danger border border-bg flex items-center justify-center text-[9px] font-bold text-white px-1">
                {newsUnreadCount > 99 ? '99+' : newsUnreadCount}
              </span>
            )}
          </button>

          <button
            onClick={cycleTheme}
            title={`Theme: ${THEME_LABEL[theme]} — click to switch`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-muted hover:border-accent hover:text-accent transition-all text-xs font-mono-jarvis"
          >
            <ThemeIcon size={13} />
            <span className="hidden sm:inline">{THEME_LABEL[theme]}</span>
          </button>

          <Button variant="primary" onClick={() => setSection('jarvis')}>
            Ask Jarvis
          </Button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="relative p-2 rounded-lg border border-border text-muted hover:border-accent hover:text-accent transition-all"
          >
            <Settings size={15} />
            <span className={`absolute top-1 right-1 w-2 h-2 rounded-full border border-bg ${aiReady ? 'bg-accent3' : 'bg-danger'}`} />
          </button>
        </div>
      </header>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
