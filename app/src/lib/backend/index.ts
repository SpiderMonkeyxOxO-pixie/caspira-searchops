import { readBackendConfig } from './config'
import { supabaseDataProvider, supabaseAuthProvider } from './supabaseProvider'
import { restDataProvider, restAuthProvider } from './restProvider'
import type { IAuthProvider, IDataProvider } from './types'

export type { AuthUser, Filter, IAuthProvider, IDataProvider, Session, SelectOptions, SelectResult } from './types'

export function getDataProvider(): IDataProvider {
  return readBackendConfig().provider === 'supabase' ? supabaseDataProvider : restDataProvider
}

export function getAuthProvider(): IAuthProvider {
  return readBackendConfig().provider === 'supabase' ? supabaseAuthProvider : restAuthProvider
}
