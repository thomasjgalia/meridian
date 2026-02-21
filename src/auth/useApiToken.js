import { useMsal } from '@azure/msal-react'
import { apiRequest } from './msalConfig'

/**
 * Returns an async function that acquires a bearer token silently,
 * falling back to an interactive redirect if the silent call fails.
 * Use this hook whenever you need to make an authenticated API call.
 *
 * Usage:
 *   const getToken = useApiToken()
 *   const token = await getToken()
 *   fetch('/api/work-items', { headers: { Authorization: `Bearer ${token}` } })
 */
export function useApiToken() {
  const { instance, accounts } = useMsal()

  return async function getToken() {
    const account = accounts[0]
    if (!account) throw new Error('No active account')

    try {
      const result = await instance.acquireTokenSilent({ ...apiRequest, account })
      return result.accessToken
    } catch {
      // Token expired or not cached — redirect to re-authenticate
      await instance.acquireTokenRedirect({ ...apiRequest, account })
    }
  }
}
