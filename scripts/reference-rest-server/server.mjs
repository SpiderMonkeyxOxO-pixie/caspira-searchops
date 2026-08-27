// Minimal reference implementation of Caspira's generic REST backend contract
// (see docs/BACKEND_CONTRACT.md). This is NOT production code — in-memory
// storage, plaintext passwords, no rate limiting, no real email delivery.
// It exists to (a) document the wire contract by example and (b) give
// restProvider.ts a real server to run against, since none existed when the
// pluggable-backend adapter was first built.
//
// Run:  node scripts/reference-rest-server/server.mjs [port]
// Then in Caspira → Settings → Data Backend → Custom REST API:
//   Base URL: http://localhost:8787   API Key: anything (not checked)

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'

const PORT = Number(process.argv[2]) || 8787

// ── In-memory state ──────────────────────────────────────────────────────
const tables   = new Map()                 // tableName -> Array<row>
const users    = new Map()                 // email -> { id, email, password }
const sessions = new Map()                 // token -> { userId, email }

function table(name) {
  if (!tables.has(name)) tables.set(name, [])
  return tables.get(name)
}

function now() { return new Date().toISOString() }

// ── Filters ───────────────────────────────────────────────────────────────
function matchesFilter(row, f) {
  const v = row[f.column]
  if (f.op === 'eq') return v === f.value
  if (f.op === 'gt') return v > f.value
  if (f.op === 'in') return Array.isArray(f.value) && f.value.includes(v)
  return true
}

function applyFilters(rows, filters) {
  if (!filters?.length) return rows
  return rows.filter(row => filters.every(f => matchesFilter(row, f)))
}

// ── /data/{table}/select|insert|update|delete ───────────────────────────
function handleSelect(name, body) {
  let rows = applyFilters(table(name), body.filters)
  if (body.order) {
    const { column, ascending = true } = body.order
    rows = [...rows].sort((a, b) => {
      if (a[column] === b[column]) return 0
      const cmp = a[column] < b[column] ? -1 : 1
      return ascending ? cmp : -cmp
    })
  }
  const count = body.count === 'exact' ? rows.length : undefined
  if (body.range) rows = rows.slice(body.range.from, body.range.to + 1)
  else if (body.limit != null) rows = rows.slice(0, body.limit)

  if (body.columns && body.columns !== '*') {
    const cols = body.columns.split(',').map(c => c.trim())
    rows = rows.map(r => Object.fromEntries(cols.map(c => [c, r[c]])))
  }

  if (body.mode === 'single') {
    if (rows.length !== 1) return { error: `Expected 1 row, got ${rows.length}` }
    return { data: rows[0], count }
  }
  if (body.mode === 'maybeSingle') {
    return { data: rows[0] ?? null, count }
  }
  return { data: rows, count }
}

function handleInsert(name, body) {
  const incoming = Array.isArray(body.rows) ? body.rows : [body.rows]
  const inserted = incoming.map(r => ({ id: randomUUID(), created_at: now(), ...r }))
  table(name).push(...inserted)
  if (body.returning === false) return { data: null }
  return { data: Array.isArray(body.rows) ? inserted : inserted[0] }
}

function handleUpdate(name, body) {
  const rows = table(name)
  const matched = applyFilters(rows, body.filters)
  for (const row of matched) Object.assign(row, body.patch)
  return { data: matched[0] ?? null }
}

function handleDelete(name, body) {
  const rows = table(name)
  const toRemove = new Set(applyFilters(rows, body.filters))
  tables.set(name, rows.filter(row => !toRemove.has(row)))
  return { data: null }
}

