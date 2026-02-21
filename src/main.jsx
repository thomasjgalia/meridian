import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MsalProvider } from '@azure/msal-react'
import { msalInstance } from './auth/msalConfig'
import { AuthProvider, DEV_AUTH } from './auth/AuthContext'
import App from './App'
import './index.css'

// In dev mode (VITE_DEV_AUTH=true) we skip MsalProvider entirely —
// no Entra app registration is required. AuthProvider handles the mock.
function Root() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {DEV_AUTH ? (
      <Root />
    ) : (
      <MsalProvider instance={msalInstance}>
        <Root />
      </MsalProvider>
    )}
  </StrictMode>
)
