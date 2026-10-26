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
}

export type ThreadRows = {
  pinned: ThreadRow[]
  rest: ThreadRow[]
  /** Settled and snoozed threads a search turned up; rendered dimmed below the open matches. */
  dimmed: ThreadRow[]
}

/** Orca-created worktrees from before Threads existed count as opened when created. */
export function threadFallbackOpenedAt(worktree: Worktree): number | undefined {
  return worktree.isMainWorktree ? undefined : worktree.createdAt
}

export function classifyThread(
  worktree: Worktree,
  states: ThreadStates,
  liveStatus: LiveAgentWorktreeStatus | undefined,
  now: number
): ThreadRowKind {
  const state = states[getWorktreeHostIdentity(worktree)]
  if (!isThreadOpen(state, threadFallbackOpenedAt(worktree))) {
    return 'settled'
  }
  return isThreadSnoozed(state, now, liveStatus === 'permission') ? 'snoozed' : 'open'
}

/** `matches` null means no search; with a search, snoozed and settled matches are kept as dimmed rows. */
export function buildThreadRows(args: {
  workspaces: readonly Worktree[]
  states: ThreadStates
  liveStatusByWorktreeId: ReadonlyMap<string, LiveAgentWorktreeStatus>
  now: number
  matches: ReadonlySet<string> | null
  showSnoozed: boolean
  showSettled: boolean
}): ThreadRows {
  const byKey = new Map<string, ThreadRow>()
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
    const visible =
      kind === 'open' ||
      args.matches !== null ||
      (kind === 'snoozed' && args.showSnoozed) ||
      (kind === 'settled' && args.showSettled)
    if (visible) {
      byKey.set(key, { key, worktree, kind })
    }
  }
  const isPinned = (key: string): boolean => byKey.get(key)?.worktree.isPinned === true
  const orderingStates: ThreadStates = {}
  for (const [key, row] of byKey) {
    orderingStates[key] = {
      ...args.states[key],
      openedAt: args.states[key]?.openedAt ?? threadFallbackOpenedAt(row.worktree)
    }
  }
  const ordered = orderThreadKeys([...byKey.keys()], orderingStates, isPinned)
  const rows: ThreadRows = { pinned: [], rest: [], dimmed: [] }
  for (const key of ordered) {
    const row = byKey.get(key)
    if (!row) {
      continue
    }
    if (row.kind !== 'open') {
      rows.dimmed.push(row)
    } else if (args.matches === null && row.worktree.isPinned) {
      rows.pinned.push(row)
    } else {
      rows.rest.push(row)
    }
  }
  return rows
}
