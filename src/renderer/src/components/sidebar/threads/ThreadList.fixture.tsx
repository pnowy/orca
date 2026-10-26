import { defineFixture } from '../../../component-fixtures/component-fixture'
import { makeWorktree } from '@/store/slices/worktrees-slice-test-fixtures'
import type { Repo } from '../../../../../shared/repo-types'
import type { Worktree } from '../../../../../shared/worktree/types'
import { getWorktreeHostIdentity } from '../../../../../shared/worktree/host-qualified-identity'
import ThreadList from './ThreadList'

const NOW = Date.now()
const HOUR = 3_600_000
const repos: Repo[] = [
  { id: 'orca', path: '/code/orca', displayName: 'orca', badgeColor: '#22c55e', addedAt: 0 },
  { id: 'docs', path: '/code/docs', displayName: 'docs', badgeColor: '#a855f7', addedAt: 0 }
]
const wt = (id: string, repoId: string, displayName: string, overrides: Partial<Worktree> = {}) =>
  makeWorktree({
    id,
    repoId,
    displayName,
    path: `/code/${repoId}/${id}`,
    branch: `refs/heads/${id}`,
    isMainWorktree: false,
    createdAt: NOW - HOUR,
    lastActivityAt: NOW - HOUR,
    ...overrides
  })
const worktrees = [
  wt('threads-sidebar', 'orca', 'T3-Style Threads Sidebar Feasibility', { isPinned: true }),
  wt('workshop', 'docs', 'Rebuild Workshop Materials From Slides'),
  wt('gitlab-docs', 'docs', 'Docs Updates for GitLab to GitHub'),
  ...Array.from({ length: 13 }, (_, i) =>
    wt(`settled-${i}`, i % 2 ? 'orca' : 'docs', `Settled thread number ${i + 1}`)
  )
]
const threadStates = Object.fromEntries([
  [getWorktreeHostIdentity(worktrees[2]), { snoozedUntil: NOW + 15 * HOUR }],
  ...worktrees
    .slice(3)
    .map((w, i) => [getWorktreeHostIdentity(w), { settledAt: NOW - (i + 1) * 120_000 }])
])

export const list = defineFixture({
  width: 300,
  store: {
    sidebarLayout: 'threads',
    repos,
    worktreesByRepo: {
      orca: worktrees.filter((w) => w.repoId === 'orca'),
      docs: worktrees.filter((w) => w.repoId === 'docs')
    },
    threadStates
  },
  render: () => (
    <div className="flex h-[640px] flex-col bg-worktree-sidebar">
      <ThreadList />
    </div>
  )
})
