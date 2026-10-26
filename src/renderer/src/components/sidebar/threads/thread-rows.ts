import type { Worktree } from '../../../../../shared/worktree/types'
import { getWorktreeHostIdentity } from '../../../../../shared/worktree/host-qualified-identity'
import type { LiveAgentWorktreeStatus } from '../../../../../shared/sidebar-list/workspace-activity-facts'
import {
  isThreadOpen,
  isThreadSnoozed,
  orderThreadKeys,
  type ThreadStates
} from '../../../../../shared/threads/thread-state'

export type ThreadRowKind = 'open' | 'snoozed' | 'settled'

export type ThreadRow = {
  key: string
  worktree: Worktree
  kind: ThreadRowKind
  /** Snoozed: wake time. Settled: when it was settled. */
  at?: number
}

export type ThreadRows = {
  pinned: ThreadRow[]
  rest: ThreadRow[]
  /** Soonest wake first. */
  snoozed: ThreadRow[]
  /** Most recently settled first. */
  settled: ThreadRow[]
}

/** Orca-created worktrees from before Threads existed count as opened when created. */
export function threadFallbackOpenedAt(worktree: Worktree): number | undefined {
  return worktree.isMainWorktree ? undefined : worktree.createdAt
}

/** null: never a thread (e.g. a main checkout no agent ran on), so it is listed nowhere. */
export function classifyThread(
  worktree: Worktree,
  states: ThreadStates,
  liveStatus: LiveAgentWorktreeStatus | undefined,
  now: number
): ThreadRowKind | null {
  const state = states[getWorktreeHostIdentity(worktree)]
  if (!isThreadOpen(state, threadFallbackOpenedAt(worktree))) {
    return (state?.settledAt ?? 0) > 0 ? 'settled' : null
  }
  return isThreadSnoozed(state, now, liveStatus === 'permission') ? 'snoozed' : 'open'
}

/** `matches` null means no search; a search filters every section. */
export function buildThreadRows(args: {
  workspaces: readonly Worktree[]
  states: ThreadStates
  liveStatusByWorktreeId: ReadonlyMap<string, LiveAgentWorktreeStatus>
  now: number
  matches: ReadonlySet<string> | null
}): ThreadRows {
  const open = new Map<string, ThreadRow>()
  const rows: ThreadRows = { pinned: [], rest: [], snoozed: [], settled: [] }
  for (const worktree of args.workspaces) {
    if (worktree.isArchived) {
      continue
    }
    const key = getWorktreeHostIdentity(worktree)
    if (args.matches && !args.matches.has(key)) {
      continue
    }
    const kind = classifyThread(
      worktree,
      args.states,
      args.liveStatusByWorktreeId.get(worktree.id),
      args.now
    )
    if (kind === 'open') {
      open.set(key, { key, worktree, kind })
    } else if (kind === 'snoozed') {
      rows.snoozed.push({ key, worktree, kind, at: args.states[key]?.snoozedUntil })
    } else if (kind === 'settled') {
      rows.settled.push({ key, worktree, kind, at: args.states[key]?.settledAt })
    }
  }
  rows.snoozed.sort((a, b) => (a.at ?? 0) - (b.at ?? 0))
  rows.settled.sort((a, b) => (b.at ?? 0) - (a.at ?? 0))
  const isPinned = (key: string): boolean => open.get(key)?.worktree.isPinned === true
  const orderingStates: ThreadStates = {}
  for (const [key, row] of open) {
    orderingStates[key] = {
      ...args.states[key],
      openedAt: args.states[key]?.openedAt ?? threadFallbackOpenedAt(row.worktree)
    }
  }
  for (const key of orderThreadKeys([...open.keys()], orderingStates, isPinned)) {
    const row = open.get(key)
    if (!row) {
      continue
    }
    if (args.matches === null && row.worktree.isPinned) {
      rows.pinned.push(row)
    } else {
      rows.rest.push(row)
    }
  }
  return rows
}
