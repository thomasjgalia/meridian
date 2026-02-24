/**
 * Auth helper for Azure Functions v4 + Azure Static Web Apps.
 *
 * SWA validates OAuth tokens at the platform edge for routes marked
 * allowedRoles: ["authenticated"] in staticwebapp.config.json.
 * Validated claims are forwarded to the function in the
 * x-ms-client-principal header (Base64-encoded JSON).
 *
 * Supports multiple identity providers: 'google' and 'aad' (Microsoft).
 *
 * In local development (func start, no SWA emulator) the header is absent.
 * Set DEV_AUTH_BYPASS=true in local.settings.json to use a synthetic dev caller
 * instead of getting 401 on every request.
 */

const DEV_CALLER = {
  externalId:       'dev-local-00000000-0000-0000-0000-000000000000',
  identityProvider: 'dev',
  tenantId:         null,
  email:            'dev@meridian.local',
  name:             'Dev User',
}

/**
 * Returns { externalId, identityProvider, tenantId, email, name } from the
 * SWA client-principal header, DEV_CALLER if DEV_AUTH_BYPASS=true, or null.
 *
 * externalId is the provider's unique user ID:
 *   - Google: the 'sub' claim (via principal.userId)
 *   - AAD:    the objectidentifier claim
 *
 * tenantId is null for Google users (Google has no tenant concept).
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
      externalId:       claim('http://schemas.microsoft.com/identity/claims/objectidentifier') ?? claim('oid') ?? principal.userId,
      identityProvider: principal.identityProvider ?? null,
      tenantId:         claim('http://schemas.microsoft.com/identity/claims/tenantid') ?? claim('tid') ?? null,
      email:            claim('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress') ?? claim('preferred_username') ?? principal.userDetails,
      name:             claim('name') ?? principal.userDetails,
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
  if (!caller?.externalId) {
    return { response: { status: 401, jsonBody: { error: 'Unauthorized' } } }
  }
  return { caller }
}

module.exports = { getCaller, requireAuth }
