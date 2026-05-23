import { useState, useRef } from 'react'
import { Palette, Download, Copy, Check, Upload, X, History } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { HistoryPanel } from '@/components/ui/HistoryPanel'
import { useHistory } from '@/lib/history'
import { cn } from '@/lib/utils'

interface Theme {
  id: string; label: string
  bg: string; bg2: string; accent: string; text: string; subtext: string; bar: string
}

const THEMES: Theme[] = [
  { id: 'dark',   label: 'Dark Neon',     bg: '#0a0f1a', bg2: '#0d1829', accent: '#00d4ff', text: '#ffffff', subtext: '#9ca3af', bar: '#00d4ff' },
  { id: 'purple', label: 'Purple Premium', bg: '#1a0a2e', bg2: '#210c3a', accent: '#a78bfa', text: '#ffffff', subtext: '#c4b5fd', bar: '#7c3aed' },
  { id: 'gold',   label: 'Casino Gold',   bg: '#1a1000', bg2: '#231500', accent: '#f59e0b', text: '#ffffff', subtext: '#fcd34d', bar: '#f59e0b' },
  { id: 'light',  label: 'Clean White',   bg: '#f8f9fa', bg2: '#ffffff', accent: '#1a1a2e', text: '#1a1a2e', subtext: '#4b5563', bar: '#1a1a2e' },
]

const TEMPLATES = ['Article Cover', 'Social Square', 'Wide Banner', 'Card Thumbnail'] as const
const CATEGORIES = ['Casino Review', 'Bonus Guide', 'Slot Guide', 'News', 'Comparison', 'Strategy'] as const

interface ImageRecord {
  id: string; savedAt: string; label: string; sublabel: string
  headline: string; subtitle: string; site: string; category: string; date: string; themeId: string; template: string
}

function splitText(text: string, maxLen: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  words.forEach(w => {
    if ((cur + ' ' + w).trim().length > maxLen) {
      if (cur) lines.push(cur.trim())
      cur = w
    } else {
      cur = (cur + ' ' + w).trim()
    }
  })
  if (cur) lines.push(cur.trim())
  return lines.slice(0, 3)
}

