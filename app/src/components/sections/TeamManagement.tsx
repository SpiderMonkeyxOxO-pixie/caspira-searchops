import { useState, useEffect, useCallback } from 'react'
import {
  Users, Mail, Link2, Copy, Check, Trash2, RefreshCw,
  ShieldCheck, Crown, Wrench, PenLine, Eye as EyeIcon, UserPlus, Clock, X, Download,
  Lock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { RolePermissions } from '@/store/authStore'
import { Card, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { downloadCSV } from '@/lib/csv'
import { NAV, ALL_SECTIONS } from '@/lib/nav'
import type { OrgRole, OrgInvite } from '@/types/supabase'
import type { NavSection } from '@/types'

// ── Role metadata ─────────────────────────────────────────────
const ROLE_META: Record<OrgRole, { label: string; color: string; Icon: React.ElementType; access: string }> = {
  owner:          { label: 'Owner',          color: '#f59e0b', Icon: Crown,      access: 'Full access + billing' },
  admin:          { label: 'Admin',          color: '#7c3aed', Icon: ShieldCheck, access: 'Full access, no billing' },
  seo_specialist: { label: 'SEO Specialist', color: '#00d4ff', Icon: UserPlus,   access: 'Keywords, content, AI tools, rank tracker' },
  technical:      { label: 'Technical',      color: '#10b981', Icon: Wrench,     access: 'Tech SEO, integrations, crawl tools' },
  content_writer: { label: 'Content Writer', color: '#ec4899', Icon: PenLine,    access: 'Article writer, calendar, social snippets' },
  viewer:         { label: 'Viewer',         color: '#5a7a9a', Icon: EyeIcon,    access: 'Read-only: dashboard and reports' },
}

const INVITABLE_ROLES: OrgRole[] = ['admin', 'seo_specialist', 'technical', 'content_writer', 'viewer']
const CONFIGURABLE_ROLES: OrgRole[] = ['admin', 'seo_specialist', 'technical', 'content_writer', 'viewer']

const DEFAULT_PERMISSIONS: Record<Exclude<OrgRole, 'owner'>, NavSection[]> = {
  admin: ALL_SECTIONS,
  seo_specialist: [
    'agency', 'sitesmanager', 'dashboard', 'competitors', 'siteexplorer', 'keywords', 'kwexplorer', 'backlinks',
    'tracker', 'serpupdate', 'roadmap', 'seonews', 'gsc', 'crossview',
    'aivisibility',
    'jarvis', 'roaster', 'clustering', 'bulkmeta', 'gapcontent', 'contentspy', 'autorefresh', 'intentanalyzer',
    'articlewriter', 'contentgrader', 'answerpublic', 'topicalmap', 'serpsim', 'faqgen',
    'content', 'contentcal', 'socialsnip', 'imagebuilder', 'pipeline', 'linksuggester',
    'outrank', 'serpfeatures', 'eeat', 'linkmap',
    'scheduler', 'casestudy',
    'onboarding', 'themesettings', 'shortcuts',
  ],
  technical: [
    'dashboard', 'sitesmanager', 'analyzer', 'siteexplorer',
    'tracker', 'roadmap', 'seonews', 'gsc', 'crossview',
    'technical', 'redirectmgr', 'loganalyzer', 'hreflang', 'robotstxt', 'sitemapgen', 'jsseo',
    'ga4', 'apisync', 'crawlimport',
    'serpfeatures', 'schema', 'eeat',
    'onboarding', 'themesettings', 'shortcuts',
  ],
  content_writer: [
    'dashboard', 'seonews',
    'jarvis', 'bulkmeta', 'gapcontent',
    'articlewriter', 'contentgrader', 'answerpublic', 'topicalmap', 'serpsim', 'faqgen',
    'content', 'contentcal', 'socialsnip', 'imagebuilder', 'pipeline', 'linksuggester',
    'onboarding', 'themesettings', 'shortcuts',
  ],
  viewer: [
    'dashboard', 'roadmap', 'seonews', 'tracker', 'casestudy',
    'onboarding', 'themesettings', 'shortcuts',
  ],
}

interface MemberRow {
  id: string; user_id: string; role: OrgRole; joined_at: string
  email: string; full_name: string | null
}

// ── helpers ───────────────────────────────────────────────────
function Avatar({ name, email, size = 32 }: { name?: string | null; email: string; size?: number }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : email[0].toUpperCase()
  return (
    <div className="rounded-full bg-linear-to-br from-[#00d4ff30] to-[#7c3aed30] border border-border
                    flex items-center justify-center font-display font-black text-accent shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {initials}
    </div>
  )
}

function RoleBadge({ role }: { role: OrgRole }) {
  const m = ROLE_META[role]
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
      style={{ color: m.color, background: m.color + '18', borderColor: m.color + '30' }}>
      <m.Icon size={9} /> {m.label}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────
export function TeamManagement() {
  const { user, org, myRole } = useAuthStore()

  const [members,      setMembers]      = useState<MemberRow[]>([])
  const [invites,      setInvites]      = useState<OrgInvite[]>([])
  const [loading,      setLoading]      = useState(true)
  const [inviteEmail,  setInviteEmail]  = useState('')
  const [inviteRole,   setInviteRole]   = useState<OrgRole>('seo_specialist')
  const [sending,      setSending]      = useState(false)
  const [inviteError,  setInviteError]  = useState<string | null>(null)
  const [inviteSuccess,setInviteSuccess]= useState<string | null>(null)
  const [copied,       setCopied]       = useState(false)
  const [tab,          setTab]          = useState<'members' | 'invites' | 'roles' | 'permissions'>('members')

  const canManage = myRole === 'owner' || myRole === 'admin'
  const isOwner   = myRole === 'owner'

  // ── Permissions state ──────────────────────────────────────────
  const { rolePermissions, setRolePermissions } = useAuthStore()
  const [permRole,    setPermRole]    = useState<OrgRole>('seo_specialist')
  const [localPerms,  setLocalPerms]  = useState<RolePermissions>({})
  const [savingPerms, setSavingPerms] = useState(false)
  const [permsSaved,  setPermsSaved]  = useState(false)

  useEffect(() => {
    if (tab !== 'permissions') return
    const init: RolePermissions = {}
    for (const role of CONFIGURABLE_ROLES) {
      init[role] = rolePermissions[role] ?? DEFAULT_PERMISSIONS[role as Exclude<OrgRole, 'owner'>] ?? []
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalPerms(init)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  function toggleSection(section: NavSection, role: OrgRole) {
    setLocalPerms(prev => {
      const cur = prev[role] ?? []
      return { ...prev, [role]: cur.includes(section) ? cur.filter(s => s !== section) : [...cur, section] }
    })
  }

  function toggleGroup(groupItems: NavSection[], role: OrgRole, enable: boolean) {
    setLocalPerms(prev => {
      const cur = prev[role] ?? []
      const next = enable
        ? [...new Set([...cur, ...groupItems])]
        : cur.filter(s => !groupItems.includes(s))
      return { ...prev, [role]: next }
    })
  }

  async function savePermissions() {
    if (!org) return
    setSavingPerms(true)
    const { error } = await supabase
      .from('jarvis_organizations')
      .update({ role_permissions: localPerms } as never)
      .eq('id', org.id)
    if (!error) {
      setRolePermissions(localPerms)
      setPermsSaved(true)
      setTimeout(() => setPermsSaved(false), 2500)
    }
    setSavingPerms(false)
  }

  function resetToDefaults() {
    const init: RolePermissions = {}
    for (const role of CONFIGURABLE_ROLES) {
      init[role] = DEFAULT_PERMISSIONS[role as Exclude<OrgRole, 'owner'>]
    }
    setLocalPerms(init)
  }

  const shareLink = org
    ? `${window.location.origin}/invite/${org.id}`
    : ''

  const load = useCallback(async () => {
    if (!org) return
    setLoading(true)
    type RawMember = { id: string; user_id: string; role: string; joined_at: string }
    type RawProfile = { full_name: string | null; avatar_url: string | null } | null

    try {
      // Members — join with profiles for name/email
      const { data: rawMembers } = await supabase
        .from('jarvis_org_members')
        .select('id, user_id, role, joined_at')
        .eq('org_id', org.id)
        .order('joined_at') as { data: RawMember[] | null; error: unknown }

      if (rawMembers) {
        const enriched: MemberRow[] = await Promise.all(
          rawMembers.map(async m => {
            const { data: profile } = await supabase
              .from('jarvis_profiles')
              .select('full_name, avatar_url')
              .eq('id', m.user_id)
              .single() as { data: RawProfile; error: unknown }

            const email = m.user_id === user?.id ? (user?.email ?? '—') : `user-${m.user_id.slice(0, 6)}@…`
            return {
              id: m.id,
              user_id: m.user_id,
              role: m.role as OrgRole,
              joined_at: m.joined_at,
              email,
              full_name: profile?.full_name ?? null,
            }
          })
        )
        setMembers(enriched)
      }

      // Pending invites
      const { data: rawInvites } = await supabase
        .from('jarvis_org_invites')
        .select('*')
        .eq('org_id', org.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }) as { data: OrgInvite[] | null; error: unknown }

      setInvites(rawInvites ?? [])
    } finally {
      setLoading(false)
    }
  }, [org, user])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const [inviteLink, setInviteLink] = useState<string | null>(null)

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!org || !inviteEmail.trim()) return
    setSending(true)
    setInviteError(null)
    setInviteSuccess(null)
    setInviteLink(null)

    // Insert and read back the generated token
    const { data: newInvite, error } = await supabase
      .from('jarvis_org_invites')
      .insert({ org_id: org.id, email: inviteEmail.trim(), role: inviteRole, invited_by: user?.id } as never)
      .select('token')
      .single() as { data: { token: string } | null; error: { message: string } | null }

    if (error || !newInvite) {
      setInviteError(
        error?.message?.includes('unique')
          ? 'An invite for this email is already pending.'
          : (error?.message ?? 'Failed to create invite')
      )
      setSending(false)
      return
    }

    const link = `${window.location.origin}?invite_token=${newInvite.token}`

    // Send invite email via edge function
    const { error: fnErr } = await supabase.functions.invoke('send-invite', {
      body: { email: inviteEmail.trim(), token: newInvite.token, orgName: org.name, appUrl: window.location.origin },
    })

    if (fnErr) {
      let msg = (fnErr as { message?: string }).message ?? 'Unknown error'
      try {
        const body = await (fnErr as { context?: Response }).context?.json()
        if (body?.error) msg = body.error
      } catch { /* ignore parse failure */ }
      console.error('[send-invite]', msg)
      const alreadyExists = msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('user already')
      setInviteError(
        alreadyExists
          ? `${inviteEmail.trim()} already has an account — share the invite link below directly.`
          : `Email failed: ${msg} — use the invite link below instead.`
      )
      setInviteLink(link)
    } else {
      setInviteSuccess(`Invite email sent to ${inviteEmail.trim()}`)
      setInviteLink(link)
    }

    setInviteEmail('')
    load()
    setSending(false)
  }

  async function revokeInvite(id: string) {
    await supabase.from('jarvis_org_invites').update({ status: 'revoked' } as never).eq('id', id)
    load()
  }

  async function changeRole(memberId: string, newRole: OrgRole) {
    await supabase.from('jarvis_org_members').update({ role: newRole } as never).eq('id', memberId)
    load()
  }

  async function removeMember(memberId: string, userId: string) {
    if (userId === org?.owner_id) return
    await supabase.from('jarvis_org_members').delete().eq('id', memberId)
    load()
  }

  function copyLink() {
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function exportCSV() {
    downloadCSV(
      `team-${org?.name?.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Name', 'Email', 'Role', 'Joined'],
      members.map(m => [
        m.full_name ?? '',
        m.email,
        ROLE_META[m.role].label,
        new Date(m.joined_at).toLocaleDateString(),
      ]),
    )
  }

  if (!org) return null

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="mb-1">Team Management</CardTitle>
            <p className="text-sm text-muted">
              Manage members, roles, and invitations for <span className="text-accent font-mono-jarvis">{org.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-[10px] font-mono-jarvis text-muted">
              {members.length} member{members.length !== 1 ? 's' : ''}
              {invites.length > 0 && <span className="text-accent4 ml-2">{invites.length} pending</span>}
            </div>
            {members.length > 0 && (
              <button onClick={exportCSV}
                className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors cursor-pointer font-mono-jarvis">
                <Download size={11} /> Export CSV
              </button>
            )}
            <Button variant="ghost" onClick={load}>
              <RefreshCw size={12} /> Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Invite panel — owners/admins only */}
      {canManage && (
        <Card>
          <CardTitle className="mb-4">Invite Team Member</CardTitle>
          <form onSubmit={sendInvite} className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-52">
                <label className="block text-[10px] text-muted font-mono-jarvis mb-1.5">EMAIL ADDRESS</label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="email" value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    required
                    className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>
              <div className="w-48">
                <label className="block text-[10px] text-muted font-mono-jarvis mb-1.5">ROLE</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as OrgRole)}
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-tx outline-none focus:border-accent transition-colors cursor-pointer">
                  {INVITABLE_ROLES.map(r => (
                    <option key={r} value={r}>{ROLE_META[r].label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button variant="primary" type="submit" disabled={sending || !inviteEmail.trim()}>
                  {sending
                    ? <RefreshCw size={12} className="animate-spin" />
                    : null
                  }
                  {sending ? 'Sending…' : 'Send Invite'}
                </Button>
              </div>
            </div>

            {inviteError   && <p className="text-xs text-danger">{inviteError}</p>}
            {inviteSuccess && <p className="text-xs text-accent3">{inviteSuccess}</p>}
            {inviteLink && (
              <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 space-y-2">
                <p className="text-[11px] font-mono-jarvis text-accent font-semibold">
                  {inviteSuccess ? 'Also share this link in case the email goes to spam:' : 'Send this invite link directly to your teammate:'}
                </p>
                <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2">
                  <Link2 size={12} className="text-accent shrink-0" />
                  <span className="text-[11px] font-mono-jarvis text-tx truncate flex-1">{inviteLink}</span>
                  <button type="button"
                    onClick={() => { navigator.clipboard.writeText(inviteLink!); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent/10 text-[10px] font-mono-jarvis text-accent hover:bg-accent/20 transition-colors cursor-pointer shrink-0">
                    {copied ? <><Check size={10} /> Copied!</> : <><Copy size={10} /> Copy link</>}
                  </button>
                </div>
              </div>
            )}

            {/* Shareable link */}
            <div className="pt-3 border-t border-border">
              <div className="text-[10px] text-muted font-mono-jarvis mb-2">OR SHARE AN INVITE LINK</div>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2">
                  <Link2 size={12} className="text-muted shrink-0" />
                  <span className="text-[11px] font-mono-jarvis text-muted truncate">{shareLink}</span>
                </div>
                <button type="button" onClick={copyLink}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs text-muted
                             hover:border-accent hover:text-accent transition-colors cursor-pointer font-mono-jarvis shrink-0">
                  {copied ? <><Check size={11} className="text-accent3" /> Copied!</> : <><Copy size={11} /> Copy link</>}
                </button>
              </div>
              <p className="text-[10px] text-muted mt-1.5 font-mono-jarvis">
                Anyone with this link can request to join. You'll still assign their role on approval.
              </p>
            </div>
          </form>
        </Card>
      )}

      {/* Tabs */}
      <Card className="p-0">
        <div className="flex border-b border-border">
          {([
            { id: 'members',     label: `Members (${members.length})` },
            { id: 'invites',     label: `Pending Invites (${invites.length})` },
            { id: 'roles',       label: 'Role Guide' },
            ...(isOwner ? [{ id: 'permissions' as const, label: 'Permissions' }] : []),
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                'px-5 py-3 text-xs font-medium cursor-pointer transition-colors border-b-2 -mb-px',
                tab === t.id ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-tx'
              )}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* ── Members tab ── */}
          {tab === 'members' && (
            loading ? (
              <div className="flex justify-center py-10">
                <RefreshCw size={20} className="text-muted animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-4 p-3 rounded-xl border border-border bg-surface hover:border-border/80 transition-colors">
                    <Avatar name={m.full_name} email={m.email} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-tx truncate">
                          {m.full_name ?? m.email}
                        </span>
                        {m.user_id === user?.id && (
                          <span className="text-[9px] font-mono-jarvis text-accent4 border border-accent4/30 px-1.5 py-0.5 rounded-full">You</span>
                        )}
                        {m.user_id === org.owner_id && (
                          <span className="text-[9px] font-mono-jarvis text-accent4 border border-accent4/30 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Crown size={8} /> Owner
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted font-mono-jarvis">{m.email}</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {canManage && m.user_id !== org.owner_id && m.user_id !== user?.id ? (
                        <select
                          value={m.role}
                          onChange={e => changeRole(m.id, e.target.value as OrgRole)}
                          className="bg-surface border border-border rounded-lg px-2 py-1 text-[11px] text-muted outline-none cursor-pointer font-mono-jarvis hover:border-accent/40 transition-colors"
                          style={{ color: ROLE_META[m.role].color }}>
                          {INVITABLE_ROLES.map(r => (
                            <option key={r} value={r}>{ROLE_META[r].label}</option>
                          ))}
                        </select>
                      ) : (
                        <RoleBadge role={m.role} />
                      )}

                      {canManage && m.user_id !== org.owner_id && m.user_id !== user?.id && (
                        <button
                          onClick={() => removeMember(m.id, m.user_id)}
                          className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Pending invites tab ── */}
          {tab === 'invites' && (
            invites.length === 0 ? (
              <div className="text-center py-12 text-muted">
                <Users size={32} className="mx-auto mb-3 opacity-40" strokeWidth={1} />
                <div className="text-sm">No pending invites</div>
              </div>
            ) : (
              <div className="space-y-2">
                {invites.map(inv => {
                  const expired = new Date(inv.expires_at) < new Date()
                  return (
                    <div key={inv.id} className="flex items-center gap-4 p-3 rounded-xl border border-border bg-surface">
                      <div className="w-8 h-8 rounded-full bg-border/60 flex items-center justify-center shrink-0">
                        <Mail size={14} className="text-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-tx">{inv.email}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <RoleBadge role={inv.role} />
                          <span className="text-[10px] font-mono-jarvis text-muted flex items-center gap-1">
                            <Clock size={9} />
                            {expired
                              ? <span className="text-danger">Expired</span>
                              : `Expires ${new Date(inv.expires_at).toLocaleDateString()}`
                            }
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}?invite_token=${inv.token}`)}
                        title="Copy invite link"
                        className="flex items-center gap-1 text-[11px] text-muted hover:text-accent transition-colors cursor-pointer font-mono-jarvis">
                        <Copy size={11} /> Link
                      </button>
                      {canManage && (
                        <button
                          onClick={() => revokeInvite(inv.id)}
                          className="flex items-center gap-1.5 text-[11px] text-muted hover:text-danger transition-colors cursor-pointer font-mono-jarvis">
                          <X size={12} /> Revoke
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          )}

          {/* ── Permissions tab ── */}
          {tab === 'permissions' && (
            <div>
              <p className="text-xs text-muted mb-4 font-mono-jarvis">
                Owners always have full access. Configure which sections each role can see.
              </p>

              {/* Role selector */}
              <div className="flex gap-2 mb-5 flex-wrap">
                {CONFIGURABLE_ROLES.map(role => {
                  const meta = ROLE_META[role]
                  return (
                    <button key={role} onClick={() => setPermRole(role)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer',
                        permRole === role ? 'text-white border-transparent' : 'bg-surface border-border text-muted hover:border-accent/40'
                      )}
                      style={permRole === role ? { background: meta.color, borderColor: meta.color } : {}}>
                      <meta.Icon size={11} /> {meta.label}
                    </button>
                  )
                })}
              </div>

              {/* Section matrix */}
              <div className="space-y-3">
                {NAV.map(group => {
                  const groupSections = group.items.map(i => i.id as NavSection)
                  const checked = groupSections.filter(s => localPerms[permRole]?.includes(s))
                  return (
                    <div key={group.label} className="border border-border rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 bg-surface/60 border-b border-border">
                        <span className="text-[10px] font-mono-jarvis tracking-widest text-muted">
                          {group.label}
                          <span className="ml-2 text-accent">{checked.length}/{groupSections.length}</span>
                        </span>
                        <div className="flex gap-3">
                          <button onClick={() => toggleGroup(groupSections, permRole, true)}
                            className="text-[10px] text-accent hover:underline cursor-pointer font-mono-jarvis">All</button>
                          <button onClick={() => toggleGroup(groupSections, permRole, false)}
                            className="text-[10px] text-muted hover:underline cursor-pointer font-mono-jarvis">None</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 divide-x divide-y divide-border/40">
                        {group.items.map(item => {
                          const Icon = item.icon
                          const isChecked = localPerms[permRole]?.includes(item.id as NavSection) ?? false
                          return (
                            <label key={item.id}
                              className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-accent/4 cursor-pointer">
                              <input type="checkbox" checked={isChecked}
                                onChange={() => toggleSection(item.id as NavSection, permRole)}
                                className="w-3.5 h-3.5 cursor-pointer accent-accent" />
                              <Icon size={12} className="text-muted shrink-0" strokeWidth={1.75} />
                              <span className="text-xs text-tx truncate">{item.label}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Save row */}
              <div className="mt-5 flex items-center gap-3 flex-wrap">
                <Button variant="primary" onClick={savePermissions} disabled={savingPerms}>
                  {savingPerms
                    ? <RefreshCw size={12} className="animate-spin" />
                    : permsSaved ? <Check size={12} className="text-accent3" /> : <Lock size={12} />
                  }
                  {savingPerms ? 'Saving…' : permsSaved ? 'Saved!' : 'Save Permissions'}
                </Button>
                <button onClick={resetToDefaults}
                  className="text-xs text-muted hover:text-accent transition-colors cursor-pointer font-mono-jarvis">
                  Reset to defaults
                </button>
              </div>
            </div>
          )}

          {/* ── Role guide tab ── */}
          {tab === 'roles' && (
            <div className="space-y-3">
              {(Object.entries(ROLE_META) as [OrgRole, typeof ROLE_META[OrgRole]][]).map(([role, meta]) => (
                <div key={role} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-surface">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: meta.color + '18', border: `1px solid ${meta.color}30` }}>
                    <meta.Icon size={16} style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm text-tx">{meta.label}</span>
                    </div>
                    <div className="text-xs text-muted">{meta.access}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
