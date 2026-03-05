const { app }         = require('@azure/functions')
const { requireAuth } = require('../shared/auth')
const { resolveUser } = require('../shared/user')
const { query, sql }  = require('../shared/db')

// ── Row mappers ────────────────────────────────────────────────────────────────

function mapItem(r) {
  return {
    id:          r.id,
    meridianId:  r.meridian_id,
    parentId:    r.parent_id,
    type:        r.type,
    title:       r.title,
    description: r.description,
    statusId:    r.status_id,
    assigneeId:  r.assignee_id,
    sprintId:    r.sprint_id,
    startDate:   r.start_date,
    dueDate:     r.due_date,
    position:    r.position,
    createdAt:   r.created_at ? r.created_at.toISOString().slice(0, 10) : null,
  }
}

function mapMeridian(r) {
  return { id: r.id, name: r.name, slug: r.slug, color: r.color }
}

function mapStatus(r) {
  return {
    id:         r.id,
    meridianId: r.meridian_id,
    name:       r.name,
    color:      r.color,
    position:   r.position,
    isDefault:  !!r.is_default,
    isComplete: !!r.is_complete,
    isBlocked:  !!r.is_blocked,
  }
}

function mapSprint(r) {
  return { id: r.id, name: r.name, state: r.state, startDate: r.start_date, endDate: r.end_date, meridianId: r.meridian_id }
}

function mapUser(r) {
  return { id: r.id, displayName: r.display_name, email: r.email, avatarUrl: r.avatar_url }
}

// ── Validate YYYY-MM-DD ────────────────────────────────────────────────────────

function parseDate(str) {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null
  const d = new Date(str + 'T00:00:00Z')
  return isNaN(d.getTime()) ? null : str
}

// ── GET /api/today?date=YYYY-MM-DD ────────────────────────────────────────────

