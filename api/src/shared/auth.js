/**
 * Auth helper for Azure Functions v4 + Azure Static Web Apps.
 *
 * SWA validates the Entra ID bearer token at the platform edge for routes
 * marked allowedRoles: ["authenticated"] in staticwebapp.config.json.
 * Validated claims are forwarded to the function in the
 * x-ms-client-principal header (Base64-encoded JSON).
 *
 * In local development (func start, no SWA emulator) the header is absent.
 * Set DEV_AUTH_BYPASS=true in local.settings.json to use a synthetic dev caller
 * instead of getting 401 on every request.
 */

const DEV_CALLER = {
  oid:      'dev-local-00000000-0000-0000-0000-000000000000',
  tenantId: 'dev-tenant',
  email:    'dev@meridian.local',
  name:     'Dev User',
}

/**
 * Returns { oid, tenantId, email, name } from the SWA client-principal header,
 * the DEV_CALLER if DEV_AUTH_BYPASS=true, or null if neither applies.
 */
function getCaller(request) {
  if (process.env.DEV_AUTH_BYPASS === 'true') return DEV_CALLER

  const header = request.headers?.get?.('x-ms-client-principal')
                 ?? request.headers?.['x-ms-client-principal']
  if (!header) return null

  try {
    const decoded   = Buffer.from(header, 'base64').toString('utf8')
    const principal = JSON.parse(decoded)
    const claim     = (typ) => principal.claims?.find((c) => c.typ === typ)?.val

    return {
      oid:      claim('http://schemas.microsoft.com/identity/claims/objectidentifier') ?? claim('oid') ?? principal.userId,
      tenantId: claim('http://schemas.microsoft.com/identity/claims/tenantid') ?? claim('tid'),
      email:    claim('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress') ?? claim('preferred_username') ?? principal.userDetails,
      name:     claim('name') ?? principal.userDetails,
    }
  } catch {
    return null
  }
}

/**
 * Call at the top of any handler that requires authentication.
 * Returns { caller } on success or { response } (401) if not authenticated.
 *
 * Usage:
 *   const { caller, response } = requireAuth(request)
 *   if (response) return response
 */
function requireAuth(request) {
  const caller = getCaller(request)
  if (!caller?.oid) {
    return { response: { status: 401, jsonBody: { error: 'Unauthorized' } } }
  }
  return { caller }
}

module.exports = { getCaller, requireAuth }
