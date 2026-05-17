import { useState } from 'react'
import { Bot, Copy, Check, Download, CheckCircle2, AlertCircle, XCircle, Search } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const PRESETS: { label: string; content: string }[] = [
  {
    label: 'Casino — Allow All',
    content: `User-agent: *
Allow: /

User-agent: Googlebot
Allow: /

Sitemap: https://casinoexpert.io/sitemap.xml
Sitemap: https://casinoexpert.io/sitemap-reviews.xml`,
  },
  {
    label: 'Block AI Bots',
    content: `User-agent: *
Allow: /

User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: PerplexityBot
Disallow: /

User-agent: Googlebot
Allow: /

Sitemap: https://casinoexpert.io/sitemap.xml`,
  },
  {
    label: 'Block Staging + Admin',
    content: `User-agent: *
Disallow: /staging/
Disallow: /admin/
Disallow: /wp-admin/
Disallow: /wp-login.php
Disallow: /cgi-bin/
Allow: /

Sitemap: https://casinoexpert.io/sitemap.xml`,
  },
  {
    label: 'Block Thin Pages',
    content: `User-agent: *
Disallow: /tag/
Disallow: /category/
Disallow: /?s=
Disallow: /search/
Disallow: /page/
Allow: /

Sitemap: https://casinoexpert.io/sitemap.xml`,
  },
]

const DEFAULT_CONTENT = `User-agent: *
Allow: /

User-agent: Googlebot
Allow: /

Sitemap: https://casinoexpert.io/sitemap.xml
Sitemap: https://casinoexpert.io/sitemap-reviews.xml`

interface ValidationIssue { type: 'error' | 'warning' | 'pass'; msg: string }

function validateRobots(content: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const lines = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))

  const hasUserAgentStar = lines.some(l => l.toLowerCase() === 'user-agent: *')
  if (hasUserAgentStar) issues.push({ type: 'pass', msg: 'User-agent: * directive present' })
  else issues.push({ type: 'error', msg: 'Missing "User-agent: *" — all bots will be uncontrolled' })

  const hasSitemap = lines.some(l => l.toLowerCase().startsWith('sitemap:'))
  if (hasSitemap) issues.push({ type: 'pass', msg: 'Sitemap directive present' })
  else issues.push({ type: 'warning', msg: 'No Sitemap: directive — add your sitemap URL for Googlebot' })

  const blocksAll = lines.some(l => l === 'Disallow: /')
  if (blocksAll) issues.push({ type: 'error', msg: 'CRITICAL: "Disallow: /" blocks ALL crawling of your site' })
  else issues.push({ type: 'pass', msg: 'Root path "/" not blocked' })

  const criticalPaths = ['/bonuses', '/best-online-casinos', '/no-deposit', '/slots', '/live-casino']
  criticalPaths.forEach(p => {
    const blocked = lines.some(l => l.startsWith('Disallow:') && l.includes(p))
    if (blocked) issues.push({ type: 'error', msg: `Critical casino path "${p}" is blocked — Googlebot cannot crawl it` })
  })

  const blocksImages = lines.some(l => l.includes('Disallow: /*.jpg') || l.includes('Disallow: /images'))
  if (blocksImages) issues.push({ type: 'warning', msg: 'Images may be blocked — Google Image Search won\'t index casino screenshots' })

  const hasCrawlDelay = lines.some(l => l.toLowerCase().startsWith('crawl-delay:'))
  if (hasCrawlDelay) issues.push({ type: 'warning', msg: 'Crawl-delay is set — Google ignores this; use Google Search Console instead' })

  const hasGooglebot = lines.some(l => l.toLowerCase() === 'user-agent: googlebot')
  if (hasGooglebot) issues.push({ type: 'pass', msg: 'Googlebot has a specific directive block' })

  return issues
}

function testUrl(robots: string, testPath: string): 'allowed' | 'blocked' {
  const lines = robots.split('\n').map(l => l.trim())
  let inBlock = false
  let allowed = true

  for (const line of lines) {
    if (line.toLowerCase().startsWith('user-agent:')) {
      const agent = line.slice('user-agent:'.length).trim().toLowerCase()
      inBlock = agent === '*' || agent === 'googlebot'
    }
    if (!inBlock) continue
    if (line.toLowerCase().startsWith('disallow:')) {
      const path = line.slice('disallow:'.length).trim()
      if (path === '/') { allowed = false; break }
      if (path && testPath.startsWith(path)) { allowed = false }
    }
    if (line.toLowerCase().startsWith('allow:')) {
      const path = line.slice('allow:'.length).trim()
      if (path && testPath.startsWith(path)) { allowed = true }
    }
  }
  return allowed ? 'allowed' : 'blocked'
}

