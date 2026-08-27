import { Smartphone } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export function MobileApp() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center py-16 border-[#7c3aed30]">
        <div className="w-16 h-16 rounded-2xl bg-[#7c3aed15] flex items-center justify-center mx-auto mb-5">
          <Smartphone size={28} className="text-accent2" strokeWidth={1.5} />
        </div>
        <Badge variant="purple" className="mb-4">Coming Soon</Badge>
        <div className="font-display font-black text-2xl text-tx mb-3">Mobile App</div>
        <div className="text-sm text-muted leading-relaxed max-w-xs mx-auto">
          Take Caspira on the go — live rank tracking, AI strategy chat, and ranking alerts for your site portfolio, right from your phone.
        </div>
      </Card>
    </div>
  )
}