function FeaturedSVG({ headline, subtitle, site, category, date, theme, template, bgImage }: {
  headline: string; subtitle: string; site: string; category: string; date: string
  theme: Theme; template: string; bgImage?: string
}) {
  const headLines  = splitText(headline  || 'Your Article Headline Goes Here', template === 'Wide Banner' ? 28 : 22)
  const subLines   = splitText(subtitle  || 'Expert tested and regularly updated', 40)
  const siteLabel  = site || 'yoursite.com'

  const isSquare = template === 'Social Square'
  const W = 1200, H = isSquare ? 1200 : 630
  const textX = 80, catY = 80, h1Y = catY + 80, subY = h1Y + headLines.length * 85 + 20

  return (
    <svg id="featured-img-svg" viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" className="w-full rounded-xl">
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={theme.bg} />
          <stop offset="100%" stopColor={theme.bg2} />
        </linearGradient>
        <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={theme.accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={theme.accent} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width={W} height={H} fill="url(#bgGrad)" />
      {bgImage && (
        <>
          <image href={bgImage} x="0" y="0" width={W} height={H} preserveAspectRatio="xMidYMid slice" />
          <rect width={W} height={H} fill={theme.bg} opacity="0.72" />
        </>
      )}

      {/* Decorative grid dots */}
      {[...Array(8)].map((_, x) => [...Array(4)].map((__, y) => (
        <circle key={`${x}-${y}`} cx={100 + x * 150} cy={100 + y * 150} r="1.5"
          fill={theme.accent} opacity="0.2" />
      )))}

      {/* Accent stripe left */}
      <rect x="0" y="0" width="6" height={H} fill={theme.bar} />

      {/* Glow blob */}
      <ellipse cx={W * 0.85} cy={H * 0.25} rx="200" ry="150"
        fill={theme.accent} opacity="0.06" />

      {/* Category pill */}
      <rect x={textX} y={catY - 22} width={category.length * 10 + 40} height={34} rx="17"
        fill={theme.accent} opacity="0.15" stroke={theme.accent} strokeOpacity="0.4" strokeWidth="1" />
      <text x={textX + (category.length * 10 + 40) / 2} y={catY}
        textAnchor="middle" fill={theme.accent} fontSize="15" fontFamily="Roboto" fontWeight="700" letterSpacing="2">
        {category.toUpperCase()}
      </text>

      {/* Headline lines */}
      {headLines.map((line, i) => (
        <text key={i} x={textX} y={h1Y + i * 82}
          fill={theme.text} fontSize="72" fontFamily="Roboto" fontWeight="900"
          letterSpacing="-1">
          {line}
        </text>
      ))}

      {/* Divider line */}
      <rect x={textX} y={h1Y + headLines.length * 82 - 10} width="60" height="4" rx="2" fill={theme.accent} />

      {/* Subtitle */}
      {subLines.map((line, i) => (
        <text key={i} x={textX} y={subY + i * 36}
          fill={theme.subtext} fontSize="28" fontFamily="Roboto" fontWeight="400">
          {line}
        </text>
      ))}

      {/* Bottom bar */}
      <rect x="0" y={H - 72} width={W} height="72" fill={theme.accent} opacity="0.08" />
      <line x1="0" y1={H - 72} x2={W} y2={H - 72} stroke={theme.accent} strokeOpacity="0.2" strokeWidth="1" />

      {/* Site name */}
      <text x={textX} y={H - 26}
        fill={theme.accent} fontSize="20" fontFamily="Roboto Mono" fontWeight="500" letterSpacing="1">
        {siteLabel}
      </text>

      {/* Date */}
      <text x={W - textX} y={H - 26} textAnchor="end"
        fill={theme.subtext} fontSize="18" fontFamily="Roboto Mono">
        {date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
      </text>

      {/* Corner accent */}
      <polygon points={`${W},0 ${W - 80},0 ${W},80`} fill={theme.accent} opacity="0.2" />
    </svg>
  )
}

export function ImageBuilder() {
  const [headline,  setHeadline]  = useState('Best Online Casinos UK 2026')
  const [subtitle,  setSubtitle]  = useState('Expert Tested · UKGC Licensed · Updated Daily')
  const [site,      setSite]      = useState('casinoexpert.io')
  const [category,  setCategory]  = useState<typeof CATEGORIES[number]>('Casino Review')
  const [date,      setDate]      = useState(new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }))
  const [themeId,   setThemeId]   = useState('dark')
  const [template,  setTemplate]  = useState<typeof TEMPLATES[number]>('Article Cover')
  const [copied,    setCopied]    = useState(false)
  const [bgImage,   setBgImage]   = useState<string | undefined>()
  const [tab,       setTab]       = useState<'tool' | 'history'>('tool')
  const fileRef = useRef<HTMLInputElement>(null)

  const { records, save, remove, clear } = useHistory<ImageRecord>('jarvis_imagebuilder_history')

  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0]

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setBgImage(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function downloadSVG() {
    const el = document.getElementById('featured-img-svg')
    if (!el) return
    const data = new XMLSerializer().serializeToString(el)
    const blob = new Blob([data], { type: 'image/svg+xml' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'featured-image.svg'; a.click()
    URL.revokeObjectURL(url)
  }

  function downloadPNG() {
    const el = document.getElementById('featured-img-svg')
    if (!el) return
    const data    = new XMLSerializer().serializeToString(el)
    const encoded = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data)
    const canvas  = document.createElement('canvas')
    const isSquare = template === 'Social Square'
    canvas.width = 1200; canvas.height = isSquare ? 1200 : 630
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(blob => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = 'featured-image.png'; a.click()
        URL.revokeObjectURL(url)
      }, 'image/png')
    }
    img.src = encoded
  }

  function copySVGCode() {
    const el = document.getElementById('featured-img-svg')
    if (!el) return
    navigator.clipboard.writeText(new XMLSerializer().serializeToString(el))
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  function saveSnapshot() {
    save({ id: crypto.randomUUID(), savedAt: new Date().toISOString(),
      label: headline || 'Untitled', sublabel: `${template} · ${theme.label}`,
      headline, subtitle, site, category, date, themeId, template })
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-1 p-1 bg-surface border border-border rounded-lg w-fit">
        <button onClick={() => setTab('tool')} className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer', tab === 'tool' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>Image Builder</button>
        <button onClick={() => setTab('history')} className={cn('flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer', tab === 'history' ? 'bg-accent text-black' : 'text-muted hover:text-tx')}>
          <History size={11} /> History {records.length > 0 && `(${records.length})`}
        </button>
      </div>
      {tab === 'history' ? (
        <HistoryPanel
          records={records}
          onLoad={r => { setHeadline(r.headline); setSubtitle(r.subtitle); setSite(r.site); setCategory(r.category as typeof CATEGORIES[number]); setDate(r.date); setThemeId(r.themeId); setTemplate(r.template as typeof TEMPLATES[number]); setTab('tool') }}
          onDelete={remove}
          onClear={clear}
          emptyText="No image configs saved yet. Save a configuration to reuse it."
        />
      ) : (<>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Controls */}
        <Card className="lg:col-span-2 space-y-4">
          <CardTitle>Featured Image Builder</CardTitle>

          {/* Template */}
          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">TEMPLATE</div>
            <div className="grid grid-cols-2 gap-1">
              {TEMPLATES.map(t => (
                <button key={t} onClick={() => setTemplate(t)}
                  className={`py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer border transition-all ${template === t ? 'bg-accent text-black border-accent' : 'border-border text-muted hover:border-accent'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">THEME</div>
            <div className="grid grid-cols-2 gap-1.5">
              {THEMES.map(th => (
                <button key={th.id} onClick={() => setThemeId(th.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${themeId === th.id ? 'border-accent/60' : 'border-border hover:border-accent/30'}`}>
                  <div className="w-5 h-5 rounded-full shrink-0 border border-white/20"
                    style={{ background: `linear-gradient(135deg, ${th.bg}, ${th.accent})` }} />
                  <span className="text-[10px] text-tx">{th.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Inputs */}
          {[
            { label: 'HEADLINE',  val: headline,  set: setHeadline,  ph: 'Best Online Casinos UK 2026' },
            { label: 'SUBTITLE',  val: subtitle,  set: setSubtitle,  ph: 'Expert tested, UKGC licensed' },
            { label: 'SITE NAME', val: site,      set: setSite,      ph: 'casinoexpert.io' },
            { label: 'DATE',      val: date,      set: setDate,      ph: 'May 2026' },
          ].map(f => (
            <div key={f.label}>
              <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1">{f.label}</div>
              <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors" />
            </div>
          ))}

          {/* Category */}
          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1">CATEGORY BADGE</div>
            <select value={category} onChange={e => setCategory(e.target.value as typeof CATEGORIES[number])}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-tx outline-none focus:border-accent transition-colors">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Background image upload */}
          <div>
            <div className="text-[10px] text-muted font-mono-jarvis tracking-widest mb-1.5">BACKGROUND IMAGE</div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            {bgImage ? (
              <div className="flex items-center gap-2 p-2 bg-surface border border-accent/30 rounded-lg">
                <div className="w-10 h-7 rounded overflow-hidden shrink-0 border border-border">
                  <img src={bgImage} className="w-full h-full object-cover" alt="bg" />
                </div>
                <span className="flex-1 text-[11px] text-accent font-mono-jarvis truncate">Custom image applied</span>
                <button onClick={() => { setBgImage(undefined); if (fileRef.current) fileRef.current.value = '' }}
                  className="text-muted hover:text-danger cursor-pointer shrink-0 transition-colors">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-border text-xs text-muted hover:border-accent hover:text-accent transition-colors cursor-pointer">
                <Upload size={13} /> Upload your image
              </button>
            )}
            {bgImage && <div className="text-[10px] text-muted mt-1">Theme overlay applied to keep text readable</div>}
          </div>

          {/* Download */}
          <div className="flex gap-2 pt-1">
            <Button variant="primary" className="flex-1 justify-center" onClick={downloadPNG}>
              PNG
            </Button>
            <Button variant="primary" onClick={downloadSVG}>
              <Download size={13} /> SVG
            </Button>
            <Button variant="ghost" onClick={copySVGCode}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </Button>
            <Button variant="ghost" onClick={saveSnapshot}>
              Save
            </Button>
          </div>
          <div className="text-[10px] text-muted">1200×630px (Open Graph standard) · 1200×1200 for Social Square</div>
        </Card>

        {/* Preview */}
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <CardTitle>Live Preview</CardTitle>
            <div className="text-[10px] text-muted font-mono-jarvis">
              {template === 'Social Square' ? '1200×1200' : '1200×630'} · {theme.label}
            </div>
          </div>
          <div className="rounded-xl overflow-hidden border border-border">
            <FeaturedSVG
              headline={headline} subtitle={subtitle} site={site}
              category={category} date={date} theme={theme} template={template}
              bgImage={bgImage}
            />
          </div>
          <div className="mt-3 p-3 bg-surface border border-border rounded-lg text-[10px] text-muted">
            <Palette size={10} className="inline mr-1 text-accent" />
            Tip: Use Dark Neon or Purple Premium for casino review articles — they match iGaming brand expectations and improve click-through on social shares.
          </div>
        </Card>
      </div>
      </>)}
    </div>
  )
}
