import { describe, expect, it } from 'vitest'
import type { Worktree } from '../../../../../shared/worktree/types'
import { getWorktreeHostIdentity } from '../../../../../shared/worktree/host-qualified-identity'
import { buildThreadRows } from './thread-rows'

function worktree(id: string, overrides: Partial<Worktree> = {}): Worktree {
  // SAFETY: tests only read the fields the thread model consumes.
  return {
    id,
    repoId: 'repo',
    path: `/r/${id}`,
    branch: id,
    isMainWorktree: false,
    isArchived: false,
    isPinned: false,
    displayName: id,
    ...overrides
  } as Worktree
}

const base = {
  liveStatusByWorktreeId: new Map(),
  now: 1_000,
  matches: null,
  showSnoozed: false,
  showSettled: false
}

describe('buildThreadRows', () => {
  it('never lists a main checkout until it is opened', () => {
    const main = worktree('main', { isMainWorktree: true, createdAt: 5 })
    const rows = buildThreadRows({ ...base, workspaces: [main], states: {} })
    expect(rows.rest).toHaveLength(0)
    const opened = buildThreadRows({
      ...base,
      workspaces: [main],
      states: { [getWorktreeHostIdentity(main)]: { openedAt: 10 } }
    })
    expect(opened.rest.map((row) => row.key)).toEqual([getWorktreeHostIdentity(main)])
  })

  it('lists Orca-created worktrees, hides settled ones and splits pinned', () => {
    const a = worktree('a', { createdAt: 5 })
    const b = worktree('b', { createdAt: 6, isPinned: true })
    const c = worktree('c', { createdAt: 7 })
    const rows = buildThreadRows({
      ...base,
      workspaces: [a, b, c],
      states: { [getWorktreeHostIdentity(c)]: { settledAt: 8 } }
    })
    expect(rows.pinned.map((row) => row.worktree.id)).toEqual(['b'])
    expect(rows.rest.map((row) => row.worktree.id)).toEqual(['a'])
  })

  it('hides snoozed threads unless their agent needs input', () => {
    const a = worktree('a', { createdAt: 5 })
    const states = { [getWorktreeHostIdentity(a)]: { snoozedUntil: 2_000 } }
    expect(buildThreadRows({ ...base, workspaces: [a], states }).rest).toHaveLength(0)
    const needsInput = buildThreadRows({
      ...base,
      workspaces: [a],
      states,
      liveStatusByWorktreeId: new Map([['a', 'permission' as const]])
    })
    expect(needsInput.rest).toHaveLength(1)
  })

  it('search includes settled matches as dimmed rows', () => {
    const a = worktree('a', { createdAt: 5 })
    const b = worktree('b', { createdAt: 5 })
    const rows = buildThreadRows({
      ...base,
      workspaces: [a, b],
      states: { [getWorktreeHostIdentity(b)]: { settledAt: 9 } },
      matches: new Set([getWorktreeHostIdentity(a), getWorktreeHostIdentity(b)])
    })
    expect(rows.rest.map((row) => row.worktree.id)).toEqual(['a'])
    expect(rows.dimmed.map((row) => row.worktree.id)).toEqual(['b'])
  })

  it('skips archived workspaces', () => {
    const a = worktree('a', { createdAt: 5, isArchived: true })
    expect(buildThreadRows({ ...base, workspaces: [a], states: {} }).rest).toHaveLength(0)
  })
})
