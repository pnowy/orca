import React, { useMemo } from 'react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import type { Worktree } from '../../../../../shared/worktree/types'
import { getWorktreeHostIdentity } from '../../../../../shared/worktree/host-qualified-identity'
import { threadCustomTags } from '../../../../../shared/threads/thread-tags'
import { ThreadTagDot } from './ThreadTagChip'
import { toggleThreadTagFilter } from './thread-tag-actions'

const MAX_VISIBLE_TAGS = 2

/** A thread's custom tags; clicking one toggles it in the filter. `dotsOnly` for one-line rows. */
export function ThreadRowTags({
  worktree,
  dotsOnly = false
}: {
  worktree: Worktree
  dotsOnly?: boolean
}): React.JSX.Element | null {
  const tags = useAppStore((s) => s.threadTags)
  const filter = useAppStore((s) => s.threadTagFilter)
  const applied = useMemo(
    () => threadCustomTags(tags, getWorktreeHostIdentity(worktree), worktree.repoId),
    [tags, worktree]
  )
  if (applied.length === 0) {
    return null
  }
  if (dotsOnly) {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-0.5"
        title={applied.map((tag) => tag.name).join(', ')}
      >
        {applied.map((tag) => (
          <ThreadTagDot key={tag.id} color={tag.color} />
        ))}
      </span>
    )
  }
  const visible = applied.slice(0, MAX_VISIBLE_TAGS)
  const hidden = applied.slice(MAX_VISIBLE_TAGS)
  return (
    <span className="inline-flex min-w-0 shrink items-center gap-1">
      {visible.map((tag) => (
        <button
          key={tag.id}
          type="button"
          aria-pressed={filter.includes(tag.id)}
          className={cn(
            'inline-flex h-4 min-w-0 max-w-24 items-center gap-1 rounded-full px-1.5 text-3xs outline-none hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring',
            filter.includes(tag.id) ? 'bg-accent text-foreground' : 'text-muted-foreground'
          )}
          onClick={(event) => {
            event.stopPropagation()
            toggleThreadTagFilter(tag.id)
          }}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <ThreadTagDot color={tag.color} />
          <span className="truncate">{tag.name}</span>
        </button>
      ))}
      {hidden.length > 0 ? (
        <span
          className="shrink-0 text-3xs text-muted-foreground"
          title={hidden.map((tag) => tag.name).join(', ')}
        >
          +{hidden.length}
        </span>
      ) : null}
    </span>
  )
}
