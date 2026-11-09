import React, { useMemo } from 'react'
import { Plus, Trash2, Pencil, X } from 'lucide-react'
import { useAppStore } from '@/store'
import { useRepoMap } from '@/store/repos/use-repository-catalog'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { useTranslate } from '@/i18n/use-translate'
import type { Worktree } from '../../../../../shared/worktree/types'
import {
  THREAD_TAG_COLORS,
  projectTagFilterId,
  threadCustomTags,
  type ThreadTag
} from '../../../../../shared/threads/thread-tags'
import type { ThreadRows } from './thread-rows'
import { ThreadProjectGlyph, useThreadProjectName } from './thread-project-identity'
import { ThreadTagChip, ThreadTagDot } from './ThreadTagChip'
import { editThreadTag, removeThreadTag, toggleThreadTagFilter } from './thread-tag-actions'

function ProjectTagChip({
  worktree,
  count,
  selected
}: {
  worktree: Worktree
  count: number
  selected: boolean
}): React.JSX.Element {
  const repo = useRepoMap().get(worktree.repoId)
  const name = useThreadProjectName(worktree, repo)
  return (
    <ThreadTagChip
      label={name}
      leading={<ThreadProjectGlyph repo={repo} />}
      count={count}
      selected={selected}
      onToggle={() => toggleThreadTagFilter(projectTagFilterId(worktree.repoId))}
    />
  )
}

function CustomTagChip({
  tag,
  count,
  selected
}: {
  tag: ThreadTag
  count: number
  selected: boolean
}): React.JSX.Element {
  const t = useTranslate()
  const setThreadTagDialog = useAppStore((s) => s.setThreadTagDialog)
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <ThreadTagChip
          label={tag.name}
          color={tag.color}
          count={count}
          selected={selected}
          onToggle={() => toggleThreadTagFilter(tag.id)}
        />
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={() => setThreadTagDialog({ mode: 'rename', tagId: tag.id })}>
          <Pencil className="size-3.5" />
          {t('components.sidebar.threads.tags.rename', 'Rename…')}
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <ThreadTagDot color={tag.color} />
            {t('components.sidebar.threads.tags.color', 'Color')}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuRadioGroup
              value={tag.color}
              onValueChange={(color) => editThreadTag(tag.id, { color })}
            >
              {THREAD_TAG_COLORS.map((color) => (
                <ContextMenuRadioItem key={color} value={color}>
                  <span className="size-3 rounded-full" style={{ backgroundColor: color }} />
                </ContextMenuRadioItem>
              ))}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={() => removeThreadTag(tag.id)}>
          <Trash2 className="size-3.5" />
          {t('components.sidebar.threads.tags.delete', 'Delete tag')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

/** Tag chips over the Threads list: custom tags, then projects with active threads. Selecting is OR. */
export function ThreadTagFilterBar({ rows }: { rows: ThreadRows }): React.JSX.Element | null {
  const t = useTranslate()
  const tags = useAppStore((s) => s.threadTags)
  const filter = useAppStore((s) => s.threadTagFilter)
  const setThreadTagFilter = useAppStore((s) => s.setThreadTagFilter)
  const setThreadTagDialog = useAppStore((s) => s.setThreadTagDialog)

  const { projects, tagCounts } = useMemo(() => {
    const byRepo = new Map<string, { worktree: Worktree; count: number }>()
    const counts = new Map<string, number>()
    for (const row of [...rows.pinned, ...rows.rest, ...rows.snoozed]) {
      const repoId = row.worktree.repoId
      const entry = byRepo.get(repoId)
      byRepo.set(repoId, {
        worktree: entry?.worktree ?? row.worktree,
        count: (entry?.count ?? 0) + 1
      })
      for (const tag of threadCustomTags(tags, row.key, repoId)) {
        counts.set(tag.id, (counts.get(tag.id) ?? 0) + 1)
      }
    }
    // A selected project whose threads are all settled stays visible so it can be deselected.
    for (const row of rows.settled) {
      const repoId = row.worktree.repoId
      if (!byRepo.has(repoId) && filter.includes(projectTagFilterId(repoId))) {
        byRepo.set(repoId, { worktree: row.worktree, count: 0 })
      }
    }
    return { projects: [...byRepo.values()], tagCounts: counts }
  }, [rows, tags, filter])

  const selected = new Set(filter)
  if (tags.tags.length === 0 && projects.length < 2 && filter.length === 0) {
    return null
  }
  return (
    <div className="flex flex-wrap items-center gap-1 px-2 pb-1.5" data-thread-tag-filter="">
      {tags.tags.map((tag) => (
        <CustomTagChip
          key={tag.id}
          tag={tag}
          count={tagCounts.get(tag.id) ?? 0}
          selected={selected.has(tag.id)}
        />
      ))}
      {projects.map(({ worktree, count }) => (
        <ProjectTagChip
          key={worktree.repoId}
          worktree={worktree}
          count={count}
          selected={selected.has(projectTagFilterId(worktree.repoId))}
        />
      ))}
      <button
        type="button"
        className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-accent/60 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
        aria-label={t('components.sidebar.threads.tags.new', 'New tag…')}
        title={t('components.sidebar.threads.tags.new', 'New tag…')}
        onClick={() => setThreadTagDialog({ mode: 'create' })}
      >
        <Plus className="size-3.5" />
      </button>
      {filter.length > 0 ? (
        <button
          type="button"
          className="ml-auto inline-flex h-5 items-center gap-0.5 rounded-full px-1.5 text-2xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
          onClick={() => setThreadTagFilter([])}
        >
          <X className="size-3" />
          {t('components.sidebar.threads.tags.clear', 'Clear')}
        </button>
      ) : null}
    </div>
  )
}
