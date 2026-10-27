import React from 'react'
import { formatShortTimeAgo } from '@/lib/short-time-ago'
import { useNow } from '@/hooks/use-now'
import { cn } from '@/lib/utils'
import type { Repo } from '../../../../../shared/repo-types'
import WorktreeContextMenu from '../WorktreeContextMenu'
import type { ThreadRow } from './thread-rows'
import { ThreadProjectGlyph, activateThread, threadTitle } from './thread-project-identity'

/** One-line row for the Snoozed and Settled sections: glyph, title, and time to wake or since settling. */
export const ThreadCompactRow = React.memo(function ThreadCompactRow({
  row,
  repo,
  isActive,
  draggable,
  onDragStart,
  onDragEnd
}: {
  row: ThreadRow
  repo: Repo | undefined
  isActive: boolean
  draggable: boolean
  onDragStart: () => void
  onDragEnd: () => void
}): React.JSX.Element {
  const now = useNow(60_000)
  const at = row.at ?? 0
  const snoozed = row.kind === 'snoozed'
  // Snoozed rows count down to wake; formatShortTimeAgo(now, at) measures at - now.
  const timeLabel =
    at > 0 ? (snoozed ? formatShortTimeAgo(now, at) : formatShortTimeAgo(at, now)) : ''

  return (
    <WorktreeContextMenu worktree={row.worktree}>
      <div
        className={cn(
          'flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2.5 text-sm text-muted-foreground select-none',
          !isActive && 'worktree-sidebar-card-hover'
        )}
        data-worktree-card-surface="true"
        data-worktree-card-active={isActive ? 'primary' : undefined}
        draggable={draggable}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', row.worktree.id)
          onDragStart()
        }}
        onDragEnd={onDragEnd}
        onClick={() => activateThread(row.worktree, repo)}
      >
        <span className="opacity-60">
          <ThreadProjectGlyph repo={repo} />
        </span>
        <span className="min-w-0 flex-1 truncate">{threadTitle(row.worktree)}</span>
        {timeLabel ? (
          <span className={cn('shrink-0 text-xs tabular-nums', snoozed && 'text-callout-note')}>
            {timeLabel}
          </span>
        ) : null}
      </div>
    </WorktreeContextMenu>
  )
})
