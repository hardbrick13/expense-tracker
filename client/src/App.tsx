import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  api,
  categoryMeta,
  dayKey,
  entryType,
  formatDay,
  formatMoney,
  formatMonth,
  formatSigned,
  shiftMonth,
  todayKey,
  type Category,
  type Expense,
  type ExpenseInput,
  type User,
} from './api'
import { Calendar, type DayTotals } from './Calendar'
import { ExpenseSheet } from './ExpenseSheet'
import { AccountSheet } from './AccountSheet'
import { Logo } from './Logo'
import './App.css'

type SheetState = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; expense: Expense }

/** Signed amount: income counts positive, expenses negative. */
const signed = (e: Expense) => (entryType(e) === 'income' ? e.amountCents : -e.amountCents)

interface Props {
  user: User
  onLoggedOut: () => void
}

function App({ user, onLoggedOut }: Props) {
  const [accountOpen, setAccountOpen] = useState(false)
  const [entries, setEntries] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [month, setMonth] = useState(() => todayKey().slice(0, 7))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(() => {
    try {
      return localStorage.getItem('calendarOpen') !== 'false'
    } catch {
      return true
    }
  })

  function toggleCalendar() {
    const next = !calendarOpen
    setCalendarOpen(next)
    try {
      localStorage.setItem('calendarOpen', String(next))
    } catch {
      // storage unavailable (e.g. private mode) — just don't remember it
    }
  }

  function changeMonth(delta: number) {
    setMonth(shiftMonth(month, delta))
    setSelectedDay(null)
  }
  const [sheet, setSheet] = useState<SheetState>({ mode: 'closed' })

  const load = useCallback(
    () =>
      api.list().then(
        (list) => {
          setEntries(list)
          setError(null)
          setLoading(false)
        },
        (e: unknown) => {
          setError(e instanceof Error ? e.message : 'Could not load data')
          setLoading(false)
        },
      ),
    [],
  )

  useEffect(() => {
    load()
  }, [load])

  const monthEntries = useMemo(
    () => entries.filter((e) => dayKey(e.date).startsWith(month)),
    [entries, month],
  )

  const { income, spent } = useMemo(() => {
    let income = 0
    let spent = 0
    for (const e of monthEntries) {
      if (entryType(e) === 'income') income += e.amountCents
      else spent += e.amountCents
    }
    return { income, spent }
  }, [monthEntries])
  const net = income - spent

  const spendingByCategory = useMemo(() => {
    const totals = new Map<Category, number>()
    for (const e of monthEntries) {
      if (entryType(e) !== 'expense') continue
      totals.set(e.category, (totals.get(e.category) ?? 0) + e.amountCents)
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1])
  }, [monthEntries])

  const dayTotals = useMemo(() => {
    const totals = new Map<string, DayTotals>()
    for (const e of monthEntries) {
      const k = dayKey(e.date)
      const t = totals.get(k) ?? { income: 0, spent: 0 }
      if (entryType(e) === 'income') t.income += e.amountCents
      else t.spent += e.amountCents
      totals.set(k, t)
    }
    return totals
  }, [monthEntries])

  const byDay = useMemo(() => {
    const groups = new Map<string, Expense[]>()
    for (const e of monthEntries) {
      const k = dayKey(e.date)
      groups.set(k, [...(groups.get(k) ?? []), e])
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [monthEntries])

  // const selectedItems = selectedDay ? (byDay.find(([d]) => d === selectedDay)?.[1] ?? []) : []

  function renderRows(items: Expense[]) {
    return (
      <ul>
        {items.map((e) => {
          const type = entryType(e)
          const meta = categoryMeta(type, e.category)
          return (
            <li key={e._id}>
              <button className="row" onClick={() => setSheet({ mode: 'edit', expense: e })}>
                <span className="badge" style={{ background: meta.color + '22' }}>
                  {meta.emoji}
                </span>
                <span className="row-text">
                  <span>{e.description || meta.label}</span>
                  {e.description && <small>{meta.label}</small>}
                </span>
                <span className={type === 'income' ? 'amount positive' : 'amount'}>
                  {formatSigned(signed(e))}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    )
  }

  async function save(data: ExpenseInput) {
    if (sheet.mode === 'edit') await api.update(sheet.expense._id, data)
    else await api.create(data)
    setMonth(data.date.slice(0, 7))
    if (selectedDay) setSelectedDay(data.date)
    setSheet({ mode: 'closed' })
    await load()
  }

  async function remove() {
    if (sheet.mode !== 'edit') return
    await api.remove(sheet.expense._id)
    setSheet({ mode: 'closed' })
    await load()
  }

  const netTone = net > 0 ? 'positive' : net < 0 ? 'negative' : ''
  let netNote = 'Nothing recorded yet'
  if (net < 0) netNote = `You spent ${formatMoney(-net)} more than you earned`
  else if (income > 0) netNote = `You kept ${Math.round((net / income) * 100)}% of your income`

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <Logo />
          Expenses
        </div>
        <button
          type="button"
          className="account-btn"
          onClick={() => setAccountOpen(true)}
          aria-label={`Account (${user.email})`}
          title={user.email}
        >
          <span>{user.email[0].toUpperCase()}</span>
        </button>
      </div>

      <section className={`card top-card calendar-card${calendarOpen ? ' open' : ''}`}>
        <div className="month-nav">
          <button className="icon-btn" onClick={() => changeMonth(-1)} aria-label="Previous month">
            ‹
          </button>
          <button
            type="button"
            className="month-toggle"
            onClick={toggleCalendar}
            aria-expanded={calendarOpen}
            aria-controls="calendar-grid"
            aria-label={`${formatMonth(month)}, ${calendarOpen ? 'hide' : 'show'} calendar`}
          >
            <h1>{formatMonth(month)}</h1>
            <svg className="chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                d="M4 6l4 4 4-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button className="icon-btn" onClick={() => changeMonth(1)} aria-label="Next month">
            ›
          </button>
        </div>
        {calendarOpen && (
          <div id="calendar-grid">
            <Calendar month={month} totals={dayTotals} selected={selectedDay} onSelect={setSelectedDay} />
          </div>
        )}
      </section>

      <header className="summary">
        <p className="label">
          {formatMonth(month).split(' ')[0]} · {net < 0 ? 'Net loss' : 'Net profit'}
        </p>
        <p className={`total ${netTone}`}>{formatSigned(net)}</p>
        <p className="muted">{netNote}</p>

        <div className="tiles">
          <div className="tile">
            <span className="tile-label">
              <span className="arrow positive">↓</span> Income
            </span>
            <strong className="positive">{formatMoney(income)}</strong>
          </div>
          <div className="tile">
            <span className="tile-label">
              <span className="arrow negative">↑</span> Expenses
            </span>
            <strong className="negative">{formatMoney(spent)}</strong>
          </div>
        </div>

        {spendingByCategory.length > 0 && (
          <>
            <p className="section-label">Spending by category</p>
            <div className="bar" aria-hidden="true">
              {spendingByCategory.map(([c, cents]) => (
                <span key={c} style={{ flexGrow: cents, background: categoryMeta('expense', c).color }} />
              ))}
            </div>
            <ul className="legend">
              {spendingByCategory.map(([c, cents]) => (
                <li key={c}>
                  <span className="dot" style={{ background: categoryMeta('expense', c).color }} />
                  {categoryMeta('expense', c).label}
                  <strong>{formatMoney(cents)}</strong>
                </li>
              ))}
            </ul>
          </>
        )}
      </header>

      <main>
        {loading && <p className="empty">Loading…</p>}
        {error && (
          <div className="empty">
            <p className="error">{error}</p>
            <button className="link strong" onClick={load}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <section className="history">
            <h2 className="history-title">
              <span>{formatMonth(month).split(' ')[0]} history</span>
              <span className="muted">
                {monthEntries.length} {monthEntries.length === 1 ? 'entry' : 'entries'} · {formatSigned(net)}
              </span>
            </h2>

            {byDay.length === 0 && (
              <p className="empty">Nothing recorded this month. Tap + to add income or an expense.</p>
            )}

            {byDay.map(([day, items]) => (
              <section key={day} className={day === selectedDay ? 'day is-selected' : 'day'}>
                <h3>
                  <span>{formatDay(day)}</span>
                  <span>{formatSigned(items.reduce((sum, e) => sum + signed(e), 0))}</span>
                </h3>
                {renderRows(items)}
              </section>
            ))}
          </section>
        )}
      </main>

      <button className="fab" onClick={() => setSheet({ mode: 'new' })} aria-label="Add income or expense">
        +
      </button>

      {sheet.mode !== 'closed' && (
        <ExpenseSheet
          key={sheet.mode === 'edit' ? sheet.expense._id : 'new'}
          expense={sheet.mode === 'edit' ? sheet.expense : null}
          defaultType="expense"
          defaultDate={selectedDay ?? undefined}
          onSave={save}
          onDelete={remove}
          onClose={() => setSheet({ mode: 'closed' })}
        />
      )}

      {accountOpen && (
        <AccountSheet
          user={user}
          entryCount={entries.length}
          onLoggedOut={onLoggedOut}
          onClose={() => setAccountOpen(false)}
        />
      )}
    </div>
  )
}

export default App
