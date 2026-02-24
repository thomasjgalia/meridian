const { app } = require('@azure/functions')
const { query, sql } = require('../shared/db')
const { requireAuth } = require('../shared/auth')
const { resolveUser } = require('../shared/user')
const { getMemberRole, canWrite, canManage } = require('../shared/roles')

// ── POST /api/sprints ──────────────────────────────────────────────────────────

app.http('createSprint', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'sprints',
  handler: async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    const userId = await resolveUser(caller)
    const { name, goal, startDate, endDate, state = 'planning', meridianId } = await request.json()

    if (!name?.trim()) {
      return { status: 400, jsonBody: { error: 'name is required' } }
    }
    if (!['planning', 'active', 'complete'].includes(state)) {
      return { status: 400, jsonBody: { error: 'Invalid state' } }
    }
    if (!meridianId) {
      return { status: 400, jsonBody: { error: 'meridianId is required' } }
    }

    const role = await getMemberRole(userId, meridianId)
    if (!canWrite(role)) {
      return { status: 403, jsonBody: { error: role === null ? 'Forbidden' : 'Viewers cannot create sprints' } }
    }

    const result = await query(
      `INSERT INTO sprints (name, goal, state, start_date, end_date, meridian_id, created_by, created_at)
       OUTPUT INSERTED.*
       VALUES (@name, @goal, @state, @startDate, @endDate, @meridianId, @userId, GETUTCDATE())`,
      [
        { name: 'name',       type: sql.NVarChar, value: name.trim()       },
        { name: 'goal',       type: sql.NVarChar, value: goal ?? null      },
        { name: 'state',      type: sql.VarChar,  value: state             },
        { name: 'startDate',  type: sql.Date,     value: startDate ?? null },
        { name: 'endDate',    type: sql.Date,     value: endDate ?? null   },
        { name: 'meridianId', type: sql.Int,      value: meridianId        },
        { name: 'userId',     type: sql.Int,      value: userId            },
      ]
    )

    const row = result.recordset[0]
    return {
      status: 201,
      jsonBody: {
        id:         row.id,
        name:       row.name,
        goal:       row.goal,
        state:      row.state,
        startDate:  row.start_date,
        endDate:    row.end_date,
        meridianId: row.meridian_id,
      },
    }
  },
})

// ── PATCH /api/sprints/{id} ───────────────────────────────────────────────────

const ALLOWED_FIELDS = ['name', 'goal', 'state', 'startDate', 'endDate']
const COLUMN_MAP     = { name: 'name', goal: 'goal', state: 'state', startDate: 'start_date', endDate: 'end_date' }

app.http('updateSprint', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'sprints/{id}',
  handler: async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    const userId   = await resolveUser(caller)
    const sprintId = parseInt(request.params.id)
    const { field, value } = await request.json()

    if (!ALLOWED_FIELDS.includes(field)) {
      return { status: 400, jsonBody: { error: `Invalid field: ${field}` } }
    }

    const check = await query(
      `SELECT id, meridian_id FROM sprints WHERE id = @sprintId`,
      [{ name: 'sprintId', type: sql.Int, value: sprintId }]
    )
    if (check.recordset.length === 0) {
      return { status: 404, jsonBody: { error: 'Sprint not found' } }
    }

    const role = await getMemberRole(userId, check.recordset[0].meridian_id)
    if (!canWrite(role)) {
      return { status: 403, jsonBody: { error: role === null ? 'Forbidden' : 'Viewers cannot edit sprints' } }
    }

    const column  = COLUMN_MAP[field]
    const sqlType = (field === 'name' || field === 'goal') ? sql.NVarChar
                  : field === 'state'                      ? sql.VarChar
                  : sql.Date

    await query(
      `UPDATE sprints SET ${column} = @value WHERE id = @sprintId`,
      [
        { name: 'value',    type: sqlType, value         },
        { name: 'sprintId', type: sql.Int, value: sprintId },
      ]
    )

    return { status: 200, jsonBody: { ok: true } }
  },
})

// ── DELETE /api/sprints/{id} ──────────────────────────────────────────────────

app.http('deleteSprint', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'sprints/{id}',
  handler: async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    const userId   = await resolveUser(caller)
    const sprintId = parseInt(request.params.id)

    const check = await query(
      `SELECT id, meridian_id FROM sprints WHERE id = @sprintId`,
      [{ name: 'sprintId', type: sql.Int, value: sprintId }]
    )
    if (check.recordset.length === 0) {
      return { status: 404, jsonBody: { error: 'Sprint not found' } }
    }

    const role = await getMemberRole(userId, check.recordset[0].meridian_id)
    if (!canManage(role)) {
      return { status: 403, jsonBody: { error: role === null ? 'Forbidden' : 'Only owners can delete sprints' } }
    }

    await query(
      `UPDATE work_items SET sprint_id = NULL WHERE sprint_id = @sprintId`,
      [{ name: 'sprintId', type: sql.Int, value: sprintId }]
    )

    await query(
      `DELETE FROM sprints WHERE id = @sprintId`,
      [{ name: 'sprintId', type: sql.Int, value: sprintId }]
    )

    return { status: 200, jsonBody: { ok: true } }
  },
})
