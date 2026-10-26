import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/store'
import { getRepoMapFromState } from '@/store/selectors'
import { selectFolderWorkspaces, selectWorktreesByRepo } from '@/store/workspace-record-selectors'
import { getFolderWorkspaceWorktree } from '@/store/slices/worktrees/listing/detected-worktree-meta'
import { getAgentStatusEpochNow } from '@/lib/agent-status-epoch-clock'
import { getLiveAgentStatusByWorktreeId } from '@/lib/worktree-activity-state'
import type { Worktree } from '../../../../../shared/worktree/types'
import type { LiveAgentWorktreeStatus } from '../../../../../shared/sidebar-list/workspace-activity-facts'
import { nextSnoozeExpiry } from '../../../../../shared/threads/thread-state'
import { matchWorkspaceBoardWorktrees } from '../workspace-kanban-search'
import { buildThreadRows, type ThreadRows } from './thread-rows'

/** Every git worktree and folder workspace this window knows, as cards render them. */
export function useThreadWorkspaces(): Worktree[] {
  const worktreesByRepo = useAppStore((s) => selectWorktreesByRepo(s))
  const folderWorkspaces = useAppStore((s) => selectFolderWorkspaces(s))
  return useMemo(
    () => [
      ...Object.values(worktreesByRepo).flat(),
      ...folderWorkspaces.map((folder) => getFolderWorkspaceWorktree(folder))
    ],
    [worktreesByRepo, folderWorkspaces]
  )
}

/** Live agent status per worktree id, refreshed on each agent-status epoch. */
export function useLiveAgentStatusByWorktreeId(): ReadonlyMap<string, LiveAgentWorktreeStatus> {
  const agentStatusEpoch = useAppStore((s) => s.agentStatusEpoch)
  const tabsByWorktree = useAppStore((s) => s.tabsByWorktree)
  return useMemo(() => {
    void agentStatusEpoch
    return getLiveAgentStatusByWorktreeId(
      useAppStore.getState().agentStatusByPaneKey,
      tabsByWorktree,
      getAgentStatusEpochNow(agentStatusEpoch)
    )
  }, [agentStatusEpoch, tabsByWorktree])
}

/** Re-render once when the earliest pending snooze ends, so the row returns on time. */
function useSnoozeClock(states: Parameters<typeof nextSnoozeExpiry>[0]): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const expiry = nextSnoozeExpiry(states, Date.now())
    if (expiry === null) {
      return
    }
    const timer = window.setTimeout(() => setNow(Date.now()), expiry - Date.now() + 50)
    return () => window.clearTimeout(timer)
  }, [states, now])
  return now
}

export function useThreadListModel(args: {
  query: string
  showSnoozed: boolean
  showSettled: boolean
}): { rows: ThreadRows; workspaces: Worktree[] } {
  const workspaces = useThreadWorkspaces()
  const states = useAppStore((s) => s.threadStates)
  const repos = useAppStore((s) => s.repos)
  const liveStatusByWorktreeId = useLiveAgentStatusByWorktreeId()
  const clockNow = useSnoozeClock(states)
  const repoMap = useMemo(() => getRepoMapFromState({ repos }), [repos])
  const matches = useMemo(
    () => matchWorkspaceBoardWorktrees({ worktrees: workspaces, query: args.query, repoMap }),
    [workspaces, args.query, repoMap]
  )
  const rows = useMemo(
    () =>
      buildThreadRows({
        workspaces,
        states,
        liveStatusByWorktreeId,
        now: clockNow,
        matches,
        showSnoozed: args.showSnoozed,
        showSettled: args.showSettled
      }),
    [
      workspaces,
      states,
      liveStatusByWorktreeId,
      clockNow,
      matches,
      args.showSnoozed,
      args.showSettled
    ]
  )
  return { rows, workspaces }
}
