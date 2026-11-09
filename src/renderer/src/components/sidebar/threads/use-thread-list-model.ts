import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/store'
import { useRepoMap } from '@/store/repos/use-repository-catalog'
import {
  selectFolderWorkspaces,
  selectWorktreesByRepo
} from '@/store/workspaces/catalog/workspace-record-fields'
import { getFolderWorkspaceWorktree } from '../../../../../shared/folder-workspaces/folder-workspace-worktree'
import { getAgentStatusEpochNow } from '@/lib/agent-status-epoch-clock'
import { getLiveAgentStatusByWorktreeId } from '@/lib/worktree-activity-state'
import type { Worktree } from '../../../../../shared/worktree/types'
import type { LiveAgentWorktreeStatus } from '../../../../../shared/sidebar-list/workspace-activity-facts'
import { nextSnoozeExpiry, type ThreadStates } from '../../../../../shared/threads/thread-state'
import { EMPTY_THREAD_TAGS } from '../../../../../shared/threads/thread-tags'
import { matchWorkspaceBoardWorktrees } from '../workspace-board/search/workspace-kanban-search'
import { buildThreadRows, type ThreadRows } from './thread-rows'

const EMPTY_THREAD_STATES: ThreadStates = {}
const EMPTY_FILTER: string[] = []

/** Every git worktree and folder workspace this window knows, as cards render them. */
export function useThreadWorkspaces(): Worktree[] {
  const worktreesByRepo = useAppStore((s) => selectWorktreesByRepo(s))
  const folderWorkspaces = useAppStore((s) => selectFolderWorkspaces(s))
  return useMemo(
    () => [
      ...Object.values(worktreesByRepo ?? {}).flat(),
      ...(folderWorkspaces ?? []).map((folder) => getFolderWorkspaceWorktree(folder))
    ],
    [worktreesByRepo, folderWorkspaces]
  )
}

/** Live agent status per worktree id, refreshed on each agent-status epoch. */
export function useLiveAgentStatusByWorktreeId(): ReadonlyMap<string, LiveAgentWorktreeStatus> {
  const agentStatusEpoch = useAppStore((s) => s.agentStatusEpoch)
  const agentStatusByPaneKey = useAppStore((s) => s.agentStatusByPaneKey)
  const tabsByWorktree = useAppStore((s) => s.tabsByWorktree)
  return useMemo(
    () =>
      getLiveAgentStatusByWorktreeId(
        agentStatusByPaneKey,
        tabsByWorktree,
        getAgentStatusEpochNow(agentStatusEpoch)
      ),
    [agentStatusByPaneKey, agentStatusEpoch, tabsByWorktree]
  )
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

/** `rows` honors search and the tag filter; `unfilteredRows` ignores the tag filter, for tag chips. */
export function useThreadListModel(args: { query: string }): {
  rows: ThreadRows
  unfilteredRows: ThreadRows
  workspaces: Worktree[]
} {
  const workspaces = useThreadWorkspaces()
  const states = useAppStore((s) => s.threadStates ?? EMPTY_THREAD_STATES)
  const tags = useAppStore((s) => s.threadTags ?? EMPTY_THREAD_TAGS)
  const filter = useAppStore((s) => s.threadTagFilter ?? EMPTY_FILTER)
  const liveStatusByWorktreeId = useLiveAgentStatusByWorktreeId()
  const clockNow = useSnoozeClock(states)
  const repoMap = useRepoMap()
  const matches = useMemo(
    () => matchWorkspaceBoardWorktrees({ worktrees: workspaces, query: args.query, repoMap }),
    [workspaces, args.query, repoMap]
  )
  const unfilteredRows = useMemo(
    () =>
      buildThreadRows({
        workspaces,
        states,
        liveStatusByWorktreeId,
        now: clockNow,
        matches
      }),
    [workspaces, states, liveStatusByWorktreeId, clockNow, matches]
  )
  const rows = useMemo(
    () =>
      filter.length === 0
        ? unfilteredRows
        : buildThreadRows({
            workspaces,
            states,
            liveStatusByWorktreeId,
            now: clockNow,
            matches,
            tagFilter: { filter, tags }
          }),
    [unfilteredRows, filter, tags, workspaces, states, liveStatusByWorktreeId, clockNow, matches]
  )
  return { rows, unfilteredRows, workspaces }
}
