import { useAuth } from './auth/AuthContext'
import Board from './components/board/Board'
import { IconSextant } from './components/icons'

export default function App() {
  const { isAuthenticated, isLoading, login, loginGoogle } = useAuth()

  if (isLoading) return <LoadingScreen />
  if (!isAuthenticated) return <LoginScreen onLoginMicrosoft={login} onLoginGoogle={loginGoogle} />
  return <Board />
}

function LoginScreen({ onLoginMicrosoft, onLoginGoogle }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-8">
        <div className="flex items-center gap-3">
          <IconSextant size={40} className="text-meridian-600" />
          <span className="text-2xl font-semibold tracking-tight text-gray-900">
            Meridian
          </span>
        </div>
        <p className="text-gray-500 text-sm text-center max-w-xs">
          Lean sprint tracking for focused teams.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-[220px]">
          <button
            onClick={onLoginGoogle}
            className="flex items-center justify-center gap-2.5 px-6 py-2.5 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium rounded-md transition-colors shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
          <button
            onClick={onLoginMicrosoft}
            className="flex items-center justify-center gap-2.5 px-6 py-2.5 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium rounded-md transition-colors shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
              <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
              <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
            Sign in with Microsoft
          </button>
        </div>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <IconSextant size={28} className="text-meridian-600 animate-pulse" />
    </div>
  )
}
