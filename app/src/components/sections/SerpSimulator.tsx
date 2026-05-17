import { useState } from 'react'
import { Monitor, Smartphone, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface RichOptions {
  rating: boolean
  ratingValue: string
  ratingCount: string
  breadcrumbs: boolean
  date: boolean
  sitelinks: boolean
}

const CHAR_LIMITS = { title: 60, description: 160 }

function charColor(len: number, max: number) {
  if (len > max)        return '#ef4444'
  if (len > max * 0.9)  return '#f59e0b'
  return '#10b981'
}

function CharCounter({ val, max }: { val: string; max: number }) {
  const len = val.length
  const color = charColor(len, max)
  return (
    <span className="font-mono-jarvis text-[10px]" style={{ color }}>
      {len}/{max}
    </span>
  )
}

function DesktopPreview({ title, url, description, date, rich }: {
  title: string; url: string; description: string; date: string; rich: RichOptions
}) {
  const displayUrl = url || 'yoursite.com/page'
  const parts = displayUrl.split('/').filter(Boolean)
  const breadcrumbStr = parts.length > 1
    ? parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, ' ')).join(' › ')
    : displayUrl

  const displayTitle = title || 'Your Page Title Goes Here'
  const displayDesc  = description || 'Your meta description will appear here. Make it compelling and include your target keyword for best click-through rates.'

  return (
    <div className="bg-white rounded-xl p-5 font-sans shadow-sm border border-gray-100">
      {/* URL + favicon */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px] text-gray-500 font-bold">
          {displayUrl.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="text-[13px] text-gray-600 leading-tight">{displayUrl.split('/')[0]}</div>
          {rich.breadcrumbs && parts.length > 1 && (
            <div className="text-[11px] text-gray-500">{breadcrumbStr}</div>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="text-[20px] text-[#1a0dab] hover:underline cursor-pointer leading-snug mb-1 font-normal">
        {displayTitle.slice(0, 70)}
        {displayTitle.length > 70 && '…'}
      </div>

      {/* Date + rating */}
      {(rich.date || rich.rating) && (
        <div className="flex items-center gap-2 mb-1">
          {rich.date && date && (
            <span className="text-[13px] text-gray-500">{date} — </span>
          )}
          {rich.rating && (
            <div className="flex items-center gap-1">
              <span className="text-[13px] text-gray-700 font-bold">{rich.ratingValue}</span>
              <div className="flex">
                {[1,2,3,4,5].map(i => (
                  <span key={i} style={{ color: i <= Math.round(parseFloat(rich.ratingValue)) ? '#fbbc04' : '#ccc', fontSize: 14 }}>★</span>
                ))}
              </div>
              <span className="text-[13px] text-[#006621]">{rich.ratingCount} reviews</span>
            </div>
          )}
        </div>
      )}

      {/* Description */}
      <div className="text-[14px] text-[#4d5156] leading-snug max-w-150">
        {displayDesc.slice(0, 180)}
        {displayDesc.length > 180 && '…'}
      </div>

      {/* Sitelinks */}
      {rich.sitelinks && (
        <div className="flex gap-4 mt-2">
          {['Casino Reviews', 'Bonus Offers', 'Free Spins', 'Live Casino'].map(sl => (
            <a key={sl} href="#" className="text-[13px] text-[#1a0dab] hover:underline">{sl}</a>
          ))}
        </div>
      )}
    </div>
  )
}

function MobilePreview({ title, url, description, rich }: {
  title: string; url: string; description: string; rich: RichOptions
}) {
  const displayTitle = title || 'Your Page Title Goes Here'
  const displayDesc  = description || 'Your meta description will appear here.'

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden max-w-sm mx-auto font-sans">
      {/* Mobile search bar mock */}
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <div className="bg-white rounded-full px-3 py-1.5 flex items-center gap-2 border border-gray-300 text-[13px] text-gray-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          best online casino uk
        </div>
      </div>

      {/* Result card */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[9px] text-gray-500 font-bold">
            {(url || 'Y').charAt(0).toUpperCase()}
          </div>
          <div className="text-[13px] text-gray-600 truncate">{url || 'yoursite.com'}</div>
        </div>

        {rich.rating && (
          <div className="flex items-center gap-1 mb-1">
            <div className="flex">
              {[1,2,3,4,5].map(i => (
                <span key={i} style={{ color: i <= Math.round(parseFloat(rich.ratingValue)) ? '#fbbc04' : '#ccc', fontSize: 12 }}>★</span>
              ))}
            </div>
            <span className="text-[12px] text-[#006621]">{rich.ratingCount}</span>
          </div>
        )}

        <div className="text-[16px] text-[#1a0dab] leading-snug mb-1 font-normal">
          {displayTitle.slice(0, 55)}{displayTitle.length > 55 && '…'}
        </div>
        <div className="text-[13px] text-[#4d5156] leading-snug">
          {displayDesc.slice(0, 120)}{displayDesc.length > 120 && '…'}
        </div>
      </div>
    </div>
  )
}

export function SerpSimulator() {
  const [title,   setTitle]   = useState('')
  const [url,     setUrl]     = useState('')
  const [desc,    setDesc]    = useState('')
  const [date,    setDate]    = useState('')
  const [view,    setView]    = useState<'desktop' | 'mobile'>('desktop')
  const [rich, setRich] = useState<RichOptions>({
    rating: false, ratingValue: '4.8', ratingCount: '1,240',
    breadcrumbs: true, date: false, sitelinks: false,
  })

  const titleOk = title.length > 0 && title.length <= CHAR_LIMITS.title
  const descOk  = desc.length > 0 && desc.length <= CHAR_LIMITS.description

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Inputs */}
        <Card className="lg:col-span-2 space-y-4">
          <CardTitle>SERP Simulator</CardTitle>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] text-muted font-mono-jarvis tracking-widest">TITLE TAG</div>
              <CharCounter val={title} max={CHAR_LIMITS.title} />
            </div>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors" />
            {title.length > CHAR_LIMITS.title && (
              <div className="flex items-center gap-1 mt-1 text-[10px] text-danger">
                <AlertCircle size={10} /> Title exceeds 60 chars — Google may truncate
              </div>
            )}
          </div>

          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">URL / SLUG</div>
            <input value={url} onChange={e => setUrl(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx font-mono-jarvis outline-none focus:border-accent transition-colors" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] text-muted font-mono-jarvis tracking-widest">META DESCRIPTION</div>
              <CharCounter val={desc} max={CHAR_LIMITS.description} />
            </div>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors resize-none" />
            {desc.length > CHAR_LIMITS.description && (
              <div className="flex items-center gap-1 mt-1 text-[10px] text-danger">
                <AlertCircle size={10} /> Description exceeds 160 chars — Google may truncate
              </div>
            )}
          </div>

          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">PUBLISH DATE</div>
            <input value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors" />
          </div>

          {/* Rich result options */}
          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-2">RICH RESULTS</div>
            <div className="space-y-2">
              {[
                { key: 'breadcrumbs' as const, label: 'Breadcrumbs' },
                { key: 'rating' as const,      label: 'Star Rating' },
                { key: 'date' as const,        label: 'Publish Date' },
                { key: 'sitelinks' as const,   label: 'Sitelinks (desktop)' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setRich(r => ({ ...r, [key]: !r[key] }))}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${rich[key] ? 'bg-accent border-accent' : 'border-border'}`}
                  >
                    {rich[key] && <CheckCircle2 size={10} className="text-black" />}
                  </div>
                  <span className="text-xs text-tx">{label}</span>
                </label>
              ))}
              {rich.rating && (
                <div className="grid grid-cols-2 gap-2 pl-6">
                  <div>
                    <div className="text-[10px] text-muted mb-1">Rating</div>
                    <input value={rich.ratingValue} onChange={e => setRich(r => ({ ...r, ratingValue: e.target.value }))}
                      className="w-full bg-surface border border-border rounded px-2 py-1 text-xs text-tx font-mono-jarvis outline-none focus:border-accent" />
                  </div>
                  <div>
                    <div className="text-[10px] text-muted mb-1">Reviews</div>
                    <input value={rich.ratingCount} onChange={e => setRich(r => ({ ...r, ratingCount: e.target.value }))}
                      className="w-full bg-surface border border-border rounded px-2 py-1 text-xs text-tx font-mono-jarvis outline-none focus:border-accent" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status badges */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant={titleOk ? 'green' : 'red'}>Title {titleOk ? 'OK' : 'Too Long'}</Badge>
            <Badge variant={descOk  ? 'green' : 'red'}>Desc {descOk  ? 'OK' : 'Too Long'}</Badge>
          </div>
        </Card>

        {/* Preview */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Live Preview</CardTitle>
            <div className="flex gap-1">
              {([
                { id: 'desktop' as const, Icon: Monitor },
                { id: 'mobile'  as const, Icon: Smartphone },
              ]).map(({ id, Icon }) => (
                <button key={id} onClick={() => setView(id)}
                  className={`p-2 rounded-lg border transition-colors cursor-pointer ${view === id ? 'bg-accent/10 border-accent/40 text-accent' : 'border-border text-muted hover:border-accent/30'}`}>
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#f8f9fa] rounded-xl p-5">
            {view === 'desktop'
              ? <DesktopPreview title={title} url={url} description={desc} date={date} rich={rich} />
              : <MobilePreview title={title} url={url} description={desc} rich={rich} />
            }
          </div>

          {/* Tips */}
          <div className="mt-4 space-y-2">
            {[
              { ok: title.includes('2026'), tip: 'Year in title — freshness signal for casino queries', warn: 'Add "2026" to your title for freshness' },
              { ok: title.split(' ').length >= 5, tip: 'Title length gives enough keyword context', warn: 'Title may be too short — add more descriptive terms' },
              { ok: desc.length >= 100, tip: 'Description length is sufficient', warn: 'Meta description is too short — aim for 130–160 characters' },
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px]">
                {t.ok ? <CheckCircle2 size={12} className="text-accent3 mt-0.5 shrink-0" /> : <AlertCircle size={12} className="text-accent4 mt-0.5 shrink-0" />}
                <span className={t.ok ? 'text-muted' : 'text-tx'}>{t.ok ? t.tip : t.warn}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
