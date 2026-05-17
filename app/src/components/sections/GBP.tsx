import { Store, MapPin, Star, CheckCircle2 } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'

export function GBP() {
  return (
    <div className="space-y-5">
      <Card>
        <CardTitle className="mb-3">Google Business Profile Connector</CardTitle>
        <p className="text-sm text-muted mb-6 leading-relaxed">
          Connect your Google Business Profile to monitor local pack rankings, review sentiment,
          listing completeness, and GBP optimisation opportunities for your iGaming brand.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { Icon: MapPin,       label: 'Local Pack Rankings',  desc: 'Track rank by city and keyword' },
            { Icon: Star,         label: 'Review Monitoring',    desc: 'Average rating, response rate, sentiment' },
            { Icon: CheckCircle2, label: 'GBP Completeness',     desc: 'Score and actionable gaps in your listing' },
          ].map(({ Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 p-4 bg-surface border border-border rounded-xl">
              <div className="w-9 h-9 rounded-xl bg-[#00d4ff15] flex items-center justify-center shrink-0">
                <Icon size={16} className="text-accent" />
              </div>
              <div>
                <div className="font-semibold text-sm text-tx mb-0.5">{label}</div>
                <div className="text-xs text-muted">{desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 p-3 bg-surface border border-border rounded-xl text-xs text-muted">
          <Store size={14} className="text-accent shrink-0" />
          Google Business Profile OAuth integration coming soon — connect your GBP account to pull live local rankings and reviews.
        </div>
      </Card>
    </div>
  )
}
