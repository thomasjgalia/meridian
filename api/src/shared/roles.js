const { query, sql } = require('./db')

/**
 * Returns the caller's role in a meridian, or null if not a member.
 * @returns {Promise<'owner' | 'member' | 'viewer' | null>}
 */
async function getMemberRole(userId, meridianId) {
  const r = await query(
    `SELECT role FROM meridian_members WHERE user_id = @userId AND meridian_id = @meridianId`,
    [
      { name: 'userId',     type: sql.Int, value: userId     },
      { name: 'meridianId', type: sql.Int, value: meridianId },
    ]
  )
  return r.recordset.length > 0 ? r.recordset[0].role : null
}

/** Can this role create/edit/delete items and sprints? */
function canWrite(role) {
  return role === 'owner' || role === 'member'
}

/** Can this role manage meridian settings, statuses, and members? */
function canManage(role) {
  return role === 'owner'
}

module.exports = { getMemberRole, canWrite, canManage }
