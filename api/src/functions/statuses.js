const { app }         = require('@azure/functions')
const { requireAuth } = require('../shared/auth')
const { resolveUser } = require('../shared/user')
const { query, sql }  = require('../shared/db')
const { getMemberRole, canManage } = require('../shared/roles')

// ── POST /api/meridians/{id}/statuses ─────────────────────────────────────────
// Owner-only. Adds a new status to the meridian pipeline.
// Body: { name, color, isDefault?, isComplete?, isBlocked? }

app.http('statusesCreate', {
  methods:   ['POST'],
  authLevel: 'anonymous',
  route:     'meridians/{id}/statuses',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    const meridianId = parseInt(request.params.id)
    const userId     = await resolveUser(caller)

    const role = await getMemberRole(userId, meridianId)
    if (!canManage(role)) {
      return { status: 403, jsonBody: { error: 'Only owners can manage statuses' } }
    }

    let body
    try { body = await request.json() } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON' } }
    }

    const { name, color = '#94A3B8', isDefault = false, isComplete = false, isBlocked = false } = body
    if (!name?.trim()) return { status: 400, jsonBody: { error: 'name required' } }

    // Position = after the last existing status
    const posResult = await query(
      `SELECT ISNULL(MAX(position), -1) + 1 AS next_pos FROM statuses WHERE meridian_id = @meridianId`,
      [{ name: 'meridianId', type: sql.Int, value: meridianId }]
    )
    const position = posResult.recordset[0].next_pos

    try {
      const result = await query(
        `INSERT INTO statuses (meridian_id, name, color, position, is_default, is_complete, is_blocked)
         OUTPUT INSERTED.*
         VALUES (@meridianId, @name, @color, @position, @isDefault, @isComplete, @isBlocked)`,
        [
          { name: 'meridianId', type: sql.Int,      value: meridianId          },
          { name: 'name',       type: sql.NVarChar,  value: name.trim()        },
          { name: 'color',      type: sql.VarChar,   value: color              },
          { name: 'position',   type: sql.Int,        value: position           },
          { name: 'isDefault',  type: sql.Bit,        value: isDefault ? 1 : 0 },
          { name: 'isComplete', type: sql.Bit,        value: isComplete ? 1 : 0 },
          { name: 'isBlocked',  type: sql.Bit,        value: isBlocked ? 1 : 0 },
        ]
      )
      const row = result.recordset[0]
      return {
        status:   201,
        jsonBody: {
          id:         row.id,
          meridianId: row.meridian_id,
          name:       row.name,
          color:      row.color,
          position:   row.position,
          isDefault:  !!row.is_default,
          isComplete: !!row.is_complete,
          isBlocked:  !!row.is_blocked,
        },
      }
    } catch (err) {
      if (err.number === 2627 || err.number === 2601) {
        return { status: 409, jsonBody: { error: 'A status with that name already exists in this meridian' } }
      }
      context.error('POST /api/meridians/:id/statuses failed:', err)
      return { status: 500, jsonBody: { error: 'Internal server error' } }
    }
  },
})

// ── PATCH /api/statuses/{id} ──────────────────────────────────────────────────
// Owner-only. Updates one or more fields on a status.
// Body: any subset of { name, color, position, isDefault, isComplete, isBlocked }

