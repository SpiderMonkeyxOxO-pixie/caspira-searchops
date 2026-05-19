import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Search, Link2, ArrowRight, AlertCircle, GitGraph } from 'lucide-react'
import { callClaude, isAIReady } from '@/lib/ai'
import { useStore } from '@/store'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface LinkNode {
  id: string
  label: string
  type: 'pillar' | 'cluster' | 'orphan'
  inbound: number
  outbound: number
  url: string
}

interface LinkEdge {
  from: string
  to: string
}

interface LinkMapData {
  nodes: LinkNode[]
  edges: LinkEdge[]
  orphans: string[]
  recommendations: string[]
}

const TYPE_COLOR: Record<LinkNode['type'], string> = {
  pillar:  '#00d4ff',
  cluster: '#7c3aed',
  orphan:  '#ef4444',
}


function MiniGraph({ data }: { data: LinkMapData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)

    const positions: Record<string, { x: number; y: number }> = {}

    // Hub-and-spoke layout: pillars inner, clusters middle, orphans outer
    const pillars  = data.nodes.filter(n => n.type === 'pillar')
    const clusters = data.nodes.filter(n => n.type === 'cluster')
    const orphans  = data.nodes.filter(n => n.type === 'orphan')

    const place = (nodes: LinkNode[], radius: number) => {
      nodes.forEach((node, i) => {
        const angle = (i / Math.max(nodes.length, 1)) * 2 * Math.PI - Math.PI / 2
        positions[node.id] = {
          x: W / 2 + radius * Math.cos(angle),
          y: H / 2 + radius * Math.sin(angle),
        }
      })
    }

    place(pillars,  pillars.length === 1 ? 0 : 75)
    place(clusters, 145)
    place(orphans,  195)

    // Draw edges with arrowheads
    data.edges.forEach(e => {
      const from = positions[e.from], to = positions[e.to]
      if (!from || !to || (from.x === to.x && from.y === to.y)) return

      const toNode  = data.nodes.find(n => n.id === e.to)
      const nodeR   = toNode?.type === 'pillar' ? 18 : 12
      const dx = to.x - from.x, dy = to.y - from.y
      const len = Math.sqrt(dx * dx + dy * dy)
      const ux = dx / len, uy = dy / len

      // Shorten line to node edge
      const ex = to.x - ux * nodeR, ey = to.y - uy * nodeR

      ctx.strokeStyle = '#1e3a5f'
      ctx.lineWidth   = 1
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(ex, ey)
      ctx.stroke()

      // Arrowhead
      const headLen = 7
      const angle   = Math.atan2(ey - from.y, ex - from.x)
      ctx.fillStyle = '#1e3a5f'
      ctx.beginPath()
      ctx.moveTo(ex, ey)
      ctx.lineTo(ex - headLen * Math.cos(angle - 0.4), ey - headLen * Math.sin(angle - 0.4))
      ctx.lineTo(ex - headLen * Math.cos(angle + 0.4), ey - headLen * Math.sin(angle + 0.4))
      ctx.closePath()
      ctx.fill()
    })

    // Draw nodes
    data.nodes.forEach(node => {
      const pos = positions[node.id]
      if (!pos) return
      const radius = node.type === 'pillar' ? 18 : 12
      const color  = TYPE_COLOR[node.type]

      // Glow
      const grd = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 2)
      grd.addColorStop(0, color + '22')
      grd.addColorStop(1, 'transparent')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, radius * 2, 0, 2 * Math.PI)
      ctx.fill()

      // Node circle
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI)
      ctx.fillStyle = color + '25'
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth   = node.type === 'pillar' ? 2.5 : 1.5
      ctx.stroke()

      // Label (truncated to 10 chars)
      const label = node.label.length > 10 ? node.label.slice(0, 9) + '…' : node.label
      ctx.fillStyle    = color
      ctx.font         = `${node.type === 'pillar' ? '10' : '8'}px monospace`
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, pos.x, pos.y)
    })
  }, [data])

  return <canvas ref={canvasRef} width={480} height={360} className="w-full" />
}

