const { app }          = require('@azure/functions')
const { requireAuth }  = require('../shared/auth')
const { resolveUser }  = require('../shared/user')
const { query, sql }   = require('../shared/db')
const { getMemberRole, canManage } = require('../shared/roles')

// ── GET /api/meridians/{id}/members ───────────────────────────────────────────
// Any member of the meridian can list members.

app.http('membersGet', {
  methods:   ['GET'],
  authLevel: 'anonymous',
  route:     'meridians/{id}/members',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    const meridianId = parseInt(request.params.id)
    const userId     = await resolveUser(caller)

    const role = await getMemberRole(userId, meridianId)
    if (!role) return { status: 403, jsonBody: { error: 'Forbidden' } }

    const result = await query(
      `SELECT mm.id, mm.user_id, mm.role, mm.joined_at,
              u.display_name, u.email, u.avatar_url
       FROM   meridian_members mm
       JOIN   users u ON u.id = mm.user_id
       WHERE  mm.meridian_id = @meridianId AND u.is_active = 1
       ORDER  BY CASE mm.role WHEN 'owner' THEN 0 WHEN 'member' THEN 1 ELSE 2 END,
                 u.display_name`,
      [{ name: 'meridianId', type: sql.Int, value: meridianId }]
    )

    return {
      status:   200,
      jsonBody: result.recordset.map((r) => ({
        id:          r.id,
        userId:      r.user_id,
        role:        r.role,
        joinedAt:    r.joined_at,
        displayName: r.display_name,
        email:       r.email,
        avatarUrl:   r.avatar_url,
      })),
    }
  },
})

// ── POST /api/meridians/{id}/members ─────────────────────────────────────────
// Owner-only. Directly adds an already-registered user by their internal user ID.
// Uses MERGE so re-adding a former member (or upgrading a viewer) works cleanly.

app.http('membersAdd', {
  methods:   ['POST'],
  authLevel: 'anonymous',
  route:     'meridians/{id}/members',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    const meridianId = parseInt(request.params.id)
    const callerId   = await resolveUser(caller)

    const callerRole = await getMemberRole(callerId, meridianId)
    if (!canManage(callerRole)) {
      return { status: 403, jsonBody: { error: 'Only owners can add members' } }
    }

    let body
    try { body = await request.json() } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON' } }
    }

    const { userId, role = 'member' } = body
    if (!userId) return { status: 400, jsonBody: { error: 'userId is required' } }
    if (!['owner', 'member', 'viewer'].includes(role)) {
      return { status: 400, jsonBody: { error: 'role must be owner, member, or viewer' } }
    }

    const targetId = parseInt(userId)

    // Verify target user exists and is active
    const userResult = await query(
      `SELECT id, display_name, email, avatar_url FROM users WHERE id = @targetId AND is_active = 1`,
      [{ name: 'targetId', type: sql.Int, value: targetId }]
    )
    if (!userResult.recordset.length) {
      return { status: 404, jsonBody: { error: 'User not found' } }
    }
    const u = userResult.recordset[0]

    try {
      await query(
        `MERGE meridian_members AS target
         USING (SELECT @meridianId AS meridian_id, @targetId AS user_id, @role AS role) AS source
           ON  target.meridian_id = source.meridian_id AND target.user_id = source.user_id
         WHEN NOT MATCHED THEN
           INSERT (meridian_id, user_id, role) VALUES (source.meridian_id, source.user_id, source.role)
         WHEN MATCHED THEN
           UPDATE SET target.role = source.role;`,
        [
          { name: 'meridianId', type: sql.Int,     value: meridianId },
          { name: 'targetId',   type: sql.Int,     value: targetId   },
          { name: 'role',       type: sql.VarChar, value: role       },
        ]
      )

      return {
        status:   201,
        jsonBody: {
          userId:      u.id,
          role,
          displayName: u.display_name,
          email:       u.email,
          avatarUrl:   u.avatar_url,
        },
      }
    } catch (err) {
      context.error('POST /api/meridians/:id/members failed:', err)
      return { status: 500, jsonBody: { error: 'Internal server error' } }
    }
  },
})

// ── PATCH /api/meridians/{id}/members/{targetUserId} ──────────────────────────
// Owner-only. Cannot demote the last owner.

app.http('membersUpdate', {
  methods:   ['PATCH'],
  authLevel: 'anonymous',
  route:     'meridians/{id}/members/{targetUserId}',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    const meridianId   = parseInt(request.params.id)
    const targetUserId = parseInt(request.params.targetUserId)
    const userId       = await resolveUser(caller)

    let body
    try { body = await request.json() } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON' } }
    }
    const { role } = body

    if (!['owner', 'member', 'viewer'].includes(role)) {
      return { status: 400, jsonBody: { error: 'role must be owner, member, or viewer' } }
    }

    const callerRole = await getMemberRole(userId, meridianId)
    if (!canManage(callerRole)) {
      return { status: 403, jsonBody: { error: 'Only owners can change roles' } }
    }

    // Guard: cannot demote the last owner
    if (role !== 'owner') {
      const ownerCount = await query(
        `SELECT COUNT(*) AS cnt FROM meridian_members
         WHERE meridian_id = @meridianId AND role = 'owner' AND user_id != @targetUserId`,
        [
          { name: 'meridianId',   type: sql.Int, value: meridianId   },
          { name: 'targetUserId', type: sql.Int, value: targetUserId },
        ]
      )
      if (ownerCount.recordset[0].cnt === 0) {
        return { status: 409, jsonBody: { error: 'Cannot demote the last owner' } }
      }
    }

    await query(
      `UPDATE meridian_members SET role = @role
       WHERE meridian_id = @meridianId AND user_id = @targetUserId`,
      [
        { name: 'role',         type: sql.VarChar, value: role         },
        { name: 'meridianId',   type: sql.Int,     value: meridianId   },
        { name: 'targetUserId', type: sql.Int,     value: targetUserId },
      ]
    )

    return { status: 200, jsonBody: { ok: true } }
  },
})

// ── DELETE /api/meridians/{id}/members/{targetUserId} ─────────────────────────
// Owner-only (or self-removal / leaving). Cannot remove the last owner.

app.http('membersDelete', {
  methods:   ['DELETE'],
  authLevel: 'anonymous',
  route:     'meridians/{id}/members/{targetUserId}',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    const meridianId   = parseInt(request.params.id)
    const targetUserId = parseInt(request.params.targetUserId)
    const userId       = await resolveUser(caller)

    const callerRole = await getMemberRole(userId, meridianId)
    const isSelf     = userId === targetUserId

    if (!isSelf && !canManage(callerRole)) {
      return { status: 403, jsonBody: { error: 'Only owners can remove members' } }
    }

    // Guard: cannot remove the last owner
    const targetRole = await getMemberRole(targetUserId, meridianId)
    if (targetRole === 'owner') {
      const ownerCount = await query(
        `SELECT COUNT(*) AS cnt FROM meridian_members
         WHERE meridian_id = @meridianId AND role = 'owner'`,
        [{ name: 'meridianId', type: sql.Int, value: meridianId }]
      )
      if (ownerCount.recordset[0].cnt <= 1) {
        return { status: 409, jsonBody: { error: 'Cannot remove the last owner' } }
      }
    }

    await query(
      `DELETE FROM meridian_members
       WHERE meridian_id = @meridianId AND user_id = @targetUserId`,
      [
        { name: 'meridianId',   type: sql.Int, value: meridianId   },
        { name: 'targetUserId', type: sql.Int, value: targetUserId },
      ]
    )

    return { status: 200, jsonBody: { ok: true } }
  },
})
