import { useEffect, useState } from 'react'
import { auth, type User } from './api'
import App from './App'
import { Login } from './Login'

/** Shows the login screen until there's a session, then the app. */
export function AuthGate() {
  const [user, setUser] = useState<User | null | undefined>(undefined) // undefined = still checking

  useEffect(() => {
    auth.me().then(setUser)
    const onUnauthorized = () => setUser(null)
    window.addEventListener('unauthorized', onUnauthorized)
    return () => window.removeEventListener('unauthorized', onUnauthorized)
  }, [])

  if (user === undefined) return <p className="empty">Loading…</p>
  if (!user) return <Login onLoggedIn={setUser} />
  // Keyed by email so switching accounts never shows the previous user's data.
  return <App key={user.email} user={user} onLoggedOut={() => setUser(null)} />
}
