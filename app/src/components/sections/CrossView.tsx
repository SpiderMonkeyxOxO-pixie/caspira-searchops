import { GitMerge, BarChart2, Search, Unplug } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'

export function CrossView() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <Card>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#00d4ff15] flex items-center justify-center shrink-0">
            <GitMerge size={18} className="text-accent" />
          </div>
          <div>
            <CardTitle>GSC + GA4 Cross-View</CardTitle>
            <div className="text-[11px] text-muted font-mono-jarvis mt-0.5">Search Console impressions/clicks merged with GA4 conversions and revenue</div>
          </div>
        </div>
      </Card>

      {/* Empty state */}
      <Card className="py-16 text-center">
        <Unplug size={40} className="mx-auto mb-4 text-muted opacity-40" strokeWidth={1.25} />
        <div className="text-sm font-semibold text-tx mb-2">Connect GSC + GA4 to see cross-view data</div>
        <div className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
          This view merges Search Console impressions &amp; clicks with GA4 conversions and revenue.
          Connect both sources first — then real data will appear here automatically.
        </div>
        <div className="flex items-center justify-center gap-3 mt-5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted font-mono-jarvis">
            <Search size={11} /> GSC — Search Console
          </div>
          <div className="text-muted text-xs">+</div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted font-mono-jarvis">
            <BarChart2 size={11} /> GA4 — Analytics
          </div>
        </div>
      </Card>
    </div>
  )
}
