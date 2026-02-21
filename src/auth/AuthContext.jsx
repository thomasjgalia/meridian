import { createContext, useContext, useState } from 'react'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import { loginRequest, apiRequest } from './msalConfig'

/**
 * AuthContext — single interface for auth state throughout the app.
 *
 * In dev mode (VITE_DEV_AUTH=true) a hardcoded mock user is returned
 * immediately — no Entra registration required.
 *
 * In production the context delegates to MSAL.
 *
 * Consumers always use:
 *   const { user, isAuthenticated, isLoading, login, logout, getToken } = useAuth()
 */

const AuthContext = createContext(null)

// ─── Dev mock ────────────────────────────────────────────────────────────────

const DEV_USER = {
  id:          0,                          // local DB id (seeded on first real login)
  azureOid:    'dev-oid-00000000',
  tenantId:    'dev-tenant-00000000',
  email:       'dev@meridian.local',
  displayName: 'Dev User',
  avatarUrl:   null,
}

function DevAuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(true)

  const value = {
    user:            isAuthenticated ? DEV_USER : null,
    isAuthenticated,
    isLoading:       false,
    login:           () => setIsAuthenticated(true),
    logout:          () => setIsAuthenticated(false),
    getToken:        async () => 'dev-token',   // API functions check DEV_AUTH on their side too
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Production MSAL provider ─────────────────────────────────────────────────

function MsalAuthProvider({ children }) {
  const { instance, accounts, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()

  async function getToken() {
    const account = accounts[0]
    if (!account) throw new Error('No active account')
    try {
      const result = await instance.acquireTokenSilent({ ...apiRequest, account })
      return result.accessToken
    } catch {
      await instance.acquireTokenRedirect({ ...apiRequest, account })
    }
  }

  // Map the active MSAL account to our user shape.
  // The full user record (with DB id) is fetched from /api/me after login.
  const account = accounts[0]
  const user = isAuthenticated && account
    ? {
        id:          null,
        azureOid:    account.idTokenClaims?.oid,
        tenantId:    account.tenantId,
        email:       account.username,
        displayName: account.name ?? account.username,
        avatarUrl:   null,
      }
    : null

  const value = {
    user,
    isAuthenticated,
    isLoading: inProgress !== InteractionStatus.None,
    login:     () => instance.loginRedirect(loginRequest),
    logout:    () => instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin }),
    getToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const DEV_AUTH = import.meta.env.VITE_DEV_AUTH === 'true'

export function AuthProvider({ children }) {
  if (DEV_AUTH) {
    return <DevAuthProvider>{children}</DevAuthProvider>
  }
  return <MsalAuthProvider>{children}</MsalAuthProvider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
