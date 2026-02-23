const { app }         = require('@azure/functions')
const { requireAuth } = require('../shared/auth')
const { resolveUser } = require('../shared/user')
const { query, sql }  = require('../shared/db')
const { getMemberRole, canManage } = require('../shared/roles')

/**
 * POST /api/meridians
 *
 * Creates a new meridian, seeds the default status set, and adds the
 * creating user as owner.
 *
 * Body: { name, slug, color }
 */
app.http('meridiansCreate', {
  methods:   ['POST'],
  authLevel: 'anonymous',
  route:     'meridians',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    let body
    try { body = await request.json() } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON' } }
    }

    const { name, slug, color } = body
    if (!name?.trim()) return { status: 400, jsonBody: { error: 'name required' } }
    if (!slug?.trim()) return { status: 400, jsonBody: { error: 'slug required' } }

    // Validate slug format: lowercase alphanumeric and hyphens only
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return { status: 400, jsonBody: { error: 'slug must be lowercase alphanumeric and hyphens only' } }
    }

    try {
      const userId = await resolveUser(caller)

      // Insert meridian
      const meridianResult = await query(
        `INSERT INTO meridians (name, slug, color, created_by)
         OUTPUT INSERTED.id, INSERTED.name, INSERTED.slug, INSERTED.color
         VALUES (@name, @slug, @color, @userId)`,
        [
          { name: 'name',   type: sql.NVarChar, value: name.trim()   },
          { name: 'slug',   type: sql.NVarChar, value: slug.trim()   },
          { name: 'color',  type: sql.VarChar,  value: color ?? null },
          { name: 'userId', type: sql.Int,      value: userId        },
        ]
      )

      const meridian = meridianResult.recordset[0]

      // Seed default statuses (matches sp_seed_default_statuses)
      await query(
        `INSERT INTO statuses (meridian_id, name, color, position, is_default, is_complete, is_blocked)
         VALUES
           (@mid, 'Standby', '#94A3B8', 0, 1, 0, 0),
           (@mid, 'Live',    '#3B82F6', 1, 0, 0, 0),
           (@mid, 'Static',  '#E11A0A', 2, 0, 0, 1),
           (@mid, 'Over',    '#23F014', 3, 0, 1, 0)`,
        [{ name: 'mid', type: sql.Int, value: meridian.id }]
      )

      // Add creator as owner
      await query(
        `INSERT INTO meridian_members (meridian_id, user_id, role)
         VALUES (@meridianId, @userId, 'owner')`,
        [
          { name: 'meridianId', type: sql.Int, value: meridian.id },
          { name: 'userId',     type: sql.Int, value: userId      },
        ]
      )

      return {
        status:   201,
        jsonBody: {
          id:          meridian.id,
          name:        meridian.name,
          slug:        meridian.slug,
          color:       meridian.color,
          description: null,
          isActive:    true,
          startDate:   null,
          endDate:     null,
        },
      }

    } catch (err) {
      // Unique constraint violation on slug
      if (err.number === 2627 || err.number === 2601) {
        return { status: 409, jsonBody: { error: 'A meridian with that slug already exists' } }
      }
      context.error('POST /api/meridians failed:', err)
      return { status: 500, jsonBody: { error: 'Internal server error' } }
    }
  },
})

// ── PATCH /api/meridians/{id} ─────────────────────────────────────────────────
// Owner-only. Updates general meridian settings.
// Body: any subset of { name, slug, description, color, isActive, startDate, endDate }

const MERIDIAN_FIELDS = {
  name:        { col: 'name',        type: () => sql.NVarChar  },
  slug:        { col: 'slug',        type: () => sql.NVarChar  },
  description: { col: 'description', type: () => sql.NVarChar  },
  color:       { col: 'color',       type: () => sql.VarChar   },
  isActive:    { col: 'is_active',   type: () => sql.Bit       },
  startDate:   { col: 'start_date',  type: () => sql.Date      },
  endDate:     { col: 'end_date',    type: () => sql.Date      },
}

app.http('meridiansUpdate', {
  methods:   ['PATCH'],
  authLevel: 'anonymous',
  route:     'meridians/{id}',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    const meridianId = parseInt(request.params.id)
    const userId     = await resolveUser(caller)

    const role = await getMemberRole(userId, meridianId)
    if (!canManage(role)) {
      return { status: 403, jsonBody: { error: 'Only owners can edit meridian settings' } }
    }

    let body
    try { body = await request.json() } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON' } }
    }

    // Build SET clauses for whichever fields are present in the body
    const setClauses = []
    const params     = [{ name: 'meridianId', type: sql.Int, value: meridianId }]

    for (const [key, { col, type }] of Object.entries(MERIDIAN_FIELDS)) {
      if (!(key in body)) continue

      // Extra validation
      if (key === 'slug') {
        if (!/^[a-z0-9-]+$/.test(body[key] ?? '')) {
          return { status: 400, jsonBody: { error: 'slug must be lowercase alphanumeric and hyphens only' } }
        }
      }
      if (key === 'name' && !body[key]?.trim()) {
        return { status: 400, jsonBody: { error: 'name cannot be empty' } }
      }

      setClauses.push(`${col} = @${key}`)
      params.push({ name: key, type: type(), value: body[key] ?? null })
    }

    if (setClauses.length === 0) {
      return { status: 400, jsonBody: { error: 'No valid fields provided' } }
    }

    setClauses.push('updated_at = GETUTCDATE()')

    try {
      await query(
        `UPDATE meridians SET ${setClauses.join(', ')} WHERE id = @meridianId`,
        params
      )
      return { status: 200, jsonBody: { ok: true } }
    } catch (err) {
      if (err.number === 2627 || err.number === 2601) {
        return { status: 409, jsonBody: { error: 'A meridian with that slug already exists' } }
      }
      context.error('PATCH /api/meridians/:id failed:', err)
      return { status: 500, jsonBody: { error: 'Internal server error' } }
    }
  },
})

// ── DELETE /api/meridians/{id} ────────────────────────────────────────────────
// Owner-only. Soft-deletes by setting is_active = 0.
// Data (items, sprints, statuses) is preserved but the meridian disappears from
// all board views since queries filter WHERE is_active = 1.

app.http('meridiansDelete', {
  methods:   ['DELETE'],
  authLevel: 'anonymous',
  route:     'meridians/{id}',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    const meridianId = parseInt(request.params.id)
    const userId     = await resolveUser(caller)

    const role = await getMemberRole(userId, meridianId)
    if (!canManage(role)) {
      return { status: 403, jsonBody: { error: 'Only owners can delete a meridian' } }
    }

    await query(
      `UPDATE meridians SET is_active = 0, updated_at = GETUTCDATE() WHERE id = @meridianId`,
      [{ name: 'meridianId', type: sql.Int, value: meridianId }]
    )

    return { status: 200, jsonBody: { ok: true } }
  },
})
