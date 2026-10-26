/** Per-workspace state the Threads sidebar layout keeps; the workspace itself is unchanged. */
export type ThreadState = {
  /** When the workspace last became an open thread. */
  openedAt?: number
  /** When the user last settled it; open again once `openedAt` is later. */
  settledAt?: number
  /** Hidden while now is before this time. Never cleared on expiry. */
  snoozedUntil?: number
  /** Threads-only rank; higher renders earlier. */
  order?: number
}

/** Keyed by workspace host identity (`getWorktreeHostIdentity`). */
export type ThreadStates = Record<string, ThreadState>

export type SidebarLayout = 'projects' | 'threads'

export const SIDEBAR_LAYOUTS: readonly SidebarLayout[] = ['projects', 'threads']

export type ThreadSnoozeOption = 'hour' | 'three-hours' | 'tomorrow' | 'next-week'

export function normalizeSidebarLayout(value: unknown): SidebarLayout {
  return value === 'threads' ? 'threads' : 'projects'
}

/** `fallbackOpenedAt` covers workspaces created before Threads existed. */
export function isThreadOpen(state: ThreadState | undefined, fallbackOpenedAt?: number): boolean {
  const openedAt = state?.openedAt ?? fallbackOpenedAt ?? 0
  return openedAt > 0 && openedAt > (state?.settledAt ?? 0)
}

export function isThreadSnoozed(
  state: ThreadState | undefined,
  now: number,
  needsInput: boolean
): boolean {
  return !needsInput && (state?.snoozedUntil ?? 0) > now
}

/** The earliest snooze still pending at `now`, so a list can re-render exactly when it ends. */
export function nextSnoozeExpiry(states: ThreadStates, now: number): number | null {
  let next: number | null = null
  for (const state of Object.values(states)) {
    const until = state.snoozedUntil
    if (until !== undefined && until > now && (next === null || until < next)) {
      next = until
    }
  }
  return next
}

/** Pinned first, then rank, then most recently opened. */
export function orderThreadKeys(
  keys: readonly string[],
  states: ThreadStates,
  isPinned: (key: string) => boolean
): string[] {
  return [...keys].sort((a, b) => {
    const pinDelta = Number(isPinned(b)) - Number(isPinned(a))
    if (pinDelta !== 0) {
      return pinDelta
    }
    const orderDelta = (states[b]?.order ?? 0) - (states[a]?.order ?? 0)
    if (orderDelta !== 0) {
      return orderDelta
    }
    return (states[b]?.openedAt ?? 0) - (states[a]?.openedAt ?? 0)
  })
}

export function topThreadOrder(states: ThreadStates): number {
  let max = 0
  for (const state of Object.values(states)) {
    if (state.order !== undefined && state.order > max) {
      max = state.order
    }
  }
  return max + 1
}

/** Move `movedKey` to `toIndex` within `orderedKeys` and re-rank that slice so it renders in the new order. */
export function reorderThread(
  states: ThreadStates,
  orderedKeys: readonly string[],
  movedKey: string,
  toIndex: number
): ThreadStates {
  const without = orderedKeys.filter((key) => key !== movedKey)
  const index = Math.max(0, Math.min(toIndex, without.length))
  const next = [...without.slice(0, index), movedKey, ...without.slice(index)]
  const result: ThreadStates = { ...states }
  next.forEach((key, position) => {
    result[key] = { ...result[key], order: next.length - position }
  })
  return result
}

export function snoozeUntil(option: ThreadSnoozeOption, now: Date): number {
  switch (option) {
    case 'hour':
      return now.getTime() + 60 * 60 * 1000
    case 'three-hours':
      return now.getTime() + 3 * 60 * 60 * 1000
    case 'tomorrow': {
      const date = new Date(now)
      date.setDate(date.getDate() + 1)
      date.setHours(9, 0, 0, 0)
      return date.getTime()
    }
    case 'next-week': {
      const date = new Date(now)
      // Days until the next Monday; a Monday snoozes a full week.
      const daysUntilMonday = (8 - date.getDay()) % 7 || 7
      date.setDate(date.getDate() + daysUntilMonday)
      date.setHours(9, 0, 0, 0)
      return date.getTime()
    }
  }
}

function finiteOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function normalizeThreadStates(raw: unknown): ThreadStates {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }
  const result: ThreadStates = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue
    }
    const record: Record<string, unknown> = { ...value }
    const state: ThreadState = {}
    const openedAt = finiteOrUndefined(record.openedAt)
    const settledAt = finiteOrUndefined(record.settledAt)
    const snoozed = finiteOrUndefined(record.snoozedUntil)
    const order = finiteOrUndefined(record.order)
    if (openedAt !== undefined) {
      state.openedAt = openedAt
    }
    if (settledAt !== undefined) {
      state.settledAt = settledAt
    }
    if (snoozed !== undefined) {
      state.snoozedUntil = snoozed
    }
    if (order !== undefined) {
      state.order = order
    }
    if (Object.keys(state).length > 0) {
      result[key] = state
    }
  }
  return result
}

/** Apply a patch where `undefined` values delete the field; an emptied record is removed. */
export function patchThreadStates(
  states: ThreadStates,
  key: string,
  patch: Partial<Record<keyof ThreadState, number | undefined>>
): ThreadStates {
  const merged: ThreadState = { ...states[key] }
  for (const [field, value] of Object.entries(patch)) {
    if (
      field !== 'openedAt' &&
      field !== 'settledAt' &&
      field !== 'snoozedUntil' &&
      field !== 'order'
    ) {
      continue
    }
    if (value === undefined) {
      delete merged[field]
    } else {
      merged[field] = value
    }
  }
  const result = { ...states }
  if (Object.keys(merged).length === 0) {
    delete result[key]
  } else {
    result[key] = merged
  }
  return result
}
