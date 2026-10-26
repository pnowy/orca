import React, { useMemo } from 'react'
import { SquareDashed } from 'lucide-react'
import { useAppStore } from '@/store'
import { RepoIconGlyph } from '@/components/repo/repo-icon'
import { AgentStateDot } from '@/components/AgentStateDot'
import { AgentTypeIcon } from '@/lib/agent-type-icon'
import { activateWorktreeFromSidebar } from '@/lib/sidebar-worktree-activation'
import { branchName } from '@/lib/git-utils'
import { formatShortTimeAgo } from '@/lib/short-time-ago'
import { useNow } from '@/hooks/use-now'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import type { Repo } from '../../../../../shared/repo-types'
import type { Worktree } from '../../../../../shared/worktree/types'
import { getRepoExecutionHostId } from '../../../../../shared/execution-host'
import { projectGroupIdFromRepoId } from '../../../../../shared/folder-workspace-worktree'
import WorktreeContextMenu from '../WorktreeContextMenu'
import { resolveRepoHeaderColor } from '../project-header-color'
import { useWorktreeAgentRows } from '../useWorktreeAgentRows'
import {
  buildSummaryAgentGroups,
  selectSummaryGroupIconAgents
} from '../worktree-card-agent-summary'
import { NO_PROJECT_GROUP_NAME } from './thread-launch'

type ThreadRowCardProps = {
  worktree: Worktree
  repo: Repo | undefined
  isActive: boolean
  draggable: boolean
  onDragStart: () => void
  onDragEnd: () => void
}

function ThreadRowAgents({ worktreeId }: { worktreeId: string }): React.JSX.Element | null {
  const agents = useWorktreeAgentRows(worktreeId)
  const group = useMemo(() => buildSummaryAgentGroups(agents)[0], [agents])
  if (!group) {
    return null
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      <AgentStateDot state={group.state} size="sm" tooltipSide="right" />
      <span className="inline-flex items-center -space-x-0.5">
        {selectSummaryGroupIconAgents(group.agents, 3).map((agent) => (
          <span key={agent.paneKey} className="inline-flex">
            <AgentTypeIcon agentType={agent.agentType} size={13} />
          </span>
        ))}
      </span>
    </span>
  )
}

/** T3-style thread row: project, age, title, branch and live agents on three quiet lines. */
export const ThreadRowCard = React.memo(function ThreadRowCard({
  worktree,
  repo,
  isActive,
  draggable,
  onDragStart,
  onDragEnd
}: ThreadRowCardProps): React.JSX.Element {
  const now = useNow(60_000)
  const groupId = projectGroupIdFromRepoId(worktree.repoId)
  const groupName = useAppStore((s) =>
    groupId ? (s.projectGroups ?? []).find((group) => group.id === groupId)?.name : undefined
  )
  const isNoProject = !repo && groupName === NO_PROJECT_GROUP_NAME
  const projectName =
    repo?.displayName ??
    (isNoProject
      ? translate('components.sidebar.threads.noProject', 'No project')
      : (groupName ?? ''))
  const branch = worktree.branch ? branchName(worktree.branch) : ''
  const title =
    worktree.displayName.trim() || branch || worktree.path.split(/[\\/]/).pop() || worktree.id
  const activityAt = worktree.lastActivityAt || worktree.createdAt || 0

  return (
    <WorktreeContextMenu worktree={worktree}>
      <div
        className={cn(
          'relative flex cursor-pointer flex-col gap-0.5 rounded-lg border border-transparent px-2.5 py-2 outline-none select-none',
          !isActive && 'worktree-sidebar-card-hover'
        )}
        data-worktree-card-surface="true"
        data-worktree-card-active={isActive ? 'primary' : undefined}
        draggable={draggable}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', worktree.id)
          onDragStart()
        }}
        onDragEnd={onDragEnd}
        onClick={() => {
          void activateWorktreeFromSidebar(
            worktree.id,
            worktree.hostId ?? (repo ? getRepoExecutionHostId(repo) : undefined)
          )
        }}
      >
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-flex size-3.5 shrink-0 items-center justify-center">
            {repo ? (
              <RepoIconGlyph
                repoIcon={repo.repoIcon}
                color={resolveRepoHeaderColor(repo.badgeColor)}
                className="size-full"
                iconClassName="size-3"
              />
            ) : (
              <SquareDashed className="size-3.5" />
            )}
          </span>
          <span className="min-w-0 flex-1 truncate">{projectName}</span>
          {activityAt > 0 ? (
            <span className="shrink-0 tabular-nums">{formatShortTimeAgo(activityAt, now)}</span>
          ) : null}
        </div>
        <div
          className={cn('truncate text-sm text-foreground', worktree.isUnread && 'font-semibold')}
        >
          {title}
        </div>
        <div className="flex min-h-4 min-w-0 items-center gap-1.5 text-xs text-muted-foreground/70">
          <span className="min-w-0 flex-1 truncate">{branch}</span>
          <ThreadRowAgents worktreeId={worktree.id} />
        </div>
      </div>
    </WorktreeContextMenu>
  )
})
