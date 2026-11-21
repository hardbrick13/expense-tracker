export type EntryType = 'expense' | 'income'

export const EXPENSE_CATEGORIES = [
  'food',
  'transport',
  'rent',
  'bills',
  'shopping',
  'entertainment',
  'health',
  'other',
] as const

export const INCOME_CATEGORIES = ['salary', 'business', 'investment', 'gift', 'refund', 'other'] as const

export type Category = (typeof EXPENSE_CATEGORIES)[number] | (typeof INCOME_CATEGORIES)[number]

export const CATEGORIES_BY_TYPE: Record<EntryType, readonly Category[]> = {
  expense: EXPENSE_CATEGORIES,
  income: INCOME_CATEGORIES,
}

type Meta = { label: string; emoji: string; color: string }

const EXPENSE_META: Record<(typeof EXPENSE_CATEGORIES)[number], Meta> = {
  food: { label: 'Food', emoji: '🍔', color: '#f59e0b' },
  transport: { label: 'Transport', emoji: '🚌', color: '#3b82f6' },
  rent: { label: 'Rent', emoji: '🏠', color: '#8b5cf6' },
  bills: { label: 'Bills', emoji: '💡', color: '#06b6d4' },
  shopping: { label: 'Shopping', emoji: '🛍️', color: '#ec4899' },
  entertainment: { label: 'Fun', emoji: '🎬', color: '#ef4444' },
  health: { label: 'Health', emoji: '💊', color: '#10b981' },
  other: { label: 'Other', emoji: '📦', color: '#6b7280' },
}

const INCOME_META: Record<(typeof INCOME_CATEGORIES)[number], Meta> = {
  salary: { label: 'Salary', emoji: '💼', color: '#16a34a' },
  business: { label: 'Business', emoji: '🧾', color: '#0d9488' },
  investment: { label: 'Investments', emoji: '📈', color: '#2563eb' },
  gift: { label: 'Gifts', emoji: '🎁', color: '#db2777' },
  refund: { label: 'Refunds', emoji: '↩️', color: '#ca8a04' },
  other: { label: 'Other', emoji: '💰', color: '#6b7280' },
}

export function categoryMeta(type: EntryType, category: Category): Meta {
  const table: Record<string, Meta> = type === 'income' ? INCOME_META : EXPENSE_META
  return table[category] ?? EXPENSE_META.other
}

export interface Expense {
  _id: string
  type?: EntryType // missing on records created before income existed → expense
  amountCents: number
  category: Category
  description?: string
  date: string // ISO string; we treat the UTC date part as the calendar day
}

export const entryType = (e: Expense): EntryType => e.type ?? 'expense'

export interface ExpenseInput {
  type: EntryType
  amountCents: number
  category: Category
  description?: string
  date: string // YYYY-MM-DD
}

/** An HTTP error from the API, carrying the parsed JSON body. */
export class ApiError extends Error {
  readonly status: number
  readonly body: Record<string, unknown> | null

  constructor(message: string, status: number, body: Record<string, unknown> | null) {
    super(message)
    this.status = status
    this.body = body
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    // Session expired or was revoked: let the app drop back to the login screen.
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('unauthorized'))
    const body = await res.json().catch(() => null)
    throw new ApiError(body?.error ?? `Request failed (${res.status})`, res.status, body)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

export const api = {
  list: () => request<Expense[]>('/expenses'),
  create: (data: ExpenseInput) =>
    request<Expense>('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ExpenseInput>) =>
    request<Expense>(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/expenses/${id}`, { method: 'DELETE' }),
}

export interface User {
  email: string
}

export const auth = {
  /** Resolves to null when nobody is logged in. */
  me: () => request<User>('/auth/me').catch(() => null),
  requestCode: (email: string) =>
    request<{ ok: true; resendInSeconds: number }>('/auth/request-otp', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyCode: (email: string, code: string) =>
    request<User>('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, code }) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  deleteAccount: (email: string) =>
    request<void>('/auth/account', { method: 'DELETE', body: JSON.stringify({ email }) }),
}

// ---- formatting helpers ----

const money = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' })
export const formatMoney = (cents: number) => money.format(cents / 100)

/** Always shows a sign: +$10.00 / −$10.00 */
export const formatSigned = (cents: number) =>
  (cents > 0 ? '+' : cents < 0 ? '−' : '') + money.format(Math.abs(cents) / 100)

/** Calendar day (YYYY-MM-DD) of a stored expense date. */
export const dayKey = (iso: string) => iso.slice(0, 10)

/** Today's date in the user's local timezone, as YYYY-MM-DD. */
export function todayKey() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatDay(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (key === todayKey()) return 'Today'
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatMonth(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
