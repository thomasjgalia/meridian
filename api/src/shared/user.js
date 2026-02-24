const { query, sql } = require('./db')

/**
 * Upserts the authenticated user into the users table on every request.
 * Returns the user's internal integer ID.
 *
 * Uses MERGE so first-login creates the row; subsequent logins update
 * last_login and sync the email from the token.
 *
 * Works for all OAuth providers (Google, AAD). Google users will have
 * tenant_id = NULL and identity_provider = 'google'.
 */
async function resolveUser(caller) {
  const result = await query(
    `MERGE users AS target
     USING (VALUES (@externalId, @tenantId, @identityProvider, @email, @name))
       AS source(external_id, tenant_id, identity_provider, email, display_name)
     ON target.external_id = source.external_id
     WHEN MATCHED THEN
       UPDATE SET
         last_login = GETUTCDATE(),
         email      = source.email
         -- display_name is intentionally not updated on login so users can customise it
     WHEN NOT MATCHED THEN
       INSERT (external_id, tenant_id, identity_provider, email, display_name, created_at, last_login, is_active)
       VALUES (source.external_id, source.tenant_id, source.identity_provider, source.email, source.display_name,
               GETUTCDATE(), GETUTCDATE(), 1)
     OUTPUT INSERTED.id;`,
    [
      { name: 'externalId',       type: sql.NVarChar, value: caller.externalId            },
      { name: 'tenantId',         type: sql.NVarChar, value: caller.tenantId ?? null       },
      { name: 'identityProvider', type: sql.NVarChar, value: caller.identityProvider ?? null },
      { name: 'email',            type: sql.NVarChar, value: caller.email                  },
      { name: 'name',             type: sql.NVarChar, value: caller.name                   },
    ]
  )

  return result.recordset[0].id
}

module.exports = { resolveUser }
