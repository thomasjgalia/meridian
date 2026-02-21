const { app }         = require('@azure/functions')
const { requireAuth } = require('../shared/auth')
const { resolveUser } = require('../shared/user')
const { query, sql }  = require('../shared/db')

const VALID_TYPES  = ['arc', 'episode', 'signal', 'relay']
const VALID_FIELDS = ['title', 'description', 'statusId', 'assigneeId', 'sprintId', 'parentId', 'meridianId']

// ── Access guard ───────────────────────────────────────────────────────────────

/** Returns true if the user is a member of the given meridian. */
async function isMember(userId, meridianId) {
  const r = await query(
    `SELECT 1 FROM meridian_members WHERE user_id = @userId AND meridian_id = @meridianId`,
    [
      { name: 'userId',     type: sql.Int, value: userId     },
      { name: 'meridianId', type: sql.Int, value: meridianId },
    ]
  )
  return r.recordset.length > 0
}

// ── POST /api/items ────────────────────────────────────────────────────────────

app.http('itemsCreate', {
  methods:   ['POST'],
  authLevel: 'anonymous',
  route:     'items',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    let body
    try { body = await request.json() } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON' } }
    }

    const { type, title, meridianId, parentId, statusId } = body

    if (!VALID_TYPES.includes(type))  return { status: 400, jsonBody: { error: 'Invalid type' } }
    if (!title?.trim())               return { status: 400, jsonBody: { error: 'Title required' } }
    if (!meridianId)                  return { status: 400, jsonBody: { error: 'meridianId required' } }

    try {
      const userId = await resolveUser(caller)

      if (!await isMember(userId, meridianId)) {
        return { status: 403, jsonBody: { error: 'Forbidden' } }
      }

      // Position = count of existing siblings
      const posResult = await query(
        `SELECT COUNT(*) AS cnt FROM work_items
         WHERE parent_id ${parentId ? '= @parentId' : 'IS NULL'}
           AND type = @type AND is_active = 1`,
        [
          { name: 'type',     type: sql.VarChar, value: type     },
          ...(parentId ? [{ name: 'parentId', type: sql.Int, value: parentId }] : []),
        ]
      )
      const position = posResult.recordset[0].cnt

      const result = await query(
        `INSERT INTO work_items
           (meridian_id, parent_id, type, title, status_id, created_by, position)
         OUTPUT
           INSERTED.id, INSERTED.meridian_id, INSERTED.parent_id, INSERTED.type,
           INSERTED.title, INSERTED.description, INSERTED.status_id,
           INSERTED.assignee_id, INSERTED.sprint_id, INSERTED.position
         VALUES
           (@meridianId, @parentId, @type, @title, @statusId, @userId, @position)`,
        [
          { name: 'meridianId', type: sql.Int,      value: meridianId        },
          { name: 'parentId',   type: sql.Int,      value: parentId ?? null  },
          { name: 'type',       type: sql.VarChar,  value: type              },
          { name: 'title',      type: sql.NVarChar, value: title.trim()      },
          { name: 'statusId',   type: sql.Int,      value: statusId ?? null  },
          { name: 'userId',     type: sql.Int,      value: userId            },
          { name: 'position',   type: sql.Int,      value: position          },
        ]
      )

      const row = result.recordset[0]
      return {
        status:   201,
        jsonBody: {
          id:          row.id,
          meridianId:  row.meridian_id,
          parentId:    row.parent_id,
          type:        row.type,
          title:       row.title,
          description: row.description,
          statusId:    row.status_id,
          assigneeId:  row.assignee_id,
          sprintId:    row.sprint_id,
          position:    row.position,
        },
      }

    } catch (err) {
      context.error('POST /api/items failed:', err)
      return { status: 500, jsonBody: { error: 'Internal server error' } }
    }
  },
})

// ── PATCH /api/items/:id ───────────────────────────────────────────────────────

