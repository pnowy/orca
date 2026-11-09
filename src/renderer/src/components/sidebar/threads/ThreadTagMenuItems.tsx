import React from 'react'
import { Plus, Tag } from 'lucide-react'
import { useAppStore } from '@/store'
import { useRepoMap } from '@/store/repos/use-repository-catalog'
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu'
import { useTranslate } from '@/i18n/use-translate'
import type { Worktree } from '../../../../../shared/worktree/types'
import { getWorktreeHostIdentity } from '../../../../../shared/worktree/host-qualified-identity'
import type { ThreadTagScope } from '../../../../../shared/threads/thread-tags'
import { useThreadProjectName } from './thread-project-identity'
import { ThreadTagDot } from './ThreadTagChip'
import { toggleThreadTag } from './thread-tag-actions'

/** "Tags" submenu: tag this thread, or every thread of its project; Threads layout only. */
export function ThreadTagMenuItems({
  worktree,
  disabled
}: {
  worktree: Worktree
  disabled: boolean
}): React.JSX.Element | null {
  const t = useTranslate()
  const threadsLayout = useAppStore((s) => s.sidebarLayout === 'threads')
  const tags = useAppStore((s) => s.threadTags)
  const setThreadTagDialog = useAppStore((s) => s.setThreadTagDialog)
  const repo = useRepoMap().get(worktree.repoId)
  const projectName = useThreadProjectName(worktree, repo)
  if (!threadsLayout) {
    return null
  }
  const threadKey = getWorktreeHostIdentity(worktree)

  const section = (scope: ThreadTagScope, key: string, label: string): React.JSX.Element => (
    <>
      <DropdownMenuLabel>{label}</DropdownMenuLabel>
      {tags.tags.map((tag) => (
        <DropdownMenuCheckboxItem
          key={tag.id}
          checked={(tags[scope][key] ?? []).includes(tag.id)}
          // Keep the menu open so several tags can be toggled in one go.
          onSelect={(event) => event.preventDefault()}
          onCheckedChange={() => toggleThreadTag(scope, key, tag.id)}
        >
          <ThreadTagDot color={tag.color} />
          <span className="truncate">{tag.name}</span>
        </DropdownMenuCheckboxItem>
      ))}
      <DropdownMenuItem
        // Why: the menu refocuses the sidebar on close, which would steal focus from the dialog input.
        onSelect={() =>
          window.setTimeout(() => setThreadTagDialog({ mode: 'create', assign: { scope, key } }), 0)
        }
      >
        <Plus className="size-3.5" />
        {t('components.sidebar.threads.tags.new', 'New tag…')}
      </DropdownMenuItem>
    </>
  )

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={disabled}>
        <Tag className="size-3.5" />
        {t('components.sidebar.threads.tags.menu', 'Tags')}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="max-w-64">
        {section(
          'byThread',
          threadKey,
          t('components.sidebar.threads.tags.thisThread', 'This thread')
        )}
        <DropdownMenuSeparator />
        {section(
          'byProject',
          worktree.repoId,
          t('components.sidebar.threads.tags.allProjectThreads', 'All {{project}} threads', {
            project: projectName
          })
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
