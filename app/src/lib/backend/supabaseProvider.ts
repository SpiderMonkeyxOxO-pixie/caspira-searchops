import { supabase } from '@/lib/supabase'
import type { Filter, IAuthProvider, IDataProvider, Session, SelectOptions, SelectResult } from './types'

function applyFilters(q: any, filters?: Filter[]) {
  if (!filters) return q
  for (const f of filters) {
    if (f.op === 'eq') q = q.eq(f.column, f.value)
    else if (f.op === 'gt') q = q.gt(f.column, f.value)
    else if (f.op === 'in') q = q.in(f.column, f.value as unknown[])
  }
  return q
}

export const supabaseDataProvider: IDataProvider = {
  async select<T>(table: string, opts: SelectOptions = {}): Promise<SelectResult<T>> {
    let q = supabase.from(table).select(opts.columns ?? '*', opts.count ? { count: opts.count } : undefined)
    q = applyFilters(q, opts.filters)
    if (opts.order) q = q.order(opts.order.column, { ascending: opts.order.ascending ?? true })
    if (opts.range) q = q.range(opts.range.from, opts.range.to)
    if (opts.limit != null) q = q.limit(opts.limit)

    const res = opts.mode === 'single' ? await q.single()
      : opts.mode === 'maybeSingle' ? await q.maybeSingle()
      : await q
    if (res.error && opts.mode !== 'maybeSingle') throw new Error(res.error.message)
    return { data: (res.data ?? null) as T[] | T | null, count: res.count ?? undefined }
  },

  async insert<T>(table: string, rows: object | object[], opts: { returning?: boolean } = {}) {
    let q = supabase.from(table).insert(rows as never)
    if (opts.returning !== false) q = q.select() as never
    const res = await q
    if (res.error) throw new Error(res.error.message)
    const data = (res.data ?? null) as T[] | null
    return { data: Array.isArray(rows) ? data : (data?.[0] ?? null) as T | null }
  },

  async update<T>(table: string, filters: Filter[], patch: object) {
    let q = supabase.from(table).update(patch as never)
    q = applyFilters(q, filters)
    const res = await (q.select() as any)
    if (res.error) throw new Error(res.error.message)
    const data = (res.data ?? null) as T[] | null
    return { data: data?.[0] ?? null }
  },

  async remove(table: string, filters: Filter[]) {
    let q = supabase.from(table).delete()
    q = applyFilters(q, filters)
    const res = await q
    if (res.error) throw new Error(res.error.message)
  },

  async callProcedure<T>(name: string, params: object): Promise<T> {
    const res = await supabase.rpc(name, params as never)
    if (res.error) throw new Error(res.error.message)
    return res.data as T
  },
}

function toSession(s: import('@supabase/supabase-js').Session | null): Session | null {
  if (!s) return null
  return { user: { id: s.user.id, email: s.user.email ?? null }, accessToken: s.access_token }
}

export const supabaseAuthProvider: IAuthProvider = {
  async getSession() {
    const { data } = await supabase.auth.getSession()
    return toSession(data.session)
  },

  onAuthStateChange(cb) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(toSession(session)))
    return () => data.subscription.unsubscribe()
  },

  async signInWithPassword(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message }
  },

  async signUp(email, password, meta) {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: meta } })
    return { error: error?.message }
  },

  async signOut() {
    await supabase.auth.signOut()
  },

  async resetPasswordForEmail(email, opts) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, opts)
    return { error: error?.message }
  },
}
