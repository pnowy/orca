import { defineFixture } from '../../../component-fixtures/component-fixture'
import { makeWorktree } from '@/store/slices/worktrees-slice-test-fixtures'
import type { Repo } from '../../../../../shared/repo-types'
import { ThreadRowCard } from './ThreadRowCard'

const NOW = Date.now()
const repo = (id: string, displayName: string, badgeColor: string): Repo => ({
  id,
  path: `/code/${id}`,
  displayName,
  badgeColor,
  addedAt: 0
})
const orca = repo('orca', 'orca', '#22c55e')
const docs = repo('docs', 'cortex-internal-docs', '#a855f7')

const rows = [
  {
    worktree: makeWorktree({
      id: 'a',
      repoId: 'orca',
      displayName: 'T3-Style Threads Sidebar Feasibility',
      branch: 'refs/heads/main',
      lastActivityAt: NOW - 10 * 60_000
    }),
    repo: orca,
    isActive: true
  },
  {
    worktree: makeWorktree({
      id: 'b',
      repoId: 'docs',
      displayName: 'Docs Updates for GitLab to GitHub',
      branch: 'refs/heads/docs/CORC-10729-github-migration',
      lastActivityAt: NOW - 60 * 60_000
    }),
    repo: docs,
    isActive: false
  },
  {
    worktree: makeWorktree({
      id: 'c',
      repoId: 'docs',
      displayName: 'Rebuild Workshop Materials From Slides',
      branch: '',
      isUnread: true,
      lastActivityAt: NOW - 7 * 3_600_000
    }),
    repo: undefined,
    isActive: false
  }
]

export const list = defineFixture({
  width: 300,
  render: () => (
    <div className="flex flex-col gap-1 bg-worktree-sidebar p-1.5">
      {rows.map((row) => (
        <ThreadRowCard
          key={row.worktree.id}
          {...row}
          draggable={false}
          onDragStart={() => {}}
          onDragEnd={() => {}}
        />
      ))}
    </div>
  )
})

export const renaming = defineFixture({
  ...list,
  interact: async (frame) => {
    frame
      .querySelector('[data-worktree-title-inline-rename]')
      ?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
  }
})