app.http('todayGet', {
  methods:   ['GET'],
  authLevel: 'anonymous',
  route:     'today',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    const dateStr = parseDate(request.query.get('date'))
    if (!dateStr) return { status: 400, jsonBody: { error: 'date param required (YYYY-MM-DD)' } }

    try {
      const userId = await resolveUser(caller)

      const [planRows, planItems, activeSprintItems, meridians, statuses, sprints, users, carryOverRows, prevDateRows, nextDateRows] = await Promise.all([

        // Ordered plan entries for this user+date
        query(
          `SELECT item_id, position
           FROM   daily_plan_items
           WHERE  user_id = @userId AND plan_date = @planDate
           ORDER  BY position`,
          [
            { name: 'userId',   type: sql.Int,  value: userId  },
            { name: 'planDate', type: sql.Date, value: dateStr },
          ]
        ),

        // Full work item data for items in today's plan
        query(
          `SELECT wi.id, wi.meridian_id, wi.parent_id, wi.type, wi.title,
                  wi.description, wi.status_id, wi.assignee_id, wi.sprint_id,
                  wi.start_date, wi.due_date, wi.position, wi.created_at
           FROM   work_items wi
           JOIN   daily_plan_items dp ON dp.item_id = wi.id
           WHERE  dp.user_id = @userId AND dp.plan_date = @planDate
             AND  wi.is_active = 1`,
          [
            { name: 'userId',   type: sql.Int,  value: userId  },
            { name: 'planDate', type: sql.Date, value: dateStr },
          ]
        ),

        // Active sprint items the user can see that are NOT already in today's plan
        query(
          `SELECT wi.id, wi.meridian_id, wi.parent_id, wi.type, wi.title,
                  wi.description, wi.status_id, wi.assignee_id, wi.sprint_id,
                  wi.start_date, wi.due_date, wi.position, wi.created_at
           FROM   work_items wi
           JOIN   sprints sp            ON sp.id = wi.sprint_id
           JOIN   meridian_members mm   ON mm.meridian_id = wi.meridian_id
           WHERE  mm.user_id = @userId
             AND  sp.state = 'active'
             AND  wi.is_active = 1
             AND  wi.type NOT IN ('arc', 'todo')
             AND  NOT EXISTS (
               SELECT 1 FROM daily_plan_items dp2
               WHERE  dp2.item_id = wi.id
                 AND  dp2.user_id = @userId
                 AND  dp2.plan_date = @planDate
             )
           ORDER  BY sp.id,
                     CASE wi.type WHEN 'episode' THEN 0 WHEN 'signal' THEN 1 ELSE 2 END,
                     wi.parent_id, wi.position`,
          [
            { name: 'userId',   type: sql.Int,  value: userId  },
            { name: 'planDate', type: sql.Date, value: dateStr },
          ]
        ),

        // Meridians the user is a member of
        query(
          `SELECT m.id, m.name, m.slug, m.color
           FROM   meridians m
           JOIN   meridian_members mm ON mm.meridian_id = m.id
           WHERE  mm.user_id = @userId AND m.is_active = 1
           ORDER  BY m.name`,
          [{ name: 'userId', type: sql.Int, value: userId }]
        ),

        // Statuses for those meridians
        query(
          `SELECT s.id, s.meridian_id, s.name, s.color, s.position,
                  s.is_default, s.is_complete, s.is_blocked
           FROM   statuses s
           JOIN   meridian_members mm ON mm.meridian_id = s.meridian_id
           WHERE  mm.user_id = @userId
           ORDER  BY s.meridian_id, s.position`,
          [{ name: 'userId', type: sql.Int, value: userId }]
        ),

        // Active sprints for those meridians
        query(
          `SELECT sp.id, sp.name, sp.state, sp.start_date, sp.end_date, sp.meridian_id
           FROM   sprints sp
           JOIN   meridian_members mm ON mm.meridian_id = sp.meridian_id
           WHERE  mm.user_id = @userId AND sp.state = 'active'`,
          [{ name: 'userId', type: sql.Int, value: userId }]
        ),

        // Teammates visible to this user
        query(
          `SELECT DISTINCT u.id, u.display_name, u.email, u.avatar_url
           FROM   users u
           JOIN   meridian_members mm  ON mm.user_id     = u.id
           JOIN   meridian_members my  ON my.meridian_id = mm.meridian_id
           WHERE  my.user_id = @userId AND u.is_active = 1`,
          [{ name: 'userId', type: sql.Int, value: userId }]
        ),

        // Most recent previous plan date that has incomplete items (for carry-over prompt)
        query(
          `SELECT TOP 1 dp.plan_date, COUNT(*) AS cnt
           FROM   daily_plan_items dp
           JOIN   work_items wi ON wi.id    = dp.item_id
           JOIN   statuses   s  ON s.id     = wi.status_id
           WHERE  dp.user_id    = @userId
             AND  dp.plan_date  < @planDate
             AND  s.is_complete = 0
             AND  wi.is_active  = 1
           GROUP  BY dp.plan_date
           ORDER  BY dp.plan_date DESC`,
          [
            { name: 'userId',   type: sql.Int,  value: userId  },
            { name: 'planDate', type: sql.Date, value: dateStr },
          ]
        ),

        // Nearest previous plan date (for prev-day navigation)
        query(
          `SELECT TOP 1 plan_date FROM daily_plan_items
           WHERE  user_id = @userId AND plan_date < @planDate
           GROUP  BY plan_date ORDER BY plan_date DESC`,
          [
            { name: 'userId',   type: sql.Int,  value: userId  },
            { name: 'planDate', type: sql.Date, value: dateStr },
          ]
        ),

        // Nearest future plan date up to and including today (for next-day navigation)
        query(
          `SELECT TOP 1 plan_date FROM daily_plan_items
           WHERE  user_id = @userId AND plan_date > @planDate
             AND  plan_date <= CAST(GETUTCDATE() AS DATE)
           GROUP  BY plan_date ORDER BY plan_date ASC`,
          [
            { name: 'userId',   type: sql.Int,  value: userId  },
            { name: 'planDate', type: sql.Date, value: dateStr },
          ]
        ),

      ])

      const carryOverRow = carryOverRows.recordset[0] ?? null
      const carryOver    = carryOverRow
        ? { fromDate: carryOverRow.plan_date.toISOString().slice(0, 10), count: carryOverRow.cnt }
        : null

      return {
        status:   200,
        jsonBody: {
          myUserId:          userId,
          plan:              planRows.recordset.map((r) => ({ itemId: r.item_id, position: r.position })),
          items:             planItems.recordset.map(mapItem),
          activeSprintItems: activeSprintItems.recordset.map(mapItem),
          meridians:         meridians.recordset.map(mapMeridian),
          statuses:          statuses.recordset.map(mapStatus),
          sprints:           sprints.recordset.map(mapSprint),
          users:             users.recordset.map(mapUser),
          prevDate:          prevDateRows.recordset[0]?.plan_date?.toISOString().slice(0, 10) ?? null,
          nextDate:          nextDateRows.recordset[0]?.plan_date?.toISOString().slice(0, 10) ?? null,
          ...(carryOver ? { carryOver } : {}),
        },
      }

    } catch (err) {
      context.error('GET /api/today failed:', err)
      return { status: 500, jsonBody: { error: 'Internal server error' } }
    }
  },
})

