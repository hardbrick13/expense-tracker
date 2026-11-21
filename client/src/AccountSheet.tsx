import { useState } from 'react'
import { auth, type User } from './api'

interface Props {
  user: User
  entryCount: number
  onLoggedOut: () => void
  onClose: () => void
}

export function AccountSheet({ user, entryCount, onLoggedOut, onClose }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      onLoggedOut()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setBusy(false)
    }
  }

  const matches = typed.trim().toLowerCase() === user.email
  const entries = `${entryCount} saved ${entryCount === 1 ? 'entry' : 'entries'}`

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Account" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <span />
          <h2>Account</h2>
          <button type="button" className="link strong" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="field">
          <span>Email</span>
          <span className="account-email">{user.email}</span>
        </div>

        {!confirming ? (
          <>
            <button type="button" className="primary" onClick={() => run(auth.logout)} disabled={busy}>
              Log out
            </button>
            <button type="button" className="danger" onClick={() => setConfirming(true)} disabled={busy}>
              Delete account
            </button>
          </>
        ) : (
          <div className="delete-warning" role="alert">
            <h3>⚠️ Delete your account?</h3>
            <p>
              This permanently deletes your account and <strong>all {entries}</strong> (every income and
              expense you’ve recorded). <strong>Your saved data will be lost and can’t be recovered.</strong>
            </p>
            <p>
              Type <strong>{user.email}</strong> to confirm.
            </p>
            <label className="field">
              <input
                type="email"
                autoCapitalize="off"
                autoComplete="off"
                placeholder={user.email}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                aria-label="Type your email to confirm"
                autoFocus
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button
              type="button"
              className="danger solid"
              disabled={!matches || busy}
              onClick={() => run(() => auth.deleteAccount(user.email))}
            >
              {busy ? 'Deleting…' : 'Permanently delete account'}
            </button>
            <button
              type="button"
              className="link"
              onClick={() => {
                setConfirming(false)
                setTyped('')
                setError(null)
              }}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        )}
        {!confirming && error && <p className="error">{error}</p>}
      </div>
    </div>
  )
}
