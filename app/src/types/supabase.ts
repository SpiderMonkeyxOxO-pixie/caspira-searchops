export type OrgRole = 'owner' | 'admin' | 'seo_specialist' | 'technical' | 'content_writer' | 'viewer'
export type InviteStatus = 'pending' | 'accepted' | 'revoked'

export interface Database {
  public: {
    Tables: {
      jarvis_profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
        }
        Update: {
          full_name?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
      }
      jarvis_organizations: {
        Row: {
          id: string
          name: string
          slug: string
          plan: string
          logo_url: string | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          slug: string
          plan?: string
          logo_url?: string | null
          owner_id: string
        }
        Update: {
          name?: string
          slug?: string
          logo_url?: string | null
          updated_at?: string
        }
      }
      jarvis_org_members: {
        Row: {
          id: string
          org_id: string
          user_id: string
          role: OrgRole
          joined_at: string
        }
        Insert: {
          org_id: string
          user_id: string
          role: OrgRole
        }
        Update: {
          role?: OrgRole
        }
      }
      jarvis_org_invites: {
        Row: {
          id: string
          org_id: string
          email: string
          role: OrgRole
          token: string
          invited_by: string | null
          status: InviteStatus
          expires_at: string
          created_at: string
        }
        Insert: {
          org_id: string
          email: string
          role: OrgRole
          invited_by?: string | null
        }
        Update: {
          status?: InviteStatus
        }
      }
    }
  }
}

// Convenience types for UI
export interface OrgMemberWithProfile {
  id: string
  org_id: string
  user_id: string
  role: OrgRole
  joined_at: string
  profile: {
    full_name: string | null
    avatar_url: string | null
    email: string
  }
}

export interface Organization {
  id: string
  name: string
  slug: string
  plan: string
  logo_url: string | null
  owner_id: string
  created_at: string
}

export interface OrgInvite {
  id: string
  org_id: string
  email: string
  role: OrgRole
  token: string
  status: InviteStatus
  expires_at: string
  created_at: string
}
