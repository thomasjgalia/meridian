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
          className="px-6 py-2.5 bg-meridian-600 hover:bg-meridian-700 text-white text-sm font-medium rounded-md transition-colors"
        >
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
