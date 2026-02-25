const { app }         = require('@azure/functions')
const { requireAuth } = require('../shared/auth')
const { resolveUser } = require('../shared/user')
const { query, sql }  = require('../shared/db')

// ── Row → camelCase mappers ────────────────────────────────────────────────────

function mapMeridian(r) {
  return {
    id:          r.id,
    name:        r.name,
    slug:        r.slug,
    color:       r.color,
    description: r.description,
    isActive:    !!r.is_active,
    startDate:   r.start_date,
    endDate:     r.end_date,
  }
}

function mapStatus(r) {
  return {
    id:         r.id,
    meridianId: r.meridian_id,
    name:       r.name,
    color:      r.color,
    position:   r.position,
    isDefault:  r.is_default,
    isComplete: r.is_complete,
    isBlocked:  r.is_blocked,
  }
}

function mapSprint(r) {
  return {
    id:         r.id,
    name:       r.name,
    state:      r.state,
    goal:       r.goal,
    startDate:  r.start_date,
    endDate:    r.end_date,
    meridianId: r.meridian_id,
  }
}

function mapUser(r) {
  return {
    id:          r.id,
    displayName: r.display_name,
    email:       r.email,
    avatarUrl:   r.avatar_url,
  }
}

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

// ── Handler ────────────────────────────────────────────────────────────────────

/**
 * GET /api/board
 *
 * Returns everything the board needs in a single payload:
 *   { meridians, statuses, sprints, users, items }
 *
 * All data is scoped to meridians the authenticated user is a member of.
 * New users are automatically provisioned in the users table.
 */
app.http('board', {
  methods:   ['GET'],
  authLevel: 'anonymous', // SWA edge enforces auth; we re-check via requireAuth
  route:     'board',
  handler:   async (request, context) => {
    const { caller, response } = requireAuth(request)
    if (response) return response

    try {
      const userId = await resolveUser(caller)

      // All five queries JOIN through meridian_members so data is automatically
      // scoped to what this user can see. No IN clauses, no temp tables.

      const [meridians, statuses, sprints, users, items, myMemberships] = await Promise.all([

        query(
          `SELECT m.id, m.name, m.slug, m.color, m.description,
                  m.is_active, m.start_date, m.end_date
           FROM   meridians m
           JOIN   meridian_members mm ON mm.meridian_id = m.id
           WHERE  mm.user_id = @userId AND m.is_active = 1
           ORDER  BY m.name`,
          [{ name: 'userId', type: sql.Int, value: userId }]
        ),

        query(
          `SELECT s.id, s.meridian_id, s.name, s.color, s.position,
                  s.is_default, s.is_complete, s.is_blocked
           FROM   statuses s
           JOIN   meridian_members mm ON mm.meridian_id = s.meridian_id
           WHERE  mm.user_id = @userId
           ORDER  BY s.meridian_id, s.position`,
          [{ name: 'userId', type: sql.Int, value: userId }]
        ),

        // Sprints scoped to meridians the user is a member of
        query(
          `SELECT s.id, s.name, s.state, s.goal, s.start_date, s.end_date, s.meridian_id
           FROM   sprints s
           JOIN   meridian_members mm ON mm.meridian_id = s.meridian_id
           WHERE  mm.user_id = @userId
           ORDER  BY CASE s.state WHEN 'active' THEN 0 WHEN 'planning' THEN 1 ELSE 2 END,
                     s.start_date`,
          [{ name: 'userId', type: sql.Int, value: userId }]
        ),

        // Distinct users who share at least one meridian with the caller
        query(
          `SELECT DISTINCT u.id, u.display_name, u.email, u.avatar_url
           FROM   users u
           JOIN   meridian_members mm  ON mm.user_id  = u.id
           JOIN   meridian_members my  ON my.meridian_id = mm.meridian_id
           WHERE  my.user_id = @userId AND u.is_active = 1`,
          [{ name: 'userId', type: sql.Int, value: userId }]
        ),

        query(
          `SELECT wi.id, wi.meridian_id, wi.parent_id, wi.type, wi.title,
                  wi.description, wi.status_id, wi.assignee_id, wi.sprint_id,
                  wi.start_date, wi.due_date, wi.position, wi.created_at
           FROM   work_items wi
           JOIN   meridian_members mm ON mm.meridian_id = wi.meridian_id
           WHERE  mm.user_id = @userId AND wi.is_active = 1
           ORDER  BY wi.meridian_id,
                     CASE wi.type WHEN 'arc' THEN 0 WHEN 'episode' THEN 1 WHEN 'signal' THEN 2 WHEN 'relay' THEN 3 ELSE 9 END,
                     wi.parent_id,
                     COALESCE(wi.due_date, wi.created_at)`,
          [{ name: 'userId', type: sql.Int, value: userId }]
        ),

        // Caller's role per meridian
        query(
          `SELECT meridian_id, role FROM meridian_members WHERE user_id = @userId`,
          [{ name: 'userId', type: sql.Int, value: userId }]
        ),

      ])

      // Build a meridianId → role map for the caller
      const myRoles = {}
      myMemberships.recordset.forEach((r) => { myRoles[r.meridian_id] = r.role })

      return {
        status:   200,
        jsonBody: {
          myUserId:  userId,
          myRoles,
          meridians: meridians.recordset.map(mapMeridian),
          statuses:  statuses.recordset.map(mapStatus),
          sprints:   sprints.recordset.map(mapSprint),
          users:     users.recordset.map(mapUser),
          items:     items.recordset.map(mapItem),
        },
      }

    } catch (err) {
      context.error('GET /api/board failed:', err)
      return { status: 500, jsonBody: { error: 'Internal server error' } }
    }
  },
})
