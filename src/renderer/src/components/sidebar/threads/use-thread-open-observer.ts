import { useEffect, useMemo, useRef } from 'react'
import { useAppStore } from '@/store'
import { getWorktreeHostIdentity } from '../../../../../shared/worktree/host-qualified-identity'
import { isThreadOpen, topThreadOrder } from '../../../../../shared/threads/thread-state'
import { getStoppedAgentWorktreeIds, getWorktreeIdsWithAgentPanes } from './thread-auto-settle'
import { threadFallbackOpenedAt } from './thread-rows'
import { useLiveAgentStatusByWorktreeId, useThreadWorkspaces } from './use-thread-list-model'

/**
 * Open (or reopen) a workspace's thread when an agent starts there, whatever launched it.
 * Edge-triggered: a settled thread whose agent is still running stays settled until a new run.
 */
export function useThreadOpenObserver(enabled: boolean): void {
  const workspaces = useThreadWorkspaces()
  const liveStatusByWorktreeId = useLiveAgentStatusByWorktreeId()
  const previousLiveRef = useRef<ReadonlySet<string> | null>(null)

  useEffect(() => {
    if (!enabled) {
      previousLiveRef.current = null
      return
    }
    const live = new Set(liveStatusByWorktreeId.keys())
    const previous = previousLiveRef.current
    previousLiveRef.current = live
    const { threadStates, updateThreadState } = useAppStore.getState()
    const now = Date.now()
    let order = topThreadOrder(threadStates)
    for (const worktree of workspaces) {
      if (!live.has(worktree.id) || previous?.has(worktree.id)) {
        continue
      }
      const key = getWorktreeHostIdentity(worktree)
      const state = threadStates[key]
      // The first sample after start only adopts never-seen workspaces; restored agents must not undo a settle.
      if (previous === null && state !== undefined) {
        continue
      }
      if (isThreadOpen(state, threadFallbackOpenedAt(worktree))) {
        continue
      }
      updateThreadState(key, { openedAt: now, order, snoozedUntil: undefined })
      order += 1
    }
  }, [enabled, liveStatusByWorktreeId, workspaces])
}

/**
 * Settle an open thread when its last agent is stopped (pane closed or agent exited), like
 * Projects mode drops an idle main checkout. Finished turns keep their entry and slept agents
 * leave a resumable record, so both stay open; pinned threads are kept on purpose.
 */
export function useThreadAutoSettleObserver(enabled: boolean): void {
  const workspaces = useThreadWorkspaces()
  const agentStatusByPaneKey = useAppStore((s) => s.agentStatusByPaneKey)
  const tabsByWorktree = useAppStore((s) => s.tabsByWorktree)
  const withAgents = useMemo(
    () => getWorktreeIdsWithAgentPanes(agentStatusByPaneKey, tabsByWorktree),
    [agentStatusByPaneKey, tabsByWorktree]
  )
  const previousRef = useRef<ReadonlySet<string> | null>(null)

  useEffect(() => {
    if (!enabled) {
      previousRef.current = null
      return
    }
    const stopped = getStoppedAgentWorktreeIds(previousRef.current, withAgents)
    previousRef.current = withAgents
    if (stopped.length === 0) {
      return
    }
    const { threadStates, updateThreadState, sleepingAgentSessionsByPaneKey } =
      useAppStore.getState()
    const sleeping = new Set(
      Object.values(sleepingAgentSessionsByPaneKey ?? {}).map((record) => record.worktreeId)
    )
    const now = Date.now()
    for (const worktree of workspaces) {
      if (!stopped.includes(worktree.id) || worktree.isPinned || sleeping.has(worktree.id)) {
        continue
      }
      const key = getWorktreeHostIdentity(worktree)
      if (isThreadOpen(threadStates[key], threadFallbackOpenedAt(worktree))) {
        updateThreadState(key, { settledAt: now, snoozedUntil: undefined })
      }
    }
  }, [enabled, withAgents, workspaces])
}
