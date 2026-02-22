const { query, sql } = require('./db')

/**
 * Upserts the authenticated user into the users table on every request.
 * Returns the user's internal integer ID.
 *
 * Uses MERGE so first-login creates the row; subsequent logins update
 * last_login and sync the display name / email from the token.
 */
async function resolveUser(caller) {
  const result = await query(
    `MERGE users AS target
     USING (VALUES (@oid, @tenantId, @email, @name))
       AS source(azure_oid, tenant_id, email, display_name)
     ON target.azure_oid = source.azure_oid
     WHEN MATCHED THEN
       UPDATE SET
         last_login   = GETUTCDATE(),
         email        = source.email,
         display_name = source.display_name
     WHEN NOT MATCHED THEN
       INSERT (azure_oid, tenant_id, email, display_name, created_at, last_login, is_active)
       VALUES (source.azure_oid, source.tenant_id, source.email, source.display_name,
               GETUTCDATE(), GETUTCDATE(), 1)
     OUTPUT INSERTED.id;`,
    [
      { name: 'oid',      type: sql.NVarChar, value: caller.oid      },
      { name: 'tenantId', type: sql.NVarChar, value: caller.tenantId ?? null },
      { name: 'email',    type: sql.NVarChar, value: caller.email     },
      { name: 'name',     type: sql.NVarChar, value: caller.name      },
    ]
  )

  return result.recordset[0].id
}

module.exports = { resolveUser }
