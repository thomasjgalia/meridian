import { createContext, useContext, useState, useEffect } from 'react'

/**
 * AuthContext — single interface for auth state throughout the app.
 *
 * In dev mode (VITE_DEV_AUTH=true) a hardcoded mock user is returned
 * immediately — no Entra registration required.
 *
 * In production, SWA built-in auth handles the Entra login flow.
 * The frontend reads the current user from /.auth/me and redirects
 * to /.auth/login/aad for login. SWA injects x-ms-client-principal
 * on all API requests automatically — no bearer token management needed.
 */

const AuthContext = createContext(null)

// ─── Dev mock ────────────────────────────────────────────────────────────────

const DEV_USER = {
  id:          0,
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
    getToken:        async () => 'dev-token',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── SWA built-in auth provider ──────────────────────────────────────────────

function SwaAuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = still loading

  useEffect(() => {
    fetch('/.auth/me')
      .then((r) => r.json())
      .then((data) => {
        const p = data.clientPrincipal
        if (!p) { setUser(null); return }
        setUser({
          id:          null,
          azureOid:    p.userId,
          tenantId:    null,
          email:       p.userDetails,
          displayName: p.userDetails,
          avatarUrl:   null,
        })
      })
      .catch(() => setUser(null))
  }, [])

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading:       user === undefined,
    login:           () => { window.location.href = '/.auth/login/aad' },
    logout:          () => { window.location.href = '/.auth/logout' },
    getToken:        async () => null, // SWA injects auth headers for API calls automatically
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const DEV_AUTH = import.meta.env.VITE_DEV_AUTH === 'true'

export function AuthProvider({ children }) {
  if (DEV_AUTH) return <DevAuthProvider>{children}</DevAuthProvider>
  return <SwaAuthProvider>{children}</SwaAuthProvider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
