import type { UISlice, UISliceSet } from './ui-slice-contract'
import { patchThreadStates } from '../../../../../shared/threads/thread-state'

/** Threads-layout preferences; every write persists the whole thread map, which stays small. */
export function createThreadsPreferenceActions(set: UISliceSet): Partial<UISlice> {
  return {
    sidebarLayout: 'projects',
    setSidebarLayout: (layout) => {
      set({ sidebarLayout: layout })
      window.api.ui.set({ sidebarLayout: layout }).catch(console.error)
    },
    threadStates: {},
    updateThreadState: (key, patch) => {
      let next: UISlice['threadStates'] | null = null
      set((s) => {
        next = patchThreadStates(s.threadStates, key, patch)
        return { threadStates: next }
      })
      if (next) {
        window.api.ui.set({ threadStates: next }).catch(console.error)
      }
    },
    replaceThreadStates: (states) => {
      set({ threadStates: states })
      window.api.ui.set({ threadStates: states }).catch(console.error)
    },
    threadsSnoozedCollapsed: false,
    setThreadsSnoozedCollapsed: (v) => set({ threadsSnoozedCollapsed: v }),
    threadsSettledCollapsed: false,
    setThreadsSettledCollapsed: (v) => set({ threadsSettledCollapsed: v }),
    threadsHistoryCollapsed: true,
    setThreadsHistoryCollapsed: (v) => set({ threadsHistoryCollapsed: v })
  }
}
