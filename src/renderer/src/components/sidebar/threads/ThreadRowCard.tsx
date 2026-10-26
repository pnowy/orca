import React, { useMemo, useState } from 'react'
import { AlarmClock, Check } from 'lucide-react'
import { AgentStateDot, agentStateLabel, type AgentDotState } from '@/components/AgentStateDot'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { AgentTypeIcon } from '@/lib/agent-type-icon'
import { formatShortTimeAgo } from '@/lib/short-time-ago'
import { useNow } from '@/hooks/use-now'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import type { Repo } from '../../../../../shared/repo-types'
import type { Worktree } from '../../../../../shared/worktree/types'
import { getWorktreeHostIdentity } from '../../../../../shared/worktree/host-qualified-identity'
import type { DashboardAgentRow } from '@/components/dashboard/useDashboardData'
import { useAppStore } from '@/store'
import WorktreeContextMenu from '../WorktreeContextMenu'
import { WorktreeTitleInlineRename } from '../WorktreeTitleInlineRename'
import { shouldBeginWorktreeRename } from '../worktree-card-model'
import { renameThread } from './thread-launch'
import { useWorktreeAgentRows } from '../useWorktreeAgentRows'
import {
  buildSummaryAgentGroups,
  selectSummaryGroupIconAgents
} from '../worktree-card-agent-summary'
import { settleThread, snoozeThread } from './thread-actions'
import { THREAD_SNOOZE_OPTIONS } from './ThreadMenuItems'
import {
  ThreadProjectGlyph,
  activateThread,
  threadBranchLabel,
  threadTitle,
  useThreadProjectName
} from './thread-project-identity'

type ThreadRowCardProps = {
  worktree: Worktree
  repo: Repo | undefined
  isActive: boolean
  draggable: boolean
  onDragStart: () => void
  onDragEnd: () => void
}

const STATUS_LABEL_STATES: ReadonlySet<AgentDotState> = new Set([
  'working',
  'permission',
  'waiting',
  'blocked'
])

function formatElapsed(ms: number): string {
  return ms < 60_000 ? `${Math.max(0, Math.floor(ms / 1000))}s` : formatShortTimeAgo(0, ms)
}

/** Line-1 status: "Working 53s" / "Needs attention" while an agent wants watching, else the age. */
function ThreadRowStatus({
  agents,
  activityAt
}: {
  agents: DashboardAgentRow[]
  activityAt: number
}): React.JSX.Element | null {
  const group = useMemo(
    () => buildSummaryAgentGroups(agents).find((g) => STATUS_LABEL_STATES.has(g.state)),
    [agents]
  )
  const working = group?.state === 'working'
  const now = useNow(working ? 1_000 : 60_000)
  if (group) {
    const startedAt = Math.min(...group.agents.map((agent) => agent.startedAt))
    const label = agentStateLabel(group.state)
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center gap-1',
          working ? 'text-agent-working' : 'text-foreground/80'
        )}
      >
        <AgentStateDot state={group.state} size="sm" title={null} />
        <span className="first-letter:uppercase">{label}</span>
        {working && Number.isFinite(startedAt) ? (
          <span className="tabular-nums">{formatElapsed(now - startedAt)}</span>
        ) : null}
      </span>
    )
  }
  return activityAt > 0 ? (
    <span className="shrink-0 tabular-nums">{formatShortTimeAgo(activityAt, now)}</span>
  ) : null
}

function ThreadRowAgentIcons({
  agents
}: {
  agents: DashboardAgentRow[]
}): React.JSX.Element | null {
  if (agents.length === 0) {
    return null
  }
  return (
    <span className="inline-flex shrink-0 items-center -space-x-0.5">
      {selectSummaryGroupIconAgents(agents, 3).map((agent) => (
        <span key={agent.paneKey} className="inline-flex">
          <AgentTypeIcon agentType={agent.agentType} size={13} />
        </span>
      ))}
    </span>
  )
}