// ── /rpc/{name} — the handful of Caspira-specific procedures the app needs
// to complete signup/org-setup. A real backend defines whatever procedures
// its own app calls; this just proves the wire shape works end to end. ──
function handleRpc(name, params, userId) {
  if (name === 'jarvis_seed_org') return null // no-op — starter data isn't seeded by this reference server

  if (name === 'jarvis_create_org') {
    const org = {
      id: randomUUID(), name: params.p_name, slug: params.p_slug,
      owner_id: userId, role_permissions: {}, created_at: now(),
    }
    table('jarvis_organizations').push(org)
    table('jarvis_org_members').push({
      id: randomUUID(), org_id: org.id, user_id: userId, role: 'owner', joined_at: now(),
    })
    return { id: org.id }
  }

  if (name === 'jarvis_get_my_org') {
    const membership = table('jarvis_org_members').find(m => m.user_id === userId)
    if (!membership) return null
    const org = table('jarvis_organizations').find(o => o.id === membership.org_id)
    if (!org) return null
    return { id: org.id, name: org.name, slug: org.slug, owner_id: org.owner_id, role: membership.role }
  }

  if (name === 'jarvis_get_org_members') {
    return table('jarvis_org_members')
      .filter(m => m.org_id === params.p_org_id)
      .map(m => {
        const u = [...users.values()].find(u => u.id === m.user_id)
        return { id: m.id, user_id: m.user_id, role: m.role, joined_at: m.joined_at, email: u?.email ?? '—', full_name: null }
      })
  }

  throw new Error(`Reference server has no implementation for RPC "${name}" — add one in server.mjs's handleRpc().`)
}

// ── Auth ──────────────────────────────────────────────────────────────────
function toSession(user) {
  const token = randomUUID()
  sessions.set(token, { userId: user.id, email: user.email })
  return { user: { id: user.id, email: user.email }, accessToken: token }
}

function userFromAuthHeader(req) {
  const header = req.headers['authorization']
  if (!header?.startsWith('Bearer ')) return null
  const session = sessions.get(header.slice(7))
  return session ?? null
}

function handleAuth(action, body, req) {
  if (action === 'signup') {
    if (users.has(body.email)) return { error: 'User already registered' }
    const user = { id: randomUUID(), email: body.email, password: body.password }
    users.set(body.email, user)
    return { session: toSession(user) }
  }
  if (action === 'login') {
    const user = users.get(body.email)
    if (!user || user.password !== body.password) return { error: 'Invalid login credentials' }
    return { session: toSession(user) }
  }
  if (action === 'logout') {
    const header = req.headers['authorization']
    if (header?.startsWith('Bearer ')) sessions.delete(header.slice(7))
    return {}
  }
  if (action === 'session') {
    const s = userFromAuthHeader(req)
    return { session: s ? { user: { id: s.userId, email: s.email }, accessToken: req.headers['authorization'].slice(7) } : null }
  }
  if (action === 'reset') {
    // No real email delivery in this reference server.
    return {}
  }
  return { error: `Unknown auth action "${action}"` }
}

// ── HTTP server ───────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS)
    res.end()
    return
  }

  let raw = ''
  req.on('data', chunk => { raw += chunk })
  req.on('end', () => {
    let body = {}
    try { body = raw ? JSON.parse(raw) : {} } catch { /* empty body ok */ }

    const path = new URL(req.url, `http://${req.headers.host}`).pathname
    const parts = path.split('/').filter(Boolean) // e.g. ['data','jarvis_sites','select']

    res.setHeader('Content-Type', 'application/json')
    for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v)

    try {
      if (parts[0] === 'data' && parts.length === 3) {
        const [, name, action] = parts
        const result =
          action === 'select' ? handleSelect(name, body) :
          action === 'insert' ? handleInsert(name, body) :
          action === 'update' ? handleUpdate(name, body) :
          action === 'delete' ? handleDelete(name, body) :
          { error: `Unknown data action "${action}"` }
        res.writeHead(200); res.end(JSON.stringify(result)); return
      }

      if (parts[0] === 'rpc' && parts.length === 2) {
        const session = userFromAuthHeader(req)
        const data = handleRpc(parts[1], body.params ?? {}, session?.userId)
        res.writeHead(200); res.end(JSON.stringify(data)); return
      }

      if (parts[0] === 'auth' && parts.length === 2) {
        const result = handleAuth(parts[1], body, req)
        res.writeHead(200); res.end(JSON.stringify(result)); return
      }

      res.writeHead(404); res.end(JSON.stringify({ error: `No route for ${path}` }))
    } catch (e) {
      res.writeHead(200) // restProvider expects a JSON body even on logical errors
      res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }))
    }
  })
})

server.listen(PORT, () => {
  console.log(`Caspira reference REST backend listening on http://localhost:${PORT}`)
  console.log(`Point Settings -> Data Backend -> Custom REST API at this URL to try it.`)
})