export function RobotsTxt() {
  const [content,    setContent]    = useState(DEFAULT_CONTENT)
  const [testPath,   setTestPath]   = useState('/bonuses/no-deposit')
  const [testResult, setTestResult] = useState<'allowed' | 'blocked' | null>(null)
  const [copied,     setCopied]     = useState(false)

  const issues  = validateRobots(content)
  const errors  = issues.filter(i => i.type === 'error').length
  const warnings = issues.filter(i => i.type === 'warning').length

  function handleCopy() {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    const blob = new Blob([content], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'robots.txt'; a.click()
    URL.revokeObjectURL(url)
  }

  function runTest() {
    const path = testPath.startsWith('/') ? testPath : `/${testPath}`
    setTestResult(testUrl(content, path))
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'ERRORS',   val: errors,  color: errors ? '#ef4444' : '#10b981' },
          { label: 'WARNINGS', val: warnings, color: warnings ? '#f59e0b' : '#10b981' },
          { label: 'CHECKS',   val: issues.length, color: '#00d4ff' },
        ].map(s => (
          <Card key={s.label} className="text-center py-4">
            <div className="text-3xl font-display font-black mb-1" style={{ color: s.color }}>{s.val}</div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest">{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Editor */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <CardTitle>robots.txt Editor</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" className="text-[11px]" onClick={handleCopy}>
                {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
              </Button>
              <Button variant="primary" className="text-[11px]" onClick={handleDownload}>
                <Download size={11} /> Download
              </Button>
            </div>
          </div>

          {/* Presets */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            <div className="text-[10px] text-muted font-mono-jarvis self-center mr-1">Presets:</div>
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => setContent(p.content)}
                className="text-[10px] px-2.5 py-1 rounded-lg border border-border text-muted hover:border-accent hover:text-tx cursor-pointer transition-colors font-mono-jarvis">
                {p.label}
              </button>
            ))}
          </div>

          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={18}
            spellCheck={false}
            className="w-full bg-code border border-border rounded-xl p-4 text-[12px] text-accent3 font-mono-jarvis outline-none focus:border-accent transition-colors resize-none scrollbar-thin leading-relaxed"
          />

          {/* URL tester */}
          <div className="mt-3">
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">TEST URL PATH</div>
            <div className="flex gap-2">
              <input value={testPath} onChange={e => setTestPath(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runTest()}
                placeholder="/bonuses/no-deposit"
                className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
              <Button variant="primary" onClick={runTest}>
                <Search size={13} /> Test
              </Button>
            </div>
            {testResult && (
              <div className={`mt-2 flex items-center gap-2 p-2.5 rounded-lg text-xs font-mono-jarvis ${
                testResult === 'allowed'
                  ? 'bg-[#10b98110] border border-[#10b98130] text-accent3'
                  : 'bg-[#ef444415] border border-[#ef444430] text-danger'
              }`}>
                {testResult === 'allowed'
                  ? <CheckCircle2 size={13} />
                  : <XCircle size={13} />
                }
                Googlebot would be <strong className="ml-1">{testResult}</strong> to crawl {testPath}
              </div>
            )}
          </div>
        </Card>

        {/* Validation panel */}
        <Card className="lg:col-span-2">
          <CardTitle className="mb-3">Validation Results</CardTitle>
          <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin">
            {issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 bg-surface border border-border rounded-lg">
                {issue.type === 'error'   && <XCircle      size={12} className="text-danger mt-0.5 shrink-0" />}
                {issue.type === 'warning' && <AlertCircle  size={12} className="text-accent4 mt-0.5 shrink-0" />}
                {issue.type === 'pass'    && <CheckCircle2 size={12} className="text-accent3 mt-0.5 shrink-0" />}
                <div className={`text-[11px] leading-relaxed ${
                  issue.type === 'error' ? 'text-danger' : issue.type === 'warning' ? 'text-accent4' : 'text-muted'
                }`}>
                  {issue.msg}
                </div>
              </div>
            ))}
          </div>

          {errors === 0 && warnings === 0 && (
            <div className="mt-3 p-3 bg-[#10b98110] border border-[#10b98130] rounded-lg text-xs text-accent3">
              All checks passed — your robots.txt looks healthy.
            </div>
          )}

          <div className="mt-4 p-3 bg-surface border border-border rounded-lg">
            <div className="text-[10px] text-accent font-mono-jarvis tracking-widest mb-1.5 flex items-center gap-1">
              <Bot size={10} /> QUICK RULES
            </div>
            <div className="space-y-1 text-[10px] text-muted">
              <div>• Place robots.txt at the root of your domain</div>
              <div>• Always include your Sitemap: URL for faster indexing</div>
              <div>• Never block CSS/JS files — Google needs them to render pages</div>
              <div>• Test changes in Google Search Console after deploying</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