// ── POST /api/today/plan — add item to today's plan ───────────────────────────

app.http('todayPlanAdd', {
  methods:   ['POST'],
  authLevel: 'anonymous',
  route:     'today/plan',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    let body
    try { body = await request.json() } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON' } }
    }

    const { date, itemId } = body
    const dateStr = parseDate(date)
    if (!dateStr)            return { status: 400, jsonBody: { error: 'date required (YYYY-MM-DD)' } }
    if (!Number.isInteger(itemId)) return { status: 400, jsonBody: { error: 'itemId required' } }

    try {
      const userId = await resolveUser(caller)

      // Verify item exists and user has access via meridian membership
      const itemCheck = await query(
        `SELECT wi.meridian_id
         FROM   work_items wi
         JOIN   meridian_members mm ON mm.meridian_id = wi.meridian_id
         WHERE  wi.id = @itemId AND wi.is_active = 1 AND mm.user_id = @userId`,
        [
          { name: 'itemId', type: sql.Int, value: itemId },
          { name: 'userId', type: sql.Int, value: userId },
        ]
      )
      if (itemCheck.recordset.length === 0) {
        return { status: 404, jsonBody: { error: 'Item not found or access denied' } }
      }

      // Insert if not already present; position = current max + 1
      await query(
        `INSERT INTO daily_plan_items (user_id, plan_date, item_id, position)
         SELECT @userId, @planDate, @itemId,
                COALESCE((SELECT MAX(position) + 1 FROM daily_plan_items
                          WHERE user_id = @userId AND plan_date = @planDate), 0)
         WHERE NOT EXISTS (
           SELECT 1 FROM daily_plan_items
           WHERE user_id = @userId AND plan_date = @planDate AND item_id = @itemId
         )`,
        [
          { name: 'userId',   type: sql.Int,  value: userId  },
          { name: 'planDate', type: sql.Date, value: dateStr },
          { name: 'itemId',   type: sql.Int,  value: itemId  },
        ]
      )

      return { status: 201, jsonBody: { ok: true } }

    } catch (err) {
      context.error('POST /api/today/plan failed:', err)
      return { status: 500, jsonBody: { error: 'Internal server error' } }
    }
  },
})

// ── DELETE /api/today/plan/:itemId — remove item from today's plan ─────────────

app.http('todayPlanRemove', {
  methods:   ['DELETE'],
  authLevel: 'anonymous',
  route:     'today/plan/{itemId}',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    const itemId  = parseInt(request.params.itemId, 10)
    const dateStr = parseDate(request.query.get('date'))
    if (!itemId)  return { status: 400, jsonBody: { error: 'Invalid itemId' } }
    if (!dateStr) return { status: 400, jsonBody: { error: 'date query param required (YYYY-MM-DD)' } }

    try {
      const userId = await resolveUser(caller)

      await query(
        `DELETE FROM daily_plan_items
         WHERE user_id = @userId AND plan_date = @planDate AND item_id = @itemId`,
        [
          { name: 'userId',   type: sql.Int,  value: userId  },
          { name: 'planDate', type: sql.Date, value: dateStr },
          { name: 'itemId',   type: sql.Int,  value: itemId  },
        ]
      )

      return { status: 200, jsonBody: { ok: true } }

    } catch (err) {
      context.error(`DELETE /api/today/plan/${itemId} failed:`, err)
      return { status: 500, jsonBody: { error: 'Internal server error' } }
    }
  },
})

