import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useStore } from '@/store'

interface RemoteCursor {
  user_id: string
  email: string
  x: number   // 0–1 fraction of viewport width
  y: number   // 0–1 fraction of viewport height
  section: string
  color: string
}

const COLORS = [
  '#00d4ff', '#a855f7', '#f97316', '#ec4899',
  '#10b981', '#6366f1', '#ef4444', '#eab308',
]

function colorFor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff
  return COLORS[Math.abs(h) % COLORS.length]
}

function CursorSVG({ color }: { color: string }) {
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 2 L2 18 L6 14 L9 21 L11.5 20 L8.5 13 L14 13 Z"
        fill={color}
        stroke="rgba(0,0,0,0.55)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CursorPresence() {
  const { session, org } = useAuthStore()
  const { activeSection } = useStore()
  const [cursors, setCursors] = useState<Map<string, RemoteCursor>>(new Map())
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const lastSent   = useRef(0)

  const myId    = session?.user?.id    ?? ''
  const myEmail = session?.user?.email ?? ''

  // ── Join presence channel ──────────────────────────────────
  useEffect(() => {
    if (!org?.id || !myId) return

    const channel = supabase.channel(`cursors:${org.id}`, {
      config: { presence: { key: myId } },
    })
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ email: string; x: number; y: number; section: string }>()
        setCursors(() => {
          const next = new Map<string, RemoteCursor>()
          for (const [uid, list] of Object.entries(state)) {
            if (uid === myId) continue
            const p = list[0]
            if (!p) continue
            next.set(uid, { user_id: uid, email: p.email, x: p.x, y: p.y, section: p.section, color: colorFor(uid) })
          }
          return next
        })
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key === myId) return
        const p = newPresences[0] as { email: string; x: number; y: number; section: string } | undefined
        if (!p) return
        setCursors(prev => new Map(prev).set(key, { user_id: key, email: p.email, x: p.x, y: p.y, section: p.section, color: colorFor(key) }))
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setCursors(prev => { const n = new Map(prev); n.delete(key); return n })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ email: myEmail, x: 0.5, y: 0.5, section: activeSection })
        }
      })

    return () => {
      channel.untrack().catch(() => {})
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id, myId])

  // ── Broadcast section changes ──────────────────────────────
  useEffect(() => {
    channelRef.current?.track({ email: myEmail, x: 0.5, y: 0.5, section: activeSection }).catch(() => {})
  }, [activeSection, myEmail])

  // ── Broadcast mouse position (throttled to ~20 fps) ────────
  const onMouseMove = useCallback((e: MouseEvent) => {
    const now = Date.now()
    if (now - lastSent.current < 50) return
    lastSent.current = now
    channelRef.current?.track({
      email: myEmail,
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
      section: useStore.getState().activeSection,
    }).catch(() => {})
  }, [myEmail])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    return () => window.removeEventListener('mousemove', onMouseMove)
  }, [onMouseMove])

  // ── Render ─────────────────────────────────────────────────
  const list = Array.from(cursors.values())
  if (list.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {list.map(c => {
        const px   = c.x * window.innerWidth
        const py   = c.y * window.innerHeight
        const name = c.email.split('@')[0]

        return (
          <div
            key={c.user_id}
            className="absolute transition-[left,top] ease-linear"
            style={{ left: px, top: py, transitionDuration: '45ms' }}
          >
            <CursorSVG color={c.color} />
            <div
              className="absolute top-4 left-4 px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap leading-tight"
              style={{
                background: c.color + '22',
                border: `1px solid ${c.color}55`,
                color: c.color,
              }}
            >
              {name}
            </div>
          </div>
        )
      })}
    </div>
  )
}
