import { useAuth } from './auth/AuthContext'
import Board from './components/board/Board'
import { IconSextant } from './components/icons'

export default function App() {
  const { isAuthenticated, isLoading, login } = useAuth()

  if (isLoading) return <LoadingScreen />
  if (!isAuthenticated) return <LoginScreen onLogin={login} />
  return <Board />
}

function LoginScreen({ onLogin }) {
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
        <button
          onClick={onLogin}
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
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <IconSextant size={28} className="text-meridian-600 animate-pulse" />
    </div>
  )
}