app.http('statusesUpdate', {
  methods:   ['PATCH'],
  authLevel: 'anonymous',
  route:     'statuses/{id}',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    const statusId = parseInt(request.params.id)
    const userId   = await resolveUser(caller)

    // Fetch the status to get its meridianId
    const statusRow = await query(
      `SELECT id, meridian_id FROM statuses WHERE id = @statusId`,
      [{ name: 'statusId', type: sql.Int, value: statusId }]
    )
    if (statusRow.recordset.length === 0) {
      return { status: 404, jsonBody: { error: 'Status not found' } }
    }
    const meridianId = statusRow.recordset[0].meridian_id

    const role = await getMemberRole(userId, meridianId)
    if (!canManage(role)) {
      return { status: 403, jsonBody: { error: 'Only owners can manage statuses' } }
    }

    let body
    try { body = await request.json() } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON' } }
    }

    const FIELDS = {
      name:       { col: 'name',       type: sql.NVarChar },
      color:      { col: 'color',      type: sql.VarChar  },
      position:   { col: 'position',   type: sql.Int      },
      isDefault:  { col: 'is_default', type: sql.Bit      },
      isComplete: { col: 'is_complete', type: sql.Bit     },
      isBlocked:  { col: 'is_blocked', type: sql.Bit      },
    }

    const setClauses = []
    const params     = [{ name: 'statusId', type: sql.Int, value: statusId }]

    for (const [key, { col, type }] of Object.entries(FIELDS)) {
      if (!(key in body)) continue
      if (key === 'name' && !body[key]?.trim()) {
        return { status: 400, jsonBody: { error: 'name cannot be empty' } }
      }
      const val = (key === 'isDefault' || key === 'isComplete' || key === 'isBlocked')
        ? (body[key] ? 1 : 0)
        : (body[key] ?? null)
      setClauses.push(`${col} = @${key}`)
      params.push({ name: key, type, value: val })
    }

    if (setClauses.length === 0) {
      return { status: 400, jsonBody: { error: 'No valid fields provided' } }
    }

    try {
      await query(
        `UPDATE statuses SET ${setClauses.join(', ')} WHERE id = @statusId`,
        params
      )
      return { status: 200, jsonBody: { ok: true } }
    } catch (err) {
      if (err.number === 2627 || err.number === 2601) {
        return { status: 409, jsonBody: { error: 'A status with that name already exists in this meridian' } }
      }
      context.error('PATCH /api/statuses/:id failed:', err)
      return { status: 500, jsonBody: { error: 'Internal server error' } }
    }
  },
})

// ── DELETE /api/statuses/{id} ─────────────────────────────────────────────────
// Owner-only. Deletes a status. Work items using it are moved to the meridian's
// default status first. Cannot delete the last status or the only default.

app.http('statusesDelete', {
  methods:   ['DELETE'],
  authLevel: 'anonymous',
  route:     'statuses/{id}',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    const statusId = parseInt(request.params.id)
    const userId   = await resolveUser(caller)

    const statusRow = await query(
      `SELECT id, meridian_id, is_default FROM statuses WHERE id = @statusId`,
      [{ name: 'statusId', type: sql.Int, value: statusId }]
    )
    if (statusRow.recordset.length === 0) {
      return { status: 404, jsonBody: { error: 'Status not found' } }
    }

    const { meridian_id: meridianId, is_default: isDefault } = statusRow.recordset[0]

    const role = await getMemberRole(userId, meridianId)
    if (!canManage(role)) {
      return { status: 403, jsonBody: { error: 'Only owners can manage statuses' } }
    }

    // Guard: must have at least one status remaining
    const countResult = await query(
      `SELECT COUNT(*) AS cnt FROM statuses WHERE meridian_id = @meridianId`,
      [{ name: 'meridianId', type: sql.Int, value: meridianId }]
    )
    if (countResult.recordset[0].cnt <= 1) {
      return { status: 409, jsonBody: { error: 'Cannot delete the last status' } }
    }

    // Guard: cannot delete the only default status
    if (isDefault) {
      const defaultCount = await query(
        `SELECT COUNT(*) AS cnt FROM statuses WHERE meridian_id = @meridianId AND is_default = 1`,
        [{ name: 'meridianId', type: sql.Int, value: meridianId }]
      )
      if (defaultCount.recordset[0].cnt <= 1) {
        return { status: 409, jsonBody: { error: 'Cannot delete the only default status — set another status as default first' } }
      }
    }

    // Reassign work items to the meridian's first remaining default status
    const fallback = await query(
      `SELECT TOP 1 id FROM statuses
       WHERE meridian_id = @meridianId AND id != @statusId AND is_default = 1
       ORDER BY position`,
      [
        { name: 'meridianId', type: sql.Int, value: meridianId },
        { name: 'statusId',   type: sql.Int, value: statusId   },
      ]
    )
    const fallbackId = fallback.recordset[0]?.id ?? null

    if (fallbackId) {
      await query(
        `UPDATE work_items SET status_id = @fallbackId WHERE status_id = @statusId`,
        [
          { name: 'fallbackId', type: sql.Int, value: fallbackId },
          { name: 'statusId',   type: sql.Int, value: statusId   },
        ]
      )
    }

    await query(
      `DELETE FROM statuses WHERE id = @statusId`,
      [{ name: 'statusId', type: sql.Int, value: statusId }]
    )

    return { status: 200, jsonBody: { ok: true, reassignedTo: fallbackId } }
  },
})