export function LinkMap() {
  const { domain } = useStore()
  const [url, setUrl] = useState(domain || '')
  const [mapData, setMapData] = useState<LinkMapData | null>(null)
  const [filter, setFilter] = useState<'all' | LinkNode['type']>('all')

  const analyze = useMutation({
    mutationFn: async () => {
      return callClaude(
        'You are an internal link architecture expert. Analyse site structure and identify link gaps.',
        `Analyse internal link structure for: ${url || 'a typical SEO website'}

Return ONLY JSON:
{
  "nodes": [
    {"id":"home","label":"Home","type":"pillar","inbound":12,"outbound":8,"url":"${url || 'site.com'}/"},
    {"id":"page1","label":"SEO Guide","type":"cluster","inbound":4,"outbound":3,"url":"${url || 'site.com'}/seo-guide"}
  ],
  "edges": [{"from":"home","to":"page1"}],
  "orphans": ["Page Name"],
  "recommendations": ["Specific internal linking recommendation"]
}

node types: pillar (main hubs), cluster (supporting pages), orphan (no inbound links).
Include 8-10 nodes, realistic edges, 2-3 orphans, 4 actionable recommendations.`,
        1400,
      )
    },
    onSuccess: (data) => {
      if (data) {
        try {
          const match = data.match(/\{[\s\S]*\}/)
          if (match) setMapData(JSON.parse(match[0]) as LinkMapData)
        } catch { /* keep mock */ }
      }
    },
  })

  const nodes = mapData?.nodes.filter(n => filter === 'all' || n.type === filter) ?? []

  return (
    <div className="space-y-5">
      {/* Input */}
      <Card>
        <CardTitle className="mb-3">Internal Link Map</CardTitle>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={url} onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyze.mutate()}
              placeholder="yoursite.com"
              className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors font-mono-jarvis"
            />
          </div>
          <Button variant="primary" onClick={() => analyze.mutate()} disabled={analyze.isPending}>
            {analyze.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
            {analyze.isPending ? 'Mapping…' : 'Generate Link Map'}
          </Button>
        </div>
        {!isAIReady() && <div className="mt-2 text-[11px] text-muted">Add an AI key in Onboarding.</div>}
      </Card>

      {mapData && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'PILLAR PAGES',   val: mapData.nodes.filter(n=>n.type==='pillar').length,  color: '#00d4ff' },
              { label: 'CLUSTER PAGES',  val: mapData.nodes.filter(n=>n.type==='cluster').length, color: '#7c3aed' },
              { label: 'ORPHAN PAGES',   val: mapData.nodes.filter(n=>n.type==='orphan').length,  color: '#ef4444' },
            ].map(s => (
              <Card key={s.label} className="text-center py-4">
                <div className="text-3xl font-display font-black mb-1" style={{ color: s.color }}>{s.val}</div>
                <div className="text-[10px] text-muted font-mono-jarvis tracking-widest">{s.label}</div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Visualisation */}
            <Card>
              <CardTitle className="mb-3">Link Topology</CardTitle>
              <div className="flex gap-3 text-[10px] text-muted mb-3">
                {[
                  { key: 'pillar',  label: 'Pillar',  color: '#00d4ff' },
                  { key: 'cluster', label: 'Cluster', color: '#7c3aed' },
                  { key: 'orphan',  label: 'Orphan',  color: '#ef4444' },
                ].map(l => (
                  <span key={l.key} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: l.color }} />
                    {l.label}
                  </span>
                ))}
              </div>
              <MiniGraph data={mapData} />
            </Card>

            {/* Recommendations */}
            <Card>
              <CardTitle className="mb-3">Recommendations</CardTitle>
              {mapData.orphans.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-[#ef444415] border border-[#ef444430] rounded-lg mb-4">
                  <AlertCircle size={13} className="text-danger mt-0.5 shrink-0" />
                  <div className="text-xs text-muted">
                    <span className="text-danger font-semibold">{mapData.orphans.length} orphaned pages: </span>
                    {mapData.orphans.join(', ')}
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {mapData.recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <ArrowRight size={12} className="text-accent mt-0.5 shrink-0" />
                    <span className="text-xs text-tx leading-relaxed">{r}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Node table */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <CardTitle>Page Index</CardTitle>
              <div className="flex gap-1">
                {(['all', 'pillar', 'cluster', 'orphan'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg font-mono-jarvis tracking-wide transition-colors cursor-pointer ${filter === f ? 'bg-accent text-black' : 'text-muted hover:text-tx'}`}>
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {nodes.map(node => (
                <div key={node.id} className="flex items-center gap-3 p-2.5 bg-surface border border-border rounded-lg">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TYPE_COLOR[node.type] }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-tx truncate">{node.label}</div>
                    <div className="text-[10px] text-muted font-mono-jarvis truncate">{node.url}</div>
                  </div>
                  <Badge variant={node.type === 'pillar' ? 'accent' : node.type === 'cluster' ? 'purple' : 'red'}>
                    {node.type}
                  </Badge>
                  <div className="text-[11px] text-muted font-mono-jarvis text-right shrink-0">
                    <div>{node.inbound} in</div>
                    <div>{node.outbound} out</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {!mapData && (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <GitGraph size={40} className="mb-3 text-muted" strokeWidth={1} />
          <div className="text-sm text-muted">Enter your domain to visualise internal link structure</div>
        </div>
      )}
    </div>
  )
}
