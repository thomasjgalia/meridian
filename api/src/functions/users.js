const { app }         = require('@azure/functions')
const { requireAuth } = require('../shared/auth')
const { resolveUser } = require('../shared/user')
const { query, sql }  = require('../shared/db')

// ── PATCH /api/users/me ────────────────────────────────────────────────────────
// Authenticated user updates their own display name.

app.http('usersUpdateMe', {
  methods:   ['PATCH'],
  authLevel: 'anonymous',
  route:     'users/me',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    let body
    try { body = await request.json() } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON' } }
    }

    const { displayName } = body
    if (!displayName?.trim()) {
      return { status: 400, jsonBody: { error: 'displayName is required' } }
    }

    try {
      const userId = await resolveUser(caller)

      await query(
        `UPDATE users SET display_name = @name WHERE id = @id`,
        [
          { name: 'name', type: sql.NVarChar, value: displayName.trim() },
          { name: 'id',   type: sql.Int,      value: userId             },
        ]
      )

      return { status: 200, jsonBody: { ok: true, displayName: displayName.trim() } }

    } catch (err) {
      context.error('PATCH /api/users/me failed:', err)
      return { status: 500, jsonBody: { error: 'Internal server error' } }
    }
  },
})