// ── PATCH /api/today/reorder — persist drag order ─────────────────────────────

app.http('todayReorder', {
  methods:   ['PATCH'],
  authLevel: 'anonymous',
  route:     'today/reorder',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    let body
    try { body = await request.json() } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON' } }
    }

    const { date, positions } = body
    const dateStr = parseDate(date)
    if (!dateStr)                  return { status: 400, jsonBody: { error: 'date required (YYYY-MM-DD)' } }
    if (!Array.isArray(positions)) return { status: 400, jsonBody: { error: 'positions array required' } }

    try {
      const userId = await resolveUser(caller)

      // Update each position — small list, sequential updates are fine
      for (const { itemId, position } of positions) {
        if (!Number.isInteger(itemId) || !Number.isInteger(position)) continue
        await query(
          `UPDATE daily_plan_items
           SET    position = @position
           WHERE  user_id = @userId AND plan_date = @planDate AND item_id = @itemId`,
          [
            { name: 'userId',   type: sql.Int,  value: userId   },
            { name: 'planDate', type: sql.Date, value: dateStr  },
            { name: 'itemId',   type: sql.Int,  value: itemId   },
            { name: 'position', type: sql.Int,  value: position },
          ]
        )
      }

      return { status: 200, jsonBody: { ok: true } }

    } catch (err) {
      context.error('PATCH /api/today/reorder failed:', err)
      return { status: 500, jsonBody: { error: 'Internal server error' } }
    }
  },
})

// ── POST /api/today/carryover — copy incomplete items to a new date ────────────