const HOVER_ACTION_CLASS =
  'inline-flex h-4 items-center gap-1 rounded px-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring'

/** Hover actions that replace the status: snooze menu and Settle, as in T3. */
function ThreadRowHoverActions({
  worktree,
  open,
  onOpenChange
}: {
  worktree: Worktree
  open: boolean
  onOpenChange: (open: boolean) => void
}): React.JSX.Element {
  const snoozeLabel = translate('components.sidebar.threads.snooze', 'Snooze')
  return (
    <span
      className={cn(
        'shrink-0 items-center gap-0.5',
        open ? 'flex' : 'hidden group-hover/thread:flex'
      )}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <DropdownMenu modal={false} open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={HOVER_ACTION_CLASS}
            aria-label={snoozeLabel}
            title={snoozeLabel}
          >
            <AlarmClock className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          {THREAD_SNOOZE_OPTIONS.map(({ option, label }) => (
            <DropdownMenuItem
              key={option}
              onSelect={() => snoozeThread(getWorktreeHostIdentity(worktree), option)}
            >
              {label()}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <button type="button" className={HOVER_ACTION_CLASS} onClick={() => settleThread(worktree)}>
        <Check className="size-3.5" />
        {translate('components.sidebar.threads.settle', 'Settle')}
      </button>
    </span>
  )
}

/** T3-style thread row: project, status, title, branch and agents on three quiet lines. */
export const ThreadRowCard = React.memo(function ThreadRowCard({
  worktree,
  repo,
  isActive,
  draggable,
  onDragStart,
  onDragEnd
}: ThreadRowCardProps): React.JSX.Element {
  const [snoozeMenuOpen, setSnoozeMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const renamingRequest = useAppStore((s) => s.renamingWorktreeId)
  const setRenamingRequest = useAppStore((s) => s.setRenamingWorktreeId)
  const agents = useWorktreeAgentRows(worktree.id)
  const projectName = useThreadProjectName(worktree, repo)
  const branch = threadBranchLabel(worktree)
  const activityAt = worktree.lastActivityAt || worktree.createdAt || 0

  return (
    <WorktreeContextMenu worktree={worktree}>
      <div
        className={cn(
          'group/thread relative flex cursor-pointer flex-col gap-0.5 rounded-lg border border-transparent px-2.5 py-2 outline-none select-none',
          !isActive && 'worktree-sidebar-card-hover'
        )}
        data-worktree-card-surface="true"
        data-worktree-card-active={isActive ? 'primary' : undefined}
        draggable={draggable && !renaming}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', worktree.id)
          onDragStart()
        }}
        onDragEnd={onDragEnd}
        onClick={() => activateThread(worktree, repo)}
      >
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <ThreadProjectGlyph repo={repo} />
          <span className="min-w-0 flex-1 truncate">{projectName}</span>
          <span className={cn('shrink-0', snoozeMenuOpen ? 'hidden' : 'group-hover/thread:hidden')}>
            <ThreadRowStatus agents={agents} activityAt={activityAt} />
          </span>
          <ThreadRowHoverActions
            worktree={worktree}
            open={snoozeMenuOpen}
            onOpenChange={setSnoozeMenuOpen}
          />
        </div>
        <WorktreeTitleInlineRename
          displayName={threadTitle(worktree)}
          showUnreadEmphasis={worktree.isUnread}
          className="text-sm leading-5"
          onEditingChange={setRenaming}
          onRename={(displayName) => renameThread(worktree, displayName)}
          beginEditing={shouldBeginWorktreeRename(renamingRequest, worktree.id, undefined)}
          onBeginEditingConsumed={() => setRenamingRequest(null)}
        />
        <div className="flex min-h-4 min-w-0 items-center gap-1.5 text-xs text-muted-foreground/70">
          <span className="min-w-0 flex-1 truncate">{branch}</span>
          <ThreadRowAgentIcons agents={agents} />
        </div>
      </div>
    </WorktreeContextMenu>
  )
})
