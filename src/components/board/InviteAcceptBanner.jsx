import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { api } from '../../api/client'

/**
 * Shown when the URL contains ?invite=<token>.
 * Fetches invite metadata, lets the user accept (or dismiss), then
 * calls onAccepted({ meridianId, role }) so the board can reload.
 */
export default function InviteAcceptBanner({ token, onAccepted, onDismiss }) {
  const [invite,   setInvite]   = useState(null)  // null = loading, false = not found
  const [loading,  setLoading]  = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error,    setError]    = useState(null)

  useEffect(() => {
    api.get(`/api/invitations/${token}`)
      .then(setInvite)
      .catch(() => setInvite(false))
      .finally(() => setLoading(false))
  }, [token])

  async function handleAccept() {
    setAccepting(true)
    setError(null)
    try {
      const result = await api.post(`/api/invitations/${token}/accept`, {})
      onAccepted(result)
    } catch (err) {
      setError(err.message)
      setAccepting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-8 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-sm mx-4 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">

        {loading && (
          <div className="px-5 py-4 text-sm text-gray-400 text-center">
            Checking invitation…
          </div>
        )}

        {!loading && invite === false && (
          <div className="flex items-start gap-3 px-5 py-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">Invitation not found</p>
              <p className="text-xs text-gray-400 mt-0.5">
                This link may have expired or already been used.
              </p>
            </div>
            <button type="button" onClick={onDismiss} className="p-1 text-gray-400 hover:text-gray-600 shrink-0">
              <X size={14} />
            </button>
          </div>
        )}

        {!loading && invite && (
          <div className="flex flex-col gap-3 px-5 py-4">
            <div className="flex items-start gap-3">
              <span
                className="w-3 h-3 rounded-full shrink-0 mt-0.5"
                style={{ backgroundColor: invite.meridianColor }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  Join {invite.meridianName}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {invite.inviterName} invited you as <span className="font-medium capitalize">{invite.role}</span>
                  {' · '}
                  Expires {new Date(invite.expiresAt).toLocaleDateString()}
                </p>
              </div>
              <button type="button" onClick={onDismiss} className="p-1 text-gray-400 hover:text-gray-600 shrink-0">
                <X size={14} />
              </button>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onDismiss}
                className="h-8 px-3 text-xs text-gray-500 border border-gray-300 rounded-md hover:border-gray-400 transition-colors"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleAccept}
                disabled={accepting}
                className="h-8 px-3.5 text-xs font-medium bg-meridian-600 text-white rounded-md hover:bg-meridian-700 disabled:opacity-40 transition-colors"
              >
                {accepting ? 'Joining…' : 'Accept'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
