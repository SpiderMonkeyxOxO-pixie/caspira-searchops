import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/store'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { NAV } from '@/lib/nav'
import type { NavSection } from '@/types'

function LogoMark() {
  return (
    <img
      src="/jarvis-icon.png"
      alt="Jarvis"
      width={36}
      height={36}
      className="shrink-0 rounded-lg"
    />
  )
}

export function Sidebar() {
  const { activeSection, setSection, domain, sidebarCollapsed, setSidebarCollapsed } = useStore()
  const { org, myRole, rolePermissions } = useAuthStore()
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  function canAccess(id: NavSection): boolean {
    if (!myRole || myRole === 'owner' || myRole === 'admin') return true
    const allowed = rolePermissions[myRole]
    if (!allowed || allowed.length === 0) return true
    return allowed.includes(id)
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.reload()
  }

  function toggleGroup(label: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  return (
    <aside className={cn(
      'min-h-screen bg-surface border-r border-border flex flex-col fixed left-0 top-0 bottom-0 z-50 transition-all duration-300 overflow-hidden',
      sidebarCollapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className={cn(
        'py-4 border-b border-border flex items-center shrink-0',
        sidebarCollapsed ? 'justify-center' : 'gap-3 px-5'
      )}>
        <LogoMark />
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <div className="font-display font-bold text-base tracking-wide text-tx leading-tight">JARVIS</div>
            <div className="text-[9px] text-muted tracking-[3px] font-mono-jarvis uppercase mt-0.5">iGaming SEO</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        {NAV.map((group, groupIdx) => {
          const isGroupCollapsed = collapsedGroups.has(group.label)
          const showItems = !isGroupCollapsed || sidebarCollapsed

          return (
            <div key={group.label} className="mb-1">
              {/* Divider between groups in collapsed mode */}
              {sidebarCollapsed && groupIdx > 0 && (
                <div className="border-t border-border/40 mx-3 my-1.5" />
              )}

              {/* Group label row — only in expanded mode */}
              {!sidebarCollapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between text-[9px] tracking-[2.5px] text-muted px-2 py-1 mb-1 font-mono-jarvis hover:text-tx transition-colors cursor-pointer group"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    size={10}
                    className={cn(
                      'transition-transform duration-200 opacity-60 group-hover:opacity-100',
                      isGroupCollapsed ? '-rotate-90' : ''
                    )}
                  />
                </button>
              )}

              {/* Nav items */}
              {showItems && group.items.filter(item => canAccess(item.id)).map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setSection(item.id)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={cn(
                      'w-full flex items-center rounded-lg mb-0.5 transition-all duration-200 cursor-pointer border',
                      sidebarCollapsed
                        ? 'justify-center py-2.5'
                        : 'gap-2.5 px-3 py-2 text-[12.5px]',
                      isActive
                        ? 'bg-linear-to-r from-[#00d4ff15] to-[#7c3aed15] text-accent border-accent/40 shadow-[0_0_20px_#00d4ff08]'
                        : 'text-muted border-transparent hover:bg-[#00d4ff08] hover:text-tx hover:border-border'
                    )}
                  >
                    <Icon
                      size={14}
                      className={cn('shrink-0', isActive ? 'text-accent' : 'text-muted')}
                      strokeWidth={1.75}
                    />
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 truncate font-medium text-left">{item.label}</span>
                        {item.badge && (
                          <span className={cn('text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full shrink-0', item.badgeColor)}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border shrink-0">
        {/* Collapse / expand toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            'w-full flex items-center py-2.5 text-muted hover:text-tx hover:bg-[#00d4ff08] transition-colors cursor-pointer',
            sidebarCollapsed ? 'justify-center' : 'gap-2 px-4'
          )}
        >
          {sidebarCollapsed ? (
            <ChevronRight size={14} />
          ) : (
            <>
              <ChevronLeft size={14} />
              <span className="text-[10px] font-mono-jarvis">Collapse sidebar</span>
            </>
          )}
        </button>

        {/* Org + property info — only when expanded */}
        {!sidebarCollapsed && (
          <div className="px-3 pb-3 space-y-2">
            {/* Organization */}
            {org && (
              <div className="bg-card border border-border rounded-xl p-3">
                <div className="text-[9px] text-muted tracking-[2px] mb-1 font-mono-jarvis uppercase">Organization</div>
                <div className="text-xs text-tx font-semibold truncate">{org.name}</div>
                <div className="text-[10px] text-muted font-mono-jarvis mt-0.5 capitalize">{myRole?.replace('_', ' ')}</div>
              </div>
            )}
            {/* Active property */}
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="text-[9px] text-muted tracking-[2px] mb-1 font-mono-jarvis uppercase">Active Property</div>
              <div className="text-xs text-accent font-mono-jarvis truncate">{domain || 'yoursite.com'}</div>
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent3 animate-pulse" />
                <span className="text-[10px] text-accent3 font-medium">Monitoring</span>
              </div>
            </div>
            {/* Sign out */}
            <button onClick={signOut}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer font-mono-jarvis">
              <LogOut size={12} /> Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
