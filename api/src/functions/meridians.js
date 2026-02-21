const { app }         = require('@azure/functions')
const { requireAuth } = require('../shared/auth')
const { resolveUser } = require('../shared/user')
const { query, sql }  = require('../shared/db')

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
           (@mid, 'Adrift',      '#94A3B8', 0, 1, 0, 0),
           (@mid, 'In Progress', '#3B82F6', 1, 0, 0, 0),
           (@mid, 'In Irons',    '#F59E0B', 2, 0, 0, 1),
           (@mid, 'Complete',    '#10B981', 3, 0, 1, 0)`,
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
          id:    meridian.id,
          name:  meridian.name,
          slug:  meridian.slug,
          color: meridian.color,
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
