import { todayKey } from './api'

export interface DayTotals {
  income: number
  spent: number
}

interface Props {
  month: string // YYYY-MM
  totals: Map<string, DayTotals> // keyed by YYYY-MM-DD
  selected: string | null
  onSelect: (day: string | null) => void
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] // weeks start on Monday

/** Short net label for a calendar cell: +50, −1.2k */
function compact(cents: number) {
  const dollars = Math.abs(cents) / 100
  const text =
    dollars >= 1000
      ? `${(dollars / 1000).toFixed(dollars >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`
      : String(Math.round(dollars))
  return (cents > 0 ? '+' : cents < 0 ? '−' : '') + text
}

export function Calendar({ month, totals, selected, onSelect }: Props) {
  const [y, m] = month.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const leadingBlanks = (new Date(y, m - 1, 1).getDay() + 6) % 7
  const today = todayKey()

  return (
    <div className="calendar">
      {WEEKDAYS.map((d, i) => (
        <span key={i} className="weekday">
          {d}
        </span>
      ))}
      {Array.from({ length: leadingBlanks }, (_, i) => (
        <span key={`blank-${i}`} />
      ))}
      {Array.from({ length: daysInMonth }, (_, i) => {
        const day = `${month}-${String(i + 1).padStart(2, '0')}`
        const t = totals.get(day)
        const net = t ? t.income - t.spent : 0
        const classes = ['cal-day']
        if (day === today) classes.push('today')
        if (day === selected) classes.push('selected')
        if (t) classes.push('has-data')
        return (
          <button
            key={day}
            type="button"
            className={classes.join(' ')}
            onClick={() => onSelect(day === selected ? null : day)}
            aria-pressed={day === selected}
            aria-label={day}
          >
            <span className="cal-num">{i + 1}</span>
            {t && (
              <span className={`cal-net ${net > 0 ? 'positive' : net < 0 ? 'negative' : ''}`}>
                {compact(net)}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
