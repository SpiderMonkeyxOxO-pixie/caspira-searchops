// Backend-agnostic data & auth interfaces. Every field here maps to a real
// call site found in store/index.ts, App.tsx, TeamManagement.tsx,
// RankTracker.tsx, and SiteAnalyzer.tsx — nothing speculative.

export interface Filter {
  column: string
  op:     'eq' | 'gt' | 'in'
  value:  unknown
}

export interface SelectOptions {
  columns?: string                                 // default '*'
  filters?: Filter[]
  order?:   { column: string; ascending?: boolean }
  limit?:   number
  range?:   { from: number; to: number }
  count?:   'exact'
  // .single() throws if the result isn't exactly 1 row; .maybeSingle()
  // returns null instead of throwing on 0 rows. Default 'many'.
  mode?:    'many' | 'single' | 'maybeSingle'
}

export interface SelectResult<T> {
  data:   T[] | T | null
  count?: number
}

export interface IDataProvider {
  select<T>(table: string, opts?: SelectOptions): Promise<SelectResult<T>>
  insert<T>(table: string, rows: object | object[], opts?: { returning?: boolean }): Promise<{ data: T | T[] | null }>
  update<T>(table: string, filters: Filter[], patch: object): Promise<{ data: T | null }>
  remove(table: string, filters: Filter[]): Promise<void>
  callProcedure<T>(name: string, params: object): Promise<T>
}

export interface AuthUser {
  id:    string
  email: string | null
}

export interface Session {
  user:        AuthUser
  accessToken: string
}

export interface IAuthProvider {
  getSession(): Promise<Session | null>
  onAuthStateChange(cb: (session: Session | null) => void): () => void
  signInWithPassword(email: string, password: string): Promise<{ error?: string }>
  signUp(email: string, password: string, meta: { full_name?: string }): Promise<{ error?: string }>
  signOut(): Promise<void>
  resetPasswordForEmail(email: string, opts: { redirectTo: string }): Promise<{ error?: string }>
}