app.http('todayCarryover', {
  methods:   ['POST'],
  authLevel: 'anonymous',
  route:     'today/carryover',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    let body
    try { body = await request.json() } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON' } }
    }

    const { fromDate, toDate } = body
    const fromStr = parseDate(fromDate)
    const toStr   = parseDate(toDate)
    if (!fromStr) return { status: 400, jsonBody: { error: 'fromDate required (YYYY-MM-DD)' } }
    if (!toStr)   return { status: 400, jsonBody: { error: 'toDate required (YYYY-MM-DD)' } }
    if (fromStr >= toStr) return { status: 400, jsonBody: { error: 'toDate must be after fromDate' } }

    try {
      const userId = await resolveUser(caller)

      // Get all incomplete items from the source plan
      const sourceRows = await query(
        `SELECT dp.item_id, dp.position,
                wi.type, wi.title, wi.description, wi.meridian_id, wi.assignee_id, wi.status_id
         FROM   daily_plan_items dp
         JOIN   work_items wi ON wi.id    = dp.item_id
         JOIN   statuses   s  ON s.id     = wi.status_id
         WHERE  dp.user_id    = @userId
           AND  dp.plan_date  = @fromDate
           AND  s.is_complete = 0
           AND  wi.is_active  = 1
         ORDER  BY dp.position`,
        [
          { name: 'userId',   type: sql.Int,  value: userId  },
          { name: 'fromDate', type: sql.Date, value: fromStr },
        ]
      )

      let position = 0
      for (const row of sourceRows.recordset) {
        let itemId = row.item_id

        if (row.type === 'todo') {
          // Duplicate the todo work item with the new due date
          const defaultStatus = await query(
            `SELECT id FROM statuses WHERE meridian_id = @meridianId AND is_default = 1`,
            [{ name: 'meridianId', type: sql.Int, value: row.meridian_id }]
          )
          const newStatusId = defaultStatus.recordset[0]?.id ?? row.status_id

          const newItem = await query(
            `INSERT INTO work_items
               (meridian_id, parent_id, type, title, description, status_id, assignee_id, sprint_id, due_date, created_by, position)
             OUTPUT INSERTED.id
             VALUES
               (@meridianId, NULL, 'todo', @title, @description, @statusId, @assigneeId, NULL, @dueDate, @userId, 0)`,
            [
              { name: 'meridianId',  type: sql.Int,      value: row.meridian_id  },
              { name: 'title',       type: sql.NVarChar,  value: row.title        },
              { name: 'description', type: sql.NVarChar,  value: row.description  },
              { name: 'statusId',    type: sql.Int,       value: newStatusId      },
              { name: 'assigneeId',  type: sql.Int,       value: row.assignee_id  },
              { name: 'dueDate',     type: sql.Date,      value: toStr            },
              { name: 'userId',      type: sql.Int,       value: userId           },
            ]
          )
          itemId = newItem.recordset[0].id
        }

        // Add to the toDate plan (skip if already present)
        await query(
          `INSERT INTO daily_plan_items (user_id, plan_date, item_id, position)
           SELECT @userId, @toDate, @itemId, @position
           WHERE NOT EXISTS (
             SELECT 1 FROM daily_plan_items
             WHERE user_id = @userId AND plan_date = @toDate AND item_id = @itemId
           )`,
          [
            { name: 'userId',   type: sql.Int,  value: userId   },
            { name: 'toDate',   type: sql.Date, value: toStr    },
            { name: 'itemId',   type: sql.Int,  value: itemId   },
            { name: 'position', type: sql.Int,  value: position },
          ]
        )
        position++
      }

      // Return the updated today payload so the client can refresh in one round-trip
      const [planRows, planItems, activeSprintItems] = await Promise.all([
        query(
          `SELECT item_id, position FROM daily_plan_items
           WHERE user_id = @userId AND plan_date = @toDate ORDER BY position`,
          [{ name: 'userId', type: sql.Int, value: userId }, { name: 'toDate', type: sql.Date, value: toStr }]
        ),
        query(
          `SELECT wi.id, wi.meridian_id, wi.parent_id, wi.type, wi.title,
                  wi.description, wi.status_id, wi.assignee_id, wi.sprint_id,
                  wi.start_date, wi.due_date, wi.position, wi.created_at
           FROM   work_items wi
           JOIN   daily_plan_items dp ON dp.item_id = wi.id
           WHERE  dp.user_id = @userId AND dp.plan_date = @toDate AND wi.is_active = 1`,
          [{ name: 'userId', type: sql.Int, value: userId }, { name: 'toDate', type: sql.Date, value: toStr }]
        ),
        query(
          `SELECT wi.id, wi.meridian_id, wi.parent_id, wi.type, wi.title,
                  wi.description, wi.status_id, wi.assignee_id, wi.sprint_id,
                  wi.start_date, wi.due_date, wi.position, wi.created_at
           FROM   work_items wi
           JOIN   sprints sp          ON sp.id = wi.sprint_id
           JOIN   meridian_members mm ON mm.meridian_id = wi.meridian_id
           WHERE  mm.user_id = @userId AND sp.state = 'active'
             AND  wi.is_active = 1 AND wi.type NOT IN ('arc', 'todo')
             AND  NOT EXISTS (
               SELECT 1 FROM daily_plan_items dp2
               WHERE dp2.item_id = wi.id AND dp2.user_id = @userId AND dp2.plan_date = @toDate
             )`,
          [{ name: 'userId', type: sql.Int, value: userId }, { name: 'toDate', type: sql.Date, value: toStr }]
        ),
      ])

      return {
        status:   200,
        jsonBody: {
          plan:              planRows.recordset.map((r) => ({ itemId: r.item_id, position: r.position })),
          items:             planItems.recordset.map(mapItem),
          activeSprintItems: activeSprintItems.recordset.map(mapItem),
        },
      }

    } catch (err) {
      context.error('POST /api/today/carryover failed:', err)
      return { status: 500, jsonBody: { error: 'Internal server error' } }
    }
  },
})
