import { Target, RefreshCw, ExternalLink } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'


function ProviderCard({ name, tagline, connected, connecting, color, logo, onConnect }: {
  name: string; tagline: string; connected: boolean; connecting: boolean; color: string;
  logo: React.ReactNode; onConnect: () => void
}) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
      connected ? 'border-accent/30 bg-[#00d4ff08]' : 'border-border bg-surface'
    }`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '20' }}>
          {logo}
        </div>
        <div>
          <div className="font-semibold text-sm text-tx">{name}</div>
          <div className="text-[10px] text-muted">{tagline}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {connected
          ? <Badge variant="green">Connected</Badge>
          : (
            <Button variant="ghost" className="text-[11px]" onClick={onConnect} disabled={connecting}>
              {connecting ? <RefreshCw size={11} className="animate-spin" /> : <ExternalLink size={11} />}
              {connecting ? 'Connecting…' : 'Connect'}
            </Button>
          )
        }
      </div>
    </div>
  )
}

function HubSpotLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="#FF7A59" />
      <path d="M10 6v4l3 2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="10" cy="10" r="2" fill="white" />
    </svg>
  )
}

function SalesforceLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <ellipse cx="10" cy="10" rx="10" ry="10" fill="#00A1E0"/>
      <path d="M6 10a4 4 0 0 1 8 0" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="10" cy="13" r="2" fill="white"/>
    </svg>
  )
}

export function CRM() {
  return (
    <div className="space-y-5">
      <Card>
        <CardTitle className="mb-3">CRM Integration</CardTitle>
        <p className="text-sm text-muted mb-5 leading-relaxed">
          Connect HubSpot or Salesforce to track which iGaming keywords drive real closed deals —
          so you can prove SEO ROI from organic visit right through to revenue.
        </p>
        <div className="space-y-3 mb-5">
          <ProviderCard
            name="HubSpot" tagline="Deals · Contacts · Pipeline attribution"
            connected={false} connecting={false} color="#FF7A59"
            logo={<HubSpotLogo />} onConnect={() => {}}
          />
          <ProviderCard
            name="Salesforce" tagline="Opportunities · Leads · Revenue reporting"
            connected={false} connecting={false} color="#00A1E0"
            logo={<SalesforceLogo />} onConnect={() => {}}
          />
        </div>
        <div className="p-3 bg-surface border border-border rounded-xl text-xs text-muted flex items-center gap-2">
          <Target size={13} className="text-accent shrink-0" />
          HubSpot and Salesforce OAuth integration coming soon — connect to pull live deal pipeline and keyword attribution.
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Keyword → Lead attribution', desc: 'See which casino keywords bring leads, not just traffic' },
          { label: 'Pipeline stage tracking',    desc: 'Map organic sessions through MQL, SQL to closed deals' },
          { label: 'True SEO ROI',              desc: 'Report actual revenue driven by organic search' },
        ].map(({ label, desc }) => (
          <Card key={label} className="py-4">
            <Target size={16} className="text-accent mb-2" />
            <div className="font-semibold text-sm text-tx mb-1">{label}</div>
            <div className="text-xs text-muted leading-relaxed">{desc}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}
