import { useAppStore } from '@/store'
import type { Worktree } from '../../../../../shared/worktree/types'
import { getWorktreeHostIdentity } from '../../../../../shared/worktree/host-qualified-identity'
import { snoozeUntil, type ThreadSnoozeOption } from '../../../../../shared/threads/thread-state'
import { parseAgentStatusPaneIdentity } from '../../../../../shared/agent-status-worktree-attribution'

/** Settling also unpins (a pinned thread would otherwise stay listed forever) and stops its agents. */
export function settleThread(worktree: Worktree): void {
  const state = useAppStore.getState()
  state.updateThreadState(getWorktreeHostIdentity(worktree), {
    settledAt: Date.now(),
    snoozedUntil: undefined
  })
  if (worktree.isPinned) {
    state.setWorktreesPinnedAndReveal([worktree], false)
  }
  closeAgentTabs(worktree.id)
}

/** Closed agents land in History, so reopening the thread resumes them. */
function closeAgentTabs(worktreeId: string): void {
  const state = useAppStore.getState()
  const agentTerminalTabIds = new Set<string>()
  for (const entry of Object.values(state.agentStatusByPaneKey ?? {})) {
    const tabId = parseAgentStatusPaneIdentity(entry.paneKey)?.tabId
    if (tabId) {
      agentTerminalTabIds.add(tabId)
    }
  }
  const agentTabs = (state.unifiedTabsByWorktree[worktreeId] ?? []).filter(
    (tab) =>
      tab.contentType === 'agent-session' ||
      (tab.contentType === 'terminal' && agentTerminalTabIds.has(tab.entityId))
  )
  for (const tab of agentTabs) {
    state.closeUnifiedTab(tab.id)
  }
}

/** Snoozing a settled thread reopens it, since a settled thread is never listed as snoozed. */
export function snoozeThread(key: string, option: ThreadSnoozeOption): void {
  const state = useAppStore.getState()
  const now = new Date()
  const wasSettled = (state.threadStates[key]?.settledAt ?? 0) > 0
  state.updateThreadState(key, {
    snoozedUntil: snoozeUntil(option, now),
    ...(wasSettled ? { openedAt: now.getTime() } : {})
  })
}

/** A settled thread reopens when an agent runs; this does it by hand. */
export function reopenThread(key: string): void {
  useAppStore.getState().updateThreadState(key, { openedAt: Date.now(), snoozedUntil: undefined })
}

/** Unsettling picks the conversation back up where it stopped. */
export function reopenSettledThread(
  worktree: Worktree,
  resumeLatest: ((worktree: Worktree) => void) | null
): void {
  reopenThread(getWorktreeHostIdentity(worktree))
  resumeLatest?.(worktree)
}
