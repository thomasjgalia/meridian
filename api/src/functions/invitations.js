const { app }          = require('@azure/functions')
const { requireAuth }  = require('../shared/auth')
const { resolveUser }  = require('../shared/user')
const { query, sql }   = require('../shared/db')
const { getMemberRole, canManage } = require('../shared/roles')
const crypto           = require('crypto')

// ── POST /api/meridians/{id}/invitations ──────────────────────────────────────
// Owner-only. Creates a token-based invite link.
// Body: { role: 'member'|'viewer', email?: string, ttlHours?: number }

app.http('invitationsCreate', {
  methods:   ['POST'],
  authLevel: 'anonymous',
  route:     'meridians/{id}/invitations',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    const meridianId = parseInt(request.params.id)
    const userId     = await resolveUser(caller)

    let body
    try { body = await request.json() } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON' } }
    }

    const { role = 'member', email = null, ttlHours = 72 } = body

    if (!['member', 'viewer'].includes(role)) {
      return { status: 400, jsonBody: { error: 'role must be member or viewer' } }
    }

    const callerRole = await getMemberRole(userId, meridianId)
    if (!canManage(callerRole)) {
      return { status: 403, jsonBody: { error: 'Only owners can create invitations' } }
    }

    const token     = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + Number(ttlHours) * 3_600_000)

    const result = await query(
      `INSERT INTO invitations (meridian_id, token, email, role, created_by, expires_at)
       OUTPUT INSERTED.id, INSERTED.token, INSERTED.role, INSERTED.email, INSERTED.expires_at
       VALUES (@meridianId, @token, @email, @role, @userId, @expiresAt)`,
      [
        { name: 'meridianId', type: sql.Int,       value: meridianId      },
        { name: 'token',      type: sql.NVarChar,  value: token           },
        { name: 'email',      type: sql.NVarChar,  value: email ?? null   },
        { name: 'role',       type: sql.VarChar,   value: role            },
        { name: 'userId',     type: sql.Int,       value: userId          },
        { name: 'expiresAt',  type: sql.DateTime2, value: expiresAt       },
      ]
    )

    const row = result.recordset[0]
    return {
      status:   201,
      jsonBody: {
        id:        row.id,
        token:     row.token,
        role:      row.role,
        email:     row.email,
        expiresAt: row.expires_at,
      },
    }
  },
})

// ── GET /api/meridians/{id}/invitations ───────────────────────────────────────
// Owner-only. Lists pending (unused, non-expired) invitations.

app.http('invitationsList', {
  methods:   ['GET'],
  authLevel: 'anonymous',
  route:     'meridians/{id}/invitations',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    const meridianId = parseInt(request.params.id)
    const userId     = await resolveUser(caller)

    const callerRole = await getMemberRole(userId, meridianId)
    if (!canManage(callerRole)) {
      return { status: 403, jsonBody: { error: 'Forbidden' } }
    }

    const result = await query(
      `SELECT i.id, i.token, i.email, i.role, i.created_at, i.expires_at,
              u.display_name AS created_by_name
       FROM   invitations i
       JOIN   users u ON u.id = i.created_by
       WHERE  i.meridian_id = @meridianId
         AND  i.used_at IS NULL
         AND  i.expires_at > GETUTCDATE()
       ORDER  BY i.created_at DESC`,
      [{ name: 'meridianId', type: sql.Int, value: meridianId }]
    )

    return {
      status:   200,
      jsonBody: result.recordset.map((r) => ({
        id:            r.id,
        token:         r.token,
        email:         r.email,
        role:          r.role,
        createdAt:     r.created_at,
        expiresAt:     r.expires_at,
        createdByName: r.created_by_name,
      })),
    }
  },
})

// ── DELETE /api/invitations/{token} ───────────────────────────────────────────
// Owner-only. Revokes a pending invitation.