app.http('itemsUpdate', {
  methods:   ['PATCH'],
  authLevel: 'anonymous',
  route:     'items/{id}',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    const itemId = parseInt(request.params.id, 10)
    if (!itemId) return { status: 400, jsonBody: { error: 'Invalid id' } }

    let body
    try { body = await request.json() } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON' } }
    }

    const { field, value } = body
    if (!VALID_FIELDS.includes(field)) {
      return { status: 400, jsonBody: { error: `Field '${field}' is not updatable` } }
    }

    try {
      const userId = await resolveUser(caller)

      // Fetch the item to verify access and get current state
      const itemResult = await query(
        `SELECT id, meridian_id, parent_id, type FROM work_items WHERE id = @id AND is_active = 1`,
        [{ name: 'id', type: sql.Int, value: itemId }]
      )
      if (itemResult.recordset.length === 0) {
        return { status: 404, jsonBody: { error: 'Item not found' } }
      }

      const item = itemResult.recordset[0]
      if (!await isMember(userId, item.meridian_id)) {
        return { status: 403, jsonBody: { error: 'Forbidden' } }
      }

      // ── parentId change: cascade meridianId up then down ───────────────────
      if (field === 'parentId') {
        let newMeridianId = item.meridian_id

        if (value !== null) {
          // Walk UP the new parent's chain to find the Arc's meridianId
          const ancestryResult = await query(
            `;WITH ancestry AS (
               SELECT id, meridian_id, parent_id, type FROM work_items WHERE id = @newParentId
               UNION ALL
               SELECT wi.id, wi.meridian_id, wi.parent_id, wi.type
               FROM   work_items wi INNER JOIN ancestry a ON wi.id = a.parent_id
             )
             SELECT TOP 1 meridian_id FROM ancestry WHERE type = 'arc'`,
            [{ name: 'newParentId', type: sql.Int, value: value }]
          )
          if (ancestryResult.recordset.length > 0) {
            newMeridianId = ancestryResult.recordset[0].meridian_id
          }
        }

        // Cascade meridianId DOWN to all descendants (recursive CTE)
        await query(
          `;WITH descendants AS (
             SELECT id FROM work_items WHERE id = @itemId
             UNION ALL
             SELECT wi.id FROM work_items wi
             INNER JOIN descendants d ON wi.parent_id = d.id
             WHERE wi.is_active = 1
           )
           UPDATE work_items
           SET meridian_id = @newMeridianId, updated_at = GETUTCDATE()
           WHERE id IN (SELECT id FROM descendants)`,
          [
            { name: 'itemId',       type: sql.Int, value: itemId       },
            { name: 'newMeridianId', type: sql.Int, value: newMeridianId },
          ]
        )

        // Update the item's parent
        await query(
          `UPDATE work_items SET parent_id = @newParentId, updated_at = GETUTCDATE() WHERE id = @itemId`,
          [
            { name: 'newParentId', type: sql.Int, value: value   },
            { name: 'itemId',      type: sql.Int, value: itemId  },
          ]
        )

        return { status: 200, jsonBody: { ok: true } }
      }

      // ── meridianId change: cascade DOWN to all descendants ─────────────────
      if (field === 'meridianId') {
        if (!await isMember(userId, value)) {
          return { status: 403, jsonBody: { error: 'No access to target meridian' } }
        }

        await query(
          `;WITH descendants AS (
             SELECT id FROM work_items WHERE id = @itemId
             UNION ALL
             SELECT wi.id FROM work_items wi
             INNER JOIN descendants d ON wi.parent_id = d.id
             WHERE wi.is_active = 1
           )
           UPDATE work_items
           SET meridian_id = @newMeridianId, updated_at = GETUTCDATE()
           WHERE id IN (SELECT id FROM descendants)`,
          [
            { name: 'itemId',        type: sql.Int, value: itemId },
            { name: 'newMeridianId', type: sql.Int, value: value  },
          ]
        )
        return { status: 200, jsonBody: { ok: true } }
      }

      // ── Simple field update ────────────────────────────────────────────────
      // Map camelCase field names to snake_case column names
      const COLUMN = {
        title:       'title',
        description: 'description',
        statusId:    'status_id',
        assigneeId:  'assignee_id',
        sprintId:    'sprint_id',
      }
      const TYPE = {
        title:       sql.NVarChar,
        description: sql.NVarChar,
        statusId:    sql.Int,
        assigneeId:  sql.Int,
        sprintId:    sql.Int,
      }

      await query(
        `UPDATE work_items
         SET ${COLUMN[field]} = @value, updated_at = GETUTCDATE()
         WHERE id = @itemId`,
        [
          { name: 'value',  type: TYPE[field], value: value  },
          { name: 'itemId', type: sql.Int,     value: itemId },
        ]
      )

      // Log status and assignee changes to activity_log
      if (field === 'statusId' || field === 'assigneeId') {
        const actionMap = { statusId: 'status_changed', assigneeId: 'assigned' }
        await query(
          `INSERT INTO activity_log (work_item_id, meridian_id, user_id, action, new_value)
           VALUES (@itemId, @meridianId, @userId, @action, @newVal)`,
          [
            { name: 'itemId',     type: sql.Int,      value: itemId                },
            { name: 'meridianId', type: sql.Int,      value: item.meridian_id      },
            { name: 'userId',     type: sql.Int,      value: userId                },
            { name: 'action',     type: sql.VarChar,  value: actionMap[field]      },
            { name: 'newVal',     type: sql.NVarChar, value: String(value ?? '')   },
          ]
        )
      }

      return { status: 200, jsonBody: { ok: true } }

    } catch (err) {
      context.error(`PATCH /api/items/${itemId} failed:`, err)
      return { status: 500, jsonBody: { error: 'Internal server error' } }
    }
  },
})

// ── DELETE /api/items/:id ──────────────────────────────────────────────────────

app.http('itemsDelete', {
  methods:   ['DELETE'],
  authLevel: 'anonymous',
  route:     'items/{id}',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    const itemId = parseInt(request.params.id, 10)
    if (!itemId) return { status: 400, jsonBody: { error: 'Invalid id' } }

    try {
      const userId = await resolveUser(caller)

      const itemResult = await query(
        `SELECT meridian_id FROM work_items WHERE id = @id AND is_active = 1`,
        [{ name: 'id', type: sql.Int, value: itemId }]
      )
      if (itemResult.recordset.length === 0) {
        return { status: 404, jsonBody: { error: 'Item not found' } }
      }

      const meridianId = itemResult.recordset[0].meridian_id
      if (!await isMember(userId, meridianId)) {
        return { status: 403, jsonBody: { error: 'Forbidden' } }
      }

      // Soft-delete the item and all descendants in one recursive CTE
      await query(
        `;WITH descendants AS (
           SELECT id FROM work_items WHERE id = @itemId
           UNION ALL
           SELECT wi.id FROM work_items wi
           INNER JOIN descendants d ON wi.parent_id = d.id
           WHERE wi.is_active = 1
         )
         UPDATE work_items
         SET is_active = 0, updated_at = GETUTCDATE()
         WHERE id IN (SELECT id FROM descendants)`,
        [{ name: 'itemId', type: sql.Int, value: itemId }]
      )

      return { status: 200, jsonBody: { ok: true } }

    } catch (err) {
      context.error(`DELETE /api/items/${itemId} failed:`, err)
      return { status: 500, jsonBody: { error: 'Internal server error' } }
    }
  },
})
