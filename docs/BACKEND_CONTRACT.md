# Custom REST backend contract

Caspira SearchOps normally stores its core data (sites, tasks, schedules,
org/team, rank tracking, activity logs) in Supabase. If you'd rather point
the core data path at your own REST API, set it up in **Settings → Data
Backend → Custom REST API** with a base URL and API key, then implement the
endpoints below.

A minimal working implementation lives at
[`scripts/reference-rest-server/server.mjs`](../scripts/reference-rest-server/server.mjs)
— run it with `node scripts/reference-rest-server/server.mjs` and point
Settings at `http://localhost:8787` to see it work end to end. Treat it as
documentation-by-example, not something to run in production (in-memory
storage, plaintext passwords, no real email delivery).

## What stays on Supabase regardless

GSC, GA4, the Site Audit crawler, email invites, Bing Webmaster, and
WordPress MCP publishing are implemented as Supabase Edge Functions and
always call Supabase directly, no matter which data backend is active —
there's no REST equivalent for those. Everything else (sites, tasks,
schedules, organizations, team members, rank tracking, activity logs) goes
through the contract below.

## Requests

Every request is `POST` with a JSON body and two headers:

```
Content-Type: application/json
apikey: <the API key from Settings>
Authorization: Bearer <session.accessToken>   (once signed in)
```

Every response is JSON. Use HTTP 200 for both success and logical errors —
put `{ "error": "message" }` in the body rather than relying on the status
code, since the client treats any body containing `error` as a failure
regardless of HTTP status.

## Data endpoints

### `POST {baseUrl}/data/{table}/select`

```jsonc
// Request
{
  "columns": "id,domain",              // optional, default all columns
  "filters": [                          // optional, ANDed together
    { "column": "org_id", "op": "eq", "value": "…" }
  ],
  "order":  { "column": "created_at", "ascending": false }, // optional
  "limit":  50,                         // optional
  "range":  { "from": 0, "to": 24 },    // optional, inclusive, overrides limit
  "count":  "exact",                    // optional — include a total row count
  "mode":   "maybeSingle"               // optional: "many" (default) | "single" | "maybeSingle"
}
```

`op` is one of `eq`, `gt`, `in` (`in`'s `value` is an array).
`mode: "single"` must error if the result isn't exactly one row;
`mode: "maybeSingle"` returns `data: null` on zero rows instead of erroring.

```jsonc
// Response
{ "data": [ /* rows, or a single row/null depending on mode */ ], "count": 137 }
```

### `POST {baseUrl}/data/{table}/insert`

```jsonc
// Request
{ "rows": { "domain": "example.com" }, "returning": true } // rows can be an object or an array
// Response
{ "data": { "id": "…", "domain": "example.com", "created_at": "…" } } // array in -> array out
```

Generate `id` and `created_at` server-side if the caller doesn't supply
them. `returning: false` may skip the select-back and return `data: null`.

### `POST {baseUrl}/data/{table}/update`

```jsonc
// Request
{ "filters": [{ "column": "id", "op": "eq", "value": "…" }], "patch": { "domain": "new.com" } }
// Response
{ "data": { /* first matching row after the patch, or null */ } }
```

### `POST {baseUrl}/data/{table}/delete`

```jsonc
// Request
{ "filters": [{ "column": "id", "op": "in", "value": ["a", "b"] }] }
// Response
{ "data": null }
```

## RPC endpoint

### `POST {baseUrl}/rpc/{name}`

```jsonc
// Request
{ "params": { "p_org_id": "…" } }
// Response — whatever shape that procedure returns, or an error
```

Caspira calls a handful of named procedures for app-specific logic that
doesn't fit plain CRUD — an org-scoped backend must implement at least
these for the app to be usable past sign-up:

| Name | Params | Returns |
|---|---|---|
| `jarvis_get_my_org` | `{}` | `{ id, name, slug, owner_id, role } \| null` — the caller's org, from the `Authorization` token |
| `jarvis_create_org` | `{ p_name, p_slug }` | anything (ignored) — must create the org and add the caller as `owner` |
| `jarvis_seed_org` | `{ p_org_id }` | anything (ignored) — seed starter data; safe to no-op |
| `jarvis_get_org_members` | `{ p_org_id }` | `{ id, user_id, role, joined_at, email, full_name }[]` |

The reference server implements all four; see `handleRpc()` in
`server.mjs` for the simplest correct version of each.

## Auth endpoints

### `POST {baseUrl}/auth/signup`
`{ "email", "password", "meta": { "full_name"? } }` → `{ "session"? }` or `{ "error" }`

### `POST {baseUrl}/auth/login`
`{ "email", "password" }` → `{ "session" }` or `{ "error" }`

### `POST {baseUrl}/auth/logout`
`{}` (uses the `Authorization` header) → `{}`

### `POST {baseUrl}/auth/session`
`{}` (uses the `Authorization` header) → `{ "session": Session | null }`

### `POST {baseUrl}/auth/reset`
`{ "email", "redirectTo" }` → `{}` or `{ "error" }` — send a password-reset email; a reference/demo server can no-op this

A `Session` is:

```jsonc
{ "user": { "id": "…", "email": "…" }, "accessToken": "…" }
```

The client stores `accessToken` and sends it back as
`Authorization: Bearer <accessToken>` on every subsequent request.

## What's out of scope

Realtime (live-updating Activity Logs without a manual refresh) has no
REST equivalent — Caspira falls back to polling every 15s when the active
backend isn't Supabase. There's no contract endpoint for it; nothing to
implement.
