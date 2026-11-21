import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiError, auth, type User } from './api'
import { Logo } from './Logo'

interface Props {
  onLoggedIn: (user: User) => void
}

/**
 * A countdown to a deadline. `start(seconds)` begins it; the value is re-derived from the
 * deadline on every tick rather than decremented, so it stays accurate even when the browser
 * throttles timers (background tab, phone screen locked).
 */
function useCountdown() {
  const [deadline, setDeadline] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (deadline === null) return
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= deadline) clearInterval(id)
    }, 250)
    return () => clearInterval(id)
  }, [deadline])

  const start = useCallback((seconds: number) => {
    const t = Date.now()
    setNow(t)
    setDeadline(t + seconds * 1000)
  }, [])

  const secondsLeft = deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000))
  return [secondsLeft, start] as const
}

const formatCountdown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function Login({ onLoggedIn }: Props) {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  // Seconds until the server will accept another "send code" request.
  const [resendIn, startResendCountdown] = useCountdown()

  /** The server says how many seconds remain; count down from exactly that. */
  const startCooldown = (seconds: unknown) => {
    if (typeof seconds === 'number' && seconds > 0) startResendCountdown(seconds)
  }

  async function sendCode(e?: FormEvent) {
    e?.preventDefault()
    const address = email.trim()
    setBusy(true)
    setError(null)
    try {
      const { resendInSeconds } = await auth.requestCode(address)
      startCooldown(resendInSeconds)
      setCode('')
      setStep('code')
      setNotice(`We sent a 6-digit code to ${address}.`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        // A code was sent recently: let them enter it, and show when they can ask again.
        startCooldown(err.body?.resendInSeconds)
        setStep('code')
        setNotice(`We already sent a code to ${address}.`)
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    } finally {
      setBusy(false)
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onLoggedIn(await auth.verifyCode(email.trim(), code))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setBusy(false)
    }
  }

  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim())

  return (
    <div className="app auth">
      <div className="auth-card">
        <Logo className="auth-logo" />
        <h1>Expense Tracker</h1>

        {step === 'email' ? (
          <form onSubmit={sendCode}>
            <p className="muted">Enter your email to log in or create an account. We’ll email you a code.</p>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="off"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="primary" disabled={!emailValid || busy}>
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <p className="muted">{notice} It expires in 10 minutes.</p>
            <label className="field">
              <span>Code</span>
              <input
                className="code-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="primary" disabled={code.length !== 6 || busy}>
              {busy ? 'Checking…' : 'Verify'}
            </button>
            <div className="auth-links">
              <span className="resend">
                <button type="button" className="link" onClick={() => sendCode()} disabled={busy || resendIn > 0}>
                  Resend code
                </button>
                {resendIn > 0 && (
                  <span className="resend-timer" aria-live="off">
                    in {formatCountdown(resendIn)}
                  </span>
                )}
              </span>
              <button
                type="button"
                className="link"
                onClick={() => {
                  setStep('email')
                  setError(null)
                }}
                disabled={busy}
              >
                Use a different email
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
