import { PublicClientApplication, LogLevel } from '@azure/msal-browser'

/**
 * MSAL configuration.
 * Values are injected via environment variables — never hardcode tenant/client IDs.
 * Set VITE_ENTRA_CLIENT_ID and VITE_ENTRA_TENANT_ID in your .env file.
 */
const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_ENTRA_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_ENTRA_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_REDIRECT_URI ?? window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return
        if (import.meta.env.DEV) {
          switch (level) {
            case LogLevel.Error:   console.error(message); break
            case LogLevel.Warning: console.warn(message);  break
            case LogLevel.Info:    console.info(message);  break
            case LogLevel.Verbose: console.debug(message); break
          }
        }
      },
    },
  },
}

export const loginRequest = {
  scopes: [
    'openid',
    'profile',
    'email',
    // Add your API scope here once the app registration is configured:
    // `api://${import.meta.env.VITE_ENTRA_CLIENT_ID}/access_as_user`,
  ],
}

export const apiRequest = {
  scopes: [
    `api://${import.meta.env.VITE_ENTRA_CLIENT_ID}/access_as_user`,
  ],
}

export const msalInstance = new PublicClientApplication(msalConfig)
