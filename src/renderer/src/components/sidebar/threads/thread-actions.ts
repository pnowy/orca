import { useAppStore } from '@/store'
import type { Worktree } from '../../../../../shared/worktree/types'
import { getWorktreeHostIdentity } from '../../../../../shared/worktree/host-qualified-identity'
import { snoozeUntil, type ThreadSnoozeOption } from '../../../../../shared/threads/thread-state'

/** Settling also unpins: a pinned thread would otherwise stay listed forever. */
export function settleThread(worktree: Worktree): void {
  const state = useAppStore.getState()
  state.updateThreadState(getWorktreeHostIdentity(worktree), {
    settledAt: Date.now(),
    snoozedUntil: undefined
  })
  if (worktree.isPinned) {
    state.setWorktreesPinnedAndReveal([worktree], false)
  }
}

export function snoozeThread(key: string, option: ThreadSnoozeOption): void {
  useAppStore.getState().updateThreadState(key, { snoozedUntil: snoozeUntil(option, new Date()) })
}