app.http('invitationsRevoke', {
  methods:   ['DELETE'],
  authLevel: 'anonymous',
  route:     'invitations/{token}',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    const token  = request.params.token
    const userId = await resolveUser(caller)

    const inv = await query(
      `SELECT meridian_id FROM invitations WHERE token = @token AND used_at IS NULL`,
      [{ name: 'token', type: sql.NVarChar, value: token }]
    )
    if (inv.recordset.length === 0) {
      return { status: 404, jsonBody: { error: 'Invitation not found or already used' } }
    }

    const callerRole = await getMemberRole(userId, inv.recordset[0].meridian_id)
    if (!canManage(callerRole)) {
      return { status: 403, jsonBody: { error: 'Forbidden' } }
    }

    await query(
      `DELETE FROM invitations WHERE token = @token`,
      [{ name: 'token', type: sql.NVarChar, value: token }]
    )

    return { status: 200, jsonBody: { ok: true } }
  },
})

// ── GET /api/invitations/{token} ──────────────────────────────────────────────
// Authenticated. Returns invite metadata so the UI can show an accept prompt.

app.http('invitationsPreview', {
  methods:   ['GET'],
  authLevel: 'anonymous',
  route:     'invitations/{token}',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    const token = request.params.token

    const result = await query(
      `SELECT i.role, i.email, i.expires_at,
              m.id AS meridian_id, m.name AS meridian_name, m.color AS meridian_color,
              u.display_name AS inviter_name
       FROM   invitations i
       JOIN   meridians m ON m.id = i.meridian_id
       JOIN   users u     ON u.id = i.created_by
       WHERE  i.token = @token
         AND  i.used_at IS NULL
         AND  i.expires_at > GETUTCDATE()`,
      [{ name: 'token', type: sql.NVarChar, value: token }]
    )

    if (result.recordset.length === 0) {
      return { status: 404, jsonBody: { error: 'Invitation not found or expired' } }
    }

    const r = result.recordset[0]
    return {
      status:   200,
      jsonBody: {
        role:          r.role,
        email:         r.email,
        expiresAt:     r.expires_at,
        meridianId:    r.meridian_id,
        meridianName:  r.meridian_name,
        meridianColor: r.meridian_color,
        inviterName:   r.inviter_name,
      },
    }
  },
})

// ── POST /api/invitations/{token}/accept ──────────────────────────────────────
// Authenticated. Joins the meridian with the invitation's role.
// If the invite is email-targeted, the accepting user's email must match.

app.http('invitationsAccept', {
  methods:   ['POST'],
  authLevel: 'anonymous',
  route:     'invitations/{token}/accept',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    const token  = request.params.token
    const userId = await resolveUser(caller)

    // Fetch the invitation
    const inv = await query(
      `SELECT id, meridian_id, role, email
       FROM   invitations
       WHERE  token = @token AND used_at IS NULL AND expires_at > GETUTCDATE()`,
      [{ name: 'token', type: sql.NVarChar, value: token }]
    )
    if (inv.recordset.length === 0) {
      return { status: 404, jsonBody: { error: 'Invitation not found or expired' } }
    }

    const invitation = inv.recordset[0]

    // If email-targeted, verify the accepting user's email matches
    if (invitation.email) {
      const userRow = await query(
        `SELECT email FROM users WHERE id = @userId`,
        [{ name: 'userId', type: sql.Int, value: userId }]
      )
      const userEmail = userRow.recordset[0]?.email ?? ''
      if (userEmail.toLowerCase() !== invitation.email.toLowerCase()) {
        return { status: 403, jsonBody: { error: 'This invitation is for a different email address' } }
      }
    }

    // Upsert meridian_members — if already a member, leave role unchanged
    await query(
      `IF NOT EXISTS (
         SELECT 1 FROM meridian_members
         WHERE meridian_id = @meridianId AND user_id = @userId
       )
       INSERT INTO meridian_members (meridian_id, user_id, role)
       VALUES (@meridianId, @userId, @role)`,
      [
        { name: 'meridianId', type: sql.Int,     value: invitation.meridian_id },
        { name: 'userId',     type: sql.Int,     value: userId                 },
        { name: 'role',       type: sql.VarChar, value: invitation.role        },
      ]
    )

    // Mark invitation as used
    await query(
      `UPDATE invitations
       SET used_at = GETUTCDATE(), used_by = @userId
       WHERE id = @invId`,
      [
        { name: 'userId', type: sql.Int, value: userId        },
        { name: 'invId',  type: sql.Int, value: invitation.id },
      ]
    )

    return {
      status:   200,
      jsonBody: { meridianId: invitation.meridian_id, role: invitation.role },
    }
  },
})
