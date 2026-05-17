import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import type { Organization, OrgRole } from '@/types/supabase'
import type { NavSection } from '@/types'

export type RolePermissions = Partial<Record<OrgRole, NavSection[]>>

interface AuthState {
  session:         Session | null
  user:            User | null
  org:             Organization | null
  myRole:          OrgRole | null
  rolePermissions: RolePermissions
  loading:         boolean
  orgLoading:      boolean

  setSession:         (s: Session | null)       => void
  setUser:            (u: User | null)           => void
  setOrg:             (o: Organization | null, role: OrgRole | null) => void
  setRolePermissions: (p: RolePermissions)       => void
  setLoading:         (v: boolean)               => void
  setOrgLoading:      (v: boolean)               => void
  reset:              ()                         => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session:         null,
      user:            null,
      org:             null,
      myRole:          null,
      rolePermissions: {},
      loading:         true,
      orgLoading:      false,

      setSession:         (session)          => set({ session, user: session?.user ?? null }),
      setUser:            (user)             => set({ user }),
      setOrg:             (org, myRole)      => set({ org, myRole, orgLoading: false }),
      setRolePermissions: (rolePermissions)  => set({ rolePermissions }),
      setLoading:         (loading)          => set({ loading }),
      setOrgLoading:      (orgLoading)       => set({ orgLoading }),
      reset:              ()                 => set({ session: null, user: null, org: null, myRole: null, rolePermissions: {}, orgLoading: false }),
    }),
    {
      name: 'jarvis-auth',
      partialize: (state) => ({ org: state.org, myRole: state.myRole, rolePermissions: state.rolePermissions }),
    }
  )
)
