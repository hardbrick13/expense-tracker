import { useState, type FormEvent } from 'react'
import {
  CATEGORIES_BY_TYPE,
  categoryMeta,
  dayKey,
  entryType,
  todayKey,
  type Category,
  type EntryType,
  type Expense,
  type ExpenseInput,
} from './api'

interface Props {
  expense: Expense | null // null = creating a new one
  defaultType: EntryType
  defaultDate?: string // YYYY-MM-DD; today if omitted
  onSave: (data: ExpenseInput) => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
}

export function ExpenseSheet({ expense, defaultType, defaultDate, onSave, onDelete, onClose }: Props) {
  const [amount, setAmount] = useState(expense ? (expense.amountCents / 100).toFixed(2) : '')
  const [type, setType] = useState<EntryType>(expense ? entryType(expense) : defaultType)
  const [category, setCategory] = useState<Category>(
    expense?.category ?? CATEGORIES_BY_TYPE[defaultType][0],
  )
  const categories = CATEGORIES_BY_TYPE[type]

  function changeType(next: EntryType) {
    setType(next)
    if (!CATEGORIES_BY_TYPE[next].includes(category)) setCategory(CATEGORIES_BY_TYPE[next][0])
  }
  const [description, setDescription] = useState(expense?.description ?? '')
  const [date, setDate] = useState(expense ? dayKey(expense.date) : (defaultDate ?? todayKey()))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amountCents = Math.round(parseFloat(amount.replace(',', '.')) * 100)
  const valid = Number.isFinite(amountCents) && amountCents > 0 && date !== ''

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setBusy(false)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    run(() =>
      onSave({ type, amountCents, category, date, description: description.trim() || undefined }),
    )
  }

  function remove() {
    if (confirm(`Delete this ${type}?`)) run(onDelete)
  }

  return (
    <div className="backdrop" onClick={onClose}>
      <form className="sheet" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <button type="button" className="link" onClick={onClose}>
            Cancel
          </button>
          <h2>{expense ? `Edit ${type}` : `New ${type}`}</h2>
          <button type="submit" className="link strong" disabled={!valid || busy}>
            Save
          </button>
        </div>

        <div className="segmented" role="radiogroup" aria-label="Type">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={t === type}
              className={t === type ? `selected ${t}` : ''}
              onClick={() => changeType(t)}
            >
              {t === 'expense' ? 'Expense' : 'Income'}
            </button>
          ))}
        </div>

        <label className={`amount-field ${type}`}>
          <span>$</span>
          <input
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
            autoFocus={!expense}
            aria-label="Amount"
          />
        </label>

        <div className="chips" role="radiogroup" aria-label="Category">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={c === category}
              className={c === category ? 'chip selected' : 'chip'}
              style={{ '--chip': categoryMeta(type, c).color } as React.CSSProperties}
              onClick={() => setCategory(c)}
            >
              <span>{categoryMeta(type, c).emoji}</span>
              {categoryMeta(type, c).label}
            </button>
          ))}
        </div>

        <label className="field">
          <span>Note</span>
          <input
            placeholder={type === 'income' ? 'Where from?' : 'What was it for?'}
            maxLength={200}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="primary" disabled={!valid || busy}>
          {busy ? 'Saving…' : expense ? 'Save changes' : `Add ${type}`}
        </button>
        {expense && (
          <button type="button" className="danger" onClick={remove} disabled={busy}>
            Delete {type}
          </button>
        )}
      </form>
    </div>
  )
}
