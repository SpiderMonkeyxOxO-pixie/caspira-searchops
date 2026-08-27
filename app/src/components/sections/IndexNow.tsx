import { useState } from 'react'
import { Zap, Copy, Check, Loader2, History, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { HistoryPanel } from '@/components/ui/HistoryPanel'
import { useHistory } from '@/lib/history'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'

interface SubmissionRecord {
  id: string
  savedAt: string
  label: string
  sublabel: string
  urls: string[]
  engine: string
  status: 'success' | 'error'
  statusText: string
}

const ENGINES = [
  { value: 'https://api.indexnow.org/IndexNow',                label: 'All Engines (Hub)',   desc: 'Bing, Yandex, Naver & all partners' },
  { value: 'https://www.bing.com/indexnow',                    label: 'Bing',                desc: 'Microsoft Bing only' },
  { value: 'https://yandex.com/indexnow',                      label: 'Yandex',              desc: 'Yandex search engine' },
  { value: 'https://searchadvisor.naver.com/indexnow',         label: 'Naver',               desc: 'South Korean engine' },
]

function generateKey(): string {
  const chars = 'abcdef0123456789'
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function IndexNow() {
  const { domain, indexNowKey, setIndexNowKey } = useStore()
  const [urlInput,    setUrlInput]    = useState('')
  const [engine,      setEngine]      = useState(ENGINES[0].value)
  const [submitting,  setSubmitting]  = useState(false)
  const [result,      setResult]      = useState<{ ok: boolean; msg: string } | null>(null)
  const [copied,      setCopied]      = useState<string | null>(null)
  const [tab,         setTab]         = useState<'tool' | 'history'>('tool')

  const { records, save, remove, clear } = useHistory<SubmissionRecord>('jarvis_indexnow_history')

  const host       = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const keyFileUrl = indexNowKey && host ? `https://${host}/${indexNowKey}.txt` : ''
  const urlCount   = urlInput.split('\n').filter(u => u.trim()).length

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleSubmit() {
    const urls = urlInput.split('\n').map(u => u.trim()).filter(Boolean)
    if (!indexNowKey || !host || urls.length === 0) return

    setSubmitting(true)
    setResult(null)

    try {
      const res = await fetch(engine, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          host,
          key: indexNowKey,
          keyLocation: `https://${host}/${indexNowKey}.txt`,
          urlList: urls,
        }),
      })

      const ok  = res.status === 200 || res.status === 202
      const msg = ok
        ? `${urls.length} URL${urls.length !== 1 ? 's' : ''} submitted (HTTP ${res.status})`
        : `Engine returned HTTP ${res.status} — verify your key file is live`

      setResult({ ok, msg })
      if (ok) setUrlInput('')
      save({
        id: crypto.randomUUID(), savedAt: new Date().toISOString(),
        label:      `${urls.length} URL${urls.length !== 1 ? 's' : ''} submitted`,
        sublabel:   `${ENGINES.find(e => e.value === engine)?.label ?? 'Engine'} · ${ok ? 'Success' : 'Error'}`,
        urls, engine,
        status: ok ? 'success' : 'error',
        statusText: msg,
      })
    } catch (e: unknown) {
      const rawMsg = e instanceof Error ? e.message : 'Submission failed'
      const msg = rawMsg.includes('Failed to fetch')
        ? 'CORS blocked by browser — your key file may not be live yet, or use the Bing WMT dashboard directly.'
        : rawMsg
      setResult({ ok: false, msg })
      save({
        id: crypto.randomUUID(), savedAt: new Date().toISOString(),
        label:      `${urls.length} URL${urls.length !== 1 ? 's' : ''} — error`,
        sublabel:   `${ENGINES.find(e => e.value === engine)?.label ?? 'Engine'} · Error`,
        urls, engine, status: 'error', statusText: msg,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg w-fit">
        <button onClick={() => setTab('tool')}
          className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
            tab === 'tool' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>
          IndexNow
        </button>
        <button onClick={() => setTab('history')}
          className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer',
            tab === 'history' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>
          <History size={11} /> History {records.length > 0 && `(${records.length})`}
        </button>
      </div>

      {tab === 'history' ? (
        <HistoryPanel
          records={records}
          onLoad={r => { setUrlInput(r.urls.join('\n')); setEngine(r.engine); setTab('tool') }}
          onDelete={remove}
          onClear={clear}
          emptyText="No submission history yet. Submit URLs to save results."
        />
      ) : (
        <>
          {/* Configuration */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <CardTitle>IndexNow Configuration</CardTitle>
              <InfoTooltip text="IndexNow instantly notifies Bing, Yandex & Naver about new or updated URLs — no waiting for crawlers to discover your changes." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5 flex items-center gap-1">
                  API KEY
                  <InfoTooltip text="A unique key that authenticates your submissions. Must match the content of your key file hosted on the domain." size={10} />
                </div>
                <div className="flex gap-2">
                  <input
                    value={indexNowKey}
                    onChange={e => setIndexNowKey(e.target.value)}
                    placeholder="Paste existing key or generate one"
                    className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors"
                  />
                  <Button variant="ghost" onClick={() => setIndexNowKey(generateKey())} className="shrink-0 text-[11px] gap-1">
                    <RefreshCw size={11} /> Generate
                  </Button>
                  {indexNowKey && (
                    <button onClick={() => copyText(indexNowKey, 'key')}
                      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted hover:text-accent transition-colors cursor-pointer">
                      {copied === 'key' ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">DOMAIN (from Settings)</div>
                <input
                  value={domain || ''}
                  readOnly
                  placeholder="Set your domain in Settings or Onboarding"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-muted font-mono-jarvis outline-none cursor-default"
                />
              </div>
            </div>

            {indexNowKey && host && (
              <div className="mt-4 p-4 bg-surface border border-border rounded-xl space-y-3">
                <div className="text-[10px] text-accent font-mono-jarvis tracking-widest">STEP 1 — HOST YOUR KEY FILE (required before first submission)</div>
                <p className="text-xs text-muted leading-relaxed">
                  Create a plain-text file at the URL below. Its contents must be <strong className="text-tx">only your key</strong> on one line.
                </p>
                <div className="flex items-center gap-2 bg-[#00d4ff08] border border-[#00d4ff25] rounded-lg px-3 py-2">
                  <code className="text-xs text-accent flex-1 break-all font-mono-jarvis">{keyFileUrl}</code>
                  <button onClick={() => copyText(keyFileUrl, 'url')}
                    className="shrink-0 text-muted hover:text-accent transition-colors cursor-pointer">
                    {copied === 'url' ? <Check size={11} /> : <Copy size={11} />}
                  </button>
                </div>
                <div className="text-[10px] text-muted leading-relaxed">
                  File content: <code className="text-accent3 font-mono-jarvis">{indexNowKey}</code>
                  <br />Upload via FTP, WordPress root, or CDN. Search engines verify this file on first submission.
                </div>
              </div>
            )}
          </Card>

          {/* Submit URLs */}
          <Card>
            <CardTitle className="mb-4">Submit URLs</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">URLS TO NOTIFY (one per line)</div>
                <textarea
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  rows={7}
                  placeholder={[
                    `https://${host || 'yoursite.com'}/new-product-review/`,
                    `https://${host || 'yoursite.com'}/bonus-page/`,
                    `https://${host || 'yoursite.com'}/updated-guide/`,
                  ].join('\n')}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors resize-none"
                />
              </div>
              <div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">SEARCH ENGINE</div>
                <div className="space-y-2">
                  {ENGINES.map(eng => (
                    <button key={eng.value} onClick={() => setEngine(eng.value)}
                      className={cn(
                        'w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer',
                        engine === eng.value ? 'border-accent/50 bg-[#00d4ff08]' : 'border-border hover:border-accent/30'
                      )}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-2 h-2 rounded-full shrink-0 transition-colors', engine === eng.value ? 'bg-accent' : 'bg-border')} />
                        <div>
                          <div className="text-[11px] font-semibold text-tx">{eng.label}</div>
                          <div className="text-[9px] text-muted font-mono-jarvis leading-tight">{eng.desc}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={submitting || !indexNowKey || !host || urlCount === 0}>
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                {submitting ? 'Submitting…' : 'Submit to IndexNow'}
              </Button>
              {urlCount > 0 && (
                <span className="text-[11px] text-muted font-mono-jarvis">
                  {urlCount} URL{urlCount !== 1 ? 's' : ''} queued
                </span>
              )}
            </div>

            {!indexNowKey && (
              <div className="mt-3 text-[11px] text-amber-400 font-mono-jarvis">Generate or paste an API key above first.</div>
            )}
            {!host && (
              <div className="mt-2 text-[11px] text-amber-400 font-mono-jarvis">Set your domain in Settings or Onboarding.</div>
            )}

            {result && (
              <div className={cn(
                'mt-4 flex items-start gap-2 p-3 rounded-lg border text-xs leading-relaxed',
                result.ok
                  ? 'border-accent3/40 bg-[#10b98110] text-accent3'
                  : 'border-danger/40 bg-[#ef444410] text-danger'
              )}>
                {result.ok
                  ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                  : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
                <span>{result.msg}</span>
              </div>
            )}
          </Card>

          {/* How it works */}
          <Card>
            <CardTitle className="mb-3">How IndexNow Works</CardTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { step: '01', title: 'Generate Key',  desc: 'Create a unique key that identifies your site to search engines.' },
                { step: '02', title: 'Host Key File', desc: 'Upload {key}.txt to your site root — engines verify it before accepting submissions.' },
                { step: '03', title: 'Submit URLs',   desc: 'Paste the URLs of new or updated pages and click Submit.' },
                { step: '04', title: 'Instant Crawl', desc: 'Bing, Yandex & Naver are notified in seconds — no waiting for crawlers.' },
              ].map(s => (
                <div key={s.step} className="bg-surface border border-border rounded-xl p-3">
                  <div className="text-[10px] text-accent font-mono-jarvis tracking-widest mb-1">{s.step}</div>
                  <div className="text-xs font-semibold text-tx mb-1">{s.title}</div>
                  <div className="text-[10px] text-muted leading-relaxed">{s.desc}</div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
